import * as core from "../../shared/core.js";
import * as dashboard from "./dashboard.js";
import * as forecast from "./forecast.js";
import * as orders from "./orders.js";
import * as dishes from "./dishes.js";
import * as operations from "./operations.js";
import * as feedback from "./feedback.js";
import * as programs from "./programs.js";
import * as tables from "./table.js";
const s = core.guard("admin");
if (s) {
  core.applySchool(s.school);
  const root = document.getElementById("admin-root"),
    modules = {
      dashboard,
      forecast,
      orders,
      dishes,
      supply: operations,
      safety: operations,
      conservation: operations,
      audit: operations,
      feedback,
      programs,
      checks: dashboard,
    };
  const ctx = {
    ...core,
    session: s,
    user: s.user,
    route: "dashboard",
    data: { dishes: [], restaurants: [] },
    filter: core.read("adminFilter", {
      from: core.today(),
      to: core.today(),
      campus: s.campus || "",
      restaurantId: "",
      window: "",
    }),
    search: "",
    version: 0,
  };
  ctx.actions = Object.assign(
    {},
    dashboard.actions,
    forecast.actions,
    orders.actions,
    dishes.actions,
    operations.actions,
    feedback.actions,
    programs.actions,
    tables.actions,
  );
  ctx.query = () => new URLSearchParams(ctx.filter).toString();
  ctx.scoped = (rows) =>
    rows.filter(
      (r) =>
        (!ctx.filter.campus || r.campus === ctx.filter.campus) &&
        (!ctx.filter.restaurantId ||
          Number(r.restaurantId) === Number(ctx.filter.restaurantId)) &&
        (!ctx.filter.window || r.window === ctx.filter.window),
    );
  ctx.populate = () => {
    const campuses = [...new Set(ctx.data.restaurants.map((r) => r.campus))];
    document.getElementById("context-from").value = ctx.filter.from;
    document.getElementById("context-to").value = ctx.filter.to;
    document.getElementById("context-campus").innerHTML = core.options(
      [
        { value: "", label: "全校区" },
        ...campuses.map((c) => ({ value: c, label: c })),
      ],
      ctx.filter.campus,
    );
    document.getElementById("context-restaurant").innerHTML = core.options(
      [
        { value: "", label: "所有食堂" },
        ...ctx.data.restaurants
          .filter((r) => !ctx.filter.campus || r.campus === ctx.filter.campus)
          .map((r) => ({ value: r.id, label: r.name })),
      ],
      ctx.filter.restaurantId,
    );
    document.getElementById("context-window").innerHTML = core.options(
      [
        { value: "", label: "所有窗口" },
        ...[
          ...new Set(
            ctx.data.dishes
              .filter(
                (d) =>
                  (!ctx.filter.campus || d.campus === ctx.filter.campus) &&
                  (!ctx.filter.restaurantId ||
                    d.restaurantId === Number(ctx.filter.restaurantId)),
              )
              .map((d) => d.window),
          ),
        ].map((w) => ({ value: w, label: w })),
      ],
      ctx.filter.window,
    );
  };
  ctx.render = async () => {
    const version = ++ctx.version;
    try {
      const html = await modules[ctx.route].render(ctx);
      if (ctx.version !== version) return;
      root.innerHTML = html;
    } catch (e) {
      if (ctx.version === version) root.innerHTML = core.errorState(e.message);
    }
    document
      .querySelectorAll('.sidebar a[href^="#"]')
      .forEach((a) => a.classList.toggle("active", a.hash === `#${ctx.route}`));
  };
  ctx.load = async () => {
    ctx.data = (await core.api("/workspace/catalog")).data;
    ctx.populate();
  };
  ctx.refresh = async () => {
    await ctx.load();
    await ctx.render();
  };
  ctx.actions.refresh = () => ctx.refresh();
  ctx.actions.logout = core.logout;
  ctx.actions["open-sidebar"] = () => {
    document.getElementById("sidebar").classList.add("open");
    document.getElementById("sidebar-scrim").hidden = false;
  };
  ctx.actions["close-sidebar"] = () => {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebar-scrim").hidden = true;
  };
  ctx.actions["student-workspace"] = () => {
    s.identity = "student";
    core.saveSession(s);
    location.href = "/canteen/#agent";
  };
  ctx.actions["context-filter"] = async (ctx, e) => {
    ctx.filter[e.target.dataset.context] = e.target.value;
    if (e.target.dataset.context === "campus") {
      ctx.filter.restaurantId = "";
      ctx.filter.window = "";
    }
    if (e.target.dataset.context === "restaurantId") ctx.filter.window = "";
    core.store("adminFilter", ctx.filter);
    ctx.populate();
    ctx.render();
  };
  ctx.actions["global-search"] = (ctx, e) => {
    ctx.search = e.target.value;
    ctx.render();
  };
  ctx.actions.notifications = async () => {
    const data = (await core.api(`/insights/dashboard?${ctx.query()}`)).data;
    core.modal(
      "待处理事项",
      `<div class="stack"><a class="btn secondary" href="#orders">${data.pendingOrders} 笔订单等待接单</a><a class="btn secondary" href="#feedback">${data.pendingFeedback} 条反馈待闭环</a><a class="btn secondary" href="#dishes">${data.lowStock.length} 项库存风险</a></div>`,
    );
  };
  const dispatch = async (action, e) => {
    const fn = ctx.actions[action];
    if (!fn) return;
    const b = e.target.closest("button");
    if (b?.disabled) return;
    if (e.type === "click" && b) b.disabled = true;
    try {
      await fn(ctx, e);
    } catch (error) {
      core.toast(error.message, "error");
    } finally {
      if (b?.isConnected) b.disabled = false;
    }
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-action]");
    if (b && b.tagName !== "FORM") dispatch(b.dataset.action, e);
  });
  document.addEventListener("submit", (e) => {
    if (e.target.matches("form[data-action]")) {
      e.preventDefault();
      dispatch(e.target.dataset.action, e);
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target.matches("[data-change]")) dispatch(e.target.dataset.change, e);
  });
  let timer;
  document.addEventListener("input", (e) => {
    if (e.target.matches("[data-input]")) {
      clearTimeout(timer);
      timer = setTimeout(() => dispatch(e.target.dataset.input, e), 180);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") ctx.actions["close-sidebar"]();
  });
  window.addEventListener("hashchange", () => {
    core.closeModal();
    ctx.route = location.hash.slice(1) || "dashboard";
    if (!modules[ctx.route]) ctx.route = "dashboard";
    core.store("adminRoute", ctx.route);
    ctx.actions["close-sidebar"]();
    ctx.render();
  });
  document.getElementById("admin-school").textContent = s.school?.name || "";
  document.getElementById("admin-user").textContent =
    `${s.user.xingming} · 食堂后勤管理`;
  document.title = `智饷 · ${s.school?.shortName || "校园"}后勤管理`;
  root.innerHTML =
    '<div class="loading"><img src="/assets/brand/xiaozhi-avatar.png" alt="正在加载工作台"></div>';
  ctx
    .load()
    .then(() => {
      ctx.route =
        location.hash.slice(1) || core.read("adminRoute", "dashboard");
      if (!modules[ctx.route]) ctx.route = "dashboard";
      location.hash = ctx.route;
      ctx.render();
    })
    .catch((e) => (root.innerHTML = core.errorState(e.message)));
  setInterval(() => {
    if (ctx.route === "orders" && !document.querySelector("dialog"))
      ctx.render();
  }, 8000);
}
