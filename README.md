# 🍔 버거킹 음성 주문 키오스크

음성 인식 기반의 무인 주문 키오스크 시스템입니다. 고객 감지, 음성 주문, 옵션 선택, 결제까지 전 과정을 자동화합니다.

---

## 📋 목차

- [프로젝트 개요](#프로젝트-개요)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [설치 및 실행](#설치-및-실행)
- [시스템 아키텍처](#시스템-아키텍처)
- [상태 머신](#상태-머신)
- [API 명세](#api-명세)
- [주요 컴포넌트](#주요-컴포넌트)
- [트러블슈팅](#트러블슈팅)

---

## 🎯 프로젝트 개요

### 목적
- 비대면 주문을 통한 고객 편의성 향상
- 음성 인식을 활용한 직관적인 UX 제공
- 자동화를 통한 인건비 절감

### 주요 특징
- **얼굴 인식 기반 고객 감지**: 웹캠으로 고객 접근 자동 감지
- **연속 음성 인식**: Web Speech API를 활용한 실시간 음성 명령 처리
- **TTS 안내**: 주문 과정을 음성으로 안내
- **단계별 옵션 선택**: 세트 메뉴의 사이드/음료를 순차적으로 선택
- **실시간 장바구니**: 주문 내역을 시각적으로 확인

---

## ✨ 주요 기능

### 1. 고객 감지 (Face Detection)
- **face-api.js** 라이브러리 사용
- 웹캠으로 고객 접근 감지 시 자동으로 주문 시작
- HMR 최적화로 메모리 누수 방지

### 2. 음성 주문 (Voice Ordering)
- **Web Speech API (SpeechRecognition)** 활용
- 연속 음성 인식으로 자연스러운 대화
- 한글 초성 매칭 및 유사도 검색으로 정확한 메뉴 찾기
- 추가 주문 시 메뉴 이름 직접 인식

**지원 명령어:**
- 메뉴 이름: "와퍼 주세요", "불고기 세트"
- 세트/단품: "와퍼 세트", "와퍼 단품"
- 추가 주문: "추가", "더", "그리고", "네"
- 주문 종료: "없어요", "끝", "결제"

### 3. TTS 안내 (Text-to-Speech)
- **Web Speech API (SpeechSynthesis)** 활용
- 각 단계별 음성 안내
- 중복 재생 방지 로직

**주요 안내 메시지:**
- "어서오세요 고객님, 주문을 시작하겠습니다."
- "무엇을 도와드릴까요?"
- "{상품명}을(를) 선택하셨습니다."
- "추가 주문 있으세요?"

### 4. 옵션 선택 (Option Selection)
- **단계별 팝업 모달**: 사이드 → 음료 순차 선택
- 기본 옵션 자동 선택
- 추가 금액 실시간 계산
- 진행 상황 표시 (1/2, 2/2)

### 5. 장바구니 & 결제
- 우측 패널에 실시간 장바구니 표시
- 상품별 옵션 및 가격 표시
- 결제 버튼 클릭 시 주문번호 팝업
- 3초 후 자동 초기화

---

## 🛠 기술 스택

### Frontend
- **Next.js 15.5.4**: React 기반 풀스택 프레임워크
- **React 19.1.0**: UI 라이브러리
- **Zustand 5.0.3**: 경량 전역 상태 관리
- **Tailwind CSS 4**: 유틸리티 기반 스타일링
- **Axios 1.7.9**: HTTP 클라이언트

### 라이브러리
- **face-api.js 0.22.2**: 얼굴 인식
- **hangul-js 0.2.6**: 한글 초성 분해/조합
- **Web Speech API**: 브라우저 내장 음성 인식/합성

### Backend (연동)
- **Spring Boot**: REST API 서버 (포트: 8090)
- **MySQL/PostgreSQL**: 상품/주문 데이터 저장

---

## 📁 프로젝트 구조

```
real-kiosk/
├── public/
│   ├── models/              # face-api.js 가중치 파일
│   │   ├── tiny_face_detector_model-weights_manifest.json
│   │   └── tiny_face_detector_model-shard1
│   └── ...
│
├── src/
│   ├── app/
│   │   ├── page.js          # 메인 페이지 (상태 관리 & 훅 통합)
│   │   ├── layout.js        # 레이아웃
│   │   └── globals.css      # 글로벌 스타일
│   │
│   ├── components/
│   │   ├── IdleScreen.jsx           # 대기 화면 (웹캠)
│   │   ├── OrderScreen.jsx          # 주문 화면 (메인)
│   │   ├── MenuBoard.jsx            # 메뉴판
│   │   ├── ProductCard.jsx          # 상품 카드
│   │   ├── SingleOptionModal.jsx    # 단일 옵션 선택 팝업
│   │   ├── CartPanel.jsx            # 장바구니 패널
│   │   ├── OrderCompleteModal.jsx   # 주문 완료 팝업
│   │   ├── DebugPanel.jsx           # 디버그 패널
│   │   └── TTSTestButton.jsx        # TTS 테스트 버튼
│   │
│   ├── hooks/
│   │   ├── useCustomerDetection.js  # 고객 감지 훅
│   │   ├── useSpeechRecognition.js  # 음성 인식 훅
│   │   └── useTextToSpeech.js       # TTS 훅
│   │
│   ├── services/
│   │   ├── api.js                   # 백엔드 API 통신
│   │   └── menuMatcher.js           # 메뉴 매칭 로직
│   │
│   ├── store/
│   │   └── kioskStore.js            # Zustand 전역 상태 관리
│   │
│   └── lib/
│       └── stateMachine.js          # 상태 머신 정의
│
├── package.json
├── next.config.mjs
├── tailwind.config.mjs
└── README.md
```

---

## 🚀 설치 및 실행

### 1. 사전 요구사항
- **Node.js 18+**
- **npm** 또는 **yarn**
- **웹캠** (고객 감지용)
- **마이크** (음성 인식용)
- **백엔드 서버** (Spring Boot, 포트 8090)

### 2. 설치
```bash
# 저장소 클론
git clone <repository-url>
cd real-kiosk

# 의존성 설치
npm install
```

### 3. 환경 변수 설정
`.env.local` 파일 생성:
```env
NEXT_PUBLIC_API_URL=http://localhost:8090
```

### 4. face-api.js 모델 다운로드
`public/models/` 디렉토리에 다음 파일을 배치:
- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`

[face-api.js 모델 다운로드](https://github.com/justadudewhohacks/face-api.js/tree/master/weights)

### 5. 실행
```bash
# 개발 서버 시작
npm run dev

# 브라우저에서 열기
# http://localhost:3000
```

### 6. 백엔드 서버 실행
```bash
# Spring Boot 애플리케이션 실행 (포트 8090)
cd <backend-directory>
./mvnw spring-boot:run
```

---

## 🏗 시스템 아키텍처

### 전체 구조
```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  웹캠 감지   │  │  음성 인식   │  │  TTS 음성 출력 │ │
│  │ face-api.js │  │ Web Speech  │  │  Web Speech    │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │            상태 머신 (State Machine)              │   │
│  │  IDLE → GREETING → LISTENING → PROCESSING ...    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │          전역 상태 관리 (Zustand Store)          │   │
│  │  currentState, cart, products, categories ...    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘
                            │
                            │ HTTP REST API
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Backend (Spring Boot)                  │
├─────────────────────────────────────────────────────────┤
│  • GET  /api/categories          (카테고리 목록)        │
│  • GET  /api/products/available  (판매 가능 상품)       │
│  • POST /api/orders              (주문 생성)            │
│  • POST /api/payments            (결제 처리)            │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
                      ┌────────────┐
                      │  Database  │
                      └────────────┘
```

### 데이터 흐름
```
고객 접근
  ↓
얼굴 감지 (face-api.js)
  ↓
onCustomerDetected() → GREETING 상태
  ↓
TTS: "어서오세요 고객님..."
  ↓
TTS 완료 → LISTENING 상태
  ↓
음성 인식 시작
  ↓
"와퍼 세트 주세요" 인식
  ↓
메뉴 매칭 (menuMatcher.js)
  ↓
PRODUCT_SELECTED 상태
  ↓
옵션 체크 → ASK_OPTIONS 상태
  ↓
[팝업 1/2] 사이드 선택
  ↓
[팝업 2/2] 음료 선택
  ↓
장바구니 추가 → ASK_MORE 상태
  ↓
"추가 주문 있으세요?"
  ↓
"네" 또는 메뉴 이름 → LISTENING
"아니요" → CONFIRM 상태
  ↓
"결제하기" 버튼 클릭
  ↓
주문번호 팝업 표시
  ↓
3초 후 IDLE 상태로 초기화
```

---

## 🎰 상태 머신

### 상태 정의 (KioskState)

| 상태 | 설명 | 음성 인식 | 다음 상태 |
|------|------|-----------|-----------|
| **IDLE** | 대기 중 | ❌ | GREETING |
| **GREETING** | 환영 인사 | ❌ | LISTENING |
| **LISTENING** | 음성 대기 | ✅ | PROCESSING |
| **PROCESSING** | 메뉴 처리 중 | ✅ | PRODUCT_SELECTED / ASK_DISAMBIGUATION |
| **PRODUCT_SELECTED** | 상품 선택됨 | ❌ | ASK_OPTIONS / ASK_MORE |
| **ASK_DISAMBIGUATION** | 후보 중 선택 | ✅ | PRODUCT_SELECTED |
| **ASK_OPTIONS** | 옵션 선택 | ❌ (팝업 사용) | ASK_OPTIONS / ASK_MORE |
| **ASK_MORE** | 추가 주문 여부 | ✅ | LISTENING / CONFIRM |
| **CONFIRM** | 주문 확인 | ✅ | PAYMENT / LISTENING |
| **PAYMENT** | 결제 진행 | ❌ | COMPLETE / ERROR |
| **COMPLETE** | 주문 완료 | ❌ | IDLE |
| **ERROR** | 오류 발생 | ❌ | LISTENING |

### 상태 전환 액션

```javascript
// 주요 액션
CUSTOMER_DETECTED    // 고객 감지
TTS_COMPLETED        // TTS 완료
SPEECH_RECEIVED      // 음성 입력 수신
MENU_MATCHED         // 메뉴 매칭 완료
PRODUCT_CLARIFIED    // 후보 중 선택
OPTION_SELECTED      // 옵션 선택
CHECK_OPTIONS        // 옵션 체크
MORE_ORDER           // 추가 주문 있음
NO_MORE_ORDER        // 추가 주문 없음
CONFIRMED            // 주문 확인
PAYMENT_COMPLETED    // 결제 완료
RESET                // 초기화
```

### 상태별 TTS 메시지

```javascript
GREETING:            "어서오세요 고객님, 주문을 시작하겠습니다."
LISTENING:           "무엇을 도와드릴까요?"
PRODUCT_SELECTED:    "{상품명}을(를) 선택하셨습니다."
ASK_DISAMBIGUATION:  "다음 중 어떤 메뉴를 원하시나요? 1번 와퍼, 2번 와퍼 세트..."
ASK_OPTIONS:         "화면에서 원하시는 옵션을 선택해 주세요."
ASK_MORE:            "추가 주문 있으세요?"
CONFIRM:             "주문 내역은 {메뉴}입니다. 총 {가격}원입니다. 주문하시겠습니까?"
PAYMENT:             "결제를 진행하겠습니다."
COMPLETE:            "결제가 완료되었습니다. 감사합니다!"
```

---

## 📡 API 명세

### 1. 카테고리 목록 조회
```http
GET /api/categories
```

**응답 예시:**
```json
[
  {
    "id": 1,
    "categoryName": "버거",
    "displayOrder": 1,
    "createdAt": "2024-01-01T00:00:00"
  }
]
```

**프론트엔드 변환:**
```json
{
  "id": 1,
  "name": "버거",  // categoryName → name
  "displayOrder": 1
}
```

### 2. 판매 가능 상품 조회
```http
GET /api/products/available
```

**응답 예시:**
```json
[
  {
    "id": 1,
    "productName": "와퍼 세트",
    "description": "와퍼 + 사이드 + 음료",
    "price": 8900,
    "isAvailable": true,
    "categories": [
      { "id": 1, "categoryName": "버거" }
    ],
    "optionGroups": [
      {
        "id": 1,
        "groupName": "사이드 선택",
        "isRequired": true,
        "maxSelection": 1,
        "options": [
          {
            "id": 11,
            "optionName": "프렌치프라이(R)",
            "additionalPrice": 0
          },
          {
            "id": 12,
            "optionName": "프렌치프라이(L)",
            "additionalPrice": 500
          }
        ]
      },
      {
        "id": 2,
        "groupName": "음료 선택",
        "isRequired": true,
        "options": [...]
      }
    ]
  }
]
```

**프론트엔드 변환:**
```json
{
  "id": 1,
  "name": "와퍼 세트",  // productName → name
  "price": 8900,
  "type": "SET",  // optionGroups 있으면 SET, 없으면 SINGLE
  "categoryId": 1,
  "categoryName": "버거",
  "optionGroups": [
    {
      "id": 1,
      "name": "사이드 선택",  // groupName → name
      "required": true,       // isRequired → required
      "options": [
        {
          "id": 11,
          "name": "프렌치프라이(R)",  // optionName → name
          "price": 0,                  // additionalPrice → price
          "isDefault": true            // 첫 번째 & 추가금 0원
        }
      ],
      "defaultOption": { ... }  // 기본 옵션 객체
    }
  ]
}
```

### 3. 주문 생성
```http
POST /api/orders
Content-Type: application/json
```

**요청 예시:**
```json
{
  "orderItems": [
    {
      "productId": 1,
      "quantity": 1,
      "selectedOptions": [11, 21]
    }
  ],
  "totalAmount": 9400,
  "orderType": "KIOSK"
}
```

**응답 예시:**
```json
{
  "orderId": 123,
  "orderNumber": "202410",
  "status": "PENDING",
  "createdAt": "2024-10-07T12:34:56"
}
```

### 4. 결제 처리
```http
POST /api/payments
Content-Type: application/json
```

**요청 예시:**
```json
{
  "orderId": 123,
  "paymentMethod": "CARD",
  "amount": 9400
}
```

---

## 🧩 주요 컴포넌트

### 1. page.js (메인 페이지)
**역할:**
- 전역 상태 관리 (Zustand)
- 커스텀 훅 통합
- 음성 입력 처리 로직
- 상태별 분기 처리

**주요 함수:**
```javascript
handleSpeechResult(transcript)      // 음성 인식 결과 처리
handleProductSelect(item)           // 상품/옵션 선택
handleCheckout()                    // 결제 처리
activateTTS()                       // TTS 권한 활성화
```

### 2. kioskStore.js (전역 상태)
**관리 데이터:**
```javascript
{
  currentState,        // 현재 상태
  products,           // 전체 상품 목록
  categories,         // 카테고리 목록
  cart,               // 장바구니
  currentProduct,     // 현재 선택 상품
  candidates,         // 후보 상품
  pendingOptions,     // 미선택 옵션 그룹
  selectedOptions,    // 선택된 옵션
  lastMessage,        // 마지막 TTS 메시지
  lastInput          // 마지막 음성 입력
}
```

**주요 액션:**
```javascript
dispatch(action, payload)           // 상태 전환
onCustomerDetected()               // 고객 감지
onMenuMatched(candidates)          // 메뉴 매칭
onOptionSelected(option)           // 옵션 선택
addToCart()                        // 장바구니 추가
onMoreOrder(hasMore)               // 추가 주문 여부
onPaymentCompleted()               // 결제 완료
reset()                            // 초기화
```

### 3. menuMatcher.js (메뉴 매칭)
**주요 함수:**

#### `matchMenu(userInput, products)`
메뉴 이름 매칭
- 완전 일치 (100점)
- 초성 매칭 (50점)
- 유사도 (0-30점)
- 세트/단품 필터링 (30점)

#### `matchOption(userInput, options)`
옵션 매칭
- 숫자 선택 (1번, 2번)
- 텍스트 매칭

#### `detectConfirmation(userInput)`
긍정/부정 답변 감지
- 긍정: "네", "예", "응", "좋아", "맞아"
- 부정: "아니", "아뇨", "싫어", "취소"

#### `detectMoreOrder(userInput)`
추가 주문 의도 감지
- 추가: "추가", "더", "또", "그리고", "네"
- 종료: "없어", "끝", "결제", "아니요"

### 4. SingleOptionModal.jsx (옵션 팝업)
**특징:**
- 단일 옵션 그룹만 표시
- 진행 상황 표시 (1/2, 2/2)
- 기본 옵션 자동 선택
- 실시간 가격 계산

### 5. CartPanel.jsx (장바구니)
**특징:**
- 우측 고정 패널
- 상품별 옵션 표시
- 총 금액 계산
- 결제하기 버튼

---

## 🎤 음성 인식 & TTS

### 음성 인식 (useSpeechRecognition)

**설정:**
```javascript
{
  continuous: true,        // 연속 인식
  interimResults: true,    // 중간 결과 표시
  lang: 'ko-KR',          // 한국어
  maxAlternatives: 1       // 최상위 1개만
}
```

**특징:**
- 자동 재시작 (500ms 지연)
- `no-speech` 에러 시 자동 복구
- `enabledRef`로 동기적 상태 추적

**에러 처리:**
- `aborted`: 정상 중지
- `no-speech`: 자동 재시작
- `not-allowed`: 권한 거부 경고
- `audio-capture`: 마이크 문제

### TTS (useTextToSpeech)

**설정:**
```javascript
{
  lang: 'ko-KR',          // 한국어
  rate: 1.0,              // 속도
  pitch: 1.0,             // 음높이
  volume: 1.0             // 볼륨
}
```

**특징:**
- 한국어 음성 우선 선택
- 중복 재생 방지 (`lastPlayedMessageRef`)
- 브라우저 권한 활성화 (`activateTTS`)

---

## 🐛 트러블슈팅

### 1. TTS가 재생되지 않음
**원인:** 브라우저 보안 정책 (사용자 상호작용 필요)

**해결:**
1. 화면을 클릭하여 TTS 권한 활성화
2. 콘솔에서 `[TTS] not-allowed` 확인
3. 시스템 볼륨 확인

### 2. 음성 인식이 멈춤
**원인:** `isManuallyStoppedRef`가 true로 설정됨

**해결:**
1. 콘솔에서 `[음성인식] 재시작 안 함` 확인
2. `enabled` 상태 확인
3. 마이크 권한 확인

### 3. 팝업이 표시되지 않음
**원인:** `pendingOptions`가 업데이트되지 않음

**해결:**
1. 콘솔에서 `[dispatch] pendingOptions 업데이트` 확인
2. `transition` 함수가 `pendingOptions` 반환하는지 확인
3. `currentState === ASK_OPTIONS` 확인

### 4. 추가 주문 시 메뉴 선택 불가
**원인:** `onMoreOrder(true)` 호출 후 TTS 간섭

**해결:**
- `ASK_MORE` 상태에서 메뉴 이름 인식 시 바로 `onMenuMatched()` 호출
- `onMoreOrder(true)` 생략

### 5. 옵션 이름이 `undefined`
**원인:** 백엔드 필드명 불일치

**해결:**
- `transformOption()` 함수에서 `optionName → name` 변환
- `additionalPrice → price` 변환
- 안전성 체크 추가

### 6. 백엔드 연결 실패
**원인:** Spring Boot 서버 미실행

**해결:**
```bash
# 백엔드 서버 확인
curl http://localhost:8090/api/categories

# 실행되지 않으면 시작
cd <backend-directory>
./mvnw spring-boot:run
```

### 7. face-api.js 모델 로드 실패
**원인:** `public/models/` 디렉토리에 파일 없음

**해결:**
1. 모델 파일 다운로드
2. `public/models/` 위치 확인
3. 브라우저 콘솔에서 네트워크 에러 확인

---

## 📊 성능 최적화

### 1. React 최적화
- `useCallback`으로 함수 메모이제이션
- `useRef`로 불필요한 리렌더링 방지
- `useMemo` (필요 시)

### 2. 음성 인식 최적화
- 침묵 1초 후 자동 처리
- 중복 인식 방지
- 자동 재시작 딜레이 (500ms)

### 3. TTS 최적화
- 중복 재생 방지
- 음성 목록 캐싱
- 한국어 음성 우선 선택

### 4. face-api.js 최적화
- `TinyFaceDetector` 모델 사용 (경량)
- 전역 싱글톤 패턴
- HMR 시 재로드 방지

---

## 🔐 보안 고려사항

### 1. API 보안
- CORS 설정 필요
- API 키/토큰 사용 권장
- HTTPS 사용 (프로덕션)

### 2. 개인정보
- 웹캠 영상 저장 안 함
- 음성 데이터 로컬 처리
- 주문 정보만 백엔드 전송

### 3. 에러 처리
- 민감한 정보 로그 제외
- 사용자 친화적 에러 메시지
- 자동 복구 로직

---

## 📝 개발 가이드

### 새로운 메뉴 추가
1. 백엔드 DB에 상품 추가
2. 프론트엔드 자동 로드 (`getAvailableProducts()`)

### 새로운 상태 추가
1. `lib/stateMachine.js`에 상태 정의
2. `transition()` 함수에 전환 로직 추가
3. `kioskStore.js`에 액션 추가
4. `page.js`에서 처리 로직 구현

### 새로운 명령어 추가
1. `services/menuMatcher.js`에 키워드 추가
2. 감지 함수 수정/추가

### UI 커스터마이징
- `tailwind.config.mjs`에서 색상/폰트 변경
- 각 컴포넌트의 className 수정

---

## 🧪 테스트

### 수동 테스트 체크리스트
- [ ] 고객 감지 작동
- [ ] TTS 재생 정상
- [ ] 음성 인식 작동
- [ ] 메뉴 검색 정확도
- [ ] 옵션 선택 (사이드 → 음료)
- [ ] 장바구니 표시
- [ ] 추가 주문 반복
- [ ] 결제 처리
- [ ] 주문 완료 팝업
- [ ] 초기화 및 재시작

### 디버깅 팁
- 브라우저 콘솔 로그 확인
- 우측 하단 디버그 패널 활용
- TTS 테스트 버튼 사용
- 네트워크 탭에서 API 요청 확인

---

## 📞 문의 및 기여

### 문제 리포트
- 콘솔 로그 캡처
- 재현 단계 명시
- 브라우저/OS 정보 포함

### 기여 방법
1. Fork 프로젝트
2. Feature 브랜치 생성
3. 커밋 & 푸시
4. Pull Request 생성

---

## 📄 라이선스

이 프로젝트는 교육 및 데모 목적으로 제작되었습니다.

---

## 🙏 감사의 글

- **face-api.js**: 얼굴 인식 라이브러리
- **Web Speech API**: 브라우저 음성 기능
- **Next.js Team**: 강력한 React 프레임워크
- **Tailwind CSS**: 빠른 스타일링

---

**버전:** 1.0.0  
**최종 업데이트:** 2024-10-07  
**개발자:** Real Kiosk Team
