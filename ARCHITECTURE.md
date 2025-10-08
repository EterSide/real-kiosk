# 🏗 아키텍처 상세 문서

## 목차
- [시스템 개요](#시스템-개요)
- [상태 관리](#상태-관리)
- [데이터 흐름](#데이터-흐름)
- [컴포넌트 계층](#컴포넌트-계층)
- [상태 머신 상세](#상태-머신-상세)
- [API 통신](#api-통신)
- [음성 처리 파이프라인](#음성-처리-파이프라인)

---

## 시스템 개요

### 레이어 구조
```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (React Components + Hooks)             │
├─────────────────────────────────────────┤
│         Application Layer               │
│  (State Machine + Business Logic)       │
├─────────────────────────────────────────┤
│         Data Layer                      │
│  (Zustand Store + API Service)          │
├─────────────────────────────────────────┤
│         External Services               │
│  (Backend API + Browser APIs)           │
└─────────────────────────────────────────┘
```

---

## 상태 관리

### Zustand Store 구조
```javascript
{
  // 상태 머신
  currentState: KioskState,
  
  // 상품 데이터
  products: Product[],
  categories: Category[],
  
  // 주문 데이터
  cart: CartItem[],
  currentProduct: Product | null,
  selectedOptions: Option[],
  pendingOptions: OptionGroup[],
  
  // UI 상태
  candidates: MenuCandidate[],
  lastMessage: string,
  lastInput: string,
  error: string | null,
  
  // 액션
  dispatch: (action, payload) => Result,
  onCustomerDetected: () => void,
  onMenuMatched: (candidates) => void,
  onOptionSelected: (option) => void,
  addToCart: () => void,
  onMoreOrder: (hasMore) => void,
  onPaymentCompleted: () => void,
  reset: () => void,
  ...
}
```

### 상태 전환 프로세스
```javascript
// 1. 액션 디스패치
dispatch(action, payload)

// 2. 상태 머신에서 전환 계산
result = transition(currentState, action, payload)

// 3. 결과에서 새 상태 추출
{
  newState,           // 다음 상태
  message,            // TTS 메시지
  pendingOptions,     // 업데이트된 옵션
  selectedProduct,    // 선택된 상품
  candidates         // 후보 목록
}

// 4. 스토어 업데이트
set({ ...updates })
```

---

## 데이터 흐름

### 주문 생성 흐름
```
사용자 음성 입력
  ↓
SpeechRecognition.onresult
  ↓
handleSpeechResult(transcript)
  ↓
matchMenu(transcript, products)
  ↓
onMenuMatched(candidates)
  ↓
dispatch('MENU_MATCHED', { candidates })
  ↓
transition() → PRODUCT_SELECTED
  ↓
CHECK_OPTIONS 액션
  ↓
dispatch('CHECK_OPTIONS', { product })
  ↓
transition() → ASK_OPTIONS
  ↓
pendingOptions = [...optionGroups]
  ↓
SingleOptionModal 렌더링
  ↓
사용자 옵션 선택
  ↓
onOptionSelected(option)
  ↓
selectedOptions.push(option)
pendingOptions.shift()
  ↓
모든 옵션 선택 완료?
  ├─ Yes → addToCart()
  └─ No → 다음 옵션 그룹 표시
  ↓
cart.push(cartItem)
  ↓
dispatch('OPTION_SELECTED', { remainingOptions: [] })
  ↓
transition() → ASK_MORE
```

### 백엔드 데이터 변환 흐름
```
Backend Response (Spring Boot)
{
  productName: "와퍼 세트",
  categories: [{ id: 1, categoryName: "버거" }],
  optionGroups: [{
    groupName: "사이드 선택",
    isRequired: true,
    options: [{
      optionName: "프렌치프라이",
      additionalPrice: 0
    }]
  }]
}
  ↓
transformProduct(product)
  ↓
Frontend Format
{
  name: "와퍼 세트",           // productName → name
  categoryId: 1,               // categories[0].id
  categoryName: "버거",        // categories[0].categoryName
  type: "SET",                 // optionGroups.length > 0
  optionGroups: [{
    name: "사이드 선택",       // groupName → name
    required: true,             // isRequired → required
    options: [{
      name: "프렌치프라이",    // optionName → name
      price: 0,                 // additionalPrice → price
      isDefault: true          // 첫 번째 & price === 0
    }],
    defaultOption: { ... }     // 기본 옵션 참조
  }]
}
```

---

## 컴포넌트 계층

```
App (page.js)
├─ IdleScreen
│  └─ video (웹캠)
│
├─ OrderScreen
│  ├─ 캐릭터 & 상태 영역 (상단 30%)
│  │  ├─ TTS 메시지 표시
│  │  ├─ 음성 인식 상태
│  │  └─ 중간 인식 결과
│  │
│  ├─ MenuBoard (하단 70%)
│  │  ├─ 카테고리 탭
│  │  └─ ProductCard[] (그리드)
│  │
│  └─ CartPanel (우측 30%, 전체 높이)
│     ├─ 장바구니 아이템 목록
│     ├─ 총액
│     └─ 결제하기 버튼
│
├─ SingleOptionModal (조건부)
│  ├─ 헤더 (진행 상황)
│  ├─ 옵션 그리드
│  └─ 확인 버튼
│
├─ OrderCompleteModal (조건부)
│  ├─ 주문번호
│  └─ 자동 닫기 (3초)
│
├─ DebugPanel
│  └─ 실시간 상태 정보
│
└─ TTSTestButton
   └─ TTS 테스트
```

---

## 상태 머신 상세

### 상태별 처리 로직

#### IDLE → GREETING
```javascript
// Trigger: onCustomerDetected()
// Condition: currentState === IDLE
// Action:
dispatch('CUSTOMER_DETECTED')
→ newState: GREETING
→ message: "어서오세요 고객님, 주문을 시작하겠습니다."
```

#### GREETING → LISTENING
```javascript
// Trigger: onTTSCompleted()
// Condition: currentState === GREETING
// Action:
dispatch('TTS_COMPLETED')
→ newState: LISTENING
→ message: "무엇을 도와드릴까요?"
→ 음성 인식 시작 (shouldListen = true)
```

#### LISTENING → PROCESSING
```javascript
// Trigger: handleSpeechResult(transcript)
// Condition: currentState === LISTENING
// Action:
onSpeechReceived(transcript)
→ newState: PROCESSING
→ matchMenu(transcript, products)
```

#### PROCESSING → PRODUCT_SELECTED
```javascript
// Trigger: onMenuMatched([candidate])
// Condition: candidates.length === 1
// Action:
dispatch('MENU_MATCHED', { candidates })
→ newState: PRODUCT_SELECTED
→ selectedProduct: candidate.product
→ message: "{상품명}을(를) 선택하셨습니다."
→ CHECK_OPTIONS 액션 자동 실행
```

#### PRODUCT_SELECTED → ASK_OPTIONS
```javascript
// Trigger: dispatch('CHECK_OPTIONS')
// Condition: product.optionGroups.length > 0
// Action:
→ newState: ASK_OPTIONS
→ pendingOptions: [...product.optionGroups]
→ message: "화면에서 원하시는 옵션을 선택해 주세요."
→ SingleOptionModal 표시
```

#### ASK_OPTIONS → ASK_OPTIONS (반복)
```javascript
// Trigger: onOptionSelected(option)
// Condition: remainingOptions.length > 0
// Action:
selectedOptions.push(option)
pendingOptions.shift()
→ newState: ASK_OPTIONS (유지)
→ pendingOptions: [...remainingOptions]
→ message: "화면에서 원하시는 옵션을 선택해 주세요."
→ 다음 SingleOptionModal 표시
```

#### ASK_OPTIONS → ASK_MORE
```javascript
// Trigger: onOptionSelected(option) + 모든 옵션 완료
// Condition: remainingOptions.length === 0
// Action:
selectedOptions.push(option)
addToCart()
→ cart.push(cartItem)
→ currentProduct = null
→ selectedOptions = []
→ pendingOptions = []
→ newState: ASK_MORE
→ message: "추가 주문 있으세요?"
```

#### ASK_MORE → LISTENING (추가 주문)
```javascript
// Trigger: handleSpeechResult("네") or 메뉴 이름
// Condition: confirmation === 'yes' or matchMenu 성공
// Action:
// 방법 1: 명시적 "네"
onMoreOrder(true)
→ newState: LISTENING
→ message: "네, 말씀해 주세요."

// 방법 2: 메뉴 이름 직접
onMenuMatched(candidates)
→ newState: PRODUCT_SELECTED
→ message: "{상품명}을(를) 선택하셨습니다."
```

#### ASK_MORE → CONFIRM (주문 종료)
```javascript
// Trigger: handleSpeechResult("아니요")
// Condition: confirmation === 'no'
// Action:
onMoreOrder(false)
→ newState: CONFIRM
→ message: "주문 내역은 {메뉴}입니다. 총 {금액}원입니다."
```

#### CONFIRM → PAYMENT (결제)
```javascript
// Trigger: handleCheckout()
// Condition: cart.length > 0
// Action:
onPaymentCompleted()
→ newState: COMPLETE
→ OrderCompleteModal 표시
→ 3초 후 자동 닫기
```

#### COMPLETE → IDLE (초기화)
```javascript
// Trigger: handleCloseOrderComplete()
// Action:
reset()
→ currentState: IDLE
→ cart: []
→ currentProduct: null
→ selectedOptions: []
→ pendingOptions: []
→ lastMessage: ''
→ products, categories 유지
```

---

## API 통신

### 요청/응답 흐름

#### 초기 데이터 로드
```javascript
// Component Mount
useEffect(() => {
  loadData()
}, [])

// loadData()
const [productsData, categoriesData] = await Promise.all([
  getAvailableProducts(),
  getCategories()
])

// API Service
export async function getAvailableProducts() {
  const response = await apiClient.get('/api/products/available')
  return response.data.map(transformProduct)
}

export async function getCategories() {
  const response = await apiClient.get('/api/categories')
  return response.data.map(transformCategory)
}
```

#### 에러 처리 전략
```javascript
try {
  const data = await getAvailableProducts()
  setProducts(data)
} catch (error) {
  console.error('[API] 데이터 로드 실패:', error)
  
  // 폴백: 목업 데이터 사용
  const mockData = getMockProducts()
  setProducts(mockData)
  
  // 사용자 알림 (선택적)
  // alert('메뉴를 불러오는 중 문제가 발생했습니다.')
}
```

---

## 음성 처리 파이프라인

### 음성 인식 흐름
```
사용자 발화
  ↓
마이크 캡처 (audio-capture)
  ↓
SpeechRecognition 시작
  ↓
recognition.onresult
  ├─ interim results (중간 결과)
  │  → setInterimTranscript(interim)
  │  → 1초 침묵 타이머 시작
  │  → 타이머 완료 시 onResult(interim)
  │
  └─ final results (최종 결과)
     → setTranscript(final)
     → onResult(final)
     → 침묵 타이머 취소
  ↓
handleSpeechResult(transcript)
  ↓
상태별 처리 (LISTENING, ASK_MORE, CONFIRM 등)
  ↓
매칭/처리 로직 실행
```

### TTS 재생 흐름
```
상태 전환
  ↓
transition() → { message: "..." }
  ↓
dispatch() → lastMessage 업데이트
  ↓
useEffect([lastMessage])
  ├─ lastMessage !== lastPlayedMessageRef.current?
  │  ├─ Yes → speak(lastMessage)
  │  └─ No → 무시 (중복 방지)
  ↓
speak(text)
  ↓
new SpeechSynthesisUtterance(text)
  ├─ lang: 'ko-KR'
  ├─ voice: 한국어 음성 선택
  ├─ rate: 1.0
  ├─ pitch: 1.0
  └─ volume: 1.0
  ↓
utterance.onstart
  → setIsSpeaking(true)
  ↓
utterance.onend
  → setIsSpeaking(false)
  → onTTSCompleted() (콜백)
  ↓
상태 전환 (예: GREETING → LISTENING)
```

### 동기화 메커니즘
```javascript
// 문제: TTS 재생 중 음성 인식이 켜지면 간섭
// 해결: shouldListen 조건에서 특정 상태만 허용

const shouldListen = 
  currentState === KioskState.LISTENING ||
  currentState === KioskState.ASK_MORE ||
  currentState === KioskState.CONFIRM
  // ❌ GREETING은 제외 (TTS 재생 중)
  // ❌ ASK_OPTIONS는 제외 (팝업 사용)

// TTS 완료 후 상태 전환으로 자동 동기화
GREETING (TTS 재생 중, 음성 인식 OFF)
  ↓ TTS 완료
LISTENING (음성 인식 ON)
```

---

## 메뉴 매칭 알고리즘

### 매칭 점수 계산
```javascript
function matchMenu(userInput, products) {
  for (const product of products) {
    let score = 0
    
    // 1. 완전 일치 (100점)
    if (text.includes(productName) || productName.includes(text)) {
      score += 100
    }
    
    // 2. 초성 매칭 (50점)
    const productChosung = getChosung(product.name)  // "와퍼" → "ㅇㅍ"
    const inputChosung = getChosung(text)
    if (productChosung.includes(inputChosung)) {
      score += 50
    }
    
    // 3. 유사도 매칭 (0-30점)
    const similarity = calculateSimilarity(text, productName)
    score += similarity * 30
    
    // 4. 부분 단어 매칭 (20점)
    const words = text.split(/\s+/)
    for (const word of words) {
      if (word.length >= 2 && productName.includes(word)) {
        score += 20
      }
    }
    
    // 5. 세트/단품 필터링 (30점)
    if (keywords.isSet && product.type === 'SET') {
      score += 30
    }
  }
  
  // 점수 순 정렬
  candidates.sort((a, b) => b.score - a.score)
  return candidates.slice(0, 5)  // 상위 5개
}
```

### 키워드 추출
```javascript
function extractKeywords(text) {
  return {
    isSet: /세트|셋트/.test(text),
    isSingle: /단품|따로/.test(text),
    numbers: text.match(/\d+/g)?.map(Number) || []
  }
}
```

---

## 성능 고려사항

### 1. 리렌더링 최소화
```javascript
// ✅ Good: useCallback으로 함수 메모이제이션
const handleSpeechResult = useCallback((transcript) => {
  // ...
}, [currentState, products])

// ✅ Good: useRef로 동기적 상태 추적
const enabledRef = useRef(enabled)
useEffect(() => {
  enabledRef.current = enabled
}, [enabled])

// ❌ Bad: 매번 새 함수 생성
const handleSpeechResult = (transcript) => {
  // ...
}
```

### 2. 상태 업데이트 배치
```javascript
// ✅ Good: 한 번에 업데이트
set({
  currentState: newState,
  lastMessage: message,
  pendingOptions: options
})

// ❌ Bad: 여러 번 업데이트
set({ currentState: newState })
set({ lastMessage: message })
set({ pendingOptions: options })
```

### 3. 조건부 렌더링
```javascript
// ✅ Good: 조건을 먼저 체크
{shouldShow && <SingleOptionModal ... />}

// ❌ Bad: 항상 렌더링 후 display: none
<SingleOptionModal style={{ display: shouldShow ? 'block' : 'none' }} />
```

---

## 확장 가능성

### 새로운 기능 추가 가이드

#### 1. 새로운 상태 추가
```javascript
// 1. stateMachine.js
export const KioskState = {
  ...existing,
  NEW_STATE: 'NEW_STATE'
}

// 2. transition 함수에 로직 추가
case KioskState.SOME_STATE:
  if (action === 'SOME_ACTION') {
    return {
      newState: KioskState.NEW_STATE,
      message: '새로운 메시지'
    }
  }

// 3. kioskStore.js에 액션 추가
onSomeAction: () => {
  const { dispatch } = get()
  dispatch('SOME_ACTION')
}

// 4. page.js에서 처리
if (currentState === KioskState.NEW_STATE) {
  // 처리 로직
}
```

#### 2. 새로운 API 엔드포인트 추가
```javascript
// services/api.js
export async function getNewData() {
  const response = await apiClient.get('/api/new-endpoint')
  return response.data.map(transformNewData)
}

function transformNewData(data) {
  return {
    // 필드 매핑
  }
}
```

#### 3. 새로운 컴포넌트 추가
```javascript
// components/NewComponent.jsx
export function NewComponent({ props }) {
  return (
    <div>...</div>
  )
}

// page.js에서 사용
import { NewComponent } from '@/components/NewComponent'
```

---

이 문서는 시스템의 전체 아키텍처를 상세히 설명합니다. 추가 질문이나 명확히 할 부분이 있다면 문의해주세요.

