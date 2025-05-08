import React, { useState, useEffect } from 'react';
import { PaymentMethod, PaymentDetails } from '../types/order';
import { X, CreditCard, Wallet, Smartphone } from 'lucide-react';

interface PaymentMethodModalProps {
  onSelect: (method: PaymentMethod, details: PaymentDetails) => void;
  onClose: () => void;
  totalAmount: number;
}

const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({ onSelect, onClose, totalAmount }) => {
  const [step, setStep] = useState<'method' | 'cash' | 'card_fee' | 'remaining'>('method');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [isFullAmount, setIsFullAmount] = useState(false);

  // ステップが変更されたら状態をリセット
  useEffect(() => {
    if (step === 'method') {
      setCashAmount('');
      setIsFullAmount(false);
    }
  }, [step]);

  // 100円単位で切り捨てる関数
  const roundDownTo100 = (amount: number) => {
    return Math.floor(amount / 100) * 100;
  };

  const handleCashSubmit = () => {
    const cash = parseInt(cashAmount);
    
    // 全額入力ボタンで入力された場合は切り捨てた金額で確定
    if (isFullAmount) {
      const roundedTotal = roundDownTo100(totalAmount);
      onSelect('cash', { 
        cashAmount: roundedTotal,
        hasCardFee: false
      });
      return;
    }

    // 手入力の場合
    if (cash >= totalAmount) {
      onSelect('cash', { 
        cashAmount: cash,
        hasCardFee: false
      });
    } else {
      setStep('remaining');
    }
  };

  const handleCardFeeSelection = (withFee: boolean) => {
    onSelect('card', { 
      cardAmount: totalAmount,
      cardFee: withFee ? Math.floor(totalAmount * 0.1) : 0,
      hasCardFee: withFee
    });
  };

  const handleRemainingPayment = (paymentType: 'card' | 'electronic') => {
    const cash = parseInt(cashAmount);
    const remaining = totalAmount - cash;
    
    if (paymentType === 'electronic') {
      onSelect('partial_cash', {
        cashAmount: cash,
        electronicAmount: remaining,
        hasCardFee: false
      });
    } else {
      // カード支払いの場合、残額に対して10%の手数料を加算
      const cardFee = Math.floor(remaining * 0.1);
      onSelect('partial_cash', {
        cashAmount: cash,
        cardAmount: remaining,
        cardFee,
        hasCardFee: true
      });
    }
  };

  const handleFullAmount = () => {
    const roundedAmount = roundDownTo100(totalAmount);
    setCashAmount(roundedAmount.toString());
    setIsFullAmount(true);
  };

  const handleBack = () => {
    // 状態を完全にリセットしてメソッド選択画面に戻る
    setCashAmount('');
    setIsFullAmount(false);
    setStep('method');
  };

  const renderStep = () => {
    switch (step) {
      case 'method':
        return (
          <div className="grid grid-cols-2 gap-3">
            <button
              className="bg-green-600 text-white p-4 rounded-lg flex flex-col items-center gap-2"
              onClick={() => setStep('cash')}
            >
              <Wallet className="w-6 h-6" />
              <span>現金</span>
            </button>
            <button
              className="bg-blue-600 text-white p-4 rounded-lg flex flex-col items-center gap-2"
              onClick={() => setStep('card_fee')}
            >
              <CreditCard className="w-6 h-6" />
              <span>カード</span>
            </button>
            <button
              className="bg-purple-600 text-white p-4 rounded-lg flex flex-col items-center gap-2 col-span-2"
              onClick={() => onSelect('electronic', { 
                electronicAmount: totalAmount,
                hasCardFee: false
              })}
            >
              <Smartphone className="w-6 h-6" />
              <span>電子マネー</span>
            </button>
          </div>
        );

      case 'cash':
        const roundedTotal = roundDownTo100(totalAmount);
        return (
          <div>
            <h3 className="text-lg font-bold mb-4">現金支払い金額</h3>
            <div className="text-sm text-gray-600 mb-3">
              <div>支払い総額: ¥{totalAmount.toLocaleString()}</div>
              <div>切捨て後: ¥{roundedTotal.toLocaleString()}</div>
              <div className="text-xs">※現金支払いは100円単位で切り捨てます</div>
            </div>
            <button
              className="w-full bg-green-600 text-white py-2 rounded-lg mb-3"
              onClick={handleFullAmount}
            >
              全額入力 (¥{roundedTotal.toLocaleString()})
            </button>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full border rounded-lg p-3 mb-4"
              value={cashAmount}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/[^0-9]/g, '');
                setCashAmount(numericValue);
                setIsFullAmount(false);
              }}
              placeholder="現金支払い金額を入力"
            />
            <button
              className="w-full bg-green-600 text-white py-3 rounded-lg mb-2"
              onClick={handleCashSubmit}
              disabled={!cashAmount}
            >
              {isFullAmount ? '切り捨て支払い' : '確定'}
            </button>
          </div>
        );

      case 'card_fee':
        return (
          <div>
            <h3 className="text-lg font-bold mb-4">カード手数料</h3>
            <div className="grid gap-3">
              <button
                className="bg-blue-600 text-white p-4 rounded-lg"
                onClick={() => handleCardFeeSelection(true)}
              >
                手数料あり (+10%)
              </button>
              <button
                className="bg-blue-600 text-white p-4 rounded-lg"
                onClick={() => handleCardFeeSelection(false)}
              >
                手数料なし
              </button>
            </div>
          </div>
        );

      case 'remaining':
        const remainingAmount = totalAmount - parseInt(cashAmount);
        return (
          <div>
            <h3 className="text-lg font-bold mb-4">残額の支払い方法</h3>
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">現金支払い額</div>
              <div className="font-bold">¥{parseInt(cashAmount).toLocaleString()}</div>
              <div className="text-sm text-gray-600 mt-2">残額</div>
              <div className="font-bold">¥{remainingAmount.toLocaleString()}</div>
            </div>
            <div className="grid gap-3">
              <button
                className="bg-blue-600 text-white p-4 rounded-lg"
                onClick={() => handleRemainingPayment('card')}
              >
                カード（手数料あり +10%）
              </button>
              <button
                className="bg-purple-600 text-white p-4 rounded-lg"
                onClick={() => handleRemainingPayment('electronic')}
              >
                電子マネー
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">支払い方法</h2>
          <button onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>
        {renderStep()}
        {step !== 'method' && (
          <button
            className="mt-4 text-gray-600 w-full text-center"
            onClick={handleBack}
          >
            戻る
          </button>
        )}
      </div>
    </div>
  );
};

export default PaymentMethodModal;
