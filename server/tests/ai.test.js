import {targetFor} from './support/target.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.DB_PATH = ':memory:';
process.env.AI_BASE_URL = '';
process.env.AI_API_KEY = '';
process.env.AI_MODEL = '';
const { default: app } = await import('../app.js');
const target=await targetFor(app);

test('学校列表返回三校且菜单按学校隔离', async () => {
  const schools = await request(target).get('/api/users/schools');
  assert.equal(schools.status, 200);
  assert.deepEqual(schools.body.data.map(school => school.id).sort(), ['bjfu', 'cufe', 'tju']);
  const tjuMenu = await request(target).get('/api/dishes?schoolId=tju');
  const cufeMenu = await request(target).get('/api/dishes?schoolId=cufe');
  assert.equal(tjuMenu.status, 200);
  assert.equal(cufeMenu.status, 200);
  assert.ok(tjuMenu.body.data.length > 0);
  assert.ok(tjuMenu.body.data.every(dish => dish.schoolId === 'tju'));
  assert.ok(cufeMenu.body.data.every(dish => dish.schoolId === 'cufe'));
  const soup = cufeMenu.body.data.find(dish => dish.name === '麻辣烫');
  assert.ok(soup.ingredients.includes('豆腐'));
  assert.ok(soup.allergens.includes('小麦'));
  assert.ok(soup.tasteTags.length > 0 && soup.dietaryTags.length > 0);
  assert.equal(soup.campus, '沙河校区');
  assert.ok(soup.restaurant);
  assert.equal(soup.priceUnit, '元/份');
  assert.ok(soup.sourceDate && soup.sourceKind && soup.priceBasis && soup.nutritionBasis);
});

test('未配置模型时 AI 助理根据所选学校查询餐厅数据', async () => {
  const response = await request(target).post('/api/ai/chat').send({
    schoolId: 'tju',
    message: '天津大学有哪些餐厅和排队信息？'
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.mode, 'database');
  assert.match(response.body.reply, /卫津路校区|北洋园校区/);
});
