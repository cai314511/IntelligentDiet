# 阶段 1「链路闭环」实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 打通「注册/登录 → 浏览菜品 → 购物车 → 下单 → 余额支付 → 取餐码 → B 端接单/叫号/核销 → C 端实时感知」的完整就餐闭环。

**Architecture:** 保持现有技术栈不做框架迁移。后端 Express + better-sqlite3，拆分 `app.js`（可测试）与 `server.js`（启动），新增 JWT 鉴权、订单状态机、事务化支付/核销接口；C 端以 `zhixiang.html` 为壳拆分为 `index.html + app.css + app.js`，内嵌 mock 数据替换为真实 API（API 数据映射回原有 `DB` 对象结构，下游 UI 代码零改动）；B 端补登录与接单/叫号/核销操作流。

**Tech Stack:** Node.js (ESM) + Express 4 + better-sqlite3 + bcryptjs + jsonwebtoken + node:test + supertest；前端原生 HTML/CSS/JS + Tailwind CDN。

**Spec:** `docs/superpowers/specs/2026-07-30-zhixiang-canteen-fullstack-redesign-design.md`

## Global Constraints

- 所有数据库字段沿用现有拼音命名（如 `caipinmingcheng`、`kucun`、`jine`）。
- 后端统一响应格式：成功 `{code: 200, ...}`，失败 `{code: 4xx/5xx, message}` + 对应 HTTP 状态码。
- 订单状态机（唯一合法值）：`未支付 → 已支付 → 制作中 → 待取餐 → 已完成`；分支：`未支付→已取消`、`已支付→已退款`。
- 密码哈希用 **bcryptjs**（纯 JS，Windows 免编译，禁止用 bcrypt 原生包）；同步 API（`hashSync`/`compareSync`）。
- JWT 密钥读 `process.env.JWT_SECRET`，缺省降级为 `'zhixiang-dev-secret'` 并打印警告。
- 后端测试用 `node:test` + `supertest`，测试库通过 `DB_PATH` 环境变量指向临时文件，禁止污染 `data/zhixiang.db`。
- 前端零构建：新文件用 `<script src>` 引入，禁止引入 npm/打包器。
- 前端 API 基地址统一为 `http://localhost:5000/api`，集中在 `api.js` 一处定义。
- 每个 Task 完成后按步骤提交 git commit（仓库根：`zhixiang/`）。
- 工作目录：所有相对路径基于 `zhixiang/`。

---

### Task 1: 后端测试基建与 app 拆分

**Files:**
- Create: `server/app.js`
- Modify: `server/server.js`（整体替换）
- Modify: `server/database.js:6-8`（DB_PATH 支持）
- Modify: `server/package.json:7-11`（scripts）
- Test: `server/tests/health.test.js`

**Interfaces:**
- Consumes: 现有全部路由模块（不改动）。
- Produces: `server/app.js` 默认导出 express `app`（供 supertest 与 server.js 共用）；`process.env.DB_PATH` 可覆盖数据库路径；`npm test` 运行 `node --test tests/`。

- [ ] **Step 1: 安装依赖**

```bash
cd server && npm install bcryptjs jsonwebtoken && npm install -D supertest
```

- [ ] **Step 2: 修改 `server/database.js` 支持 DB_PATH**

将第 6-8 行：

```js
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(__dirname, 'data');
const dbPath = path.join(dbDir, 'zhixiang.db');
```

替换为：

```js
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(__dirname, 'data');
const dbPath = process.env.DB_PATH || path.join(dbDir, 'zhixiang.db');
```

并将第 10-13 行的目录确保逻辑替换为（保证自定义 DB_PATH 的父目录也存在）：

```js
// 确保数据库目录存在
const dbParentDir = path.dirname(dbPath);
if (!fs.existsSync(dbParentDir)) {
  fs.mkdirSync(dbParentDir, { recursive: true });
}
```

- [ ] **Step 3: 创建 `server/app.js`（从 server.js 抽出，CORS 白名单放宽，导出 app）**

```js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { initDatabase } from './database.js';
import dishRoutes from './routes/dishes.js';
import restaurantRoutes from './routes/restaurants.js';
import userRoutes from './routes/users.js';
import orderRoutes from './routes/orders.js';
import recipeRoutes from './routes/recipes.js';
import socialRoutes from './routes/social.js';
import activityRoutes from './routes/activities.js';
import aiRoutes from './routes/ai.js';

// 加载环境配置
dotenv.config();

const app = express();

// CORS：允许 C 端(8000) 与 B 端(8000/5500/3000 等本地端口) 访问
const allowedOrigins = (process.env.CORS_ORIGIN ||
  'http://localhost:8000,http://127.0.0.1:8000,http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000'
).split(',');

app.use(cors({
  origin: (origin, callback) => {
    // 无 origin（同源/curl/服务器间调用）直接放行
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS 拦截: ${origin}`));
  },
  credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// 初始化数据库
initDatabase();

// API路由
app.use('/api/dishes', dishRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/ai', aiRoutes);

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '智饷食堂API服务正常运行' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('API错误:', err);
  res.status(500).json({
    code: 500,
    error: '服务器内部错误',
    message: err.message
  });
});

export default app;
```

- [ ] **Step 4: 整体替换 `server/server.js` 为纯启动入口**

```js
import app from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 智饷食堂API服务已启动`);
  console.log(`📍 监听地址: http://localhost:${PORT}`);
  console.log(`🔗 API文档: http://localhost:${PORT}/api/health\n`);
});
```

- [ ] **Step 5: 写失败测试 `server/tests/health.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.DB_PATH = ':memory:';
const { default: app } = await import('../app.js');

test('GET /api/health 返回 ok', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});
```

注意：`DB_PATH=':memory:'` 时 better-sqlite3 直接使用内存库，`path.dirname(':memory:')` 返回 `'.'`，目录确保逻辑安全。

- [ ] **Step 6: 修改 `server/package.json` scripts 并跑测试**

`"scripts"` 替换为：

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "init-db": "node scripts/initDatabase.js",
  "test": "node --test tests/",
  "smoke": "node scripts/smoke.js"
},
```

Run: `cd server && npm test`
Expected: 1 个测试 PASS（`smoke` 脚本此时不存在属正常，Task 7 创建）。

- [ ] **Step 7: 验证真实服务仍能启动**

Run: `cd server && npm start`，另开终端 `curl http://localhost:5000/api/health`
Expected: 返回 `{"status":"ok",...}`；Ctrl+C 停止。

- [ ] **Step 8: Commit**

```bash
git add server/
git commit -m "refactor(server): 拆分 app.js 支持测试，DB_PATH 可配，放宽 CORS 白名单"
```

---

### Task 2: 数据库迁移（pickup_code / role / shangjia + 密码哈希）

**Files:**
- Modify: `server/database.js`（initDatabase 内追加幂等迁移）
- Modify: `server/scripts/initDatabase.js:93-132`（种子用户密码哈希 + role）
- Test: `server/tests/migration.test.js`

**Interfaces:**
- Consumes: Task 1 的 app/测试基建；`bcryptjs`。
- Produces: `orders.pickup_code TEXT`（可空）；`yonghu.role TEXT DEFAULT 'user'`；`caipinxinxi.shangjia TEXT DEFAULT '是'`；数据库中所有明文密码自动迁移为 bcrypt 哈希（幂等）；后续 Task 依赖这三个列与 `role='admin'` 的 admin 账号。

- [ ] **Step 1: 写失败测试 `server/tests/migration.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
const { db, initDatabase } = await import('../database.js');

test('迁移后 orders 有 pickup_code 列，yonghu 有 role 列，caipinxinxi 有 shangjia 列', () => {
  initDatabase();
  const orderCols = db.prepare("PRAGMA table_info(orders)").all().map(c => c.name);
  const userCols = db.prepare("PRAGMA table_info(yonghu)").all().map(c => c.name);
  const dishCols = db.prepare("PRAGMA table_info(caipinxinxi)").all().map(c => c.name);
  assert.ok(orderCols.includes('pickup_code'));
  assert.ok(userCols.includes('role'));
  assert.ok(dishCols.includes('shangjia'));
});

test('明文密码被自动哈希（幂等）', () => {
  initDatabase();
  db.prepare("INSERT INTO yonghu (zhanghao, mima, xingming) VALUES ('t1', 'plain123', '测试')").run();
  initDatabase(); // 第二次调用触发迁移且不得重复哈希
  const u = db.prepare("SELECT mima FROM yonghu WHERE zhanghao = 't1'").get();
  assert.ok(u.mima.startsWith('$2'), '密码应已被 bcrypt 哈希');
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd server && npm test`
Expected: migration.test.js 两个用例 FAIL（列不存在）。

- [ ] **Step 3: 在 `server/database.js` 的 `initDatabase()` 内（`db.exec(...)` 之后、`console.log` 之前）追加幂等迁移**

文件顶部 import 区追加：

```js
import bcrypt from 'bcryptjs';
```

`initDatabase()` 内 `db.exec(...)` 之后追加：

```js
  // ---- 幂等列迁移（重复执行安全）----
  const addColumn = (table, column, ddl) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
    if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  };
  addColumn('orders', 'pickup_code', 'pickup_code TEXT');
  addColumn('yonghu', 'role', "role TEXT DEFAULT 'user'");
  addColumn('caipinxinxi', 'shangjia', "shangjia TEXT DEFAULT '是'");

  // admin 账号角色修正
  db.prepare("UPDATE yonghu SET role = 'admin' WHERE zhanghao = 'admin'").run();

  // ---- 明文密码迁移为 bcrypt（幂等：已哈希的以 $2 开头，跳过）----
  const plaintextUsers = db.prepare("SELECT id, mima FROM yonghu WHERE mima NOT LIKE '$2%'").all();
  const updatePwd = db.prepare('UPDATE yonghu SET mima = ? WHERE id = ?');
  for (const u of plaintextUsers) {
    updatePwd.run(bcrypt.hashSync(u.mima, 10), u.id);
  }
```

- [ ] **Step 4: 修改 `server/scripts/initDatabase.js` 种子逻辑**

文件顶部追加 `import bcrypt from 'bcryptjs';`。

将第 95-131 行的 `insertUser` 定义与三次调用替换为（密码哈希 + role 列）：

```js
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO yonghu (zhanghao, mima, xingming, touxiang, xingbie, lianxifangshi, jine, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run('student1', bcrypt.hashSync('password123', 10), '张三',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80',
      '男', '13800138000', 5000.00, 'user');

    insertUser.run('student2', bcrypt.hashSync('password123', 10), '种菜闪餐小队长',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80',
      '女', '13900139000', 10000.00, 'user');

    insertUser.run('admin', bcrypt.hashSync('admin123', 10), '后勤处管理员',
      '', '男', '13500135000', 99999.00, 'admin');
```

- [ ] **Step 5: 跑测试确认通过 + 对真实库做迁移**

Run: `cd server && npm test && npm start`（启动即触发迁移），随后 `curl http://localhost:5000/api/health`
Expected: 测试全 PASS；服务正常启动无报错。Ctrl+C 停止。

- [ ] **Step 6: Commit**

```bash
git add server/
git commit -m "feat(server): 订单取餐码/用户角色/菜品上架列迁移，密码 bcrypt 哈希化"
```

---

### Task 3: JWT 认证与接口保护

**Files:**
- Create: `server/middleware/auth.js`
- Modify: `server/routes/users.js`（登录/注册用 bcrypt+jwt，响应带 role）
- Modify: `server/routes/dishes.js:79,104,128`（写接口加 requireAdmin）
- Modify: `server/routes/orders.js`（写接口/管理查询加鉴权）
- Modify: `server/routes/social.js:53,89,109`（发帖需登录，回复需 admin）
- Test: `server/tests/auth.test.js`

**Interfaces:**
- Consumes: Task 2 的 `role` 列与哈希密码。
- Produces:
  - `requireAuth(req,res,next)`：校验 `Authorization: Bearer <jwt>`，注入 `req.user = {id, zhanghao, role}`；失败 401 `{code:401, message:'未登录或登录已过期'}`。
  - `requireAdmin(req,res,next)`：在 requireAuth 基础上要求 `role==='admin'`，否则 403 `{code:403, message:'需要管理员权限'}`。
  - 登录/注册响应 `data: {token, user}`，其中 `user` 含 `role` 字段。

- [ ] **Step 1: 写失败测试 `server/tests/auth.test.js`**

```js
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.DB_PATH = ':memory:';
const { db } = await import('../database.js');
const { default: app } = await import('../app.js');
const bcrypt = (await import('bcryptjs')).default;

let userToken, adminToken;

before(async () => {
  db.prepare("INSERT INTO yonghu (zhanghao, mima, xingming, jine, role) VALUES ('u1', ?, '用户一', 100, 'user')")
    .run(bcrypt.hashSync('pw123456', 10));
  db.prepare("INSERT INTO yonghu (zhanghao, mima, xingming, jine, role) VALUES ('boss', ?, '老板', 0, 'admin')")
    .run(bcrypt.hashSync('boss123', 10));
});

test('正确密码登录返回 token 和 role', async () => {
  const res = await request(app).post('/api/users/login').send({ zhanghao: 'u1', mima: 'pw123456' });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.token);
  assert.equal(res.body.data.user.role, 'user');
  userToken = res.body.data.token;
});

test('错误密码登录返回 401', async () => {
  const res = await request(app).post('/api/users/login').send({ zhanghao: 'u1', mima: 'wrong' });
  assert.equal(res.status, 401);
});

test('无 token 调用受保护接口返回 401', async () => {
  const res = await request(app).post('/api/dishes').send({ caipinmingcheng: 'x', caipinfenlei: '热菜', jiage: 1 });
  assert.equal(res.status, 401);
});

test('普通用户调用管理员接口返回 403，admin 放行', async () => {
  const noPerm = await request(app).post('/api/dishes')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ caipinmingcheng: 'x', caipinfenlei: '热菜', jiage: 1 });
  assert.equal(noPerm.status, 403);

  const login = await request(app).post('/api/users/login').send({ zhanghao: 'boss', mima: 'boss123' });
  adminToken = login.body.data.token;
  const ok = await request(app).post('/api/dishes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ caipinmingcheng: '测试菜', caipinfenlei: '热菜', jiage: 9.9 });
  assert.equal(ok.status, 200);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd server && npm test`
Expected: auth.test.js 多个用例 FAIL（登录 401 因明文比对失败、保护接口不存在的 401/403）。

- [ ] **Step 3: 创建 `server/middleware/auth.js`**

```js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'zhixiang-dev-secret';
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ 未配置 JWT_SECRET，使用开发默认密钥（生产环境请务必配置）');
}

export function signToken(user) {
  return jwt.sign(
    { id: user.id, zhanghao: user.zhanghao, role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ code: 401, message: '未登录或登录已过期' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ code: 401, message: '未登录或登录已过期' });
  }
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '需要管理员权限' });
    }
    next();
  });
}
```

- [ ] **Step 4: 改造 `server/routes/users.js`**

顶部追加：

```js
import bcrypt from 'bcryptjs';
import { signToken, requireAuth } from '../middleware/auth.js';
```

登录处理（第 7-36 行整个 `router.post('/login', ...)`）替换为：

```js
// 用户登录
router.post('/login', (req, res) => {
  try {
    const { zhanghao, mima } = req.body;

    if (!zhanghao || !mima) {
      return res.status(400).json({ code: 400, message: '账号和密码不能为空' });
    }

    const user = db.prepare(`
      SELECT id, zhanghao, mima, xingming, touxiang, lianxifangshi, jine, role
      FROM yonghu 
      WHERE zhanghao = ?
    `).get(zhanghao);

    if (!user || !bcrypt.compareSync(mima, user.mima)) {
      return res.status(401).json({ code: 401, message: '账号或密码错误' });
    }

    const token = signToken(user);
    const { mima: _omit, ...safeUser } = user;

    res.json({
      code: 200,
      message: '登录成功',
      data: { token, user: safeUser }
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});
```

注册处理中（第 53-56 行）INSERT 改为哈希密码：

```js
    const result = db.prepare(`
      INSERT INTO yonghu (zhanghao, mima, xingming, lianxifangshi, jine, role)
      VALUES (?, ?, ?, ?, 10000, 'user')
    `).run(zhanghao, bcrypt.hashSync(mima, 10), xingming, lianxifangshi || '');
```

`router.put('/:id', ...)`（第 88 行）加鉴权且仅本人可改——将路由声明行改为：

```js
router.put('/:id', requireAuth, (req, res) => {
```

并在 try 块开头追加：

```js
    if (req.user.id !== Number(req.params.id) && req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '只能修改本人资料' });
    }
```

- [ ] **Step 5: 保护 dishes / orders / social 写接口**

`server/routes/dishes.js` 顶部追加 `import { requireAdmin } from '../middleware/auth.js';`，三处路由声明改为：

```js
router.post('/', requireAdmin, (req, res) => {
```
```js
router.put('/:id', requireAdmin, (req, res) => {
```
```js
router.delete('/:id', requireAdmin, (req, res) => {
```

`server/routes/orders.js` 顶部追加 `import { requireAuth, requireAdmin } from '../middleware/auth.js';`，路由声明改为：

```js
router.get('/', requireAdmin, (req, res) => {          // 全量订单仅 admin
router.post('/', requireAuth, (req, res) => {           // 下单需登录
router.get('/user/:userid', requireAuth, (req, res) => {
router.get('/:orderid', requireAuth, (req, res) => {
router.put('/:orderid/status', requireAdmin, (req, res) => {
```

`server/routes/social.js` 顶部追加 `import { requireAuth, requireAdmin } from '../middleware/auth.js';`，三处改为：

```js
router.post('/reviews', requireAuth, (req, res) => {
router.post('/messages', requireAuth, (req, res) => {
router.put('/messages/:id/reply', requireAdmin, (req, res) => {
```

注意：`orders.js` 中 `GET /user/:userid` 必须保持在 `GET /:orderid` 之前注册（现有顺序已满足，勿调换）。

- [ ] **Step 6: 跑全部测试确认通过**

Run: `cd server && npm test`
Expected: health / migration / auth 全部 PASS。

- [ ] **Step 7: 真实库回归验证**

Run: `cd server && npm start`，另开终端：

```bash
curl -s -X POST http://localhost:5000/api/users/login -H "Content-Type: application/json" -d '{"zhanghao":"admin","mima":"admin123"}'
```

Expected: 返回 `code:200`，`data.user.role` 为 `"admin"`，含 token。Ctrl+C 停止服务。

- [ ] **Step 8: Commit**

```bash
git add server/
git commit -m "feat(server): JWT 鉴权中间件，bcrypt 登录注册，写接口权限保护"
```

---

### Task 4: 订单状态机与详情 404 修复

**Files:**
- Create: `server/utils/orderState.js`
- Modify: `server/routes/orders.js:89-122`
- Test: `server/tests/orderState.test.js`

**Interfaces:**
- Consumes: Task 3 的 `requireAdmin`。
- Produces:
  - `ORDER_STATUS = ['未支付','已支付','制作中','待取餐','已完成','已取消','已退款']`
  - `ALLOWED_TRANSITIONS = { '未支付': ['已支付','已取消'], '已支付': ['制作中','已退款'], '制作中': ['待取餐'], '待取餐': ['已完成'], '已完成': [], '已取消': [], '已退款': [] }`
  - `canTransition(from, to): boolean`
  - `GET /api/orders/:orderid` 查不到返回 404 `{code:404, message:'订单不存在'}`。

- [ ] **Step 1: 写失败测试 `server/tests/orderState.test.js`**

```js
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.DB_PATH = ':memory:';
const { db } = await import('../database.js');
const { default: app } = await import('../app.js');
const { canTransition } = await import('../utils/orderState.js');
const bcrypt = (await import('bcryptjs')).default;

let adminToken;

before(async () => {
  db.prepare("INSERT INTO yonghu (id, zhanghao, mima, xingming, role) VALUES (1, 'boss', ?, '老板', 'admin')")
    .run(bcrypt.hashSync('boss123', 10));
  db.prepare("INSERT INTO caipinxinxi (id, caipinmingcheng, caipinfenlei, jiage, kucun) VALUES (1, '测试菜', '热菜', 10, 50)").run();
  db.prepare(`INSERT INTO orders (orderid, userid, caipinxinxiid, caipinmingcheng, buyshu, price, total, status)
              VALUES ('ORDER-T1', 1, 1, '测试菜', 1, 10, 10, '已支付')`).run();
  const login = await request(app).post('/api/users/login').send({ zhanghao: 'boss', mima: 'boss123' });
  adminToken = login.body.data.token;
});

test('canTransition 状态机规则', () => {
  assert.equal(canTransition('未支付', '已支付'), true);
  assert.equal(canTransition('已支付', '制作中'), true);
  assert.equal(canTransition('制作中', '待取餐'), true);
  assert.equal(canTransition('待取餐', '已完成'), true);
  assert.equal(canTransition('未支付', '已完成'), false);
  assert.equal(canTransition('已完成', '制作中'), false);
  assert.equal(canTransition('已支付', '已完成'), false);
});

test('非法状态流转返回 409', async () => {
  const res = await request(app).put('/api/orders/ORDER-T1/status')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: '已完成' }); // 已支付 不能直接到 已完成
  assert.equal(res.status, 409);
});

test('合法流转成功，不存在的订单返回 404', async () => {
  const ok = await request(app).put('/api/orders/ORDER-T1/status')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: '制作中' });
  assert.equal(ok.status, 200);

  const notFound = await request(app).put('/api/orders/ORDER-NOPE/status')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: '制作中' });
  assert.equal(notFound.status, 404);
});

test('GET /:orderid 查不到返回 404', async () => {
  const res = await request(app).get('/api/orders/ORDER-NOPE')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(res.status, 404);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd server && npm test`
Expected: orderState.test.js FAIL（`../utils/orderState.js` 不存在）。

- [ ] **Step 3: 创建 `server/utils/orderState.js`**

```js
// 订单状态机：唯一合法状态与流转规则
export const ORDER_STATUS = ['未支付', '已支付', '制作中', '待取餐', '已完成', '已取消', '已退款'];

export const ALLOWED_TRANSITIONS = {
  '未支付': ['已支付', '已取消'],
  '已支付': ['制作中', '已退款'],
  '制作中': ['待取餐'],
  '待取餐': ['已完成'],
  '已完成': [],
  '已取消': [],
  '已退款': []
};

export function canTransition(from, to) {
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}
```

- [ ] **Step 4: 修改 `server/routes/orders.js`**

顶部追加 `import { ORDER_STATUS, canTransition } from '../utils/orderState.js';`。

`GET /:orderid`（第 89-101 行）在查询后追加 404：

```js
    if (orders.length === 0) {
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }
```

`PUT /:orderid/status`（第 104-122 行整体）替换为：

```js
// 更新订单状态（管理员，状态机校验）
router.put('/:orderid/status', requireAdmin, (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !ORDER_STATUS.includes(status)) {
      return res.status(400).json({ code: 400, message: '非法的订单状态' });
    }

    const rows = db.prepare('SELECT DISTINCT status FROM orders WHERE orderid = ?').all(req.params.orderid);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    const current = rows[0].status;
    if (!canTransition(current, status)) {
      return res.status(409).json({ code: 409, message: `订单不能从「${current}」变更为「${status}」` });
    }

    db.prepare('UPDATE orders SET status = ? WHERE orderid = ?').run(status, req.params.orderid);

    res.json({ code: 200, message: '订单状态更新成功', data: { orderid: req.params.orderid, status } });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});
```

- [ ] **Step 5: 跑测试确认通过**

Run: `cd server && npm test`
Expected: 全部 PASS。

- [ ] **Step 6: Commit**

```bash
git add server/
git commit -m "feat(server): 订单状态机校验与订单详情 404"
```

---

### Task 5: 下单事务化与库存校验

**Files:**
- Modify: `server/routes/orders.js:22-70`（POST / 重写）
- Test: `server/tests/orderCreate.test.js`

**Interfaces:**
- Consumes: Task 3 的 `requireAuth`（`req.user.id` 作为下单用户，忽略 body 里的 userid 伪造）。
- Produces: `POST /api/orders` 请求体 `{items: [{dishId, quantity}], address?, phone?, remark?}`；响应 `data: {orderid, totalPrice}`；库存不足 409 `{code:409, message:'「菜名」库存不足（剩 X 份）'}`；事务保证部分失败不落脏数据。

- [ ] **Step 1: 写失败测试 `server/tests/orderCreate.test.js`**

```js
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.DB_PATH = ':memory:';
const { db } = await import('../database.js');
const { default: app } = await import('../app.js');
const bcrypt = (await import('bcryptjs')).default;

let token;

before(async () => {
  db.prepare("INSERT INTO yonghu (id, zhanghao, mima, xingming, jine) VALUES (1, 'u1', ?, '用户一', 100)")
    .run(bcrypt.hashSync('pw123456', 10));
  db.prepare("INSERT INTO caipinxinxi (id, caipinmingcheng, caipinfenlei, jiage, kucun) VALUES (1, '红烧肉', '热菜', 15, 2)").run();
  db.prepare("INSERT INTO caipinxinxi (id, caipinmingcheng, caipinfenlei, jiage, kucun) VALUES (2, '青菜', '素菜', 5, 100)").run();
  const login = await request(app).post('/api/users/login').send({ zhanghao: 'u1', mima: 'pw123456' });
  token = login.body.data.token;
});

test('正常下单成功并返回总价', async () => {
  const res = await request(app).post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({ items: [{ dishId: 2, quantity: 2 }], remark: '少辣' });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.orderid);
  assert.equal(res.body.data.totalPrice, 10);
});

test('库存不足返回 409 且不产生任何订单行', async () => {
  const res = await request(app).post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({ items: [{ dishId: 1, quantity: 5 }, { dishId: 2, quantity: 1 }] });
  assert.equal(res.status, 409);
  assert.match(res.body.message, /库存不足/);
  // 订单表一行一菜品（quantity 存 buyshu），上一用例对菜品 2 只产生 1 行
  const count = db.prepare("SELECT COUNT(*) AS c FROM orders WHERE caipinxinxiid = 2").get().c;
  assert.equal(count, 1, '库存不足时不得残留部分订单行');
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd server && npm test`
Expected: 库存用例 FAIL（现状无库存校验，返回 200）。

- [ ] **Step 3: 重写 `server/routes/orders.js` 的 `POST /`（第 22-70 行整体替换）**

```js
// 创建订单（事务 + 库存校验）
router.post('/', requireAuth, (req, res) => {
  try {
    const { items, address, phone, remark } = req.body;
    const userid = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({ code: 400, message: '缺少必要参数' });
    }

    // 前置校验：菜品存在性与库存（在事务外快速失败）
    const getDish = db.prepare('SELECT id, caipinmingcheng, jiage, kucun, tupian FROM caipinxinxi WHERE id = ?');
    const checked = [];
    for (const item of items) {
      const dish = getDish.get(item.dishId);
      if (!dish) {
        return res.status(404).json({ code: 404, message: `菜品 ${item.dishId} 不存在` });
      }
      if (!item.quantity || item.quantity < 1) {
        return res.status(400).json({ code: 400, message: '购买数量非法' });
      }
      if (dish.kucun < item.quantity) {
        return res.status(409).json({ code: 409, message: `「${dish.caipinmingcheng}」库存不足（剩 ${dish.kucun} 份）` });
      }
      checked.push({ dish, quantity: item.quantity });
    }

    const orderid = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let totalPrice = 0;

    const createOrder = db.transaction(() => {
      const insert = db.prepare(`
        INSERT INTO orders 
        (orderid, userid, caipinxinxiid, caipinmingcheng, tupian, buyshu, price, total, address, phone, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const { dish, quantity } of checked) {
        const itemTotal = dish.jiage * quantity;
        totalPrice += itemTotal;
        insert.run(orderid, userid, dish.id, dish.caipinmingcheng, dish.tupian,
          quantity, dish.jiage, itemTotal, address || '学校食堂', phone || '', remark || '');
      }
      // 清空购物车
      db.prepare('DELETE FROM cart WHERE userid = ?').run(userid);
    });
    createOrder();

    res.json({
      code: 200,
      message: '订单创建成功',
      data: { orderid, totalPrice }
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd server && npm test`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add server/
git commit -m "feat(server): 下单事务化、库存校验、下单用户取自 token"
```

---

### Task 6: 余额支付与取餐核销接口

**Files:**
- Modify: `server/routes/orders.js`（追加 pay/pickup 两个端点；`GET /user/:userid` 与 `GET /` 的 SELECT 追加 `pickup_code`）
- Test: `server/tests/payment.test.js`

**Interfaces:**
- Consumes: Task 2 的 `pickup_code` 列；Task 4 的状态机；Task 5 的下单。
- Produces:
  - `POST /api/orders/:orderid/pay`（requireAuth，仅本人）：事务内校验订单属于本人且状态 `未支付` → 逐行校验并扣减 `kucun` → 校验并扣减 `yonghu.jine` → 生成取餐码（大写字母+3位数字，如 `A042`，写入该订单所有行 `pickup_code`）→ 状态置 `已支付`。响应 `data: {orderid, pickupCode, totalPrice, balance}`。余额不足 409 `{code:409, message:'余额不足，当前余额 ¥X'}`。
  - `POST /api/orders/:orderid/pickup`（requireAdmin）：请求体 `{pickupCode}`；校验订单状态为 `待取餐` 且取餐码匹配 → 状态置 `已完成`。取餐码错误 409 `{code:409, message:'取餐码不正确'}`。
  - 取餐码生成函数 `generatePickupCode(): string` 置于 `server/utils/orderState.js` 导出。

- [ ] **Step 1: 写失败测试 `server/tests/payment.test.js`**

```js
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.DB_PATH = ':memory:';
const { db } = await import('../database.js');
const { default: app } = await import('../app.js');
const bcrypt = (await import('bcryptjs')).default;

let userToken, adminToken, orderid;

before(async () => {
  db.prepare("INSERT INTO yonghu (id, zhanghao, mima, xingming, jine, role) VALUES (1, 'u1', ?, '用户一', 100, 'user')")
    .run(bcrypt.hashSync('pw123456', 10));
  db.prepare("INSERT INTO yonghu (id, zhanghao, mima, xingming, jine, role) VALUES (2, 'boss', ?, '老板', 0, 'admin')")
    .run(bcrypt.hashSync('boss123', 10));
  db.prepare("INSERT INTO caipinxinxi (id, caipinmingcheng, caipinfenlei, jiage, kucun) VALUES (1, '红烧肉', '热菜', 15, 10)").run();
  userToken = (await request(app).post('/api/users/login').send({ zhanghao: 'u1', mima: 'pw123456' })).body.data.token;
  adminToken = (await request(app).post('/api/users/login').send({ zhanghao: 'boss', mima: 'boss123' })).body.data.token;
  const order = await request(app).post('/api/orders')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ items: [{ dishId: 1, quantity: 2 }] });
  orderid = order.body.data.orderid;
});

let pickupCode;

test('支付成功：扣余额、扣库存、生成取餐码、状态变已支付', async () => {
  const res = await request(app).post(`/api/orders/${orderid}/pay`)
    .set('Authorization', `Bearer ${userToken}`);
  assert.equal(res.status, 200);
  pickupCode = res.body.data.pickupCode;
  assert.match(pickupCode, /^[A-Z]\d{3}$/);
  assert.equal(res.body.data.balance, 70); // 100 - 30
  assert.equal(db.prepare('SELECT kucun FROM caipinxinxi WHERE id = 1').get().kucun, 8);
  assert.equal(db.prepare('SELECT DISTINCT status FROM orders WHERE orderid = ?').get(orderid).status, '已支付');
});

test('重复支付返回 409', async () => {
  const res = await request(app).post(`/api/orders/${orderid}/pay`)
    .set('Authorization', `Bearer ${userToken}`);
  assert.equal(res.status, 409);
});

test('他人订单支付返回 403', async () => {
  const other = await request(app).post('/api/orders')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ items: [{ dishId: 1, quantity: 1 }] });
  const res = await request(app).post(`/api/orders/${other.body.data.orderid}/pay`)
    .set('Authorization', `Bearer ${adminToken}`); // admin 的 token 但订单属于 u1
  assert.equal(res.status, 403);
});

test('状态流转到待取餐后，错误取餐码核销 409，正确取餐码核销成功', async () => {
  await request(app).put(`/api/orders/${orderid}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: '制作中' });
  await request(app).put(`/api/orders/${orderid}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: '待取餐' });

  const wrong = await request(app).post(`/api/orders/${orderid}/pickup`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ pickupCode: 'Z999' });
  assert.equal(wrong.status, 409);

  const ok = await request(app).post(`/api/orders/${orderid}/pickup`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ pickupCode });
  assert.equal(ok.status, 200);
  assert.equal(db.prepare('SELECT DISTINCT status FROM orders WHERE orderid = ?').get(orderid).status, '已完成');
});

test('余额不足支付返回 409 且余额不变', async () => {
  db.prepare('UPDATE yonghu SET jine = 5 WHERE id = 1').run();
  const order = await request(app).post('/api/orders')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ items: [{ dishId: 1, quantity: 1 }] }); // 15 元 > 5 元
  const res = await request(app).post(`/api/orders/${order.body.data.orderid}/pay`)
    .set('Authorization', `Bearer ${userToken}`);
  assert.equal(res.status, 409);
  assert.equal(db.prepare('SELECT jine FROM yonghu WHERE id = 1').get().jine, 5);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd server && npm test`
Expected: payment.test.js FAIL（pay/pickup 404）。

- [ ] **Step 3: 在 `server/utils/orderState.js` 末尾追加取餐码生成**

```js
// 生成取餐码：1 大写字母 + 3 位数字（如 A042）
export function generatePickupCode() {
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const digits = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `${letter}${digits}`;
}
```

- [ ] **Step 4: 在 `server/routes/orders.js` 追加 pay / pickup 端点**

顶部 import 行补充 `generatePickupCode`：

```js
import { ORDER_STATUS, canTransition, generatePickupCode } from '../utils/orderState.js';
```

`GET /`（第 10 行）与 `GET /user/:userid`（第 76 行）的 SELECT 字段列表中追加 `pickup_code`。

在 `PUT /:orderid/status` 之后、`export default router;` 之前追加：

```js
// 余额支付（本人，事务：扣库存 + 扣余额 + 取餐码 + 状态流转）
router.post('/:orderid/pay', requireAuth, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, userid, caipinxinxiid, caipinmingcheng, buyshu, total, status
      FROM orders WHERE orderid = ?
    `).all(req.params.orderid);

    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }
    if (rows[0].userid !== req.user.id) {
      return res.status(403).json({ code: 403, message: '无权支付他人订单' });
    }
    if (rows[0].status !== '未支付') {
      return res.status(409).json({ code: 409, message: `订单当前状态为「${rows[0].status}」，无法支付` });
    }

    const totalPrice = rows.reduce((sum, r) => sum + r.total, 0);
    const user = db.prepare('SELECT jine FROM yonghu WHERE id = ?').get(req.user.id);
    if (user.jine < totalPrice) {
      return res.status(409).json({ code: 409, message: `余额不足，当前余额 ¥${user.jine.toFixed(2)}` });
    }

    const pickupCode = generatePickupCode();

    const pay = db.transaction(() => {
      // 扣库存（二次校验，防并发超卖）
      const deduct = db.prepare('UPDATE caipinxinxi SET kucun = kucun - ? WHERE id = ? AND kucun >= ?');
      for (const r of rows) {
        const result = deduct.run(r.buyshu, r.caipinxinxiid, r.buyshu);
        if (result.changes === 0) {
          throw new Error(`「${r.caipinmingcheng}」库存不足`);
        }
      }
      // 扣余额 + 月售统计
      db.prepare('UPDATE yonghu SET jine = jine - ? WHERE id = ?').run(totalPrice, req.user.id);
      const addSales = db.prepare('UPDATE caipinxinxi SET yueshuxiao = yueshuxiao + ? WHERE id = ?');
      for (const r of rows) addSales.run(r.buyshu, r.caipinxinxiid);
      // 状态 + 取餐码
      db.prepare("UPDATE orders SET status = '已支付', pickup_code = ? WHERE orderid = ?")
        .run(pickupCode, req.params.orderid);
    });

    try {
      pay();
    } catch (e) {
      return res.status(409).json({ code: 409, message: e.message });
    }

    const balance = db.prepare('SELECT jine FROM yonghu WHERE id = ?').get(req.user.id).jine;

    res.json({
      code: 200,
      message: '支付成功',
      data: { orderid: req.params.orderid, pickupCode, totalPrice, balance }
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 取餐核销（管理员，取餐码核验）
router.post('/:orderid/pickup', requireAdmin, (req, res) => {
  try {
    const { pickupCode } = req.body;
    if (!pickupCode) {
      return res.status(400).json({ code: 400, message: '请提供取餐码' });
    }

    const row = db.prepare(`
      SELECT DISTINCT status, pickup_code FROM orders WHERE orderid = ?
    `).get(req.params.orderid);

    if (!row) {
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }
    if (row.status !== '待取餐') {
      return res.status(409).json({ code: 409, message: `订单当前状态为「${row.status}」，不能核销` });
    }
    if (row.pickup_code !== pickupCode.trim().toUpperCase()) {
      return res.status(409).json({ code: 409, message: '取餐码不正确' });
    }

    db.prepare("UPDATE orders SET status = '已完成' WHERE orderid = ?").run(req.params.orderid);

    res.json({ code: 200, message: '核销成功，订单已完成', data: { orderid: req.params.orderid, status: '已完成' } });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});
```

注意：这两个端点必须注册在 `GET /:orderid` 之后不会冲突（方法不同），但 `POST /:orderid/pay` 与 `POST /` 不冲突（路径不同）。直接追加在文件末尾 `export default router;` 之前即可。

- [ ] **Step 5: 跑测试确认通过**

Run: `cd server && npm test`
Expected: 全部 PASS。

- [ ] **Step 6: Commit**

```bash
git add server/
git commit -m "feat(server): 余额支付（事务扣款/扣库存/取餐码）与取餐核销接口"
```

---

### Task 7: 后端全链路 smoke 脚本

**Files:**
- Create: `server/scripts/smoke.js`

**Interfaces:**
- Consumes: Task 1-6 全部接口（运行在 `localhost:5000` 的真实服务）。
- Produces: `npm run smoke`；任一断言失败以非 0 退出码结束并打印失败环节。

- [ ] **Step 1: 创建 `server/scripts/smoke.js`**

```js
// 全链路冒烟：注册→登录→浏览→下单→支付→接单→叫号→核销
// 前置：后端已启动（npm start）
const BASE = 'http://localhost:5000/api';

let passed = 0;
function assert(cond, label) {
  if (!cond) {
    console.error(`✗ FAIL: ${label}`);
    process.exit(1);
  }
  passed++;
  console.log(`✓ ${label}`);
}

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, json: await res.json() };
}

const run = async () => {
  // 健康检查
  const health = await api('GET', '/health');
  assert(health.status === 200, '服务健康检查');

  // 注册 + 登录
  const account = `smoke${Date.now()}`;
  const reg = await api('POST', '/users/register', { body: { zhanghao: account, mima: 'smoke123', xingming: '冒烟测试', lianxifangshi: '13000000000' } });
  assert(reg.status === 200, '用户注册');
  const login = await api('POST', '/users/login', { body: { zhanghao: account, mima: 'smoke123' } });
  assert(login.status === 200 && login.json.data.token, '用户登录');
  const token = login.json.data.token;

  // 浏览菜品
  const dishes = await api('GET', '/dishes');
  assert(dishes.status === 200 && dishes.json.data.length > 0, '菜品列表');
  const dish = dishes.json.data.find(d => d.kucun > 0);
  assert(!!dish, '存在有库存的菜品');

  // 下单
  const order = await api('POST', '/orders', { token, body: { items: [{ dishId: dish.id, quantity: 1 }], remark: 'smoke' } });
  assert(order.status === 200 && order.json.data.orderid, '创建订单');
  const orderid = order.json.data.orderid;

  // 支付
  const pay = await api('POST', `/orders/${orderid}/pay`, { token });
  assert(pay.status === 200 && /^[A-Z]\d{3}$/.test(pay.json.data.pickupCode), '余额支付并生成取餐码');
  const pickupCode = pay.json.data.pickupCode;

  // 我的订单（C 端轮询所依赖的接口）
  const myOrders = await api('GET', `/orders/user/${login.json.data.user.id}`, { token });
  assert(myOrders.status === 200 && myOrders.json.data.some(o => o.orderid === orderid && o.status === '已支付'), '用户订单列表状态为已支付');

  // 管理员接单 → 叫号
  const adminLogin = await api('POST', '/users/login', { body: { zhanghao: 'admin', mima: 'admin123' } });
  assert(adminLogin.status === 200 && adminLogin.json.data.user.role === 'admin', '管理员登录');
  const adminToken = adminLogin.json.data.token;

  const accept = await api('PUT', `/orders/${orderid}/status`, { token: adminToken, body: { status: '制作中' } });
  assert(accept.status === 200, '管理员接单（→制作中）');
  const call = await api('PUT', `/orders/${orderid}/status`, { token: adminToken, body: { status: '待取餐' } });
  assert(call.status === 200, '管理员叫号（→待取餐）');

  // 非法流转被状态机拦截
  const illegal = await api('PUT', `/orders/${orderid}/status`, { token: adminToken, body: { status: '已退款' } });
  assert(illegal.status === 409, '非法状态流转被拦截（409）');

  // 错误取餐码核销被拒
  const wrongCode = await api('POST', `/orders/${orderid}/pickup`, { token: adminToken, body: { pickupCode: 'Z999' } });
  assert(wrongCode.status === 409, '错误取餐码核销被拒');

  // 正确取餐码核销
  const pickup = await api('POST', `/orders/${orderid}/pickup`, { token: adminToken, body: { pickupCode } });
  assert(pickup.status === 200, '取餐码核销成功（→已完成）');

  // 无鉴权写接口被拒
  const noAuth = await api('POST', '/dishes', { body: { caipinmingcheng: 'x', caipinfenlei: '热菜', jiage: 1 } });
  assert(noAuth.status === 401, '无 token 写接口返回 401');

  console.log(`\n🎉 SMOKE 全部通过（${passed} 项断言）`);
};

run().catch(err => {
  console.error('✗ SMOKE 执行异常:', err.message);
  console.error('请确认后端已启动：cd server && npm start');
  process.exit(1);
});
```

- [ ] **Step 2: 运行 smoke 验证**

Run: `cd server && npm start`（一个终端），另一终端 `cd server && npm run smoke`
Expected: `🎉 SMOKE 全部通过（15 项断言）`。Ctrl+C 停止服务。

- [ ] **Step 3: Commit**

```bash
git add server/scripts/smoke.js
git commit -m "test(server): 注册到核销的全链路 smoke 脚本"
```

---

### Task 8: AI mock 数据驱动化

**Files:**
- Modify: `server/routes/ai.js:23-50`（chat 降级分支）
- Test: `server/tests/ai.test.js`

**Interfaces:**
- Consumes: 真实菜品表 `caipinxinxi`。
- Produces: 无 `GEMINI_API_KEY` 时 `POST /api/ai/chat` 的降级回复基于真实菜品（推荐/便宜/素食等关键词 → 查询菜品库组装回复，附带真实菜名与价格）；接口出入参结构不变（`{code:200, reply}`）。

- [ ] **Step 1: 写失败测试 `server/tests/ai.test.js`**

```js
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.DB_PATH = ':memory:';
delete process.env.GEMINI_API_KEY; // 强制走 mock 降级
const { db } = await import('../database.js');
const { default: app } = await import('../app.js');

before(() => {
  db.prepare("INSERT INTO caipinxinxi (caipinmingcheng, caipinfenlei, jiage, kucun, yueshuxiao, cailiao) VALUES ('番茄鸡蛋面', '面食', 9, 50, 300, '番茄，鸡蛋')").run();
  db.prepare("INSERT INTO caipinxinxi (caipinmingcheng, caipinfenlei, jiage, kucun, yueshuxiao, cailiao) VALUES ('白灼菜心', '素菜', 5, 50, 200, '菜心')").run();
});

test('推荐类提问的 mock 回复包含真实菜名', async () => {
  const res = await request(app).post('/api/ai/chat').send({ message: '有什么好吃的推荐？' });
  assert.equal(res.status, 200);
  const reply = res.body.reply || res.body.data?.reply || '';
  assert.ok(reply.includes('番茄鸡蛋面') || reply.includes('白灼菜心'), `回复应包含真实菜名，实际: ${reply}`);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd server && npm test`
Expected: ai.test.js FAIL（现 mock 为硬编码话术）。

- [ ] **Step 3: 改造 `server/routes/ai.js` 的 chat 降级分支（第 24-46 行）**

现状：第 25-31 行是硬编码 `responses` 关键词字典，第 33-43 行做关键词匹配与兜底回复。`db` 已在第 3 行导入，无需新增 import。

将第 33-39 行：

```js
      let reply = '';
      for (const [key, value] of Object.entries(responses)) {
        if (message.includes(key)) {
          reply = value;
          break;
        }
      }
```

替换为：

```js
      let reply = '';

      // 推荐类提问：基于真实在售菜品库动态生成（数据驱动 mock）
      const RECOMMEND_KEYS = ['推荐', '好吃', '吃什么', '便宜', '特色', '美食'];
      if (RECOMMEND_KEYS.some(k => message.includes(k))) {
        const topDishes = db.prepare(`
          SELECT caipinmingcheng, jiage, caipinfenlei, yueshuxiao
          FROM caipinxinxi
          WHERE kucun > 0 AND shangjia = '是'
          ORDER BY yueshuxiao DESC
          LIMIT 3
        `).all();
        if (topDishes.length > 0) {
          const lines = topDishes.map((d, i) =>
            `${i + 1}. 「${d.caipinmingcheng}」¥${d.jiage}（${d.caipinfenlei}，月售 ${d.yueshuxiao}）`
          ).join('\n');
          reply = `🍽️ 收到！小智刚查了今日真实在售菜单，为你推荐：\n${lines}\n\n都是现做热乎菜，要尝尝吗？😋`;
        }
      }

      if (!reply) {
        for (const [key, value] of Object.entries(responses)) {
          if (message.includes(key)) {
            reply = value;
            break;
          }
        }
      }
```

响应结构 `res.json({ code: 200, reply })`（第 45 行）保持不变。营养报告端点 `/analyze-nutrition` 的 mock 模板本次不改动（其真实 LLM 分支已查询真实菜品库）。

- [ ] **Step 4: 跑测试确认通过**

Run: `cd server && npm test`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add server/
git commit -m "feat(server): AI 聊天 mock 降级改为真实菜品库驱动"
```

---

### Task 9: C 端文件拆分（zhixiang.html → index.html + app.css + app.js）

**Files:**
- Create: `canteen/index.html`（整体替换现有 v3 入口）
- Create: `canteen/app.css`
- Create: `canteen/app.js`
- Delete: `canteen/zhixiang.html`、`canteen/zhixiang2.html`、`canteen/script.js`、`canteen/script_v2.js`、`canteen/script_v3_api.js`、`canteen/styles.css`、`canteen/styles_v2.css`、`canteen/startup1.bat`、`management/zhixiang.html`（误放在 B 端目录的 C 端原型）

**Interfaces:**
- Consumes: `canteen/zhixiang.html`（1295 行单文件应用）。
- Produces: 结构相同但样式/脚本外置的新入口；`canteen/data.js` **必须保留**（`server/scripts/initDatabase.js` 刷库依赖它）；`xiaozhi-logo.svg`、`dish-placeholder.svg`、`liushabao.png`、`startup.bat` 保留。后续 Task 依赖 `app.js` 中的全局 `DB`、`state`、`navigate(view)`、`render()`、`modalRoot`、`updateCartUI()`。

- [ ] **Step 1: 提取样式到 `canteen/app.css`**

打开 `canteen/zhixiang.html`，将 `<head>` 内 `<style>` 与 `</style>` 之间的全部内容（约第 35 行起，含 `.glass-nav`、动画 keyframes 等）原样剪切到新建的 `canteen/app.css`。注意：**不含** `<script>tailwind.config = {...}</script>` 块（它必须留在 HTML 里且在 Tailwind CDN 之后）。

- [ ] **Step 2: 提取脚本到 `canteen/app.js`**

将 `zhixiang.html` 中 `<div id="modal-container"></div>` 之后的 `<script>` 与 `</script>` 之间的全部内容（第 207 行 `// --- 模拟数据库 (Mock Data) ---` 起至文件末尾的 JS）原样剪切到新建的 `canteen/app.js`。

- [ ] **Step 3: 生成新的 `canteen/index.html`**

以 `zhixiang.html` 为模板整体替换 `canteen/index.html`，做两处替换：

1. `<style>...</style>` 整块替换为：

```html
    <link rel="stylesheet" href="app.css">
```

2. `<div id="modal-container"></div>` 之后的整个内联 `<script>...</script>` 替换为：

```html
    <script src="api.js"></script>
    <script src="app.js"></script>
```

（`api.js` 在 Task 10 创建；本任务结束时页面控制台会因 `api.js` 404 报一个加载错误，属预期，Task 10 消除。）

3. 在导航栏中找到 4 个 `class="nav-link"` 的 `<a>`（`data-target` 分别为 `order/nutrition/social/culture`），在最后一个之后追加（class 列表与相邻链接完全一致）：

```html
<a href="#" class="nav-link" data-target="orders">我的订单</a>
```

- [ ] **Step 4: 删除旧文件**

```bash
cd canteen && rm -f zhixiang.html zhixiang2.html script.js script_v2.js script_v3_api.js styles.css styles_v2.css startup1.bat
rm -f ../management/zhixiang.html
```

- [ ] **Step 5: 验证页面可打开**

Run: `cd canteen && python -m http.server 8000`，浏览器打开 `http://localhost:8000/index.html`
Expected: 页面完整渲染（样式正常、智能点餐页显示 mock 菜品）；控制台除 `api.js` 404 外无其他红色报错。Ctrl+C 停止。

- [ ] **Step 6: Commit**

```bash
git add -A canteen/
git commit -m "refactor(canteen): zhixiang.html 拆分为 index.html + app.css + app.js，清理孤儿文件"
```

---

### Task 10: C 端 API 层、真实数据接入与登录注册

**Files:**
- Create: `canteen/api.js`
- Modify: `canteen/app.js`（DB 初始化、启动引导、登录模态）

**Interfaces:**
- Consumes: 后端 `GET /dishes`（含 `shangjia` 字段，Task 14 才加入 SELECT，本任务过滤逻辑需容忍 `undefined`）、`GET /restaurants`、`POST /users/login`、`POST /users/register`。
- Produces（`api.js` 全局函数，后续 Task 与 app.js 依赖）：
  - `api(method, path, body?) → Promise<{status, json}>`：自动携带 `Authorization: Bearer <token>`；401 时清除登录态并弹出登录框。
  - `getToken()`、`setSession(token, user)`、`clearSession()`、`currentUser()`（读 `localStorage` 的 `zx_token` / `zx_user`）。
  - `openLoginModal()`：登录/注册合一模态框。
  - `requireLogin(): boolean`：未登录则弹登录框并返回 false。
  - app.js 启动时 `loadRemoteData()` 填充 `DB.menu` / `DB.restaurants`（字段映射回 mock 原有结构，下游 UI 零改动）。

- [ ] **Step 1: 创建 `canteen/api.js`（完整内容）**

```js
// 智饷 C 端 API 层：统一请求、登录态、登录/注册模态框
const API_BASE = 'http://localhost:5000/api';

function getToken() { return localStorage.getItem('zx_token') || ''; }
function currentUser() {
  try { return JSON.parse(localStorage.getItem('zx_user')) || null; } catch { return null; }
}
function setSession(token, user) {
  localStorage.setItem('zx_token', token);
  localStorage.setItem('zx_user', JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('zx_token');
  localStorage.removeItem('zx_user');
}

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method, headers, body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    toast('无法连接服务器，请确认后端已启动', 'error');
    return { status: 0, json: { code: 0, message: '网络错误' } };
  }
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) {
    clearSession();
    renderUserEntry();
    openLoginModal();
  }
  return { status: res.status, json };
}

// ---- 登录 / 注册模态框 ----
function openLoginModal() {
  modalRoot.innerHTML = `
    <div class="fixed inset-0 z-[100] flex items-center justify-center glass-modal" onclick="if(event.target===this)closeModal()">
      <div class="bg-white rounded-[28px] p-8 w-[92%] max-w-[400px] shadow-appleHover slide-up">
        <div class="text-center mb-6">
          <img src="xiaozhi-logo.svg" class="w-14 h-14 mx-auto mb-3" onerror="this.style.display='none'">
          <h2 id="auth-title" class="text-2xl font-bold">登录智饷</h2>
          <p class="text-appleLightGray text-sm mt-1">校园卡账号一键登录，开启智慧就餐</p>
        </div>
        <input id="auth-account" placeholder="账号" class="w-full bg-appleGray rounded-xl px-4 py-3 mb-3 outline-none focus:ring-2 ring-appleBlue/50 text-sm">
        <input id="auth-password" type="password" placeholder="密码" class="w-full bg-appleGray rounded-xl px-4 py-3 mb-3 outline-none focus:ring-2 ring-appleBlue/50 text-sm">
        <div id="auth-extra" class="hidden">
          <input id="auth-name" placeholder="姓名" class="w-full bg-appleGray rounded-xl px-4 py-3 mb-3 outline-none focus:ring-2 ring-appleBlue/50 text-sm">
          <input id="auth-phone" placeholder="手机号" class="w-full bg-appleGray rounded-xl px-4 py-3 mb-3 outline-none focus:ring-2 ring-appleBlue/50 text-sm">
        </div>
        <button onclick="submitAuth()" id="auth-submit" class="w-full bg-appleBlue text-white py-3 rounded-full font-bold hover:opacity-90 transition glass-btn-active">登 录</button>
        <p class="text-center text-sm text-appleLightGray mt-4">
          <span id="auth-switch-text">还没有账号？</span>
          <a href="javascript:void(0)" class="text-appleBlue font-medium" onclick="toggleAuthMode()" id="auth-switch">立即注册</a>
        </p>
      </div>
    </div>`;
}

let authMode = 'login';
function toggleAuthMode() {
  authMode = authMode === 'login' ? 'register' : 'login';
  const isLogin = authMode === 'login';
  document.getElementById('auth-title').innerText = isLogin ? '登录智饷' : '注册智饷';
  document.getElementById('auth-extra').classList.toggle('hidden', isLogin);
  document.getElementById('auth-submit').innerText = isLogin ? '登 录' : '注 册';
  document.getElementById('auth-switch-text').innerText = isLogin ? '还没有账号？' : '已有账号？';
  document.getElementById('auth-switch').innerText = isLogin ? '立即注册' : '去登录';
}

async function submitAuth() {
  const zhanghao = document.getElementById('auth-account').value.trim();
  const mima = document.getElementById('auth-password').value;
  if (!zhanghao || !mima) return toast('请输入账号和密码', 'warning');

  if (authMode === 'register') {
    const xingming = document.getElementById('auth-name').value.trim();
    const lianxifangshi = document.getElementById('auth-phone').value.trim();
    if (!xingming) return toast('请输入姓名', 'warning');
    const { status, json } = await api('POST', '/users/register', { zhanghao, mima, xingming, lianxifangshi });
    if (status !== 200) return toast(json.message || '注册失败', 'error');
    toast('注册成功，已赠送 ¥10000 体验金', 'success');
  }

  const { status, json } = await api('POST', '/users/login', { zhanghao, mima });
  if (status !== 200) return toast(json.message || '登录失败', 'error');
  setSession(json.data.token, json.data.user);
  closeModal();
  renderUserEntry();
  toast(`欢迎回来，${json.data.user.xingming}`, 'success');
  render();
}

function logout() {
  clearSession();
  renderUserEntry();
  toast('已退出登录', 'success');
  render();
}

function requireLogin() {
  if (getToken()) return true;
  openLoginModal();
  return false;
}

// 导航栏用户入口（登录按钮 / 用户名 + 退出）
function renderUserEntry() {
  const slot = document.getElementById('user-entry');
  if (!slot) return;
  const user = currentUser();
  slot.innerHTML = user
    ? `<span class="text-sm font-medium mr-3">👋 ${user.xingming} <span class="text-appleBlue font-bold">¥${Number(user.jine).toFixed(2)}</span></span>
       <button onclick="logout()" class="text-sm text-appleLightGray hover:text-appleDark transition">退出</button>`
    : `<button onclick="openLoginModal()" class="bg-appleBlue text-white text-sm px-5 py-2 rounded-full font-medium hover:opacity-90 transition glass-btn-active">登录 / 注册</button>`;
}
```

- [ ] **Step 2: 在 `canteen/index.html` 导航栏添加用户入口容器**

在导航栏 `<nav>` 内、购物车按钮附近（`cart-badge` 所在的按钮组容器内）追加：

```html
<div id="user-entry" class="flex items-center"></div>
```

- [ ] **Step 3: 修改 `canteen/app.js`——真实数据接入**

在 `app.js` 中 `const DB = { ... };` 定义**保留不动**（作为加载前的兜底与字段结构模板），在其后追加：

```js
        // --- 真实数据接入：用后端数据覆盖 mock DB（字段映射回原结构，下游 UI 零改动） ---
        function parseNutrition(yingyang) {
            const text = yingyang || '';
            const cal = text.match(/热量\s*(\d+)\s*kcal/);
            const protein = text.match(/蛋白质\s*(\d+)\s*g/);
            return { cal: cal ? Number(cal[1]) : 0, protein: protein ? Number(protein[1]) : 0 };
        }

        async function loadRemoteData() {
            // 菜品
            const dishRes = await api('GET', '/dishes');
            if (dishRes.status === 200 && dishRes.json.data) {
                const onSale = dishRes.json.data.filter(d => d.shangjia !== '否');
                if (onSale.length > 0) {
                    DB.menu = onSale.map(d => {
                        const n = parseNutrition(d.yingyang);
                        return {
                            id: d.id,
                            name: d.caipinmingcheng,
                            category: d.caipinfenlei,
                            price: d.jiage,
                            img: (d.tupian && d.tupian.startsWith('http')) ? d.tupian : (d.tupian || 'dish-placeholder.svg'),
                            cal: n.cal,
                            protein: n.protein,
                            tag: d.cailiao ? d.cailiao.split('，')[0] : '',
                            sales: d.yueshuxiao || 0,
                            rating: d.pinfen || 5.0,
                            stock: d.kucun,
                            isNew: (d.yueshuxiao || 0) < 20,
                            overstocked: (d.kucun || 0) > 80,
                            nutritionGoal: '',
                            window: d.caipinfenlei
                        };
                    });
                }
            }
            // 餐厅（后端目前为硬编码演示数据，做字段映射）
            const restRes = await api('GET', '/restaurants');
            if (restRes.status === 200 && Array.isArray(restRes.json.data) && restRes.json.data.length > 0) {
                DB.restaurants = restRes.json.data.map((r, i) => ({
                    id: r.id ?? i + 1,
                    name: r.name,
                    queues: r.queueCount ?? r.queues ?? 0,
                    waitTime: r.queueTime ?? r.waitTime ?? 0,
                    seats: r.availableSeats ?? r.seats ?? 0,
                    totalSeats: r.totalSeats ?? 0,
                    status: (r.queueTime ?? 0) > 20 ? 'warning' : ((r.queueCount ?? 0) === 0 ? 'empty' : 'good')
                }));
            }
        }
```

- [ ] **Step 4: 修改 `canteen/app.js`——启动引导**

在 `app.js` 文件末尾（所有函数定义之后）追加：

```js
        // --- 启动引导 ---
        renderUserEntry();
        (async () => {
            await loadRemoteData();
            render();
            updateCartUI();
        })();
```

注意：此处**不要**调用 `loadCart()`——它在 Task 11 才定义，届时由 Task 11 把调用接入本引导。

若 `app.js` 末尾已存在直接调用 `render()` / `updateCartUI()` 的初始化代码，将其移除（统一由上面的异步引导负责，避免先用 mock 闪屏）。

- [ ] **Step 5: 手动验证**

Run: 后端 `cd server && npm start`；前端 `cd canteen && python -m http.server 8000`，打开 `http://localhost:8000/index.html`
Expected:
1. 页面菜品来自后端 40 条真实数据（不再是 8 条 mock）；
2. 点导航「登录 / 注册」可注册新账号并自动登录，导航栏显示姓名与余额；
3. 后端日志无 CORS 报错；控制台无红色报错。

- [ ] **Step 6: Commit**

```bash
git add canteen/
git commit -m "feat(canteen): API 层与登录注册，菜品/餐厅数据接入真实后端"
```

---

### Task 11: C 端 toast 通知与购物车持久化

**Files:**
- Modify: `canteen/api.js`（追加 toast）
- Modify: `canteen/app.js`（addToCart / removeFromCart / 购物车持久化）

**Interfaces:**
- Consumes: Task 9 提取的 `updateCartUI()`（`app.js` 原 zhixiang.html 第 861-894 行，不改动）。
- Produces:
  - `toast(message, type = 'info')`：全局可见通知（success/warning/error/info），3 秒自动消失。
  - `loadCart()` / `saveCart()`：`localStorage` 键 `zx_cart`。
  - `addToCart(id)`：同款合并数量；`removeFromCart(id)`。两者均持久化 + toast 反馈。

- [ ] **Step 1: 在 `canteen/api.js` 末尾追加 toast 组件**

```js
// ---- 全局 toast 通知 ----
function toast(message, type = 'info') {
  document.getElementById('zx-toast')?.remove();
  const el = document.createElement('div');
  el.id = 'zx-toast';
  const colors = { info: '#0071E3', success: '#34c759', warning: '#ff9500', error: '#ff3b30' };
  el.style.cssText = `
    position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
    background: ${colors[type] || colors.info}; color: #fff; padding: 12px 28px;
    border-radius: 999px; box-shadow: 0 10px 30px rgba(0,0,0,0.18);
    z-index: 20000; font-weight: 600; font-size: 14px; transition: all .3s ease;
  `;
  el.innerText = message;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.marginTop = '-12px'; setTimeout(() => el.remove(), 300); }, 2600);
}
```

- [ ] **Step 2: 替换 `app.js` 中的购物车函数**

找到现有的 `addToCart` 与 `removeFromCart` 函数定义（在 `updateCartUI` 附近），整体替换为：

```js
        // --- 购物车：localStorage 持久化 + 同款合并 ---
        function loadCart() {
            try { state.cart = JSON.parse(localStorage.getItem('zx_cart')) || []; }
            catch { state.cart = []; }
        }

        function saveCart() {
            localStorage.setItem('zx_cart', JSON.stringify(state.cart));
        }

        function addToCart(id) {
            const dish = DB.menu.find(m => m.id === id);
            if (!dish) return;
            if (dish.stock !== undefined && dish.stock <= 0) {
                return toast(`「${dish.name}」今日已售罄`, 'warning');
            }
            const existing = state.cart.find(i => i.id === id);
            if (existing) existing.qty += 1;
            else state.cart.push({ id: dish.id, name: dish.name, price: dish.price, img: dish.img, qty: 1 });
            saveCart();
            updateCartUI();
            toast(`${dish.name} 已加入餐盘`, 'success');
        }

        function removeFromCart(id) {
            state.cart = state.cart.filter(i => i.id !== id);
            saveCart();
            updateCartUI();
        }
```

- [ ] **Step 3: 启动引导接入 loadCart，并全局替换假通知与 alert**

在 Task 10 添加的启动引导（`app.js` 末尾的 `// --- 启动引导 ---`）中，于 `renderUserEntry();` 之前插入一行 `loadCart();`，改后为：

```js
        // --- 启动引导 ---
        loadCart();
        renderUserEntry();
        (async () => {
            await loadRemoteData();
            render();
            updateCartUI();
        })();
```

在 `app.js` 中搜索所有 `alert(`，替换为 `toast(..., 'warning')` 形式（如 `simulateCheckout` 中的 `alert("请先添加菜品！")` → `toast('请先添加菜品！', 'warning')`）。搜索 `showNotification`（若有残留调用）一并替换为 `toast`。

- [ ] **Step 4: 手动验证**

前后端启动后打开 `http://localhost:8000/index.html`：
1. 加购两道菜 → 刷新页面 → 购物车角标与内容仍在；
2. 同一道菜点两次加购 → 购物车只有一行、数量为 2；
3. 操作均有顶部 toast 弹出且可见。

- [ ] **Step 5: Commit**

```bash
git add canteen/
git commit -m "feat(canteen): 全局 toast 通知，购物车 localStorage 持久化与同款合并"
```

---

### Task 12: C 端下单 → 支付 → 取餐码 → 订单追踪视图

**Files:**
- Modify: `canteen/app.js`（替换 `simulateCheckout`，追加结算/收银台/取餐码/我的订单视图与轮询）

**Interfaces:**
- Consumes: `api()`、`requireLogin()`、`currentUser()`、`setSession`（`api.js`）；后端 `POST /orders`、`POST /orders/:orderid/pay`、`GET /orders/user/:userid`（含 `pickup_code`）。
- Produces:
  - `simulateCheckout()`（保持原名，购物车按钮无需改）→ 订单确认弹窗 → `confirmOrder()` → 收银台 → `payOrder(orderid)` → 取餐码弹窗 → `navigate('orders')`。
  - `renderOrdersView()`：`render()` 的新分支 `state.currentView === 'orders'`；3 秒轮询（离开视图自动停止）。
  - `closeModal()` 若 app.js 已存在同名函数则复用，不重复定义（先搜索确认；塔罗/选座弹窗用的就是同一个 `modalRoot` 关闭函数）。

- [ ] **Step 1: 替换 `simulateCheckout`（原 app.js 约第 900-908 行）并追加结算链路**

```js
        // ================= 结算链路：确认 → 收银台 → 支付 → 取餐码 =================
        function cartTotal() {
            return state.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
        }

        function simulateCheckout() {
            if (state.cart.length === 0) return toast('请先添加菜品！', 'warning');
            if (!requireLogin()) return;
            toggleCart();
            const user = currentUser();
            const total = cartTotal();
            modalRoot.innerHTML = `
                <div class="fixed inset-0 z-[100] flex items-center justify-center glass-modal" onclick="if(event.target===this)closeModal()">
                    <div class="bg-white rounded-[28px] p-8 w-[92%] max-w-[480px] shadow-appleHover slide-up max-h-[85vh] overflow-y-auto">
                        <h2 class="text-2xl font-bold mb-1">确认订单</h2>
                        <p class="text-appleLightGray text-sm mb-6">核对菜品与取餐信息</p>
                        <div class="space-y-3 mb-5">
                            ${state.cart.map(i => `
                                <div class="flex justify-between items-center bg-appleGray rounded-xl p-3">
                                    <div class="flex items-center space-x-3">
                                        <img src="${i.img}" class="w-10 h-10 rounded-lg object-cover" onerror="this.src='dish-placeholder.svg'">
                                        <span class="font-medium text-sm">${i.name} <span class="text-appleLightGray">x${i.qty}</span></span>
                                    </div>
                                    <span class="font-bold text-sm">¥${(i.price * i.qty).toFixed(2)}</span>
                                </div>`).join('')}
                        </div>
                        <div class="mb-4">
                            <label class="text-sm text-appleLightGray block mb-2">取餐食堂</label>
                            <select id="checkout-address" class="w-full bg-appleGray rounded-xl px-4 py-3 outline-none text-sm">
                                ${DB.restaurants.map(r => `<option value="${r.name}">${r.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="mb-6">
                            <label class="text-sm text-appleLightGray block mb-2">备注（口味偏好等）</label>
                            <input id="checkout-remark" placeholder="少辣 / 不要香菜…" class="w-full bg-appleGray rounded-xl px-4 py-3 outline-none text-sm">
                        </div>
                        <div class="flex justify-between items-center mb-6">
                            <span class="text-appleLightGray text-sm">账户余额 <b class="text-appleDark">¥${Number(user.jine).toFixed(2)}</b></span>
                            <span class="text-xl font-bold">合计 <span class="text-appleBlue">¥${total.toFixed(2)}</span></span>
                        </div>
                        <button onclick="confirmOrder()" class="w-full bg-appleBlue text-white py-3.5 rounded-full font-bold hover:opacity-90 transition glass-btn-active">去支付</button>
                    </div>
                </div>`;
        }

        async function confirmOrder() {
            const items = state.cart.map(i => ({ dishId: i.id, quantity: i.qty }));
            const address = document.getElementById('checkout-address').value;
            const remark = document.getElementById('checkout-remark').value.trim();
            const user = currentUser();
            const btn = document.querySelector('#modal-container button[onclick="confirmOrder()"]');
            if (btn) { btn.disabled = true; btn.innerText = '下单中…'; }

            const { status, json } = await api('POST', '/orders', {
                items, address, remark, phone: user.lianxifangshi || ''
            });
            if (status !== 200) {
                if (btn) { btn.disabled = false; btn.innerText = '去支付'; }
                return toast(json.message || '下单失败', 'error');
            }
            openCashier(json.data.orderid, json.data.totalPrice);
        }

        function openCashier(orderid, totalPrice) {
            const user = currentUser();
            const enough = Number(user.jine) >= totalPrice;
            modalRoot.innerHTML = `
                <div class="fixed inset-0 z-[100] flex items-center justify-center glass-modal">
                    <div class="bg-white rounded-[28px] p-8 w-[92%] max-w-[400px] shadow-appleHover slide-up text-center">
                        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-appleGray flex items-center justify-center text-3xl">🍚</div>
                        <p class="text-appleLightGray text-sm mb-1">校园卡余额支付</p>
                        <p class="text-4xl font-bold mb-1">¥${totalPrice.toFixed(2)}</p>
                        <p class="text-sm mb-6 ${enough ? 'text-appleLightGray' : 'text-red-500 font-medium'}">
                            当前余额 ¥${Number(user.jine).toFixed(2)}${enough ? '' : '（余额不足）'}
                        </p>
                        <button id="pay-btn" onclick="payOrder('${orderid}')" ${enough ? '' : 'disabled'}
                            class="w-full ${enough ? 'bg-appleBlue' : 'bg-gray-300 cursor-not-allowed'} text-white py-3.5 rounded-full font-bold transition glass-btn-active">
                            确认支付
                        </button>
                        <button onclick="closeModal()" class="w-full text-appleLightGray text-sm mt-4 hover:text-appleDark transition">暂不支付（订单保留为未支付）</button>
                    </div>
                </div>`;
        }

        async function payOrder(orderid) {
            const btn = document.getElementById('pay-btn');
            if (btn) { btn.disabled = true; btn.innerText = '支付中…'; }
            const { status, json } = await api('POST', `/orders/${orderid}/pay`);
            if (status !== 200) {
                if (btn) { btn.disabled = false; btn.innerText = '确认支付'; }
                return toast(json.message || '支付失败', 'error');
            }
            // 更新本地余额
            const user = currentUser();
            user.jine = json.data.balance;
            setSession(getToken(), user);
            // 清空购物车
            state.cart = [];
            saveCart();
            updateCartUI();
            renderUserEntry();
            showPickupCode(json.data.pickupCode);
        }

        function showPickupCode(pickupCode) {
            modalRoot.innerHTML = `
                <div class="fixed inset-0 z-[100] flex items-center justify-center glass-modal">
                    <div class="bg-white rounded-[28px] p-10 w-[92%] max-w-[400px] shadow-appleHover slide-up text-center">
                        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
                            <i class="fa-solid fa-check text-3xl text-green-500"></i>
                        </div>
                        <h2 class="text-2xl font-bold mb-1">支付成功</h2>
                        <p class="text-appleLightGray text-sm mb-6">取餐时请向档口出示取餐码</p>
                        <div class="bg-appleGray rounded-2xl py-6 mb-6">
                            <span class="text-6xl font-black tracking-[0.2em] text-appleDark">${pickupCode}</span>
                        </div>
                        <button onclick="closeModal(); navigate('orders')" class="w-full bg-appleBlue text-white py-3.5 rounded-full font-bold hover:opacity-90 transition glass-btn-active">查看订单进度</button>
                    </div>
                </div>`;
        }
```

- [ ] **Step 2: 追加「我的订单」视图与轮询**

在 `app.js` 的 `render()` 函数中追加分支（与其他 `else if` 同级）：

```js
            else if (state.currentView === 'orders') renderOrdersView();
```

在 `app.js` 中追加（先搜索确认不存在同名 `orderPollTimer` / `renderOrdersView`）：

```js
        // ================= 我的订单：状态时间线 + 3 秒轮询 =================
        let orderPollTimer = null;

        function startOrderPolling() {
            stopOrderPolling();
            orderPollTimer = setInterval(() => {
                if (state.currentView === 'orders') renderOrdersView();
                else stopOrderPolling();
            }, 3000);
        }

        function stopOrderPolling() {
            if (orderPollTimer) { clearInterval(orderPollTimer); orderPollTimer = null; }
        }

        const ORDER_FLOW = ['已支付', '制作中', '待取餐', '已完成'];

        async function renderOrdersView() {
            if (!getToken()) {
                appRoot.innerHTML = `
                    <div class="text-center py-24 fade-in">
                        <div class="text-5xl mb-4">🔐</div>
                        <p class="text-appleLightGray mb-6">登录后即可查看你的订单</p>
                        <button onclick="openLoginModal()" class="bg-appleBlue text-white px-8 py-3 rounded-full font-bold glass-btn-active">去登录</button>
                    </div>`;
                return;
            }

            const { status, json } = await api('GET', `/orders/user/${currentUser().id}`);
            if (status !== 200) {
                appRoot.innerHTML = '<div class="text-center py-24 text-appleLightGray">订单加载失败，请稍后重试</div>';
                return;
            }

            // 按 orderid 分组（订单表一行一菜品）
            const groups = {};
            for (const row of json.data) {
                if (!groups[row.orderid]) groups[row.orderid] = { orderid: row.orderid, status: row.status, addtime: row.addtime, pickupCode: row.pickup_code, items: [], total: 0 };
                groups[row.orderid].items.push({ name: row.caipinmingcheng, qty: row.buyshu, img: row.tupian });
                groups[row.orderid].total += row.total;
            }
            const orders = Object.values(groups);

            const stepIndex = s => ORDER_FLOW.indexOf(s);

            appRoot.innerHTML = `
                <div class="mb-8 flex items-end justify-between">
                    <div>
                        <h1 class="text-4xl font-bold tracking-tight">我的订单</h1>
                        <p class="text-appleLightGray mt-1">状态每 3 秒自动刷新，餐好立即可见</p>
                    </div>
                    <span class="text-sm text-appleLightGray">${orders.length} 笔订单</span>
                </div>
                ${orders.length === 0 ? `
                    <div class="text-center py-24 fade-in">
                        <div class="text-5xl mb-4">🍽️</div>
                        <p class="text-appleLightGray mb-6">还没有订单，去点一份心仪的美食吧</p>
                        <button onclick="navigate('order')" class="bg-appleBlue text-white px-8 py-3 rounded-full font-bold glass-btn-active">去点餐</button>
                    </div>` : orders.map(o => `
                    <div class="bg-white rounded-[24px] p-6 shadow-apple border border-gray-100 mb-5 fade-in">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <span class="text-xs text-appleLightGray">订单号 ${o.orderid.slice(-8)} · ${o.addtime}</span>
                                <div class="mt-2 space-y-1">
                                    ${o.items.map(i => `<p class="text-sm font-medium">• ${i.name} <span class="text-appleLightGray">x${i.qty}</span></p>`).join('')}
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="font-bold text-lg">¥${o.total.toFixed(2)}</p>
                                ${o.status === '待取餐' && o.pickupCode ? `
                                    <div class="mt-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 animate-pulse">
                                        <span class="text-xs text-yellow-700 block">取餐码</span>
                                        <span class="text-2xl font-black tracking-widest text-yellow-700">${o.pickupCode}</span>
                                    </div>` : ''}
                            </div>
                        </div>
                        ${ORDER_FLOW.includes(o.status) ? `
                        <div class="flex items-center mt-4">
                            ${ORDER_FLOW.map((s, idx) => `
                                <div class="flex items-center ${idx < ORDER_FLOW.length - 1 ? 'flex-1' : ''}">
                                    <div class="flex flex-col items-center">
                                        <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                                            ${idx <= stepIndex(o.status) ? (o.status === '待取餐' && idx === stepIndex(o.status) ? 'bg-yellow-400 text-white animate-pulse' : 'bg-appleBlue text-white') : 'bg-gray-200 text-gray-400'}">
                                            ${idx < stepIndex(o.status) ? '✓' : idx + 1}
                                        </div>
                                        <span class="text-[11px] mt-1 ${idx <= stepIndex(o.status) ? 'text-appleDark font-medium' : 'text-gray-400'}">${s}</span>
                                    </div>
                                    ${idx < ORDER_FLOW.length - 1 ? `<div class="flex-1 h-0.5 mx-2 ${idx < stepIndex(o.status) ? 'bg-appleBlue' : 'bg-gray-200'}"></div>` : ''}
                                </div>`).join('')}
                        </div>` : `<p class="mt-4 text-sm font-medium ${o.status === '已取消' || o.status === '已退款' ? 'text-red-500' : 'text-appleLightGray'}">当前状态：${o.status}${o.status === '未支付' ? '（可到收银台继续支付）' : ''}</p>`}
                    </div>`).join('')}
            `;
        }
```

并在 `navigate(view)` 函数体中（`render();` 之前或之后均可）追加：

```js
            if (view === 'orders') startOrderPolling(); else stopOrderPolling();
```

- [ ] **Step 3: 确认 `closeModal()` 存在**

在 `app.js` 中搜索 `function closeModal`。若不存在，追加：

```js
        function closeModal() { modalRoot.innerHTML = ''; }
```

- [ ] **Step 4: 全链路手动验证**

后端 `npm start`、前端 `python -m http.server 8000`（canteen 目录）：
1. 登录 → 加购 → 购物车结算 → 确认订单 → 收银台确认支付 → 弹出大字取餐码、余额正确扣减；
2. 自动跳转「我的订单」，状态停留在「已支付」；
3. 用 curl 模拟 B 端流转：

```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/users/login -H "Content-Type: application/json" -d '{"zhanghao":"admin","mima":"admin123"}' | python -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")
curl -s -X PUT http://localhost:5000/api/orders/<ORDERID>/status -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"status":"制作中"}'
curl -s -X PUT http://localhost:5000/api/orders/<ORDERID>/status -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"status":"待取餐"}'
```

Expected: C 端页面 3 秒内时间线自动推进到「制作中」→「待取餐」并高亮显示取餐码，无需手动刷新。

- [ ] **Step 5: Commit**

```bash
git add canteen/
git commit -m "feat(canteen): 订单确认/收银台/取餐码/我的订单（3s 轮询状态时间线）"
```

---

### Task 13: C 端个人中心（资料保存）

**Files:**
- Modify: `canteen/api.js`（renderUserEntry 用户名可点击）
- Modify: `canteen/app.js`（追加资料编辑模态）

**Interfaces:**
- Consumes: `api()`、`currentUser()`、`setSession()`、`getToken()`、`openLoginModal()`（api.js）；后端 `PUT /users/:id`（Task 3 已保护：本人或 admin）。
- Produces: `openProfileModal()`、`saveProfile()`；用户资料修改后写入 localStorage 并即时反映到导航栏。

- [ ] **Step 1: `api.js` 中 renderUserEntry 的用户名改为可点击入口**

将 renderUserEntry 中已登录分支的模板替换为：

```js
  slot.innerHTML = user
    ? `<a href="javascript:void(0)" onclick="openProfileModal()" class="text-sm font-medium mr-3 hover:opacity-80 transition" title="编辑资料">👋 ${user.xingming} <span class="text-appleBlue font-bold">¥${Number(user.jine).toFixed(2)}</span></a>
       <button onclick="logout()" class="text-sm text-appleLightGray hover:text-appleDark transition">退出</button>`
    : `<button onclick="openLoginModal()" class="bg-appleBlue text-white text-sm px-5 py-2 rounded-full font-medium hover:opacity-90 transition glass-btn-active">登录 / 注册</button>`;
```

- [ ] **Step 2: `app.js` 追加资料编辑模态（完整代码）**

```js
        // ================= 个人中心：资料编辑 =================
        function openProfileModal() {
            const user = currentUser();
            if (!user) return openLoginModal();
            modalRoot.innerHTML = `
                <div class="fixed inset-0 z-[100] flex items-center justify-center glass-modal" onclick="if(event.target===this)closeModal()">
                    <div class="bg-white rounded-[28px] p-8 w-[92%] max-w-[400px] shadow-appleHover slide-up">
                        <h2 class="text-2xl font-bold mb-1">个人资料</h2>
                        <p class="text-appleLightGray text-sm mb-6">账号 ${user.zhanghao} · 余额 ¥${Number(user.jine).toFixed(2)}</p>
                        <label class="text-sm text-appleLightGray block mb-2">姓名</label>
                        <input id="profile-name" value="${user.xingming || ''}" class="w-full bg-appleGray rounded-xl px-4 py-3 mb-4 outline-none focus:ring-2 ring-appleBlue/50 text-sm">
                        <label class="text-sm text-appleLightGray block mb-2">性别</label>
                        <select id="profile-gender" class="w-full bg-appleGray rounded-xl px-4 py-3 mb-4 outline-none text-sm">
                            <option value="男" ${user.xingbie === '男' ? 'selected' : ''}>男</option>
                            <option value="女" ${user.xingbie === '女' ? 'selected' : ''}>女</option>
                        </select>
                        <label class="text-sm text-appleLightGray block mb-2">联系方式</label>
                        <input id="profile-phone" value="${user.lianxifangshi || ''}" class="w-full bg-appleGray rounded-xl px-4 py-3 mb-6 outline-none focus:ring-2 ring-appleBlue/50 text-sm">
                        <button onclick="saveProfile()" class="w-full bg-appleBlue text-white py-3 rounded-full font-bold hover:opacity-90 transition glass-btn-active">保存</button>
                    </div>
                </div>`;
        }

        async function saveProfile() {
            const user = currentUser();
            const payload = {
                xingming: document.getElementById('profile-name').value.trim(),
                xingbie: document.getElementById('profile-gender').value,
                lianxifangshi: document.getElementById('profile-phone').value.trim()
            };
            if (!payload.xingming) return toast('姓名不能为空', 'warning');
            const { status, json } = await api('PUT', `/users/${user.id}`, payload);
            if (status !== 200) return toast(json.message || '保存失败', 'error');
            setSession(getToken(), { ...user, ...payload });
            closeModal();
            renderUserEntry();
            toast('资料已保存', 'success');
        }
```

- [ ] **Step 3: 手动验证**

前后端启动后：登录 → 点击导航栏用户名 → 修改联系方式并保存 → toast 提示成功；退出重新登录 → 导航栏显示修改后的姓名/信息（登录接口返回最新数据即为证据）。

- [ ] **Step 4: Commit**

```bash
git add canteen/
git commit -m "feat(canteen): 个人中心资料编辑与保存（接 PUT /users/:id）"
```

---

### Task 14: B 端登录、接单/叫号/核销操作流、菜品上下架与库存预警

**Files:**
- Modify: `server/routes/dishes.js:10-12,44-46,104-125`（SELECT 与 PUT 追加 `shangjia`）
- Modify: `management/index.html`（追加登录遮罩）
- Modify: `management/admin-script.js`（apiCall 带 token、登录逻辑、订单操作流、上下架按钮、库存预警）

**Interfaces:**
- Consumes: 后端 `POST /users/login`（`data.user.role`）、`PUT /orders/:orderid/status`（状态机）、`POST /orders/:orderid/pickup`、菜品 `shangjia` 字段。
- Produces:
  - B 端进入需 admin 登录；`localStorage` 键 `zx_admin_token` / `zx_admin_name`。
  - `acceptOrder(orderid)`（已支付→制作中）、`callOrder(orderid)`（制作中→待取餐）、`verifyPickup(orderid)`（核销）、`refundOrder(orderid)`（已支付→已退款）、`toggleDishSale(id, next)`（上下架）。
  - 菜品 `GET /dishes` 与 `GET /dishes/:id` 响应含 `shangjia`；`PUT /dishes/:id` 接受 `shangjia`。

- [ ] **Step 1: 后端 `server/routes/dishes.js` 补 `shangjia`**

`GET /`（第 10-12 行）与 `GET /:id`（第 44-46 行）的 SELECT 字段列表末尾追加 `, shangjia`（即 `... pinfen, kucun, shangjia`）。

`PUT /:id`（第 104-125 行）：解构追加 `shangjia`，SQL 的 SET 列表追加一行：

```js
    const { caipinmingcheng, caipinfenlei, tupian, cailiao, guige, jiage, yingyang, kucun, shangjia } = req.body;
```

```js
          kucun = COALESCE(?, kucun),
          shangjia = COALESCE(?, shangjia)
```

对应 `.run(...)` 参数末尾在 `req.params.id` 前插入 `shangjia`。

验证：`cd server && npm test` 全部 PASS（回归）。

- [ ] **Step 2: `management/index.html` 追加登录遮罩**

在 `<main id="main-content">` 之后、`<footer>` 之前插入：

```html
    <!-- 管理员登录遮罩 -->
    <div id="login-overlay" style="display:none; position:fixed; inset:0; background:rgba(245,245,247,0.97); z-index:10000; align-items:center; justify-content:center;">
        <div class="card" style="width: 360px; padding: 40px; border-radius: 24px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 12px;">🍚</div>
            <h2 style="margin: 0 0 6px 0; font-size: 22px;">智饷后勤管理系统</h2>
            <p style="color: #86868b; font-size: 13px; margin: 0 0 28px 0;">请使用管理员账号登录</p>
            <input id="login-account" placeholder="账号" style="width: 100%; padding: 12px 16px; border: 1px solid #d2d2d7; border-radius: 12px; margin-bottom: 12px; font-size: 14px; outline: none; box-sizing: border-box;">
            <input id="login-password" type="password" placeholder="密码" style="width: 100%; padding: 12px 16px; border: 1px solid #d2d2d7; border-radius: 12px; margin-bottom: 20px; font-size: 14px; outline: none; box-sizing: border-box;" onkeydown="if(event.key==='Enter')submitAdminLogin()">
            <button class="btn" style="width: 100%; background: #0066cc; color: white; padding: 12px; border-radius: 12px; font-size: 15px;" onclick="submitAdminLogin()">登 录</button>
        </div>
    </div>
```

- [ ] **Step 3: `management/admin-script.js`——token 化 apiCall 与登录逻辑**

**关键结构事实**（务必遵守）：`apiCall` 与 `showToast` 是全局函数（第 6-70 行，在 `DOMContentLoaded` 之外）；第 72-1222 行全部在 `DOMContentLoaded` 闭包内；闭包内需要被 HTML `onclick` 调用的函数一律用 `window.xxx = function` 模式导出（现有代码即此约定，如 `window.deleteDish`）。`loadModule` 是闭包内函数，全局作用域无法直接调用。

① 全局 `apiCall`（第 47-70 行）整体替换为（401 时直接操作遮罩 DOM，避免跨作用域调用闭包函数）：

```js
// 统一 API 请求封装
async function apiCall(method, endpoint, data = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('zx_admin_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (data) options.body = JSON.stringify(data);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (response.status === 401) {
            localStorage.removeItem('zx_admin_token');
            const overlay = document.getElementById('login-overlay');
            if (overlay) overlay.style.display = 'flex';
            throw new Error('登录已过期，请重新登录');
        }
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || '请求失败');
        return json;
    } catch (error) {
        console.error(`API Error [${method} ${endpoint}]:`, error);
        throw error;
    }
}
```

② 闭包内的 `init()`（第 80-83 行）替换为（`showLoginOverlay` / `enterDashboard` 均为闭包内函数，`loadModule` 可直接访问）：

```js
    function init() {
        setupNavigation();
        if (localStorage.getItem('zx_admin_token')) {
            enterDashboard();
        } else {
            showLoginOverlay();
        }
    }

    function showLoginOverlay() {
        document.getElementById('login-overlay').style.display = 'flex';
    }

    function enterDashboard() {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('admin-name').innerText =
            localStorage.getItem('zx_admin_name') || '管理员';
        loadModule('dashboard');
    }

    // 管理员登录（onclick 调用，需挂 window）
    window.submitAdminLogin = async function() {
        const zhanghao = document.getElementById('login-account').value.trim();
        const mima = document.getElementById('login-password').value;
        if (!zhanghao || !mima) return showToast('请输入账号和密码', 'warning');
        try {
            const res = await apiCall('POST', '/users/login', { zhanghao, mima });
            if (res.data?.user?.role !== 'admin') {
                return showToast('该账号不是管理员，无权进入后勤系统', 'error');
            }
            localStorage.setItem('zx_admin_token', res.data.token);
            localStorage.setItem('zx_admin_name', res.data.user.xingming);
            showToast(`欢迎，${res.data.user.xingming}`, 'success');
            enterDashboard();
        } catch (e) {
            showToast(e.message || '登录失败', 'error');
        }
    };
```

③ 退出按钮逻辑（第 111-116 行）替换为：

```js
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('zx_admin_token');
            localStorage.removeItem('zx_admin_name');
            showToast('已安全退出登录', 'success');
            setTimeout(() => showLoginOverlay(), 600);
        });
```

- [ ] **Step 4: 订单管理改操作流（替换状态下拉框）**

`renderCanteenManagement` 中订单表格的「状态调整」列（第 509-517 行的 `<select>` 块）替换为：

```js
                                        <td>
                                            ${order.status === '已支付' ? `
                                                <button class="btn btn-success" style="padding: 6px 14px; font-size: 12px;" onclick="acceptOrder('${order.orderid}')">接单</button>
                                                <button class="btn" style="padding: 6px 10px; font-size: 12px; margin-left: 4px; color: #ff3b30;" onclick="refundOrder('${order.orderid}')">退款</button>
                                            ` : order.status === '制作中' ? `
                                                <button class="btn" style="padding: 6px 14px; font-size: 12px; background: #ff9500; color: white;" onclick="callOrder('${order.orderid}')">叫号取餐</button>
                                            ` : order.status === '待取餐' ? `
                                                <div style="display: flex; gap: 6px; align-items: center;">
                                                    <input id="pickup-input-${order.orderid}" placeholder="取餐码" maxlength="4"
                                                           style="width: 64px; padding: 6px 8px; border: 1px solid #d2d2d7; border-radius: 8px; font-size: 12px; text-transform: uppercase; outline: none;">
                                                    <button class="btn btn-success" style="padding: 6px 12px; font-size: 12px;" onclick="verifyPickup('${order.orderid}')">核销</button>
                                                </div>
                                            ` : `<span style="color: #86868b; font-size: 12px;">—</span>`}
                                        </td>
```

同时状态徽章的 class 判断（第 501-507 行）追加 `待取餐` 高亮：

```js
                                            <span class="badge ${
                                                order.status === '待取餐' ? 'badge-warning' :
                                                order.status === '已支付' ? 'badge-success' :
                                                order.status === '制作中' ? 'badge-warning' :
                                                order.status === '已完成' ? 'badge-success' : 'badge-danger'
                                            }">
```

表格「当前状态」列的徽章下方追加取餐码展示（便于档口核对），在 `</span>` 后追加：

```js
                                                ${order.pickupCode ? `<div style="font-size: 11px; color: #86868b; margin-top: 4px;">码: <b>${order.pickupCode}</b></div>` : ''}
```

分组逻辑（第 340-361 行）的 `groupedOrders[o.orderid]` 初始化对象中追加 `pickupCode: o.pickup_code,`（后端 `GET /orders` 已返回 `pickup_code`，Task 6 已加）。

- [ ] **Step 5: 追加订单操作函数（替换原 `updateOrderStatus`）**

找到现有 `window.updateOrderStatus = async function(...)`（第 1080-1089 行，位于 `DOMContentLoaded` 闭包内），整体替换为（`refreshOrderModule` 是闭包内普通函数可直接调 `loadModule`；其余为 `window.*` 导出供 onclick 调用）：

```js
    // ==================== 订单操作流：接单 → 叫号 → 核销 ====================
    async function refreshOrderModule() {
        await loadModule('canteen');
        // 重新激活"订单管理"Tab（第 3 个 tab-button）
        const tabs = document.querySelectorAll('.tab-button');
        if (tabs[2]) tabs[2].click();
    }

    window.acceptOrder = async function(orderid) {
        try {
            await apiCall('PUT', `/orders/${orderid}/status`, { status: '制作中' });
            showToast('已接单，开始制作', 'success');
            await refreshOrderModule();
        } catch (e) { showToast(e.message, 'error'); }
    };

    window.callOrder = async function(orderid) {
        try {
            await apiCall('PUT', `/orders/${orderid}/status`, { status: '待取餐' });
            showToast('已叫号，等待学生取餐', 'success');
            await refreshOrderModule();
        } catch (e) { showToast(e.message, 'error'); }
    };

    window.verifyPickup = async function(orderid) {
        const input = document.getElementById(`pickup-input-${orderid}`);
        const pickupCode = (input?.value || '').trim().toUpperCase();
        if (!pickupCode) return showToast('请输入学生出示的取餐码', 'warning');
        try {
            await apiCall('POST', `/orders/${orderid}/pickup`, { pickupCode });
            showToast('核销成功，订单完成', 'success');
            await refreshOrderModule();
        } catch (e) { showToast(e.message, 'error'); }
    };

    window.refundOrder = async function(orderid) {
        if (!confirm('确认对该订单退款？')) return;
        try {
            await apiCall('PUT', `/orders/${orderid}/status`, { status: '已退款' });
            showToast('已退款', 'success');
            await refreshOrderModule();
        } catch (e) { showToast(e.message, 'error'); }
    };
```

- [ ] **Step 6: 菜品上下架与库存预警**

菜品表格「库存」列（第 442 行 `<td>${dish.kucun} 份</td>`）替换为：

```js
                                        <td style="${dish.kucun < 20 ? 'color: #ff3b30; font-weight: 700;' : ''}">
                                            ${dish.kucun} 份${dish.kucun < 20 ? ' ⚠️' : ''}
                                        </td>
```

「操作」列的删除按钮后追加上下架按钮：

```js
                                            <button class="btn" style="padding: 6px 12px; font-size: 12px; margin-left: 4px; ${dish.shangjia === '否' ? 'background: #34c759; color: white;' : ''}"
                                                    onclick="toggleDishSale(${dish.id}, '${dish.shangjia === '否' ? '是' : '否'}')">${dish.shangjia === '否' ? '上架' : '下架'}</button>
```

并在菜品名称列追加下架标识——`<strong>${dish.caipinmingcheng}</strong>` 后追加：

```js
${dish.shangjia === '否' ? ' <span class="badge badge-danger">已下架</span>' : ''}
```

追加操作函数（紧跟现有 `window.deleteDish` 定义之后，同在闭包内，用 `window.*` 导出）：

```js
    // 菜品上下架
    window.toggleDishSale = async function(id, next) {
        try {
            await apiCall('PUT', `/dishes/${id}`, { shangjia: next });
            showToast(next === '是' ? '菜品已上架' : '菜品已下架', 'success');
            await loadModule('canteen');
            const tabs = document.querySelectorAll('.tab-button');
            if (tabs[1]) tabs[1].click();
        } catch (e) { showToast(e.message, 'error'); }
    };
```

- [ ] **Step 7: 全链路端到端验证**

1. 后端 `npm start`；`cd management && python -m http.server 5500`；C 端 `python -m http.server 8000`（canteen 目录）。
2. 打开 `http://localhost:5500` → 出现登录遮罩 → `admin / admin123` 登录 → 数据大屏正常。
3. C 端学生登录下单并支付。
4. B 端「食堂管控 → 订单管理」看到订单 → 点「接单」→ 点「叫号取餐」→ C 端「我的订单」3 秒内变「待取餐」并显示取餐码。
5. B 端输入错误取餐码 → toast「取餐码不正确」；输入正确取餐码 → 核销成功，C 端 3 秒内变「已完成」。
6. B 端下架某菜品 → C 端刷新后该菜品消失；库存 < 20 的菜品在 B 端标红 ⚠️。
7. 回归：`cd server && npm test` 全 PASS；`npm run smoke` 全通过。

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(management): 管理员登录、接单/叫号/核销操作流、菜品上下架与库存预警

BREAKING: B 端写接口需 admin token（localStorage: zx_admin_token）"
```

---

## 收尾检查清单（阶段 1  Definition of Done）

- [ ] `cd server && npm test` 全部通过
- [ ] `cd server && npm run smoke` 15 项断言全部通过
- [ ] C 端动线走查：注册/登录 → 浏览真实菜品 → 加购（刷新不丢）→ 确认订单 → 收银台支付（余额/库存真实扣减）→ 大字取餐码 → 我的订单 3s 轮询推进
- [ ] B 端动线走查：admin 登录 → 接单 → 叫号 → 错误码拒绝 → 正确码核销 → C 端同步「已完成」
- [ ] 无 token 调用写接口返回 401；普通用户调 admin 接口返回 403
- [ ] 阶段 2（主题换肤/推荐首页/数据大屏真实化）另立计划，不在本计划范围
