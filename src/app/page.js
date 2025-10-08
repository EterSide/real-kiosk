'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useKioskStore } from '@/store/kioskStore';
import { useCustomerDetection } from '@/hooks/useCustomerDetection';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { IdleScreen } from '@/components/IdleScreen';
import { OrderScreen } from '@/components/OrderScreen';
import { DebugPanel } from '@/components/DebugPanel';
import { TTSTestButton } from '@/components/TTSTestButton';
import { KioskState } from '@/lib/stateMachine';
import { matchMenu, matchOption, detectConfirmation, detectMoreOrder } from '@/services/menuMatcher';
import { getAvailableProducts, getCategories } from '@/services/api';

export default function KioskPage() {
  const {
    currentState,
    products,
    categories,
    cart,
    currentProduct,
    candidates,
    pendingOptions,
    lastMessage,
    lastInput,
    setProducts,
    setCategories,
    onCustomerDetected,
    onSpeechReceived,
    onTTSCompleted,
    onMenuMatched,
    onProductClarified,
    onOptionSelected,
    onAllOptionsSelected,
    onMoreOrder,
    onConfirm,
    onPaymentCompleted,
    reset,
  } = useKioskStore();

  // 주문 완료 팝업 상태
  const [showOrderComplete, setShowOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // IDLE 상태로 돌아가면 팝업 닫기
  useEffect(() => {
    if (currentState === KioskState.IDLE) {
      console.log('[Page] IDLE 상태 → 팝업 초기화');
      setShowOrderComplete(false);
      setOrderNumber('');
    }
  }, [currentState]);

  // 고객 감지 콜백 (안정화)
  const handleCustomerDetected = useCallback(() => {
    console.log('[Page] 고객 감지 콜백 실행');
    onCustomerDetected();
  }, [onCustomerDetected]);

  // 웹캠 고객 감지
  const { videoRef, isDetecting, isLoaded, detectionProgress } = useCustomerDetection(
    handleCustomerDetected,
    currentState === KioskState.IDLE
  );

  // TTS
  const { speak, isSpeaking } = useTextToSpeech(onTTSCompleted);

  // 음성 인식 결과 처리
  const handleSpeechResult = useCallback((transcript) => {
    console.log('[Page] 🎤 음성 인식 결과:', transcript);
    console.log('[Page] 현재 상태:', currentState);

    // 상태를 먼저 캡처 (onSpeechReceived가 상태를 변경하기 전)
    const state = currentState;

    // 상태별 처리
    if (state === KioskState.LISTENING || state === KioskState.PROCESSING) {
      // 메뉴 매칭
      console.log('[Page] 메뉴 매칭 시작...');
      const result = matchMenu(transcript, products);
      console.log('[Page] 메뉴 매칭 결과:', result.candidates.length, '개');
      
      onSpeechReceived(transcript); // 상태 업데이트
      onMenuMatched(result.candidates);
    } 
    else if (state === KioskState.ASK_DISAMBIGUATION) {
      // 후보 중 선택
      console.log('[Page] 후보 중 선택 처리...');
      const result = matchMenu(transcript, candidates.map(c => c.product));
      if (result.candidates.length > 0) {
        onSpeechReceived(transcript);
        onProductClarified(result.candidates[0].product);
      }
    }
    else if (state === KioskState.ASK_OPTIONS) {
      // 옵션 선택
      console.log('[Page] 옵션 선택 처리...');
      if (pendingOptions.length > 0) {
        const result = matchOption(transcript, pendingOptions[0].options);
        if (result.selectedOption) {
          onSpeechReceived(transcript);
          onOptionSelected(result.selectedOption);
        }
      }
    }
    else if (state === KioskState.ASK_MORE) {
      // 추가 주문 여부
      console.log('[Page] 추가 주문 여부 처리...');
      const confirmation = detectMoreOrder(transcript);
      
      if (confirmation === 'yes') {
        console.log('[Page] ✅ 추가 주문 있음 (명시적)');
        onSpeechReceived(transcript);
        onMoreOrder(true);
      } else if (confirmation === 'no') {
        console.log('[Page] ✅ 추가 주문 없음 → 결제');
        onSpeechReceived(transcript);
        onMoreOrder(false);
      } else {
        // unknown인 경우 → 메뉴 이름으로 간주하고 매칭 시도
        console.log('[Page] 💡 메뉴 이름으로 판단, 매칭 시도...');
        const result = matchMenu(transcript, products);
        
        if (result.candidates.length > 0) {
          console.log('[Page] ✅ 메뉴 매칭 성공! 바로 메뉴 매칭 처리');
          // ✅ 수정: onMoreOrder(true)를 호출하지 않고 바로 처리!
          // 이렇게 하면 "네, 말씀해 주세요" TTS가 안 나옴
          onSpeechReceived(transcript);
          onMenuMatched(result.candidates);
        } else {
          console.log('[Page] ⚠️ 메뉴 매칭 실패, 다시 물어보기');
          onSpeechReceived(transcript);
          // 상태는 ASK_MORE로 유지되고, TTS가 다시 "추가 주문 있으세요?" 물어봄
        }
      }
    }
    else if (state === KioskState.CONFIRM) {
      // 주문 확인
      console.log('[Page] 주문 확인 처리...');
      const confirmation = detectConfirmation(transcript);
      onSpeechReceived(transcript);
      if (confirmation === 'yes') {
        onConfirm(true);
      } else if (confirmation === 'no') {
        onConfirm(false);
      }
    }
    else {
      console.log('[Page] ⚠️ 처리되지 않은 상태:', state);
      onSpeechReceived(transcript);
    }
  }, [currentState, products, candidates, pendingOptions, onSpeechReceived, onMenuMatched, onProductClarified, onOptionSelected, onMoreOrder, onConfirm]);

  // 음성 인식 (LISTENING 이후 상태에서만 활성화)
  // ❌ ASK_OPTIONS는 제외 (팝업으로만 선택)
  const shouldListen = 
    currentState === KioskState.LISTENING ||
    currentState === KioskState.PROCESSING ||
    currentState === KioskState.ASK_DISAMBIGUATION ||
    // currentState === KioskState.ASK_OPTIONS || // ❌ 팝업 사용하므로 음성 인식 OFF
    currentState === KioskState.ASK_MORE ||
    currentState === KioskState.CONFIRM;
  
  const { interimTranscript, isListening } = useSpeechRecognition(
    handleSpeechResult,
    shouldListen
  );
  
  // 음성 인식 상태 변경 로그 (강화)
  useEffect(() => {
    console.log('[Page] 🎤 ────────────────────────────────');
    console.log('[Page] 🎤 음성 인식 상태:', shouldListen ? '✅ ON' : '❌ OFF');
    console.log('[Page] 🎤 현재 상태:', currentState);
    console.log('[Page] 🎤 실제 listening:', isListening);
    console.log('[Page] 🎤 ────────────────────────────────');
  }, [shouldListen, currentState, isListening]);

  // TTS 실행 (메시지가 변경될 때만)
  const lastPlayedMessageRef = useRef('');
  
  useEffect(() => {
    // 메시지가 변경되었고, 이전에 재생하지 않은 메시지일 때만 재생
    if (lastMessage && lastMessage !== lastPlayedMessageRef.current) {
      console.log('[Page] 🔊 새 메시지 재생:', lastMessage);
      lastPlayedMessageRef.current = lastMessage;
      speak(lastMessage);
    }
  }, [lastMessage, speak]);
  
  // IDLE 상태로 돌아가면 ref 리셋
  useEffect(() => {
    if (currentState === KioskState.IDLE) {
      console.log('[TTS] 상태 리셋 - ref 초기화');
      lastPlayedMessageRef.current = '';
    }
  }, [currentState]);

  // 초기 데이터 로드
  useEffect(() => {
    async function loadData() {
      console.log('[Page] 🌐 백엔드 API에서 데이터 로드 시작...');
      console.log('[Page] API URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090');
      
      try {
        const [productsData, categoriesData] = await Promise.all([
          getAvailableProducts(),
          getCategories(),
        ]);
        
        console.log('[Page] ✅ 데이터 로드 성공!');
        console.log('[Page] 📦 상품:', productsData.length, '개');
        console.log('[Page] 📂 카테고리:', categoriesData.length, '개');
        console.log('[Page] 상품 샘플:', productsData.slice(0, 3).map(p => ({ 
          id: p.id, 
          name: p.name, 
          price: p.price 
        })));
        console.log('[Page] 카테고리 샘플:', categoriesData.slice(0, 3).map(c => ({ 
          id: c.id, 
          name: c.name 
        })));
        
        // 데이터 유효성 검사
        const validProducts = productsData.filter(p => p && p.name && p.price);
        const validCategories = categoriesData.filter(c => c && c.name);
        
        console.log('[Page] 유효한 데이터:', validProducts.length, '개 상품,', validCategories.length, '개 카테고리');
        
        setProducts(validProducts);
        setCategories(validCategories);
      } catch (error) {
        console.error('[Page] ❌ 데이터 로드 실패!');
        console.error('[Page] 에러:', error);
        console.error('[Page] 에러 메시지:', error.message);
        console.error('[Page] 에러 스택:', error.stack);
        
        // 백엔드 실패 시 목업 데이터 사용
        console.log('[Page] 🧪 목업 데이터로 폴백');
        const mockProducts = getMockProducts();
        const mockCategories = getMockCategories();
        console.log('[Page] 목업 데이터:', mockProducts.length, '개 상품,', mockCategories.length, '개 카테고리');
        setProducts(mockProducts);
        setCategories(mockCategories);
      }
    }

    loadData();
  }, [setProducts, setCategories]);

  // 결제 상태 처리
  useEffect(() => {
    if (currentState === KioskState.PAYMENT) {
      // 결제 처리 시뮬레이션
      setTimeout(() => {
        onPaymentCompleted();
      }, 2000);
    }
  }, [currentState, onPaymentCompleted]);

  // 상품/옵션 선택 핸들러
  const handleProductSelect = useCallback((item) => {
    if (currentState === KioskState.ASK_DISAMBIGUATION) {
      onProductClarified(item);
    } else if (currentState === KioskState.ASK_OPTIONS) {
      onOptionSelected(item);
    }
  }, [currentState, onProductClarified, onOptionSelected]);

  // 옵션 전체 선택 완료 핸들러 (팝업용)
  const handleOptionsComplete = useCallback((selectedOptions) => {
    console.log('[Page] 🎯 옵션 전체 선택 완료:', selectedOptions.length, '개');
    console.log('[Page] 옵션 목록:', selectedOptions.map(opt => opt.name));
    
    // ✅ 한 번에 모두 처리 (순차 처리 대신)
    onAllOptionsSelected(selectedOptions);
  }, [onAllOptionsSelected]);

  // 결제하기 핸들러
  const handleCheckout = useCallback(() => {
    console.log('[Page] 결제하기 클릭');
    
    if (cart.length === 0) {
      alert('장바구니가 비어있습니다!');
      return;
    }

    // 주문번호 생성 (현재 시간 기반)
    const now = new Date();
    const orderNum = `${now.getHours()}${now.getMinutes()}${now.getSeconds()}${Math.floor(Math.random() * 100)}`.padStart(6, '0');
    
    console.log('[Page] 주문번호:', orderNum);
    setOrderNumber(orderNum);
    setShowOrderComplete(true);
    
    // 결제 완료 처리
    onPaymentCompleted();
  }, [cart, onPaymentCompleted]);

  // 주문 완료 팝업 닫기
  const handleCloseOrderComplete = useCallback(() => {
    console.log('[Page] 주문 완료 팝업 닫기');
    setShowOrderComplete(false);
    setOrderNumber('');
    
    // 전체 초기화
    reset();
  }, [reset]);

  // TTS 활성화 (브라우저 권한 획득)
  const activateTTSRef = useRef(false);
  
  const activateTTS = useCallback(() => {
    if (activateTTSRef.current) return;
    
    console.log('[TTS] 🔓 브라우저 권한 활성화 시도...');
    
    // 더미 TTS 재생으로 권한 획득
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance('');
      utterance.volume = 0; // 무음
      window.speechSynthesis.speak(utterance);
      activateTTSRef.current = true;
      console.log('[TTS] ✅ 권한 활성화 완료!');
    }
  }, []);

  // 수동 시작 핸들러 (테스트용)
  const handleManualStart = useCallback(() => {
    if (currentState === KioskState.IDLE) {
      console.log('[수동시작] 버튼 클릭 - 주문 시작');
      
      // TTS 권한 활성화
      activateTTS();
      
      onCustomerDetected();
      console.log('[수동시작] onCustomerDetected() 호출 완료');
    } else {
      console.log('[수동시작] 이미 주문 중 (상태:', currentState, ')');
    }
  }, [currentState, onCustomerDetected, activateTTS]);

  // 화면 렌더링
  return (
    <>
      {currentState === KioskState.IDLE ? (
        <IdleScreen 
          videoRef={videoRef} 
          isDetecting={isDetecting}
          detectionProgress={detectionProgress}
          onManualStart={handleManualStart}
        />
      ) : (
      <OrderScreen
        products={products}
        categories={categories}
        cart={cart}
        currentState={currentState}
        currentProduct={currentProduct}
        lastMessage={lastMessage}
        interimTranscript={interimTranscript}
        isListening={isListening}
        isSpeaking={isSpeaking}
        candidates={candidates}
        pendingOptions={pendingOptions}
        onProductSelect={handleProductSelect}
        onCheckout={handleCheckout}
        showOrderComplete={showOrderComplete}
        orderNumber={orderNumber}
        onCloseOrderComplete={handleCloseOrderComplete}
      />
      )}
      
      {/* 디버그 패널 */}
      <DebugPanel
        currentState={currentState}
        isDetecting={isDetecting}
        isLoaded={isLoaded}
        isListening={isListening}
        isSpeaking={isSpeaking}
        lastInput={lastInput}
        cartCount={cart.length}
      />
      
      {/* TTS 테스트 버튼 */}
      <TTSTestButton />
    </>
  );
}

// 목업 데이터
function getMockProducts() {
  return [
    {
      id: 1,
      name: '와퍼',
      description: '불에 직접 구운 와퍼',
      price: 6500,
      type: 'SINGLE',
      categoryId: 1,
      imageUrl: null,
    },
    {
      id: 2,
      name: '와퍼 세트',
      description: '와퍼 + 사이드 + 음료',
      price: 8900,
      type: 'SET',
      categoryId: 1,
      imageUrl: null,
      optionGroups: [
        {
          id: 1,
          name: '사이드',
          required: true,
          maxSelection: 1,
          options: [
            { id: 11, name: '프렌치프라이(R)', price: 0, isDefault: true },
            { id: 12, name: '프렌치프라이(L)', price: 500, isDefault: false },
            { id: 13, name: '어니언링', price: 500, isDefault: false },
            { id: 14, name: '치즈스틱', price: 1000, isDefault: false },
          ],
          defaultOption: { id: 11, name: '프렌치프라이(R)', price: 0, isDefault: true },
        },
        {
          id: 2,
          name: '음료',
          required: true,
          maxSelection: 1,
          options: [
            { id: 21, name: '코카콜라(R)', price: 0, isDefault: true },
            { id: 22, name: '코카콜라(L)', price: 500, isDefault: false },
            { id: 23, name: '사이다(R)', price: 0, isDefault: false },
            { id: 24, name: '사이다(L)', price: 500, isDefault: false },
          ],
          defaultOption: { id: 21, name: '코카콜라(R)', price: 0, isDefault: true },
        },
      ],
    },
    {
      id: 3,
      name: '불고기 와퍼',
      description: '한국인이 좋아하는 불고기 맛',
      price: 7000,
      type: 'SINGLE',
      categoryId: 1,
    },
    {
      id: 4,
      name: '불고기 와퍼 세트',
      description: '불고기 와퍼 + 사이드 + 음료',
      price: 9400,
      type: 'SET',
      categoryId: 1,
      optionGroups: [
        {
          id: 1,
          name: '사이드',
          required: true,
          options: [
            { id: 11, name: '감자튀김', price: 0 },
            { id: 12, name: '어니언링', price: 500 },
          ],
        },
        {
          id: 2,
          name: '음료',
          required: true,
          options: [
            { id: 21, name: '콜라', price: 0 },
            { id: 22, name: '사이다', price: 0 },
          ],
        },
      ],
    },
    {
      id: 5,
      name: '치킨버거',
      description: '바삭한 치킨 패티',
      price: 5500,
      type: 'SINGLE',
      categoryId: 1,
    },
    {
      id: 6,
      name: '치킨버거 세트',
      price: 7900,
      type: 'SET',
      categoryId: 1,
      optionGroups: [
        {
          id: 1,
          name: '사이드',
          required: true,
          options: [
            { id: 11, name: '감자튀김', price: 0 },
            { id: 12, name: '어니언링', price: 500 },
          ],
        },
        {
          id: 2,
          name: '음료',
          required: true,
          options: [
            { id: 21, name: '콜라', price: 0 },
            { id: 22, name: '사이다', price: 0 },
          ],
        },
      ],
    },
  ];
}

function getMockCategories() {
  return [
    { id: 1, name: '버거' },
    { id: 2, name: '치킨' },
    { id: 3, name: '사이드' },
    { id: 4, name: '음료' },
  ];
}
