import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { getBusinessDate } from '../utils/businessHours';

interface Withdrawal {
  id: number;
  amount: number;
  note?: string;
  timestamp: string;
}

interface RegisterCash {
  businessDate: string;
  startingAmount: number;
  coinsAmount: number;
  withdrawals: Withdrawal[];
  nextDayAmount: number;
  nextDayCoins: number;
}

interface RegisterCashState {
  currentCash: RegisterCash | null;
  isLoading: boolean;
  error: string | null;
  initialized: boolean;
  updateStartingAmount: (amount: number) => Promise<void>;
  updateCoinsAmount: (amount: number) => Promise<void>;
  updateNextDayAmount: (amount: number) => Promise<void>;
  updateNextDayCoins: (amount: number) => Promise<void>;
  addWithdrawal: (amount: number, note?: string) => Promise<void>;
  removeWithdrawal: (id: number) => Promise<void>;
  loadRegisterCash: (date: string) => Promise<void>;
  resetStore: () => Promise<void>;
  _debug_log: Array<{ timestamp: Date; action: string; data: any }>;
}

const customStorage = {
  ...createJSONStorage(() => localStorage),
  removeItem: (name: string) => {
    console.log('[RegisterCashStore] Removing storage:', name);
    localStorage.removeItem(name);
  }
};

const useRegisterCashStore = create<RegisterCashState>()(
  persist(
    (set, get) => ({
      currentCash: null,
      isLoading: false,
      error: null,
      initialized: false,
      _debug_log: [],

      resetStore: async () => {
        try {
          console.log('[RegisterCashStore] Resetting store state');
          const businessDate = getBusinessDate();

          // Reset local state
          set({
            currentCash: {
              businessDate,
              startingAmount: 0,
              coinsAmount: 0,
              withdrawals: [],
              nextDayAmount: 0,
              nextDayCoins: 0
            },
            isLoading: false,
            error: null,
            initialized: true,
            _debug_log: [
              ...get()._debug_log,
              {
                timestamp: new Date(),
                action: 'reset_store',
                data: { businessDate }
              }
            ]
          });

          // Clear localStorage
          customStorage.removeItem('register-cash-storage');

          // Update database
          const { error } = await supabase
            .from('register_cash')
            .upsert({
              business_date: businessDate,
              starting_amount: 0,
              coins_amount: 0,
              withdrawals: [],
              next_day_amount: 0,
              next_day_coins: 0
            });

          if (error) throw error;

          console.log('[RegisterCashStore] Store reset successful');
        } catch (error) {
          console.error('[RegisterCashStore] Reset error:', error);
          set({ error: 'レジ金データのリセットに失敗しました' });
        }
      },

      updateStartingAmount: async (amount: number) => {
        try {
          console.log('[RegisterCashStore] Updating starting amount:', amount);
          const businessDate = getBusinessDate();
          const current = get().currentCash || {
            businessDate,
            startingAmount: 0,
            coinsAmount: 0,
            withdrawals: [],
            nextDayAmount: 0,
            nextDayCoins: 0
          };

          const updated = {
            ...current,
            startingAmount: amount
          };

          const { error } = await supabase
            .from('register_cash')
            .upsert({
              business_date: businessDate,
              starting_amount: amount,
              coins_amount: current.coinsAmount,
              withdrawals: current.withdrawals,
              next_day_amount: current.nextDayAmount,
              next_day_coins: current.nextDayCoins
            });

          if (error) {
            console.error('[RegisterCashStore] Error updating starting amount:', error);
            throw error;
          }

          console.log('[RegisterCashStore] Starting amount updated successfully');
          set(state => ({
            currentCash: updated,
            _debug_log: [
              ...state._debug_log,
              {
                timestamp: new Date(),
                action: 'update_starting_amount',
                data: { amount, updated }
              }
            ]
          }));
        } catch (error) {
          console.error('[RegisterCashStore] Failed to update starting amount:', error);
          set({ error: '開始レジ金の更新に失敗しました' });
          throw error;
        }
      },

      updateCoinsAmount: async (amount: number) => {
        try {
          console.log('[RegisterCashStore] Updating coins amount:', amount);
          const businessDate = getBusinessDate();
          const current = get().currentCash || {
            businessDate,
            startingAmount: 0,
            coinsAmount: 0,
            withdrawals: [],
            nextDayAmount: 0,
            nextDayCoins: 0
          };

          const updated = {
            ...current,
            coinsAmount: amount
          };

          const { error } = await supabase
            .from('register_cash')
            .upsert({
              business_date: businessDate,
              starting_amount: current.startingAmount,
              coins_amount: amount,
              withdrawals: current.withdrawals,
              next_day_amount: current.nextDayAmount,
              next_day_coins: current.nextDayCoins
            });

          if (error) {
            console.error('[RegisterCashStore] Error updating coins amount:', error);
            throw error;
          }

          console.log('[RegisterCashStore] Coins amount updated successfully');
          set(state => ({
            currentCash: updated,
            _debug_log: [
              ...state._debug_log,
              {
                timestamp: new Date(),
                action: 'update_coins_amount',
                data: { amount, updated }
              }
            ]
          }));
        } catch (error) {
          console.error('[RegisterCashStore] Failed to update coins amount:', error);
          set({ error: '小銭の更新に失敗しました' });
          throw error;
        }
      },

      updateNextDayAmount: async (amount: number) => {
        try {
          console.log('[RegisterCashStore] Updating next day amount:', amount);
          const businessDate = getBusinessDate();
          const current = get().currentCash || {
            businessDate,
            startingAmount: 0,
            coinsAmount: 0,
            withdrawals: [],
            nextDayAmount: 0,
            nextDayCoins: 0
          };

          const updated = {
            ...current,
            nextDayAmount: amount
          };

          const { error } = await supabase
            .from('register_cash')
            .upsert({
              business_date: businessDate,
              starting_amount: current.startingAmount,
              coins_amount: current.coinsAmount,
              withdrawals: current.withdrawals,
              next_day_amount: amount,
              next_day_coins: current.nextDayCoins
            });

          if (error) {
            console.error('[RegisterCashStore] Error updating next day amount:', error);
            throw error;
          }

          console.log('[RegisterCashStore] Next day amount updated successfully');
          set(state => ({
            currentCash: updated,
            _debug_log: [
              ...state._debug_log,
              {
                timestamp: new Date(),
                action: 'update_next_day_amount',
                data: { amount, updated }
              }
            ]
          }));
        } catch (error) {
          console.error('[RegisterCashStore] Failed to update next day amount:', error);
          set({ error: '翌日レジ金の更新に失敗しました' });
          throw error;
        }
      },

      updateNextDayCoins: async (amount: number) => {
        try {
          console.log('[RegisterCashStore] Updating next day coins:', amount);
          const businessDate = getBusinessDate();
          const current = get().currentCash || {
            businessDate,
            startingAmount: 0,
            coinsAmount: 0,
            withdrawals: [],
            nextDayAmount: 0,
            nextDayCoins: 0
          };

          const updated = {
            ...current,
            nextDayCoins: amount
          };

          const { error } = await supabase
            .from('register_cash')
            .upsert({
              business_date: businessDate,
              starting_amount: current.startingAmount,
              coins_amount: current.coinsAmount,
              withdrawals: current.withdrawals,
              next_day_amount: current.nextDayAmount,
              next_day_coins: amount
            });

          if (error) {
            console.error('[RegisterCashStore] Error updating next day coins:', error);
            throw error;
          }

          console.log('[RegisterCashStore] Next day coins updated successfully');
          set(state => ({
            currentCash: updated,
            _debug_log: [
              ...state._debug_log,
              {
                timestamp: new Date(),
                action: 'update_next_day_coins',
                data: { amount, updated }
              }
            ]
          }));
        } catch (error) {
          console.error('[RegisterCashStore] Failed to update next day coins:', error);
          set({ error: '翌日小銭の更新に失敗しました' });
          throw error;
        }
      },

      addWithdrawal: async (amount: number, note?: string) => {
        try {
          console.log('[RegisterCashStore] Adding withdrawal:', { amount, note });
          const businessDate = getBusinessDate();
          const current = get().currentCash || {
            businessDate,
            startingAmount: 0,
            coinsAmount: 0,
            withdrawals: [],
            nextDayAmount: 0,
            nextDayCoins: 0
          };

          const newWithdrawal: Withdrawal = {
            id: Date.now(),
            amount,
            note,
            timestamp: new Date().toISOString()
          };

          const updated = {
            ...current,
            withdrawals: [...current.withdrawals, newWithdrawal]
          };

          const { error } = await supabase
            .from('register_cash')
            .upsert({
              business_date: businessDate,
              starting_amount: current.startingAmount,
              coins_amount: current.coinsAmount,
              withdrawals: updated.withdrawals,
              next_day_amount: current.nextDayAmount,
              next_day_coins: current.nextDayCoins
            });

          if (error) {
            console.error('[RegisterCashStore] Error adding withdrawal:', error);
            throw error;
          }

          console.log('[RegisterCashStore] Withdrawal added successfully');
          set(state => ({
            currentCash: updated,
            _debug_log: [
              ...state._debug_log,
              {
                timestamp: new Date(),
                action: 'add_withdrawal',
                data: { newWithdrawal, updated }
              }
            ]
          }));
        } catch (error) {
          console.error('[RegisterCashStore] Failed to add withdrawal:', error);
          set({ error: '出金の追加に失敗しました' });
          throw error;
        }
      },

      removeWithdrawal: async (id: number) => {
        try {
          console.log('[RegisterCashStore] Removing withdrawal:', id);
          const current = get().currentCash;
          if (!current) return;

          const updated = {
            ...current,
            withdrawals: current.withdrawals.filter(w => w.id !== id)
          };

          const { error } = await supabase
            .from('register_cash')
            .upsert({
              business_date: current.businessDate,
              starting_amount: current.startingAmount,
              coins_amount: current.coinsAmount,
              withdrawals: updated.withdrawals,
              next_day_amount: current.nextDayAmount,
              next_day_coins: current.nextDayCoins
            });

          if (error) {
            console.error('[RegisterCashStore] Error removing withdrawal:', error);
            throw error;
          }

          console.log('[RegisterCashStore] Withdrawal removed successfully');
          set(state => ({
            currentCash: updated,
            _debug_log: [
              ...state._debug_log,
              {
                timestamp: new Date(),
                action: 'remove_withdrawal',
                data: { id, updated }
              }
            ]
          }));
        } catch (error) {
          console.error('[RegisterCashStore] Failed to remove withdrawal:', error);
          set({ error: '出金の削除に失敗しました' });
          throw error;
        }
      },

      loadRegisterCash: async (date: string) => {
        try {
          console.log('[RegisterCashStore] Loading register cash for date:', date);
          set({ isLoading: true, error: null });

          const { data, error } = await supabase
            .from('register_cash')
            .select('*')
            .eq('business_date', date)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            console.error('[RegisterCashStore] Error loading register cash:', error);
            throw error;
          }

          const registerCash: RegisterCash = {
            businessDate: date,
            startingAmount: data?.starting_amount || 0,
            coinsAmount: data?.coins_amount || 0,
            withdrawals: data?.withdrawals || [],
            nextDayAmount: data?.next_day_amount || 0,
            nextDayCoins: data?.next_day_coins || 0
          };

          console.log('[RegisterCashStore] Register cash loaded:', registerCash);
          set(state => ({
            currentCash: registerCash,
            initialized: true,
            isLoading: false,
            _debug_log: [
              ...state._debug_log,
              {
                timestamp: new Date(),
                action: 'load_register_cash',
                data: registerCash
              }
            ]
          }));
        } catch (error) {
          console.error('[RegisterCashStore] Failed to load register cash:', error);
          set({ 
            error: 'レジ金データの読み込みに失敗しました',
            isLoading: false
          });
        }
      }
    }),
    {
      name: 'register-cash-storage',
      storage: customStorage,
      partialize: (state) => ({
        currentCash: state.currentCash,
        initialized: state.initialized
      })
    }
  )
);

export default useRegisterCashStore;