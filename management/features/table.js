import { esc, button, notice } from "../../shared/feature-ui.js";
export function table(root, rows, columns, actions = {}, key = "id") {
  let query = "",
    page = 1,
    sort = columns[0]?.key,
    ascending = true,
    selected = new Set();
  function visible() {
    return rows
      .filter((r) =>
        JSON.stringify(r).toLowerCase().includes(query.toLowerCase()),
      )
      .sort((a, b) => {
        const x = a[sort],
          y = b[sort];
        return (
          (typeof x === "number" && typeof y === "number"
            ? x - y
            : String(x ?? "").localeCompare(String(y ?? ""))) *
          (ascending ? 1 : -1)
        );
      });
  }
  function draw() {
    const list = visible(),
      pages = Math.max(1, Math.ceil(list.length / 10));
    page = Math.min(page, pages);
    root.innerHTML = `<div class="zx-row" style="margin-bottom:16px"><input class="zx-search" style="max-width:320px" placeholder="搜索当前列表" value="${esc(query)}" aria-label="搜索当前列表">${button("导出当前结果", "export")}${Object.keys(
      actions,
    )
      .filter((k) => k.startsWith("bulk:"))
      .map((k) => button(k.slice(5), k))
      .join(
        "",
      )}</div><div class="zx-table-scroll"><table class="zx-table"><thead><tr><th><input type="checkbox" aria-label="选择当前页" data-select-page></th>${columns.map((c) => `<th><button data-sort="${esc(c.key)}">${esc(c.label)}${sort === c.key ? (ascending ? " ↑" : " ↓") : ""}</button></th>`).join("")}<th>操作</th></tr></thead><tbody>${list
      .slice((page - 1) * 10, page * 10)
      .map(
        (r) =>
          `<tr><td><input type="checkbox" data-select="${esc(r[key])}" aria-label="选择记录 ${esc(r[key])}" ${selected.has(String(r[key])) ? "checked" : ""}></td>${columns.map((c) => `<td>${c.render ? c.render(r) : esc(r[c.key] ?? "—")}</td>`).join("")}<td>${Object.keys(
            actions,
          )
            .filter((k) => !k.startsWith("bulk:"))
            .map((k) =>
              button(k, k).replace(
                `data-action="${esc(k)}"`,
                `data-action="${esc(k)}" data-id="${esc(r[key])}"`,
              ),
            )
            .join("")}</td></tr>`,
      )
      .join(
        "",
      )}</tbody></table></div>${list.length ? "" : notice("当前范围暂无记录。")}<div class="zx-row" style="margin-top:14px">${button("上一页", "previous")}<span>${page}/${pages} · ${list.length}条 · 已选${selected.size}条</span>${button("下一页", "next")}</div><div data-status></div>`;
    root.querySelector("input.zx-search").oninput = (e) => {
      query = e.target.value;
      page = 1;
      const start = e.target.selectionStart;
      draw();
      const input = root.querySelector("input.zx-search");
      input.focus();
      input.setSelectionRange(start, start);
    };
    root.onclick = async (e) => {
      const sortButton = e.target.closest("[data-sort]");
      if (sortButton) {
        ascending = sort === sortButton.dataset.sort ? !ascending : true;
        sort = sortButton.dataset.sort;
        draw();
        return;
      }
      const b = e.target.closest("[data-action]");
      if (!b) return;
      const action = b.dataset.action;
      if (action === "previous") {
        page = Math.max(1, page - 1);
        draw();
        return;
      }
      if (action === "next") {
        page = Math.min(pages, page + 1);
        draw();
        return;
      }
      if (action === "export") {
        const csv = [
          columns.map((c) => c.label),
          ...list.map((r) => columns.map((c) => r[c.key] ?? "")),
        ]
          .map((row) =>
            row
              .map(
                (x) =>
                  '"' +
                  String(/^[=+@-]/.test(String(x)) ? "'" + x : x).replace(
                    /"/g,
                    '""',
                  ) +
                  '"',
              )
              .join(","),
          )
          .join("\n");
        const url = URL.createObjectURL(
          new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = "当前记录.csv";
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      b.disabled = true;
      try {
        await actions[action]?.(
          action.startsWith("bulk:")
            ? rows.filter((r) => selected.has(String(r[key])))
            : rows.find((r) => String(r[key]) === b.dataset.id),
        );
      } catch (err) {
        root.querySelector("[data-status]").innerHTML = notice(
          err.message,
          "error",
        );
      } finally {
        if (b.isConnected) b.disabled = false;
      }
    };
    root.onchange = (e) => {
      if (e.target.matches("[data-select-page]")) {
        list
          .slice((page - 1) * 10, page * 10)
          .forEach((r) =>
            e.target.checked
              ? selected.add(String(r[key]))
              : selected.delete(String(r[key])),
          );
        draw();
      } else if (e.target.dataset.select) {
        e.target.checked
          ? selected.add(e.target.dataset.select)
          : selected.delete(e.target.dataset.select);
      }
    };
  }
  draw();
}
