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
  
  // 추천 결과 (추천 이유 포함) - product_id를 키로 사용
  recommendationResults: {},
  
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
          return {
            newState: KioskState.PRODUCT_SELECTED,
            selectedProduct: candidates[0].product,
            message: null, // ✅ 메시지 제거 - 다음 단계 TTS와 겹치지 않도록
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
          return {
            newState: KioskState.PRODUCT_SELECTED,
            selectedProduct: candidates[0].product,
            message: null, // ✅ 메시지 제거 - 다음 단계 TTS와 겹치지 않도록
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
        return {
          newState: KioskState.PRODUCT_SELECTED,
          selectedProduct: payload.product,
          message: null, // ✅ 메시지 제거 - 다음 단계 TTS와 겹치지 않도록
        };
      }
      break;

    case KioskState.PRODUCT_SELECTED:
      if (action === 'CHECK_OPTIONS') {
        const { product } = payload;
        
        // 옵션이 있는 경우
        if (product.optionGroups && product.optionGroups.length > 0) {
          // 첫 번째 옵션 그룹의 상세 안내 메시지 생성
          const firstOptionGroup = product.optionGroups[0];
          const optionMessage = generateOptionMessage(firstOptionGroup, language, 0); // ✅ optionIndex = 0 (첫 번째)
          
          return {
            newState: KioskState.ASK_OPTIONS,
            pendingOptions: [...product.optionGroups],
            message: optionMessage,
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
        const { option, remainingOptions, totalOptionGroups } = payload;
        
        // 남은 옵션이 있는 경우
        if (remainingOptions.length > 0) {
          // 다음 옵션 그룹의 상세 안내 메시지 생성
          const nextOptionGroup = remainingOptions[0];
          
          // ✅ 현재 옵션 인덱스 계산 (전체 개수 - 남은 개수)
          const currentOptionIndex = totalOptionGroups ? totalOptionGroups - remainingOptions.length : 0;
          const optionMessage = generateOptionMessage(nextOptionGroup, language, currentOptionIndex);
          
          return {
            newState: KioskState.ASK_OPTIONS,
            pendingOptions: remainingOptions,
            message: optionMessage,
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
 * 옵션 선택 메시지 생성 (번호 포함)
 * @param {Object} optionGroup - 옵션 그룹
 * @param {string} language - 언어 ('ko' 또는 'en')
 * @param {number} optionIndex - 현재 옵션의 인덱스 (0부터 시작, 0=첫번째)
 */
function generateOptionMessage(optionGroup, language = 'ko', optionIndex = 0) {
  if (!optionGroup || !optionGroup.options || optionGroup.options.length === 0) {
    return t('selectOption', language);
  }
  
  // 옵션 그룹 이름
  const groupName = optionGroup.name;
  
  // 옵션이 많으면 (5개 이상) 번호만 안내
  if (optionGroup.options.length >= 5) {
    if (language === 'ko') {
      // ✅ 첫 번째 옵션만 "화면의 번호를..." 안내, 두 번째부터는 생략
      if (optionIndex === 0) {
        return `${groupName}을 선택해주세요. 화면의 번호를 말씀하시거나 터치해주세요.`;
      } else {
        return `${groupName}을 선택해주세요.`;
      }
    } else {
      if (optionIndex === 0) {
        return `Please select ${groupName}. Say the number or touch the screen.`;
      } else {
        return `Please select ${groupName}.`;
      }
    }
  }
  
  // 옵션이 적으면 (4개 이하) 모든 옵션 안내
  const optionList = optionGroup.options
    .slice(0, 4) // 최대 4개까지만
    .map((opt, idx) => {
      if (language === 'ko') {
        return `${idx + 1}번 ${opt.name}`;
      } else {
        return `${idx + 1}. ${opt.name}`;
      }
    })
    .join(', ');
  
  if (language === 'ko') {
    return `${groupName}을 선택해주세요. ${optionList}`;
  } else {
    return `Please select ${groupName}. ${optionList}`;
  }
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

