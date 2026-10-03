import {
  api,
  put,
  post,
  esc,
  money,
  modal,
  closeModal,
  toast,
  dateTime,
} from "../../shared/core.js";
import { table } from "./table.js";
function group(ctx, rows) {
  return Object.values(
    rows.reduce((a, r) => {
      const dish = ctx.data.dishes.find((d) => d.id === r.caipinxinxiid);
      if (!dish || !ctx.scoped([dish]).length) return a;
      const day = new Date(
        r.addtime.replace(" ", "T") + "Z",
      ).toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
      if (day < ctx.filter.from || day > ctx.filter.to) return a;
      a[r.orderid] ??= {
        id: r.orderid,
        status: r.status,
        total: 0,
        quantity: 0,
        names: [],
        restaurant: dish.restaurant,
        window: dish.window,
        time: r.addtime,
        phone: r.phone,
        code: r.pickup_code,
      };
      a[r.orderid].total += Number(r.total);
      a[r.orderid].quantity += r.buyshu;
      a[r.orderid].names.push(r.caipinmingcheng);
      return a;
    }, {}),
  );
}
function actionsHTML(o) {
  return `${o.status === "已支付" ? `<button class="btn ghost" data-action="order-command" data-id="${esc(o.id)}" data-status="制作中">接单</button><button class="btn ghost" data-action="order-refund" data-id="${esc(o.id)}">退款</button>` : o.status === "制作中" ? `<button class="btn ghost" data-action="order-command" data-id="${esc(o.id)}" data-status="待取餐">叫号</button>` : o.status === "待取餐" ? `<button class="btn ghost" data-action="order-pickup" data-id="${esc(o.id)}">核销</button>` : ""}<button class="btn ghost" data-action="order-details" data-id="${esc(o.id)}">详情</button>`;
}
export async function render(ctx) {
  const rows = group(ctx, (await api("/orders")).data);
  ctx.orders = rows;
  const phases = [
    "全部",
    "未支付",
    "已支付",
    "制作中",
    "待取餐",
    "已完成",
    "已退款",
    "已取消",
  ];
  const shown = rows.filter(
    (o) => !ctx.orderStatus || o.status === ctx.orderStatus,
  );
  return `<div class="page-head"><span class="eyebrow">ORDER PIPELINE</span><h1>每一笔订单，有序流转</h1><p>先支付，再接单、叫号与取餐码核销。</p></div><div class="pipeline">${["已支付", "制作中", "待取餐", "已完成", "已退款"].map((s) => `<button data-action="order-status-filter" data-status="${s}" class="${ctx.orderStatus === s ? "active" : ""}">${s}<strong>${rows.filter((o) => o.status === s).length}</strong></button>`).join("")}</div><div class="tabs">${phases.map((s) => `<button data-action="order-status-filter" data-status="${s === "全部" ? "" : s}" class="${(ctx.orderStatus || "") === (s === "全部" ? "" : s) ? "active" : ""}">${s}</button>`).join("")}</div><div class="admin-actions" style="margin-top:16px"><button class="btn secondary" data-action="bulk-accept">批量接单</button><button class="btn ghost" data-action="refresh">刷新订单</button></div>${table(
    ctx,
    "orders",
    shown,
    [
      { key: "id", title: "订单编号" },
      { key: "names", title: "菜品", value: (o) => o.names.join("、") },
      {
        key: "restaurant",
        title: "食堂 / 窗口",
        value: (o) => `${o.restaurant} · ${o.window}`,
      },
      { key: "quantity", title: "份数" },
      { key: "total", title: "费用", render: (o) => money(o.total) },
      {
        key: "phone",
        title: "联系方式",
        value: (o) =>
          o.phone ? o.phone.replace(/^(\d{3})\d+(\d{4})$/, "$1****$2") : "—",
      },
      {
        key: "status",
        title: "状态",
        render: (o) => `<span class="badge">${esc(o.status)}</span>`,
      },
      { key: "time", title: "创建时间", value: (o) => dateTime(o.time) },
      { key: "actions", title: "操作", render: actionsHTML },
    ],
    { selectable: true },
  )}`;
}
export const actions = {
  "order-status-filter": (ctx, e) => {
    ctx.orderStatus = e.target.closest("[data-status]").dataset.status;
    ctx.render();
  },
  "order-command": async (ctx, e) => {
    const b = e.target.closest("[data-id]");
    await put(`/orders/${encodeURIComponent(b.dataset.id)}/status`, {
      status: b.dataset.status,
    });
    toast("订单状态已更新", "success");
    ctx.render();
  },
  "order-refund": (ctx, e) => {
    const o = ctx.orders.find(
      (o) => o.id === e.target.closest("[data-id]").dataset.id,
    );
    modal(
      "确认订单退款",
      `<p>订单 ${esc(o.id)}</p><h2 style="margin:18px 0">退款金额 ${money(o.total)}</h2><p class="muted">退回付款账户并恢复库存，退款仅执行一次。</p><div class="actions"><button class="btn danger" data-action="order-refund-confirm" data-id="${esc(o.id)}">确认退款</button></div>`,
    );
  },
  "order-refund-confirm": async (ctx, e) => {
    await put(
      `/orders/${encodeURIComponent(e.target.closest("[data-id]").dataset.id)}/status`,
      { status: "已退款" },
    );
    closeModal();
    toast("退款已完成", "success");
    ctx.refresh();
  },
  "order-pickup": (ctx, e) => {
    const id = e.target.closest("[data-id]").dataset.id;
    modal(
      "取餐码核销",
      `<form data-action="order-pickup-confirm" data-id="${esc(id)}"><p>${esc(id)}</p><label>学生出示的取餐码</label><input name="pickupCode" required maxlength="4" pattern="[A-Za-z][0-9]{3}" placeholder="例如 A042"><div class="actions"><button class="btn">确认核销</button></div></form>`,
    );
  },
  "order-pickup-confirm": async (ctx, e) => {
    await post(`/orders/${encodeURIComponent(e.target.dataset.id)}/pickup`, {
      pickupCode: new FormData(e.target).get("pickupCode"),
    });
    closeModal();
    toast("取餐已核销", "success");
    ctx.refresh();
  },
  "order-details": async (ctx, e) => {
    const id = e.target.closest("[data-id]").dataset.id,
      rows = (await api(`/orders/${encodeURIComponent(id)}`)).data;
    modal(
      "订单详情",
      `<p>${esc(id)}</p><div class="status-lane" style="margin:15px 0">${["已支付", "制作中", "待取餐", "已完成"].map((s) => `<span class="${s === rows[0]?.status ? "current" : ""}">${s}</span>`).join("")}</div>${rows.map((r) => `<div class="risk-list"><div><span>${esc(r.caipinmingcheng)} × ${r.buyshu}</span><b>${money(r.total)}</b></div></div>`).join("")}<p class="muted" style="margin-top:15px">取餐地点 ${esc(rows[0]?.address || "食堂自取")}</p><p class="muted">备注 ${esc(rows[0]?.remark || "无")}</p><p class="muted">${esc(dateTime(rows[0]?.addtime))}</p>`,
    );
  },
  "bulk-accept": async (ctx) => {
    const ids = ctx.tables?.orders?.selected || [];
    if (!ids.length) throw new Error("请先选择订单");
    let success = 0,
      failed = 0,
      skipped = 0;
    for (const id of ids) {
      const o = ctx.orders.find((o) => o.id === id);
      if (o?.status !== "已支付") {
        skipped++;
        continue;
      }
      try {
        await put(`/orders/${encodeURIComponent(id)}/status`, {
          status: "制作中",
        });
        success++;
      } catch {
        failed++;
      }
    }
    ctx.tables.orders.selected = [];
    toast(`已接单 ${success} 笔，失败 ${failed} 笔，跳过 ${skipped} 笔`);
    ctx.render();
  },
};
