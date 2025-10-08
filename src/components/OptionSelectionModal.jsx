'use client';

import { useState, useEffect } from 'react';

/**
 * 옵션 선택 팝업 (전체 화면)
 * 모든 옵션 그룹을 한 화면에 표시
 */
export function OptionSelectionModal({
  product,
  optionGroups,
  onComplete,
  onCancel,
}) {
  // 각 옵션 그룹별 선택된 옵션 (초기값: 기본 옵션)
  const [selectedOptions, setSelectedOptions] = useState({});
  
  useEffect(() => {
    // 초기 기본 옵션 설정
    const initial = {};
    optionGroups.forEach(group => {
      if (group.defaultOption) {
        initial[group.id] = group.defaultOption;
      }
    });
    setSelectedOptions(initial);
  }, [optionGroups]);

  const handleOptionSelect = (groupId, option) => {
    setSelectedOptions(prev => ({
      ...prev,
      [groupId]: option,
    }));
  };

  const handleComplete = () => {
    // 모든 필수 옵션이 선택되었는지 확인
    const allSelected = optionGroups.every(group => {
      if (group.required) {
        return selectedOptions[group.id] != null;
      }
      return true;
    });

    if (!allSelected) {
      alert('모든 옵션을 선택해주세요!');
      return;
    }

    // ✅ optionGroups 순서대로 선택된 옵션 배열 생성
    const selected = optionGroups.map(group => selectedOptions[group.id]).filter(Boolean);
    
    console.log('[OptionModal] 선택 완료:', {
      groupsCount: optionGroups.length,
      selectedCount: selected.length,
      options: selected.map(opt => opt.name)
    });
    
    onComplete(selected);
  };

  // 총 추가 금액 계산
  const totalAdditionalPrice = Object.values(selectedOptions).reduce(
    (sum, option) => sum + (option?.price || 0),
    0
  );

  const finalPrice = product.price + totalAdditionalPrice;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="bg-orange-500 text-white px-6 py-4 rounded-t-3xl flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{product.name}</h2>
            <p className="text-sm opacity-90">옵션을 선택해주세요</p>
          </div>
          <button
            onClick={onCancel}
            className="text-white hover:bg-orange-600 rounded-full p-2 transition-colors"
          >
            <span className="text-3xl">×</span>
          </button>
        </div>

        {/* 옵션 그룹 목록 */}
        <div className="flex-1 overflow-y-auto p-6">
          {optionGroups.map((group, groupIndex) => (
            <div key={group.id} className={groupIndex > 0 ? 'mt-6' : ''}>
              {/* 그룹 제목 */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">
                  {group.name.includes('사이드') ? '🍟' : '🥤'}
                </span>
                <h3 className="text-xl font-bold text-gray-800">
                  {group.name}
                  {group.required && <span className="text-red-500 ml-1">*</span>}
                </h3>
              </div>

              {/* 옵션 목록 */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {group.options.map((option, optionIndex) => {
                  const isSelected = selectedOptions[group.id]?.id === option.id;
                  const isDefault = option.isDefault;

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleOptionSelect(group.id, option)}
                      className={`
                        relative p-4 rounded-xl border-2 transition-all
                        ${isSelected
                          ? 'border-orange-500 bg-orange-50 shadow-lg scale-105'
                          : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow-md'
                        }
                      `}
                    >
                      {/* 선택 체크 표시 */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm">✓</span>
                        </div>
                      )}

                      {/* 번호 */}
                      <div className="text-sm text-gray-500 mb-1">
                        {optionIndex + 1}번
                      </div>

                      {/* 옵션 이름 */}
                      <div className="text-sm font-semibold text-gray-800 mb-2 line-clamp-2">
                        {option.name}
                      </div>

                      {/* 가격 표시 */}
                      <div className="text-sm font-bold">
                        {isDefault ? (
                          <span className="text-green-600">기본</span>
                        ) : option.price === 0 ? (
                          <span className="text-green-600">추가금 없음</span>
                        ) : (
                          <span className="text-orange-600">+{option.price.toLocaleString()}원</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 하단 요약 및 확인 버튼 */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-3xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">선택한 옵션:</p>
              <p className="text-base font-semibold text-gray-800">
                {Object.values(selectedOptions).map(opt => opt?.name).join(', ') || '없음'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">총 금액</p>
              <p className="text-3xl font-bold text-orange-600">
                {finalPrice.toLocaleString()}원
              </p>
              {totalAdditionalPrice > 0 && (
                <p className="text-xs text-gray-500">
                  (기본 {product.price.toLocaleString()}원 + {totalAdditionalPrice.toLocaleString()}원)
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleComplete}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold py-4 rounded-xl transition-colors"
          >
            이대로 주문하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default OptionSelectionModal;

