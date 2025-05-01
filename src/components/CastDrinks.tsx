import React, { useState } from 'react';
import { Order, CastDrink } from '../types/order';
import { formatPrice } from '../utils/price';
import { X, Plus, Minus } from 'lucide-react';
import useStaffStore from '../store/staffStore';
import CastDrinkAdjustPopup from './CastDrinkAdjustPopup';

interface CastDrinksProps {
  order: Order;
  onUpdate: (castDrinks: CastDrink[], tempCastDrink?: { cast: string; count: string }) => void;
  disabled?: boolean;
}

const CastDrinks: React.FC<CastDrinksProps> = ({ order, onUpdate, disabled }) => {
  const { staff } = useStaffStore();
  const [selectedDrinkId, setSelectedDrinkId] = useState<number | null>(null);

  const handleAddDrink = () => {
    if (!order.tempCastDrink?.cast) return;
    
    const addCount = parseInt(order.tempCastDrink.count || "1");
    const addPrice = addCount * 500; // 1杯500円
    
    // 既存のキャストドリンクを探す
    const existingCastDrinks = [...(order.castDrinks || [])];
    const existingIndex = existingCastDrinks.findIndex(
      drink => drink.cast === order.tempCastDrink?.cast
    );
    
    let newCastDrinks: CastDrink[];
    
    if (existingIndex >= 0) {
      // 既存のキャストの場合は累積加算
      const oldCount = existingCastDrinks[existingIndex].count;
      const newCount = oldCount + addCount;
      
      existingCastDrinks[existingIndex] = {
        ...existingCastDrinks[existingIndex],
        count: newCount,
        price: newCount * 500,
        display: `${newCount}杯`
      };
      
      newCastDrinks = existingCastDrinks;
    } else {
      // 新規追加
      const newCastDrink: CastDrink = {
        id: Date.now(),
        cast: order.tempCastDrink.cast,
        count: addCount,
        price: addPrice,
        display: `${addCount}杯`
      };
      
      newCastDrinks = [...existingCastDrinks, newCastDrink];
    }
    
    // 追加後に入力フォームをリセット
    onUpdate(newCastDrinks, { cast: "", count: "1" });
  };

  const handleRemoveDrink = (drinkId: number) => {
    const newCastDrinks = order.castDrinks.filter(d => d.id !== drinkId);
    // 一時的な入力値は保持
    onUpdate(newCastDrinks, order.tempCastDrink);
  };

  const handleCountAdjust = (drink: CastDrink) => {
    setSelectedDrinkId(drink.id);
  };

  const handleAdjustConfirm = (drinkId: number, newCount: number) => {
    const updatedDrinks = order.castDrinks.map(drink => {
      if (drink.id === drinkId) {
        return {
          ...drink,
          count: newCount,
          price: newCount * 500,
          display: `${newCount}杯`
        };
      }
      return drink;
    });
    onUpdate(updatedDrinks, order.tempCastDrink);
    setSelectedDrinkId(null);
  };

  const handleTempInputChange = (field: 'cast' | 'count', value: string) => {
    const currentTemp = order.tempCastDrink || { cast: "", count: "1" };
    const newTemp = {
      ...currentTemp,
      [field]: value
    };
    onUpdate(order.castDrinks, newTemp);
  };

  const selectedDrink = selectedDrinkId 
    ? order.castDrinks.find(d => d.id === selectedDrinkId)
    : null;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h3 className="font-bold mb-3">キャストドリンク</h3>
      
      {!disabled && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <label className="block text-xs text-gray-700 mb-1">キャスト</label>
            <select 
              className="border rounded-md p-2 w-full text-sm"
              value={order.tempCastDrink?.cast || ""}
              onChange={(e) => handleTempInputChange('cast', e.target.value)}
              disabled={disabled}
            >
              <option value="">キャスト選択</option>
              {staff.map(member => (
                <option key={member.id} value={member.name}>{member.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">杯数</label>
            <select 
              className="border rounded-md p-2 w-full text-sm"
              value={order.tempCastDrink?.count || "1"}
              onChange={(e) => handleTempInputChange('count', e.target.value)}
              disabled={disabled}
            >
              {[1, 2, 3, 4, 5].map(num => (
                <option key={num} value={num}>{num}杯</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button 
              className="bg-green-600 text-white py-2 px-3 rounded-md text-sm w-full flex items-center justify-center gap-1"
              onClick={handleAddDrink}
              disabled={!order.tempCastDrink?.cast || disabled}
            >
              <Plus className="w-4 h-4" />
              追加
            </button>
          </div>
        </div>
      )}
      
      <div className="bg-green-50 rounded-md p-2">
        {order.castDrinks && order.castDrinks.length > 0 ? (
          <div className="space-y-2">
            {order.castDrinks.map(drink => (
              <div 
                key={drink.id} 
                className="flex justify-between items-center bg-white rounded-md p-2 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="font-medium">{drink.cast}</div>
                  {!disabled && (
                    <button
                      className="text-green-600 hover:text-green-800 p-1"
                      onClick={() => handleCountAdjust(drink)}
                    >
                      <span className="text-sm font-medium">
                        {drink.count}杯
                      </span>
                    </button>
                  )}
                  {disabled && (
                    <span className="text-sm font-medium">
                      {drink.count}杯
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">¥{formatPrice(drink.price)}</span>
                  {!disabled && (
                    <button 
                      className="text-red-500 hover:text-red-700 p-1"
                      onClick={() => handleRemoveDrink(drink.id)}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-2 text-sm">
            キャストドリンクはまだありません
          </div>
        )}
      </div>

      {selectedDrink && (
        <CastDrinkAdjustPopup
          castName={selectedDrink.cast}
          currentCount={selectedDrink.count}
          onConfirm={(newCount) => handleAdjustConfirm(selectedDrink.id, newCount)}
          onClose={() => setSelectedDrinkId(null)}
        />
      )}
    </div>
  );
};

export default CastDrinks;