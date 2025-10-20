/**
 * Google Cloud Text-to-Speech API 서비스
 * 
 * API 키: AIzaSyBu8c1n7936DgOk0LiVZeeAOMNyRAAN7Y4
 * 문서: https://cloud.google.com/text-to-speech/docs/reference/rest
 */

const GOOGLE_API_KEY = '';
const TTS_API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

/**
 * Google Cloud TTS로 음성 합성
 * 
 * @param {string} text - 읽을 텍스트
 * @param {Object} options - 옵션
 * @param {string} options.language - 언어 ('ko' | 'en')
 * @param {string} options.gender - 목소리 성별 ('male' | 'female')
 * @param {number} options.rate - 속도 (0.25 ~ 4.0, 기본 1.0)
 * @param {number} options.pitch - 음높이 (-20.0 ~ 20.0, 기본 0)
 * @returns {Promise<AudioBuffer>}
 */
export async function synthesizeSpeech(text, options = {}) {
  const {
    language = 'ko',
    gender = 'female',
    rate = 1.0,
    pitch = 0,
  } = options;

  console.log('[Google TTS] 🔊 음성 합성 시작:', text);
  console.log('[Google TTS] 옵션:', { language, gender, rate, pitch });

  // 언어 코드 변환
  const languageCode = language === 'en' ? 'en-US' : 'ko-KR';
  
  // 목소리 선택 (성별 기반)
  let voiceName;
  if (language === 'ko') {
    // 한국어 목소리
    if (gender === 'female') {
      voiceName = 'ko-KR-Standard-A'; // 여성 목소리
    } else {
      voiceName = 'ko-KR-Standard-C'; // 남성 목소리
    }
  } else {
    // 영어 목소리
    if (gender === 'female') {
      voiceName = 'en-US-Standard-C'; // 여성 목소리
    } else {
      voiceName = 'en-US-Standard-B'; // 남성 목소리
    }
  }

  console.log('[Google TTS] 선택된 목소리:', voiceName);

  // API 요청 본문
  const requestBody = {
    input: {
      text: text,
    },
    voice: {
      languageCode: languageCode,
      name: voiceName,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: rate,
      pitch: pitch,
    },
  };

  try {
    console.log('[Google TTS] API 요청 중...');
    const response = await fetch(`${TTS_API_URL}?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Google TTS] ❌ API 에러:', errorData);
      throw new Error(`Google TTS API 에러: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('[Google TTS] ✅ API 응답 받음');

    // base64 오디오 데이터 디코딩
    const audioContent = data.audioContent;
    if (!audioContent) {
      throw new Error('audioContent가 없습니다');
    }

    // base64 → ArrayBuffer 변환
    const binaryString = atob(audioContent);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log('[Google TTS] ✅ 오디오 데이터 변환 완료 (크기:', bytes.length, 'bytes)');

    return bytes.buffer;
  } catch (error) {
    console.error('[Google TTS] ❌ 에러 발생:', error);
    throw error;
  }
}

/**
 * Google Cloud TTS로 음성 재생
 * 
 * @param {string} text - 읽을 텍스트
 * @param {Object} options - 옵션
 * @param {Function} onStart - 재생 시작 콜백
 * @param {Function} onEnd - 재생 종료 콜백
 * @param {Function} onError - 에러 콜백
 * @returns {Promise<HTMLAudioElement>}
 */
export async function speakWithGoogleTTS(text, options = {}) {
  console.log('[Google TTS] 🔊 speakWithGoogleTTS 호출');
  
  const {
    onStart,
    onEnd,
    onError,
    ...synthesisOptions
  } = options;

  try {
    // 음성 합성
    const audioBuffer = await synthesizeSpeech(text, synthesisOptions);
    
    // Blob 생성
    const blob = new Blob([audioBuffer], { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(blob);
    
    console.log('[Google TTS] 오디오 URL 생성:', audioUrl);
    
    // Audio 엘리먼트 생성 및 재생
    const audio = new Audio(audioUrl);
    
    audio.onplay = () => {
      console.log('[Google TTS] ▶️ 재생 시작');
      if (onStart) onStart();
    };
    
    audio.onended = () => {
      console.log('[Google TTS] ✅ 재생 완료');
      URL.revokeObjectURL(audioUrl); // 메모리 정리
      if (onEnd) onEnd();
    };
    
    audio.onerror = (error) => {
      console.error('[Google TTS] ❌ 재생 에러:', error);
      URL.revokeObjectURL(audioUrl);
      if (onError) onError(error);
    };
    
    await audio.play();
    console.log('[Google TTS] ✅ play() 호출 완료');
    
    return audio;
  } catch (error) {
    console.error('[Google TTS] ❌ speakWithGoogleTTS 에러:', error);
    if (onError) onError(error);
    throw error;
  }
}

export default {
  synthesizeSpeech,
  speakWithGoogleTTS,
};


