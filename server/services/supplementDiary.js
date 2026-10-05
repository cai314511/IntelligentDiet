import {acceptsProfile} from './preferenceFilter.js';
import {scaleNutrition} from './nutritionInsights.js';
export function supplementDiary(db,{userId,schoolId,now=new Date()},dishes){
 const user=db.prepare('SELECT id FROM yonghu WHERE id=? AND school_id=?').get(userId,schoolId);if(!user)throw new Error('用户与学校不匹配');
 const profile=JSON.parse(db.prepare('SELECT profile_json FROM nutrition_profiles WHERE user_id=?').get(userId)?.profile_json||'{}');
 const candidates=dishes.filter(d=>d.forSale&&Number(d.portionG)>0&&acceptsProfile(d,{...profile,goal:''})&&!/辣|油炸|油条|铜锣烧|卤肉|煲仔/.test(d.name));
 const eggs=candidates.find(d=>d.name==='鸡蛋');
 const meals=candidates.filter(d=>['套餐','轻食'].includes(d.category)&&d.nutrition.calories>350);
 if(!meals.length)throw new Error('没有符合忌口的套餐可用于示例补录');
 const today=now.toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'}),hours={早餐:'08:00',午餐:'12:00',晚餐:'18:00'};
 const dates=Array.from({length:14},(_,i)=>new Date(Date.parse(today+'T12:00:00+08:00')-(13-i)*86400000).toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'}));
 const insert=db.prepare('INSERT INTO food_records(user_id,school_id,dish_id,name,grams,meal,eaten_at,nutrition_json) VALUES(?,?,?,?,?,?,?,?)');
 let addedMeals=0,addedRecords=0;const pending=[];
 db.transaction(()=>{for(const [i,day] of dates.entries())for(const [j,meal] of ['早餐','午餐','晚餐'].entries()){
  const at=new Date(day+'T'+hours[meal]+':00+08:00');if(at>now){pending.push(day+' '+meal);continue;}
  if(db.prepare("SELECT 1 FROM food_records WHERE user_id=? AND school_id=? AND date(eaten_at,'+8 hours')=? AND meal=?").get(userId,schoolId,day,meal))continue;
  const dish=meals[(i*2+j)%meals.length],factor=meal==='早餐'?.5:([.8,1.05,1.25,.95][i%4]);
  const items=[{dish,grams:Math.round(dish.portionG*factor/5)*5}];if(meal==='早餐'&&eggs)items.push({dish:eggs,grams:Math.round(eggs.portionG*2)});
  for(const item of items){const n={...scaleNutrition(item.dish,item.grams),supplemented:true,source:'按用户要求以现有菜单补录的示例餐次，非实际饮食凭证'};insert.run(userId,schoolId,item.dish.id,item.dish.name,item.grams,meal,at.toISOString(),JSON.stringify(n));addedRecords++;}addedMeals++;
 }} )();
 return {userId,schoolId,from:dates[0],to:today,addedMeals,addedRecords,pending};
}
