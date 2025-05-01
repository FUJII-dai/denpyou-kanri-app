import React from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Clock, RefreshCw } from 'lucide-react';
import useOrderHistoryStore from '../store/orderHistoryStore';
import { formatPrice } from '../utils/price';

interface OrderHistoryProps {
  orderId: string;
  onClose: () => void;
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ orderId, onClose }) => {
  const { history, isLoading, error, loadHistory } = useOrderHistoryStore();

  React.useEffect(() => {
    loadHistory(orderId);
  }, [orderId, loadHistory]);

  const formatTimestamp = (timestamp: string) => {
    return format(new Date(timestamp), 'M/d HH:mm:ss', { locale: ja });
  };

  const getChangeDescription = (changes: any) => {
    if (!changes) return '';

    const descriptions: string[] = [];

    if (changes.guests !== undefined) {
      descriptions.push(`人数: ${changes.old?.guests || '?'} → ${changes.new?.guests || '?'}名`);
    }

    if (changes.totalAmount !== undefined) {
      descriptions.push(
        `金額: ¥${formatPrice(changes.old?.totalAmount || 0)} → ¥${formatPrice(changes.new?.totalAmount || 0)}`
      );
    }

    if (changes.status !== undefined) {
      const getStatusText = (status: string) => {
        switch (status) {
          case 'active': return '接客中';
          case 'completed': return '会計済み';
          case 'deleted': return '削除済み';
          default: return status;
        }
      };
      descriptions.push(
        `状態: ${getStatusText(changes.old?.status)} → ${getStatusText(changes.new?.status)}`
      );
    }

    return descriptions.join(', ');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
        <header className="bg-purple-800 text-white p-4 flex justify-between items-center sticky top-0">
          <h2 className="text-xl font-bold">変更履歴</h2>
          <div className="flex items-center gap-2">
            <button
              className="bg-blue-600 text-white py-1 px-3 rounded-md text-sm flex items-center gap-2"
              onClick={() => loadHistory(orderId)}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              更新
            </button>
            <button
              className="text-white"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </header>

        <div className="p-4">
          {error ? (
            <div className="text-red-600 bg-red-50 p-4 rounded-md">
              {error}
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-800 border-t-transparent"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              履歴がありません
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="border-l-4 border-purple-800 pl-4 py-2"
                >
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Clock className="w-4 h-4" />
                    {formatTimestamp(item.changedAt)}
                  </div>
                  <div className="text-sm">
                    {item.action === 'create' && '伝票作成'}
                    {item.action === 'update' && getChangeDescription(item.changes)}
                    {item.action === 'delete' && '伝票削除'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderHistory;