import React, { useState } from 'react';
import { X } from 'lucide-react';
import useOrderStore from '../store/orderStore';
import useOperationLogStore from '../store/operationLogStore';
import { formatPrice } from '../utils/price';
import PinCodeModal from './PinCodeModal';

interface TrashBinModalProps {
  onClose: () => void;
}

const TrashBin: React.FC<TrashBinModalProps> = ({ onClose }) => {
  const { deletedOrders, restoreOrder, permanentlyDeleteOrder } = useOrderStore();
  const operationLog = useOperationLogStore();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRestore = async (id: string) => {
    try {
      setError(null);
      const order = deletedOrders.find(o => o.id === id);
      if (!order) {
        throw new Error('Order not found in deleted orders');
      }

      await restoreOrder(id);
      
      // Log the operation after successful restore
      await operationLog.addLog('restore_order', {
        orderId: id,
        orderNumber: order.orderNumber
      });
    } catch (error: any) {
      console.error('Error restoring order:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      });
      setError('伝票の復元に失敗しました');
    }
  };

  const handlePermanentDelete = (id: string) => {
    setSelectedOrderId(id);
  };

  const handlePinCodeConfirm = async () => {
    if (selectedOrderId) {
      try {
        setError(null);
        const order = deletedOrders.find(o => o.id === selectedOrderId);
        if (!order) {
          throw new Error('Order not found in deleted orders');
        }

        await permanentlyDeleteOrder(selectedOrderId);
        
        // Log the operation after successful deletion
        await operationLog.addLog('permanent_delete', {
          orderId: selectedOrderId,
          orderNumber: order.orderNumber
        });
        
        setSelectedOrderId(null);
      } catch (error: any) {
        console.error('Error permanently deleting order:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          stack: error.stack
        });
        setError('伝票の完全削除に失敗しました');
      }
    }
  };

  const handlePinCodeCancel = () => {
    setSelectedOrderId(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
        <header className="bg-gray-800 text-white p-4 flex justify-between items-center sticky top-0">
          <h2 className="text-xl font-bold">ゴミ箱</h2>
          <button onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </header>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4">
            {error}
          </div>
        )}

        <div className="p-4">
          {deletedOrders.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              削除された伝票はありません
            </div>
          ) : (
            <div className="grid gap-4">
              {deletedOrders.map(order => (
                <div 
                  key={order.id}
                  className="bg-gray-50 rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      <span className="text-sm text-gray-500">#{order.orderNumber}</span>
                      <span>
                        {order.tableType} {order.tableNum}
                        <span className="ml-2 text-sm text-gray-600">
                          ({order.guests}名)
                        </span>
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {order.startTime}〜{order.endTime}
                    </div>
                    {order.customerName && (
                      <div className="text-sm text-gray-600">
                        {order.customerName}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      className="bg-blue-600 text-white p-2 rounded-md flex items-center gap-1"
                      onClick={() => handleRestore(order.id)}
                    >
                      <span>復元</span>
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800"
                      onClick={() => handlePermanentDelete(order.id)}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedOrderId && (
        <PinCodeModal
          onConfirm={handlePinCodeConfirm}
          onCancel={handlePinCodeCancel}
          message="伝票を完全に削除するには、PINコードを入力してください。"
          confirmText="完全削除"
          confirmColor="red"
        />
      )}
    </div>
  );
};

export default TrashBin;