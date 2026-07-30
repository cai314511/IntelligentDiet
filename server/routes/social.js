import express from 'express';
import { db } from '../database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// 获取排行榜
router.get('/rankings', (req, res) => {
  try {
    const rankings = {
      recommend: [
        { rank: 1, dishName: "黑椒牛柳", rating: 4.9, sales: 520, reason: "高分热卖，口感一绝" },
        { rank: 2, dishName: "宫保鸡丁", rating: 4.8, sales: 480, reason: "配方古法，香辣可口" },
        { rank: 3, dishName: "番茄鸡蛋面", rating: 4.7, sales: 450, reason: "营养丰富，简单快手" }
      ],
      pitfall: [
        { rank: 1, dishName: "某炸物", rating: 2.1, reason: "油太多，容易腻" },
        { rank: 2, dishName: "某硬菜", rating: 2.5, reason: "口味太重，易上火" }
      ],
      costEffective: [
        { rank: 1, dishName: "白菜豆腐汤", price: 5, rating: 4.6, reason: "价廉物美，健康清汤" },
        { rank: 2, dishName: "清炒时蔬", price: 6, rating: 4.5, reason: "便宜营养，学生首选" }
      ],
      newArrivals: [
        { dishName: "酸梅黑鸡汤", addDate: "2024-03-28", description: "新品上线" },
        { dishName: "清蒸鱼", addDate: "2024-03-27", description: "健康食谱推荐" }
      ]
    };

    res.json({ code: 200, data: rankings });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 获取用户评论
router.get('/reviews/:dishId', (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT yonghuming, commentcontent, addtime
      FROM discusscaipinxinxi 
      WHERE caipinxinxiid = ?
      ORDER BY addtime DESC
      LIMIT 10
    `).all(req.params.dishId);

    res.json({ code: 200, data: reviews });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 发布评论
router.post('/reviews', requireAuth, (req, res) => {
  try {
    const { dishId, userId, username, comment } = req.body;

    if (!dishId || !username || !comment) {
      return res.status(400).json({ code: 400, message: '缺少必要参数' });
    }

    db.prepare(`
      INSERT INTO discusscaipinxinxi (caipinxinxiid, userid, yonghuming, commentcontent)
      VALUES (?, ?, ?, ?)
    `).run(dishId, userId || 0, username, comment);

    res.json({ code: 200, message: '评论发表成功' });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 获取留言
router.get('/messages', (req, res) => {
  try {
    const messages = db.prepare(`
      SELECT id, yonghuming, content, replycontent, addtime
      FROM messages 
      ORDER BY addtime DESC
      LIMIT 20
    `).all();

    res.json({ code: 200, data: messages });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 发布留言
router.post('/messages', requireAuth, (req, res) => {
  try {
    const { userId, username, content } = req.body;

    if (!username || !content) {
      return res.status(400).json({ code: 400, message: '缺少必要参数' });
    }

    db.prepare(`
      INSERT INTO messages (userid, yonghuming, content)
      VALUES (?, ?, ?)
    `).run(userId || 0, username, content);

    res.json({ code: 200, message: '留言发表成功' });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 回复留言（管理员）
router.put('/messages/:id/reply', requireAdmin, (req, res) => {
  try {
    const { replycontent } = req.body;

    if (!replycontent) {
      return res.status(400).json({ code: 400, message: '回复内容不能为空' });
    }

    db.prepare(`
      UPDATE messages 
      SET replycontent = ?
      WHERE id = ?
    `).run(replycontent, req.params.id);

    res.json({ code: 200, message: '留言回复成功' });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

export default router;
