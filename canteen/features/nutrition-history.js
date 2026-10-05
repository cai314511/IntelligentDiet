import {esc,dialog} from '../../shared/feature-ui.js';
const nutrients=[['carbs','碳水','#f0ae44',4],['protein','蛋白质','#3a86cc',4],['fat','脂肪','#df7597',9],['fiber','膳食纤维','#42a884',0]];
export function showNutritionHistory(report,anchor){
 const d=dialog('近14天 · 每日饮食结构',`<div class="nutrition-history-content"></div>`);d.classList.add('nutrition-history-dialog');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let origin='scale(.25)';
 const close=d.close.bind(d);let closing=false;
 d.close=()=>{if(closing)return;closing=true;if(reduced){close();return;}const a=d.animate([{transform:'none',opacity:1},{transform:origin,opacity:0}],{duration:220,easing:'ease-in',fill:'forwards'});a.onfinish=close;};
 d.addEventListener('cancel',e=>{e.preventDefault();d.close();});
 let mode='energy',selected=report.days.at(-1).day;
 const target=Number(report.profile.calorieTarget)||2000,days=report.days;
 const status=day=>!day.records?'未记录':day.calories>target*1.1?'已记录超目标':day.calories<target*.9?(day.complete?'已记录低于目标':'餐次未齐'):'接近目标';
 function draw(){
  const sums=day=>nutrients.filter(n=>mode==='grams'||n[0]!=='fiber').reduce((s,[k])=>s+(Number(day[k])||0),0);
  const maximum=Math.max(mode==='energy'?target*1.25:1,...days.map(x=>mode==='energy'?x.calories:sums(x)))*1.1;
  const selectedDay=days.find(x=>x.day===selected);
  const avg=days.filter(x=>x.records).reduce((s,x)=>s+x.calories,0)/Math.max(1,days.filter(x=>x.records).length);
  d.querySelector('.nutrition-history-content').innerHTML=`<div class="nutrition-history-summary"><span>已记录 <b>${report.recordedDays}/14 天</b></span><span>日均 <b>${Math.round(avg)} kcal</b></span><span>当前日目标 <b>${target} kcal</b></span></div><div class="nutrition-history-tools"><div><button data-mode="energy" class="zx-button ${mode==='energy'?'zx-primary':''}" aria-pressed="${mode==='energy'}">热量 / 供能比例</button><button data-mode="grams" class="zx-button ${mode==='grams'?'zx-primary':''}" aria-pressed="${mode==='grams'}">营养素克数</button></div><span>${mode==='energy'?'kcal · 柱高为已记录热量':'g · 每日营养素累计'}</span></div><div class="nutrition-history-legend">${nutrients.map(([k,name,color])=>`<span><i style="background:${color}"></i>${name}${k==='fiber'&&mode==='energy'?'（克数见详情）':''}</span>`).join('')}<span>🔴 超目标　🔵 低于目标</span></div><div class="nutrition-history-scroll"><div class="nutrition-history-plot"><div class="nutrition-history-axis"><span>${Math.round(maximum)}</span><span>${Math.round(maximum/2)}</span><span>0</span></div><div class="nutrition-history-bars">${mode==='energy'?`<div class="nutrition-history-target" style="bottom:${target/maximum*100}%"><span>当前目标 ${target}</span></div>`:''}${days.map(day=>{
   const height=(mode==='energy'?day.calories:sums(day))/maximum*100;
   const energy=day.carbs*4+day.protein*4+day.fat*9;
   const total=mode==='energy'?energy:sums(day);
   const segments=nutrients.filter(n=>mode==='grams'||n[0]!=='fiber').map(([k,name,color,multiplier])=>`<i style="height:${total?(Number(day[k])||0)*(mode==='energy'?multiplier:1)/total*100:0}%;background:${color}" title="${name} ${day[k]===null?'未估算':Number(day[k]).toFixed(1)+' g'}"></i>`).join('');
   return `<button class="nutrition-history-day ${day.day===selected?'active':''}" data-day="${day.day}" aria-label="${day.day} ${Math.round(day.calories)} kcal ${status(day)}" aria-pressed="${day.day===selected}"><span class="nutrition-history-value ${day.calories>target*1.1?'high':day.calories<target*.9?'low':''}">${day.records?Math.round(mode==='energy'?day.calories:sums(day)):'—'}</span><div class="nutrition-history-stack" style="height:${height}%">${segments}</div><small>${day.day.slice(5)}</small><em>${day.complete?'三餐齐':day.records?'未齐':'未记录'}</em></button>`;
  }).join('')}</div></div></div><section class="nutrition-history-detail"><div><h3>${selectedDay.day} <span>${status(selectedDay)}</span></h3><p>${Math.round(selectedDay.calories)} kcal · ${selectedDay.meals.join(' / ')||'未记录'}${selectedDay.supplemented?' · 包含示例补录':''}</p></div><div>${nutrients.map(([k,name,color])=>`<span><i style="background:${color}"></i>${name} <b>${selectedDay[k]===null?'未估算':Number(selectedDay[k]).toFixed(1)+' g'}</b>${selectedDay.unknown?.[k]?'（'+selectedDay.unknown[k]+'条缺数据）':''}</span>`).join('')}</div></section><p class="nutrition-history-note">点击每日柱查看详情。热量模式按碳水、蛋白质、脂肪的4/4/9供能比例分色；膳食纤维以克数查看，未知值不当作零。参考线使用当前自定目标；±10%用于展示偏差，不代表医学评估。餐次未齐时，低摄入可能是漏记。示例补录不代表实际吃过，营养数值为菜单估算。</p>`;
  d.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;draw();});d.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{selected=b.dataset.day;draw();});
 }
 draw();
 const from=anchor.getBoundingClientRect(),to=d.getBoundingClientRect();
 origin=`translate(${from.x+from.width/2-to.x-to.width/2}px,${from.y+from.height/2-to.y-to.height/2}px) scale(.25)`;
 if(!reduced)d.animate([{transform:origin,opacity:0},{transform:'none',opacity:1}],{duration:460,easing:'cubic-bezier(.16,1,.3,1)'});
 return d;
}
