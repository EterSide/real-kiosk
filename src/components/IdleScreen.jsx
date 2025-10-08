'use client';

/**
 * 대기 화면 컴포넌트
 * 전체 화면에 캐릭터 이미지 표시
 */
export function IdleScreen({ videoRef, isDetecting, detectionProgress = 0, onManualStart }) {
  const handleClick = () => {
    console.log('[IdleScreen] 화면 클릭됨');
    if (onManualStart) {
      onManualStart();
    }
  };

  const isRecognizing = isDetecting && detectionProgress > 0 && detectionProgress < 100;

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-orange-500 via-red-500 to-yellow-500 flex items-center justify-center overflow-hidden cursor-pointer"
      onClick={handleClick}
      title="화면을 클릭하면 주문을 시작합니다"
    >
      {/* 배경 애니메이션 */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-yellow-300 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* 메인 캐릭터 */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="text-white text-center mb-8">
          <h1 className={`text-8xl font-bold mb-4 ${isRecognizing ? 'animate-pulse' : 'animate-bounce'}`}>
            🍔
          </h1>
          <h2 className="text-6xl font-bold mb-2">버거킹</h2>
          <p className="text-3xl opacity-80">음성 주문 키오스크</p>
        </div>

        {/* 감지 상태 표시 */}
        <div className="mt-12">
          {isRecognizing ? (
            /* 인식 중 - 프로그레스바 */
            <div className="bg-white bg-opacity-30 backdrop-blur-md px-16 py-8 rounded-3xl min-w-[500px]">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-white rounded-full animate-bounce delay-100"></div>
                <div className="w-3 h-3 bg-white rounded-full animate-bounce delay-200"></div>
              </div>
              
              <p className="text-white text-3xl font-bold mb-6 text-center">
                고객님을 인식하고 있습니다
              </p>
              
              {/* 프로그레스바 */}
              <div className="w-full bg-white bg-opacity-30 rounded-full h-6 overflow-hidden mb-3">
                <div 
                  className="bg-white h-full rounded-full transition-all duration-100 ease-linear relative overflow-hidden"
                  style={{ width: `${detectionProgress}%` }}
                >
                  {/* 반짝이는 효과 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-300 to-transparent animate-shimmer"></div>
                </div>
              </div>
              
              <p className="text-white text-xl font-semibold text-center">
                {Math.round(detectionProgress)}%
              </p>
            </div>
          ) : (
            /* 대기 중 */
            <>
              <div className="bg-white bg-opacity-20 backdrop-blur-md px-12 py-6 rounded-full mb-4">
                <p className="text-white text-2xl">
                  화면 앞으로 와주세요 👋
                </p>
              </div>
              <div className="bg-yellow-400 bg-opacity-90 px-8 py-4 rounded-full animate-bounce">
                <p className="text-gray-800 text-xl font-semibold">
                  🔊 음성을 들으려면 화면을 터치하세요 ✋
                </p>
              </div>
              <div className="mt-4 bg-red-500 bg-opacity-80 px-6 py-3 rounded-full">
                <p className="text-white text-base">
                  ⚠️ 브라우저 정책: 첫 시작은 반드시 터치 필요
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 숨겨진 웹캠 비디오 */}
      <video
        ref={videoRef}
        className="hidden"
        width="640"
        height="480"
        autoPlay
        muted
      />
    </div>
  );
}

export default IdleScreen;

