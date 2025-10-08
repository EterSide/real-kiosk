/**
 * 키오스크 상태 정의
 */
export const KioskState = {
  IDLE: 'IDLE',                       // 대기 중
  GREETING: 'GREETING',               // 인사
  LISTENING: 'LISTENING',             // 음성 듣기
  PROCESSING: 'PROCESSING',           // 처리 중
  PRODUCT_SELECTED: 'PRODUCT_SELECTED', // 상품 선택됨
  ASK_DISAMBIGUATION: 'ASK_DISAMBIGUATION', // 명확화 질문 (여러 후보)
  ASK_OPTIONS: 'ASK_OPTIONS',         // 옵션 선택 질문
  ASK_MORE: 'ASK_MORE',               // 추가 주문 여부
  CONFIRM: 'CONFIRM',                 // 주문 확인
  PAYMENT: 'PAYMENT',                 // 결제
  COMPLETE: 'COMPLETE',               // 완료
  ERROR: 'ERROR',                     // 오류
};

/**
 * 초기 상태
 */
export const initialState = {
  // 현재 상태
  currentState: KioskState.IDLE,
  
  // 현재 처리 중인 상품
  currentProduct: null,
  
  // 애매한 경우 후보 목록
  candidates: [],
  
  // 미선택 옵션 그룹들
  pendingOptions: [],
  
  // 선택 완료된 옵션들
  selectedOptions: [],
  
  // 장바구니
  cart: [],
  
  // 전체 메뉴 목록
  products: [],
  
  // 카테고리 목록
  categories: [],
  
  // 마지막 음성 입력
  lastInput: '',
  
  // 마지막 TTS 메시지
  lastMessage: '',
  
  // 에러 메시지
  error: null,
};

/**
 * 상태 전환 로직
 */
export function transition(currentState, action, payload = {}) {
  switch (currentState) {
    case KioskState.IDLE:
      if (action === 'CUSTOMER_DETECTED') {
        return {
          newState: KioskState.GREETING,
          message: '어서오세요 고객님, 주문을 시작하겠습니다.',
        };
      }
      break;

    case KioskState.GREETING:
      if (action === 'TTS_COMPLETED') {
        return {
          newState: KioskState.LISTENING,
          message: '무엇을 도와드릴까요?',
        };
      }
      break;

    case KioskState.LISTENING:
      if (action === 'SPEECH_RECEIVED') {
        return {
          newState: KioskState.PROCESSING,
          message: null,
        };
      }
      break;

    case KioskState.PROCESSING:
      if (action === 'MENU_MATCHED') {
        const { candidates } = payload;
        
        // 후보가 없음
        if (candidates.length === 0) {
          return {
            newState: KioskState.LISTENING,
            message: '죄송합니다. 찾으시는 메뉴를 찾지 못했습니다. 다시 말씀해 주시겠어요?',
          };
        }
        
        // 후보가 1개: 확실한 매칭
        if (candidates.length === 1) {
          return {
            newState: KioskState.PRODUCT_SELECTED,
            selectedProduct: candidates[0].product,
            message: `${candidates[0].product.name}을(를) 선택하셨습니다.`,
          };
        }
        
        // 후보가 여러 개: 명확화 필요
        return {
          newState: KioskState.ASK_DISAMBIGUATION,
          candidates: candidates,
          message: generateDisambiguationMessage(candidates),
        };
      }
      break;

    case KioskState.ASK_MORE:
      // ✅ ASK_MORE 상태에서도 MENU_MATCHED 처리 가능하게
      if (action === 'MENU_MATCHED') {
        const { candidates } = payload;
        
        // 후보가 없음
        if (candidates.length === 0) {
          return {
            newState: KioskState.ASK_MORE,
            message: '죄송합니다. 찾으시는 메뉴를 찾지 못했습니다. 추가 주문 있으세요?',
          };
        }
        
        // 후보가 1개: 확실한 매칭
        if (candidates.length === 1) {
          return {
            newState: KioskState.PRODUCT_SELECTED,
            selectedProduct: candidates[0].product,
            message: `${candidates[0].product.name}을(를) 선택하셨습니다.`,
          };
        }
        
        // 후보가 여러 개: 명확화 필요
        return {
          newState: KioskState.ASK_DISAMBIGUATION,
          candidates: candidates,
          message: generateDisambiguationMessage(candidates),
        };
      }
      break;

    case KioskState.ASK_DISAMBIGUATION:
      if (action === 'PRODUCT_CLARIFIED') {
        const { product } = payload;
        return {
          newState: KioskState.PRODUCT_SELECTED,
          selectedProduct: product,
          message: `${product.name}을(를) 선택하셨습니다.`,
        };
      }
      break;

    case KioskState.PRODUCT_SELECTED:
      if (action === 'CHECK_OPTIONS') {
        const { product } = payload;
        
        // 옵션이 있는 경우
        if (product.optionGroups && product.optionGroups.length > 0) {
          return {
            newState: KioskState.ASK_OPTIONS,
            pendingOptions: [...product.optionGroups],
            message: generateOptionMessage(product.optionGroups[0]),
          };
        }
        
        // 옵션이 없는 경우 바로 장바구니에 추가
        return {
          newState: KioskState.ASK_MORE,
          message: '추가 주문 있으세요?',
        };
      }
      break;

    case KioskState.ASK_OPTIONS:
      if (action === 'OPTION_SELECTED') {
        const { option, remainingOptions } = payload;
        
        // 남은 옵션이 있는 경우
        if (remainingOptions.length > 0) {
          return {
            newState: KioskState.ASK_OPTIONS,
            pendingOptions: remainingOptions,
            message: generateOptionMessage(remainingOptions[0]),
          };
        }
        
        // 모든 옵션 선택 완료
        return {
          newState: KioskState.ASK_MORE,
          message: '추가 주문 있으세요?',
        };
      }
      break;

    case KioskState.ASK_MORE:
      if (action === 'MORE_ORDER') {
        return {
          newState: KioskState.LISTENING,
          message: '네, 말씀해 주세요.',
        };
      }
      if (action === 'NO_MORE_ORDER') {
        return {
          newState: KioskState.CONFIRM,
          message: generateConfirmMessage(payload.cart),
        };
      }
      break;

    case KioskState.CONFIRM:
      if (action === 'CONFIRMED') {
        return {
          newState: KioskState.PAYMENT,
          message: '결제를 진행하겠습니다.',
        };
      }
      if (action === 'CANCELLED') {
        return {
          newState: KioskState.LISTENING,
          message: '주문을 수정하시겠습니까?',
        };
      }
      break;

    case KioskState.PAYMENT:
      if (action === 'PAYMENT_COMPLETED') {
        return {
          newState: KioskState.COMPLETE,
          message: '결제가 완료되었습니다. 감사합니다!',
        };
      }
      if (action === 'PAYMENT_FAILED') {
        return {
          newState: KioskState.ERROR,
          message: '결제에 실패했습니다. 다시 시도해 주세요.',
        };
      }
      break;

    case KioskState.COMPLETE:
      if (action === 'RESET') {
        return {
          newState: KioskState.IDLE,
          message: null,
        };
      }
      break;

    case KioskState.ERROR:
      if (action === 'RETRY') {
        return {
          newState: KioskState.LISTENING,
          message: '다시 주문해 주세요.',
        };
      }
      break;

    default:
      break;
  }

  return {
    newState: currentState,
    message: null,
  };
}

/**
 * 명확화 메시지 생성
 */
function generateDisambiguationMessage(candidates) {
  const menuList = candidates
    .slice(0, 3)
    .map((c, idx) => `${idx + 1}번 ${c.product.name}`)
    .join(', ');
  
  return `다음 중 어떤 메뉴를 원하시나요? ${menuList}`;
}

/**
 * 옵션 질문 메시지 생성 (팝업 사용 시 간단하게)
 */
function generateOptionMessage(optionGroup) {
  console.log('[stateMachine] 옵션 메시지 생성:', optionGroup);
  
  if (!optionGroup) {
    console.error('[stateMachine] ❌ optionGroup이 없습니다!');
    return '옵션을 선택해 주세요.';
  }
  
  if (!optionGroup.options || optionGroup.options.length === 0) {
    console.error('[stateMachine] ❌ options가 없습니다!');
    return '옵션을 선택해 주세요.';
  }
  
  // 팝업에서 모든 옵션을 보여주므로 간단하게
  const message = '화면에서 원하시는 옵션을 선택해 주세요.';
  console.log('[stateMachine] ✅ 생성된 메시지:', message);
  
  return message;
}

/**
 * 주문 확인 메시지 생성
 */
function generateConfirmMessage(cart) {
  if (cart.length === 0) {
    return '주문하신 상품이 없습니다.';
  }
  
  const itemList = cart
    .map(item => {
      const options = item.selectedOptions
        ?.map(opt => opt.name)
        .join(', ');
      return options 
        ? `${item.product.name} (${options})` 
        : item.product.name;
    })
    .join(', ');
  
  const total = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  
  return `주문 내역은 ${itemList}입니다. 총 ${total.toLocaleString()}원입니다. 주문하시겠습니까?`;
}

export default {
  KioskState,
  initialState,
  transition,
};

