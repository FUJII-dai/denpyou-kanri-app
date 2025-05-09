import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useRegisterCashStore from '../store/registerCashStore.new';
import useOrderStore from '../store/orderStore';
import { getBusinessDate } from '../utils/businessHours';
import RegisterCashForm from './forms/RegisterCashForm';
import PageWrapper from './ui/PageWrapper';
import LoadingSpinner from './ui/LoadingSpinner';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * RegisterCash component with improved architecture
 */
const RegisterCash: React.FC = () => {
  const navigate = useNavigate();
  const { orders } = useOrderStore();
  const { 
    currentCash, 
    isLoading,
    updateStartingAmount, 
    updateCoinsAmount, 
    addWithdrawal, 
    removeWithdrawal, 
    loadRegisterCash,
    initialized,
    updateNextDayAmount,
    updateNextDayCoins,
    error
  } = useRegisterCashStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showError, setShowError] = useState(false);
  const [forceInitialized, setForceInitialized] = useState(false);

  useEffect(() => {
    const fromFixTool = sessionStorage.getItem('register-cash-force-init') === 'true';
    if (fromFixTool) {
      console.log('[RegisterCash] Returning from fix tool, forcing initialization');
      setForceInitialized(true);
      sessionStorage.removeItem('register-cash-force-init');
    }
  }, []);

  useEffect(() => {
    const businessDate = getBusinessDate();
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const timeoutDuration = isMobile ? 2000 : 5000; // 2 seconds for mobile, 5 for desktop
    
    console.log(`[RegisterCash] Device type: ${isMobile ? 'Mobile' : 'Desktop'}, timeout: ${timeoutDuration}ms`);

    const initializeData = async () => {
      try {
        await loadRegisterCash(businessDate);
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
    }, timeoutDuration);

    return () => {
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

  const handleExportCSV = () => {
    if (!currentCash) return;
    
    const businessDate = getBusinessDate();
    const dateStr = format(parseISO(businessDate), 'yyyyMMdd', { locale: ja });
    const cashSales = calculateCurrentCashSales();
    
    const totalWithdrawals = currentCash.withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const currentTotal = cashSales + currentCash.startingAmount + currentCash.coinsAmount - totalWithdrawals;
    const cashCollection = currentTotal - currentCash.nextDayAmount - currentCash.nextDayCoins;

    const headers = [
      '項目',
      '金額',
      '備考'
    ];

    const rows = [
      ['現金売上', cashSales],
      ['開始レジ金', currentCash.startingAmount],
      ['小銭', currentCash.coinsAmount],
      ['出金合計', totalWithdrawals],
      ['現在レジ金', currentTotal],
      ['翌日レジ金', currentCash.nextDayAmount],
      ['翌日小銭', currentCash.nextDayCoins],
      ['現金回収', cashCollection]
    ];

    if (currentCash.withdrawals.length) {
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
    navigate('/');
  };

  if ((isLoading || !initialized) && !forceInitialized) {
    return (
      <PageWrapper title="レジ金確認" showBackButton={false}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <LoadingSpinner size="md" text="読み込み中..." />
            
            {showError && (
              <div className="mt-4 p-4 bg-yellow-100 rounded-md">
                <p className="text-red-600 font-bold">読み込みに時間がかかっています</p>
                <p className="text-gray-700 mt-2">
                  データベースの接続に問題がある可能性があります。
                </p>
                <a 
                  href="/register_cash_setup_direct.html" 
                  className="mt-3 inline-block bg-blue-600 text-white px-4 py-2 rounded-md"
                >
                  修正ツールを開く
                </a>
              </div>
            )}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (error && !currentCash) {
    return (
      <PageWrapper title="レジ金確認" onBack={handleBack}>
        <div className="p-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h2 className="text-lg font-bold text-red-700 mb-2">エラーが発生しました</h2>
            <p className="text-red-600 mb-4">
              データの読み込み中にエラーが発生しました。
            </p>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
              {error.message}
            </pre>
            <div className="mt-4 flex gap-2">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-md"
                onClick={handleRefresh}
              >
                再読み込み
              </button>
              <a 
                href="/register_cash_setup_direct.html" 
                className="bg-green-600 text-white px-4 py-2 rounded-md"
              >
                修正ツールを開く
              </a>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper 
      title="レジ金確認" 
      onBack={handleBack}
    >
      <RegisterCashForm
        currentCash={currentCash}
        cashSales={calculateCurrentCashSales()}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        onUpdateStartingAmount={updateStartingAmount}
        onUpdateCoinsAmount={updateCoinsAmount}
        onUpdateNextDayAmount={updateNextDayAmount}
        onUpdateNextDayCoins={updateNextDayCoins}
        onAddWithdrawal={addWithdrawal}
        onRemoveWithdrawal={removeWithdrawal}
        onExportCSV={handleExportCSV}
      />
    </PageWrapper>
  );
};

export default RegisterCash;
