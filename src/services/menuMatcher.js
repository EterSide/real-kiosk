import Hangul from 'hangul-js';

/**
 * 레벤슈타인 거리 계산 (유사도 측정)
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * 유사도 계산 (0~1 사이 값)
 */
function calculateSimilarity(str1, str2) {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - distance / maxLength;
}

/**
 * 한글 초성 추출
 */
function getChosung(str) {
  const cho = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 
               'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  let result = '';
  
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 0xAC00;
    if (code > -1 && code < 11172) {
      result += cho[Math.floor(code / 588)];
    }
  }
  
  return result;
}

/**
 * 키워드 추출
 */
function extractKeywords(text) {
  const keywords = {
    menuNames: [],
    isSet: false,
    isSingle: false,
    quantity: 1,
    numbers: [],
  };

  // 세트/단품 감지
  if (text.includes('세트') || text.includes('셋트')) {
    keywords.isSet = true;
  }
  if (text.includes('단품')) {
    keywords.isSingle = true;
  }

  // 숫자 추출
  const numberMatches = text.match(/\d+/g);
  if (numberMatches) {
    keywords.numbers = numberMatches.map(n => parseInt(n));
    // 첫 번째 숫자를 수량으로 간주 (10 이하일 경우)
    if (keywords.numbers[0] && keywords.numbers[0] <= 10) {
      keywords.quantity = keywords.numbers[0];
    }
  }

  // 한글 숫자 변환
  const koreanNumbers = {
    '하나': 1, '한': 1, '일': 1,
    '둘': 2, '두': 2, '이': 2,
    '셋': 3, '세': 3, '삼': 3,
    '넷': 4, '네': 4, '사': 4,
    '다섯': 5, '오': 5,
    '여섯': 6, '육': 6,
    '일곱': 7, '칠': 7,
    '여덟': 8, '팔': 8,
    '아홉': 9, '구': 9,
    '열': 10, '십': 10,
  };

  for (const [korean, num] of Object.entries(koreanNumbers)) {
    if (text.includes(korean)) {
      keywords.numbers.push(num);
      if (keywords.quantity === 1) {
        keywords.quantity = num;
      }
    }
  }

  return keywords;
}

/**
 * 메뉴 매칭
 */
export function matchMenu(userInput, products) {
  const text = userInput.trim().toLowerCase();
  const keywords = extractKeywords(text);
  const candidates = [];

  console.log('[MenuMatcher] 매칭 시작:', { userInput, productsCount: products.length });
  
  // 유효한 상품만 필터링
  const validProducts = products.filter(p => {
    if (!p || typeof p !== 'object') {
      console.warn('[MenuMatcher] ⚠️ 잘못된 상품 (타입):', p);
      return false;
    }
    if (!p.name || typeof p.name !== 'string') {
      console.warn('[MenuMatcher] ⚠️ 잘못된 상품 (name 없음):', p);
      return false;
    }
    return true;
  });
  
  console.log('[MenuMatcher] 유효한 상품:', validProducts.length, '/', products.length);

  for (const product of validProducts) {

    const productName = product.name.toLowerCase();
    const productChosung = getChosung(product.name);
    const inputChosung = getChosung(text);

    let score = 0;

    // 1. 완전 일치
    if (text.includes(productName) || productName.includes(text)) {
      score += 100;
    }

    // 2. 초성 매칭
    if (inputChosung && productChosung.includes(inputChosung)) {
      score += 50;
    }

    // 3. 유사도 매칭
    const similarity = calculateSimilarity(text, productName);
    score += similarity * 30;

    // 4. 부분 단어 매칭
    const words = text.split(/\s+/);
    for (const word of words) {
      if (word.length >= 2 && productName.includes(word)) {
        score += 20;
      }
    }

    // 5. 세트/단품 필터링
    const isProductSet = product.type === 'SET' || 
                        (product.name && product.name.includes('세트')) ||
                        (product.optionGroups && product.optionGroups.length > 0);
    if (keywords.isSet && isProductSet) {
      score += 30;
    } else if (keywords.isSingle && !isProductSet) {
      score += 30;
    }

    // 점수가 있는 경우만 후보에 추가
    if (score > 10) {
      candidates.push({
        product,
        score,
        similarity,
      });
    }
  }

  // 점수 순으로 정렬
  candidates.sort((a, b) => b.score - a.score);

  console.log('[MenuMatcher] 매칭 결과:', candidates.length, '개', 
    candidates.slice(0, 3).map(c => ({ name: c.product.name, score: c.score })));

  return {
    candidates: candidates.slice(0, 5), // 상위 5개만
    keywords,
  };
}

/**
 * 옵션 매칭
 */
export function matchOption(userInput, options) {
  const text = userInput.trim().toLowerCase();
  const keywords = extractKeywords(text);

  console.log('[MenuMatcher] 옵션 매칭 시작:', { userInput, optionsCount: options.length });

  // 숫자로 선택한 경우
  if (keywords.numbers.length > 0) {
    const index = keywords.numbers[0] - 1;
    if (index >= 0 && index < options.length) {
      console.log('[MenuMatcher] 숫자 선택:', options[index].name);
      return {
        selectedOption: options[index],
        confidence: 'high',
      };
    }
  }

  // 텍스트 매칭
  const candidates = [];
  for (const option of options) {
    // 안전성 체크
    if (!option || !option.name) {
      console.warn('[MenuMatcher] ⚠️ 잘못된 옵션 데이터:', option);
      continue;
    }
    
    const optionName = option.name.toLowerCase();
    let score = 0;

    if (text.includes(optionName) || optionName.includes(text)) {
      score += 100;
    }

    const similarity = calculateSimilarity(text, optionName);
    score += similarity * 50;

    if (score > 20) {
      candidates.push({
        option,
        score,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length > 0) {
    return {
      selectedOption: candidates[0].option,
      confidence: candidates[0].score > 80 ? 'high' : 'medium',
    };
  }

  return {
    selectedOption: null,
    confidence: 'low',
  };
}

/**
 * 긍정/부정 답변 감지
 */
export function detectConfirmation(userInput) {
  const text = userInput.trim().toLowerCase();
  
  console.log('[MenuMatcher] 확인 감지:', text);
  
  const positiveKeywords = ['네', '예', '응', '좋아', '맞아', '그래', '오케이', 'ㅇㅋ', 'ok', '확인'];
  const negativeKeywords = ['아니', '아뇨', '싫어', '다시', '취소', '안'];

  for (const keyword of positiveKeywords) {
    if (text.includes(keyword)) {
      console.log('[MenuMatcher] ✅ 확인 (키워드:', keyword, ')');
      return 'yes';
    }
  }

  for (const keyword of negativeKeywords) {
    if (text.includes(keyword)) {
      console.log('[MenuMatcher] ❌ 취소 (키워드:', keyword, ')');
      return 'no';
    }
  }

  console.log('[MenuMatcher] ⚠️ unknown');
  return 'unknown';
}

/**
 * 추가 주문 의도 감지
 */
export function detectMoreOrder(userInput) {
  const text = userInput.trim().toLowerCase();
  
  console.log('[MenuMatcher] 추가 주문 감지:', text);
  
  // 긍정 키워드 (추가 주문 있음)
  const moreKeywords = ['추가', '더', '또', '그리고', '네', '예', '응', '있어', '주세요', '주문'];
  
  // 부정 키워드 (추가 주문 없음)
  const noMoreKeywords = ['없어', '없습니다', '됐어', '됐습니다', '끝', '이제', '결제', '아니', '아니요', '괜찮', '안'];

  for (const keyword of moreKeywords) {
    if (text.includes(keyword)) {
      console.log('[MenuMatcher] ✅ 추가 주문 감지 (키워드:', keyword, ')');
      return 'yes';
    }
  }

  for (const keyword of noMoreKeywords) {
    if (text.includes(keyword)) {
      console.log('[MenuMatcher] ✅ 추가 주문 없음 감지 (키워드:', keyword, ')');
      return 'no';
    }
  }

  console.log('[MenuMatcher] ⚠️ unknown → 메뉴 이름일 가능성');
  return 'unknown';
}

export default {
  matchMenu,
  matchOption,
  detectConfirmation,
  detectMoreOrder,
};

