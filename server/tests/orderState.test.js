import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.DB_PATH = ':memory:';
const { db } = await import('../database.js');
const { default: app } = await import('../app.js');
const { canTransition } = await import('../utils/orderState.js');
const bcrypt = (await import('bcryptjs')).default;

let adminToken;

before(async () => {
  db.prepare("INSERT INTO yonghu (id, zhanghao, mima, xingming, role) VALUES (1, 'boss', ?, '老板', 'admin')")
    .run(bcrypt.hashSync('boss123', 10));
  db.prepare("INSERT OR IGNORE INTO caipinfenlei (caipinfenlei) VALUES ('热菜')").run();
  db.prepare("INSERT INTO caipinxinxi (id, caipinmingcheng, caipinfenlei, jiage, kucun) VALUES (1, '测试菜', '热菜', 10, 50)").run();
  db.prepare(`INSERT INTO orders (orderid, userid, caipinxinxiid, caipinmingcheng, buyshu, price, total, status)
              VALUES ('ORDER-T1', 1, 1, '测试菜', 1, 10, 10, '已支付')`).run();
  const login = await request(app).post('/api/users/login').send({ zhanghao: 'boss', mima: 'boss123' });
  adminToken = login.body.data.token;
});

test('canTransition 状态机规则', () => {
  assert.equal(canTransition('未支付', '已支付'), true);
  assert.equal(canTransition('已支付', '制作中'), true);
  assert.equal(canTransition('制作中', '待取餐'), true);
  assert.equal(canTransition('待取餐', '已完成'), true);
  assert.equal(canTransition('未支付', '已完成'), false);
  assert.equal(canTransition('已完成', '制作中'), false);
  assert.equal(canTransition('已支付', '已完成'), false);
});

test('非法状态流转返回 409', async () => {
  const res = await request(app).put('/api/orders/ORDER-T1/status')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: '已完成' }); // 已支付 不能直接到 已完成
  assert.equal(res.status, 409);
});

test('合法流转成功，不存在的订单返回 404', async () => {
  const ok = await request(app).put('/api/orders/ORDER-T1/status')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: '制作中' });
  assert.equal(ok.status, 200);

  const notFound = await request(app).put('/api/orders/ORDER-NOPE/status')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: '制作中' });
  assert.equal(notFound.status, 404);
});

test('GET /:orderid 查不到返回 404', async () => {
  const res = await request(app).get('/api/orders/ORDER-NOPE')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(res.status, 404);
});
