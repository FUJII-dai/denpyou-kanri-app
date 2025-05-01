import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Order } from '../types/order';
import { getBusinessDate } from '../utils/businessHours';

interface DailySnapshot {
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
  hourlySales: Array<{
    hour: string;
    sales: number;
    guests: number;
  }>;
  orderDetails: Array<{
    orderNumber: number;
    tableType: string;
    tableNum: number;
    guests: number;
    startTime: string;
    endTime: string;
    totalAmount: number;
    paymentMethod: string;
  }>;
}

interface DailyHistoryState {
  snapshots: DailySnapshot[];
  isLoading: boolean;
  error: string | null;
  createSnapshot: (date: string, orders: Order[]) => Promise<void>;
  loadSnapshots: (startDate: string, endDate: string) => Promise<void>;
}

const useDailyHistoryStore = create<DailyHistoryState>((set) => ({
  snapshots: [],
  isLoading: false,
  error: null,

  createSnapshot: async (date: string, orders: Order[]) => {
    try {
      set({ isLoading: true, error: null });

      // 完了済み伝票のみを対象とする
      const completedOrders = orders.filter(order => order.status === 'completed');

      // 売上集計
      const salesData = completedOrders.reduce((acc, order) => {
        if (order.paymentMethod === 'cash') {
          acc.cashSales += order.totalAmount;
        } else if (order.paymentMethod === 'card') {
          acc.cardSales += order.totalAmount;
        } else if (order.paymentMethod === 'electronic') {
          acc.electronicSales += order.totalAmount;
        } else if (order.paymentMethod === 'partial_cash') {
          if (order.paymentDetails?.cashAmount) {
            acc.cashSales += order.paymentDetails.cashAmount;
          }
          if (order.paymentDetails?.cardAmount) {
            acc.cardSales += order.paymentDetails.cardAmount;
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

      // キャスト成績集計
      const castSales = completedOrders.reduce((acc: { [key: string]: any }, order) => {
        // キャストドリンク集計
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

        // ボトル集計
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

        // 紹介・キャッチ集計
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

      // 時間帯別集計
      const hourlySales = completedOrders.reduce((acc: any[], order) => {
        const hour = order.endTime.split(':')[0];
        const hourIndex = acc.findIndex(h => h.hour === hour);
        
        if (hourIndex === -1) {
          acc.push({
            hour,
            sales: order.totalAmount,
            guests: order.guests
          });
        } else {
          acc[hourIndex].sales += order.totalAmount;
          acc[hourIndex].guests += order.guests;
        }
        
        return acc;
      }, []).sort((a, b) => a.hour.localeCompare(b.hour));

      // 伝票詳細
      const orderDetails = completedOrders.map(order => ({
        orderNumber: order.orderNumber,
        tableType: order.tableType,
        tableNum: order.tableNum,
        guests: order.guests,
        startTime: order.startTime,
        endTime: order.endTime,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod
      }));

      // スナップショットの作成
      const snapshot: DailySnapshot = {
        businessDate: date,
        totalSales: salesData.cashSales + salesData.cardSales + salesData.electronicSales,
        cashSales: salesData.cashSales,
        cardSales: salesData.cardSales,
        electronicSales: salesData.electronicSales,
        totalGuests: completedOrders.reduce((sum, order) => sum + order.guests, 0),
        totalGroups: completedOrders.length,
        castSales: Object.values(castSales),
        hourlySales,
        orderDetails
      };

      // データベースに保存
      const { error: orderSnapshotError } = await supabase
        .from('daily_order_snapshots')
        .upsert({
          business_date: date,
          order_data: completedOrders
        });

      if (orderSnapshotError) throw orderSnapshotError;

      const { error: salesSnapshotError } = await supabase
        .from('daily_sales_snapshots')
        .upsert({
          business_date: date,
          ...snapshot
        });

      if (salesSnapshotError) throw salesSnapshotError;

      set({ isLoading: false });
    } catch (error) {
      console.error('Error creating daily snapshot:', error);
      set({ 
        error: '日次データの保存に失敗しました',
        isLoading: false 
      });
    }
  },

  loadSnapshots: async (startDate: string, endDate: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('daily_sales_snapshots')
        .select('*')
        .gte('business_date', startDate)
        .lte('business_date', endDate)
        .order('business_date', { ascending: false });

      if (error) throw error;

      const snapshots: DailySnapshot[] = data.map(item => ({
        businessDate: item.business_date,
        totalSales: item.total_sales,
        cashSales: item.cash_sales,
        cardSales: item.card_sales,
        electronicSales: item.electronic_sales,
        totalGuests: item.total_guests,
        totalGroups: item.total_groups,
        castSales: item.cast_sales,
        hourlySales: item.hourly_sales,
        orderDetails: item.order_details
      }));

      set({ snapshots, isLoading: false });
    } catch (error) {
      console.error('Error loading daily snapshots:', error);
      set({ 
        error: '日次データの読み込みに失敗しました',
        isLoading: false 
      });
    }
  }
}));

export default useDailyHistoryStore;