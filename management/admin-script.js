// 智饷 - 高校后勤管理系统主脚本文件 (前后端分离 API 交互版)

const API_BASE_URL = "/api";

// 全局 Toast 提示函数 (Apple 风格)
function showToast(message, type = "info") {
  const modalId = "admin-toast";
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = modalId;
  toast.className = "fade-in";

  let bgColor = "#0066cc"; // info
  if (type === "success") bgColor = "#34c759";
  if (type === "warning") bgColor = "#ff9500";
  if (type === "error") bgColor = "#ff3b30";

  toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${bgColor};
        color: white;
        padding: 12px 24px;
        border-radius: 14px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        z-index: 20000;
        font-weight: 600;
        font-size: 14px;
        transition: all 0.3s ease;
        pointer-events: none;
    `;
  toast.innerText = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(-10px)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("main-content");
  let current = location.hash.slice(1) || "dashboard";
  async function load(module) {
    current = module;
    if (location.hash !== "#" + module)
      history.pushState({ module }, "", "#" + module);
    document.body.classList.remove("zx-menu-open");
    document
      .querySelectorAll("[data-module]")
      .forEach((el) =>
        el.classList.toggle("active", el.dataset.module === module),
      );
    window.dispatchEvent(new Event("zx-admin-navigation"));
    try {
      if (!window.zxAdminRender)
        throw new Error("页面功能未能加载，请刷新重试");
      await window.zxAdminRender(module, root);
    } catch (e) {
      root.textContent = e.message;
    }
  }
  document.querySelector(".sidebar-menu").addEventListener("click", (e) => {
    const link = e.target.closest("[data-module]");
    if (link) {
      e.preventDefault();
      load(link.dataset.module);
    }
  });
  window.addEventListener("zx-admin-refresh", (e) => load(e.detail || current));
  document.getElementById("logout-btn").onclick = () => {
    [
      "zx_session",
      "zx_token",
      "zx_user",
      "zx_admin_token",
      "zx_admin_name",
    ].forEach((k) => localStorage.removeItem(k));
    location.href = "/?identity=admin";
  };
  if (!localStorage.getItem("zx_admin_token"))
    return location.replace("/?identity=admin");
  document.getElementById("admin-name").textContent =
    localStorage.getItem("zx_admin_name") || "管理员";
  load(current);
});
