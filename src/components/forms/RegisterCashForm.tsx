import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RefreshCw, Plus, X, Download } from 'lucide-react';
import NumberInput from '../ui/NumberInput';
import { RegisterCash } from '../../types/schema/registerCash';
import { formatPrice } from '../../utils/price';

const RegisterCashFormSchema = z.object({
  startingAmount: z.number().int().min(0),
  coinsAmount: z.number().int().min(0),
  nextDayAmount: z.number().int().min(0),
  nextDayCoins: z.number().int().min(0),
});

type RegisterCashFormValues = z.infer<typeof RegisterCashFormSchema>;

interface RegisterCashFormProps {
  currentCash: RegisterCash | null;
  cashSales: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  onUpdateStartingAmount: (amount: number) => Promise<void>;
  onUpdateCoinsAmount: (amount: number) => Promise<void>;
  onUpdateNextDayAmount: (amount: number) => Promise<void>;
  onUpdateNextDayCoins: (amount: number) => Promise<void>;
  onAddWithdrawal: (amount: number, note?: string) => Promise<void>;
  onRemoveWithdrawal: (id: string) => Promise<void>;
  onExportCSV: () => void;
}

const RegisterCashForm: React.FC<RegisterCashFormProps> = ({
  currentCash,
  cashSales,
  isRefreshing,
  onRefresh,
  onUpdateStartingAmount,
  onUpdateCoinsAmount,
  onUpdateNextDayAmount,
  onUpdateNextDayCoins,
  onAddWithdrawal,
  onRemoveWithdrawal,
  onExportCSV,
}) => {
  const [withdrawalForms, setWithdrawalForms] = useState([{ amount: '', note: '' }]);

  const { control } = useForm<RegisterCashFormValues>({
    resolver: zodResolver(RegisterCashFormSchema),
    defaultValues: {
      startingAmount: currentCash?.startingAmount || 0,
      coinsAmount: currentCash?.coinsAmount || 0,
      nextDayAmount: currentCash?.nextDayAmount || 0,
      nextDayCoins: currentCash?.nextDayCoins || 0,
    },
  });

  const handleWithdrawalChange = (index: number, field: 'amount' | 'note', value: string) => {
    const newForms = [...withdrawalForms];
    newForms[index] = { ...newForms[index], [field]: value };
    setWithdrawalForms(newForms);
  };

  const handleAddWithdrawalForm = () => {
    setWithdrawalForms([...withdrawalForms, { amount: '', note: '' }]);
  };

  const handleRemoveWithdrawalForm = (index: number) => {
    const newForms = withdrawalForms.filter((_, i) => i !== index);
    setWithdrawalForms(newForms);
  };

  const handleSubmitWithdrawal = async (index: number) => {
    const form = withdrawalForms[index];
    const amount = parseInt(form.amount);
    if (amount > 0) {
      try {
        await onAddWithdrawal(amount, form.note || undefined);
        const newForms = [...withdrawalForms];
        newForms[index] = { amount: '', note: '' };
        if (index === withdrawalForms.length - 1) {
          newForms.push({ amount: '', note: '' });
        }
        setWithdrawalForms(newForms);
      } catch (error) {
        console.error('[RegisterCashForm] Failed to add withdrawal:', error);
      }
    }
  };

  const calculateTotalWithdrawals = () => {
    if (!currentCash?.withdrawals) return 0;
    return currentCash.withdrawals.reduce((sum, w) => sum + w.amount, 0);
  };

  const calculateCurrentTotal = () => {
    const startingAmount = currentCash?.startingAmount || 0;
    const coinsAmount = currentCash?.coinsAmount || 0;
    const totalWithdrawals = calculateTotalWithdrawals();

    return cashSales + startingAmount + coinsAmount - totalWithdrawals;
  };

  const calculateCashCollection = () => {
    const currentTotal = calculateCurrentTotal();
    const nextAmount = currentCash?.nextDayAmount || 0;
    const nextCoins = currentCash?.nextDayCoins || 0;
    return currentTotal - nextAmount - nextCoins;
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end gap-2 mb-4">
        <button
          className="bg-green-600 text-white py-1 px-3 rounded-md text-sm flex items-center gap-2"
          onClick={onExportCSV}
        >
          <Download className="w-4 h-4" />
          CSV出力
        </button>
        <button
          className="bg-green-600 text-white py-1 px-3 rounded-md text-sm flex items-center gap-2"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          更新
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg font-bold mb-2">現時点の現金売上</h2>
        <div className="text-2xl font-bold text-green-600">
          ¥{formatPrice(cashSales)}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg font-bold mb-4">レジ金設定</h2>
        
        <div className="space-y-4">
          <Controller
            name="startingAmount"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="開始レジ金"
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  onUpdateStartingAmount(value);
                }}
                placeholder="0"
              />
            )}
          />

          <Controller
            name="coinsAmount"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="小銭"
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  onUpdateCoinsAmount(value);
                }}
                placeholder="0"
              />
            )}
          />

          <div>
            <div className="flex justify-between items-center mb-2">
              <div>
                <label className="block text-sm text-gray-600">出金履歴</label>
                <div className="text-xs text-gray-500">
                  合計: ¥{formatPrice(calculateTotalWithdrawals())}
                </div>
              </div>
              <button
                className="text-blue-600 text-sm flex items-center gap-1"
                onClick={handleAddWithdrawalForm}
              >
                <Plus className="w-4 h-4" />
                フォーム追加
              </button>
            </div>

            {currentCash?.withdrawals.map(withdrawal => (
              <div key={withdrawal.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-md mb-2">
                <span className="flex-1">¥{formatPrice(withdrawal.amount)}</span>
                {withdrawal.note && (
                  <span className="text-sm text-gray-600">{withdrawal.note}</span>
                )}
                <button
                  className="text-red-500"
                  onClick={() => onRemoveWithdrawal(withdrawal.id!)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            <div className="space-y-2">
              {withdrawalForms.map((form, index) => (
                <div key={index} className="grid grid-cols-12 gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="col-span-3 border rounded-md p-2"
                    value={form.amount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      handleWithdrawalChange(index, 'amount', value);
                    }}
                    onFocus={(e) => e.target.select()}
                    placeholder="出金額"
                  />
                  <input
                    type="text"
                    className="col-span-7 border rounded-md p-2"
                    value={form.note}
                    onChange={(e) => handleWithdrawalChange(index, 'note', e.target.value)}
                    placeholder="備考（任意）"
                  />
                  <div className="col-span-2 flex gap-1">
                    <button
                      className="flex-1 bg-blue-600 text-white p-2 rounded-md"
                      onClick={() => handleSubmitWithdrawal(index)}
                      disabled={!form.amount}
                    >
                      <Plus className="w-4 h-4 mx-auto" />
                    </button>
                    {withdrawalForms.length > 1 && (
                      <button
                        className="flex-1 bg-red-600 text-white p-2 rounded-md"
                        onClick={() => handleRemoveWithdrawalForm(index)}
                      >
                        <X className="w-4 h-4 mx-auto" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg font-bold mb-4">翌日レジ金設定</h2>
        
        <div className="space-y-4">
          <Controller
            name="nextDayAmount"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="翌日レジ金"
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  onUpdateNextDayAmount(value);
                }}
                placeholder="0"
              />
            )}
          />

          <Controller
            name="nextDayCoins"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="翌日小銭"
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  onUpdateNextDayCoins(value);
                }}
                placeholder="0"
              />
            )}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="font-bold mb-2">現金回収</h2>
        <div className="text-2xl font-bold text-blue-600">
          ¥{formatPrice(calculateCashCollection())}
        </div>
        <div className="text-sm text-gray-600 mt-1">
          (現在レジ金 - 翌日レジ金 - 翌日小銭)
        </div>
        <div className="mt-2 text-sm text-gray-600">
          <div>現在レジ金: ¥{formatPrice(calculateCurrentTotal())}</div>
          <div>翌日レジ金: ¥{formatPrice(currentCash?.nextDayAmount || 0)}</div>
          <div>翌日小銭: ¥{formatPrice(currentCash?.nextDayCoins || 0)}</div>
        </div>
      </div>
    </div>
  );
};

export default RegisterCashForm;
