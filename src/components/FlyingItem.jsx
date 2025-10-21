'use client';

/**
 * 장바구니로 날아가는 아이템 컴포넌트
 */
export function FlyingItem({ item }) {
  return (
    <div
      className="fixed z-[9999] pointer-events-none animate-fly-to-cart"
      style={{
        left: `${item.startX}px`,
        top: `${item.startY}px`,
        width: `${item.width}px`,
        height: `${item.height}px`,
        '--fly-x': `${item.deltaX}px`,
        '--fly-y': `${item.deltaY}px`,
        '--fly-x-mid': `${item.midX}px`,
        '--fly-y-mid': `${item.midY}px`,
      }}
    >
      {item.productData?.imageUrl ? (
        <img
          src={item.productData.imageUrl}
          alt=""
          className="w-full h-full object-cover rounded-xl shadow-2xl border-2 border-orange-500"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-orange-100 to-yellow-100 rounded-xl shadow-2xl border-2 border-orange-500 flex items-center justify-center text-4xl">
          🍔
        </div>
      )}
    </div>
  );
}

export default FlyingItem;

