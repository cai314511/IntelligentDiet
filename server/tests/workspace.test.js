import { targetFor } from "./support/target.js";
import { test, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
process.env.DB_PATH = ":memory:";
process.env.AI_BASE_URL = "";
process.env.AI_API_KEY = "";
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
    await client
      .post("/api/users/register")
      .send({
        zhanghao: name,
        mima: "testpass123",
        xingming: name,
        schoolId: "cufe",
      });
  }
  user = (
    await client
      .post("/api/users/login")
      .send({
        zhanghao: "workspace_test",
        mima: "testpass123",
        schoolId: "cufe",
        identity: "student",
      })
  ).body.data.token;
  other = (
    await client
      .post("/api/users/login")
      .send({
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
      await client
        .post("/api/users/login")
        .send({
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
    .send({ expectedTotal: plan.total });
  assert.equal(ok.status, 200);
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
