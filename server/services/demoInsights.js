import { db } from '../database.js';
import { bjDay } from './demoData.js';
export function demoClock(now=Date.now()) {
  const row=db.prepare('SELECT * FROM demo_clock WHERE id=1').get();
  const minute=(row.minute+(row.playing?(now-row.anchor)/1000:0))%1440;
  return {minute,playing:Boolean(row.playing),label:String(Math.floor(minute/60)).padStart(2,'0')+':'+String(Math.floor(minute%60)).padStart(2,'0')};
}
export function setDemoClock(body) {
  const current=demoClock();
  const minutes={breakfast:450,lunch:705,dinner:1065,quiet:900};
  if(body.scene && !(body.scene in minutes))throw new Error('请选择有效场景');
  if(body.playing!==undefined&&typeof body.playing!=='boolean')throw new Error('播放状态无效');
  db.prepare('UPDATE demo_clock SET minute=?,anchor=?,playing=? WHERE id=1').run(body.scene?minutes[body.scene]:current.minute,Date.now(),body.playing===undefined?Number(current.playing):Number(body.playing));
  return demoClock();
}
const sum=(rows,key)=>rows.reduce((n,r)=>n+Number(r[key]||0),0);
export function demoInsights(scope={}) {
  const date=db.prepare('SELECT MAX(day) day FROM demo_traffic').get().day;
  const from=scope.from||bjDay(Date.parse(date+'T00:00:00Z')-29*86400000),to=scope.to||date;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||from>to||!Number.isFinite(Date.parse(from))||!Number.isFinite(Date.parse(to)))throw new Error('日期范围无效');
  const restaurants=db.prepare("SELECT * FROM restaurants WHERE school_id='demo' ORDER BY id").all().filter(r=>(!scope.campus||r.campus===scope.campus)&&(!scope.restaurantId||r.id===Number(scope.restaurantId)));
  const ids=new Set(restaurants.map(r=>r.id));
  const dishes=db.prepare("SELECT * FROM caipinxinxi WHERE school_id='demo'").all().filter(d=>restaurants.some(r=>r.name===d.restaurant_name&&r.campus===d.campus)&&(!scope.window||d.window_name===scope.window));
  const dishIds=new Set(dishes.map(d=>d.id));
  const daily=db.prepare("SELECT caipinxinxiid AS dishId,date(addtime,'+8 hours') AS day,COUNT(DISTINCT orderid) AS orders,SUM(buyshu) AS portions,SUM(total) AS revenue FROM orders WHERE school_id='demo' AND status IN ('已支付','制作中','待取餐','已完成') GROUP BY dishId,day").all().filter(r=>dishIds.has(r.dishId));
  const filtered=daily.filter(r=>r.day>=from&&r.day<=to);
  const days=[...new Set(filtered.map(r=>r.day))].sort();
  const trend=days.map(day=>({day,orders:sum(filtered.filter(r=>r.day===day),'orders'),revenue:Math.round(sum(filtered.filter(r=>r.day===day),'revenue')),portions:sum(filtered.filter(r=>r.day===day),'portions')}));
  const clock=demoClock(), hour=clock.minute/60;
  const history=db.prepare('SELECT * FROM demo_traffic WHERE day BETWEEN ? AND ?').all(from,to).filter(r=>ids.has(r.restaurant_id));
  const hourBaseline=h=>sum(history.filter(r=>r.hour===h),'visits')/Math.max(1,days.length);
  const hourly=Array.from({length:15},(_,i)=>({hour:i+6,visits:Math.round(hourBaseline(i+6))}));
  const traffic=restaurants.map((r,i)=>{
    const rows=history.filter(x=>x.restaurant_id===r.id), baseline=h=>sum(rows.filter(x=>x.hour===h),'visits')/Math.max(1,days.length);
    const flow=Math.max(0,(baseline(Math.floor(hour))*(1-hour%1)+baseline(Math.ceil(hour))*(hour%1))*(1+.08*Math.sin(clock.minute/7+i)));
    const occupancy=Math.min(160,Math.round(flow*.32));
    const counts=[.29,.25,.26].map(weight=>Math.round(occupancy*weight));counts.push(occupancy-counts.reduce((a,b)=>a+b,0));
    return {id:r.id,name:r.name,campus:r.campus,visits:Math.round(flow),occupancy,capacity:160,queue:Math.max(0,Math.round((occupancy-80)/3)),zones:[.29,.25,.26,.2].map((weight,j)=>({name:['选餐区','就餐A区','就餐B区','出入口'][j],people:counts[j]}))};
  });
  for(const r of traffic) db.prepare('UPDATE restaurants SET queue_count=?,queue_minutes=?,updated_at=? WHERE id=?').run(r.queue,Math.ceil(r.queue/4),new Date().toISOString(),r.id);
  const matrix=restaurants.flatMap((r,index)=>{
    const local=dishes.filter(d=>d.restaurant_name===r.name), selected=new Set(local.map(d=>d.id));
    const rows=filtered.filter(d=>selected.has(d.dishId));
    const mean=sum(rows,'portions')/Math.max(1,days.length);
    return ['早餐','午餐','晚餐'].map((meal,m)=>{
      const demand=Math.round(mean*[.22,.45,.33][m]*(1+.08*Math.sin(clock.minute/13+index+m)));
      const supply=Math.round(sum(local,'kucun')*[.22,.45,.33][m]);
      return {restaurantId:r.id,restaurant:r.name,meal,demand,supply,gap:supply-demand,lower:Math.round(demand*.87),upper:Math.round(demand*1.13)};
    });
  });
  const ops=db.prepare("SELECT * FROM operations_records WHERE school_id='demo' ORDER BY updated_at DESC").all().map(r=>({...r,payload:JSON.parse(r.payload_json)})).filter(r=>(!r.payload.restaurantId||ids.has(Number(r.payload.restaurantId)))&&(!scope.window||!r.payload.window||r.payload.window===scope.window));
  const inRange=r=>r.updated_at.slice(0,10)>=from&&r.updated_at.slice(0,10)<=to;
  const safety=ops.filter(r=>r.type==='safety'&&inRange(r));
  const checks=safety.reduce((n,r)=>n+r.payload.checkpoints,0),passed=safety.reduce((n,r)=>n+r.payload.passed,0);
  const safetyTrend=[...new Set(safety.map(r=>r.payload.inspectionDate))].sort().map(day=>{const rows=safety.filter(r=>r.payload.inspectionDate===day);return {day,rate:Math.round(rows.reduce((n,r)=>n+r.payload.passed,0)/Math.max(1,rows.reduce((n,r)=>n+r.payload.checkpoints,0))*10000)/100};});
  const purchases=ops.filter(r=>r.type==='procurement'&&inRange(r));
  const suppliers=ops.filter(r=>r.type==='supplier').map(r=>{const rows=purchases.filter(p=>p.payload.supplier===r.title),ontime=rows.filter(p=>p.payload.arrivalStatus==='按时到货').length;return {name:r.title,deliveries:rows.length,ontime:rows.length?Math.round(ontime/rows.length*1000)/10:0,cost:Math.round(rows.reduce((n,p)=>n+p.payload.quantity*p.payload.unitCost,0)),qualification:r.payload.qualification,expiresAt:r.payload.expiresAt};});
  const forecast=hourly.map((r,i)=>({label:String(r.hour).padStart(2,'0')+':00',baseline:r.visits,demand:Math.round(r.visits*(1+.07*Math.sin(clock.minute/11+i))),lower:Math.round(r.visits*.85),upper:Math.round(r.visits*1.15)}));
  const inventory=ops.filter(r=>r.type==='inventory');
  return {source:'演示数据',date,from,to,clock,historyDays:180,updatedAt:new Date().toISOString(),summary:{orders:sum(filtered,'orders'),revenue:Math.round(sum(filtered,'revenue')),portions:sum(filtered,'portions'),visits:sum(history,'visits'),occupancy:sum(traffic,'occupancy'),shortage:sum(matrix.filter(r=>r.gap<0).map(r=>({value:-r.gap})),'value')},trend,traffic,hourly,matrix,forecast,safety:{checks,passed,rate:checks?Math.round(passed/checks*10000)/100:0,open:safety.filter(r=>r.status!=='已闭环').length,trend:safetyTrend,records:safety.slice(0,24),temperatures:restaurants.map((r,i)=>({name:r.name,value:Math.round((3.7+.7*Math.sin(clock.minute/17+i))*10)/10}))},suppliers,inventory,procurement:purchases.slice(0,24),method:'按所选历史区间计算时段均值，叠加场景客流变化；上下界为基线的 ±15%，供需矩阵按可用菜品库存分配。'};
}
