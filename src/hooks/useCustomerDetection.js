import { useEffect, useRef, useState } from 'react';
import { detectCustomerFromVideo } from '@/services/luxandApi'; // 👈 Luxand API 추가

// face-api.js를 전역으로 한 번만 로드
let faceApiPromise = null;
let faceApiModule = null;

// Luxand API 사용 여부 (하드코딩)
const USE_LUXAND = true; // 테스트용

async function loadFaceApi() {
  if (faceApiModule) return faceApiModule;
  if (faceApiPromise) return faceApiPromise;
  
  faceApiPromise = import('@vladmandic/face-api').then(module => {
    faceApiModule = module;
    return module;
  });
  
  return faceApiPromise;
}

/**
 * 웹캠으로 고객 감지하는 훅
 * face-api.js 사용
 */
export function useCustomerDetection(onCustomerDetected, enabled = true) {
  const videoRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionProgress, setDetectionProgress] = useState(0); // 0-100
  const [customerInfo, setCustomerInfo] = useState(null); // 👈 고객 정보 (나이/성별)
  const detectionTimeoutRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);
  const hasCalledCallbackRef = useRef(false); // 콜백 호출 여부 추적
  const onCustomerDetectedRef = useRef(onCustomerDetected); // ref로 저장
  const isDetectingRef = useRef(false); // 동기적 감지 상태 추적
  const detectionHistoryRef = useRef([]); // 👈 감지 히스토리 (평균 계산용)
  
  // 콜백 업데이트
  useEffect(() => {
    onCustomerDetectedRef.current = onCustomerDetected;
  }, [onCustomerDetected]);

  useEffect(() => {
    if (!enabled) {
      console.log('[얼굴감지] 비활성화됨 (enabled=false)');
      return;
    }
    
    console.log('[얼굴감지] 활성화됨 (enabled=true)');

    let mounted = true;
    let stream = null;
    
    // enabled가 변경되면 리셋
    hasCalledCallbackRef.current = false;
    isDetectingRef.current = false;
    detectionHistoryRef.current = []; // 히스토리 리셋

    async function loadModels() {
      try {
        console.log('[얼굴감지] face-api.js 모델 로드 시작...');
        
        // face-api.js 모듈 로드 (전역으로 한 번만)
        const faceapi = await loadFaceApi();
        console.log('[얼굴감지] ✅ face-api 모듈 로드 완료');
        
        // 모델 파일 로드 (나이/성별 모델 추가)
        console.log('[얼굴감지] 📦 TinyFaceDetector 모델 로드 중...');
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        console.log('[얼굴감지] ✅ TinyFaceDetector 로드 완료');
        
        console.log('[얼굴감지] 📦 FaceLandmark68 모델 로드 중...');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        console.log('[얼굴감지] ✅ FaceLandmark68 로드 완료');
        
        console.log('[얼굴감지] 📦 AgeGender 모델 로드 중...');
        await faceapi.nets.ageGenderNet.loadFromUri('/models');
        console.log('[얼굴감지] ✅ AgeGender 로드 완료');

        console.log('[얼굴감지] 🎉 모든 모델 로드 완료! (얼굴 + 나이/성별)');
        if (mounted) {
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('[얼굴감지] ❌ 모델 로드 실패:', error);
        console.error('[얼굴감지] 에러 상세:', error.message, error.stack);
      }
    }

    async function startWebcam() {
      try {
        console.log('[얼굴감지] 웹캠 시작 중...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
          },
        });

        if (videoRef.current && mounted) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          console.log('[얼굴감지] ✅ 웹캠 시작 완료!');
        }
      } catch (error) {
        console.error('[얼굴감지] ❌ 웹캠 시작 실패:', error);
      }
    }

    loadModels();
    startWebcam();

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }
    };
  }, [enabled]);

  useEffect(() => {
    if (!isLoaded || !enabled || !videoRef.current) {
      console.log('감지 시작 안됨:', { isLoaded, enabled, hasVideo: !!videoRef.current });
      return;
    }

    let mounted = true;
    let animationId = null;

    async function detectFace() {
      if (!mounted || !videoRef.current) return;

      // 비디오가 준비될 때까지 대기
      if (videoRef.current.readyState < 2) {
        animationId = requestAnimationFrame(detectFace);
        return;
      }

      try {
        // 이미 로드된 모듈 사용
        if (!faceApiModule) {
          console.log('[얼굴감지] face-api 모듈이 아직 로드되지 않음');
          return;
        }
        
        // 👇 나이/성별 감지 추가
        const detections = await faceApiModule
          .detectAllFaces(
            videoRef.current,
            new faceApiModule.TinyFaceDetectorOptions()
          )
          .withFaceLandmarks()
          .withAgeAndGender(); // 👈 나이/성별 감지

        const now = Date.now();
        
        // 디버깅: 감지 결과 로그 (첫 5초만)
        if (now < (window.detectionStartTime || (window.detectionStartTime = now)) + 5000) {
          console.log('[얼굴감지] 감지 결과:', detections.length, '개의 얼굴');
        }

        if (detections.length > 0) {
          // 첫 번째 얼굴 정보 추출
          const detection = detections[0];
          const rawAge = detection.age;
          const rawGender = detection.gender;
          const rawGenderProb = detection.genderProbability;
          
          // 👇 히스토리에 추가 (최근 10개만 유지)
          detectionHistoryRef.current.push({
            age: rawAge,
            gender: rawGender,
            genderProbability: rawGenderProb,
          });
          if (detectionHistoryRef.current.length > 10) {
            detectionHistoryRef.current.shift();
          }
          
          // 👇 평균 계산 (정확도 향상)
          const history = detectionHistoryRef.current;
          const avgAge = Math.round(
            history.reduce((sum, h) => sum + h.age, 0) / history.length
          );
          
          // 성별은 다수결 (male/female 중 더 많이 나온 것)
          const maleCount = history.filter(h => h.gender === 'male').length;
          const femaleCount = history.length - maleCount;
          const avgGender = maleCount > femaleCount ? 'male' : 'female';
          
          // 평균 신뢰도
          const avgGenderProb = Math.round(
            history.reduce((sum, h) => sum + h.genderProbability, 0) / history.length * 100
          );
          
          // 나이대 계산
          let ageGroup;
          if (avgAge < 13) ageGroup = 'child';
          else if (avgAge < 20) ageGroup = 'teen';
          else if (avgAge < 30) ageGroup = '20s';
          else if (avgAge < 40) ageGroup = '30s';
          else if (avgAge < 50) ageGroup = '40s';
          else ageGroup = '50s+';
          
          const info = {
            age: avgAge,
            ageGroup,
            gender: avgGender,
            genderProbability: avgGenderProb,
          };
          
          // 디버깅: 원본 vs 평균 비교 (첫 5초만)
          if (now < (window.detectionStartTime || (window.detectionStartTime = now)) + 5000) {
            console.log('[얼굴감지] 고객 정보:', `${avgAge}세 (${ageGroup}), ${avgGender === 'male' ? '남성' : '여성'} (신뢰도: ${avgGenderProb}%) [샘플: ${history.length}개]`);
          }
          
          // 얼굴이 감지됨 (ref 사용으로 동기적 체크)
          if (!isDetectingRef.current) {
            console.log('[얼굴감지] ✅ 감지 시작! 프로그레스 시작');
            isDetectingRef.current = true;
            setIsDetecting(true);
            lastDetectionTimeRef.current = now;
            hasCalledCallbackRef.current = false; // 리셋
          }
          
          // 고객 정보 업데이트 (평균값으로)
          setCustomerInfo(info);

          // 경과 시간 계산 및 프로그레스 업데이트
          const elapsed = now - lastDetectionTimeRef.current;
          const progress = Math.min((elapsed / 1000) * 100, 100);
          setDetectionProgress(progress);
          
          // 1초 완료 (100%) 시 콜백 호출
          if (progress >= 100 && !hasCalledCallbackRef.current) {
            console.log('[얼굴감지] 🎉 인식 완료 (100%)!');
            hasCalledCallbackRef.current = true; // 중복 호출 방지
            
            // 👇 face-api.js 결과 먼저 출력
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📊 [face-api.js 결과]');
            console.log(`   나이: ${avgAge}세 (${info.ageGroup})`);
            console.log(`   성별: ${avgGender === 'male' ? '남성' : '여성'} (신뢰도: ${avgGenderProb}%)`);
            console.log(`   샘플: ${detectionHistoryRef.current.length}개 프레임 평균`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            // 👇 Luxand API 사용 시 추가 분석
            if (USE_LUXAND) {
              console.log('📸 [Luxand API 분석 시작...]');
              
              // Luxand API로 더 정확한 분석
              detectCustomerFromVideo(videoRef.current)
                .then((luxandInfo) => {
                  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                  console.log('📊 [Luxand.cloud 결과]');
                  console.log(`   나이: ${luxandInfo.age}세 (${luxandInfo.ageGroup})`);
                  console.log(`   성별: ${luxandInfo.gender === 'male' ? '남성' : '여성'} (신뢰도: ${luxandInfo.genderProbability}%)`);
                  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                  console.log('');
                  console.log('🔍 비교 결과:');
                  console.log(`   나이 차이: ${Math.abs(luxandInfo.age - avgAge)}세`);
                  console.log(`   성별 일치: ${luxandInfo.gender === avgGender ? '✅' : '❌'}`);
                  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                  
                  setCustomerInfo(luxandInfo); // Luxand 결과로 UI 업데이트
                  
                  if (onCustomerDetectedRef.current) {
                    onCustomerDetectedRef.current(luxandInfo);
                  }
                })
                .catch((error) => {
                  console.error('❌ [Luxand API 실패]', error.message);
                  console.log('➡️  face-api.js 결과를 사용합니다.');
                  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                  
                  if (onCustomerDetectedRef.current) {
                    onCustomerDetectedRef.current(info); // face-api 결과 사용
                  }
                });
            } else {
              // Luxand 비활성화 시 face-api 결과만 사용
              if (onCustomerDetectedRef.current) {
                onCustomerDetectedRef.current(info);
              }
            }
          }
        } else {
          // 얼굴이 감지되지 않음
          if (isDetectingRef.current) {
            console.log('[얼굴감지] 감지 종료 (얼굴 사라짐)');
            isDetectingRef.current = false;
            setIsDetecting(false);
            setDetectionProgress(0); // 프로그레스 리셋
            hasCalledCallbackRef.current = false; // 리셋
            detectionHistoryRef.current = []; // 히스토리 리셋
          }
        }
      } catch (error) {
        console.error('Face detection 에러:', error);
      }

      // 다음 프레임 감지
      animationId = requestAnimationFrame(detectFace);
    }

    console.log('[얼굴감지] 얼굴 감지 루프 시작');
    detectFace();

    return () => {
      mounted = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isLoaded, enabled]); // onCustomerDetected와 isDetecting 제거!

  // enabled가 false가 되면 (주문 시작) 프로그레스 리셋
  useEffect(() => {
    if (!enabled) {
      setDetectionProgress(0);
      isDetectingRef.current = false;
      setIsDetecting(false);
      detectionHistoryRef.current = []; // 히스토리 리셋
      setCustomerInfo(null); // 고객 정보 리셋
    }
  }, [enabled]);

  return {
    videoRef,
    isLoaded,
    isDetecting,
    detectionProgress, // 0-100
    customerInfo, // 👈 고객 정보 (나이/성별)
  };
}

export default useCustomerDetection;

