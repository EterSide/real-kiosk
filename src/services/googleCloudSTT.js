/**
 * Google Cloud Speech-to-Text API 서비스
 * 
 * API 키: AIzaSyBu8c1n7936DgOk0LiVZeeAOMNyRAAN7Y4
 * 문서: https://cloud.google.com/speech-to-text/docs/reference/rest
 */

const GOOGLE_API_KEY = '';
const STT_API_URL = 'https://speech.googleapis.com/v1/speech:recognize';

/**
 * 오디오 blob을 base64로 인코딩
 * 
 * @param {Blob} blob - 오디오 blob
 * @returns {Promise<string>} base64 문자열
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Google Cloud STT로 음성 인식
 * 
 * @param {Blob} audioBlob - 오디오 blob (webm, wav 등)
 * @param {string} language - 언어 ('ko' | 'en')
 * @returns {Promise<string>} 인식된 텍스트
 */
export async function recognizeSpeech(audioBlob, language = 'ko') {
  console.log('[Google STT] 🎤 음성 인식 시작');
  console.log('[Google STT] 오디오 크기:', audioBlob.size, 'bytes');
  console.log('[Google STT] 언어:', language);

  try {
    // base64 인코딩
    const base64Audio = await blobToBase64(audioBlob);
    console.log('[Google STT] base64 인코딩 완료 (길이:', base64Audio.length, ')');

    // 언어 코드 변환
    const languageCode = language === 'en' ? 'en-US' : 'ko-KR';

    // API 요청 본문
    const requestBody = {
      config: {
        encoding: 'WEBM_OPUS', // Chrome의 MediaRecorder 기본 포맷
        // sampleRateHertz: 48000, // WEBM_OPUS는 자동 감지
        languageCode: languageCode,
        enableAutomaticPunctuation: true, // 자동 구두점
        model: 'default', // 또는 'command_and_search' (짧은 음성)
      },
      audio: {
        content: base64Audio,
      },
    };

    console.log('[Google STT] API 요청 중...');
    const response = await fetch(`${STT_API_URL}?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Google STT] ❌ API 에러:', errorData);
      throw new Error(`Google STT API 에러: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('[Google STT] ✅ API 응답:', data);

    // 결과 추출
    if (!data.results || data.results.length === 0) {
      console.warn('[Google STT] ⚠️ 인식 결과 없음');
      return '';
    }

    const transcript = data.results
      .map(result => result.alternatives[0].transcript)
      .join(' ')
      .trim();

    console.log('[Google STT] ✅ 인식 결과:', transcript);
    return transcript;
  } catch (error) {
    console.error('[Google STT] ❌ 에러 발생:', error);
    throw error;
  }
}

/**
 * MediaRecorder로 오디오 녹음 및 Google STT 인식
 * 
 * @param {MediaStream} stream - 마이크 스트림
 * @param {Object} options - 옵션
 * @param {string} options.language - 언어 ('ko' | 'en')
 * @param {number} options.recordDuration - 녹음 간격 (ms, 기본 5000)
 * @param {Function} options.onResult - 인식 결과 콜백
 * @param {Function} options.onError - 에러 콜백
 * @returns {Object} { start, stop } 제어 객체
 */
export function createGoogleSTTRecorder(stream, options = {}) {
  const {
    language = 'ko',
    recordDuration = 5000, // 5초마다 자동 전송
    onResult,
    onError,
  } = options;

  console.log('[Google STT Recorder] 생성');
  console.log('[Google STT Recorder] 녹음 간격:', recordDuration, 'ms');

  let mediaRecorder = null;
  let audioChunks = [];
  let autoStopTimer = null; // 자동 중지 타이머

  // MediaRecorder 설정
  try {
    // Chrome에서 지원하는 포맷 사용
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    console.log('[Google STT Recorder] MIME 타입:', mimeType);

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: mimeType,
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
        console.log('[Google STT Recorder] 데이터 수신:', event.data.size, 'bytes');
      }
    };

    mediaRecorder.onstop = async () => {
      console.log('[Google STT Recorder] 녹음 중지, 총 청크:', audioChunks.length);

      if (audioChunks.length === 0) {
        console.warn('[Google STT Recorder] ⚠️ 녹음된 데이터 없음');
        return;
      }

      // Blob 생성
      const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
      console.log('[Google STT Recorder] Blob 생성 완료 (크기:', audioBlob.size, 'bytes)');

      // Google STT로 인식
      try {
        const transcript = await recognizeSpeech(audioBlob, language);
        if (transcript && onResult) {
          onResult(transcript);
        }
      } catch (error) {
        console.error('[Google STT Recorder] 인식 에러:', error);
        if (onError) {
          onError(error);
        }
      }

      // 청크 초기화
      audioChunks = [];
    };

    mediaRecorder.onerror = (error) => {
      console.error('[Google STT Recorder] MediaRecorder 에러:', error);
      if (onError) {
        onError(error);
      }
    };
  } catch (error) {
    console.error('[Google STT Recorder] 생성 실패:', error);
    throw error;
  }

  return {
    start: () => {
      if (mediaRecorder && mediaRecorder.state === 'inactive') {
        console.log('[Google STT Recorder] ▶️ 녹음 시작 (', recordDuration, 'ms 후 자동 전송)');
        audioChunks = [];
        mediaRecorder.start();
        
        // 🎯 자동 중지 타이머 설정
        if (autoStopTimer) {
          clearTimeout(autoStopTimer);
        }
        autoStopTimer = setTimeout(() => {
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            console.log('[Google STT Recorder] ⏰ 시간 종료, 자동 중지');
            mediaRecorder.stop();
          }
        }, recordDuration);
      }
    },
    stop: () => {
      // 타이머 정리
      if (autoStopTimer) {
        clearTimeout(autoStopTimer);
        autoStopTimer = null;
      }
      
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        console.log('[Google STT Recorder] ⏹️ 녹음 중지');
        mediaRecorder.stop();
      }
    },
    getState: () => mediaRecorder?.state || 'inactive',
  };
}

export default {
  recognizeSpeech,
  createGoogleSTTRecorder,
};

