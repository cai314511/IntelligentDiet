import {entitlements} from "../services/nutritionMembership.js";
import express from "express";
import { db } from "../database.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { catalog, parse } from "../services/catalog.js";
import { config } from "../config.js";
const router = express.Router();
router.get("/catalog", optionalAuth, (req, res) => {
  const id = req.user?.schoolId || req.query.schoolId;
  if (!db.prepare("SELECT 1 FROM universities WHERE id=?").get(id))
    return res.status(400).json({ message: "请选择学校" });
  res.json({ code: 200, data: catalog(id) });
});
router.get("/checks", requireAuth, (req, res) => {
  const data = catalog(req.user.schoolId);
  res.json({
    code: 200,
    data: {
      api: true,
      database: true,
      modelConfigured: Boolean(
        config.aiBaseUrl && config.aiApiKey && config.aiModel,
      ),
      school: db
        .prepare("SELECT name FROM universities WHERE id=?")
        .get(req.user.schoolId).name,
      identity: req.user.role,
      menus: data.dishes.filter((d) => d.forSale).length,
      restaurants: data.restaurants.length,
      imageCount: data.dishes.filter((d) => d.image).length,
      checkedAt: new Date().toISOString(),
      pendingOrders: db
        .prepare(
          "SELECT COUNT(DISTINCT orderid) AS n FROM orders WHERE userid=? AND status='未支付'",
        )
        .get(req.user.id).n,
    },
  });
});
router.get("/preferences", requireAuth, (req, res) => {
  res.json({
    code: 200,
    data: parse(
      db
        .prepare("SELECT profile_json FROM nutrition_profiles WHERE user_id=?")
        .get(req.user.id)?.profile_json,
      {
        goal: "均衡饮食",
        exclusions: [],
        tastes: [],
        calorieTarget: 2000,
        macros: { carbs: 50, protein: 20, fat: 30 },
      },
    ),
  });
});
router.put("/preferences", requireAuth, (req, res) => {
  const b = req.body || {};
  const macros = b.macros || {};
  if ((b.portrait || b.profileEstablished) && !entitlements(db,req.user).advanced) return res.status(403).json({message:"口味画像属于会员权益"});
  if (
    typeof b.goal !== "string" ||
    b.goal.length > 80 ||
    !Array.isArray(b.exclusions) ||
    !Array.isArray(b.tastes) ||
    [...b.exclusions, ...b.tastes].some(
      (x) => typeof x !== "string" || x.length > 60,
    ) ||
    b.exclusions.length > 30 ||
    b.tastes.length > 30 ||
    !Number.isFinite(Number(b.calorieTarget)) ||
    b.calorieTarget < 1000 ||
    b.calorieTarget > 5000 ||
    ["carbs", "protein", "fat"].some(
      (k) =>
        !Number.isFinite(Number(macros[k])) || macros[k] < 0 || macros[k] > 100,
    ) ||
    Math.abs(
      Number(macros.carbs) + Number(macros.protein) + Number(macros.fat) - 100,
    ) > 0.01
  )
    return res
      .status(400)
      .json({ message: "请检查偏好，三大营养素比例之和需为 100%" });
  const profile = {
    goal: b.goal,
    exclusions: b.exclusions,
    tastes: b.tastes,
    calorieTarget: Number(b.calorieTarget),
    macros,
    profileEstablished: b.profileEstablished === true,
    portrait: b.portrait && typeof b.portrait === "object" ? Object.fromEntries(Object.entries(b.portrait).filter(([k,v])=>["goal","tastes","allergies","dislikes","habits"].includes(k)&&Array.isArray(v)&&v.length<=30&&v.every(x=>typeof x==="string"&&x.length<=60))) : undefined,
  };
  db.prepare(
    "INSERT INTO nutrition_profiles(user_id,profile_json) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET profile_json=excluded.profile_json,updated_at=CURRENT_TIMESTAMP",
  ).run(req.user.id, JSON.stringify(profile));
  res.json({ code: 200, data: profile });
});
export default router;
