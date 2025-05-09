import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { 
  RegisterCash, 
  Withdrawal, 
  RegisterCashDb, 
  dbToModel, 
  modelToDb 
} from '../types/schema/registerCash';

interface RegisterCashState {
  currentCash: RegisterCash | null;
  isLoading: boolean;
  initialized: boolean;
  error: Error | null;
  
  loadRegisterCash: (businessDate: string) => Promise<void>;
  updateStartingAmount: (amount: number) => Promise<void>;
  updateCoinsAmount: (amount: number) => Promise<void>;
  updateNextDayAmount: (amount: number) => Promise<void>;
  updateNextDayCoins: (amount: number) => Promise<void>;
  addWithdrawal: (amount: number, note?: string) => Promise<void>;
  removeWithdrawal: (id: string) => Promise<void>;
  resetStore: () => void;
}

const useRegisterCashStore = create<RegisterCashState>()(
  persist(
    (set, get) => ({
      currentCash: null,
      isLoading: false,
      initialized: false,
      error: null,

      loadRegisterCash: async (businessDate: string) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('[RegisterCashStore] Loading register cash for date:', businessDate);
          
          const { data, error } = await supabase
            .from('register_cash')
            .select('*')
            .eq('business_date', businessDate)
            .single();
          
          if (error) {
            if (error.code === 'PGRST116') {
              console.log('[RegisterCashStore] No register cash data found, creating new record');
              
              const newCash: RegisterCash = {
                businessDate,
                startingAmount: 0,
                coinsAmount: 0,
                withdrawals: [],
                nextDayAmount: 0,
                nextDayCoins: 0,
              };
              
              const dbRecord = modelToDb(newCash);
              
              const { error: insertError } = await supabase
                .from('register_cash')
                .upsert(dbRecord, { onConflict: 'business_date' });
              
              if (insertError) {
                throw new Error(`Failed to create register cash record: ${insertError.message}`);
              }
              
              set({ 
                currentCash: newCash, 
                isLoading: false, 
                initialized: true 
              });
            } else {
              throw new Error(`Failed to load register cash data: ${error.message}`);
            }
          } else if (data) {
            const registerCash = dbToModel(data as RegisterCashDb);
            
            set({ 
              currentCash: registerCash, 
              isLoading: false, 
              initialized: true 
            });
          }
        } catch (error) {
          console.error('[RegisterCashStore] Error loading register cash:', error);
          
          const fallbackCash: RegisterCash = {
            businessDate,
            startingAmount: 0,
            coinsAmount: 0,
            withdrawals: [],
            nextDayAmount: 0,
            nextDayCoins: 0,
          };
          
          set({ 
            currentCash: fallbackCash,
            isLoading: false, 
            initialized: true,
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      },

      updateStartingAmount: async (amount: number) => {
        const { currentCash } = get();
        
        if (!currentCash) {
          throw new Error('Register cash data not loaded');
        }
        
        try {
          const updatedCash = {
            ...currentCash,
            startingAmount: amount,
          };
          
          set({ currentCash: updatedCash });
          
          const dbRecord = modelToDb(updatedCash);
          
          const { error } = await supabase
            .from('register_cash')
            .upsert({
              business_date: dbRecord.business_date,
              starting_amount: dbRecord.starting_amount,
              coins_amount: dbRecord.coins_amount,
              withdrawals: dbRecord.withdrawals,
              next_day_amount: dbRecord.next_day_amount,
              next_day_coins: dbRecord.next_day_coins,
            });
          
          if (error) {
            throw new Error(`Failed to update starting amount: ${error.message}`);
          }
        } catch (error) {
          console.error('[RegisterCashStore] Error updating starting amount:', error);
          throw error;
        }
      },

      updateCoinsAmount: async (amount: number) => {
        const { currentCash } = get();
        
        if (!currentCash) {
          throw new Error('Register cash data not loaded');
        }
        
        try {
          const updatedCash = {
            ...currentCash,
            coinsAmount: amount,
          };
          
          set({ currentCash: updatedCash });
          
          const dbRecord = modelToDb(updatedCash);
          
          const { error } = await supabase
            .from('register_cash')
            .upsert({
              business_date: dbRecord.business_date,
              starting_amount: dbRecord.starting_amount,
              coins_amount: dbRecord.coins_amount,
              withdrawals: dbRecord.withdrawals,
              next_day_amount: dbRecord.next_day_amount,
              next_day_coins: dbRecord.next_day_coins,
            });
          
          if (error) {
            throw new Error(`Failed to update coins amount: ${error.message}`);
          }
        } catch (error) {
          console.error('[RegisterCashStore] Error updating coins amount:', error);
          throw error;
        }
      },

      updateNextDayAmount: async (amount: number) => {
        const { currentCash } = get();
        
        if (!currentCash) {
          throw new Error('Register cash data not loaded');
        }
        
        try {
          const updatedCash = {
            ...currentCash,
            nextDayAmount: amount,
          };
          
          set({ currentCash: updatedCash });
          
          const dbRecord = modelToDb(updatedCash);
          
          const { error } = await supabase
            .from('register_cash')
            .upsert({
              business_date: dbRecord.business_date,
              starting_amount: dbRecord.starting_amount,
              coins_amount: dbRecord.coins_amount,
              withdrawals: dbRecord.withdrawals,
              next_day_amount: dbRecord.next_day_amount,
              next_day_coins: dbRecord.next_day_coins,
            });
          
          if (error) {
            throw new Error(`Failed to update next day amount: ${error.message}`);
          }
        } catch (error) {
          console.error('[RegisterCashStore] Error updating next day amount:', error);
          throw error;
        }
      },

      updateNextDayCoins: async (amount: number) => {
        const { currentCash } = get();
        
        if (!currentCash) {
          throw new Error('Register cash data not loaded');
        }
        
        try {
          const updatedCash = {
            ...currentCash,
            nextDayCoins: amount,
          };
          
          set({ currentCash: updatedCash });
          
          const dbRecord = modelToDb(updatedCash);
          
          const { error } = await supabase
            .from('register_cash')
            .upsert({
              business_date: dbRecord.business_date,
              starting_amount: dbRecord.starting_amount,
              coins_amount: dbRecord.coins_amount,
              withdrawals: dbRecord.withdrawals,
              next_day_amount: dbRecord.next_day_amount,
              next_day_coins: dbRecord.next_day_coins,
            });
          
          if (error) {
            throw new Error(`Failed to update next day coins: ${error.message}`);
          }
        } catch (error) {
          console.error('[RegisterCashStore] Error updating next day coins:', error);
          throw error;
        }
      },

      addWithdrawal: async (amount: number, note?: string) => {
        const { currentCash } = get();
        
        if (!currentCash) {
          throw new Error('Register cash data not loaded');
        }
        
        try {
          const newWithdrawal: Withdrawal = {
            id: uuidv4(),
            amount,
            note,
            timestamp: new Date().toISOString(),
          };
          
          const updatedCash = {
            ...currentCash,
            withdrawals: [...currentCash.withdrawals, newWithdrawal],
          };
          
          set({ currentCash: updatedCash });
          
          const dbRecord = modelToDb(updatedCash);
          
          const { error } = await supabase
            .from('register_cash')
            .upsert({
              business_date: dbRecord.business_date,
              starting_amount: dbRecord.starting_amount,
              coins_amount: dbRecord.coins_amount,
              withdrawals: dbRecord.withdrawals,
              next_day_amount: dbRecord.next_day_amount,
              next_day_coins: dbRecord.next_day_coins,
            });
          
          if (error) {
            throw new Error(`Failed to add withdrawal: ${error.message}`);
          }
        } catch (error) {
          console.error('[RegisterCashStore] Error adding withdrawal:', error);
          throw error;
        }
      },

      removeWithdrawal: async (id: string) => {
        const { currentCash } = get();
        
        if (!currentCash) {
          throw new Error('Register cash data not loaded');
        }
        
        try {
          const updatedCash = {
            ...currentCash,
            withdrawals: currentCash.withdrawals.filter(w => w.id !== id),
          };
          
          set({ currentCash: updatedCash });
          
          const dbRecord = modelToDb(updatedCash);
          
          const { error } = await supabase
            .from('register_cash')
            .upsert({
              business_date: dbRecord.business_date,
              starting_amount: dbRecord.starting_amount,
              coins_amount: dbRecord.coins_amount,
              withdrawals: dbRecord.withdrawals,
              next_day_amount: dbRecord.next_day_amount,
              next_day_coins: dbRecord.next_day_coins,
            });
          
          if (error) {
            throw new Error(`Failed to remove withdrawal: ${error.message}`);
          }
        } catch (error) {
          console.error('[RegisterCashStore] Error removing withdrawal:', error);
          throw error;
        }
      },

      resetStore: () => {
        set({
          currentCash: null,
          isLoading: false,
          initialized: false,
          error: null,
        });
      },
    }),
    {
      name: 'register-cash-storage',
      partialize: (state) => ({
        currentCash: state.currentCash,
        initialized: state.initialized,
      }),
    }
  )
);

export default useRegisterCashStore;
