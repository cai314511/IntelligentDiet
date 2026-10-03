import {
  api,
  put,
  post,
  esc,
  money,
  modal,
  options,
  toast,
  closeModal,
  saveSession,
  store,
  read,
  source,
  empty,
  chart,
} from "../../shared/core.js";
export async function render(ctx) {
  if (ctx.route === "checks") return checks(ctx);
  if (ctx.route === "demo") return demo(ctx);
  const me = (await api("/users/me")).data;
  ctx.user = me;
  ctx.session.user = me;
  saveSession(ctx.session);
  return `<div class="page-head"><span class="eyebrow">YOUR CAMPUS, YOUR WAY</span><h1>我的校园就餐</h1><p>偏好只需设置一次，之后每一餐都能继续使用。</p></div><div class="profile-grid"><section class="card"><img src="/assets/brand/xiaozhi-avatar.png" alt="小智" style="width:90px"><h2>${esc(me.xingming)}</h2><p class="muted">${esc(ctx.session.school?.name)} · ${ctx.session.development ? "开发管理员" : "学生"}</p><div class="separator"></div><small>账户余额</small><h1 style="margin:8px 0">${money(me.jine)}</h1><div class="stack" style="margin-top:24px"><button class="btn secondary" data-action="edit-profile">编辑资料</button><a class="btn secondary" href="#orders">我的订单与预约</a><a class="btn secondary" href="#discover">校园生活与积分</a><a class="btn secondary" href="#checks">演练前自检</a><a class="btn secondary" href="#demo">任务场景演练</a>${me.role === "admin" ? '<button class="btn secondary" data-action="switch-workspace">进入校方工作台</button>' : ""}<button class="btn ghost" data-action="logout">切换身份 / 学校或退出</button></div></section><div class="stack"><section class="card"><div class="row spread"><h3>饮食目标与偏好</h3><button class="btn ghost" data-action="edit-preferences">编辑</button></div><div class="details-grid"><div><small>饮食目标</small>${esc(ctx.preferences.goal || "均衡饮食")}</div><div><small>日热量目标</small>${ctx.preferences.calorieTarget || 2000} kcal</div><div><small>持续生效的忌口</small>${esc((ctx.preferences.exclusions || []).join("、") || "无")}</div><div><small>口味偏好</small>${esc((ctx.preferences.tastes || []).join("、") || "不限")}</div></div><p class="muted">目标比例：碳水 ${ctx.preferences.macros?.carbs ?? 50}% · 蛋白 ${ctx.preferences.macros?.protein ?? 20}% · 脂肪 ${ctx.preferences.macros?.fat ?? 30}%</p></section><section class="card"><span class="eyebrow">NUTRITION PLUS</span><h2 style="margin-top:10px">让每一餐的记录更有价值</h2><p class="muted" style="margin:12px 0">拍照识别、深度点评、本校精准推荐与长期趋势。</p><button class="btn secondary" data-action="membership">${me.role === "admin" ? "查看完整营养权益" : "查看会员权益与锁定预览"}</button><p class="muted" style="font-size:11px;margin-top:12px">基础点餐、占座和食堂拥挤度查询永久免费。</p></section><section class="card"><h3>页面风格</h3><p class="muted">学校品牌保持一致，选择你喜欢的阅读背景。</p><select id="personal-theme" data-change="personal-theme" style="margin-top:15px">${options(
    [
      { value: "campus", label: "校园标准" },
      { value: "warm", label: "暖色阅读" },
      { value: "pink", label: "樱花浅粉" },
      { value: "ocean", label: "海风浅蓝" },
      { value: "forest", label: "森林微绿" },
      { value: "night", label: "夜间阅读" },
    ],
    read("theme", "campus"),
  )}</select></section></div></div>`;
}
async function checks(ctx) {
  const c = (await api("/workspace/checks")).data;
  const assets = await Promise.all(
    ["/assets/brand/xiaozhi-avatar.png", "/shared/styles.css"].map((url) =>
      fetch(url, { method: "HEAD" })
        .then((r) => r.ok)
        .catch(() => false),
    ),
  );
  return `<div class="page-head"><h1>演练前自检</h1><p>检查连接、配置、账户与关键数据。</p></div><section class="card check-list">${[
    ["API 服务", c.api ? "可用" : "不可用"],
    ["数据库", c.database ? "可用" : "不可用"],
    ["模型配置", c.modelConfigured ? "已配置" : "未配置"],
    ["学校与账户", `${c.school} · ${ctx.user.xingming}`],
    ["在售菜单", `${c.menus} 道`],
    ["食堂", `${c.restaurants} 间`],
    [
      "品牌与样式资源",
      `${assets.filter(Boolean).length}/${assets.length} 可用`,
    ],
    ["菜单图片", `${c.imageCount}/${c.menus} 项有图片`],
    ["未支付订单", `${c.pendingOrders} 笔`],
  ]
    .map(
      ([label, value]) =>
        `<div><span>${label}</span><b>${esc(value)}</b></div>`,
    )
    .join(
      "",
    )}${source("本地运行状态", c.checkedAt)}<button class="btn secondary" style="margin-top:18px" data-action="refresh">重新检查</button></section>`;
}
async function demo(ctx) {
  const d = ctx.data.dishes
    .filter((d) => d.forSale && d.stock && d.restaurantId)
    .sort((a, b) => a.price - b.price)[0];
  return `<div class="page-head"><span class="eyebrow">SCENARIO WALKTHROUGH</span><h1>一餐到一天，完整流程演练</h1><p>每个执行环节复用正常业务接口，操作由你确认。</p></div><div class="grid two"><section class="card"><h3>01 · 学生描述需求</h3><p class="muted" style="margin:15px 0">预算 ${money(Math.max(20, d?.price || 20))}，根据个人偏好安排午餐与座位。</p><button class="btn" data-action="start-scenario" ${d ? "" : "disabled"}>从小智开始演练 →</button></section><section class="card"><h3>02 · 方案与拥挤度</h3><p class="muted" style="margin-top:15px">核对食堂、窗口、排队、价格及座位，修改方案后确认执行。</p><a class="btn secondary" style="margin-top:15px" href="#menu">查看双路径点餐</a></section><section class="card"><h3>03 · 订单与取餐</h3><p class="muted" style="margin-top:15px">确认创建订单，核对费用后支付；校方接单、叫号、核销。</p><a class="btn secondary" style="margin-top:15px" href="#orders">查看订单流水线</a></section><section class="card"><h3>04 · 校方运营与备餐</h3><p class="muted" style="margin-top:15px">在管理端查看新订单、小时趋势和由订单历史生成的备餐建议。</p>${ctx.user.role === "admin" ? '<button class="btn secondary" style="margin-top:15px" data-action="switch-workspace">打开校方工作台</button>' : '<p class="muted" style="margin-top:15px">由校方账户进入管理工作台。</p>'}</section></div>`;
}
export const actions = {
  "edit-profile": (ctx) => {
    modal(
      "编辑资料",
      `<form data-action="save-profile"><label>姓名</label><input name="xingming" required maxlength="40" value="${esc(ctx.user.xingming)}"><label>联系方式</label><input name="lianxifangshi" maxlength="30" value="${esc(ctx.user.lianxifangshi)}"><div class="actions"><button class="btn">保存</button></div></form>`,
    );
  },
  "save-profile": async (ctx, e) => {
    await put(
      `/users/${ctx.user.id}`,
      Object.fromEntries(new FormData(e.target)),
    );
    closeModal();
    toast("资料已保存", "success");
    ctx.render();
  },
  "edit-preferences": (ctx) => {
    const p = ctx.preferences;
    modal(
      "饮食目标与持续偏好",
      `<form data-action="save-preferences"><label>饮食目标 / 自定义计划</label><input name="goal" list="goals" maxlength="80" value="${esc(p.goal || "均衡饮食")}" required><datalist id="goals">${["均衡饮食", "低脂", "高蛋白", "自定义计划"].map((g) => `<option value="${g}">`).join("")}</datalist><label>日热量目标 kcal</label><input type="number" name="calorieTarget" min="1000" max="5000" value="${p.calorieTarget || 2000}" required><label>口味偏好（逗号分隔）</label><input name="tastes" value="${esc((p.tastes || []).join("、"))}"><label>忌口 / 过敏原（逗号分隔）</label><input name="exclusions" value="${esc((p.exclusions || []).join("、"))}"><div class="grid three">${[
        ["carbs", "碳水"],
        ["protein", "蛋白"],
        ["fat", "脂肪"],
      ]
        .map(
          ([key, label]) =>
            `<div><label>${label} %</label><input name="${key}" type="number" min="0" max="100" step="0.1" value="${p.macros?.[key] ?? { carbs: 50, protein: 20, fat: 30 }[key]}" required></div>`,
        )
        .join(
          "",
        )}</div><small>三大营养素比例之和需为 100%。</small><div class="actions"><button class="btn">保存并持续应用</button></div></form>`,
    );
  },
  "save-preferences": async (ctx, e) => {
    const f = Object.fromEntries(new FormData(e.target)),
      list = (value) =>
        String(value || "")
          .split(/[，,、]/)
          .map((x) => x.trim())
          .filter(Boolean);
    ctx.preferences = (
      await put("/workspace/preferences", {
        goal: f.goal,
        calorieTarget: Number(f.calorieTarget),
        exclusions: list(f.exclusions),
        tastes: list(f.tastes),
        macros: {
          carbs: Number(f.carbs),
          protein: Number(f.protein),
          fat: Number(f.fat),
        },
      })
    ).data;
    closeModal();
    toast("偏好已保存，后续方案将自动应用", "success");
    ctx.render();
  },
  membership: (ctx) => {
    modal(
      "营养会员权益",
      `<div class="stack">${["拍照识别与结果校对", "基于真实记录的深度点评", "按个人目标匹配本校菜品", "长期热量与结构趋势"].map((t) => `<div class="info-box">✓ ${t}</div>`).join("")}</div><div class="separator"></div><p>基础点餐、占座、拥挤度查询和手动饮食记录永久免费。</p>${ctx.user.role === "admin" ? '<p class="badge" style="margin-top:15px">管理员已拥有全部营养权限</p><a class="btn" href="#nutrition" style="margin:20px 0" data-action="close-modal">进入营养记录</a>' : '<div class="locked" style="padding:18px;border-radius:14px;margin-top:18px"><h3>高级权益尚未开通 ▣</h3><p class="muted">你可以继续使用全部基础功能。</p></div>'}`,
    );
  },
  "close-modal": () => closeModal(),
  "personal-theme": (ctx, e) => {
    const themes = {
      campus: "#f4f7f7",
      warm: "#f8f5ec",
      pink: "#faf2f4",
      ocean: "#edf5fa",
      forest: "#eff7ee",
      night: "#e1e7e8",
    };
    document.documentElement.style.setProperty(
      "--bg",
      themes[e.target.value] || themes.campus,
    );
    store("theme", e.target.value);
  },
  "switch-workspace": (ctx) => {
    ctx.session.identity = "admin";
    saveSession(ctx.session);
    location.href = "/management/#dashboard";
  },
  "start-scenario": async (ctx) => {
    const d = ctx.data.dishes
        .filter((d) => d.forSale && d.stock && d.restaurantId)
        .sort((a, b) => a.price - b.price)[0],
      budget = Math.max(20, d.price);
    ctx.latestPlan = (
      await post("/tasks", {
        message: `${budget}元以内按我的偏好安排午餐并占座`,
        constraints: { budget, reserve: true },
      })
    ).data;
    store("plan", ctx.latestPlan);
    await ctx.load();
    ctx.navigate("agent");
  },
};
