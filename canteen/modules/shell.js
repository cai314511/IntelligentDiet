import * as core from "../../shared/core.js";
import * as agent from "./agent.js";
import * as menu from "./menu.js";
import * as nutrition from "./nutrition.js";
import * as orders from "./orders.js";
import * as discover from "./discover.js";
import * as profile from "./profile.js";
import * as cart from "./cart.js";
const s = core.guard("student");
if (s) {
  core.applySchool(s.school);
  document.documentElement.style.setProperty(
    "--bg",
    {
      campus: "#f4f7f7",
      warm: "#f8f5ec",
      pink: "#faf2f4",
      ocean: "#edf5fa",
      forest: "#eff7ee",
      night: "#e1e7e8",
    }[core.read("theme", "campus")] || "#f4f7f7",
  );
  const root = document.getElementById("app-root"),
    modules = {
      agent,
      menu,
      nutrition,
      orders,
      discover,
      my: profile,
      checks: profile,
      demo: profile,
    };
  const ctx = {
    ...core,
    session: s,
    user: s.user,
    data: { dishes: [], restaurants: [] },
    route: "agent",
    cart: core.read("cart", []),
    tasks: [],
    preferences: {},
    latestPlan: core.read("plan", null),
    chat: core.read("chat", []),
    busy: false,
  };
  ctx.actions = Object.assign(
    {},
    agent.actions,
    menu.actions,
    nutrition.actions,
    orders.actions,
    discover.actions,
    profile.actions,
    cart.actions,
  );
  ctx.render = async () => {
    const version = ++ctx.version;
    const old = document.activeElement,
      id = old?.id,
      start = old?.selectionStart;
    try {
      const html = await modules[ctx.route].render(ctx);
      if (version !== ctx.version) return;
      root.innerHTML = html;
      if (id) {
        const element = document.getElementById(id);
        if (element) {
          element.focus({ preventScroll: true });
          if (
            typeof start === "number" &&
            element.setSelectionRange &&
            ["text", "search", "textarea"].includes(element.type)
          )
            element.setSelectionRange(start, start);
        }
      }
    } catch (e) {
      if (version === ctx.version) root.innerHTML = core.errorState(e.message);
    }

    document
      .querySelectorAll('a[href^="#"]')
      .forEach((a) => a.classList.toggle("active", a.hash === `#${ctx.route}`));
  };
  ctx.version = 0;
  ctx.load = async () => {
    const [catalog, prefs, tasks] = await Promise.all([
      core.api("/workspace/catalog"),
      core.api("/workspace/preferences"),
      core.api("/tasks"),
    ]);
    ctx.data = catalog.data;
    ctx.preferences = prefs.data;
    ctx.tasks = tasks.data;
    core.store("catalog", ctx.data);
    cart.updateBadge(ctx);
  };
  ctx.refresh = async () => {
    await ctx.load();
    await ctx.render();
  };
  ctx.navigate = (route) => {
    location.hash = route;
  };
  document.getElementById("school-context").textContent =
    `${s.school?.shortName || s.school?.name || ""} · ${s.campus || "全校"} · ${s.user.xingming}`;
  document.title = `智饷 · ${s.school?.shortName || "校园"}学生端`;
  const dispatch = async (action, event) => {
    const fn = ctx.actions[action];
    if (!fn) return;
    const button = event.target.closest("button");
    if (button?.disabled) return;
    if (event.type === "click" && button) button.disabled = true;
    try {
      await fn(ctx, event);
    } catch (e) {
      core.toast(e.message, "error");
    } finally {
      if (button?.isConnected) button.disabled = false;
    }
  };
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (
      el &&
      el.tagName !== "FORM" &&
      !["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)
    )
      dispatch(el.dataset.action, e);
  });
  document.addEventListener("submit", (e) => {
    const form = e.target.closest("form[data-action]");
    if (form) {
      e.preventDefault();
      dispatch(form.dataset.action, e);
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
  window.addEventListener("hashchange", () => {
    ctx.route = location.hash.slice(1).split("?")[0] || "agent";
    if (!modules[ctx.route]) ctx.route = "agent";
    core.store("route", ctx.route);
    ctx.render();
  });
  ctx.actions.refresh = () => ctx.refresh();
  ctx.actions["open-agent"] = () => ctx.navigate("agent");
  ctx.actions.logout = core.logout;
  const init = async () => {
    root.innerHTML =
      '<div class="loading"><img src="/assets/brand/xiaozhi-avatar.png" alt="小智正在准备工作台"><p>正在准备校园工作台…</p></div>';
    try {
      await ctx.load();
    } catch (e) {
      ctx.data = core.read("catalog", { dishes: [], restaurants: [] });
      ctx.loadError = e.message;
    }
    ctx.route =
      location.hash.slice(1).split("?")[0] || core.read("route", "agent");
    if (!modules[ctx.route]) ctx.route = "agent";
    location.hash = ctx.route;
    await ctx.render();
  };
  init();
  setInterval(() => {
    if (ctx.route === "orders" && !document.querySelector("dialog"))
      ctx.render();
  }, 8000);
}
