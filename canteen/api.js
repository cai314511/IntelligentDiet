function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
// 智饷 C 端 API 层：统一请求、登录态、登录/注册模态框
const API_BASE = window.ZX_CONFIG?.apiBase || "/api";

function getToken() {
  return localStorage.getItem("zx_token") || "";
}
function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("zx_user")) || null;
  } catch {
    return null;
  }
}
function setSession(token, user) {
  localStorage.setItem("zx_token", token);
  localStorage.setItem("zx_user", JSON.stringify(user));
  try {
    const saved = JSON.parse(localStorage.getItem("zx_session"));
    if (saved) {
      saved.token = token;
      saved.user = user;
      localStorage.setItem("zx_session", JSON.stringify(saved));
    }
  } catch {}
}
function clearSession() {
  localStorage.removeItem("zx_token");
  localStorage.removeItem("zx_user");
  localStorage.removeItem("zx_session");
  localStorage.removeItem("zx_admin_token");
  localStorage.removeItem("zx_admin_name");
}

async function api(method, path, body) {
  try {
    const { api: request } = await import("/shared/core.js");
    const json = await request(path, { method, body });
    return { status: 200, json };
  } catch (error) {
    return {
      status: error.status || 0,
      json: { code: error.status || 0, message: error.message },
    };
  }
}

// ---- 登录 / 注册模态框 ----
function openLoginModal() {
  location.href = "/?identity=student";
}

function logout() {
  [
    "zx_session",
    "zx_token",
    "zx_user",
    "zx_admin_token",
    "zx_admin_name",
  ].forEach((key) => localStorage.removeItem(key));
  location.href = "/?identity=student";
}

function requireLogin() {
  if (getToken()) return true;
  openLoginModal();
  return false;
}

// 导航栏用户入口（登录按钮 / 用户名 + 退出）
function renderUserEntry() {
  const slot = document.getElementById("user-entry");
  if (!slot) return;
  const user = currentUser();
  const safeName = String(user?.xingming || user?.zhanghao || "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
  slot.innerHTML = user
    ? `<button id="account-home" onclick="openProfileModal()" class="flex items-center space-x-4 text-sm font-medium hover:opacity-80 transition" title="个人主页" aria-label="个人主页：${safeName}"><span>👋 ${safeName} <span class="text-appleBlue font-bold">¥${Number(user.jine).toFixed(2)}</span></span><span class="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-300 flex items-center justify-center text-appleBlue font-semibold shrink-0" aria-hidden="true">${safeName.slice(0, 1)}</span></button>
       <button onclick="logout()" class="text-sm text-appleLightGray hover:text-appleDark transition">退出</button>`
    : `<button onclick="openLoginModal()" class="bg-appleBlue text-white text-sm px-5 py-2 rounded-full font-medium hover:opacity-90 transition glass-btn-active">登录 / 注册</button>`;
}

// ---- 全局 toast 通知 ----
function toast(message, type = "info") {
  document.getElementById("zx-toast")?.remove();
  const el = document.createElement("div");
  el.id = "zx-toast";
  const colors = {
    info: "#0071E3",
    success: "#34c759",
    warning: "#ff9500",
    error: "#ff3b30",
  };
  el.style.cssText = `
    position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
    background: ${colors[type] || colors.info}; color: #fff; padding: 12px 28px;
    border-radius: 999px; box-shadow: 0 10px 30px rgba(0,0,0,0.18);
    z-index: 20000; font-weight: 600; font-size: 14px; transition: all .3s ease;
  `;
  el.innerText = message;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.marginTop = "-12px";
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

// 数据库存 UTC，展示统一转北京时间（UTC+8）
function fmtTime(t) {
  if (!t) return "";
  const d = new Date(String(t).replace(" ", "T") + "Z");
  if (isNaN(d)) return t;
  return d.toLocaleString("zh-CN", {
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
