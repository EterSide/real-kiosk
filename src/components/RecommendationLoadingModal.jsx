'use client';

import { useKioskStore } from '@/store/kioskStore';

/**
 * AI 추천 로딩 모달
 * LLM 응답 대기 시간 동안 표시
 */
export function RecommendationLoadingModal({ isOpen }) {
  const { language } = useKioskStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 animate-scale-in">
        {/* 로딩 아이콘 */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {/* 회전하는 원 */}
            <div className="w-24 h-24 border-8 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
            
            {/* 중앙 아이콘 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl">🤖</span>
            </div>
          </div>
        </div>

        {/* 메시지 */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-800 mb-3">
            {language === 'ko' ? 'AI가 추천 메뉴를 찾고 있습니다' : 'AI is finding recommendations'}
          </h3>
          
          <div className="flex justify-center gap-1 mb-4">
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
          
          <p className="text-gray-600">
            {language === 'ko' 
              ? '잠시만 기다려 주세요...' 
              : 'Please wait a moment...'}
          </p>
        </div>

        {/* 장식 */}
        <div className="mt-6 flex justify-center gap-3">
          <span className="text-2xl animate-pulse">🍔</span>
          <span className="text-2xl animate-pulse" style={{ animationDelay: '200ms' }}>🍟</span>
          <span className="text-2xl animate-pulse" style={{ animationDelay: '400ms' }}>🥤</span>
        </div>
      </div>

      {/* 애니메이션 스타일 */}
      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default RecommendationLoadingModal;

