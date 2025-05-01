import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Download, Calendar } from 'lucide-react';
import useOrderStore from '../store/orderStore';
import OrderDetail from './OrderDetail';
import { calculateTimeRemaining, getTimeRemainingDisplay, isLessThan30Minutes, isLessThan10Minutes } from '../utils/time';
import { calculateTotal, calculateServiceCharge, formatPrice } from '../utils/price';

interface ActiveOrdersProps {
  onBack: () => void;
}

const ActiveOrders: React.FC<ActiveOrdersProps> = ({ onBack }) => {
  const { orders } = useOrderStore();
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const activeOrders = orders
    .filter(order => order.status === 'active')
    .sort((a, b) => {
      // First sort by table type (カウンター first)
      if (a.tableType !== b.tableType) {
        return a.tableType === 'カウンター' ? -1 : 1;
      }
      // Then sort by table number
      return a.tableNum - b.tableNum;
    });

  // 接客中の伝票の合計金額を計算
  const totalActiveAmount = activeOrders.reduce((sum, order) => {
    const subtotal = calculateTotal(order);
    const serviceCharge = calculateServiceCharge(subtotal);
    return sum + subtotal + serviceCharge;
  }, 0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  const calculateCurrentTotal = (order: Order) => {
    const subtotal = calculateTotal(order);
    const serviceCharge = calculateServiceCharge(subtotal);
    return subtotal + serviceCharge;
  };

  const getTableTypeDisplay = (type: string) => {
    return type === 'カウンター' ? 'カ' : 'ボ';
  };

  const getTableTypeColor = (type: string) => {
    return type === 'カウンター' ? 'text-orange-600' : 'text-blue-600';
  };

  const getTimeDisplayColor = (timeRemaining: string) => {
    if (timeRemaining.startsWith('-')) return 'text-red-600'; // 超過
    
    const [hours, minutes] = timeRemaining.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    
    if (totalMinutes <= 10) return 'text-red-600'; // 10分以下
    if (totalMinutes <= 30) return 'text-green-600'; // 30分以下
    return ''; // 通常表示
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-purple-800 text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">接客中</h1>
          <div className="text-sm flex items-center gap-2">
            <span>{activeOrders.length}組</span>
            <span className="text-gray-300">|</span>
            <span>合計 ¥{formatPrice(totalActiveAmount)}</span>
          </div>
        </div>
        <button 
          className="bg-blue-600 text-white py-1 px-3 rounded-md text-sm flex items-center gap-2"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4" />
          戻る
        </button>
      </header>
      
      <div className="flex-1 p-4 overflow-auto">
        {activeOrders.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            接客中の伝票はありません
          </div>
        ) : (
          <div className="grid gap-4">
            {activeOrders.map(order => {
              const timeRemaining = calculateTimeRemaining(order.endTime);
              const currentTotal = calculateCurrentTotal(order);
              const timeDisplay = getTimeRemainingDisplay(order.endTime);
              const timeColor = getTimeDisplayColor(timeRemaining);
              const tableColor = getTableTypeColor(order.tableType);
              const isOvertime = timeRemaining.startsWith('-');

              return (
                <div 
                  key={order.id}
                  className={`rounded-lg shadow-md p-4 flex flex-col gap-2 cursor-pointer hover:opacity-90 ${
                    order.tableType === 'カウンター' ? 'bg-pink-50' : 'bg-blue-50'
                  }`}
                  onClick={() => setSelectedOrder(order.id)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-500">#{order.orderNumber}</span>
                    <div className="font-bold">
                      <span className={tableColor}>
                        {getTableTypeDisplay(order.tableType)}{order.tableNum}
                      </span>
                      <span className="ml-2 text-sm text-gray-600">{order.guests}名</span>
                    </div>
                    {order.referralCasts.length > 0 && (
                      <>
                        <span className="text-gray-400">|</span>
                        <span className="text-sm text-gray-900">
                          紹介: {order.referralCasts.join(', ')}
                        </span>
                      </>
                    )}
                    {order.customerName && (
                      <>
                        <span className="text-gray-400">|</span>
                        <span className="text-sm text-gray-600">{order.customerName}</span>
                      </>
                    )}
                    {order.note && (
                      <>
                        <span className="text-gray-400">|</span>
                        <span className="text-sm text-amber-600">{order.note}</span>
                      </>
                    )}
                  </div>
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="text-sm text-gray-600 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {order.startTime}〜{order.endTime}
                      <span 
                        className={`ml-2 font-bold ${timeColor} ${
                          isOvertime ? 'bg-red-100 px-2 py-1 rounded-md' : ''
                        }`}
                        key={`${order.id}-${currentTime.getTime()}`}
                      >
                        {timeDisplay}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-purple-600">
                      現時点の合計: ¥{formatPrice(currentTotal)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderDetail
          order={orders.find(o => o.id === selectedOrder)!}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
};

export default ActiveOrders;