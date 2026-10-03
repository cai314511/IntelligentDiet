import express from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { db } from '../database.js';
import { config } from '../config.js';

const router=express.Router();

router.get('/dashboard',requireAdmin,(req,res)=>{
  try {
    const schoolId=req.user.schoolId;
    const totalUsers=db.prepare("SELECT COUNT(*) AS c FROM yonghu WHERE role='user' AND school_id=?").get(schoolId).c;
    const totalOrders=db.prepare('SELECT COUNT(DISTINCT orderid) AS c FROM orders WHERE school_id=?').get(schoolId).c;
    const paidStatus="('已支付','制作中','待取餐','已完成')";
    const revenue=db.prepare(`SELECT COALESCE(SUM(total),0) AS amount FROM orders WHERE school_id=? AND status IN ${paidStatus}`).get(schoolId).amount;
    const today=db.prepare(`SELECT COUNT(DISTINCT orderid) AS c,COALESCE(SUM(total),0) AS amount FROM orders
      WHERE school_id=? AND status IN ${paidStatus} AND date(addtime,'+8 hours')=date('now','+8 hours')`).get(schoolId);
    const totalDishes=db.prepare('SELECT COUNT(*) AS c FROM caipinxinxi WHERE school_id=?').get(schoolId).c;
    const onSaleDishes=db.prepare("SELECT COUNT(*) AS c FROM caipinxinxi WHERE school_id=? AND shangjia='是'").get(schoolId).c;
    const lowStockCount=db.prepare("SELECT COUNT(*) AS c FROM caipinxinxi WHERE school_id=? AND shangjia='是' AND kucun<?").get(schoolId,config.lowStockThreshold).c;
    const paidOrderSummary=db.prepare(`SELECT COUNT(*) AS count,COALESCE(AVG(order_total),0) AS average FROM
      (SELECT orderid,SUM(total) AS order_total FROM orders WHERE school_id=? AND status IN ${paidStatus} GROUP BY orderid)`).get(schoolId);
    const ratings=db.prepare(`SELECT COALESCE(ROUND(AVG(rating),1),0) AS average,COUNT(*) AS count FROM discusscaipinxinxi WHERE school_id=?`).get(schoolId);
    const pendingAccept=db.prepare("SELECT COUNT(DISTINCT orderid) AS c FROM orders WHERE school_id=? AND status='已支付'").get(schoolId).c;
    const pendingPickup=db.prepare("SELECT COUNT(DISTINCT orderid) AS c FROM orders WHERE school_id=? AND status='待取餐'").get(schoolId).c;
    const unrepliedMessages=db.prepare('SELECT COUNT(*) AS c FROM messages WHERE school_id=? AND replycontent IS NULL').get(schoolId).c;
    res.json({code:200,data:{totalUsers,totalOrders,totalRevenue:revenue,todayOrders:today.c,todayRevenue:today.amount,
      avgOrderValue:Math.round(paidOrderSummary.average*100)/100,paidOrderCount:paidOrderSummary.count,averageRating:ratings.average,ratingCount:ratings.count,
      onSaleDishes,totalDishes,lowStockCount,lowStockThreshold:config.lowStockThreshold,pendingAccept,pendingPickup,unrepliedMessages}});
  } catch {
    res.status(500).json({code:500,message:'运营数据暂时无法读取'});
  }
});

export default router;
