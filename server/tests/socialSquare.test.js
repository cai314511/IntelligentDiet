import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
process.env.DB_PATH=':memory:';process.env.AI_BASE_URL='';process.env.DEEPSEEK_API_KEY='';
const {default:app}=await import('../app.js');
const {db}=await import('../database.js');
const {rankings,weekStart}=await import('../services/socialSquare.js');
const {ensureSeatCapacity}=await import('../services/restaurantTopology.js');
const auth=t=>({Authorization:'Bearer '+t});
test('all visible restaurant floors have 32 independent seats in each zone and expansion is idempotent',()=>{
 ensureSeatCapacity(db);const before=db.prepare('SELECT count(*) n FROM restaurant_seats').get().n;ensureSeatCapacity(db);assert.equal(db.prepare('SELECT count(*) n FROM restaurant_seats').get().n,before);
 const zones=db.prepare(`SELECT r.id,s.floor,substr(s.seat_label,1,1) AS zone,count(*) AS n,count(distinct s.seat_number) AS numbers FROM restaurant_seats s JOIN restaurants r ON r.id=s.restaurant_id WHERE r.has_seating=1 AND (r.canonical_id IS NULL OR r.canonical_id=r.id) GROUP BY r.id,s.floor,zone`).all();assert.ok(zones.length);for(const z of zones){assert.equal(z.n,32,JSON.stringify(z));assert.equal(z.numbers,32);}
});
test('Monday in China freezes weekly real-review ranks and compares to the previous snapshot',()=>{
 assert.equal(weekStart(new Date('2026-10-04T16:00:00Z')),'2026-10-05');
 const dishes=db.prepare("SELECT id FROM caipinxinxi WHERE school_id='cufe' ORDER BY id LIMIT 2").all();
 db.prepare("INSERT INTO yonghu(id,zhanghao,mima,xingming,school_id) VALUES(100,'square_fixture','test-only','测试','cufe')").run();
 const insert=db.prepare("INSERT INTO discusscaipinxinxi(caipinxinxiid,userid,yonghuming,commentcontent,school_id,rating,addtime) VALUES(?,100,'测试','测试评价','cufe',?,?)");
 insert.run(dishes[0].id,5,'2026-09-23T12:00:00+08:00');insert.run(dishes[1].id,4,'2026-09-23T12:00:00+08:00');
 const first=rankings('cufe',null,new Date('2026-09-28T04:00:00Z'));assert.equal(first.recommend[0].id,dishes[0].id);
 insert.run(dishes[0].id,3,'2026-09-30T12:00:00+08:00');insert.run(dishes[1].id,5,'2026-09-30T12:00:00+08:00');
 const next=rankings('cufe',null,new Date('2026-10-05T04:00:00Z'));assert.equal(next.recommend[0].id,dishes[1].id);assert.equal(next.recommend[0].change,1);assert.equal(next.recommend[1].change,-1);
 insert.run(dishes[0].id,5,'2026-10-02T12:00:00+08:00');assert.deepEqual(rankings('cufe',null,new Date('2026-10-07T04:00:00Z')).recommend,next.recommend);
});
test('shares, comments and favorites persist, reject cross-school writes, and demos never add real reviews',async()=>{
 const login=await request(app).post('/api/users/development-session').send({schoolId:'cufe'});const token=login.body.data.token;
 const other=(await request(app).post('/api/users/development-session').send({schoolId:'bjfu'})).body.data.token;
 const dish=db.prepare("SELECT id FROM caipinxinxi WHERE school_id='cufe' LIMIT 1").get();
 const vote=()=>request(app).post('/api/social/dishes/'+dish.id+'/vote').set(auth(token)).send({kind:'favorite',active:true});
 assert.equal((await vote()).status,200);assert.equal((await vote()).body.data.count,1);
 assert.equal((await request(app).post('/api/social/dishes/'+dish.id+'/vote').set(auth(other)).send({kind:'down',active:true})).status,404);
 const count=db.prepare('SELECT count(*) n FROM discusscaipinxinxi').get().n;
 const posts=await request(app).get('/api/social/posts').set(auth(token));assert.ok(posts.body.data.filter(p=>p.isDemo).length>=10);assert.equal(db.prepare('SELECT count(*) n FROM discusscaipinxinxi').get().n,count);
 const share=await request(app).post('/api/social/posts').set(auth(token)).send({content:'今天的饭很开心',dishId:dish.id});assert.equal(share.status,201);const id=share.body.data.id;
 assert.equal((await request(app).post(`/api/social/posts/${id}/comments`).set(auth(token)).send({content:'饭搭子来了'})).status,201);
 assert.equal((await request(app).get(`/api/social/posts/${id}/comments`).set(auth(token))).body.data[0].content,'饭搭子来了');
 assert.equal((await request(app).get(`/api/social/posts/${id}/comments`).set(auth(other))).status,404);
 assert.equal((await request(app).post('/api/social/posts').set(auth(token)).send({content:'非法图片',image:'data:image/svg+xml;base64,AAAA'})).status,400);
});
