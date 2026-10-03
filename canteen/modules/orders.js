import {
  api,
  esc,
  money,
  options,
  empty,
  post,
  modal,
  closeModal,
  toast,
  dateTime,
} from "../../shared/core.js";
import { cashier } from "./cart.js";
function group(rows) {
  return Object.values(
    rows.reduce((a, r) => {
      a[r.orderid] ??= {
        id: r.orderid,
        status: r.status,
        code: r.pickup_code,
        time: r.addtime,
        total: 0,
        items: [],
      };
      a[r.orderid].total += Number(r.total);
      a[r.orderid].items.push(r);
      return a;
    }, {}),
  );
}
export async function render(ctx) {
  const [orders, seats, culture, activities] = await Promise.all([
    api(`/orders/user/${ctx.user.id}`),
    api("/restaurants/reservations/mine"),
    api("/activities/culture/orders/mine"),
    api("/activities/users/mine"),
  ]);
  const groups = group(orders.data);
  ctx.orders = groups;
  const shown = groups.filter(
    (o) => !ctx.orderStatus || o.status === ctx.orderStatus,
  );
  return `<div class="page-head"><span class="eyebrow">MY ORDERS</span><h1>我的订单与预约</h1><p>从准备到取餐，每一步都在这里。</p></div><div class="tabs" style="margin-bottom:22px">${["全部", "未支付", "已支付", "制作中", "待取餐", "已完成", "已退款", "已取消"].map((s) => `<button data-action="order-filter" data-status="${s === "全部" ? "" : s}" class="${(ctx.orderStatus || "") === (s === "全部" ? "" : s) ? "active" : ""}">${s}</button>`).join("")}</div>${
    shown.length
      ? shown
          .map((o) => {
            const stages = ["已支付", "制作中", "待取餐", "已完成"],
              i = stages.indexOf(o.status);
            return `<article class="card order-card"><div class="row spread wrap"><div><b>${esc(o.id)}</b><p class="muted">${esc(dateTime(o.time))}</p></div><span class="badge ${o.status === "未支付" ? "warn" : ""}">${esc(o.status)}</span></div><div class="order-progress">${stages.map((s, n) => `<span class="${n <= i ? "done" : ""}">${n < i ? "✓" : "○"} ${s}</span>`).join("")}</div>${o.items.map((r) => `<div class="row spread"><span>${esc(r.caipinmingcheng)} × ${r.buyshu}</span><b>${money(r.total)}</b></div>`).join("")}<div class="row spread wrap" style="margin-top:20px"><h3>合计 ${money(o.total)}</h3><div class="row">${o.status === "未支付" ? `<button class="btn ghost" data-action="cancel-order" data-id="${esc(o.id)}">取消订单</button><button class="btn" data-action="order-pay" data-id="${esc(o.id)}">去支付</button>` : o.code && ["已支付", "制作中", "待取餐"].includes(o.status) ? `<button class="btn secondary" data-action="show-pickup" data-id="${esc(o.id)}">查看取餐码</button>` : ""}</div></div></article>`;
          })
          .join("")
      : empty(
          "暂无该状态的订单",
          "去点餐页或让小智帮你选一餐",
          '<a class="btn" href="#menu">直接点餐</a>',
        )
  }<h2 class="section-title">我的座位</h2><div class="grid two">${seats.data.length ? seats.data.map((r) => `<section class="card"><div class="row spread"><h3>${esc(r.restaurant)} · ${esc(r.seatLabel)}</h3><span class="badge">${r.status === "confirmed" ? "已预约" : "已取消"}</span></div><p class="muted">${esc(r.campus)} · ${esc(dateTime(r.startsAt))} — ${esc(dateTime(r.endsAt))}</p>${r.status === "confirmed" ? `<button class="btn ghost" data-action="cancel-seat" data-id="${esc(r.reservationId)}">取消预约</button>` : ""}</section>`).join("") : '<p class="muted">暂无预约座位</p>'}</div><h2 class="section-title">文创与校园活动</h2><div class="grid two">${culture.data.map((o) => `<section class="card"><h3>${esc(o.title)} × ${o.quantity}</h3><p>${money(o.total)} · ${esc(o.status)}</p><small>${esc(o.orderId)}</small></section>`).join("")}${activities.data.map((a) => `<section class="card"><h3>${esc(a.title)}</h3><p>${esc(a.campus)} · 已报名</p></section>`).join("") || '<p class="muted">暂无校园生活订单</p>'}</div>`;
}
export const actions = {
  "order-filter": (ctx, e) => {
    ctx.orderStatus = e.target.closest("[data-status]").dataset.status;
    ctx.render();
  },
  "order-pay": (ctx, e) => {
    const o = ctx.orders.find(
      (o) => o.id === e.target.closest("[data-id]").dataset.id,
    );
    return cashier(ctx, o.id, o.total);
  },
  "show-pickup": (ctx, e) => {
    const o = ctx.orders.find(
      (o) => o.id === e.target.closest("[data-id]").dataset.id,
    );
    modal(
      "取餐码",
      `<div class="order-code">${esc(o.code)}</div><p class="muted">订单 ${esc(o.id)} · ${esc(o.status)}</p><p style="margin-top:15px">取餐时向窗口出示，校方核销后订单完成。</p>`,
    );
  },
  "cancel-order": (ctx, e) => {
    const id = e.target.closest("[data-id]").dataset.id;
    modal(
      "取消未支付订单",
      `<p>确认取消 ${esc(id)}？关联的方案座位也会释放。</p><div class="actions"><button class="btn danger" data-action="cancel-order-confirm" data-id="${esc(id)}">确认取消</button></div>`,
    );
  },
  "cancel-order-confirm": async (ctx, e) => {
    await post(
      `/orders/${encodeURIComponent(e.target.closest("[data-id]").dataset.id)}/cancel`,
      {},
    );
    closeModal();
    toast("订单已取消", "success");
    ctx.refresh();
  },
  "cancel-seat": async (ctx, e) => {
    await api(
      `/restaurants/reservations/${encodeURIComponent(e.target.closest("[data-id]").dataset.id)}`,
      { method: "DELETE" },
    );
    toast("预约已取消", "success");
    ctx.refresh();
  },
};
