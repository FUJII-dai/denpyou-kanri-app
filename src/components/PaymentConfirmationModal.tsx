import React from 'react';
import { X } from 'lucide-react';
import { Order, PaymentMethod, PaymentDetails } from '../types/order';
import { formatPrice } from '../utils/price';

interface PaymentConfirmationModalProps {
  order: Order;
  paymentMethod: PaymentMethod;
  paymentDetails: PaymentDetails;
  finalTotal: number;
  onConfirm: () => void;
  onBack: () => void;
}

const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({
  order,
  paymentMethod,
  paymentDetails,
  finalTotal,
  onConfirm,
  onBack
}) => {
  const getPaymentMethodText = () => {
    switch (paymentMethod) {
      case 'cash':
        return '現金';
      case 'card':
        return 'カード';
      case 'electronic':
        return '電子マネー';
      case 'partial_cash':
        if (paymentDetails.cardAmount) {
          return '現金・カード';
        }
        return '現金・電子マネー';
      default:
        return '';
    }
  };

  const getPaymentDetails = () => {
    const details = [];
    if (paymentDetails.cashAmount) {
      details.push(`現金: ¥${formatPrice(paymentDetails.cashAmount)}`);
    }
    if (paymentDetails.cardAmount !== undefined) {
      if (paymentDetails.hasCardFee) {
        const cardAmount = paymentDetails.cardAmount;
        const cardFee = paymentDetails.cardFee || 0;
        const totalCardAmount = cardAmount + cardFee;
        details.push(
          `カード: ¥${formatPrice(cardAmount)}(カード払い) + ¥${formatPrice(cardFee)}(手数料) = ¥${formatPrice(totalCardAmount)}(カード決済金額)`
        );
      } else {
        details.push(`カード: ¥${formatPrice(paymentDetails.cardAmount)}`);
      }
    }
    if (paymentDetails.electronicAmount) {
      details.push(`電子マネー: ¥${formatPrice(paymentDetails.electronicAmount)}`);
    }
    return details.join('\n');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg p-6 w-[480px] max-w-[90vw]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">会計内容の確認</h2>
          <button onClick={onBack}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <div className="text-sm text-gray-600 mb-1">卓番</div>
            <div className="font-bold">
              {order.tableType} {order.tableNum} ({order.guests}名)
            </div>
          </div>

          {order.customerName && (
            <div>
              <div className="text-sm text-gray-600 mb-1">お客様名</div>
              <div>{order.customerName}</div>
            </div>
          )}

          {order.note && (
            <div>
              <div className="text-sm text-gray-600 mb-1">備考</div>
              <div className="text-sm">{order.note}</div>
            </div>
          )}

          <div>
            <div className="text-sm text-gray-600 mb-1">支払方法</div>
            <div className="font-bold">{getPaymentMethodText()}</div>
            <div className="text-sm mt-1 whitespace-pre-line">{getPaymentDetails()}</div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex justify-between items-center text-xl">
              <span className="font-bold">合計金額</span>
              <span className="font-bold">¥{formatPrice(finalTotal)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-md"
            onClick={onBack}
          >
            戻る
          </button>
          <button
            className="flex-1 bg-green-600 text-white py-3 rounded-md"
            onClick={onConfirm}
          >
            会計済みへ
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmationModal;