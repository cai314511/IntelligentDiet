import {
  api,
  esc,
  money,
  dateTime,
  button,
  card,
  field,
  options,
  notice,
  bind,
  dialog,
  formData,
} from "../../shared/feature-ui.js";
import { table } from "./table.js";
export async function programs(root, context, reload) {
  const [activities, items, orders] = await Promise.all([
    api("/activities/manage"),
    api("/activities/culture/manage"),
    api("/activities/culture/orders"),
  ]);
  const scoped = (rows) =>
    rows.filter((r) => !context.campus || r.campus === context.campus);
  root.innerHTML = `<h2 style="font-size:24px;font-weight:600;margin-bottom:20px">校园活动与文创管理</h2><div class="zx-row">${button("发布活动", "activity", true)}${button("新增文创", "culture")}</div>${card("活动管理", '<div id="activity-table"></div>')}${card("文创商品", '<div id="culture-table"></div>')}${card("文创订单履约", '<div id="culture-orders"></div>')}`;
  bind(root, {
    activity: () => edit("activity", null, reload),
    culture: () => edit("culture", null, reload),
  });
  table(
    root.querySelector("#activity-table"),
    scoped(activities.data),
    [
      { key: "title", label: "活动" },
      { key: "campus", label: "校区" },
      {
        key: "startsAt",
        label: "开始时间",
        render: (r) => esc(dateTime(r.startsAt)),
      },
      { key: "participants", label: "报名人数" },
      { key: "status", label: "状态" },
    ],
    {
      编辑: (r) => edit("activity", r, reload),
      报名名单: async (r) => {
        const rows = (await api("/activities/" + r.id + "/signups")).data;
        const d = dialog(r.title + "报名名单", '<div id="signups"></div>');
        table(
          d.querySelector("#signups"),
          rows,
          [
            { key: "name", label: "姓名" },
            { key: "phone", label: "联系方式" },
            { key: "status", label: "报名状态" },
          ],
          {},
          "name",
        );
      },
      归档: (r) => archive("/activities/" + r.id, r.title, reload),
    },
  );
  table(
    root.querySelector("#culture-table"),
    scoped(items.data),
    [
      { key: "title", label: "文创" },
      { key: "campus", label: "校区" },
      { key: "price", label: "价格" },
      { key: "stock", label: "库存" },
      { key: "status", label: "状态" },
    ],
    {
      编辑: (r) => edit("culture", r, reload),
      归档: (r) => archive("/activities/culture/" + r.id, r.title, reload),
    },
  );
  table(
    root.querySelector("#culture-orders"),
    orders.data.filter(
      (o) =>
        o.createdAt.slice(0, 10) >= context.from &&
        o.createdAt.slice(0, 10) <= context.to,
    ),
    [
      { key: "orderId", label: "订单" },
      { key: "title", label: "商品" },
      { key: "quantity", label: "数量" },
      { key: "total", label: "金额" },
      { key: "status", label: "状态" },
    ],
    {
      "通知领取 / 完成": async (r) => {
        const status =
          r.status === "已支付"
            ? "待领取"
            : r.status === "待领取"
              ? "已完成"
              : null;
        if (!status) throw new Error("该订单已结束");
        await api("/activities/culture/orders/" + r.orderId + "/status", {
          method: "PUT",
          body: { status },
        });
        await reload();
      },
      退款: (r) => {
        const d = dialog(
          "确认文创退款",
          `<p>${esc(r.title)} · ${money(r.total)}</p>${button("确认退款", "confirm", true)}<div data-status></div>`,
        );
        bind(d, {
          confirm: async () => {
            await api("/activities/culture/orders/" + r.orderId + "/status", {
              method: "PUT",
              body: { status: "已退款" },
            });
            d.close();
            await reload();
          },
        });
      },
    },
    "orderId",
  );
}
function archive(path, title, reload) {
  const d = dialog(
    "归档确认",
    `<p>${esc(title)}</p>${button("确认归档", "confirm", true)}<div data-status></div>`,
  );
  bind(d, {
    confirm: async () => {
      await api(path, { method: "DELETE" });
      d.close();
      await reload();
    },
  });
}
function edit(kind, row, reload) {
  const fields =
    kind === "activity"
      ? [
          ["title", "标题", "text"],
          ["description", "活动内容", "text"],
          ["category", "分类", "text"],
          ["campus", "校区", "text"],
          ["startsAt", "开始时间", "datetime-local"],
          ["endsAt", "结束时间", "datetime-local"],
          ["location", "地点", "text"],
          ["capacity", "人数上限", "number"],
        ]
      : [
          ["title", "名称", "text"],
          ["description", "商品说明", "text"],
          ["category", "分类", "text"],
          ["campus", "校区", "text"],
          ["price", "价格", "number"],
          ["stock", "库存", "number"],
        ];
  const d = dialog(
    row ? "编辑" : "新增",
    `<form><div class="zx-grid">${fields
      .map(([k, label, type]) => {
        let value = row?.[k] ?? "";
        if (type === "datetime-local" && value)
          value = new Date(
            new Date(value).getTime() - new Date().getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16);
        return field(
          k,
          label,
          `<input type="${type}" value="${esc(value)}" ${["title", "description", "startsAt", "endsAt"].includes(k) ? "required" : ""} ${type === "number" ? 'min="0" step="0.01"' : ""}>`,
        );
      })
      .join("")}${
      kind === "activity"
        ? field(
            "status",
            "发布状态",
            `<select>${options(
              [
                ["published", "已发布"],
                ["draft", "草稿"],
              ],
              row?.status || "published",
            )}</select>`,
          )
        : ""
    }</div><button class="zx-button zx-primary">保存</button><div data-status></div></form>`,
  );
  d.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const data = formData(e.target);
      for (const [k, , type] of fields) {
        if (type === "number") data[k] = Number(data[k]);
        if (type === "datetime-local")
          data[k] = new Date(data[k]).toISOString();
      }
      await api(
        "/activities" +
          (kind === "culture" ? "/culture" : "") +
          (row ? "/" + row.id : ""),
        { method: row ? "PUT" : "POST", body: data },
      );
      d.close();
      await reload();
    } catch (err) {
      d.querySelector("[data-status]").innerHTML = notice(err.message, "error");
    }
  };
}
