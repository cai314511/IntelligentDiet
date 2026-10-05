// Campus meal windows use Beijing time, independent of the browser's timezone.
export const MEAL_WINDOWS = [
  { meal: '早餐', start: 390, end: 510, label: '06:30–08:30' },
  { meal: '午餐', start: 630, end: 780, label: '10:30–13:00' },
  { meal: '晚餐', start: 1020, end: 1140, label: '17:00–19:00' },
];
export function currentMeal(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const minute = Number(parts.find(p => p.type === 'hour').value) * 60 + Number(parts.find(p => p.type === 'minute').value);
  return MEAL_WINDOWS.find(w => minute >= w.start && minute < w.end) || null;
}
export function servingMeals(dish) {
  if (Array.isArray(dish.servingMeals) && dish.servingMeals.length) return dish.servingMeals;
  // Existing menu classifies breakfast explicitly; no separate lunch/dinner ledger yet.
  return dish.category === '早餐' || dish.category === '粥品' ? ['早餐'] : ['午餐', '晚餐'];
}
export function availableForDirectOrder(dish, now = new Date()) {
  const window = currentMeal(now);
  return Boolean(window && servingMeals(dish).includes(window.meal));
}
