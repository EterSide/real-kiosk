import { useCallback, useEffect, useRef, useState } from 'react';
import { speakWithGoogleTTS } from '@/services/googleCloudTTS';

/**
 * 한국어 TTS를 위한 텍스트 전처리
 * 자연스러운 발음을 위해 띄어쓰기와 쉼표 추가
 */
function preprocessKoreanText(text) {
  // 숫자 + 원 사이에 공백 추가
  text = text.replace(/(\d+)(원)/g, '$1 $2');
  
  // "~입니다"를 "~ 입니다"로 (약간의 쉼)
  text = text.replace(/([가-힣]+)(입니다|이에요|예요)/g, '$1 $2');
  
  // "~하셨습니다"를 "~ 하셨습니다"로
  text = text.replace(/([가-힣]+)(하셨습니다|하셨어요)/g, '$1 $2');
  
  // 감탄사 뒤에 쉼표 추가 (이미 있으면 패스)
  text = text.replace(/([네넵아예])(\s)(?![,!?])/g, '$1, ');
  
  // "~요" 뒤에 약간의 쉼 (문장 중간일 때만)
  text = text.replace(/([가-힣]+요)\s+([가-힣])/g, '$1, $2');
  
  return text;
}

/**
 * TTS (Text-to-Speech) 훅
 * Web Speech API 또는 Google Cloud TTS 사용
 */
export function useTextToSpeech(onSpeechEnd, speechEngine = 'web', customerInfo = null) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [queue, setQueue] = useState([]);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const synthRef = useRef(null);
  const currentAudioRef = useRef(null); // Google TTS용 Audio 엘리먼트

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
    if (!text) {
      console.warn('[TTS] speak 호출 실패: 텍스트 없음');
      return;
    }

    console.log('[TTS] 🔊 speak 호출:', text);
    console.log('[TTS] 언어:', options.language || 'ko');
    console.log('[TTS] 엔진:', speechEngine);
    console.log('[TTS] 고객 정보:', customerInfo);

    // 🎯 Google Cloud TTS 사용
    if (speechEngine === 'google') {
      console.log('[TTS] ✅ Google Cloud TTS 사용');
      
      // 현재 재생 중인 오디오 중지
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      
      // 성별 기반 목소리 선택 (반대로!)
      let gender = 'female'; // 기본값
      if (customerInfo && customerInfo.gender) {
        // 🔄 남성 고객 → 여성 목소리, 여성 고객 → 남성 목소리
        gender = customerInfo.gender === 'male' ? 'female' : 'male';
        console.log('[TTS] 🎭 성별 반전: 고객', customerInfo.gender, '→ 목소리', gender);
      }
      
      const language = options.language || 'ko';
      
      speakWithGoogleTTS(text, {
        language,
        gender,
        rate: options.rate || (language === 'ko' ? 0.9 : 1.0),
        pitch: options.pitch || 0,
        onStart: () => {
          console.log('[TTS] ✅ Google TTS 시작:', text);
          setIsSpeaking(true);
        },
        onEnd: () => {
          console.log('[TTS] ✅ Google TTS 종료');
          setIsSpeaking(false);
          currentAudioRef.current = null;
          if (onSpeechEnd) {
            onSpeechEnd();
          }
        },
        onError: (error) => {
          console.error('[TTS] ❌ Google TTS 에러:', error);
          setIsSpeaking(false);
          currentAudioRef.current = null;
          
          // 폴백: Web Speech API로 재시도
          console.log('[TTS] 🔄 폴백: Web Speech API로 재시도');
          speakWithWebSpeech(text, options);
        },
      }).then(audio => {
        currentAudioRef.current = audio;
      }).catch(error => {
        console.error('[TTS] ❌ Google TTS 실행 실패:', error);
      });
      
      return;
    }

    // 🌐 Web Speech API 사용 (기본)
    console.log('[TTS] ✅ Web Speech API 사용');
    speakWithWebSpeech(text, options);
  }, [speechEngine, customerInfo, onSpeechEnd]);

  // Web Speech API로 말하기
  const speakWithWebSpeech = useCallback((text, options = {}) => {
    if (!synthRef.current || !text) {
      console.warn('[TTS] Web Speech API 호출 실패:', { hasSynth: !!synthRef.current, hasText: !!text });
      return;
    }

    console.log('[TTS] 🌐 Web Speech API로 재생');

    // 현재 재생 중인 것 취소
    synthRef.current.cancel();

    // 언어별 설정
    const language = options.language || 'ko';
    const langCode = language === 'en' ? 'en-US' : 'ko-KR';
    
    // 한국어일 경우 텍스트 전처리
    const processedText = language === 'ko' ? preprocessKoreanText(text) : text;
    
    if (processedText !== text) {
      console.log('[TTS] 📝 전처리 후:', processedText);
    }

    const utterance = new SpeechSynthesisUtterance(processedText);
    
    utterance.lang = langCode;
    // 한국어는 약간 느리게, 영어는 기본 속도
    utterance.rate = options.rate || (language === 'ko' ? 0.9 : 1.0);
    // 한국어는 약간 높은 톤으로 (더 친근하게)
    utterance.pitch = options.pitch || (language === 'ko' ? 1.1 : 1.0);
    utterance.volume = options.volume || 1.0;

    // 해당 언어의 음성 찾기
    const voices = synthRef.current.getVoices();
    console.log('[TTS] 📋 사용 가능한 음성 목록:');
    voices.forEach((voice, idx) => {
      console.log(`  ${idx + 1}. ${voice.name} (${voice.lang}) ${voice.default ? '⭐ 기본' : ''}`);
    });
    
    // 언어별로 최적의 음성 찾기
    let selectedVoice;
    if (language === 'en') {
      // 영어 음성 우선순위: en-US > en-GB > en-*
      selectedVoice = voices.find(voice => voice.lang === 'en-US') ||
                      voices.find(voice => voice.lang === 'en-GB') ||
                      voices.find(voice => voice.lang.startsWith('en'));
      
      if (selectedVoice) {
        console.log('[TTS] ✅ 영어 음성 선택:', selectedVoice.name, '(', selectedVoice.lang, ')');
        utterance.voice = selectedVoice;
      } else {
        console.warn('[TTS] ⚠️ 영어 음성을 찾을 수 없습니다. 기본 음성 사용');
      }
    } else {
      // 한국어 음성
      selectedVoice = voices.find(voice => voice.lang.startsWith('ko'));
      
      if (selectedVoice) {
        console.log('[TTS] ✅ 한국어 음성 선택:', selectedVoice.name, '(', selectedVoice.lang, ')');
        utterance.voice = selectedVoice;
      } else {
        console.warn('[TTS] ⚠️ 한국어 음성을 찾을 수 없습니다. 기본 음성 사용');
        console.log('[TTS] 💡 시스템 설정에서 한국어 TTS를 설치해주세요');
      }
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
  }, []);

  const cancel = useCallback(() => {
    console.log('[TTS] ⏹️ 취소 요청');
    
    // Google TTS 오디오 중지
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    
    // Web Speech API 중지
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    
    setIsSpeaking(false);
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

