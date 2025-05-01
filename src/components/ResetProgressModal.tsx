import React from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

interface ResetProgressModalProps {
  steps: {
    id: string;
    label: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    error?: string;
  }[];
  onRetry?: () => void;
  onClose?: () => void;
}

const ResetProgressModal: React.FC<ResetProgressModalProps> = ({
  steps,
  onRetry,
  onClose
}) => {
  const isCompleted = steps.every(step => step.status === 'completed');
  const hasError = steps.some(step => step.status === 'error');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'processing':
        return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
      <div className="bg-white rounded-lg p-6 w-[480px] max-w-[90vw]">
        <h2 className="text-xl font-bold mb-4">
          {isCompleted ? 'リセット完了' : hasError ? 'エラーが発生しました' : 'リセット中...'}
        </h2>

        <div className="space-y-4 mb-6">
          {steps.map(step => (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-md ${
                step.status === 'error' ? 'bg-red-50' :
                step.status === 'completed' ? 'bg-green-50' :
                step.status === 'processing' ? 'bg-blue-50' :
                'bg-gray-50'
              }`}
            >
              {getStatusIcon(step.status)}
              <div className="flex-1">
                <div className="font-medium">{step.label}</div>
                {step.error && (
                  <div className="text-sm text-red-600 mt-1">{step.error}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          {hasError && onRetry && (
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-md"
              onClick={onRetry}
            >
              再試行
            </button>
          )}
          {(isCompleted || hasError) && onClose && (
            <button
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md"
              onClick={onClose}
            >
              閉じる
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetProgressModal;