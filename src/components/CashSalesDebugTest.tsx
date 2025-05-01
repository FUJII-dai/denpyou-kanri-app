import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getBusinessDate } from '../utils/businessHours';
import { formatPrice } from '../utils/price';
import { RefreshCw } from 'lucide-react';
import useOrderStore from '../store/orderStore';
import useDailySalesStore from '../store/dailySalesStore';
import ExtensionDebugger from './ExtensionDebugger';
import CashSalesDebugView from './CashSalesDebugView';

interface SalesData {
  fromOrders: number;
  fromDailySales: number;
  fromStore: number;
}

const CashSalesDebugTest = () => {
  const { orders } = useOrderStore();
  const { currentSales, loadDailySales } = useDailySalesStore();
  const [salesData, setSalesData] = useState<SalesData>({
    fromOrders: 0,
    fromDailySales: 0,
    fromStore: 0
  });
  const [rawData, setRawData] = useState<{
    orders: any[];
    dailySales: any;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const calculateCashSalesFromOrders = (orders: any[]): number => {
    return orders.reduce((total, order) => {
      if (order.status !== 'completed') return total;

      if (order.payment_method === 'cash') {
        const roundedTotal = Math.floor(order.total_amount / 100) * 100;
        console.log('[CashSalesDebugTest] Cash order:', {
          orderNumber: order.order_number,
          amount: order.total_amount,
          roundedAmount: roundedTotal
        });
        return total + roundedTotal;
      }
      
      if (order.payment_method === 'partial_cash' && order.payment_details?.cashAmount) {
        console.log('[CashSalesDebugTest] Partial cash order:', {
          orderNumber: order.order_number,
          cashAmount: order.payment_details.cashAmount
        });
        return total + order.payment_details.cashAmount;
      }
      
      return total;
    }, 0);
  };

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const businessDate = getBusinessDate();
      console.log('[CashSalesDebugTest] Fetching data for date:', businessDate);

      // Fetch orders directly from Supabase
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'completed');

      if (ordersError) throw ordersError;

      // Fetch daily sales directly from Supabase
      const { data: dailySalesData, error: dailySalesError } = await supabase
        .from('daily_sales')
        .select('*')
        .eq('business_date', businessDate)
        .maybeSingle();

      if (dailySalesError && dailySalesError.code !== 'PGRST116') throw dailySalesError;

      // Store raw data for inspection
      setRawData({
        orders: ordersData || [],
        dailySales: dailySalesData
      });

      // Calculate values from different sources
      const fromOrders = calculateCashSalesFromOrders(ordersData || []);
      const fromDailySales = dailySalesData?.cash_sales || 0;
      const fromStore = currentSales?.cashSales || 0;

      console.log('[CashSalesDebugTest] Comparison:', {
        fromOrders,
        fromDailySales,
        fromStore,
        ordersCount: ordersData?.length || 0,
        hasDailySales: !!dailySalesData,
        hasStoreSales: !!currentSales
      });

      setSalesData({
        fromOrders,
        fromDailySales,
        fromStore
      });

      setLastUpdate(new Date());
    } catch (error) {
      console.error('[CashSalesDebugTest] Error:', error);
      setError('データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleRefresh = async () => {
    const businessDate = getBusinessDate();
    await Promise.all([
      loadDailySales(businessDate),
      fetchAllData()
    ]);
  };

  const renderValue = (value: number, label: string) => (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className="text-2xl font-bold text-green-600">
        ¥{formatPrice(value)}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-xl font-bold">現金売上デバッグ</h1>
              {lastUpdate && (
                <div className="text-sm text-gray-500">
                  最終更新: {lastUpdate.toLocaleTimeString()}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm flex items-center gap-2"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                更新
              </button>
            </div>
          </div>

          {error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {renderValue(salesData.fromOrders, '注文データから計算')}
                {renderValue(salesData.fromDailySales, 'daily_sales テーブル')}
                {renderValue(salesData.fromStore, 'ストア状態')}
              </div>

              <CashSalesDebugView />

              <ExtensionDebugger />

              <div className="space-y-4 mt-4">
                <div>
                  <h2 className="text-lg font-semibold mb-2">完了済み注文</h2>
                  <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-60">
                    <pre className="text-sm">
                      {JSON.stringify(rawData?.orders
                        .filter(order => 
                          order.payment_method === 'cash' || 
                          (order.payment_method === 'partial_cash' && order.payment_details?.cashAmount)
                        )
                        .map(order => ({
                          orderNumber: order.order_number,
                          paymentMethod: order.payment_method,
                          totalAmount: order.total_amount,
                          cashAmount: order.payment_details?.cashAmount,
                          status: order.status
                        })), null, 2)}
                    </pre>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-2">売上データ</h2>
                  <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-60">
                    <pre className="text-sm">
                      {JSON.stringify(rawData?.dailySales, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CashSalesDebugTest;