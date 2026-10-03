import express from 'express';
import { db } from '../database.js';
import { config } from '../config.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();
const getSchool = req => req.user?.schoolId || String(req.body?.schoolId || req.query.schoolId || 'cufe');
const validSchool = id => Boolean(db.prepare('SELECT 1 FROM universities WHERE id=?').get(id));
const json = (value, fallback = []) => { try { return JSON.parse(value || ''); } catch { return fallback; } };

const tools = [
  { type: 'function', function: { name: 'search_menu', description: '按学校查询在售菜品、参考价格、食材、过敏原和营养估算。', parameters: { type: 'object', properties: { query: { type: 'string' }, category: { type: 'string' }, maxPrice: { type: 'number' }, excludeIngredients: { type: 'array', items: { type: 'string' } }, limit: { type: 'integer', minimum: 1, maximum: 12 } }, required: [] } } },
  { type: 'function', function: { name: 'list_restaurants', description: '查询学校餐厅、当前排队记录、营业时间和可用座位统计。', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'list_activities_and_culture', description: '查询学校已发布的活动和文创商品。', parameters: { type: 'object', properties: { kind: { type: 'string', enum: ['activities', 'culture', 'all'] } }, required: [] } } },
  { type: 'function', function: { name: 'list_my_orders', description: '查询当前登录学生在本校的近期订单；仅可用于当前用户本人。', parameters: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 20 } }, required: [] } } }
];

function runTool(name, args, schoolId, userId) {
  if (name === 'search_menu') {
    const clauses = ["school_id=?", "shangjia='是'"]; const values = [schoolId];
    if (args.query) { clauses.push('(caipinmingcheng LIKE ? OR cailiao LIKE ?)'); const q = `%${String(args.query).slice(0, 60)}%`; values.push(q, q); }
    if (args.category) { clauses.push('caipinfenlei=?'); values.push(String(args.category).slice(0, 40)); }
    if (Number.isFinite(Number(args.maxPrice))) { clauses.push('jiage<=?'); values.push(Number(args.maxPrice)); }
    const rows = db.prepare(`SELECT id,caipinmingcheng AS name,caipinfenlei AS category,jiage AS referencePrice,cailiao AS ingredientsText,
      ingredients_json AS ingredientsJson,allergens_json AS allergensJson,nutrition_json AS nutritionJson,portion_g AS portionG,data_source AS sourceName,source_url AS sourceUrl,
      campus,restaurant_name AS restaurant,price_unit AS priceUnit,taste_tags_json AS tasteTagsJson,dietary_tags_json AS dietaryTagsJson,spice_level AS spiceLevel,
      source_date AS sourceDate,source_kind AS sourceKind,price_basis AS priceBasis,nutrition_basis AS nutritionBasis
      FROM caipinxinxi WHERE ${clauses.join(' AND ')} ORDER BY jiage ASC LIMIT ?`).all(...values, Math.max(1, Math.min(12, Number(args.limit) || 8)));
    const excluded = (Array.isArray(args.excludeIngredients) ? args.excludeIngredients : []).map(String);
    return rows.map(row => ({ ...row, referencePrice: Number(row.referencePrice), ingredients: json(row.ingredientsJson), allergens: json(row.allergensJson),
      nutritionEstimate: json(row.nutritionJson, {}), tasteTags: json(row.tasteTagsJson), dietaryTags: json(row.dietaryTagsJson),
      excludeMatch: excluded.filter(term => `${row.name} ${row.ingredientsText}`.includes(term)) }))
      .filter(row => !row.excludeMatch.length)
      .map(({ ingredientsJson, allergensJson, nutritionJson, tasteTagsJson, dietaryTagsJson, ingredientsText, ...row }) => ({ ...row, ingredientsText }));
  }
  if (name === 'list_restaurants') {
    return db.prepare(`SELECT r.campus,r.name,r.category,r.description,r.opening_hours AS openingHours,r.queue_count AS queueCount,
      r.queue_minutes AS queueMinutes, SUM(CASE WHEN rs.status='available' AND sr.id IS NULL THEN 1 ELSE 0 END) AS availableSeats
      FROM restaurants r LEFT JOIN restaurant_seats rs ON rs.restaurant_id=r.id
      LEFT JOIN seat_reservations sr ON sr.seat_id=rs.id AND sr.status='confirmed' AND sr.ends_at>datetime('now')
      WHERE r.school_id=? GROUP BY r.id ORDER BY r.campus,r.name`).all(schoolId);
  }
  if (name === 'list_activities_and_culture') {
    const kind = args.kind || 'all'; const result = {};
    if (kind === 'all' || kind === 'activities') result.activities = db.prepare(`SELECT title,description,category,campus,starts_at AS startsAt,ends_at AS endsAt,location,source_name AS sourceName,source_url AS sourceUrl
      FROM activities WHERE school_id=? AND status='published' ORDER BY starts_at DESC LIMIT 20`).all(schoolId);
    if (kind === 'all' || kind === 'culture') result.culture = db.prepare(`SELECT title,category,description,price,campus,source_name AS sourceName,source_url AS sourceUrl
      FROM cultural_items WHERE school_id=? AND status='published' ORDER BY id DESC LIMIT 20`).all(schoolId);
    return result;
  }
  if (name === 'list_my_orders') {
    if (!userId) return { error: '需要先登录才能查询个人订单。' };
    return db.prepare(`SELECT orderid,caipinmingcheng AS dish,status,buyshu AS quantity,total,addtime AS createdAt
      FROM orders WHERE userid=? AND school_id=? ORDER BY addtime DESC LIMIT ?`).all(userId, schoolId, Math.max(1, Math.min(20, Number(args.limit) || 10)));
  }
  return { error: '未知查询工具' };
}

function localAnswer(message, schoolId, userId) {
  const school = db.prepare('SELECT name FROM universities WHERE id=?').get(schoolId)?.name || '本校';
  if (/订单/.test(message)) { const result=runTool('list_my_orders',{},schoolId,userId);return Array.isArray(result)?(result.length?result.map(o=>`${o.orderid} · ${o.dish} × ${o.quantity} · ${o.status}`).join('\n'):'暂无个人订单'):result.error; }
  if (/排队|餐厅|食堂|座位/.test(message)) {
    const rows = runTool('list_restaurants', {}, schoolId);
    return rows.length ? `${school}餐厅信息：\n${rows.map(r => `• ${r.campus}·${r.name}：排队约 ${r.queueMinutes} 分钟（${r.queueCount} 人），当前可用座位 ${r.availableSeats} 个；营业时间 ${r.openingHours}`).join('\n')}` : '当前没有可查询的餐厅记录。';
  }
  if (/活动|文创|周边/.test(message)) {
    const result = runTool('list_activities_and_culture', { kind: 'all' }, schoolId);
    const lines = [...(result.activities || []).map(x => `活动：${x.title}（${x.campus}，${x.startsAt}）`), ...(result.culture || []).map(x => `文创：${x.title}，参考价 ¥${x.price}`)];
    return lines.length ? lines.join('\n') : '当前没有可查询的活动或文创记录。';
  }
  const candidates = runTool('search_menu', { query: /便宜|实惠|价格/.test(message) ? '' : message.replace(/推荐|好吃|吃什么|菜品|菜|来点|帮我|一下/g, '').trim(), limit: 6 }, schoolId);
  const rows = candidates.length ? candidates : runTool('search_menu', { limit: 6 }, schoolId);
  if (/推荐|吃什么|好吃|菜|吃/.test(message) && rows.length) return `根据${school}当前菜单，以下是可选菜品（价格和营养值按目录参考）：\n${rows.map(x => `• ${x.name}（${x.category}）¥${x.referencePrice} / ${x.portionG}g，营养估算 ${x.nutritionEstimate.calories || '—'} kcal`).join('\n')}`;
  return `我是校园餐饮助手，可帮你查 ${school} 的在售菜品、餐厅排队、活动、文创商品${userId ? '和个人订单' : ''}。你可以直接告诉我想查询的内容。`;
}

async function callModel(messages, schoolId, userId) {
  const school = db.prepare('SELECT name FROM universities WHERE id=?').get(schoolId)?.name;
  const request = { model: config.aiModel, temperature: 0.2, messages: [{ role: 'system', content: `你是校园餐饮服务助手。当前学校是${school}。涉及菜单、价格、餐厅、排队、活动、文创和订单的信息必须使用查询工具；只依据工具结果回答，不得编造。不得声称已下单、付款或预约；本接口只提供查询与建议。营养信息是估算值，不做诊断或治疗建议。用简洁中文回答。` }, ...messages], tools, tool_choice: 'auto' };
  for (let turn = 0; turn < 4; turn++) {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), config.aiTimeoutMs);
    let response;
    try {
      response = await fetch(`${config.aiBaseUrl}/chat/completions`, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.aiApiKey}` }, body: JSON.stringify(request) });
    } finally { clearTimeout(timeout); }
    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const payload = await response.json(); const choice = payload.choices?.[0];
    if (!choice) throw new Error('AI provider returned an empty response');
    request.messages.push(choice.message);
    const calls = choice.message.tool_calls || [];
    if (!calls.length) return String(choice.message.content || '').trim();
    for (const call of calls) {
      let args = {}; try { args = JSON.parse(call.function.arguments || '{}'); } catch { /* malformed provider arguments */ }
      const result = runTool(call.function.name, args, schoolId, userId);
      request.messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
  return '已根据当前查询结果整理信息，请缩小问题范围后再试。';
}

router.post('/chat', optionalAuth, (req, res) => {
  const message = String(req.body?.message || '').trim(); const schoolId = getSchool(req);
  if (!message || message.length > 2000) return res.status(400).json({ code: 400, message: '消息长度应为 1 至 2000 字' });
  if (!validSchool(schoolId)) return res.status(400).json({ code: 400, message: '请选择有效学校' });
  if (!(config.aiBaseUrl && config.aiApiKey && config.aiModel)) return res.json({ code: 200, reply: localAnswer(message, schoolId, req.user?.id), mode: 'database' });
  callModel([...(Array.isArray(req.body.history)?req.body.history:[]).filter(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-8).map(m=>({role:m.role,content:m.content.slice(0,2000)})),{ role: 'user', content: message }], schoolId, req.user?.id).then(reply => res.json({ code: 200, reply, mode: 'agent' })).catch(error => {
    console.error('AI provider error:', error.message);
    res.status(502).json({ code: 502, message: '智能服务暂时不可用，请稍后重试' });
  });
});

router.post('/analyze-nutrition', optionalAuth, (req, res) => {
  const schoolId = getSchool(req);
  if (!validSchool(schoolId)) return res.status(400).json({ code: 400, message: '请选择有效学校' });
  const goals = Array.isArray(req.body?.goals) ? req.body.goals.map(String).slice(0, 10) : [];
  const tastes = Array.isArray(req.body?.tastes) ? req.body.tastes.map(String).slice(0, 20) : [];
  const ingredients = Array.isArray(req.body?.ingredients) ? req.body.ingredients.map(String).slice(0, 30) : [];
  const dishes = runTool('search_menu', { excludeIngredients: ingredients, limit: 8 }, schoolId);
  if (!dishes.length) return res.json({ code: 200, report: '当前菜单中没有符合所选忌口条件的菜品。可调整筛选条件后再次生成。' });
  const data = dishes.map(d => `- ${d.name}｜${d.category}｜参考价 ¥${d.referencePrice}｜份量 ${d.portionG}g｜营养估算 ${d.nutritionEstimate.calories || '—'} kcal，蛋白质 ${d.nutritionEstimate.protein || '—'}g｜食材 ${d.ingredients.join('、')}｜过敏原 ${d.allergens.join('、') || '未标注'}`).join('\n');
  const report = `# 个性化膳食参考\n\n目标：${goals.join('、') || '日常均衡'}  \n口味偏好：${tastes.join('、') || '未设置'}  \n忌口：${ingredients.join('、') || '未设置'}\n\n## 菜品选择\n${data}\n\n以上营养数值为每份估算值，具体摄入请结合实际份量及个人情况判断。`;
  if (!(config.aiBaseUrl && config.aiApiKey && config.aiModel)) return res.json({ code: 200, report, mode: 'database' });
  callModel([{ role: 'user', content: `请只基于这些学校菜单记录，为学生给出简短、审慎的膳食搭配建议。目标=${goals.join('、')}；口味=${tastes.join('、')}；忌口=${ingredients.join('、')}。菜单数据：\n${data}\n明确说明营养值为估算，不能做医疗诊断。` }], schoolId, req.user?.id)
    .then(text => res.json({ code: 200, report: text, mode: 'agent' }))
    .catch(error => { console.error('Nutrition agent error:', error.message); res.status(502).json({ code: 502, message: '营养分析暂时不可用，请稍后重试' }); });
});

export default router;
