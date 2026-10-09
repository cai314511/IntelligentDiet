import { demoInsights } from './demoInsights.js';
import {db} from '../database.js';
import {catalog,parse} from './catalog.js';
export const managementTools=[{type:'function',function:{name:'query_management',description:'查询后勤台账及学生端订单反馈。类型：supplier供应商及资质、inventory库存批次、procurement采购、safety食品安全、canteen运营、conservation节约、service服务、orders全校订单汇总、feedback学生反馈、reviews菜品评价、forecast日均销量预测。live动态客流热力与供需矩阵。可跨类型多次查询。',parameters:{type:'object',properties:{type:{type:'string',enum:['supplier','inventory','procurement','safety','canteen','conservation','service','orders','feedback','forecast','reviews','live']},query:{type:'string'},offset:{type:'integer',minimum:0,description:'分页起点，每页80条'},allDates:{type:'boolean',description:'供应商、库存等基础目录默认不按日期；查询全部历史订单反馈时设true'}},required:['type']}}}];
export function managementQuery(args,user,scope={}) {
 if(user?.role!=='admin')return {error:'需要后勤管理员权限'};
 for(const key of ['from','to']) if(scope[key] && (!/^\d{4}-\d{2}-\d{2}$/.test(scope[key])||!Number.isFinite(Date.parse(scope[key]))))return {error:'日期范围无效'};
 if(scope.from&&scope.to&&scope.from>scope.to)return {error:'起止日期范围无效'};
 const schoolId=user.schoolId;
 if(user.demoSession && ['live','forecast'].includes(args.type)) { const data=demoInsights(scope);return {source:'演示数据',clock:data.clock,method:data.method,summary:data.summary,traffic:data.traffic,temperatures:data.safety.temperatures,safetyRate:data.safety.rate,suppliers:data.suppliers,rows:args.type==='live'?data.matrix:data.forecast}; }
 if(args.type==='live')return {error:'当前学校未接入动态客流场景'};
 const data=catalog(schoolId);
 const restaurants=data.restaurants.filter(r=>(!scope.campus||r.campus===scope.campus)&&(!scope.restaurantId||r.id===Number(scope.restaurantId)));
 const ids=new Set(restaurants.map(r=>r.id));
 const dishes=new Set(data.dishes.filter(d=>ids.has(d.restaurantId)&&(!scope.window||d.window===scope.window)).map(d=>d.id));
 const dated=(value)=>args.allDates||(!scope.from&&!scope.to)||(!scope.from||String(value)>=scope.from)&&(!scope.to||String(value).slice(0,10)<=scope.to);
 const query=String(args.query||'').slice(0,100);
 let rows;
 if(args.type==='forecast') {
  const from=scope.from||new Date(Date.now()-7*86400000).toISOString().slice(0,10),to=scope.to||new Date().toISOString().slice(0,10);
  const history=db.prepare("SELECT caipinxinxiid,buyshu FROM orders WHERE school_id=? AND status IN ('已支付','制作中','待取餐','已完成') AND date(addtime,'+8 hours') BETWEEN ? AND ?").all(schoolId,from,to);
  const days=Math.max(1,(Date.parse(to)-Date.parse(from))/86400000+1);
  return {schoolId,scope:{...scope,from,to},source:'已支付订单历史',method:'日均销量基线，未来1天；无历史不生成预测',rows:data.dishes.filter(d=>dishes.has(d.id)).map(d=>({dish:d.name,demand:history.length?Math.ceil(history.filter(r=>r.caipinxinxiid===d.id).reduce((n,r)=>n+r.buyshu,0)/days):null}))};
 }
 if(args.type==='reviews') {
  rows=db.prepare("SELECT caipinxinxiid,commentcontent,replycontent,addtime FROM discusscaipinxinxi WHERE caipinxinxiid IN (SELECT id FROM caipinxinxi WHERE school_id=?) ORDER BY id DESC").all(schoolId).filter(r=>dishes.has(r.caipinxinxiid)&&dated(r.addtime));
 }
 else if(args.type==='orders') rows=db.prepare("SELECT orderid,caipinxinxiid,caipinmingcheng,status,buyshu,total,date(addtime,'+8 hours') AS date FROM orders WHERE school_id=? ORDER BY addtime DESC").all(schoolId).filter(r=>dishes.has(r.caipinxinxiid)&&dated(r.date));
 else if(args.type==='feedback') rows=db.prepare("SELECT id,content,replycontent AS reply,campus,restaurant_id,window_name,category,priority,workflow,due_at,date(addtime,'+8 hours') AS addtime FROM messages WHERE school_id=? ORDER BY id DESC").all(schoolId).filter(r=>(!scope.campus||r.campus===scope.campus)&&(!scope.restaurantId||r.restaurant_id===Number(scope.restaurantId))&&(!scope.window||r.window_name===scope.window)&&dated(r.addtime));
 else if(['supplier','inventory','procurement','safety','canteen','conservation','service'].includes(args.type)) rows=db.prepare('SELECT id,type,title,status,payload_json,updated_at FROM operations_records WHERE school_id=? AND type=? ORDER BY updated_at DESC').all(schoolId,args.type).map(({payload_json,...r})=>({...r,payload:parse(payload_json,{})})).filter(r=>(!scope.campus||!r.payload.campus||r.payload.campus===scope.campus)&&(!scope.restaurantId||!r.payload.restaurantId||ids.has(Number(r.payload.restaurantId)))&&(!scope.window||!r.payload.window||r.payload.window===scope.window));
 else return {error:'查询类型无效'};
 rows=rows.filter(r=>!query||JSON.stringify(r).includes(query));
 return {schoolId,scope,type:args.type,total:rows.length,rows:rows.slice(Math.max(0,Number(args.offset)||0),Math.max(0,Number(args.offset)||0)+80),truncated:rows.length>Math.max(0,Number(args.offset)||0)+80,nextOffset:Math.max(0,Number(args.offset)||0)+80,source:'系统数据库与后勤台账',queriedAt:new Date().toISOString(),...(args.type==='orders'?{summary:{lines:rows.length,orders:new Set(rows.map(r=>r.orderid)).size,total:rows.reduce((s,r)=>s+Number(r.total),0),paidRevenue:rows.filter(r=>['已支付','制作中','待取餐','已完成'].includes(r.status)).reduce((s,r)=>s+Number(r.total),0),byStatus:rows.reduce((o,r)=>(o[r.status]=(o[r.status]||0)+1,o),{})}}:{})};
}
