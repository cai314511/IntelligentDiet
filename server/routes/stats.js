import express from 'express';
import { db } from '../database.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// 数据大屏聚合统计（管理员）。今日按北京时间（UTC+8）边界计算。
router.get('/dashboard', requireAdmin, (req, res) => {
  try {
    const PAID_STATUS = "('已支付','制作中','待取餐','已完成')";

    const totalUsers = db.prepare("SELECT COUNT(*) AS c FROM yonghu WHERE role = 'user'").get().c;
    const totalOrders = db.prepare('SELECT COUNT(DISTINCT orderid) AS c FROM orders').get().c;
    const revenue = db.prepare(`
      SELECT COALESCE(SUM(total), 0) AS s FROM orders WHERE status IN ${PAID_STATUS}
    `).get().s;
    const today = db.prepare(`
      SELECT COUNT(DISTINCT orderid) AS c, COALESCE(SUM(total), 0) AS s
      FROM orders
      WHERE status IN ${PAID_STATUS}
        AND date(addtime, '+8 hours') = date('now', '+8 hours')
    `).get();
    const totalDishes = db.prepare('SELECT COUNT(*) AS c FROM caipinxinxi').get().c;
    const onSaleDishes = db.prepare("SELECT COUNT(*) AS c FROM caipinxinxi WHERE shangjia = '是'").get().c;
    const lowStockCount = db.prepare('SELECT COUNT(*) AS c FROM caipinxinxi WHERE kucun < 20').get().c;
    const pendingAccept = db.prepare("SELECT COUNT(DISTINCT orderid) AS c FROM orders WHERE status = '已支付'").get().c;
    const pendingPickup = db.prepare("SELECT COUNT(DISTINCT orderid) AS c FROM orders WHERE status = '待取餐'").get().c;
    const unrepliedMessages = db.prepare('SELECT COUNT(*) AS c FROM messages WHERE replycontent IS NULL').get().c;

    res.json({
      code: 200,
      data: {
        totalUsers,
        totalOrders,
        totalRevenue: revenue,
        todayOrders: today.c,
        todayRevenue: today.s,
        avgOrderValue: totalOrders > 0 ? Math.round((revenue / totalOrders) * 100) / 100 : 0,
        onSaleDishes,
        totalDishes,
        lowStockCount,
        pendingAccept,
        pendingPickup,
        unrepliedMessages
      }
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

export default router;
