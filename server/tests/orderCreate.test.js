import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.DB_PATH = ':memory:';
const { db } = await import('../database.js');
const { default: app } = await import('../app.js');
const bcrypt = (await import('bcryptjs')).default;

let token;

before(async () => {
  db.prepare("INSERT INTO yonghu (id, zhanghao, mima, xingming, jine) VALUES (1, 'u1', ?, '用户一', 100)")
    .run(bcrypt.hashSync('pw123456', 10));
  db.prepare("INSERT OR IGNORE INTO caipinfenlei (caipinfenlei) VALUES ('热菜')").run();
  db.prepare("INSERT OR IGNORE INTO caipinfenlei (caipinfenlei) VALUES ('素菜')").run();
  db.prepare("INSERT INTO caipinxinxi (id, caipinmingcheng, caipinfenlei, jiage, kucun) VALUES (1, '红烧肉', '热菜', 15, 2)").run();
  db.prepare("INSERT INTO caipinxinxi (id, caipinmingcheng, caipinfenlei, jiage, kucun) VALUES (2, '青菜', '素菜', 5, 100)").run();
  const login = await request(app).post('/api/users/login').send({ zhanghao: 'u1', mima: 'pw123456' });
  token = login.body.data.token;
});

test('正常下单成功并返回总价', async () => {
  const res = await request(app).post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({ items: [{ dishId: 2, quantity: 2 }], remark: '少辣' });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.orderid);
  assert.equal(res.body.data.totalPrice, 10);
});

test('库存不足返回 409 且不产生任何订单行', async () => {
  const res = await request(app).post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({ items: [{ dishId: 1, quantity: 5 }, { dishId: 2, quantity: 1 }] });
  assert.equal(res.status, 409);
  assert.match(res.body.message, /库存不足/);
  // 订单表一行一菜品（quantity 存 buyshu），上一用例对菜品 2 只产生 1 行
  const count = db.prepare("SELECT COUNT(*) AS c FROM orders WHERE caipinxinxiid = 2").get().c;
  assert.equal(count, 1, '库存不足时不得残留部分订单行');
});
