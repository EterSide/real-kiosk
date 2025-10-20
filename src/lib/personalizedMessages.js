/**
 * 고객 정보 기반 맞춤형 메시지 생성
 */

import { t } from './translations';

/**
 * 환영 메시지 생성 (나이/성별 기반)
 */
export function getWelcomeMessage(customerInfo, language = 'ko') {
  if (!customerInfo) {
    return t('welcome', language);
  }

  const { ageGroup, gender } = customerInfo;
  
  if (language === 'ko') {
    // 한국어 맞춤 메시지
    if (ageGroup === 'child') {
      return '안녕! 어서와~ 맛있는 거 골라볼까?';
    } else if (ageGroup === 'teen') {
      if (gender === 'male') {
        return '어서와! 인기 메뉴 확인해볼래?';
      } else {
        return '어서와! 맛있는 거 많아~';
      }
    } else if (ageGroup === '20s') {
      if (gender === 'male') {
        return '어서오세요! 푸짐한 세트 어때요?';
      } else {
        return '어서오세요! 신메뉴도 있어요~';
      }
    } else if (ageGroup === '30s' || ageGroup === '40s') {
      if (gender === 'male') {
        return '어서오세요! 든든한 메뉴 준비됐어요!';
      } else {
        return '어서오세요! 건강한 메뉴도 있답니다~';
      }
    } else {
      return '어서오세요! 편하게 주문하세요~';
    }
  } else {
    // 영어 맞춤 메시지
    if (ageGroup === 'child') {
      return 'Hi there! Let\'s find something yummy!';
    } else if (ageGroup === 'teen') {
      return 'Welcome! Check out our popular items!';
    } else if (ageGroup === '20s') {
      if (gender === 'male') {
        return 'Welcome! Try our hearty combo meals!';
      } else {
        return 'Welcome! Don\'t miss our new menu!';
      }
    } else if (ageGroup === '30s' || ageGroup === '40s') {
      return 'Welcome! We have great meal options for you!';
    } else {
      return 'Welcome! Please take your time ordering!';
    }
  }
}

/**
 * 추천 메뉴 메시지 (나이/성별 기반)
 */
export function getRecommendationHint(customerInfo, language = 'ko') {
  if (!customerInfo) return null;

  const { ageGroup, gender } = customerInfo;
  
  if (language === 'ko') {
    if (ageGroup === 'child') {
      return '💡 키즈 메뉴도 있어요!';
    } else if (ageGroup === 'teen' || ageGroup === '20s') {
      if (gender === 'male') {
        return '💡 와퍼 더블이 인기예요!';
      } else {
        return '💡 치킨버거 세트 추천드려요!';
      }
    } else {
      return '💡 든든한 세트 메뉴 어떠세요?';
    }
  } else {
    if (ageGroup === 'child') {
      return '💡 We have Kids Menu!';
    } else if (ageGroup === 'teen' || ageGroup === '20s') {
      if (gender === 'male') {
        return '💡 Double Whopper is popular!';
      } else {
        return '💡 Try our Chicken Burger Set!';
      }
    } else {
      return '💡 How about a combo meal?';
    }
  }
}

/**
 * 추가 주문 메시지 (나이/성별 기반)
 */
export function getMoreOrderMessage(customerInfo, language = 'ko') {
  if (!customerInfo) {
    return language === 'ko' ? '추가 주문 있으세요?' : 'Any additional orders?';
  }

  const { ageGroup } = customerInfo;
  
  if (language === 'ko') {
    if (ageGroup === 'child' || ageGroup === 'teen') {
      return '디저트나 음료 더 드릴까?';
    } else {
      return '더 주문하실 거 있어요? 사이드 메뉴도 맛있어요!';
    }
  } else {
    if (ageGroup === 'child' || ageGroup === 'teen') {
      return 'How about dessert or drinks?';
    } else {
      return 'Any additional orders? We have side menus too!';
    }
  }
}

export default {
  getWelcomeMessage,
  getRecommendationHint,
  getMoreOrderMessage,
};

