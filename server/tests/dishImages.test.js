import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {syncDishImages} from '../services/dishImages.js';
test('supplied CUFE illustrations map by name without crossing schools', () => {
 const db=new Database(':memory:');
 try {
  db.exec('CREATE TABLE caipinxinxi(id INTEGER PRIMARY KEY,school_id TEXT,caipinmingcheng TEXT,tupian TEXT)');
  const insert=db.prepare('INSERT INTO caipinxinxi VALUES(?,?,?,?)');
  insert.run(1,'cufe','油条','');insert.run(2,'cufe','咸豆腐脑','');insert.run(3,'cufe','砂锅米线','');
  insert.run(4,'bjfu','油条','');insert.run(5,'cufe','三明治','');insert.run(6,'cufe','鸡蛋','');
  syncDishImages(db);
  const rows=db.prepare('SELECT * FROM caipinxinxi ORDER BY id').all();
  assert.match(decodeURIComponent(rows[0].tupian),/13_04_32-3/);
  assert.match(decodeURIComponent(rows[1].tupian),/13_04_41-4/);
  assert.match(decodeURIComponent(rows[2].tupian),/13_06_33-10/);
  assert.equal(rows[3].tupian,'');assert.equal(rows[4].tupian,'');
  assert.match(decodeURIComponent(rows[5].tupian),/鸡蛋\.png$/);
  syncDishImages(db);assert.deepEqual(db.prepare('SELECT * FROM caipinxinxi ORDER BY id').all(),rows);
 } finally {db.close();}
});
