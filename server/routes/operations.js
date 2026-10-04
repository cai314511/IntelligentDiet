import express from "express";
import { db } from "../database.js";
import { requireAdmin } from "../middleware/auth.js";
import { parse } from "../services/catalog.js";
const router = express.Router();
router.use(requireAdmin);
const types = new Set([
  "canteen",
  "safety",
  "conservation",
  "service",
  "supplier",
  "inventory",
  "procurement",
]);
const row = (id, user) =>
  db
    .prepare("SELECT * FROM operations_records WHERE id=? AND school_id=?")
    .get(id, user.schoolId);
const audit = (user, id, action, before, after) =>
  db
    .prepare(
      "INSERT INTO audit_events(school_id,user_id,entity,entity_id,action,before_json,after_json) VALUES(?,?,?,?,?,?,?)",
    )
    .run(
      user.schoolId,
      user.id,
      "operations",
      id,
      action,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
    );
const valid = (b, user) =>
  types.has(b.type) &&
  typeof b.title === "string" &&
  b.title.trim() &&
  b.title.length <= 120 &&
  b.payload &&
  typeof b.payload === "object" &&
  !Array.isArray(b.payload) &&
  JSON.stringify(b.payload).length < 8000 &&
  typeof b.status === "string" &&
  b.status.length > 0 &&
  b.status.length <= 30 &&
  [
    "quantity",
    "unitCost",
    "prepared",
    "checkpoints",
    "passed",
    "revenue",
  ].every(
    (k) =>
      b.payload[k] === undefined ||
      (Number.isFinite(Number(b.payload[k])) &&
        Number(b.payload[k]) >= 0 &&
        Number(b.payload[k]) <= 1e8),
  ) &&
  (!b.payload.restaurantId ||
    Boolean(
      db
        .prepare("SELECT 1 FROM restaurants WHERE id=? AND school_id=?")
        .get(Number(b.payload.restaurantId), user.schoolId),
    )) &&
  (!b.payload.dishId ||
    Boolean(
      db
        .prepare("SELECT 1 FROM caipinxinxi WHERE id=? AND school_id=?")
        .get(Number(b.payload.dishId), user.schoolId),
    ));
const handle = (res, fn) => {
  try {
    fn();
  } catch (e) {
    res
      .status(e.status || (e.code === "SQLITE_CONSTRAINT_UNIQUE" ? 409 : 500))
      .json({
        message: e.status
          ? e.message
          : e.code === "SQLITE_CONSTRAINT_UNIQUE"
            ? "同名记录已存在"
            : "记录暂时无法保存",
      });
  }
};
router.get("/", (req, res) => {
  const type = String(req.query.type || "");
  if (type && !types.has(type))
    return res.status(400).json({ message: "运营类型无效" });
  const rows = type
    ? db
        .prepare(
          "SELECT * FROM operations_records WHERE school_id=? AND type=? ORDER BY updated_at DESC,id DESC",
        )
        .all(req.user.schoolId, type)
    : db
        .prepare(
          "SELECT * FROM operations_records WHERE school_id=? ORDER BY updated_at DESC,id DESC",
        )
        .all(req.user.schoolId);
  res.json({
    code: 200,
    data: rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      payload: parse(r.payload_json, {}),
      status: r.status,
      updatedAt: r.updated_at,
    })),
  });
});
router.get("/audit", (req, res) =>
  res.json({
    code: 200,
    data: db
      .prepare(
        "SELECT id,user_id,entity_id,action,created_at FROM audit_events WHERE school_id=? ORDER BY id DESC LIMIT 200",
      )
      .all(req.user.schoolId),
  }),
);
router.post("/audit/:id/undo", (req, res) =>
  handle(res, () => {
    db.transaction(() => {
      const event = db
        .prepare("SELECT * FROM audit_events WHERE id=? AND school_id=?")
        .get(req.params.id, req.user.schoolId);
      if (
        !event ||
        !["create", "update", "delete"].includes(event.action) ||
        db
          .prepare("SELECT 1 FROM audit_events WHERE school_id=? AND action=?")
          .get(req.user.schoolId, `undo:${event.id}`)
      )
        throw Object.assign(new Error("此操作不可重复撤销"), { status: 409 });
      const before = parse(event.before_json, null),
        after = parse(event.after_json, null),
        current = row(event.entity_id, req.user);
      if (JSON.stringify(current || null) !== JSON.stringify(after || null))
        throw Object.assign(new Error("记录已被后续操作修改，不能撤销"), {
          status: 409,
        });
      if (!before)
        db.prepare(
          "DELETE FROM operations_records WHERE id=? AND school_id=?",
        ).run(event.entity_id, req.user.schoolId);
      else
        db.prepare(
          "INSERT INTO operations_records(id,school_id,type,title,payload_json,status,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,payload_json=excluded.payload_json,status=excluded.status,updated_at=excluded.updated_at",
        ).run(
          before.id,
          before.school_id,
          before.type,
          before.title,
          before.payload_json,
          before.status,
          before.updated_at,
        );
      audit(
        req.user,
        event.entity_id,
        `undo:${event.id}`,
        current,
        row(event.entity_id, req.user),
      );
    })();
    res.json({ code: 200, message: "操作已撤销" });
  }),
);
router.post("/", (req, res) =>
  handle(res, () => {
    const b = { payload: {}, status: "运行中", ...req.body };
    if (!valid(b, req.user))
      return res.status(400).json({ message: "运营记录格式无效" });
    const id = db.transaction(() => {
      const r = db
        .prepare(
          "INSERT INTO operations_records(school_id,type,title,payload_json,status) VALUES(?,?,?,?,?)",
        )
        .run(
          req.user.schoolId,
          b.type,
          b.title.trim(),
          JSON.stringify(b.payload),
          b.status,
        );
      audit(
        req.user,
        r.lastInsertRowid,
        "create",
        null,
        row(r.lastInsertRowid, req.user),
      );
      return r.lastInsertRowid;
    })();
    res.status(201).json({ code: 200, data: { id } });
  }),
);
router.put("/:id", (req, res) =>
  handle(res, () => {
    const before = row(req.params.id, req.user);
    if (!before) return res.status(404).json({ message: "运营记录不存在" });
    const b = { ...req.body, type: before.type };
    if (!valid(b, req.user))
      return res.status(400).json({ message: "运营记录格式无效" });
    db.transaction(() => {
      db.prepare(
        "UPDATE operations_records SET title=?,payload_json=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND school_id=?",
      ).run(
        b.title.trim(),
        JSON.stringify(b.payload),
        b.status,
        before.id,
        req.user.schoolId,
      );
      audit(req.user, before.id, "update", before, row(before.id, req.user));
    })();
    res.json({ code: 200, message: "运营记录已更新" });
  }),
);
router.delete("/:id", (req, res) =>
  handle(res, () => {
    const before = row(req.params.id, req.user);
    if (!before) return res.status(404).json({ message: "运营记录不存在" });
    db.transaction(() => {
      db.prepare(
        "DELETE FROM operations_records WHERE id=? AND school_id=?",
      ).run(before.id, req.user.schoolId);
      audit(req.user, before.id, "delete", before, null);
    })();
    res.json({ code: 200, message: "运营记录已删除" });
  }),
);
export default router;
