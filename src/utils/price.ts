import { Order, Extension, CastDrink, Bottle, Food } from '../types/order';

export const calculateDrinkTotal = (order: Order): number => {
  if (!order.drinkPrice) return 0;
  
  const basePrice = order.guests * order.drinkPrice;
  const extensionTotal = order.extensions.reduce((sum, ext) => sum + ext.price, 0);
  
  return basePrice + extensionTotal;
};

export const calculateCastDrinkTotal = (castDrinks: CastDrink[]): number => {
  return castDrinks.reduce((sum, drink) => sum + drink.price, 0);
};

export const calculateBottleTotal = (bottles: Bottle[]): number => {
  return bottles.reduce((sum, bottle) => sum + bottle.price, 0);
};

export const calculateFoodTotal = (foods: Food[]): number => {
  return foods.reduce((sum, food) => sum + (food.price * food.quantity), 0);
};

export const calculateKaraokeTotal = (count: number): number => {
  return count * 200; // 1曲200円
};

export const calculateServiceCharge = (total: number): number => {
  return Math.floor(total * 0.15); // 15%のサービス料
};

export const calculateTotal = (order: Order): number => {
  const drinkTotal = calculateDrinkTotal(order);
  const castDrinkTotal = calculateCastDrinkTotal(order.castDrinks);
  const bottleTotal = calculateBottleTotal(order.bottles);
  const foodTotal = calculateFoodTotal(order.foods);
  const karaokeTotal = calculateKaraokeTotal(order.karaokeCount || 0);
  
  return drinkTotal + castDrinkTotal + bottleTotal + foodTotal + karaokeTotal;
};

export const formatPrice = (price: number): string => {
  return price.toLocaleString();
};