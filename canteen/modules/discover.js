import {
  api,
  post,
  esc,
  money,
  modal,
  closeModal,
  toast,
  source,
  empty,
  dateTime,
  options,
  saveSession,
} from "../../shared/core.js";
export async function render(ctx) {
  const tab = ctx.discoverTab || "activities";
  const tabs = [
    ["activities", "校园活动"],
    ["culture", "文创与积分"],
    ["proposals", "菜品共创"],
    ["feedback", "食堂反馈"],
  ];
  let html = "";
  if (tab === "activities") {
    const rows = (await api("/activities")).data;
    html = `<div class="grid three">${rows
      .map((a) => {
        const ended = new Date(a.endsAt) < new Date();
        return `<article class="card"><span class="badge">${esc(a.category)}</span><h3 style="margin-top:14px">${esc(a.title)}</h3><p class="muted" style="margin-top:10px">${esc(a.description)}</p><p style="margin-top:12px">${esc(a.campus)} · ${esc(dateTime(a.startsAt))}</p><small>${a.capacity ? `${a.participants}/${a.capacity} 人` : "开放名额"} · 报名获得 10 积分</small><button class="btn secondary" style="margin-top:16px" data-action="join-activity" data-id="${a.id}" ${ended ? "disabled" : ""}>${ended ? "活动已结束" : "报名参与"}</button>${source(a.sourceName, a.startsAt)}</article>`;
      })
      .join("")}</div>`;
  }
  if (tab === "culture") {
    const [items, points] = await Promise.all([
      api("/activities/culture"),
      api("/community/points"),
    ]);
    ctx.culturalItems = items.data;
    html = `<section class="card row spread wrap" style="margin-bottom:20px"><div><small>我的校园积分</small><h1>${points.data.balance}</h1></div><button class="btn secondary" data-action="points-history">积分与兑换记录</button></section><div class="grid three">${items.data.map((c) => `<article class="card"><span class="badge">${esc(c.category)}</span><h3 style="margin-top:15px">${esc(c.title)}</h3><p class="muted" style="margin-top:10px">${esc(c.description)}</p><h2 style="margin-top:15px">${money(c.price)}</h2><div class="row wrap" style="margin-top:18px"><button class="btn secondary" data-action="culture-confirm" data-id="${c.id}">购买</button><button class="btn ghost" data-action="redeem-confirm" data-id="${c.id}">${Math.max(1, Math.round(c.price * 10))} 积分兑换</button></div><small>${esc(c.sourceName)}</small></article>`).join("")}</div>`;
  }
  if (tab === "proposals") {
    const rows = (await api("/community/proposals")).data;
    html = `<section class="card" style="margin-bottom:20px"><form data-action="new-proposal"><h3>你希望食堂上什么新菜？</h3><label>提案标题</label><input name="title" required maxlength="100" placeholder="例如：增加一款低油高蛋白套餐"><label>说说你的想法</label><textarea name="description" required maxlength="2000"></textarea><button class="btn" style="margin-top:14px">提交共创提案</button></form></section><div class="grid two">${rows.map((p) => `<article class="card"><h3>${esc(p.title)}</h3><p class="muted" style="margin:12px 0">${esc(p.description)}</p><p>${p.support || 0} 人支持 · ${p.votes} 票</p><div class="row wrap" style="margin-top:16px"><button class="btn secondary" data-action="vote-proposal" data-id="${p.id}" data-choice="支持" ${p.myVote ? "disabled" : ""}>支持 +5 积分</button><button class="btn ghost" data-action="vote-proposal" data-id="${p.id}" data-choice="再考虑" ${p.myVote ? "disabled" : ""}>再考虑</button></div></article>`).join("") || empty("第一条共创提案，等你提出")}</div>`;
  }
  if (tab === "feedback") {
    const rows = (await api("/social/messages")).data;
    html = `<section class="card"><form data-action="new-feedback"><h3>让食堂更懂你的意见</h3><label>反馈类型</label><select name="category">${options(["建议", "投诉", "菜品问题", "服务问题"], "建议")}</select><label>食堂</label><select name="restaurantId">${options([{ value: 0, label: "全校建议" }, ...ctx.data.restaurants.map((r) => ({ value: r.id, label: `${r.campus} · ${r.name}` }))])}</select><label>窗口（可选）</label><input name="window" maxlength="80"><label>具体内容</label><textarea name="content" required maxlength="2000" placeholder="描述时间、食堂、菜品与具体问题"></textarea><button class="btn" style="margin-top:14px">提交反馈</button></form></section><h2 class="section-title">食堂反馈与校方回复</h2><div class="stack">${rows.map((m) => `<article class="card"><div class="row spread"><h3>${esc(m.yonghuming)}</h3><span class="badge">${esc(m.category)} · ${esc(m.workflow)}</span></div><p style="margin:14px 0">${esc(m.content)}</p>${m.replycontent ? `<div class="info-box">校方回复：${esc(m.replycontent)}</div>` : ""}<small>${esc(dateTime(m.addtime))}</small></article>`).join("") || empty("暂时还没有反馈")}</div>`;
  }
  return `<div class="page-head"><span class="eyebrow">CAMPUS LIFE</span><h1>一餐之外，校园更有趣</h1><p>参与活动、共创菜品，积累你的校园权益。</p></div><div class="tabs" style="margin-bottom:22px">${tabs.map(([key, label]) => `<button data-action="discover-tab" data-tab="${key}" class="${tab === key ? "active" : ""}">${label}</button>`).join("")}</div>${html}`;
}
export const actions = {
  "discover-tab": (ctx, e) => {
    ctx.discoverTab = e.target.closest("[data-tab]").dataset.tab;
    ctx.render();
  },
  "join-activity": async (ctx, e) => {
    await post(
      `/activities/${e.target.closest("[data-id]").dataset.id}/join`,
      {},
    );
    toast("报名成功，获得 10 积分", "success");
    ctx.render();
  },
  "new-proposal": async (ctx, e) => {
    await post(
      "/community/proposals",
      Object.fromEntries(new FormData(e.target)),
    );
    toast("共创提案已发布", "success");
    ctx.render();
  },
  "vote-proposal": async (ctx, e) => {
    const b = e.target.closest("[data-id]");
    const r = await post(`/community/proposals/${b.dataset.id}/vote`, {
      choice: b.dataset.choice,
    });
    toast(r.message, "success");
    ctx.render();
  },
  "new-feedback": async (ctx, e) => {
    await post("/social/messages", Object.fromEntries(new FormData(e.target)));
    toast("反馈已提交", "success");
    ctx.render();
  },
  "culture-confirm": (ctx, e) => {
    const item = ctx.culturalItems.find(
      (c) => c.id === Number(e.target.closest("[data-id]").dataset.id),
    );
    modal(
      "确认文创订单",
      `<h3>${esc(item.title)}</h3><p class="muted">数量 1 · 账户余额支付</p><h1 style="margin:18px 0">${money(item.price)}</h1><div class="actions"><button class="btn" data-action="buy-culture" data-id="${item.id}">确认购买并支付 ${money(item.price)}</button></div>`,
    );
  },
  "buy-culture": async (ctx, e) => {
    const r = (
      await post(
        `/activities/culture/${e.target.closest("[data-id]").dataset.id}/purchase`,
        { quantity: 1 },
      )
    ).data;
    ctx.user.jine = r.balance;
    ctx.session.user = ctx.user;
    saveSession(ctx.session);
    closeModal();
    toast("文创订单已创建", "success");
  },
  "redeem-confirm": (ctx, e) => {
    const item = ctx.culturalItems.find(
        (c) => c.id === Number(e.target.closest("[data-id]").dataset.id),
      ),
      cost = Math.max(1, Math.round(item.price * 10));
    modal(
      "确认积分兑换",
      `<h3>${esc(item.title)}</h3><p>费用 ${cost} 积分</p><div class="actions"><button class="btn" data-action="redeem-culture" data-id="${item.id}">确认兑换</button></div>`,
    );
  },
  "redeem-culture": async (ctx, e) => {
    await post(
      `/community/redeem/${e.target.closest("[data-id]").dataset.id}`,
      {},
    );
    closeModal();
    toast("兑换单已生成", "success");
    ctx.render();
  },
  "points-history": async () => {
    const p = (await api("/community/points")).data;
    modal(
      "积分与兑换记录",
      `<h2>${p.balance} 积分</h2>${p.ledger.map((r) => `<div class="log-item row spread"><span>${esc(r.reason)}</span><b>${r.points > 0 ? "+" : ""}${r.points}</b></div>`).join("") || '<p class="muted">暂无积分记录</p>'}<h3 class="section-title">兑换单</h3>${p.redemptions.map((r) => `<div class="log-item"><b>${esc(r.title)}</b><p>${esc(r.status)} · ${r.points}积分</p><small>${esc(r.id)}</small></div>`).join("")}`,
    );
  },
};
