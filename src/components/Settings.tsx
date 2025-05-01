import React, { useState } from 'react';
import { X, AlertTriangle, Settings as SettingsIcon, History, Download, RefreshCw } from 'lucide-react';
import useOrderStore from '../store/orderStore';
import useDailySalesStore from '../store/dailySalesStore';
import useStaffStore from '../store/staffStore';
import useRegisterCashStore from '../store/registerCashStore';
import { format, subDays, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { formatPrice } from '../utils/price';
import { getBusinessDate } from '../utils/businessHours';
import HistoryViewer from './HistoryViewer';
import PinCodeModal from './PinCodeModal';
import ResetProgressModal from './ResetProgressModal';

interface SettingsProps {
  onClose: () => void;
}

interface ResetStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  action: () => Promise<void>;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const { deleteAllOrders, resetStore: resetOrderStore } = useOrderStore();
  const { deleteAllDailySales, resetStore: resetDailySalesStore } = useDailySalesStore();
  const { resetStore: resetStaffStore } = useStaffStore();
  const { resetStore: resetRegisterCash } = useRegisterCashStore();
  const [showConfirm, setShowConfirm] = useState<'local' | 'full' | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showPinCode, setShowPinCode] = useState<'local' | 'full' | 'export' | null>(null);
  const [resetSteps, setResetSteps] = useState<ResetStep[]>([]);
  const [showProgress, setShowProgress] = useState(false);

  const createResetSteps = (type: 'local' | 'full'): ResetStep[] => {
    const steps: ResetStep[] = [
      {
        id: 'register_cash',
        label: 'レジ金確認データのリセット',
        status: 'pending',
        action: async () => {
          if (resetRegisterCash) {
            resetRegisterCash();
          }
        }
      },
      {
        id: 'daily_sales',
        label: '売上集計データのリセット',
        status: 'pending',
        action: async () => {
          if (type === 'full') {
            await deleteAllDailySales();
          }
          resetDailySalesStore();
        }
      },
      {
        id: 'orders',
        label: '伝票データのリセット',
        status: 'pending',
        action: async () => {
          if (type === 'full') {
            await deleteAllOrders();
          }
          resetOrderStore();
        }
      }
    ];

    return steps;
  };

  const executeResetSteps = async (steps: ResetStep[]) => {
    for (const step of steps) {
      try {
        setResetSteps(current =>
          current.map(s =>
            s.id === step.id ? { ...s, status: 'processing' } : s
          )
        );

        await step.action();

        setResetSteps(current =>
          current.map(s =>
            s.id === step.id ? { ...s, status: 'completed' } : s
          )
        );
      } catch (error) {
        console.error(`Error in step ${step.id}:`, error);
        setResetSteps(current =>
          current.map(s =>
            s.id === step.id
              ? {
                  ...s,
                  status: 'error',
                  error: error instanceof Error ? error.message : '不明なエラーが発生しました'
                }
              : s
          )
        );
        return false;
      }
    }
    return true;
  };

  const handleLocalReset = () => {
    setShowPinCode('local');
  };

  const handleFullDelete = () => {
    setShowPinCode('full');
  };

  const handleExportCSV = () => {
    setShowPinCode('export');
  };

  const handlePinCodeConfirm = async () => {
    try {
      switch (showPinCode) {
        case 'local':
        case 'full':
          const steps = createResetSteps(showPinCode);
          setResetSteps(steps);
          setShowProgress(true);
          const success = await executeResetSteps(steps);
          if (success) {
            setTimeout(() => {
              setShowProgress(false);
              onClose();
              alert(showPinCode === 'local' ? '画面をリセットしました' : '全てのデータを削除しました');
            }, 1000);
          }
          break;

        case 'export':
          await handleExportData();
          break;
      }
    } catch (error) {
      console.error('Operation failed:', error);
      alert('操作に失敗しました');
    } finally {
      setShowPinCode(null);
      setShowConfirm(null);
    }
  };

  const handlePinCodeCancel = () => {
    setShowPinCode(null);
    setShowConfirm(null);
  };

  const handleRetry = async () => {
    const failedSteps = resetSteps.filter(step => step.status === 'error');
    setResetSteps(current =>
      current.map(step =>
        step.status === 'error' ? { ...step, status: 'pending', error: undefined } : step
      )
    );
    const success = await executeResetSteps(failedSteps);
    if (success) {
      setTimeout(() => {
        setShowProgress(false);
        onClose();
        alert(showPinCode === 'local' ? '画面をリセットしました' : '全てのデータを削除しました');
      }, 1000);
    }
  };

  const handleProgressClose = () => {
    setShowProgress(false);
    if (!resetSteps.some(step => step.status === 'error')) {
      onClose();
    }
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);

      const businessDate = getBusinessDate();
      const dateStr = format(parseISO(businessDate), 'yyyyMMdd', { locale: ja });

      // Get last 30 days
      const today = new Date();
      const dates = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(today, i);
        return format(date, 'yyyy-MM-dd', { locale: ja });
      });

      // Prepare CSV content
      const headers = [
        '日付',
        '総売上',
        '現金売上',
        'カード売上',
        '電子マネー売上',
        '来店組数',
        '来店人数',
        'キャスト売上'
      ];

      const rows = dates.map(date => {
        const sales = useDailySalesStore.getState().currentSales;
        if (sales?.businessDate === date) {
          return [
            date,
            formatPrice(sales.totalSales),
            formatPrice(sales.cashSales),
            formatPrice(sales.cardSales),
            formatPrice(sales.electronicSales),
            sales.totalGroups.toString(),
            sales.totalGuests.toString(),
            sales.castSales.map(cast => 
              `${cast.name}(${formatPrice(cast.referralAmount)})`
            ).join('; ')
          ];
        }
        return [date, '0', '0', '0', '0', '0', '0', ''];
      });

      // Create CSV content with BOM for UTF-8
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `売上データ_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export error:', error);
      alert('データのエクスポートに失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
        <div className="bg-white rounded-lg p-6 w-[480px] max-w-[90vw]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              <h2 className="text-xl font-bold">設定</h2>
            </div>
            <button onClick={onClose}>
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <button
              className="w-full bg-blue-600 text-white py-3 rounded-lg flex items-center justify-center gap-2"
              onClick={handleExportCSV}
              disabled={isExporting}
            >
              <Download className="w-5 h-5" />
              <span>売上データCSVダウンロード</span>
              {isExporting && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent ml-2"></div>
              )}
            </button>

            <button
              className="w-full bg-purple-600 text-white py-3 rounded-lg flex items-center justify-center gap-2"
              onClick={() => setShowHistory(true)}
            >
              <History className="w-5 h-5" />
              <span>閲覧履歴を表示</span>
            </button>

            <div className="border-t pt-4 space-y-4">
              <button
                className="w-full bg-blue-600 text-white py-3 rounded-lg flex items-center justify-center gap-2"
                onClick={handleLocalReset}
              >
                <RefreshCw className="w-5 h-5" />
                画面をリセット
              </button>
              <button
                className="w-full bg-red-600 text-white py-3 rounded-lg"
                onClick={handleFullDelete}
              >
                全データを削除
              </button>
              <p className="text-sm text-gray-500 mt-2">
                ※画面リセットはデータベースのデータを保持したまま画面表示のみをクリアします
              </p>
            </div>
          </div>
        </div>
      </div>

      {showHistory && (
        <HistoryViewer onClose={() => setShowHistory(false)} />
      )}

      {showPinCode && (
        <PinCodeModal
          onConfirm={handlePinCodeConfirm}
          onCancel={handlePinCodeCancel}
          message={
            showPinCode === 'local' ? '画面をリセットするには、PINコードを入力してください。' :
            showPinCode === 'full' ? '全データを削除するには、PINコードを入力してください。' :
            'データをエクスポートするには、PINコードを入力してください。'
          }
          confirmText={
            showPinCode === 'local' ? 'リセット' :
            showPinCode === 'full' ? '削除' :
            'エクスポート'
          }
          confirmColor={
            showPinCode === 'local' ? 'blue' :
            showPinCode === 'full' ? 'red' :
            'green'
          }
        />
      )}

      {showProgress && (
        <ResetProgressModal
          steps={resetSteps}
          onRetry={handleRetry}
          onClose={handleProgressClose}
        />
      )}
    </>
  );
};

export default Settings;