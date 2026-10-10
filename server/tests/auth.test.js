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


test('学生体验账号三校独立且会员需购买，重复登录保留消费', async () => {
 const ids=[];
 for(const schoolId of ['cufe','bjfu','tju']) {
 const credentials={zhanghao:'guanliyuan',mima:'guanliyuan',schoolId,identity:'student'};
 const login=await request(target).post('/api/users/login').send(credentials);
 assert.equal(login.status,200);
 const {user,token}=login.body.data; ids.push(user.id);
 assert.equal(user.zhanghao,'guanliyuan'); assert.equal(user.role,'user'); assert.equal(user.jine,1000);
 const points=()=>db.prepare('SELECT SUM(points) total FROM point_ledger WHERE user_id=? AND school_id=?').get(user.id,schoolId).total;
 assert.equal(points(),1000);
 const auth={Authorization:'Bearer '+token};
 assert.equal((await request(target).get('/api/nutrition/trend').set(auth)).status,403);
 assert.equal((await request(target).get('/api/users/').set(auth)).status,403);
 const purchase=await request(target).post('/api/nutrition/membership').set(auth).send({plan:'month',requestId:'experience-'+schoolId});
 assert.equal(purchase.status,200); assert.equal(purchase.body.data.amount,6);
 db.prepare("INSERT INTO point_ledger(user_id,school_id,reason,reference,points) VALUES(?,?,'兑换','test',-100)").run(user.id,schoolId);
 const again=await request(target).post('/api/users/login').send(credentials);
 assert.equal(again.body.data.user.id,user.id); assert.equal(again.body.data.user.jine,994); assert.equal(points(),900);
 assert.equal((await request(target).get('/api/nutrition/trend').set({Authorization:'Bearer '+again.body.data.token})).status,200);
 }
 assert.equal(new Set(ids).size,3);
});

test('体验账号拒绝校方身份、内部账号、错误密码和非正式学校并保留注册名称',async()=>{
 for(const override of [{identity:'admin'},{identity:'admin',adminCode:'invalid'},{zhanghao:'guanliyuan@cufe'},{mima:'wrong'},{schoolId:'demo'},{schoolId:'unknown'}]) {
 const result=await request(target).post('/api/users/login').send({zhanghao:'guanliyuan',mima:'guanliyuan',schoolId:'cufe',identity:'student',...override});
 assert.ok([401,403].includes(result.status));
 }
 const result=await request(target).post('/api/users/register').send({zhanghao:'guanliyuan',mima:'guanliyuan',xingming:'测试',schoolId:'cufe'});
 assert.equal(result.status,409);
});
