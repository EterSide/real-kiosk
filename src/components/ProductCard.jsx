'use client';

import { useKioskStore } from '@/store/kioskStore';
import { t, getProductName } from '@/lib/translations';

/**
 * 상품 카드 컴포넌트
 */
export function ProductCard({ product, index, onClick, highlighted, recommendationReason }) {
  const { language } = useKioskStore();
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl overflow-hidden shadow transition-all transform hover:scale-105 flex flex-col ${
        highlighted
          ? 'border-2 border-orange-500 animate-pulse'
          : 'border border-gray-200 hover:border-orange-300'
      }`}
    >
      {/* 이미지 영역 (축소) */}
      <div className="relative aspect-square bg-gradient-to-br from-orange-100 to-yellow-100 flex items-center justify-center">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-3xl">🍔</div>
        )}
        
        {/* 번호 표시 */}
        {highlighted && (
          <div className="absolute top-1 left-1 bg-orange-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
            {index + 1}
          </div>
        )}
        
        {/* AI 추천 뱃지 */}
        {recommendationReason && (
          <div className="absolute top-1 right-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-bold shadow-lg">
            <span>⭐</span>
            <span>{language === 'ko' ? 'AI 추천' : 'AI Pick'}</span>
          </div>
        )}
      </div>

      {/* 정보 영역 */}
      <div className="p-2 flex-1 flex flex-col">
        <h3 className="text-xs font-bold text-gray-800 mb-1 line-clamp-2">
          {getProductName(product, language)}
        </h3>
        
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-bold text-orange-600">
            {product.price.toLocaleString()}{t('won', language)}
          </p>
          
          {product.type === 'SET' && (
            <span className="bg-orange-100 text-orange-800 text-[10px] font-semibold px-1 py-0.5 rounded">
              {language === 'ko' ? '세트' : 'Set'}
            </span>
          )}
        </div>
        
        {/* 추천 이유 (있을 경우만 표시) */}
        {recommendationReason && (
          <div className="mt-1 pt-1 border-t border-gray-200">
            <p className="text-[9px] text-gray-600 line-clamp-3 leading-tight">
              💡 {recommendationReason}
            </p>
          </div>
        )}
      </div>
    </button>
  );
}

export default ProductCard;

