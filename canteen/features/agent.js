import {dishPhoto,dishImage} from '../../shared/dish-photo.js';
import { streamTask } from "../../shared/core.js";
import {
  api,
  esc,
  money,
  dateTime,
  session,
  read,
  store,
  button,
  card,
  options,
  field,
  notice,
  bind,
  formData,
  source,
} from "../../shared/feature-ui.js";
let conversationId = null, choices = [];
let stage = 0,
  revision = 0;
export function closeAgent() {
  saveConversation();
  revision++;
  busy = false;
  host?.remove();
}
function active(run) {
  return run === revision && host?.isConnected;
}
let plan = null,
  task = null,
  host = null,
  busy = false,
  phase = "chat",
  transcript = [],
  conditions = {},
  catalog = { dishes: [], restaurants: [] };
function localTime(iso) {
  return new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export async function openAgent(message = "", constraints = {}) {
  saveConversation();
  conversationId = crypto.randomUUID();
  const run = ++revision;
  catalog = (await api("/workspace/catalog")).data;
  window.syncLiveCatalog(catalog);
  if (run !== revision) return;
  document.getElementById("cart-drawer")?.classList.add("translate-x-full");
  document.getElementById("agent-screen")?.remove();
  host = document.createElement("main");
  host.id = "agent-screen";
  host.className = "zx-agent";
  document.body.append(host);
  if (location.hash !== "#agent") history.pushState({ view: "agent" }, "", "#agent");
  plan = null;
  task = null;
  phase = "chat";
  busy = false;
  conditions = { ...constraints };
  if (conditions.dishId) conditions.restaurantId = catalog.dishes.find(d => d.id === Number(conditions.dishId))?.restaurantId;
  transcript = [];
  choices=[];
  draw();
  await reply(message);
}
function execution() {
  if (!busy && phase !== "creating") return "";
  const status = phase === "creating"
    ? "正在创建订单并预约所选座位…"
    : phase === "planning"
      ? ["正在理解用户需求…", "正在核对就餐条件与当前偏好…", "正在检索符合条件的菜品…", "正在比较食堂距离、排队与价格…", "正在核对就餐时段和空闲座位…", "正在整理完整就餐方案…", "正在返回就餐方案…"][stage] || "正在准备方案…"
      : "正在理解用户需求…";
  return `<div class="zx-thinking" role="status"><span class="zx-thinking-spinner" aria-hidden="true"></span><span><b>思考中</b> · ${esc(status)}</span></div>`;
}
function saveConversation() {
  if(!conversationId || !transcript.length) return;
  const rows=read("agent-conversations",[]);
  const old=rows.find(r=>r.id===conversationId);
  const entry={id:conversationId,title:transcript.find(m=>m.role==='user')?.content.slice(0,36) || '与小智的对话',updatedAt:new Date().toISOString(),transcript,conditions,plan,task,choices};
  if(old && JSON.stringify({...old,updatedAt:null})===JSON.stringify({...entry,updatedAt:null}))return;
  store("agent-conversations",[entry,...rows.filter(r=>r.id!==conversationId)]);
  api(`/tasks/conversations/${entry.id}`,{method:"PUT",body:entry}).catch(()=>{});
}
async function showConversations() {
  saveConversation();
  let rows=read("agent-conversations",[]);
  try { const remote=(await api("/tasks/conversations")).data; rows=[...rows,...remote.filter(r=>!rows.some(x=>x.id===r.id))].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));store("agent-conversations",rows); } catch {}
  const panel=host.querySelector('#agent-history');
  panel.hidden=!panel.hidden;
  panel.innerHTML=`<h3>历史对话</h3>${rows.length?rows.map(r=>`<button type="button" class="zx-history-item" data-action="restore" data-id="${esc(r.id)}"><b>${esc(r.title)}</b><span>${esc(dateTime(r.updatedAt))}</span></button>`).join(''):'<p>暂无历史对话</p>'}`;
}
async function restoreConversation(b) {
  if(busy)return;
  saveConversation();
  const saved=read("agent-conversations",[]).find(r=>r.id===b.dataset.id);
  if(!saved)return;
  revision++;conversationId=saved.id;
  choices=saved.choices||[];transcript=saved.transcript;conditions=saved.conditions;plan=saved.plan;task=saved.task;
  if(task) {
    try { const latest=(await api(`/tasks/${task.id}`)).data; if(latest){plan=latest.plan;task={...task,...latest};} else {plan=null;task=null;} }
    catch { plan=null;task=null; }
  }
  phase=task?.status==='confirmed'?'ordered':'chat';draw();
}
function choicePhoto(choice) {
  const dish = (catalog?.dishes || []).filter(d => choice.label.includes(d.name)).sort((a,b)=>b.name.length-a.name.length)[0];
  return dish && dishImage(dish) ? dishPhoto(dish,{width:'40px',height:40}) : '';
}
function draw(prefill = "") {
  saveConversation();
  host.innerHTML = `<div class="zx-row" style="justify-content:space-between">${button("返回点餐", "close")}<span>${esc(session()?.school?.name)} · 小智</span>${button("查看订单", "orders")}</div><img class="zx-agent-mascot" src="/assets/brand/xiaozhi-body.png" alt="小智"><h1>不知道吃什么？让<em>小智</em>帮您决定！</h1>${card("和小智聊聊", `<div class="zx-chat-tools">${button("新对话", "new")}${button("历史对话", "history")}</div><section id="agent-history" class="zx-history" hidden></section><div class="zx-conversation" aria-live="polite">${transcript.map((m) => `<div class="zx-chat-message ${m.role}"><b>${m.role === "assistant" ? "小智" : m.role === "system" ? "系统" : "我"}</b><p>${esc(m.content)}</p></div>`).join("")}</div><div class="zx-choice-list">${choices.map((c,i)=>`<button type="button" class="zx-button" data-action="choice" data-index="${i}" ${busy?'disabled':''}>${choicePhoto(c)}${esc(c.label)}</button>`).join('')}</div><div class="zx-execution" aria-live="polite">${execution()}</div><form id="agent-chat">${field("message", "回复小智", `<button type="button" class="zx-mic" data-action="voice" aria-label="语音输入"><i class="fa-solid fa-microphone" aria-hidden="true"></i></button><textarea maxlength="2000" placeholder="说说你想吃什么…" class="zx-chat-input">${esc(prefill)}</textarea>`)}<div class="zx-row"><button type="submit" class="zx-button zx-primary" ${busy ? "disabled" : ""}>${busy ? "小智处理中…" : "发送"}</button></div></form><div data-status></div>`)}<section id="agent-result">${planHTML()}</section>`;
  bind(host, {
    close: () => {
      closeAgent();
      history.replaceState({ view: "order" }, "", "#order");
    },
    orders: () => {
      closeAgent();
      window.navigate("orders");
    },
    voice,
    choice: b => {if(!busy)return reply(choices[Number(b.dataset.index)].message);},
    new: () => openAgent(),
    history: showConversations,
    restore: restoreConversation,
    cancel,
    confirm,
    modify,
    "back-plan": () => draw(),
    seats: () => window.openSeatPicker(),
    pay: () => window.openCashier(task.order_id, plan.total),
  });
  const form = host.querySelector("form");
  if (busy)
    host
      .querySelectorAll(
        'select,textarea,button[data-action="new"],button[data-action="history"],button[data-action="restore"],button[data-action="quick"],button[data-action="regenerate"],button[data-action="confirm"],button[data-action="modify"],button[data-action="cancel"],button[data-action="pay"],button[data-action="voice"]',
      )
      .forEach((x) => (x.disabled = true));
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const message =
      form.message.value.trim() ||
      "";
    if (!message) {
      host.querySelector("[data-status]").innerHTML = notice(
        "请告诉小智你的就餐需求。",
      );
      return;
    }
    await reply(message);
  };
  const log = host.querySelector(".zx-conversation");
  log.scrollTop = log.scrollHeight;
}
function conditionKey(value) {
  return JSON.stringify(Object.fromEntries(Object.entries(value)
    .filter(([,v]) => v != null)
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([key,v]) => [key, key === "startsAt" ? Date.parse(v) : Array.isArray(v) ? [...v].sort() : v])));
}
async function reply(message) {
  if (busy) return;
  if (
    plan &&
    task?.status === "draft" &&
    /^(确认|就这个|就这份|下单|去支付)[。！!]*$/.test(message)
  )
    return confirm();
  if (/^(谢谢|好的|收到|好哒)[。！!]*$/.test(message) && plan) {
    transcript.push(
      { role: "user", content: message },
      {
        role: "assistant",
        content:
          task?.status === "confirmed"
            ? "订单已保留，可前往支付或查看订单。"
            : "方案还没有执行，核对后点击确认即可。",
      },
    );
    draw();
    return;
  }
  const run = revision;
  busy = true;
  const history = transcript.slice();
  if (message) transcript.push({ role: "user", content: message });
  const previousPlan = plan, previousTask = task, previousConditions = conditions;
  phase = "chat";
  draw();
  try {
    const r = (await api("/tasks/conversation", {
      method: "POST", body: { message, history, conditions, taskId: task?.id },
    })).data;
    if (!active(run)) return;
    if (r.intent === "cancel" && previousTask?.status === "draft") {
      busy = false;
      await cancel();
      return;
    }
    if (r.intent !== "answer") conditions = { ...r.constraints };
    choices=r.choices || [];
    const changed = conditionKey(conditions) !== conditionKey(previousConditions);
    if (r.ready || changed) {
      if (previousTask?.status === "draft") window.removeAgentCart(previousTask.id);
      plan = null; task = null;
    }
    transcript.push({ role: "assistant", content: r.reply });
    if (r.ready) {
      busy = false;
      await generate();
      return;
    }
    phase = "preferences";
  } catch (e) {
    if (active(run)) {
      plan = previousPlan; task = previousTask;
      transcript.push({ role: "system", content: e.message });
    }
  } finally {
    if (active(run)) {
      busy = false;
      draw();
      if (!plan) {
        host
          .querySelector("#agent-chat")
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        host.querySelector("textarea")?.focus({ preventScroll: true });
      }
    }
  }
}
function planHTML() {
  if (!plan) return "";
  const confirmed = task?.status === "confirmed",
    cancelled = task?.status === "cancelled";
  return `${card(confirmed ? "订单已创建" : cancelled ? "任务已取消" : "已加入餐盘的就餐方案", `<ul class="zx-plan-items">${plan.items.map((d) => `<li>${dishPhoto(d,{catalog:catalog?.dishes||[],width:"64px",height:64})}<b style="flex:1;margin-left:12px">${esc(d.name)} × ${d.quantity}</b><span>${money(d.price * d.quantity)}</span></li>`).join("")}</ul><div class="zx-grid"><p>食堂：${esc(plan.restaurant.name)}<br>窗口：${esc(plan.items[0].window)}<br>距离：${esc(plan.restaurant.distanceM)} 米<br>排队：${esc(plan.restaurant.queueMinutes)} 分钟</p><p>座位：${plan.seats.map((s) => esc(s.label || s.seat_label || s.id)).join("、") || "不预约"}<br>就餐时间：${esc(dateTime(plan.startsAt))}<br>预计完成：${esc(plan.estimatedMinutes)} 分钟<br>费用：<b>${money(plan.total)}</b></p></div><p class="zx-source">采用偏好：${esc(plan.preferences?.goal || "均衡饮食")} · 忌口 ${esc((plan.constraints.exclusions || []).join("、") || "无")} · 口味 ${esc((plan.constraints.tastes || []).join("、") || "不限")}</p>${plan.items.map((d) => `<p class="zx-source">口碑：${d.reviewCount ? esc(d.rating) + "分 · " + d.reviewCount + "条评价" : "暂无评价"}${(d.recentCriticism || []).map((r) => "<br>近期反馈：" + esc(r.content) + (r.reply ? " · 校方回复：" + esc(r.reply) : "")).join("")}</p>`).join("")}${source(plan.sourceName, plan.updatedAt)}<div class="zx-row">${confirmed ? `${button("前往支付", "pay", true)}${button("查看取餐状态", "orders")}` : cancelled ? "" : `${button("查看餐盘 · " + money(plan.total), "confirm", true)}${button("修改方案", "modify")}${button("选择食堂座位", "seats")}${button("取消任务", "cancel")}`}</div><div data-status>${confirmed ? notice("订单已保留为未支付，请核对费用后另行确认支付。", "success") : ""}</div>`)} `;
}
async function generate() {
  if (busy) return;
  const run = revision;
  busy = true;
  phase = "planning";
  stage = 0;
  draw();
  try {
    const result = await streamTask(
      {
        message:
          transcript
            .filter((x) => x.role === "user")
            .map((x) => x.content)
            .at(-1) || "请按当前选择准备就餐方案",
        constraints: conditions,
        dialogueReady: true,
      },
      (completed) => {
        if (!active(run)) return;
        stage = completed;
        const indicator = host.querySelector(".zx-execution");
        if (indicator) indicator.innerHTML = execution();
      },
    );
    if (!active(run)) return;
    plan = result;
    conditions = {
      ...conditions,
      ...plan.constraints,
      startsAt: plan.startsAt,
    };
    task = { id: result.id, status: "draft", plan: result };
    window.addPlanToCart(plan);
    phase = "review";

  } catch (e) {
    if (!active(run)) return;
    phase = "error";
    transcript.push({ role: "assistant", content: e.message });
  } finally {
    if (active(run)) {
      busy = false;
      draw();
      host
        .querySelector("#agent-result")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
}
async function confirm() {
  if (busy || !plan || task?.status !== "draft") return;
  window.showCart();
}
window.addEventListener("cart-order-created", e => {
  if (!host?.isConnected || !task || e.detail.taskId !== task.id) return;
  if (e.detail.plan) plan = e.detail.plan;
  task = {...task,status:"confirmed",order_id:e.detail.orderid};
  phase = "ordered";
  transcript.push({role:"assistant",content:"订单已创建，尚未支付。可以在收银台确认支付。"});
  draw();
});
window.addEventListener("cart-dining-updated", e => {
  if (!plan || task?.status !== "draft") return;
  plan.startsAt=e.detail.startsAt;
  plan.restaurant=catalog.restaurants.find(r=>r.id===e.detail.restaurantId) || plan.restaurant;
  plan.seats=e.detail.seats || [];
  conditions={...conditions,startsAt:plan.startsAt,restaurantId:plan.restaurant.id,reserve:plan.seats.length>0};
  draw();
});
async function cancel() {
  await api(`/tasks/${plan.id}/cancel`, { method: "POST" });
  window.removeAgentCart(task.id);
  task.status = "cancelled";
  transcript.push({
    role: "assistant",
    content: "方案已取消，没有创建订单。可以继续告诉我新的需求。",
  });
  plan = null;
  task = null;
  phase = "preferences";
  draw();
}
async function modify() {
  const run = revision,
    taskId = task.id;
  const result = document.getElementById("agent-result");
  result.innerHTML = card(
    "修改后重新核对方案",
    `<form id="modify-plan"><div class="zx-grid">${field(
      "dishId",
      "菜品",
      `<select>${options(
        catalog.dishes
          .filter((d) => d.forSale)
          .map((d) => [
            d.id,
            `${d.name} · ${d.restaurant} · ${money(d.price)}`,
          ]),
        plan.items[0].id,
      )}</select>`,
    )}${field("startsAt", "时间", `<input type="datetime-local" value="${localTime(plan.startsAt)}" required>`)}${field("people", "人数", `<input type="number" min="1" max="6" value="${plan.constraints.people}">`)}${field("budget", "总预算", `<input type="number" min="1" value="${plan.constraints.budget}">`)}</div><label><input type="checkbox" name="reserve" ${plan.constraints.reserve ? "checked" : ""}> 预约座位</label><div id="available-seats"></div><div class="zx-row"><button class="zx-button zx-primary" type="submit">更新方案</button>${button("返回方案", "back-plan")}</div></form><div data-status></div>`,
  );
  result.scrollIntoView({ behavior: "smooth", block: "start" });
  const form = result.querySelector("form");
  let seatRequest = 0;
  async function loadSeats() {
    const request = ++seatRequest;
    if (!form.reserve.checked) {
      result.querySelector("#available-seats").innerHTML = "";
      return;
    }
    const selected = catalog.dishes.find(
      (d) => d.id === Number(form.dishId.value),
    );
    const target = result.querySelector("#available-seats");
    try {
      const data = (
        await api(
          `/restaurants/${selected.restaurantId}/seats?startsAt=${encodeURIComponent(new Date(form.startsAt.value).toISOString())}`,
        )
      ).data;
      if (request !== seatRequest || !form.isConnected || !active(run)) return;
      target.innerHTML = `<p style="margin:16px 0">选择座位（留空由小智安排）</p><div class="zx-row">${data.seats.map((seat) => `<label><input type="checkbox" name="seatIds" value="${seat.id}" ${seat.available ? "" : "disabled"} ${seat.available && plan.seats.some((x) => x.id === seat.id) ? "checked" : ""}> ${esc(seat.label)} · ${esc(seat.type)}${seat.available ? "" : " · 已占用"}</label>`).join("")}</div>`;
    } catch (err) {
      if (request !== seatRequest || !form.isConnected || !active(run)) return;
      target.innerHTML = notice(err.message, "error");
    }
  }
  form.reserve.onchange = loadSeats;
  form.dishId.onchange = loadSeats;
  form.startsAt.onchange = loadSeats;
  await loadSeats();
  form.onsubmit = async (e) => {
    e.preventDefault();
    const f = formData(form);
    const submit = form.querySelector("[type=submit]");
    if (submit.disabled) return;
    submit.disabled = true;
    busy = true;
    const controls = [
      ...host.querySelectorAll(
        "#agent-chat select,#agent-chat textarea,#agent-chat button,#modify-plan button[data-action]",
      ),
    ];
    controls.forEach((x) => (x.disabled = true));
    try {
      const dish = catalog.dishes.find((d) => d.id === Number(f.dishId)),
        seats = new FormData(form).getAll("seatIds").map(Number);
      const updatedPlan = (
        await api(`/tasks/${taskId}`, {
          method: "PUT",
          body: {
            dishId: dish.id,
            restaurantId: dish.restaurantId,
            people: Number(f.people),
            budget: Number(f.budget),
            startsAt: new Date(f.startsAt).toISOString(),
            reserve: form.reserve.checked,
            seatIds: form.reserve.checked && seats.length ? seats : undefined,
          },
        })
      ).data;
      if (!active(run) || !form.isConnected) return;
      plan = updatedPlan;
      task.plan = plan;
      window.addPlanToCart(plan);
      conditions = { ...plan.constraints, startsAt: plan.startsAt };
      transcript.push({
        role: "assistant",
        content: "方案已更新，请重新核对菜品、人数、时间和座位。",
      });
      phase = "review";
      busy = false;
      draw();
    } catch (err) {
      if (!active(run) || !form.isConnected) return;
      result.querySelector("[data-status]").innerHTML = notice(
        err.message,
        "error",
      );
    } finally {
      if (active(run)) busy = false;
      controls
        .filter((x) => x.isConnected)
        .forEach((x) => (x.disabled = false));
      if (submit.isConnected) submit.disabled = false;
    }
  };
}

function voice() {
  if (busy) return;
  const run = revision;
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) {
    host.querySelector("[data-status]").innerHTML = notice(
      "当前浏览器不支持语音输入，请使用文字输入。",
    );
    return;
  }
  const recognition = new Speech();
  recognition.lang = "zh-CN";
  recognition.onresult = (e) => {
    if (!active(run) || busy) return;
    host.querySelector("textarea").value += e.results[0][0].transcript;
    host.querySelector("[data-status]").innerHTML = notice("识别完成，可以修改后发送。", "success");
  };
  recognition.onerror = (e) => {
    if (!active(run)) return;
    host.querySelector("[data-status]").innerHTML = notice(
      e.error === "not-allowed"
        ? "请允许麦克风权限或使用文字输入。"
        : "语音未识别，请重试。",
      "error",
    );
  };
  try {
    recognition.start();
    host.querySelector("[data-status]").innerHTML = notice("正在听，请说出你的就餐需求…");
  } catch {
    if (active(run)) host.querySelector("[data-status]").innerHTML = notice("语音输入未能启动，请使用文字输入。", "error");
  }
}
