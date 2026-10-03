import { esc, options, download } from "../../shared/core.js";
export function table(
  ctx,
  name,
  rows,
  columns,
  { id = "id", selectable = false } = {},
) {
  ctx.tables ??= {};
  const s = (ctx.tables[name] ??= {
    page: 1,
    size: 10,
    sort: "",
    ascending: true,
    selected: [],
  });
  let result = rows.filter(
    (r) =>
      !ctx.search ||
      columns.some((c) =>
        String(c.value ? c.value(r) : (r[c.key] ?? "")).includes(ctx.search),
      ),
  );
  if (s.sort) {
    const col = columns.find((c) => c.key === s.sort);
    result.sort((a, b) => {
      const aa = col.value ? col.value(a) : a[col.key],
        bb = col.value ? col.value(b) : b[col.key];
      return (
        (typeof aa === "number" && typeof bb === "number"
          ? aa - bb
          : String(aa ?? "").localeCompare(String(bb ?? ""), "zh-CN")) *
        (s.ascending ? 1 : -1)
      );
    });
  }
  s.page = Math.max(
    1,
    Math.min(s.page, Math.ceil(result.length / s.size) || 1),
  );
  const page = result.slice((s.page - 1) * s.size, s.page * s.size);
  s.rows = result;
  s.pageRows = page;
  s.id = id;
  s.columns = columns;
  return `<div class="table-tools"><div class="row wrap">${selectable ? `<span class="muted">已选 ${s.selected.length} 项</span>` : ""}<button class="btn ghost" data-action="table-export" data-table="${name}">导出当前结果</button></div><p>窄屏可左右滑动查看完整表格</p><select data-change="table-size" data-table="${name}" aria-label="每页条数">${options(["10", "20", "50"], s.size)}</select></div><div class="table-wrap"><table><thead><tr>${selectable ? `<th><input type="checkbox" aria-label="选择本页" data-change="table-select-all" data-table="${name}" ${page.length && page.every((r) => s.selected.includes(String(r[id]))) ? "checked" : ""}></th>` : ""}${columns.map((c) => `<th>${c.key === "actions" ? esc(c.title) : `<button class="btn ghost" style="padding:0;font-size:11px;min-height:24px" data-action="table-sort" data-table="${name}" data-key="${c.key}">${esc(c.title)} ${s.sort === c.key ? (s.ascending ? "↑" : "↓") : "↕"}</button>`}</th>`).join("")}</tr></thead><tbody>${page.length ? page.map((r) => `<tr>${selectable ? `<td><input type="checkbox" aria-label="选择记录 ${esc(r[id])}" data-change="table-select" data-table="${name}" data-id="${esc(r[id])}" ${s.selected.includes(String(r[id])) ? "checked" : ""}></td>` : ""}${columns.map((c) => `<td>${c.render ? c.render(r) : esc(c.value ? c.value(r) : r[c.key])}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${columns.length + Number(selectable)}" style="text-align:center;padding:40px">暂无符合当前范围的记录</td></tr>`}</tbody></table></div><div class="table-footer"><span>共 ${result.length} 条 · 第 ${s.page}/${Math.ceil(result.length / s.size) || 1} 页</span><div class="row"><button class="btn secondary" data-action="table-page" data-table="${name}" data-delta="-1" ${s.page === 1 ? "disabled" : ""}>上一页</button><button class="btn secondary" data-action="table-page" data-table="${name}" data-delta="1" ${s.page * s.size >= result.length ? "disabled" : ""}>下一页</button></div></div>`;
}
export const actions = {
  "table-sort": (ctx, e) => {
    const b = e.target.closest("[data-table]"),
      s = ctx.tables[b.dataset.table];
    s.ascending = s.sort === b.dataset.key ? !s.ascending : true;
    s.sort = b.dataset.key;
    ctx.render();
  },
  "table-size": (ctx, e) => {
    ctx.tables[e.target.dataset.table].size = Number(e.target.value);
    ctx.tables[e.target.dataset.table].page = 1;
    ctx.render();
  },
  "table-page": (ctx, e) => {
    const b = e.target.closest("[data-table]");
    ctx.tables[b.dataset.table].page += Number(b.dataset.delta);
    ctx.render();
  },
  "table-select": (ctx, e) => {
    const s = ctx.tables[e.target.dataset.table],
      id = e.target.dataset.id;
    s.selected = e.target.checked
      ? [...new Set([...s.selected, id])]
      : s.selected.filter((x) => x !== id);
    ctx.render();
  },
  "table-select-all": (ctx, e) => {
    const s = ctx.tables[e.target.dataset.table],
      ids = s.pageRows.map((r) => String(r[s.id]));
    s.selected = e.target.checked
      ? [...new Set([...s.selected, ...ids])]
      : s.selected.filter((x) => !ids.includes(x));
    ctx.render();
  },
  "table-export": (ctx, e) => {
    const s = ctx.tables[e.target.closest("[data-table]").dataset.table];
    download(
      "智饷数据.csv",
      s.rows.map((r) =>
        Object.fromEntries(
          s.columns
            .filter((c) => c.key !== "actions")
            .map((c) => [c.title, c.value ? c.value(r) : r[c.key]]),
        ),
      ),
    );
  },
};
