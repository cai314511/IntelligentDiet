import {targetFor} from './support/target.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.DB_PATH = ':memory:';
process.env.AI_BASE_URL = 'https://provider.example/v1';
process.env.DEEPSEEK_API_KEY = 'test-only-key';
process.env.AI_MODEL = 'test-model';
const { default: app } = await import('../app.js');
const target=await targetFor(app);

test('OpenAI-compatible agent uses read-only tools with the selected school context', async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), headers: options.headers, body: JSON.parse(options.body) });
    const response = requests.length === 1
      ? { output: [{type:'reasoning',id:'rs1',summary:[]},{type:'function_call',call_id:'call-restaurants',name:'list_restaurants',arguments:'{}'}] }
      : { output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'天津大学餐厅查询完成。'}]}] };
    return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const result = await request(target).post('/api/ai/chat').send({ schoolId: 'tju', message: '天津大学餐厅排队情况如何？' });
  assert.equal(result.status, 200);
  assert.equal(result.body.mode, 'agent');
  assert.match(result.body.reply, /天津大学餐厅查询完成/);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, 'https://api.deepseek.com/responses');
  assert.equal(requests[0].headers.Authorization, 'Bearer test-only-key');
  assert.equal(requests[0].body.model, 'deepseek-v4-flash');
  assert.ok(requests[0].body.tools.every(tool => tool.type === 'function'));

  const toolResultMessage = requests[1].body.input.find(message => message.type === 'function_call_output' && message.call_id === 'call-restaurants');
  assert.ok(toolResultMessage);
  assert.equal(requests[0].body.reasoning.effort, 'medium');
  assert.ok(requests[1].body.input.some(item => item.type === 'reasoning' && item.id === 'rs1'));
  const restaurantRows = JSON.parse(toolResultMessage.output);
  assert.ok(restaurantRows.length > 0);
  assert.ok(restaurantRows.every(row => ['卫津路校区', '北洋园校区'].includes(row.campus)));
  assert.ok(restaurantRows.every(row => !['学院南路校区', '沙河校区'].includes(row.campus)));
});
