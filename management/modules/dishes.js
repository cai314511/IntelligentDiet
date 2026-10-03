import {
  api,
  post,
  put,
  esc,
  money,
  modal,
  options,
  closeModal,
  toast,
} from "../../shared/core.js";
import { table } from "./table.js";
export function render(ctx) {
  const rows = ctx
    .scoped(ctx.data.dishes)
    .filter(
      (d) =>
        !ctx.dishStatus ||
        (ctx.dishStatus === "on" && d.forSale) ||
        (ctx.dishStatus === "off" && !d.forSale) ||
        (ctx.dishStatus === "low" && d.stock < 20),
    );
  return `<div class="page-head row spread wrap"><div><span class="eyebrow">MENU & WINDOWS</span><h1>菜单、窗口与库存</h1><p>在统一学校范围内维护菜品与营养字段。</p></div><button class="btn" data-action="new-dish">新增菜品 ＋</button></div><div class="admin-actions"><select style="max-width:160px" data-change="dish-status">${options(
    [
      { value: "", label: "全部菜品" },
      { value: "on", label: "在售" },
      { value: "off", label: "已下架" },
      { value: "low", label: "库存不足 20" },
    ],
    ctx.dishStatus,
  )}</select><button class="btn secondary" data-action="bulk-dish" data-status="on">批量上架</button><button class="btn secondary" data-action="bulk-dish" data-status="off">批量下架</button></div>${table(
    ctx,
    "dishes",
    rows,
    [
      { key: "name", title: "菜品名称" },
      { key: "category", title: "品类" },
      { key: "campus", title: "校区" },
      {
        key: "restaurant",
        title: "食堂 / 窗口",
        value: (d) => `${d.restaurant} · ${d.window}`,
      },
      { key: "price", title: "价格", render: (d) => money(d.price) },
      {
        key: "stock",
        title: "库存",
        render: (d) =>
          `<span class="badge ${d.stock < 20 ? "warn" : ""}">${d.stock}份</span>`,
      },
      {
        key: "calories",
        title: "热量",
        value: (d) => `${Number(d.nutrition.calories) || 0} kcal`,
      },
      {
        key: "forSale",
        title: "供应",
        value: (d) => (d.forSale ? "在售" : "已下架"),
      },
      {
        key: "actions",
        title: "操作",
        render: (d) =>
          `<button class="btn ghost" data-action="edit-dish" data-id="${d.id}">编辑</button><button class="btn ghost" data-action="toggle-dish" data-id="${d.id}">${d.forSale ? "下架" : "上架"}</button>`,
      },
    ],
    { selectable: true },
  )}`;
}
function editor(ctx, id) {
  const d = ctx.data.dishes.find((d) => d.id === Number(id)) || {
      nutrition: {},
      ingredients: [],
      allergens: [],
      tasteTags: [],
      dietaryTags: [],
      price: 10,
      stock: 50,
      portionG: 300,
      forSale: true,
    },
    restaurants = ctx.data.restaurants;
  modal(
    id ? "编辑菜品" : "新增菜品",
    `<form data-action="save-dish" data-id="${id || ""}"><label>名称</label><input name="name" value="${esc(d.name)}" required maxlength="80"><div class="admin-input-grid"><div><label>品类</label><input name="category" value="${esc(d.category)}" list="dish-categories" required maxlength="40"><datalist id="dish-categories">${[...new Set(ctx.data.dishes.map((d) => d.category))].map((c) => `<option value="${esc(c)}">`).join("")}</datalist></div><div><label>窗口</label><input name="window" value="${esc(d.window)}" maxlength="80" required></div></div><label>食堂</label><select name="restaurantId">${options(
      restaurants.map((r) => ({
        value: r.id,
        label: `${r.campus} · ${r.name}`,
      })),
      d.restaurantId,
    )}</select><div class="admin-input-grid">${[
      ["price", "价格（元）", d.price, "0.01"],
      ["stock", "库存（份）", d.stock, "1"],
      ["portionG", "份量（g）", d.portionG, "1"],
    ]
      .map(
        ([key, label, value, step]) =>
          `<div><label>${label}</label><input name="${key}" type="number" min="${key === "stock" ? "0" : "0.01"}" step="${step}" value="${value}" required></div>`,
      )
      .join("")}<div><label>供应状态</label><select name="forSale">${options(
      [
        { value: "true", label: "在售" },
        { value: "false", label: "下架" },
      ],
      d.forSale,
    )}</select></div></div><label>食材（逗号分隔）</label><input name="ingredients" value="${esc(d.ingredients.join("、"))}"><label>过敏原（逗号分隔）</label><input name="allergens" value="${esc(d.allergens.join("、"))}"><div class="admin-input-grid">${[
      ["calories", "热量 kcal"],
      ["protein", "蛋白 g"],
      ["carbs", "碳水 g"],
      ["fat", "脂肪 g"],
      ["fiber", "纤维 g"],
      ["sodium", "钠 mg"],
    ]
      .map(
        ([key, label]) =>
          `<div><label>${label}</label><input name="${key}" type="number" min="0" step="0.1" value="${Number(d.nutrition[key]) || 0}" required></div>`,
      )
      .join(
        "",
      )}</div><details style="margin-top:15px"><summary>口味、来源与图片</summary>${[
      ["tasteTags", "口味标签", d.tasteTags.join("、")],
      ["dietaryTags", "饮食标签", d.dietaryTags.join("、")],
      ["spiceLevel", "辣度", d.spiceLevel],
      ["image", "图片地址", d.image],
      ["sourceName", "来源名称", d.sourceName],
      ["sourceUrl", "来源链接", d.sourceUrl],
      ["sourceDate", "来源日期", d.sourceDate],
      ["priceBasis", "定价依据", d.priceBasis],
      ["nutritionBasis", "营养依据", d.nutritionBasis],
    ]
      .map(
        ([name, label, value]) =>
          `<label>${label}</label><input name="${name}" value="${esc(value)}" maxlength="1000">`,
      )
      .join(
        "",
      )}</details><div class="actions"><button class="btn">保存菜品</button></div></form>`,
  );
}
export const actions = {
  "new-dish": (ctx) => editor(ctx),
  "edit-dish": (ctx, e) =>
    editor(ctx, e.target.closest("[data-id]").dataset.id),
  "dish-status": (ctx, e) => {
    ctx.dishStatus = e.target.value;
    ctx.render();
  },
  "save-dish": async (ctx, e) => {
    const b = Object.fromEntries(new FormData(e.target)),
      r = ctx.data.restaurants.find((r) => r.id === Number(b.restaurantId)),
      list = (s) =>
        String(s || "")
          .split(/[，,、]/)
          .map((x) => x.trim())
          .filter(Boolean),
      body = {
        ...b,
        campus: r.campus,
        restaurant: r.name,
        price: Number(b.price),
        stock: Number(b.stock),
        portionG: Number(b.portionG),
        forSale: b.forSale === "true",
        ingredients: list(b.ingredients),
        allergens: list(b.allergens),
        tasteTags: list(b.tasteTags),
        dietaryTags: list(b.dietaryTags),
        nutrition: Object.fromEntries(
          ["calories", "protein", "carbs", "fat", "fiber", "sodium"].map(
            (k) => [k, Number(b[k])],
          ),
        ),
      };
    await api(
      e.target.dataset.id ? `/dishes/${e.target.dataset.id}` : "/dishes",
      { method: e.target.dataset.id ? "PUT" : "POST", body },
    );
    closeModal();
    toast("菜品已保存", "success");
    ctx.refresh();
  },
  "toggle-dish": async (ctx, e) => {
    const d = ctx.data.dishes.find(
      (d) => d.id === Number(e.target.closest("[data-id]").dataset.id),
    );
    await put(`/dishes/${d.id}`, { forSale: !d.forSale });
    toast(d.forSale ? "菜品已下架" : "菜品已上架", "success");
    ctx.refresh();
  },
  "bulk-dish": async (ctx, e) => {
    const ids = ctx.tables?.dishes?.selected || [];
    if (!ids.length) throw new Error("请先选择菜品");
    let success = 0,
      failed = 0;
    for (const id of ids) {
      try {
        await put(`/dishes/${id}`, {
          forSale: e.target.closest("[data-status]").dataset.status === "on",
        });
        success++;
      } catch {
        failed++;
      }
    }
    ctx.tables.dishes.selected = [];
    toast(`已更新 ${success} 项，失败 ${failed} 项`);
    ctx.refresh();
  },
};
