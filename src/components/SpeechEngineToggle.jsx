'use client';

import { useKioskStore } from '@/store/kioskStore';

/**
 * 음성 엔진 토글 컴포넌트
 * Web Speech API vs Google Cloud STT-TTS
 */
export function SpeechEngineToggle() {
  const { speechEngine, setSpeechEngine } = useKioskStore();

  const handleToggle = () => {
    const newEngine = speechEngine === 'web' ? 'google' : 'web';
    setSpeechEngine(newEngine);
  };

  return (
    <div className="fixed top-4 left-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-3 min-w-[280px]">
        {/* 헤더 */}
        <div className="text-xs text-gray-500 mb-2 font-medium">
          🎙️ 음성 엔진
        </div>
        
        {/* 토글 버튼 */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggle}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              speechEngine === 'web'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <div className="flex flex-col items-center">
              <span className="text-xs">🌐</span>
              <span>Web Speech</span>
            </div>
          </button>
          
          <button
            onClick={handleToggle}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              speechEngine === 'google'
                ? 'bg-green-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <div className="flex flex-col items-center">
              <span className="text-xs">☁️</span>
              <span>Google Cloud</span>
            </div>
          </button>
        </div>
        
        {/* 설명 */}
        <div className="mt-2 text-xs text-gray-500">
          {speechEngine === 'web' ? (
            <>
              <span className="font-medium">Web Speech API</span>
              <br />
              무료 • 오프라인 가능 • 실시간 인식
            </>
          ) : (
            <>
              <span className="font-medium">Google Cloud STT-TTS</span>
              <br />
              고품질 • 성별 반전 목소리
              <br />
              <span className="text-orange-500">⏱️ 4초마다 음성 전송</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SpeechEngineToggle;

