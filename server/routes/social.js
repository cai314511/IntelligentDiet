import express from 'express';
import { db } from '../database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const schoolFor = req => req.user?.schoolId || String(req.query.schoolId || 'cufe');
const validSchool = id => Boolean(db.prepare('SELECT 1 FROM universities WHERE id=?').get(id));

router.get('/rankings', (req,res)=>{
  const schoolId=schoolFor(req);
  if(!validSchool(schoolId)) return res.status(400).json({code:400,message:'请选择有效学校'});
  const recommend=db.prepare(`SELECT caipinmingcheng AS name,pinfen AS rating,yueshuxiao AS sales,jiage AS price,caipinfenlei AS category
    FROM caipinxinxi WHERE school_id=? AND shangjia='是' ORDER BY pinfen DESC,yueshuxiao DESC LIMIT 5`).all(schoolId);
  const costEffective=db.prepare(`SELECT caipinmingcheng AS name,pinfen AS rating,yueshuxiao AS sales,jiage AS price,caipinfenlei AS category
    FROM caipinxinxi WHERE school_id=? AND shangjia='是' ORDER BY jiage ASC,pinfen DESC LIMIT 5`).all(schoolId);
  const pitfall=db.prepare(`SELECT d.caipinmingcheng AS name,ROUND(AVG(r.rating),1) AS rating,COUNT(*) AS reviews
    FROM caipinxinxi d JOIN discusscaipinxinxi r ON r.caipinxinxiid=d.id AND r.school_id=d.school_id
    WHERE d.school_id=? GROUP BY d.id HAVING COUNT(*)>=2 ORDER BY rating ASC,reviews DESC LIMIT 5`).all(schoolId);
  res.json({code:200,data:{recommend,costEffective,pitfall}});
});

router.get('/reviews',requireAdmin,(req,res)=>res.json({code:200,data:db.prepare('SELECT r.id,r.caipinxinxiid AS dishId,r.yonghuming AS username,r.rating,r.commentcontent AS content,r.replycontent AS reply,r.addtime FROM discusscaipinxinxi r WHERE r.school_id=? ORDER BY r.addtime DESC LIMIT 500').all(req.user.schoolId)}));

router.get('/reviews/:dishId',(req,res)=>{
  const schoolId=schoolFor(req);
  if(!validSchool(schoolId)) return res.status(400).json({code:400,message:'请选择有效学校'});
  const dish=db.prepare('SELECT 1 FROM caipinxinxi WHERE id=? AND school_id=?').get(req.params.dishId,schoolId);
  if(!dish) return res.status(404).json({code:404,message:'菜品不存在'});
  const reviews=db.prepare(`SELECT id,yonghuming AS username,rating,commentcontent AS content,replycontent AS reply,addtime
    FROM discusscaipinxinxi WHERE caipinxinxiid=? AND school_id=? ORDER BY addtime DESC LIMIT 100`).all(req.params.dishId,schoolId);
  res.json({code:200,data:reviews});
});

router.post('/reviews',requireAuth,(req,res)=>{
  const dishId=Number(req.body?.dishId),content=String(req.body?.content||'').trim(),rating=Number(req.body?.rating||5);
  if(!Number.isSafeInteger(dishId)||!content||content.length>2000||!Number.isInteger(rating)||rating<1||rating>5) return res.status(400).json({code:400,message:'评价内容或评分格式无效'});
  const dish=db.prepare('SELECT id FROM caipinxinxi WHERE id=? AND school_id=?').get(dishId,req.user.schoolId);
  if(!dish) return res.status(404).json({code:404,message:'菜品不存在'});
  const user=db.prepare('SELECT xingming FROM yonghu WHERE id=? AND school_id=?').get(req.user.id,req.user.schoolId);
  const result=db.prepare(`INSERT INTO discusscaipinxinxi(caipinxinxiid,userid,yonghuming,commentcontent,school_id,rating)
    VALUES(?,?,?,?,?,?)`).run(dishId,req.user.id,user.xingming,content,req.user.schoolId,rating);
  db.prepare(`UPDATE caipinxinxi SET pinfen=(SELECT ROUND(AVG(rating),1) FROM discusscaipinxinxi WHERE caipinxinxiid=? AND school_id=?) WHERE id=? AND school_id=?`).run(dishId,req.user.schoolId,dishId,req.user.schoolId);
  res.status(201).json({code:200,message:'评价已发布',data:{id:result.lastInsertRowid}});
});

router.get('/messages',(req,res)=>{
  const schoolId=schoolFor(req);
  if(!validSchool(schoolId)) return res.status(400).json({code:400,message:'请选择有效学校'});
  const messages=db.prepare(`SELECT id,yonghuming,content,replycontent,addtime,category,priority,owner,due_at,workflow,campus,restaurant_id AS restaurantId,window_name AS window FROM messages WHERE school_id=? ORDER BY addtime DESC LIMIT 200`).all(schoolId);
  res.json({code:200,data:messages});
});

router.post('/messages',requireAuth,(req,res)=>{
  const content=String(req.body?.content||'').trim();
  if(!content||content.length>2000) return res.status(400).json({code:400,message:'留言内容长度应为 1 至 2000 字'});
  const restaurant=req.body?.restaurantId?db.prepare('SELECT id,campus FROM restaurants WHERE id=? AND school_id=?').get(Number(req.body.restaurantId),req.user.schoolId):null;
  if(req.body?.restaurantId&&!restaurant)return res.status(400).json({message:'请选择本校食堂'});
  const category=String(req.body?.category||'建议');if(!['投诉','建议','菜品问题','服务问题'].includes(category))return res.status(400).json({message:'反馈类型无效'});
  const user=db.prepare('SELECT xingming FROM yonghu WHERE id=? AND school_id=?').get(req.user.id,req.user.schoolId);
  if(!user) return res.status(401).json({code:401,message:'登录已失效'});
  const result=db.prepare('INSERT INTO messages(userid,yonghuming,content,school_id,category,campus,restaurant_id,window_name) VALUES(?,?,?,?,?,?,?,?)').run(req.user.id,user.xingming,content,req.user.schoolId,category,restaurant?.campus||'',restaurant?.id||null,String(req.body?.window||'').slice(0,80));
  res.status(201).json({code:200,message:'留言已发表',data:{id:result.lastInsertRowid}});
});

router.put('/messages/:id/reply',requireAdmin,(req,res)=>{
  const reply=String(req.body?.replycontent||'').trim();
  if(!reply||reply.length>2000) return res.status(400).json({code:400,message:'回复内容长度应为 1 至 2000 字'});
  const result=db.prepare("UPDATE messages SET replycontent=?,workflow='已闭环' WHERE id=? AND school_id=?").run(reply,req.params.id,req.user.schoolId);
  if(!result.changes) return res.status(404).json({code:404,message:'留言不存在'});
  res.json({code:200,message:'留言回复已提交'});
});

router.put('/messages/:id/workflow',requireAdmin,(req,res)=>{
  const b=req.body||{};if(!['投诉','建议','菜品问题','服务问题'].includes(b.category)||!['普通','紧急','高'].includes(b.priority)||!['待处理','处理中','已闭环'].includes(b.workflow)||typeof b.owner!=='string'||b.owner.length>60||typeof b.dueAt!=='string'||(b.dueAt&&!Number.isFinite(new Date(b.dueAt).getTime())))return res.status(400).json({message:'处理字段无效'});
  const r=db.prepare('UPDATE messages SET category=?,priority=?,workflow=?,owner=?,due_at=? WHERE id=? AND school_id=?').run(b.category,b.priority,b.workflow,b.owner,b.dueAt,req.params.id,req.user.schoolId);res.status(r.changes?200:404).json({message:r.changes?'处理信息已保存':'留言不存在'});
});
router.put('/reviews/:id/reply',requireAdmin,(req,res)=>{const text=String(req.body?.reply||'').trim();if(!text||text.length>2000)return res.status(400).json({message:'请填写有效回复'});const r=db.prepare('UPDATE discusscaipinxinxi SET replycontent=? WHERE id=? AND school_id=?').run(text,req.params.id,req.user.schoolId);res.status(r.changes?200:404).json({message:r.changes?'评价已回复':'评价不存在'});});
export default router;
