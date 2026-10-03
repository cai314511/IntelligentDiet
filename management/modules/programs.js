import {
  api,
  post,
  put,
  del,
  esc,
  money,
  modal,
  options,
  closeModal,
  toast,
  dateTime,
} from "../../shared/core.js";
import { table } from "./table.js";
export async function render(ctx) {
  const tab = ctx.programTab || "activities";
  let rows,
    html = "";
  if (tab === "activities") {
    rows = (await api("/activities/manage")).data;
    ctx.programRows = rows;
    html = `<button class="btn" data-action="new-program">新增活动 ＋</button>${table(
      ctx,
      "programs",
      rows,
      [
        { key: "title", title: "活动" },
        { key: "campus", title: "校区" },
        { key: "startsAt", title: "开始", value: (r) => dateTime(r.startsAt) },
        {
          key: "capacity",
          title: "人数 / 名额",
          value: (r) => `${r.participants} / ${r.capacity || "不限"}`,
        },
        {
          key: "status",
          title: "发布状态",
          value: (r) =>
            ({ published: "已发布", draft: "草稿", archived: "已归档" })[
              r.status
            ] || r.status,
        },
        {
          key: "actions",
          title: "操作",
          render: (r) =>
            `<button class="btn ghost" data-action="edit-program" data-id="${r.id}">编辑</button><button class="btn ghost" data-action="archive-program" data-id="${r.id}">归档</button><button class="btn ghost" data-action="program-signups" data-id="${r.id}">报名名单</button>`,
        },
      ],
    )}`;
  }
  if (tab === "culture") {
    rows = (await api("/activities/culture/manage")).data;
    ctx.programRows = rows;
    html = `<button class="btn" data-action="new-program">新增文创 ＋</button>${table(
      ctx,
      "culture",
      rows,
      [
        { key: "title", title: "商品" },
        { key: "category", title: "类别" },
        { key: "price", title: "价格", render: (r) => money(r.price) },
        { key: "stock", title: "库存" },
        { key: "status", title: "状态" },
        {
          key: "actions",
          title: "操作",
          render: (r) =>
            `<button class="btn ghost" data-action="edit-program" data-id="${r.id}">编辑</button><button class="btn ghost" data-action="archive-program" data-id="${r.id}">归档</button>`,
        },
      ],
    )}`;
  }
  if (tab === "orders") {
    rows = (await api("/activities/culture/orders")).data;
    ctx.cultureOrders = rows;
    html = table(
      ctx,
      "cultureOrders",
      rows,
      [
        { key: "orderId", title: "订单" },
        { key: "title", title: "商品" },
        { key: "quantity", title: "数量" },
        { key: "total", title: "费用", render: (r) => money(r.total) },
        { key: "status", title: "状态" },
        {
          key: "createdAt",
          title: "时间",
          value: (r) => dateTime(r.createdAt),
        },
        {
          key: "actions",
          title: "操作",
          render: (r) =>
            r.status === "已支付"
              ? `<button class="btn ghost" data-action="culture-order-status" data-id="${esc(r.orderId)}" data-status="待领取">安排领取</button><button class="btn ghost" data-action="culture-refund" data-id="${esc(r.orderId)}">退款</button>`
              : r.status === "待领取"
                ? `<button class="btn ghost" data-action="culture-order-status" data-id="${esc(r.orderId)}" data-status="已完成">核销领取</button>`
                : "—",
        },
      ],
      { id: "orderId" },
    );
  }
  if (tab === "redemptions") {
    rows = (await api("/community/redemptions")).data;
    html = table(ctx, "redemptions", rows, [
      { key: "id", title: "兑换单" },
      { key: "title", title: "商品" },
      { key: "points", title: "积分" },
      { key: "status", title: "状态" },
      {
        key: "created_at",
        title: "时间",
        value: (r) => dateTime(r.created_at),
      },
      {
        key: "actions",
        title: "操作",
        render: (r) =>
          r.status === "待领取"
            ? `<button class="btn ghost" data-action="fulfill-redemption" data-id="${esc(r.id)}">核销领取</button>`
            : "—",
      },
    ]);
  }
  return `<div class="page-head"><span class="eyebrow">CAMPUS PROGRAMS</span><h1>活动、文创与校园权益</h1><p>发布内容、查看报名、处理订单与积分兑换。</p></div><div class="tabs" style="margin-bottom:22px">${[
    ["activities", "活动发布"],
    ["culture", "文创商品"],
    ["orders", "文创订单"],
    ["redemptions", "积分兑换"],
  ]
    .map(
      ([k, l]) =>
        `<button data-action="program-tab" data-tab="${k}" class="${tab === k ? "active" : ""}">${l}</button>`,
    )
    .join("")}</div>${html}`;
}
function editor(ctx, id) {
  const culture = ctx.programTab === "culture",
    r = ctx.programRows?.find((r) => r.id === Number(id)) || {},
    toLocal = (value) =>
      value
        ? new Date(
            new Date(value) - new Date(value).getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16)
        : "";
  modal(
    culture ? "文创商品" : "校园活动",
    `<form data-action="save-program" data-id="${id || ""}"><label>名称</label><input name="title" required maxlength="100" value="${esc(r.title)}"><label>说明</label><textarea name="description" required maxlength="2000">${esc(r.description)}</textarea><div class="admin-input-grid"><div><label>类别</label><input name="category" maxlength="80" required value="${esc(r.category || (culture ? "校园文创" : "校园活动"))}"></div><div><label>校区</label><select name="campus">${options([...new Set(ctx.data.restaurants.map((r) => r.campus))], r.campus)}</select></div></div>${
      culture
        ? `<div class="admin-input-grid"><div><label>价格（元）</label><input name="price" type="number" min="0.01" max="10000" step="0.01" value="${r.price || 10}" required></div><div><label>库存</label><input name="stock" type="number" min="0" max="100000" value="${r.stock ?? 50}" required></div></div>`
        : `<div class="admin-input-grid"><div><label>开始时间</label><input name="startsAt" type="datetime-local" value="${toLocal(r.startsAt)}" required></div><div><label>结束时间</label><input name="endsAt" type="datetime-local" value="${toLocal(r.endsAt)}" required></div></div><label>报名名额（0 为不限）</label><input name="capacity" type="number" min="0" max="100000" value="${r.capacity || 0}" required><label>活动地点</label><input name="location" maxlength="200" value="${esc(r.location)}"><label>发布状态</label><select name="status">${options(
            [
              { value: "published", label: "发布" },
              { value: "draft", label: "草稿" },
            ],
            r.status,
          )}</select>`
    }<label>图片地址</label><input name="image" maxlength="500" value="${esc(r.image)}"><div class="actions"><button class="btn">保存</button></div></form>`,
  );
}
export const actions = {
  "program-tab": (ctx, e) => {
    ctx.programTab = e.target.closest("[data-tab]").dataset.tab;
    ctx.render();
  },
  "new-program": (ctx) => editor(ctx),
  "edit-program": (ctx, e) =>
    editor(ctx, e.target.closest("[data-id]").dataset.id),
  "save-program": async (ctx, e) => {
    const b = Object.fromEntries(new FormData(e.target)),
      culture = ctx.programTab === "culture";
    if (culture) {
      b.price = Number(b.price);
      b.stock = Number(b.stock);
    } else {
      b.capacity = Number(b.capacity);
      b.startsAt = new Date(b.startsAt).toISOString();
      b.endsAt = new Date(b.endsAt).toISOString();
    }
    await api(
      `/activities${culture ? "/culture" : ""}${e.target.dataset.id ? "/" + e.target.dataset.id : ""}`,
      { method: e.target.dataset.id ? "PUT" : "POST", body: b },
    );
    closeModal();
    toast("内容已保存", "success");
    ctx.render();
  },
  "archive-program": async (ctx, e) => {
    await del(
      `/activities${ctx.programTab === "culture" ? "/culture" : ""}/${e.target.closest("[data-id]").dataset.id}`,
    );
    toast("内容已归档", "success");
    ctx.render();
  },
  "program-signups": async (ctx, e) => {
    const rows = (
      await api(
        `/activities/${e.target.closest("[data-id]").dataset.id}/signups`,
      )
    ).data;
    modal(
      "活动报名名单",
      rows
        .map(
          (r) =>
            `<div class="risk-list"><div><span>${esc(r.name)}</span><small>${esc(r.phone || "—")} · ${esc(dateTime(r.createdAt))}</small></div></div>`,
        )
        .join("") || '<p class="muted">暂无报名</p>',
    );
  },
  "culture-order-status": async (ctx, e) => {
    const b = e.target.closest("[data-id]");
    await put(
      `/activities/culture/orders/${encodeURIComponent(b.dataset.id)}/status`,
      { status: b.dataset.status },
    );
    toast("履约状态已更新", "success");
    ctx.render();
  },
  "culture-refund": (ctx, e) => {
    const r = ctx.cultureOrders.find(
      (r) => r.orderId === e.target.closest("[data-id]").dataset.id,
    );
    modal(
      "确认文创退款",
      `<h3>${esc(r.title)} · ${money(r.total)}</h3><div class="actions"><button class="btn danger" data-action="culture-refund-confirm" data-id="${esc(r.orderId)}">确认退款</button></div>`,
    );
  },
  "culture-refund-confirm": async (ctx, e) => {
    await put(
      `/activities/culture/orders/${encodeURIComponent(e.target.closest("[data-id]").dataset.id)}/status`,
      { status: "已退款" },
    );
    closeModal();
    toast("退款已完成", "success");
    ctx.render();
  },
  "fulfill-redemption": async (ctx, e) => {
    await put(
      `/community/redemptions/${encodeURIComponent(e.target.closest("[data-id]").dataset.id)}`,
      {},
    );
    toast("兑换领取已核销", "success");
    ctx.render();
  },
};
