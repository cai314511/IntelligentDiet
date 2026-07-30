import express from 'express';
import { db } from '../database.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// 获取所有菜品
router.get('/', (req, res) => {
  try {
    const category = req.query.category;
    let query = `
      SELECT id, caipinmingcheng, caipinfenlei, tupian, cailiao, 
             guige, jiage, yingyang, yueshuxiao, pinfen, kucun 
      FROM caipinxinxi
    `;
    let params = [];

    if (category) {
      query += ' WHERE caipinfenlei = ?';
      params.push(category);
    }

    const dishes = db.prepare(query).all(...params);
    res.json({ code: 200, data: dishes });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 获取菜品分类
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT DISTINCT caipinfenlei FROM caipinxinxi
    `).all();
    res.json({ code: 200, data: categories });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 获取单个菜品详情
router.get('/:id', (req, res) => {
  try {
    const dish = db.prepare(`
      SELECT id, caipinmingcheng, caipinfenlei, tupian, cailiao, 
             guige, jiage, yingyang, yueshuxiao, pinfen, kucun 
      FROM caipinxinxi 
      WHERE id = ?
    `).get(req.params.id);

    if (!dish) {
      return res.status(404).json({ code: 404, message: '菜品不存在' });
    }

    res.json({ code: 200, data: dish });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 搜索菜品
router.get('/search/:keyword', (req, res) => {
  try {
    const keyword = `%${req.params.keyword}%`;
    const dishes = db.prepare(`
      SELECT id, caipinmingcheng, caipinfenlei, tupian, jiage, pinfen
      FROM caipinxinxi 
      WHERE caipinmingcheng LIKE ? OR cailiao LIKE ?
      ORDER BY yueshuxiao DESC
    `).all(keyword, keyword);

    res.json({ code: 200, data: dishes });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 添加菜品（管理员）
router.post('/', requireAdmin, (req, res) => {
  try {
    const { caipinmingcheng, caipinfenlei, tupian, cailiao, guige, jiage, yingyang } = req.body;

    if (!caipinmingcheng || !caipinfenlei || !jiage) {
      return res.status(400).json({ code: 400, message: '缺少必要参数' });
    }

    const result = db.prepare(`
      INSERT INTO caipinxinxi 
      (caipinmingcheng, caipinfenlei, tupian, cailiao, guige, jiage, yingyang, kucun)
      VALUES (?, ?, ?, ?, ?, ?, ?, 100)
    `).run(caipinmingcheng, caipinfenlei, tupian, cailiao, guige, jiage, yingyang);

    res.json({ 
      code: 200, 
      message: '菜品添加成功',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 修改菜品（管理员）
router.put('/:id', requireAdmin, (req, res) => {
  try {
    const { caipinmingcheng, caipinfenlei, tupian, cailiao, guige, jiage, yingyang, kucun } = req.body;

    db.prepare(`
      UPDATE caipinxinxi 
      SET caipinmingcheng = COALESCE(?, caipinmingcheng),
          caipinfenlei = COALESCE(?, caipinfenlei),
          tupian = COALESCE(?, tupian),
          cailiao = COALESCE(?, cailiao),
          guige = COALESCE(?, guige),
          jiage = COALESCE(?, jiage),
          yingyang = COALESCE(?, yingyang),
          kucun = COALESCE(?, kucun)
      WHERE id = ?
    `).run(caipinmingcheng, caipinfenlei, tupian, cailiao, guige, jiage, yingyang, kucun, req.params.id);

    res.json({ code: 200, message: '菜品修改成功' });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 删除菜品（管理员）
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM caipinxinxi WHERE id = ?').run(req.params.id);
    res.json({ code: 200, message: '菜品删除成功' });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

export default router;
