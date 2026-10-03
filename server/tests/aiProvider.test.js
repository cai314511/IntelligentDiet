import {targetFor} from './support/target.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.DB_PATH = ':memory:';
process.env.AI_BASE_URL = 'https://provider.example/v1';
process.env.AI_API_KEY = 'test-only-key';
process.env.AI_MODEL = 'test-model';
const { default: app } = await import('../app.js');
const target=await targetFor(app);

test('OpenAI-compatible agent uses read-only tools with the selected school context', async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), headers: options.headers, body: JSON.parse(options.body) });
    const response = requests.length === 1
      ? { choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: 'call-restaurants', type: 'function', function: { name: 'list_restaurants', arguments: '{}' } }] } }] }
      : { choices: [{ message: { role: 'assistant', content: '天津大学餐厅查询完成。' } }] };
    return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const result = await request(target).post('/api/ai/chat').send({ schoolId: 'tju', message: '天津大学餐厅排队情况如何？' });
  assert.equal(result.status, 200);
  assert.equal(result.body.mode, 'agent');
  assert.match(result.body.reply, /天津大学餐厅查询完成/);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, 'https://provider.example/v1/chat/completions');
  assert.equal(requests[0].headers.Authorization, 'Bearer test-only-key');
  assert.equal(requests[0].body.model, 'test-model');
  assert.ok(requests[0].body.tools.every(tool => tool.type === 'function'));

  const toolResultMessage = requests[1].body.messages.find(message => message.role === 'tool' && message.tool_call_id === 'call-restaurants');
  assert.ok(toolResultMessage);
  const restaurantRows = JSON.parse(toolResultMessage.content);
  assert.ok(restaurantRows.length > 0);
  assert.ok(restaurantRows.every(row => ['卫津路校区', '北洋园校区'].includes(row.campus)));
  assert.ok(restaurantRows.every(row => !['学院南路校区', '沙河校区'].includes(row.campus)));
});
