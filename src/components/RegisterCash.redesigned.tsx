import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, X, CircleDollarSign, RefreshCw, Wallet, Calculator, Download } from 'lucide-react';
import useRegisterCashStore from '../store/registerCashStore';
import useOrderStore from '../store/orderStore';
import { getBusinessDate } from '../utils/businessHours';
import { formatPrice } from '../utils/price';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import NumericInput from './ui/NumericInput';

interface RegisterCashProps {
  onBack: () => void;
}

const RegisterCash: React.FC<RegisterCashProps> = ({ onBack }) => {
  const { orders } = useOrderStore();
  const { 
    currentCash, 
    isLoading: isRegisterLoading,
    updateStartingAmount, 
    updateCoinsAmount, 
    addWithdrawal, 
    removeWithdrawal, 
    loadRegisterCash,
    initialized: registerInitialized,
    updateNextDayAmount,
    updateNextDayCoins
  } = useRegisterCashStore();

  const [withdrawalForms, setWithdrawalForms] = useState([{ amount: '', note: '' }]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const mountedRef = useRef(false);
  const initAttemptedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    const businessDate = getBusinessDate();

    const initializeData = async () => {
      if (!mountedRef.current) return;
      if (initAttemptedRef.current) return;
      
      initAttemptedRef.current = true;
      setError(null);
      
      try {
        console.log('[RegisterCash] Initializing data for business date:', businessDate);
        await loadRegisterCash(businessDate);
        if (mountedRef.current) {
          setIsInitialized(true);
          console.log('[RegisterCash] Initialization successful');
        }
      } catch (error) {
        console.error('[RegisterCash] Initialization error:', error);
        if (mountedRef.current) {
          setError('データの読み込みに失敗しました。再試行してください。');
          if (retryCount < 3) {
            setTimeout(() => {
              if (mountedRef.current) {
                setRetryCount(prev => prev + 1);
                initAttemptedRef.current = false;
                initializeData();
              }
            }, 2000);
          }
        }
      }
    };

    initializeData();

    return () => {
      mountedRef.current = false;
    };
  }, [loadRegisterCash, retryCount]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    setError(null);
    const businessDate = getBusinessDate();
    
    try {
      await loadRegisterCash(businessDate);
      setIsInitialized(true);
    } catch (error) {
      console.error('[RegisterCash] Refresh error:', error);
      setError('データの更新に失敗しました。再試行してください。');
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  };

  const safeUpdateStartingAmount = async (amount: number) => {
    try {
      await updateStartingAmount(amount);
    } catch (error) {
      console.error('[RegisterCash] Failed to update starting amount:', error);
      setError('開始レジ金の更新に失敗しました。再試行してください。');
    }
  };

  const safeUpdateCoinsAmount = async (amount: number) => {
    try {
      await updateCoinsAmount(amount);
    } catch (error) {
      console.error('[RegisterCash] Failed to update coins amount:', error);
      setError('小銭の更新に失敗しました。再試行してください。');
    }
  };

  const safeUpdateNextDayAmount = async (amount: number) => {
    try {
      await updateNextDayAmount(amount);
    } catch (error) {
      console.error('[RegisterCash] Failed to update next day amount:', error);
      setError('翌日レジ金の更新に失敗しました。再試行してください。');
    }
  };

  const safeUpdateNextDayCoins = async (amount: number) => {
    try {
      await updateNextDayCoins(amount);
    } catch (error) {
      console.error('[RegisterCash] Failed to update next day coins:', error);
      setError('翌日小銭の更新に失敗しました。再試行してください。');
    }
  };

  const handleWithdrawalChange = (index: number, field: 'amount' | 'note', value: string) => {
    const newForms = [...withdrawalForms];
    newForms[index] = { ...newForms[index], [field]: value };
    setWithdrawalForms(newForms);
  };

  const handleAddWithdrawalForm = () => {
    setWithdrawalForms([...withdrawalForms, { amount: '', note: '' }]);
  };

  const handleRemoveWithdrawalForm = (index: number) => {
    const newForms = withdrawalForms.filter((_, i) => i !== index);
    setWithdrawalForms(newForms);
  };

  const handleSubmitWithdrawal = async (index: number) => {
    const form = withdrawalForms[index];
    const amount = parseInt(form.amount);
    if (amount > 0) {
      try {
        setError(null);
        await addWithdrawal(amount, form.note || undefined);
        const newForms = [...withdrawalForms];
        newForms[index] = { amount: '', note: '' };
        if (index === withdrawalForms.length - 1) {
          newForms.push({ amount: '', note: '' });
        }
        setWithdrawalForms(newForms);
      } catch (error) {
        console.error('[RegisterCash] Failed to add withdrawal:', error);
        setError('出金の追加に失敗しました。再試行してください。');
      }
    }
  };

  const calculateTotalWithdrawals = () => {
    if (!currentCash?.withdrawals) return 0;
    return currentCash.withdrawals.reduce((sum, w) => sum + w.amount, 0);
  };

  const calculateCurrentCashSales = () => {
    return orders
      .filter(order => order.status === 'completed')
      .reduce((total, order) => {
        if (order.paymentMethod === 'cash') {
          return total + Math.floor(order.totalAmount / 100) * 100;
        }
        if (order.paymentMethod === 'partial_cash' && order.paymentDetails?.cashAmount) {
          return total + order.paymentDetails.cashAmount;
        }
        return total;
      }, 0);
  };

  const calculateCurrentTotal = () => {
    const cashSales = calculateCurrentCashSales();
    const startingAmount = currentCash?.startingAmount || 0;
    const coinsAmount = currentCash?.coinsAmount || 0;
    const totalWithdrawals = calculateTotalWithdrawals();

    return cashSales + startingAmount + coinsAmount - totalWithdrawals;
  };

  const calculateCashCollection = () => {
    const currentTotal = calculateCurrentTotal();
    const nextAmount = currentCash?.nextDayAmount || 0;
    const nextCoins = currentCash?.nextDayCoins || 0;
    return currentTotal - nextAmount - nextCoins;
  };

  const handleExportCSV = () => {
    const businessDate = getBusinessDate();
    const dateStr = format(parseISO(businessDate), 'yyyyMMdd', { locale: ja });
    const currentTotal = calculateCurrentTotal();
    const cashCollection = calculateCashCollection();
    const totalWithdrawals = calculateTotalWithdrawals();

    const headers = [
      '項目',
      '金額',
      '備考'
    ];

    const rows = [
      ['現金売上', calculateCurrentCashSales()],
      ['開始レジ金', currentCash?.startingAmount || 0],
      ['小銭', currentCash?.coinsAmount || 0],
      ['出金合計', totalWithdrawals],
      ['現在レジ金', currentTotal],
      ['翌日レジ金', currentCash?.nextDayAmount || 0],
      ['翌日小銭', currentCash?.nextDayCoins || 0],
      ['現金回収', cashCollection]
    ];

    if (currentCash?.withdrawals.length) {
      rows.push(['', '', '']);
      rows.push(['出金履歴', '', '']);
      currentCash.withdrawals.forEach(withdrawal => {
        rows.push([
          format(new Date(withdrawal.timestamp), 'HH:mm', { locale: ja }),
          withdrawal.amount,
          withdrawal.note || ''
        ]);
      });
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        const value = typeof cell === 'number' ? cell.toString() : cell;
        return value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ].join('\n');

    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `レジ金確認_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  if (isRegisterLoading || !registerInitialized || !isInitialized) {
    return (
      <div className="flex flex-col h-screen bg-gray-100">
        <header className="bg-purple-800 text-white p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">レジ金確認</h1>
          <button 
            className="bg-blue-600 text-white py-1 px-3 rounded-md text-sm flex items-center gap-2"
            onClick={handleBack}
          >
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>
        </header>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-800 border-t-transparent mb-4"></div>
            <p className="text-gray-600">読み込み中...</p>
            {error && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md max-w-md mx-auto">
                <p className="font-bold">エラー</p>
                <p>{error}</p>
                <button 
                  className="mt-2 bg-red-600 text-white py-1 px-3 rounded-md text-sm"
                  onClick={handleRefresh}
                >
                  再試行
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-purple-800 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">レジ金確認</h1>
        <div className="flex items-center gap-2">
          <button
            className="bg-green-600 text-white py-1 px-3 rounded-md text-sm flex items-center gap-2"
            onClick={handleExportCSV}
          >
            <Download className="w-4 h-4" />
            CSV出力
          </button>
          <button
            className="bg-green-600 text-white py-1 px-3 rounded-md text-sm flex items-center gap-2"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            更新
          </button>
          <button 
            className="bg-blue-600 text-white py-1 px-3 rounded-md text-sm flex items-center gap-2"
            onClick={handleBack}
          >
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>
        </div>
      </header>

      {error && (
        <div className="m-4 p-3 bg-red-100 text-red-700 rounded-md">
          <p className="font-bold">エラー</p>
          <p>{error}</p>
        </div>
      )}

      <div className="p-4 space-y-4 overflow-auto">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-2 mb-4">
            <CircleDollarSign className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold">現時点の現金売上</h2>
          </div>
          <div className="text-2xl font-bold text-green-600">
            ¥{formatPrice(calculateCurrentCashSales())}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold">レジ金設定</h2>
          </div>
          
          <div className="space-y-4">
            <NumericInput
              label="開始レジ金"
              value={currentCash?.startingAmount || 0}
              onChange={safeUpdateStartingAmount}
              placeholder="0"
            />

            <NumericInput
              label="小銭"
              value={currentCash?.coinsAmount || 0}
              onChange={safeUpdateCoinsAmount}
              placeholder="0"
            />

            <div>
              <div className="flex justify-between items-center mb-2">
                <div>
                  <label className="block text-sm text-gray-600">出金履歴</label>
                  <div className="text-xs text-gray-500">
                    合計: ¥{formatPrice(calculateTotalWithdrawals())}
                  </div>
                </div>
                <button
                  className="text-blue-600 text-sm flex items-center gap-1"
                  onClick={handleAddWithdrawalForm}
                >
                  <Plus className="w-4 h-4" />
                  フォーム追加
                </button>
              </div>

              {currentCash?.withdrawals.map(withdrawal => (
                <div key={withdrawal.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-md mb-2">
                  <span className="flex-1">¥{formatPrice(withdrawal.amount)}</span>
                  {withdrawal.note && (
                    <span className="text-sm text-gray-600">{withdrawal.note}</span>
                  )}
                  <button
                    className="text-red-500"
                    onClick={() => removeWithdrawal(withdrawal.id)}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <div className="space-y-2">
                {withdrawalForms.map((form, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2">
                    <div className="col-span-3">
                      <NumericInput
                        value={form.amount}
                        onChange={(value) => handleWithdrawalChange(index, 'amount', value.toString())}
                        placeholder="出金額"
                        className="w-full"
                      />
                    </div>
                    <input
                      type="text"
                      className="col-span-7 border rounded-md p-2"
                      value={form.note}
                      onChange={(e) => handleWithdrawalChange(index, 'note', e.target.value)}
                      placeholder="備考（任意）"
                    />
                    <div className="col-span-2 flex gap-1">
                      <button
                        className="flex-1 bg-blue-600 text-white p-2 rounded-md"
                        onClick={() => handleSubmitWithdrawal(index)}
                        disabled={!form.amount}
                      >
                        <Plus className="w-4 h-4 mx-auto" />
                      </button>
                      {withdrawalForms.length > 1 && (
                        <button
                          className="flex-1 bg-red-600 text-white p-2 rounded-md"
                          onClick={() => handleRemoveWithdrawalForm(index)}
                        >
                          <X className="w-4 h-4 mx-auto" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold">翌日レジ金設定</h2>
          </div>
          
          <div className="space-y-4">
            <NumericInput
              label="翌日レジ金"
              value={currentCash?.nextDayAmount || 0}
              onChange={safeUpdateNextDayAmount}
              placeholder="0"
            />

            <NumericInput
              label="翌日小銭"
              value={currentCash?.nextDayCoins || 0}
              onChange={safeUpdateNextDayCoins}
              placeholder="0"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="font-bold mb-2">現金回収</h2>
          <div className="text-2xl font-bold text-blue-600">
            ¥{formatPrice(calculateCashCollection())}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            (現在レジ金 - 翌日レジ金 - 翌日小銭)
          </div>
          <div className="mt-2 text-sm text-gray-600">
            <div>現在レジ金: ¥{formatPrice(calculateCurrentTotal())}</div>
            <div>翌日レジ金: ¥{formatPrice(currentCash?.nextDayAmount || 0)}</div>
            <div>翌日小銭: ¥{formatPrice(currentCash?.nextDayCoins || 0)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterCash;
