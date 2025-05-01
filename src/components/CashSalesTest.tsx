import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getBusinessDate } from '../utils/businessHours';
import { formatPrice } from '../utils/price';
import { RefreshCw } from 'lucide-react';

const CashSalesTest = () => {
  const [cashSales, setCashSales] = useState<number | null>(null);
  const [rawData, setRawData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDirectFromSupabase = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const businessDate = getBusinessDate();
      console.log('[CashSalesTest] Fetching data for date:', businessDate);

      // Direct query to daily_sales table
      const { data: dailySalesData, error: dailySalesError } = await supabase
        .from('daily_sales')
        .select('*')
        .eq('business_date', businessDate)
        .maybeSingle();

      if (dailySalesError) {
        throw dailySalesError;
      }

      console.log('[CashSalesTest] Raw daily sales data:', dailySalesData);
      setRawData(dailySalesData);

      // Get completed orders for the day to verify calculation
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'completed');

      if (ordersError) {
        throw ordersError;
      }

      console.log('[CashSalesTest] Completed orders:', ordersData);

      // Calculate cash sales from orders
      const calculatedCashSales = ordersData.reduce((total: number, order: any) => {
        if (order.payment_method === 'cash') {
          const orderTotal = order.total_amount;
          console.log('[CashSalesTest] Cash order found:', {
            orderNumber: order.order_number,
            amount: orderTotal
          });
          return total + Math.floor(orderTotal / 100) * 100;
        } else if (order.payment_method === 'partial_cash' && order.payment_details?.cashAmount) {
          console.log('[CashSalesTest] Partial cash order found:', {
            orderNumber: order.order_number,
            amount: order.payment_details.cashAmount
          });
          return total + order.payment_details.cashAmount;
        }
        return total;
      }, 0);

      console.log('[CashSalesTest] Calculated cash sales:', calculatedCashSales);
      console.log('[CashSalesTest] Stored cash sales:', dailySalesData?.cash_sales);

      setCashSales(dailySalesData?.cash_sales || calculatedCashSales || 0);
    } catch (error) {
      console.error('[CashSalesTest] Error:', error);
      setError('データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectFromSupabase();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold">現金売上テスト</h1>
            <button
              className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm flex items-center gap-2"
              onClick={fetchDirectFromSupabase}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              更新
            </button>
          </div>

          {error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">現金売上</h2>
                <div className="text-3xl font-bold text-green-600">
                  ¥{formatPrice(cashSales || 0)}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-2">生データ</h2>
                <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
                  {JSON.stringify(rawData, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CashSalesTest;