import React, { useEffect, useState, useRef } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatPrice } from '../utils/price';
import useOrderStore from '../store/orderStore';
import useDailySalesStore from '../store/dailySalesStore';
import { getBusinessDate } from '../utils/businessHours';
import { supabase } from '../lib/supabase';

interface DebugData {
  timestamp: Date;
  source: string;
  cashSales: number;
  details?: any;
}

const CashSalesDebugView = () => {
  const { orders } = useOrderStore();
  const { currentSales, _debug_log, _debug_version, resetStore } = useDailySalesStore();
  const [debugHistory, setDebugHistory] = useState<DebugData[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom of history
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [debugHistory]);

  // Monitor store updates
  useEffect(() => {
    if (currentSales) {
      const newEntry: DebugData = {
        timestamp: new Date(),
        source: 'store',
        cashSales: currentSales.cashSales,
        details: {
          version: _debug_version,
          businessDate: currentSales.businessDate
        }
      };
      setDebugHistory(prev => [...prev, newEntry]);
    }
  }, [currentSales, _debug_version]);

  // Verify data consistency
  const verifyDataConsistency = async () => {
    try {
      setIsVerifying(true);
      setVerificationResult(null);

      const businessDate = getBusinessDate();
      console.log('[CashSalesDebugView] Starting verification for:', businessDate);

      // 1. Get data from Supabase
      const { data: dailySalesData, error: dailySalesError } = await supabase
        .from('daily_sales')
        .select('*')
        .eq('business_date', businessDate)
        .maybeSingle();

      if (dailySalesError && dailySalesError.code !== 'PGRST116') {
        throw dailySalesError;
      }

      // 2. Calculate from orders
      const completedOrders = orders.filter(order => order.status === 'completed');
      const calculatedCashSales = completedOrders.reduce((total, order) => {
        if (order.paymentMethod === 'cash') {
          return total + Math.floor(order.totalAmount / 100) * 100;
        }
        if (order.paymentMethod === 'partial_cash' && order.paymentDetails?.cashAmount) {
          return total + order.paymentDetails.cashAmount;
        }
        return total;
      }, 0);

      // 3. Compare values
      const comparison = {
        fromOrders: calculatedCashSales,
        fromDatabase: dailySalesData?.cash_sales || 0,
        fromStore: currentSales?.cashSales || 0,
        businessDate,
        storeDate: currentSales?.businessDate
      };

      const isConsistent = 
        comparison.fromOrders === comparison.fromDatabase &&
        comparison.fromDatabase === comparison.fromStore &&
        (!currentSales || currentSales.businessDate === businessDate);

      setVerificationResult({
        success: isConsistent,
        message: isConsistent 
          ? '全てのデータソースの値が一致しています'
          : '値の不一致が検出されました',
        details: comparison
      });

      // Add verification to history
      setDebugHistory(prev => [...prev, {
        timestamp: new Date(),
        source: 'verification',
        cashSales: calculatedCashSales,
        details: comparison
      }]);

    } catch (error) {
      console.error('[CashSalesDebugView] Verification error:', error);
      setVerificationResult({
        success: false,
        message: '検証中にエラーが発生しました',
        details: error
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetStore = () => {
    if (confirm('ストアの状態をリセットしますか？')) {
      resetStore();
      setDebugHistory(prev => [...prev, {
        timestamp: new Date(),
        source: 'reset',
        cashSales: 0,
        details: { action: 'store_reset' }
      }]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">現金売上デバッグビュー</h2>
        <div className="flex gap-2">
          <button
            className="bg-red-600 text-white px-3 py-1 rounded-md text-sm"
            onClick={handleResetStore}
          >
            ストアリセット
          </button>
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm flex items-center gap-2"
            onClick={verifyDataConsistency}
            disabled={isVerifying}
          >
            <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />
            データ検証
          </button>
        </div>
      </div>

      {/* Current State */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-600 mb-2">現在の状態</h3>
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-2xl font-bold text-green-600">
            ¥{formatPrice(currentSales?.cashSales || 0)}
          </div>
          <div className="text-sm text-gray-500">
            Version: {_debug_version}
          </div>
          <div className="text-sm text-gray-500">
            Business Date: {currentSales?.businessDate || 'N/A'}
          </div>
        </div>
      </div>

      {/* Verification Result */}
      {verificationResult && (
        <div className={`mb-4 p-3 rounded-md ${
          verificationResult.success ? 'bg-green-50' : 'bg-red-50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {verificationResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            )}
            <span className={verificationResult.success ? 'text-green-600' : 'text-red-600'}>
              {verificationResult.message}
            </span>
          </div>
          {verificationResult.details && (
            <pre className="text-xs overflow-auto max-h-40">
              {JSON.stringify(verificationResult.details, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Debug History */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 mb-2">更新履歴</h3>
        <div 
          ref={historyRef}
          className="bg-gray-50 p-3 rounded-md h-60 overflow-auto"
        >
          {debugHistory.map((entry, index) => (
            <div key={index} className="mb-2 text-sm">
              <div className="flex justify-between items-start">
                <div className="text-gray-500">
                  {entry.timestamp.toLocaleTimeString()}
                </div>
                <div className="font-medium">
                  ¥{formatPrice(entry.cashSales)}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Source: {entry.source}
                {entry.details && (
                  <pre className="mt-1 text-xs overflow-auto">
                    {JSON.stringify(entry.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Debug Log */}
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-gray-600 mb-2">デバッグログ</h3>
        <div className="bg-gray-50 p-3 rounded-md h-40 overflow-auto">
          {_debug_log.map((log, index) => (
            <div key={index} className="mb-2 text-xs">
              <div className="text-gray-500">
                {log.timestamp.toLocaleTimeString()} - {log.action}
              </div>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(log.data, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CashSalesDebugView;