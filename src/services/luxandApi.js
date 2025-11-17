/**
 * Luxand.cloud API 서비스
 * 웹캠 이미지로 나이/성별 감지
 * https://luxand.cloud/
 */

// Luxand API 토큰 (하드코딩)
const LUXAND_API_TOKEN = "";

/**
 * 비디오 엘리먼트에서 이미지 캡처
 * @param {HTMLVideoElement} videoElement 
 * @returns {string} base64 이미지
 */
export function captureImageFromVideo(videoElement) {
  if (!videoElement) {
    throw new Error('Video element not found');
  }

  console.log('[Luxand] 비디오 크기:', videoElement.videoWidth, 'x', videoElement.videoHeight);
  console.log('[Luxand] 비디오 상태:', videoElement.readyState);

  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth || 640;
  canvas.height = videoElement.videoHeight || 480;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  
  // base64 이미지로 변환
  const base64 = canvas.toDataURL('image/jpeg', 0.9);
  console.log('[Luxand] base64 길이:', base64.length);
  console.log('[Luxand] base64 시작 부분:', base64.substring(0, 50));
  
  return base64;
}

/**
 * Luxand API로 얼굴 감지 및 나이/성별 분석
 * @param {string} base64Image - base64 인코딩된 이미지
 * @returns {Promise<Object>} 고객 정보 { age, gender, confidence }
 */
export async function detectFaceWithLuxand(base64Image) {
  if (!LUXAND_API_TOKEN) {
    console.warn('[Luxand] API 키가 없습니다. 데모 모드로 실행합니다.');
    // 데모 모드: 랜덤 값 반환 (테스트용)
    return {
      age: Math.floor(Math.random() * 40) + 20, // 20-60세
      gender: Math.random() > 0.5 ? 'male' : 'female',
      confidence: Math.floor(Math.random() * 20) + 80, // 80-100%
      isDemo: true,
    };
  }

  try {
    // base64에서 data:image/jpeg;base64, 부분 제거
    const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');
    
    console.log('[Luxand] 이미지 데이터 길이:', imageData.length);
    console.log('[Luxand] 이미지 데이터 시작:', imageData.substring(0, 50));
    
    // 👇 방법 1: base64를 Blob으로 변환하여 FormData로 전송
    const byteCharacters = atob(imageData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });
    
    console.log('[Luxand] Blob 생성:', blob.size, 'bytes');
    
    const formData = new FormData();
    formData.append('photo', blob, 'snapshot.jpg');
    
    console.log('[Luxand] API 요청 시작 (FormData)...');
    
    const response = await fetch('https://api.luxand.cloud/photo/detect', {
      method: 'POST',
      headers: {
        'token': LUXAND_API_TOKEN,
        // Content-Type은 자동으로 설정됨 (multipart/form-data)
      },
      body: formData,
    });

    console.log('[Luxand] 응답 상태:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Luxand] 에러 응답:', errorText);
      throw new Error(`Luxand API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[Luxand] ✅ API 응답:', data);

    // 첫 번째 얼굴 정보 추출
    if (data && data.length > 0) {
      const face = data[0];
      
      // gender.value는 "Male" 또는 "Female"
      const genderValue = face.gender?.value?.toLowerCase() || 'male';
      const genderProb = face.gender?.probability || 0.5;
      
      return {
        age: Math.round(face.age || 25),
        gender: genderValue === 'male' ? 'male' : 'female',
        confidence: Math.round(genderProb * 100),
        isDemo: false,
        raw: face, // 원본 데이터 보관
      };
    }

    throw new Error('No face detected');
  } catch (error) {
    console.error('[Luxand] API 오류:', error);
    throw error;
  }
}

/**
 * 웹캠 비디오에서 직접 얼굴 감지
 * @param {HTMLVideoElement} videoElement 
 * @returns {Promise<Object>} 고객 정보
 */
export async function detectCustomerFromVideo(videoElement) {
  console.log('[Luxand] 웹캠에서 이미지 캡처 중...');
  
  const base64Image = captureImageFromVideo(videoElement);
  
  console.log('[Luxand] 이미지 캡처 완료, API 전송 중...');
  
  const result = await detectFaceWithLuxand(base64Image);
  
  // 나이대 계산
  let ageGroup;
  const age = result.age;
  if (age < 13) ageGroup = 'child';
  else if (age < 20) ageGroup = 'teen';
  else if (age < 30) ageGroup = '20s';
  else if (age < 40) ageGroup = '30s';
  else if (age < 50) ageGroup = '40s';
  else ageGroup = '50s+';
  
  return {
    age: result.age,
    ageGroup,
    gender: result.gender,
    genderProbability: result.confidence,
    isDemo: result.isDemo,
  };
}

