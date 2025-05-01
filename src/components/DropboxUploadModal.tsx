import React from 'react';
import { X, Upload } from 'lucide-react';
import { useDropbox } from '../hooks/useDropbox';

interface DropboxUploadModalProps {
  onClose: () => void;
  onUpload: (uploadToDropbox: (fileName: string, content: Blob) => Promise<any>) => void;
}

const DropboxUploadModal: React.FC<DropboxUploadModalProps> = ({ onClose, onUpload }) => {
  const { isAuthenticated, authenticate, uploadFile } = useDropbox();

  const handleUpload = () => {
    if (!isAuthenticated) {
      authenticate();
      return;
    }
    onUpload(uploadFile);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg p-6 w-[320px]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Dropboxに保存</h3>
          <button onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          {isAuthenticated
            ? 'CSVファイルをDropboxに保存します。'
            : 'Dropboxと連携して保存します。'}
        </p>

        <div className="flex gap-3">
          <button
            className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            className="flex-1 bg-blue-600 text-white py-2 rounded-md flex items-center justify-center gap-2"
            onClick={handleUpload}
          >
            <Upload className="w-4 h-4" />
            {isAuthenticated ? '保存' : 'Dropboxと連携'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DropboxUploadModal;