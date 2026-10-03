import {
  api,
  post,
  put,
  del,
  esc,
  modal,
  options,
  closeModal,
  toast,
  dateTime,
  source,
} from "../../shared/core.js";
import { table } from "./table.js";
const schemas = {
  supplier: [
    ["contact", "联系人"],
    ["phone", "联系电话"],
    ["qualification", "资质"],
    ["product", "供货品类"],
    ["unitCost", "参考单价", "number"],
    ["deliveryStatus", "到货状态"],
  ],
  inventory: [
    ["dishId", "关联菜品", "dish"],
    ["batch", "批次"],
    ["quantity", "批次数量", "number"],
    ["prepared", "已备餐份数", "number"],
    ["unitCost", "每份成本", "number"],
    ["expiry", "保质期", "date"],
    ["arrival", "到货日期", "date"],
  ],
  procurement: [
    ["dishId", "关联菜品", "dish"],
    ["supplier", "供应商"],
    ["quantity", "采购数量", "number"],
    ["arrival", "计划到货", "date"],
    ["note", "计划说明"],
  ],
  safety: [
    ["category", "检查类型"],
    ["contact", "负责人"],
    ["description", "巡检内容"],
    ["temperature", "留样 / 温度记录"],
    ["dueAt", "整改期限", "date"],
  ],
  conservation: [
    ["category", "项目类别"],
    ["contact", "负责人"],
    ["wasteKg", "餐厨回收 kg", "number"],
    ["savedCost", "节省成本", "number"],
    ["description", "措施与成效"],
  ],
};
function type(ctx) {
  return ctx.route === "supply"
    ? ctx.supplyTab || "procurement"
    : ctx.route === "safety"
      ? "safety"
      : "conservation";
}
export async function render(ctx) {
  if (ctx.route === "audit") {
    const rows = (await api("/operations/audit")).data;
    return `<div class="page-head"><h1>操作记录与撤销</h1><p>保留运营台账修改前后的记录；后续有修改时不覆盖撤销。</p></div>${table(
      ctx,
      "audit",
      rows,
      [
        { key: "id", title: "记录" },
        { key: "user_id", title: "操作人 ID" },
        { key: "entity_id", title: "业务记录 ID" },
        {
          key: "action",
          title: "操作",
          value: (r) =>
            ({ create: "新增", update: "编辑", delete: "删除" })[r.action] ||
            "撤销",
        },
        {
          key: "created_at",
          title: "时间",
          value: (r) => dateTime(r.created_at),
        },
        {
          key: "actions",
          title: "操作",
          render: (r) =>
            ["create", "update", "delete"].includes(r.action)
              ? `<button class="btn ghost" data-action="undo-operation" data-id="${r.id}">撤销</button>`
              : "—",
        },
      ],
    )}`;
  }
  const t = type(ctx),
    title = {
      supplier: "供应商管理",
      inventory: "库存批次",
      procurement: "采购计划",
      safety: "食品安全监管",
      conservation: "节约校园",
    }[t];
  const records = (await api(`/operations?type=${t}`)).data;
  ctx.operationRecords = records;
  const rows = records.filter((r) => {
    const p = r.payload,
      day = new Date(r.updatedAt.replace(" ", "T") + "Z").toLocaleDateString(
        "sv-SE",
        { timeZone: "Asia/Shanghai" },
      );
    return (
      (!ctx.filter.campus || p.campus === ctx.filter.campus) &&
      (!ctx.filter.restaurantId ||
        Number(p.restaurantId) === Number(ctx.filter.restaurantId)) &&
      (!ctx.filter.window || p.window === ctx.filter.window) &&
      (["supplier", "inventory"].includes(t) ||
        (day >= ctx.filter.from && day <= ctx.filter.to))
    );
  });
  let forecast = "";
  if (t === "conservation") {
    const f = (await api(`/insights/forecast?${ctx.query()}`)).data;
    forecast = `<section class="card info-box" style="margin-bottom:20px"><h3>节约从供需决策开始</h3><p style="margin-top:10px">预测备餐余量 ${f.expectedWaste ?? "—"} 份 · 预计节省 ${f.savings === null ? "—" : `¥${f.savings.toFixed(2)}`}</p><a href="#forecast" class="btn secondary" style="margin-top:15px">调整备餐与采购计划 →</a></section>`;
  }
  return `<div class="page-head row spread wrap"><div><span class="eyebrow">CAMPUS OPERATIONS</span><h1>${title}</h1><p>记录、执行、更新与审计形成闭环。</p></div><div class="row wrap"><button class="btn secondary" data-action="operation-batch">批量更新状态</button><button class="btn" data-action="new-operation">新增记录 ＋</button></div></div>${
    ctx.route === "supply"
      ? `<div class="tabs" style="margin-bottom:20px">${[
          ["procurement", "采购计划"],
          ["inventory", "库存批次"],
          ["supplier", "供应商"],
        ]
          .map(
            ([key, label]) =>
              `<button data-action="supply-tab" data-tab="${key}" class="${t === key ? "active" : ""}">${label}</button>`,
          )
          .join("")}</div>`
      : ""
  }${forecast}${table(
    ctx,
    "operations",
    rows,
    [
      { key: "title", title: "记录名称" },
      {
        key: "campus",
        title: "校区 / 食堂",
        value: (r) =>
          `${r.payload.campus || "全校"} · ${ctx.data.restaurants.find((a) => a.id === Number(r.payload.restaurantId))?.name || r.payload.restaurant || "—"}`,
      },
      {
        key: "description",
        title: "关键内容",
        value: (r) =>
          r.payload.description ||
          r.payload.note ||
          r.payload.product ||
          r.payload.batch ||
          r.payload.category ||
          "—",
        render: (r) =>
          `<div class="operation-note">${esc(r.payload.description || r.payload.note || r.payload.product || r.payload.batch || r.payload.category || "—")}</div>`,
      },
      {
        key: "quantity",
        title: "数量 / 成本",
        value: (r) =>
          `${r.payload.quantity ?? r.payload.prepared ?? r.payload.wasteKg ?? "—"} / ¥${r.payload.unitCost ?? r.payload.savedCost ?? "—"}`,
      },
      {
        key: "costChange",
        title: "单位成本变化",
        value: (r) =>
          r.payload.previousUnitCost !== undefined &&
          r.payload.unitCost !== undefined
            ? `¥${(Number(r.payload.unitCost) - Number(r.payload.previousUnitCost)).toFixed(2)}`
            : "—",
      },
      { key: "status", title: "状态" },
      {
        key: "updatedAt",
        title: "最后更新",
        value: (r) => dateTime(r.updatedAt),
      },
      {
        key: "actions",
        title: "操作",
        render: (r) =>
          `<button class="btn ghost" data-action="edit-operation" data-id="${r.id}">编辑</button><button class="btn ghost" data-action="delete-operation" data-id="${r.id}">删除</button>`,
      },
    ],
    { selectable: true },
  )}${source("校园运营台账", records[0]?.updatedAt)}`;
}
function editor(ctx, id) {
  const t = type(ctx),
    r = ctx.operationRecords.find((r) => r.id === Number(id)) || {
      payload: {},
      status: "运行中",
    },
    p = r.payload;
  ctx.editOperation = r;
  modal(
    id ? "编辑运营记录" : "新增运营记录",
    `<form data-action="save-operation" data-id="${id || ""}"><label>记录名称</label><input name="title" required maxlength="120" value="${esc(r.title)}"><div class="admin-input-grid"><div><label>食堂 / 校区</label><select name="restaurantId">${options([{ value: 0, label: "全校" }, ...ctx.data.restaurants.map((a) => ({ value: a.id, label: `${a.campus} · ${a.name}` }))], p.restaurantId || 0)}</select></div><div><label>窗口</label><input name="window" value="${esc(p.window)}" maxlength="80"></div></div>${schemas[t].map(([key, label, kind]) => `<label>${label}</label>${kind === "dish" ? `<select name="${key}">${options([{ value: 0, label: "不关联菜品" }, ...ctx.data.dishes.map((d) => ({ value: d.id, label: `${d.name} · ${d.restaurant}` }))], p[key] || 0)}</select>` : `<input name="${key}" type="${kind || "text"}" ${kind === "number" ? 'min="0" step="0.01" max="100000"' : ""} value="${esc(p[key])}" maxlength="2000">`}`).join("")}<label>状态</label><input name="status" required maxlength="30" value="${esc(r.status)}" list="operation-status"><datalist id="operation-status">${["运行中", "待采购", "已下单", "已到货", "处理中", "已整改", "已闭环"].map((s) => `<option value="${s}">`).join("")}</datalist><div class="actions"><button class="btn">保存记录</button></div></form>`,
  );
}
export const actions = {
  "operation-batch": (ctx) => {
    const ids = ctx.tables.operations?.selected || [];
    if (!ids.length) throw new Error("请先选择记录");
    modal(
      "批量更新运营状态",
      `<form data-action="operation-batch-save"><p>已选择 ${ids.length} 项</p><label>新状态</label><select name="status">${options(["运行中", "待采购", "已下单", "已到货", "处理中", "已整改", "已闭环"])}</select><div class="actions"><button class="btn">确认更新</button></div></form>`,
    );
  },
  "operation-batch-save": async (ctx, e) => {
    const status = new FormData(e.target).get("status"),
      ids = ctx.tables.operations.selected;
    for (const id of ids) {
      const r = ctx.operationRecords.find((r) => String(r.id) === id);
      if (r)
        await put(`/operations/${r.id}`, {
          title: r.title,
          status,
          payload: r.payload,
        });
    }
    ctx.tables.operations.selected = [];
    closeModal();
    toast("所选运营状态已更新", "success");
    ctx.render();
  },
  "supply-tab": (ctx, e) => {
    ctx.supplyTab = e.target.closest("[data-tab]").dataset.tab;
    ctx.render();
  },
  "new-operation": (ctx) => editor(ctx),
  "edit-operation": (ctx, e) =>
    editor(ctx, e.target.closest("[data-id]").dataset.id),
  "save-operation": async (ctx, e) => {
    const f = Object.fromEntries(new FormData(e.target)),
      t = type(ctx),
      r = ctx.data.restaurants.find((r) => r.id === Number(f.restaurantId)),
      p = {
        ...ctx.editOperation.payload,
        campus: r?.campus || "",
        restaurantId: Number(f.restaurantId) || null,
        window: f.window,
      };
    for (const [key, , kind] of schemas[t])
      p[key] =
        kind === "number" || kind === "dish" ? Number(f[key] || 0) : f[key];
    if (
      p.unitCost !== undefined &&
      ctx.editOperation.payload.unitCost !== undefined &&
      Number(p.unitCost) !== Number(ctx.editOperation.payload.unitCost)
    )
      p.previousUnitCost = Number(ctx.editOperation.payload.unitCost);
    await api(
      e.target.dataset.id
        ? `/operations/${e.target.dataset.id}`
        : "/operations",
      {
        method: e.target.dataset.id ? "PUT" : "POST",
        body: { type: t, title: f.title, status: f.status, payload: p },
      },
    );
    closeModal();
    toast("运营记录已保存", "success");
    ctx.render();
  },
  "delete-operation": (ctx, e) => {
    modal(
      "删除运营记录",
      `<p>确认删除此记录？可在操作记录中撤销。</p><div class="actions"><button class="btn danger" data-action="delete-operation-confirm" data-id="${e.target.closest("[data-id]").dataset.id}">确认删除</button></div>`,
    );
  },
  "delete-operation-confirm": async (ctx, e) => {
    await del(`/operations/${e.target.closest("[data-id]").dataset.id}`);
    closeModal();
    toast("记录已删除", "success");
    ctx.render();
  },
  "undo-operation": async (ctx, e) => {
    await post(
      `/operations/audit/${e.target.closest("[data-id]").dataset.id}/undo`,
      {},
    );
    toast("操作已撤销", "success");
    ctx.render();
  },
};
