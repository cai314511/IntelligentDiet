import { mainDb, databaseContext } from '../database.js';
import { validCertificate } from '../services/adminAccess.js';
import express from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { config } from "../config.js";
import { db } from "../database.js";
import { signToken, requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();
const officialAccounts = (_req, _res, next) => databaseContext.run(mainDb, next);
const userColumns =
  "id, zhanghao, xingming, touxiang, xingbie, lianxifangshi, jine, role, school_id";

const localRequest = (req) =>
  ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress);
const developmentEntry = (req) =>
  config.nodeEnv === "development" &&
  process.env.ENABLE_DEV_ENTRY !== "false" &&
  localRequest(req);
router.get("/development-entry", (req, res) =>
  res.json({ code: 200, data: { enabled: developmentEntry(req) } }),
);
const developmentAccounts = new Map();
router.post("/development-account", (req, res) => {
  if (!developmentEntry(req))
    return res.status(404).json({ message: "入口不存在" });
  const schoolId = String(req.body?.schoolId || "");
  if (!db.prepare("SELECT 1 FROM universities WHERE id=?").get(schoolId))
    return res.status(400).json({ message: "请选择有效学校" });
  let credentials = developmentAccounts.get(schoolId);
  if (!credentials) {
    credentials = {
      account: `__development_${schoolId}`,
      password: randomBytes(18).toString("hex"),
    };
    const user = db
      .prepare("SELECT id FROM yonghu WHERE zhanghao=? AND school_id=?")
      .get(credentials.account, schoolId);
    const hash = bcrypt.hashSync(credentials.password, 10);
    if (user)
      db.prepare("UPDATE yonghu SET mima=? WHERE id=?").run(hash, user.id);
    else
      db.prepare(
        "INSERT INTO yonghu(zhanghao,mima,xingming,school_id,role,jine) VALUES(?,?,?,?,'admin',1000)",
      ).run(credentials.account, hash, "管理员", schoolId);
    developmentAccounts.set(schoolId, credentials);
  }
  res.set("Cache-Control", "no-store");
  res.json({ code: 200, data: credentials });
});
router.post("/development-session", (req, res) => {
  if (!developmentEntry(req))
    return res.status(404).json({ message: "入口不存在" });
  const schoolId = String(req.body?.schoolId || "");
  if (!db.prepare("SELECT 1 FROM universities WHERE id=?").get(schoolId))
    return res.status(400).json({ message: "请选择有效学校" });
  const account = `__development_${schoolId}`;
  let user = db
    .prepare("SELECT * FROM yonghu WHERE zhanghao=? AND school_id=?")
    .get(account, schoolId);
  if (!user) {
    db.prepare(
      "INSERT INTO yonghu(zhanghao,mima,xingming,school_id,role,jine) VALUES(?,?,?,?,'admin',1000)",
    ).run(
      account,
      bcrypt.hashSync(randomBytes(32).toString("hex"), 10),
      "开发管理员",
      schoolId,
    );
    user = db.prepare("SELECT * FROM yonghu WHERE zhanghao=?").get(account);
  }
  const { mima, ...safe } = user;
  res.json({
    code: 200,
    data: { token: signToken({ ...safe, development: true }), user: safe },
  });
});

router.get("/schools", officialAccounts, (_req, res) => {
  const schools = db
    .prepare(
      "SELECT id, name, short_name AS shortName, accent, logo, background FROM universities ORDER BY name",
    )
    .all();
  res.json({
    code: 200,
    data: schools.map((s) => ({
      ...s,
      campuses: db
        .prepare(
          "SELECT DISTINCT campus FROM restaurants WHERE school_id=? ORDER BY campus",
        )
        .all(s.id)
        .map((r) => r.campus),
    })),
  });
});

router.post("/login", officialAccounts, (req, res) => {
  try {
    const zhanghao = String(req.body?.zhanghao || "").trim();
    const mima = String(req.body?.mima || "");
    const schoolId = String(req.body?.schoolId || "").trim();
    if (!zhanghao || !mima || !schoolId)
      return res
        .status(400)
        .json({ code: 400, message: "请选择学校并填写账号和密码" });
    let user = db
      .prepare(
        `SELECT ${userColumns}, mima FROM yonghu WHERE zhanghao = ? AND school_id = ?`,
      )
      .get(zhanghao, schoolId);
    if (!user || !bcrypt.compareSync(mima, user.mima))
      return res.status(401).json({ code: 401, message: "账号或密码错误" });
    const identity = req.body?.identity;
    if (identity && !["student", "admin"].includes(identity))
      return res.status(400).json({ code: 400, message: "请选择有效身份" });
    if (identity === "admin" && user.role !== "admin") {
      if (validCertificate(schoolId, req.body?.adminCode)) {
        mainDb.prepare("UPDATE yonghu SET role='admin' WHERE id=?").run(user.id);
        user.role = 'admin';
      } else if (user.role === 'admin_trial' && !req.body?.adminCode) {
        return res.status(403).json({message:'请填写高校管理员认证号，或在院校栏选择演示数据'});
      }
    }
    if (identity !== 'admin' && user.role === 'admin_trial')
      return res.status(403).json({ message: '此账号为校方体验账号，请选择我是校方' });
    if (identity === "admin" && user.role !== "admin")
      return res
        .status(403)
        .json({ code: 403, message: req.body?.adminCode ? '高校管理员认证号无效或与所选学校不符' : '账号与所选身份不符，请切换身份' });
    const token = signToken(user);
    const { mima: _password, ...safeUser } = user;
    res.json({
      code: 200,
      message: "登录成功",
      data: { token, user: safeUser },
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: "登录失败，请稍后重试" });
  }
});

router.post("/register", officialAccounts, (req, res) => {
  try {
    const zhanghao = String(req.body?.zhanghao || "").trim();
    const mima = String(req.body?.mima || "");
    const xingming = String(req.body?.xingming || "").trim();
    const lianxifangshi = String(req.body?.lianxifangshi || "").trim();
    const schoolId = String(req.body?.schoolId || "").trim();
    if (
      !schoolId ||
      !db.prepare("SELECT 1 FROM universities WHERE id=?").get(schoolId)
    ) {
      return res.status(400).json({ code: 400, message: "请选择有效学校" });
    }
    if (
      !/^[\p{L}\p{N}_.-]{3,32}$/u.test(zhanghao) ||
      mima.length < 8 ||
      mima.length > 128 ||
      !xingming ||
      xingming.length > 40
    ) {
      return res
        .status(400)
        .json({ code: 400, message: "账号、密码或姓名格式不符合要求" });
    }
    const identity = req.body?.identity || 'student';
    if (!['student', 'admin'].includes(identity)) return res.status(400).json({ message: '请选择有效身份' });
    if (identity === 'admin' && !validCertificate(schoolId, req.body?.adminCode))
      return res.status(403).json({ message: '高校管理员认证号无效或与所选学校不符' });
    const role = identity === 'admin' ? 'admin' : 'user';
    const result = db.transaction(() => {
    const created = db
      .prepare(
        `INSERT INTO yonghu(zhanghao,mima,xingming,lianxifangshi,jine,role,school_id)
      VALUES(?,?,?,?,0,?,?)`,
      )
      .run(
        zhanghao,
        bcrypt.hashSync(mima, 12),
        xingming,
        lianxifangshi,
        role,
        schoolId,
      );
    return created;
    })();
    res
      .status(201)
      .json({
        code: 200,
        message: "注册成功",
        data: { id: result.lastInsertRowid },
      });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE")
      return res.status(409).json({ code: 409, message: "账号已存在" });
    res.status(500).json({ code: 500, message: "注册失败，请稍后重试" });
  }
});

router.get("/me", requireAuth, (req, res) => {
  const user = db
    .prepare(`SELECT ${userColumns} FROM yonghu WHERE id=?`)
    .get(req.user.id);
  if (!user) return res.status(404).json({ code: 404, message: "用户不存在" });
  res.json({ code: 200, data: user });
});

router.get("/", requireAdmin, (req, res) => {
  const users = db
    .prepare(
      `SELECT id, zhanghao, xingming, xingbie, lianxifangshi, jine, role, addtime
    FROM yonghu WHERE school_id=? ORDER BY addtime DESC LIMIT 500`,
    )
    .all(req.user.schoolId);
  res.json({ code: 200, data: users });
});

router.get("/:id", requireAuth, (req, res) => {
  if (req.user.id !== Number(req.params.id) && req.user.role !== "admin") {
    return res.status(403).json({ code: 403, message: "无权查看该用户资料" });
  }
  const user = db
    .prepare(`SELECT ${userColumns} FROM yonghu WHERE id=? AND school_id=?`)
    .get(req.params.id, req.user.schoolId);
  if (!user) return res.status(404).json({ code: 404, message: "用户不存在" });
  res.json({ code: 200, data: user });
});

router.put("/:id", requireAuth, (req, res) => {
  if (req.user.id !== Number(req.params.id) && req.user.role !== "admin") {
    return res.status(403).json({ code: 403, message: "只能修改本人资料" });
  }
  const { xingming, xingbie, lianxifangshi } = req.body || {};
  if (
    xingming !== undefined &&
    (typeof xingming !== "string" || !xingming.trim() || xingming.length > 40)
  ) {
    return res.status(400).json({ code: 400, message: "姓名格式无效" });
  }
  db.prepare(
    `UPDATE yonghu SET xingming=COALESCE(?,xingming), xingbie=COALESCE(?,xingbie),
    lianxifangshi=COALESCE(?,lianxifangshi) WHERE id=? AND school_id=?`,
  ).run(
    xingming?.trim() || null,
    xingbie || null,
    lianxifangshi || null,
    req.params.id,
    req.user.schoolId,
  );
  res.json({ code: 200, message: "用户信息更新成功" });
});

router.get("/:id/addresses", requireAuth, (req, res) => {
  if (req.user.id !== Number(req.params.id) && req.user.role !== "admin")
    return res.status(403).json({ code: 403, message: "无权查看该用户地址" });
  const owner = db
    .prepare("SELECT id FROM yonghu WHERE id=? AND school_id=?")
    .get(req.params.id, req.user.schoolId);
  if (!owner) return res.status(404).json({ code: 404, message: "用户不存在" });
  const addresses = db
    .prepare(
      "SELECT id,address,name,phone,isdefault FROM address WHERE userid=? ORDER BY id DESC",
    )
    .all(req.params.id);
  res.json({ code: 200, data: addresses });
});

router.post("/:id/addresses", requireAuth, (req, res) => {
  if (req.user.id !== Number(req.params.id))
    return res.status(403).json({ code: 403, message: "只能为本人添加地址" });
  const { address, name, phone, isdefault } = req.body || {};
  if (
    ![address, name, phone].every(
      (v) => typeof v === "string" && v.trim() && v.length <= 200,
    )
  ) {
    return res
      .status(400)
      .json({ code: 400, message: "地址、姓名和电话均为必填项" });
  }
  const addAddress = db.transaction(() => {
    if (isdefault === "是")
      db.prepare("UPDATE address SET isdefault='否' WHERE userid=?").run(
        req.user.id,
      );
    return db
      .prepare(
        "INSERT INTO address(userid,address,name,phone,isdefault) VALUES(?,?,?,?,?)",
      )
      .run(
        req.user.id,
        address.trim(),
        name.trim(),
        phone.trim(),
        isdefault === "是" ? "是" : "否",
      );
  });
  const result = addAddress();
  res
    .status(201)
    .json({
      code: 200,
      message: "地址添加成功",
      data: { id: result.lastInsertRowid },
    });
});

router.delete("/:id/addresses/:addressId", requireAuth, (req, res) => {
  if (req.user.id !== Number(req.params.id))
    return res.status(403).json({ code: 403, message: "只能删除本人地址" });
  db.prepare("DELETE FROM address WHERE id=? AND userid=?").run(
    req.params.addressId,
    req.user.id,
  );
  res.json({ code: 200, message: "地址已删除" });
});

export default router;
