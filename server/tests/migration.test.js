import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
const { db, initDatabase } = await import('../database.js');

test('迁移后 orders 有 pickup_code 列，yonghu 有 role 列，caipinxinxi 有 shangjia 列', () => {
  initDatabase();
  const orderCols = db.prepare("PRAGMA table_info(orders)").all().map(c => c.name);
  const userCols = db.prepare("PRAGMA table_info(yonghu)").all().map(c => c.name);
  const dishCols = db.prepare("PRAGMA table_info(caipinxinxi)").all().map(c => c.name);
  assert.ok(orderCols.includes('pickup_code'));
  assert.ok(userCols.includes('role'));
  assert.ok(dishCols.includes('shangjia'));
});

test('明文密码被自动哈希（幂等）', () => {
  initDatabase();
  db.prepare("INSERT INTO yonghu (zhanghao, mima, xingming) VALUES ('t1', 'plain123', '测试')").run();
  initDatabase(); // 第二次调用触发迁移且不得重复哈希
  const u = db.prepare("SELECT mima FROM yonghu WHERE zhanghao = 't1'").get();
  assert.ok(u.mima.startsWith('$2'), '密码应已被 bcrypt 哈希');
});
