import express from 'express';
import { db } from '../database.js';

const router = express.Router();

// 用户登录
router.post('/login', (req, res) => {
  try {
    const { zhanghao, mima } = req.body;

    if (!zhanghao || !mima) {
      return res.status(400).json({ code: 400, message: '账号和密码不能为空' });
    }

    const user = db.prepare(`
      SELECT id, zhanghao, xingming, touxiang, lianxifangshi, jine
      FROM yonghu 
      WHERE zhanghao = ? AND mima = ?
    `).get(zhanghao, mima);

    if (!user) {
      return res.status(401).json({ code: 401, message: '账号或密码错误' });
    }

    // 生成token（简单实现）
    const token = Buffer.from(JSON.stringify({ id: user.id, time: Date.now() })).toString('base64');

    res.json({ 
      code: 200, 
      message: '登录成功',
      data: { token, user }
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 用户注册
router.post('/register', (req, res) => {
  try {
    const { zhanghao, mima, xingming, lianxifangshi } = req.body;

    if (!zhanghao || !mima || !xingming) {
      return res.status(400).json({ code: 400, message: '缺少必要参数' });
    }

    // 检查用户是否存在
    const existing = db.prepare('SELECT id FROM yonghu WHERE zhanghao = ?').get(zhanghao);
    if (existing) {
      return res.status(400).json({ code: 400, message: '账号已存在' });
    }

    const result = db.prepare(`
      INSERT INTO yonghu (zhanghao, mima, xingming, lianxifangshi, jine)
      VALUES (?, ?, ?, ?, 10000)
    `).run(zhanghao, mima, xingming, lianxifangshi || '');

    res.json({ 
      code: 200, 
      message: '注册成功',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 获取用户信息
router.get('/:id', (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, zhanghao, xingming, touxiang, xingbie, lianxifangshi, jine
      FROM yonghu 
      WHERE id = ?
    `).get(req.params.id);

    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    res.json({ code: 200, data: user });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 更新用户信息
router.put('/:id', (req, res) => {
  try {
    const { xingming, xingbie, lianxifangshi, touxiang } = req.body;

    db.prepare(`
      UPDATE yonghu 
      SET xingming = COALESCE(?, xingming),
          xingbie = COALESCE(?, xingbie),
          lianxifangshi = COALESCE(?, lianxifangshi),
          touxiang = COALESCE(?, touxiang)
      WHERE id = ?
    `).run(xingming, xingbie, lianxifangshi, touxiang, req.params.id);

    res.json({ code: 200, message: '用户信息更新成功' });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 获取用户地址列表
router.get('/:id/addresses', (req, res) => {
  try {
    const addresses = db.prepare(`
      SELECT id, address, name, phone, isdefault
      FROM address 
      WHERE userid = ?
    `).all(req.params.id);

    res.json({ code: 200, data: addresses });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 添加收货地址
router.post('/:id/addresses', (req, res) => {
  try {
    const { address, name, phone, isdefault } = req.body;

    if (!address || !name || !phone) {
      return res.status(400).json({ code: 400, message: '缺少必要参数' });
    }

    const result = db.prepare(`
      INSERT INTO address (userid, address, name, phone, isdefault)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.params.id, address, name, phone, isdefault || '否');

    res.json({ 
      code: 200, 
      message: '地址添加成功',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

export default router;
