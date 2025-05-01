import React, { useState, useEffect } from 'react';
import { X, Calendar, Search, Trash2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import useOperationLogStore from '../store/operationLogStore';

interface OperationLogViewerProps {
  onClose: () => void;
}

const OperationLogViewer: React.FC<OperationLogViewerProps> = ({ onClose }) => {
  const { logs, isLoading, error, loadLogs, clearLogs } = useOperationLogStore();
  const [searchDate, setSearchDate] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    loadLogs(
      format(thirtyDaysAgo, 'yyyy-MM-dd', { locale: ja }),
      format(today, 'yyyy-MM-dd', { locale: ja })
    );
  }, [loadLogs]);

  const formatTimestamp = (timestamp: string) => {
    return format(new Date(timestamp), 'M/d HH:mm:ss', { locale: ja });
  };

  const getActionDescription = (action: string) => {
    switch (action) {
      case 'reset_local':
        return '画面リセット';
      case 'reset_full':
        return '全データ削除';
      case 'export_data':
        return 'データエクスポート';
      case 'delete_order':
        return '伝票削除';
      case 'restore_order':
        return '伝票復元';
      case 'permanent_delete':
        return '伝票完全削除';
      default:
        return action;
    }
  };

  const handleClearLogs = async () => {
    await clearLogs();
    setShowClearConfirm(false);
  };

  const filteredLogs = searchDate
    ? logs.filter(log => log.businessDate.includes(searchDate))
    : logs;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <header className="bg-purple-800 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">操作ログ</h2>
          <button onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </header>

        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                className="w-full border rounded-lg pl-10 pr-4 py-2"
                placeholder="日付で検索 (例: 2025-03)"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
            <button
              className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              onClick={() => setShowClearConfirm(true)}
            >
              <Trash2 className="w-4 h-4" />
              古いログを削除
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-800 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="text-red-600 bg-red-50 p-4 rounded-md">
              {error}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              該当するログがありません
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    <span className="font-bold">
                      {getActionDescription(log.action)}
                    </span>
                  </div>
                  {log.details && (
                    <pre className="text-sm bg-gray-50 p-2 rounded-md overflow-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]">
          <div className="bg-white rounded-lg p-6 w-[320px]">
            <h3 className="text-lg font-bold mb-4">ログの削除確認</h3>
            <p className="text-sm text-gray-600 mb-6">
              本日より前のログを全て削除します。この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md"
                onClick={() => setShowClearConfirm(false)}
              >
                キャンセル
              </button>
              <button
                className="flex-1 bg-red-600 text-white py-2 rounded-md"
                onClick={handleClearLogs}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationLogViewer;