import { createClient } from '@supabase/supabase-js';
type Database = any;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'funfare-auth-token',
    detectSessionInUrl: true,
    flowType: 'implicit'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }
});

// キャッシュをクリアする関数
export const clearSupabaseCache = async () => {
  try {
    console.log('Clearing Supabase cache...');
    
    // キャッシュクリアの各処理を個別の関数として定義
    const clearStorages = async () => {
      const keysToKeep = ['funfare-auth-token', 'order-storage', 'staff-storage'];
      
      // LocalStorageのクリア
      try {
        Object.keys(localStorage).forEach(key => {
          if (!keysToKeep.includes(key)) {
            console.log(`Clearing localStorage key: ${key}`);
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn('LocalStorage clear failed:', e);
      }

      // SessionStorageのクリア
      try {
        Object.keys(sessionStorage).forEach(key => {
          if (!keysToKeep.includes(key)) {
            console.log(`Clearing sessionStorage key: ${key}`);
            sessionStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn('SessionStorage clear failed:', e);
      }
    };

    const clearIndexedDB = async () => {
      if (!window.indexedDB) return;
      
      try {
        const databases = await window.indexedDB.databases();
        await Promise.all(
          databases
            .filter(db => db.name && !db.name.startsWith('funfare-'))
            .map(db => new Promise<void>((resolve) => {
              try {
                console.log(`Clearing IndexedDB: ${db.name}`);
                const request = window.indexedDB.deleteDatabase(db.name!);
                request.onsuccess = () => resolve();
                request.onerror = () => {
                  console.warn(`Failed to delete IndexedDB: ${db.name}`);
                  resolve();
                };
              } catch (e) {
                console.warn(`Error in IndexedDB deletion: ${db.name}`, e);
                resolve();
              }
            }))
        );
      } catch (e) {
        console.warn('IndexedDB clear failed:', e);
      }
    };

    const clearCacheAPI = async () => {
      if (!('caches' in window)) return;
      
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter(name => !name.startsWith('funfare-'))
            .map(async name => {
              try {
                console.log(`Clearing cache: ${name}`);
                await caches.delete(name);
              } catch (e) {
                console.warn(`Failed to delete cache: ${name}`, e);
              }
            })
        );
      } catch (e) {
        console.warn('Cache API clear failed:', e);
      }
    };

    const clearSupabaseState = async () => {
      try {
        console.log('Removing all Supabase channels...');
        // すべてのチャネルを削除
        await supabase.removeAllChannels();
      } catch (e) {
        console.warn('Supabase channels removal failed:', e);
      }
    };

    // すべてのクリア処理を並行実行
    await Promise.all([
      clearStorages(),
      clearIndexedDB(),
      clearCacheAPI(),
      clearSupabaseState()
    ]);

    // 接続を再確立
    try {
      await supabase.removeAllChannels();
      console.log('Supabase connection reset successful');
    } catch (e) {
      console.warn('Supabase connection reset failed:', e);
    }

    console.log('Cache cleared successfully');
  } catch (error) {
    console.warn('Cache clear failed:', error);
  }
};

// データベース接続状態の確認
export const checkDatabaseConnection = async () => {
  try {
    console.log('Checking database connection...');
    
    // まず接続をリセット
    await clearSupabaseCache();
    
    // 簡単なクエリを実行して接続を確認
    const { error } = await supabase
      .from('orders')
      .select('count')
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // データが見つからない場合は正常な接続として扱う
        console.log('Database connection successful (no data)');
        return true;
      }
      console.error('Database connection check failed:', error);
      throw error;
    }
    
    console.log('Database connection successful');
    return true;
  } catch (error) {
    if (!navigator.onLine) {
      throw new Error('インターネット接続がありません');
    }
    console.error('Database connection check failed:', error);
    throw error;
  }
};

// エラーハンドリング
export const handleSupabaseError = (error: any, context: string) => {
  console.error(`Supabase error in ${context}:`, error);
  
  // エラーメッセージの整形
  let message = 'データベースエラーが発生しました';
  
  if (!navigator.onLine) {
    message = 'インターネット接続がありません';
  } else if (error.code === 'PGRST116') {
    message = 'データが見つかりません';
  } else if (error.code === '20P01') {
    message = 'データベース接続エラー';
  } else if (error.message) {
    message = error.message;
  }
  
  throw new Error(`${context}: ${message}`);
};

// オフライン検出
export const isOffline = () => !navigator.onLine;

// モバイルデバイスの検出
export const isMobileDevice = () => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  console.log('Device type:', isMobile ? 'Mobile' : 'Desktop');
  return isMobile;
};

// デバイスに応じたポーリング間隔の設定
export const getPollingInterval = () => {
  const interval = isMobileDevice() ? 5000 : 10000; // モバイルは5秒、デスクトップは10秒
  console.log(`Setting polling interval: ${interval}ms`);
  return interval;
};

// リトライロジック
export const retryOperation = async (
  operation: () => Promise<any>,
  maxRetries = 3,
  delay = 1000,
  backoff = true
) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Attempt ${i + 1}/${maxRetries}`);
      return await operation();
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${i + 1} failed:`, error);
      
      if (i === maxRetries - 1) break;
      
      // バックオフ戦略を使用する場合は遅延を指数関数的に増加
      const waitTime = backoff ? delay * Math.pow(2, i) : delay;
      console.log(`Waiting ${waitTime}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // 再試行前にキャッシュをクリア
      console.log('Clearing cache before retry...');
      await clearSupabaseCache();
    }
  }
  throw lastError;
};

// 接続状態の監視
let reconnectTimeout: NodeJS.Timeout | null = null;

export const setupConnectionMonitoring = () => {
  const handleConnectionChange = async () => {
    if (navigator.onLine) {
      console.log('Connection restored, clearing cache and reconnecting...');
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      await clearSupabaseCache();
    } else {
      console.log('Connection lost, scheduling reconnect...');
      if (!reconnectTimeout) {
        reconnectTimeout = setTimeout(async () => {
          if (navigator.onLine) {
            await clearSupabaseCache();
          }
        }, 5000);
      }
    }
  };

  window.addEventListener('online', handleConnectionChange);
  window.addEventListener('offline', handleConnectionChange);

  return () => {
    window.removeEventListener('online', handleConnectionChange);
    window.removeEventListener('offline', handleConnectionChange);
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
  };
};
