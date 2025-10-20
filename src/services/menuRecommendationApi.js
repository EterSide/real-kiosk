/**
 * AI 메뉴 추천 API 서비스
 * 
 * 백엔드 AI 추천 엔진과 통신하여 사용자 선호도 기반 메뉴 추천을 받습니다.
 */

const RECOMMENDATION_API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL || 'http://localhost:8000';

/**
 * AI 메뉴 추천 요청
 * 
 * @param {string} userPreference - 사용자 선호도/요청 (예: "다이어트를 하고 있는데 맛있는 햄버거를 추천해줄수있니")
 * @param {number} maxResults - 최대 추천 개수 (기본: 3)
 * @returns {Promise<Object>} 추천 결과
 */
export async function getMenuRecommendations(userPreference, maxResults = 3) {
  console.log('[AI 추천 API] 요청 시작...');
  console.log('[AI 추천 API] 사용자 선호도:', userPreference);
  console.log('[AI 추천 API] 최대 결과:', maxResults);
  console.log('[AI 추천 API] API URL:', `${RECOMMENDATION_API_URL}/api/recommend-menus`);

  try {
    const response = await fetch(`${RECOMMENDATION_API_URL}/api/recommend-menus`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_preference: userPreference,
        max_results: maxResults,
      }),
    });

    if (!response.ok) {
      console.error('[AI 추천 API] HTTP 에러:', response.status, response.statusText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('[AI 추천 API] ✅ 성공!');
    console.log('[AI 추천 API] 추천 개수:', data.recommendations?.length || 0);
    console.log('[AI 추천 API] 추천 목록:');
    data.recommendations?.forEach((rec, idx) => {
      console.log(`[AI 추천 API]   ${idx + 1}. ${rec.product_name} (ID: ${rec.product_id})`);
      console.log(`[AI 추천 API]      이유: ${rec.recommendation_reason}`);
      console.log(`[AI 추천 API]      유사도: ${rec.similarity_score}`);
    });

    return data;
  } catch (error) {
    console.error('[AI 추천 API] ❌ 에러 발생!');
    console.error('[AI 추천 API] 에러:', error.message);
    console.error('[AI 추천 API] 스택:', error.stack);
    
    // 에러를 다시 throw하여 호출자가 처리할 수 있도록 함
    throw error;
  }
}

/**
 * 추천 결과를 제품 매칭에 사용할 수 있는 형식으로 변환
 * 
 * @param {Object} recommendationData - API 응답 데이터
 * @param {Array} products - 전체 제품 목록
 * @returns {Array} 매칭된 제품과 추천 정보의 배열
 */
export function mapRecommendationsToProducts(recommendationData, products) {
  console.log('[AI 추천 매핑] 제품 매핑 시작...');
  console.log('[AI 추천 매핑] 추천 수:', recommendationData.recommendations?.length || 0);
  console.log('[AI 추천 매핑] 전체 제품 수:', products.length);

  if (!recommendationData.recommendations || recommendationData.recommendations.length === 0) {
    console.warn('[AI 추천 매핑] ⚠️ 추천 결과가 없습니다');
    return [];
  }

  const mapped = [];

  for (const recommendation of recommendationData.recommendations) {
    const { product_id, recommendation_reason, similarity_score } = recommendation;
    
    // product_id로 실제 제품 찾기
    const product = products.find(p => p.id === product_id);
    
    if (product) {
      console.log(`[AI 추천 매핑] ✅ 매칭 성공: ${product.name} (ID: ${product_id})`);
      
      mapped.push({
        product,
        recommendationReason: recommendation_reason,
        similarityScore: similarity_score,
        score: 100, // 추천 결과는 모두 높은 점수로 처리
      });
    } else {
      console.warn(`[AI 추천 매핑] ⚠️ 제품 찾기 실패: ID ${product_id}`);
    }
  }

  console.log('[AI 추천 매핑] 최종 매핑 결과:', mapped.length, '개');
  
  return mapped;
}

export default {
  getMenuRecommendations,
  mapRecommendationsToProducts,
};

