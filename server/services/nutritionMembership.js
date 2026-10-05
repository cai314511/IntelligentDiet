import { randomUUID } from 'node:crypto';
export const membershipPlans = [{id:'month',name:'单月卡',price:12,firstPrice:6,months:1},{id:'quarter',name:'连续包季卡',price:38,months:3,recurring:true},{id:'year',name:'年卡',price:128,months:12}];
export function initNutritionMembership(db){db.exec(`CREATE TABLE IF NOT EXISTS nutrition_memberships(user_id INTEGER PRIMARY KEY,trial_started_at TEXT NOT NULL,expires_at TEXT,plan TEXT,auto_renew INTEGER DEFAULT 0,purchases INTEGER DEFAULT 0,renewal_error TEXT); CREATE TABLE IF NOT EXISTS nutrition_membership_payments(request_id TEXT PRIMARY KEY,user_id INTEGER NOT NULL,amount REAL NOT NULL,expires_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS nutrition_diet_plans(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL,school_id TEXT NOT NULL,title TEXT NOT NULL,content TEXT NOT NULL);`);}
export function entitlements(db,user,now=Date.now()){
 initNutritionMembership(db);
 db.prepare('INSERT OR IGNORE INTO nutrition_memberships(user_id,trial_started_at) VALUES(?,?)').run(user.id,new Date(now).toISOString());
 let row=db.prepare('SELECT * FROM nutrition_memberships WHERE user_id=?').get(user.id);
 if(row.auto_renew&&row.expires_at&&Date.parse(row.expires_at)<=now){try{purchaseMembership(db,user,{plan:'quarter',autoRenew:true,requestId:`renew-${user.id}-${row.expires_at}`},now);row=db.prepare('SELECT * FROM nutrition_memberships WHERE user_id=?').get(user.id);}catch(e){db.prepare('UPDATE nutrition_memberships SET renewal_error=? WHERE user_id=?').run(e.message,user.id);}}
 const trialEndsAt=new Date(Date.parse(row.trial_started_at)+3*86400000).toISOString();
 return {...row,trialEndsAt,advanced:user.role==='admin'||Date.parse(row.expires_at)>now||Date.parse(trialEndsAt)>now,member:Date.parse(row.expires_at)>now,admin:user.role==='admin',purchaseEnabled:true,plans:membershipPlans.map(p=>({...p,amount:p.id==='month'&&!row.purchases?6:p.price}))};
}
export function purchaseMembership(db,user,b,now=Date.now()){
 initNutritionMembership(db);const plan=membershipPlans.find(p=>p.id===b.plan);
 if(!plan||typeof b.requestId!=='string'||b.requestId.length<8||b.requestId.length>100)throw new Error('请选择会员方案');
 if(plan.recurring&&b.autoRenew!==true)throw new Error('请确认连续包季续费授权');
 return db.transaction(()=>{const prior=db.prepare('SELECT * FROM nutrition_membership_payments WHERE request_id=?').get(b.requestId);if(prior){if(prior.user_id!==user.id)throw new Error('请求编号无效');return prior;}
 db.prepare('INSERT OR IGNORE INTO nutrition_memberships(user_id,trial_started_at) VALUES(?,?)').run(user.id,new Date(now).toISOString());
 const row=db.prepare('SELECT * FROM nutrition_memberships WHERE user_id=?').get(user.id),amount=plan.id==='month'&&!row.purchases?6:plan.price;
 const start=new Date(Math.max(now,Date.parse(row.expires_at)||0)),day=start.getUTCDate();start.setUTCDate(1);start.setUTCMonth(start.getUTCMonth()+plan.months);const last=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0)).getUTCDate();start.setUTCDate(Math.min(day,last));const expires=start.toISOString();
 if(!db.prepare('UPDATE yonghu SET jine=jine-? WHERE id=? AND school_id=? AND jine>=?').run(amount,user.id,user.schoolId,amount).changes)throw new Error('账户余额不足');
 db.prepare('UPDATE nutrition_memberships SET expires_at=?,plan=?,auto_renew=?,purchases=purchases+1,renewal_error=NULL WHERE user_id=?').run(expires,plan.id,plan.recurring?1:0,user.id);
 db.prepare('INSERT INTO nutrition_membership_payments VALUES(?,?,?,?)').run(b.requestId,user.id,amount,expires);
 db.prepare("INSERT INTO payment_ledger(transaction_id,orderid,user_id,kind,amount_cents) VALUES(?,?,?,'payment',?)").run(randomUUID(),'MEM-'+b.requestId,user.id,Math.round(amount*100));return {amount,expires_at:expires};})();
}
