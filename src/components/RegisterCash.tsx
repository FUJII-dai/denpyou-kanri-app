import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, X, CircleDollarSign, RefreshCw, Wallet, Calculator, Download } from 'lucide-react';
import useRegisterCashStore from '../store/registerCashStore';
import useOrderStore from '../store/orderStore';
import { getBusinessDate } from '../utils/businessHours';
import { formatPrice } from '../utils/price';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

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
  const mountedRef = useRef(false);

  const [forceInitialized, setForceInitialized] = useState(false);
  const [showError, setShowError] = useState(false);
  const [inputEnabled, setInputEnabled] = useState(false);
  
  useEffect(() => {
    const fromFixTool = sessionStorage.getItem('register-cash-force-init') === 'true';
    if (fromFixTool) {
      console.log('[RegisterCash] Returning from fix tool, forcing initialization');
      setForceInitialized(true);
      setInputEnabled(true);
      sessionStorage.removeItem('register-cash-force-init');
    }
  }, []);
  
  useEffect(() => {
    mountedRef.current = true;
    const businessDate = getBusinessDate();
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    const timeoutDuration = isMobile ? 2000 : 5000; // 2 seconds for mobile, 5 for desktop
    
    console.log(`[RegisterCash] Device type: ${isMobile ? 'Mobile' : 'Desktop'}, timeout: ${timeoutDuration}ms`);

    const initializeData = async () => {
      try {
        await loadRegisterCash(businessDate);
        setInputEnabled(true);
      } catch (error) {
        console.error('[RegisterCash] Initialization error:', error);
      }
    };

    initializeData();

    const errorTimeoutId = setTimeout(() => {
      setShowError(true);
    }, 2000);

    const timeoutId = setTimeout(() => {
      console.log('[RegisterCash] Forcing initialization due to timeout');
      setForceInitialized(true);
      setInputEnabled(true);
    }, timeoutDuration);

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
      clearTimeout(errorTimeoutId);
    };
  }, [loadRegisterCash]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    const businessDate = getBusinessDate();
    
    try {
      await loadRegisterCash(businessDate);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStartingAmountChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    const amount = parseInt(value) || 0;
    console.log('[RegisterCash] Updating starting amount:', value, amount);
    try {
      await updateStartingAmount(amount);
    } catch (error) {
      console.error('[RegisterCash] Failed to update starting amount:', error);
    }
  };

  const handleCoinsAmountChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    const amount = parseInt(value) || 0;
    console.log('[RegisterCash] Updating coins amount:', value, amount);
    try {
      await updateCoinsAmount(amount);
    } catch (error) {
      console.error('[RegisterCash] Failed to update coins amount:', error);
    }
  };

  const handleNextDayAmountChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    const amount = parseInt(value) || 0;
    console.log('[RegisterCash] Updating next day amount:', value, amount);
    try {
      await updateNextDayAmount(amount);
    } catch (error) {
      console.error('[RegisterCash] Failed to update next day amount:', error);
    }
  };

  const handleNextDayCoinsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    const amount = parseInt(value) || 0;
    console.log('[RegisterCash] Updating next day coins:', value, amount);
    try {
      await updateNextDayCoins(amount);
    } catch (error) {
      console.error('[RegisterCash] Failed to update next day coins:', error);
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
        await addWithdrawal(amount, form.note || undefined);
        const newForms = [...withdrawalForms];
        newForms[index] = { amount: '', note: '' };
        if (index === withdrawalForms.length - 1) {
          newForms.push({ amount: '', note: '' });
        }
        setWithdrawalForms(newForms);
      } catch (error) {
        console.error('[RegisterCash] Failed to add withdrawal:', error);
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

  console.log('[RegisterCash] Loading state:', { 
    isRegisterLoading, 
    registerInitialized, 
    forceInitialized,
    showError,
    inputEnabled
  });
  
  if ((isRegisterLoading || !registerInitialized) && !forceInitialized) {
    return (
      <div className="flex flex-col h-screen bg-gray-100">
        <header className="bg-purple-800 text-white p-4">
          <h1 className="text-xl font-bold">レジ金確認</h1>
        </header>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-800 border-t-transparent mb-4"></div>
            <p className="text-gray-600">読み込み中...</p>
            
            {showError && (
              <div className="mt-4 p-4 bg-yellow-100 rounded-md">
                <p className="text-red-600 font-bold">読み込みに時間がかかっています</p>
                <p className="text-gray-700 mt-2">
                  データベースの接続に問題がある可能性があります。
                </p>
                <a 
                  href="/register-cash-direct-fix.html" 
                  className="mt-3 inline-block bg-blue-600 text-white px-4 py-2 rounded-md"
                >
                  修正ツールを開く
                </a>
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
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>
        </div>
      </header>

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
            <div>
              <label className="block text-sm text-gray-600 mb-1">開始レジ金</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="border rounded-md p-2 w-full"
                value={currentCash?.startingAmount || ''}
                onChange={handleStartingAmountChange}
                onFocus={(e) => e.target.select()}
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">小銭</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="border rounded-md p-2 w-full"
                value={currentCash?.coinsAmount || ''}
                onChange={handleCoinsAmountChange}
                onFocus={(e) => e.target.select()}
                placeholder="0"
              />
            </div>

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
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="col-span-3 border rounded-md p-2"
                      value={form.amount}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        console.log('[RegisterCash] Updating withdrawal amount:', value);
                        handleWithdrawalChange(index, 'amount', value);
                      }}
                      onFocus={(e) => e.target.select()}
                      placeholder="出金額"
                    />
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
            <div>
              <label className="block text-sm text-gray-600 mb-1">翌日レジ金</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="border rounded-md p-2 w-full"
                value={currentCash?.nextDayAmount || ''}
                onChange={handleNextDayAmountChange}
                onFocus={(e) => e.target.select()}
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">翌日小銭</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="border rounded-md p-2 w-full"
                value={currentCash?.nextDayCoins || ''}
                onChange={handleNextDayCoinsChange}
                onFocus={(e) => e.target.select()}
                placeholder="0"
              />
            </div>
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
