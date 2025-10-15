import { create } from 'zustand';
import { initialState, KioskState, transition } from '@/lib/stateMachine';

export const useKioskStore = create((set, get) => ({
  ...initialState,
  
  // 언어 설정 (기본값: 한국어)
  language: 'ko',
  
  // 고객 정보 (나이/성별)
  customerInfo: null,

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

  // 메뉴 매칭 결과 처리
  onMenuMatched: (candidates) => {
    const { dispatch } = get();
    
    if (candidates.length === 1) {
      // 명확한 매칭
      const product = candidates[0].product;
      set({
        currentProduct: product,
        candidates: [],
      });
      
      dispatch('MENU_MATCHED', { candidates });
      
      // 옵션 체크 및 장바구니 추가
      setTimeout(() => {
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
          
          // pendingOptions 설정 확인
          setTimeout(() => {
            const state = get();
            console.log('[Store] CHECK_OPTIONS 후 상태:', {
              currentState: state.currentState,
              pendingOptions: state.pendingOptions,
              pendingCount: state.pendingOptions?.length || 0
            });
          }, 200);
        } else {
          // 옵션 없음 → 바로 장바구니 추가
          console.log('[Store] 옵션 없는 상품, 바로 장바구니 추가');
          get().addToCart();
          dispatch('CHECK_OPTIONS', { product }); // ASK_MORE로 전환
        }
      }, 100);
    } else if (candidates.length > 1) {
      // 여러 후보
      set({ candidates });
      dispatch('MENU_MATCHED', { candidates });
    } else {
      // 매칭 실패
      dispatch('MENU_MATCHED', { candidates: [] });
    }
  },

  // 상품 명확화 (후보 중 선택)
  onProductClarified: (product) => {
    set({
      currentProduct: product,
      candidates: [],
    });
    
    const { dispatch } = get();
    dispatch('PRODUCT_CLARIFIED', { product });
    
    // 옵션 체크 및 장바구니 추가
    setTimeout(() => {
      const hasOptions = product.optionGroups && product.optionGroups.length > 0;
      
      if (hasOptions) {
        // 옵션 있음 → 옵션 선택 화면으로
        dispatch('CHECK_OPTIONS', { product });
      } else {
        // 옵션 없음 → 바로 장바구니 추가
        console.log('[Store] 옵션 없는 상품, 바로 장바구니 추가');
        get().addToCart();
        dispatch('CHECK_OPTIONS', { product }); // ASK_MORE로 전환
      }
    }, 100);
  },

  // 옵션 선택 (개별) - 팝업용
  onOptionSelected: (option) => {
    const { selectedOptions, pendingOptions } = get();
    
    console.log('[Store] ──────────────────────────────');
    console.log('[Store] 🎯 옵션 선택:', option.name);
    console.log('[Store] 남은 옵션 그룹:', pendingOptions.length, '→', pendingOptions.length - 1);
    
    const newSelectedOptions = [...selectedOptions, option];
    const newPendingOptions = pendingOptions.slice(1);
    
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
      });
      
      // 그 다음 장바구니 추가
      setTimeout(() => {
        get().addToCart();
        console.log('[Store] ✅ 장바구니 추가 완료 → ASK_MORE 상태');
      }, 100);
    } else {
      // 아직 남은 옵션이 있음
      console.log('[Store] ⏭️ 다음 옵션 그룹:', newPendingOptions[0].name);
      dispatch('OPTION_SELECTED', {
        option,
        remainingOptions: newPendingOptions,
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
    
    // 장바구니에 추가
    setTimeout(() => {
      get().addToCart();
    }, 100);
  },

  // 장바구니에 추가
  addToCart: () => {
    const { currentProduct, selectedOptions, cart } = get();
    
    console.log('[Store] ═══════════════════════════════');
    console.log('[Store] 🛒 장바구니에 추가 시작...');
    
    if (!currentProduct) {
      console.error('[Store] ❌ currentProduct가 없음!');
      console.log('[Store] ═══════════════════════════════');
      return;
    }
    
    // 가격 계산
    const optionPrice = selectedOptions.reduce((sum, opt) => sum + (opt.price || 0), 0);
    const totalPrice = currentProduct.price + optionPrice;
    
    const cartItem = {
      id: Date.now(),
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
      currentProduct: null,
      selectedOptions: [],
      pendingOptions: [],
    });
    
    console.log('[Store] ✅ 장바구니 추가 완료!');
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
