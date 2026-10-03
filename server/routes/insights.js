import express from "express";
import { db } from "../database.js";
import { requireAdmin } from "../middleware/auth.js";
import { catalog, parse } from "../services/catalog.js";
const router = express.Router();
router.use(requireAdmin);
const paid = new Set(["已支付", "制作中", "待取餐", "已完成"]);
function context(req) {
  const now = new Date().toLocaleDateString("sv-SE", {
      timeZone: "Asia/Shanghai",
    }),
    from = String(req.query.from || now),
    to = String(req.query.to || now),
    a = new Date(from),
    b = new Date(to);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
    !Number.isFinite(a.getTime()) ||
    !Number.isFinite(b.getTime()) ||
    b < a ||
    b - a > 90 * 86400000
  )
    throw Object.assign(new Error("请选择 90 天内的有效日期范围"), {
      status: 400,
    });
  return {
    schoolId: req.user.schoolId,
    from,
    to,
    campus: String(req.query.campus || ""),
    restaurantId: Number(req.query.restaurantId) || 0,
    window: String(req.query.window || ""),
  };
}
function filtered(c) {
  const data = catalog(c.schoolId);
  const restaurants = data.restaurants.filter(
    (r) =>
      (!c.campus || r.campus === c.campus) &&
      (!c.restaurantId || r.id === c.restaurantId),
  );
  const ids = new Set(restaurants.map((r) => r.id));
  const dishes = data.dishes.filter(
    (d) => ids.has(d.restaurantId) && (!c.window || d.window === c.window),
  );
  return { dishes, restaurants };
}
function lines(c) {
  const ids = new Set(filtered(c).dishes.map((d) => d.id));
  return db
    .prepare(
      "SELECT o.*,date(o.addtime,'+8 hours') AS day,strftime('%H',o.addtime,'+8 hours') AS hour FROM orders o WHERE o.school_id=? AND date(o.addtime,'+8 hours') BETWEEN ? AND ?",
    )
    .all(c.schoolId, c.from, c.to)
    .filter((o) => ids.has(o.caipinxinxiid));
}
function summary(rows) {
  const p = rows.filter((o) => paid.has(o.status));
  return {
    orders: new Set(p.map((o) => o.orderid)).size,
    revenue: p.reduce((s, o) => s + Number(o.total), 0),
    completed: new Set(
      p.filter((o) => o.status === "已完成").map((o) => o.orderid),
    ).size,
  };
}
router.get("/dashboard", (req, res) => {
  try {
    const c = context(req),
      data = filtered(c),
      rows = lines(c),
      current = summary(rows),
      span = (new Date(c.to) - new Date(c.from)) / 86400000 + 1;
    const previousTo = new Date(new Date(c.from).getTime() - 86400000)
        .toISOString()
        .slice(0, 10),
      previousFrom = new Date(new Date(c.from).getTime() - span * 86400000)
        .toISOString()
        .slice(0, 10),
      previous = summary(lines({ ...c, from: previousFrom, to: previousTo }));
    const series = [];
    const period = req.query.period || "hour";
    if (period === "hour") {
      for (let h = 6; h <= 22; h++) {
        const p = summary(rows.filter((o) => Number(o.hour) === h));
        series.push({ label: `${h}时`, ...p });
      }
    } else
      for (
        let t = new Date(c.from);
        t <= new Date(c.to);
        t.setUTCDate(t.getUTCDate() + 1)
      ) {
        const day = t.toISOString().slice(0, 10),
          label =
            period === "week"
              ? `第${Math.floor((new Date(day) - new Date(c.from)) / 604800000) + 1}周`
              : day.slice(5);
        const existing = series.find((x) => x.label === label);
        const p = summary(rows.filter((o) => o.day === day));
        if (existing) {
          existing.orders += p.orders;
          existing.revenue += p.revenue;
        } else series.push({ label, ...p });
      }
    const feedback = db
      .prepare(
        "SELECT id,category,priority,workflow,content,addtime,campus,restaurant_id,window_name FROM messages WHERE school_id=? ORDER BY addtime DESC LIMIT 200",
      )
      .all(c.schoolId)
      .filter((r) => {
        const day = new Date(
          r.addtime.replace(" ", "T") + "Z",
        ).toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
        return (
          day >= c.from &&
          day <= c.to &&
          (!c.campus || r.campus === c.campus) &&
          (!c.restaurantId || r.restaurant_id === c.restaurantId) &&
          (!c.window || r.window_name === c.window)
        );
      });
    const categories = Object.entries(
      feedback.reduce(
        (a, r) => ({ ...a, [r.category]: (a[r.category] || 0) + 1 }),
        {},
      ),
    ).map(([name, count]) => ({ name, count }));
    const peers = catalog(c.schoolId)
      .restaurants.filter((r) => !c.campus || r.campus === c.campus)
      .map((r) => ({
        id: r.id,
        name: r.name,
        campus: r.campus,
        ...summary(
          lines({ ...c, campus: r.campus, restaurantId: r.id, window: "" }),
        ),
      }));
    const targetRows = db
      .prepare(
        "SELECT payload_json FROM operations_records WHERE school_id=? AND type='canteen' ORDER BY updated_at DESC,id DESC",
      )
      .all(c.schoolId)
      .map((r) => parse(r.payload_json, {}));
    const targets =
      targetRows.find(
        (r) =>
          r.kind === "dashboardTargets" &&
          r.from === c.from &&
          r.to === c.to &&
          (r.campus || "") === c.campus &&
          Number(r.restaurantId || 0) === c.restaurantId &&
          (r.window || "") === c.window,
      ) || null;
    const seats = data.restaurants.reduce((s, r) => s + r.totalSeats, 0);
    res.json({
      code: 200,
      data: {
        context: c,
        current,
        previous,
        series,
        peers,
        targets,
        turnover: seats ? Number((current.completed / seats).toFixed(2)) : null,
        averageQueue: data.restaurants.length
          ? Number(
              (
                data.restaurants.reduce((s, r) => s + r.queueMinutes, 0) /
                data.restaurants.length
              ).toFixed(1),
            )
          : null,
        lowStock: data.dishes.filter((d) => d.forSale && d.stock < 20),
        pendingOrders: new Set(
          rows.filter((o) => o.status === "已支付").map((o) => o.orderid),
        ).size,
        pendingFeedback: feedback.filter((f) => f.workflow !== "已闭环").length,
        feedbackCategories: categories,
        restaurants: data.restaurants,
        sourceName: "订单流水、运营台账与服务反馈",
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    res.status(e.status || 500).json({ message: e.message });
  }
});
router.get("/forecast", (req, res) => {
  try {
    const c = context(req),
      data = filtered(c),
      history = lines(c).filter((o) => paid.has(o.status)),
      days = (new Date(c.to) - new Date(c.from)) / 86400000 + 1,
      inventory = db
        .prepare(
          "SELECT payload_json FROM operations_records WHERE school_id=? AND type='inventory'",
        )
        .all(c.schoolId)
        .map((r) => parse(r.payload_json, {}));
    const horizon = Math.max(1, Math.min(7, Number(req.query.horizon) || 1));
    const items = data.dishes
      .filter((d) => d.forSale)
      .map((d) => {
        const sold = history.filter((o) => o.caipinxinxiid === d.id),
          total = sold.reduce((s, o) => s + o.buyshu, 0),
          demand = history.length ? Math.ceil((total / days) * horizon) : null,
          record = inventory.find((i) => Number(i.dishId) === d.id) || {},
          unitCost = Number(record.unitCost) || 0,
          prepared = Number(record.prepared) || 0,
          waste = demand === null ? null : Math.max(0, prepared - demand),
          gap = demand === null ? null : Math.max(0, demand - d.stock);
        return {
          id: d.id,
          name: d.name,
          campus: d.campus,
          restaurant: d.restaurant,
          window: d.window,
          price: d.price,
          stock: d.stock,
          demand,
          historySold: total,
          prepare: demand,
          purchase: gap,
          unitCost,
          waste,
          savings:
            waste === null || !unitCost
              ? null
              : Math.round(waste * unitCost * 100) / 100,
        };
      });
    const hourly = Array.from({ length: 17 }, (_, i) => {
      const hour = i + 6,
        count = history
          .filter((o) => Number(o.hour) === hour)
          .reduce((s, o) => s + o.buyshu, 0);
      return {
        label: `${hour}时`,
        demand: history.length ? Math.ceil(count / days) : null,
        visits: history.length
          ? Number(
              (
                new Set(
                  history
                    .filter((o) => Number(o.hour) === hour)
                    .map((o) => o.orderid),
                ).size / days
              ).toFixed(1),
            )
          : null,
      };
    });
    let mae = null,
      accuracy = null;
    const byday = {};
    history.forEach((o) => (byday[o.day] = (byday[o.day] || 0) + o.buyshu));
    if (days >= 14 && history.length) {
      const testStart = new Date(new Date(c.to).getTime() - 6 * 86400000)
          .toISOString()
          .slice(0, 10),
        training = Object.entries(byday).filter(([day]) => day < testStart),
        mean = training.reduce((s, [, n]) => s + n, 0) / (days - 7);
      let error = 0,
        actual = 0;
      for (let i = 0; i < 7; i++) {
        const day = new Date(new Date(testStart).getTime() + i * 86400000)
          .toISOString()
          .slice(0, 10);
        error += Math.abs((byday[day] || 0) - mean);
        actual += byday[day] || 0;
      }
      mae = Number((error / 7).toFixed(1));
      accuracy = actual
        ? Number((Math.max(0, 1 - error / actual) * 100).toFixed(1))
        : null;
    }
    res.json({
      code: 200,
      data: {
        context: c,
        items,
        hourly,
        horizon,
        historyOrders: new Set(history.map((o) => o.orderid)).size,
        trainingDays: days,
        mae,
        accuracy,
        method:
          "按所选历史区间的日均已支付销量预测；MAE 用末 7 天留出评估，准确度为 1 减总绝对误差 / 实际销量（下限 0）",
        savings: items.some((i) => i.savings !== null)
          ? items.reduce((s, i) => s + (i.savings || 0), 0)
          : null,
        expectedWaste: items.some((i) => i.waste !== null)
          ? items.reduce((s, i) => s + (i.waste || 0), 0)
          : null,
        sourceName: "订单历史与人工维护的库存成本台账",
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    res.status(e.status || 500).json({ message: e.message });
  }
});
export default router;
