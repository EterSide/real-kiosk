import { useEffect, useRef, useState } from 'react';

// face-api.js를 전역으로 한 번만 로드
let faceApiPromise = null;
let faceApiModule = null;

async function loadFaceApi() {
  if (faceApiModule) return faceApiModule;
  if (faceApiPromise) return faceApiPromise;
  
  faceApiPromise = import('face-api.js').then(module => {
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
  const detectionTimeoutRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);
  const hasCalledCallbackRef = useRef(false); // 콜백 호출 여부 추적
  const onCustomerDetectedRef = useRef(onCustomerDetected); // ref로 저장
  const isDetectingRef = useRef(false); // 동기적 감지 상태 추적
  
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

    async function loadModels() {
      try {
        console.log('[얼굴감지] face-api.js 모델 로드 시작...');
        
        // face-api.js 모듈 로드 (전역으로 한 번만)
        const faceapi = await loadFaceApi();
        
        // 모델 파일 로드
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        ]);

        console.log('[얼굴감지] ✅ 모델 로드 완료!');
        if (mounted) {
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('[얼굴감지] ❌ 모델 로드 실패:', error);
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
        if (!faceApiModule) return;
        
        const detections = await faceApiModule
          .detectAllFaces(
            videoRef.current,
            new faceApiModule.TinyFaceDetectorOptions()
          )
          .withFaceLandmarks();

        const now = Date.now();

        if (detections.length > 0) {
          // console.log(`[얼굴감지] 얼굴 ${detections.length}개 감지됨`);
          
          // 얼굴이 감지됨 (ref 사용으로 동기적 체크)
          if (!isDetectingRef.current) {
            console.log('[얼굴감지] ✅ 감지 시작! 프로그레스 시작');
            isDetectingRef.current = true;
            setIsDetecting(true);
            lastDetectionTimeRef.current = now;
            hasCalledCallbackRef.current = false; // 리셋
          }

          // 경과 시간 계산 및 프로그레스 업데이트
          const elapsed = now - lastDetectionTimeRef.current;
          const progress = Math.min((elapsed / 1000) * 100, 100);
          setDetectionProgress(progress);
          
          // 1초 완료 (100%) 시 콜백 호출
          if (progress >= 100 && !hasCalledCallbackRef.current) {
            console.log('[얼굴감지] 🎉 인식 완료 (100%)! 주문 시작');
            console.log('[얼굴감지] ⚠️ 주의: TTS 권한이 없으면 소리가 안 나올 수 있습니다.');
            console.log('[얼굴감지] 💡 해결: 화면을 먼저 클릭해주세요!');
            hasCalledCallbackRef.current = true; // 중복 호출 방지
            
            if (onCustomerDetectedRef.current) {
              onCustomerDetectedRef.current();
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
    }
  }, [enabled]);

  return {
    videoRef,
    isLoaded,
    isDetecting,
    detectionProgress, // 0-100
  };
}

export default useCustomerDetection;

