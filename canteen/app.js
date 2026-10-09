// 页面数据缓存
const DB = {
  restaurants: [],
  menu: [],
  social: [],
  culture: [],
  leaderboards: { top: [], cheap: [], avoid: [] },
};

let state = { cart: [], dining: null, currentView: "order" };

const appRoot = document.getElementById("app-root");
const modalRoot = document.getElementById("modal-container");

// --- 路由系统 ---
function navigate(view) {
  state.currentView = view;
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.style.color = link.dataset.target === view ? "#0071E3" : "#424245";
    if (link.dataset.target === view) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (view === "orders") startOrderPolling();
  else stopOrderPolling();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    navigate(e.currentTarget.dataset.target);
  });
});

function render() {
  appRoot.className =
    "pt-24 pb-20 min-h-screen max-w-[1200px] mx-auto px-4 sm:px-6 fade-in";
  if (state.currentView === "order") renderOrderView();
  else if (state.currentView === "nutrition") renderNutritionView();
  else if (state.currentView === "social") renderSocialView();
  else if (state.currentView === "culture") renderCultureView();
  else if (state.currentView === "orders") renderOrdersView();
}

// ================= 风格宇宙：主题选择器 =================
function renderThemeUniverse() {
  if (["cufe", "bjfu"].includes(document.documentElement.dataset.campusSkin)) return "";
  const cur = currentTheme();
  return `
                <div class="mb-10 fade-in">
                    <div class="mb-4">
                        <h2 class="text-2xl font-bold">🌌 风格宇宙</h2>
                        <p class="text-appleLightGray text-sm mt-1">选择你的热爱，全站即刻为你换肤</p>
                    </div>
                    <div class="flex space-x-4 overflow-x-auto no-scrollbar pb-2">
                        ${THEMES.map(
                          (t) => `
                            <div onclick="selectTheme('${t.id}')"
                                 class="shrink-0 w-44 rounded-[20px] p-4 cursor-pointer hover:-translate-y-1 transition-transform glass-btn-active ${cur === t.id ? "ring-2 ring-appleBlue ring-offset-2" : ""}"
                                 style="background:${t.cardBg};">
                                <div class="text-3xl mb-2">${t.emoji}</div>
                                <div class="font-bold text-sm" style="color:${t.cardText};">${t.name}</div>
                                <div class="text-xs mt-1 leading-snug" style="color:${t.cardText};opacity:.75;">${t.tagline}</div>
                                ${cur === t.id ? `<div class="text-xs font-bold mt-2" style="color:${t.cardText};">✓ 使用中</div>` : ""}
                            </div>
                        `,
                        ).join("")}
                    </div>
                </div>`;
}

function closeModal() {
  if (checkoutSubmitting) return;
  modalRoot.innerHTML = "";
}

// ================= 购物车与AI管家系统 =================
// --- 购物车：localStorage 持久化 + 同款合并 ---
function cartKey() { return "zx_cart_" + currentUser()?.school_id + "_" + currentUser()?.id; }
function loadCart() {
  try {
    state.cart =
      JSON.parse(
        localStorage.getItem(
          "zx_cart_" + currentUser()?.school_id + "_" + currentUser()?.id,
        ),
      ) || [];
    state.dining = JSON.parse(localStorage.getItem(cartKey() + "_dining") || "null");
  } catch {
    state.cart = [];
    state.dining = null;
  }
}

function saveCart() {
  localStorage.setItem(cartKey() + "_dining", JSON.stringify(state.dining));
  localStorage.setItem(
    "zx_cart_" + currentUser()?.school_id + "_" + currentUser()?.id,
    JSON.stringify(state.cart),
  );
}

function addToCart(id) {
  const dish = DB.menu.find((m) => m.id === id);
  if (!dish) return;
  if (window.canDirectOrderDish && !window.canDirectOrderDish(dish)) {
    return toast('非当前用餐时段菜品无法购买，可通过小智提前预约', 'warning');
  }
  if (dish.stock !== undefined && dish.stock <= 0) {
    return toast(`「${dish.name}」今日已售罄`, "warning");
  }
  const existing = state.cart.find((i) => i.id === id && !i.agentTaskId);
  if (existing) existing.qty += 1;
  else
    state.cart.push({
      id: dish.id,
      name: dish.name,
      price: dish.price,
      img: dish.img,
      qty: 1,
    });
  saveCart();
  updateCartUI();
  toast(`${dish.name} 已加入餐盘`, "success");
}

function removeFromCart(id, agentTaskId = null) {
  state.cart = state.cart.filter((i) => !(i.id === id && (i.agentTaskId || null) === agentTaskId));
  if (state.dining?.taskId && !state.cart.some(i=>i.agentTaskId === state.dining.taskId)) state.dining.taskId = null;
  saveCart();
  updateCartUI();
}

function cartDishPhoto(item, size) {
  const image = DB.menu.find(d=>d.id===item.id)?.image || item.img;
  return image && !image.includes('placeholder') ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(item.name)}" style="width:${size}px;height:${size}px;border-radius:10px;object-fit:cover" onerror="this.style.visibility='hidden'">` : `<span style="width:${size}px;height:${size}px;border-radius:10px;background:var(--zx-soft,#f5f5f7);display:block"></span>`;
}
function updateCartUI() {
  const drawer = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  const badge = document.getElementById("cart-badge");

  let total = 0,
    qtyTotal = 0;
  drawer.innerHTML = "";

  if (state.cart.length === 0) {
    drawer.innerHTML =
      '<div class="text-center text-gray-400 mt-10"><i class="fa-solid fa-basket-shopping text-4xl mb-4"></i><p>餐盘空空如也~</p></div>';
  } else {
    state.cart.forEach((item) => {
      total += item.price * item.qty;
      qtyTotal += item.qty;
      drawer.innerHTML += `
                        <div class="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                            <div class="flex items-center space-x-3">
                                ${cartDishPhoto(item,48)}
                                <div>
                                    <p class="font-semibold text-sm">${escapeHtml(item.name)}</p>
                                    <p class="text-appleBlue text-sm font-bold">¥${item.price.toFixed(1)}</p>
                                </div>
                            </div>
                            <div class="flex items-center space-x-3">
                                <span class="text-sm font-medium">x${item.qty}</span>
                                <button onclick="removeFromCart(${item.id}, ${escapeHtml(JSON.stringify(item.agentTaskId || null))})" class="text-red-400 hover:text-red-600 glass-btn-active"><i class="fa-regular fa-trash-can"></i></button>
                            </div>
                        </div>
                    `;
    });
  }
  if(state.dining) drawer.innerHTML += `<div class="text-sm p-3 rounded-xl bg-appleGray"><b>用餐安排</b><p>${escapeHtml(DB.restaurants.find(r=>r.id===state.dining.restaurantId)?.name || "")} · ${escapeHtml(new Date(state.dining.startsAt).toLocaleString('zh-CN'))}</p><p>座位：${escapeHtml((state.dining.seats || []).map(s=>[s.floor,s.label].filter(Boolean).join(" ")).join('、') || (state.dining.seatIds?.length ? '已选择' : '未选座'))}</p><button onclick="openSeatPicker()" class="text-appleBlue mt-2">选择食堂与座位</button></div>`;
  totalEl.innerText = `¥${total.toFixed(2)}`;
  qtyTotal > 0
    ? ((badge.innerText = qtyTotal), badge.classList.remove("hidden"))
    : badge.classList.add("hidden");
}

function showCart() {
  updateCartUI();
  document.getElementById("cart-drawer").classList.remove("translate-x-full");
}
function hideCart() { document.getElementById("cart-drawer").classList.add("translate-x-full"); }
function toggleCart() {
  const drawer = document.getElementById("cart-drawer");
  drawer.classList.contains("translate-x-full") ? showCart() : hideCart();
}
function removeAgentCart(taskId) {
  state.cart = state.cart.filter(i => i.agentTaskId !== taskId);
  if (state.dining?.taskId === taskId) state.dining = null;
  saveCart(); updateCartUI();
}
function addPlanToCart(plan) {
  state.cart = state.cart.filter(i => !i.agentTaskId);
  state.cart.push(...plan.items.map(d => ({id:d.id,name:d.name,price:d.price,img:d.image || '/canteen/dish-placeholder.svg',qty:d.quantity,agentTaskId:plan.id})));
  state.dining = {taskId:plan.id,people:plan.constraints.people,remark:(plan.constraints.exclusions || []).length ? "忌口：" + plan.constraints.exclusions.join("、") : "",restaurantId:plan.restaurant.id,startsAt:plan.startsAt,seatIds:plan.seats.map(s=>s.id),seats:plan.seats};
  saveCart(); updateCartUI();
}

// ================= 结算链路：确认 → 收银台 → 支付 → 取餐码 =================
function cartTotal() {
  return state.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

let checkoutSubmitting = false,
  seatLoad = 0;
function openCheckout() {
  checkoutSubmitting = false;
  if (!state.cart.length) return toast("请先添加菜品！", "warning");
  if (!requireLogin()) return;
  hideCart();
  const checkoutItems = state.cart;
  const chosenRestaurantId = state.dining?.restaurantId || DB.menu.find(d=>d.id===checkoutItems[0]?.id)?.restaurantId;
  const user = currentUser();
  const total = cartTotal();
  modalRoot.innerHTML = `
                <div class="fixed inset-0 z-[100] flex items-center justify-center glass-modal" onclick="if(event.target===this)closeModal()">
                    <div class="bg-white rounded-[28px] p-8 w-[92%] max-w-[480px] shadow-appleHover slide-up max-h-[85vh] overflow-y-auto">
                        <h2 class="text-2xl font-bold mb-1">确认订单</h2>
                        <p class="text-appleLightGray text-sm mb-6">核对菜品与取餐信息</p>
                        <div class="space-y-3 mb-5">
                            ${checkoutItems
                              .map(
                                (i) => `
                                <div class="flex justify-between items-center bg-appleGray rounded-xl p-3">
                                    <div class="flex items-center space-x-3">
                                        ${cartDishPhoto(i,40)}
                                        <span class="font-medium text-sm">${escapeHtml(i.name)} <span class="text-appleLightGray">x${i.qty}</span></span>
                                    </div>
                                    <span class="font-bold text-sm">¥${(i.price * i.qty).toFixed(2)}</span>
                                </div>`,
                              )
                              .join("")}
                        </div>
                        <div class="mb-4">
                            <label class="text-sm text-appleLightGray block mb-2">取餐食堂</label>
                            <select id="checkout-address" class="w-full bg-appleGray rounded-xl px-4 py-3 outline-none text-sm">
                                ${DB.restaurants
                                  .map(
                                    (r) =>
                                      `<option value="${r.id}" ${r.id === chosenRestaurantId ? "selected" : ""}>${escapeHtml(r.name)}</option>`,
                                  )
                                  .join("")}
                            </select>
                        </div>
                        <div class="mb-4"><label class="text-sm text-appleLightGray block mb-2">就餐时间</label><input id="checkout-time" aria-label="就餐时间" type="datetime-local" class="w-full bg-appleGray rounded-xl px-4 py-3" value="${new Date(new Date(state.dining?.startsAt || Date.now() + 30 * 60000).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}"></div>
                        <div class="mb-4"><label class="text-sm text-appleLightGray block mb-2">预约座位（可不选）</label><button type="button" onclick="openSeatPicker()" class="text-appleBlue text-sm mb-3">查看食堂座位图 / 选择座位</button><div id="checkout-seats" class="flex flex-wrap gap-3"></div></div>
                        <div class="mb-6">
                            <label class="text-sm text-appleLightGray block mb-2">备注（口味偏好等）</label>
                            <input id="checkout-remark" value="${escapeHtml(state.dining?.remark || '')}" placeholder="少辣 / 不要香菜…" class="w-full bg-appleGray rounded-xl px-4 py-3 outline-none text-sm">
                        </div>
                        <div class="flex justify-between items-center mb-6">
                            <span class="text-appleLightGray text-sm">账户余额 <b class="text-appleDark">¥${Number(user.jine).toFixed(2)}</b></span>
                            <span class="text-xl font-bold">合计 <span class="text-appleBlue">¥${total.toFixed(2)}</span></span>
                        </div>
                        <button id="checkout-submit" onclick="confirmOrder()" class="w-full bg-appleBlue text-white py-3.5 rounded-full font-bold hover:opacity-90 transition glass-btn-active">去支付</button>
                        <button onclick="closeModal()" class="w-full text-appleLightGray text-sm mt-4">返回修改</button>
                    </div>
                </div>`;
  document.getElementById("checkout-address").onchange = () => { state.dining = {...state.dining, seatIds:[]}; saveCart(); loadCheckoutSeats(); };
  document.getElementById("checkout-time").onchange = loadCheckoutSeats;
  loadCheckoutSeats();
}
async function loadCheckoutSeats() {
  const request = ++seatLoad;
  const submit = document.getElementById("checkout-submit");
  if (submit) submit.disabled = true;
  const alreadyLoaded =
    document.getElementById("checkout-seats")?.dataset.loaded === "true";
  const previous = [
    ...document.querySelectorAll('input[name="checkout-seat"]:checked'),
  ].map((x) => Number(x.value));
  const target = document.getElementById("checkout-seats"),
    restaurantId = document.getElementById("checkout-address").value,
    time = document.getElementById("checkout-time").value;
  if (!time) return;
  const { status, json } = await api(
    "GET",
    `/restaurants/${restaurantId}/seats?startsAt=${encodeURIComponent(new Date(time).toISOString())}`,
  );
  if (
    request !== seatLoad ||
    !target.isConnected ||
    document.getElementById("checkout-address").value !== restaurantId ||
    document.getElementById("checkout-time").value !== time
  )
    return;
  if (submit?.isConnected) submit.disabled = status !== 200;
  if (status === 200) target.dataset.loaded = "true";
  target.innerHTML =
    status === 200
      ? json.data.seats
          .map(
            (s) =>
              `<label><input type="checkbox" name="checkout-seat" value="${s.id}" ${s.available ? "" : "disabled"} ${(alreadyLoaded ? previous.includes(s.id) : state.dining?.seatIds?.includes(s.id)) && s.available ? "checked" : ""}> ${escapeHtml(s.label)}${s.available ? "" : " · 已占用"}</label>`,
          )
          .join("")
      : escapeHtml(json.message) +
        '<button type="button" onclick="loadCheckoutSeats()" class="text-appleBlue">重新加载座位</button>';
}

async function confirmOrder() {
  if (
    checkoutSubmitting ||
    document.getElementById("checkout-submit")?.disabled
  )
    return;
  const unavailable = state.cart.find(i => !i.agentTaskId && window.canDirectOrderDish && !window.canDirectOrderDish(DB.menu.find(d => d.id === i.id) || {}));
  if (unavailable) return toast(`「${unavailable.name}」当前不在供餐时段，请移出餐盘或通过小智预约`, 'warning');
  const items = state.cart.map((i) => ({ dishId: i.id, quantity: i.qty }));
  const restaurantId = Number(
    document.getElementById("checkout-address").value,
  );
  const address = DB.restaurants.find((r) => r.id === restaurantId)?.name || "";
  const time = document.getElementById("checkout-time").value;
  if (!time) return toast("请选择就餐时间", "warning");
  const startsAt = new Date(time).toISOString();
  const seatIds = [
    ...document.querySelectorAll('input[name="checkout-seat"]:checked'),
  ].map((x) => Number(x.value));
  const remark = document.getElementById("checkout-remark").value.trim();
  const user = currentUser();
  const btn = document.querySelector(
    '#modal-container button[onclick="confirmOrder()"]',
  );
  if (btn) {
    btn.disabled = true;
    btn.innerText = "下单中…";
  }

  checkoutSubmitting = true;
  let result;
  result = await api("POST", "/orders", {
    items, expectedTotal: cartTotal(), address, remark,
    phone: user.lianxifangshi || "",
    dining: { restaurantId, startsAt, seatIds, people:state.dining?.people || 1 },
    agentTaskId: state.dining?.taskId || undefined,
  });
  const { status, json } = result;
  if (status < 200 || status >= 300) {
    if (btn) {
      btn.disabled = false;
      btn.innerText = "去支付";
    }
    checkoutSubmitting = false;
    return toast(json.message || "下单失败", "error");
  }
  checkoutSubmitting = false;
  const taskId = state.dining?.taskId;
  state.cart = []; state.dining = null; saveCart(); updateCartUI();
  window.dispatchEvent(new CustomEvent("cart-order-created", {detail:{taskId,...json.data}}));
  openCashier(json.data.orderid, json.data.totalPrice, false);
}

let cashierClearsCart = false;
function openCashier(orderid, totalPrice, clearsCart = false) {
  cashierClearsCart = clearsCart;
  const user = currentUser();
  const enough = Number(user.jine) >= totalPrice;
  modalRoot.innerHTML = `
                <div class="fixed inset-0 z-[100] flex items-center justify-center glass-modal">
                    <div class="bg-white rounded-[28px] p-8 w-[92%] max-w-[400px] shadow-appleHover slide-up text-center">
                        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-appleGray flex items-center justify-center text-3xl">🍚</div>
                        <p class="text-appleLightGray text-sm mb-1">校园卡余额支付</p>
                        <p class="text-4xl font-bold mb-1">¥${totalPrice.toFixed(2)}</p>
                        <p class="text-sm mb-6 ${enough ? "text-appleLightGray" : "text-red-500 font-medium"}">
                            当前余额 ¥${Number(user.jine).toFixed(2)}${enough ? "" : "（余额不足）"}
                        </p>
                        <button id="pay-btn" onclick="payOrder('${orderid}')" ${enough ? "" : "disabled"}
                            class="w-full ${enough ? "bg-appleBlue" : "bg-gray-300 cursor-not-allowed"} text-white py-3.5 rounded-full font-bold transition glass-btn-active">
                            确认支付
                        </button>
                        <button onclick="closeModal()" class="w-full text-appleLightGray text-sm mt-4 hover:text-appleDark transition">暂不支付（订单保留为未支付）</button>
                    </div>
                </div>`;
}

async function payOrder(orderid) {
  const btn = document.getElementById("pay-btn");
  if (btn) {
    btn.disabled = true;
    btn.innerText = "支付中…";
  }
  const { status, json } = await api("POST", `/orders/${orderid}/pay`);
  if (status !== 200) {
    if (btn) {
      btn.disabled = false;
      btn.innerText = "确认支付";
    }
    return toast(json.message || "支付失败", "error");
  }
  // 更新本地余额
  const user = currentUser();
  user.jine = json.data.balance;
  setSession(getToken(), user);
  // 清空购物车
  if (cashierClearsCart) {
    state.cart = [];
    saveCart();
    updateCartUI();
  }
  renderUserEntry();
  showPickupCode(json.data.pickupCode);
}

function showPickupCode(pickupCode) {
  modalRoot.innerHTML = `
                <div class="fixed inset-0 z-[100] flex items-center justify-center glass-modal">
                    <div class="bg-white rounded-[28px] p-10 w-[92%] max-w-[400px] shadow-appleHover slide-up text-center">
                        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
                            <i class="fa-solid fa-check text-3xl text-green-500"></i>
                        </div>
                        <h2 class="text-2xl font-bold mb-1">支付成功</h2>
                        <p class="text-appleLightGray text-sm mb-6">取餐时请向档口出示取餐码</p>
                        <div class="bg-appleGray rounded-2xl py-6 mb-6">
                            <span class="text-6xl font-black tracking-[0.2em] text-appleDark">${pickupCode}</span>
                        </div>
                        <button onclick="closeModal(); navigate('orders')" class="w-full bg-appleBlue text-white py-3.5 rounded-full font-bold hover:opacity-90 transition glass-btn-active">查看订单进度</button>
                    </div>
                </div>`;
}

// ================= 我的订单：状态时间线 + 3 秒轮询 =================
let orderPollTimer = null;

function startOrderPolling() {
  stopOrderPolling();
  orderPollTimer = setInterval(() => {
    if (state.currentView === "orders") renderOrdersView();
    else stopOrderPolling();
  }, 3000);
}

function stopOrderPolling() {
  if (orderPollTimer) {
    clearInterval(orderPollTimer);
    orderPollTimer = null;
  }
}

// --- 启动引导 ---
hideCart();
window.addEventListener("pageshow", () => hideCart());
loadCart();
applyTheme(currentTheme());
renderUserEntry();
updateCartUI();

// ================= 个人中心：资料编辑 =================
function openProfileModal() {
  const user = currentUser();
  if (!user) return openLoginModal();
  modalRoot.innerHTML = `
                <div class="fixed inset-0 z-[100] flex items-center justify-center glass-modal" onclick="if(event.target===this)closeModal()">
                    <div class="bg-white rounded-[28px] p-8 w-[92%] max-w-[400px] shadow-appleHover slide-up">
                        <h2 class="text-2xl font-bold mb-1">个人资料</h2>
                        <p class="text-appleLightGray text-sm mb-6">账号 ${escapeHtml(user.zhanghao)} · 余额 ¥${Number(user.jine).toFixed(2)}</p>
                        <label class="text-sm text-appleLightGray block mb-2">姓名</label>
                        <input id="profile-name" value="${escapeHtml(user.xingming || "")}" class="w-full bg-appleGray rounded-xl px-4 py-3 mb-4 outline-none focus:ring-2 ring-appleBlue/50 text-sm">
                        <label class="text-sm text-appleLightGray block mb-2">性别</label>
                        <select id="profile-gender" class="w-full bg-appleGray rounded-xl px-4 py-3 mb-4 outline-none text-sm">
                            <option value="男" ${user.xingbie === "男" ? "selected" : ""}>男</option>
                            <option value="女" ${user.xingbie === "女" ? "selected" : ""}>女</option>
                        </select>
                        <label class="text-sm text-appleLightGray block mb-2">联系方式</label>
                        <input id="profile-phone" value="${escapeHtml(user.lianxifangshi || "")}" class="w-full bg-appleGray rounded-xl px-4 py-3 mb-6 outline-none focus:ring-2 ring-appleBlue/50 text-sm">
                        <button onclick="saveProfile()" class="w-full bg-appleBlue text-white py-3 rounded-full font-bold hover:opacity-90 transition glass-btn-active">保存</button>
                    </div>
                </div>`;
}

async function saveProfile() {
  const user = currentUser();
  const payload = {
    xingming: document.getElementById("profile-name").value.trim(),
    xingbie: document.getElementById("profile-gender").value,
    lianxifangshi: document.getElementById("profile-phone").value.trim(),
  };
  if (!payload.xingming) return toast("姓名不能为空", "warning");
  const { status, json } = await api("PUT", `/users/${user.id}`, payload);
  if (status !== 200) return toast(json.message || "保存失败", "error");
  setSession(getToken(), { ...user, ...payload });
  closeModal();
  renderUserEntry();
  toast("资料已保存", "success");
}

function syncLiveCatalog(catalog) {
  DB.menu = catalog.dishes.map((d) => ({
    ...d,
    img: d.image || "/canteen/dish-placeholder.svg",
  }));
  DB.restaurants = catalog.restaurants;
  state.cart = state.cart
    .filter((i) => DB.menu.some((d) => d.id === i.id))
    .map((i) => {
      const d = DB.menu.find((d) => d.id === i.id);
      return { ...i, name: d.name, price: d.price, img: d.img };
    });
  saveCart();
  updateCartUI();
}

let seatPickerRevision = 0;
async function openSeatPicker(initialRestaurantId = null) {
  if (checkoutSubmitting) return;
  if(DB.restaurants.find(r=>r.id===Number(initialRestaurantId))?.hasSeating===false)return toast("该餐厅不提供座位预约","warning");
  const fromCheckout = Boolean(document.getElementById('checkout-time'));
  if (fromCheckout) state.dining = {...state.dining,
    restaurantId:Number(document.getElementById('checkout-address').value),
    startsAt:new Date(document.getElementById('checkout-time').value).toISOString(),
    seatIds:[...document.querySelectorAll('input[name="checkout-seat"]:checked')].map(x=>Number(x.value))};
  const dining = {...(state.dining || {restaurantId:DB.restaurants[0]?.id,startsAt:new Date(Date.now()+1800000).toISOString(),seatIds:[]})};
  if(initialRestaurantId && Number(initialRestaurantId)!==dining.restaurantId) {dining.restaurantId=Number(initialRestaurantId);dining.seatIds=[];}
  const loginCampus = (()=>{try{return JSON.parse(localStorage.getItem('zx_session'))?.campus||'';}catch{return '';}})();
  const scopeCampus = window.currentDiningCampus !== undefined ? window.currentDiningCampus : loginCampus;
  const seatPlaces = DB.restaurants.filter(r=>r.hasSeating!==false&&(!scopeCampus||r.campus===scopeCampus));
  if(!seatPlaces.length)return toast('当前校区暂无可预约座位','warning');
  if(!seatPlaces.some(r=>r.id===dining.restaurantId)){dining.restaurantId=seatPlaces[0].id;dining.seatIds=[];}
  let selected = new Set(dining.seatIds || []), seatRows = [], layouts = [], zoomed = false;
  hideCart();
  modalRoot.innerHTML = `<div class="fixed inset-0 z-[100] flex items-center justify-center glass-modal"><section class="zx-seat-page bg-white rounded-[28px] p-6 w-[94%] max-w-[760px] max-h-[90vh] overflow-y-auto"><h2 id="seat-title" class="text-2xl font-bold mb-5">食堂座位</h2><div class="zx-grid"><label>就餐食堂<select id="seat-place" class="w-full bg-appleGray rounded-xl p-3">${seatPlaces.map(r=>`<option value="${r.id}" ${r.id===dining.restaurantId?'selected':''}>${escapeHtml(r.campus)} · ${escapeHtml(r.name)}</option>`).join('')}</select></label><label>就餐时间<input id="seat-time" type="datetime-local" class="w-full bg-appleGray rounded-xl p-3" value="${new Date(new Date(dining.startsAt).getTime()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)}"></label></div><p class="text-sm my-4">点击座位选择或取消选择</p><div class="zx-seat-legend"><span class="available">可选</span><span class="selected">已选</span><span class="occupied">已占用</span></div><div class="zx-row my-4"><label>楼层<select id="seat-floor" class="zx-button"></select></label><label>区域<select id="seat-zone" class="zx-button"><option value="">全部区域</option>${["A","B","C","D"].map(z=>`<option value="${z}">${z} 区</option>`).join('')}</select></label></div><div id="seat-map" class="zx-seat-map" aria-label="食堂座位图"></div><p id="seat-feedback" role="status" class="my-4"></p><div class="zx-row"><button id="seat-apply" class="zx-button zx-primary">保存座位</button><button id="seat-back" class="zx-button">返回</button></div></section></div>`;
  const place=document.getElementById('seat-place'), time=document.getElementById('seat-time');
  const apply=document.getElementById('seat-apply'), map=document.getElementById('seat-map');
  const floor=document.getElementById('seat-floor'),zone=document.getElementById('seat-zone');
  function renderSeats() {
    document.getElementById("seat-title").textContent=`${DB.restaurants.find(r=>r.id===Number(place.value))?.name || "食堂"} · ${floor.value} · ${zone.value?zone.value+"区":"全部区域"}`;
    const rows=seatRows.filter(s=>(!floor.value||s.floor===floor.value)&&(!zone.value||s.zone===zone.value));
    map.classList.toggle('zx-floor-overview',!zone.value);
    if(!zone.value) {
      const layout=layouts.find(l=>l.floor===floor.value);
      map.innerHTML=`<div class="zx-floor-landmark zx-floor-entrance"><i class="fa-solid fa-door-open"></i> 入口</div><div class="zx-floor-landmark zx-floor-stairs"><i class="fa-solid fa-stairs"></i> 楼梯</div>${['A','B','C','D'].map(z=>{const seats=rows.filter(s=>s.zone===z);return `<button type="button" class="zx-floor-zone zone-${z}" data-zone="${z}"><b>${z} 区</b><span>${seats.filter(s=>s.available).length} / ${seats.length} 可选</span><div class="zx-mini-seats">${seats.map(s=>`<i class="fa-solid fa-chair ${selected.has(s.id)?'selected':s.available?'available':'occupied'}"></i>`).join('')}</div></button>`;}).join('')}<button type="button" id="stall-zoom" class="zx-floor-stalls ${zoomed?'expanded':''}" aria-label="放大查看档口"><b>档口分布 <i class="fa-solid fa-magnifying-glass-plus"></i></b><div>${(layout?.stalls||[]).map((s,i)=>`<span>${escapeHtml(s.name)}</span>`).join('')||'<span>取餐窗口</span>'}</div></button>`;
      map.querySelectorAll('[data-zone]').forEach(b=>b.onclick=()=>{zone.value=b.dataset.zone;zoomed=false;renderSeats();});
      document.getElementById('stall-zoom').onclick=()=>{zoomed=!zoomed;renderSeats();};
      document.getElementById('seat-feedback').textContent=`已选择 ${selected.size} 个座位`;
      return;
    }
    map.innerHTML=rows.map(s=>`<button type="button" class="zx-seat ${selected.has(s.id)?'selected':''}" data-seat="${s.id}" aria-label="座位 ${escapeHtml(s.label)}" aria-pressed="${selected.has(s.id)}" ${s.available?'':'disabled'}><i class="fa-solid fa-chair" aria-hidden="true"></i><b>${escapeHtml(s.label)}</b><small>${selected.has(s.id)?'已选':s.available?'可选':'已占用'}</small></button>`).join('');
    map.querySelectorAll('[data-seat]').forEach(button=>button.onclick=()=>{
      const id=Number(button.dataset.seat);
      if(selected.has(id))selected.delete(id);else if(selected.size<6)selected.add(id);else return toast('最多选择6个座位','warning');
      renderSeats();
    });
    document.getElementById('seat-feedback').textContent=`已选择 ${selected.size} 个座位`;
  }
  floor.onchange=()=>{zone.value="";zoomed=false;renderSeats();};zone.onchange=renderSeats;
  async function load(reset=false) {
    if(reset)selected.clear();
    const run=++seatPickerRevision;
    apply.disabled=true; map.innerHTML='正在加载座位…';
    if(!time.value) return;
    const r=await api('GET',`/restaurants/${place.value}/seats?startsAt=${encodeURIComponent(new Date(time.value).toISOString())}`);
    if(run!==seatPickerRevision || !map.isConnected)return;
    if(r.status!==200){map.innerHTML=escapeHtml(r.json.message || '座位加载失败');return;}
    seatRows=r.json.data.seats;
    layouts=r.json.data.layouts || [];
    zone.value="";zoomed=false;
    selected=new Set([...selected].filter(id=>r.json.data.seats.some(s=>s.id===id&&s.available)));
    apply.disabled=false;
    const oldFloor=floor.value;
    const floors=[...new Set(seatRows.map(s=>s.floor))];
    floor.innerHTML=floors.map(f=>`<option>${escapeHtml(f)}</option>`).join('');
    const chosen=seatRows.find(s=>selected.has(s.id));
    floor.value=reset?floors[0]:(chosen?.floor || (floors.includes(oldFloor)?oldFloor:floors[0]));
    renderSeats();
  }
  place.onchange=()=>load(true);time.onchange=()=>load(true);
  document.getElementById('seat-back').onclick=()=>{seatPickerRevision++;fromCheckout?openCheckout():closeModal();};
  apply.onclick=()=>{
    state.dining={...dining,restaurantId:Number(place.value),startsAt:new Date(time.value).toISOString(),seatIds:[...selected],seats:seatRows.filter(s=>selected.has(s.id))};
    saveCart();updateCartUI();seatPickerRevision++;
    window.dispatchEvent(new CustomEvent('cart-dining-updated',{detail:state.dining}));
    fromCheckout?openCheckout():(closeModal(),showCart());
  };
  await load();
}
