'use client';

import { useKioskStore } from '@/store/kioskStore';
import { t, getProductName } from '@/lib/translations';

/**
 * 장바구니 패널 컴포넌트
 * 오른쪽에 고정 표시
 */
export function CartPanel({ cart, onCheckout }) {
  const { language, removeFromCart } = useKioskStore();
  const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalCount = cart.length;

  // 장바구니 아이템 삭제 핸들러
  const handleRemoveItem = (itemId) => {
    removeFromCart(itemId);
  };

  return (
    <div className="h-full bg-white border-l-4 border-orange-500 flex flex-col">
      {/* 헤더 */}
      <div className="bg-orange-500 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center gap-2">
            🛒 {t('cart', language)}
          </h3>
          <span className="bg-white text-orange-500 px-3 py-1 rounded-full text-sm font-bold">
            {totalCount}{t('items', language)}
          </span>
        </div>
      </div>

      {/* 장바구니 내용 */}
      <div className="flex-1 overflow-y-auto p-4">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <span className="text-5xl mb-3">🛒</span>
            <p className="text-sm">{t('cartEmpty', language)}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map((item, index) => (
              <div
                key={item.id}
                className="bg-gray-50 rounded-xl p-3 border-2 border-gray-200 hover:border-orange-300 transition-colors"
              >
                {/* 상품 번호 */}
                <div className="flex items-start justify-between mb-2">
                  <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {index + 1}
                  </span>
                  <button
                    className="text-gray-400 hover:text-red-500 transition-colors text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50"
                    onClick={() => handleRemoveItem(item.id)}
                    title={t('delete', language)}
                  >
                    ×
                  </button>
                </div>

                {/* 상품 이름 */}
                <div className="mb-2">
                  <h4 className="font-bold text-gray-800 text-sm line-clamp-2">
                    {getProductName(item.product, language)}
                  </h4>
                </div>

                {/* 선택한 옵션 */}
                {item.selectedOptions && item.selectedOptions.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {item.selectedOptions.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        className="flex items-center justify-between text-xs text-gray-600"
                      >
                        <span className="flex items-center gap-1">
                          <span className="text-orange-500">└</span>
                          {opt.name}
                        </span>
                        {opt.price > 0 && (
                          <span className="text-orange-600">+{opt.price.toLocaleString()}{t('won', language)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 가격 */}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{t('amount', language)}</span>
                    <span className="text-base font-bold text-orange-600">
                      {item.totalPrice.toLocaleString()}{t('won', language)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 총액 & 결제 버튼 */}
      {cart.length > 0 && (
        <div className="border-t-2 border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">{t('totalQuantity', language)}</span>
            <span className="text-sm font-semibold">{totalCount}{t('items', language)}</span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-bold text-gray-800">{t('totalAmount', language)}</span>
            <span className="text-2xl font-bold text-orange-600">
              {totalPrice.toLocaleString()}{t('won', language)}
            </span>
          </div>

          {/* 결제하기 버튼 */}
          <button
            onClick={onCheckout}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-xl font-bold py-4 rounded-xl transition-all transform hover:scale-105 shadow-lg"
          >
            💳 {t('checkout', language)}
          </button>
        </div>
      )}
    </div>
  );
}

export default CartPanel;

