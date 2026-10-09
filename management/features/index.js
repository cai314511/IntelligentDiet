import { renderDemo } from './demo-dashboard.js';
import { scenario } from "../../shared/scenario.js";
import { applySchool, safeUrl } from "../../shared/core.js";
import {
  api,
  esc,
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
  dialog,
} from "../../shared/feature-ui.js";
import { programs } from "./programs.js";
import { dashboard, forecast } from "./dashboard.js";
import { operations, dishes, orders, feedback, reviews } from "./operations.js";
let disposeDemo = () => {};
let globalQuery = "",
  renderVersion = 0;
let context = read("admin-context", {
    from: new Date(Date.now() - (session()?.user.demoSession ? 29 * 86400000 : 0)).toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" }),
    to: new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" }),
    campus: "",
    restaurantId: "",
    window: "",
    period: "hour",
  }),
  catalog,
  module = "dashboard";
window.zxAdminRender = async (selected, root) => {
  disposeDemo();
  const version = ++renderVersion;
  module = selected;
  catalog = (await api("/workspace/catalog")).data;
  if (version !== renderVersion) return true;
  root.innerHTML =
    '<details class="admin-filter-panel" ' + (matchMedia('(max-width:767px)').matches ? '' : 'open') + '><summary>筛选范围 · 日期、校区与食堂</summary>' + card(
      "当前筛选范围",
      `<form id="admin-context" class="zx-grid">${field("from", "开始日期", `<input type="date" value="${context.from}" required>`)}${field("to", "结束日期", `<input type="date" value="${context.to}" required>`)}${field("campus", "校区", `<select>${options([["", "全部校区"], ...[...new Set(catalog.restaurants.map((r) => r.campus))].map((x) => [x, x])], context.campus)}</select>`)}${field("restaurantId", "食堂", `<select>${options([["", "全部食堂"], ...catalog.restaurants.filter((r) => !context.campus || r.campus === context.campus).map((r) => [r.id, r.name])], context.restaurantId)}</select>`)}${field("window", "窗口", `<select>${options([["", "全部窗口"], ...[...new Set(catalog.dishes.filter((d) => (!context.campus || d.campus === context.campus) && (!context.restaurantId || d.restaurantId === Number(context.restaurantId))).map((d) => d.window))].map((x) => [x, x])], context.window)}</select>`)}<button class="zx-button zx-primary" type="submit">更新范围</button></form><p class="zx-source">${esc(session()?.school?.name)} · ${esc(context.campus || "全部校区")} · ${esc(catalog.restaurants.find((r) => r.id === Number(context.restaurantId))?.name || "全部食堂")} · ${esc(context.window || "全部窗口")} · ${esc(context.from)}—${esc(context.to)}</p>`,
    ) + `</details><section id="admin-feature-body"></section>`;
  const form = root.querySelector("form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    context = { ...context, ...formData(form) };
    store("admin-context", context);
    await reload();
  };
  form.campus.onchange = () => {
    form.restaurantId.innerHTML = options([
      ["", "全部食堂"],
      ...catalog.restaurants
        .filter((r) => !form.campus.value || r.campus === form.campus.value)
        .map((r) => [r.id, r.name]),
    ]);
    form.window.innerHTML = options([["", "全部窗口"]]);
  };
  form.restaurantId.onchange = () =>
    (form.window.innerHTML = options([
      ["", "全部窗口"],
      ...[
        ...new Set(
          catalog.dishes
            .filter(
              (d) =>
                !form.restaurantId.value ||
                d.restaurantId === Number(form.restaurantId.value),
            )
            .map((d) => d.window),
        ),
      ].map((x) => [x, x]),
    ]));
  const body = root.querySelector("#admin-feature-body");
  try {
    if (session()?.user.demoSession && ['dashboard','forecast','safety','supplier','inventory','procurement'].includes(selected)) {
      const cleanup = await renderDemo(body, selected, context, ['safety','supplier','inventory','procurement'].includes(selected) ? ledger => operations(ledger,selected,context,reload) : null);
      if(version===renderVersion) disposeDemo=cleanup; else cleanup();
    }
    else if (selected === "dashboard") await dashboard(body, context, reload);
    else if (selected === "forecast") await forecast(body, context, reload);
    else if (selected === "canteen") await dishes(body, context, reload);
    else if (selected === "reviews") await reviews(body, context, reload);
    else if (selected === "programs") await programs(body, context, reload);
    else if (selected === "orders") await orders(body, context, reload);
    else if (selected === "feedback") await feedback(body, context, reload);
    else await operations(body, selected, context, reload);
  } catch (e) {
    body.innerHTML = notice(e.message, "error") + button("重新加载", "retry");
    bind(body, { retry: reload });
  }
  if (globalQuery) {
    const input = body.querySelector(".zx-search");
    if (input) {
      input.value = globalQuery;
      input.dispatchEvent(new Event("input"));
      globalQuery = "";
    }
  }
  return true;
};
async function reload(next) {
  if (next) context = { ...context, ...next };
  store("admin-context", context);
  window.dispatchEvent(new CustomEvent("zx-admin-refresh", { detail: module }));
}
const school = session()?.school;
if (school) {
  applySchool(school);
  document.documentElement.style.setProperty(
    "--zx-primary",
    school.accent || "#0066cc",
  );
  document.querySelector(".sidebar-footer").textContent =
    school.name + "后勤处 · " + new Date().getFullYear();
  document.querySelector("footer p").textContent =
    "© " + new Date().getFullYear() + " 智饷高校后勤管理系统 · " + school.name;
}
const nav = document.querySelector(".nav-menu");
nav.innerHTML = `<li><span>${school?.logo ? `<img src="${safeUrl(school.logo)}" alt="${esc(school.name)}校徽" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;margin-right:6px">` : ""}${esc(school?.name || "")}</span></li><li><button class="zx-button zx-mobile-menu" id="admin-menu" aria-label="打开导航">☰</button></li><li><input class="zx-search" id="admin-global-search" placeholder="搜索菜品、订单或反馈" style="max-width:220px"></li><li>${button("通知", "notifications")}</li><li>${button("流程导览", "scenario")}</li>`;
nav.style.display = "flex";
nav.querySelector("#admin-menu").onclick = () =>
  document.body.classList.toggle("zx-menu-open");
nav.querySelector("#admin-global-search").onkeydown = (e) => {
  if (e.key === "Enter") {
    const input = document.querySelector("#admin-feature-body .zx-search");
    if (input) {
      input.value = e.target.value;
      input.dispatchEvent(new Event("input"));
    } else {
      globalQuery = e.target.value;
      window.dispatchEvent(
        new CustomEvent("zx-admin-refresh", { detail: "canteen" }),
      );
    }
  }
};
bind(nav, {
  scenario: () => scenario(),
  notifications: async () => {
    const data = (
      await api("/insights/dashboard?" + new URLSearchParams(context))
    ).data;
    const d = dialog(
      "待处理通知",
      `<p>待接单 ${data.pendingOrders}单 · 反馈 ${data.pendingFeedback}条 · 低库存 ${data.lowStock.length}种</p>${button("流程导览", "scenario")}`,
    );
    bind(d, {
      scenario: () => {
        d.close();
        scenario();
      },
    });
  },
});
const list = document.querySelector(".sidebar-menu");
for (const [id, title] of [
  ["reviews", "⭐ 菜品评价"],
  ["programs", "🎉 校园活动与文创"],
  ["forecast", "📈 供需预测"],
  ["orders", "🧾 订单管理"],
  ["feedback", "💬 学生反馈"],
  ["inventory", "📦 库存批次"],
  ["procurement", "🛒 采购计划"],
  ["supplier", "🤝 供应商管理"],
]) {
  const li = document.createElement("li");
  li.innerHTML = `<a href="#${id}" data-module="${id}" class="menu-item">${title}</a>`;
  list.append(li);
}
window.addEventListener("popstate", () =>
  window.dispatchEvent(
    new CustomEvent("zx-admin-refresh", {
      detail: location.hash.slice(1) || "dashboard",
    }),
  ),
);

document.addEventListener("click", (e) => {
  if (
    document.body.classList.contains("zx-menu-open") &&
    !e.target.closest("#sidebar") &&
    !e.target.closest("#admin-menu")
  )
    document.body.classList.remove("zx-menu-open");
});
