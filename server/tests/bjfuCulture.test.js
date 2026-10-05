import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {ensureBjfuCulture,bjfuCultureProducts} from '../services/bjfuCulture.js';
test('approved BJFU products use configured prices and preserve stock, orders and other schools on restart',()=>{
 const db=new Database(':memory:');
 db.exec(`CREATE TABLE cultural_items(id INTEGER PRIMARY KEY,school_id TEXT,title TEXT,category TEXT,description TEXT,price REAL,image TEXT,source_name TEXT,stock INTEGER DEFAULT 50,UNIQUE(school_id,title));`);
 db.prepare("INSERT INTO cultural_items(school_id,title,price,stock) VALUES('cufe','中财原有商品',22,3)").run();
 assert.equal(ensureBjfuCulture(db),3);
 for(const p of bjfuCultureProducts){const item=db.prepare("SELECT * FROM cultural_items WHERE school_id='bjfu' AND title=?").get(p.title);assert.equal(item.price,p.price);assert.equal(item.image,p.image);assert.equal(item.stock,50);}
 db.prepare("UPDATE cultural_items SET stock=49,price=35 WHERE title=?").run(bjfuCultureProducts[0].title);
 assert.equal(ensureBjfuCulture(db),0);
 assert.equal(db.prepare("SELECT stock FROM cultural_items WHERE title=?").get(bjfuCultureProducts[0].title).stock,49);
 assert.equal(db.prepare("SELECT price FROM cultural_items WHERE school_id='cufe'").get().price,22);
 db.close();
});
