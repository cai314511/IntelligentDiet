import {targetFor} from './support/target.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.DB_PATH = ':memory:';
const { default: app } = await import('../app.js');
const target=await targetFor(app);

test('活动和文创接口返回本校公开条目', async () => {
  for (const schoolId of ['cufe', 'tju', 'bjfu']) {
    const [activities, culture] = await Promise.all([
      request(target).get(`/api/activities?schoolId=${schoolId}`),
      request(target).get(`/api/activities/culture?schoolId=${schoolId}`)
    ]);
    assert.equal(activities.status, 200);
    assert.equal(culture.status, 200);
    assert.ok(activities.body.data.length > 0);
    assert.ok(culture.body.data.length > 0);
    assert.ok(activities.body.data.every(row => row.schoolId === schoolId));
    assert.ok(culture.body.data.every(row => row.schoolId === schoolId && row.title && row.name));
  }
});
