import {dishPhoto} from '../../shared/dish-photo.js';
import {
  api,
  esc,
  money,
  dateTime,
  button,
  card,
  options,
  field,
  source,
  notice,
  bind,
  dialog,
  formData,
} from "../../shared/feature-ui.js";
import { editDish } from "./dish-editor.js";
import { table } from "./table.js";
const typeNames = {
  safety: "食品安全监管",
  conservation: "节约型校园",
  supplier: "供应商资质",
  inventory: "库存批次",
  procurement: "采购计划",
  service: "校园服务管理",
  canteen: "食堂运营",
};
export async function operations(root, type, context, reload) {
  const records = (await api("/operations?type=" + type)).data
    .filter((r) => {
      const day = new Date(
        String(r.updatedAt || r.addtime).replace(" ", "T") +
          (/Z$/.test(r.updatedAt || r.addtime) ? "" : "Z"),
      ).toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
      return (
        day >= context.from &&
        day <= context.to &&
        (!context.campus || r.payload.campus === context.campus) &&
        (!context.restaurantId ||
          Number(r.payload.restaurantId) === Number(context.restaurantId)) &&
        (!context.window || r.payload.window === context.window)
      );
    })
    .map((r) => ({
      ...r,
      quantity: r.payload.quantity,
      unitCost: r.payload.unitCost,
      arrivalStatus: r.payload.arrivalStatus,
    }));
  root.innerHTML = `<h2 style="font-size:24px;font-weight:600;margin-bottom:20px">${typeNames[type]}</h2><div class="zx-row" style="margin-bottom:18px">${button("新增记录", "new", true)}${button("操作审计与撤销", "audit")}</div>${card("运营台账", '<div id="operations-table"></div>')}<div data-status></div>`;
  bind(root, {
    new: () => editRecord(type, null, context, reload),
    audit: () => audit(),
  });
  table(
    root.querySelector("#operations-table"),
    records,
    [
      { key: "title", label: "记录名称" },
      { key: "status", label: "状态" },
      {
        key: "updatedAt",
        label: "更新时间",
        render: (r) => esc(dateTime(r.updatedAt)),
      },
      {
        key: "payload",
        label: "负责人",
        render: (r) => esc(r.payload.owner || r.payload.contact || "—"),
      },
      ...(["inventory", "procurement", "supplier"].includes(type)
        ? [
            { key: "quantity", label: "数量" },
            { key: "unitCost", label: "单位成本" },
            { key: "arrivalStatus", label: "到货状态" },
          ]
        : []),
    ],
    {
      编辑: (r) => editRecord(type, r, context, reload),
      归档: (r) => confirmDelete(r, reload),
      "bulk:标记已完成": async (rows) => {
        for (const r of rows)
          await api("/operations/" + r.id, {
            method: "PUT",
            body: { ...r, status: "已完成" },
          });
        await reload();
      },
    },
  );
  if (type === "conservation") {
    const forecast = (
      await api("/insights/forecast?" + new URLSearchParams(context))
    ).data;
    root.insertAdjacentHTML(
      "afterbegin",
      card(
        "节约与供需联动",
        `<p>可减少备餐 ${forecast.items.some((x) => x.waste !== null) ? forecast.items.reduce((s, x) => s + (x.waste || 0), 0) + "份" : "—"} · 预计节省 ${forecast.savings === null ? "—" : money(forecast.savings)}</p><p>备餐建议来源于所选区间实际销量和库存成本。</p>`,
      ),
    );
  }
}
async function editRecord(type, row, context, reload) {
  const data = row?.payload || {},
    catalog = (await api("/workspace/catalog")).data;
  const fields = [
    ["owner", "负责人", "text"],
    ["category", "类别", "text"],
    ["description", "说明", "text"],
  ];
  if (type === "safety")
    fields.push(
      ["inspectionDate", "检查日期", "date"],
      ["checkpoints", "检查项数", "number"],
      ["passed", "合格项数", "number"],
      ["followUp", "整改与复核", "text"],
      ["severity", "风险等级", "text"],
    );
  if (["inventory", "procurement", "supplier"].includes(type))
    fields.push(
      ["batch", "批次编号", "text"],
      ["supplier", "供应商", "text"],
      ["quantity", "数量", "number"],
      ["unitCost", "单位成本（元）", "number"],
      ["prepared", "已备餐份数", "number"],
      ["arrivalStatus", "到货状态", "text"],
      ["expiresAt", "有效期", "date"],
      ["qualification", "资质审核", "text"],
    );
  if (type === "conservation")
    fields.push(
      ["metric", "指标名称", "text"],
      ["value", "指标值", "number"],
      ["unit", "单位", "text"],
    );
  const d = dialog(
    row ? "编辑台账" : "新增台账",
    `<form><div class="zx-grid">${field("title", "记录名称", `<input value="${esc(row?.title || "")}" maxlength="120" required>`)}${field("status", "状态", `<input value="${esc(row?.status || "待处理")}" required maxlength="40">`)}${field("campus", "校区", `<select>${options([["", "全校"], ...[...new Set(catalog.restaurants.map((r) => r.campus))].map((x) => [x, x])], data.campus || context.campus)}</select>`)}${field("restaurantId", "食堂", `<select>${options([["", "全部食堂"], ...catalog.restaurants.map((r) => [r.id, r.name])], data.restaurantId || context.restaurantId)}</select>`)}${field("window", "窗口", `<input value="${esc(data.window || context.window || "")}" maxlength="80">`)}${field("dishId", "关联菜品", `<select>${options([["", "无关联"], ...catalog.dishes.map((r) => [r.id, r.name])], data.dishId)}</select>`)}${fields.map(([key, label, type]) => field(key, label, `<input type="${type}" ${type === "number" ? 'min="0" step="0.1"' : ""} value="${esc(data[key] ?? "")}">`)).join("")}</div><button class="zx-button zx-primary" type="submit">保存记录</button><div data-status></div></form>`,
  );
  d.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const f = formData(e.target);
    try {
      const payload = { ...data, ...f };
      delete payload.title;
      delete payload.status;
      for (const [k, , t] of fields)
        if (t === "number") payload[k] = Number(f[k]);
      payload.dishId = Number(f.dishId) || null;
      payload.restaurantId = Number(f.restaurantId) || null;
      await api("/operations" + (row ? "/" + row.id : ""), {
        method: row ? "PUT" : "POST",
        body: { type, title: f.title, status: f.status, payload },
      });
      d.close();
      await reload();
    } catch (err) {
      d.querySelector("[data-status]").innerHTML = notice(err.message, "error");
    }
  };
}
function confirmDelete(row, reload) {
  const d = dialog(
    "确认归档记录",
    `<p>${esc(row.title)}</p><p>归档后可在操作审计中撤销。</p>${button("确认归档", "confirm", true)}<div data-status></div>`,
  );
  bind(d, {
    confirm: async () => {
      await api("/operations/" + row.id, { method: "DELETE" });
      d.close();
      await reload();
    },
  });
}
async function audit() {
  const rows = (await api("/operations/audit")).data;
  const d = dialog("操作审计与撤销", '<div id="audit-table"></div>');
  table(
    d.querySelector("#audit-table"),
    rows,
    [
      { key: "id", label: "编号" },
      { key: "action", label: "操作" },
      { key: "entity_id", label: "记录编号" },
      { key: "created_at", label: "时间" },
    ],
    {
      撤销: async (row) => {
        await api("/operations/audit/" + row.id + "/undo", { method: "POST" });
        d.close();
        window.dispatchEvent(new Event("zx-admin-refresh"));
      },
    },
  );
}
export async function dishes(root, context, reload) {
  const catalog = (await api("/workspace/catalog")).data;
  const rows = catalog.dishes.filter(
    (d) =>
      (!context.campus || d.campus === context.campus) &&
      (!context.restaurantId ||
        d.restaurantId === Number(context.restaurantId)) &&
      (!context.window || d.window === context.window),
  );
  root.innerHTML = `<h2 style="font-size:24px;font-weight:600;margin-bottom:20px">食堂运营管控</h2><div class="zx-grid">${catalog.restaurants
    .filter((r) => !context.campus || r.campus === context.campus)
    .map((r) =>
      card(
        r.name,
        `<p>排队${r.queueCount}人 · ${r.queueMinutes}分钟 · ${r.distanceM}米</p>${button("维护排队数据", "restaurant").replace('data-action="restaurant"', `data-action="restaurant" data-id="${r.id}"`)}`,
      ),
    )
    .join(
      "",
    )}</div>${button("新增菜品", "newDish", true)}${card("菜品管理", '<div id="dishes-table"></div>')}`;
  bind(root, {
    newDish: () => editDish(null, reload),
    restaurant: (b) => {
      const r = catalog.restaurants.find((r) => r.id === Number(b.dataset.id));
      const d = dialog(
        "维护食堂运营信息",
        `<form>${field("queueMinutes", "预计排队分钟", `<input type="number" min="0" max="180" value="${r.queueMinutes}" required>`)}${field("queueCount", "排队人数", `<input type="number" min="0" max="10000" value="${r.queueCount}" required>`)}${field("distanceM", "距离（米）", `<input type="number" min="0" max="10000" value="${r.distanceM}" required>`)}${field("openingHours", "营业时间", `<input value="${esc(r.openingHours)}" maxlength="100">`)}<button class="zx-button zx-primary">保存</button><div data-status></div></form>`,
      );
      d.querySelector("form").onsubmit = async (e) => {
        e.preventDefault();
        try {
          const f = formData(e.target);
          await api("/restaurants/" + r.id, {
            method: "PUT",
            body: {
              ...f,
              queueMinutes: Number(f.queueMinutes),
              queueCount: Number(f.queueCount),
              distanceM: Number(f.distanceM),
            },
          });
          d.close();
          await reload();
        } catch (err) {
          d.querySelector("[data-status]").innerHTML = notice(
            err.message,
            "error",
          );
        }
      };
    },
  });
  table(
    root.querySelector("#dishes-table"),
    rows,
    [
      { key: "name", label: "菜品", render:r=>`<div style="display:flex;align-items:center;gap:10px">${dishPhoto(r,{width:"56px",height:56})}<span>${esc(r.name)}</span></div>` },
      { key: "restaurant", label: "食堂" },
      { key: "window", label: "窗口" },
      { key: "price", label: "价格" },
      { key: "stock", label: "库存" },
      {
        key: "forSale",
        label: "在售",
        render: (r) => (r.forSale ? "上架" : "下架"),
      },
    ],
    {
      编辑: (r) => editDish(r, reload),
      切换上下架: async (r) => {
        await api("/dishes/" + r.id, {
          method: "PUT",
          body: { forSale: !r.forSale },
        });
        await reload();
      },
      "bulk:上架": async (rows) => {
        for (const r of rows)
          await api("/dishes/" + r.id, {
            method: "PUT",
            body: { forSale: true },
          });
        await reload();
      },
    },
  );
}
export async function orders(root, context, reload) {
  const rows = (await api("/orders")).data;
  let list = rows.filter((r) => {
    const day = new Date(
      String(r.addtime).replace(" ", "T") + "Z",
    ).toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
    return (
      day >= context.from &&
      day <= context.to &&
      (!context.campus || r.campus === context.campus) &&
      (!context.restaurantId ||
        Number(r.restaurant_id) === Number(context.restaurantId)) &&
      (!context.window || r.window_name === context.window)
    );
  });
  list = Object.values(
    list.reduce((o, r) => {
      const a = (o[r.orderid] ??= { ...r, names: [], items: [], amount: 0 });
      a.names.push(r.caipinmingcheng + " × " + r.buyshu);
      a.items.push(r);
      a.amount += Number(r.total);
      return o;
    }, {}),
  ).map((r) => ({
    ...r,
    phone: r.phone
      ? String(r.phone).replace(/^(\d{3})\d+(\d{4})$/, "$1****$2")
      : "—",
  }));
  root.innerHTML = `<h2 style="font-size:24px;font-weight:600;margin-bottom:20px">订单状态流水线</h2><div class="zx-row" style="margin-bottom:18px">${["全部", "未支付", "已支付", "制作中", "待取餐", "已完成", "已退款", "已取消"].map((x) => button(x, x)).join("")}</div>${card("订单管理", '<div id="orders-table"></div>')}`;
  const draw = (status) =>
    table(
      root.querySelector("#orders-table"),
      status === "全部" ? list : list.filter((r) => r.status === status),
      [
        { key: "orderid", label: "订单" },
        { key: "names", label: "菜品", render: (r) => r.items.map(i=>`<div style="display:flex;align-items:center;gap:10px;margin:5px 0">${dishPhoto(i,{width:"44px",height:44})}<span>${esc(i.caipinmingcheng)} × ${i.buyshu}</span></div>`).join("") },
        { key: "amount", label: "金额" },
        { key: "status", label: "状态" },
        { key: "phone", label: "联系方式" },
      ],
      {
        "接单 / 叫号": async (r) => {
          const next =
            r.status === "已支付"
              ? "制作中"
              : r.status === "制作中"
                ? "待取餐"
                : null;
          if (!next) throw new Error("当前状态不能接单或叫号");
          await api("/orders/" + r.orderid + "/status", {
            method: "PUT",
            body: { status: next },
          });
          await reload();
        },
        核销: (r) => {
          const d = dialog(
            "取餐码核销",
            `<form>${field("pickupCode", "取餐码", "<input required>")}<button class="zx-button zx-primary">确认核销</button><div data-status></div></form>`,
          );
          d.querySelector("form").onsubmit = async (e) => {
            e.preventDefault();
            try {
              await api("/orders/" + r.orderid + "/pickup", {
                method: "POST",
                body: formData(e.target),
              });
              d.close();
              await reload();
            } catch (err) {
              d.querySelector("[data-status]").innerHTML = notice(
                err.message,
                "error",
              );
            }
          };
        },
        退款: (r) => {
          const d = dialog(
            "确认订单退款",
            `<p>${esc(r.orderid)} · 退款 ${money(r.amount)}</p>${button("确认退款", "refund", true)}<div data-status></div>`,
          );
          bind(d, {
            refund: async () => {
              await api("/orders/" + r.orderid + "/status", {
                method: "PUT",
                body: { status: "已退款" },
              });
              d.close();
              await reload();
            },
          });
        },
      },
      "orderid",
    );
  draw("全部");
  bind(
    root,
    Object.fromEntries(
      [
        "全部",
        "未支付",
        "已支付",
        "制作中",
        "待取餐",
        "已完成",
        "已退款",
        "已取消",
      ].map((x) => [x, () => draw(x)]),
    ),
  );
}
export async function feedback(root, context, reload) {
  const rows = (await api("/social/messages")).data.filter((r) => {
    const day = new Date(
      String(r.addtime).replace(" ", "T") + "Z",
    ).toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
    return (
      day >= context.from &&
      day <= context.to &&
      (!context.campus || r.campus === context.campus) &&
      (!context.restaurantId ||
        Number(r.restaurantId) === Number(context.restaurantId)) &&
      (!context.window || r.window === context.window)
    );
  });
  root.innerHTML = `<h2 style="font-size:24px;font-weight:600;margin-bottom:20px">学生反馈闭环</h2>${card("分类处理", '<div id="feedback-table"></div>')}`;
  table(
    root.querySelector("#feedback-table"),
    rows,
    [
      { key: "category", label: "类别" },
      { key: "priority", label: "优先级" },
      { key: "workflow", label: "状态" },
      { key: "owner", label: "负责人" },
      { key: "due_at", label: "期限" },
      { key: "content", label: "内容" },
    ],
    {
      处理与回复: (r) => {
        const d = dialog(
          "处理学生反馈",
          `<form>${field(
            "category",
            "类别",
            `<select>${options(
              ["投诉", "建议", "菜品问题", "服务问题"].map((x) => [x, x]),
              r.category,
            )}</select>`,
          )}${field(
            "priority",
            "优先级",
            `<select>${options(
              ["普通", "高", "紧急"].map((x) => [x, x]),
              r.priority,
            )}</select>`,
          )}${field(
            "workflow",
            "状态",
            `<select>${options(
              ["待处理", "处理中", "已闭环"].map((x) => [x, x]),
              r.workflow,
            )}</select>`,
          )}${field("owner", "负责人", `<input value="${esc(r.owner || "")}" maxlength="60">`)}${field("dueAt", "处理期限", `<input type="datetime-local" value="${r.due_at ? new Date(new Date(r.due_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}">`)}${field("replycontent", "回复", `<textarea>${esc(r.replycontent || "")}</textarea>`)}<button class="zx-button zx-primary">保存处理信息</button><div data-status></div></form>`,
        );
        d.querySelector("form").onsubmit = async (e) => {
          e.preventDefault();
          const f = formData(e.target);
          try {
            await api("/social/messages/" + r.id + "/workflow", {
              method: "PUT",
              body: {
                ...f,
                dueAt: f.dueAt ? new Date(f.dueAt).toISOString() : "",
              },
            });
            if (f.replycontent.trim())
              await api("/social/messages/" + r.id + "/reply", {
                method: "PUT",
                body: { replycontent: f.replycontent },
              });
            d.close();
            await reload();
          } catch (err) {
            d.querySelector("[data-status]").innerHTML = notice(
              err.message,
              "error",
            );
          }
        };
      },
    },
  );
}

export async function reviews(root, context, reload) {
  const [r, c] = await Promise.all([
    api("/social/reviews"),
    api("/workspace/catalog"),
  ]);
  const rows = r.data
    .filter((x) => {
      const dish = c.data.dishes.find((d) => d.id === x.dishId);
      return (
        dish &&
        (!context.campus || dish.campus === context.campus) &&
        (!context.restaurantId ||
          dish.restaurantId === Number(context.restaurantId)) &&
        (!context.window || dish.window === context.window)
      );
    })
    .map((x) => ({
      ...x,
      dish: c.data.dishes.find((d) => d.id === x.dishId).name,
    }));
  root.innerHTML =
    '<h2 style="font-size:24px;margin-bottom:20px">菜品评价与回复</h2>' +
    card("学生口碑", '<div id="review-table"></div>');
  table(
    root.querySelector("#review-table"),
    rows,
    [
      { key: "dish", label: "菜品" },
      { key: "username", label: "用户" },
      { key: "rating", label: "评分" },
      { key: "content", label: "评价" },
      { key: "reply", label: "回复" },
    ],
    {
      回复: (r) => {
        const d = dialog(
          "回复菜品评价",
          `<form>${field("reply", "校方回复", `<textarea required maxlength="2000">${esc(r.reply || "")}</textarea>`)}<button class="zx-button zx-primary">保存回复</button><div data-status></div></form>`,
        );
        d.querySelector("form").onsubmit = async (e) => {
          e.preventDefault();
          try {
            await api("/social/reviews/" + r.id + "/reply", {
              method: "PUT",
              body: formData(e.target),
            });
            d.close();
            await reload();
          } catch (err) {
            d.querySelector("[data-status]").innerHTML = notice(
              err.message,
              "error",
            );
          }
        };
      },
    },
  );
}
