import { format, addHours as dateAddHours, parseISO, differenceInMinutes } from 'date-fns';
import { ja } from 'date-fns/locale';

export const formatTime = (date: Date): string => {
  return format(date, 'HH:mm', { locale: ja });
};

export const parseTime = (timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const date = new Date(now);
  
  // 現在時刻が0:00-9:00の場合
  if (now.getHours() < 9) {
    // 入力時刻が19:00以降なら前日の日付を使用
    if (hours >= 19) {
      date.setDate(date.getDate() - 1);
      console.debug('[parseTime] Using previous day for late night hours', {
        now: format(now, 'yyyy-MM-dd HH:mm'),
        input: timeStr,
        result: format(date, 'yyyy-MM-dd HH:mm')
      });
    }
  }
  // 現在時刻が19:00以降の場合
  else if (now.getHours() >= 19) {
    // 入力時刻が9:00未満なら翌日の日付を使用
    if (hours < 9) {
      date.setDate(date.getDate() + 1);
      console.debug('[parseTime] Using next day for early morning hours', {
        now: format(now, 'yyyy-MM-dd HH:mm'),
        input: timeStr,
        result: format(date, 'yyyy-MM-dd HH:mm')
      });
    }
  }
  // 現在時刻が9:00-19:00の場合
  else {
    // 入力時刻が9:00未満なら翌日の日付を使用
    if (hours < 9) {
      date.setDate(date.getDate() + 1);
      console.debug('[parseTime] Using next day for morning hours during day', {
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

export const calculateTimeRemaining = (endTime: string | undefined): string => {
  if (!endTime) return '0:00';
  
  const end = parseTime(endTime);
  const now = new Date();
  
  console.debug('[calculateTimeRemaining] Time calculation', {
    now: format(now, 'yyyy-MM-dd HH:mm'),
    endTime,
    endDate: format(end, 'yyyy-MM-dd HH:mm')
  });
  
  // 日付の調整は parseTime 関数で既に行われているため、
  // ここでは単純に差分を計算する
  const diffMinutes = differenceInMinutes(end, now);
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