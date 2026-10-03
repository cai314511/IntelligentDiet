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
  const res = await request(target).post('/api/users/login').send({ zhanghao: 'u1', mima: 'pw123456', schoolId: 'cufe' });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.token);
  assert.equal(res.body.data.user.role, 'user');
  userToken = res.body.data.token;
});

test('错误密码登录返回 401', async () => {
  const res = await request(target).post('/api/users/login').send({ zhanghao: 'u1', mima: 'wrong', schoolId: 'cufe' });
  assert.equal(res.status, 401);
});

test('无 token 调用受保护接口返回 401', async () => {
  const res = await request(target).post('/api/dishes').send({ caipinmingcheng: 'x', caipinfenlei: '热菜', jiage: 1 });
  assert.equal(res.status, 401);
});

test('普通用户调用管理员接口返回 403，admin 放行', async () => {
  const noPerm = await request(target).post('/api/dishes')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ name: 'x', category: '热菜', price: 1 });
  assert.equal(noPerm.status, 403);

  const login = await request(target).post('/api/users/login').send({ zhanghao: 'boss', mima: 'boss123', schoolId: 'cufe' });
  adminToken = login.body.data.token;
  const ok = await request(target).post('/api/dishes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: '测试菜', category: '热菜', price: 9.9 });
  assert.equal(ok.status, 201);
});

test('管理员可按学生身份登录，普通用户不能按校方身份登录', async () => {
  const adminStudent = await request(target).post('/api/users/login').send({ zhanghao: 'boss', mima: 'boss123', schoolId: 'cufe', identity: 'student' });
  assert.equal(adminStudent.status, 200);
  assert.equal(adminStudent.body.data.user.role, 'admin');
  const userAdmin = await request(target).post('/api/users/login').send({ zhanghao: 'u1', mima: 'pw123456', schoolId: 'cufe', identity: 'admin' });
  assert.equal(userAdmin.status, 403);
});

test('填充管理员凭据不创建登录会话，随后可按两种身份正常认证', async () => {
  const filled = await request(target).post('/api/users/development-account').send({ schoolId: 'cufe' });
  assert.equal(filled.status, 200);
  assert.equal(filled.body.data.token, undefined);
  assert.equal(filled.headers['cache-control'], 'no-store');
  for (const identity of ['student', 'admin']) {
    const login = await request(target).post('/api/users/login').send({ zhanghao: filled.body.data.account, mima: filled.body.data.password, schoolId: 'cufe', identity });
    assert.equal(login.status, 200);
    assert.equal(login.body.data.user.role, 'admin');
  }
  const invalid = await request(target).post('/api/users/development-account').send({ schoolId: 'invalid' });
  assert.equal(invalid.status, 400);
});
