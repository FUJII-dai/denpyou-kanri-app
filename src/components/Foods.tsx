import React from 'react';
import { Order, Food } from '../types/order';
import { formatPrice } from '../utils/price';
import { X } from 'lucide-react';

interface FoodsProps {
  order: Order;
  onUpdate: (foods: Food[], tempFood?: { name: string; price: string }) => void;
  disabled?: boolean;
}

const Foods: React.FC<FoodsProps> = ({ order, onUpdate, disabled }) => {
  const handleAddFood = () => {
    if (!order.tempFood?.name || !order.tempFood?.price) return;
    
    const newFood: Food = {
      id: Date.now(),
      name: order.tempFood.name,
      price: parseInt(order.tempFood.price),
      quantity: 1
    };
    
    const newFoods = [...(order.foods || []), newFood];
    onUpdate(newFoods, { name: "", price: "" });
  };

  const handleRemoveFood = (foodId: number) => {
    const newFoods = order.foods.filter(f => f.id !== foodId);
    onUpdate(newFoods, order.tempFood);
  };

  const handleQuantityChange = (foodId: number, quantity: number) => {
    const updatedFoods = order.foods.map(food => {
      if (food.id === foodId) {
        return { ...food, quantity: Math.max(1, quantity) };
      }
      return food;
    });
    onUpdate(updatedFoods, order.tempFood);
  };

  const handleTempInputChange = (field: 'name' | 'price', value: string) => {
    const currentTemp = order.tempFood || { name: "", price: "" };
    const newTemp = {
      ...currentTemp,
      [field]: value
    };
    onUpdate(order.foods, newTemp);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h3 className="font-bold mb-3">フード・その他</h3>
      
      {!disabled && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <label className="block text-xs text-gray-700 mb-1">商品名</label>
            <input 
              type="text" 
              className="border rounded-md p-2 w-full text-sm" 
              placeholder="例: お菓子"
              value={order.tempFood?.name || ""}
              onChange={(e) => handleTempInputChange('name', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">金額 (円)</label>
            <input 
              type="number" 
              className="border rounded-md p-2 w-full text-sm" 
              placeholder="例: 500"
              value={order.tempFood?.price || ""}
              onChange={(e) => handleTempInputChange('price', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="flex items-end">
            <button 
              className="bg-pink-600 text-white py-2 px-3 rounded-md text-sm w-full"
              onClick={handleAddFood}
              disabled={disabled}
            >
              追加
            </button>
          </div>
        </div>
      )}
      
      <div className="bg-pink-50 rounded-md p-2">
        {order.foods && order.foods.length > 0 ? (
          order.foods.map(food => (
            <div 
              key={food.id} 
              className="border-b border-pink-200 pb-2 mb-2 flex justify-between items-center last:border-b-0 last:mb-0 last:pb-0"
            >
              <div className="flex items-center gap-4">
                <span>{food.name}</span>
                {!disabled && (
                  <input
                    type="number"
                    className="border rounded-md p-1 w-16 text-sm"
                    value={food.quantity}
                    onChange={(e) => handleQuantityChange(food.id, parseInt(e.target.value) || 1)}
                    min="1"
                    disabled={disabled}
                  />
                )}
                {disabled && (
                  <span className="text-sm">
                    {food.quantity}個
                  </span>
                )}
              </div>
              <div className="flex items-center">
                <span className="mr-2">¥{formatPrice(food.price * food.quantity)}</span>
                {!disabled && (
                  <button 
                    className="text-red-500"
                    onClick={() => handleRemoveFood(food.id)}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-2 text-sm">
            商品はまだありません
          </div>
        )}
      </div>
    </div>
  );
};

export default Foods;