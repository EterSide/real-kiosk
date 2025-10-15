'use client';

import { useState, useEffect } from 'react';
import { useKioskStore } from '@/store/kioskStore';
import { t, getProductName } from '@/lib/translations';

/**
 * 단일 옵션 그룹 선택 팝업
 * 하나의 옵션 그룹만 표시
 */
export function SingleOptionModal({
  product,
  optionGroup,
  currentIndex,
  totalCount,
  onSelect,
  onCancel,
}) {
  const { language } = useKioskStore();
  const [selectedOption, setSelectedOption] = useState(null);

  useEffect(() => {
    console.log('[SingleOptionModal] 마운트됨!', {
      productName: product.name,
      groupName: optionGroup.name,
      currentIndex,
      totalCount
    });
    
    // 기본 옵션이 있으면 자동 선택
    if (optionGroup.defaultOption) {
      setSelectedOption(optionGroup.defaultOption);
      console.log('[SingleOptionModal] 기본 옵션 선택:', optionGroup.defaultOption.name);
    }
  }, [optionGroup, product, currentIndex, totalCount]);

  const handleSelect = () => {
    if (!selectedOption) {
      alert(language === 'ko' ? '옵션을 선택해주세요!' : 'Please select an option!');
      return;
    }

    onSelect(selectedOption);
  };

  const additionalPrice = selectedOption?.price || 0;
  const finalPrice = product.price + additionalPrice;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="bg-orange-500 text-white px-6 py-4 rounded-t-3xl">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h2 className="text-2xl font-bold">{getProductName(product, language)}</h2>
              <p className="text-sm opacity-90">
                {language === 'ko' 
                  ? `${optionGroup.name}을(를) 선택해주세요` 
                  : `Please select ${optionGroup.name}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-75">{language === 'ko' ? '진행 상황' : 'Progress'}</p>
              <p className="text-lg font-bold">
                {currentIndex + 1} / {totalCount}
              </p>
            </div>
          </div>
        </div>

        {/* 옵션 목록 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">
              {optionGroup.name.includes('사이드') ? '🍟' : 
               optionGroup.name.includes('음료') ? '🥤' : 
               optionGroup.name.includes('디저트') ? '🍰' : '🍴'}
            </span>
            <h3 className="text-2xl font-bold text-gray-800">
              {optionGroup.name}
              {optionGroup.required && <span className="text-red-500 ml-2">*</span>}
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {optionGroup.options.map((option, index) => {
              const isSelected = selectedOption?.id === option.id;
              const isDefault = option.isDefault;

              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedOption(option)}
                  className={`
                    relative p-5 rounded-2xl border-3 transition-all transform
                    ${isSelected
                      ? 'border-orange-500 bg-orange-50 shadow-2xl scale-105'
                      : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow-lg hover:scale-102'
                    }
                  `}
                >
                  {/* 선택 체크 */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-lg font-bold">✓</span>
                    </div>
                  )}

                  {/* 번호 */}
                  <div className="text-base text-gray-500 mb-2 font-semibold">
                    {language === 'ko' ? `${index + 1}번` : `${index + 1}.`}
                  </div>

                  {/* 옵션 이름 */}
                  <div className="text-base font-bold text-gray-800 mb-3 min-h-[48px] flex items-center justify-center">
                    {option.name}
                  </div>

                  {/* 가격 */}
                  <div className="text-base font-bold">
                    {isDefault ? (
                      <span className="text-green-600 text-lg">✓ {language === 'ko' ? '기본' : 'Default'}</span>
                    ) : option.price === 0 ? (
                      <span className="text-green-600">{language === 'ko' ? '추가금 없음' : 'No extra'}</span>
                    ) : (
                      <span className="text-orange-600">+{option.price.toLocaleString()}{t('won', language)}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="border-t-2 border-gray-200 p-6 bg-gray-50 rounded-b-3xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">{language === 'ko' ? '선택한 옵션:' : 'Selected:'}</p>
              <p className="text-lg font-bold text-gray-800">
                {selectedOption ? selectedOption.name : (language === 'ko' ? '없음' : 'None')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">{language === 'ko' ? '현재 금액' : 'Amount'}</p>
              <p className="text-2xl font-bold text-orange-600">
                {finalPrice.toLocaleString()}{t('won', language)}
              </p>
              {additionalPrice > 0 && (
                <p className="text-xs text-gray-500">
                  ({language === 'ko' ? '기본' : 'Base'} {product.price.toLocaleString()}{t('won', language)} + {additionalPrice.toLocaleString()}{t('won', language)})
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleSelect}
            disabled={!selectedOption}
            className={`
              w-full text-xl font-bold py-4 rounded-xl transition-all transform
              ${selectedOption
                ? 'bg-orange-500 hover:bg-orange-600 text-white hover:scale-105 shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {currentIndex + 1 === totalCount 
              ? (language === 'ko' ? '장바구니에 담기' : 'Add to Cart')
              : (language === 'ko' ? '다음 옵션 선택' : 'Next Option')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SingleOptionModal;

