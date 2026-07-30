import express from 'express';
import { db } from '../database.js';

const router = express.Router();

// 获取所有订单列表
router.get('/', (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT id, orderid, userid, caipinmingcheng, tupian, buyshu, price, total, status, address, phone, remark, addtime
      FROM orders 
      ORDER BY addtime DESC
    `).all();

    res.json({ code: 200, data: orders });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 创建订单
router.post('/', (req, res) => {
  try {
    const { userid, items, address, phone, remark } = req.body;

    if (!userid || !items || items.length === 0) {
      return res.status(400).json({ code: 400, message: '缺少必要参数' });
    }

    // 生成订单号
    const orderid = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let totalPrice = 0;

    // 插入订单项
    for (const item of items) {
      const dish = db.prepare('SELECT jiage FROM caipinxinxi WHERE id = ?').get(item.dishId);
      const itemTotal = (dish?.jiage || 0) * item.quantity;
      totalPrice += itemTotal;

      db.prepare(`
        INSERT INTO orders 
        (orderid, userid, caipinxinxiid, caipinmingcheng, tupian, buyshu, price, total, address, phone, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderid,
        userid,
        item.dishId,
        item.dishName,
        item.image,
        item.quantity,
        dish?.jiage || 0,
        itemTotal,
        address,
        phone,
        remark || ''
      );
    }

    // 清空购物车
    db.prepare('DELETE FROM cart WHERE userid = ?').run(userid);

    res.json({ 
      code: 200, 
      message: '订单创建成功',
      data: { orderid, totalPrice }
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 获取用户订单列表
router.get('/user/:userid', (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT id, orderid, caipinmingcheng, tupian, buyshu, total, status, addtime
      FROM orders 
      WHERE userid = ?
      ORDER BY addtime DESC
    `).all(req.params.userid);

    res.json({ code: 200, data: orders });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 获取订单详情
router.get('/:orderid', (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT id, orderid, caipinmingcheng, tupian, buyshu, price, total, status, address, phone, addtime
      FROM orders 
      WHERE orderid = ?
    `).all(req.params.orderid);

    res.json({ code: 200, data: orders });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 更新订单状态
router.put('/:orderid/status', (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ code: 400, message: '状态不能为空' });
    }

    db.prepare(`
      UPDATE orders 
      SET status = ?
      WHERE orderid = ?
    `).run(status, req.params.orderid);

    res.json({ code: 200, message: '订单状态更新成功' });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

export default router;
