import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.DB_PATH = ':memory:';
const { default: app } = await import('../app.js');

test('GET /api/health 返回 ok', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});
