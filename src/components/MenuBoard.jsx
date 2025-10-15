'use client';

import { useState } from 'react';
import { ProductCard } from './ProductCard';
import { useKioskStore } from '@/store/kioskStore';
import { t, getCategoryName } from '@/lib/translations';

/**
 * 메뉴판 컴포넌트
 */
export function MenuBoard({
  products,
  categories,
  candidates,
  pendingOptions,
  onProductSelect,
}) {
  const { language } = useKioskStore();
  const [selectedCategory, setSelectedCategory] = useState(null);

  console.log('[MenuBoard] 렌더링:', {
    productsCount: products?.length || 0,
    categoriesCount: categories?.length || 0,
    candidatesCount: candidates?.length || 0,
    selectedCategory,
    pendingOptionsCount: pendingOptions?.length || 0
  });

  // 후보 상품이 있는 경우 우선 표시
  const displayProducts = candidates.length > 0
    ? candidates.map(c => c.product)
    : selectedCategory
    ? products.filter(p => p.categoryId === selectedCategory)
    : products; // ✅ 전체 카테고리: 모든 상품 표시

  console.log('[MenuBoard] 표시할 상품:', displayProducts.length, '개');
  console.log('[MenuBoard] 전체 상품:', products.length, '개');
  console.log('[MenuBoard] 선택된 카테고리:', selectedCategory || '전체');
  console.log('[MenuBoard] 상품 샘플:', displayProducts.slice(0, 3).map(p => p?.name));

  // ❌ 옵션 선택 모드 비활성화 (팝업 사용)
  const isOptionMode = false; // pendingOptions && pendingOptions.length > 0;

  return (
    <div className="h-full bg-white flex flex-col">
      {/* 헤더 (축소) */}
      <div className="bg-orange-500 text-white px-4 py-2">
        <h2 className="text-xl font-bold">
          {isOptionMode
            ? `${t('optionSelection', language)}: ${pendingOptions[0].name}`
            : candidates.length > 0
            ? t('pleaseSelect', language)
            : t('menu', language)}
        </h2>
      </div>

      {/* 카테고리 탭 (축소) */}
      {!isOptionMode && !candidates.length && categories && (
        <div className="flex gap-2 px-4 py-2 bg-gray-50 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === null
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 hover:bg-orange-100'
            }`}
          >
            {t('all', language)}
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-orange-100'
              }`}
            >
              {getCategoryName(category, language)}
            </button>
          ))}
        </div>
      )}

      {/* 메뉴 그리드 */}
      <div className="flex-1 overflow-y-auto p-3">
        {isOptionMode ? (
          // 옵션 선택 (축소)
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {pendingOptions[0].options.map((option, index) => (
              <button
                key={option.id || index}
                onClick={() => onProductSelect && onProductSelect(option)}
                className="bg-white border-2 border-orange-300 hover:border-orange-500 hover:bg-orange-50 rounded-xl p-3 transition-all transform hover:scale-105"
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">{index + 1}</div>
                  <p className="text-sm font-bold text-gray-800 mb-1 line-clamp-2">
                    {option.name}
                  </p>
                  {option.price > 0 && (
                    <p className="text-xs text-orange-600 font-semibold">
                      +{option.price.toLocaleString()}{t('won', language)}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          // 메뉴 선택 (더 많이 보이게)
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {displayProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                onClick={() => onProductSelect && onProductSelect(product)}
                highlighted={candidates.length > 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MenuBoard;

