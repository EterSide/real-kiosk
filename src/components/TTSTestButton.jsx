'use client';

import { useState } from 'react';

/**
 * TTS 테스트 버튼 (디버깅용)
 */
export function TTSTestButton() {
  const [isTesting, setIsTesting] = useState(false);

  const testTTS = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert('이 브라우저는 TTS를 지원하지 않습니다.');
      return;
    }

    setIsTesting(true);
    
    const synth = window.speechSynthesis;
    synth.cancel(); // 기존 것 취소
    
    const utterance = new SpeechSynthesisUtterance('테스트입니다. 소리가 들리나요?');
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = synth.getVoices();
    const koreanVoice = voices.find(v => v.lang.startsWith('ko'));
    if (koreanVoice) {
      utterance.voice = koreanVoice;
    }

    utterance.onstart = () => {
      console.log('[TTS 테스트] 시작');
    };

    utterance.onend = () => {
      console.log('[TTS 테스트] 종료');
      setIsTesting(false);
    };

    utterance.onerror = (e) => {
      console.error('[TTS 테스트] 에러:', e);
      setIsTesting(false);
      alert('TTS 에러: ' + e.error);
    };

    console.log('[TTS 테스트] speak() 호출');
    synth.speak(utterance);
  };

  return (
    <button
      onClick={testTTS}
      disabled={isTesting}
      className="fixed bottom-20 right-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-semibold"
      title="TTS 테스트"
    >
      {isTesting ? '🔊 재생 중...' : '🎤 TTS 테스트'}
    </button>
  );
}

export default TTSTestButton;

