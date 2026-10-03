import express from 'express';
import { db } from '../database.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const schoolExists = id => db.prepare('SELECT 1 FROM universities WHERE id=?').get(id);
const json = (text, fallback) => { try { return JSON.parse(text || ''); } catch { return fallback; } };
const stringList = (value, limit) => Array.isArray(value) && value.length <= limit && value.every(item => typeof item === 'string' && item.length <= 80);
const selectDish = `SELECT d.id,d.school_id AS schoolId,d.caipinmingcheng AS name,d.caipinfenlei AS category,d.tupian AS image,
  d.cailiao AS ingredientsText,d.guige AS portionLabel,d.portion_g AS portionG,d.jiage AS price,d.yingyang AS nutritionText,
  d.nutrition_json AS nutritionJson,d.ingredients_json AS ingredientsJson,d.allergens_json AS allergensJson,
  d.window_name AS window,d.campus,d.restaurant_name AS restaurant,d.price_unit AS priceUnit,d.taste_tags_json AS tasteTagsJson,d.dietary_tags_json AS dietaryTagsJson,
  d.spice_level AS spiceLevel,d.source_date AS sourceDate,d.source_kind AS sourceKind,d.price_basis AS priceBasis,d.nutrition_basis AS nutritionBasis,
  COALESCE((SELECT SUM(o.buyshu) FROM orders o WHERE o.caipinxinxiid=d.id AND o.status IN ('已支付','制作中','待取餐','已完成') AND o.addtime>=datetime('now','-30 days')),0) AS monthlySales,
  COALESCE((SELECT ROUND(AVG(r.rating),1) FROM discusscaipinxinxi r WHERE r.caipinxinxiid=d.id),0) AS rating,d.kucun AS stock,d.shangjia AS forSale,d.data_source AS sourceName,d.source_url AS sourceUrl
  FROM caipinxinxi d`;
function normalize(row) {
  const ingredients=json(row.ingredientsJson, []), allergens=json(row.allergensJson, []), nutrition=json(row.nutritionJson, {});
  const tasteTags=json(row.tasteTagsJson, []), dietaryTags=json(row.dietaryTagsJson, []);
  const price=Number(row.price), monthlySales=Number(row.monthlySales||0), rating=Number(row.rating||0), stock=Number(row.stock||0);
  const { ingredientsJson, allergensJson, nutritionJson, tasteTagsJson, dietaryTagsJson, ...fields }=row;
  return { ...fields, price, ingredients, allergens, nutrition, tasteTags, dietaryTags, monthlySales, rating, stock,
    caipinmingcheng:row.name,caipinfenlei:row.category,tupian:row.image,cailiao:row.ingredientsText,guige:row.portionLabel,
    jiage:price,yingyang:row.nutritionText,yueshuxiao:monthlySales,pinfen:rating,kucun:stock,shangjia:row.forSale };
}
function schoolScope(req) {
  const id = req.user?.schoolId || String(req.query.schoolId || 'cufe');
  return schoolExists(id) ? id : null;
}

router.get('/categories', (req, res) => {
  const schoolId = schoolScope(req);
  if (!schoolId) return res.status(400).json({ code: 400, message: '请选择有效学校' });
  const categories = db.prepare(`SELECT caipinfenlei AS name,COUNT(*) AS count FROM caipinxinxi
    WHERE school_id=? AND shangjia='是' GROUP BY caipinfenlei ORDER BY caipinfenlei`).all(schoolId);
  res.json({ code: 200, data: categories });
});

router.get('/search/:keyword', (req, res) => {
  const schoolId = schoolScope(req);
  if (!schoolId) return res.status(400).json({ code: 400, message: '请选择有效学校' });
  const term = `%${String(req.params.keyword).slice(0, 80)}%`;
  const rows = db.prepare(`${selectDish} WHERE d.school_id=? AND d.shangjia='是' AND (d.caipinmingcheng LIKE ? OR d.cailiao LIKE ?)
    ORDER BY d.yueshuxiao DESC LIMIT 100`).all(schoolId, term, term);
  res.json({ code: 200, data: rows.map(normalize) });
});

router.get('/', (req, res) => {
  const schoolId = schoolScope(req);
  if (!schoolId) return res.status(400).json({ code: 400, message: '请选择有效学校' });
  const clauses = ['d.school_id=?'];
  const params = [schoolId];
  if (req.query.category) { clauses.push('d.caipinfenlei=?'); params.push(String(req.query.category).slice(0, 50)); }
  if (req.query.q) { clauses.push('(d.caipinmingcheng LIKE ? OR d.cailiao LIKE ?)'); const q = `%${String(req.query.q).slice(0, 80)}%`; params.push(q, q); }
  if (req.query.forSale !== 'all') clauses.push("d.shangjia='是'");
  const orderBy = req.query.sort === 'price' ? 'd.jiage ASC' : req.query.sort === 'rating' ? 'rating DESC' : 'monthlySales DESC,d.id';
  const rows = db.prepare(`${selectDish} WHERE ${clauses.join(' AND ')} ORDER BY ${orderBy} LIMIT 300`).all(...params);
  res.json({ code: 200, data: rows.map(normalize) });
});

router.get('/:id', (req, res) => {
  const schoolId = schoolScope(req);
  if (!schoolId) return res.status(400).json({ code: 400, message: '请选择有效学校' });
  const row = db.prepare(`${selectDish} WHERE d.id=? AND d.school_id=?`).get(req.params.id, schoolId);
  if (!row) return res.status(404).json({ code: 404, message: '菜品不存在' });
  res.json({ code: 200, data: normalize(row) });
});

router.post('/', requireAdmin, (req, res) => {
  const { name, category, price, ingredients = [], allergens = [], nutrition = {}, portionG = 300, image = '', forSale = true,
    campus = '', restaurant = '', priceUnit = '元/份', tasteTags = [], dietaryTags = [], spiceLevel = '',
    sourceName = '', sourceUrl = '', sourceDate = '', sourceKind = '', priceBasis = '', nutritionBasis = '' } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || name.length > 80 || typeof category !== 'string' || !category.trim() || category.length > 40) return res.status(400).json({ code: 400, message: '菜品名称和分类为必填项' });
  if (!Number.isFinite(Number(price)) || Number(price) < 0 || Number(price) > 1000 || !Number.isInteger(Number(portionG)) || Number(portionG) < 1 || Number(portionG) > 5000) return res.status(400).json({ code: 400, message: '价格或份量格式无效' });
  if (!stringList(ingredients, 40) || !stringList(allergens, 20) || !stringList(tasteTags, 20) || !stringList(dietaryTags, 20) || typeof nutrition !== 'object' || Array.isArray(nutrition)) return res.status(400).json({ code: 400, message: '菜品营养或食材信息格式无效' });
  db.prepare('INSERT OR IGNORE INTO caipinfenlei(caipinfenlei) VALUES(?)').run(category.trim());
  const nutritionText = `每份约 ${Number(nutrition.calories || 0)} kcal · 蛋白质 ${Number(nutrition.protein || 0)}g · 碳水 ${Number(nutrition.carbs || 0)}g · 脂肪 ${Number(nutrition.fat || 0)}g`;
  const result = db.prepare(`INSERT INTO caipinxinxi(caipinmingcheng,caipinfenlei,tupian,cailiao,guige,jiage,yingyang,yueshuxiao,pinfen,kucun,shangjia,school_id,
    ingredients_json,allergens_json,nutrition_json,portion_g,data_source,source_url,campus,restaurant_name,price_unit,taste_tags_json,dietary_tags_json,spice_level,source_date,source_kind,price_basis,nutrition_basis)
    VALUES(?,?,?,?,?,?,?,0,0,50,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(name.trim(), category.trim(), String(image).slice(0,500), ingredients.join('，'), `${portionG}g/份`, Number(price), nutritionText,
    forSale ? '是' : '否', req.user.schoolId, JSON.stringify(ingredients), JSON.stringify(allergens), JSON.stringify(nutrition), Number(portionG), String(sourceName).slice(0,160), String(sourceUrl).slice(0,1000),
    String(campus).slice(0,100), String(restaurant).slice(0,160), String(priceUnit).slice(0,20), JSON.stringify(tasteTags), JSON.stringify(dietaryTags), String(spiceLevel).slice(0,40),
    String(sourceDate).slice(0,40), String(sourceKind).slice(0,80), String(priceBasis).slice(0,200), String(nutritionBasis || nutrition.basis || '').slice(0,500));
  db.prepare('UPDATE caipinxinxi SET kucun=?,window_name=? WHERE id=?').run(Number.isSafeInteger(Number(req.body.stock))&&Number(req.body.stock)>=0?Math.min(100000,Number(req.body.stock)):50,String(req.body.window||category+'窗口').slice(0,80),result.lastInsertRowid);
  res.status(201).json({ code: 200, message: '菜品添加成功', data: { id: result.lastInsertRowid } });
});

router.put('/:id', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM caipinxinxi WHERE id=? AND school_id=?').get(req.params.id, req.user.schoolId);
  if (!row) return res.status(404).json({ code: 404, message: '菜品不存在' });
  const body = req.body || {};
  const name = body.name === undefined ? row.caipinmingcheng : String(body.name).trim();
  const category = body.category === undefined ? row.caipinfenlei : String(body.category).trim();
  const price = body.price === undefined ? Number(row.jiage) : Number(body.price);
  const stock = body.stock === undefined ? Number(row.kucun) : Number(body.stock);
  const portion = body.portionG === undefined ? Number(row.portion_g) : Number(body.portionG);
  if (!name || name.length > 80 || !category || category.length > 40 || !Number.isFinite(price) || price < 0 || price > 1000 || !Number.isInteger(stock) || stock < 0 || stock > 100000 || !Number.isInteger(portion) || portion < 1 || portion > 5000) return res.status(400).json({ code: 400, message: '菜品字段格式无效' });
  const ingredients = body.ingredients ?? json(row.ingredients_json, []), allergens = body.allergens ?? json(row.allergens_json, []), nutrition = body.nutrition ?? json(row.nutrition_json, {});
  const tasteTags = body.tasteTags ?? json(row.taste_tags_json, []), dietaryTags = body.dietaryTags ?? json(row.dietary_tags_json, []);
  if (!stringList(ingredients, 40) || !stringList(allergens, 20) || !stringList(tasteTags, 20) || !stringList(dietaryTags, 20) || typeof nutrition !== 'object' || Array.isArray(nutrition)) return res.status(400).json({ code: 400, message: '菜品元信息格式无效' });
  db.prepare('INSERT OR IGNORE INTO caipinfenlei(caipinfenlei) VALUES(?)').run(category);
  const text = `每份约 ${Number(nutrition.calories || 0)} kcal · 蛋白质 ${Number(nutrition.protein || 0)}g · 碳水 ${Number(nutrition.carbs || 0)}g · 脂肪 ${Number(nutrition.fat || 0)}g`;
  db.prepare(`UPDATE caipinxinxi SET caipinmingcheng=?,caipinfenlei=?,tupian=?,cailiao=?,guige=?,jiage=?,yingyang=?,kucun=?,shangjia=?,ingredients_json=?,allergens_json=?,nutrition_json=?,portion_g=?,
    campus=?,restaurant_name=?,price_unit=?,taste_tags_json=?,dietary_tags_json=?,spice_level=?,data_source=?,source_url=?,source_date=?,source_kind=?,price_basis=?,nutrition_basis=?
    WHERE id=? AND school_id=?`).run(name, category, body.image ?? row.tupian, ingredients.join('，'), `${portion}g/份`, price, text, stock,
    body.forSale === undefined ? row.shangjia : body.forSale ? '是' : '否', JSON.stringify(ingredients), JSON.stringify(allergens), JSON.stringify(nutrition), portion,
    body.campus ?? row.campus, body.restaurant ?? row.restaurant_name, body.priceUnit ?? row.price_unit, JSON.stringify(tasteTags), JSON.stringify(dietaryTags), body.spiceLevel ?? row.spice_level,
    body.sourceName ?? row.data_source, body.sourceUrl ?? row.source_url, body.sourceDate ?? row.source_date, body.sourceKind ?? row.source_kind,
    body.priceBasis ?? row.price_basis, body.nutritionBasis ?? row.nutrition_basis, req.params.id, req.user.schoolId);
  if(body.window!==undefined)db.prepare('UPDATE caipinxinxi SET window_name=? WHERE id=? AND school_id=?').run(String(body.window).slice(0,80),req.params.id,req.user.schoolId);
  res.json({ code: 200, message: '菜品修改成功' });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const result = db.prepare("UPDATE caipinxinxi SET shangjia='否' WHERE id=? AND school_id=?").run(req.params.id, req.user.schoolId);
  if (!result.changes) return res.status(404).json({ code: 404, message: '菜品不存在' });
  res.json({ code: 200, message: '菜品已下架' });
});

export default router;
