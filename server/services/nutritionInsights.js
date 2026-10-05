import {acceptsProfile} from './preferenceFilter.js';
const keys=['calories','protein','carbs','fat','fiber','sodium'];
const known=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0;
export function scaleNutrition(dish,grams){
 const ratio=grams/Number(dish.portionG);
 return {...Object.fromEntries(keys.map(k=>[k,known(dish.nutrition?.[k])?Math.round(Number(dish.nutrition[k])*ratio*10)/10:null])),status:dish.nutrition?.status||'estimated'};
}
export function aggregateDay(records,day){
 const total={calories:0,protein:0,carbs:0,fat:0,fiber:null,sodium:null},unknown={};
 for(const k of keys){const values=records.map(r=>r.nutrition?.[k]);const missing=values.filter(v=>!known(v)).length;unknown[k]=missing;total[k]=missing||!values.length?(k==='fiber'||k==='sodium'?null:values.filter(known).reduce((s,v)=>s+Number(v),0)):values.reduce((s,v)=>s+Number(v),0);}
 const meals=[...new Set(records.map(r=>r.meal))];
 return {day,meals,records:records.length,...total,unknown,complete:['早餐','午餐','晚餐'].every(m=>meals.includes(m)),supplemented:records.some(r=>r.nutrition?.supplemented)};
}
const photo=d=>Boolean(d.image&&!/placeholder/i.test(d.image));
export function nextMealRecommendations(dishes,profile,today,now=new Date()){
 const target=Math.max(800,Number(profile.calorieTarget)||2000),hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',hourCycle:'h23'}).format(now));
 let meal=hour<10?'早餐':hour<15?'午餐':'晚餐',nextDay=false;
 if(today.meals.includes(meal)){const later=['早餐','午餐','晚餐'].slice(['早餐','午餐','晚餐'].indexOf(meal)+1).find(m=>!today.meals.includes(m));if(later)meal=later;else{meal='早餐';nextDay=true;}}
 const intake=nextDay?{meals:[],records:0,calories:0,carbs:0,protein:0,fat:0}:today;
 // Only completed, recorded meals inform the next portion. Missing meals are not zero intake.
 const prior=meal==='早餐'?[]:meal==='午餐'?['早餐']:['早餐','午餐'];
 const hasPrior=prior.every(m=>intake.meals.includes(m));
 const already=intake.meals.includes(meal),over=intake.calories>=target;
 const share=meal==='早餐'?.25:meal==='午餐'?.4:.35;
 const budget=hasPrior&&!already&&prior.length?Math.max(0,target-intake.calories)/(meal==='午餐'?2:1):target*share;
 const carb=target*(Number(profile.macros?.carbs)||50)/100/4;
 const protein=target*(Number(profile.macros?.protein)||20)/100/4;
 const fat=target*(Number(profile.macros?.fat)||30)/100/9;
 const remaining={carbs:Math.max(0,carb-intake.carbs),protein:Math.max(0,protein-intake.protein),fat:Math.max(0,fat-intake.fat)};
 const preferences=[...new Set([...(profile.tastes||[]),...(profile.portrait?.tastes||[])])];
 const habits=profile.portrait?.habits||[];
 const eligible=dishes.filter(d=>d.forSale&&d.stock>0&&photo(d)&&acceptsProfile(d,profile)&&Number(d.nutrition?.calories)>0&&['protein','carbs','fat'].every(k=>known(d.nutrition[k])))
 .filter(d=>!(/少糖/.test(habits.join(' '))&&['甜品','饮品'].includes(d.category)))
 .map(d=>{
  let portion=Math.min(1.25,Math.max(.1,(budget||target*share)/d.nutrition.calories));
  if(hasPrior&&prior.length&&!nextDay&&remaining.fat<fat*.3&&d.nutrition.fat>0)portion=Math.min(portion,remaining.fat/d.nutrition.fat);
  const grams=Math.round(Number(d.portionG)*portion/5)*5,n=scaleNutrition(d,grams);
  const matched=preferences.filter(t=>(d.tasteTags||[]).includes(t));
  const density=d.nutrition.protein/d.nutrition.calories;
  const cost=(Math.abs(n.calories-budget)/Math.max(1,budget))+((/高蛋白|增肌/.test(String(profile.goal))||intake.records&&remaining.protein>remaining.carbs*.3)?-density*30:0)+(remaining.fat<remaining.protein?d.nutrition.fat/d.nutrition.calories*10:0)+(/低碳水/.test(String(profile.goal))?d.nutrition.carbs*4/d.nutrition.calories:0)-matched.length*.1;
  return {...d,suggestedGrams:grams,suggestedNutrition:n,recommendationReason:`已避开画像中的忌口和不喜欢的食材${matched.length?'；匹配'+matched.join('、'):'；通过饮食目标筛选'}${hasPrior&&!already?'；份量参考今日已记录摄入':'；记录或餐次不足，份量按目标餐比例估算'}`,recommendationScore:cost};
 }).filter(d=>d.suggestedGrams>=50&&!over).sort((a,b)=>a.recommendationScore-b.recommendationScore||a.price-b.price);
 const note=nextDay?`今日餐次已记录，以下参考明日早餐；以${target} kcal日目标重新估算，不扣除今日摄入。`:already?'当前餐次已记录，以下作为后续选餐参考，不建议重复加餐。':!hasPrior?'前序餐次记录不全，不将未记录餐次视为零摄入；按每日目标的餐次比例估算。':over?'今日已记录热量达到或超过目标，不追加热量预算；下方仅提供可选菜品参考。':`参考今日已记录摄入与${target} kcal日目标，${meal}建议预算约${Math.round(budget)} kcal。`;
 const fatNote=hasPrior&&prior.length&&!nextDay&&remaining.fat<fat*.3?' 今日已记录脂肪接近目标，参考份量同时受脂肪余量限制；不强行用单道菜补足热量。':'';
 return {items:eligible.slice(0,4),meal,nextDay,budget:over||already?null:Math.round(budget),note:note+fatNote,eligibleCount:eligible.length,emptyReason:eligible.length?'':over?'今日已记录摄入达到日目标，不自动推荐额外加餐；需要时可手动查看菜单。':'当前没有同时符合忌口、饮食目标且有参考图片的菜品，请调整筛选或手动核对菜单。'};
}
