import { t, getProductName } from './translations';
import { getWelcomeMessage, getMoreOrderMessage } from './personalizedMessages';

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
export function transition(currentState, action, payload = {}, language = 'ko', customerInfo = null) {
  switch (currentState) {
    case KioskState.IDLE:
      if (action === 'CUSTOMER_DETECTED') {
        // 👤 고객 정보 기반 맞춤 환영 메시지
        const welcomeMsg = getWelcomeMessage(customerInfo, language);
        
        return {
          newState: KioskState.GREETING,
          message: welcomeMsg,
        };
      }
      break;

    case KioskState.GREETING:
      if (action === 'TTS_COMPLETED') {
        return {
          newState: KioskState.LISTENING,
          message: t('howCanIHelp', language),
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
            message: t('menuNotFound', language),
          };
        }
        
        // 후보가 1개: 확실한 매칭
        if (candidates.length === 1) {
          const productName = getProductName(candidates[0].product, language);
          return {
            newState: KioskState.PRODUCT_SELECTED,
            selectedProduct: candidates[0].product,
            message: `${productName}${t('selected', language)}`,
          };
        }
        
        // 후보가 여러 개: 명확화 필요
        return {
          newState: KioskState.ASK_DISAMBIGUATION,
          candidates: candidates,
          message: generateDisambiguationMessage(candidates, language),
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
            message: t('menuNotFoundAskMore', language),
          };
        }
        
        // 후보가 1개: 확실한 매칭
        if (candidates.length === 1) {
          const productName = getProductName(candidates[0].product, language);
          return {
            newState: KioskState.PRODUCT_SELECTED,
            selectedProduct: candidates[0].product,
            message: `${productName}${t('selected', language)}`,
          };
        }
        
        // 후보가 여러 개: 명확화 필요
        return {
          newState: KioskState.ASK_DISAMBIGUATION,
          candidates: candidates,
          message: generateDisambiguationMessage(candidates, language),
        };
      }
      break;

    case KioskState.ASK_DISAMBIGUATION:
      if (action === 'PRODUCT_CLARIFIED') {
        const { product } = payload;
        const productName = getProductName(product, language);
        return {
          newState: KioskState.PRODUCT_SELECTED,
          selectedProduct: product,
          message: `${productName}${t('selected', language)}`,
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
            message: t('selectOption', language),
          };
        }
        
        // 옵션이 없는 경우 바로 장바구니에 추가
        // 👤 고객 정보 기반 맞춤 메시지
        const moreOrderMsg1 = getMoreOrderMessage(customerInfo, language);
        
        return {
          newState: KioskState.ASK_MORE,
          message: moreOrderMsg1,
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
            message: t('selectOption', language),
          };
        }
        
        // 모든 옵션 선택 완료
        // 👤 고객 정보 기반 맞춤 메시지
        const moreOrderMsg2 = getMoreOrderMessage(customerInfo, language);
        
        return {
          newState: KioskState.ASK_MORE,
          message: moreOrderMsg2,
        };
      }
      break;

    case KioskState.ASK_MORE:
      if (action === 'MORE_ORDER') {
        return {
          newState: KioskState.LISTENING,
          message: t('yesPleaseSpeak', language),
        };
      }
      if (action === 'NO_MORE_ORDER') {
        return {
          newState: KioskState.CONFIRM,
          message: generateConfirmMessage(payload.cart, language),
        };
      }
      break;

    case KioskState.CONFIRM:
      if (action === 'CONFIRMED') {
        return {
          newState: KioskState.PAYMENT,
          message: t('proceedPayment', language),
        };
      }
      if (action === 'CANCELLED') {
        return {
          newState: KioskState.LISTENING,
          message: t('modifyOrder', language),
        };
      }
      break;

    case KioskState.PAYMENT:
      if (action === 'PAYMENT_COMPLETED') {
        return {
          newState: KioskState.COMPLETE,
          message: t('paymentCompleted', language),
        };
      }
      if (action === 'PAYMENT_FAILED') {
        return {
          newState: KioskState.ERROR,
          message: t('paymentFailed', language),
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
          message: t('pleaseOrderAgain', language),
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
function generateDisambiguationMessage(candidates, language = 'ko') {
  const menuList = candidates
    .slice(0, 3)
    .map((c, idx) => {
      const productName = getProductName(c.product, language);
      return language === 'ko' 
        ? `${idx + 1}번 ${productName}`
        : `${idx + 1}. ${productName}`;
    })
    .join(', ');
  
  return `${t('whichMenu', language)} ${menuList}`;
}

/**
 * 주문 확인 메시지 생성
 */
function generateConfirmMessage(cart, language = 'ko') {
  if (cart.length === 0) {
    return t('noOrders', language);
  }
  
  const itemList = cart
    .map(item => {
      const productName = getProductName(item.product, language);
      const options = item.selectedOptions
        ?.map(opt => opt.name)
        .join(', ');
      return options 
        ? `${productName} (${options})` 
        : productName;
    })
    .join(', ');
  
  const total = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  
  if (language === 'ko') {
    return `${t('orderDetails', language)} ${itemList}입니다. ${t('totalIs', language)} ${total.toLocaleString()}원${t('orderConfirm', language)}`;
  } else {
    return `${t('orderDetails', language)} ${itemList}. ${t('totalIs', language)} ${total.toLocaleString()} ${t('won', language)}${t('orderConfirm', language)}`;
  }
}

export default {
  KioskState,
  initialState,
  transition,
};

