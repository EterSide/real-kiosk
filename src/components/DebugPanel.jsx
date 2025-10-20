'use client';

/**
 * 디버깅 패널 (개발용)
 */
export function DebugPanel({ 
  currentState, 
  isDetecting, 
  isLoaded,
  isListening,
  isSpeaking,
  lastInput,
  cartCount,
  speechEngine,
}) {
  // 프로덕션에서는 숨김
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs font-mono max-w-xs z-50">
      <h3 className="font-bold mb-2 text-yellow-400">🔧 디버그 정보</h3>
      
      <div className="space-y-1">
        <div>
          <span className="text-gray-400">상태:</span>{' '}
          <span className="text-green-400">{currentState}</span>
        </div>
        
        <div>
          <span className="text-gray-400">얼굴감지:</span>{' '}
          {isLoaded ? (
            <span className={isDetecting ? 'text-green-400' : 'text-yellow-400'}>
              {isDetecting ? '✅ 감지중' : '⏳ 대기중'}
            </span>
          ) : (
            <span className="text-red-400">❌ 로딩중</span>
          )}
        </div>
        
        <div>
          <span className="text-gray-400">음성엔진:</span>{' '}
          <span className={speechEngine === 'google' ? 'text-green-400' : 'text-blue-400'}>
            {speechEngine === 'google' ? '☁️ Google' : '🌐 Web'}
          </span>
        </div>
        
        <div>
          <span className="text-gray-400">음성인식:</span>{' '}
          <span className={isListening ? 'text-green-400' : 'text-gray-500'}>
            {isListening ? '🎤 듣는중' : '⏸️ 대기'}
          </span>
          {speechEngine === 'google' && isListening && (
            <span className="text-orange-400 text-[10px] ml-1">(4초간격)</span>
          )}
        </div>
        
        <div>
          <span className="text-gray-400">TTS:</span>{' '}
          <span className={isSpeaking ? 'text-blue-400' : 'text-gray-500'}>
            {isSpeaking ? '🗣️ 말하는중' : '⏸️ 대기'}
          </span>
        </div>
        
        <div>
          <span className="text-gray-400">장바구니:</span>{' '}
          <span className="text-yellow-400">{cartCount}개</span>
        </div>
        
        {lastInput && (
          <div className="mt-2 pt-2 border-t border-gray-600">
            <span className="text-gray-400">마지막 입력:</span>
            <div className="text-green-300 mt-1 break-words">
              "{lastInput}"
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-600 text-gray-400 text-[10px]">
        ⚠️ 개발 모드에서만 표시됨
      </div>
    </div>
  );
}

export default DebugPanel;

