import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { getBusinessDate } from '../utils/businessHours';

const OrdersCheck = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkOrders = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 指定期間の注文を取得
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .gte('created_at', '2025-03-22 19:00:00')
          .lt('created_at', '2025-03-23 09:00:00')
          .order('created_at', { ascending: true });

        if (error) throw error;

        // 各注文の営業日を計算
        const ordersWithBusinessDate = (data || []).map(order => ({
          ...order,
          businessDate: getBusinessDate(new Date(order.created_at))
        }));

        setOrders(ordersWithBusinessDate);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('データの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    checkOrders();
  }, []);

  if (isLoading) {
    return <div className="p-4">データを読み込み中...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">3/22 19:00 - 3/23 9:00 の伝票データ</h2>
      {orders.length === 0 ? (
        <div className="text-center text-gray-500 py-4">
          該当する伝票はありません
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-lg shadow p-4">
              <div className="text-lg font-bold mb-2">
                伝票 #{order.order_number}
                <span className="ml-2 text-sm text-gray-500">
                  ({order.status === 'completed' ? '会計済み' : '接客中'})
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <div>開始時刻: {order.start_time}</div>
                <div>終了時刻: {order.end_time}</div>
                <div>作成日時: {format(new Date(order.created_at), 'M/d HH:mm:ss', { locale: ja })}</div>
                <div className="text-purple-600">営業日: {order.businessDate}</div>
                <div>合計金額: ¥{order.total_amount.toLocaleString()}</div>
                <div>支払方法: {order.payment_method || '-'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersCheck;