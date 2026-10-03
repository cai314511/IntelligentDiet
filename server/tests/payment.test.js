import {targetFor} from './support/target.js';
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.DB_PATH = ':memory:';
process.env.SEED_REFERENCE_DATA = 'false';
const { db } = await import('../database.js');
const { default: app } = await import('../app.js');
const target=await targetFor(app);
const bcrypt = (await import('bcryptjs')).default;

let userToken, adminToken, orderid;

before(async () => {
  db.prepare("INSERT INTO yonghu (id, zhanghao, mima, xingming, jine, role) VALUES (1, 'u1', ?, '用户一', 100, 'user')")
    .run(bcrypt.hashSync('pw123456', 10));
  db.prepare("INSERT INTO yonghu (id, zhanghao, mima, xingming, jine, role) VALUES (2, 'boss', ?, '老板', 0, 'admin')")
    .run(bcrypt.hashSync('boss123', 10));
  db.prepare("INSERT OR IGNORE INTO caipinfenlei (caipinfenlei) VALUES ('热菜')").run();
  db.prepare("INSERT INTO caipinxinxi (id, caipinmingcheng, caipinfenlei, jiage, kucun) VALUES (1, '红烧肉', '热菜', 15, 10)").run();
  userToken = (await request(target).post('/api/users/login').send({ zhanghao: 'u1', mima: 'pw123456', schoolId: 'cufe' })).body.data.token;
  adminToken = (await request(target).post('/api/users/login').send({ zhanghao: 'boss', mima: 'boss123', schoolId: 'cufe' })).body.data.token;
  const order = await request(target).post('/api/orders')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ items: [{ dishId: 1, quantity: 2 }] });
  orderid = order.body.data.orderid;
});

let pickupCode;

test('支付成功：扣余额、扣库存、生成取餐码、状态变已支付', async () => {
  const res = await request(target).post(`/api/orders/${orderid}/pay`)
    .set('Authorization', `Bearer ${userToken}`);
  assert.equal(res.status, 200);
  pickupCode = res.body.data.pickupCode;
  assert.match(pickupCode, /^[A-Z]\d{3}$/);
  assert.equal(res.body.data.balance, 70); // 100 - 30
  assert.equal(db.prepare('SELECT kucun FROM caipinxinxi WHERE id = 1').get().kucun, 8);
  assert.equal(db.prepare('SELECT DISTINCT status FROM orders WHERE orderid = ?').get(orderid).status, '已支付');
});

test('重复支付返回 409', async () => {
  const res = await request(target).post(`/api/orders/${orderid}/pay`)
    .set('Authorization', `Bearer ${userToken}`);
  assert.equal(res.status, 409);
});

test('他人订单支付返回 403', async () => {
  const other = await request(target).post('/api/orders')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ items: [{ dishId: 1, quantity: 1 }] });
  const res = await request(target).post(`/api/orders/${other.body.data.orderid}/pay`)
    .set('Authorization', `Bearer ${adminToken}`); // admin 的 token 但订单属于 u1
  assert.equal(res.status, 403);
});

test('状态流转到待取餐后，错误取餐码核销 409，正确取餐码核销成功', async () => {
  await request(target).put(`/api/orders/${orderid}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: '制作中' });
  await request(target).put(`/api/orders/${orderid}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: '待取餐' });

  const wrong = await request(target).post(`/api/orders/${orderid}/pickup`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ pickupCode: 'Z999' });
  assert.equal(wrong.status, 409);

  const ok = await request(target).post(`/api/orders/${orderid}/pickup`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ pickupCode });
  assert.equal(ok.status, 200);
  assert.equal(db.prepare('SELECT DISTINCT status FROM orders WHERE orderid = ?').get(orderid).status, '已完成');
});

test('余额不足支付返回 409 且余额不变', async () => {
  db.prepare('UPDATE yonghu SET jine = 5 WHERE id = 1').run();
  const order = await request(target).post('/api/orders')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ items: [{ dishId: 1, quantity: 1 }] }); // 15 元 > 5 元
  const res = await request(target).post(`/api/orders/${order.body.data.orderid}/pay`)
    .set('Authorization', `Bearer ${userToken}`);
  assert.equal(res.status, 409);
  assert.equal(db.prepare('SELECT jine FROM yonghu WHERE id = 1').get().jine, 5);
});
