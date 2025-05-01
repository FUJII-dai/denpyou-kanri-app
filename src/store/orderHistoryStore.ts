import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { OrderHistory } from '../types/order';

interface OrderHistoryState {
  history: OrderHistory[];
  isLoading: boolean;
  error: string | null;
  loadHistory: (orderId: string) => Promise<void>;
}

const useOrderHistoryStore = create<OrderHistoryState>((set) => ({
  history: [],
  isLoading: false,
  error: null,

  loadHistory: async (orderId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('order_history')
        .select('*')
        .eq('order_id', orderId)
        .order('changed_at', { ascending: true });

      if (error) throw error;

      const history: OrderHistory[] = data.map(item => ({
        id: item.id,
        orderId: item.order_id,
        action: item.action,
        changes: item.changes,
        changedBy: item.changed_by,
        changedAt: item.changed_at
      }));

      set({ history, isLoading: false });
    } catch (error) {
      console.error('Error loading order history:', error);
      set({ 
        error: '履歴の読み込みに失敗しました',
        isLoading: false 
      });
    }
  }
}));

export default useOrderHistoryStore