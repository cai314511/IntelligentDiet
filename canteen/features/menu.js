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
let catalog,
  root,
  filters = read("menu-filters", { dishes: {}, restaurants: {} });
let currentFilters = filters.dishes || filters.restaurants || {};
delete currentFilters.query;
export async function renderMenu() {
  root = document.getElementById("app-root");
  root.innerHTML = notice("正在读取本校菜单…");
  try {
    catalog = (await api("/workspace/catalog")).data;
    window.syncLiveCatalog(catalog);
    if (!["#order", "#agent"].includes(location.hash)) return;
    draw();
  } catch (e) {
    root.innerHTML = notice(e.message, "error") + button("重新加载", "retry");
    bind(root, { retry: renderMenu });
  }
}
function draw() {
  const f = currentFilters;
  root.innerHTML = `<div class="mb-8 bg-gradient-to-r from-indigo-900 via-purple-800 to-indigo-900 rounded-[24px] p-8 text-white shadow-appleHover cursor-pointer relative overflow-hidden" data-action="agent"><h2 class="text-3xl font-bold mb-2">不知道吃什么？</h2><p>让智能体小智帮您点餐</p><div style="margin-top:18px">${button("让小智帮我决定", "agent", true)}</div></div><h1 class="text-4xl font-bold mb-2 tracking-tight">智能点餐</h1><div class="zx-grid" style="margin:24px 0">${restaurantCards(f)}</div>${card(
    "查找本校菜品",
    `<form id="menu-filter"><div class="zx-menu-location">${field("campus", "校区", `<select>${options([["", "全部校区"], ...[...new Set(catalog.restaurants.map((r) => r.campus))].map((v) => [v, v])], f.campus)}</select>`)}${field("restaurantId", "食堂", `<select>${options([["", "全部食堂"], ...catalog.restaurants.map((r) => [r.id, r.name])], f.restaurantId)}</select>`)}${field("floor", "楼层", `<select>${options([["", "全部楼层"], ...[...new Set(catalog.restaurants.map((r) => r.name.match(/[一二三四五六七八九十\d]+[层楼]/)?.[0]).filter(Boolean))].map((x) => [x, x])], f.floor)}</select>`)}</div><div class="zx-menu-dishes">${field("category", "品类", `<select>${options([["", "全部品类"], ...[...new Set(catalog.dishes.map((d) => d.category))].map((v) => [v, v])], f.category)}</select>`)}${field("dishName", "菜名", `<select>${options([["", "全部菜品"], ...[...new Set(catalog.dishes.map((d) => d.name))].map((x) => [x, x])], f.dishName)}</select>`)}<div class="zx-field"><span>价格区间</span><div class="zx-price-range"><input aria-label="最低价格" name="minPrice" type="number" min="0" step="0.1" placeholder="最低价" value="${esc(f.minPrice || "")}"><span>—</span><input aria-label="最高价格" name="maxPrice" type="number" min="0" step="0.1" placeholder="最高价" value="${esc(f.maxPrice || "")}"></div></div>${field("exclude", "忌口食材", `<input value="${esc(f.exclude || "")}" placeholder="例如：花生、香菜">`)}${field(
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
  bind(root, {
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
        d.forSale &&
        (!f.dishName || d.name === f.dishName) &&
        (!f.restaurantId || d.restaurantId === Number(f.restaurantId)) &&
        (!f.floor || d.restaurant.includes(f.floor)) &&
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
      f.sort === "price"
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
        return `<section class="zx-card bg-white rounded-[20px] shadow-apple border border-gray-100" style="border-right:8px solid ${color}"><h3>${esc(r.name)}</h3><p>${esc(r.campus)} · ${r.distanceM}米</p><p>排队 ${r.queueCount}人 · 等待 ${r.queueMinutes}分钟 · <b style="color:${color}">${status}</b></p>${button("筛选此食堂", "place").replace('data-action="place"', `data-action="place" data-id="${r.id}"`)}${source(r.sourceName, r.updatedAt)}</section>`;
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
            `<img src="${esc(group[0].image || "/canteen/dish-placeholder.svg")}" alt="${esc(group[0].name)}" style="width:100%;height:140px;object-fit:cover;border-radius:14px;margin-bottom:12px">${group
              .map(
                (d) =>
                  `<div style="padding:10px 0;border-bottom:1px solid #eee"><b>${esc(d.restaurant)}</b><p class="zx-source">${esc(d.window)} · ${d.distanceM}米 · 排队${d.queueMinutes}分钟 · 库存${d.stock}</p><div class="zx-row"><b>${money(d.price)}</b>${button("查看详情", "dish").replace('data-action="dish"', `data-action="dish" data-id="${d.id}"`)}${button("加入餐盘", "cart").replace('data-action="cart"', `data-action="cart" data-id="${d.id}"`)}${button("规划下单", "plan", true).replace('data-action="plan"', `data-action="plan" data-id="${d.id}"`)}</div></div>`,
              )
              .join("")}`,
          ),
        )
        .join("")}</div>`
    : notice("当前条件没有匹配菜品，请调整筛选。");
}
function selectRestaurant(id) {
  currentFilters = { ...currentFilters, restaurantId: String(id) };
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
    `<p>${esc(d.restaurant)} · ${esc(d.window)} · ${money(d.price)}</p><p>食材：${esc(d.ingredients.join("、"))}<br>过敏原：${esc(d.allergens.join("、") || "未列出")}<br>份量：${d.portionG}g<br>热量：${esc(d.nutrition.calories)} kcal<br>评分：${d.reviewCount ? d.rating.toFixed(1) + " / " + d.reviewCount + "条评价" : "暂无评价"}</p>${source(d.sourceName, d.sourceDate)}${card("近期口碑与校方回复", reviews.map((r) => `<p>${esc(r.rating)}分 · ${esc(r.content || r.commentcontent)}<br>${r.reply || r.replycontent ? "校方回复：" + esc(r.reply || r.replycontent) : ""}</p>`).join("") || "<p>尚无评价</p>")}${button("发起就餐任务", "plan", true)}${button("评价这道菜", "review")}`,
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
