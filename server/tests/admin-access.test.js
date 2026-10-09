import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { targetFor } from './support/target.js';
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'zhixiang-admin-'));
for (const name of fs.readdirSync(new URL('../../userdata/', import.meta.url))) {
  if (/\.(json|csv)$/.test(name)) fs.copyFileSync(new URL('../../userdata/' + name, import.meta.url), path.join(temporary,name));
}
process.env.DB_PATH = ':memory:';
process.env.USERDATA_DIR = temporary;
process.env.SEED_REFERENCE_DATA = 'false';
process.env.DEEPSEEK_API_KEY = '';
const { default: app } = await import('../app.js');
const { mainDb } = await import('../database.js');
const { issueCertificate } = await import('../services/adminAccess.js');
const target = await targetFor(app);
const code = issueCertificate('cufe');
const credentials = name => ({ zhanghao:name, mima:'test-admin-12345', xingming:'测试管理员', schoolId:'cufe', identity:'admin' });
const register = body => request(target).post('/api/users/register').send(body);
const login = body => request(target).post('/api/users/login').send(body);
const get = (url, token) => request(target).get(url).set('Authorization','Bearer '+token);
after(() => { mainDb.close(); fs.rmSync(temporary, { recursive:true, force:true }); });

test('认证号绑定学校，错误号和伪造管理员角色不会创建管理员', async () => {
  assert.equal((await register({...credentials('badcode'),adminCode:'wrong'})).status,403);
  const another = mainDb.prepare("SELECT id FROM universities WHERE id!='cufe' LIMIT 1").get().id;
  assert.equal((await register({...credentials('wrongschool'),schoolId:another,adminCode:code})).status,403);
  assert.equal((await register({...credentials('studentrole'),identity:'student',role:'admin'})).status,201);
  assert.equal(mainDb.prepare('SELECT role FROM yonghu WHERE zhanghao=?').get('studentrole').role,'user');
  assert.equal((await register({...credentials('certified'),adminCode:code})).status,201);
  const response = await login(credentials('certified'));
  assert.equal(response.status,200);
  assert.equal(response.body.data.user.role,'admin');
  assert.equal(response.body.data.user.trial,undefined);
});

test('正式高校关闭旧体验入口，既有体验账号可认证转正', async () => {
  assert.equal((await register({...credentials('trialone'),trial:true})).status,403);
  const bcrypt=(await import('bcryptjs')).default;
  mainDb.prepare("INSERT INTO yonghu(zhanghao,mima,xingming,school_id,role) VALUES('legacy',?,'历史体验账号','cufe','admin_trial')").run(bcrypt.hashSync('test-admin-12345',4));
  assert.equal((await login(credentials('legacy'))).status,403);
  const upgraded=await login({...credentials('legacy'),adminCode:code});
  assert.equal(upgraded.status,200);assert.equal(upgraded.body.data.user.role,'admin');
  issueCertificate('cufe');
  assert.equal((await register({...credentials('oldcode'),adminCode:code})).status,403);
});
