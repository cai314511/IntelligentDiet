import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.DB_PATH = ':memory:';
const { db } = await import('../database.js');
const { default: app } = await import('../app.js');
const bcrypt = (await import('bcryptjs')).default;

let adminToken;
let user1Token;
let user2Token;

before(async () => {
  db.prepare("INSERT INTO yonghu (id, zhanghao, mima, xingming, role, jine) VALUES (1, 'boss', ?, '老板', 'admin', 0)")
    .run(bcrypt.hashSync('boss123', 10));
  db.prepare("INSERT INTO yonghu (id, zhanghao, mima, xingming, role, jine) VALUES (2, 'user1', ?, '用户一', 'user', 100)")
    .run(bcrypt.hashSync('pass123', 10));
  db.prepare("INSERT INTO yonghu (id, zhanghao, mima, xingming, role, jine) VALUES (3, 'user2', ?, '用户二', 'user', 100)")
    .run(bcrypt.hashSync('pass123', 10));
  db.prepare("INSERT OR IGNORE INTO caipinfenlei (caipinfenlei) VALUES ('热菜')").run();
  db.prepare("INSERT INTO caipinxinxi (id, caipinmingcheng, caipinfenlei, jiage, kucun, yueshuxiao) VALUES (1, '测试菜', '热菜', 10, 40, 20)").run();
  // 已支付订单：2 份测试菜，总额 20（单订单单行即可覆盖退款逻辑，orderid 已不唯一，多行订单同样适用）
  db.prepare(`INSERT INTO orders (orderid, userid, caipinxinxiid, caipinmingcheng, buyshu, price, total, status)
              VALUES ('ORDER-R1', 2, 1, '测试菜', 2, 10, 20, '已支付')`).run();
  // 普通流转对照订单
  db.prepare(`INSERT INTO orders (orderid, userid, caipinxinxiid, caipinmingcheng, buyshu, price, total, status)
              VALUES ('ORDER-R2', 2, 1, '测试菜', 1, 10, 10, '已支付')`).run();
  // user2 自己的订单（用于越权校验）
  db.prepare(`INSERT INTO orders (orderid, userid, caipinxinxiid, caipinmingcheng, buyshu, price, total, status)
              VALUES ('ORDER-U2', 3, 1, '测试菜', 1, 10, 10, '未支付')`).run();

  const loginAdmin = await request(app).post('/api/users/login').send({ zhanghao: 'boss', mima: 'boss123' });
  adminToken = loginAdmin.body.data.token;
  const login1 = await request(app).post('/api/users/login').send({ zhanghao: 'user1', mima: 'pass123' });
  user1Token = login1.body.data.token;
  const login2 = await request(app).post('/api/users/login').send({ zhanghao: 'user2', mima: 'pass123' });
  user2Token = login2.body.data.token;
});

test('已支付订单退款：余额回增、库存/月售回退、状态变已退款', async () => {
  const res = await request(app).put('/api/orders/ORDER-R1/status')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: '已退款' });
  assert.equal(res.status, 200);

  // 状态
  const row = db.prepare("SELECT status FROM orders WHERE orderid = 'ORDER-R1'").get();
  assert.equal(row.status, '已退款');

  // 用户余额：100 + 20 = 120
  const jine = db.prepare('SELECT jine FROM yonghu WHERE id = 2').get().jine;
  assert.equal(jine, 120);

  // 菜品：库存 40+2=42，月售 20-2=18
  const dish1 = db.prepare('SELECT kucun, yueshuxiao FROM caipinxinxi WHERE id = 1').get();
  assert.equal(dish1.kucun, 42);
  assert.equal(dish1.yueshuxiao, 18);
});

test('非退款状态流转不回退资金库存', async () => {
  const res = await request(app).put('/api/orders/ORDER-R2/status')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: '制作中' });
  assert.equal(res.status, 200);

  const jine = db.prepare('SELECT jine FROM yonghu WHERE id = 2').get().jine;
  assert.equal(jine, 120); // 与上一测试后保持一致
  const dish1 = db.prepare('SELECT kucun, yueshuxiao FROM caipinxinxi WHERE id = 1').get();
  assert.equal(dish1.kucun, 42);
  assert.equal(dish1.yueshuxiao, 18);
});

test('GET /orders/user/:userid 本人 200，他人 403，admin 200', async () => {
  const self = await request(app).get('/api/orders/user/3')
    .set('Authorization', `Bearer ${user2Token}`);
  assert.equal(self.status, 200);

  const other = await request(app).get('/api/orders/user/3')
    .set('Authorization', `Bearer ${user1Token}`);
  assert.equal(other.status, 403);

  const admin = await request(app).get('/api/orders/user/3')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(admin.status, 200);
});
