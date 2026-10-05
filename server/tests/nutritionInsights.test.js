import test from 'node:test';import assert from 'node:assert/strict';import request from 'supertest';
import {scaleNutrition,aggregateDay,nextMealRecommendations} from '../services/nutritionInsights.js';import {supplementDiary} from '../services/supplementDiary.js';
process.env.DB_PATH=':memory:';process.env.AI_BASE_URL='';process.env.DEEPSEEK_API_KEY='';
const {default:app}=await import('../app.js');const {db}=await import('../database.js');const {catalog}=await import('../services/catalog.js');
const dish={id:1,name:'牛肉饭',forSale:true,stock:10,category:'套餐',portionG:500,image:'/assets/beef.png',ingredients:['牛肉','米饭'],allergens:[],tasteTags:['清淡'],spiceLevel:'不辣',nutrition:{calories:600,carbs:85,protein:30,fat:15,fiber:null,sodium:null}};
test('scaling and aggregation preserve unknown fiber instead of falsely reporting zero',()=>{
 const n=scaleNutrition(dish,250);assert.equal(n.calories,300);assert.equal(n.fiber,null);assert.equal(n.sodium,null);
 const day=aggregateDay([{meal:'早餐',nutrition:n},{meal:'午餐',nutrition:{...n,fiber:4}}],'2026-10-05');assert.equal(day.fiber,null);assert.equal(day.unknown.fiber,1);assert.equal(day.calories,600);assert.equal(day.complete,false);
});
test('next meal applies exclusions, dislike tastes, fat-loss limits and real photos before ranking',()=>{
 const rows=[dish,{...dish,id:2,ingredients:['香菜']},{...dish,id:3,allergens:['大豆']},{...dish,id:4,nutrition:{...dish.nutrition,calories:1000,fat:50}},{...dish,id:5,image:'/canteen/dish-placeholder.svg'},{...dish,id:6,stock:0},{...dish,id:7,ingredients:['豆皮']}];
 const today=aggregateDay([{meal:'早餐',nutrition:{calories:400,protein:10,carbs:70,fat:8}}],'2026-10-05');
 const r=nextMealRecommendations(rows,{goal:'减脂',calorieTarget:1800,exclusions:['大豆'],portrait:{dislikes:['香菜']}},today,new Date('2026-10-05T04:00Z'));
 assert.deepEqual(r.items.map(d=>d.id),[1]);assert.equal(r.budget,700);assert.ok(r.items[0].suggestedNutrition.calories<=705);
 assert.equal(nextMealRecommendations(rows,{tastes:['不喜欢清淡']},today).items.length,0);
});
test('missing meals never become zero intake and a completed day does not consume tomorrow budget',()=>{
 const missing=aggregateDay([{meal:'午餐',nutrition:{calories:600,protein:30,carbs:80,fat:15}}],'2026-10-05');
 const a=nextMealRecommendations([dish],{calorieTarget:2000},missing,new Date('2026-10-05T08:00Z'));assert.equal(a.budget,700);assert.match(a.note,/记录不全/);
 const full=aggregateDay(['早餐','午餐','晚餐'].map(meal=>({meal,nutrition:{calories:1000,protein:30,carbs:140,fat:20}})),'2026-10-05');
 const b=nextMealRecommendations([dish],{calorieTarget:2000},full,new Date('2026-10-05T12:00Z'));assert.equal(b.nextDay,true);assert.equal(b.budget,500);
});
test('diary supplementation fills only past missing meals for one account and is idempotent',()=>{
 db.prepare("INSERT INTO yonghu(id,zhanghao,mima,xingming,school_id) VALUES(100,'diary_fixture','test-only','测试','cufe')").run();
 const count=db.prepare('SELECT count(*) n FROM food_records').get().n;
 const r=supplementDiary(db,{userId:100,schoolId:'cufe',now:new Date('2026-10-05T04:30Z')},catalog('cufe').dishes);
 assert.equal(r.addedMeals,41);assert.deepEqual(r.pending,['2026-10-05 晚餐']);assert.ok(r.addedRecords>=41);
 assert.equal(supplementDiary(db,{userId:100,schoolId:'cufe',now:new Date('2026-10-05T04:30Z')},catalog('cufe').dishes).addedRecords,0);
 assert.throws(()=>supplementDiary(db,{userId:100,schoolId:'bjfu'},catalog('bjfu').dishes),/用户与学校/);
 assert.equal(db.prepare('SELECT count(*) n FROM food_records WHERE user_id<>100').get().n,count);
});
test('report gives fourteen daily totals, unknown fiber and pictured personalized recommendations',async()=>{
 const token=(await request(app).post('/api/users/development-session').send({schoolId:'cufe'})).body.data.token;
 const report=await request(app).get('/api/nutrition/report').set('Authorization','Bearer '+token);assert.equal(report.status,200);assert.equal(report.body.data.days.length,14);
 assert.ok(report.body.data.recommendationContext.note);for(const d of report.body.data.recommendations){assert.ok(d.image);assert.ok(!d.image.includes('placeholder'));assert.ok(d.suggestedGrams>0);}
});
test('a nearly exhausted daily fat target also limits the suggested portion',()=>{
 const day=aggregateDay([{meal:'早餐',nutrition:{calories:500,carbs:60,protein:30,fat:30}},{meal:'午餐',nutrition:{calories:700,carbs:80,protein:30,fat:30}}],'2026-10-05');
 const r=nextMealRecommendations([dish],{calorieTarget:2000,macros:{fat:30,protein:20,carbs:50}},day,new Date('2026-10-05T04:30Z'));
 assert.equal(r.meal,'晚餐');assert.ok(r.items[0].suggestedNutrition.fat<=7);assert.match(r.note,/脂肪余量/);
});
