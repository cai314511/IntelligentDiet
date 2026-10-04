import { api, esc, money, dateTime, session, read, store } from "./core.js";
export { api, esc, money, dateTime, session, read, store };
export const button = (text, action, primary = false) =>
  `<button type="button" class="zx-button ${primary ? "zx-primary" : ""}" data-action="${esc(action)}">${esc(text)}</button>`;
export const card = (title, body) =>
  `<section class="zx-card bg-white rounded-[20px] shadow-apple border border-gray-100"><h3>${esc(title)}</h3>${body}</section>`;
export const options = (rows, value = "") =>
  rows
    .map(
      ([id, name]) =>
        `<option value="${esc(id)}" ${String(id) === String(value) ? "selected" : ""}>${esc(name)}</option>`,
    )
    .join("");
export const source = (name, time) =>
  `<p class="zx-source">来源：${esc(name || "业务记录")} · 更新：${esc(dateTime(time))}</p>`;
export const field = (name, label, control) =>
  `<label class="zx-field">${esc(label)}${control
    .replace(
      "<input",
      '<input aria-label="' + esc(label) + '" name="' + name + '"',
    )
    .replace(
      "<select",
      '<select aria-label="' + esc(label) + '" name="' + name + '"',
    )
    .replace(
      "<textarea",
      '<textarea aria-label="' + esc(label) + '" name="' + name + '"',
    )}</label>`;
export const notice = (message, type = "info") =>
  `<div class="zx-status ${type}" role="status">${esc(message)}</div>`;
export function bind(root, actions) {
  root.onclick = async (e) => {
    const b = e.target.closest("[data-action]");
    if (!b || !root.contains(b)) return;
    const action = actions[b.dataset.action];
    if (!action) return;
    b.disabled = true;
    try {
      await action(b, e);
    } catch (error) {
      (window.toast || window.showToast)?.(error.message, "error");
      const status = root.querySelector("[data-status]");
      if (status) status.innerHTML = notice(error.message, "error");
    } finally {
      if (b.isConnected) b.disabled = false;
    }
  };
}
export function formData(root) {
  return Object.fromEntries(new FormData(root));
}
export function dialog(title, body) {
  document.getElementById("feature-dialog")?.remove();
  const d = document.createElement("dialog");
  d.id = "feature-dialog";
  d.className = "zx-dialog";
  d.innerHTML = `<header><h2>${esc(title)}</h2><button type="button" aria-label="关闭">×</button></header>${body}`;
  d.querySelector("header button").onclick = () => d.close();
  d.addEventListener("close", () => d.remove());
  document.body.append(d);
  d.showModal();
  return d;
}
export function bars(series, key = "revenue") {
  const max = Math.max(1, ...series.map((x) => Number(x[key]) || 0));
  return `<div class="zx-chart">${series.map((x) => `<div><span>${esc(x[key] ?? "—")}</span><i style="height:${Math.max(2, ((Number(x[key]) || 0) / max) * 100)}px"></i><small>${esc(x.label)}</small></div>`).join("")}</div>`;
}
