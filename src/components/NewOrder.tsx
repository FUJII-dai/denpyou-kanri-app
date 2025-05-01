import React, { useState } from 'react';
import { ArrowLeft, Plus, Minus } from 'lucide-react';
import useOrderStore from '../store/orderStore';
import { formatTime } from '../utils/time';
import OrderDetail from './OrderDetail';
import { Order } from '../types/order';

interface NewOrderProps {
  onBack: () => void;
}

const NewOrder: React.FC<NewOrderProps> = ({ onBack }) => {
  const [tableType, setTableType] = useState('カウンター');
  const [tableNum, setTableNum] = useState(1);
  const [guests, setGuests] = useState(1);
  const [newOrderId, setNewOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { addOrder } = useOrderStore();

  const handleGuestChange = (change: number) => {
    const newValue = Math.max(1, guests + change);
    setGuests(newValue);
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      const startTime = formatTime(new Date());
      const endTime = formatTime(new Date(Date.now() + 60 * 60 * 1000)); // 1時間後

      const newOrder: Omit<Order, 'orderNumber'> & { orderNumber: number } = {
        id: crypto.randomUUID(),
        orderNumber: 0, // Will be set by the store
        tableType,
        tableNum,
        guests,
        startTime,
        endTime,
        duration: '0:00',
        customerName: '',
        catchCasts: [],
        referralCasts: [],
        extensions: [],
        menus: [],
        castDrinks: [],
        bottles: [],
        foods: [],
        drinkType: '60分1500円',
        drinkPrice: 1500,
        totalAmount: guests * 1500,
        status: 'active'
      };

      await addOrder(newOrder);
      setNewOrderId(newOrder.id);
    } catch (err) {
      console.error('Error creating order:', err);
      setError('伝票の作成に失敗しました。もう一度お試しください。');
    }
  };

  const handleOrderDetailClose = () => {
    setNewOrderId(null);
    onBack();
  };

  const getTableTypeDisplay = (type: string) => {
    return type === 'カウンター' ? 'カ' : 'ボ';
  };

  const getTableTypeColor = (type: string) => {
    return type === 'カウンター' ? 'text-orange-600' : 'text-blue-600';
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-purple-800 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">新規伝票</h1>
        <button 
          onClick={onBack}
          className="bg-blue-600 text-white py-1 px-3 rounded-md text-sm flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          戻る
        </button>
      </header>

      <div className="p-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">卓番タイプ</label>
              <select 
                className="border rounded-md p-2 w-full"
                value={tableType}
                onChange={(e) => setTableType(e.target.value)}
              >
                <option value="カウンター">カウンター</option>
                <option value="ボックス">ボックス</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">卓番</label>
              <div className="flex items-center">
                <span className={`font-medium ${getTableTypeColor(tableType)}`}>
                  {getTableTypeDisplay(tableType)}
                </span>
                <select 
                  className={`border rounded-md p-2 flex-1 ml-1 ${getTableTypeColor(tableType)}`}
                  value={tableNum}
                  onChange={(e) => setTableNum(Number(e.target.value))}
                >
                  {Array.from(
                    { length: tableType === 'カウンター' ? 10 : 5 },
                    (_, i) => i + 1
                  ).map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">人数</label>
            <div className="flex items-center gap-4">
              <button
                className="text-purple-600 hover:text-purple-800 p-1"
                onClick={() => handleGuestChange(-1)}
                disabled={guests <= 1}
              >
                <Minus className="w-6 h-6" />
              </button>
              <span className="text-2xl font-medium w-12 text-center">
                {guests}
              </span>
              <button
                className="text-purple-600 hover:text-purple-800 p-1"
                onClick={() => handleGuestChange(1)}
              >
                <Plus className="w-6 h-6" />
              </button>
              <span className="text-gray-600">名</span>
            </div>
          </div>

          <div className="flex gap-4 mt-4">
            <button 
              className="bg-gray-500 text-white py-3 px-4 rounded-md w-1/2"
              onClick={onBack}
            >
              キャンセル
            </button>
            <button 
              className="bg-pink-600 text-white py-3 px-4 rounded-md w-1/2"
              onClick={handleSubmit}
            >
              作成する
            </button>
          </div>
        </div>
      </div>

      {newOrderId && (
        <OrderDetail
          order={useOrderStore.getState().orders.find(o => o.id === newOrderId)!}
          onClose={handleOrderDetailClose}
        />
      )}
    </div>
  );
};

export default NewOrder;