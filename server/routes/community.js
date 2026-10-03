import express from "express";
import { randomUUID } from "crypto";
import { db } from "../database.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { awardPoints } from "../services/catalog.js";
const router = express.Router();
router.use(requireAuth);
router.get("/proposals", (req, res) =>
  res.json({
    code: 200,
    data: db
      .prepare(
        `SELECT p.*,COUNT(v.user_id) AS votes,SUM(CASE WHEN v.choice='支持' THEN 1 ELSE 0 END) AS support,(SELECT choice FROM proposal_votes WHERE proposal_id=p.id AND user_id=?) AS myVote FROM proposals p LEFT JOIN proposal_votes v ON v.proposal_id=p.id WHERE p.school_id=? GROUP BY p.id ORDER BY p.created_at DESC`,
      )
      .all(req.user.id, req.user.schoolId),
  }),
);
router.post("/proposals", (req, res) => {
  const title = String(req.body?.title || "").trim(),
    description = String(req.body?.description || "").trim();
  if (!title || title.length > 100 || !description || description.length > 2000)
    return res.status(400).json({ message: "请填写有效的标题与说明" });
  const r = db
    .prepare(
      "INSERT INTO proposals(school_id,user_id,title,description) VALUES(?,?,?,?)",
    )
    .run(req.user.schoolId, req.user.id, title, description);
  res.status(201).json({ code: 200, data: { id: r.lastInsertRowid } });
});
router.post("/proposals/:id/vote", (req, res) => {
  const p = db
    .prepare("SELECT id FROM proposals WHERE id=? AND school_id=?")
    .get(req.params.id, req.user.schoolId);
  if (!p) return res.status(404).json({ message: "提案不存在" });
  if (!["支持", "再考虑"].includes(req.body?.choice))
    return res.status(400).json({ message: "请选择投票选项" });
  try {
    db.transaction(() => {
      db.prepare(
        "INSERT INTO proposal_votes(proposal_id,user_id,choice) VALUES(?,?,?)",
      ).run(p.id, req.user.id, req.body.choice);
      awardPoints(req.user, "共创投票", p.id, 5);
    })();
    res.json({ code: 200, message: "投票已提交，获得 5 积分" });
  } catch {
    res.status(409).json({ message: "你已经投过票" });
  }
});
router.get("/points", (req, res) => {
  const ledger = db
    .prepare(
      "SELECT * FROM point_ledger WHERE user_id=? AND school_id=? ORDER BY id DESC",
    )
    .all(req.user.id, req.user.schoolId);
  const redemptions = db
    .prepare(
      "SELECT r.*,c.title FROM point_redemptions r JOIN cultural_items c ON c.id=r.item_id WHERE r.user_id=? AND r.school_id=? ORDER BY r.created_at DESC",
    )
    .all(req.user.id, req.user.schoolId);
  res.json({
    code: 200,
    data: {
      balance: ledger.reduce((s, r) => s + r.points, 0),
      ledger,
      redemptions,
    },
  });
});
router.post("/redeem/:id", (req, res) => {
  const item = db
    .prepare(
      "SELECT * FROM cultural_items WHERE id=? AND school_id=? AND status='published'",
    )
    .get(req.params.id, req.user.schoolId);
  if (!item) return res.status(404).json({ message: "兑换商品不存在" });
  const cost = Math.max(1, Math.round(item.price * 10));
  try {
    const id = randomUUID();
    db.transaction(() => {
      const changed = db
        .prepare(
          "UPDATE cultural_items SET stock=stock-1 WHERE id=? AND school_id=? AND stock>0 AND status='published'",
        )
        .run(item.id, req.user.schoolId);
      if (!changed.changes) throw new Error("商品库存不足");
      const balance = db
        .prepare(
          "SELECT COALESCE(SUM(points),0) AS n FROM point_ledger WHERE user_id=? AND school_id=?",
        )
        .get(req.user.id, req.user.schoolId).n;
      if (balance < cost) throw new Error("积分不足");
      db.prepare(
        "INSERT INTO point_redemptions(id,user_id,school_id,item_id,points) VALUES(?,?,?,?,?)",
      ).run(id, req.user.id, req.user.schoolId, item.id, cost);
      awardPoints(req.user, "文创兑换", id, -cost);
    })();
    res
      .status(201)
      .json({
        code: 200,
        data: { id, points: cost },
        message: "兑换成功，请在校园领取点出示兑换单",
      });
  } catch (e) {
    res.status(409).json({ message: e.message });
  }
});
router.get("/redemptions", requireAdmin, (req, res) =>
  res.json({
    code: 200,
    data: db
      .prepare(
        "SELECT r.*,c.title FROM point_redemptions r JOIN cultural_items c ON c.id=r.item_id WHERE r.school_id=? ORDER BY r.created_at DESC",
      )
      .all(req.user.schoolId),
  }),
);
router.put("/redemptions/:id", requireAdmin, (req, res) => {
  const r = db
    .prepare(
      "UPDATE point_redemptions SET status='已领取' WHERE id=? AND school_id=? AND status='待领取'",
    )
    .run(req.params.id, req.user.schoolId);
  res
    .status(r.changes ? 200 : 409)
    .json({ message: r.changes ? "领取已核销" : "兑换记录不存在或已领取" });
});
export default router;
