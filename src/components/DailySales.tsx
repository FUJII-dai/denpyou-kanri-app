import React, { useState } from 'react';
import { ArrowLeft, Clock, Download, Calendar, CircleDollarSign, BarChart3, Users, Plus, CheckCircle, Trash2, Wallet, CreditCard, Smartphone } from 'lucide-react';
import useOrderStore from '../store/orderStore';
import useDailySalesStore from '../store/dailySalesStore';
import useStaffStore from '../store/staffStore';
import { calculateTotal, calculateServiceCharge, formatPrice } from '../utils/price';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import OrderDetail from './OrderDetail';
import { getBusinessDate } from '../utils/businessHours';

interface DailySalesProps {
  onBack: () => void;
}

const DailySales: React.FC<DailySalesProps> = ({ onBack }) => {
  const { orders } = useOrderStore();
  const { currentSales } = useDailySalesStore();
  const { staff } = useStaffStore();
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  
  const completedOrders = orders.filter(order => order.status === 'completed');

  const handleOrderClick = (orderNumber: number) => {
    const order = orders.find(o => o.orderNumber === orderNumber);
    if (order) {
      setSelectedOrder(order.id);
    }
  };

  // キャスト成績の集計
  const castPerformance = completedOrders.reduce((acc: { [key: string]: CastPerformance }, order) => {
    // キャストドリンクの集計
    order.castDrinks.forEach(drink => {
      if (!acc[drink.cast]) {
        acc[drink.cast] = {
          name: drink.cast,
          drinks: 0,
          referrals: 0,
          catches: 0,
          bottles: 0,
          bottleOrderNumbers: [],
          referralAmount: 0
        };
      }
      acc[drink.cast].drinks += drink.count;
    });

    // ボトルの集計
    order.bottles.forEach(bottle => {
      bottle.mainCasts?.forEach(castName => {
        if (!acc[castName]) {
          acc[castName] = {
            name: castName,
            drinks: 0,
            referrals: 0,
            catches: 0,
            bottles: 0,
            bottleOrderNumbers: [],
            referralAmount: 0
          };
        }
        acc[castName].bottles += 1;
        if (!acc[castName].bottleOrderNumbers.includes(order.orderNumber)) {
          acc[castName].bottleOrderNumbers.push(order.orderNumber);
        }
      });
    });

    // キャッチと紹介の両方が未設定の場合は「その他」に計上
    if ((!order.catchCasts || order.catchCasts.length === 0) && 
        (!order.referralCasts || order.referralCasts.length === 0)) {
      if (!acc['その他']) {
        acc['その他'] = {
          name: 'その他',
          drinks: 0,
          referrals: 0,
          catches: 0,
          bottles: 0,
          bottleOrderNumbers: [],
          referralAmount: order.totalAmount
        };
      } else {
        acc['その他'].referralAmount += order.totalAmount;
      }
      return acc;
    }

    // キャッチと紹介の集計（両方とも売上に反映）
    const allReferrers = [...(order.catchCasts || []), ...(order.referralCasts || [])];
    if (allReferrers.length > 0) {
      const referralShare = 1 / allReferrers.length; // 紹介人数で割る
      const guestsPerCast = order.guests * referralShare; // お客様人数を紹介キャストの人数で割る
      const amountPerCast = order.totalAmount * referralShare; // 金額を紹介キャストの人数で割る

      // キャッチの集計（人数を分配）
      if (order.catchCasts?.length > 0) {
        const catchShare = order.guests / order.catchCasts.length; // キャッチ人数で割る
        order.catchCasts.forEach(castName => {
          if (!acc[castName]) {
            acc[castName] = {
              name: castName,
              drinks: 0,
              referrals: 0,
              catches: 0,
              bottles: 0,
              bottleOrderNumbers: [],
              referralAmount: 0
            };
          }
          acc[castName].catches += catchShare;
        });
      }

      // 紹介の集計（人数を分配）
      if (order.referralCasts?.length > 0) {
        const referralShare = order.guests / order.referralCasts.length;
        order.referralCasts.forEach(castName => {
          if (!acc[castName]) {
            acc[castName] = {
              name: castName,
              drinks: 0,
              referrals: 0,
              catches: 0,
              bottles: 0,
              bottleOrderNumbers: [],
              referralAmount: 0
            };
          }
          acc[castName].referrals += referralShare;
        });
      }

      // 売上の分配（キャッチと紹介で均等に分配）
      allReferrers.forEach(castName => {
        if (!acc[castName]) {
          acc[castName] = {
            name: castName,
            drinks: 0,
            referrals: 0,
            catches: 0,
            bottles: 0,
            bottleOrderNumbers: [],
            referralAmount: 0
          };
        }
        acc[castName].referralAmount += amountPerCast;
      });
    }

    return acc;
  }, {});

  // キャスト成績を登録順に並び替え（「その他」を先頭に）
  const sortedCastPerformance = Object.values(castPerformance).sort((a, b) => {
    if (a.name === 'その他') return -1;
    if (b.name === 'その他') return 1;

    const staffA = staff.find(s => s.name === a.name);
    const staffB = staff.find(s => s.name === b.name);

    // スタッフリストに存在しないキャストは末尾に
    if (!staffA && !staffB) return a.name.localeCompare(b.name);
    if (!staffA) return 1;
    if (!staffB) return -1;

    // スタッフリストのインデックスで並び替え
    return staff.indexOf(staffA) - staff.indexOf(staffB);
  });

  const handleExportCSV = () => {
    const businessDate = getBusinessDate();
    const dateStr = format(parseISO(businessDate), 'yyyyMMdd', { locale: ja });

    // CSVの値をエスケープする関数
    const escapeCSV = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    // 金額をフォーマットしてエスケープする関数
    const formatMoneyForCSV = (amount: number): string => {
      return escapeCSV(`¥${formatPrice(amount)}`);
    };

    // ヘッダー行
    const summaryHeaders = ['総売上', '現金売上', 'カード・電子マネー売上', '来店組数', '来店人数', '客単価'];
    const castHeaders = ['キャスト', 'ドリンク', '紹介', 'キャッチ', '担当ボトル', '紹介伝票'];
    
    // データ行の作成
    const summaryData = [
      formatMoneyForCSV(totalSales),
      formatMoneyForCSV(paymentMethodTotals.cash),
      formatMoneyForCSV(paymentMethodTotals.card + paymentMethodTotals.electronic),
      escapeCSV(`${visitData.totalGroups}組`),
      escapeCSV(`${visitData.totalGuests}名`),
      formatMoneyForCSV(visitData.averageSpendPerGuest)
    ];

    const castData = sortedCastPerformance.map(cast => [
      escapeCSV(cast.name),
      cast.drinks.toString(),
      cast.referrals.toFixed(1),
      cast.catches.toFixed(1),
      cast.bottles.toString(),
      cast.referralAmount > 0 ? formatMoneyForCSV(cast.referralAmount) : '0'
    ]);

    // CSVデータの作成
    const csvContent = [
      summaryHeaders.join(','),
      summaryData.join(','),
      '', // 空行
      castHeaders.join(','),
      ...castData.map(row => row.join(','))
    ].join('\n');

    // BOMを追加してUTF-8でエンコード
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8' });
    
    // ダウンロード
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `キャスト成績_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 支払い方法ごとの集計
  const paymentMethodTotals = completedOrders.reduce((acc, order) => {
    const total = order.totalAmount;
    
    switch (order.paymentMethod) {
      case 'cash':
        acc.cash += total;
        break;
      case 'card':
        acc.card += total;
        acc.cardFees += order.paymentDetails?.cardFee || 0;
        break;
      case 'electronic':
        acc.electronic += total;
        break;
      case 'partial_cash':
        acc.cash += order.paymentDetails?.cashAmount || 0;
        if (order.paymentDetails?.cardAmount) {
          acc.card += order.paymentDetails.cardAmount;
          acc.cardFees += order.paymentDetails.cardFee || 0;
        }
        if (order.paymentDetails?.electronicAmount) {
          acc.electronic += order.paymentDetails.electronicAmount;
        }
        break;
    }
    return acc;
  }, {
    cash: 0,
    card: 0,
    electronic: 0,
    cardFees: 0
  });

  // 売上項目ごとの集計
  const salesByCategory = completedOrders.reduce((acc, order) => {
    // セット料金（飲み放題）
    const baseSetPrice = order.guests * order.drinkPrice;
    acc.setPrice += baseSetPrice;
    
    // 延長料金
    const extensionTotal = order.extensions.reduce((sum, ext) => sum + ext.price, 0);
    acc.extension += extensionTotal;
    
    // キャストドリンク
    const castDrinkTotal = order.castDrinks.reduce((sum, drink) => sum + drink.price, 0);
    acc.castDrinks += castDrinkTotal;
    
    // ボトル
    const bottleTotal = order.bottles.reduce((sum, bottle) => sum + bottle.price, 0);
    acc.bottles += bottleTotal;
    
    // フード
    const foodTotal = order.foods.reduce((sum, food) => sum + (food.price * food.quantity), 0);
    acc.foods += foodTotal;
    
    // カラオケ
    const karaokeTotal = (order.karaokeCount || 0) * 200;
    acc.karaoke += karaokeTotal;

    return acc;
  }, {
    setPrice: 0,
    extension: 0,
    castDrinks: 0,
    bottles: 0,
    foods: 0,
    karaoke: 0
  });

  // 総売上（サービス料込み）
  const totalSales = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  // サービス料合計
  const totalServiceCharge = completedOrders.reduce((sum, order) => {
    const total = calculateTotal(order);
    return sum + calculateServiceCharge(total);
  }, 0);

  // 来店データ
  const visitData = {
    totalGroups: completedOrders.length,
    totalGuests: completedOrders.reduce((sum, order) => sum + order.guests, 0),
    averageSpendPerGuest: completedOrders.length > 0
      ? Math.round(totalSales / completedOrders.reduce((sum, order) => sum + order.guests, 0))
      : 0
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-purple-800 text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">売上集計</h1>
          <div className="text-sm">
            会計済み {completedOrders.length}組
          </div>
        </div>
        <button 
          className="bg-blue-600 text-white py-1 px-3 rounded-md text-sm flex items-center gap-2"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4" />
          戻る
        </button>
      </header>

      <div className="p-4 space-y-4 overflow-auto">
        {/* 総売上 */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-2 mb-4">
            <CircleDollarSign className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold">総売上</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">総売上</div>
              <div className="text-2xl font-bold text-green-600">
                ¥{formatPrice(totalSales)}
              </div>
              <div className="text-xs text-gray-500">
                (サービス料・カード手数料込み)
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">現金売上</div>
              <div className="text-xl font-bold">
                ¥{formatPrice(paymentMethodTotals.cash)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">カード・電子マネー売上</div>
              <div className="text-xl font-bold">
                ¥{formatPrice(paymentMethodTotals.card + paymentMethodTotals.electronic)}
              </div>
            </div>
          </div>
        </div>

        {/* キャスト成績 */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-bold">キャスト成績</h2>
            </div>
            <button
              className="bg-green-600 text-white px-3 py-1 rounded-md text-sm flex items-center gap-2"
              onClick={handleExportCSV}
            >
              <Download className="w-4 h-4" />
              CSV出力
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b">
                  <th className="pb-2">キャスト</th>
                  <th className="pb-2 text-center">ドリンク</th>
                  <th className="pb-2 text-center">紹介</th>
                  <th className="pb-2 text-center">キャッチ</th>
                  <th className="pb-2 text-center">担当ボトル</th>
                  <th className="pb-2 text-right">紹介伝票</th>
                </tr>
              </thead>
              <tbody>
                {sortedCastPerformance.map(cast => (
                  <tr key={cast.name} className={`border-b last:border-b-0 ${cast.name === 'その他' ? 'bg-gray-50' : ''}`}>
                    <td className="py-2">{cast.name}</td>
                    <td className="py-2 text-center">{cast.drinks}</td>
                    <td className="py-2 text-center">{cast.referrals.toFixed(1)}</td>
                    <td className="py-2 text-center">{cast.catches.toFixed(1)}</td>
                    <td className="py-2 text-center">
                      {cast.bottles > 0 ? (
                        <span>
                          {cast.bottles}
                          <span className="text-sm text-gray-500 ml-1">
                            (#
                            {cast.bottleOrderNumbers
                              .sort((a, b) => a - b)
                              .map((num, index) => (
                                <React.Fragment key={num}>
                                  {index > 0 && ', '}
                                  <button
                                    className="text-blue-600 hover:underline"
                                    onClick={() => handleOrderClick(num)}
                                  >
                                    {num}
                                  </button>
                                </React.Fragment>
                              ))}
                            )
                          </span>
                        </span>
                      ) : '0'}
                    </td>
                    <td className="py-2 text-right">
                      ¥{formatPrice(cast.referralAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 支払い方法別集計 */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-bold mb-4">支払い方法別集計</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-green-600" />
                <span>現金</span>
              </div>
              <span className="font-bold">¥{formatPrice(paymentMethodTotals.cash)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>カード</span>
              </div>
              <span className="font-bold">¥{formatPrice(paymentMethodTotals.card)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-purple-600" />
                <span>電子マネー</span>
              </div>
              <span className="font-bold">¥{formatPrice(paymentMethodTotals.electronic)}</span>
            </div>
          </div>
        </div>

        {/* 売上項目別集計 */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-bold mb-4">売上項目別集計</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>セット料金</span>
              <span className="font-bold">¥{formatPrice(salesByCategory.setPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span>延長料金</span>
              <span className="font-bold">¥{formatPrice(salesByCategory.extension)}</span>
            </div>
            <div className="flex justify-between">
              <span>キャストドリンク</span>
              <span className="font-bold">¥{formatPrice(salesByCategory.castDrinks)}</span>
            </div>
            <div className="flex justify-between">
              <span>ボトル</span>
              <span className="font-bold">¥{formatPrice(salesByCategory.bottles)}</span>
            </div>
            <div className="flex justify-between">
              <span>フード</span>
              <span className="font-bold">¥{formatPrice(salesByCategory.foods)}</span>
            </div>
            <div className="flex justify-between">
              <span>カラオケ</span>
              <span className="font-bold">¥{formatPrice(salesByCategory.karaoke)}</span>
            </div>
          </div>
        </div>

        {/* 来店データ */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-bold mb-4">来店データ</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">総来店組数</div>
              <div className="font-bold">{visitData.totalGroups}組</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">総来店人数</div>
              <div className="font-bold">{visitData.totalGuests}名</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">客単価</div>
              <div className="font-bold">¥{formatPrice(visitData.averageSpendPerGuest)}</div>
            </div>
          </div>
        </div>
      </div>

      {selectedOrder && (
        <OrderDetail
          order={orders.find(o => o.id === selectedOrder)!}
          onClose={() => setSelectedOrder(null)}
          scrollToSection="bottles"
        />
      )}
    </div>
  );
};

export default DailySales;