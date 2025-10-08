import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * TTS (Text-to-Speech) 훅
 * Web Speech API 사용
 */
export function useTextToSpeech(onSpeechEnd) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [queue, setQueue] = useState([]);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const synthRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
      
      // 음성 목록 로드 대기
      const loadVoices = () => {
        const voices = synthRef.current.getVoices();
        if (voices.length > 0) {
          console.log('[TTS] 음성 목록 로드 완료:', voices.length, '개');
          setVoicesLoaded(true);
        }
      };
      
      loadVoices();
      
      if (synthRef.current.onvoiceschanged !== undefined) {
        synthRef.current.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  const speak = useCallback((text, options = {}) => {
    if (!synthRef.current || !text) {
      console.warn('[TTS] speak 호출 실패:', { hasSynth: !!synthRef.current, hasText: !!text });
      return;
    }

    console.log('[TTS] 🔊 speak 호출:', text);

    // 현재 재생 중인 것 취소
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // 한국어 음성 설정
    utterance.lang = 'ko-KR';
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;

    // 한국어 음성 찾기
    const voices = synthRef.current.getVoices();
    console.log('[TTS] 📋 사용 가능한 음성 목록:');
    voices.forEach((voice, idx) => {
      console.log(`  ${idx + 1}. ${voice.name} (${voice.lang}) ${voice.default ? '⭐ 기본' : ''}`);
    });
    
    const koreanVoice = voices.find(voice => voice.lang.startsWith('ko'));
    if (koreanVoice) {
      console.log('[TTS] ✅ 한국어 음성 선택:', koreanVoice.name, '(', koreanVoice.lang, ')');
      utterance.voice = koreanVoice;
    } else {
      console.warn('[TTS] ⚠️ 한국어 음성을 찾을 수 없습니다. 기본 음성 사용');
      console.log('[TTS] 💡 시스템 설정에서 한국어 TTS를 설치해주세요');
    }

    utterance.onstart = () => {
      console.log('[TTS] ✅ 시작:', text);
      console.log('[TTS] 🎵 소리가 들리지 않으면 시스템 볼륨과 브라우저 탭 음소거 상태를 확인하세요');
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      console.log('[TTS] ✅ 종료');
      setIsSpeaking(false);
      
      if (onSpeechEnd) {
        onSpeechEnd();
      }
    };

    utterance.onerror = (event) => {
      console.error('[TTS] ❌ 에러:', event.error, event);
      console.log('[TTS] 에러 상세:', {
        type: event.type,
        error: event.error,
        charIndex: event.charIndex,
        elapsedTime: event.elapsedTime
      });
      setIsSpeaking(false);
    };

    utterance.onpause = () => {
      console.log('[TTS] ⏸️ 일시정지');
    };

    utterance.onresume = () => {
      console.log('[TTS] ▶️ 재개');
    };

    utterance.onboundary = (event) => {
      // 단어/문장 경계 이벤트 (너무 많이 출력되므로 주석)
      // console.log('[TTS] 🔤 경계:', event.name, 'at', event.charIndex);
    };

    console.log('[TTS] 📤 utterance 설정:', {
      text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      lang: utterance.lang,
      rate: utterance.rate,
      pitch: utterance.pitch,
      volume: utterance.volume,
      voice: utterance.voice?.name || '기본'
    });
    
    console.log('[TTS] 🎙️ speechSynthesis.speak() 실행...');
    synthRef.current.speak(utterance);
    
    // 상태 확인
    setTimeout(() => {
      console.log('[TTS] 📊 상태 체크:', {
        speaking: synthRef.current.speaking,
        pending: synthRef.current.pending,
        paused: synthRef.current.paused
      });
    }, 100);
  }, [onSpeechEnd]);

  const cancel = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const pause = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.resume();
    }
  }, []);

  return {
    speak,
    cancel,
    pause,
    resume,
    isSpeaking,
  };
}

export default useTextToSpeech;

