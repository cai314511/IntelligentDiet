import {dishPhoto} from '../../shared/dish-photo.js';
import {
  api,
  esc,
  money,
  dateTime,
  session,
  button,
  notice,
  bind,
  dialog,
} from "../../shared/feature-ui.js";
const flow = ["已支付", "制作中", "待取餐", "已完成"];
export async function renderOrders() {
  const root = document.getElementById("app-root");
  root.dataset.view = "orders";
  try {
    const rows = (await api("/orders/user/" + session().user.id)).data;
    if (location.hash !== "#orders") return;
    const groups = Object.values(
      rows.reduce((all, r) => {
        const o = (all[r.orderid] ??= { ...r, items: [], amount: 0 });
        o.items.push(r);
        o.amount += Number(r.total);
        return all;
      }, {}),
    );
    root.innerHTML = `<div class="mb-8 flex items-end justify-between"><div><h1 class="text-4xl font-bold tracking-tight">我的订单</h1><p class="text-appleLightGray mt-1">状态每 3 秒自动刷新，餐好立即可见</p></div><span class="text-sm text-appleLightGray">${groups.length} 笔订单</span></div>${groups.map((o) => `<div class="bg-white rounded-[24px] p-6 shadow-apple border border-gray-100 mb-5 fade-in"><div class="flex justify-between items-start mb-4"><div><span class="text-xs text-appleLightGray">订单号 ${esc(o.orderid.slice(-8))} · ${esc(dateTime(o.addtime))}</span>${o.items.map((i) => `<div class="text-sm font-medium" style="display:flex;align-items:center;gap:12px;margin-top:10px">${dishPhoto(i,{width:"56px",height:56})}<span>${esc(i.caipinmingcheng)} <span class="text-appleLightGray">×${i.buyshu}</span></span></div>`).join("")}</div><b class="text-lg">${money(o.amount)}</b></div>${o.dining ? `<p class="text-sm text-appleLightGray mb-3">${esc(o.dining.restaurant)} · ${esc(dateTime(o.dining.startsAt))} · 座位：${o.dining.seats.map(esc).join("、") || "未预约"}</p>` : ""}${flow.includes(o.status) ? `<div class="zx-row">${flow.map((s, i) => `<span style="color:${i <= flow.indexOf(o.status) ? "var(--zx-primary)" : "#86868b"}">${i < flow.indexOf(o.status) ? "✓" : i + 1} ${s}</span>`).join("<span>→</span>")}</div>` : `<p>当前状态：${esc(o.status)}</p>`}${o.status === "待取餐" ? `<div class="mt-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2"><span class="text-xs text-yellow-700">取餐码</span><p class="text-2xl font-black text-yellow-700">${esc(o.pickup_code)}</p></div>` : ""}${o.status === "未支付" ? `<div class="zx-row" style="margin-top:18px">${button("去支付", "pay", true).replace('data-action="pay"', `data-action="pay" data-id="${esc(o.orderid)}"`)}${button("取消订单", "cancel").replace('data-action="cancel"', `data-action="cancel" data-id="${esc(o.orderid)}"`)}</div>` : ""}</div>`).join("") || notice("还没有订单，去点一份心仪的美食吧。")}`;
    bind(root, {
      pay: (b) => {
        const o = groups.find((x) => x.orderid === b.dataset.id);
        window.openCashier(o.orderid, o.amount);
      },
      cancel: (b) => {
        const d = dialog(
          "确认取消未支付订单",
          `<p>订单 ${esc(b.dataset.id)}</p>${button("确认取消", "confirm", true)}<div data-status></div>`,
        );
        bind(d, {
          confirm: async () => {
            await api("/orders/" + b.dataset.id + "/cancel", {
              method: "POST",
            });
            d.close();
            await renderOrders();
          },
        });
      },
    });
  } catch (e) {
    root.innerHTML = notice(e.message, "error") + button("重新加载", "reload");
    bind(root, { reload: renderOrders });
  }
}
