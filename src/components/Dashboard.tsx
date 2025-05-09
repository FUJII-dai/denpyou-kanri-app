import React, { useState, useEffect } from 'react';
import { CircleDollarSign, Clock, BarChart3, Users, Plus, CheckCircle, Trash2, Wallet, Settings as SettingsIcon, Bug } from 'lucide-react';
import useOrderStore from '../store/orderStore';
import useDailySalesStore from '../store/dailySalesStore';
import { calculateTotal, calculateServiceCharge, formatPrice } from '../utils/price';
import { getBusinessDate } from '../utils/businessHours';
import TrashBin from './TrashBin';
import Settings from './Settings';
import TimeDebugger from './TimeDebugger';

interface DashboardProps {
  onScreenChange: (screen: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onScreenChange }) => {
  const { orders, deletedOrders } = useOrderStore();
  const { currentSales, loadDailySales, subscribeToChanges, unsubscribe } = useDailySalesStore();
  const [showTrashBin, setShowTrashBin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTimeDebugger, setShowTimeDebugger] = useState(false);
  
  useEffect(() => {
    const businessDate = getBusinessDate();
    loadDailySales(businessDate);
    subscribeToChanges();

    return () => {
      unsubscribe();
    };
  }, [loadDailySales, subscribeToChanges, unsubscribe]);

  const activeOrders = orders.filter(order => order.status === 'active');
  const completedOrders = orders.filter(order => order.status === 'completed');
  
  const totalSales = currentSales?.totalSales || completedOrders.reduce((sum, order) => {
    const total = calculateTotal(order);
    const serviceCharge = calculateServiceCharge(total);
    const subtotalWithService = total + serviceCharge;
    
    if (order.paymentMethod === 'cash') {
      return sum + Math.floor(subtotalWithService / 100) * 100;
    }
    
    return sum + subtotalWithService + (order.paymentDetails?.cardFee || 0);
  }, 0);
  
  const totalVisitors = orders.reduce((sum, order) => sum + order.guests, 0);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-purple-800 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">FunFare 伝票管理</h1>
        <div className="flex items-center gap-2">
          <button
            className="bg-gray-700 text-white p-2 rounded-md"
            onClick={() => setShowTimeDebugger(true)}
            title="タイマーデバッグ"
          >
            <Bug className="w-4 h-4" />
          </button>
          <button
            className="bg-gray-700 text-white p-2 rounded-md"
            onClick={() => setShowSettings(true)}
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
          <button 
            className="bg-gray-700 text-white p-2 rounded-md flex items-center gap-1 text-sm relative"
            onClick={() => setShowTrashBin(true)}
          >
            <Trash2 className="w-4 h-4" />
            {deletedOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                {deletedOrders.length}
              </span>
            )}
          </button>
        </div>
      </header>
      
      <div className="p-4 space-y-4">
        {/* Main Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            className="bg-pink-600 text-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center"
            onClick={() => onScreenChange('newOrder')}
          >
            <Plus className="w-8 h-8 mb-2" />
            <span className="font-bold">新規伝票</span>
          </button>
          
          <div className="relative">
            <button 
              className="bg-purple-600 text-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center w-full"
              onClick={() => onScreenChange('activeOrders')}
            >
              <Clock className="w-8 h-8 mb-2" />
              <span className="font-bold">接客中</span>
            </button>
            {activeOrders.length > 0 && (
              <div className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow-lg border-2 border-white">
                {activeOrders.length}
              </div>
            )}
          </div>
          
          <button 
            className="bg-green-600 text-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center"
            onClick={() => onScreenChange('completedOrders')}
          >
            <CheckCircle className="w-8 h-8 mb-2" />
            <span className="font-bold">会計済み</span>
          </button>
          
          <button 
            className="bg-blue-600 text-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center"
            onClick={() => onScreenChange('dailySales')}
          >
            <BarChart3 className="w-8 h-8 mb-2" />
            <span className="font-bold">売上集計</span>
          </button>
        </div>

        {/* Management Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            className="bg-gray-200 text-gray-800 p-3 rounded-lg shadow-md flex items-center justify-center gap-2"
            onClick={() => onScreenChange('staff')}
          >
            <Users className="w-5 h-5" />
            <span className="font-bold">キャスト管理</span>
          </button>

          <button 
            className="bg-gray-200 text-gray-800 p-3 rounded-lg shadow-md flex items-center justify-center gap-2"
            onClick={() => onScreenChange('register-cash')}
          >
            <Wallet className="w-5 h-5" />
            <span className="font-bold">レジ金確認</span>
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <h2 className="font-bold text-lg mb-2">本日の状況</h2>
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex justify-between mb-2">
            <span>売上合計</span>
            <span className="font-bold">¥{formatPrice(totalSales)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>来店組数</span>
            <span className="font-bold">{orders.length}組</span>
          </div>
          <div className="flex justify-between">
            <span>来店人数</span>
            <span className="font-bold">{totalVisitors}名</span>
          </div>
        </div>
      </div>

      {showTrashBin && <TrashBin onClose={() => setShowTrashBin(false)} />}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      {showTimeDebugger && <TimeDebugger onClose={() => setShowTimeDebugger(false)} />}
    </div>
  );
};

export default Dashboard;
