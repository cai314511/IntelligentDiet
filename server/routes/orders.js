import express from 'express';
import { db } from '../database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { ORDER_STATUS, canTransition, generatePickupCode } from '../utils/orderState.js';

const router = express.Router();

// 获取所有订单列表
router.get('/', requireAdmin, (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT id, orderid, userid, caipinmingcheng, tupian, buyshu, price, total, status, address, phone, remark, pickup_code, addtime
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
      SELECT id, orderid, caipinmingcheng, tupian, buyshu, total, status, pickup_code, addtime
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

// 余额支付（本人，事务：扣库存 + 扣余额 + 取餐码 + 状态流转）
router.post('/:orderid/pay', requireAuth, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, userid, caipinxinxiid, caipinmingcheng, buyshu, total, status
      FROM orders WHERE orderid = ?
    `).all(req.params.orderid);

    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }
    if (rows[0].userid !== req.user.id) {
      return res.status(403).json({ code: 403, message: '无权支付他人订单' });
    }
    if (rows[0].status !== '未支付') {
      return res.status(409).json({ code: 409, message: `订单当前状态为「${rows[0].status}」，无法支付` });
    }

    const totalPrice = rows.reduce((sum, r) => sum + r.total, 0);
    const user = db.prepare('SELECT jine FROM yonghu WHERE id = ?').get(req.user.id);
    if (user.jine < totalPrice) {
      return res.status(409).json({ code: 409, message: `余额不足，当前余额 ¥${user.jine.toFixed(2)}` });
    }

    const pickupCode = generatePickupCode();

    const pay = db.transaction(() => {
      // 扣库存（二次校验，防并发超卖）
      const deduct = db.prepare('UPDATE caipinxinxi SET kucun = kucun - ? WHERE id = ? AND kucun >= ?');
      for (const r of rows) {
        const result = deduct.run(r.buyshu, r.caipinxinxiid, r.buyshu);
        if (result.changes === 0) {
          throw new Error(`「${r.caipinmingcheng}」库存不足`);
        }
      }
      // 扣余额 + 月售统计
      db.prepare('UPDATE yonghu SET jine = jine - ? WHERE id = ?').run(totalPrice, req.user.id);
      const addSales = db.prepare('UPDATE caipinxinxi SET yueshuxiao = yueshuxiao + ? WHERE id = ?');
      for (const r of rows) addSales.run(r.buyshu, r.caipinxinxiid);
      // 状态 + 取餐码
      db.prepare("UPDATE orders SET status = '已支付', pickup_code = ? WHERE orderid = ?")
        .run(pickupCode, req.params.orderid);
    });

    try {
      pay();
    } catch (e) {
      return res.status(409).json({ code: 409, message: e.message });
    }

    const balance = db.prepare('SELECT jine FROM yonghu WHERE id = ?').get(req.user.id).jine;

    res.json({
      code: 200,
      message: '支付成功',
      data: { orderid: req.params.orderid, pickupCode, totalPrice, balance }
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 取餐核销（管理员，取餐码核验）
router.post('/:orderid/pickup', requireAdmin, (req, res) => {
  try {
    const { pickupCode } = req.body;
    if (!pickupCode) {
      return res.status(400).json({ code: 400, message: '请提供取餐码' });
    }

    const row = db.prepare(`
      SELECT DISTINCT status, pickup_code FROM orders WHERE orderid = ?
    `).get(req.params.orderid);

    if (!row) {
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }
    if (row.status !== '待取餐') {
      return res.status(409).json({ code: 409, message: `订单当前状态为「${row.status}」，不能核销` });
    }
    if (row.pickup_code !== pickupCode.trim().toUpperCase()) {
      return res.status(409).json({ code: 409, message: '取餐码不正确' });
    }

    db.prepare("UPDATE orders SET status = '已完成' WHERE orderid = ?").run(req.params.orderid);

    res.json({ code: 200, message: '核销成功，订单已完成', data: { orderid: req.params.orderid, status: '已完成' } });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

export default router;
