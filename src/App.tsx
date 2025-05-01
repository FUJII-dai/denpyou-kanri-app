import React, { useEffect, useState } from 'react';
import GirlsBarApp from './GirlsBarApp';
import CashSalesDebugTest from './components/CashSalesDebugTest';
import useOrderStore from './store/orderStore';
import useStaffStore from './store/staffStore';
import useDailySalesStore from './store/dailySalesStore';
import useRegisterCashStore from './store/registerCashStore';
import { supabase, clearSupabaseCache, checkDatabaseConnection, retryOperation, isMobileDevice } from './lib/supabase';
import { getBusinessDate, isResetTime, getTimeUntilNextReset } from './utils/businessHours';

function App() {
  const { syncWithSupabase: syncOrders, startPolling, stopPolling, resetStore: resetOrders } = useOrderStore();
  const { syncWithSupabase: syncStaff, initialized: staffInitialized, resetStore: resetStaff } = useStaffStore();
  const { loadDailySales, resetStore: resetDailySales } = useDailySalesStore();
  const { resetStore: resetRegisterCash } = useRegisterCashStore();
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [lastBusinessDate, setLastBusinessDate] = useState<string>(getBusinessDate());
  const [connectionRetries, setConnectionRetries] = useState(0);
  const MAX_RETRIES = 3;

  // リセットタイマーの設定
  useEffect(() => {
    const setupResetTimer = () => {
      const timeUntilReset = getTimeUntilNextReset();
      console.log('Next reset in:', Math.floor(timeUntilReset / 1000 / 60), 'minutes');
      
      const timer = setTimeout(() => {
        if (isResetTime()) {
          console.log('Resetting app state...');
          resetOrders();
          resetStaff();
          resetDailySales();
          resetRegisterCash();
          window.location.reload(); // 完全なリセット後にページをリロード
        }
        setupResetTimer(); // 次のリセットタイマーを設定
      }, timeUntilReset);

      return timer;
    };

    const timer = setupResetTimer();
    return () => clearTimeout(timer);
  }, [resetOrders, resetStaff, resetDailySales, resetRegisterCash]);

  useEffect(() => {
    let isMounted = true;
    let initializeTimeout: NodeJS.Timeout;

    const initializeApp = async () => {
      try {
        if (!isMounted) return;
        setIsInitializing(true);
        setSyncError(null);

        // データベース接続を確認
        const isConnected = await checkDatabaseConnection().catch(async (error) => {
          console.error('Connection check failed:', error);
          
          if (connectionRetries < MAX_RETRIES) {
            setConnectionRetries(prev => prev + 1);
            // 指数バックオフで再試行
            const delay = Math.pow(2, connectionRetries) * 1000;
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return false;
          }
          throw error;
        });

        if (!isConnected) {
          throw new Error('データベースに接続できません');
        }
        
        // キャッシュをクリア
        await clearSupabaseCache();

        // 営業日を取得
        const businessDate = getBusinessDate();
        console.log('Initializing app for business date:', businessDate);
        setLastBusinessDate(businessDate);

        // データを同期
        await Promise.all([
          syncOrders().catch(error => {
            console.error('Error syncing orders:', error);
            throw new Error('注文データの同期に失敗しました');
          }),
          !staffInitialized && syncStaff().catch(error => {
            console.error('Error syncing staff:', error);
            throw new Error('スタッフデータの同期に失敗しました');
          }),
          loadDailySales(businessDate).catch(error => {
            console.error('Error loading daily sales:', error);
            throw new Error('売上データの読み込みに失敗しました');
          })
        ].filter(Boolean));

        // リアルタイム更新の設定
        const ordersChannel = supabase.channel('orders_changes')
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'orders' 
          }, async () => {
            if (!isMounted) return;
            try {
              await syncOrders();
              await loadDailySales(getBusinessDate());
            } catch (error) {
              console.error('同期エラー:', error);
              setSyncError('データの同期に失敗しました');
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('リアルタイム更新の購読を開始しました');
            }
          });

        const staffChannel = supabase.channel('staff_changes')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'staff'
          }, async () => {
            if (!isMounted) return;
            try {
              await syncStaff();
            } catch (error) {
              console.error('スタッフ同期エラー:', error);
              setSyncError('スタッフデータの同期に失敗しました');
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('スタッフのリアルタイム更新の購読を開始しました');
            }
          });

        // オンライン/オフライン状態の監視
        const handleOnline = async () => {
          if (!isMounted) return;
          console.log('オンラインに復帰しました');
          setSyncError(null);
          setConnectionRetries(0);
          try {
            await clearSupabaseCache();
            await Promise.all([
              syncOrders(),
              syncStaff(),
              loadDailySales(getBusinessDate())
            ]);
          } catch (error) {
            console.error('同期エラー:', error);
            setSyncError('データの同期に失敗しました');
          }
        };

        const handleOffline = () => {
          if (!isMounted) return;
          console.log('オフラインになりました');
          setSyncError('インターネット接続が切断されました');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // 営業日の監視を開始
        const businessDateCheck = setInterval(() => {
          const currentBusinessDate = getBusinessDate();
          if (currentBusinessDate !== lastBusinessDate) {
            console.log('Business date changed:', currentBusinessDate);
            setLastBusinessDate(currentBusinessDate);
            loadDailySales(currentBusinessDate);
          }
        }, 60000); // 1分ごとにチェック

        // モバイルデバイスの場合はポーリングを開始
        if (isMobileDevice()) {
          startPolling();
        }

        if (isMounted) {
          setIsInitializing(false);
          setConnectionRetries(0);
        }

        return () => {
          isMounted = false;
          ordersChannel.unsubscribe();
          staffChannel.unsubscribe();
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          stopPolling();
          clearInterval(businessDateCheck);
        };
      } catch (error) {
        console.error('初期化エラー:', error);
        if (isMounted) {
          setSyncError(error instanceof Error ? error.message : 'アプリの初期化に失敗しました');
          setIsInitializing(false);
          
          // 一定時間後に再試行
          if (connectionRetries < MAX_RETRIES) {
            const delay = Math.pow(2, connectionRetries) * 1000;
            console.log(`Scheduling retry in ${delay}ms...`);
            initializeTimeout = setTimeout(initializeApp, delay);
          }
        }
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
      if (initializeTimeout) {
        clearTimeout(initializeTimeout);
      }
    };
  }, [syncOrders, syncStaff, staffInitialized, startPolling, stopPolling, loadDailySales, lastBusinessDate, connectionRetries]);

  useEffect(() => {
    // Debug mode toggle with keyboard shortcut (Ctrl/Cmd + Shift + D)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        setShowDebug(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isInitializing) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-800 border-t-transparent mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
          {connectionRetries > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              再接続を試みています ({connectionRetries}/{MAX_RETRIES})
            </p>
          )}
        </div>
      </div>
    );
  }

  if (syncError) {
    return (
      <div className="fixed inset-0 bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
          <h2 className="text-red-600 text-lg font-bold mb-4">同期エラー</h2>
          <p className="text-gray-700 mb-4">{syncError}</p>
          <button
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return showDebug ? <CashSalesDebugTest /> : <GirlsBarApp />;
}

export default App;