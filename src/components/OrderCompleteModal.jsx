'use client';

import { useEffect } from 'react';

/**
 * 주문 완료 팝업
 * 주문번호 표시 + 3초 후 자동 닫힘
 */
export function OrderCompleteModal({ orderNumber, onClose }) {
  useEffect(() => {
    // 3초 후 자동 닫힘
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 animate-bounce">
        {/* 성공 아이콘 */}
        <div className="text-center mb-6">
          <div className="inline-block">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-6xl">✅</span>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            주문이 완료되었습니다!
          </h2>
        </div>

        {/* 주문번호 */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 mb-6">
          <p className="text-white text-center text-sm mb-2">주문번호</p>
          <p className="text-white text-center text-5xl font-bold tracking-wider">
            {orderNumber}
          </p>
        </div>

        {/* 안내 메시지 */}
        <div className="text-center space-y-2">
          <p className="text-gray-600 text-lg">
            잠시 후 음식을 준비해 드리겠습니다
          </p>
          <p className="text-gray-500 text-sm">
            화면 번호를 확인해 주세요
          </p>
        </div>

        {/* 자동 닫힘 안내 */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-xs">
            3초 후 자동으로 닫힙니다...
          </p>
        </div>
      </div>
    </div>
  );
}

export default OrderCompleteModal;

