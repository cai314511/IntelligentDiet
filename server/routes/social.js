import express from 'express';
import { db } from '../database.js';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth.js';

import {initSocialSquare,seedSquareExamples,rankings} from '../services/socialSquare.js';
const router = express.Router();
initSocialSquare();
const schoolFor = req => req.user?.schoolId || String(req.query.schoolId || 'cufe');
const validSchool = id => Boolean(db.prepare('SELECT 1 FROM universities WHERE id=?').get(id));

db.exec(`CREATE TABLE IF NOT EXISTS review_likes(review_id INTEGER NOT NULL REFERENCES discusscaipinxinxi(id),user_id INTEGER NOT NULL REFERENCES yonghu(id),PRIMARY KEY(review_id,user_id));
CREATE TABLE IF NOT EXISTS review_comments(id INTEGER PRIMARY KEY AUTOINCREMENT,review_id INTEGER NOT NULL REFERENCES discusscaipinxinxi(id),user_id INTEGER NOT NULL REFERENCES yonghu(id),content TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP);`);
const reviewFor = req => db.prepare('SELECT id FROM discusscaipinxinxi WHERE id=? AND school_id=?').get(req.params.id,req.user.schoolId);
router.get('/feed',requireAuth,(req,res)=>res.json({code:200,data:db.prepare(`SELECT r.id,r.caipinxinxiid AS dishId,r.yonghuming AS username,r.rating,r.commentcontent AS content,r.replycontent AS reply,r.addtime,d.caipinmingcheng AS dishName,d.tupian AS image,
(SELECT COUNT(*) FROM review_likes WHERE review_id=r.id) AS likes,
(SELECT COUNT(*) FROM review_comments WHERE review_id=r.id) AS comments,
EXISTS(SELECT 1 FROM review_likes WHERE review_id=r.id AND user_id=?) AS liked
FROM discusscaipinxinxi r JOIN caipinxinxi d ON d.id=r.caipinxinxiid WHERE r.school_id=? ORDER BY r.addtime DESC,r.id DESC LIMIT 200`).all(req.user.id,req.user.schoolId)}));
router.post('/reviews/:id/like',requireAuth,(req,res)=>{
 if(!reviewFor(req))return res.status(404).json({message:'评价不存在'});
 if(typeof req.body?.liked!=='boolean')return res.status(400).json({message:'点赞状态无效'});
 if(req.body.liked)db.prepare('INSERT OR IGNORE INTO review_likes VALUES(?,?)').run(req.params.id,req.user.id);
 else db.prepare('DELETE FROM review_likes WHERE review_id=? AND user_id=?').run(req.params.id,req.user.id);
 res.json({code:200});
});
router.get('/reviews/:id/comments',requireAuth,(req,res)=>{
 if(!reviewFor(req))return res.status(404).json({message:'评价不存在'});
 res.json({code:200,data:db.prepare('SELECT c.id,c.content,c.created_at,u.xingming AS username FROM review_comments c JOIN yonghu u ON u.id=c.user_id WHERE c.review_id=? ORDER BY c.id').all(req.params.id)});
});
router.post('/reviews/:id/comments',requireAuth,(req,res)=>{
 if(!reviewFor(req))return res.status(404).json({message:'评价不存在'});
 const content=String(req.body?.content||'').trim();if(!content||content.length>2000)return res.status(400).json({message:'请填写1至2000字评论'});
 db.prepare('INSERT INTO review_comments(review_id,user_id,content) VALUES(?,?,?)').run(req.params.id,req.user.id,content);res.status(201).json({code:200});
});

router.get('/rankings',optionalAuth,(req,res)=>{
 const school=schoolFor(req);if(!validSchool(school))return res.status(400).json({message:'请选择有效学校'});
 res.json({code:200,data:rankings(school,req.user?.id)});
});
router.post('/dishes/:id/vote',requireAuth,(req,res)=>{
 const {kind,active}=req.body||{};
 if(!['favorite','down'].includes(kind)||typeof active!=='boolean')return res.status(400).json({message:'互动参数无效'});
 if(!db.prepare('SELECT 1 FROM caipinxinxi WHERE id=? AND school_id=?').get(req.params.id,req.user.schoolId))return res.status(404).json({message:'请选择本校菜品'});
 if(active)db.prepare('INSERT OR IGNORE INTO square_votes VALUES(?,?,?,?)').run(req.user.schoolId,req.params.id,req.user.id,kind);
 else db.prepare('DELETE FROM square_votes WHERE school_id=? AND dish_id=? AND user_id=? AND kind=?').run(req.user.schoolId,req.params.id,req.user.id,kind);
 res.json({code:200,data:{active,count:db.prepare('SELECT count(*) n FROM square_votes WHERE school_id=? AND dish_id=? AND kind=?').get(req.user.schoolId,req.params.id,kind).n}});
});
router.get('/posts',requireAuth,(req,res)=>{
 seedSquareExamples(req.user.schoolId);
 res.json({code:200,data:db.prepare(`SELECT p.id,p.username,p.content,p.image,p.dish_id AS dishId,p.rating,p.is_demo AS isDemo,p.created_at AS addtime,d.caipinmingcheng AS dishName,(SELECT count(*) FROM square_post_likes WHERE post_id=p.id) AS likes,(SELECT count(*) FROM square_post_comments WHERE post_id=p.id) AS comments,EXISTS(SELECT 1 FROM square_post_likes WHERE post_id=p.id AND user_id=?) AS liked FROM square_posts p LEFT JOIN caipinxinxi d ON d.id=p.dish_id WHERE p.school_id=? ORDER BY p.created_at DESC,p.id DESC LIMIT 100`).all(req.user.id,req.user.schoolId)});
});
router.post('/posts',requireAuth,(req,res)=>{
 const content=String(req.body?.content||'').trim(),image=String(req.body?.image||'');
 if(!content||content.length>2000||image.length>2000000||(image&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image)))return res.status(400).json({message:'请填写1至2000字，图片仅支持PNG、JPEG、WebP且不超过1.5MB'});
 const dishId=Number(req.body?.dishId)||null;
 if(dishId&&!db.prepare('SELECT 1 FROM caipinxinxi WHERE id=? AND school_id=?').get(dishId,req.user.schoolId))return res.status(400).json({message:'请选择本校菜品'});
 const u=db.prepare('SELECT xingming FROM yonghu WHERE id=?').get(req.user.id);
 const result=db.prepare('INSERT INTO square_posts(school_id,user_id,username,content,image,dish_id) VALUES(?,?,?,?,?,?)').run(req.user.schoolId,req.user.id,u.xingming,content,image,dishId);
 res.status(201).json({code:200,data:{id:result.lastInsertRowid}});
});
const postFor=req=>db.prepare('SELECT id FROM square_posts WHERE id=? AND school_id=?').get(req.params.id,req.user.schoolId);
router.post('/posts/:id/like',requireAuth,(req,res)=>{
 if(!postFor(req))return res.status(404).json({message:'分享不存在'});
 if(typeof req.body?.liked!=='boolean')return res.status(400).json({message:'点赞状态无效'});
 if(req.body.liked)db.prepare('INSERT OR IGNORE INTO square_post_likes VALUES(?,?)').run(req.params.id,req.user.id);
 else db.prepare('DELETE FROM square_post_likes WHERE post_id=? AND user_id=?').run(req.params.id,req.user.id);
 res.json({code:200});
});
router.get('/posts/:id/comments',requireAuth,(req,res)=>{
 if(!postFor(req))return res.status(404).json({message:'分享不存在'});
 res.json({code:200,data:db.prepare('SELECT username,content,created_at FROM square_post_comments WHERE post_id=? ORDER BY id').all(req.params.id)});
});
router.post('/posts/:id/comments',requireAuth,(req,res)=>{
 if(!postFor(req))return res.status(404).json({message:'分享不存在'});
 const content=String(req.body?.content||'').trim();if(!content||content.length>2000)return res.status(400).json({message:'请填写1至2000字评论'});
 const u=db.prepare('SELECT xingming FROM yonghu WHERE id=?').get(req.user.id);
 db.prepare('INSERT INTO square_post_comments(post_id,user_id,username,content) VALUES(?,?,?,?)').run(req.params.id,req.user.id,u.xingming,content);
 res.status(201).json({code:200});
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
