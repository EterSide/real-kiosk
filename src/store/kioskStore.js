import { create } from 'zustand';
import { initialState, KioskState, transition } from '@/lib/stateMachine';

export const useKioskStore = create((set, get) => ({
  ...initialState,
  
  // 언어 설정 (기본값: 한국어)
  language: 'ko',
  
  // 고객 정보 (나이/성별)
  customerInfo: null,
  
  // 선택된 카테고리 (메뉴판 필터링용)
  selectedCategory: null,
  
  // 카테고리 선택
  setSelectedCategory: (categoryId) => {
    set({ selectedCategory: categoryId });
    console.log('[Store] 카테고리 선택:', categoryId);
  },

  // 상태 전환
  dispatch: (action, payload = {}) => {
    const state = get();
    const result = transition(state.currentState, action, payload, state.language, state.customerInfo);
    
    console.log(`[상태머신] ${state.currentState} -> ${result.newState}`, { action, message: result.message });
    
    const updates = {
      ...payload,
    };
    
    // ✅ transition 결과에서 상태 필드들 복사
    if (result.newState !== state.currentState) {
      updates.currentState = result.newState;
    }
    
    if (result.message) {
      updates.lastMessage = result.message;
    }
    
    // ✅ pendingOptions 반영 (중요!)
    if (result.pendingOptions !== undefined) {
      updates.pendingOptions = result.pendingOptions;
      console.log('[dispatch] ✅ pendingOptions 업데이트:', result.pendingOptions.length, '개');
    }
    
    // ✅ selectedProduct 반영
    if (result.selectedProduct !== undefined) {
      updates.currentProduct = result.selectedProduct;
      console.log('[dispatch] ✅ currentProduct 업데이트:', result.selectedProduct.name);
    }
    
    // ✅ candidates 반영
    if (result.candidates !== undefined) {
      updates.candidates = result.candidates;
      console.log('[dispatch] ✅ candidates 업데이트:', result.candidates.length, '개');
    }
    
    if (Object.keys(updates).length > 0) {
      set(updates);
    }
    
    return result;
  },

  // 메뉴 데이터 설정
  setProducts: (products) => set({ products }),
  setCategories: (categories) => set({ categories }),
  
  // 언어 설정
  setLanguage: (language) => set({ language }),

  // 고객 감지
  onCustomerDetected: () => {
    const state = get();
    console.log('[Store] onCustomerDetected 호출됨, 현재 상태:', state.currentState);
    
    if (state.currentState !== KioskState.IDLE) {
      console.warn('[Store] ⚠️ IDLE 상태가 아님! 무시됨');
      return;
    }
    
    const { dispatch } = get();
    dispatch('CUSTOMER_DETECTED');
    console.log('[Store] CUSTOMER_DETECTED 디스패치 완료');
  },

  // 음성 입력 처리
  onSpeechReceived: (input) => {
    set({ lastInput: input });
    const { dispatch } = get();
    dispatch('SPEECH_RECEIVED');
  },

  // TTS 완료
  onTTSCompleted: () => {
    const { dispatch } = get();
    dispatch('TTS_COMPLETED');
  },

  // 추천 결과 저장
  setRecommendationResults: (results) => {
    console.log('[Store] 추천 결과 저장:', results);
    
    // product_id를 키로 하는 객체로 변환
    const resultsMap = {};
    results.forEach(result => {
      if (result.product && result.product.id) {
        resultsMap[result.product.id] = {
          recommendationReason: result.recommendationReason,
          similarityScore: result.similarityScore,
        };
      }
    });
    
    console.log('[Store] 추천 결과 맵:', resultsMap);
    set({ recommendationResults: resultsMap });
  },
  
  // 추천 결과 초기화
  clearRecommendationResults: () => {
    console.log('[Store] 추천 결과 초기화');
    set({ recommendationResults: {} });
  },

  // 메뉴 매칭 결과 처리
  onMenuMatched: (candidates) => {
    const { dispatch, currentState } = get();
    
    console.log('[Store] ═══════════════════════════════');
    console.log('[Store] 🎯 onMenuMatched 호출');
    console.log('[Store] 후보 개수:', candidates.length);
    console.log('[Store] 현재 상태:', currentState);
    
    if (candidates.length === 1) {
      // 명확한 매칭
      const product = candidates[0].product;
      
      console.log('[Store] ✅ 1개 매칭:', product.name);
      
      set({
        currentProduct: product,
        candidates: [], // ✅ 후보 초기화
      });
      
      dispatch('MENU_MATCHED', { candidates });
      
      // ✅ setTimeout 제거 - 동기적으로 처리
      const hasOptions = product.optionGroups && product.optionGroups.length > 0;
      
      console.log('[Store] 옵션 체크:', { 
        productName: product.name,
        hasOptions,
        optionGroupsCount: product.optionGroups?.length || 0 
      });
      
      if (hasOptions) {
        console.log('[Store] 옵션 그룹:', product.optionGroups);
        product.optionGroups.forEach((group, idx) => {
          console.log(`[Store]   그룹 ${idx + 1}: ${group.name} (${group.options?.length || 0}개)`);
        });
        
        // 옵션 있음 → 옵션 선택 화면으로
        console.log('[Store] 🎯 CHECK_OPTIONS 디스패치');
        dispatch('CHECK_OPTIONS', { product });
      } else {
        // 옵션 없음 → 바로 장바구니 추가
        console.log('[Store] 옵션 없는 상품, 바로 장바구니 추가');
        get().addToCart();
        dispatch('CHECK_OPTIONS', { product }); // ASK_MORE로 전환
        
        // ✅ 후보 화면 초기화
        set({ candidates: [] });
      }
      
      console.log('[Store] ═══════════════════════════════');
    } else if (candidates.length > 1) {
      // 여러 후보
      console.log('[Store] ⚠️ 여러 후보:', candidates.length, '개');
      set({ candidates });
      dispatch('MENU_MATCHED', { candidates });
      console.log('[Store] ═══════════════════════════════');
    } else {
      // 매칭 실패
      console.log('[Store] ❌ 매칭 실패');
      dispatch('MENU_MATCHED', { candidates: [] });
      console.log('[Store] ═══════════════════════════════');
    }
  },

  // 상품 명확화 (후보 중 선택)
  onProductClarified: (product) => {
    console.log('[Store] ═══════════════════════════════');
    console.log('[Store] 🎯 onProductClarified 호출:', product.name);
    
    set({
      currentProduct: product,
      candidates: [], // ✅ 후보 초기화
    });
    
    const { dispatch } = get();
    dispatch('PRODUCT_CLARIFIED', { product });
    
    // ✅ setTimeout 제거 - 동기적으로 처리
    const hasOptions = product.optionGroups && product.optionGroups.length > 0;
    
    if (hasOptions) {
      // 옵션 있음 → 옵션 선택 화면으로
      console.log('[Store] 옵션 있음 → CHECK_OPTIONS');
      dispatch('CHECK_OPTIONS', { product });
    } else {
      // 옵션 없음 → 바로 장바구니 추가
      console.log('[Store] 옵션 없는 상품, 바로 장바구니 추가');
      get().addToCart();
      dispatch('CHECK_OPTIONS', { product }); // ASK_MORE로 전환
      
      // ✅ 후보 화면 초기화
      set({ candidates: [], recommendationResults: {} }); // 추천 결과도 초기화
    }
    
    console.log('[Store] ═══════════════════════════════');
  },

  // 옵션 선택 (개별) - 팝업용
  onOptionSelected: (option) => {
    const { selectedOptions, pendingOptions, currentProduct } = get();
    
    console.log('[Store] ──────────────────────────────');
    console.log('[Store] 🎯 옵션 선택:', option.name);
    console.log('[Store] 남은 옵션 그룹:', pendingOptions.length, '→', pendingOptions.length - 1);
    
    const newSelectedOptions = [...selectedOptions, option];
    const newPendingOptions = pendingOptions.slice(1);
    
    // ✅ 전체 옵션 개수 계산
    const totalOptionGroups = currentProduct?.optionGroups?.length || 0;
    
    set({
      selectedOptions: newSelectedOptions,
      pendingOptions: newPendingOptions,
    });
    
    const { dispatch } = get();
    
    // 모든 옵션 선택 완료 시
    if (newPendingOptions.length === 0) {
      console.log('[Store] ✅ 모든 옵션 선택 완료!');
      console.log('[Store] 선택된 옵션:', newSelectedOptions.map(opt => opt.name));
      console.log('[Store] 장바구니에 추가 중...');
      
      // 먼저 상태 업데이트
      dispatch('OPTION_SELECTED', {
        option,
        remainingOptions: [],
        totalOptionGroups, // ✅ 전체 옵션 개수 전달
      });
      
      // ✅ setTimeout 제거 - 동기적으로 처리
      get().addToCart();
      console.log('[Store] ✅ 장바구니 추가 완료 → ASK_MORE 상태');
      
      // ✅ 후보 화면 초기화
      set({ candidates: [], recommendationResults: {} }); // 추천 결과도 초기화
    } else {
      // 아직 남은 옵션이 있음
      console.log('[Store] ⏭️ 다음 옵션 그룹:', newPendingOptions[0].name);
      dispatch('OPTION_SELECTED', {
        option,
        remainingOptions: newPendingOptions,
        totalOptionGroups, // ✅ 전체 옵션 개수 전달
      });
    }
    console.log('[Store] ──────────────────────────────');
  },

  // ✅ 옵션 전체 선택 완료 (팝업용) - 새로 추가
  onAllOptionsSelected: (selectedOptions) => {
    console.log('[Store] 🎯 모든 옵션 선택 완료:', selectedOptions.length, '개');
    
    set({
      selectedOptions: selectedOptions,
      pendingOptions: [], // 모두 처리됨
    });
    
    const { dispatch } = get();
    
    // 상태 전환 (ASK_OPTIONS → ASK_MORE)
    dispatch('OPTION_SELECTED', {
      option: selectedOptions[selectedOptions.length - 1],
      remainingOptions: [],
    });
    
    // ✅ setTimeout 제거 - 동기적으로 처리
    get().addToCart();
    
    // ✅ 후보 화면 초기화
    set({ candidates: [], recommendationResults: {} }); // 추천 결과도 초기화
  },

  // 장바구니에 추가
  addToCart: () => {
    const { currentProduct, selectedOptions, cart } = get();
    
    console.log('[Store] ═══════════════════════════════');
    console.log('[Store] 🛒 장바구니에 추가 시작...');
    
    if (!currentProduct) {
      console.warn('[Store] ⚠️ currentProduct가 없음! (이미 처리됨 or 중복 호출)');
      console.log('[Store] ═══════════════════════════════');
      return;
    }
    
    // ✅ 중복 방지: 같은 상품+옵션이 이미 장바구니에 있는지 확인 (타임스탬프 기반)
    const now = Date.now();
    
    // 옵션을 정렬된 ID 배열로 변환 (비교용)
    const currentOptionIds = selectedOptions.map(opt => opt.id).sort().join(',');
    
    const recentlySameItem = cart.find(item => {
      if (item.product.id !== currentProduct.id) return false;
      if ((now - item.id) > 2000) return false; // ✅ 2초로 증가
      
      // 옵션도 비교
      const itemOptionIds = item.selectedOptions.map(opt => opt.id).sort().join(',');
      return itemOptionIds === currentOptionIds;
    });
    
    if (recentlySameItem) {
      console.warn('[Store] ⚠️⚠️⚠️ 중복 추가 방지! 2초 이내 같은 상품+옵션이 이미 추가됨');
      console.warn('[Store] 상품:', currentProduct.name);
      console.warn('[Store] 옵션:', currentOptionIds);
      console.log('[Store] ═══════════════════════════════');
      return;
    }
    
    // 가격 계산
    const optionPrice = selectedOptions.reduce((sum, opt) => sum + (opt.price || 0), 0);
    const totalPrice = currentProduct.price + optionPrice;
    
    const cartItem = {
      id: now, // ✅ 타임스탬프 재사용
      product: currentProduct,
      selectedOptions: [...selectedOptions],
      totalPrice,
    };
    
    console.log('[Store] 상품명:', cartItem.product.name);
    console.log('[Store] 기본가:', currentProduct.price, '원');
    console.log('[Store] 옵션가:', optionPrice, '원');
    console.log('[Store] 총가격:', totalPrice, '원');
    console.log('[Store] 선택 옵션:', cartItem.selectedOptions.map(opt => opt.name));
    console.log('[Store] 추가 전 장바구니:', cart.length, '개');
    console.log('[Store] 추가 후 장바구니:', cart.length + 1, '개');
    
    set({
      cart: [...cart, cartItem],
      currentProduct: null, // ✅ 중요: 추가 후 즉시 null로 설정하여 중복 방지
      selectedOptions: [],
      pendingOptions: [],
    });
    
    console.log('[Store] ✅ 장바구니 추가 완료!');
    console.log('[Store] ═══════════════════════════════');
  },

  // 장바구니에서 삭제
  removeFromCart: (itemId) => {
    const { cart } = get();
    
    console.log('[Store] ═══════════════════════════════');
    console.log('[Store] 🗑️ 장바구니에서 삭제 시작...');
    console.log('[Store] 삭제할 아이템 ID:', itemId);
    console.log('[Store] 삭제 전 장바구니:', cart.length, '개');
    
    const updatedCart = cart.filter(item => item.id !== itemId);
    
    console.log('[Store] 삭제 후 장바구니:', updatedCart.length, '개');
    
    set({ cart: updatedCart });
    
    console.log('[Store] ✅ 장바구니 삭제 완료!');
    console.log('[Store] ═══════════════════════════════');
  },

  // 추가 주문 여부
  onMoreOrder: (hasMore) => {
    const { dispatch, cart } = get();
    
    console.log('[Store] 📋 추가 주문 여부:', hasMore ? '있음' : '없음');
    console.log('[Store] 현재 장바구니:', cart.length, '개');
    
    if (hasMore) {
      console.log('[Store] ✅ MORE_ORDER 디스패치 → LISTENING으로 전환');
      dispatch('MORE_ORDER');
    } else {
      console.log('[Store] ✅ NO_MORE_ORDER 디스패치 → CONFIRM으로 전환');
      dispatch('NO_MORE_ORDER', { cart });
    }
  },

  // 주문 확인
  onConfirm: (confirmed) => {
    const { dispatch } = get();
    
    if (confirmed) {
      dispatch('CONFIRMED');
    } else {
      dispatch('CANCELLED');
    }
  },

  // 결제 완료
  onPaymentCompleted: () => {
    const { dispatch } = get();
    dispatch('PAYMENT_COMPLETED');
    
    // 3초 후 초기화는 page.js에서 처리
  },

  // 결제 실패
  onPaymentFailed: () => {
    const { dispatch } = get();
    dispatch('PAYMENT_FAILED');
  },

  // 초기화
  reset: () => {
    set({
      ...initialState,
      products: get().products,
      categories: get().categories,
      recommendationResults: {}, // 추천 결과도 초기화
    });
  },

  // 에러 처리
  setError: (error) => {
    set({
      error,
      currentState: KioskState.ERROR,
    });
  },
}));

export default useKioskStore;
