import { useState, useEffect } from 'react';
import useOrderStore from '../store/orderStore';
import useDailySalesStore from '../store/dailySalesStore';
import {
  isWithinBusinessHours,
  getTimeUntilNextBusinessDay,
  getTimeUntilBusinessEnd,
  getBusinessDate
} from '../utils/businessHours';

export const useBusinessHours = () => {
  const [isOpen, setIsOpen] = useState(isWithinBusinessHours());
  const { orders } = useOrderStore();
  const { aggregateOrders } = useDailySalesStore();

  useEffect(() => {
    // 営業時間チェックを1分ごとに実行
    const timer = setInterval(() => {
      const withinHours = isWithinBusinessHours();
      setIsOpen(withinHours);
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const scheduleNextAggregation = () => {
      const now = new Date();
      const timeUntilEnd = getTimeUntilBusinessEnd(now);

      // 営業終了時に集計を実行
      setTimeout(async () => {
        try {
          await aggregateOrders(orders);
        } catch (error) {
          console.error('Failed to aggregate orders:', error);
        }
        // 次の集計をスケジュール
        scheduleNextAggregation();
      }, timeUntilEnd);
    };

    scheduleNextAggregation();
  }, [orders, aggregateOrders]);

  return {
    isOpen,
    businessDate: getBusinessDate(),
    nextOpenTime: new Date(Date.now() + getTimeUntilNextBusinessDay()).toLocaleTimeString('ja-JP'),
    closeTime: new Date(Date.now() + getTimeUntilBusinessEnd()).toLocaleTimeString('ja-JP')
  };
};