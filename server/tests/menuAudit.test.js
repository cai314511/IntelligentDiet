import test from 'node:test';
import assert from 'node:assert/strict';
process.env.DB_PATH=':memory:';
process.env.AI_BASE_URL='';
process.env.DEEPSEEK_API_KEY='';
const {db,initDatabase}=await import('../database.js');
const {seedReferenceData}=await import('../seed.js');
const {catalog}=await import('../services/catalog.js');
const {acceptsProfile}=await import('../services/preferenceFilter.js');
initDatabase();
test('CSV refresh is idempotent and preserves prices, stock and sale state when requested',()=>{
 const row=db.prepare('SELECT id FROM caipinxinxi ORDER BY id LIMIT 1').get();
 db.prepare("UPDATE caipinxinxi SET kucun=17,jiage=19.37,shangjia='否' WHERE id=?").run(row.id);
 const count=db.prepare('SELECT count(*) n FROM caipinxinxi').get().n;
 seedReferenceData(db,{refreshMenu:true,preserveCommerce:true});
 seedReferenceData(db,{refreshMenu:true,preserveCommerce:true});
 assert.equal(db.prepare('SELECT count(*) n FROM caipinxinxi').get().n,count);
 assert.ok(count>=213);
 assert.deepEqual(db.prepare('SELECT kucun,jiage,shangjia FROM caipinxinxi WHERE id=?').get(row.id),{kucun:17,jiage:19.37,shangjia:'否'});
});
test('catalog carries actual floor, per100g, unknown micronutrients and viable fat-loss options',()=>{
 for(const school of ['cufe','bjfu','tju']) {
  const data=catalog(school);
  assert.ok(data.dishes.some(d=>d.floor));
  assert.ok(data.dishes.some(d=>acceptsProfile(d,{goal:'减脂'})),school+' needs eligible choices');
  for(const d of data.dishes) {
   assert.equal(d.nutrition.fiber,null);assert.equal(d.nutrition.sodium,null);
   assert.ok(d.nutrition.per100g.calories>0);
   if(d.name==='麻辣香锅')assert.equal(acceptsProfile(d,{goal:'减脂'}),false);
  }
 }
});
