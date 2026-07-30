import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.DB_PATH = ':memory:';
delete process.env.GEMINI_API_KEY; // 强制走 mock 降级
const { db } = await import('../database.js');
const { default: app } = await import('../app.js');

before(() => {
  // dotenv 可能从 server/.env 重新载入 key，强制清空确保走 mock 降级分支
  process.env.GEMINI_API_KEY = '';
  // caipinxinxi.caipinfenlei 有外键，先补分类
  db.prepare("INSERT OR IGNORE INTO caipinfenlei (caipinfenlei) VALUES ('面食')").run();
  db.prepare("INSERT OR IGNORE INTO caipinfenlei (caipinfenlei) VALUES ('素菜')").run();
  db.prepare("INSERT INTO caipinxinxi (caipinmingcheng, caipinfenlei, jiage, kucun, yueshuxiao, cailiao) VALUES ('番茄鸡蛋面', '面食', 9, 50, 300, '番茄，鸡蛋')").run();
  db.prepare("INSERT INTO caipinxinxi (caipinmingcheng, caipinfenlei, jiage, kucun, yueshuxiao, cailiao) VALUES ('白灼菜心', '素菜', 5, 50, 200, '菜心')").run();
});

test('推荐类提问的 mock 回复包含真实菜名', async () => {
  const res = await request(app).post('/api/ai/chat').send({ message: '有什么好吃的推荐？' });
  assert.equal(res.status, 200);
  const reply = res.body.reply || res.body.data?.reply || '';
  assert.ok(reply.includes('番茄鸡蛋面') || reply.includes('白灼菜心'), `回复应包含真实菜名，实际: ${reply}`);
});
