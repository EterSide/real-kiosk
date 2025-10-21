'use client';

import { MenuBoard } from './MenuBoard';
import { SingleOptionModal } from './SingleOptionModal';
import { CartPanel } from './CartPanel';
import { OrderCompleteModal } from './OrderCompleteModal';
import { FlyingItem } from './FlyingItem';
import { KioskState } from '@/lib/stateMachine';
import { useKioskStore } from '@/store/kioskStore';
import { useFlyToCart } from '@/hooks/useFlyToCart';
import { t } from '@/lib/translations';

/**
 * 주문 화면 컴포넌트
 * 상단: 왼쪽(캐릭터) + 오른쪽(장바구니)
 * 하단: 메뉴판
 */
export function OrderScreen({
  products,
  categories,
  cart,
  currentState,
  currentProduct,
  lastMessage,
  interimTranscript,
  isListening,
  isSpeaking,
  candidates,
  pendingOptions,
  onProductSelect,
  onCheckout,
  showOrderComplete,
  orderNumber,
  onCloseOrderComplete,
}) {
  const { language } = useKioskStore();
  const { flyingItems, triggerFlyAnimation } = useFlyToCart();
  
  console.log('[OrderScreen] 렌더링:', {
    productsCount: products?.length || 0,
    categoriesCount: categories?.length || 0,
    cartCount: cart?.length || 0,
    currentState
  });
  
  // 제품 선택 핸들러 (애니메이션 포함)
  const handleProductSelect = (product, event) => {
    // 날아가는 애니메이션 트리거
    const target = event?.currentTarget || event?.target;
    if (target && !pendingOptions?.length && !candidates?.length) {
      // 옵션이 없거나 후보 선택이 아닐 때만 애니메이션
      // (옵션이 있으면 옵션 선택 후 장바구니 추가되므로)
      const hasOptions = product.optionGroups && product.optionGroups.length > 0;
      if (!hasOptions) {
        triggerFlyAnimation(target, product);
      }
    }
    
    // 원래 핸들러 호출
    if (onProductSelect) {
      onProductSelect(product);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-100 flex flex-col">
      {/* 상단 30% - 캐릭터 & 상태 (전체 가로) */}
      <div className="h-[30%] bg-gradient-to-br from-orange-400 to-red-500 relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-300 rounded-full blur-3xl"></div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center p-4">
          {/* 캐릭터 (축소) */}
          <div className="text-6xl mb-3 animate-bounce">🍔</div>

          {/* 음성 인식 상태 (축소) */}
          <div className="w-full max-w-3xl">
            {/* TTS 메시지 또는 듣는 중 표시 */}
            {isSpeaking || (!isListening && lastMessage) ? (
              /* TTS 말하는 중 또는 대기 중 */
              <div className="bg-white bg-opacity-90 backdrop-blur-md rounded-2xl px-4 py-3 mb-2 shadow-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl animate-pulse">🗣️</span>
                  <p className="text-lg font-semibold text-gray-800">{lastMessage}</p>
                </div>
              </div>
            ) : (
              /* 음성 입력 - 듣는 중 */
              isListening && (
                <div className="bg-white bg-opacity-90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl animate-pulse">🎤</span>
                    <div className="flex-1">
                      <p className="text-base text-gray-600">{t('listening', language)}</p>
                      {interimTranscript && (
                        <p className="text-lg font-semibold text-gray-800">{interimTranscript}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* 하단 70% - 메뉴판 + 장바구니 */}
      <div className="h-[70%] flex">
        {/* 왼쪽 70% - 메뉴판 */}
        <div className="w-[70%]">
          <MenuBoard
            products={products}
            categories={categories}
            candidates={candidates}
            pendingOptions={pendingOptions}
            onProductSelect={handleProductSelect}
          />
        </div>

        {/* 오른쪽 30% - 장바구니 */}
        <div className="w-[30%]">
          <CartPanel cart={cart} onCheckout={onCheckout} />
        </div>
      </div>
      
      {/* 날아가는 아이템들 */}
      {flyingItems.map(item => (
        <FlyingItem key={item.id} item={item} />
      ))}

      {/* 옵션 선택 팝업 (단일) - 디버깅 */}
      {(() => {
        const shouldShow = currentState === KioskState.ASK_OPTIONS && 
                          currentProduct && 
                          pendingOptions && 
                          pendingOptions.length > 0;
        
        console.log('[OrderScreen] 팝업 조건 체크:', {
          currentState,
          isASK_OPTIONS: currentState === KioskState.ASK_OPTIONS,
          hasCurrentProduct: !!currentProduct,
          pendingOptionsLength: pendingOptions?.length || 0,
          shouldShow
        });
        
        if (shouldShow) {
          console.log('[OrderScreen] ✅ 팝업 표시!');
          return (
            <SingleOptionModal
              product={currentProduct}
              optionGroup={pendingOptions[0]}
              currentIndex={currentProduct.optionGroups.length - pendingOptions.length}
              totalCount={currentProduct.optionGroups.length}
              onSelect={onProductSelect}
              onCancel={() => console.log('옵션 선택 취소')}
              triggerFlyAnimation={triggerFlyAnimation}
            />
          );
        } else {
          console.log('[OrderScreen] ❌ 팝업 표시 안 함');
          return null;
        }
      })()}

      {/* 주문 완료 팝업 */}
      {showOrderComplete && (
        <OrderCompleteModal
          orderNumber={orderNumber}
          onClose={onCloseOrderComplete}
        />
      )}
    </div>
  );
}

export default OrderScreen;
