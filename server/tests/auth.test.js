import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.DB_PATH = ':memory:';
const { db } = await import('../database.js');
const { default: app } = await import('../app.js');
const bcrypt = (await import('bcryptjs')).default;

let userToken, adminToken;

before(async () => {
  // 内存库无种子数据，先补菜品分类以满足 caipinxinxi 的外键约束
  db.prepare("INSERT OR IGNORE INTO caipinfenlei (caipinfenlei) VALUES ('热菜')").run();
  db.prepare("INSERT INTO yonghu (zhanghao, mima, xingming, jine, role) VALUES ('u1', ?, '用户一', 100, 'user')")
    .run(bcrypt.hashSync('pw123456', 10));
  db.prepare("INSERT INTO yonghu (zhanghao, mima, xingming, jine, role) VALUES ('boss', ?, '老板', 0, 'admin')")
    .run(bcrypt.hashSync('boss123', 10));
});

test('正确密码登录返回 token 和 role', async () => {
  const res = await request(app).post('/api/users/login').send({ zhanghao: 'u1', mima: 'pw123456' });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.token);
  assert.equal(res.body.data.user.role, 'user');
  userToken = res.body.data.token;
});

test('错误密码登录返回 401', async () => {
  const res = await request(app).post('/api/users/login').send({ zhanghao: 'u1', mima: 'wrong' });
  assert.equal(res.status, 401);
});

test('无 token 调用受保护接口返回 401', async () => {
  const res = await request(app).post('/api/dishes').send({ caipinmingcheng: 'x', caipinfenlei: '热菜', jiage: 1 });
  assert.equal(res.status, 401);
});

test('普通用户调用管理员接口返回 403，admin 放行', async () => {
  const noPerm = await request(app).post('/api/dishes')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ caipinmingcheng: 'x', caipinfenlei: '热菜', jiage: 1 });
  assert.equal(noPerm.status, 403);

  const login = await request(app).post('/api/users/login').send({ zhanghao: 'boss', mima: 'boss123' });
  adminToken = login.body.data.token;
  const ok = await request(app).post('/api/dishes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ caipinmingcheng: '测试菜', caipinfenlei: '热菜', jiage: 9.9 });
  assert.equal(ok.status, 200);
});
