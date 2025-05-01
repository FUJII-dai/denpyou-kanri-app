// Order type definitions
export interface Order {
  id: string;
  orderNumber: number;
  tableType: string;
  tableNum: number;
  guests: number;
  startTime: string;
  endTime: string;
  duration: string;
  customerName: string;
  catchCasts: string[];
  referralCasts: string[];
  extensions: Extension[];
  menus: Menu[];
  castDrinks: CastDrink[];
  bottles: Bottle[];
  foods: Food[];
  drinkType: string;
  drinkPrice: number;
  karaokeCount: number;
  note: string;
  totalAmount: number;
  status: 'active' | 'completed' | 'deleted';
  paymentMethod?: PaymentMethod;
  paymentDetails?: PaymentDetails;
  tempCastDrink?: { cast: string; count: string };
  tempBottle?: { name: string; price: string };
  tempFood?: { name: string; price: string };
  created_at?: string;
  updated_at?: string;
}

export interface Extension {
  id: number;
  count: number;
  endTime: string;
  guests: number;
  unitPrice: number;
  price: number;
  totalPrice: number;
}

export interface Menu {
  id: number;
  name: string;
  price: number;
}

export interface CastDrink {
  id: number;
  cast: string;
  count: number;
  price: number;
  display?: string;
}

export interface Bottle {
  id: number;
  name: string;
  price: number;
  mainCasts?: string[];
  helpCasts?: string[];
  note?: string;
}

export interface Food {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export type PaymentMethod = 'cash' | 'card' | 'electronic' | 'partial_cash';

export interface PaymentDetails {
  cashAmount?: number;
  cardAmount?: number;
  electronicAmount?: number;
  cardFee?: number;
  hasCardFee: boolean;
}

export interface CastPerformance {
  name: string;
  drinks: number;
  referrals: number;
  catches: number;
  bottles: number;
  bottleOrderNumbers: number[];
  referralAmount: number;
}

export interface OrderHistory {
  id: string;
  orderId: string;
  action: 'create' | 'update' | 'delete';
  changes: {
    old?: Partial<Order>;
    new?: Partial<Order>;
  };
  changedBy?: string;
  changedAt: string;
}