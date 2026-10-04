import express from "express";
import { randomUUID } from "crypto";
import { db } from "../database.js";
import { requireAuth } from "../middleware/auth.js";
import { catalog, parse } from "../services/catalog.js";
import { understand, planMeal } from "../services/mealPlanner.js";
import { conversationPatch } from "../services/mealConversation.js";
import { createOrder } from "../services/createOrder.js";
import { diningTurn } from "../services/diningDialogue.js";
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
router.post("/conversation", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    if (message.length > 2000) return res.status(400).json({ message: "消息最多2000字" });
    const preferences = parse(db.prepare("SELECT profile_json FROM nutrition_profiles WHERE user_id=?").get(req.user.id)?.profile_json, {});
    const turn = await diningTurn({ message, history: Array.isArray(req.body?.history) ? req.body.history : [], conditions: req.body?.conditions || {}, preferences, data: catalog(req.user.schoolId) });
    res.json({ code: 200, data: turn });
  } catch (error) {
    res.status(error.status || 502).json({ message: error.status ? error.message : "小智模型服务暂不可用，请重试。" });
  }
});
router.post("/interpret", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    if (!message || message.length > 2000)
      return res.status(400).json({ message: "请输入就餐需求" });
    const history = Array.isArray(req.body.history)
      ? req.body.history.slice(-8)
      : [];
    const result = await understand(message, history);
    const lastQuestion =
      history.filter((x) => x.role === "assistant").at(-1)?.content || "";
    const requested =
      req.body.requestedField ||
      (lastQuestion.includes("预算")
        ? "budget"
        : lastQuestion.includes("几个人")
          ? "people"
          : lastQuestion.includes("预约座位")
            ? "reserve"
            : "");
    Object.assign(result.constraints, conversationPatch(message, requested));
    const c = result.constraints;
    if (
      c.budget !== undefined &&
      (!Number.isFinite(Number(c.budget)) || c.budget <= 0 || c.budget > 6000)
    )
      return res
        .status(400)
        .json({ message: "预算需大于0元，最高6000元，请重新告诉我预算。" });
    if (
      c.people !== undefined &&
      (!Number.isInteger(Number(c.people)) || c.people < 1 || c.people > 6)
    )
      return res
        .status(400)
        .json({ message: "目前支持1至6人用餐，请重新告诉我人数。" });
    const data = catalog(req.user.schoolId);
    const dish = data.dishes
      .filter(
        (d) =>
          d.forSale &&
          message.includes(d.name) &&
          ![`不吃${d.name}`, `不要${d.name}`].some((term) =>
            message.includes(term),
          ),
      )
      .sort((a, b) => b.name.length - a.name.length)[0];
    const restaurant = data.restaurants.find((r) => message.includes(r.name));
    if (dish)
      Object.assign(result.constraints, {
        dishId: dish.id,
        restaurantId: dish.restaurantId,
      });
    else if (restaurant) result.constraints.restaurantId = restaurant.id;
    if (!dish) {
      const category = [...new Set(data.dishes.map((d) => d.category))]
        .filter((x) => message.includes(x) && !message.includes("不吃" + x))
        .sort((a, b) => b.length - a.length)[0];
      if (category) {
        result.constraints.category = category;
        result.constraints.dishId = null;
        result.constraints.query = null;
      }
    }
    if (
      /换一个|换一道|其他菜|重新推荐|你推荐|你来推荐/.test(message) &&
      !dish
    ) {
      result.constraints.dishId = null;
      result.constraints.query = null;
      if (/不限|随便|哪个食堂都行/.test(message))
        result.constraints.restaurantId = null;
    }
    if (/不辣|不吃辣/.test(message)) result.constraints.exclusions = ["辣"];
    else if (/忌口|不吃|不要.*(?:香菜|花生|牛肉|猪肉|鸡肉)/.test(message)) {
      const ingredients = [
        ...new Set(
          data.dishes.flatMap((d) => [...d.ingredients, ...d.allergens]),
        ),
      ];
      result.constraints.exclusions = ingredients.filter(
        (x) =>
          message.includes("不吃" + x) ||
          message.includes("不要" + x) ||
          message.includes(x + "过敏"),
      );
    } else if (/没有忌口|不用忌口|没有禁忌/.test(message))
      result.constraints.exclusions = [];
    res.json({ code: 200, data: result });
  } catch (error) {
    res.status(502).json({ message: "小智暂时无法理解这条消息，请重试" });
  }
});
router.post("/", async (req, res) => {
  const streaming = req.body?.stream === true;
  const event = (type, data) => {
    if (streaming) res.write(JSON.stringify({ type, data }) + "\n");
  };
  try {
    const message = String(req.body?.message || "").trim();
    if (!message || message.length > 2000)
      return res.status(400).json({ message: "请输入 1 至 2000 字的就餐需求" });
    if (streaming) {
      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Cache-Control", "no-cache");
      res.flushHeaders();
      event("progress", 0);
    }
    const understood = req.body?.dialogueReady === true
      ? { constraints: {}, mode: "agent" }
      : await understand(message, Array.isArray(req.body.history) ? req.body.history : []);
    event("progress", 1);
    const plan = planMeal(
      req.user,
      { ...understood.constraints, ...req.body?.constraints },
      message,
      (completed) => event("progress", completed),
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
    if (streaming) {
      event("plan", plan);
      res.end();
    } else res.status(201).json({ code: 200, data: plan });
  } catch (error) {
    if (streaming && res.headersSent) {
      event("error", error.status ? error.message : "智能服务暂不可用，请重试");
      res.end();
      return;
    }
    res.status(error.status || 502).json({
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
        remark: req.body?.remark ?? "就餐方案确认",
      });
      db.prepare(
        "UPDATE agent_tasks SET status='confirmed',order_id=?,reservation_ids_json=?,plan_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      ).run(
        order.orderid,
        JSON.stringify(reservationIds),
        JSON.stringify({ ...plan, id: task.id }),
        task.id,
      );
      return { ...order, reservationIds };
    })();
    res.json({ code: 200, data: result });
  } catch (e) {
    res.status(e.status || 409).json({
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
