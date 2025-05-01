import React from 'react';
import { Order } from '../types/order';
import { formatPrice } from '../utils/price';
import { Music, Plus, Minus } from 'lucide-react';

interface KaraokeProps {
  order: Order;
  onUpdate: (karaokeCount: number) => void;
  disabled?: boolean;
}

const Karaoke: React.FC<KaraokeProps> = ({ order, onUpdate, disabled }) => {
  const handleCountChange = (change: number) => {
    const newCount = Math.max(0, (order.karaokeCount || 0) + change);
    onUpdate(newCount);
  };

  const price = (order.karaokeCount || 0) * 200; // 1曲200円

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Music className="w-5 h-5 text-purple-600" />
        <h3 className="font-bold">カラオケ</h3>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!disabled && (
            <>
              <button
                className="text-purple-600 hover:text-purple-800 p-1"
                onClick={() => handleCountChange(-1)}
                disabled={!order.karaokeCount || disabled}
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-xl font-medium w-12 text-center">
                {order.karaokeCount || 0}
              </span>
              <button
                className="text-purple-600 hover:text-purple-800 p-1"
                onClick={() => handleCountChange(1)}
                disabled={disabled}
              >
                <Plus className="w-5 h-5" />
              </button>
            </>
          )}
          {disabled && (
            <span className="text-xl font-medium">
              {order.karaokeCount || 0}
            </span>
          )}
          <span className="text-gray-600">曲</span>
        </div>
        <div className="text-right">
          <span className="text-sm text-gray-600">料金</span>
          <div className="text-lg font-medium">¥{formatPrice(price)}</div>
        </div>
      </div>
    </div>
  );
};

export default Karaoke;