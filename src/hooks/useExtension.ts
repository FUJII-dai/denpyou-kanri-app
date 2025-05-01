import { useState } from 'react';
import { Order } from '../types/order';
import { addHours } from '../utils/time';

export const useExtension = (order: Order) => {
  const [showGuestSelect, setShowGuestSelect] = useState(false);
  const [selectedGuests, setSelectedGuests] = useState(order.guests);

  const addExtension = () => {
    const extensionCount = order.extensions.length;
    
    // 計算のベースとなる時間（最後の延長または基本セット終了時間）
    let baseTime = extensionCount > 0
      ? order.extensions[extensionCount - 1].endTime
      : addHours(order.startTime, 1);
    
    // 延長時間を計算（baseTime + 1時間）
    const endTimeStr = addHours(baseTime, 1);
    
    // 今回の延長のみの料金計算
    const unitPrice = order.drinkPrice || 1000;
    const extensionPrice = selectedGuests * unitPrice;
    
    // 新しい延長情報
    const newExtension = {
      id: Date.now(),
      count: extensionCount + 1,
      endTime: endTimeStr,
      guests: selectedGuests,
      unitPrice: unitPrice,
      price: extensionPrice,
      totalPrice: extensionCount > 0 
        ? order.extensions[extensionCount - 1].totalPrice + extensionPrice 
        : order.guests * unitPrice + extensionPrice
    };
    
    return {
      extension: newExtension,
      endTime: endTimeStr,
      totalPrice: newExtension.totalPrice
    };
  };

  const handleExtensionClick = () => {
    // 前回の延長人数があれば、それを初期値として設定
    const lastExtension = order.extensions[order.extensions.length - 1];
    setSelectedGuests(lastExtension ? lastExtension.guests : order.guests);
    setShowGuestSelect(true);
  };

  return {
    showGuestSelect,
    selectedGuests,
    setShowGuestSelect,
    setSelectedGuests,
    addExtension,
    handleExtensionClick
  };
};