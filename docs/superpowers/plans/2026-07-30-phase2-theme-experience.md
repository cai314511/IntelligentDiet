# 阶段 2「体验与卖点」实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付「风格宇宙」主题换肤系统（6 套纯 CSS/SVG 主题）+ 主题联动个性化推荐首页 + B 端数据大屏真实化，并打包修掉阶段 1 遗留的低成本问题。

**Architecture:** 主题系统 = `themes.css`（CSS 变量 + `body[data-theme]` 对 Tailwind apple* 语义色类的全站重映射）+ `themes.js`（主题注册表/切换/推荐打分），零构建、即插即用；推荐为客户端打分（主题人设 → DB.menu 过滤排序），不接新 API；大屏真实化新增聚合端点 `GET /api/stats/dashboard`。

**Tech Stack:** 同阶段 1（Express + better-sqlite3 + node:test + supertest；原生 HTML/CSS/JS + Tailwind CDN）。

**Spec:** `docs/superpowers/specs/2026-07-30-zhixiang-canteen-fullstack-redesign-design.md`（第 4.2/5 章阶段 2 部分 + 阶段 1 评审遗留清单）

## Global Constraints

- 阶段 1 全部约束继续有效（拼音字段、`{code, message}`、状态机、bcryptjs、JWT）。
- 主题 **6 套**（用户已确认）：`minimal` 极简留白（默认=现状）、`anime` 动漫次元、`esports` 电竞赛博、`guofeng` 国风墨韵、`music` 音乐现场、`sports` 运动活力。**禁止**使用具体动漫/明星 IP 名称与官方素材，全部原创风格化。
- 主题选择存 `localStorage` 键 `zx_theme`；换肤不得引起页面刷新或闪烁（CSS 变量即时生效）。
- 推荐必须是客户端真实打分（基于 DB.menu 的 rating/protein/category/sales 字段），禁止硬编码推荐列表。
- 时间显示：数据库存 UTC，前端展示一律 `fmtTime()` 转北京时间（UTC+8）。
- 前端零构建：新文件用 `<script src>`/`<link>` 引入；脚本加载顺序 `themes.js → api.js → app.js`。
- 每个 Task 完成后按步骤提交 git commit（仓库根：`zhixiang/`，main 分支；执行时先切 `phase-2-experience` 分支）。
- git 提交统一用 `git -c user.name="zhixiang-dev" -c user.email="dev@localhost" commit`。

---

### Task 1: 后端收尾包（餐厅名统一 / 大屏统计端点 / 取餐码重试）

**Files:**
- Modify: `server/routes/restaurants.js:9-43`（硬编码餐厅数组）
- Create: `server/routes/stats.js`
- Modify: `server/app.js`（挂载 stats 路由）
- Modify: `server/routes/orders.js`（pay 端点取餐码生成处）
- Test: `server/tests/stats.test.js`

**Interfaces:**
- Consumes: 现有 orders/dishes/yonghu/messages 表；`requireAdmin`。
- Produces:
  - `GET /api/restaurants` 返回 4 家餐厅，名称与 C 端叙事统一：`沙河校区·东区一楼餐厅`、`沙河校区·子衿食园`、`沙河校区·风味餐厅`、`南路校区·龙马一餐厅`（字段结构 name/queueTime/queueCount/totalSeats/availableSeats/image/rating/description 不变）。
  - `GET /api/stats/dashboard`（requireAdmin）→ `{code:200, data:{totalUsers, totalOrders, totalRevenue, todayOrders, todayRevenue, avgOrderValue, onSaleDishes, totalDishes, lowStockCount, pendingAccept, pendingPickup, unrepliedMessages}}`。
  - 支付取餐码：与活跃订单（状态 NOT IN '已完成','已取消','已退款'）撞码时重试，最多 5 次。

- [ ] **Step 1: 写失败测试 `server/tests/stats.test.js`**

```js
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.DB_PATH = ':memory:';
const { db } = await import('../database.js');
const { default: app } = await import('../app.js');
const bcrypt = (await import('bcryptjs')).default;

let adminToken, userToken;

before(async () => {
  db.prepare("INSERT INTO caipinfenlei (caipinfenlei) VALUES ('热菜')").run();
  db.prepare("INSERT INTO yonghu (id, zhanghao, mima, xingming, role) VALUES (1, 'boss', ?, '老板', 'admin')").run(bcrypt.hashSync('boss123', 10));
  db.prepare("INSERT INTO yonghu (id, zhanghao, mima, xingming, jine, role) VALUES (2, 'stu', ?, '学生', 1000, 'user')").run(bcrypt.hashSync('stu12345', 10));
  db.prepare("INSERT INTO caipinxinxi (id, caipinmingcheng, caipinfenlei, jiage, kucun, shangjia) VALUES (1, '红烧肉', '热菜', 15, 10, '是')").run();
  db.prepare("INSERT INTO caipinxinxi (id, caipinmingcheng, caipinfenlei, jiage, kucun, shangjia) VALUES (2, '青菜', '热菜', 5, 5, '否')").run();
  db.prepare("INSERT INTO orders (orderid, userid, caipinxinxiid, caipinmingcheng, buyshu, price, total, status) VALUES ('O1', 2, 1, '红烧肉', 2, 15, 30, '已完成')").run();
  db.prepare("INSERT INTO orders (orderid, userid, caipinxinxiid, caipinmingcheng, buyshu, price, total, status) VALUES ('O2', 2, 1, '红烧肉', 1, 15, 15, '已支付')").run();
  db.prepare("INSERT INTO messages (userid, yonghuming, content) VALUES (2, '学生', '建议')").run();
  adminToken = (await request(app).post('/api/users/login').send({ zhanghao: 'boss', mima: 'boss123' })).body.data.token;
  userToken = (await request(app).post('/api/users/login').send({ zhanghao: 'stu', mima: 'stu12345' })).body.data.token;
});

test('stats/dashboard 返回全字段且数值正确', async () => {
  const res = await request(app).get('/api/stats/dashboard').set('Authorization', `Bearer ${adminToken}`);
  assert.equal(res.status, 200);
  const d = res.body.data;
  assert.equal(d.totalUsers, 1);            // role='user' 仅 stu
  assert.equal(d.totalOrders, 2);           // DISTINCT orderid
  assert.equal(d.totalRevenue, 45);         // 已支付+已完成计入
  assert.equal(d.todayOrders, 2);           // 种子订单 addtime 默认当前时间（UTC+8 今日）
  assert.equal(d.onSaleDishes, 1);
  assert.equal(d.totalDishes, 2);
  assert.equal(d.lowStockCount, 1);         // kucun=5 < 20
  assert.equal(d.pendingAccept, 1);         // 已支付待接单
  assert.equal(d.pendingPickup, 0);
  assert.equal(d.unrepliedMessages, 1);
  assert.ok(d.avgOrderValue > 0);
});

test('stats/dashboard 非 admin 403，无 token 401', async () => {
  const r1 = await request(app).get('/api/stats/dashboard').set('Authorization', `Bearer ${userToken}`);
  assert.equal(r1.status, 403);
  const r2 = await request(app).get('/api/stats/dashboard');
  assert.equal(r2.status, 401);
});

test('餐厅名称与 C 端叙事统一', async () => {
  const res = await request(app).get('/api/restaurants');
  const names = res.body.data.map(r => r.name);
  assert.ok(names.includes('沙河校区·东区一楼餐厅'));
  assert.ok(names.includes('沙河校区·子衿食园'));
  assert.ok(names.includes('沙河校区·风味餐厅'));
  assert.ok(names.includes('南路校区·龙马一餐厅'));
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd server && npm test`
Expected: stats.test.js FAIL（404 与旧餐厅名）。

- [ ] **Step 3: 创建 `server/routes/stats.js`**

```js
import express from 'express';
import { db } from '../database.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// 数据大屏聚合统计（管理员）。今日按北京时间（UTC+8）边界计算。
router.get('/dashboard', requireAdmin, (req, res) => {
  try {
    const PAID_STATUS = "('已支付','制作中','待取餐','已完成')";

    const totalUsers = db.prepare("SELECT COUNT(*) AS c FROM yonghu WHERE role = 'user'").get().c;
    const totalOrders = db.prepare('SELECT COUNT(DISTINCT orderid) AS c FROM orders').get().c;
    const revenue = db.prepare(`
      SELECT COALESCE(SUM(total), 0) AS s FROM orders WHERE status IN ${PAID_STATUS}
    `).get().s;
    const today = db.prepare(`
      SELECT COUNT(DISTINCT orderid) AS c, COALESCE(SUM(total), 0) AS s
      FROM orders
      WHERE status IN ${PAID_STATUS}
        AND date(addtime, '+8 hours') = date('now', '+8 hours')
    `).get();
    const totalDishes = db.prepare('SELECT COUNT(*) AS c FROM caipinxinxi').get().c;
    const onSaleDishes = db.prepare("SELECT COUNT(*) AS c FROM caipinxinxi WHERE shangjia = '是'").get().c;
    const lowStockCount = db.prepare('SELECT COUNT(*) AS c FROM caipinxinxi WHERE kucun < 20').get().c;
    const pendingAccept = db.prepare("SELECT COUNT(DISTINCT orderid) AS c FROM orders WHERE status = '已支付'").get().c;
    const pendingPickup = db.prepare("SELECT COUNT(DISTINCT orderid) AS c FROM orders WHERE status = '待取餐'").get().c;
    const unrepliedMessages = db.prepare('SELECT COUNT(*) AS c FROM messages WHERE replycontent IS NULL').get().c;

    res.json({
      code: 200,
      data: {
        totalUsers,
        totalOrders,
        totalRevenue: revenue,
        todayOrders: today.c,
        todayRevenue: today.s,
        avgOrderValue: totalOrders > 0 ? Math.round((revenue / totalOrders) * 100) / 100 : 0,
        onSaleDishes,
        totalDishes,
        lowStockCount,
        pendingAccept,
        pendingPickup,
        unrepliedMessages
      }
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

export default router;
```

- [ ] **Step 4: `server/app.js` 挂载路由**

import 区追加 `import statsRoutes from './routes/stats.js';`，路由挂载区（aiRoutes 之后）追加 `app.use('/api/stats', statsRoutes);`。

- [ ] **Step 5: `server/routes/restaurants.js` 餐厅数组替换**

将第 9-43 行的 3 个餐厅对象替换为（字段结构不变）：

```js
    const restaurants = [
      {
        id: 1,
        name: "沙河校区·东区一楼餐厅",
        queueTime: 26,
        queueCount: 120,
        totalSeats: 200,
        availableSeats: 28,
        image: "https://via.placeholder.com/200x150/0066CC/FFFFFF?text=东区一楼",
        rating: 4.6,
        description: "学校主食堂，大众自选与面食档口，高峰期建议错峰"
      },
      {
        id: 2,
        name: "沙河校区·子衿食园",
        queueTime: 6,
        queueCount: 73,
        totalSeats: 130,
        availableSeats: 60,
        image: "https://via.placeholder.com/200x150/0071E3/FFFFFF?text=子衿食园",
        rating: 4.8,
        description: "环境清幽，二楼轻食轻语区适合自习简餐"
      },
      {
        id: 3,
        name: "沙河校区·风味餐厅",
        queueTime: 4,
        queueCount: 68,
        totalSeats: 150,
        availableSeats: 100,
        image: "https://via.placeholder.com/200x150/34C759/FFFFFF?text=风味餐厅",
        rating: 4.9,
        description: "特色小炒与地方风味，本周上新爆炒孜然羊肉"
      },
      {
        id: 4,
        name: "南路校区·龙马一餐厅",
        queueTime: 2,
        queueCount: 15,
        totalSeats: 120,
        availableSeats: 100,
        image: "https://via.placeholder.com/200x150/FF9500/FFFFFF?text=龙马一餐",
        rating: 4.5,
        description: "南路校区主力餐厅，宽敞人少"
      }
    ];
```

- [ ] **Step 6: 取餐码撞码重试（`server/routes/orders.js` pay 端点）**

找到 pay 端点中 `const pickupCode = generatePickupCode();` 一行，替换为：

```js
    // 取餐码与活跃订单查重，撞码重试（最多 5 次）
    let pickupCode = generatePickupCode();
    const codeClash = db.prepare(`
      SELECT COUNT(*) AS c FROM orders
      WHERE pickup_code = ? AND status NOT IN ('已完成', '已取消', '已退款')
    `);
    for (let i = 0; i < 5 && codeClash.get(pickupCode).c > 0; i++) {
      pickupCode = generatePickupCode();
    }
```

- [ ] **Step 7: 跑全部测试确认通过**

Run: `cd server && npm test`
Expected: 26/26 PASS（23 旧 + 3 新）。

- [ ] **Step 8: Commit**

```bash
git add server/
git commit -m "feat(server): 数据大屏统计端点、餐厅名跨端统一、取餐码撞码重试"
```

---

### Task 2: C 端收尾包（UTC+8 / 续付 / 导航高亮 / logo / 轮询竞态 / startup.bat）

**Files:**
- Modify: `canteen/api.js`（追加 fmtTime）
- Modify: `canteen/app.js`（renderOrdersView 三处、启动引导一处）
- Modify: `canteen/index.html:40`（logo 点击）
- Modify: `canteen/startup.bat`（init-db + B 端静态服务）

**Interfaces:**
- Consumes: Task 12 的 `openCashier(orderid, totalPrice)`、`renderOrdersView`。
- Produces:
  - `fmtTime(t): string`（api.js 全局）——把 `'YYYY-MM-DD HH:MM:SS'`（UTC）转北京时间显示。
  - 我的订单：未支付订单显示「去支付」按钮（`openCashier(o.orderid, o.total)`）；addtime 用 fmtTime 显示；轮询竞态防护。
  - 启动时导航当前页高亮；logo 点击 `navigate('order')`。

- [ ] **Step 1: `canteen/api.js` 末尾追加 fmtTime**

```js
// 数据库存 UTC，展示统一转北京时间（UTC+8）
function fmtTime(t) {
  if (!t) return '';
  const d = new Date(String(t).replace(' ', 'T') + 'Z');
  if (isNaN(d)) return t;
  return d.toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
```

- [ ] **Step 2: `canteen/app.js` renderOrdersView 修改三处**

① await 之后、分组之前插入竞态防护：

```js
            if (state.currentView !== 'orders') return;
```

（位置：`const { status, json } = await api('GET', ...)` 与 `if (status !== 200)` 之后、分组 `const groups = {};` 之前。）

② 订单号行的 `${o.addtime}` 改为 `${fmtTime(o.addtime)}`。

③ 未支付/已取消/已退款的文本分支（`ORDER_FLOW.includes(o.status)` 的 else 分支）整体替换为：

```js
` : `<div class="mt-4 flex items-center justify-between">
       <p class="text-sm font-medium ${o.status === '已取消' || o.status === '已退款' ? 'text-red-500' : 'text-appleLightGray'}">当前状态：${o.status}</p>
       ${o.status === '未支付' ? `<button onclick="openCashier('${o.orderid}', ${o.total})" class="bg-appleBlue text-white text-sm px-5 py-2 rounded-full font-bold glass-btn-active">去支付</button>` : ''}
     </div>`}
```

- [ ] **Step 3: 启动时导航高亮**

`app.js` 启动引导中 `(async () => { await loadRemoteData(); render(); updateCartUI(); })();` 的 `render();` 改为 `navigate(state.currentView);`（navigate 内部会 render + 设置 nav-link 高亮色）。

- [ ] **Step 4: `canteen/index.html` logo 点击**

第 40 行 `onclick="navigate('home')"` 改为 `onclick="navigate('order')"`。

- [ ] **Step 5: `canteen/startup.bat` 升级**

在后端启动段（`start "ZhiXiang Canteen - Backend API Server" ...` 之前）插入种子数据检查：

```bat
:: Seed database on first run
if not exist "%BACKEND_PATH%\data\zhixiang.db" (
    echo First run detected. Seeding database (npm run init-db)...
    call npm run init-db
)
```

在前端启动段之后（`echo -- Frontend Web Server has been spawned...` 之后）追加 B 端服务。**注意 cmd 内嵌引号必须用双写 `""` 转义**（路径含空格，`%~dp0..\management` 需要引号包裹）：

```bat
:: Start Admin (B-end) Web Server on 5500
start "ZhiXiang Canteen - Admin Web Server" cmd /k "chcp 65001 >nul && python -m http.server 5500 --directory ""%~dp0..\management"""
echo -- Admin Web Server has been spawned (http://localhost:5500)
```

并将结尾的地址提示改为三行（追加）：

```bat
echo   Student (C-end):  http://localhost:8000
echo   Admin (B-end):    http://localhost:5500  (admin / admin123)
```

- [ ] **Step 6: 验证**

- `node --check canteen/api.js && node --check canteen/app.js` 通过；
- grep 确认 index.html 无 `navigate('home')` 残留；
- 起后端 + C 端服务，curl `http://localhost:8000/startup.bat` 确认包含 `init-db` 字样（静态检查）。验证后停服务。

- [ ] **Step 7: Commit**

```bash
git add canteen/
git commit -m "fix(canteen): 时间显示 UTC+8、未支付订单续付入口、导航初始高亮、logo 跳转、轮询竞态防护、startup.bat 一键三端"
```

---

### Task 3: 主题系统基建（themes.css + themes.js）

**Files:**
- Create: `canteen/themes.css`
- Create: `canteen/themes.js`
- Modify: `canteen/index.html`（link + script 各一处）
- Modify: `canteen/app.js`（启动引导一处）

**Interfaces:**
- Consumes: 现有 Tailwind apple* 语义色类（bg-appleBlue/text-appleBlue/bg-appleGray/text-appleDark/text-appleLightGray/text-appleText/bg-white/glass-nav/glass-panel）。
- Produces（themes.js 全局，Task 4 依赖）：
  - `THEMES`：6 套主题注册表，每项 `{id, name, emoji, tagline, persona, cardBg, cardText, score(dish)}`。
  - `currentTheme(): string`（localStorage `zx_theme`，缺省 `'minimal'`）。
  - `applyTheme(id)`：设置 `document.body.dataset.theme` + 写 localStorage。
  - `getThemeById(id)`、`getThemeRecommendations(): dish[4]`（对 `DB.menu` 按主题 score 排序取前 4，过滤 stock<=0）。
  - `selectTheme(id)`：applyTheme + toast + `render()`。

- [ ] **Step 1: 创建 `canteen/themes.css`（完整内容）**

```css
/* ================= 智饷主题系统 ================= */
/* CSS 变量 + body[data-theme] 对 Tailwind apple* 语义色类的全站重映射。
   新增主题只需追加一个 [data-theme="xxx"] 变量块。 */

:root,
body[data-theme="minimal"] {
  --zx-primary: #0071E3;
  --zx-primary-ring: rgba(0, 113, 227, 0.5);
  --zx-bg: #F5F5F7;
  --zx-text: #1D1D1F;
  --zx-text-soft: #424245;
  --zx-muted: #86868B;
  --zx-card: #ffffff;
  --zx-soft-block: #F5F5F7;
  --zx-nav-bg: rgba(255, 255, 255, 0.8);
  --zx-nav-border: rgba(0, 0, 0, 0.05);
  --zx-panel-bg: rgba(255, 255, 255, 0.75);
  --zx-panel-border: rgba(255, 255, 255, 0.5);
  --zx-bg-image: none;
  --zx-bg-opacity: 0;
  --zx-radius: 20px;
}

body[data-theme="anime"] {
  --zx-primary: #FF6B9D;
  --zx-primary-ring: rgba(255, 107, 157, 0.5);
  --zx-bg: #FFF0F5;
  --zx-text: #4A3040;
  --zx-text-soft: #7A5468;
  --zx-muted: #B893A6;
  --zx-card: #ffffff;
  --zx-soft-block: #FFE4EE;
  --zx-nav-bg: rgba(255, 240, 245, 0.85);
  --zx-nav-border: rgba(255, 107, 157, 0.15);
  --zx-panel-bg: rgba(255, 255, 255, 0.85);
  --zx-panel-border: rgba(255, 107, 157, 0.25);
  --zx-bg-image: radial-gradient(#FFC2D9 2px, transparent 2px);
  --zx-bg-size: 28px;
  --zx-bg-opacity: 0.35;
  --zx-radius: 24px;
}

body[data-theme="esports"] {
  --zx-primary: #00E5FF;
  --zx-primary-ring: rgba(0, 229, 255, 0.5);
  --zx-bg: #0A0E17;
  --zx-text: #E0F7FF;
  --zx-text-soft: #9FD8E8;
  --zx-muted: #5B7A8C;
  --zx-card: #141B2D;
  --zx-soft-block: #1A2438;
  --zx-nav-bg: rgba(10, 14, 23, 0.85);
  --zx-nav-border: rgba(0, 229, 255, 0.2);
  --zx-panel-bg: rgba(20, 27, 45, 0.9);
  --zx-panel-border: rgba(0, 229, 255, 0.25);
  --zx-bg-image: linear-gradient(rgba(0,229,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.06) 1px, transparent 1px);
  --zx-bg-size: 40px 40px;
  --zx-bg-opacity: 1;
  --zx-radius: 8px;
}

body[data-theme="guofeng"] {
  --zx-primary: #C8102E;
  --zx-primary-ring: rgba(200, 16, 46, 0.4);
  --zx-bg: #F5F0E1;
  --zx-text: #2B2118;
  --zx-text-soft: #57493A;
  --zx-muted: #9C8C77;
  --zx-card: #FDFBF5;
  --zx-soft-block: #EFE7D3;
  --zx-nav-bg: rgba(245, 240, 225, 0.88);
  --zx-nav-border: rgba(200, 16, 46, 0.15);
  --zx-panel-bg: rgba(253, 251, 245, 0.9);
  --zx-panel-border: rgba(200, 16, 46, 0.2);
  --zx-bg-image: radial-gradient(rgba(200,16,46,0.08) 1.5px, transparent 1.5px);
  --zx-bg-size: 32px;
  --zx-bg-opacity: 0.5;
  --zx-radius: 6px;
}

body[data-theme="music"] {
  --zx-primary: #A78BFA;
  --zx-primary-ring: rgba(167, 139, 250, 0.5);
  --zx-bg: #12101F;
  --zx-text: #EDE9FE;
  --zx-text-soft: #B8AEE0;
  --zx-muted: #6E6399;
  --zx-card: #1E1B32;
  --zx-soft-block: #272244;
  --zx-nav-bg: rgba(18, 16, 31, 0.85);
  --zx-nav-border: rgba(167, 139, 250, 0.2);
  --zx-panel-bg: rgba(30, 27, 50, 0.9);
  --zx-panel-border: rgba(167, 139, 250, 0.25);
  --zx-bg-image: repeating-linear-gradient(90deg, rgba(167,139,250,0.05) 0 4px, transparent 4px 24px);
  --zx-bg-size: auto;
  --zx-bg-opacity: 1;
  --zx-radius: 20px;
}

body[data-theme="sports"] {
  --zx-primary: #FF6B35;
  --zx-primary-ring: rgba(255, 107, 53, 0.5);
  --zx-bg: #FFF7F0;
  --zx-text: #232330;
  --zx-text-soft: #4A4A5A;
  --zx-muted: #9A9AA8;
  --zx-card: #ffffff;
  --zx-soft-block: #FFE8DC;
  --zx-nav-bg: rgba(255, 247, 240, 0.88);
  --zx-nav-border: rgba(255, 107, 53, 0.15);
  --zx-panel-bg: rgba(255, 255, 255, 0.88);
  --zx-panel-border: rgba(255, 107, 53, 0.25);
  --zx-bg-image: repeating-linear-gradient(-45deg, rgba(255,107,53,0.04) 0 12px, transparent 12px 32px);
  --zx-bg-size: auto;
  --zx-bg-opacity: 1;
  --zx-radius: 16px;
}

/* ---- 通用重映射规则（变量驱动，全站即时生效） ---- */
body { background-color: var(--zx-bg) !important; color: var(--zx-text); }

body::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background-image: var(--zx-bg-image);
  background-size: var(--zx-bg-size, auto);
  opacity: var(--zx-bg-opacity, 0);
  pointer-events: none;
}

.bg-appleBlue { background-color: var(--zx-primary) !important; }
.text-appleBlue { color: var(--zx-primary) !important; }
.border-appleBlue { border-color: var(--zx-primary) !important; }
.ring-appleBlue\/50 { --tw-ring-color: var(--zx-primary-ring) !important; }
.hover\:text-appleBlue:hover { color: var(--zx-primary) !important; }
.bg-appleGray { background-color: var(--zx-soft-block) !important; }
.text-appleDark { color: var(--zx-text) !important; }
.text-appleText { color: var(--zx-text-soft) !important; }
.text-appleLightGray { color: var(--zx-muted) !important; }
.bg-white { background-color: var(--zx-card) !important; }

.glass-nav { background: var(--zx-nav-bg) !important; border-bottom-color: var(--zx-nav-border) !important; }
.glass-panel { background: var(--zx-panel-bg) !important; border-color: var(--zx-panel-border) !important; }

.interest-tag.active,
.option-tag.active { background-color: var(--zx-primary) !important; border-color: var(--zx-primary) !important; }

.rounded-\[20px\] { border-radius: var(--zx-radius) !important; }
.rounded-\[24px\] { border-radius: calc(var(--zx-radius) + 4px) !important; }
.rounded-\[28px\] { border-radius: calc(var(--zx-radius) + 8px) !important; }

/* 换肤过渡动画（避免生硬跳变） */
body, .bg-white, .bg-appleBlue, .bg-appleGray, .glass-nav, .glass-panel, .text-appleBlue, .text-appleDark, .text-appleText {
  transition: background-color 0.45s ease, color 0.45s ease, border-color 0.45s ease;
}
```

- [ ] **Step 2: 创建 `canteen/themes.js`（完整内容）**

```js
// ================= 智饷「风格宇宙」主题注册表 =================
// 6 套原创风格化主题（不使用任何具体 IP 名称与素材）。
// score(dish) 为主题人设推荐打分函数，dish 字段见 app.js 的 DB.menu 映射。

const THEMES = [
  {
    id: 'minimal', name: '极简留白', emoji: '⚪',
    tagline: '少即是多，回归食物本身',
    persona: '为你精选全店评分最高的口碑菜——简单，但不会错。',
    cardBg: 'linear-gradient(135deg,#F5F5F7,#FFFFFF)', cardText: '#1D1D1F',
    score: d => d.rating * 20 + Math.min(d.sales, 100) * 0.1
  },
  {
    id: 'anime', name: '动漫次元', emoji: '🌸',
    tagline: '二次元能量补给站',
    persona: '欧皇附体！为你捕捉本周上新与人气爆棚的梦幻菜品✨',
    cardBg: 'linear-gradient(135deg,#FF6B9D,#FFC2D9)', cardText: '#FFFFFF',
    score: d => (d.isNew ? 50 : 0) + d.sales * 0.2 + d.rating * 5
  },
  {
    id: 'esports', name: '电竞赛博', emoji: '⚡',
    tagline: '高能快充，Carry 全场',
    persona: '检测到能量缺口：为你锁定高热量快充组合，手速不掉线。',
    cardBg: 'linear-gradient(135deg,#0A0E17,#00E5FF)', cardText: '#E0F7FF',
    score: d => d.cal * 0.2 + (d.category === '套餐' || d.category === '面食' ? 40 : 0) + d.rating * 3
  },
  {
    id: 'guofeng', name: '国风墨韵', emoji: '🏮',
    tagline: '一箸一饮，皆是风雅',
    persona: '为你寻得温润滋补之选——慢火细炖，最抚凡人心。',
    cardBg: 'linear-gradient(135deg,#F5F0E1,#C8102E)', cardText: '#2B2118',
    score: d => (d.category === '汤品' || d.category === '粥品' ? 60 : 0)
      + (/汤|粥|炖|温补|清/.test(d.name + (d.tag || '')) ? 40 : 0) + d.rating * 4
  },
  {
    id: 'music', name: '音乐现场', emoji: '🎧',
    tagline: '把午餐开成 Livehouse',
    persona: '今日歌单已就绪：新品首发与特调饮品，为你的午后打 Call。',
    cardBg: 'linear-gradient(135deg,#12101F,#A78BFA)', cardText: '#EDE9FE',
    score: d => (d.category === '饮品' ? 50 : 0) + (d.isNew ? 40 : 0) + d.rating * 4
  },
  {
    id: 'sports', name: '运动活力', emoji: '🔥',
    tagline: '三分练，七分吃',
    persona: '增肌减脂模式 ON：为你筛出高蛋白、低负担的实力派。',
    cardBg: 'linear-gradient(135deg,#FF6B35,#FFB58A)', cardText: '#FFFFFF',
    score: d => d.protein * 3 - d.cal * 0.02 + d.rating * 3
  }
];

function getThemeById(id) {
  return THEMES.find(t => t.id === id) || THEMES[0];
}

function currentTheme() {
  return localStorage.getItem('zx_theme') || 'minimal';
}

function applyTheme(id) {
  document.body.setAttribute('data-theme', id);
  localStorage.setItem('zx_theme', id);
}

// 主题人设推荐：对真实菜单按 score 降序取前 4，过滤售罄
function getThemeRecommendations() {
  const theme = getThemeById(currentTheme());
  return [...DB.menu]
    .filter(d => d.stock === undefined || d.stock > 0)
    .sort((a, b) => theme.score(b) - theme.score(a))
    .slice(0, 4);
}

function selectTheme(id) {
  applyTheme(id);
  const t = getThemeById(id);
  toast(`${t.emoji} 已切换到「${t.name}」`, 'success');
  render();
}
```

- [ ] **Step 3: `canteen/index.html` 接线**

① 第 34 行 `<link rel="stylesheet" href="app.css">` 之后追加一行：

```html
    <link rel="stylesheet" href="themes.css">
```

② 第 131 行 `<script src="api.js"></script>` 之前插入一行：

```html
    <script src="themes.js"></script>
```

- [ ] **Step 4: `canteen/app.js` 启动引导应用主题**

启动引导的 `loadCart();` 之后、`renderUserEntry();` 之前插入一行：

```js
        applyTheme(currentTheme());
```

- [ ] **Step 5: 验证**

`node --check canteen/themes.js` 通过；起 C 端静态服务，curl 确认 `themes.css`/`themes.js` 均 200；grep index.html 确认加载顺序为 themes.css 在 app.css 后、themes.js 在 api.js 前。验证后停服务。

- [ ] **Step 6: Commit**

```bash
git add canteen/
git commit -m "feat(canteen): 主题系统基建——6 套 CSS 变量主题与注册表"
```

---

### Task 4: 风格宇宙选择器与主题联动推荐首页

**Files:**
- Modify: `canteen/app.js`（renderOrderView 注入两个新区块 + 追加两个渲染函数）

**Interfaces:**
- Consumes: Task 3 的 `THEMES/currentTheme/getThemeById/getThemeRecommendations/selectTheme`；`DB.menu`（Task 10 真实数据）；`addToCart`（Task 11）。
- Produces: `renderThemeUniverse(): html`、`renderThemeRecommend(): html`；智能点餐首页顶部依次出现「🌌 风格宇宙」选择器与「为你推荐」主题推荐区。

- [ ] **Step 1: `canteen/app.js` 追加两个渲染函数**

放在 `renderOrderView` 定义之前（紧跟 `function render()` 之后即可）：

```js
        // ================= 风格宇宙：主题选择器 =================
        function renderThemeUniverse() {
            const cur = currentTheme();
            return `
                <div class="mb-10 fade-in">
                    <div class="mb-4">
                        <h2 class="text-2xl font-bold">🌌 风格宇宙</h2>
                        <p class="text-appleLightGray text-sm mt-1">选择你的热爱，全站即刻为你换肤</p>
                    </div>
                    <div class="flex space-x-4 overflow-x-auto no-scrollbar pb-2">
                        ${THEMES.map(t => `
                            <div onclick="selectTheme('${t.id}')"
                                 class="shrink-0 w-44 rounded-[20px] p-4 cursor-pointer hover:-translate-y-1 transition-transform glass-btn-active ${cur === t.id ? 'ring-2 ring-appleBlue ring-offset-2' : ''}"
                                 style="background:${t.cardBg};">
                                <div class="text-3xl mb-2">${t.emoji}</div>
                                <div class="font-bold text-sm" style="color:${t.cardText};">${t.name}</div>
                                <div class="text-xs mt-1 leading-snug" style="color:${t.cardText};opacity:.75;">${t.tagline}</div>
                                ${cur === t.id ? `<div class="text-xs font-bold mt-2" style="color:${t.cardText};">✓ 使用中</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>`;
        }

        // ================= 主题联动推荐 =================
        function renderThemeRecommend() {
            const t = getThemeById(currentTheme());
            const dishes = getThemeRecommendations();
            return `
                <div class="mb-10 fade-in">
                    <div class="rounded-[24px] p-6 shadow-apple border border-gray-100" style="background: var(--zx-card);">
                        <div class="flex items-center mb-1">
                            <span class="text-2xl mr-2">${t.emoji}</span>
                            <h2 class="text-xl font-bold">为你推荐 · ${t.name}</h2>
                        </div>
                        <p class="text-appleLightGray text-sm mb-5">${t.persona}</p>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            ${dishes.map(d => `
                                <div class="bg-appleGray rounded-[20px] p-3 hover:-translate-y-1 transition-transform">
                                    <img src="${d.img}" class="w-full h-24 rounded-xl object-cover mb-3" onerror="this.src='dish-placeholder.svg'">
                                    <p class="font-semibold text-sm truncate">${d.name}</p>
                                    <p class="text-xs text-appleLightGray mt-1">⭐ ${d.rating} · 月售 ${d.sales}</p>
                                    <div class="flex justify-between items-center mt-2">
                                        <span class="text-appleBlue font-bold">¥${d.price.toFixed(1)}</span>
                                        <button onclick="addToCart(${d.id})" class="w-7 h-7 rounded-full bg-appleBlue text-white text-sm flex items-center justify-center glass-btn-active">+</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>`;
        }
```

- [ ] **Step 2: renderOrderView 注入**

`renderOrderView()` 中 `let html = \`` 之后、第一个 `<div class="mb-10">`（餐厅区块）之前插入：

```js
                ${renderThemeUniverse()}
                ${renderThemeRecommend()}
```

- [ ] **Step 3: 验证**

`node --check canteen/app.js` 通过；起后端 + C 端服务，curl 拉取 app.js 确认两个函数存在。人工走查（本任务 DoD）：首页顶部出现 6 张风格卡 → 点击「电竞赛博」→ 全站约 0.5s 内变为深色赛博风、toast 提示、推荐区变为「为你推荐 · 电竞赛博」且推荐菜偏套餐/面食 → 刷新页面主题保持 → 点「极简留白」回到默认 Apple 风。验证后停服务。

- [ ] **Step 4: Commit**

```bash
git add canteen/
git commit -m "feat(canteen): 风格宇宙选择器与主题人设推荐首页"
```

---

### Task 5: B 端数据大屏真实化与「规划功能」标注

**Files:**
- Modify: `management/admin-script.js`（renderDashboard 数据接入、fmtTime、三个模块标注）

**Interfaces:**
- Consumes: Task 1 的 `GET /api/stats/dashboard`（data 字段：totalUsers/totalOrders/totalRevenue/todayOrders/todayRevenue/avgOrderValue/onSaleDishes/totalDishes/lowStockCount/pendingAccept/pendingPickup/unrepliedMessages）。
- Produces: 大屏全部指标来自真实统计（注册学生总数、今日成交、后勤看板）；食安/节约/商户审核三处显示「🚧 规划功能 · 演示数据」徽标；最近下单记录时间 +8。

- [ ] **Step 1: 全局追加 fmtTime（`showToast` 之后）**

```js
// 数据库存 UTC，展示统一转北京时间（UTC+8）
function fmtTime(t) {
    if (!t) return '';
    const d = new Date(String(t).replace(' ', 'T') + 'Z');
    if (isNaN(d)) return t;
    return d.toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
```

- [ ] **Step 2: renderDashboard 接入 stats**

函数开头（现有三个 apiCall 之后）追加：

```js
        const statsRes = await apiCall('GET', '/stats/dashboard');
        const stats = statsRes.data || {};
```

KPI 区修改：
- `const totalOrders = orders.length;` → `const totalOrders = stats.totalOrders ?? 0;`
- `const totalRevenue = orders.reduce(...)` 一行 → `const totalRevenue = stats.totalRevenue ?? 0;`
- 今日指标两行（todayStr/todayOrders/todayRevenue）替换为：

```js
        const todayOrders = stats.todayOrders ?? 0;
        const todayRevenue = stats.todayRevenue ?? 0;
```

「实时后勤运营指标」区修改：
- `<div class="stat-value">3</div>`（注册学生总数）→ `<div class="stat-value">${stats.totalUsers ?? 0}</div>`
- 未处理学生反馈 `${feedbacks.filter(f => !f.replycontent).length} 件` → `${stats.unrepliedMessages ?? 0} 件`
- 菜品种类数量 `${dishes.length} 种` → `${stats.totalDishes ?? dishes.length} 种`

最近下单记录的时间显示 `${o.addtime.split(' ')[1] || o.addtime}` → `${fmtTime(o.addtime)}`。

「核心后勤指标看板」的 `<tbody>` 内容（现有硬编码行：商户合规率等）整体替换为：

```js
                            <tr>
                                <td>待接单订单</td>
                                <td>${stats.pendingAccept ?? 0} 笔</td>
                                <td>0 笔</td>
                                <td>${(stats.pendingAccept ?? 0) === 0 ? '100%' : '处理中'}</td>
                                <td><span class="badge ${(stats.pendingAccept ?? 0) === 0 ? 'badge-success' : 'badge-warning'}">${(stats.pendingAccept ?? 0) === 0 ? '正常' : '需接单'}</span></td>
                            </tr>
                            <tr>
                                <td>待核销取餐</td>
                                <td>${stats.pendingPickup ?? 0} 笔</td>
                                <td>0 笔</td>
                                <td>${(stats.pendingPickup ?? 0) === 0 ? '100%' : '待取餐'}</td>
                                <td><span class="badge ${(stats.pendingPickup ?? 0) === 0 ? 'badge-success' : 'badge-warning'}">${(stats.pendingPickup ?? 0) === 0 ? '正常' : '待核销'}</span></td>
                            </tr>
                            <tr>
                                <td>低库存预警菜品</td>
                                <td>${stats.lowStockCount ?? 0} 种</td>
                                <td>≤ 3 种</td>
                                <td>${(stats.lowStockCount ?? 0) <= 3 ? '达标' : '超标'}</td>
                                <td><span class="badge ${(stats.lowStockCount ?? 0) <= 3 ? 'badge-success' : 'badge-danger'}">${(stats.lowStockCount ?? 0) <= 3 ? '正常' : '需补货'}</span></td>
                            </tr>
                            <tr>
                                <td>在售菜品率</td>
                                <td>${stats.totalDishes ? Math.round((stats.onSaleDishes / stats.totalDishes) * 100) : 100}%</td>
                                <td>≥ 90%</td>
                                <td>${stats.totalDishes ? Math.round((stats.onSaleDishes / stats.totalDishes) * 100) : 100}%</td>
                                <td><span class="badge badge-success">实时</span></td>
                            </tr>
                            <tr>
                                <td>平均客单价</td>
                                <td>¥${(stats.avgOrderValue ?? 0).toFixed(2)}</td>
                                <td>¥15.00</td>
                                <td>${(stats.avgOrderValue ?? 0) >= 15 ? '达标' : '偏低'}</td>
                                <td><span class="badge ${(stats.avgOrderValue ?? 0) >= 15 ? 'badge-success' : 'badge-warning'}">${(stats.avgOrderValue ?? 0) >= 15 ? '正常' : '关注'}</span></td>
                            </tr>
```

- [ ] **Step 3: 三个模块加「规划功能」标注**

① 第 577 行 `renderSafetyManagement` 的 `<div class="page-title">🔒 食品安全监管</div>` 改为：

```js
            <div class="page-title">🔒 食品安全监管 <span class="badge badge-warning" style="font-size: 12px; vertical-align: middle;">🚧 规划功能 · 演示数据</span></div>
```

② 第 725 行 `renderConservationManagement` 的 `<div class="page-title">🌱 节约型校园管理</div>` 同样追加该 badge（插入在标题文字之后、`</div>` 之前）。

③ 第 931 行附近商户审核区块（`<!-- 商户审核 -->` 注释下方的卡片 `<h3>`，含"商户审核"字样）在标题文字后追加同样 badge。

- [ ] **Step 4: 验证**

`node --check management/admin-script.js` 通过；起后端，curl 带 admin token 调 `GET /api/stats/dashboard` 确认 200 且字段齐全；grep 确认 admin-script.js 无 `stat-value">3<`（硬编码学生数）残留。验证后停服务。

- [ ] **Step 5: Commit**

```bash
git add management/
git commit -m "feat(management): 数据大屏接入真实统计，食安/节约/商户标注规划功能"
```

---

### Task 6: 阶段 2 回归与文档收尾

**Files:**
- Modify: `canteen/DEPLOYMENT_GUIDE.md`（更新为三端启动说明）
- Modify: `server/tests/refund.test.js:23`（过时注释修正）

**Interfaces:**
- Consumes: 阶段 2 全部任务。
- Produces: 文档与代码现状一致；全套验证绿灯。

- [ ] **Step 1: 修正过时注释**

`server/tests/refund.test.js:23` 附近「orders.orderid 有 UNIQUE 约束，每订单单行」的注释改为「单订单单行即可覆盖退款逻辑（orderid 已不唯一，多行订单同样适用）」。

- [ ] **Step 2: 更新 `canteen/DEPLOYMENT_GUIDE.md`**

阅读现有内容，将启动方式部分更新为（保留原文风格，替换/补充以下要点）：
- 一键启动：`canteen/startup.bat` 自动完成 依赖安装 → 首跑种子数据（init-db）→ 后端 5000 → C 端 8000 → B 端 5500。
- 三端地址：C 端 `http://localhost:8000`（学生，可注册或用 student1/password123）；B 端 `http://localhost:5500`（后勤，admin/admin123）；API `http://localhost:5000/api/health`。
- 手动启动备选：`cd server && npm start`；`cd canteen && python -m http.server 8000`；`python -m http.server 5500 --directory management`。
- 注意：B 端**必须**通过 http://localhost:5500 访问，禁止 file:// 直开（CORS 拦截）。
- 测试：`cd server && npm test`（26 个用例）、`npm run smoke`（15 项断言）。

- [ ] **Step 3: 全量回归**

```bash
cd server && npm test && npm start &  # 一个终端
cd server && npm run smoke            # 另一终端
```

Expected: 26/26、smoke 15/15。再按 Task 4 Step 3 的换肤走查与阶段 1 动线（下单→支付→接单→叫号→核销）人工过一遍。验证后停服务。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs+chore: 部署指南更新为三端一键启动，修正过时注释"
```

---

## 阶段 2 Definition of Done

- [ ] `npm test` 26/26、`npm run smoke` 15/15
- [ ] 6 套主题可切换、刷新保持、推荐区随主题人设变化且来自真实菜品打分
- [ ] B 端大屏无硬编码指标；食安/节约/商户显示「规划功能」徽标
- [ ] C/B 端订单时间均为北京时间；未支付订单可续付
- [ ] `startup.bat` 一键起三端（含首跑 init-db）
- [ ] 阶段 1 动线（下单→支付→接单→叫号→核销）在换肤后仍全通
