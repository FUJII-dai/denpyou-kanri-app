import { parseISO, format, addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';

// 営業時間の定義
export const BUSINESS_HOURS = {
  start: '19:00',  // 営業開始時刻
  end: '09:00',    // 営業終了時刻（翌日）
  reset: '17:00',  // リセット時刻
  resetFallback: '17:05'  // フォールバックのリセット時刻
};

// 営業日を取得する関数
export const getBusinessDate = (date: Date = new Date()): string => {
  const today = startOfDay(date);
  const hours = date.getHours();
  
  // 19:00より前の場合は前日の営業日
  if (hours < 19) {
    return format(addDays(today, -1), 'yyyy-MM-dd', { locale: ja });
  }
  
  return format(today, 'yyyy-MM-dd', { locale: ja });
};

// 営業日の開始時刻を取得
export const getBusinessDayStart = (dateStr: string): Date => {
  const date = parseISO(dateStr);
  const [hours, minutes] = BUSINESS_HOURS.start.split(':').map(Number);
  const businessStart = new Date(date);
  businessStart.setHours(hours, minutes, 0, 0);
  return businessStart;
};

// 営業日の終了時刻を取得（翌日の9:00）
export const getBusinessDayEnd = (dateStr: string): Date => {
  const date = parseISO(dateStr);
  const nextDay = addDays(date, 1);
  const [hours, minutes] = BUSINESS_HOURS.end.split(':').map(Number);
  const businessEnd = new Date(nextDay);
  businessEnd.setHours(hours, minutes, 0, 0);
  return businessEnd;
};

// リセット時刻を取得
export const getResetTime = (date: Date = new Date()): Date => {
  const today = startOfDay(date);
  const [hours, minutes] = BUSINESS_HOURS.reset.split(':').map(Number);
  const resetTime = new Date(today);
  resetTime.setHours(hours, minutes, 0, 0);
  return resetTime;
};

// フォールバックのリセット時刻を取得
export const getResetFallbackTime = (date: Date = new Date()): Date => {
  const today = startOfDay(date);
  const [hours, minutes] = BUSINESS_HOURS.resetFallback.split(':').map(Number);
  const resetTime = new Date(today);
  resetTime.setHours(hours, minutes, 0, 0);
  return resetTime;
};

// リセット時刻かどうかを判定
export const isResetTime = (date: Date = new Date()): boolean => {
  const resetTime = getResetTime(date);
  const resetFallbackTime = getResetFallbackTime(date);
  
  // メインのリセット時刻（17:00）またはフォールバック時刻（17:05）の1分以内
  const diffFromMain = Math.abs(date.getTime() - resetTime.getTime());
  const diffFromFallback = Math.abs(date.getTime() - resetFallbackTime.getTime());
  
  return diffFromMain < 60000 || diffFromFallback < 60000; // 1分以内
};

// 営業時間内かどうかを判定する関数
export const isWithinBusinessHours = (date: Date = new Date()): boolean => {
  const businessDate = getBusinessDate(date);
  const start = getBusinessDayStart(businessDate);
  const end = getBusinessDayEnd(businessDate);
  
  return isAfter(date, start) && isBefore(date, end);
};

// 次の営業開始時刻までの時間（ミリ秒）を取得
export const getTimeUntilNextBusinessDay = (date: Date = new Date()): number => {
  const businessDate = getBusinessDate(date);
  const start = getBusinessDayStart(businessDate);
  
  if (isAfter(date, start)) {
    // 現在時刻が営業開始時刻より後の場合、翌日の営業開始時刻まで
    const nextDay = addDays(start, 1);
    return nextDay.getTime() - date.getTime();
  }
  
  // 現在時刻が営業開始時刻より前の場合、当日の営業開始時刻まで
  return start.getTime() - date.getTime();
};

// 営業終了時刻までの時間（ミリ秒）を取得
export const getTimeUntilBusinessEnd = (date: Date = new Date()): number => {
  const businessDate = getBusinessDate(date);
  const end = getBusinessDayEnd(businessDate);
  return end.getTime() - date.getTime();
};

// 次のリセット時刻までの時間（ミリ秒）を取得
export const getTimeUntilNextReset = (date: Date = new Date()): number => {
  const resetTime = getResetTime(date);
  const resetFallbackTime = getResetFallbackTime(date);
  
  // 現在時刻が両方のリセット時刻を過ぎている場合、翌日のメインリセット時刻まで
  if (isAfter(date, resetFallbackTime)) {
    const nextDay = addDays(resetTime, 1);
    return nextDay.getTime() - date.getTime();
  }
  
  // 現在時刻がメインのリセット時刻を過ぎているがフォールバック前の場合
  if (isAfter(date, resetTime)) {
    return resetFallbackTime.getTime() - date.getTime();
  }
  
  // それ以外の場合は次のメインリセット時刻まで
  return resetTime.getTime() - date.getTime();
};

// デバッグ用：営業日の情報を取得
export const getBusinessDayInfo = (date: Date = new Date()) => {
  const businessDate = getBusinessDate(date);
  const start = getBusinessDayStart(businessDate);
  const end = getBusinessDayEnd(businessDate);
  const reset = getResetTime(date);
  const resetFallback = getResetFallbackTime(date);
  
  return {
    currentTime: format(date, 'yyyy-MM-dd HH:mm:ss'),
    businessDate,
    startTime: format(start, 'yyyy-MM-dd HH:mm:ss'),
    endTime: format(end, 'yyyy-MM-dd HH:mm:ss'),
    resetTime: format(reset, 'yyyy-MM-dd HH:mm:ss'),
    resetFallbackTime: format(resetFallback, 'yyyy-MM-dd HH:mm:ss'),
    isWithinHours: isWithinBusinessHours(date),
    isResetTime: isResetTime(date)
  };
};
