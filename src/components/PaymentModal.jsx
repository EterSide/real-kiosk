'use client';

import { useState, useEffect } from 'react';
import { useKioskStore } from '@/store/kioskStore';
import { t } from '@/lib/translations';

/**
 * 결제 모달 컴포넌트
 * 카드, 현금, 간편결제 옵션 제공
 */
export function PaymentModal({ isOpen, totalAmount, onComplete, onCancel }) {
  const { language } = useKioskStore();
  const [step, setStep] = useState('select'); // 'select' | 'card-insert' | 'processing' | 'complete'
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [progress, setProgress] = useState(0);

  // 모달이 열릴 때마다 초기화
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedMethod(null);
      setProgress(0);
    }
  }, [isOpen]);

  // 결제 수단 선택 핸들러
  const handleMethodSelect = (method) => {
    console.log('[PaymentModal] 결제 수단 선택:', method);
    setSelectedMethod(method);
    
    if (method === 'card') {
      // 카드 → 카드 삽입 화면
      setStep('card-insert');
      setTimeout(() => {
        setStep('processing');
        startProcessing();
      }, 1500); // 카드 삽입 화면 1.5초
    } else {
      // 현금/간편결제 → 바로 처리 중
      setStep('processing');
      startProcessing();
    }
  };

  // 결제 처리 시작
  const startProcessing = () => {
    console.log('[PaymentModal] 결제 처리 시작');
    setProgress(0);
    
    // 프로그레스 바 애니메이션 (2초)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5; // 20번 업데이트 = 2초
      });
    }, 100);
    
    // 2초 후 완료
    setTimeout(() => {
      setStep('complete');
      // 2초 후 자동으로 닫기
      setTimeout(() => {
        onComplete();
      }, 2000);
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-[800px] max-h-[90vh] overflow-hidden">
        {/* 결제 수단 선택 */}
        {step === 'select' && (
          <div className="bg-gradient-to-b from-gray-50 to-white min-h-[600px]">
            {/* 헤더 */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center">
              <button 
                onClick={onCancel}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-6">
              {/* 금액 표시 (작게) */}
              <p className="text-sm text-blue-600 font-medium mb-2">
                {t('easyAmount', language)} {totalAmount.toLocaleString()}{t('won', language)}
              </p>
              
              {/* 제목 */}
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {t('selectPaymentMethod', language)}
              </h2>

              {/* 결제 수단 카드들 */}
              <div className="space-y-3">
                {/* 카드 + 삼성/애플페이 통합 */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* 카드 */}
                  <button
                    onClick={() => handleMethodSelect('card')}
                    className="bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-400 rounded-2xl p-4 transition-all"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="2"/>
                          <path d="M2 10h20" strokeWidth="2"/>
                        </svg>
                      </div>
                      <span className="text-base font-semibold text-gray-900">{t('card', language)}</span>
                    </div>
                  </button>

                  {/* 삼성/애플페이 */}
                  <button
                    onClick={() => handleMethodSelect('simple')}
                    className="bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-400 rounded-2xl p-4 transition-all"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-14 h-14 flex items-center justify-center gap-1">
                        {/* Samsung Pay 이미지 */}
                        <img 
                          src="/images/samsung-pay.png" 
                          alt="Samsung Pay" 
                          className="h-10 w-auto object-contain"
                        />
                        {/* Apple Pay 이미지 */}
                        <img 
                          src="/images/apple-pay.png" 
                          alt="Apple Pay" 
                          className="h-8 w-auto object-contain"
                        />
                      </div>
                      <span className="text-base font-semibold text-gray-900">{t('samsungApplePay', language)}</span>
                    </div>
                  </button>
                </div>

                {/* 토스페이 간편결제 */}
                <button
                  onClick={() => handleMethodSelect('simple')}
                  className="w-full bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-400 rounded-2xl p-4 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/>
                      </svg>
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-base font-bold text-gray-900">{t('tossPaySimple', language)}</div>
                      <div className="text-sm text-gray-500">{t('tossPointAvailable', language)}</div>
                    </div>
                  </div>
                </button>

                {/* QR 간편결제 */}
                <button
                  onClick={() => handleMethodSelect('simple')}
                  className="w-full bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-400 rounded-2xl p-4 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white border-2 border-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      {/* QR 코드 아이콘 (더 정교하게) */}
                      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                        {/* 왼쪽 위 큰 사각형 */}
                        <rect x="2" y="2" width="9" height="9" rx="1" fill="#2563eb"/>
                        <rect x="4" y="4" width="5" height="5" fill="white"/>
                        <rect x="5.5" y="5.5" width="2" height="2" fill="#2563eb"/>
                        
                        {/* 오른쪽 위 큰 사각형 */}
                        <rect x="13" y="2" width="9" height="9" rx="1" fill="#2563eb"/>
                        <rect x="15" y="4" width="5" height="5" fill="white"/>
                        <rect x="16.5" y="5.5" width="2" height="2" fill="#2563eb"/>
                        
                        {/* 왼쪽 아래 큰 사각형 */}
                        <rect x="2" y="13" width="9" height="9" rx="1" fill="#2563eb"/>
                        <rect x="4" y="15" width="5" height="5" fill="white"/>
                        <rect x="5.5" y="16.5" width="2" height="2" fill="#2563eb"/>
                        
                        {/* 오른쪽 아래 패턴 (작은 사각형들) */}
                        <rect x="13" y="13" width="2" height="2" fill="#2563eb"/>
                        <rect x="16" y="13" width="2" height="2" fill="#2563eb"/>
                        <rect x="19" y="13" width="3" height="2" fill="#2563eb"/>
                        <rect x="13" y="16" width="3" height="2" fill="#2563eb"/>
                        <rect x="17" y="16" width="2" height="2" fill="#2563eb"/>
                        <rect x="20" y="16" width="2" height="2" fill="#2563eb"/>
                        <rect x="13" y="19" width="2" height="3" fill="#2563eb"/>
                        <rect x="16" y="19" width="2" height="3" fill="#2563eb"/>
                        <rect x="19" y="19" width="3" height="3" fill="#2563eb"/>
                      </svg>
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-base font-bold text-gray-900">{t('qrSimplePay', language)}</div>
                      <div className="text-sm text-gray-500">{t('qrPaymentOptions', language)}</div>
                    </div>
                  </div>
                </button>

                {/* 현금 */}
                <button
                  onClick={() => handleMethodSelect('cash')}
                  className="w-full bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-400 rounded-2xl p-4 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      {/* 지폐 아이콘 */}
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="2" y="6" width="20" height="12" rx="2" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="2.5" strokeWidth="2"/>
                        <path d="M6 9.5C6 8.67 5.33 8 4.5 8" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M18 9.5C18 8.67 18.67 8 19.5 8" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M6 14.5C6 15.33 5.33 16 4.5 16" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M18 14.5C18 15.33 18.67 16 19.5 16" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-base font-bold text-gray-900">{t('cash', language)}</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 카드 삽입 화면 */}
        {step === 'card-insert' && (
          <div className="p-8 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
            <h2 className="text-4xl font-bold mb-8 text-center">
              {t('insertCard', language)}
            </h2>
            
            <div className="flex flex-col items-center justify-center py-8">
              {/* 카드 삽입 이미지 */}
              <div className="bg-white rounded-3xl p-8 shadow-2xl mb-6">
                <img 
                  src="/images/card-insert.png" 
                  alt="카드 삽입" 
                  className="w-full h-auto max-w-md"
                  onError={(e) => {
                    // 이미지 로드 실패 시 대체 텍스트
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div style={{ display: 'none' }} className="text-center text-blue-600 text-xl font-bold py-16">
                  💳 카드를 투입구에 넣어주세요 →
                </div>
              </div>
              
              {/* 안내 메시지 */}
              <div className="text-center">
                <p className="text-2xl font-semibold mb-2">{t('insertCardDetail1', language)}</p>
                <p className="text-xl text-blue-200">{t('insertCardDetail2', language)}</p>
              </div>

              {/* 로딩 애니메이션 */}
              <div className="mt-8 flex gap-2">
                <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* 결제 처리 중 */}
        {step === 'processing' && (
          <div className="p-8 bg-gradient-to-br from-orange-500 to-red-500 text-white min-h-[400px] flex flex-col items-center justify-center">
            <div className="text-center mb-8">
              <div className="mb-6">
                {selectedMethod === 'card' && <span className="text-8xl">💳</span>}
                {selectedMethod === 'cash' && <span className="text-8xl">💵</span>}
                {selectedMethod === 'simple' && <span className="text-8xl">📱</span>}
              </div>
              
              <h2 className="text-4xl font-bold mb-4">
                {selectedMethod === 'card' && t('cardApproving', language)}
                {selectedMethod === 'cash' && t('cashProcessing', language)}
                {selectedMethod === 'simple' && t('simplePayApproving', language)}
              </h2>
              
              <p className="text-xl text-orange-100">
                {t('pleaseWait', language)}
              </p>
            </div>

            {/* 프로그레스 바 */}
            <div className="w-full max-w-md">
              <div className="bg-white bg-opacity-30 rounded-full h-6 overflow-hidden">
                <div 
                  className="bg-white h-full rounded-full transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-center mt-3 text-lg font-semibold">{progress}%</p>
            </div>

            {/* 회전 애니메이션 */}
            <div className="mt-8">
              <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        )}

        {/* 결제 완료 */}
        {step === 'complete' && (
          <div className="p-8 bg-gradient-to-br from-green-500 to-emerald-600 text-white min-h-[400px] flex flex-col items-center justify-center">
            {/* 체크 애니메이션 */}
            <div className="mb-8 relative">
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center animate-scale-in">
                <span className="text-8xl animate-check">✓</span>
              </div>
            </div>

            <h2 className="text-5xl font-bold mb-4 animate-fade-in">
              {t('paymentComplete', language)}
            </h2>
            
            <p className="text-2xl text-green-100 mb-6 animate-fade-in-delay">
              {t('paymentSuccess', language)}
            </p>

            <div className="bg-white bg-opacity-20 rounded-2xl p-6 backdrop-blur-sm animate-fade-in-delay-2">
              <div className="flex items-center justify-between gap-8">
                <span className="text-xl font-semibold">{t('paymentAmount', language)}</span>
                <span className="text-3xl font-bold">{totalAmount.toLocaleString()}{t('won', language)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 애니메이션 스타일 */}
      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }
        
        .animate-check {
          animation: scale-in 0.6s ease-out 0.2s both;
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out 0.4s both;
        }
        
        .animate-fade-in-delay {
          animation: fade-in 0.5s ease-out 0.6s both;
        }
        
        .animate-fade-in-delay-2 {
          animation: fade-in 0.5s ease-out 0.8s both;
        }
      `}</style>
    </div>
  );
}

export default PaymentModal;

