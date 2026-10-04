import express from "express";
import { randomUUID } from "crypto";
import { db } from "../database.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import {
  ORDER_STATUS,
  canTransition,
  generatePickupCode,
} from "../utils/orderState.js";

import { createOrder } from "../services/createOrder.js";
const router = express.Router();
const fail = (res, status, message) =>
  res.status(status).json({ code: status, message });
function releaseTaskSeats(order) {
  const dining = db
    .prepare("SELECT * FROM order_dining WHERE order_id=? AND user_id=?")
    .get(order.orderid, order.userid);
  if (dining)
    for (const id of JSON.parse(dining.reservation_ids_json))
      db.prepare(
        "UPDATE seat_reservations SET status='cancelled' WHERE reservation_id=? AND user_id=?",
      ).run(id, order.userid);

  const task = db
    .prepare(
      "SELECT * FROM agent_tasks WHERE order_id=? AND user_id=? AND school_id=?",
    )
    .get(order.orderid, order.userid, order.school_id);
  if (task) {
    for (const id of JSON.parse(task.reservation_ids_json))
      db.prepare(
        "UPDATE seat_reservations SET status='cancelled' WHERE reservation_id=? AND user_id=?",
      ).run(id, order.userid);
    db.prepare(
      "UPDATE agent_tasks SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE id=?",
    ).run(task.id);
  }
}
function diningFor(orderid) {
  const direct = db
    .prepare("SELECT * FROM order_dining WHERE order_id=?")
    .get(orderid);
  const task = db
    .prepare("SELECT plan_json FROM agent_tasks WHERE order_id=?")
    .get(orderid);
  if (task && !direct) {
    const plan = JSON.parse(task.plan_json);
    return {
      startsAt: plan.startsAt,
      restaurant: plan.restaurant.name,
      seats: plan.seats.map((s) => s.label),
    };
  }
  if (!direct) return null;
  const restaurant = db
    .prepare("SELECT name FROM restaurants WHERE id=?")
    .get(direct.restaurant_id);
  const seats = JSON.parse(direct.reservation_ids_json)
    .map(
      (id) =>
        db
          .prepare(
            "SELECT s.seat_label FROM seat_reservations r JOIN restaurant_seats s ON s.id=r.seat_id WHERE r.reservation_id=?",
          )
          .get(id)?.seat_label,
    )
    .filter(Boolean);
  return {
    startsAt: direct.starts_at,
    restaurant: restaurant?.name || "",
    seats,
  };
}
const scopedOrder = (orderid, schoolId) =>
  db
    .prepare(
      "SELECT DISTINCT orderid, userid, school_id, status, pickup_code FROM orders WHERE orderid=? AND school_id=?",
    )
    .get(orderid, schoolId);

router.get("/", requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT o.*,d.campus,d.window_name,r.id AS restaurant_id
    FROM orders o LEFT JOIN caipinxinxi d ON d.id=o.caipinxinxiid AND d.school_id=o.school_id LEFT JOIN restaurants r ON r.school_id=d.school_id AND r.campus=d.campus AND r.name=d.restaurant_name WHERE o.school_id=? ORDER BY o.addtime DESC LIMIT 1000`,
    )
    .all(req.user.schoolId);
  res.json({ code: 200, data: rows });
});

router.post("/", requireAuth, (req, res) => {
  try {
    const result = createOrder(req.user, req.body);
    res.status(201).json({ code: 200, message: "订单创建成功", data: result });
  } catch (error) {
    res.status(error.status || 500).json({
      code: error.status || 500,
      message: error.status ? error.message : "订单暂时无法创建",
    });
  }
});

router.get("/user/:userid", requireAuth, (req, res) => {
  const targetId = Number(req.params.userid);
  if (targetId !== req.user.id && req.user.role !== "admin")
    return fail(res, 403, "无权查看他人订单");
  const rows = db
    .prepare(
      `SELECT id,orderid,caipinxinxiid,caipinmingcheng,tupian,buyshu,price,total,status,pickup_code,addtime
    FROM orders WHERE userid=? AND school_id=? ORDER BY addtime DESC LIMIT 500`,
    )
    .all(targetId, req.user.schoolId);
  res.json({
    code: 200,
    data: rows.map((r) => ({ ...r, dining: diningFor(r.orderid) })),
  });
});

router.get("/:orderid", requireAuth, (req, res) => {
  const order = scopedOrder(req.params.orderid, req.user.schoolId);
  if (!order) return fail(res, 404, "订单不存在");
  if (order.userid !== req.user.id && req.user.role !== "admin")
    return fail(res, 403, "无权查看该订单");
  const rows = db
    .prepare(
      `SELECT id,orderid,caipinxinxiid,caipinmingcheng,tupian,buyshu,price,total,status,address,phone,remark,pickup_code,addtime
    FROM orders WHERE orderid=? AND school_id=? ORDER BY id`,
    )
    .all(req.params.orderid, req.user.schoolId);
  res.json({
    code: 200,
    data: rows,
    dining:
      db
        .prepare("SELECT * FROM order_dining WHERE order_id=?")
        .get(req.params.orderid) || null,
  });
});

router.put("/:orderid/status", requireAdmin, (req, res) => {
  const { status } = req.body || {};
  if (!ORDER_STATUS.includes(status)) return fail(res, 400, "非法的订单状态");
  const order = scopedOrder(req.params.orderid, req.user.schoolId);
  if (!order) return fail(res, 404, "订单不存在");
  if (status === "已支付" || status === "已完成")
    return fail(res, 409, "支付与核销需使用各自业务操作");
  if (!canTransition(order.status, status))
    return fail(res, 409, `订单不能从「${order.status}」变更为「${status}」`);
  try {
    const transition = db.transaction(() => {
      if (status === "已退款") {
        const payment = db
          .prepare(
            "SELECT amount_cents FROM payment_ledger WHERE orderid=? AND user_id=? AND kind='payment'",
          )
          .get(order.orderid, order.userid);
        if (!payment)
          throw Object.assign(new Error("没有可退款的支付流水"), {
            status: 409,
          });
        const lines = db
          .prepare(
            "SELECT caipinxinxiid,buyshu,total,userid FROM orders WHERE orderid=? AND school_id=?",
          )
          .all(order.orderid, req.user.schoolId);
        const refundCents = Math.round(
          lines.reduce((sum, line) => sum + Number(line.total), 0) * 100,
        );
        if (payment.amount_cents !== refundCents)
          throw Object.assign(new Error("支付流水金额与订单不一致"), {
            status: 409,
          });
        db.prepare(
          `INSERT INTO payment_ledger(transaction_id,orderid,user_id,kind,amount_cents) VALUES(?,?,?,'refund',?)`,
        ).run(randomUUID(), order.orderid, order.userid, refundCents);
        db.prepare(
          "UPDATE yonghu SET jine=jine+? WHERE id=? AND school_id=?",
        ).run(refundCents / 100, order.userid, req.user.schoolId);
        const restock = db.prepare(
          "UPDATE caipinxinxi SET kucun=kucun+?,yueshuxiao=MAX(yueshuxiao-?,0) WHERE id=? AND school_id=?",
        );
        for (const line of lines)
          restock.run(
            line.buyshu,
            line.buyshu,
            line.caipinxinxiid,
            req.user.schoolId,
          );
      }
      const update = db.prepare(
        "UPDATE orders SET status=? WHERE orderid=? AND school_id=? AND status=?",
      );
      const changed = update.run(
        status,
        order.orderid,
        req.user.schoolId,
        order.status,
      ).changes;
      if (["已退款", "已取消"].includes(status)) releaseTaskSeats(order);
      if (!changed)
        throw Object.assign(new Error("订单状态已更新，请刷新后重试"), {
          status: 409,
        });
    });
    transition();
    res.json({
      code: 200,
      message: "订单状态更新成功",
      data: { orderid: order.orderid, status },
    });
  } catch (error) {
    res
      .status(error.status || 409)
      .json({ code: error.status || 409, message: error.message });
  }
});

router.post("/:orderid/pay", requireAuth, (req, res) => {
  const order = scopedOrder(req.params.orderid, req.user.schoolId);
  if (!order) return fail(res, 404, "订单不存在");
  if (order.userid !== req.user.id) return fail(res, 403, "无权支付他人订单");
  let pickupCode;
  try {
    const pay = db.transaction(() => {
      const current = scopedOrder(req.params.orderid, req.user.schoolId);
      if (!current || current.status !== "未支付")
        throw Object.assign(new Error("订单当前状态无法支付"), { status: 409 });
      for (let i = 0; i < 100; i++) {
        const code = generatePickupCode();
        if (
          !db
            .prepare(
              "SELECT 1 FROM orders WHERE pickup_code=? AND school_id=? AND status IN ('已支付','制作中','待取餐')",
            )
            .get(code, req.user.schoolId)
        ) {
          pickupCode = code;
          break;
        }
      }
      if (!pickupCode)
        throw Object.assign(new Error("取餐码暂不可生成，请稍后重试"), {
          status: 409,
        });
      const lines = db
        .prepare(
          `SELECT caipinxinxiid,caipinmingcheng,buyshu,total FROM orders WHERE orderid=? AND school_id=?`,
        )
        .all(order.orderid, req.user.schoolId);
      const cents = Math.round(
        lines.reduce((sum, row) => sum + Number(row.total), 0) * 100,
      );
      const debit = db
        .prepare(
          "UPDATE yonghu SET jine=jine-? WHERE id=? AND school_id=? AND jine>=?",
        )
        .run(cents / 100, req.user.id, req.user.schoolId, cents / 100);
      if (!debit.changes)
        throw Object.assign(new Error("账户余额不足"), { status: 409 });
      const deduct = db.prepare(
        "UPDATE caipinxinxi SET kucun=kucun-?,yueshuxiao=yueshuxiao+? WHERE id=? AND school_id=? AND shangjia='是' AND kucun>=?",
      );
      for (const line of lines) {
        const result = deduct.run(
          line.buyshu,
          line.buyshu,
          line.caipinxinxiid,
          req.user.schoolId,
          line.buyshu,
        );
        if (!result.changes)
          throw Object.assign(
            new Error(`「${line.caipinmingcheng}」库存不足`),
            { status: 409 },
          );
      }
      db.prepare(
        `INSERT INTO payment_ledger(transaction_id,orderid,user_id,kind,amount_cents) VALUES(?,?,?,'payment',?)`,
      ).run(randomUUID(), order.orderid, req.user.id, cents);
      db.prepare(
        `UPDATE orders SET status='已支付',pickup_code=? WHERE orderid=? AND school_id=? AND status='未支付'`,
      ).run(pickupCode, order.orderid, req.user.schoolId);
      return cents / 100;
    });
    const totalPrice = pay();
    const balance = db
      .prepare("SELECT jine FROM yonghu WHERE id=? AND school_id=?")
      .get(req.user.id, req.user.schoolId).jine;
    res.json({
      code: 200,
      message: "支付成功",
      data: { orderid: order.orderid, pickupCode, totalPrice, balance },
    });
  } catch (error) {
    res
      .status(error.status || 409)
      .json({ code: error.status || 409, message: error.message });
  }
});

router.post("/:orderid/pickup", requireAdmin, (req, res) => {
  const order = scopedOrder(req.params.orderid, req.user.schoolId);
  const pickupCode = String(req.body?.pickupCode || "")
    .trim()
    .toUpperCase();
  if (!order) return fail(res, 404, "订单不存在");
  if (order.status !== "待取餐")
    return fail(res, 409, `订单当前状态为「${order.status}」，不能核销`);
  if (!pickupCode || order.pickup_code !== pickupCode)
    return fail(res, 409, "取餐码不正确");
  const updated = db
    .prepare(
      `UPDATE orders SET status='已完成' WHERE orderid=? AND school_id=? AND status='待取餐'`,
    )
    .run(order.orderid, req.user.schoolId);
  if (!updated.changes) return fail(res, 409, "订单状态已更新，请刷新后重试");
  res.json({
    code: 200,
    message: "核销成功，订单已完成",
    data: { orderid: order.orderid, status: "已完成" },
  });
});

router.post("/:orderid/cancel", requireAuth, (req, res) => {
  try {
    db.transaction(() => {
      const order = scopedOrder(req.params.orderid, req.user.schoolId);
      if (!order || order.userid !== req.user.id)
        throw Object.assign(new Error("订单不存在"), { status: 404 });
      if (order.status !== "未支付")
        throw Object.assign(new Error("当前订单不可取消"), { status: 409 });
      db.prepare(
        "UPDATE orders SET status='已取消' WHERE orderid=? AND school_id=?",
      ).run(order.orderid, req.user.schoolId);
      releaseTaskSeats(order);
    })();
    res.json({ code: 200, message: "订单已取消" });
  } catch (e) {
    res.status(e.status || 500).json({ message: e.message });
  }
});
export default router;
