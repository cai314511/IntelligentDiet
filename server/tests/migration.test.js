import { test } from "node:test";
import assert from "node:assert/strict";

process.env.DB_PATH = ":memory:";
const { db, initDatabase } = await import("../database.js");

test("迁移后 orders 有 pickup_code 列，yonghu 有 role 列，caipinxinxi 有 shangjia 列", () => {
  initDatabase();
  const orderCols = db
    .prepare("PRAGMA table_info(orders)")
    .all()
    .map((c) => c.name);
  const userCols = db
    .prepare("PRAGMA table_info(yonghu)")
    .all()
    .map((c) => c.name);
  const dishCols = db
    .prepare("PRAGMA table_info(caipinxinxi)")
    .all()
    .map((c) => c.name);
  assert.ok(orderCols.includes("pickup_code"));
  assert.ok(userCols.includes("role"));
  assert.ok(dishCols.includes("shangjia"));
});

test("明文密码被自动哈希（幂等）", () => {
  initDatabase();
  db.prepare(
    "INSERT INTO yonghu (zhanghao, mima, xingming) VALUES ('t1', 'plain123', '测试')",
  ).run();
  initDatabase(); // 第二次调用触发迁移且不得重复哈希
  const u = db.prepare("SELECT mima FROM yonghu WHERE zhanghao = 't1'").get();
  assert.ok(u.mima.startsWith("$2"), "密码应已被 bcrypt 哈希");
});

test("旧预约索引升级保留历史，并允许取消后的同座同时段重新预约", () => {
  const user = db.prepare("SELECT id FROM yonghu WHERE zhanghao='t1'").get();
  const seat = db.prepare("SELECT * FROM restaurant_seats LIMIT 1").get();
  const start = "2027-01-01T04:00:00.000Z",
    end = "2027-01-01T04:45:00.000Z";
  db.prepare(
    "INSERT INTO seat_reservations(reservation_id,user_id,restaurant_id,seat_id,starts_at,ends_at,status) VALUES('migration-cancelled',?,?,?,?,?,'cancelled')",
  ).run(user.id, seat.restaurant_id, seat.id, start, end);
  const schema = db
    .prepare("SELECT sql FROM sqlite_master WHERE name='seat_reservations'")
    .get()
    .sql.replace("CHECK(ends_at > starts_at)", "UNIQUE(seat_id, starts_at)");
  db.exec("ALTER TABLE seat_reservations RENAME TO seat_reservations_fixture");
  db.exec(schema);
  db.exec(
    "INSERT INTO seat_reservations SELECT * FROM seat_reservations_fixture; DROP TABLE seat_reservations_fixture",
  );
  initDatabase();
  assert.equal(
    db
      .prepare(
        "SELECT status FROM seat_reservations WHERE reservation_id='migration-cancelled'",
      )
      .get().status,
    "cancelled",
  );
  db.prepare(
    "INSERT INTO seat_reservations(reservation_id,user_id,restaurant_id,seat_id,starts_at,ends_at) VALUES('migration-rebooked',?,?,?,?,?)",
  ).run(user.id, seat.restaurant_id, seat.id, start, end);
  initDatabase();
  assert.equal(
    db
      .prepare(
        "SELECT count(*) n FROM seat_reservations WHERE seat_id=? AND starts_at=?",
      )
      .get(seat.id, start).n,
    2,
  );
  assert.deepEqual(db.pragma("foreign_key_check"), []);
});
