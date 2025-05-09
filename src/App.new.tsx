import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppRouter from './routes';
import ErrorBoundary from './components/ui/ErrorBoundary';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { supabase, checkDatabaseConnection } from './lib/supabase';
import { isResetTime, getTimeUntilNextReset } from './utils/businessHours';
import useOrderStore from './store/orderStore';
import useStaffStore from './store/staffStore';
import useDailySalesStore from './store/dailySalesStore';
import useRegisterCashStore from './store/registerCashStore.new';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

function App() {
  const { resetStore: resetOrders } = useOrderStore();
  const { resetStore: resetStaff } = useStaffStore();
  const { resetStore: resetDailySales } = useDailySalesStore();
  const { resetStore: resetRegisterCash } = useRegisterCashStore();
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionRetries, setConnectionRetries] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    const setupResetTimer = () => {
      const timeUntilReset = getTimeUntilNextReset();
      console.log('[App] Next reset in:', Math.floor(timeUntilReset / 1000 / 60), 'minutes');
      
      const timer = setTimeout(() => {
        if (isResetTime()) {
          console.log('[App] Resetting app state due to business date change...');
          resetOrders();
          resetStaff();
          resetDailySales();
          resetRegisterCash();
          
          queryClient.invalidateQueries();
          
          window.location.reload();
        }
        setupResetTimer(); // Set up the next reset timer
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
        setConnectionError(null);

        console.log('[App] Checking database connection...');
        const isConnected = await checkDatabaseConnection();

        if (!isConnected) {
          console.error('[App] Database connection failed');
          throw new Error('データベースに接続できません');
        }

        console.log('[App] Initializing React Query cache...');
        await queryClient.invalidateQueries();

        console.log('[App] Setting up Supabase realtime channels...');
        const ordersChannel = supabase.channel('orders_changes')
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'orders' 
          }, () => {
            if (!isMounted) return;
            queryClient.invalidateQueries({ queryKey: ['orders'] });
          })
          .subscribe();

        const staffChannel = supabase.channel('staff_changes')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'staff'
          }, () => {
            if (!isMounted) return;
            queryClient.invalidateQueries({ queryKey: ['staff'] });
          })
          .subscribe();

        const dailySalesChannel = supabase.channel('daily_sales_changes')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'daily_sales'
          }, () => {
            if (!isMounted) return;
            queryClient.invalidateQueries({ queryKey: ['dailySales'] });
          })
          .subscribe();

        const registerCashChannel = supabase.channel('register_cash_changes')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'register_cash'
          }, () => {
            if (!isMounted) return;
            queryClient.invalidateQueries({ queryKey: ['registerCash'] });
          })
          .subscribe();

        const handleOnline = () => {
          if (!isMounted) return;
          console.log('[App] Back online, refreshing data...');
          queryClient.invalidateQueries();
          setConnectionError(null);
        };

        const handleOffline = () => {
          if (!isMounted) return;
          console.log('[App] Offline, setting connection error...');
          setConnectionError('インターネット接続が切断されました');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if (isMounted) {
          setIsInitializing(false);
          setConnectionRetries(0);
        }

        return () => {
          isMounted = false;
          ordersChannel.unsubscribe();
          staffChannel.unsubscribe();
          dailySalesChannel.unsubscribe();
          registerCashChannel.unsubscribe();
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      } catch (error) {
        console.error('[App] Initialization error:', error);
        
        if (isMounted) {
          setConnectionError(error instanceof Error ? error.message : 'アプリの初期化に失敗しました');
          setIsInitializing(false);
          
          if (connectionRetries < MAX_RETRIES) {
            const nextRetry = connectionRetries + 1;
            setConnectionRetries(nextRetry);
            
            const delay = Math.pow(2, nextRetry) * 1000;
            console.log(`[App] Scheduling retry ${nextRetry}/${MAX_RETRIES} in ${delay}ms...`);
            
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
  }, [connectionRetries]);

  if (isInitializing) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="md" text="読み込み中..." />
          {connectionRetries > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              再接続を試みています ({connectionRetries}/{MAX_RETRIES})
            </p>
          )}
        </div>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="fixed inset-0 bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
          <h2 className="text-red-600 text-lg font-bold mb-4">接続エラー</h2>
          <p className="text-gray-700 mb-4">{connectionError}</p>
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

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppRouter />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
