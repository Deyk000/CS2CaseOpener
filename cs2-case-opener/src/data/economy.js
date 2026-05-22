export const COIN_PACKAGES = Object.freeze([
  { id: 'starter', coins: 1000, price: 0.99, label: 'Starter', bonus: 0 },
  { id: 'popular', coins: 5500, price: 4.99, label: 'Popular', bonus: 500 },
  { id: 'value', coins: 12000, price: 9.99, label: 'Value', bonus: 2000 },
  { id: 'mega', coins: 28000, price: 19.99, label: 'Mega', bonus: 8000 },
]);

// All prices are in EUR. Real CS2 case keys cost €2.49.
export const KEY_COST = 2.49;
export const CASE_COST = 0;
export const SELL_TAX = 0.15;
export const TRADE_UP_COST = 10;
// Starting balance — covers ~10 case opens before the user has to sell something.
export const STARTING_BALANCE = 25;
export const DAILY_REWARD_COINS = 2;
export const STREAK_BONUS = Object.freeze([0, 0.5, 1, 1.5, 2, 3, 5]);
