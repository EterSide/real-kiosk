# Age/Gender Detection 모델 다운로드 안내

나이와 성별 감지를 위해서는 추가 모델 파일이 필요합니다.

## ⚠️ 중요: 현재 모델 파일 누락

아래 방법 중 하나로 모델을 다운로드해주세요!

## 방법 1: NPM 패키지 설치 (가장 쉬움! 👍 권장)

```bash
npm install @vladmandic/face-api
```

설치 후, 다음 명령으로 모델 파일 복사:

```powershell
cd d:\krap\projects\real-kiosk\public\models
Copy-Item "..\..\node_modules\@vladmandic\face-api\model\age-gender-model*" -Destination . -Force
```

## 방법 2: 직접 다운로드 (권장)

1. 브라우저에서 접속: https://github.com/vladmandic/face-api/tree/master/model
2. 다음 파일들을 다운로드:
   - `age-gender-model-shard1` (약 6.2MB)
   - `age-gender-model-weights_manifest.json` (약 600 bytes)
3. `d:\krap\projects\real-kiosk\public\models\` 폴더에 저장

## 방법 3: 직접 다운로드 링크 (jsdelivr CDN)

PowerShell에서 실행:

```powershell
cd d:\krap\projects\real-kiosk\public\models

# manifest 파일
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/age-gender-model-weights_manifest.json" -OutFile "age-gender-model-weights_manifest.json"

# shard 파일
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/age-gender-model-shard1" -OutFile "age-gender-model-shard1"
```

## ✅ 설치 확인

모델 파일이 제대로 설치되었는지 확인:

```
public/models/
  ├── age-gender-model-shard1                    ✅ 필수!
  ├── age-gender-model-weights_manifest.json      ✅ 필수!
  ├── face_landmark_68_model-shard1
  ├── face_landmark_68_model-weights_manifest.json
  ├── tiny_face_detector_model-shard1
  └── tiny_face_detector_model-weights_manifest.json
```

**파일명 주의:**
- `age-gender-model` (하이픈 `-` 사용)
- `age_gender_model` (언더스코어 `_` 사용) ❌ 잘못된 이름!

## 테스트

모델이 로드되면 브라우저 콘솔에 다음 메시지가 표시됩니다:

```
[얼굴감지] ✅ 모델 로드 완료! (얼굴 + 나이/성별)
[얼굴감지] 고객 정보: 25세 (20s), 남성 (신뢰도: 98%)
```

## 문제 해결

**404 에러가 발생하는 경우:**
- CDN 링크가 변경되었을 수 있습니다
- GitHub에서 직접 다운로드하세요 (방법 1)

**모델 로드 실패:**
- 파일명이 정확한지 확인하세요
- 파일 크기가 0이 아닌지 확인하세요
- 브라우저 캐시를 지우고 다시 시도하세요

