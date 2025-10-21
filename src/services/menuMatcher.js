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
 * 공통 제외 단어 목록 (변별력이 없는 단어들)
 */
const COMMON_EXCLUDE_WORDS = [
  '와퍼',
  '버거',
  '세트',
  '단품',
  '메뉴',
];

/**
 * 텍스트에서 공통 단어 제거 (매칭 정확도 향상)
 */
function removeCommonWords(text) {
  let cleaned = text.toLowerCase();
  
  // "와퍼", "버거" 같은 공통 단어 제거
  for (const word of COMMON_EXCLUDE_WORDS) {
    // 단어를 공백으로 치환 (완전히 삭제하면 단어가 붙을 수 있음)
    cleaned = cleaned.replace(new RegExp(word, 'g'), ' ');
  }
  
  // 연속된 공백을 하나로 정리
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  console.log('[removeCommonWords]', text, '→', cleaned);
  return cleaned;
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

  // 숫자 추출 (아라비아 숫자)
  const numberMatches = text.match(/\d+/g);
  if (numberMatches) {
    keywords.numbers = numberMatches.map(n => parseInt(n));
    console.log('[extractKeywords] 아라비아 숫자 추출:', keywords.numbers);
    // 첫 번째 숫자를 수량으로 간주 (10 이하일 경우)
    if (keywords.numbers[0] && keywords.numbers[0] <= 10) {
      keywords.quantity = keywords.numbers[0];
    }
  }

  // 한글 숫자 변환 (우선순위: 긴 단어부터 매칭)
  const koreanNumbers = {
    '첫번째': 1, '첫 번째': 1, '첫째': 1,
    '두번째': 2, '두 번째': 2, '둘째': 2,
    '세번째': 3, '세 번째': 3, '셋째': 3,
    '네번째': 4, '네 번째': 4, '넷째': 4,
    '다섯번째': 5, '다섯 번째': 5,
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
  
  // ✅ 제외할 단어들 (숫자로 인식하면 안 되는 단어)
  const excludeWords = ['세트', '세트메뉴', '이벤트', '네이버', '네트워크'];
  let shouldExtractNumbers = true;
  
  for (const word of excludeWords) {
    if (text.includes(word)) {
      console.log('[extractKeywords] ⚠️ 제외 단어 발견:', word, '→ 한글 숫자 추출 주의');
      shouldExtractNumbers = false;
      break;
    }
  }

  // "번" 단위로 숫자 추출 강화 ("1번", "일번", "첫번째" 등)
  const numberWithBun = text.match(/(\d+|첫|두|세|네|다섯|여섯|일곱|여덟|아홉|열)\s*번(째)?/g);
  if (numberWithBun) {
    console.log('[extractKeywords] "번" 패턴 발견:', numberWithBun);
  }

  for (const [korean, num] of Object.entries(koreanNumbers)) {
    if (text.includes(korean)) {
      // ✅ "세트" 같은 단어가 있으면 "세"는 무시
      if (!shouldExtractNumbers && ['세', '이', '네', '한', '두'].includes(korean)) {
        console.log('[extractKeywords] ⚠️ 제외 단어 포함으로 인해 무시:', korean);
        continue;
      }
      
      // 중복 방지: 이미 추가된 숫자는 제외
      if (!keywords.numbers.includes(num)) {
        keywords.numbers.push(num);
        console.log('[extractKeywords] 한글 숫자 추출:', korean, '→', num);
      }
      if (keywords.quantity === 1) {
        keywords.quantity = num;
      }
    }
  }

  console.log('[extractKeywords] 최종 결과:', { text, numbers: keywords.numbers });
  return keywords;
}

/**
 * 메뉴 매칭
 */
export function matchMenu(userInput, products, language = 'ko') {
  const text = userInput.trim().toLowerCase();
  const keywords = extractKeywords(text);
  const candidates = [];

  console.log('[MenuMatcher] 매칭 시작:', { userInput, productsCount: products.length, language });
  
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
    // 언어에 따라 상품명 선택
    let productName;
    if (language === 'en' && product.productEngName) {
      productName = product.productEngName.toLowerCase();
      console.log('[MenuMatcher] 영어 상품명 사용:', product.productEngName);
    } else {
      productName = product.name.toLowerCase();
    }

    // ✅ 공통 단어 제거한 버전으로 매칭 (정확도 향상)
    const cleanedInput = removeCommonWords(text);
    const cleanedProductName = removeCommonWords(productName);

    const productChosung = getChosung(product.name);
    const inputChosung = getChosung(text);

    let score = 0;

    // 1. 완전 일치 (원본 텍스트)
    if (text.includes(productName) || productName.includes(text)) {
      score += 100;
    }

    // 1-2. 완전 일치 (정제된 텍스트) - 공통 단어 제거 후 매칭
    if (cleanedInput && cleanedProductName) {
      if (cleanedInput.includes(cleanedProductName) || cleanedProductName.includes(cleanedInput)) {
        score += 120; // 정제된 텍스트 매칭에 더 높은 가중치
        console.log('[MenuMatcher] ✨ 정제 텍스트 매칭:', cleanedInput, '←→', cleanedProductName);
      }
    }

    // 2. 초성 매칭
    if (inputChosung && productChosung.includes(inputChosung)) {
      score += 50;
    }

    // 3. 유사도 매칭 (정제된 텍스트 사용)
    if (cleanedInput && cleanedProductName) {
      const cleanedSimilarity = calculateSimilarity(cleanedInput, cleanedProductName);
      score += cleanedSimilarity * 40; // 가중치 증가
    }
    
    // 3-2. 유사도 매칭 (원본 텍스트)
    const similarity = calculateSimilarity(text, productName);
    score += similarity * 20; // 보조 점수

    // 4. 부분 단어 매칭 (정제된 텍스트)
    const cleanedWords = cleanedInput.split(/\s+/).filter(w => w.length >= 2);
    for (const word of cleanedWords) {
      if (cleanedProductName.includes(word)) {
        score += 25;
        console.log('[MenuMatcher] 단어 매칭:', word, 'in', cleanedProductName);
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

  // ✅ 스마트 필터링: 정확한 매칭이면 1개만, 애매하면 최대 2개까지
  let filteredCandidates = candidates;
  
  if (candidates.length > 0) {
    const topScore = candidates[0].score;
    const secondScore = candidates.length > 1 ? candidates[1].score : 0;
    const scoreDiff = topScore - secondScore;
    
    console.log('[MenuMatcher] 📊 점수 분석:');
    console.log('[MenuMatcher]   1위:', candidates[0].product.name, '- 점수:', topScore.toFixed(1));
    if (candidates.length > 1) {
      console.log('[MenuMatcher]   2위:', candidates[1].product.name, '- 점수:', secondScore.toFixed(1));
      console.log('[MenuMatcher]   점수 차이:', scoreDiff.toFixed(1));
    }
    console.log('[MenuMatcher]   세트 키워드:', keywords.isSet ? '있음' : '없음');
    console.log('[MenuMatcher]   단품 키워드:', keywords.isSingle ? '있음' : '없음');
    
    // 🎯 특수 케이스: "세트/단품" 키워드 없이 애매하게 말한 경우 (예: "몬스터")
    // → 단품/세트 페어가 있으면 둘 다 보여줌
    const hasNoTypeKeyword = !keywords.isSet && !keywords.isSingle;
    if (hasNoTypeKeyword && candidates.length >= 2) {
      // 1위와 2위가 단품/세트 페어인지 확인
      const first = candidates[0].product;
      const second = candidates[1].product;
      
      // 이름 유사도 체크 (예: "몬스터와퍼" vs "몬스터와퍼 세트")
      const firstName = first.name.toLowerCase().replace(/\s*(세트|단품)\s*/g, '').trim();
      const secondName = second.name.toLowerCase().replace(/\s*(세트|단품)\s*/g, '').trim();
      
      const isPair = firstName === secondName && scoreDiff < 50; // 점수 차이가 너무 크지 않아야 함
      
      if (isPair) {
        console.log('[MenuMatcher] 🎯 특수 케이스: 단품/세트 페어 감지!');
        console.log('[MenuMatcher]   기본명:', firstName);
        console.log('[MenuMatcher]   → 둘 다 보여줌 (사용자가 선택할 수 있게)');
        filteredCandidates = candidates.slice(0, 2);
        
        console.log('[MenuMatcher] 🎯 최종 후보:', filteredCandidates.length, '개');
        filteredCandidates.forEach((c, i) => {
          console.log(`[MenuMatcher]   ${i + 1}. ${c.product.name} (점수: ${c.score.toFixed(1)})`);
        });
        
        return {
          candidates: filteredCandidates,
          keywords,
        };
      }
    }
    
    // 케이스 1: 1위 점수가 매우 높음 (100점 이상 = 완전 일치 또는 정제 매칭)
    if (topScore >= 100) {
      console.log('[MenuMatcher] ✅ 케이스 1: 1위 점수 매우 높음 (≥100) → 1개만 반환');
      filteredCandidates = [candidates[0]];
    }
    // 케이스 2: 1위와 2위 점수 차이가 큼 (30점 이상)
    else if (candidates.length > 1 && scoreDiff >= 30) {
      console.log('[MenuMatcher] ✅ 케이스 2: 점수 차이 큼 (≥30) → 1개만 반환');
      filteredCandidates = [candidates[0]];
    }
    // 케이스 3: 애매한 경우 → 최대 2개까지만
    else {
      console.log('[MenuMatcher] ✅ 케이스 3: 애매한 매칭 → 최대 2개까지 반환');
      filteredCandidates = candidates.slice(0, 2);
    }
    
    console.log('[MenuMatcher] 🎯 최종 후보:', filteredCandidates.length, '개');
    filteredCandidates.forEach((c, i) => {
      console.log(`[MenuMatcher]   ${i + 1}. ${c.product.name} (점수: ${c.score.toFixed(1)})`);
    });
  }

  return {
    candidates: filteredCandidates,
    keywords,
  };
}

/**
 * 스마트 키워드 매칭 (사이즈, 별칭, 기본 옵션)
 */
function matchOptionWithKeywords(text, options) {
  console.log('[옵션 매칭] 🧠 스마트 키워드 매칭 시작...');
  
  // 사이즈 키워드 (L/Large)
  const largeKeywords = ['큰거', '큰 거', '라지', 'large', '엘', '큰', '크게', '업사이즈', '업', 'l'];
  const regularKeywords = ['작은거', '작은 거', '레귤러', 'regular', '알', '작은', '작게', '기본 사이즈', 'r'];
  
  // 별칭 매칭
  const aliases = {
    '감자': ['프렌치프라이', '감자튀김', 'fries', 'french fry'],
    '콜라': ['코카콜라', 'coca cola', 'coke'],
    '사이다': ['스프라이트', 'sprite'],
    '햄버거': ['버거', 'burger'],
    '치즈': ['cheese'],
    '어니언': ['양파', 'onion'],
  };
  
  // 기본 옵션 키워드
  const defaultKeywords = ['기본', 'default', '그냥', '기본으로', '그대로'];
  
  // 1. 기본 옵션 체크
  for (const keyword of defaultKeywords) {
    if (text.includes(keyword)) {
      const defaultOption = options.find(opt => opt.isDefault === true);
      if (defaultOption) {
        console.log('[옵션 매칭] ✅ 기본 옵션 키워드 매칭:', keyword, '→', defaultOption.name);
        return {
          selectedOption: defaultOption,
          confidence: 'high',
          matchType: 'default',
        };
      }
    }
  }
  
  // 2. 사이즈 매칭 (L)
  for (const keyword of largeKeywords) {
    if (text.includes(keyword)) {
      // L이 포함된 옵션 찾기
      const largeOption = options.find(opt => 
        opt.name && (opt.name.includes('(L)') || opt.name.includes('L') || opt.name.toLowerCase().includes('large'))
      );
      if (largeOption) {
        console.log('[옵션 매칭] ✅ 사이즈 키워드 매칭 (Large):', keyword, '→', largeOption.name);
        return {
          selectedOption: largeOption,
          confidence: 'high',
          matchType: 'size',
        };
      }
    }
  }
  
  // 3. 사이즈 매칭 (R)
  for (const keyword of regularKeywords) {
    if (text.includes(keyword)) {
      // R이 포함된 옵션 찾기
      const regularOption = options.find(opt => 
        opt.name && (opt.name.includes('(R)') || opt.name.toLowerCase().includes('regular'))
      );
      if (regularOption) {
        console.log('[옵션 매칭] ✅ 사이즈 키워드 매칭 (Regular):', keyword, '→', regularOption.name);
        return {
          selectedOption: regularOption,
          confidence: 'high',
          matchType: 'size',
        };
      }
    }
  }
  
  // 4. 별칭 매칭
  for (const [alias, targets] of Object.entries(aliases)) {
    if (text.includes(alias)) {
      console.log('[옵션 매칭] 🔍 별칭 발견:', alias);
      // 별칭에 해당하는 옵션 찾기
      for (const target of targets) {
        const matchedOption = options.find(opt => 
          opt.name && opt.name.toLowerCase().includes(target.toLowerCase())
        );
        if (matchedOption) {
          console.log('[옵션 매칭] ✅ 별칭 매칭 성공:', alias, '→', matchedOption.name);
          return {
            selectedOption: matchedOption,
            confidence: 'medium',
            matchType: 'alias',
          };
        }
      }
    }
  }
  
  console.log('[옵션 매칭] ⚠️ 키워드 매칭 실패');
  return null;
}

/**
 * 옵션 매칭
 */
export function matchOption(userInput, options, allowNumberSelection = true) {
  const text = userInput.trim().toLowerCase();
  const keywords = extractKeywords(text);

  console.log('═════════════════════════════════════════════');
  console.log('[옵션 매칭] 🎯 매칭 시작');
  console.log('[옵션 매칭] 📢 음성 인식 결과:', userInput);
  console.log('[옵션 매칭] 🔤 소문자 변환:', text);
  console.log('[옵션 매칭] 📊 옵션 개수:', options.length);
  console.log('[옵션 매칭] 🔢 숫자 선택 허용:', allowNumberSelection);
  console.log('[옵션 매칭] 📋 추출된 숫자:', keywords.numbers);
  
  // 옵션 목록 출력
  console.log('[옵션 매칭] 📝 옵션 목록:');
  options.forEach((opt, idx) => {
    if (opt && opt.name) {
      console.log(`[옵션 매칭]   ${idx + 1}. ${opt.name} (가격: ${opt.price || 0}원)`);
    } else {
      console.warn(`[옵션 매칭]   ${idx + 1}. ⚠️ 잘못된 옵션:`, opt);
    }
  });
  console.log('─────────────────────────────────────────────');

  // 숫자로 선택한 경우 (allowNumberSelection이 true일 때만)
  if (allowNumberSelection && keywords.numbers.length > 0) {
    const index = keywords.numbers[0] - 1;
    console.log('[옵션 매칭] 🔢 숫자 매칭 시도:', keywords.numbers[0], '→ 인덱스:', index);
    
    if (index >= 0 && index < options.length) {
      console.log('[옵션 매칭] ✅ 숫자 선택 성공:', options[index].name);
      console.log('═════════════════════════════════════════════');
      return {
        selectedOption: options[index],
        confidence: 'high',
      };
    } else {
      console.warn('[옵션 매칭] ⚠️ 숫자 범위 벗어남:', index, '(유효 범위: 0~' + (options.length - 1) + ')');
    }
  }
  
  // 🧠 스마트 키워드 매칭 시도
  const keywordMatch = matchOptionWithKeywords(text, options);
  if (keywordMatch) {
    console.log('[옵션 매칭] ✅ 키워드 매칭 성공:', keywordMatch.selectedOption.name, '(타입:', keywordMatch.matchType, ')');
    console.log('═════════════════════════════════════════════');
    return keywordMatch;
  }

  // 텍스트 매칭
  console.log('[옵션 매칭] 🔍 텍스트 매칭 시작...');
  const candidates = [];
  
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    
    // 안전성 체크
    if (!option || !option.name) {
      console.warn(`[옵션 매칭] ⚠️ 잘못된 옵션 데이터 (${i + 1}번):`, option);
      continue;
    }
    
    const optionName = option.name.toLowerCase();
    let score = 0;
    const scoreDetails = [];

    // 1. 완전/부분 일치 체크
    if (text.includes(optionName)) {
      score += 100;
      scoreDetails.push(`완전포함(+100)`);
    } else if (optionName.includes(text)) {
      score += 100;
      scoreDetails.push(`부분포함(+100)`);
    }

    // 2. 유사도 계산
    const similarity = calculateSimilarity(text, optionName);
    const similarityScore = similarity * 50;
    score += similarityScore;
    scoreDetails.push(`유사도(+${similarityScore.toFixed(1)})`);

    console.log(`[옵션 매칭]   ${i + 1}. "${option.name}" (소문자: "${optionName}")`);
    console.log(`[옵션 매칭]      → 유사도: ${(similarity * 100).toFixed(1)}% | 점수: ${score.toFixed(1)} | 상세: ${scoreDetails.join(', ')}`);

    if (score > 20) {
      candidates.push({
        option,
        score,
        similarity,
      });
    } else {
      console.log(`[옵션 매칭]      → ❌ 점수 부족 (${score.toFixed(1)} ≤ 20)`);
    }
  }

  console.log('─────────────────────────────────────────────');
  console.log('[옵션 매칭] 📊 후보 개수:', candidates.length);

  // 점수 순으로 정렬
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length > 0) {
    console.log('[옵션 매칭] 🏆 최종 후보 (점수순):');
    candidates.slice(0, 3).forEach((c, idx) => {
      console.log(`[옵션 매칭]   ${idx + 1}위. "${c.option.name}" - 점수: ${c.score.toFixed(1)} | 유사도: ${(c.similarity * 100).toFixed(1)}%`);
    });
    
    const bestMatch = candidates[0];
    
    // 개선된 신뢰도 계산 로직
    let confidence;
    if (bestMatch.score >= 90) {
      confidence = 'high';
      console.log('[옵션 매칭] 📈 신뢰도: 높음 (점수 90+)');
    } else if (bestMatch.score >= 60) {
      confidence = 'medium';
      console.log('[옵션 매칭] 📈 신뢰도: 중간 (점수 60-90) → 재확인 권장');
    } else {
      confidence = 'low';
      console.log('[옵션 매칭] 📈 신뢰도: 낮음 (점수 <60) → 재질문 필요');
    }
    
    console.log('[옵션 매칭] ✅ 최종 선택:', bestMatch.option.name);
    console.log('[옵션 매칭] 📊 점수:', bestMatch.score.toFixed(1), '| 신뢰도:', confidence);
    console.log('═════════════════════════════════════════════');
    
    return {
      selectedOption: bestMatch.option,
      confidence,
      score: bestMatch.score, // 점수도 반환 (재확인 로직에서 사용)
    };
  }

  console.log('[옵션 매칭] ❌ 매칭 실패: 후보 없음');
  console.log('[옵션 매칭] 💡 힌트: 정확한 옵션명을 말하거나 번호(1, 2, 3...)로 선택하세요');
  console.log('═════════════════════════════════════════════');

  return {
    selectedOption: null,
    confidence: 'low',
  };
}

/**
 * 긍정/부정 답변 감지
 */
export function detectConfirmation(userInput, language = 'ko') {
  const text = userInput.trim().toLowerCase();
  
  console.log('[MenuMatcher] 확인 감지:', text, '언어:', language);
  
  const positiveKeywords = language === 'en'
    ? ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'confirm', 'correct', 'right']
    : ['네', '예', '응', '좋아', '맞아', '그래', '오케이', 'ㅇㅋ', 'ok', '확인'];
  
  const negativeKeywords = language === 'en'
    ? ['no', 'nope', 'cancel', 'wrong', 'not', 'again']
    : ['아니', '아뇨', '싫어', '다시', '취소', '안'];

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
export function detectMoreOrder(userInput, language = 'ko') {
  const text = userInput.trim().toLowerCase();
  
  console.log('[MenuMatcher] 추가 주문 감지:', text, '언어:', language);
  
  // 결제 키워드 (바로 결제로 진행) - 최우선 체크
  const paymentKeywords = language === 'en'
    ? ['pay', 'checkout', 'payment', 'pay now', 'check out']
    : ['결제', '결제해', '결제해줘', '결제할게', '결제할게요', '결제하기', '계산', '계산해줘', '지불'];
  
  // 긍정 키워드 (추가 주문 있음)
  const moreKeywords = language === 'en'
    ? ['more', 'add', 'another', 'also', 'yes', 'yeah', 'and', 'plus']
    : ['추가', '더', '또', '그리고', '네', '예', '응', '있어', '주세요', '주문'];
  
  // 부정 키워드 (추가 주문 없음 → 바로 결제)
  const noMoreKeywords = language === 'en'
    ? ['no', 'nope', 'done', 'finish', 'thats all', "that's all", 'nothing']
    : ['없어', '없습니다', '됐어', '됐습니다', '끝', '이제', '아니', '아니요', '괜찮', '안'];

  // 1. 결제 키워드 체크 (최우선)
  for (const keyword of paymentKeywords) {
    if (text.includes(keyword)) {
      console.log('[MenuMatcher] 💳 바로 결제 요청 감지 (키워드:', keyword, ')');
      return 'pay';
    }
  }

  // 2. 추가 주문 있음
  for (const keyword of moreKeywords) {
    if (text.includes(keyword)) {
      console.log('[MenuMatcher] ✅ 추가 주문 감지 (키워드:', keyword, ')');
      return 'yes';
    }
  }

  // 3. 추가 주문 없음 (바로 결제)
  for (const keyword of noMoreKeywords) {
    if (text.includes(keyword)) {
      console.log('[MenuMatcher] 💳 추가 주문 없음 → 바로 결제 (키워드:', keyword, ')');
      return 'pay';
    }
  }

  console.log('[MenuMatcher] ⚠️ unknown → 메뉴 이름일 가능성');
  return 'unknown';
}

/**
 * 메뉴 추천 의도 감지
 */
export function detectRecommendation(userInput, language = 'ko') {
  const text = userInput.trim().toLowerCase();
  
  console.log('[MenuMatcher] 추천 의도 감지:', text, '언어:', language);
  
  // 추천 키워드
  const recommendKeywords = language === 'en'
    ? ['recommend', 'suggestion', 'what do you recommend', 'what should i get', 'what is good', 'best', 'popular']
    : ['추천', '추천해', '추천해줘', '추천해주세요', '뭐가 좋아', '뭐가 좋을까', '뭐 먹을까', '인기', '베스트', '맛있는거', '맛있는 거'];

  for (const keyword of recommendKeywords) {
    if (text.includes(keyword)) {
      console.log('[MenuMatcher] ✅ 추천 의도 감지 (키워드:', keyword, ')');
      return true;
    }
  }

  console.log('[MenuMatcher] ℹ️ 추천 의도 없음');
  return false;
}

export default {
  matchMenu,
  matchOption,
  detectConfirmation,
  detectMoreOrder,
  detectRecommendation,
};

