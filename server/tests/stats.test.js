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

let adminToken, userToken;

before(async () => {
  db.prepare("INSERT INTO caipinfenlei (caipinfenlei) VALUES ('热菜')").run();
  db.prepare("INSERT INTO yonghu (id, zhanghao, mima, xingming, role) VALUES (1, 'boss', ?, '老板', 'admin')").run(bcrypt.hashSync('boss123', 10));
  db.prepare("INSERT INTO yonghu (id, zhanghao, mima, xingming, jine, role) VALUES (2, 'stu', ?, '学生', 1000, 'user')").run(bcrypt.hashSync('stu12345', 10));
  db.prepare("INSERT INTO caipinxinxi (id, caipinmingcheng, caipinfenlei, jiage, kucun, shangjia) VALUES (1, '红烧肉', '热菜', 15, 5, '是')").run();
  db.prepare("INSERT INTO caipinxinxi (id, caipinmingcheng, caipinfenlei, jiage, kucun, shangjia) VALUES (2, '青菜', '热菜', 5, 5, '否')").run();
  db.prepare("INSERT INTO orders (orderid, userid, caipinxinxiid, caipinmingcheng, buyshu, price, total, status) VALUES ('O1', 2, 1, '红烧肉', 2, 15, 30, '已完成')").run();
  db.prepare("INSERT INTO orders (orderid, userid, caipinxinxiid, caipinmingcheng, buyshu, price, total, status) VALUES ('O2', 2, 1, '红烧肉', 1, 15, 15, '已支付')").run();
  db.prepare("INSERT INTO messages (userid, yonghuming, content) VALUES (2, '学生', '建议')").run();
  db.prepare("INSERT INTO restaurants (school_id,campus,name) VALUES ('cufe','沙河校区','东区三层食堂')").run();
  adminToken = (await request(target).post('/api/users/login').send({ zhanghao: 'boss', mima: 'boss123', schoolId: 'cufe' })).body.data.token;
  userToken = (await request(target).post('/api/users/login').send({ zhanghao: 'stu', mima: 'stu12345', schoolId: 'cufe' })).body.data.token;
});

test('stats/dashboard 返回全字段且数值正确', async () => {
  const res = await request(target).get('/api/stats/dashboard').set('Authorization', `Bearer ${adminToken}`);
  assert.equal(res.status, 200);
  const d = res.body.data;
  assert.equal(d.totalUsers, 1);            // role='user' 仅 stu
  assert.equal(d.totalOrders, 2);           // DISTINCT orderid
  assert.equal(d.totalRevenue, 45);         // 已支付+已完成计入
  assert.equal(d.todayOrders, 2);           // 种子订单 addtime 默认当前时间（UTC+8 今日）
  assert.equal(d.onSaleDishes, 1);
  assert.equal(d.totalDishes, 2);
  assert.equal(d.lowStockCount, 1);         // kucun=5 < 20
  assert.equal(d.pendingAccept, 1);         // 已支付待接单
  assert.equal(d.pendingPickup, 0);
  assert.equal(d.unrepliedMessages, 1);
  assert.ok(d.avgOrderValue > 0);
});

test('stats/dashboard 非 admin 403，无 token 401', async () => {
  const r1 = await request(target).get('/api/stats/dashboard').set('Authorization', `Bearer ${userToken}`);
  assert.equal(r1.status, 403);
  const r2 = await request(target).get('/api/stats/dashboard');
  assert.equal(r2.status, 401);
});

test('餐厅信息按中央财经大学校区隔离', async () => {
  const res = await request(target).get('/api/restaurants');
  const names = res.body.data.map(r => r.name);
  assert.ok(names.includes('沙河校区·东区三层食堂'));
  assert.equal(names.length, 1);
  assert.ok(names.every(name => !name.includes('卫津路') && !name.includes('北洋园')));
});
