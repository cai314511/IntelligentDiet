import Database from 'better-sqlite3';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db, mainDb, databaseContext, initDatabase } from '../database.js';
import { seedReferenceData } from '../seed.js';
import { config } from '../config.js';
import { signToken } from '../middleware/auth.js';
import { seedDemoData, bjDay } from './demoData.js';
let template, templateDay;
const connections=new Map();
const activeRequests=new Map();
const entryRequests=new Map();
export function initDemoEnvironment() {
  mainDb.exec('CREATE TABLE IF NOT EXISTS demo_visitors(id TEXT PRIMARY KEY, expires_at INTEGER NOT NULL)');
}
export function demoSchool() {
  const s=mainDb.prepare("SELECT accent,background FROM universities WHERE id='cufe'").get();
  return {id:'demo',name:'演示数据',shortName:'演示数据',skinId:'cufe',accent:s.accent,background:s.background,logo:'/assets/brand/zhixiang-app-icon.png',campuses:['东校区','西校区']};
}
function blueprint() {
  if(template&&templateDay===bjDay()) return template;
  const connection=new Database(':memory:');
  try {
    databaseContext.run(connection,()=>connection.transaction(()=>{
      initDatabase();
      if(!db.prepare("SELECT 1 FROM caipinxinxi WHERE school_id='cufe'").get()) seedReferenceData(db);
      seedDemoData();
    })());
    template=connection.serialize();templateDay=bjDay();return template;
  } finally {connection.close();}
}
function openVisitor(id) {
  if(connections.has(id))return connections.get(id);
  const filename=path.join(config.userDataDir,'demo-visitors',id+'.sqlite');
  const connection=new Database(filename,{fileMustExist:true});
  connection.pragma('foreign_keys = ON');
  connections.set(id,connection);return connection;
}
export function createDemoSession(req,res,next) {
  const now=Date.now();
  for(const [ip,entry] of entryRequests)if(now-entry.start>60000)entryRequests.delete(ip);
  const key=req.ip,entry=entryRequests.get(key)||{start:now,count:0};
  if(entry.count>=20)return res.status(429).json({message:'进入次数较多，请稍后重试'});
  entry.count++;entryRequests.set(key,entry);
  try {
    const directory=path.join(config.userDataDir,'demo-visitors');fs.mkdirSync(directory,{recursive:true});
    const id=randomBytes(24).toString('hex');
    fs.writeFileSync(path.join(directory,id+'.sqlite'),blueprint(),{flag:'wx',mode:0o600});
    const expires=Date.now()+7*86400000;
    mainDb.prepare('INSERT INTO demo_visitors VALUES(?,?)').run(id,expires);
    const connection=openVisitor(id);
    connection.prepare('UPDATE demo_clock SET anchor=?').run(Date.now());
    connection.close();connections.delete(id);
    const user={id:1,zhanghao:'demo_guest',xingming:'演示访客',role:'admin',school_id:'demo',demoSession:id};
    res.set('Cache-Control','no-store').json({code:200,data:{token:signToken(user),user,school:demoSchool(),identity:'admin',campus:''}});
  }catch(error){next(error);}
}
export function isolateDemo(req,res,next) {
  if(!req.user?.demoSession) {
    if(req.user?.schoolId==='demo')return res.status(403).json({message:'请从演示数据入口进入'});
    return next();
  }
  const id=req.user.demoSession;
  const row=/^[a-f0-9]{48}$/.test(id)?mainDb.prepare('SELECT expires_at FROM demo_visitors WHERE id=?').get(id):null;
  if(!row||row.expires_at<=Date.now()||req.user.role!=='admin'||req.user.schoolId!=='demo'||req.user.id!==1)return res.status(401).json({message:'请重新进入演示数据'});
  const route=req.path.toLowerCase();
  if(route.startsWith('/users/development-')||route.startsWith('/tasks')||route.startsWith('/nutrition')||(route.startsWith('/ai/')&&req.body?.surface!=='management'))return res.status(403).json({message:'请使用后勤小智查询后勤数据'});
  try {
    const connection=openVisitor(id);
    activeRequests.set(id,(activeRequests.get(id)||0)+1);
    let released=false;
    const release=()=>{
      if(released)return;released=true;
      const active=(activeRequests.get(id)||1)-1;
      if(active){activeRequests.set(id,active);return;}
      activeRequests.delete(id);connections.delete(id);
      if(connection.open)connection.close();
    };
    res.once('finish',release);
    // 客户端断开后允许已开始的异步查询结束，再释放连接。
    res.once('close',()=>{if(!res.writableFinished){const timer=setTimeout(release,150000);timer.unref();}});
    databaseContext.run(connection,next);
  }catch(error){next(error);}
}
export function closeDemoConnections() {for(const connection of connections.values())connection.close();connections.clear();}
