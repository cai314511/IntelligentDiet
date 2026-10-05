import { preflight, scenario } from "../../shared/scenario.js";
import { applySchool } from "../../shared/core.js";
import {
  api,
  esc,
  session,
  read,
  store,
  button,
  card,
  notice,
  bind,
  dialog,
} from "../../shared/feature-ui.js";
import { renderOrders } from "./orders.js";
import { openAgent, closeAgent } from "./agent.js";
import { renderMenu } from "./menu.js";
import { renderNutrition } from "./nutrition.js";
import { renderCampus } from "./campus.js";
window.openAgent = openAgent;
window.renderOrdersView = renderOrders;
window.renderOrderView = renderMenu;
window.renderNutritionView = renderNutrition;
window.renderSocialView = () => renderCampus("social");
window.renderCultureView = () => renderCampus("culture");
window.startSmartRecommendation = () => openAgent();
window.toggleAI = () => openAgent();
window.executeAiOrderCheckout = (id, name) =>
  openAgent("我想吃" + name, { dishId: Number(id) });
window.sendAiMessage = (text) => openAgent(String(text));
const originalNavigate = window.navigate;
window.navigate = (view) => {
  closeAgent();
  if (["order", "nutrition", "social", "culture", "orders"].includes(view)) {
    store("current-view", view);
    if (location.hash !== "#" + view)
      history.pushState({ view }, "", "#" + view);
  }
  return originalNavigate(view);
};
window.addEventListener("popstate", () => {
  closeAgent();
  if (location.hash === "#agent") {
    originalNavigate("order");
    openAgent();
  } else originalNavigate(location.hash.slice(1) || "order");
});
window.openSystemSettings = () => {
  const d = dialog(
    "系统设置",
    `<p>${esc(session()?.school?.name)} · ${esc(session()?.campus || "全校")} · 已登录校园账号</p><div class="zx-row" style="margin:18px 0">${button("切换学校 / 身份", "switch")}${button("演示前自检", "checks")}${button("演示流程", "scenario")}</div>${window.renderThemeUniverse()}<div data-status></div>`,
  );
  bind(d, {
    switch: () => {
      window.logout();
    },
    checks: () => {
      d.close();
      return preflight();
    },
    scenario: () => {
      d.close();
      return scenario();
    },
  });
};
const settings = document.createElement("button");
settings.className = "relative text-appleText hover:text-appleBlue transition";
settings.title = "系统设置";
settings.setAttribute("aria-label", "系统设置");
settings.innerHTML = '<i class="fa-solid fa-gear"></i>';
settings.onclick = window.openSystemSettings;
document.getElementById("user-entry")?.parentElement.prepend(settings);
const saved = session();
if (saved?.school) {
  applySchool(saved.school);
  document.documentElement.style.setProperty(
    "--zx-primary",
    saved.school.accent || "#0071e3",
  );
  document.title = "智饷 · " + saved.school.name;
  const brand = document.querySelector("nav [onclick=\"navigate('order')\"]");
  if (brand) {
    brand.title = saved.school.name;
    brand.insertAdjacentHTML(
      "beforeend",
      `<span style="display:block;font-size:10px;font-weight:400;color:#86868b">${esc(saved.school.shortName || saved.school.name)}</span>`,
    );
  }
}
async function boot() {
  window.hideCart();
  try {
    window.syncLiveCatalog((await api("/workspace/catalog")).data);
    if (location.hash === "#agent") {
      originalNavigate("order");
      await openAgent();
    } else
      window.navigate(location.hash.slice(1) || "order");
  } catch (e) {
    document.getElementById("app-root").innerHTML =
      notice(e.message, "error") + button("重新加载", "retry");
    bind(document.getElementById("app-root"), { retry: boot });
  }
}
boot();

const mobileMenu = document.createElement("button");
mobileMenu.className = "zx-mobile-menu";
mobileMenu.setAttribute("aria-label", "打开功能菜单");
mobileMenu.textContent = "☰";
mobileMenu.onclick = () => {
  const d = dialog(
    "功能菜单",
    `<div class="zx-row">${[
      ["order", "智能点餐"],
      ["nutrition", "AI营养师"],
      ["social", "食话广场"],
      ["culture", "文创活动"],
      ["orders", "我的订单"],
    ]
      .map(([id, title]) => button(title, id))
      .join("")}</div>`,
  );
  bind(
    d,
    Object.fromEntries(
      ["order", "nutrition", "social", "culture", "orders"].map((id) => [
        id,
        () => {
          d.close();
          window.navigate(id);
        },
      ]),
    ),
  );
};
document
  .querySelector("nav [onclick=\"navigate('order')\"]")
  ?.before(mobileMenu);
