import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { getBusinessDate } from '../utils/businessHours';
import { Order } from '../types/order';
import { calculateTotal, calculateServiceCharge } from '../utils/price';

interface DailySales {
  businessDate: string;
  totalSales: number;
  cashSales: number;
  cardSales: number;
  electronicSales: number;
  totalGuests: number;
  totalGroups: number;
  castSales: Array<{
    name: string;
    drinks: number;
    referrals: number;
    catches: number;
    bottles: number;
    referralAmount: number;
  }>;
  version: number;
  lastUpdate: string;
  updateSource: string;
  withdrawals?: Array<{
    id: number;
    amount: number;
    note?: string;
    timestamp: string;
  }>;
}

interface DailySalesState {
  currentSales: DailySales | null;
  isLoading: boolean;
  error: string | null;
  initialized: boolean;
  channel: ReturnType<typeof supabase.channel> | null;
  _debug_log: Array<{ timestamp: Date; action: string; data: any }>;
  _debug_version: number;
  aggregateOrders: (orders: Order[]) => Promise<void>;
  saveDailySales: (sales: DailySales) => Promise<void>;
  loadDailySales: (date: string) => Promise<void>;
  subscribeToChanges: () => void;
  unsubscribe: () => void;
  resetStore: () => void;
  deleteAllDailySales: () => Promise<void>;
}

const customStorage = {
  ...createJSONStorage(() => localStorage),
  removeItem: (name: string) => {
    console.log('[DailySalesStore] Removing storage:', name);
    localStorage.removeItem(name);
  }
};

const useDailySalesStore = create<DailySalesState>()(
  persist(
    (set, get) => ({
      currentSales: null,
      isLoading: false,
      error: null,
      initialized: false,
      channel: null,
      _debug_log: [],
      _debug_version: 0,

      aggregateOrders: async (orders: Order[]) => {
        try {
          console.log('[DailySalesStore] Starting aggregation');
          set({ isLoading: true, error: null });

          const businessDate = getBusinessDate();
          const completedOrders = orders.filter(order => order.status === 'completed');

          // Debug: Log completed orders with payment details
          completedOrders.forEach(order => {
            if (order.paymentMethod === 'partial_cash') {
              console.log('[DailySalesStore] Partial cash order details:', {
                orderNumber: order.orderNumber,
                paymentDetails: order.paymentDetails,
                cardAmount: order.paymentDetails?.cardAmount,
                cardFee: order.paymentDetails?.cardFee,
                hasCardFee: order.paymentDetails?.hasCardFee
              });
            }
          });

          // Calculate sales with validation
          const sales = completedOrders.reduce((acc, order) => {
            const total = calculateTotal(order);
            const serviceCharge = calculateServiceCharge(total);
            const finalTotal = total + serviceCharge;

            if (order.paymentMethod === 'cash') {
              acc.cashSales += Math.floor(finalTotal / 100) * 100;
            } else if (order.paymentMethod === 'card') {
              acc.cardSales += finalTotal + (order.paymentDetails?.cardFee || 0);
            } else if (order.paymentMethod === 'electronic') {
              acc.electronicSales += finalTotal;
            } else if (order.paymentMethod === 'partial_cash') {
              // Debug: Log partial cash payment calculation
              console.log('[DailySalesStore] Processing partial cash payment:', {
                orderNumber: order.orderNumber,
                cashAmount: order.paymentDetails?.cashAmount,
                cardAmount: order.paymentDetails?.cardAmount,
                cardFee: order.paymentDetails?.cardFee,
                beforeCardSales: acc.cardSales
              });

              if (order.paymentDetails?.cashAmount) {
                acc.cashSales += order.paymentDetails.cashAmount;
              }
              if (order.paymentDetails?.cardAmount) {
                const cardTotal = order.paymentDetails.cardAmount + (order.paymentDetails.cardFee || 0);
                acc.cardSales += cardTotal;
                
                // Debug: Log card sales update
                console.log('[DailySalesStore] Updated card sales:', {
                  orderNumber: order.orderNumber,
                  cardTotal,
                  afterCardSales: acc.cardSales
                });
              }
              if (order.paymentDetails?.electronicAmount) {
                acc.electronicSales += order.paymentDetails.electronicAmount;
              }
            }
            return acc;
          }, {
            cashSales: 0,
            cardSales: 0,
            electronicSales: 0
          });

          // Debug: Log final sales totals
          console.log('[DailySalesStore] Final sales totals:', {
            cashSales: sales.cashSales,
            cardSales: sales.cardSales,
            electronicSales: sales.electronicSales
          });

          // Calculate cast sales
          const castSales = completedOrders.reduce((acc: { [key: string]: any }, order) => {
            // Process cast drinks
            order.castDrinks.forEach(drink => {
              if (!acc[drink.cast]) {
                acc[drink.cast] = {
                  name: drink.cast,
                  drinks: 0,
                  referrals: 0,
                  catches: 0,
                  bottles: 0,
                  referralAmount: 0
                };
              }
              acc[drink.cast].drinks += drink.count;
            });

            // Process bottles
            order.bottles.forEach(bottle => {
              bottle.mainCasts?.forEach(castName => {
                if (!acc[castName]) {
                  acc[castName] = {
                    name: castName,
                    drinks: 0,
                    referrals: 0,
                    catches: 0,
                    bottles: 0,
                    referralAmount: 0
                  };
                }
                acc[castName].bottles += 1;
              });
            });

            // Process referrals
            const allReferrers = [...(order.catchCasts || []), ...(order.referralCasts || [])];
            if (allReferrers.length > 0) {
              const referralShare = order.totalAmount / allReferrers.length;
              allReferrers.forEach(castName => {
                if (!acc[castName]) {
                  acc[castName] = {
                    name: castName,
                    drinks: 0,
                    referrals: 0,
                    catches: 0,
                    bottles: 0,
                    referralAmount: 0
                  };
                }
                acc[castName].referralAmount += referralShare;
              });
            }

            return acc;
          }, {});

          const newSales: DailySales = {
            businessDate,
            totalSales: sales.cashSales + sales.cardSales + sales.electronicSales,
            cashSales: sales.cashSales,
            cardSales: sales.cardSales,
            electronicSales: sales.electronicSales,
            totalGuests: completedOrders.reduce((sum, order) => sum + order.guests, 0),
            totalGroups: completedOrders.length,
            castSales: Object.values(castSales),
            version: (get().currentSales?.version || 0) + 1,
            lastUpdate: new Date().toISOString(),
            updateSource: 'aggregate'
          };

          // Save to database
          await get().saveDailySales(newSales);

          // Update state atomically
          set(state => {
            // Skip if version is older or different business date
            if (
              state.currentSales && 
              (state.currentSales.version >= newSales.version || 
               state.currentSales.businessDate !== businessDate)
            ) {
              console.log('[DailySalesStore] Skipping older version');
              return { isLoading: false };
            }

            console.log('[DailySalesStore] Applying aggregated sales:', newSales);
            return {
              currentSales: newSales,
              isLoading: false,
              initialized: true,
              _debug_version: state._debug_version + 1,
              _debug_log: [
                ...state._debug_log,
                {
                  timestamp: new Date(),
                  action: 'aggregate',
                  data: newSales
                }
              ]
            };
          });
        } catch (error) {
          console.error('[DailySalesStore] Aggregation error:', error);
          set({ error: '売上集計に失敗しました', isLoading: false });
          throw error;
        }
      },

      // ... 他のメソッドは変更なし
      saveDailySales: async (sales: DailySales) => {
        try {
          console.log('[DailySalesStore] Saving sales:', sales);

          const { error } = await supabase
            .from('daily_sales')
            .upsert({
              business_date: sales.businessDate,
              total_sales: sales.totalSales,
              cash_sales: sales.cashSales,
              card_sales: sales.cardSales,
              electronic_sales: sales.electronicSales,
              total_guests: sales.totalGuests,
              total_groups: sales.totalGroups,
              cast_sales: sales.castSales
            });

          if (error) throw error;

          // Verify the save
          const { data: saved, error: verifyError } = await supabase
            .from('daily_sales')
            .select('*')
            .eq('business_date', sales.businessDate)
            .maybeSingle();

          if (verifyError) throw verifyError;
          if (!saved) throw new Error('Verification failed: No data found');
          if (saved.cash_sales !== sales.cashSales) {
            throw new Error('Verification failed: Cash sales mismatch');
          }

          console.log('[DailySalesStore] Save successful');
        } catch (error) {
          console.error('[DailySalesStore] Save error:', error);
          throw error;
        }
      },

      loadDailySales: async (date: string) => {
        try {
          console.log('[DailySalesStore] Loading sales for date:', date);
          set({ isLoading: true, error: null });

          const { data, error } = await supabase
            .from('daily_sales')
            .select('*')
            .eq('business_date', date)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') throw error;

          if (data) {
            const loadedSales: DailySales = {
              businessDate: date,
              totalSales: data.total_sales || 0,
              cashSales: data.cash_sales || 0,
              cardSales: data.card_sales || 0,
              electronicSales: data.electronic_sales || 0,
              totalGuests: data.total_guests || 0,
              totalGroups: data.total_groups || 0,
              castSales: data.cast_sales || [],
              version: (get().currentSales?.version || 0) + 1,
              lastUpdate: new Date().toISOString(),
              updateSource: 'load'
            };

            set(state => ({
              currentSales: loadedSales,
              isLoading: false,
              initialized: true,
              _debug_version: state._debug_version + 1,
              _debug_log: [
                ...state._debug_log,
                {
                  timestamp: new Date(),
                  action: 'load',
                  data: loadedSales
                }
              ]
            }));
          } else {
            set({
              currentSales: null,
              isLoading: false,
              initialized: true,
              _debug_log: [
                ...get()._debug_log,
                {
                  timestamp: new Date(),
                  action: 'load_empty',
                  data: null
                }
              ]
            });
          }
        } catch (error) {
          console.error('[DailySalesStore] Load error:', error);
          set({
            error: '売上データの読み込みに失敗しました',
            isLoading: false,
            initialized: true
          });
          throw error;
        }
      },

      subscribeToChanges: () => {
        const currentBusinessDate = getBusinessDate();
        console.log('[DailySalesStore] Setting up subscription:', currentBusinessDate);

        // Cleanup existing subscription
        get().unsubscribe();

        const channel = supabase.channel('daily_sales_changes')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'daily_sales',
            filter: `business_date=eq.${currentBusinessDate}`
          }, async (payload) => {
            console.log('[DailySalesStore] Received update:', payload);

            // Only process updates for current business date
            const businessDate = getBusinessDate();
            if (payload.new && payload.new.business_date === businessDate) {
              try {
                const data = payload.new;

                const updatedSales: DailySales = {
                  businessDate: data.business_date,
                  totalSales: data.total_sales || 0,
                  cashSales: data.cash_sales || 0,
                  cardSales: data.card_sales || 0,
                  electronicSales: data.electronic_sales || 0,
                  totalGuests: data.total_guests || 0,
                  totalGroups: data.total_groups || 0,
                  castSales: data.cast_sales || [],
                  version: (get().currentSales?.version || 0) + 1,
                  lastUpdate: new Date().toISOString(),
                  updateSource: 'realtime'
                };

                set(state => {
                  // Skip if version is older or different business date
                  if (
                    state.currentSales && 
                    (state.currentSales.version >= updatedSales.version || 
                     state.currentSales.businessDate !== businessDate)
                  ) {
                    console.log('[DailySalesStore] Skipping update:', {
                      current: state.currentSales.version,
                      new: updatedSales.version,
                      currentDate: state.currentSales.businessDate,
                      newDate: businessDate
                    });
                    return state;
                  }

                  console.log('[DailySalesStore] Applying update:', updatedSales);
                  return {
                    currentSales: updatedSales,
                    initialized: true,
                    _debug_version: state._debug_version + 1,
                    _debug_log: [
                      ...state._debug_log,
                      {
                        timestamp: new Date(),
                        action: 'realtime_update',
                        data: updatedSales
                      }
                    ]
                  };
                });
              } catch (error) {
                console.error('[DailySalesStore] Update error:', error);
              }
            } else {
              console.log('[DailySalesStore] Skipping update for different business date');
            }
          })
          .subscribe();

        set({ channel });
      },

      unsubscribe: () => {
        const { channel } = get();
        if (channel) {
          console.log('[DailySalesStore] Unsubscribing');
          channel.unsubscribe();
          set({ channel: null });
        }
      },

      resetStore: () => {
        console.log('[DailySalesStore] Resetting store state');
        const channel = get().channel;
        if (channel) {
          channel.unsubscribe();
        }
        
        customStorage.removeItem('daily-sales-storage');
        
        set({
          currentSales: null,
          isLoading: false,
          error: null,
          initialized: false,
          channel: null,
          _debug_version: get()._debug_version + 1,
          _debug_log: [
            ...get()._debug_log,
            {
              timestamp: new Date(),
              action: 'reset_store',
              data: null
            }
          ]
        });
      },

      deleteAllDailySales: async () => {
        try {
          console.log('[DailySalesStore] Deleting all daily sales');
          const { error } = await supabase
            .from('daily_sales')
            .delete()
            .neq('business_date', '1970-01-01');

          if (error) throw error;
          console.log('[DailySalesStore] All daily sales deleted successfully');
        } catch (error) {
          console.error('[DailySalesStore] Error deleting daily sales:', error);
          throw error;
        }
      }
    }),
    {
      name: 'daily-sales-storage',
      storage: customStorage,
      partialize: (state) => ({
        currentSales: state.currentSales,
        initialized: state.initialized
      })
    }
  )
);

export default useDailySalesStore;