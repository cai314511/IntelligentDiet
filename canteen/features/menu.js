import {dishPhoto} from '../../shared/dish-photo.js';
import {currentMeal,availableForDirectOrder} from '../../shared/meal-service.mjs';
import {scopedMenu,hasReferencePhoto} from './menu-scope.mjs';
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
  source,
  notice,
  bind,
  dialog,
} from "../../shared/feature-ui.js";
import { openAgent } from "./agent.js";
import { recommendationBanner, mountRecommendationBanner } from "./recommendation-banner.js";
let catalog,
  root,
  filters = read("menu-filters", { dishes: {}, restaurants: {} });
let mealTimer, shownMeal;
window.canDirectOrderDish = availableForDirectOrder;
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && root?.dataset.view === 'order' && catalog && (currentMeal()?.meal || '') !== shownMeal) draw();
});
let currentFilters = filters.dishes || filters.restaurants || {};
delete currentFilters.query;
if (session()?.campus) currentFilters = { ...currentFilters, campus: session().campus, restaurantId: "", floor: "", dishName: "" };
export async function renderMenu() {
  root = document.getElementById("app-root");
  root.dataset.view = "order";
  root.innerHTML = notice("正在读取本校菜单…");
  try {
    catalog = (await api("/workspace/catalog")).data;
    window.syncLiveCatalog(catalog);
    if (!["#order", "#agent"].includes(location.hash)) return;
    draw();
    clearInterval(mealTimer);
    mealTimer = setInterval(() => {
      if (root.dataset.view !== 'order') { clearInterval(mealTimer); return; }
      if ((currentMeal()?.meal || '') !== shownMeal) draw();
    }, 1000);
  } catch (e) {
    root.innerHTML = notice(e.message, "error") + button("重新加载", "retry");
    bind(root, {
    seats: (b) => window.openSeatPicker(Number(b.dataset.id)), retry: renderMenu });
  }
}
function draw() {
  const f = currentFilters;
  window.currentDiningCampus = f.campus || "";
  const meal = currentMeal();
  shownMeal = meal?.meal || '';
  const visibleCatalog = {...catalog, dishes:catalog.dishes.filter(d => d.forSale && availableForDirectOrder(d))};
  const {restaurants:places,dishes:choices}=scopedMenu(visibleCatalog,f);
  if (f.category && !choices.some(d => d.category === f.category)) f.category = '';
  const mealNotice = meal ? `当前供应${meal.meal}（${meal.label}，北京时间）。其他餐次可通过小智提前预约。` : '当前不在供餐时段。早餐 06:30–08:30、午餐 10:30–13:00、晚餐 17:00–19:00（北京时间）；可通过小智提前预约。';
  root.innerHTML = `${recommendationBanner()}<h1 class="text-4xl font-bold mb-2 tracking-tight">智能点餐</h1><div class="zx-grid" style="margin:24px 0">${restaurantCards(f)}</div>${notice(mealNotice)}${card(
    "查找本校菜品",
    `<form id="menu-filter"><div class="zx-menu-location">${field("campus", "校区", `<select>${options([["", "全部校区"], ...[...new Set(catalog.restaurants.map((r) => r.campus))].map((v) => [v, v])], f.campus)}</select>`)}${field("restaurantId", "食堂", `<select>${options([["", "全部食堂"], ...places.map((r) => [r.id, r.name])], f.restaurantId)}</select>`)}${field("floor", "楼层", `<select>${options([["", "全部楼层"], ...[...new Set(visibleCatalog.dishes.filter(d => (!f.campus || d.campus === f.campus) && (!f.restaurantId || d.restaurantId === Number(f.restaurantId))).map(d => d.floor).filter(Boolean))].map((x) => [x, x])], f.floor)}</select>`)}</div><div class="zx-menu-dishes">${field("category", "品类", `<select>${options([["", "全部品类"], ...[...new Set(choices.map((d) => d.category))].map((v) => [v, v])], f.category)}</select>`)}${field("dishName", "菜名", `<select>${options([["", "全部菜品"], ...[...new Set(choices.map((d) => d.name))].map((x) => [x, x])], f.dishName)}</select>`)}<div class="zx-field"><span>价格区间</span><div class="zx-price-range"><input aria-label="最低价格" name="minPrice" type="number" min="0" step="0.1" placeholder="最低价" value="${esc(f.minPrice || "")}"><span>—</span><input aria-label="最高价格" name="maxPrice" type="number" min="0" step="0.1" placeholder="最高价" value="${esc(f.maxPrice || "")}"></div></div>${field("exclude", "忌口食材", `<input value="${esc(f.exclude || "")}" placeholder="例如：花生、香菜">`)}${field(
      "diet",
      "饮食选择",
      `<select>${options(
        [
          ["", "不限"],
          ["素食", "素食"],
          ["清真", "清真"],
        ],
        f.diet,
      )}</select>`,
    )}</div><div class="zx-row" style="margin-top:20px">${field(
      "sort",
      "优先选择",
      `<select>${options(
        [
          ["new", "近期上新"],
          ["distance", "距离最近"],
          ["price", "价格最低"],
          ["queue", "排队最短"],
          ["rating", "口碑评分"],
        ],
        f.sort || "new",
      )}</select>`,
    )}<button class="zx-button zx-primary">应用筛选</button></div></form>`,
  )}<section id="menu-results">${results(f)}</section>${source(catalog.sourceName, catalog.updatedAt)}`;
  mountRecommendationBanner(root);
  bind(root, {
    seats: (b) => window.openSeatPicker(Number(b.dataset.id)),
    cart: (b) => window.addToCart(Number(b.dataset.id)),
    agent: () => openAgent(),
    place: (b) => selectRestaurant(Number(b.dataset.id)),
    dish: (b) => details(Number(b.dataset.id)),
    plan: (b) =>
      openAgent(
        "我想吃" +
          catalog.dishes.find((d) => d.id === Number(b.dataset.id)).name,
        { dishId: Number(b.dataset.id) },
      ),
  });
  root.querySelectorAll('[name="minPrice"],[name="maxPrice"]').forEach(input => input.oninput = () => root.querySelector('[name="maxPrice"]').setCustomValidity(""));
  root.querySelectorAll('[name="campus"],[name="restaurantId"],[name="floor"]').forEach(input => input.onchange = () => {
    const next = Object.fromEntries(new FormData(root.querySelector("#menu-filter")));
    if (input.name === "campus") next.restaurantId = "";
    if (input.name !== "floor") next.floor = "";
    next.dishName = "";
    currentFilters = next; filters = { dishes: next }; store("menu-filters", filters); draw();
  });
  root.querySelector("form").onsubmit = (e) => {
    e.preventDefault();
    const next = Object.fromEntries(new FormData(e.target));
    const max = e.target.elements.maxPrice;
    max.setCustomValidity(next.minPrice && next.maxPrice && Number(next.minPrice) > Number(next.maxPrice) ? "最高价格不能低于最低价格" : "");
    if (!e.target.reportValidity()) return;
    currentFilters = next;
    filters = { dishes: currentFilters };
    store("menu-filters", filters);
    draw();
  };
}
function eligible(f) {
  const excludes = (f.exclude || "").split(/[、,，\s]+/).filter(Boolean);
  return catalog.dishes
    .filter(
      (d) =>
        d.forSale && availableForDirectOrder(d) &&
        (!f.dishName || d.name === f.dishName) &&
        (!f.restaurantId || d.restaurantId === Number(f.restaurantId)) &&
        (!f.floor || d.floor === f.floor) &&
        (!f.category || d.category === f.category) &&
        (!f.campus || d.campus === f.campus) &&
        (!f.minPrice || d.price >= Number(f.minPrice)) &&
        (!f.maxPrice || d.price <= Number(f.maxPrice)) &&
        (!f.diet || d.dietaryTags.includes(f.diet)) &&
        !excludes.some((x) =>
          [d.name, ...d.ingredients, ...d.allergens].join(" ").includes(x),
        ),
    )
    .sort((a, b) =>
      (f.sort || "new") === "new" && hasReferencePhoto(b) !== hasReferencePhoto(a)
        ? Number(hasReferencePhoto(b)) - Number(hasReferencePhoto(a))
        : f.sort === "price"
        ? a.price - b.price
        : f.sort === "queue"
          ? a.queueMinutes - b.queueMinutes
          : f.sort === "distance"
            ? a.distanceM - b.distanceM
            : f.sort === "rating"
              ? (b.reviewCount >= 2 ? b.rating : 0) -
                (a.reviewCount >= 2 ? a.rating : 0)
              : (b.createdAt || "").localeCompare(a.createdAt || "") ||
                b.id - a.id,
    );
}
function restaurantCards(f) {
  return catalog.restaurants
      .filter((r) => !f.campus || r.campus === f.campus)
      .map((r) => {
        const status =
            r.queueMinutes > 20
              ? "拥挤"
              : r.queueMinutes > 10
                ? "适中"
                : "空闲",
          color =
            status === "拥挤"
              ? "#ef4444"
              : status === "适中"
                ? "#f59e0b"
                : "#22c55e";
        return `<section class="zx-card bg-white rounded-[20px] shadow-apple border border-gray-100" style="border-right:8px solid ${color}"><h3>${esc(r.name)}</h3><p>${esc(r.campus)} · ${r.distanceM}米</p><div class="zx-restaurant-metrics"><p><span><i class="fa-solid fa-users" aria-hidden="true"></i> 排队人数</span><b>${r.queueCount} 人</b></p><p><span><i class="fa-regular fa-clock" aria-hidden="true"></i> 预计时长</span><b>${r.queueMinutes} 分钟</b></p><p><span>当前状态</span><b style="color:${color}">${status}</b></p></div>${r.hasSeating!==false?button("查看座位", "seats").replace('data-action="seats"', `data-action="seats" data-id="${r.id}"`):""}${button("筛选此食堂", "place").replace('data-action="place"', `data-action="place" data-id="${r.id}"`)}${source(r.sourceName, r.updatedAt)}</section>`;
      })
      .join("");
}
function results(f) {
  const dishes = eligible(f);
  const groups = Object.values(
    dishes.reduce((o, d) => {
      (o[d.name] ??= []).push(d);
      return o;
    }, {}),
  );
  return groups.length
    ? `<div class="zx-grid">${groups
        .map((group) =>
          card(
            group[0].name,
            `${dishPhoto(group.find(hasReferencePhoto)||group[0])}${group
              .map(
                (d) =>
                  `<div style="padding:10px 0;border-bottom:1px solid #eee"><b>${esc(d.restaurant)} ${esc(d.floor || "楼层待核实")}</b><p class="zx-source">${esc(d.window)} · ${d.distanceM}米 · 排队${d.queueMinutes}分钟 · 库存${d.stock}</p><div class="zx-row"><b>${money(d.price)}</b>${button("查看详情", "dish").replace('data-action="dish"', `data-action="dish" data-id="${d.id}"`)}${button("加入餐盘", "cart").replace('data-action="cart"', `data-action="cart" data-id="${d.id}"`)}${button("规划下单", "plan", true).replace('data-action="plan"', `data-action="plan" data-id="${d.id}"`)}</div></div>`,
              )
              .join("")}`,
          ),
        )
        .join("")}</div>`
    : notice(currentMeal() ? "当前餐次没有匹配菜品，请调整筛选或通过小智预约其他餐次。" : "当前暂无供餐，请通过小智预约早、中、晚餐。") + button("让小智帮我预约", "agent", true);
}
function selectRestaurant(id) {
  currentFilters = { ...currentFilters, campus: catalog.restaurants.find(r => r.id === id).campus, restaurantId: String(id), floor: "", dishName: "" };
  filters = { dishes: currentFilters };
  store("menu-filters", filters);
  draw();
  root.querySelector("#menu-filter")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
async function details(id) {
  const d = catalog.dishes.find((x) => x.id === id),
    reviews = (await api("/social/reviews/" + id)).data;
  const modal = dialog(
    d.name,
    `${dishPhoto(d,{height:220})}<p>${esc(d.restaurant)} ${esc(d.floor || "楼层待核实")} · ${esc(d.window)} · ${money(d.price)}</p><p>食材：${esc(d.ingredients.join("、"))}<br>过敏原：${esc(d.allergens.join("、") || "未列出")}<br>份量：${d.portionG}g<br>每份热量（预估）：${esc(d.nutrition.calories)} kcal<br>蛋白质 ${esc(d.nutrition.protein)}g · 碳水 ${esc(d.nutrition.carbs)}g · 脂肪 ${esc(d.nutrition.fat)}g<br>每100g（预估）：${esc(d.nutrition.per100g?.calories ?? "未知")} kcal · 蛋白质 ${esc(d.nutrition.per100g?.protein ?? "未知")}g · 碳水 ${esc(d.nutrition.per100g?.carbs ?? "未知")}g · 脂肪 ${esc(d.nutrition.per100g?.fat ?? "未知")}g<br>评分：${d.reviewCount ? d.rating.toFixed(1) + " / " + d.reviewCount + "条评价" : "暂无评价"}</p>${source(d.sourceName, d.sourceDate)}${card("近期口碑与校方回复", reviews.map((r) => `<p>${esc(r.rating)}分 · ${esc(r.content || r.commentcontent)}<br>${r.reply || r.replycontent ? "校方回复：" + esc(r.reply || r.replycontent) : ""}</p>`).join("") || "<p>尚无评价</p>")}${button("发起就餐任务", "plan", true)}${button("评价这道菜", "review")}`,
  );
  bind(modal, {
    review: () => review(id),
    plan: () => {
      modal.close();
      return openAgent("我想吃" + d.name, { dishId: id });
    },
  });
}

function review(dishId) {
  const d = dialog(
    "菜品评价",
    `<form>${field("rating", "评分", `<select>${options([5, 4, 3, 2, 1].map((x) => [x, x + "分"]))}</select>`)}${field("content", "评价内容", '<textarea required maxlength="2000"></textarea>')}<button class="zx-button zx-primary">发布评价</button><div data-status></div></form>`,
  );
  d.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const f = Object.fromEntries(new FormData(e.target));
      await api("/social/reviews", {
        method: "POST",
        body: { dishId, rating: Number(f.rating), content: f.content },
      });
      d.close();
      await details(dishId);
    } catch (err) {
      d.querySelector("[data-status]").innerHTML = notice(err.message, "error");
    }
  };
}
