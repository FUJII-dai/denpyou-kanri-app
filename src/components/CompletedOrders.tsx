import React, { useState } from 'react';
import { ArrowLeft, Clock, Download } from 'lucide-react';
import useOrderStore from '../store/orderStore';
import { calculateTotal, calculateServiceCharge, formatPrice } from '../utils/price';
import OrderDetail from './OrderDetail';
import { Order } from '../types/order';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { compareBusinessTime } from '../utils/time';
import { getBusinessDate } from '../utils/businessHours';

interface CompletedOrdersProps {
  onBack: () => void;
}

const CompletedOrders: React.FC<CompletedOrdersProps> = ({ onBack }) => {
  const { orders } = useOrderStore();
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);

  const completedOrders = orders
    .filter(order => order.status === 'completed')
    .sort((a, b) => {
      // 終了時刻を基準に並び替え
      return compareBusinessTime(a.endTime, b.endTime);
    });

  const getPaymentDetails = (order: Order) => {
    if (!order.paymentDetails) return '';

    const details = [];
    if (order.paymentDetails.cashAmount) {
      const isRounded = order.paymentMethod === 'cash' && 
        order.paymentDetails.cashAmount === Math.floor((calculateTotal(order) + calculateServiceCharge(calculateTotal(order))) / 100) * 100;
      details.push(`現金¥${formatPrice(order.paymentDetails.cashAmount)}${isRounded ? '(切捨)' : ''}`);
    }
    if (order.paymentDetails.cardAmount !== undefined) {
      if (order.paymentDetails.hasCardFee) {
        const cardAmount = order.paymentDetails.cardAmount;
        const cardFee = order.paymentDetails.cardFee || 0;
        const totalCardAmount = cardAmount + cardFee;
        details.push(`カード¥${formatPrice(totalCardAmount)}(手数料込み)`);
      } else {
        details.push(`カード¥${formatPrice(order.paymentDetails.cardAmount)}`);
      }
    }
    if (order.paymentDetails.electronicAmount) {
      details.push(`電子マネー¥${formatPrice(order.paymentDetails.electronicAmount)}`);
    }

    return details.join(' / ');
  };

  const handleExportCSV = () => {
    const businessDate = getBusinessDate();
    const dateStr = format(parseISO(businessDate), 'yyyyMMdd', { locale: ja });

    // CSVの値をエスケープする関数
    const escapeCSV = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    // キャストドリンクの情報を文字列化
    const formatCastDrinks = (order: Order): string => {
      if (!order.castDrinks.length) return '';
      return order.castDrinks
        .map(drink => `${drink.cast}(${drink.count}杯)`)
        .join('\n');
    };

    // ボトルの情報を文字列化
    const formatBottles = (order: Order): string => {
      if (!order.bottles.length) return '';
      return order.bottles
        .map(bottle => {
          const parts = [
            `${bottle.name}(¥${formatPrice(bottle.price)})`,
            bottle.mainCasts?.length ? `担当:${bottle.mainCasts.join('/')}` : '',
            bottle.helpCasts?.length ? `ヘルプ:${bottle.helpCasts.join('/')}` : '',
            bottle.note ? `備考:${bottle.note}` : ''
          ].filter(Boolean);
          return parts.join(' ');
        })
        .join('\n');
    };

    // ヘッダー行
    const headers = [
      '伝票番号',
      '卓番',
      '人数',
      '開始時間',
      '終了時間',
      '支払い方法',
      '金額',
      'お客様名',
      '紹介キャスト',
      'キャッチ',
      'キャストドリンク',
      'ボトル',
      '備考'
    ];
    
    // データ行の作成
    const rows = completedOrders.map(order => [
      order.orderNumber.toString(),
      `${order.tableType}${order.tableNum}`,
      order.guests.toString(),
      order.startTime,
      order.endTime,
      order.paymentMethod === 'cash' ? '現金' :
        order.paymentMethod === 'card' ? 'カード' :
        order.paymentMethod === 'electronic' ? '電子マネー' : '複数',
      escapeCSV(`¥${formatPrice(order.totalAmount)}`),
      escapeCSV(order.customerName || ''),
      escapeCSV(order.referralCasts?.join(', ') || ''),
      escapeCSV(order.catchCasts?.join(', ') || ''),
      escapeCSV(formatCastDrinks(order)),
      escapeCSV(formatBottles(order)),
      escapeCSV(order.note || '')
    ]);

    // CSVデータの作成
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // BOMを追加してUTF-8でエンコード
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8' });
    
    // ダウンロード
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `会計済み伝票_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTableTypeDisplay = (type: string) => {
    return type === 'カウンター' ? 'カ' : 'ボ';
  };

  const getTableTypeColor = (type: string) => {
    return type === 'カウンター' ? 'text-orange-600' : 'text-blue-600';
  };

  const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return format(date, 'HH:mm:ss', { locale: ja });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-purple-800 text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">会計済み</h1>
          <div className="text-sm">
            {completedOrders.length}組
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="bg-green-600 text-white py-1 px-3 rounded-md text-sm flex items-center gap-2"
            onClick={handleExportCSV}
            disabled={completedOrders.length === 0}
          >
            <Download className="w-4 h-4" />
            CSV出力
          </button>
          <button 
            className="bg-blue-600 text-white py-1 px-3 rounded-md text-sm flex items-center gap-2"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>
        </div>
      </header>

      <div className="flex-1 p-4 overflow-auto">
        {completedOrders.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            会計済みの伝票はありません
          </div>
        ) : (
          <div className="grid gap-4">
            {completedOrders.map(order => (
              <div 
                key={order.id}
                className={`rounded-lg shadow-md p-4 cursor-pointer hover:opacity-90 ${
                  order.tableType === 'カウンター' ? 'bg-pink-50' : 'bg-blue-50'
                }`}
                onClick={() => setSelectedOrder(order.id)}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-500">#{order.orderNumber}</span>
                    <div className="font-bold">
                      <span className={getTableTypeColor(order.tableType)}>
                        {getTableTypeDisplay(order.tableType)}{order.tableNum}
                      </span>
                      <span className="ml-2 text-sm text-gray-600">{order.guests}名</span>
                    </div>
                    {order.referralCasts?.length > 0 && (
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
                      <span className="ml-2 text-gray-400">
                        会計: {formatTimestamp(order.updated_at)}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">¥{formatPrice(order.totalAmount)}</div>
                      <div className="text-sm text-gray-600">
                        {getPaymentDetails(order)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderDetail
          order={orders.find(o => o.id === selectedOrder)!}
          onClose={() => setSelectedOrder(null)}
          scrollToSection="bottles"
        />
      )}
    </div>
  );
};

export default CompletedOrders;