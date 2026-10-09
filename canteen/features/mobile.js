/** 学生端手机导航和可视区域适配；桌面继续使用原导航。 */
export function mountMobileNavigation() {
  const nav = document.createElement("nav");
  nav.className = "zx-mobile-nav";
  nav.setAttribute("aria-label", "学生端导航");
  nav.innerHTML = [
    ["order", "点餐", "utensils"],
    ["nutrition", "营养", "leaf"],
    ["agent", "小智", ""],
    ["orders", "订单", "receipt"],
    ["profile", "我的", "user"],
  ].map(([view, label, icon]) => `<button type="button" data-mobile-view="${view}" aria-label="${view === "agent" ? "召唤小智" : label}">${view === "agent" ? '<span class="zx-mobile-agent-icon"><img src="/assets/brand/xiaozhi-mobile-avatar.png" alt="" width="64" height="64"></span>' : `<i class="fa-solid fa-${icon}" aria-hidden="true"></i>`}<span>${label}</span></button>`).join("");
  document.body.append(nav);
  function sync() {
    const view = document.getElementById("agent-screen") ? "agent" : location.hash.slice(1) || "order";
    nav.querySelectorAll("button").forEach(button => {
      if (button.dataset.mobileView === view) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }
  nav.addEventListener("click", async event => {
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    const view = button.dataset.mobileView;
    button.disabled = true;
    try {
      if (view === "agent") {
        if (!document.getElementById("agent-screen")) await window.openAgent();
      } else if (view === "profile") await window.openProfileModal();
      else window.navigate(view);
    } catch (error) {
      window.toast?.(error.message || "页面暂时无法打开，请重试", "error");
    } finally {
      button.disabled = false;
      sync();
    }
  });
  document.addEventListener("zx:navigation", sync);
  window.addEventListener("popstate", sync);
  window.addEventListener("hashchange", sync);
  const viewport = window.visualViewport;
  function resize() {
    const height = viewport?.height || window.innerHeight;
    const editing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
    document.body.classList.toggle("zx-keyboard-open", editing && window.innerHeight - height > 120);
    document.documentElement.style.setProperty("--zx-viewport-height", height + "px");
    document.documentElement.style.setProperty("--zx-viewport-top", (viewport?.offsetTop || 0) + "px");
  }
  viewport?.addEventListener("resize", resize);
  viewport?.addEventListener("scroll", resize);
  window.addEventListener("resize", resize);
  document.addEventListener("focusin", resize);
  document.addEventListener("focusout", () => requestAnimationFrame(resize));
  resize();
  sync();
}
