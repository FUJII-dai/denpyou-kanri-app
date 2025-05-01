import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Order, PaymentMethod, PaymentDetails } from '../types/order';
import { calculateTotal, calculateServiceCharge } from '../utils/price';
import { supabase, retryOperation, getPollingInterval } from '../lib/supabase';
import { format } from 'date-fns';
import { getBusinessDayStart, getBusinessDayEnd } from '../utils/businessHours';

interface OrderState {
  orders: Order[];
  deletedOrders: Order[];
  selectedOrder: Order | null;
  lastOrderNumber: number;
  pollingInterval: NodeJS.Timeout | null;
  channel: ReturnType<typeof supabase.channel> | null;
  pendingUpdates: Map<string, { timestamp: number; data: Partial<Order> }>;
  addOrder: (order: Order) => Promise<void>;
  updateOrder: (order: Order) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  restoreOrder: (id: string) => Promise<void>;
  permanentlyDeleteOrder: (id: string) => Promise<void>;
  completeOrder: (id: string, paymentMethod: PaymentMethod, paymentDetails: PaymentDetails) => Promise<void>;
  setSelectedOrder: (order: Order | null) => void;
  syncWithSupabase: () => Promise<void>;
  loadOrdersByDate: (date: string) => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  addPendingUpdate: (orderId: string, data: Partial<Order>) => void;
  removePendingUpdate: (orderId: string) => void;
  resetStore: () => void;
  deleteAllOrders: () => Promise<void>;
  cleanup: () => void;
}

const customStorage = {
  ...createJSONStorage(() => localStorage),
  removeItem: (name: string) => {
    console.log('[OrderStore] Removing storage:', name);
    localStorage.removeItem(name);
  }
};

const useOrderStore = create(
  persist<OrderState>(
    (set, get) => ({
      orders: [],
      deletedOrders: [],
      selectedOrder: null,
      lastOrderNumber: 0,
      pollingInterval: null,
      channel: null,
      pendingUpdates: new Map(),

      cleanup: () => {
        const channel = get().channel;
        if (channel) {
          console.log('[OrderStore] Unsubscribing from channel');
          channel.unsubscribe();
          set({ channel: null });
        }
      },

      resetStore: () => {
        console.log('[OrderStore] Resetting store state');
        const interval = get().pollingInterval;
        if (interval) {
          clearInterval(interval);
        }
        
        get().cleanup();
        customStorage.removeItem('order-storage');
        
        set({
          orders: [],
          deletedOrders: [],
          selectedOrder: null,
          lastOrderNumber: 0,
          pollingInterval: null,
          channel: null,
          pendingUpdates: new Map()
        });
      },

      loadOrdersByDate: async (date: string) => {
        try {
          console.log('[OrderStore] Loading orders for date:', date);
          
          const businessStart = getBusinessDayStart(date);
          const businessEnd = getBusinessDayEnd(date);

          console.log('[OrderStore] Business hours:', {
            start: format(businessStart, 'yyyy-MM-dd HH:mm:ss'),
            end: format(businessEnd, 'yyyy-MM-dd HH:mm:ss')
          });

          const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .eq('status', 'completed')
            .gte('created_at', format(businessStart, 'yyyy-MM-dd HH:mm:ss'))
            .lt('created_at', format(businessEnd, 'yyyy-MM-dd HH:mm:ss'));

          if (ordersError) throw ordersError;

          console.log('[OrderStore] Found orders:', ordersData?.length || 0);

          const transformedOrders = (ordersData || []).map(order => ({
            id: order.id,
            orderNumber: order.order_number,
            tableType: order.table_type,
            tableNum: order.table_num,
            guests: order.guests,
            startTime: order.start_time,
            endTime: order.end_time,
            duration: order.duration,
            customerName: order.customer_name || '',
            catchCasts: Array.isArray(order.catch_casts) ? [...order.catch_casts] : [],
            referralCasts: Array.isArray(order.referral_casts) ? [...order.referral_casts] : [],
            extensions: order.extensions || [],
            menus: order.menus || [],
            castDrinks: order.cast_drinks || [],
            bottles: order.bottles || [],
            foods: order.foods || [],
            drinkType: order.drink_type,
            drinkPrice: order.drink_price,
            karaokeCount: order.karaoke_count || 0,
            note: order.note || '',
            totalAmount: order.total_amount,
            status: order.status,
            paymentMethod: order.payment_method,
            paymentDetails: order.payment_details,
            tempCastDrink: order.temp_cast_drink || { cast: "", count: "1" },
            tempBottle: order.temp_bottle || { name: "", price: "" },
            tempFood: order.temp_food || { name: "", price: "" },
            created_at: order.created_at,
            updated_at: order.updated_at
          }));

          set(state => ({
            orders: [
              ...state.orders.filter(order => order.status === 'active'),
              ...transformedOrders
            ]
          }));

        } catch (error) {
          console.error('[OrderStore] Error loading orders by date:', error);
          throw error;
        }
      },

      deleteAllOrders: async () => {
        try {
          console.log('[OrderStore] Deleting all orders');
          const { error } = await supabase
            .from('orders')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

          if (error) throw error;
          console.log('[OrderStore] All orders deleted successfully');
        } catch (error) {
          console.error('[OrderStore] Error deleting orders:', error);
          throw error;
        }
      },

      addOrder: async (order) => {
        const newOrderNumber = get().lastOrderNumber + 1;
        const newOrder = { ...order, orderNumber: newOrderNumber };
        
        try {
          set(state => ({
            orders: [...state.orders, newOrder],
            lastOrderNumber: newOrderNumber
          }));

          const { error } = await retryOperation(async () => {
            return await supabase
              .from('orders')
              .insert([{
                id: newOrder.id,
                order_number: newOrderNumber,
                table_type: newOrder.tableType,
                table_num: newOrder.tableNum,
                guests: newOrder.guests,
                start_time: newOrder.startTime,
                end_time: newOrder.endTime,
                duration: newOrder.duration,
                customer_name: newOrder.customerName || null,
                catch_casts: Array.isArray(newOrder.catchCasts) ? [...newOrder.catchCasts] : [],
                referral_casts: Array.isArray(newOrder.referralCasts) ? [...newOrder.referralCasts] : [],
                extensions: newOrder.extensions || [],
                menus: newOrder.menus || [],
                cast_drinks: newOrder.castDrinks || [],
                bottles: newOrder.bottles || [],
                foods: newOrder.foods || [],
                drink_type: newOrder.drinkType,
                drink_price: newOrder.drinkPrice,
                karaoke_count: newOrder.karaokeCount || 0,
                note: newOrder.note || null,
                total_amount: newOrder.totalAmount,
                status: newOrder.status,
                payment_method: newOrder.paymentMethod || null,
                payment_details: newOrder.paymentDetails || null,
                temp_cast_drink: newOrder.tempCastDrink || null,
                temp_bottle: newOrder.tempBottle || null,
                temp_food: newOrder.tempFood || null
              }]);
          });

          if (error) throw error;
        } catch (error) {
          set(state => ({
            orders: state.orders.filter(o => o.id !== newOrder.id),
            lastOrderNumber: state.lastOrderNumber - 1
          }));
          console.error('Error saving to Supabase:', error);
          throw error;
        }
      },

      updateOrder: async (order) => {
        try {
          console.log('[OrderStore] 更新前の注文データ:', {
            id: order.id,
            catchCasts: {
              before: order.catchCasts,
              after: Array.isArray(order.catchCasts) ? [...order.catchCasts] : []
            },
            referralCasts: {
              before: order.referralCasts,
              after: Array.isArray(order.referralCasts) ? [...order.referralCasts] : []
            }
          });

          const updatedOrder = {
            ...order,
            catchCasts: Array.isArray(order.catchCasts) ? [...order.catchCasts] : [],
            referralCasts: Array.isArray(order.referralCasts) ? [...order.referralCasts] : []
          };

          set(state => ({
            orders: state.orders.map((o) => 
              o.id === order.id ? updatedOrder : o
            )
          }));

          const { error } = await retryOperation(async () => {
            console.log('Sending update to Supabase:', order.id);
            return await supabase
              .from('orders')
              .update({
                order_number: updatedOrder.orderNumber,
                table_type: updatedOrder.tableType,
                table_num: updatedOrder.tableNum,
                guests: updatedOrder.guests,
                start_time: updatedOrder.startTime,
                end_time: updatedOrder.endTime,
                duration: updatedOrder.duration,
                customer_name: updatedOrder.customerName || null,
                catch_casts: updatedOrder.catchCasts,
                referral_casts: updatedOrder.referralCasts,
                extensions: updatedOrder.extensions || [],
                menus: updatedOrder.menus || [],
                cast_drinks: updatedOrder.castDrinks || [],
                bottles: updatedOrder.bottles || [],
                foods: updatedOrder.foods || [],
                drink_type: updatedOrder.drinkType,
                drink_price: updatedOrder.drinkPrice,
                karaoke_count: updatedOrder.karaokeCount || 0,
                note: updatedOrder.note || null,
                total_amount: updatedOrder.totalAmount,
                status: updatedOrder.status,
                payment_method: updatedOrder.paymentMethod || null,
                payment_details: updatedOrder.paymentDetails || null,
                temp_cast_drink: updatedOrder.tempCastDrink || null,
                temp_bottle: updatedOrder.tempBottle || null,
                temp_food: updatedOrder.tempFood || null
              })
              .eq('id', order.id);
          });

          if (error) throw error;

          console.log('[OrderStore] 更新後の注文データ:', {
            id: order.id,
            catchCasts: updatedOrder.catchCasts,
            referralCasts: updatedOrder.referralCasts
          });

          get().removePendingUpdate(order.id);
          await get().syncWithSupabase();

        } catch (error) {
          console.error('Error updating in Supabase:', error);
          throw error;
        }
      },

      deleteOrder: async (id) => {
        const orderToDelete = get().orders.find(o => o.id === id);
        if (!orderToDelete) return;

        try {
          set(state => ({
            orders: state.orders.filter(o => o.id !== id),
            deletedOrders: [...state.deletedOrders, orderToDelete]
          }));

          const { error } = await retryOperation(async () => {
            return await supabase
              .from('orders')
              .update({ status: 'deleted' })
              .eq('id', id);
          });

          if (error) throw error;
        } catch (error) {
          set(state => ({
            orders: [...state.orders, orderToDelete],
            deletedOrders: state.deletedOrders.filter(o => o.id !== id)
          }));
          console.error('Error deleting in Supabase:', error);
          throw error;
        }
      },

      restoreOrder: async (id) => {
        const orderToRestore = get().deletedOrders.find(o => o.id === id);
        if (!orderToRestore) return;

        try {
          set(state => ({
            deletedOrders: state.deletedOrders.filter(o => o.id !== id),
            orders: [...state.orders, { ...orderToRestore, status: 'active' }]
          }));

          const { error } = await retryOperation(async () => {
            return await supabase
              .from('orders')
              .update({ status: 'active' })
              .eq('id', id);
          });

          if (error) throw error;
        } catch (error) {
          set(state => ({
            deletedOrders: [...state.deletedOrders, orderToRestore],
            orders: state.orders.filter(o => o.id !== id)
          }));
          console.error('Error restoring in Supabase:', error);
          throw error;
        }
      },

      permanentlyDeleteOrder: async (id) => {
        const orderToDelete = get().deletedOrders.find(o => o.id === id);
        if (!orderToDelete) return;

        set(state => ({
          deletedOrders: state.deletedOrders.filter(o => o.id !== id)
        }));

        try {
          const { error } = await retryOperation(async () => {
            return await supabase
              .from('orders')
              .delete()
              .eq('id', id);
          });

          if (error) throw error;
        } catch (error) {
          console.error('Error permanently deleting from Supabase:', error);
          set(state => ({
            deletedOrders: [...state.deletedOrders, orderToDelete]
          }));
          throw error;
        }
      },

      completeOrder: async (id, paymentMethod, paymentDetails) => {
        const orderToUpdate = get().orders.find(o => o.id === id);
        if (!orderToUpdate) return;

        const total = calculateTotal(orderToUpdate);
        const serviceCharge = calculateServiceCharge(total);
        const subtotalWithService = total + serviceCharge;

        let finalAmount = subtotalWithService;
        let updatedPaymentDetails = { ...paymentDetails };

        if (paymentMethod === 'cash') {
          finalAmount = Math.floor(subtotalWithService / 100) * 100;
        } else if ((paymentMethod === 'card' || paymentMethod === 'partial_cash') && paymentDetails.hasCardFee) {
          finalAmount += paymentDetails.cardFee || 0;
        }

        const updatedOrder = {
          ...orderToUpdate,
          status: 'completed' as const,
          paymentMethod,
          paymentDetails: updatedPaymentDetails,
          totalAmount: finalAmount
        };

        try {
          set(state => ({
            orders: state.orders.map(o => o.id === id ? updatedOrder : o)
          }));

          const { error } = await retryOperation(async () => {
            return await supabase
              .from('orders')
              .update({
                status: 'completed',
                payment_method: paymentMethod,
                payment_details: updatedPaymentDetails,
                total_amount: finalAmount
              })
              .eq('id', id);
          });

          if (error) throw error;
        } catch (error) {
          set(state => ({
            orders: state.orders.map(o => o.id === id ? orderToUpdate : o)
          }));
          console.error('Error completing order in Supabase:', error);
          throw error;
        }
      },

      setSelectedOrder: (order) => set({ selectedOrder: order }),

      syncWithSupabase: async () => {
        try {
          set({ isLoading: true, error: null });

          get().cleanup();

          const { data, error } = await supabase
            .from('orders')
            .select('*');

          if (error) throw error;

          const channel = supabase
            .channel('orders_changes')
            .on('postgres_changes', { 
              event: '*', 
              schema: 'public', 
              table: 'orders' 
            }, async () => {
              const { data: refreshedData, error: refreshError } = await supabase
                .from('orders')
                .select('*');

              if (!refreshError && refreshedData) {
                const activeOrders = [];
                const deletedOrders = [];

                refreshedData.forEach(order => {
                  const transformedOrder = {
                    id: order.id,
                    orderNumber: order.order_number,
                    tableType: order.table_type,
                    tableNum: order.table_num,
                    guests: order.guests,
                    startTime: order.start_time,
                    endTime: order.end_time,
                    duration: order.duration,
                    customerName: order.customer_name || '',
                    catchCasts: Array.isArray(order.catch_casts) ? [...order.catch_casts] : [],
                    referralCasts: Array.isArray(order.referral_casts) ? [...order.referral_casts] : [],
                    extensions: order.extensions || [],
                    menus: order.menus || [],
                    castDrinks: order.cast_drinks || [],
                    bottles: order.bottles || [],
                    foods: order.foods || [],
                    drinkType: order.drink_type,
                    drinkPrice: order.drink_price,
                    karaokeCount: order.karaoke_count || 0,
                    note: order.note || '',
                    totalAmount: order.total_amount,
                    status: order.status,
                    paymentMethod: order.payment_method,
                    paymentDetails: order.payment_details,
                    tempCastDrink: order.temp_cast_drink || { cast: "", count: "1" },
                    tempBottle: order.temp_bottle || { name: "", price: "" },
                    tempFood: order.temp_food || { name: "", price: "" },
                    created_at: order.created_at,
                    updated_at: order.updated_at
                  };

                  if (order.status === 'deleted') {
                    deletedOrders.push(transformedOrder);
                  } else {
                    activeOrders.push(transformedOrder);
                  }
                });

                set({ 
                  orders: activeOrders,
                  deletedOrders: deletedOrders
                });
              }
            })
            .subscribe();

          const activeOrders = [];
          const deletedOrders = [];

          data.forEach(order => {
            const transformedOrder = {
              id: order.id,
              orderNumber: order.order_number,
              tableType: order.table_type,
              tableNum: order.table_num,
              guests: order.guests,
              startTime: order.start_time,
              endTime: order.end_time,
              duration: order.duration,
              customerName: order.customer_name || '',
              catchCasts: Array.isArray(order.catch_casts) ? [...order.catch_casts] : [],
              referralCasts: Array.isArray(order.referral_casts) ? [...order.referral_casts] : [],
              extensions: order.extensions || [],
              menus: order.menus || [],
              castDrinks: order.cast_drinks || [],
              bottles: order.bottles || [],
              foods: order.foods || [],
              drinkType: order.drink_type,
              drinkPrice: order.drink_price,
              karaokeCount: order.karaoke_count || 0,
              note: order.note || '',
              totalAmount: order.total_amount,
              status: order.status,
              paymentMethod: order.payment_method,
              paymentDetails: order.payment_details,
              tempCastDrink: order.temp_cast_drink || { cast: "", count: "1" },
              tempBottle: order.temp_bottle || { name: "", price: "" },
              tempFood: order.temp_food || { name: "", price: "" },
              created_at: order.created_at,
              updated_at: order.updated_at
            };

            if (order.status === 'deleted') {
              deletedOrders.push(transformedOrder);
            } else {
              activeOrders.push(transformedOrder);
            }
          });

          const currentOrders = get().orders;
          const pendingUpdates = get().pendingUpdates;
          
          const mergedActiveOrders = activeOrders.map(newOrder => {
            const existingOrder = currentOrders.find(o => o.id === newOrder.id);
            const pendingUpdate = pendingUpdates.get(newOrder.id);
            
            if (pendingUpdate && pendingUpdate.timestamp + PENDING_UPDATE_TIMEOUT > Date.now()) {
              console.log(`Applying pending update for order ${newOrder.id}`);
              return {
                ...newOrder,
                ...pendingUpdate.data,
                catchCasts: Array.isArray(pendingUpdate.data.catchCasts) ? [...pendingUpdate.data.catchCasts] : newOrder.catchCasts,
                referralCasts: Array.isArray(pendingUpdate.data.referralCasts) ? [...pendingUpdate.data.referralCasts] : newOrder.referralCasts
              };
            }
            
            if (existingOrder) {
              return {
                ...newOrder,
                tempCastDrink: existingOrder.tempCastDrink || newOrder.tempCastDrink,
                tempBottle: existingOrder.tempBottle || newOrder.tempBottle,
                tempFood: existingOrder.tempFood || newOrder.tempFood,
                catchCasts: Array.isArray(existingOrder.catchCasts) ? [...existingOrder.catchCasts] : newOrder.catchCasts,
                referralCasts: Array.isArray(existingOrder.referralCasts) ? [...existingOrder.referralCasts] : newOrder.referralCasts
              };
            }
            
            return newOrder;
          });

          set({
            orders: mergedActiveOrders,
            deletedOrders: deletedOrders,
            lastOrderNumber: Math.max(
              ...mergedActiveOrders.map(o => o.orderNumber),
              ...deletedOrders.map(o => o.orderNumber),
              0
            ),
            channel
          });
        } catch (error) {
          console.error('Error syncing with Supabase:', error);
          throw error;
        }
      },

      startPolling: () => {
        const store = get();
        if (store.pollingInterval) return;

        console.log('Starting polling...');
        const interval = setInterval(async () => {
          try {
            await store.syncWithSupabase();
          } catch (error) {
            console.error('Polling sync failed:', error);
          }
        }, getPollingInterval());

        set({ pollingInterval: interval });
      },

      stopPolling: () => {
        const interval = get().pollingInterval;
        if (interval) {
          console.log('Stopping polling...');
          clearInterval(interval);
          set({ pollingInterval: null });
        }
      },

      addPendingUpdate: (orderId: string, data: Partial<Order>) => {
        console.log(`Adding pending update for order ${orderId}:`, data);
        const pendingUpdates = get().pendingUpdates;
        pendingUpdates.set(orderId, {
          timestamp: Date.now(),
          data: {
            ...data,
            catchCasts: Array.isArray(data.catchCasts) ? [...data.catchCasts] : [],
            referralCasts: Array.isArray(data.referralCasts) ? [...data.referralCasts] : []
          }
        });
        set({ pendingUpdates: new Map(pendingUpdates) });

        setTimeout(() => {
          const store = get();
          const update = store.pendingUpdates.get(orderId);
          if (update && update.timestamp + PENDING_UPDATE_TIMEOUT < Date.now()) {
            console.log(`Removing expired pending update for order ${orderId}`);
            store.removePendingUpdate(orderId);
          }
        }, PENDING_UPDATE_TIMEOUT);
      },

      removePendingUpdate: (orderId: string) => {
        console.log(`Removing pending update for order ${orderId}`);
        const pendingUpdates = get().pendingUpdates;
        pendingUpdates.delete(orderId);
        set({ pendingUpdates: new Map(pendingUpdates) });
      }
    }),
    {
      name: 'order-storage',
      storage: customStorage,
      partialize: (state) => ({
        orders: state.orders,
        deletedOrders: state.deletedOrders,
        lastOrderNumber: state.lastOrderNumber
      })
    }
  )
);

export default useOrderStore;