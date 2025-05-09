import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, X, CircleDollarSign, RefreshCw, Wallet, Calculator, Download, AlertCircle } from 'lucide-react';
import useRegisterCashStore from '../store/registerCashStore';
import useOrderStore from '../store/orderStore';
import { getBusinessDate } from '../utils/businessHours';
import { formatPrice } from '../utils/price';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { supabase } from '../lib/supabase';

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
    updateNextDayCoins,
    resetStore
  } = useRegisterCashStore();

  const [withdrawalForms, setWithdrawalForms] = useState([{ amount: '', note: '' }]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const isMobile = useRef(window.innerWidth < 768);

  const ensureRegisterCashTable = async () => {
    try {
      console.log('[RegisterCash] Ensuring register_cash table exists');
      
      const { error: checkError } = await supabase
        .from('register_cash')
        .select('*')
        .limit(1);
      
      if (checkError) {
        console.error('[RegisterCash] Error checking register_cash table:', checkError);
        
        console.log('[RegisterCash] Attempting to create register_cash table using execute_sql');
        
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS register_cash (
            business_date date PRIMARY KEY,
            starting_amount integer DEFAULT 0,
            coins_amount integer DEFAULT 0,
            withdrawals jsonb DEFAULT '[]'::jsonb,
            next_day_amount integer DEFAULT 0,
            next_day_coins integer DEFAULT 0,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
          );
          
          ALTER TABLE register_cash ENABLE ROW LEVEL SECURITY;
          
          DROP POLICY IF EXISTS "Anyone can read register_cash" ON register_cash;
          DROP POLICY IF EXISTS "Anyone can insert register_cash" ON register_cash;
          DROP POLICY IF EXISTS "Anyone can update register_cash" ON register_cash;
          
          CREATE POLICY "Anyone can read register_cash"
            ON register_cash FOR SELECT
            TO anon
            USING (true);
          
          CREATE POLICY "Anyone can insert register_cash"
            ON register_cash FOR INSERT
            TO anon
            WITH CHECK (true);
          
          CREATE POLICY "Anyone can update register_cash"
            ON register_cash FOR UPDATE
            TO anon
            USING (true)
            WITH CHECK (true);
          
          CREATE OR REPLACE FUNCTION update_updated_at_column()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = now();
            RETURN NEW;
          END;
          $$ language 'plpgsql';
          
          DROP TRIGGER IF EXISTS update_register_cash_updated_at ON register_cash;
          CREATE TRIGGER update_register_cash_updated_at
            BEFORE UPDATE ON register_cash
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
          
          ALTER PUBLICATION supabase_realtime ADD TABLE register_cash;
        `;
        
        try {
          const { data: sqlResult, error: sqlError } = await supabase
            .rpc('execute_sql', { query: createTableSQL });
          
          if (sqlError) {
            console.error('[RegisterCash] Failed to create table with execute_sql:', sqlError);
          } else {
            console.log('[RegisterCash] Table creation result:', sqlResult);
          }
        } catch (sqlExecError) {
          console.error('[RegisterCash] Error executing SQL:', sqlExecError);
        }
        
        console.log('[RegisterCash] Attempting to create register_cash record directly');
        
        const businessDate = getBusinessDate();
        const { error: insertError } = await supabase
          .from('register_cash')
          .upsert({
            business_date: businessDate,
            starting_amount: 0,
            coins_amount: 0,
            withdrawals: [],
            next_day_amount: 0,
            next_day_coins: 0
          });
        
        if (insertError) {
          console.error('[RegisterCash] Direct insert failed:', insertError);
          
          console.log('[RegisterCash] Continuing with empty register cash data');
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('[RegisterCash] Error in ensureRegisterCashTable:', error);
      
      console.log('[RegisterCash] Continuing with empty register cash data after error');
      return false;
    }
  };

  useEffect(() => {
    const checkMobile = () => {
      isMobile.current = window.innerWidth < 768;
      console.log('[RegisterCash] Mobile detection:', isMobile.current, 'width:', window.innerWidth);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const businessDate = getBusinessDate();
    
    console.log('[RegisterCash] Component mounted, isMobile:', isMobile.current);

    const initializeData = async () => {
      try {
        const tableCreated = await ensureRegisterCashTable();
        console.log('[RegisterCash] Table creation result:', tableCreated);
        
        const timeoutDuration = isMobile.current ? 3000 : 5000;
        console.log(`[RegisterCash] Starting initialization with ${timeoutDuration}ms timeout`);
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Loading timeout')), timeoutDuration);
        });
        
        try {
          await Promise.race([
            loadRegisterCash(businessDate),
            timeoutPromise
          ]);
          setLoadingError(null);
        } catch (loadError) {
          console.error('[RegisterCash] Load error:', loadError);
          
          if (mountedRef.current) {
            console.log('[RegisterCash] Forcing initialization to complete after timeout');
            
            useRegisterCashStore.setState({ 
              currentCash: {
                businessDate,
                startingAmount: 0,
                coinsAmount: 0,
                withdrawals: [],
                nextDayAmount: 0,
                nextDayCoins: 0
              },
              initialized: true, 
              isLoading: false,
              error: null
            });
            
            if (isMobile.current) {
              console.log('[RegisterCash] Mobile device detected, showing mobile-specific error');
              setLoadingError('モバイルデバイスでの読み込みに問題が発生しました。修正ツールを使用してください。');
            } else {
              setLoadingError(null);
            }
          }
        }
      } catch (error) {
        console.error('[RegisterCash] Initialization error:', error);
        
        setLoadingError(error instanceof Error ? error.message : 'レジ金データの読み込みに失敗しました');
        
        if (mountedRef.current) {
          console.log('[RegisterCash] Forcing initialization after error');
          
          useRegisterCashStore.setState({ 
            currentCash: {
              businessDate,
              startingAmount: 0,
              coinsAmount: 0,
              withdrawals: [],
              nextDayAmount: 0,
              nextDayCoins: 0
            },
            initialized: true, 
            isLoading: false,
            error: null
          });
          
          if (isMobile.current) {
            console.log('[RegisterCash] Mobile device detected, showing mobile-specific error');
            setLoadingError('モバイルデバイスでの読み込みに問題が発生しました。修正ツールを使用してください。');
          }
        }
      }
    };

    initializeData();

    return () => {
      mountedRef.current = false;
    };
  }, [loadRegisterCash, resetStore]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    setLoadingError(null);
    const businessDate = getBusinessDate();
    
    try {
      const tableCreated = await ensureRegisterCashTable();
      console.log('[RegisterCash] Table creation result on refresh:', tableCreated);
      
      const timeoutDuration = isMobile.current ? 3000 : 5000;
      console.log(`[RegisterCash] Starting refresh with ${timeoutDuration}ms timeout`);
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Loading timeout')), timeoutDuration);
      });
      
      try {
        await Promise.race([
          loadRegisterCash(businessDate),
          timeoutPromise
        ]);
        setLoadingError(null);
      } catch (loadError) {
        console.error('[RegisterCash] Refresh load error:', loadError);
        
        console.log('[RegisterCash] Forcing refresh to complete after timeout');
        
        useRegisterCashStore.setState({ 
          currentCash: {
            businessDate,
            startingAmount: 0,
            coinsAmount: 0,
            withdrawals: [],
            nextDayAmount: 0,
            nextDayCoins: 0
          },
          initialized: true, 
          isLoading: false,
          error: null
        });
        
        if (isMobile.current) {
          console.log('[RegisterCash] Mobile device detected, showing mobile-specific error on refresh');
          setLoadingError('モバイルデバイスでの更新に問題が発生しました。修正ツールを使用してください。');
        } else {
          setLoadingError(null);
        }
      }
    } catch (error) {
      console.error('[RegisterCash] Refresh error:', error);
      
      setLoadingError(error instanceof Error ? error.message : 'レジ金データの更新に失敗しました');
      
      useRegisterCashStore.setState({ 
        currentCash: {
          businessDate,
          startingAmount: 0,
          coinsAmount: 0,
          withdrawals: [],
          nextDayAmount: 0,
          nextDayCoins: 0
        },
        initialized: true, 
        isLoading: false,
        error: null
      });
      
      if (isMobile.current) {
        console.log('[RegisterCash] Mobile device detected, showing mobile-specific error on refresh');
        setLoadingError('モバイルデバイスでの更新に問題が発生しました。修正ツールを使用してください。');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStartingAmountChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseInt(e.target.value) || 0;
    try {
      await updateStartingAmount(amount);
    } catch (error) {
      console.error('[RegisterCash] Failed to update starting amount:', error);
    }
  };

  const handleCoinsAmountChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseInt(e.target.value) || 0;
    try {
      await updateCoinsAmount(amount);
    } catch (error) {
      console.error('[RegisterCash] Failed to update coins amount:', error);
    }
  };

  const handleNextDayAmountChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseInt(e.target.value) || 0;
    try {
      await updateNextDayAmount(amount);
    } catch (error) {
      console.error('[RegisterCash] Failed to update next day amount:', error);
    }
  };

  const handleNextDayCoinsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseInt(e.target.value) || 0;
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

  if (isRegisterLoading || !registerInitialized) {
    return (
      <div className="flex flex-col h-screen bg-gray-100">
        <header className="bg-purple-800 text-white p-4">
          <h1 className="text-xl font-bold">レジ金確認</h1>
        </header>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-800 border-t-transparent mb-4"></div>
            <p className="text-gray-600">読み込み中...</p>
            {loadingError && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                <div>
                  <p className="font-bold">エラーが発生しました</p>
                  <p className="text-sm">{loadingError}</p>
                  <p className="text-xs mt-2">
                    <a 
                      href={isMobile.current ? "/mobile-direct-fix.html" : "/fix-register-cash.html"} 
                      target="_blank" 
                      className="text-blue-600 underline"
                    >
                      {isMobile.current ? "モバイル用修正ツールを開く" : "データベース修正ツールを開く"}
                    </a>
                  </p>
                  <p className="text-xs mt-1">
                    <button 
                      onClick={handleRefresh}
                      className="text-blue-600 underline"
                    >
                      再読み込みを試す
                    </button>
                  </p>
                </div>
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
                onChange={(e) => {
                  const numericValue = e.target.value.replace(/[^0-9]/g, '');
                  handleStartingAmountChange({
                    ...e,
                    target: { ...e.target, value: numericValue }
                  });
                }}
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
                onChange={(e) => {
                  const numericValue = e.target.value.replace(/[^0-9]/g, '');
                  handleCoinsAmountChange({
                    ...e,
                    target: { ...e.target, value: numericValue }
                  });
                }}
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
                        const numericValue = e.target.value.replace(/[^0-9]/g, '');
                        handleWithdrawalChange(index, 'amount', numericValue);
                      }}
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
                onChange={(e) => {
                  const numericValue = e.target.value.replace(/[^0-9]/g, '');
                  handleNextDayAmountChange({
                    ...e,
                    target: { ...e.target, value: numericValue }
                  });
                }}
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
                onChange={(e) => {
                  const numericValue = e.target.value.replace(/[^0-9]/g, '');
                  handleNextDayCoinsChange({
                    ...e,
                    target: { ...e.target, value: numericValue }
                  });
                }}
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
