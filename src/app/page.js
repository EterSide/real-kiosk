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
import { PaymentModal } from '@/components/PaymentModal';
import { RecommendationLoadingModal } from '@/components/RecommendationLoadingModal';
import { KioskState } from '@/lib/stateMachine';
import { matchMenu, matchOption, detectConfirmation, detectMoreOrder, detectRecommendation } from '@/services/menuMatcher';
import { getAvailableProducts, getCategories } from '@/services/api';
import { getMenuRecommendations, mapRecommendationsToProducts } from '@/services/menuRecommendationApi';

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
    language,
    customerInfo,
    recommendationResults,
    setProducts,
    setCategories,
    setRecommendationResults,
    clearRecommendationResults,
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
  
  // 결제 모달 상태
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // AI 추천 로딩 상태
  const [isRecommendationLoading, setIsRecommendationLoading] = useState(false);
  
  // ✅ 음성 처리 중 플래그 (중복 방지)
  const isProcessingSpeechRef = useRef(false);

  // IDLE 상태로 돌아가면 팝업 닫기
  useEffect(() => {
    if (currentState === KioskState.IDLE) {
      console.log('[Page] IDLE 상태 → 팝업 초기화');
      setShowOrderComplete(false);
      setShowPaymentModal(false);
      setOrderNumber('');
      // ✅ 처리 중 플래그도 초기화
      isProcessingSpeechRef.current = false;
      console.log('[Page] 🔓 음성 처리 플래그 초기화');
    }
  }, [currentState]);

  // TTS 활성화 (브라우저 권한 획득) - 미리 선언
  const activateTTSRef = useRef(false);
  
  const activateTTS = useCallback(() => {
    if (activateTTSRef.current) return;
    
    console.log('[TTS] 🔓 브라우저 권한 활성화 시도...');
    
    // 1. Web Speech API 권한 획득
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance('');
      utterance.volume = 0; // 무음
      window.speechSynthesis.speak(utterance);
      console.log('[TTS] ✅ Web Speech API 권한 획득');
    }
    
    // 2. Google Cloud TTS (Audio) 권한 획득
    try {
      const audio = new Audio();
      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      audio.volume = 0;
      audio.play().then(() => {
        console.log('[TTS] ✅ Audio autoplay 권한 획득');
      }).catch(err => {
        console.warn('[TTS] ⚠️ Audio autoplay 권한 실패:', err.message);
      });
    } catch (error) {
      console.warn('[TTS] ⚠️ Audio 생성 실패:', error.message);
    }
    
    activateTTSRef.current = true;
    console.log('[TTS] ✅ 권한 활성화 완료!');
  }, []);

  // 고객 감지 콜백 (안정화) - 고객 정보 포함
  const handleCustomerDetected = useCallback((customerInfo) => {
    console.log('[Page] 고객 감지 콜백 실행');
    console.log('[Page] 고객 정보:', customerInfo);
    
    // ✅ TTS 권한 활성화 (얼굴 감지도 사용자 인터랙션으로 간주)
    activateTTS();
    
    // 고객 정보를 store에 저장
    if (customerInfo) {
      useKioskStore.setState({ customerInfo });
    }
    
    onCustomerDetected();
  }, [onCustomerDetected, activateTTS]);

  // 웹캠 고객 감지
  const { videoRef, isDetecting, isLoaded, detectionProgress, customerInfo: detectedCustomerInfo } = useCustomerDetection(
    handleCustomerDetected,
    currentState === KioskState.IDLE
  );

  // TTS (customerInfo 전달)
  const { speak, isSpeaking } = useTextToSpeech(onTTSCompleted, customerInfo);

  // 음성 인식 결과 처리
  const handleSpeechResult = useCallback(async (transcript) => {
    // ✅ TTS 재생 중에는 무시 (1차 방어 - TTS 에코 방지)
    if (isSpeaking) {
      console.warn('[Page] 🔇 TTS 재생 중! 음성 입력 무시:', transcript);
      return;
    }
    
    // ✅ 처리 중 플래그 체크 (중복 방지)
    if (isProcessingSpeechRef.current) {
      console.warn('[Page] ⚠️⚠️⚠️ 이미 처리 중! 무시함 ⚠️⚠️⚠️');
      console.warn('[Page] 무시된 입력:', transcript);
      return;
    }
    
    // ✅ 처리 시작 플래그 설정
    isProcessingSpeechRef.current = true;
    console.log('[Page] 🔒 처리 중 플래그 설정');
    
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║  [Page] 🎤 음성 인식 결과 처리 시작           ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log('[Page] 📢 음성 입력:', transcript);
    console.log('[Page] 🔄 현재 상태:', currentState);
    console.log('[Page] 📋 후보 수:', candidates.length);

    // 상태를 먼저 캡처 (onSpeechReceived가 상태를 변경하기 전)
    const state = currentState;

    try {
      // 상태별 처리
      if (state === KioskState.LISTENING || state === KioskState.PROCESSING) {
        // 🎯 추천 의도 감지 (우선 순위)
        console.log('[Page] ──────────────────────────────────────');
        console.log('[Page] 🔍 추천 의도 감지 체크...');
        const isRecommendation = detectRecommendation(transcript, language);
      
      if (isRecommendation) {
        console.log('[Page] ═══════════════════════════════════════');
        console.log('[Page] 🌟 AI 추천 모드 활성화!');
        console.log('[Page] ═══════════════════════════════════════');
        console.log('[Page] 📢 사용자 요청:', transcript);
        
        // AI 추천 API 호출
        try {
          onSpeechReceived(transcript);
          
          // 로딩 모달 표시
          setIsRecommendationLoading(true);
          console.log('[Page] 🔄 AI 추천 로딩 모달 표시');
          
          console.log('[Page] 🔄 AI 추천 API 호출 중...');
          const recommendationData = await getMenuRecommendations(transcript, 3);
          
          console.log('[Page] ✅ AI 추천 API 응답 받음!');
          console.log('[Page] 추천 개수:', recommendationData.recommendations?.length || 0);
          
          // API 응답을 제품과 매핑
          const mappedResults = mapRecommendationsToProducts(recommendationData, products);
          
          console.log('[Page] ✅ 제품 매핑 완료:', mappedResults.length, '개');
          
          if (mappedResults.length > 0) {
            // 추천 결과 저장
            setRecommendationResults(mappedResults);
            
            // 후보로 설정 (기존 플로우 재활용)
            console.log('[Page] 🎯 추천 결과를 후보로 설정');
            onMenuMatched(mappedResults);
          } else {
            console.log('[Page] ⚠️ 매핑된 제품이 없습니다');
            onMenuMatched([]);
          }
          
          console.log('[Page] ═══════════════════════════════════════');
        } catch (error) {
          console.error('[Page] ❌ AI 추천 API 에러:', error);
          console.error('[Page] 에러 메시지:', error.message);
          
          // 에러 시 일반 메뉴 매칭으로 폴백
          console.log('[Page] 💡 일반 메뉴 매칭으로 폴백...');
          const result = matchMenu(transcript, products, language);
          onSpeechReceived(transcript);
          onMenuMatched(result.candidates);
        } finally {
          // 로딩 모달 닫기
          setIsRecommendationLoading(false);
          console.log('[Page] ✅ AI 추천 로딩 모달 닫기');
        }
        
        return; // 추천 처리 완료, 이후 로직 스킵
      }
      
      // 일반 메뉴 매칭
      console.log('[Page] ──────────────────────────────────────');
      console.log('[Page] 📍 LISTENING/PROCESSING 상태: 메뉴 매칭');
      console.log('[Page] 🔍 전체 상품에서 검색 중... (총', products.length, '개)');
      const result = matchMenu(transcript, products, language); // 언어 전달
      console.log('[Page] ✅ 메뉴 매칭 완료:', result.candidates.length, '개 후보 발견');
      
      if (result.candidates.length > 0) {
        console.log('[Page] 📝 후보 목록:');
        result.candidates.slice(0, 5).forEach((c, i) => {
          console.log(`[Page]   ${i + 1}. ${c.product.name} (점수: ${c.score.toFixed(1)})`);
        });
      }
      
      // ✅ 숫자가 포함된 경우 자동 선택 (예: "1번 와퍼세트")
      console.log('[Page] 🔢 숫자 자동 선택 체크...');
      console.log('[Page] 🔢 추출된 숫자:', result.keywords.numbers);
      
      if (result.keywords.numbers.length > 0 && result.candidates.length > 0) {
        const selectedNumber = result.keywords.numbers[0];
        const selectedIndex = selectedNumber - 1;
        
        console.log('[Page] ✅ 숫자 발견:', selectedNumber);
        console.log('[Page] 📍 인덱스 변환:', selectedNumber, '→', selectedIndex);
        console.log('[Page] 📊 매칭 결과 범위: 0 ~', result.candidates.length - 1);
        
        if (selectedIndex >= 0 && selectedIndex < result.candidates.length) {
          const selectedProduct = result.candidates[selectedIndex].product;
          console.log('[Page] ✅✅✅ 숫자로 자동 선택! ✅✅✅');
          console.log('[Page] 🎯 선택된 메뉴:', selectedProduct.name);
          console.log('[Page] 💰 가격:', selectedProduct.price, '원');
          console.log('[Page] 📦 옵션 그룹:', selectedProduct.optionGroups?.length || 0, '개');
          console.log('[Page] ──────────────────────────────────────');
          
          // 직접 상품 선택 처리 (onMenuMatched 건너뛰고 바로 선택)
          onSpeechReceived(transcript);
          onMenuMatched([result.candidates[selectedIndex]]); // 선택된 하나만 전달
          return;
        } else {
          console.log('[Page] ⚠️ 숫자가 매칭 결과 범위를 벗어남:', selectedNumber);
          console.log('[Page] 💡 힌트: 1번부터', result.candidates.length, '번까지 가능합니다');
        }
      } else {
        console.log('[Page] ℹ️ 숫자 없음 또는 매칭 결과 없음 → 일반 매칭 처리');
      }
      
      onSpeechReceived(transcript); // 상태 업데이트
      onMenuMatched(result.candidates);
      console.log('[Page] ──────────────────────────────────────');
    } 
    else if (state === KioskState.ASK_DISAMBIGUATION) {
      // 후보 중 선택
      console.log('[Page] ──────────────────────────────────────');
      console.log('[Page] 📍 ASK_DISAMBIGUATION 상태: 후보 중 선택');
      console.log('[Page] 📢 음성 입력:', transcript);
      console.log('[Page] 📋 현재 후보 수:', candidates.length);
      console.log('[Page] 📋 후보 목록:');
      candidates.forEach((c, i) => {
        console.log(`[Page]   ${i + 1}번. ${c.product.name}`);
      });
      console.log('[Page] ──────────────────────────────────────');
      
      // ✅ 숫자 선택 우선 처리 ("1번", "2번", "첫번째" 등)
      console.log('[Page] 🔢 Step 1: 숫자 추출 시도...');
      const { keywords } = matchMenu(transcript, products, language);
      
      console.log('[Page] 🔢 추출된 숫자:', keywords.numbers);
      
      if (keywords.numbers.length > 0) {
        const selectedNumber = keywords.numbers[0];
        const selectedIndex = selectedNumber - 1;
        console.log('[Page] ✅ 숫자 발견:', selectedNumber);
        console.log('[Page] 📍 인덱스 변환:', selectedNumber, '→', selectedIndex);
        console.log('[Page] 📊 유효 범위: 0 ~', candidates.length - 1, '(1번 ~', candidates.length, '번)');
        
        if (selectedIndex >= 0 && selectedIndex < candidates.length) {
          const selectedProduct = candidates[selectedIndex].product;
          console.log('[Page] ✅✅✅ 숫자 선택 성공! ✅✅✅');
          console.log('[Page] 🎯 선택된 메뉴:', selectedProduct.name);
          console.log('[Page] 💰 가격:', selectedProduct.price, '원');
          console.log('[Page] 📦 상품 ID:', selectedProduct.id);
          console.log('[Page] ──────────────────────────────────────');
          onSpeechReceived(transcript);
          onProductClarified(selectedProduct);
          return;
        } else {
          console.error('[Page] ❌ 잘못된 번호!');
          console.error('[Page]   입력:', selectedNumber, '번');
          console.error('[Page]   유효 범위: 1번 ~', candidates.length, '번');
          console.log('[Page] 💡 힌트: 1부터', candidates.length, '사이의 번호를 말해주세요');
        }
      } else {
        console.log('[Page] ⚠️ 숫자 미발견');
        console.log('[Page] 💡 "1번", "2번", "첫번째" 등으로 말해보세요');
      }
      
      // 숫자 선택 실패 시 이름으로 매칭
      console.log('[Page] ──────────────────────────────────────');
      console.log('[Page] 🔍 Step 2: 이름으로 매칭 시도...');
      const result = matchMenu(transcript, candidates.map(c => c.product), language);
      console.log('[Page] 📊 매칭 결과:', result.candidates.length, '개');
      
      if (result.candidates.length > 0) {
        console.log('[Page] ✅ 이름 매칭 성공:', result.candidates[0].product.name);
        onSpeechReceived(transcript);
        onProductClarified(result.candidates[0].product);
      } else {
        console.error('[Page] ❌ 이름 매칭도 실패');
        console.log('[Page] 💡 힌트: 정확한 메뉴명이나 번호로 다시 말씀해주세요');
      }
      console.log('[Page] ──────────────────────────────────────');
    }
    else if (state === KioskState.ASK_OPTIONS) {
      // 옵션 선택 (이름으로만, 숫자 선택 비활성화)
      console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
      console.log('┃  [Page] 🎤 옵션 선택 음성 처리              ┃');
      console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
      console.log('[Page] 📢 음성 입력:', transcript);
      console.log('[Page] 🔄 현재 상태:', state);
      console.log('[Page] 📋 남은 옵션 그룹:', pendingOptions.length, '개');
      
      if (pendingOptions.length > 0) {
        const currentGroup = pendingOptions[0];
        console.log('[Page] 🎯 현재 옵션 그룹:', currentGroup.name);
        console.log('[Page] 📝 옵션 개수:', currentGroup.options?.length || 0);
        console.log('[Page] ⚙️ 숫자 선택:', 'true (숫자 + 키워드 하이브리드)');
        console.log('[Page] ──────────────────────────────────────');
        
        // ✅ allowNumberSelection=true → 숫자 선택 + 키워드 매칭 활성화
        const result = matchOption(transcript, currentGroup.options, true);
        
        console.log('[Page] ──────────────────────────────────────');
        console.log('[Page] 📊 matchOption 결과:', result.selectedOption ? '매칭 성공' : '매칭 실패');
        
        if (result.selectedOption) {
          console.log('[Page] ✅ 선택된 옵션:', result.selectedOption.name);
          console.log('[Page] 💰 옵션 가격:', result.selectedOption.price || 0, '원');
          console.log('[Page] 📈 신뢰도:', result.confidence);
          
          // 신뢰도에 따른 처리
          if (result.confidence === 'high') {
            // 높은 신뢰도: 바로 선택
            console.log('[Page] ✅ 신뢰도 높음 → 바로 선택');
            onSpeechReceived(transcript);
            onOptionSelected(result.selectedOption);
          } else if (result.confidence === 'medium') {
            // 중간 신뢰도: 재확인 (TODO: 향후 개선)
            // 현재는 바로 선택하되 로그만 남김
            console.log('[Page] ⚠️ 신뢰도 중간 → 바로 선택 (재확인 로직은 향후 추가 가능)');
            onSpeechReceived(transcript);
            onOptionSelected(result.selectedOption);
          } else {
            // 낮은 신뢰도: 재질문
            console.log('[Page] ❌ 신뢰도 낮음 → 재질문 필요');
            console.log('[Page] 💡 정확한 옵션명이나 번호로 다시 말씀해주세요');
            // 옵션 선택하지 않고 다시 듣기 (상태 유지)
          }
        } else {
          console.log('[Page] ❌ 옵션 매칭 실패');
          console.log('[Page] 💡 힌트: 정확한 옵션명 또는 화면을 터치하여 선택하세요');
        }
      } else {
        console.warn('[Page] ⚠️ pendingOptions가 비어있음!');
      }
      console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
    }
    else if (state === KioskState.ASK_MORE) {
      // 🎯 추천 의도 감지 (우선 순위)
      console.log('[Page] ──────────────────────────────────────');
      console.log('[Page] 🔍 추천 의도 감지 체크 (ASK_MORE)...');
      const isRecommendation = detectRecommendation(transcript, language);
      
      if (isRecommendation) {
        console.log('[Page] ═══════════════════════════════════════');
        console.log('[Page] 🌟 AI 추천 모드 활성화! (추가 주문 중)');
        console.log('[Page] ═══════════════════════════════════════');
        console.log('[Page] 📢 사용자 요청:', transcript);
        
        // AI 추천 API 호출
        try {
          onSpeechReceived(transcript);
          
          // 로딩 모달 표시
          setIsRecommendationLoading(true);
          console.log('[Page] 🔄 AI 추천 로딩 모달 표시');
          
          console.log('[Page] 🔄 AI 추천 API 호출 중...');
          const recommendationData = await getMenuRecommendations(transcript, 3);
          
          console.log('[Page] ✅ AI 추천 API 응답 받음!');
          console.log('[Page] 추천 개수:', recommendationData.recommendations?.length || 0);
          
          // API 응답을 제품과 매핑
          const mappedResults = mapRecommendationsToProducts(recommendationData, products);
          
          console.log('[Page] ✅ 제품 매핑 완료:', mappedResults.length, '개');
          
          if (mappedResults.length > 0) {
            // 추천 결과 저장
            setRecommendationResults(mappedResults);
            
            // 후보로 설정 (기존 플로우 재활용)
            console.log('[Page] 🎯 추천 결과를 후보로 설정');
            onMenuMatched(mappedResults);
          } else {
            console.log('[Page] ⚠️ 매핑된 제품이 없습니다');
            onMenuMatched([]);
          }
          
          console.log('[Page] ═══════════════════════════════════════');
        } catch (error) {
          console.error('[Page] ❌ AI 추천 API 에러:', error);
          console.error('[Page] 에러 메시지:', error.message);
          
          // 에러 시 일반 메뉴 매칭으로 폴백
          console.log('[Page] 💡 일반 메뉴 매칭으로 폴백...');
          const result = matchMenu(transcript, products, language);
          onSpeechReceived(transcript);
          onMenuMatched(result.candidates);
        } finally {
          // 로딩 모달 닫기
          setIsRecommendationLoading(false);
          console.log('[Page] ✅ AI 추천 로딩 모달 닫기');
        }
        
        return; // 추천 처리 완료, 이후 로직 스킵
      }
      
      // 추가 주문 여부
      console.log('[Page] 추가 주문 여부 처리...');
      const confirmation = detectMoreOrder(transcript, language); // 언어 전달
      
      if (confirmation === 'yes') {
        console.log('[Page] ✅ 추가 주문 있음 (명시적)');
        onSpeechReceived(transcript);
        onMoreOrder(true);
      } else if (confirmation === 'pay') {
        // ✅ 새로 추가: "없어" 또는 "결제해줘" → 바로 결제 모달 띄우기
        console.log('[Page] 💳 바로 결제 진행!');
        onSpeechReceived(transcript);
        
        // 장바구니 체크
        if (cart.length === 0) {
          console.warn('[Page] ⚠️ 장바구니가 비어있습니다!');
          // 상태 유지, 다시 물어봄
          return;
        }
        
        // 바로 결제 모달 열기
        console.log('[Page] 🔓 결제 모달 열기');
        setShowPaymentModal(true);
      } else if (confirmation === 'no') {
        console.log('[Page] ✅ 추가 주문 없음 → 확인 단계로');
        onSpeechReceived(transcript);
        onMoreOrder(false);
      } else {
        // unknown인 경우 → 메뉴 이름으로 간주하고 매칭 시도
        console.log('[Page] 💡 메뉴 이름으로 판단, 매칭 시도...');
        const result = matchMenu(transcript, products, language); // 언어 전달
        
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
      const confirmation = detectConfirmation(transcript, language); // 언어 전달
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
    } finally {
      // ✅ 처리 완료 플래그 해제
      isProcessingSpeechRef.current = false;
      console.log('[Page] 🔓 처리 완료 플래그 해제');
    }
  }, [currentState, products, candidates, pendingOptions, onSpeechReceived, onMenuMatched, onProductClarified, onOptionSelected, onMoreOrder, onConfirm, language, cart, isSpeaking]);

  // 음성 인식 (LISTENING 이후 상태에서만 활성화)
  // ✅ ASK_OPTIONS도 포함 (음성으로 이름 선택 가능, 터치도 가능)
  // ✅ TTS 재생 중에는 음성 인식 비활성화 (TTS 소리를 인식하거나 간섭 방지)
  const shouldListen = 
    !isSpeaking && ( // ✅ TTS 재생 중이 아닐 때만
      currentState === KioskState.LISTENING ||
      currentState === KioskState.PROCESSING ||
      currentState === KioskState.ASK_DISAMBIGUATION ||
      currentState === KioskState.ASK_OPTIONS || // ✅ 옵션도 음성 선택 가능 (이름으로)
      currentState === KioskState.ASK_MORE ||
      currentState === KioskState.CONFIRM
    );
  
  const { interimTranscript, isListening } = useSpeechRecognition(
    handleSpeechResult,
    shouldListen,
    language, // 언어 전달
    isSpeaking // ✅ TTS 재생 중 플래그 전달 (2차 방어)
  );
  
  // 음성 인식 상태 변경 로그 (강화)
  useEffect(() => {
    console.log('[Page] 🎤 ────────────────────────────────');
    console.log('[Page] 🎤 음성 인식 상태:', shouldListen ? '✅ ON' : '❌ OFF');
    console.log('[Page] 🎤 현재 상태:', currentState);
    console.log('[Page] 🎤 TTS 재생 중:', isSpeaking ? '🔊 YES (음성 인식 중지)' : '❌ NO');
    console.log('[Page] 🎤 실제 listening:', isListening);
    console.log('[Page] 🎤 ────────────────────────────────');
  }, [shouldListen, currentState, isListening, isSpeaking]);

  // TTS 실행 (메시지가 변경될 때만)
  const lastPlayedMessageRef = useRef('');
  
  useEffect(() => {
    // 메시지가 변경되었고, 이전에 재생하지 않은 메시지일 때만 재생
    if (lastMessage && lastMessage !== lastPlayedMessageRef.current) {
      console.log('[Page] 🔊 새 메시지 재생:', lastMessage);
      console.log('[Page] 현재 언어:', language);
      lastPlayedMessageRef.current = lastMessage;
      speak(lastMessage, { language }); // 언어 전달
    }
  }, [lastMessage, speak, language]);
  
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

  // 결제 상태는 PaymentModal에서 처리하므로 이 useEffect는 제거

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

    // 결제 모달 열기
    console.log('[Page] 결제 모달 열기');
    setShowPaymentModal(true);
  }, [cart]);
  
  // 결제 완료 핸들러
  const handlePaymentComplete = useCallback(() => {
    console.log('[Page] 결제 완료');
    
    // 주문번호 생성 (현재 시간 기반)
    const now = new Date();
    const orderNum = `${now.getHours()}${now.getMinutes()}${now.getSeconds()}${Math.floor(Math.random() * 100)}`.padStart(6, '0');
    
    console.log('[Page] 주문번호:', orderNum);
    setOrderNumber(orderNum);
    setShowPaymentModal(false);
    setShowOrderComplete(true);
    
    // 결제 완료 처리
    onPaymentCompleted();
  }, [onPaymentCompleted]);
  
  // 결제 취소 핸들러
  const handlePaymentCancel = useCallback(() => {
    console.log('[Page] 결제 취소');
    setShowPaymentModal(false);
  }, []);

  // 주문 완료 팝업 닫기
  const handleCloseOrderComplete = useCallback(() => {
    console.log('[Page] 주문 완료 팝업 닫기');
    setShowOrderComplete(false);
    setOrderNumber('');
    
    // 전체 초기화
    reset();
  }, [reset]);

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
          customerInfo={detectedCustomerInfo}
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
      
      {/* 결제 모달 */}
      <PaymentModal
        isOpen={showPaymentModal}
        totalAmount={cart.reduce((sum, item) => sum + item.totalPrice, 0)}
        onComplete={handlePaymentComplete}
        onCancel={handlePaymentCancel}
      />
      
      {/* AI 추천 로딩 모달 */}
      <RecommendationLoadingModal isOpen={isRecommendationLoading} />
      
      {/* 디버그 패널 */}
      {/* <DebugPanel
        currentState={currentState}
        isDetecting={isDetecting}
        isLoaded={isLoaded}
        isListening={isListening}
        isSpeaking={isSpeaking}
        lastInput={lastInput}
        cartCount={cart.length}
      />
       */}
      {/* TTS 테스트 버튼 */}
      {/* <TTSTestButton /> */}
      
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
