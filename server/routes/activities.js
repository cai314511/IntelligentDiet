import express from 'express';
import { randomUUID } from 'crypto';
import { db } from '../database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { awardPoints } from '../services/catalog.js';

const router = express.Router();
const schoolIdFor = req => req.user?.schoolId || String(req.query.schoolId || 'cufe');
const validSchool = id => Boolean(db.prepare('SELECT 1 FROM universities WHERE id=?').get(id));
const safeJson = value => { try { return JSON.parse(value || '[]'); } catch { return []; } };

router.get('/culture/orders/mine', requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT order_id AS orderId,title,quantity,unit_price AS unitPrice,total,status,created_at AS createdAt
    FROM cultural_orders WHERE user_id=? AND school_id=? ORDER BY created_at DESC`).all(req.user.id, req.user.schoolId);
  res.json({ code: 200, data: rows });
});

router.get('/culture/orders', requireAdmin, (req, res) => {
  const rows = db.prepare(`SELECT order_id AS orderId,user_id AS userId,title,quantity,unit_price AS unitPrice,total,status,created_at AS createdAt
    FROM cultural_orders WHERE school_id=? ORDER BY created_at DESC LIMIT 500`).all(req.user.schoolId);
  res.json({ code: 200, data: rows });
});

router.get('/culture/manage', requireAdmin, (req,res) => {
  const rows=db.prepare(`SELECT id,title,category,description,price,image,campus,source_name AS sourceName,source_url AS sourceUrl,status,stock
    FROM cultural_items WHERE school_id=? ORDER BY id DESC`).all(req.user.schoolId);
  res.json({code:200,data:rows});
});

router.get('/culture', (req, res) => {
  const schoolId = schoolIdFor(req);
  if (!validSchool(schoolId)) return res.status(400).json({ code: 400, message: '请选择有效学校' });
  const q = `%${String(req.query.q || '').slice(0, 80)}%`;
  const rows = db.prepare(`SELECT id,school_id AS schoolId,title,title AS name,category,description,price,image,campus,source_name AS sourceName,source_url AS sourceUrl,stock
    FROM cultural_items WHERE school_id=? AND status='published' AND (title LIKE ? OR category LIKE ? OR description LIKE ?) ORDER BY id DESC`).all(schoolId,q,q,q);
  res.json({ code: 200, data: rows });
});

router.post('/culture', requireAdmin, (req, res) => {
  const { title, category = '校园文创', description = '', price = 0, image = '', campus = '' } = req.body || {};
  if (typeof title !== 'string' || !title.trim() || title.length > 100 || typeof category !== 'string' || !category.trim() || !Number.isFinite(Number(price)) || Number(price) < 0 || Number(price) > 10000) return res.status(400).json({ code: 400, message: '文创商品信息格式无效' });
  const result = db.prepare(`INSERT INTO cultural_items(school_id,title,category,description,price,image,campus)
    VALUES(?,?,?,?,?,?,?)`).run(req.user.schoolId,title.trim(),category.trim(),String(description).slice(0,2000),Number(price),String(image).slice(0,500),String(campus).slice(0,100));
  if(Number.isSafeInteger(Number(req.body.stock))&&Number(req.body.stock)>=0)db.prepare('UPDATE cultural_items SET stock=? WHERE id=?').run(Math.min(100000,Number(req.body.stock)),result.lastInsertRowid);
  res.status(201).json({ code: 200, message: '文创商品已添加', data: { id: result.lastInsertRowid } });
});

router.put('/culture/:id', requireAdmin, (req, res) => {
  const item = db.prepare('SELECT * FROM cultural_items WHERE id=? AND school_id=?').get(req.params.id,req.user.schoolId);
  if (!item) return res.status(404).json({ code: 404, message: '文创商品不存在' });
  const b=req.body||{}, title=b.title===undefined?item.title:String(b.title).trim(), price=b.price===undefined?Number(item.price):Number(b.price);
  if (!title || title.length>100 || !Number.isFinite(price) || price<0 || price>10000) return res.status(400).json({ code:400,message:'文创商品信息格式无效' });
  if(b.stock!==undefined&&(!Number.isSafeInteger(Number(b.stock))||Number(b.stock)<0||Number(b.stock)>100000))return res.status(400).json({message:'库存格式无效'});
  db.prepare(`UPDATE cultural_items SET title=?,category=?,description=?,price=?,image=?,campus=? WHERE id=? AND school_id=?`).run(title,b.category??item.category,b.description??item.description,price,b.image??item.image,b.campus??item.campus,item.id,req.user.schoolId);
  if(b.stock!==undefined){if(!Number.isSafeInteger(Number(b.stock))||Number(b.stock)<0||Number(b.stock)>100000)return res.status(400).json({message:'库存格式无效'});db.prepare('UPDATE cultural_items SET stock=? WHERE id=? AND school_id=?').run(Number(b.stock),item.id,req.user.schoolId);}
  res.json({ code:200,message:'文创商品已更新' });
});

router.delete('/culture/:id', requireAdmin, (req,res) => {
  const result=db.prepare("UPDATE cultural_items SET status='archived' WHERE id=? AND school_id=?").run(req.params.id,req.user.schoolId);
  if(!result.changes) return res.status(404).json({code:404,message:'文创商品不存在'});
  res.json({code:200,message:'文创商品已归档'});
});

router.post('/culture/:id/purchase', requireAuth, (req, res) => {
  const quantity=Number(req.body?.quantity||1);
  if (!Number.isSafeInteger(quantity)||quantity<1||quantity>20) return res.status(400).json({code:400,message:'购买数量格式无效'});
  const item=db.prepare("SELECT id,title,price,stock FROM cultural_items WHERE id=? AND school_id=? AND status='published'").get(req.params.id,req.user.schoolId);
  if (!item) return res.status(404).json({code:404,message:'文创商品不存在'});
  const orderId=`CULT-${randomUUID().slice(0,12).toUpperCase()}`;
  const total=Math.round(Number(item.price)*quantity*100)/100, cents=Math.round(total*100);
  try {
    const purchase=db.transaction(()=>{
      const changed=db.prepare("UPDATE cultural_items SET stock=stock-? WHERE id=? AND school_id=? AND stock>=? AND status='published'").run(quantity,item.id,req.user.schoolId,quantity);
      if(!changed.changes)throw Object.assign(new Error('商品库存不足'),{status:409});
      const debit=db.prepare('UPDATE yonghu SET jine=jine-? WHERE id=? AND school_id=? AND jine>=?').run(total,req.user.id,req.user.schoolId,total);
      if (!debit.changes) throw Object.assign(new Error('账户余额不足'),{status:409});
      db.prepare(`INSERT INTO cultural_orders(order_id,user_id,school_id,item_id,title,quantity,unit_price,total) VALUES(?,?,?,?,?,?,?,?)`)
        .run(orderId,req.user.id,req.user.schoolId,item.id,item.title,quantity,item.price,total);
      db.prepare(`INSERT INTO payment_ledger(transaction_id,orderid,user_id,kind,amount_cents) VALUES(?,?,?,'payment',?)`)
        .run(randomUUID(),orderId,req.user.id,cents);
      return db.prepare('SELECT jine FROM yonghu WHERE id=?').get(req.user.id).jine;
    });
    const balance=purchase();
    res.status(201).json({code:200,message:'下单成功',data:{orderId,total,balance}});
  } catch(error) {
    res.status(error.status||500).json({code:error.status||500,message:error.status?error.message:'文创订单暂时无法完成'});
  }
});

router.get('/manage', requireAdmin, (req,res)=>{
  const rows=db.prepare(`SELECT a.id,a.title,a.description,a.category,a.campus,a.starts_at AS startsAt,a.ends_at AS endsAt,
      a.location,a.image,a.source_name AS sourceName,a.source_url AS sourceUrl,a.status,a.capacity,
      (SELECT COUNT(*) FROM activity_signups s WHERE s.activity_id=a.id AND s.status='registered') AS participants
      FROM activities a WHERE a.school_id=? ORDER BY a.starts_at DESC`).all(req.user.schoolId);
  res.json({code:200,data:rows});
});

router.get('/', (req, res) => {
  const schoolId=schoolIdFor(req);
  if (!validSchool(schoolId)) return res.status(400).json({code:400,message:'请选择有效学校'});
  const q=`%${String(req.query.q||'').slice(0,80)}%`;
  const rows=db.prepare(`SELECT a.id,a.school_id AS schoolId,a.title,a.description,a.category,a.campus,a.starts_at AS startsAt,a.ends_at AS endsAt,
    a.location,a.image,a.source_name AS sourceName,a.source_url AS sourceUrl,a.status,a.capacity,
    (SELECT COUNT(*) FROM activity_signups s WHERE s.activity_id=a.id AND s.status='registered') AS participants
    FROM activities a WHERE a.school_id=? AND a.status='published' AND (a.title LIKE ? OR a.description LIKE ? OR a.category LIKE ?)
    ORDER BY a.starts_at DESC LIMIT 200`).all(schoolId,q,q,q);
  res.json({code:200,data:rows});
});

router.post('/', requireAdmin, (req,res)=>{
  const b=req.body||{};
  if (![b.title,b.description,b.startsAt,b.endsAt].every(v=>typeof v==='string'&&v.trim()) || b.title.length>120 || b.description.length>5000 || new Date(b.endsAt)<=new Date(b.startsAt)) return res.status(400).json({code:400,message:'活动信息格式无效'});
  const result=db.prepare(`INSERT INTO activities(school_id,title,description,category,campus,starts_at,ends_at,location,image,capacity,status)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(req.user.schoolId,b.title.trim(),b.description.trim(),b.category||'校园活动',b.campus||'',b.startsAt,b.endsAt,b.location||'',b.image||'',Math.max(0,Number(b.capacity)||0),b.status==='draft'?'draft':'published');
  res.status(201).json({code:200,message:'活动已创建',data:{id:result.lastInsertRowid}});
});

router.put('/:id', requireAdmin, (req,res)=>{
  const old=db.prepare('SELECT * FROM activities WHERE id=? AND school_id=?').get(req.params.id,req.user.schoolId);
  if(!old) return res.status(404).json({code:404,message:'活动不存在'});
  const b=req.body||{}, title=String(b.title??old.title).trim(), description=String(b.description??old.description).trim();
  const startsAt=String(b.startsAt??old.starts_at), endsAt=String(b.endsAt??old.ends_at);
  if(!title||title.length>120||description.length>5000||new Date(endsAt)<=new Date(startsAt)) return res.status(400).json({code:400,message:'活动信息格式无效'});
  db.prepare(`UPDATE activities SET title=?,description=?,category=?,campus=?,starts_at=?,ends_at=?,location=?,image=?,capacity=?,status=? WHERE id=? AND school_id=?`)
    .run(title,description,b.category??old.category,b.campus??old.campus,startsAt,endsAt,b.location??old.location,b.image??old.image,
      b.capacity===undefined?old.capacity:Math.max(0,Number(b.capacity)||0),b.status==='draft'?'draft':'published',old.id,req.user.schoolId);
  res.json({code:200,message:'活动已更新'});
});

router.delete('/:id', requireAdmin, (req,res)=>{
  const result=db.prepare("UPDATE activities SET status='archived' WHERE id=? AND school_id=?").run(req.params.id,req.user.schoolId);
  if(!result.changes) return res.status(404).json({code:404,message:'活动不存在'});
  res.json({code:200,message:'活动已归档'});
});

router.get('/users/mine', requireAuth, (req,res)=>{
  const rows=db.prepare(`SELECT a.id,a.title,a.category,a.campus,a.starts_at AS startsAt,a.ends_at AS endsAt,s.status AS signupStatus
    FROM activity_signups s JOIN activities a ON a.id=s.activity_id WHERE s.user_id=? AND a.school_id=? ORDER BY a.starts_at DESC`).all(req.user.id,req.user.schoolId);
  res.json({code:200,data:rows});
});

router.get('/:id/signups',requireAdmin,(req,res)=>{const activity=db.prepare('SELECT id FROM activities WHERE id=? AND school_id=?').get(req.params.id,req.user.schoolId);if(!activity)return res.status(404).json({message:'活动不存在'});const rows=db.prepare('SELECT u.xingming AS name,u.lianxifangshi AS phone,s.created_at AS createdAt,s.status FROM activity_signups s JOIN yonghu u ON u.id=s.user_id WHERE s.activity_id=? AND u.school_id=? ORDER BY s.created_at').all(activity.id,req.user.schoolId).map(r=>({...r,phone:r.phone?r.phone.replace(/^(\d{3})\d+(\d{4})$/,'$1****$2'):'—'}));res.json({code:200,data:rows});});

router.get('/:id', (req,res)=>{
  const schoolId=schoolIdFor(req);
  if (!validSchool(schoolId)) return res.status(400).json({code:400,message:'请选择有效学校'});
  const activity=db.prepare(`SELECT a.*,(SELECT COUNT(*) FROM activity_signups s WHERE s.activity_id=a.id AND s.status='registered') AS participants
    FROM activities a WHERE a.id=? AND a.school_id=? AND a.status='published'`).get(req.params.id,schoolId);
  if (!activity) return res.status(404).json({code:404,message:'活动不存在'});
  const {school_id:schoolIdValue,source_name:sourceName,source_url:sourceUrl,starts_at:startsAt,ends_at:endsAt,...rest}=activity;
  res.json({code:200,data:{...rest,schoolId:schoolIdValue,sourceName,sourceUrl,startsAt,endsAt}});
});

router.post('/:id/join', requireAuth, (req,res)=>{
  const activity=db.prepare(`SELECT id,starts_at,ends_at,capacity,status FROM activities WHERE id=? AND school_id=?`).get(req.params.id,req.user.schoolId);
  if (!activity||activity.status!=='published') return res.status(404).json({code:404,message:'活动不存在'});
  if (new Date(activity.ends_at)<new Date()) return res.status(409).json({code:409,message:'活动报名时间已结束'});
  try {
    const signup=db.transaction(()=>{
      const count=db.prepare(`SELECT COUNT(*) AS count FROM activity_signups WHERE activity_id=? AND status='registered'`).get(activity.id).count;
      if (activity.capacity>0&&count>=activity.capacity) throw Object.assign(new Error('活动名额已满'),{status:409});
      db.prepare(`INSERT INTO activity_signups(activity_id,user_id) VALUES(?,?)`).run(activity.id,req.user.id);
      awardPoints(req.user,'活动报名',activity.id,10);
    });
    signup();
    res.status(201).json({code:200,message:'报名成功',data:{activityId:activity.id,joinDate:new Date().toISOString()}});
  } catch(error) {
    if(error.code==='SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({code:409,message:'你已报名该活动'});
    res.status(error.status||500).json({code:error.status||500,message:error.status?error.message:'报名暂时无法完成'});
  }
});

router.put('/culture/orders/:orderId/status',requireAdmin,(req,res)=>{
 try{db.transaction(()=>{const o=db.prepare('SELECT * FROM cultural_orders WHERE order_id=? AND school_id=?').get(req.params.orderId,req.user.schoolId);const status=req.body?.status;if(!o||!['待领取','已完成','已退款'].includes(status)||(o.status==='已支付'?!['待领取','已退款'].includes(status):!(o.status==='待领取'&&status==='已完成')))throw Object.assign(new Error('当前文创订单不可执行此操作'),{status:409});if(status==='已退款'){const payment=db.prepare("SELECT amount_cents FROM payment_ledger WHERE orderid=? AND kind='payment'").get(o.order_id);if(!payment||payment.amount_cents!==Math.round(o.total*100))throw Object.assign(new Error('支付流水不匹配'),{status:409});db.prepare("INSERT INTO payment_ledger(transaction_id,orderid,user_id,kind,amount_cents) VALUES(?,?,?,'refund',?)").run(randomUUID(),o.order_id,o.user_id,payment.amount_cents);db.prepare('UPDATE yonghu SET jine=jine+? WHERE id=? AND school_id=?').run(o.total,o.user_id,req.user.schoolId);db.prepare('UPDATE cultural_items SET stock=stock+? WHERE id=? AND school_id=?').run(o.quantity,o.item_id,req.user.schoolId);}db.prepare('UPDATE cultural_orders SET status=? WHERE order_id=? AND school_id=?').run(status,o.order_id,req.user.schoolId);})();res.json({code:200,message:'文创订单已更新'});}catch(e){res.status(e.status||409).json({message:e.message});}
});
export default router;
