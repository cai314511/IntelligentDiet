import { db } from '../database.js';
export function initSocialSquare() {
 db.exec(`CREATE TABLE IF NOT EXISTS square_posts(id INTEGER PRIMARY KEY AUTOINCREMENT,school_id TEXT NOT NULL,user_id INTEGER,username TEXT NOT NULL,content TEXT NOT NULL,image TEXT DEFAULT '',dish_id INTEGER,rating INTEGER,is_demo INTEGER DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS square_post_likes(post_id INTEGER NOT NULL REFERENCES square_posts(id),user_id INTEGER NOT NULL,PRIMARY KEY(post_id,user_id));
 CREATE TABLE IF NOT EXISTS square_post_comments(id INTEGER PRIMARY KEY,post_id INTEGER NOT NULL REFERENCES square_posts(id),user_id INTEGER NOT NULL,username TEXT NOT NULL,content TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS square_votes(school_id TEXT NOT NULL,dish_id INTEGER NOT NULL,user_id INTEGER NOT NULL,kind TEXT NOT NULL,PRIMARY KEY(school_id,dish_id,user_id,kind));
 CREATE TABLE IF NOT EXISTS square_weekly(school_id TEXT NOT NULL,week TEXT NOT NULL,board TEXT NOT NULL,dish_id INTEGER NOT NULL,rank INTEGER NOT NULL,rating REAL,reviews INTEGER NOT NULL,PRIMARY KEY(school_id,week,board,dish_id));
 CREATE TABLE IF NOT EXISTS square_weeks(school_id TEXT NOT NULL,week TEXT NOT NULL,PRIMARY KEY(school_id,week));`);
}
export function weekStart(now=new Date()) {
 const local=new Date(now.getTime()+8*3600000);const day=(local.getUTCDay()+6)%7;
 local.setUTCDate(local.getUTCDate()-day);return local.toISOString().slice(0,10);
}
const previousWeek=week=>new Date(new Date(week+'T00:00:00Z').getTime()-7*86400000).toISOString().slice(0,10);
const sayings=['今天的饭搭子是我自己，筷子一拿就开席。','这口下去，早八的怨气都被治愈了。','本来只想吃一口，结果筷子有自己的想法。','食堂寻宝成功！下次记得少打点饭，多留点肚子。','今日校园生存指南：先吃饭，再和作业讲道理。','嘴说差不多了，胃说还能再来一轮。','一份热饭，给赶课的我充满电。','和室友投票决定午饭，最后胃获得一票否决权。','这个份量，足够我和DDL再打一场。','建议慢慢吃，快乐不用赶进度。','今天也认真吃饭，认真做一个干饭人。','饭点的幸福感，不需要复杂的公式。'];
const names=['种菜闪餐小队长','高数使我快乐','深夜碳水星人','早八饭搭子','图书馆常驻选手','今天少一点辣','食堂探险家','正在努力长高','一口饭一口勇气','周末不挂科','锅气收藏家','奶茶先放一边'];
export function seedSquareExamples(school) {
 if(db.prepare('SELECT 1 FROM square_posts WHERE school_id=? AND is_demo=1').get(school)){seedExampleComments(school);return;}
 const dishes=db.prepare("SELECT * FROM caipinxinxi WHERE school_id=? AND shangjia='是' ORDER BY CASE WHEN tupian LIKE '%placeholder%' OR tupian='' THEN 1 ELSE 0 END,id LIMIT 12").all(school);
 const insert=db.prepare('INSERT INTO square_posts(school_id,username,content,image,dish_id,rating,is_demo,created_at) VALUES(?,?,?,?,?,?,1,?)');
 db.transaction(()=>dishes.forEach((d,i)=>insert.run(school,names[i],sayings[i]+' '+d.caipinmingcheng+'已加入今日快乐清单。',i%3===0?d.tupian||'':'',d.id,[5,4,5,3,4,5][i%6],new Date(Date.now()-(i+1)*2*3600000).toISOString())))();
 seedExampleComments(school);
}
export function rankings(school,userId=null,now=new Date()) {
 const week=weekStart(now), previous=previousWeek(week);
 // First read in a new week freezes the last completed week's real reviews.
 if(!db.prepare('SELECT 1 FROM square_weeks WHERE school_id=? AND week=?').get(school,week)) {
  const rows=db.prepare(`SELECT d.id,d.jiage AS price,AVG(r.rating) AS rating,COUNT(r.id) AS reviews FROM caipinxinxi d LEFT JOIN discusscaipinxinxi r ON r.caipinxinxiid=d.id AND r.school_id=d.school_id AND julianday(r.addtime)>=julianday(?) AND julianday(r.addtime)<julianday(?) WHERE d.school_id=? AND d.shangjia='是' GROUP BY d.id`).all(previous+'T00:00:00+08:00',week+'T00:00:00+08:00',school);
  const boards={recommend:rows.filter(r=>r.reviews&&r.rating>=3).sort((a,b)=>b.rating-a.rating||b.reviews-a.reviews||a.id-b.id),pitfall:rows.filter(r=>r.reviews&&r.rating<3).sort((a,b)=>a.rating-b.rating||b.reviews-a.reviews||a.id-b.id),costEffective:rows.filter(r=>r.reviews&&r.rating>=3).sort((a,b)=>b.rating/b.price-a.rating/a.price||a.id-b.id)};
  db.transaction(()=>{for(const [board,items] of Object.entries(boards))for(const [i,r] of items.slice(0,10).entries())db.prepare('INSERT INTO square_weekly VALUES(?,?,?,?,?,?,?)').run(school,week,board,r.id,i+1,r.rating,r.reviews);db.prepare('INSERT INTO square_weeks VALUES(?,?)').run(school,week);})();
 }
 const result={week,period:previous+' — '+new Date(new Date(week).getTime()-86400000).toISOString().slice(0,10),recommend:[],costEffective:[],pitfall:[]};
 for(const board of ['recommend','costEffective','pitfall']) {
  const rows=db.prepare(`SELECT w.rank,w.rating,w.reviews,d.id,d.caipinmingcheng AS name,d.jiage AS price,d.restaurant_name AS restaurant,d.campus,d.floor,d.tupian AS image,d.price_basis AS priceBasis,(SELECT rank FROM square_weekly p WHERE p.school_id=w.school_id AND p.week=? AND p.board=w.board AND p.dish_id=w.dish_id) AS previousRank FROM square_weekly w JOIN caipinxinxi d ON d.id=w.dish_id WHERE w.school_id=? AND w.week=? AND w.board=? ORDER BY w.rank`).all(previous,school,week,board);
  // No fabricated complaints: a clearly labelled preview fills empty boards only.
  if(!rows.length) {
   rows.push(...db.prepare(`SELECT id,caipinmingcheng AS name,jiage AS price,restaurant_name AS restaurant,campus,floor,tupian AS image,price_basis AS priceBasis FROM caipinxinxi WHERE school_id=? AND shangjia='是' ORDER BY ${board==='costEffective'?'jiage ASC,id':board==='pitfall'?'id DESC':'id'} LIMIT 10`).all(school).map((d,i)=>({...d,rank:i+1,rating:null,reviews:0,isDemo:true,previousRank:[2,1,5,3,4,9,6,8,10,7][i]})));
  }
  result[board]=rows.map(r=>{const kind=board==='pitfall'?'down':'favorite';return {...r,change:r.previousRank==null?null:r.previousRank-r.rank,votes:db.prepare('SELECT count(*) n FROM square_votes WHERE school_id=? AND dish_id=? AND kind=?').get(school,r.id,kind).n,voted:Boolean(userId&&db.prepare('SELECT 1 FROM square_votes WHERE school_id=? AND dish_id=? AND kind=? AND user_id=?').get(school,r.id,kind,userId))};});
 }
 return result;
}

function seedExampleComments(school) {
 const replies=['筷子已经准备好了，明天一起冲！','已加入我的饭点路线，谢谢饭搭子。','读完这一条，我的胃比我先下课。','今天也要认真干饭呀！'];
 const rows=db.prepare('SELECT id FROM square_posts WHERE school_id=? AND is_demo=1 ORDER BY id LIMIT 8').all(school);
 for(const [i,p] of rows.entries())if(!db.prepare('SELECT 1 FROM square_post_comments WHERE post_id=? AND user_id=0').get(p.id)) db.prepare('INSERT INTO square_post_comments(post_id,user_id,username,content) VALUES(?,0,?,?)').run(p.id,names[(i+3)%names.length]+'（模拟）',replies[i%replies.length]);
}
