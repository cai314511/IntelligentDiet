import {
  api,
  put,
  esc,
  modal,
  options,
  closeModal,
  toast,
  dateTime,
  source,
} from "../../shared/core.js";
import { table } from "./table.js";
function inRange(ctx, r) {
  const raw = r.addtime || r.updatedAt;
  if (!raw) return true;
  const day = new Date(raw.replace(" ", "T") + "Z").toLocaleDateString(
    "sv-SE",
    { timeZone: "Asia/Shanghai" },
  );
  return day >= ctx.filter.from && day <= ctx.filter.to;
}
export async function render(ctx) {
  const tab = ctx.feedbackTab || "messages";
  let html = "";
  if (tab === "messages") {
    const rows = ctx
      .scoped((await api("/social/messages")).data)
      .filter(
        (r) =>
          inRange(ctx, r) &&
          (!ctx.feedbackCategory || r.category === ctx.feedbackCategory) &&
          (!ctx.feedbackStatus || r.workflow === ctx.feedbackStatus),
      );
    ctx.feedbackRows = rows;
    html = `<div class="filters" style="margin-bottom:15px"><select data-change="feedback-category">${options([{ value: "", label: "全部类型" }, ...["投诉", "建议", "菜品问题", "服务问题"].map((c) => ({ value: c, label: c }))], ctx.feedbackCategory)}</select><select data-change="feedback-status">${options([{ value: "", label: "全部状态" }, ...["待处理", "处理中", "已闭环"].map((c) => ({ value: c, label: c }))], ctx.feedbackStatus)}</select></div>${table(
      ctx,
      "feedback",
      rows,
      [
        { key: "category", title: "类别" },
        {
          key: "content",
          title: "反馈内容",
          render: (r) => `<div class="operation-note">${esc(r.content)}</div>`,
        },
        {
          key: "priority",
          title: "优先级",
          render: (r) =>
            `<span class="badge ${r.priority === "紧急" ? "bad" : ""}">${esc(r.priority)}</span>`,
        },
        { key: "owner", title: "负责人" },
        {
          key: "due_at",
          title: "处理时限",
          value: (r) => (r.due_at ? dateTime(r.due_at) : "—"),
        },
        { key: "workflow", title: "状态" },
        {
          key: "replycontent",
          title: "校方回复",
          render: (r) =>
            `<div class="operation-note">${esc(r.replycontent || "待回复")}</div>`,
        },
        { key: "addtime", title: "时间", value: (r) => dateTime(r.addtime) },
        {
          key: "actions",
          title: "操作",
          render: (r) =>
            `<button class="btn ghost" data-action="feedback-handle" data-id="${r.id}">处理 / 回复</button>`,
        },
      ],
    )}`;
  }
  if (tab === "reviews") {
    const rows = (await api("/social/reviews")).data
      .map((r) => ({
        ...r,
        dish: ctx.data.dishes.find((d) => d.id === r.dishId),
      }))
      .filter((r) => r.dish && ctx.scoped([r.dish]).length && inRange(ctx, r));
    ctx.reviewRows = rows;
    html = table(ctx, "reviews", rows, [
      { key: "dish", title: "菜品", value: (r) => r.dish.name },
      { key: "rating", title: "评分" },
      {
        key: "content",
        title: "评价内容",
        render: (r) => `<div class="operation-note">${esc(r.content)}</div>`,
      },
      {
        key: "reply",
        title: "校方回复",
        render: (r) =>
          `<div class="operation-note">${esc(r.reply || "待回复")}</div>`,
      },
      { key: "addtime", title: "时间", value: (r) => dateTime(r.addtime) },
      {
        key: "actions",
        title: "操作",
        render: (r) =>
          `<button class="btn ghost" data-action="review-reply" data-id="${r.id}">回复评价</button>`,
      },
    ]);
  }
  if (tab === "service") {
    const rows = (await api("/operations?type=service")).data.filter(
      (r) => ctx.scoped([{ ...r.payload }]).length && inRange(ctx, r),
    );
    ctx.serviceRows = rows;
    html = table(ctx, "service", rows, [
      { key: "title", title: "协同任务" },
      {
        key: "priority",
        title: "优先级",
        value: (r) => r.payload.priority || "普通",
      },
      {
        key: "owner",
        title: "负责人",
        value: (r) => r.payload.contact || "待分配",
      },
      {
        key: "description",
        title: "内容",
        value: (r) => r.payload.description || "—",
      },
      { key: "status", title: "闭环状态" },
      {
        key: "actions",
        title: "操作",
        render: (r) =>
          `<button class="btn ghost" data-action="service-handle" data-id="${r.id}">处理任务</button>`,
      },
    ]);
  }
  return `<div class="page-head"><span class="eyebrow">LISTEN & RESPOND</span><h1>服务反馈，逐项闭环</h1><p>分类、优先级、处理时限、负责人和回复都留下记录。</p></div><div class="tabs" style="margin-bottom:20px">${[
    ["messages", "学生反馈"],
    ["reviews", "菜品评价"],
    ["service", "服务协同"],
  ]
    .map(
      ([k, l]) =>
        `<button class="${tab === k ? "active" : ""}" data-action="feedback-tab" data-tab="${k}">${l}</button>`,
    )
    .join("")}</div>${html}`;
}
export const actions = {
  "feedback-tab": (ctx, e) => {
    ctx.feedbackTab = e.target.closest("[data-tab]").dataset.tab;
    ctx.render();
  },
  "feedback-category": (ctx, e) => {
    ctx.feedbackCategory = e.target.value;
    ctx.render();
  },
  "feedback-status": (ctx, e) => {
    ctx.feedbackStatus = e.target.value;
    ctx.render();
  },
  "feedback-handle": (ctx, e) => {
    const r = ctx.feedbackRows.find(
      (r) => r.id === Number(e.target.closest("[data-id]").dataset.id),
    );
    modal(
      "处理学生反馈",
      `<form data-action="save-feedback" data-id="${r.id}"><div class="info-box">${esc(r.content)}</div><div class="admin-input-grid"><div><label>分类</label><select name="category">${options(["投诉", "建议", "菜品问题", "服务问题"], r.category)}</select></div><div><label>优先级</label><select name="priority">${options(["普通", "高", "紧急"], r.priority)}</select></div></div><label>负责人</label><input name="owner" maxlength="60" value="${esc(r.owner)}"><label>处理期限</label><input name="dueAt" type="datetime-local" value="${r.due_at ? new Date(new Date(r.due_at) - new Date(r.due_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}"><label>闭环状态</label><select name="workflow">${options(["待处理", "处理中", "已闭环"], r.workflow)}</select><label>公开回复（填写后闭环）</label><textarea name="replycontent" maxlength="2000">${esc(r.replycontent)}</textarea><div class="actions"><button class="btn">保存处理信息</button></div></form>`,
    );
  },
  "save-feedback": async (ctx, e) => {
    const f = Object.fromEntries(new FormData(e.target));
    await put(`/social/messages/${e.target.dataset.id}/workflow`, {
      ...f,
      dueAt: f.dueAt ? new Date(f.dueAt).toISOString() : "",
    });
    if (f.replycontent.trim())
      await put(`/social/messages/${e.target.dataset.id}/reply`, {
        replycontent: f.replycontent,
      });
    closeModal();
    toast("处理信息已保存", "success");
    ctx.render();
  },
  "review-reply": (ctx, e) => {
    const r = ctx.reviewRows.find(
      (r) => r.id === Number(e.target.closest("[data-id]").dataset.id),
    );
    modal(
      "回复菜品评价",
      `<form data-action="save-review-reply" data-id="${r.id}"><div class="info-box">${esc(r.content)}</div><label>校方回复</label><textarea name="reply" maxlength="2000" required>${esc(r.reply)}</textarea><div class="actions"><button class="btn">提交回复</button></div></form>`,
    );
  },
  "save-review-reply": async (ctx, e) => {
    await put(
      `/social/reviews/${e.target.dataset.id}/reply`,
      Object.fromEntries(new FormData(e.target)),
    );
    closeModal();
    toast("评价已回复", "success");
    ctx.render();
  },
  "service-handle": (ctx, e) => {
    const r = ctx.serviceRows.find(
      (r) => r.id === Number(e.target.closest("[data-id]").dataset.id),
    );
    ctx.editService = r;
    modal(
      "服务协同任务",
      `<form data-action="save-service" data-id="${r.id}"><h3>${esc(r.title)}</h3><label>负责人</label><input name="contact" maxlength="60" value="${esc(r.payload.contact)}"><label>处理说明</label><textarea name="description" maxlength="2000">${esc(r.payload.description)}</textarea><label>闭环状态</label><select name="status">${options(["待处理", "处理中", "已闭环"], r.status)}</select><div class="actions"><button class="btn">保存任务</button></div></form>`,
    );
  },
  "save-service": async (ctx, e) => {
    const b = Object.fromEntries(new FormData(e.target)),
      r = ctx.editService;
    await put(`/operations/${r.id}`, {
      title: r.title,
      status: b.status,
      payload: { ...r.payload, contact: b.contact, description: b.description },
    });
    closeModal();
    toast("任务已更新", "success");
    ctx.render();
  },
};
