import React from 'react';
import { X } from 'lucide-react';

interface DeleteConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">伝票を削除</h2>
          <button onClick={onCancel}>
            <X className="w-6 h-6" />
          </button>
        </div>
        <p className="mb-6">この伝票を削除してもよろしいですか？削除した伝票はゴミ箱から復元できます。</p>
        <div className="flex gap-3">
          <button
            className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md"
            onClick={onCancel}
          >
            キャンセル
          </button>
          <button
            className="flex-1 bg-red-600 text-white py-2 rounded-md"
            onClick={onConfirm}
          >
            削除する
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;