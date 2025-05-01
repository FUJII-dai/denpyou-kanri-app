import React, { useState, useEffect } from 'react';
import { X, Clock, Search } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { formatPrice } from '../utils/price';
import useDailySalesStore from '../store/dailySalesStore';

interface HistoryViewerProps {
  onClose: () => void;
}

const HistoryViewer: React.FC<HistoryViewerProps> = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [searchDate, setSearchDate] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get last 30 days
      const today = new Date();
      const dates = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(today, i);
        return format(date, 'yyyy-MM-dd', { locale: ja });
      });

      // Load sales data for each date
      const historyData = dates.map(date => {
        const sales = useDailySalesStore.getState().currentSales;
        if (sales?.businessDate === date) {
          return {
            date,
            totalSales: sales.totalSales,
            cashSales: sales.cashSales,
            cardSales: sales.cardSales,
            electronicSales: sales.electronicSales,
            totalGroups: sales.totalGroups,
            totalGuests: sales.totalGuests,
            castSales: sales.castSales
          };
        }
        return {
          date,
          totalSales: 0,
          cashSales: 0,
          cardSales: 0,
          electronicSales: 0,
          totalGroups: 0,
          totalGuests: 0,
          castSales: []
        };
      });

      setHistory(historyData);
    } catch (error) {
      console.error('History load error:', error);
      setError('履歴の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredHistory = searchDate
    ? history.filter(item => item.date.includes(searchDate))
    : history;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <header className="bg-purple-800 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">閲覧履歴</h2>
          <button onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </header>

        <div className="p-4">
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                className="w-full border rounded-lg pl-10 pr-4 py-2"
                placeholder="日付で検索 (例: 2025-03)"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-800 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="text-red-600 bg-red-50 p-4 rounded-md">
              {error}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              該当する履歴がありません
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((item) => (
                <div
                  key={item.date}
                  className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="font-bold">{item.date}</span>
                    </div>
                    <div className="text-xl font-bold text-green-600">
                      ¥{formatPrice(item.totalSales)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-600">現金売上</div>
                      <div className="font-bold">¥{formatPrice(item.cashSales)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">カード売上</div>
                      <div className="font-bold">¥{formatPrice(item.cardSales)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">電子マネー売上</div>
                      <div className="font-bold">¥{formatPrice(item.electronicSales)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">来店数</div>
                      <div className="font-bold">
                        {item.totalGroups}組 ({item.totalGuests}名)
                      </div>
                    </div>
                  </div>

                  {item.castSales.length > 0 && (
                    <div>
                      <div className="text-sm text-gray-600 mb-2">キャスト売上</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {item.castSales.map((cast: any, index: number) => (
                          <div
                            key={index}
                            className="bg-purple-50 rounded p-2 text-sm"
                          >
                            <span className="font-medium">{cast.name}</span>
                            <span className="text-gray-600 ml-2">
                              ¥{formatPrice(cast.referralAmount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryViewer;