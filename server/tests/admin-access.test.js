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
const { mainDb, databaseContext, db } = await import('../database.js');
const { issueCertificate, closeTrialDatabases, trialDatabase } = await import('../services/adminAccess.js');
const target = await targetFor(app);
const code = issueCertificate('cufe');
const credentials = name => ({ zhanghao:name, mima:'test-admin-12345', xingming:'测试管理员', schoolId:'cufe', identity:'admin' });
const register = body => request(target).post('/api/users/register').send(body);
const login = body => request(target).post('/api/users/login').send(body);
const get = (url, token) => request(target).get(url).set('Authorization','Bearer '+token);
after(() => { closeTrialDatabases(); mainDb.close(); fs.rmSync(temporary, { recursive:true, force:true }); });

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

test('体验读写隔离，重登不续期，过期后禁止访问并可认证转正', async () => {
  mainDb.prepare("INSERT INTO yonghu(zhanghao,mima,xingming,school_id,role) VALUES('private_user','hidden','正式用户隐私','cufe','user')").run();
  assert.equal((await register({...credentials('trialone'),trial:true})).status,201);
  let response = await login(credentials('trialone'));
  assert.equal(response.status,200);
  const {token,user} = response.body.data;
  assert.equal(user.trial,true);
  assert.ok(user.trialExpiresAt > Date.now()+3500000);
  assert.equal(mainDb.prepare('SELECT role FROM yonghu WHERE id=?').get(user.id).role,'admin_trial');
  for (const entry of ['development-account','development-session']) {
    const blocked = await request(target).post('/api/users/'+entry).set('Authorization','Bearer '+token).send({schoolId:'cufe'});
    assert.equal(blocked.status,403);
  }
  const relogin = await request(target).post('/api/users/LOGIN/').set('Authorization', 'Bearer '+token).send(credentials('trialone'));
  assert.equal(relogin.status,200);
  assert.equal(relogin.body.data.user.trial,true);
  const people = await get('/api/users',token);
  assert.equal(people.status,200);
  assert.ok(!people.body.data.some(row => row.zhanghao==='private_user'));
  mainDb.prepare("INSERT INTO operations_records(school_id,type,title) VALUES('cufe','supplier','正式供应商保密名称')").run();
  const trialChat = await request(target).post('/api/ai/chat').set('Authorization','Bearer '+token).send({message:'查询供应商',surface:'management'});
  assert.equal(trialChat.status,200);
  assert.ok(!trialChat.body.reply.includes('正式供应商保密名称'));
  const official = await login(credentials('certified'));
  const officialChat = await request(target).post('/api/ai/chat').set('Authorization','Bearer '+official.body.data.token).send({message:'查询供应商',surface:'management'});
  assert.ok(officialChat.body.reply.includes('正式供应商保密名称'));
  const write = await request(target).put('/api/users/'+user.id).set('Authorization','Bearer '+token).send({xingming:'体验库内修改'});
  assert.equal(write.status,200);
  assert.equal(mainDb.prepare('SELECT xingming FROM yonghu WHERE id=?').get(user.id).xingming,'测试管理员');
  assert.equal((await get('/api/users/me',token)).body.data.xingming,'体验库内修改');
  response = await login(credentials('trialone'));
  assert.equal(response.body.data.user.trialExpiresAt,user.trialExpiresAt);
  assert.equal((await register({...credentials('trialone'),trial:true})).status,409);
  assert.equal((await login({...credentials('trialone'),identity:undefined})).status,403);
  const raw = mainDb.prepare('SELECT * FROM yonghu WHERE id=?').get(user.id);
  const sandbox = trialDatabase(raw,user.trialExpiresAt);
  await databaseContext.run(sandbox, async () => { await Promise.resolve(); assert.equal(db.prepare('SELECT xingming FROM yonghu WHERE id=?').get(user.id).xingming,'体验库内修改'); });
  closeTrialDatabases();
  assert.equal((await get('/api/users/me',token)).body.data.xingming,'体验库内修改');
  mainDb.prepare('UPDATE admin_trials SET expires_at=? WHERE user_id=?').run(Date.now()-1,user.id);
  assert.equal((await get('/api/users',token)).status,401);
  assert.equal((await login(credentials('trialone'))).status,403);
  assert.equal((await login({...credentials('trialone'),adminCode:'bad'})).status,403);
  response = await login({...credentials('trialone'),adminCode:code});
  assert.equal(response.status,200);
  assert.equal(response.body.data.user.trial,undefined);
  assert.ok((await get('/api/users',response.body.data.token)).body.data.some(row=>row.zhanghao==='private_user'));
});

test('不同体验账号互相隔离，轮换认证号使旧号失效', async () => {
  assert.equal((await register({...credentials('trialtwo'),trial:true})).status,201);
  const response = await login(credentials('trialtwo'));
  const people = await get('/api/users',response.body.data.token);
  assert.ok(!people.body.data.some(row=>row.zhanghao==='trialone'));
  issueCertificate('cufe');
  assert.equal((await register({...credentials('oldcode'),adminCode:code})).status,403);
});
