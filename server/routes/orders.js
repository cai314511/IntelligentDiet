import express from 'express';
import { db } from '../database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { ORDER_STATUS, canTransition } from '../utils/orderState.js';

const router = express.Router();

// 获取所有订单列表
router.get('/', requireAdmin, (req, res) => {
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

// 创建订单（事务 + 库存校验）
router.post('/', requireAuth, (req, res) => {
  try {
    const { items, address, phone, remark } = req.body;
    const userid = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({ code: 400, message: '缺少必要参数' });
    }

    // 前置校验：菜品存在性与库存（在事务外快速失败）
    const getDish = db.prepare('SELECT id, caipinmingcheng, jiage, kucun, tupian FROM caipinxinxi WHERE id = ?');
    const checked = [];
    for (const item of items) {
      const dish = getDish.get(item.dishId);
      if (!dish) {
        return res.status(404).json({ code: 404, message: `菜品 ${item.dishId} 不存在` });
      }
      if (!item.quantity || item.quantity < 1) {
        return res.status(400).json({ code: 400, message: '购买数量非法' });
      }
      if (dish.kucun < item.quantity) {
        return res.status(409).json({ code: 409, message: `「${dish.caipinmingcheng}」库存不足（剩 ${dish.kucun} 份）` });
      }
      checked.push({ dish, quantity: item.quantity });
    }

    const orderid = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let totalPrice = 0;

    const createOrder = db.transaction(() => {
      const insert = db.prepare(`
        INSERT INTO orders 
        (orderid, userid, caipinxinxiid, caipinmingcheng, tupian, buyshu, price, total, address, phone, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const { dish, quantity } of checked) {
        const itemTotal = dish.jiage * quantity;
        totalPrice += itemTotal;
        insert.run(orderid, userid, dish.id, dish.caipinmingcheng, dish.tupian,
          quantity, dish.jiage, itemTotal, address || '学校食堂', phone || '', remark || '');
      }
      // 清空购物车
      db.prepare('DELETE FROM cart WHERE userid = ?').run(userid);
    });
    createOrder();

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
router.get('/user/:userid', requireAuth, (req, res) => {
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
router.get('/:orderid', requireAuth, (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT id, orderid, caipinmingcheng, tupian, buyshu, price, total, status, address, phone, addtime
      FROM orders 
      WHERE orderid = ?
    `).all(req.params.orderid);

    if (orders.length === 0) {
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    res.json({ code: 200, data: orders });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 更新订单状态（管理员，状态机校验）
router.put('/:orderid/status', requireAdmin, (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !ORDER_STATUS.includes(status)) {
      return res.status(400).json({ code: 400, message: '非法的订单状态' });
    }

    const rows = db.prepare('SELECT DISTINCT status FROM orders WHERE orderid = ?').all(req.params.orderid);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    const current = rows[0].status;
    if (!canTransition(current, status)) {
      return res.status(409).json({ code: 409, message: `订单不能从「${current}」变更为「${status}」` });
    }

    db.prepare('UPDATE orders SET status = ? WHERE orderid = ?').run(status, req.params.orderid);

    res.json({ code: 200, message: '订单状态更新成功', data: { orderid: req.params.orderid, status } });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

export default router;
