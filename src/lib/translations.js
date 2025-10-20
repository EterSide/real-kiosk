/**
 * 다국어 번역 텍스트
 */

export const translations = {
  ko: {
    // IdleScreen
    brandName: '버거킹',
    subtitle: '음성 주문 키오스크',
    comeCloser: '화면 앞으로 와주세요 👋',
    touchToStart: '🔊 음성을 들으려면 화면을 터치하세요 ✋',
    browserWarning: '⚠️ 브라우저 정책: 첫 시작은 반드시 터치 필요',
    recognizingCustomer: '고객님을 인식하고 있습니다',
    
    // MenuBoard
    all: '전체',
    menu: '메뉴',
    pleaseSelect: '선택해 주세요',
    optionSelection: '옵션 선택',
    
    // CartPanel
    cart: '장바구니',
    items: '개',
    cartEmpty: '장바구니가 비어있습니다',
    totalQuantity: '총 수량',
    totalAmount: '총 금액',
    checkout: '결제하기',
    delete: '삭제',
    amount: '금액',
    won: '원',
    
    // OrderScreen
    listening: '듣고 있습니다...',
    
    // PaymentModal
    easyAmount: '간편한 금액',
    selectPaymentMethod: '결제 방법을 선택해주세요',
    card: '카드',
    samsungApplePay: '삼성·애플페이',
    tossPaySimple: '토스페이 간편결제',
    tossPointAvailable: '토스·포인트 사용 가능',
    qrSimplePay: 'QR 간편결제',
    qrPaymentOptions: '카카오·네이버·차이페이',
    cash: '현금',
    insertCard: '카드를 넣어주세요',
    insertCardDetail1: 'IC칩이 위를 향하도록',
    insertCardDetail2: '카드를 끝까지 밀어넣어주세요',
    cardApproving: '카드 결제 승인 중...',
    cashProcessing: '현금 결제 처리 중...',
    simplePayApproving: '간편결제 승인 중...',
    pleaseWait: '잠시만 기다려주세요',
    paymentComplete: '결제 완료!',
    paymentSuccess: '결제가 성공적으로 완료되었습니다',
    paymentAmount: '결제 금액',
    
    // OrderCompleteModal
    orderComplete: '주문이 완료되었습니다!',
    orderNumber: '주문번호',
    foodPreparing: '잠시 후 음식을 준비해 드리겠습니다',
    checkScreenNumber: '화면 번호를 확인해 주세요',
    autoClose: '3초 후 자동으로 닫힙니다...',
    
    // StateMachine Messages (구어체로 자연스럽게)
    welcome: '어서오세요! 주문 도와드릴게요',
    howCanIHelp: '어떤 메뉴 드릴까요?',
    menuNotFound: '아, 못 찾았어요. 다시 한 번 말씀해 주시겠어요?',
    menuNotFoundAskMore: '음, 못 찾았네요. 다른 메뉴 더 주문하실 거 있으세요?',
    selected: '네! 선택하셨어요.',
    whichMenu: '어떤 걸로 드릴까요?',
    selectOption: '옵션은 화면에서 골라주세요!',
    additionalOrder: '더 주문하실 거 있으세요?',
    yesPleaseSpeak: '네~ 말씀하세요!',
    noOrders: '아직 주문하신 게 없네요.',
    totalIs: '전체',
    orderConfirm: '이에요. 주문할까요?',
    proceedPayment: '네! 결제 도와드릴게요~',
    modifyOrder: '주문 바꾸실래요?',
    paymentCompleted: '결제 완료했어요! 감사합니다~',
    paymentFailed: '아, 결제가 안 됐어요. 다시 해볼까요?',
    pleaseOrderAgain: '다시 주문해 주세요~',
    orderDetails: '주문하신 거는요,',
  },
  
  en: {
    // IdleScreen
    brandName: 'Burger King',
    subtitle: 'Voice Order Kiosk',
    comeCloser: 'Please come closer 👋',
    touchToStart: '🔊 Touch screen to enable audio ✋',
    browserWarning: '⚠️ Browser Policy: Touch required to start',
    recognizingCustomer: 'Recognizing customer',
    
    // MenuBoard
    all: 'All',
    menu: 'Menu',
    pleaseSelect: 'Please Select',
    optionSelection: 'Option Selection',
    
    // CartPanel
    cart: 'Cart',
    items: 'items',
    cartEmpty: 'Your cart is empty',
    totalQuantity: 'Total Qty',
    totalAmount: 'Total',
    checkout: 'Checkout',
    delete: 'Delete',
    amount: 'Amount',
    won: 'KRW',
    
    // OrderScreen
    listening: 'Listening...',
    
    // PaymentModal
    easyAmount: 'Amount',
    selectPaymentMethod: 'Please select payment method',
    card: 'Card',
    samsungApplePay: 'Samsung/Apple Pay',
    tossPaySimple: 'Toss Pay',
    tossPointAvailable: 'Toss·Points available',
    qrSimplePay: 'QR Pay',
    qrPaymentOptions: 'Kakao·Naver·Chai',
    cash: 'Cash',
    insertCard: 'Please insert card',
    insertCardDetail1: 'IC chip facing up',
    insertCardDetail2: 'Push card all the way in',
    cardApproving: 'Approving card payment...',
    cashProcessing: 'Processing cash payment...',
    simplePayApproving: 'Approving simple pay...',
    pleaseWait: 'Please wait',
    paymentComplete: 'Payment Complete!',
    paymentSuccess: 'Payment completed successfully',
    paymentAmount: 'Amount',
    
    // OrderCompleteModal
    orderComplete: 'Order Complete!',
    orderNumber: 'Order Number',
    foodPreparing: 'Your food will be prepared shortly',
    checkScreenNumber: 'Please check the number on screen',
    autoClose: 'Auto-closing in 3 seconds...',
    
    // StateMachine Messages
    welcome: 'Welcome! Let\'s start your order.',
    howCanIHelp: 'How can I help you?',
    menuNotFound: 'Sorry, I couldn\'t find that menu. Could you say it again?',
    menuNotFoundAskMore: 'Sorry, I couldn\'t find that menu. Any other orders?',
    selected: ' selected.',
    whichMenu: 'Which menu would you like?',
    selectOption: 'Please select your option on screen.',
    additionalOrder: 'Any additional orders?',
    yesPleaseSpeak: 'Yes, please go ahead.',
    noOrders: 'No items in order.',
    totalIs: 'Total',
    orderConfirm: '. Would you like to order?',
    proceedPayment: 'Proceeding to payment.',
    modifyOrder: 'Would you like to modify your order?',
    paymentCompleted: 'Payment completed. Thank you!',
    paymentFailed: 'Payment failed. Please try again.',
    pleaseOrderAgain: 'Please order again.',
    orderDetails: 'Your order is',
  },
};

/**
 * 텍스트 가져오기 헬퍼 함수
 */
export function t(key, language = 'ko') {
  return translations[language]?.[key] || translations.ko[key] || key;
}

/**
 * 상품명 가져오기 (언어에 따라)
 */
export function getProductName(product, language = 'ko') {
  if (language === 'en' && product.productEngName) {
    return product.productEngName;
  }
  return product.name;
}

/**
 * 상품 설명 가져오기 (언어에 따라)
 */
export function getProductDescription(product, language = 'ko') {
  if (language === 'en' && product.engDescription) {
    return product.engDescription;
  }
  return product.description || '';
}

/**
 * 카테고리명 가져오기 (언어에 따라)
 */
export function getCategoryName(category, language = 'ko') {
  if (language === 'en' && category.categoryEngName) {
    return category.categoryEngName;
  }
  return category.name;
}

export default translations;

