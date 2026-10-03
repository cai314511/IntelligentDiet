import express from "express";
import { randomUUID } from "crypto";
import { db } from "../database.js";
import { requireAuth } from "../middleware/auth.js";
import { parse } from "../services/catalog.js";
import { understand, planMeal } from "../services/mealPlanner.js";
import { createOrder } from "../services/createOrder.js";
const router = express.Router();
router.use(requireAuth);
const own = (req) =>
  db
    .prepare(
      "SELECT * FROM agent_tasks WHERE id=? AND user_id=? AND school_id=?",
    )
    .get(req.params.id, req.user.id, req.user.schoolId);
router.get("/", (req, res) =>
  res.json({
    code: 200,
    data: db
      .prepare(
        "SELECT * FROM agent_tasks WHERE user_id=? AND school_id=? ORDER BY created_at DESC,rowid DESC LIMIT 20",
      )
      .all(req.user.id, req.user.schoolId)
      .map((r) => ({ ...r, plan: parse(r.plan_json, {}) })),
  }),
);
router.post("/", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    if (!message || message.length > 2000)
      return res.status(400).json({ message: "请输入 1 至 2000 字的就餐需求" });
    const understood = await understand(
      message,
      Array.isArray(req.body.history) ? req.body.history : [],
    );
    const plan = planMeal(
      req.user,
      { ...understood.constraints, ...req.body?.constraints },
      message,
    );
    plan.mode = understood.mode;
    db.prepare(
      "INSERT INTO agent_tasks(id,user_id,school_id,message,plan_json) VALUES(?,?,?,?,?)",
    ).run(
      plan.id,
      req.user.id,
      req.user.schoolId,
      message,
      JSON.stringify(plan),
    );
    res.status(201).json({ code: 200, data: plan });
  } catch (error) {
    res
      .status(error.status || 502)
      .json({
        message: error.status
          ? error.message
          : "智能服务暂不可用，请重试或直接点餐",
      });
  }
});
router.put("/:id", (req, res) => {
  try {
    const task = own(req);
    if (!task) return res.status(404).json({ message: "任务不存在" });
    if (task.status !== "draft")
      return res.status(409).json({ message: "此任务已执行或取消" });
    const old = parse(task.plan_json, {}),
      plan = planMeal(
        req.user,
        { ...old.constraints, ...req.body },
        task.message,
      );
    plan.id = task.id;
    plan.mode = old.mode;
    db.prepare(
      "UPDATE agent_tasks SET plan_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    ).run(JSON.stringify(plan), task.id);
    res.json({ code: 200, data: plan });
  } catch (e) {
    res.status(e.status || 500).json({ message: e.message });
  }
});
router.post("/:id/confirm", (req, res) => {
  try {
    const result = db.transaction(() => {
      const task = own(req);
      if (!task) throw Object.assign(new Error("任务不存在"), { status: 404 });
      if (task.status === "confirmed")
        return {
          orderid: task.order_id,
          reservationIds: parse(task.reservation_ids_json),
          replayed: true,
        };
      if (task.status !== "draft")
        throw Object.assign(new Error("任务已取消"), { status: 409 });
      const old = parse(task.plan_json, {});
      if (Number(req.body?.expectedTotal) !== old.total)
        throw Object.assign(new Error("请确认方案费用"), { status: 409 });
      const plan = planMeal(
        req.user,
        {
          ...old.constraints,
          dishId: old.items[0].id,
          startsAt: old.startsAt,
          seatIds: old.seats.map((s) => s.id),
        },
        task.message,
      );
      if (plan.total !== old.total)
        throw Object.assign(new Error("菜品价格已更新，请重新生成方案"), {
          status: 409,
        });
      const reservationIds = [];
      for (const seat of plan.seats) {
        const id = `SEAT-${randomUUID()}`;
        db.prepare(
          "INSERT INTO seat_reservations(reservation_id,user_id,restaurant_id,seat_id,starts_at,ends_at) VALUES(?,?,?,?,?,?)",
        ).run(
          id,
          req.user.id,
          plan.restaurant.id,
          seat.id,
          plan.startsAt,
          plan.endsAt,
        );
        reservationIds.push(id);
      }
      const order = createOrder(req.user, {
        items: plan.items.map((d) => ({ dishId: d.id, quantity: d.quantity })),
        remark: "就餐方案确认",
      });
      db.prepare(
        "UPDATE agent_tasks SET status='confirmed',order_id=?,reservation_ids_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      ).run(order.orderid, JSON.stringify(reservationIds), task.id);
      return { ...order, reservationIds };
    })();
    res.json({ code: 200, data: result });
  } catch (e) {
    res
      .status(e.status || 409)
      .json({
        message: e.status ? e.message : "座位或订单状态发生变化，请刷新方案",
      });
  }
});
router.post("/:id/cancel", (req, res) => {
  const r = db
    .prepare(
      "UPDATE agent_tasks SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=? AND school_id=? AND status='draft'",
    )
    .run(req.params.id, req.user.id, req.user.schoolId);
  res
    .status(r.changes ? 200 : 409)
    .json({ message: r.changes ? "任务已取消" : "任务不存在或已执行" });
});
export default router;
