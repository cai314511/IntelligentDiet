import {
  esc,
  money,
  source,
  modal,
  closeModal,
  options,
  store,
  post,
  put,
  toast,
  dateTime,
  empty,
  api,
} from "../../shared/core.js";
import { cashier } from "./cart.js";
const prompts = [
  "20 元以内吃什么",
  "下课后去哪个食堂最快",
  "选低脂午餐并占座",
  "按我的忌口推荐一餐",
];
function planCard(ctx, p) {
  const task = ctx.tasks.find((t) => t.id === p.id),
    status = task?.status || "draft";
  return `<article class="plan-card"><div class="row spread wrap"><div><span class="eyebrow">YOUR MEAL PLAN</span><h3>一份就餐方案，等你确认</h3></div><span class="badge">${status === "confirmed" ? "已创建订单" : status === "cancelled" ? "已取消" : "待确认"}</span></div><div class="timeline" style="margin-top:16px">${p.steps.map((s) => `<span class="${s.status}">${esc(s.label)}</span>`).join("")}</div>${p.items.map((d) => `<div class="dish-line"><div><h3>${esc(d.name)} × ${d.quantity}</h3><p class="muted">${esc(d.restaurant)} · ${esc(d.window)}</p><small>${Number(d.nutrition.calories) || 0} kcal / 份 · ${esc(p.constraints.goal || "均衡饮食")}</small></div><h2>${money(d.price * d.quantity)}</h2></div><p class="muted" style="font-size:11px">口碑 ${d.reviewCount ? `${Number(d.rating).toFixed(1)} / 5 · ${d.reviewCount} 条评价` : "尚无评价"}</p>${(d.recentCriticism || []).map((r) => `<div class="review"><small>近期反馈 · ${r.rating} / 5</small><p>${esc(r.content)}</p>${r.reply ? `<p class="info-box">校方回复：${esc(r.reply)}</p>` : ""}</div>`).join("")}`).join("")}<div class="plan-meta"><div><small>食堂 / 校区</small><b>${esc(p.restaurant.name)}</b><p>${esc(p.restaurant.campus)}</p></div><div><small>步行 / 排队</small><b>${p.restaurant.distanceM} m / ${p.restaurant.queueMinutes} 分钟</b></div><div><small>预计完成</small><b>约 ${p.estimatedMinutes} 分钟</b></div><div><small>就餐时间</small><b>${esc(dateTime(p.startsAt))}</b></div><div><small>座位方案</small><b>${p.seats.length ? esc(p.seats.map((s) => s.label).join("、")) : "不预约座位"}</b></div><div><small>费用合计</small><b>${money(p.total)}</b></div></div><p class="muted" style="font-size:11px;margin-top:15px">已应用：${esc(p.constraints.goal || "均衡饮食")} · 忌口 ${esc((p.constraints.exclusions || []).join("、") || "无")} · 口味 ${esc((p.constraints.tastes || []).join("、") || "不限")}</p>${source(p.mode === "agent" ? "模型工具规划 · 校园菜单" : "校园菜单检索", p.updatedAt)}${status === "draft" ? `<div class="actions"><button class="btn secondary" data-action="edit-plan">修改方案</button><button class="btn ghost" data-action="cancel-plan">取消</button><button class="btn" data-action="confirm-plan">确认执行 · ${money(p.total)}</button></div><small>确认后创建待支付订单${p.seats.length ? "并预约上述座位" : ""}，不会自动扣款。</small>` : status === "confirmed" ? '<a class="btn" href="#orders" style="margin-top:16px">查看订单与取餐状态</a>' : ""}</article>`;
}
export function render(ctx) {
  const p = ctx.latestPlan,
    history = ctx.tasks.slice(0, 5);
  return `<div class="agent-layout"><section class="agent-workspace"><div class="row spread"><span class="eyebrow">XIAOZHI WORKSPACE</span><span class="badge">${esc(ctx.session.school?.shortName || "校园")} · ${esc(ctx.preferences.goal || "均衡饮食")}</span></div>${!ctx.chat.length && !p ? `<div class="agent-welcome"><img src="/assets/brand/xiaozhi-avatar.png" alt="小智校园餐饮精灵"><h1>你好，${esc(ctx.user.xingming)}。<br>今天想怎么吃？</h1><p>说说预算、口味与时间，<br>我帮你一起安排菜品、食堂和座位。</p></div><div class="agent-prompts">${prompts.map((p) => `<button data-action="agent-prompt" data-prompt="${esc(p)}">✦ ${esc(p)}</button>`).join("")}</div>` : ""}${ctx.chat
    .slice(-6)
    .map((m) =>
      m.role === "user"
        ? `<div class="chat-user">${esc(m.content)}</div>`
        : `<div class="agent-reply"><img src="/assets/brand/xiaozhi-avatar.png" alt="小智"><p>${esc(m.content)}</p></div>`,
    )
    .join(
      "",
    )}${ctx.busy ? '<div class="loading"><img src="/assets/brand/xiaozhi-avatar.png" alt="正在整理就餐方案"><p>正在理解条件、检索菜单并核对座位…</p></div>' : ""}${p ? planCard(ctx, p) : ""}${ctx.taskError ? `<div class="info-box"><b>${esc(ctx.taskError)}</b><div class="row wrap" style="margin-top:10px"><button class="btn secondary" data-action="retry-task">重试</button><a class="btn ghost" href="#menu">直接点餐</a><button class="btn ghost" data-action="cached-plan">查看最近方案</button></div></div>` : ""}<div class="agent-compose"><form class="agent-input" data-action="agent-submit"><input id="agent-input" name="message" maxlength="2000" placeholder="例如：20 元以内，不吃辣，12:30 帮我占座" aria-label="告诉小智你的就餐需求" autocomplete="off" ${ctx.busy ? "disabled" : ""}><button type="button" class="icon-btn" data-action="agent-voice" aria-label="语音输入">♬</button><button class="btn" ${ctx.busy ? "disabled" : ""}>发送 ↗</button></form><div class="agent-meta"><span>由你确认每一步执行与费用</span><a href="#menu">跳过小智，直接点餐 →</a></div></div></section><aside class="agent-side"><section class="card"><div class="row spread"><h3>我的就餐偏好</h3><a href="#my">编辑</a></div><div class="side-list"><p>目标 · ${esc(ctx.preferences.goal || "均衡饮食")}</p><p>忌口 · ${esc((ctx.preferences.exclusions || []).join("、") || "无")}</p><p>校区 · ${esc(ctx.session.campus || "全校")}</p></div></section><section class="card"><h3>快捷任务</h3><div class="side-list">${p ? '<button data-action="edit-plan">调整当前方案 →</button><a href="#orders">查看执行结果 →</a>' : ""}<button data-action="agent-prompt" data-prompt="快速点午餐">快速点午餐 →</button><button data-action="agent-prompt" data-prompt="帮我避开排队">避开排队 →</button><button data-action="agent-prompt" data-prompt="按预算推荐一餐">按预算推荐 →</button><a href="#orders">继续未完成订单 →</a></div></section><section class="card"><div class="row spread"><h3>最近任务</h3><button class="btn ghost" data-action="refresh">刷新</button></div><div class="side-list">${history.length ? history.map((t) => `<button data-action="resume-task" data-id="${esc(t.id)}"><b>${esc(t.message.slice(0, 30))}</b><br><small>${t.status === "draft" ? "待确认" : t.status === "confirmed" ? "已创建订单" : "已取消"} · ${esc(dateTime(t.created_at))}</small></button>`).join("") : '<p class="muted">第一份方案，从一句话开始。</p>'}</div></section></aside></div>`;
}
async function send(ctx, message) {
  if (ctx.busy) return;
  ctx.busy = true;
  ctx.taskError = "";
  ctx.lastMessage = message;
  ctx.chat.push({ role: "user", content: message });
  store("chat", ctx.chat.slice(-12));
  await ctx.render();
  try {
    if (/查.*订单|我的订单|活动|文创|营业时间/.test(message)) {
      const result = await post("/ai/chat", {
        message,
        schoolId: ctx.user.school_id,
        history: ctx.chat.slice(-9, -1),
      });
      ctx.chat.push({ role: "assistant", content: result.reply });
    } else {
      const result = await post("/tasks", {
        message,
        history: ctx.chat.slice(-9, -1),
        constraints: {
          ...(ctx.session.campus ? { campus: ctx.session.campus } : {}),
        },
      });
      ctx.latestPlan = result.data;
      store("plan", result.data);
      await ctx.load();
    }
    store("chat", ctx.chat.slice(-12));
  } catch (e) {
    ctx.taskError = e.message;
  } finally {
    ctx.busy = false;
    await ctx.render();
  }
}
async function editor(ctx) {
  const p = ctx.latestPlan,
    local = new Date(
      new Date(p.startsAt).getTime() -
        new Date(p.startsAt).getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 16),
    seatData = (
      await api(
        `/restaurants/${p.restaurant.id}/seats?startsAt=${encodeURIComponent(p.startsAt)}&endsAt=${encodeURIComponent(p.endsAt)}`,
      )
    ).data;
  modal(
    "调整就餐方案",
    `<form data-action="save-plan"><div class="form-grid"><div><label>总预算（元）</label><input name="budget" type="number" min="1" max="6000" value="${p.constraints.budget}" required></div><div><label>就餐人数</label><input name="people" type="number" min="1" max="6" value="${p.constraints.people}" required></div></div><label>食堂</label><select name="restaurantId" id="plan-restaurant" data-change="plan-restaurant">${options(
      ctx.data.restaurants.map((r) => ({
        value: r.id,
        label: `${r.campus} · ${r.name}`,
      })),
      p.restaurant.id,
    )}</select><label>菜品</label><select name="dishId" id="plan-dish">${options(
      ctx.data.dishes
        .filter((d) => d.restaurantId === p.restaurant.id && d.forSale)
        .map((d) => ({ value: d.id, label: `${d.name} · ${money(d.price)}` })),
      p.items[0].id,
    )}</select><label>用餐时间</label><input id="plan-time" name="startsAt" type="datetime-local" data-change="plan-time" value="${local}" required><label>座位（可选多桌）</label><select id="plan-seats" name="seatIds" multiple size="4"><option value="0" selected>自动推荐空闲桌位</option>${seatData.seats
      .filter((s) => s.available)
      .map(
        (s) =>
          `<option value="${s.id}">${esc(s.label)} · ${esc(s.type)}</option>`,
      )
      .join(
        "",
      )}</select><label><input type="checkbox" name="reserve" style="width:auto" ${p.constraints.reserve ? "checked" : ""}> 同时安排座位</label><label>忌口（逗号分隔）</label><input name="exclusions" value="${esc(p.constraints.exclusions.join("、"))}"><div class="actions"><button class="btn" type="submit">重新核对方案</button></div></form>`,
  );
}
export const actions = {
  "agent-submit": (ctx, e) => {
    const message = new FormData(e.target).get("message").trim();
    if (message) return send(ctx, message);
  },
  "agent-prompt": (ctx, e) =>
    send(ctx, e.target.closest("[data-prompt]").dataset.prompt),
  "retry-task": (ctx) => send(ctx, ctx.lastMessage),
  "cached-plan": (ctx) => {
    ctx.latestPlan = ctx.read("plan", null);
    if (!ctx.latestPlan) throw new Error("暂无保存的方案");
    ctx.render();
  },
  "resume-task": (ctx, e) => {
    const task = ctx.tasks.find(
      (t) => t.id === e.target.closest("[data-id]").dataset.id,
    );
    if (task) {
      ctx.latestPlan = task.plan;
      store("plan", task.plan);
      ctx.render();
    }
  },
  "edit-plan": editor,
  "plan-time": async () => {
    const id = Number(document.getElementById("plan-restaurant").value),
      start = new Date(document.getElementById("plan-time").value),
      end = new Date(start.getTime() + 45 * 60000),
      r = (
        await api(
          `/restaurants/${id}/seats?startsAt=${encodeURIComponent(start.toISOString())}&endsAt=${encodeURIComponent(end.toISOString())}`,
        )
      ).data;
    document.getElementById("plan-seats").innerHTML =
      '<option value="0" selected>自动推荐空闲桌位</option>' +
      r.seats
        .filter((s) => s.available)
        .map(
          (s) =>
            `<option value="${s.id}">${esc(s.label)} · ${esc(s.type)}</option>`,
        )
        .join("");
  },
  "plan-restaurant": async (ctx, e) => {
    document.getElementById("plan-dish").innerHTML = options(
      ctx.data.dishes
        .filter((d) => d.restaurantId === Number(e.target.value) && d.forSale)
        .map((d) => ({ value: d.id, label: `${d.name} · ${money(d.price)}` })),
    );
    await actions["plan-time"]();
  },
  "save-plan": async (ctx, e) => {
    const f = new FormData(e.target),
      body = {
        budget: Number(f.get("budget")),
        people: Number(f.get("people")),
        restaurantId: Number(f.get("restaurantId")),
        dishId: Number(f.get("dishId")),
        startsAt: new Date(f.get("startsAt")).toISOString(),
        reserve: f.has("reserve"),
        seatIds: f
          .getAll("seatIds")
          .map(Number)
          .filter((n) => n > 0).length
          ? f
              .getAll("seatIds")
              .map(Number)
              .filter((n) => n > 0)
          : null,
        exclusions: String(f.get("exclusions"))
          .split(/[，,、]/)
          .map((x) => x.trim())
          .filter(Boolean),
      };
    ctx.latestPlan = (await put(`/tasks/${ctx.latestPlan.id}`, body)).data;
    store("plan", ctx.latestPlan);
    closeModal();
    await ctx.load();
    ctx.render();
  },
  "confirm-plan": async (ctx) => {
    if (ctx.executing) return;
    ctx.executing = true;
    try {
      const p = ctx.latestPlan,
        r = (await post(`/tasks/${p.id}/confirm`, { expectedTotal: p.total }))
          .data;
      await ctx.load();
      await ctx.render();
      await cashier(ctx, r.orderid, r.totalPrice ?? p.total);
    } finally {
      ctx.executing = false;
    }
  },
  "cancel-plan": async (ctx) => {
    await post(`/tasks/${ctx.latestPlan.id}/cancel`, {});
    await ctx.load();
    ctx.render();
  },
  "agent-voice": () => {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      toast("当前浏览器不支持语音，请使用文字输入");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "zh-CN";
    recognition.onresult = (e) => {
      const input = document.getElementById("agent-input");
      if (input) input.value = e.results[0][0].transcript;
    };
    recognition.onerror = () => toast("语音未识别，请重试或输入文字");
    recognition.start();
  },
};
