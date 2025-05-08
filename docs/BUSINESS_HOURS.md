# 営業時間と日次リセット設定

## 現在の設定
- 営業時間: 19:00 から翌日 09:00 まで
- リセット時間: 17:00（フォールバック: 17:05）
- リセット後もデータベースのレコードは保持されます

## 詳細
アプリケーションの営業時間とリセット時間は `src/utils/businessHours.ts` ファイルで設定されています：

```javascript
export const BUSINESS_HOURS = {
  start: '19:00',  // 営業開始時刻
  end: '09:00',    // 営業終了時刻（翌日）
  reset: '17:00',  // リセット時刻
  resetFallback: '17:05'  // フォールバックのリセット時刻
};
```

## リセット機能について
- リセット機能はUIの表示のみに影響し、データベースからデータを削除することはありません
- 過去の売上データや伝票履歴はSupabaseデータベースに保存されたままです
- リセット時刻（17:00）になると、アプリケーションは新しいビジネスデーに切り替わります
- リセット後も過去の伝票や売上データは「会計済み」タブや「売上集計」画面で確認できます

## 営業日の判定
営業日は以下のロジックで判定されます：

```javascript
export const getBusinessDate = (date: Date = new Date()): string => {
  const today = startOfDay(date);
  const hours = date.getHours();
  
  // 19:00より前の場合は前日の営業日
  if (hours < 19) {
    return format(addDays(today, -1), 'yyyy-MM-dd', { locale: ja });
  }
  
  return format(today, 'yyyy-MM-dd', { locale: ja });
};
```

これにより、19:00より前の時間帯は前日の営業日として扱われます。
