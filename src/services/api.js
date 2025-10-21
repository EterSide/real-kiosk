import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 백엔드 카테고리 데이터를 프론트엔드 형식으로 변환
 */
const transformCategory = (category) => {
  return {
    id: category.id,
    name: category.categoryName, // 한국어 카테고리명
    categoryEngName: category.categoryEngName, // 영어 카테고리명
    displayOrder: category.displayOrder,
    createdAt: category.createdAt,
  };
};

/**
 * 카테고리 목록 조회
 */
export const getCategories = async () => {
  try {
    console.log('[API] GET /api/categories 요청...');
    const response = await apiClient.get('/api/categories');
    console.log('[API] ✅ 카테고리 조회 성공:', response.status);
    console.log('[API] 원본 데이터:', response.data);
    
    // 데이터 변환
    const transformedData = response.data.map(transformCategory);
    console.log('[API] 변환된 데이터:', transformedData);
    
    return transformedData;
  } catch (error) {
    console.error('[API] ❌ 카테고리 조회 실패:', error.message);
    if (error.response) {
      console.error('[API] 응답 상태:', error.response.status);
      console.error('[API] 응답 데이터:', error.response.data);
    } else if (error.request) {
      console.error('[API] 요청 전송됨, 응답 없음');
      console.error('[API] 백엔드가 http://localhost:8090 에서 실행 중인지 확인하세요!');
    } else {
      console.error('[API] 요청 설정 에러:', error.message);
    }
    throw error;
  }
};

/**
 * 백엔드 옵션 데이터를 프론트엔드 형식으로 변환
 */
const transformOption = (option, index) => {
  try {
    const additionalPrice = option.additionalPrice ?? option.price ?? 0;
    const isDefault = index === 0 && additionalPrice === 0; // 첫 번째 & 추가금 없음 = 기본
    
    return {
      id: option.id,
      name: option.optionName || option.name,
      engName: option.optionEngName || option.engName, // 영문명 추가
      price: additionalPrice,
      isDefault: isDefault,
      createdAt: option.createdAt,
    };
  } catch (error) {
    console.error('[API] transformOption 에러:', error, option);
    return {
      id: option.id || 0,
      name: option.optionName || option.name || '옵션',
      engName: option.optionEngName || option.engName || 'Option',
      price: 0,
      isDefault: false,
    };
  }
};

/**
 * 백엔드 옵션 그룹 데이터를 프론트엔드 형식으로 변환
 */
const transformOptionGroup = (optionGroup) => {
  try {
    const options = (optionGroup.options || []).map((opt, idx) => transformOption(opt, idx));
    
    return {
      id: optionGroup.id,
      name: optionGroup.groupName || optionGroup.name,
      engName: optionGroup.groupEngName || optionGroup.engName, // 영문명 추가
      required: optionGroup.isRequired ?? optionGroup.required ?? true,
      maxSelection: optionGroup.maxSelection || 1,
      options: options,
      defaultOption: options.find(opt => opt.isDefault) || options[0], // 기본 옵션
      createdAt: optionGroup.createdAt,
    };
  } catch (error) {
    console.error('[API] transformOptionGroup 에러:', error, optionGroup);
    return {
      id: optionGroup.id || 0,
      name: optionGroup.groupName || optionGroup.name || '옵션',
      engName: optionGroup.groupEngName || optionGroup.engName || 'Option',
      required: true,
      maxSelection: 1,
      options: [],
      defaultOption: null,
    };
  }
};

/**
 * 백엔드 상품 데이터를 프론트엔드 형식으로 변환
 */
const transformProduct = (product) => {
  try {
    // optionGroups 변환 (DB에서 이미 올바른 순서로 주므로 정렬 안 함)
    const transformedOptionGroups = (product.optionGroups || []).map(transformOptionGroup);
    
    return {
      id: product.id,
      name: product.productName, // 한국어 상품명
      productEngName: product.productEngName, // 영어 상품명
      description: product.description, // 한국어 설명
      engDescription: product.engDescription, // 영어 설명
      price: product.price,
      imageUrl: product.imageUrl,
      type: transformedOptionGroups.length > 0 ? 'SET' : 'SINGLE',
      categoryId: product.categories && product.categories.length > 0 ? product.categories[0].id : null,
      categoryName: product.categories && product.categories.length > 0 ? product.categories[0].categoryName : null,
      optionGroups: transformedOptionGroups,
      isAvailable: product.isAvailable,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  } catch (error) {
    console.error('[API] transformProduct 에러:', error, product);
    // 에러 발생 시에도 기본 정보는 살림
    return {
      id: product.id,
      name: product.productName || product.name || '상품',
      productEngName: product.productEngName || null,
      description: product.description || '',
      engDescription: product.engDescription || null,
      price: product.price || 0,
      imageUrl: product.imageUrl || null,
      type: 'SINGLE',
      categoryId: null,
      categoryName: null,
      optionGroups: [],
      isAvailable: product.isAvailable ?? true,
    };
  }
};

/**
 * 판매 가능한 상품 목록 조회
 */
export const getAvailableProducts = async () => {
  try {
    console.log('[API] GET /api/products/available 요청...');
    const response = await apiClient.get('/api/products/available');
    console.log('[API] ✅ 상품 조회 성공:', response.status);
    console.log('[API] 원본 데이터 샘플:', response.data.slice(0, 2));
    
    // 데이터 변환
    console.log('[API] 변환 시작... 상품 개수:', response.data.length);
    const transformedData = response.data.map((product, idx) => {
      try {
        return transformProduct(product);
      } catch (error) {
        console.error(`[API] ❌ 상품 ${idx} 변환 실패:`, error, product);
        throw error; // 에러를 다시 던져서 catch 블록으로
      }
    });
    console.log('[API] ✅ 변환 완료!');
    console.log('[API] 변환된 데이터 샘플:', transformedData.slice(0, 2));
    
    // 세트 메뉴 옵션 확인
    const setProducts = transformedData.filter(p => p.optionGroups && p.optionGroups.length > 0);
    if (setProducts.length > 0) {
      console.log('[API] 🍔 세트 메뉴 예시:', setProducts[0].name);
      console.log('[API] 옵션 그룹:', setProducts[0].optionGroups);
      setProducts[0].optionGroups.forEach((group, idx) => {
        console.log(`[API]   그룹 ${idx + 1}: ${group.name} (옵션 ${group.options.length}개)`);
        group.options.forEach((opt, optIdx) => {
          console.log(`[API]     옵션 ${optIdx + 1}: ${opt.name} (+${opt.price}원)`);
        });
      });
    }
    
    return transformedData;
  } catch (error) {
    console.error('[API] ❌ 상품 조회 실패:', error.message);
    if (error.response) {
      console.error('[API] 응답 상태:', error.response.status);
      console.error('[API] 응답 데이터:', error.response.data);
    } else if (error.request) {
      console.error('[API] 요청 전송됨, 응답 없음');
      console.error('[API] 백엔드가 http://localhost:8090 에서 실행 중인지 확인하세요!');
    } else {
      console.error('[API] 요청 설정 에러:', error.message);
    }
    throw error;
  }
};

/**
 * 주문 생성
 */
export const createOrder = async (orderData) => {
  try {
    const response = await apiClient.post('/api/orders', orderData);
    return response.data;
  } catch (error) {
    console.error('주문 생성 실패:', error);
    throw error;
  }
};

/**
 * 결제 처리
 */
export const processPayment = async (paymentData) => {
  try {
    const response = await apiClient.post('/api/payments', paymentData);
    return response.data;
  } catch (error) {
    console.error('결제 처리 실패:', error);
    throw error;
  }
};

export default {
  getCategories,
  getAvailableProducts,
  createOrder,
  processPayment,
};

