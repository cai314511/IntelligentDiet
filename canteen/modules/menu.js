import {
  esc,
  money,
  source,
  options,
  read,
  store,
  modal,
  safeUrl,
  api,
  post,
  toast,
  empty,
  closeModal,
  dateTime,
} from "../../shared/core.js";
const defaults = {
  search: "",
  category: "",
  campus: "",
  restaurantId: "",
  sort: "distance",
  minPrice: "",
  maxPrice: "",
  maxCalories: "",
  exclude: "",
  diet: "",
  inStock: true,
};
const food = (d) =>
  /面|粉/.test(d.category)
    ? "🍜"
    : /汤|粥/.test(d.category)
      ? "🥣"
      : /甜|烘|糕|饼/.test(d.category)
        ? "🥐"
        : /饮/.test(d.category)
          ? "🥛"
          : /凉|蔬/.test(d.category)
            ? "🥗"
            : "🍲";
function state(ctx) {
  ctx.menuState ??= read("menuState", {
    path: "dish",
    dish: { ...defaults },
    restaurant: { ...defaults, campus: ctx.session.campus || "" },
  });
  return ctx.menuState;
}
function filter(ctx) {
  const st = state(ctx),
    f = st[st.path],
    exclusions = f.exclude
      .split(/[，,、]/)
      .map((x) => x.trim())
      .filter(Boolean);
  const rows = ctx.data.dishes.filter(
    (d) =>
      d.forSale &&
      (!f.search ||
        [d.name, d.restaurant, d.window].join(" ").includes(f.search)) &&
      (!f.category || d.category === f.category) &&
      (!f.campus || d.campus === f.campus) &&
      (!f.restaurantId || String(d.restaurantId) === String(f.restaurantId)) &&
      (!f.minPrice || d.price >= Number(f.minPrice)) &&
      (!f.maxPrice || d.price <= Number(f.maxPrice)) &&
      (!f.maxCalories ||
        Number(d.nutrition.calories) <= Number(f.maxCalories)) &&
      (!f.inStock || d.stock > 0) &&
      !exclusions.some((x) =>
        [d.name, ...d.ingredients, ...d.allergens].join(" ").includes(x),
      ) &&
      (!f.diet ||
        (f.diet === "清真"
          ? [d.restaurant, ...d.dietaryTags].join(" ").includes("清真")
          : d.dietaryTags.some((t) => t.includes("素")))),
  );
  return rows.sort((a, b) =>
    f.sort === "price"
      ? a.price - b.price
      : f.sort === "queue"
        ? (a.queueMinutes ?? Infinity) - (b.queueMinutes ?? Infinity)
        : f.sort === "rating"
          ? b.rating - a.rating
          : f.sort === "sales"
            ? b.sales - a.sales
            : (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity),
  );
}
export function dishCard(d, count = 1) {
  return `<article class="card dish-card"><div class="dish-visual">${d.image && safeUrl(d.image) ? `<img src="${safeUrl(d.image)}" alt="${esc(d.name)}" loading="lazy">` : `<span class="food-icon" aria-hidden="true">${food(d)}</span>`}<span class="badge ${d.stock ? "" : "bad"}">${d.stock ? `${d.stock} 份可选` : "售罄"}</span></div><div class="dish-content"><h3>${esc(d.name)}</h3><p>${esc(d.restaurant)} · ${esc(d.window)}</p><p>步行 ${d.distanceM === null ? "—" : `${d.distanceM} m`} · 排队 ${d.queueMinutes ?? "—"} 分钟</p><p>${Number(d.nutrition.calories) || 0} kcal · ${d.rating ? `★ ${d.rating.toFixed(1)}` : "尚无评价"} · 月售 ${d.sales}</p><div class="dish-footer"><strong>${money(d.price)}</strong><button class="btn secondary" data-action="dish-detail" data-id="${d.id}">${count > 1 ? `${count} 个售卖点` : "查看菜品"}</button></div></div></article>`;
}
export function render(ctx) {
  const st = state(ctx),
    f = st[st.path],
    data = ctx.data,
    rows = filter(ctx),
    campuses = [...new Set(data.restaurants.map((r) => r.campus))],
    restaurants = data.restaurants.filter(
      (r) => !f.campus || r.campus === f.campus,
    ),
    categories = [...new Set(data.dishes.map((d) => d.category))];
  const grouped =
    st.path === "dish"
      ? rows.reduce((m, d) => {
          if (!m.has(d.name)) m.set(d.name, []);
          m.get(d.name).push(d);
          return m;
        }, new Map())
      : null;
  return `<div class="page-head row spread wrap"><div><span class="eyebrow">YOUR NEXT MEAL</span><h1>这一餐，由你决定</h1><p>从一道菜出发，或先选一间食堂。</p></div><a class="btn secondary" href="#agent">让小智帮我选</a></div><div class="segmented"><button data-action="menu-path" data-path="dish" class="${st.path === "dish" ? "active" : ""}">看菜选食堂</button><button data-action="menu-path" data-path="restaurant" class="${st.path === "restaurant" ? "active" : ""}">逛食堂找菜</button></div><section class="card menu-toolbar"><div class="filters"><input id="menu-search" type="search" aria-label="搜索菜名、食堂或窗口" value="${esc(f.search)}" placeholder="搜索菜名、食堂或窗口" data-filter="search" data-input="menu-filter"><select aria-label="菜品分类" data-filter="category" data-change="menu-filter">${options([{ value: "", label: "所有品类" }, ...categories.map((c) => ({ value: c, label: c }))], f.category)}</select><select aria-label="排序" data-filter="sort" data-change="menu-filter">${options(
    [
      { value: "distance", label: "距离最近" },
      { value: "price", label: "价格从低到高" },
      { value: "queue", label: "排队最短" },
      { value: "rating", label: "评分最高" },
      { value: "sales", label: "销量最高" },
    ],
    f.sort,
  )}</select></div><div class="filters" style="margin-top:12px"><select aria-label="校区" data-filter="campus" data-change="menu-filter">${options([{ value: "", label: "所有校区" }, ...campuses.map((c) => ({ value: c, label: c }))], f.campus)}</select><select aria-label="食堂" data-filter="restaurantId" data-change="menu-filter">${options([{ value: "", label: "所有食堂" }, ...restaurants.map((r) => ({ value: r.id, label: r.name }))], f.restaurantId)}</select><button class="btn ghost" data-action="menu-advanced">${ctx.menuAdvanced ? "收起" : "更多"}筛选</button></div>${ctx.menuAdvanced ? `<div class="form-grid"><div><label>价格下限</label><input id="min-price" type="number" min="0" value="${esc(f.minPrice)}" data-filter="minPrice" data-input="menu-filter"></div><div><label>价格上限</label><input id="max-price" type="number" min="0" value="${esc(f.maxPrice)}" data-filter="maxPrice" data-input="menu-filter"></div><div><label>热量上限 kcal</label><input id="max-cal" type="number" min="0" value="${esc(f.maxCalories)}" data-filter="maxCalories" data-input="menu-filter"></div><div><label>忌口 / 过敏原（逗号分隔）</label><input id="menu-exclude" value="${esc(f.exclude)}" data-filter="exclude" data-input="menu-filter"></div><div><label>饮食标签</label><select data-filter="diet" data-change="menu-filter">${options(["", "清真", "素食"], f.diet)}</select></div><div><label><input type="checkbox" style="width:auto" data-filter="inStock" data-change="menu-filter" ${f.inStock ? "checked" : ""}> 仅看有货菜品</label><button class="btn ghost" data-action="menu-reset">清除筛选</button></div></div>` : ""}</section>${st.path === "restaurant" && !f.restaurantId ? `<div class="grid three">${restaurants.map((r) => restaurantCard(r)).join("")}</div><h2 class="section-title">食堂菜品</h2>` : ""}<div class="row spread" style="margin:18px 0"><span class="muted">${rows.length} 道菜品${f.restaurantId ? ` · ${esc(restaurants.find((r) => String(r.id) === String(f.restaurantId))?.name || "")}` : ""}</span>${source(data.sourceName, data.updatedAt)}</div>${rows.length ? `<div class="dish-grid">${grouped ? [...grouped.values()].map((list) => dishCard(list[0], list.length)).join("") : rows.map((d) => dishCard(d)).join("")}</div>` : empty("没有符合筛选的菜品", "尝试调整价格、校区或忌口条件")}<h2 class="section-title">食堂拥挤度</h2><div class="grid three">${restaurants.map(restaurantCard).join("")}</div>`;
}
export function restaurantCard(r) {
  const crowd =
    r.queueMinutes < 7 ? "空闲" : r.queueMinutes < 13 ? "适中" : "拥挤";
  return `<article class="card restaurant-card"><div class="row spread"><span class="badge">${esc(r.campus)}</span><span class="badge ${crowd === "拥挤" ? "warn" : ""}">${crowd}</span></div><h3 style="margin-top:14px">${esc(r.name)}</h3><div class="queue">${r.queueMinutes} <small>分钟预计排队</small></div><p>${r.queueCount} 人候餐 · ${r.availableSeats}/${r.totalSeats} 个预约桌位可用</p><p>步行 ${r.distanceM} m · 趋势 ${esc(r.trend)}</p><div class="row wrap" style="margin-top:18px"><button class="btn secondary" data-action="restaurant-menu" data-id="${r.id}">查看菜单</button><button class="btn ghost" data-action="view-seats" data-id="${r.id}">查看座位</button></div>${source(r.sourceName, r.updatedAt)}</article>`;
}
async function details(ctx, id) {
  const d = ctx.data.dishes.find((d) => d.id === Number(id));
  if (!d) return;
  const variants = ctx.data.dishes.filter(
    (x) => x.name === d.name && x.forSale,
  );
  const reviews = (
    await api(`/social/reviews/${d.id}?schoolId=${ctx.user.school_id}`)
  ).data;
  modal(
    d.name,
    `<div class="row spread"><span class="badge">${esc(d.category)}</span><h2>${money(d.price)}</h2></div><div class="details-grid"><div><small>营养 / 每份</small>${Number(d.nutrition.calories) || 0} kcal · ${d.portionG} g</div><div><small>三大营养素</small>蛋白 ${Number(d.nutrition.protein) || 0}g · 碳水 ${Number(d.nutrition.carbs) || 0}g · 脂肪 ${Number(d.nutrition.fat) || 0}g</div></div><p>食材：${esc(d.ingredients.join("、"))}</p><p>过敏原：${esc(d.allergens.join("、") || "未标注")}</p><p class="muted">${esc([...d.tasteTags, ...d.dietaryTags].join(" · "))}</p><h3 class="section-title">选择售卖点</h3>${variants.map((v) => `<div class="row spread" style="padding:12px 0;border-bottom:1px solid var(--line)"><div><b>${esc(v.campus)} · ${esc(v.restaurant)}</b><p class="muted">${esc(v.window)} · ${v.distanceM ?? "—"}m · 排队 ${v.queueMinutes ?? "—"}分钟 · ${v.stock}份</p></div><button class="btn" data-action="add-cart" data-id="${v.id}" ${v.stock ? "" : "disabled"}>${money(v.price)} +</button></div>`).join("")}<h3 class="section-title">菜品口碑 · ${reviews.length} 条</h3>${
      reviews.some((r) => r.rating <= 2)
        ? `<div class="info-box"><b>近期需要留意</b>${reviews
            .filter((r) => r.rating <= 2)
            .slice(0, 3)
            .map(
              (r) =>
                `<p>${esc(r.content)}</p>${r.reply ? `<small>校方回复：${esc(r.reply)}</small>` : ""}`,
            )
            .join("")}</div>`
        : ""
    }${
      reviews.length
        ? reviews
            .slice(0, 8)
            .map(
              (r) =>
                `<div class="review"><div class="row spread"><b>${esc(r.username)}</b><span>★ ${r.rating}</span></div><p>${esc(r.content)}</p>${r.reply ? `<p class="info-box">校方回复：${esc(r.reply)}</p>` : ""}</div>`,
            )
            .join("")
        : '<p class="muted">还没有评价，你的反馈会帮助其他同学。</p>'
    }<form data-action="write-review" data-id="${d.id}"><label>评价菜品</label><select name="rating">${options(["5", "4", "3", "2", "1"], "5")}</select><textarea name="content" maxlength="2000" required placeholder="说说口味、份量或服务体验"></textarea><button class="btn secondary" style="margin-top:10px">发布评价</button></form><details style="margin-top:20px"><summary class="muted">查看信息来源</summary><p class="muted">${esc(d.sourceName)} · ${esc(d.sourceDate)}</p><p class="muted">${esc(d.priceBasis)} · ${esc(d.nutritionBasis)}</p>${safeUrl(d.sourceUrl) ? `<a href="${safeUrl(d.sourceUrl)}" target="_blank" rel="noopener">打开来源页面 ↗</a>` : ""}</details>`,
  );
}
async function seats(ctx, id, startsAt) {
  const start = startsAt
      ? new Date(startsAt)
      : new Date(Date.now() + 30 * 60000),
    end = new Date(start.getTime() + 45 * 60000),
    r = ctx.data.restaurants.find((r) => r.id === Number(id));
  const result = (
    await api(
      `/restaurants/${id}/seats?schoolId=${ctx.user.school_id}&startsAt=${encodeURIComponent(start.toISOString())}&endsAt=${encodeURIComponent(end.toISOString())}`,
    )
  ).data;
  ctx.seatState = {
    id: Number(id),
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    seatId: null,
  };
  const local = new Date(start.getTime() - start.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  modal(
    "预约就餐座位",
    `<h3>${esc(r?.campus)} · ${esc(r?.name)}</h3><label>开始时间 · 每次 45 分钟</label><input id="seat-start" type="datetime-local" value="${local}" data-change="seat-time"><div class="seat-grid">${result.seats.map((s) => `<button data-action="select-seat" data-id="${s.id}" ${s.available ? "" : "disabled"}>${esc(s.label)}<br>${esc(s.type)}</button>`).join("")}</div><div class="actions"><button class="btn" data-action="reserve-seat" id="reserve-seat-button" disabled>确认预约</button></div>`,
  );
}
export const actions = {
  "menu-path": (ctx, e) => {
    state(ctx).path = e.target.closest("[data-path]").dataset.path;
    store("menuState", ctx.menuState);
    ctx.render();
  },
  "menu-filter": (ctx, e) => {
    const st = state(ctx),
      el = e.target;
    st[st.path][el.dataset.filter] =
      el.type === "checkbox" ? el.checked : el.value;
    if (el.dataset.filter === "campus") st[st.path].restaurantId = "";
    store("menuState", st);
    ctx.render();
  },
  "menu-advanced": (ctx) => {
    ctx.menuAdvanced = !ctx.menuAdvanced;
    ctx.render();
  },
  "menu-reset": (ctx) => {
    const st = state(ctx);
    st[st.path] = { ...defaults };
    store("menuState", st);
    ctx.render();
  },
  "restaurant-menu": (ctx, e) => {
    const st = state(ctx);
    st.path = "restaurant";
    st.restaurant.restaurantId = e.target.closest("[data-id]").dataset.id;
    store("menuState", st);
    ctx.render();
  },
  "dish-detail": (ctx, e) =>
    details(ctx, e.target.closest("[data-id]").dataset.id),
  "write-review": async (ctx, e) => {
    const f = e.target,
      values = Object.fromEntries(new FormData(f));
    await post("/social/reviews", {
      ...values,
      dishId: Number(f.dataset.id),
      rating: Number(values.rating),
    });
    toast("评价已发表", "success");
    await ctx.load();
    await details(ctx, f.dataset.id);
  },
  "view-seats": (ctx, e) =>
    seats(ctx, e.target.closest("[data-id]").dataset.id),
  "seat-time": (ctx, e) => seats(ctx, ctx.seatState.id, e.target.value),
  "select-seat": (ctx, e) => {
    ctx.seatState.seatId = Number(e.target.closest("[data-id]").dataset.id);
    document
      .querySelectorAll(".seat-grid button")
      .forEach((b) =>
        b.classList.toggle(
          "selected",
          Number(b.dataset.id) === ctx.seatState.seatId,
        ),
      );
    document.getElementById("reserve-seat-button").disabled = false;
  },
  "reserve-seat": async (ctx) => {
    const st = ctx.seatState;
    await post(`/restaurants/${st.id}/reserve-seat`, {
      seatId: st.seatId,
      startsAt: st.startsAt,
      endsAt: st.endsAt,
    });
    closeModal();
    toast("座位预约成功", "success");
    await ctx.refresh();
  },
};
