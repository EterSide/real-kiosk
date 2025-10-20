import { useEffect, useRef, useState, useCallback } from 'react';
import { createGoogleSTTRecorder } from '@/services/googleCloudSTT';

/**
 * 음성 인식 훅
 * Web Speech API 또는 Google Cloud STT 사용
 */
export function useSpeechRecognition(onResult, enabled = false, language = 'ko', speechEngine = 'web') {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const enabledRef = useRef(enabled); // ref로 관리
  const languageRef = useRef(language); // ref로 관리
  const isManuallyStoppedRef = useRef(false); // 수동 중지 플래그
  const speechEngineRef = useRef(speechEngine); // ref로 관리
  const googleRecorderRef = useRef(null); // Google STT Recorder
  const micStreamRef = useRef(null); // 마이크 스트림
  
  // enabled 업데이트
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);
  
  // language 업데이트
  useEffect(() => {
    languageRef.current = language;
  }, [language]);
  
  // speechEngine 업데이트
  useEffect(() => {
    speechEngineRef.current = speechEngine;
  }, [speechEngine]);

  // 음성 인식 초기화
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech Recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    // 언어 설정은 start 시점에 동적으로 변경
    recognition.lang = language === 'en' ? 'en-US' : 'ko-KR';
    recognition.maxAlternatives = 1;
    
    console.log('[음성인식] 초기 언어 설정:', recognition.lang);

    recognition.onstart = () => {
      console.log('[음성인식] ✅ 시작');
      setIsListening(true);
      isManuallyStoppedRef.current = false;
    };

    recognition.onend = () => {
      console.log('[음성인식] 종료');
      setIsListening(false);
      
      // 수동 중지가 아니고, enabled 상태면 자동 재시작
      if (!isManuallyStoppedRef.current && enabledRef.current) {
        console.log('[음성인식] 자동 재시작 시도 (500ms 후)...');
        setTimeout(() => {
          if (enabledRef.current && !isManuallyStoppedRef.current) {
            try {
              recognition.start();
              console.log('[음성인식] ✅ 재시작 성공');
            } catch (error) {
              if (error.message.includes('already started')) {
                console.log('[음성인식] 이미 시작됨');
              } else {
                console.log('[음성인식] 재시작 실패:', error.message);
              }
            }
          }
        }, 500); // 충분한 지연
      } else {
        console.log('[음성인식] 재시작 안 함 (enabled:', enabledRef.current, ', stopped:', isManuallyStoppedRef.current, ')');
      }
    };

    recognition.onerror = (event) => {
      console.error('[음성인식] ❌ 에러:', event.error);
      
      // aborted는 정상 중지이므로 재시작하지 않음
      if (event.error === 'aborted') {
        console.log('[음성인식] 정상 중지됨');
        isManuallyStoppedRef.current = true;
        return;
      }
      
      // no-speech는 자동으로 재시작됨 (onend에서 처리)
      if (event.error === 'no-speech') {
        console.log('[음성인식] 음성 없음 (자동 재시작 대기)');
        // isManuallyStoppedRef는 false로 유지 → onend에서 재시작됨
        return;
      }
      
      // audio-capture 에러는 복구 시도
      if (event.error === 'audio-capture') {
        console.log('[음성인식] 마이크 문제 (재시작 시도)');
        return;
      }
      
      // not-allowed는 권한 문제
      if (event.error === 'not-allowed') {
        console.error('[음성인식] ⚠️ 마이크 권한 거부! 화면을 클릭하세요.');
        isManuallyStoppedRef.current = true;
        return;
      }
      
      // 기타 에러는 로그만
      console.warn('[음성인식] 에러 발생, onend에서 처리됨');
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }

      if (interim) {
        console.log('[음성인식] 🔤 중간 결과:', interim);
        setInterimTranscript(interim);
        
        // 침묵 타이머 리셋
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        
        // 1초 침묵 감지
        silenceTimerRef.current = setTimeout(() => {
          if (interim.trim()) {
            // 최종 결과로 처리
            console.log('[음성인식] ⏱️ 침묵 감지 → 최종 결과로 처리:', interim.trim());
            setTranscript(interim.trim());
            setInterimTranscript('');
            
            if (onResult) {
              console.log('[음성인식] 📤 onResult 호출:', interim.trim());
              onResult(interim.trim());
            }
          }
        }, 1000);
      }

      if (final) {
        const finalText = final.trim();
        console.log('[음성인식] ✅ 최종 결과:', finalText);
        setTranscript(finalText);
        setInterimTranscript('');
        
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        
        if (onResult && finalText) {
          console.log('[음성인식] 📤 onResult 호출:', finalText);
          onResult(finalText);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognition) {
        recognition.stop();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [onResult]);

  // Google STT 초기화
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Google STT 모드일 때만 마이크 스트림 준비
    if (speechEngine === 'google') {
      console.log('[음성인식] Google STT 마이크 준비 중...');
      
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          console.log('[음성인식] ✅ 마이크 스트림 획득');
          micStreamRef.current = stream;
        })
        .catch(error => {
          console.error('[음성인식] ❌ 마이크 접근 실패:', error);
        });
      
      return () => {
        // 클린업: 스트림 정리
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(track => track.stop());
          micStreamRef.current = null;
        }
        if (googleRecorderRef.current) {
          googleRecorderRef.current.stop();
          googleRecorderRef.current = null;
        }
      };
    }
  }, [speechEngine]);

  // enabled 상태에 따라 시작/중지
  useEffect(() => {
    // 🎯 Google STT 사용
    if (speechEngine === 'google') {
      console.log('[음성인식] Google STT 모드');
      
      if (enabled && !isListening) {
        console.log('[음성인식] Google STT 시작 시도...');
        
        if (!micStreamRef.current) {
          console.warn('[음성인식] ⚠️ 마이크 스트림 없음, 대기...');
          return;
        }
        
        try {
          // Google STT Recorder 생성
          googleRecorderRef.current = createGoogleSTTRecorder(micStreamRef.current, {
            language: languageRef.current,
            recordDuration: 4000, // 4초마다 자동 전송 (너무 길면 답답함)
            onResult: (transcript) => {
              console.log('[음성인식] ✅ Google STT 결과:', transcript);
              
              // 빈 결과 무시
              if (!transcript || transcript.trim() === '') {
                console.log('[음성인식] ⚠️ 빈 결과, 무시하고 계속 녹음');
              } else {
                console.log('[음성인식] 📝 텍스트:', transcript);
                setTranscript(transcript);
                if (onResult) {
                  console.log('[음성인식] 📤 onResult 호출 (Google STT):', transcript);
                  onResult(transcript);
                }
              }
              
              // 🔄 자동으로 다시 녹음 시작 (연속 인식)
              setTimeout(() => {
                if (enabledRef.current && googleRecorderRef.current) {
                  console.log('[음성인식] 🔄 다음 녹음 시작...');
                  googleRecorderRef.current.start();
                }
              }, 300);
            },
            onError: (error) => {
              console.error('[음성인식] ❌ Google STT 에러:', error);
              
              // 에러 발생해도 계속 시도 (네트워크 문제 등)
              setTimeout(() => {
                if (enabledRef.current && googleRecorderRef.current) {
                  console.log('[음성인식] 🔄 에러 후 재시도...');
                  googleRecorderRef.current.start();
                }
              }, 1000);
            },
          });
          
          // 녹음 시작
          googleRecorderRef.current.start();
          setIsListening(true);
          console.log('[음성인식] ✅ Google STT 시작됨 (4초마다 자동 전송)');
        } catch (error) {
          console.error('[음성인식] ❌ Google STT 시작 실패:', error);
        }
      } else if (!enabled && isListening) {
        console.log('[음성인식] Google STT 중지...');
        
        if (googleRecorderRef.current) {
          googleRecorderRef.current.stop();
          googleRecorderRef.current = null;
        }
        
        setIsListening(false);
      }
      
      return;
    }
    
    // 🌐 Web Speech API 사용 (기본)
    if (!recognitionRef.current) return;

    if (enabled && !isListening) {
      console.log('[음성인식] Web Speech API 시작 시도...');
      console.log('[음성인식] 언어:', languageRef.current);
      isManuallyStoppedRef.current = false;
      
      // 언어 설정 업데이트
      const langCode = languageRef.current === 'en' ? 'en-US' : 'ko-KR';
      recognitionRef.current.lang = langCode;
      console.log('[음성인식] 언어 설정:', langCode);
      
      // 약간의 지연을 두고 시작 (이미 시작된 경우 방지)
      setTimeout(() => {
        if (recognitionRef.current && !isListening && enabledRef.current) {
          try {
            recognitionRef.current.start();
          } catch (error) {
            if (error.message.includes('already started')) {
              console.log('[음성인식] 이미 시작됨, 무시');
            } else {
              console.log('[음성인식] 시작 실패:', error.message);
            }
          }
        }
      }, 200);
    } else if (!enabled && isListening) {
      console.log('[음성인식] Web Speech API 중지...');
      isManuallyStoppedRef.current = true;
      recognitionRef.current.stop();
    }
  }, [enabled, isListening, speechEngine]);

  const start = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.log('시작 에러:', error);
      }
    }
  }, [isListening]);

  const stop = useCallback(() => {
    if (recognitionRef.current && isListening) {
      console.log('[음성인식] 수동 중지');
      isManuallyStoppedRef.current = true;
      recognitionRef.current.stop();
    }
  }, [isListening]);

  return {
    isListening,
    transcript,
    interimTranscript,
    start,
    stop,
  };
}

export default useSpeechRecognition;

