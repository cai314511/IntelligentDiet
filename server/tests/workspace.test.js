import { targetFor } from "./support/target.js";
import { test, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
process.env.DB_PATH = ":memory:";
process.env.AI_BASE_URL = "";
process.env.AZURE_OPENAI_API_KEY = "";
process.env.AI_MODEL = "";
const { default: app } = await import("../app.js");
const target = await targetFor(app);
const { db } = await import("../database.js");
const { seedReferenceData } = await import("../seed.js");
const client = Object.fromEntries(
  ["get", "post", "put", "delete"].map((method) => [
    method,
    (url) => request(target)[method](url).timeout({ deadline: 5000 }),
  ]),
);
let admin, user, other, dish;
const auth = (token) => ({ Authorization: `Bearer ${token}` });
before(async () => {
  const a = await client
    .post("/api/users/development-session")
    .send({ schoolId: "cufe" });
  assert.equal(a.status, 200);
  admin = a.body.data.token;
  for (const name of ["workspace_test", "workspace_other"]) {
    await client.post("/api/users/register").send({
      zhanghao: name,
      mima: "testpass123",
      xingming: name,
      schoolId: "cufe",
    });
  }
  user = (
    await client.post("/api/users/login").send({
      zhanghao: "workspace_test",
      mima: "testpass123",
      schoolId: "cufe",
      identity: "student",
    })
  ).body.data.token;
  other = (
    await client.post("/api/users/login").send({
      zhanghao: "workspace_other",
      mima: "testpass123",
      schoolId: "cufe",
      identity: "student",
    })
  ).body.data.token;
  dish = (
    await client.get("/api/workspace/catalog").set(auth(user))
  ).body.data.dishes.find((d) => d.forSale && d.stock > 0 && d.restaurantId);
});
test("登录身份由服务端核验，营养高级权限按角色隔离", async () => {
  assert.equal(
    (
      await client.post("/api/users/login").send({
        zhanghao: "workspace_test",
        mima: "testpass123",
        schoolId: "cufe",
        identity: "admin",
      })
    ).status,
    403,
  );
  assert.equal(
    (await client.get("/api/nutrition/entitlements").set(auth(user))).body.data
      .advanced,
    false,
  );
  assert.equal(
    (await client.get("/api/nutrition/entitlements").set(auth(admin))).body.data
      .advanced,
    true,
  );
  assert.equal(
    (await client.get("/api/nutrition/trend").set(auth(user))).status,
    403,
  );
  assert.equal(
    (
      await client
        .post("/api/nutrition/recognize")
        .set(auth(user))
        .send({ image: "data:image/png;base64,YQ==" })
    ).status,
    403,
  );
});
test("按实际克数计算营养，个人记录不可跨账号读取删除", async () => {
  const r = await client
    .post("/api/nutrition/records")
    .set(auth(user))
    .send({
      dishId: dish.id,
      grams: dish.portionG / 2,
      meal: "午餐",
      eatenAt: new Date(Date.now() - 60000).toISOString(),
    });
  assert.equal(r.status, 201);
  const rows = (await client.get("/api/nutrition/records").set(auth(user))).body
    .data;
  assert.equal(
    rows[0].nutrition.calories,
    Math.round(dish.nutrition.calories * 5) / 10,
  );
  assert.equal(
    (await client.get("/api/nutrition/records").set(auth(other))).body.data
      .length,
    0,
  );
  assert.equal(
    (
      await client
        .delete(`/api/nutrition/records/${r.body.data.id}`)
        .set(auth(other))
    ).status,
    404,
  );
});
test("就餐方案需确认，价格变化回滚，重复确认不重复下单且不自动支付", async () => {
  const r = await client
    .post("/api/tasks")
    .set(auth(user))
    .send({
      message: "安排午餐并占座",
      constraints: { dishId: dish.id, budget: 100, reserve: true },
    });
  assert.equal(r.status, 201);
  const plan = r.body.data;
  assert.equal(db.prepare("SELECT count(*) n FROM orders").get().n, 0);
  db.prepare("UPDATE caipinxinxi SET jiage=jiage+1 WHERE id=?").run(dish.id);
  assert.equal(
    (
      await client
        .post(`/api/tasks/${plan.id}/confirm`)
        .set(auth(user))
        .send({ expectedTotal: plan.total })
    ).status,
    409,
  );
  assert.equal(
    db.prepare("SELECT count(*) n FROM seat_reservations").get().n,
    0,
  );
  db.prepare("UPDATE caipinxinxi SET jiage=? WHERE id=?").run(
    dish.price,
    dish.id,
  );
  const ok = await client
    .post(`/api/tasks/${plan.id}/confirm`)
    .set(auth(user))
    .send({ expectedTotal: plan.total, remark: "少辣，不要香菜" });
  assert.equal(ok.status, 200);
  const listing = await client.get("/api/orders").set(auth(admin));
  const listed = listing.body.data.find(
    (row) => row.orderid === ok.body.data.orderid,
  );
  assert.equal(listed.campus, plan.items[0].campus);
  assert.equal(listed.restaurant_id, plan.restaurant.id);
  assert.equal(listed.window_name, plan.items[0].window);
  assert.equal(listed.remark, "少辣，不要香菜");
  const twice = await client
    .post(`/api/tasks/${plan.id}/confirm`)
    .set(auth(user))
    .send({ expectedTotal: plan.total });
  assert.equal(twice.body.data.orderid, ok.body.data.orderid);
  assert.equal(twice.body.data.replayed, true);
  assert.equal(
    db
      .prepare("SELECT status FROM orders WHERE orderid=?")
      .get(ok.body.data.orderid).status,
    "未支付",
  );
  assert.equal(
    (
      await client
        .put(`/api/orders/${ok.body.data.orderid}/status`)
        .set(auth(admin))
        .send({ status: "已支付" })
    ).status,
    409,
  );
});
test("运营台账支持审计撤销，后续变更阻止过期撤销", async () => {
  const created = await client
    .post("/api/operations")
    .set(auth(admin))
    .send({
      type: "inventory",
      title: "回归库存记录",
      status: "运行中",
      payload: { prepared: 10 },
    });
  assert.equal(created.status, 201);
  const id = created.body.data.id;
  const first = (await client.get("/api/operations/audit").set(auth(admin)))
    .body.data[0];
  await client
    .put(`/api/operations/${id}`)
    .set(auth(admin))
    .send({
      title: "回归库存记录",
      status: "运行中",
      payload: { prepared: 20 },
    });
  assert.equal(
    (
      await client
        .post(`/api/operations/audit/${first.id}/undo`)
        .set(auth(admin))
    ).status,
    409,
  );
  const recent = (await client.get("/api/operations/audit").set(auth(admin)))
    .body.data[0];
  assert.equal(
    (
      await client
        .post(`/api/operations/audit/${recent.id}/undo`)
        .set(auth(admin))
    ).status,
    200,
  );
  assert.equal(
    JSON.parse(
      db
        .prepare("SELECT payload_json FROM operations_records WHERE id=?")
        .get(id).payload_json,
    ).prepared,
    10,
  );
});
test("空销量不生成假预测，日期校验、跨学校筛选受约束", async () => {
  const r = await client.get("/api/insights/forecast").set(auth(admin));
  assert.equal(r.status, 200);
  assert.equal(r.body.data.mae, null);
  assert.equal(r.body.data.accuracy, null);
  assert.ok(r.body.data.items.every((x) => x.demand === null));
  assert.equal(
    (
      await client
        .get("/api/insights/dashboard?from=2026-01-01&to=2026-10-01")
        .set(auth(admin))
    ).status,
    400,
  );
  assert.ok(
    (
      await client.get("/api/workspace/catalog?schoolId=tju").set(auth(user))
    ).body.data.dishes.every((d) => d.schoolId === "cufe"),
  );
});
test("重启初始化保留运营人员改名价格库存和上下架状态", () => {
  db.prepare(
    "UPDATE caipinxinxi SET caipinmingcheng='持久化改名测试',jiage=99,kucun=7,shangjia='否' WHERE id=?",
  ).run(dish.id);
  const count = db.prepare("SELECT count(*) n FROM caipinxinxi").get().n;
  seedReferenceData(db);
  const r = db
    .prepare(
      "SELECT caipinmingcheng,jiage,kucun,shangjia FROM caipinxinxi WHERE id=?",
    )
    .get(dish.id);
  assert.deepEqual(r, {
    caipinmingcheng: "持久化改名测试",
    jiage: 99,
    kucun: 7,
    shangjia: "否",
  });
  assert.equal(db.prepare("SELECT count(*) n FROM caipinxinxi").get().n, count);
});

test("开发入口开关关闭后不可创建会话", async () => {
  process.env.ENABLE_DEV_ENTRY = "false";
  try {
    assert.equal(
      (await client.get("/api/users/development-entry")).body.data.enabled,
      false,
    );
    assert.equal(
      (
        await client
          .post("/api/users/development-session")
          .send({ schoolId: "cufe" })
      ).status,
      404,
    );
  } finally {
    delete process.env.ENABLE_DEV_ENTRY;
  }
});
test("被占用座位阻止方案确认，订单和预约均不产生", async () => {
  const available = (
    await client.get("/api/workspace/catalog").set(auth(user))
  ).body.data.dishes.find((d) => d.forSale && d.restaurantId);
  const r = await client
    .post("/api/tasks")
    .set(auth(user))
    .send({
      message: "20元安排午餐并占座",
      constraints: { dishId: available.id, budget: 100, reserve: true },
    });
  assert.equal(r.status, 201);
  const p = r.body.data;
  const count = db.prepare("SELECT count(*) n FROM orders").get().n;
  const held = await client
    .post(`/api/restaurants/${p.restaurant.id}/reserve-seat`)
    .set(auth(other))
    .send({ seatId: p.seats[0].id, startsAt: p.startsAt, endsAt: p.endsAt });
  assert.equal(held.status, 201);
  assert.equal(
    (
      await client
        .post(`/api/tasks/${p.id}/confirm`)
        .set(auth(user))
        .send({ expectedTotal: p.total })
    ).status,
    409,
  );
  assert.equal(db.prepare("SELECT count(*) n FROM orders").get().n, count);
  assert.equal(
    db
      .prepare("SELECT count(*) n FROM seat_reservations WHERE user_id=?")
      .get(
        db
          .prepare("SELECT id FROM yonghu WHERE zhanghao='workspace_other'")
          .get().id,
      ).n,
    1,
  );
});
test("积分不足兑换回滚商品库存", async () => {
  const item = db
    .prepare(
      "SELECT * FROM cultural_items WHERE school_id='cufe' AND status='published' LIMIT 1",
    )
    .get();
  assert.equal(
    (await client.post(`/api/community/redeem/${item.id}`).set(auth(user)))
      .status,
    409,
  );
  assert.equal(
    db.prepare("SELECT stock FROM cultural_items WHERE id=?").get(item.id)
      .stock,
    item.stock,
  );
});

test("预测留出回测根据实际历史计算准确度并按食堂隔离", async () => {
  const d = (
    await client.get("/api/workspace/catalog").set(auth(admin))
  ).body.data.dishes.find((d) => d.forSale && d.restaurantId);
  const uid = db
    .prepare("SELECT id FROM yonghu WHERE zhanghao='workspace_test'")
    .get().id;
  for (let i = 0; i < 14; i++) {
    const day = new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10);
    db.prepare(
      "INSERT INTO orders(orderid,userid,caipinxinxiid,caipinmingcheng,buyshu,price,total,status,school_id,addtime) VALUES(?,?,?,?,10,?,?,'已完成','cufe',?)",
    ).run(
      `BACKTEST-${i}`,
      uid,
      d.id,
      d.name,
      d.price,
      d.price * 10,
      `${day} 04:00:00`,
    );
  }
  const r = await client
    .get(
      `/api/insights/forecast?from=2026-09-01&to=2026-09-14&restaurantId=${d.restaurantId}`,
    )
    .set(auth(admin));
  assert.equal(r.status, 200);
  assert.equal(r.body.data.mae, 0);
  assert.equal(r.body.data.accuracy, 100);
  assert.equal(r.body.data.items.find((x) => x.id === d.id).demand, 10);
  assert.equal(r.body.data.hourly.find((x) => x.label === "12时").visits, 1);
});

test("运营台账拒绝负成本和跨学校菜品关联", async () => {
  const body = {
    type: "inventory",
    title: "库存校验",
    status: "运行中",
    payload: { unitCost: -1 },
  };
  assert.equal(
    (await client.post("/api/operations").set(auth(admin)).send(body)).status,
    400,
  );
  const foreign = db
    .prepare("SELECT id FROM caipinxinxi WHERE school_id='tju' LIMIT 1")
    .get();
  assert.equal(
    (
      await client
        .post("/api/operations")
        .set(auth(admin))
        .send({ ...body, payload: { dishId: foreign.id, unitCost: 3 } })
    ).status,
    400,
  );
});

test("多轮对话只解析需求，不创建任务订单，后续回答补全人数与座位", async () => {
  dish = (
    await client.get("/api/workspace/catalog").set(auth(user))
  ).body.data.dishes.find((d) => d.forSale && d.stock > 0 && d.restaurantId);
  const before = db.prepare("SELECT count(*) n FROM orders").get().n;
  const first = await client
    .post("/api/tasks/interpret")
    .set(auth(user))
    .send({ message: `想吃${dish.name}，30元` });
  assert.equal(first.status, 200);
  assert.equal(first.body.data.constraints.dishId, dish.id);
  assert.equal(first.body.data.constraints.people, undefined);
  const next = await client
    .post("/api/tasks/interpret")
    .set(auth(user))
    .send({
      message: "一个人，现在吃",
      history: [{ role: "user", content: `想吃${dish.name}，30元` }],
    });
  assert.equal(next.body.data.constraints.people, 1);
  assert.ok(next.body.data.constraints.startsAt);
  const seat = await client
    .post("/api/tasks/interpret")
    .set(auth(user))
    .send({
      message: "需要",
      history: [{ role: "assistant", content: "需要帮你预约座位吗？" }],
    });
  assert.equal(seat.body.data.constraints.reserve, true);
  assert.equal(db.prepare("SELECT count(*) n FROM orders").get().n, before);
});
test("规划进度来自实际服务阶段，长于30天的时间可规划且失败不伪报完成", async () => {
  const r = await client
    .post("/api/tasks")
    .set(auth(user))
    .send({
      stream: true,
      message: "想吃午餐",
      constraints: {
        dishId: dish.id,
        budget: 100,
        startsAt: new Date(Date.now() + 40 * 86400000).toISOString(),
      },
    });
  assert.equal(r.status, 200);
  const events = r.text.trim().split("\n").map(JSON.parse);
  assert.deepEqual(
    events.filter((e) => e.type === "progress").map((e) => e.data),
    [0, 1, 2, 3, 4, 5, 6],
  );
  assert.equal(events.at(-1).type, "plan");
  const fail = await client
    .post("/api/tasks")
    .set(auth(user))
    .send({ stream: true, message: "午餐", constraints: { budget: 0 } });
  const failedEvents = fail.text.trim().split("\n").map(JSON.parse);
  assert.equal(failedEvents.at(-1).type, "error");
  assert.ok(!failedEvents.some((e) => e.type === "plan"));
});
test("直接点餐与座位同事务创建，冲突回滚，取消订单释放预约", async () => {
  const time = new Date(Date.now() + 5 * 86400000).toISOString();
  const seats = (
    await client
      .get(
        `/api/restaurants/${dish.restaurantId}/seats?startsAt=${encodeURIComponent(time)}`,
      )
      .set(auth(user))
  ).body.data.seats;
  const payload = {
    items: [{ dishId: dish.id, quantity: 1 }],
    expectedTotal: dish.price,
    dining: {
      restaurantId: dish.restaurantId,
      startsAt: time,
      seatIds: [seats.find((s) => s.available).id],
    },
  };
  const r = await client.post("/api/orders").set(auth(user)).send(payload);
  assert.equal(r.status, 201);
  assert.equal(r.body.data.reservationIds.length, 1);
  const count = db.prepare("SELECT count(*) n FROM orders").get().n;
  const conflict = await client
    .post("/api/orders")
    .set(auth(other))
    .send(payload);
  assert.equal(conflict.status, 409);
  assert.equal(db.prepare("SELECT count(*) n FROM orders").get().n, count);
  const cancel = await client
    .post(`/api/orders/${r.body.data.orderid}/cancel`)
    .set(auth(user));
  assert.equal(cancel.status, 200);
  assert.equal(
    db
      .prepare("SELECT status FROM seat_reservations WHERE reservation_id=?")
      .get(r.body.data.reservationIds[0]).status,
    "cancelled",
  );
});

test("自然表达人数预算和明日时间可解析，后续修改不覆盖旧选择", async () => {
  const r = await client
    .post("/api/tasks/interpret")
    .set(auth(user))
    .send({ message: "我自己，三十元，明天中午十二点，不需要座位" });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.constraints.people, 1);
  assert.equal(r.body.data.constraints.budget, 30);
  assert.equal(r.body.data.constraints.reserve, false);
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString("sv-SE", {
    timeZone: "Asia/Shanghai",
  });
  assert.equal(
    r.body.data.constraints.startsAt,
    new Date(`${tomorrow}T12:00:00+08:00`).toISOString(),
  );
  const updated = await client
    .post("/api/tasks/interpret")
    .set(auth(user))
    .send({
      message: "换成两个人",
      history: [
        { role: "user", content: "我自己，三十元，明天中午十二点，不需要座位" },
      ],
    });
  assert.equal(updated.body.data.constraints.people, 2);
  assert.equal(updated.body.data.constraints.startsAt, undefined);
  assert.equal(updated.body.data.constraints.budget, undefined);
  assert.equal(updated.body.data.constraints.reserve, undefined);
  assert.equal(
    (
      await client
        .post("/api/tasks/interpret")
        .set(auth(user))
        .send({ message: "7个人" })
    ).status,
    400,
  );
});
test("方案从不预约改为指定座位和人数，确认前不创建预约或订单", async () => {
  const d = (
    await client.get("/api/workspace/catalog").set(auth(user))
  ).body.data.dishes.find((d) => d.forSale && d.stock > 3 && d.restaurantId);
  const created = await client
    .post("/api/tasks")
    .set(auth(user))
    .send({
      message: "午餐",
      constraints: {
        dishId: d.id,
        budget: 100,
        people: 1,
        reserve: false,
        startsAt: new Date(Date.now() + 6 * 86400000).toISOString(),
      },
    });
  assert.equal(created.status, 201);
  const p = created.body.data;
  const seats = (
    await client
      .get(
        `/api/restaurants/${d.restaurantId}/seats?startsAt=${encodeURIComponent(p.startsAt)}`,
      )
      .set(auth(user))
  ).body.data.seats;
  const seat = seats.find((s) => s.available && s.type === "4人座");
  const before = db.prepare("SELECT count(*) n FROM orders").get().n;
  const updated = await client
    .put(`/api/tasks/${p.id}`)
    .set(auth(user))
    .send({ people: 2, reserve: true, seatIds: [seat.id] });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.items[0].quantity, 2);
  assert.deepEqual(
    updated.body.data.seats.map((s) => s.id),
    [seat.id],
  );
  assert.equal(db.prepare("SELECT count(*) n FROM orders").get().n, before);
  assert.equal(
    db
      .prepare(
        "SELECT count(*) n FROM seat_reservations WHERE seat_id=? AND starts_at=?",
      )
      .get(seat.id, p.startsAt).n,
    0,
  );
});

test("同一时段座位取消后可以再次预约，保留旧预约记录", async () => {
  const d = (
    await client.get("/api/workspace/catalog").set(auth(user))
  ).body.data.dishes.find((d) => d.forSale && d.stock > 0 && d.restaurantId);
  const startsAt = new Date(Date.now() + 8 * 86400000).toISOString();
  const seats = (
    await client
      .get(
        `/api/restaurants/${d.restaurantId}/seats?startsAt=${encodeURIComponent(startsAt)}`,
      )
      .set(auth(user))
  ).body.data.seats;
  const payload = {
    items: [{ dishId: d.id, quantity: 1 }],
    dining: {
      restaurantId: d.restaurantId,
      startsAt,
      seatIds: [seats.find((s) => s.available).id],
    },
  };
  const first = await client.post("/api/orders").set(auth(user)).send(payload);
  assert.equal(first.status, 201);
  await client
    .post(`/api/orders/${first.body.data.orderid}/cancel`)
    .set(auth(user));
  const second = await client.post("/api/orders").set(auth(user)).send(payload);
  assert.equal(second.status, 201);
  assert.notEqual(
    first.body.data.reservationIds[0],
    second.body.data.reservationIds[0],
  );
  assert.equal(
    db
      .prepare("SELECT status FROM seat_reservations WHERE reservation_id=?")
      .get(first.body.data.reservationIds[0]).status,
    "cancelled",
  );
});
