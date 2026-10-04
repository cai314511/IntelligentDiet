import { read, store, api, modal, session } from "./core.js";
const avatar = "/assets/brand/xiaozhi-body.png";
const pet = document.createElement("aside");
pet.className = "xiaozhi-pet";
if(location.pathname.startsWith("/canteen")){pet.classList.add("zx-pet-circle");}
pet.setAttribute("aria-label", "小智互动精灵");
let state = read("pet", { look: "sprite", x: null, y: null }),
  drag = null,
  moved = false,
  timer;
pet.innerHTML = `<div class="pet-bubble" role="status" hidden></div><div class="pet-tools" hidden><button type="button" data-pet="chat">和小智聊聊</button><button type="button" data-pet="pat">摸摸头</button><button type="button" data-pet="feed">喂一餐</button><button type="button" data-pet="look">切换形象</button><button type="button" data-pet="close">收起</button></div><button type="button" class="pet-body" aria-label="小智：点击互动，拖动移动" aria-expanded="false"><span class="pet-sprite" aria-hidden="true"></span><img class="pet-avatar" src="${avatar}" alt="小智精灵"><span class="pet-name">小智 ✦</span></button>`;
document.body.append(pet);
const body = pet.querySelector(".pet-body"),
  tools = pet.querySelector(".pet-tools"),
  bubble = pet.querySelector(".pet-bubble");
let chatDocked = false;
function position() {
  const viewport = innerWidth <= 680 ? "mobile" : "desktop";
  if(state.viewport!==viewport){state.x=null;state.y=null;state.viewport=viewport;}
  const panel = document.getElementById("ai-panel");
  if (chatDocked && panel) {
    const box = panel.getBoundingClientRect();
    pet.style.left = (box.left + 12) + "px";
    pet.style.top = (box.top - 12) + "px";
    return;
  }

  const box = pet.getBoundingClientRect(),
    bottom = innerWidth <= 680 ? 90 : 20;
  state.x = Math.max(
    8,
    Math.min(
      state.x ?? innerWidth - box.width - 18,
      innerWidth - box.width - 8,
    ),
  );
  state.y = Math.max(
    8,
    Math.min(
      state.y ?? innerHeight - box.height - bottom,
      innerHeight - box.height - bottom,
    ),
  );
  pet.style.left = state.x + "px";
  pet.style.top = state.y + "px";
  pet.classList.toggle("pet-left", state.x < innerWidth / 2);
  pet.classList.toggle("pet-top", state.y < 180);
  bubble.style.left =
    Math.max(
      8 - state.x,
      Math.min(
        state.x < innerWidth / 2 ? 110 : -173,
        innerWidth - state.x - 173,
      ),
    ) + "px";
  bubble.style.right = "auto";
}
function look() {
  pet.classList.toggle("avatar-look", state.look === "avatar");
  position();
}
if(location.pathname.startsWith("/canteen"))state.look="avatar";
look();
window.addEventListener("resize", position);
window.addEventListener("xiaozhi-chat-toggle", (event) => {
  chatDocked = event.detail.open;
  pet.classList.toggle("pet-chat-docked", chatDocked);
  toggle(false);
  bubble.hidden = true;
  position();
});
const chatPanel = document.getElementById("ai-panel");
if (chatPanel) {
  new ResizeObserver(position).observe(chatPanel);
  chatPanel.addEventListener("transitionend", position);
}
function say(text, pose = "wave") {
  clearTimeout(timer);
  bubble.textContent = text;
  bubble.hidden = false;
  pet.dataset.pose = pose;
  pet.classList.remove("pet-happy");
  void pet.offsetWidth;
  pet.classList.add("pet-happy");
  timer = setTimeout(() => {
    bubble.hidden = true;
    pet.dataset.pose = "idle";
    pet.classList.remove("pet-happy");
  }, 3200);
}
function toggle(open = !tools.hidden) {
  tools.hidden = !open;
  body.setAttribute("aria-expanded", String(open));
}
body.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || chatDocked) return;
  drag = { x: e.clientX, y: e.clientY, left: state.x, top: state.y };
  moved = false;
  body.setPointerCapture(e.pointerId);
});
body.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x,
    dy = e.clientY - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 7) moved = true;
  if (moved) {
    toggle(false);
    state.x = drag.left + dx;
    state.y = drag.top + dy;
    position();
  }
});
body.addEventListener("pointerup", () => {
  if (drag && moved) store("pet", state);
  drag = null;
});
body.addEventListener("pointercancel", () => {
  drag = null;
});
body.addEventListener("click", () => {
  if (chatDocked) return;
  if (moved) {
    moved = false;
    return;
  }
  toggle(tools.hidden);
  if (!tools.hidden) say("你好呀！今天想怎么吃？");
});
body.addEventListener("keydown", (e) => {
  const deltas = {
    ArrowLeft: [-15, 0],
    ArrowRight: [15, 0],
    ArrowUp: [0, -15],
    ArrowDown: [0, 15],
  };
  if (deltas[e.key]) {
    e.preventDefault();
    state.x += deltas[e.key][0];
    state.y += deltas[e.key][1];
    position();
    store("pet", state);
  }
  if (e.key === "Escape") toggle(false);
});
pet.addEventListener("click", (e) => {
  const action = e.target.closest("[data-pet]")?.dataset.pet;
  if (!action) return;
  if (action === "close") toggle(false);
  if (action === "pat") say("收到你的鼓励，能量满满！", "wave");
  if (action === "feed") say("开饭啦！也记得照顾好自己。", "success");
  if (action === "look") {
    state.look = state.look === "avatar" ? "sprite" : "avatar";
    store("pet", state);
    look();
    say("换个形象，继续陪你。");
  }
  if (action === "chat") {
    toggle(false);
    if (location.pathname.startsWith("/canteen")) {
      if (typeof window.openAgent === "function") window.openAgent();
      else if (typeof window.toggleAI === "function") window.toggleAI();
      setTimeout(() => document.getElementById("ai-input")?.focus(), 100);
    } else adminChat();
  }
});
function adminChat() {
  const dialog = modal(
      "小智 · 校园餐饮助手",
      `<div class="pet-chat-log" aria-live="polite"><div class="pet-chat-greeting"><img src="${avatar}" alt="小智"><p>你好！可以问我菜单、食堂排队、订单与校园活动。</p></div></div><form class="pet-chat-form"><input name="message" maxlength="2000" aria-label="向小智提问" placeholder="输入你想了解的校园餐饮信息" required><button class="btn">发送</button></form>`,
    ),
    log = dialog.querySelector(".pet-chat-log"),
    form = dialog.querySelector("form"),
    history = [];
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = form.elements.message,
      message = input.value.trim();
    if (!message) return;
    const user = document.createElement("p");
    user.className = "pet-message user";
    user.textContent = message;
    log.append(user);
    input.value = "";
    form.querySelector("button").disabled = true;
    const reply = document.createElement("p");
    reply.className = "pet-message";
    reply.textContent = "正在查询校园信息…";
    log.append(reply);
    try {
      const r = await api("/ai/chat", {
        method: "POST",
        body: {
          message,
          history: history.slice(-8),
          schoolId: session()?.user.school_id,
        },
      });
      reply.textContent = r.reply;
      history.push(
        { role: "user", content: message },
        { role: "assistant", content: r.reply },
      );
    } catch (error) {
      reply.textContent = error.message;
    } finally {
      form.querySelector("button").disabled = false;
      log.scrollTop = log.scrollHeight;
      input.focus();
    }
  });
}
