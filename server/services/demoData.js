import { db } from '../database.js';
export const demoId = 'demo';
const dayMs = 86400000;
export const bjDay = (time = Date.now()) => new Date(time + 8 * 3600000).toISOString().slice(0, 10);
const stamp = (day, minute) => new Date(Date.parse(day + 'T00:00:00+08:00') + minute * 60000).toISOString().replace('T',' ').slice(0,19);
export function seedDemoData() {
  const template = db.prepare("SELECT * FROM universities WHERE id='cufe'").get();
  db.prepare('INSERT INTO universities(id,name,short_name,accent,background,logo) VALUES(?,?,?,?,?,?)').run(demoId,'演示数据','演示数据',template.accent,template.background,'/assets/brand/zhixiang-app-icon.png');
  db.exec('CREATE TABLE demo_clock(id INTEGER PRIMARY KEY, minute REAL, anchor INTEGER, playing INTEGER); CREATE TABLE demo_traffic(day TEXT, restaurant_id INTEGER, hour INTEGER, visits INTEGER, PRIMARY KEY(day,restaurant_id,hour)); CREATE INDEX idx_demo_orders_dish_time ON orders(caipinxinxiid,addtime); INSERT INTO demo_clock VALUES(1,690,0,1);');
  db.prepare('UPDATE demo_clock SET anchor=?').run(Date.now());
  db.prepare("INSERT INTO yonghu(id,zhanghao,mima,xingming,role,school_id,jine) VALUES(1,'demo_guest',?,'演示访客','admin','demo',0)").run('!禁止密码登录');
  for (let i=0;i<80;i++) db.prepare("INSERT INTO yonghu(id,zhanghao,mima,xingming,role,school_id,jine) VALUES(?,?,?,?, 'user','demo',?)").run(1000+i,'diner_'+i,'!禁止密码登录','用餐用户'+String(i+1).padStart(3,'0'),100+i);
  const sources = db.prepare("SELECT * FROM caipinxinxi WHERE school_id='cufe' ORDER BY id LIMIT 48").all();
  const restaurants=[]; const dishes=[];
  for(let r=0;r<4;r++) {
    const campus=r<2?'东校区':'西校区', name=['知味食堂','禾香食堂','悦食食堂','四季食堂'][r];
    const id=Number(db.prepare("INSERT INTO restaurants(school_id,campus,name,description,total_seats,available_seats,opening_hours,data_source,floors_json,updated_at) VALUES('demo',?,?,?,160,100,'06:30–20:30','演示数据','[\"一层\",\"二层\"]',?)").run(campus,name,'校园餐饮服务中心',new Date().toISOString()).lastInsertRowid);
    restaurants.push({id,name,campus});
    for(let i=0;i<160;i++) db.prepare("INSERT INTO restaurant_seats(restaurant_id,seat_label,seat_number,floor,seat_type) VALUES(?,?,?,?,'单人座')").run(id,'座位'+(i+1),i+1,i<80?'一层':'二层');
    for(let i=0;i<12;i++) {
      const source=sources[(r*12+i)%sources.length];
      if(!source) throw new Error('演示数据需要项目自带的参考菜品目录');
      const row={...source};delete row.id;
      Object.assign(row,{school_id:'demo',campus,restaurant_name:name,source_key:'demo-'+r+'-'+i,window_name:['家常风味','营养轻食','面点档口'][i%3],floor:i<6?'一层':'二层',kucun:12+(i*7+r*13)%55,data_source:'演示数据',source_url:'',location_basis:'演示数据',price_basis:'演示数据',nutrition_basis:'每份营养估算'});
      const keys=Object.keys(row);
      const dishId=Number(db.prepare('INSERT INTO caipinxinxi('+keys.join(',')+') VALUES('+keys.map(()=>'?').join(',')+')').run(...keys.map(k=>row[k])).lastInsertRowid);
      dishes.push({id:dishId,restaurantId:id,campus,name:row.caipinmingcheng,price:row.jiage,image:row.tupian,window:row.window_name});
    }
  }
  const insertOrder=db.prepare("INSERT INTO orders(orderid,userid,caipinxinxiid,caipinmingcheng,tupian,buyshu,price,total,status,school_id,addtime,pickup_code) VALUES(?,?,?,?,?,?,?,?,?,'demo',?,?)");
  const insertOp=db.prepare("INSERT INTO operations_records(school_id,type,title,payload_json,status,updated_at) VALUES('demo',?,?,?,?,?)");
  const suppliers=['禾源鲜蔬','丰穗粮油','晨牧乳品','鲜达冷链'];
  const today=bjDay();
  for(let offset=179;offset>=0;offset--) {
    const day=bjDay(Date.now()-offset*dayMs), weekday=new Date(day).getUTCDay();
    for(const [index,dish] of dishes.entries()) for(let meal=0;meal<3;meal++) {
      const minute=[450,720,1080][meal]+(index%5)*6-12;
      const quantity=Math.max(1,Math.round((4+(index*7+offset*3+meal*11)%18)*(weekday===0||weekday===6?.76:1)*(1+(179-offset)/800)*[.65,1.35,1][meal]));
      const status=offset===0&&index%11===0?'制作中':'已完成';
      insertOrder.run('DX'+day.replaceAll('-','')+'-'+dish.id+'-'+meal,1000+(index+offset)%80,dish.id,dish.name,dish.image,quantity,dish.price,Math.round(quantity*dish.price*100)/100,status,stamp(day,minute),String(1000+index));
    }
    for(const [ri,r] of restaurants.entries()) {
      for(let hour=6;hour<=20;hour++) {
        const peak=Math.exp(-(((hour-12)/1.3)**2))+.65*Math.exp(-(((hour-18)/1.4)**2))+.38*Math.exp(-(((hour-8)/1.1)**2));
        db.prepare('INSERT INTO demo_traffic VALUES(?,?,?,?)').run(day,r.id,hour,Math.round((30+peak*(320+ri*45))*(weekday===0||weekday===6?.78:1)*(1+.07*Math.sin(offset+ri))));
      }
      const passed=offset%17===ri?23:24;
      const time=stamp(day,600);
      insertOp.run('safety',day+' '+r.name+'例行检查',JSON.stringify({campus:r.campus,restaurantId:r.id,owner:'值班主管',inspectionDate:day,checkpoints:24,passed,severity:passed<24?'关注':'低',followUp:passed<24?'已安排复核':'检查完成',temperature:3.1+((offset+ri)%17)/10,category:'环境与冷链',description:'环境卫生、冷链温度、餐具消毒、食品留样逐项检查'}),passed<24&&offset<2?'待复核':'已闭环',time);
      if(offset%7===0||offset===0) {
        for(let si=0;si<4;si++) {
          const dish=dishes[ri*12+si]; const qty=90+(offset+si*17)%130;
          const common={campus:r.campus,restaurantId:r.id,dishId:dish.id,window:dish.window,supplier:suppliers[si],owner:'采购主管',quantity:qty,unitCost:4.2+si*1.3,batch:'PC'+day.replaceAll('-','')+'-'+ri+si,expiresAt:bjDay(Date.parse(day+'T00:00:00Z')+7*dayMs),qualification:'审核通过',prepared:60+si*10};
          insertOp.run('procurement',day+' '+r.name+' '+suppliers[si]+'到货',JSON.stringify({...common,arrivalStatus:(offset+si)%13===0?'延迟到货':'按时到货',description:'订单、到货与验收记录关联'}),'已验收',time);
          if(offset===0) insertOp.run('inventory',r.name+' '+['鲜蔬','粮油','乳品','冷链食材'][si]+'库存',JSON.stringify({...common,arrivalStatus:'已入库',expiresAt:bjDay(Date.now()+(si===0?1:7)*dayMs),description:'与采购批次、菜品用料关联'}),si===0?'临期关注':'正常',time);
        }
      }
      if(offset%14===0) db.prepare("INSERT INTO messages(userid,yonghuming,content,replycontent,school_id,campus,restaurant_id,category,priority,workflow,owner,addtime) VALUES(1000,'用餐用户001',?,?,'demo',?,?,?,'普通',?,'服务主管',?)").run(['希望增加清淡菜品','午餐高峰建议增开窗口','早餐品类丰富，服务满意'][offset%3],offset?'已反馈食堂并完成跟进':'',r.campus,r.id,'建议',offset?'已闭环':'待处理',time);
    }
  }
  suppliers.forEach((name,i)=>insertOp.run('supplier',name,JSON.stringify({supplier:name,qualification:'审核通过',category:['鲜蔬','粮油','乳品','冷链'][i],owner:'供应主管',expiresAt:bjDay(Date.now()+(45+i*30)*dayMs),quantity:200+i*80,unitCost:4+i,description:'准入审核、到货验收与履约管理'}),'合作中',stamp(today,540)));
  for(const [i,d] of dishes.entries()) db.prepare("INSERT INTO discusscaipinxinxi(caipinxinxiid,userid,yonghuming,commentcontent,replycontent,school_id,rating,addtime) VALUES(?,1000,'用餐用户001',?,?,'demo',?,?)").run(d.id,['分量合适，口味稳定','希望少一些油盐','高峰出餐速度有提升'][i%3],'感谢反馈，已记录并跟进',i%7===0?3:5,stamp(today,780));
  for(const r of restaurants) for(const type of ['conservation','service','canteen']) insertOp.run(type,r.name+' '+{conservation:'餐厨减量跟进',service:'服务质量巡查',canteen:'窗口运营检查'}[type],JSON.stringify({campus:r.campus,restaurantId:r.id,owner:'运营主管',metric:'餐厨减量',value:12.8,unit:'%',description:'运营日常跟进记录'}),'进行中',stamp(today,600));
}
