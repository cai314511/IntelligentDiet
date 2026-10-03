import {
  api,
  post,
  esc,
  money,
  source,
  chart,
  modal,
  options,
  closeModal,
  toast,
} from "../../shared/core.js";
import { table } from "./table.js";
export async function render(ctx) {
  const r = (
    await api(`/insights/forecast?${ctx.query()}&horizon=${ctx.horizon || 1}`)
  ).data;
  ctx.forecast = r;
  const gap = r.items.reduce((s, i) => s + (i.purchase || 0), 0),
    demand = r.items.some((i) => i.demand !== null)
      ? r.items.reduce((s, i) => s + (i.demand || 0), 0)
      : null;
  return `<section class="forecast-hero"><div><span class="eyebrow">DEMAND TO DECISION</span><h1 style="margin:8px 0">少一点浪费，多一分从容</h1><p class="muted">把历史需求、备餐量与库存连接成可执行计划。</p></div><button class="btn" data-action="forecast-scenario">维护备餐与成本参数</button></section><div class="row spread wrap" style="margin-bottom:18px"><h3>未来时段供需</h3><select style="max-width:160px" data-change="forecast-horizon" aria-label="预测时段">${options(
    [
      { value: 1, label: "未来 1 天" },
      { value: 3, label: "未来 3 天" },
      { value: 7, label: "未来 7 天" },
    ],
    ctx.horizon || 1,
  )}</select></div><div class="admin-metrics">${[
    ["需求预测", demand === null ? "—" : `${demand}份`],
    ["库存缺口", r.historyOrders ? `${gap}份` : "—"],
    ["预计节省成本", r.savings === null ? "—" : money(r.savings)],
    ["回测准确度", r.accuracy === null ? "—" : `${r.accuracy}%`],
    ["回测 MAE", r.mae === null ? "—" : `${r.mae}份/日`],
  ]
    .map(
      ([title, value]) =>
        `<section class="card metric"><small>${title}</small><strong>${value}</strong><p>${r.historyOrders} 笔历史订单 · ${r.trainingDays} 天</p></section>`,
    )
    .join(
      "",
    )}</div><div class="grid two"><section class="card"><h3>时段需求分布</h3>${chart(r.hourly, "demand")}<small>所选日期区间的小时平均销量，单位：份</small><h3 style="margin-top:20px">就餐需求人流参考</h3>${chart(r.hourly, "visits")}<small>以已支付订单计数估计小时就餐批次，不含未下单到访</small></section><section class="card"><h3>预测依据与执行原则</h3><p class="muted" style="margin-top:14px">${esc(r.method)}</p><p class="muted" style="margin-top:14px">备餐建议按预测量计算；采购缺口为预测量减现有库存。成本节省根据备餐台账与单位成本计算。</p>${r.historyOrders ? "" : '<p class="muted" style="margin-top:14px">当前区间尚无已支付订单；可维护备餐参数，后续成交将自动进入预测。</p>'}${source(r.sourceName, r.updatedAt)}</section></div><h2 class="section-title">菜品需求与备餐采购计划</h2>${table(
    ctx,
    "forecast",
    r.items,
    [
      { key: "name", title: "菜品" },
      {
        key: "restaurant",
        title: "食堂 / 窗口",
        value: (r) => `${r.restaurant} · ${r.window}`,
      },
      { key: "demand", title: "预测需求", value: (r) => r.demand ?? "—" },
      { key: "stock", title: "现有库存" },
      { key: "prepare", title: "建议备餐", value: (r) => r.prepare ?? "—" },
      { key: "purchase", title: "推荐采购量", value: (r) => r.purchase ?? "—" },
      {
        key: "savings",
        title: "预计节省",
        value: (r) => (r.savings === null ? "—" : money(r.savings)),
      },
      {
        key: "actions",
        title: "执行",
        render: (r) =>
          `<button class="btn ghost" data-action="purchase-plan" data-id="${r.id}">生成采购计划</button>`,
      },
    ],
  )}`;
}
export const actions = {
  "forecast-horizon": (ctx, e) => {
    ctx.horizon = Number(e.target.value);
    ctx.render();
  },
  "forecast-scenario": (ctx) => {
    modal(
      "维护备餐与成本台账",
      `<form data-action="save-forecast-scenario"><label>菜品</label><select name="dishId">${options(ctx.forecast.items.map((d) => ({ value: d.id, label: `${d.name} · ${d.restaurant}` })))}</select><div class="admin-input-grid"><div><label>已备餐份数</label><input name="prepared" type="number" min="0" max="100000" required></div><div><label>每份食材成本（元）</label><input name="unitCost" type="number" step="0.01" min="0.01" max="10000" required></div></div><div class="actions"><button class="btn">保存并重新计算</button></div></form>`,
    );
  },
  "save-forecast-scenario": async (ctx, e) => {
    const f = Object.fromEntries(new FormData(e.target)),
      dish = ctx.data.dishes.find((d) => d.id === Number(f.dishId));
    const records = (await api("/operations?type=inventory")).data,
      existing = records.find((r) => Number(r.payload.dishId) === dish.id),
      body = {
        type: "inventory",
        title: `${dish.name}备餐成本台账`,
        status: "运行中",
        payload: {
          ...existing?.payload,
          dishId: dish.id,
          campus: dish.campus,
          restaurantId: dish.restaurantId,
          window: dish.window,
          prepared: Number(f.prepared),
          unitCost: Number(f.unitCost),
        },
      };
    await api(existing ? `/operations/${existing.id}` : "/operations", {
      method: existing ? "PUT" : "POST",
      body,
    });
    closeModal();
    toast("备餐台账已保存", "success");
    ctx.render();
  },
  "purchase-plan": async (ctx, e) => {
    const d = ctx.forecast.items.find(
      (d) => d.id === Number(e.target.closest("[data-id]").dataset.id),
    );
    const suppliers = (await api("/operations?type=supplier")).data;
    modal(
      "生成采购计划",
      `<form data-action="save-purchase-plan" data-id="${d.id}"><h3>${esc(d.name)}</h3><p class="muted">${esc(d.restaurant)} · 库存 ${d.stock}份 · 预测 ${d.demand ?? "—"}份</p><label>采购数量</label><input name="quantity" type="number" min="1" max="100000" value="${d.purchase || ""}" required><label>供应商</label><select name="supplier">${options([{ value: "", label: "待分配" }, ...suppliers.map((s) => ({ value: s.title, label: s.title }))])}</select><label>预计到货</label><input name="arrival" type="date" required><label>计划说明</label><textarea name="note" maxlength="2000"></textarea><div class="actions"><button class="btn">保存采购计划</button></div></form>`,
    );
  },
  "save-purchase-plan": async (ctx, e) => {
    const f = Object.fromEntries(new FormData(e.target)),
      d = ctx.forecast.items.find((d) => d.id === Number(e.target.dataset.id));
    await post("/operations", {
      type: "procurement",
      title: `${d.name}采购计划 ${new Date().toISOString()}`,
      status: "待采购",
      payload: {
        ...f,
        quantity: Number(f.quantity),
        dishId: d.id,
        campus: d.campus,
        restaurantId: ctx.data.dishes.find((x) => x.id === d.id)?.restaurantId,
        window: d.window,
      },
    });
    closeModal();
    toast("采购计划已保存，可到采购与库存执行", "success");
    ctx.render();
  },
};
