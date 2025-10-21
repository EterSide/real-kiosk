'use client';

import { useState, useCallback } from 'react';

/**
 * 제품이 장바구니로 날아가는 애니메이션을 관리하는 훅
 */
export function useFlyToCart() {
  const [flyingItems, setFlyingItems] = useState([]);

  const triggerFlyAnimation = useCallback((productElement, productData) => {
    if (!productElement) return;

    // 제품 요소의 위치 정보
    const rect = productElement.getBoundingClientRect();
    
    // 장바구니 위치 (화면 오른쪽 상단)
    const cartElement = document.querySelector('[data-cart-icon]');
    const cartRect = cartElement ? cartElement.getBoundingClientRect() : { left: window.innerWidth - 100, top: 50 };

    // 날아갈 거리 계산
    const deltaX = cartRect.left - rect.left - rect.width / 2;
    const deltaY = cartRect.top - rect.top - rect.height / 2;
    
    // 포물선 중간 지점 (위로 솟아오르는 효과)
    const midX = deltaX / 2;
    const midY = deltaY / 2 - 100; // 위로 100px 더 올라감

    // 날아가는 아이템 생성
    const flyingItem = {
      id: Date.now(),
      startX: rect.left,
      startY: rect.top,
      width: rect.width,
      height: rect.height,
      deltaX,
      deltaY,
      midX,
      midY,
      productData,
    };

    setFlyingItems(prev => [...prev, flyingItem]);

    // 애니메이션 종료 후 제거
    setTimeout(() => {
      setFlyingItems(prev => prev.filter(item => item.id !== flyingItem.id));
    }, 800);

    return flyingItem.id;
  }, []);

  return {
    flyingItems,
    triggerFlyAnimation,
  };
}

export default useFlyToCart;

