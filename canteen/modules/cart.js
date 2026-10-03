import {
  esc,
  money,
  modal,
  closeModal,
  post,
  api,
  saveSession,
  toast,
  store,
  session,
  options,
} from "../../shared/core.js";
export function updateBadge(ctx) {
  document.getElementById("cart-count").textContent = ctx.cart.reduce(
    (n, i) => n + i.quantity,
    0,
  );
  store("cart", ctx.cart);
}
export function add(ctx, id) {
  const dish = ctx.data.dishes.find((d) => d.id === Number(id));
  if (!dish || !dish.forSale || !dish.stock) throw new Error("菜品暂不可购买");
  const existing = ctx.cart.find((i) => i.id === dish.id);
  if (existing) {
    if (existing.quantity >= dish.stock || existing.quantity >= 20)
      throw new Error("已达到可购买数量");
    existing.quantity++;
  } else ctx.cart.push({ id: dish.id, quantity: 1 });
  updateBadge(ctx);
  toast("已加入餐盘", "success");
}
function rows(ctx) {
  return ctx.cart.map((i) => ({
    ...i,
    dish: ctx.data.dishes.find((d) => d.id === i.id),
  }));
}
function open(ctx) {
  const lines = rows(ctx),
    total = lines.reduce((n, i) => n + (i.dish?.price || 0) * i.quantity, 0),
    invalid = lines.some((i) => !i.dish?.forSale || i.quantity > i.dish.stock),
    groups = [...new Set(lines.map((i) => i.dish?.restaurant || "失效菜品"))];
  const d = modal(
    "我的餐盘",
    lines.length
      ? `${groups
          .map(
            (g) =>
              `<section class="cart-group"><h3>${esc(g)}</h3><small>预计取餐 ${Math.max(...lines.filter((i) => i.dish?.restaurant === g).map((i) => (i.dish?.queueMinutes || 0) + 5), 5)} 分钟后</small>${lines
                .filter((i) => (i.dish?.restaurant || "失效菜品") === g)
                .map(
                  (i) =>
                    `<div class="cart-item"><div><strong>${esc(i.dish?.name || "菜品已移除")}</strong><p class="muted">${esc(i.dish?.window || "")} · ${money(i.dish?.price)}</p>${!i.dish?.forSale || i.quantity > i.dish.stock ? '<span class="badge bad">请移除或调整数量</span>' : ""}</div><div class="quantity"><button data-action="cart-quantity" data-id="${i.id}" data-delta="-1" aria-label="减少数量">−</button><span>${i.quantity}</span><button data-action="cart-quantity" data-id="${i.id}" data-delta="1" aria-label="增加数量">+</button></div></div>`,
                )
                .join("")}</section>`,
          )
          .join(
            "",
          )}<div class="cart-summary"><div class="row spread"><span>优惠</span><span>${money(0)}</span></div><div class="row spread"><h3>合计</h3><h2>${money(total)}</h2></div><small>取餐时长按各食堂排队记录估算</small><button class="btn" style="width:100%;margin-top:18px" data-action="checkout" ${invalid ? "disabled" : ""}>确认下单</button></div>`
      : '<div class="empty"><img src="/assets/brand/xiaozhi-avatar.png" alt="小智"><h3>餐盘还是空的</h3><p>去点餐页挑选一餐吧</p></div>',
  );
  d.classList.add("cart-dialog");
}
export async function cashier(ctx, orderid, total) {
  const me = (await api("/users/me")).data;
  ctx.user = me;
  ctx.session.user = me;
  saveSession(ctx.session);
  modal(
    "确认支付",
    `<div class="info-box">订单 ${esc(orderid)}</div><div class="row spread" style="margin:25px 0"><span>应付金额</span><h1>${money(total)}</h1></div><p>账户余额 ${money(me.jine)}</p><p class="muted" style="font-size:12px;margin-top:10px">支付成功后查看取餐码与制作进度。</p><div class="actions"><button class="btn secondary" data-action="payment-later">稍后支付</button><button class="btn" data-action="pay-order" data-id="${esc(orderid)}" data-total="${total}" ${me.jine < total ? "disabled" : ""}>确认支付 ${money(total)}</button></div>${me.jine < total ? '<p class="muted" style="margin-top:15px">账户余额不足</p>' : ""}`,
  );
}
export const actions = {
  cart: open,
  "add-cart": (ctx, e) => add(ctx, e.target.closest("[data-id]").dataset.id),
  "cart-quantity": (ctx, e) => {
    const b = e.target.closest("[data-id]"),
      line = ctx.cart.find((i) => i.id === Number(b.dataset.id));
    if (!line) return;
    if (Number(b.dataset.delta) > 0) {
      const dish = ctx.data.dishes.find((d) => d.id === line.id);
      if (!dish || line.quantity >= dish.stock || line.quantity >= 20)
        throw new Error("库存不足或已达数量上限");
    }
    line.quantity += Number(b.dataset.delta);
    ctx.cart = ctx.cart.filter((i) => i.quantity > 0);
    updateBadge(ctx);
    open(ctx);
  },
  checkout: async (ctx) => {
    await ctx.load();
    const lines = rows(ctx);
    if (
      !lines.length ||
      lines.some((i) => !i.dish?.forSale || i.quantity > i.dish.stock)
    )
      throw new Error("餐盘有失效菜品，请重新检查");
    const total = lines.reduce((n, i) => n + i.dish.price * i.quantity, 0);
    modal(
      "确认就餐订单",
      `<div class="stack">${lines.map((i) => `<div class="row spread"><div><strong>${esc(i.dish.name)} × ${i.quantity}</strong><p class="muted">${esc(i.dish.campus)} · ${esc(i.dish.restaurant)} · ${esc(i.dish.window)}</p></div><b>${money(i.dish.price * i.quantity)}</b></div>`).join("")}</div><form data-action="place-order"><label>取餐备注</label><input name="remark" maxlength="240" placeholder="可填写不加辣等要求"><div class="row spread" style="margin-top:22px"><h3>费用合计 ${money(total)}</h3><button class="btn" type="submit">确认创建订单</button></div></form>`,
    );
  },
  "place-order": async (ctx, e) => {
    if (ctx.placing) return;
    ctx.placing = true;
    try {
      const body = {
        items: ctx.cart.map((i) => ({ dishId: i.id, quantity: i.quantity })),
        remark: new FormData(e.target).get("remark") || "",
      };
      const r = (await post("/orders", body)).data;
      ctx.cart = [];
      updateBadge(ctx);
      closeModal();
      await cashier(ctx, r.orderid, r.totalPrice);
    } finally {
      ctx.placing = false;
    }
  },
  "pay-order": async (ctx, e) => {
    const b = e.target.closest("[data-id]");
    const r = (
      await post(`/orders/${encodeURIComponent(b.dataset.id)}/pay`, {})
    ).data;
    ctx.user.jine = r.balance;
    ctx.session.user = ctx.user;
    saveSession(ctx.session);
    closeModal();
    toast("支付成功，请查看取餐码", "success");
    ctx.navigate("orders");
    await ctx.refresh();
  },
  "payment-later": (ctx) => {
    closeModal();
    ctx.navigate("orders");
  },
};
