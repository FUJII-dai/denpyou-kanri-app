import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface PinCodeModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  message?: string;
  confirmText?: string;
  confirmColor?: 'red' | 'blue' | 'green';
}

const PIN_CODE = "9999";

const PinCodeModal: React.FC<PinCodeModalProps> = ({ 
  onConfirm, 
  onCancel,
  message = 'PINコードを入力してください。',
  confirmText = '確認',
  confirmColor = 'red'
}) => {
  const [pinCode, setPinCode] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (pinCode === PIN_CODE) {
      onConfirm();
    } else {
      setError(true);
      setPinCode('');
    }
  };

  const getConfirmButtonColor = () => {
    switch (confirmColor) {
      case 'blue':
        return 'bg-blue-600';
      case 'green':
        return 'bg-green-600';
      default:
        return 'bg-red-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
      <div className="bg-white rounded-lg p-6 w-[320px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">認証</h2>
          <button onClick={onCancel}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          {message}
        </p>

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md mb-4">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm">PINコードが正しくありません</span>
          </div>
        )}

        <input
          type="password"
          className="w-full border rounded-lg p-3 mb-4"
          value={pinCode}
          onChange={(e) => {
            setPinCode(e.target.value);
            setError(false);
          }}
          placeholder="PINコードを入力"
          maxLength={4}
          pattern="[0-9]*"
          inputMode="numeric"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit();
            }
          }}
        />

        <div className="flex gap-3">
          <button
            className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md"
            onClick={onCancel}
          >
            キャンセル
          </button>
          <button
            className={`flex-1 ${getConfirmButtonColor()} text-white py-2 rounded-md`}
            onClick={handleSubmit}
            disabled={!pinCode}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinCodeModal;