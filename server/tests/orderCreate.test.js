import { targetFor } from "./support/target.js";
import { test, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.DB_PATH = ":memory:";
process.env.SEED_REFERENCE_DATA = "false";
const { db } = await import("../database.js");
const { default: app } = await import("../app.js");
const target = await targetFor(app);
const bcrypt = (await import("bcryptjs")).default;

let token;

before(async () => {
  db.prepare(
    "INSERT INTO yonghu (id, zhanghao, mima, xingming, jine) VALUES (1, 'u1', ?, '用户一', 100)",
  ).run(bcrypt.hashSync("pw123456", 10));
  db.prepare(
    "INSERT OR IGNORE INTO caipinfenlei (caipinfenlei) VALUES ('热菜')",
  ).run();
  db.prepare(
    "INSERT OR IGNORE INTO caipinfenlei (caipinfenlei) VALUES ('素菜')",
  ).run();
  db.prepare(
    "INSERT INTO caipinxinxi (id, caipinmingcheng, caipinfenlei, jiage, kucun) VALUES (1, '红烧肉', '热菜', 15, 2)",
  ).run();
  db.prepare(
    "INSERT INTO caipinxinxi (id, caipinmingcheng, caipinfenlei, jiage, kucun) VALUES (2, '青菜', '素菜', 5, 100)",
  ).run();
  const login = await request(target)
    .post("/api/users/login")
    .send({ zhanghao: "u1", mima: "pw123456", schoolId: "cufe" });
  token = login.body.data.token;
});

test("正常下单成功并返回总价", async () => {
  const res = await request(target)
    .post("/api/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({ items: [{ dishId: 2, quantity: 2 }], remark: "少辣" });
  assert.equal(res.status, 201);
  assert.ok(res.body.data.orderid);
  assert.equal(res.body.data.totalPrice, 10);
});

test("多菜品下单：同一 orderid 多行共存", async () => {
  const res = await request(target)
    .post("/api/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({
      items: [
        { dishId: 1, quantity: 1 },
        { dishId: 2, quantity: 1 },
      ],
    });
  assert.equal(res.status, 201);
  const orderid = res.body.data.orderid;
  const rows = db
    .prepare(
      "SELECT orderid, caipinxinxiid, total FROM orders WHERE orderid = ?",
    )
    .all(orderid);
  assert.equal(rows.length, 2);
  assert.ok(
    rows.every((r) => r.orderid === orderid),
    "两行必须共用同一 orderid",
  );
  const totals = Object.fromEntries(
    rows.map((r) => [r.caipinxinxiid, r.total]),
  );
  assert.equal(totals[1], 15);
  assert.equal(totals[2], 5);
});

test("库存不足返回 409 且不产生任何订单行", async () => {
  const res = await request(target)
    .post("/api/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({
      items: [
        { dishId: 1, quantity: 5 },
        { dishId: 2, quantity: 1 },
      ],
    });
  assert.equal(res.status, 409);
  assert.match(res.body.message, /库存不足/);
  // 订单表一行一菜品（quantity 存 buyshu），此前用例对菜品 2 共产生 2 行，409 后不得新增
  const count = db
    .prepare("SELECT COUNT(*) AS c FROM orders WHERE caipinxinxiid = 2")
    .get().c;
  assert.equal(count, 2, "库存不足时不得残留部分订单行");
});

test("直接点餐的确认价格变化时拒绝创建订单", async () => {
  const before = db.prepare("SELECT count(*) n FROM orders").get().n;
  db.prepare("UPDATE caipinxinxi SET jiage=6 WHERE id=2").run();
  const result = await request(target)
    .post("/api/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({ items: [{ dishId: 2, quantity: 2 }], expectedTotal: 10 });
  assert.equal(result.status, 409);
  assert.equal(db.prepare("SELECT count(*) n FROM orders").get().n, before);
  db.prepare("UPDATE caipinxinxi SET jiage=5 WHERE id=2").run();
});
