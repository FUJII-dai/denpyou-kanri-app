import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, X, CircleDollarSign, RefreshCw, Wallet, Calculator, Download } from 'lucide-react';
import useRegisterCashStore from '../store/registerCashStore';
import useOrderStore from '../store/orderStore';
import { getBusinessDate } from '../utils/businessHours';
import { formatPrice } from '../utils/price';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

const NumericInput: React.FC<{
  value: string | number;
  onChange: (value: number) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}> = ({ value, onChange, placeholder = "0", label, disabled = false, className = "" }) => {
  const [inputValue, setInputValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = e.target.value.replace(/[^0-9]/g, '');
    setInputValue(sanitizedValue);
    
    if (sanitizedValue) {
      onChange(parseInt(sanitizedValue, 10));
    } else {
      onChange(0);
    }
  };
  
  return (
    <div className={className}>
      {label && <label className="block text-sm text-gray-600 mb-1">{label}</label>}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className="border rounded-md p-2 w-full"
        value={inputValue}
        onChange={handleChange}
        onFocus={() => {
          if (inputRef.current) {
            inputRef.current.select();
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
};

interface RegisterCashProps {
  onBack?: () => void;
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
  const [businessDate, setBusinessDate] = useState(getBusinessDate());
  const mountedRef = useRef(false);
  const initAttempts = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    
    const initializeData = async () => {
      if (!mountedRef.current) return;
      
      try {
        setError(null);
        console.log('[RegisterCash.new] Initializing with business date:', businessDate);
        await loadRegisterCash(businessDate);
        
        if (mountedRef.current) {
          console.log('[RegisterCash.new] Initialization successful');
          setIsInitialized(true);
        }
      } catch (error) {
        if (!mountedRef.current) return;
        
        console.error('[RegisterCash.new] Initialization error:', error);
        setError('データの読み込みに失敗しました。再試行してください。');
        
        if (initAttempts.current < 3) {
          initAttempts.current += 1;
          console.log(`[RegisterCash.new] Retrying initialization (attempt ${initAttempts.current}/3)...`);
          setTimeout(initializeData, 1000);
        } else {
          console.log('[RegisterCash.new] Max retry attempts reached, continuing with default values');
          setIsInitialized(true);
        }
      }
    };

    initializeData();

    return () => {
      mountedRef.current = false;
    };
  }, [businessDate, loadRegisterCash]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    setError(null);
    
    try {
      const date = getBusinessDate();
      setBusinessDate(date);
      await loadRegisterCash(date);
      console.log('[RegisterCash.new] Data refreshed successfully');
    } catch (error) {
      console.error('[RegisterCash.new] Refresh error:', error);
      setError('データの更新に失敗しました。');
    } finally {
      setIsRefreshing(false);
    }
  };

  const safeUpdateStartingAmount = async (amount: number) => {
    try {
      console.log('[RegisterCash.new] Updating starting amount:', amount);
      await updateStartingAmount(amount);
    } catch (error) {
      console.error('[RegisterCash.new] Failed to update starting amount:', error);
      setError('開始レジ金の更新に失敗しました。');
    }
  };

  const safeUpdateCoinsAmount = async (amount: number) => {
    try {
      console.log('[RegisterCash.new] Updating coins amount:', amount);
      await updateCoinsAmount(amount);
    } catch (error) {
      console.error('[RegisterCash.new] Failed to update coins amount:', error);
      setError('小銭の更新に失敗しました。');
    }
  };

  const safeUpdateNextDayAmount = async (amount: number) => {
    try {
      console.log('[RegisterCash.new] Updating next day amount:', amount);
      await updateNextDayAmount(amount);
    } catch (error) {
      console.error('[RegisterCash.new] Failed to update next day amount:', error);
      setError('翌日レジ金の更新に失敗しました。');
    }
  };

  const safeUpdateNextDayCoins = async (amount: number) => {
    try {
      console.log('[RegisterCash.new] Updating next day coins:', amount);
      await updateNextDayCoins(amount);
    } catch (error) {
      console.error('[RegisterCash.new] Failed to update next day coins:', error);
      setError('翌日小銭の更新に失敗しました。');
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
        console.log('[RegisterCash.new] Adding withdrawal:', { amount, note: form.note });
        await addWithdrawal(amount, form.note || undefined);
        
        const newForms = [...withdrawalForms];
        newForms[index] = { amount: '', note: '' };
        
        if (index === withdrawalForms.length - 1) {
          newForms.push({ amount: '', note: '' });
        }
        
        setWithdrawalForms(newForms);
      } catch (error) {
        console.error('[RegisterCash.new] Failed to add withdrawal:', error);
        setError('出金の追加に失敗しました。');
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
    try {
      const dateStr = format(parseISO(businessDate), 'yyyyMMdd', { locale: ja });
      const currentTotal = calculateCurrentTotal();
      const cashCollection = calculateCashCollection();
      const totalWithdrawals = calculateTotalWithdrawals();

      const headers = ['項目', '金額', '備考'];

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
      
      console.log('[RegisterCash.new] CSV exported successfully');
    } catch (error) {
      console.error('[RegisterCash.new] Failed to export CSV:', error);
      setError('CSVのエクスポートに失敗しました。');
    }
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
        <header className="bg-purple-800 text-white p-4">
          <h1 className="text-xl font-bold">レジ金確認</h1>
        </header>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-800 border-t-transparent mb-4"></div>
            <p className="text-gray-600">読み込み中...</p>
            {initAttempts.current > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                再試行中... ({initAttempts.current}/3)
              </p>
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
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mx-4 mt-4 relative">
          <span className="block sm:inline">{error}</span>
          <button 
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <X className="h-4 w-4" />
          </button>
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
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-full border rounded-md p-2"
                        value={form.amount}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          handleWithdrawalChange(index, 'amount', value);
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder="出金額"
                      />
                    </div>
                    <div className="col-span-7">
                      <input
                        type="text"
                        className="w-full border rounded-md p-2"
                        value={form.note}
                        onChange={(e) => handleWithdrawalChange(index, 'note', e.target.value)}
                        placeholder="備考（任意）"
                      />
                    </div>
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
