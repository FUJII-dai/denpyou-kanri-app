import { z } from 'zod';

/**
 * Schema for withdrawal data
 */
export const WithdrawalSchema = z.object({
  id: z.string().uuid().optional(),
  amount: z.number().int().min(0),
  note: z.string().optional(),
  timestamp: z.string().datetime().optional().default(() => new Date().toISOString()),
});

export type Withdrawal = z.infer<typeof WithdrawalSchema>;

/**
 * Schema for register cash data
 */
export const RegisterCashSchema = z.object({
  businessDate: z.string().datetime(),
  startingAmount: z.number().int().min(0).default(0),
  coinsAmount: z.number().int().min(0).default(0),
  withdrawals: z.array(WithdrawalSchema).default([]),
  nextDayAmount: z.number().int().min(0).default(0),
  nextDayCoins: z.number().int().min(0).default(0),
});

export type RegisterCash = z.infer<typeof RegisterCashSchema>;

/**
 * Schema for register cash database record
 */
export const RegisterCashDbSchema = z.object({
  business_date: z.string(),
  starting_amount: z.number().int().min(0).default(0),
  coins_amount: z.number().int().min(0).default(0),
  withdrawals: z.array(WithdrawalSchema).default([]),
  next_day_amount: z.number().int().min(0).default(0),
  next_day_coins: z.number().int().min(0).default(0),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type RegisterCashDb = z.infer<typeof RegisterCashDbSchema>;

/**
 * Convert database record to application model
 */
export function dbToModel(dbRecord: RegisterCashDb): RegisterCash {
  return {
    businessDate: dbRecord.business_date,
    startingAmount: dbRecord.starting_amount,
    coinsAmount: dbRecord.coins_amount,
    withdrawals: dbRecord.withdrawals,
    nextDayAmount: dbRecord.next_day_amount,
    nextDayCoins: dbRecord.next_day_coins,
  };
}

/**
 * Convert application model to database record
 */
export function modelToDb(model: RegisterCash): Omit<RegisterCashDb, 'created_at' | 'updated_at'> {
  return {
    business_date: model.businessDate,
    starting_amount: model.startingAmount,
    coins_amount: model.coinsAmount,
    withdrawals: model.withdrawals,
    next_day_amount: model.nextDayAmount,
    next_day_coins: model.nextDayCoins,
  };
}
