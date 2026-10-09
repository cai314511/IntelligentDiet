import test from 'node:test';
import assert from 'node:assert/strict';
import { currentMeal, availableForDirectOrder, servingMeals } from '../shared/meal-service.mjs';
const at = time => new Date(`2026-10-05T${time}:00+08:00`);
test('Beijing meal windows start inclusively and close exclusively', () => {
  for (const [time, expected] of [['06:29',null],['06:30','早餐'],['08:29','早餐'],['08:30',null],['10:29',null],['10:30','午餐'],['12:59','午餐'],['13:00',null],['16:59',null],['17:00','晚餐'],['18:59','晚餐'],['19:00',null]]) {
    assert.equal(currentMeal(at(time))?.meal || null, expected, time);
  }
  assert.equal(currentMeal(new Date('2026-10-04T22:30:00Z')).meal,'早餐');
});
test('直接购买按餐次和北京时间校验，浏览与预约不使用该限制', () => {
  const breakfast = {category:'早餐',name:'豆浆'}, main={category:'热菜',name:'鸭血豆腐'};
  assert.equal(availableForDirectOrder(breakfast,at('07:00')),true);
  assert.equal(availableForDirectOrder(main,at('07:00')),false);
  assert.equal(availableForDirectOrder(breakfast,at('11:00')),false);
  assert.equal(availableForDirectOrder(main,at('11:00')),true);
  assert.equal(availableForDirectOrder(main,at('18:00')),true);
  assert.equal(availableForDirectOrder(main,at('15:00')),false);
  // 菜品浏览与预约保留完整目录，该判断仅用于直接购买。
  assert.deepEqual(servingMeals(breakfast),['早餐']);
  assert.deepEqual(servingMeals(main),['午餐','晚餐']);
});
test('explicit meal assignments override the category fallback', () => {
  assert.equal(availableForDirectOrder({category:'面食',servingMeals:['早餐']},at('07:00')),true);
  assert.equal(availableForDirectOrder({category:'面食',servingMeals:['早餐']},at('11:00')),false);
});
