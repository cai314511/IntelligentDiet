export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const money = (value) => `¥${Number(value || 0).toFixed(2)}`;
export const dateTime = (value) =>
  value
    ? new Date(
        /[zZ]|[+-]\d{2}:\d{2}$/.test(value)
          ? value
          : String(value).replace(" ", "T") + "Z",
      ).toLocaleString("zh-CN", {
        hour12: false,
        timeZone: "Asia/Shanghai",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
export const today = () =>
  new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
export const session = () => {
  try {
    return JSON.parse(localStorage.getItem("zx_session"));
  } catch {
    return null;
  }
};
export function saveSession(value) {
  localStorage.setItem("zx_session", JSON.stringify(value));
  localStorage.setItem("zx_token", value.token);
  localStorage.setItem("zx_user", JSON.stringify(value.user));
  localStorage.removeItem("zx_admin_token");
  localStorage.removeItem("zx_admin_name");
  if (value.identity === "admin") {
    localStorage.setItem("zx_admin_token", value.token);
    localStorage.setItem("zx_admin_name", value.user.xingming);
  }
}
export function logout() {
  [
    "zx_session",
    "zx_token",
    "zx_user",
    "zx_admin_token",
    "zx_admin_name",
  ].forEach((key) => localStorage.removeItem(key));
  location.href = "/";
}
export function guard(identity) {
  const s = session();
  if (!s || s.identity !== identity) {
    location.replace(`/?identity=${identity}`);
    return null;
  }
  return s;
}
export const scopeKey = (key) =>
  `zx_${session()?.user.school_id}_${session()?.user.id}_${key}`;
export function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(scopeKey(key))) ?? fallback;
  } catch {
    return fallback;
  }
}
export function store(key, value) {
  localStorage.setItem(scopeKey(key), JSON.stringify(value));
}
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
export async function api(path, { method = "GET", body, retry = true } = {}) {
  const s = session(),
    base = window.ZX_CONFIG?.apiBase || "/api";
  let url = base + path;
  const headers = { "Content-Type": "application/json" };
  if (s?.token) headers.Authorization = `Bearer ${s.token}`;
  const controller = new AbortController(),
    timeout = setTimeout(
      () => controller.abort(),
      path.startsWith("/tasks") ||
        path.startsWith("/nutrition/recognize") ||
        path.startsWith("/nutrition/deep-report")
        ? Math.max(window.ZX_CONFIG?.requestTimeout || 15000, 45000)
        : window.ZX_CONFIG?.requestTimeout || 15000,
    );
  try {
    const r = await fetch(url, {
      method,
      headers,
      signal: controller.signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (r.status === 401 && !path.includes("/login")) {
        [
          "zx_session",
          "zx_token",
          "zx_user",
          "zx_admin_token",
          "zx_admin_name",
        ].forEach((k) => localStorage.removeItem(k));
        location.replace("/");
      }
      throw new ApiError(data.message || `请求失败（${r.status}）`, r.status);
    }
    return data;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (method === "GET" && retry)
      return api(path, { method, body, retry: false });
    throw new ApiError(
      e.name === "AbortError" ? "请求超时，请重试" : "服务暂不可用，请重试",
      0,
    );
  } finally {
    clearTimeout(timeout);
  }
}
export const post = (path, body) => api(path, { method: "POST", body });
export const put = (path, body) => api(path, { method: "PUT", body });
export const del = (path) => api(path, { method: "DELETE" });
export function toast(message, type = "info") {
  document.querySelector("#toast")?.remove();
  const el = document.createElement("div");
  el.id = "toast";
  el.className = `toast ${type}`;
  el.textContent = message;
  el.setAttribute("role", "status");
  document.body.append(el);
  setTimeout(() => el.remove(), 4500);
}
export function modal(title, content) {
  document.querySelector("#dialog")?.remove();
  const d = document.createElement("dialog");
  d.id = "dialog";
  d.innerHTML = `<header class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="关闭">×</button></header>${content}`;
  document.body.append(d);
  d.querySelector("[data-close]").onclick = () => d.close();
  d.addEventListener("click", (e) => {
    if (e.target === d) d.close();
  });
  d.addEventListener("close", () => d.remove());
  d.showModal();
  return d;
}
export const closeModal = () => document.querySelector("#dialog")?.close();
export const empty = (title, description = "", action = "") =>
  `<div class="empty"><img src="/assets/brand/xiaozhi-avatar.png" alt="小智"><h3>${esc(title)}</h3><p>${esc(description)}</p>${action}</div>`;
export const errorState = (message) =>
  empty(
    "暂时无法加载",
    message,
    '<button class="btn" data-action="refresh">重新加载</button>',
  );
export const source = (name, time) =>
  `<small class="source">${esc(name)} · 更新 ${esc(dateTime(time))}</small>`;
export function safeUrl(value) {
  try {
    const u = new URL(value, location.origin);
    return ["http:", "https:"].includes(u.protocol) ? esc(u.href) : "";
  } catch {
    return "";
  }
}
export function chart(series, key = "value", label = "label") {
  const max = Math.max(1, ...series.map((r) => Number(r[key]) || 0));
  return `<div class="chart" role="img" aria-label="趋势图">${series.map((r) => `<div class="chart-column"><small>${r[key] === null || r[key] === undefined ? "—" : esc(Number(r[key]).toFixed(0))}</small><i style="height:${Math.max(2, (Number(r[key] || 0) / max) * 120)}px"></i><span>${esc(r[label])}</span></div>`).join("")}</div>`;
}
export const options = (rows, current) =>
  rows
    .map((r) => {
      const value = typeof r === "string" ? r : r.value,
        label = typeof r === "string" ? r : r.label;
      return `<option value="${esc(value)}" ${String(current) === String(value) ? "selected" : ""}>${esc(label)}</option>`;
    })
    .join("");
export function download(name, rows) {
  const fields = Object.keys(rows[0] || {}),
    csv =
      "\ufeff" +
      [
        fields,
        ...rows.map((r) =>
          fields.map((k) =>
            typeof r[k] === "object" ? JSON.stringify(r[k]) : r[k],
          ),
        ),
      ]
        .map((row) =>
          row
            .map((x) => '"' + String(x ?? "").replaceAll('"', '""') + '"')
            .join(","),
        )
        .join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
export function applySchool(school) {
  if (school?.id) document.body.dataset.school = school.id;
  document.documentElement.style.removeProperty("--school-background");
  if (school?.background) {
    try {
      const u = new URL(school.background, location.origin);
      if (["http:", "https:"].includes(u.protocol))
        document.documentElement.style.setProperty(
          "--school-background",
          `url(${JSON.stringify(u.href)})`,
        );
    } catch {}
  }
  if (/^#[0-9a-f]{6}$/i.test(school?.accent))
    document.documentElement.style.setProperty("--school", school.accent);
}

export async function streamTask(body, onProgress) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(
      (window.ZX_CONFIG?.apiBase || "/api") + "/tasks",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session()?.token || ""}`,
        },
        body: JSON.stringify({ ...body, stream: true }),
      },
    );
    if (!response.ok)
      throw new Error((await response.json()).message || "无法生成方案");
    const reader = response.body.getReader(),
      decoder = new TextDecoder();
    let buffer = "",
      plan;
    const consume = (line) => {
      if (!line.trim()) return;
      const event = JSON.parse(line);
      if (event.type === "progress") onProgress(event.data);
      if (event.type === "plan") plan = event.data;
      if (event.type === "error") throw new Error(event.data);
    };
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) consume(line);
      if (done) break;
    }
    consume(buffer);
    if (!plan) throw new Error("方案未完成，请重试");
    return plan;
  } finally {
    clearTimeout(timer);
  }
}
