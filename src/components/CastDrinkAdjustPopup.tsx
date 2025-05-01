import React, { useState } from 'react';
import { Plus, Minus, X } from 'lucide-react';

interface CastDrinkAdjustPopupProps {
  castName: string;
  currentCount: number;
  onConfirm: (newCount: number) => void;
  onClose: () => void;
}

const CastDrinkAdjustPopup: React.FC<CastDrinkAdjustPopupProps> = ({
  castName,
  currentCount,
  onConfirm,
  onClose
}) => {
  const [adjustedCount, setAdjustedCount] = useState(currentCount);

  const handleCountChange = (change: number) => {
    const newCount = Math.max(1, adjustedCount + change);
    setAdjustedCount(newCount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg p-6 w-[320px] max-w-[90vw]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">{castName}のドリンク数調整</h3>
          <button onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              className="text-purple-600 hover:text-purple-800 p-2"
              onClick={() => handleCountChange(-1)}
              disabled={adjustedCount <= 1}
            >
              <Minus className="w-6 h-6" />
            </button>
            <span className="text-2xl font-medium w-12 text-center">
              {adjustedCount - currentCount}
            </span>
            <button
              className="text-purple-600 hover:text-purple-800 p-2"
              onClick={() => handleCountChange(1)}
            >
              <Plus className="w-6 h-6" />
            </button>
            <span className="text-gray-600">杯</span>
          </div>

          <div className="text-center text-lg">
            <span className="font-bold text-red-600">{currentCount}</span>
            <span className="mx-2">杯 →</span>
            <span className="font-bold text-red-600">{adjustedCount}</span>
            <span>杯</span>
          </div>
          <div className="text-center text-sm text-gray-600 mt-2">
            ¥{(currentCount * 500).toLocaleString()} → ¥{(adjustedCount * 500).toLocaleString()}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            className="flex-1 bg-purple-600 text-white py-2 rounded-md"
            onClick={() => onConfirm(adjustedCount)}
          >
            確定
          </button>
        </div>
      </div>
    </div>
  );
};

export default CastDrinkAdjustPopup;