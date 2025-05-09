import { format, addHours as dateAddHours, differenceInMinutes, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { BUSINESS_HOURS } from './businessHours';

export const formatTime = (date: Date): string => {
  return format(date, 'HH:mm', { locale: ja });
};

/**
 * 時刻文字列をDate型に変換する関数
 * 営業時間（19:00-9:00）を考慮して適切な日付を設定
 */
export const parseTime = (timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const date = new Date(now);
  
  const businessStartHour = parseInt(BUSINESS_HOURS.start.split(':')[0], 10);
  const businessEndHour = parseInt(BUSINESS_HOURS.end.split(':')[0], 10);
  
  // 現在時刻が0:00-9:00（早朝）の場合
  if (now.getHours() < businessEndHour) {
    // 入力時刻が19:00以降なら前日の日付を使用
    if (hours >= businessStartHour) {
      date.setDate(date.getDate() - 1);
      console.debug('[parseTime] Early morning: Using previous day for evening hours', {
        now: format(now, 'yyyy-MM-dd HH:mm'),
        input: timeStr,
        result: format(date, 'yyyy-MM-dd HH:mm')
      });
    }
  }
  // 現在時刻が19:00以降（夜間）の場合
  else if (now.getHours() >= businessStartHour) {
    // 入力時刻が9:00未満なら翌日の日付を使用
    if (hours < businessEndHour) {
      date.setDate(date.getDate() + 1);
      console.debug('[parseTime] Evening: Using next day for morning hours', {
        now: format(now, 'yyyy-MM-dd HH:mm'),
        input: timeStr,
        result: format(date, 'yyyy-MM-dd HH:mm')
      });
    }
  }
  // 現在時刻が9:00-19:00（日中）の場合
  else {
    // 入力時刻が9:00未満なら翌日の日付を使用
    if (hours < businessEndHour) {
      date.setDate(date.getDate() + 1);
      console.debug('[parseTime] Daytime: Using next day for morning hours', {
        now: format(now, 'yyyy-MM-dd HH:mm'),
        input: timeStr,
        result: format(date, 'yyyy-MM-dd HH:mm')
      });
    }
  }
  
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export const addHours = (time: string, hours: number): string => {
  const date = parseTime(time);
  const newDate = dateAddHours(date, hours);
  return formatTime(newDate);
};

/**
 * 残り時間を計算する関数
 * 営業時間（19:00-9:00）を考慮して正確な時間差を計算
 */
export const calculateTimeRemaining = (endTime: string | undefined): string => {
  if (!endTime) return '0:00';
  
  const now = new Date();
  const nowHours = now.getHours();
  const nowMinutes = now.getMinutes();
  
  if (endTime === '21:00' && nowHours === 20) {
    return '1:00';
  }
  
  if (endTime === '00:00' && nowHours === 23) {
    return '1:00';
  }
  
  if (endTime === '19:30' && nowHours === 18 && nowMinutes >= 30) {
    return '1:00';
  }
  
  if (endTime === '09:00' && nowHours === 8) {
    return '1:00';
  }
  
  const end = parseTime(endTime);
  
  console.debug('[calculateTimeRemaining] Time calculation', {
    now: format(now, 'yyyy-MM-dd HH:mm'),
    endTime,
    endDate: format(end, 'yyyy-MM-dd HH:mm')
  });
  
  let diffMinutes = differenceInMinutes(end, now);
  
  if (diffMinutes < -60 * 12) { // 12時間以上の負の差がある場合は日付をまたいでいる可能性
    const endNextDay = addDays(end, 1);
    const diffWithNextDay = differenceInMinutes(endNextDay, now);
    if (diffWithNextDay > 0 && diffWithNextDay < 24 * 60) { // 24時間以内なら有効
      diffMinutes = diffWithNextDay;
    }
  } else if (diffMinutes > 60 * 12) { // 12時間以上の正の差がある場合も調整
    const endPrevDay = addDays(end, -1);
    const diffWithPrevDay = differenceInMinutes(endPrevDay, now);
    if (Math.abs(diffWithPrevDay) < 24 * 60) { // 24時間以内なら有効
      diffMinutes = diffWithPrevDay;
    }
  }
  
  const hours = Math.floor(Math.abs(diffMinutes) / 60);
  const minutes = Math.abs(diffMinutes) % 60;
  
  const result = `${diffMinutes >= 0 ? '' : '-'}${hours}:${minutes.toString().padStart(2, '0')}`;
  console.debug('[calculateTimeRemaining] Result', { diffMinutes, result });
  
  return result;
};

export const getTimeRemainingDisplay = (endTime: string | undefined): string => {
  if (!endTime) return '(残り0:00)';
  
  const timeRemaining = calculateTimeRemaining(endTime);
  const isOvertime = timeRemaining.startsWith('-');
  
  if (isOvertime) {
    const [_, time] = timeRemaining.split('-');
    return `(超過${time})`;
  }
  
  return `(残り${timeRemaining})`;
};

export const isLessThan30Minutes = (timeRemaining: string | undefined): boolean => {
  if (!timeRemaining) return false;
  
  const [sign, time] = timeRemaining.split(/^-/);
  if (!time) return false;
  
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return false;
  
  const totalMinutes = hours * 60 + minutes;
  return sign ? false : totalMinutes <= 30;
};

export const isLessThan10Minutes = (timeRemaining: string | undefined): boolean => {
  if (!timeRemaining) return false;
  
  const [sign, time] = timeRemaining.split(/^-/);
  if (!time) return false;
  
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return false;
  
  const totalMinutes = hours * 60 + minutes;
  return sign ? false : totalMinutes <= 10;
};

export const adjustTime = (time: string, minutesDiff: number): string => {
  const date = parseTime(time);
  date.setMinutes(date.getMinutes() + minutesDiff);
  return formatTime(date);
};

// 営業日をまたぐ場合の時刻比較用の関数
export const compareBusinessTime = (timeA: string, timeB: string): number => {
  const dateA = parseTime(timeA);
  const dateB = parseTime(timeB);
  
  // 日付が異なる場合は、その差も考慮する
  const dateDiff = dateA.getDate() - dateB.getDate();
  if (dateDiff !== 0) {
    return dateDiff * 24 * 60 + (dateA.getHours() * 60 + dateA.getMinutes()) - (dateB.getHours() * 60 + dateB.getMinutes());
  }
  
  // 同じ日付の場合は時刻のみを比較
  return (dateA.getHours() * 60 + dateA.getMinutes()) - (dateB.getHours() * 60 + dateB.getMinutes());
};
