import {
  api,
  esc,
  money,
  chart,
  source,
  options,
  today,
  empty,
  modal,
  closeModal,
  toast,
} from "../../shared/core.js";
const metric = (title, value, note) =>
  `<section class="card metric"><small>${title}</small><strong>${value}</strong><p>${esc(note)}</p></section>`;
export async function render(ctx) {
  if (ctx.route === "checks") {
    const c = (await api("/workspace/checks")).data;
    return `<div class="page-head"><h1>演练前自检</h1><p>检查本地服务、关键数据与管理身份。</p></div><section class="card"><div class="risk-list">${Object.entries(
      {
        学校: c.school,
        服务连接: c.api ? "可用" : "不可用",
        数据库: c.database ? "可用" : "不可用",
        模型配置: c.modelConfigured ? "已配置" : "未配置",
        在售菜品: c.menus,
        食堂数量: c.restaurants,
        身份: ctx.user.role === "admin" ? "管理员" : "其他",
      },
    )
      .map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`)
      .join(
        "",
      )}</div>${source("本地运行状态", c.checkedAt)}<button class="btn secondary" style="margin-top:20px" data-action="refresh">重新检查</button></section>`;
  }
  const period = ctx.period || "hour",
    [response, forecast] = await Promise.all([
      api(`/insights/dashboard?${ctx.query()}&period=${period}`),
      api(`/insights/forecast?${ctx.query()}`),
    ]),
    r = response.data,
    p = forecast.data;
  ctx.insights = r;
  const growth = (value, previous) =>
    previous
      ? `${(((value - previous) / previous) * 100).toFixed(1)}% 对比上一周期`
      : "上一周期暂无成交";
  return `<section class="admin-hero"><div class="row spread wrap"><div><span class="eyebrow">OPERATIONS AT A GLANCE</span><h1 style="margin-top:8px">每一餐有序，每一天有数</h1><p>${esc(ctx.filter.from)} — ${esc(ctx.filter.to)} · ${esc(ctx.filter.campus || "全校区")} · ${esc(ctx.data.restaurants.find((a) => a.id === Number(ctx.filter.restaurantId))?.name || "所有食堂")}</p></div><a class="btn secondary" href="#forecast">查看备餐与采购建议 ↗</a></div></section>${r.pendingOrders || r.pendingFeedback ? `<div class="pending-panel row spread wrap"><span>待处理：${r.pendingOrders} 笔接单 · ${r.pendingFeedback} 条反馈 · ${r.lowStock.length} 项库存风险</span><a href="#orders">立即处理 →</a></div>` : ""}<div class="admin-metrics">${metric(ctx.filter.from === today() && ctx.filter.to === today() ? "今日成交量" : "区间成交量", r.current.orders + " 笔", growth(r.current.orders, r.previous.orders))}${metric("销售额", money(r.current.revenue), growth(r.current.revenue, r.previous.revenue))}${metric("订单座位周转", r.turnover === null ? "—" : r.turnover + " 次", "已完成订单 / 可预约桌位数")}${metric("平均排队", r.averageQueue === null ? "—" : r.averageQueue + " 分钟", "所选食堂运营台账平均值")}${metric("缺货风险", r.lowStock.length + " 项", "在售库存低于 20 份")}${metric("预计备餐余量", p.expectedWaste === null ? "—" : p.expectedWaste + " 份", "备餐台账数量减预测需求")}${metric("预计节省成本", p.savings === null ? "—" : money(p.savings), "依据已维护备餐量与单位成本")}${metric("待处理异常", r.pendingOrders + r.pendingFeedback + " 项", "已支付待接单与未闭环反馈")}</div><div class="grid two"><section class="card"><div class="trend-header"><h3>运营趋势</h3><div class="tabs">${[
    ["hour", "小时"],
    ["day", "日"],
    ["week", "周"],
  ]
    .map(
      ([k, v]) =>
        `<button data-action="trend-period" data-period="${k}" class="${period === k ? "active" : ""}">${v}</button>`,
    )
    .join(
      "",
    )}</div></div>${chart(r.series, "orders")}<small>已支付订单，按当前日期范围汇总</small><div class="stats-mini"><div><small>当前周期</small><b>${r.current.orders}</b></div><div><small>上一周期</small><b>${r.previous.orders}</b></div></div></section><section class="card"><h3>食堂拥挤度与座位</h3><div class="risk-list">${r.restaurants.map((a) => `<div><span><b>${esc(a.name)}</b><br><small>${esc(a.campus)} · ${a.availableSeats} 个桌位可用</small></span><button class="btn ghost" data-action="edit-crowd" data-id="${a.id}" aria-label="更新${esc(a.name)}运营信息">更新</button><span class="badge ${a.queueMinutes >= 13 ? "warn" : ""}">${a.queueMinutes < 7 ? "空闲" : a.queueMinutes < 13 ? "适中" : "拥挤"} · ${a.queueMinutes} 分钟</span></div>`).join("")}</div>${source("餐厅运营台账", r.restaurants[0]?.updatedAt)}</section><section class="card"><h3>库存风险</h3><div class="risk-list">${
    r.lowStock
      .slice(0, 6)
      .map(
        (d) =>
          `<div><span>${esc(d.name)}<br><small>${esc(d.restaurant)} · ${esc(d.window)}</small></span><b>${d.stock} 份</b></div>`,
      )
      .join("") ||
    '<p class="muted" style="margin-top:15px">当前范围暂无低库存菜品。</p>'
  }</div><a href="#dishes" class="btn ghost" style="margin-top:15px">管理菜单与库存 →</a></section><section class="card"><h3>反馈问题分布</h3>${r.feedbackCategories.length ? chart(r.feedbackCategories.map((x) => ({ label: x.name, value: x.count }))) : empty("暂无区间反馈")}<a href="#feedback">查看反馈分类与处理 →</a></section></div><section class="card" style="margin-top:20px"><div class="row spread"><h3>同校区食堂对比与目标</h3><button class="btn secondary" data-action="edit-targets">维护运营目标</button></div>${chart(r.peers.map((x) => ({ label: x.name, value: x.orders })))}<small>同一日期范围下各食堂成交订单</small><div class="stats-mini"><div><small>订单目标</small><b>${r.targets?.orders ?? "—"} 笔</b></div><div><small>销售目标</small><b>${r.targets ? money(r.targets.revenue) : "—"}</b></div><div><small>订单达成率</small><b>${r.targets?.orders ? Math.round((r.current.orders / r.targets.orders) * 100) + "%" : "—"}</b></div><div><small>销售达成率</small><b>${r.targets?.revenue ? Math.round((r.current.revenue / r.targets.revenue) * 100) + "%" : "—"}</b></div></div></section>${source(r.sourceName, r.updatedAt)}`;
}
export const actions = {
  "edit-crowd": (ctx, e) => {
    const r = ctx.data.restaurants.find(
      (r) => r.id === Number(e.target.closest("[data-id]").dataset.id),
    );
    modal(
      "更新餐厅运营信息",
      `<form data-action="save-crowd" data-id="${r.id}"><h3>${esc(r.name)}</h3>${[
        ["queueMinutes", "排队分钟", r.queueMinutes, 180],
        ["queueCount", "排队人数", r.queueCount, 10000],
        ["distanceM", "步行距离 m", r.distanceM, 10000],
      ]
        .map(
          ([key, label, value, max]) =>
            `<label>${label}</label><input name="${key}" type="number" min="0" max="${max}" value="${value}" required>`,
        )
        .join(
          "",
        )}<label>营业时间</label><input name="openingHours" value="${esc(r.openingHours)}" maxlength="100" required><div class="actions"><button class="btn">保存</button></div></form>`,
    );
  },
  "save-crowd": async (ctx, e) => {
    const f = Object.fromEntries(new FormData(e.target));
    await api(`/restaurants/${e.target.dataset.id}`, {
      method: "PUT",
      body: {
        ...f,
        queueMinutes: Number(f.queueMinutes),
        queueCount: Number(f.queueCount),
        distanceM: Number(f.distanceM),
      },
    });
    closeModal();
    toast("运营信息已更新", "success");
    ctx.refresh();
  },
  "edit-targets": (ctx) => {
    modal(
      "当前范围运营目标",
      `<form data-action="save-targets"><p>${esc(ctx.filter.campus || "全校区")} · ${esc(ctx.data.restaurants.find((r) => r.id === Number(ctx.filter.restaurantId))?.name || "所有食堂")} · ${esc(ctx.filter.window || "所有窗口")}</p><label>当前统计周期订单目标</label><input name="orders" type="number" min="1" max="10000000" value="${ctx.insights.targets?.orders || ""}" required><label>当前统计周期销售额目标（元）</label><input name="revenue" type="number" min="0.01" max="1000000000" step="0.01" value="${ctx.insights.targets?.revenue || ""}" required><div class="actions"><button class="btn">保存目标</button></div></form>`,
    );
  },
  "save-targets": async (ctx, e) => {
    const f = Object.fromEntries(new FormData(e.target));
    const existing = (await api("/operations?type=canteen")).data.find(
      (r) =>
        r.payload.kind === "dashboardTargets" &&
        r.payload.from === ctx.filter.from &&
        r.payload.to === ctx.filter.to &&
        (r.payload.campus || "") === ctx.filter.campus &&
        Number(r.payload.restaurantId || 0) ===
          Number(ctx.filter.restaurantId || 0) &&
        (r.payload.window || "") === ctx.filter.window,
    );
    await api(existing ? `/operations/${existing.id}` : "/operations", {
      method: existing ? "PUT" : "POST",
      body: {
        type: "canteen",
        title:
          existing?.title ||
          `运营统计目标 ${ctx.filter.campus || "全校"} ${ctx.filter.restaurantId || "全部"} ${ctx.filter.window || "全部"} ${ctx.filter.from} ${ctx.filter.to}`,
        status: "运行中",
        payload: {
          kind: "dashboardTargets",
          ...ctx.filter,
          orders: Number(f.orders),
          revenue: Number(f.revenue),
        },
      },
    });
    closeModal();
    ctx.render();
  },
  "trend-period": (ctx, e) => {
    ctx.period = e.target.closest("[data-period]").dataset.period;
    ctx.render();
  },
};
