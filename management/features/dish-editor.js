import {dishPhoto} from '../../shared/dish-photo.js';
import {
  api,
  esc,
  dialog,
  field,
  options,
  formData,
  notice,
} from "../../shared/feature-ui.js";
export async function editDish(row, reload) {
  const catalog = (await api("/workspace/catalog")).data;
  const r = row || {
    name: "",
    price: 0,
    stock: 0,
    portionG: 300,
    category: "",
    ingredients: [],
    allergens: [],
    tasteTags: [],
    dietaryTags: [],
    nutrition: {},
  };
  const d = dialog(
    row ? "编辑菜品" : "新增菜品",
    `<form>${row?dishPhoto(r,{height:180}):""}<div class="zx-grid">${field("name", "菜品名称", `<input required maxlength="80" value="${esc(r.name)}">`)}${field(
      "restaurantId",
      "所属食堂",
      `<select required>${options(
        catalog.restaurants.map((x) => [x.id, x.name + " · " + x.campus]),
        r.restaurantId,
      )}</select>`,
    )}${field("category", "品类", `<input required maxlength="40" value="${esc(r.category)}">`)}${field("window", "窗口", `<input required maxlength="80" value="${esc(r.window || "")}">`)}${[
      ["price", "价格", "0.01"],
      ["stock", "库存", "1"],
      ["portionG", "每份克数", "1"],
    ]
      .map(([k, label, step]) =>
        field(
          k,
          label,
          `<input type="number" min="${k === "stock" ? 0 : 1}" step="${step}" required value="${r[k]}">`,
        ),
      )
      .join("")}${[
      ["ingredients", "食材"],
      ["allergens", "过敏原"],
      ["tasteTags", "口味"],
      ["dietaryTags", "清真 / 素食标签"],
    ]
      .map(([k, label]) =>
        field(k, label, `<input value="${esc(r[k].join("、"))}">`),
      )
      .join(
        "",
      )}${["calories", "protein", "carbs", "fat", "fiber", "sodium"].map((k, i) => field(k, ["每份热量 kcal", "蛋白质 g", "碳水 g", "脂肪 g", "膳食纤维 g", "钠 mg"][i], `<input type="number" min="0" step="0.1" value="${esc(r.nutrition[k] || 0)}">`)).join("")}${field("sourceName", "数据来源", `<input value="${esc(r.sourceName || "")}">`)}${field("sourceDate", "数据日期", `<input type="date" value="${esc((r.sourceDate || "").slice(0, 10))}">`)}</div><button class="zx-button zx-primary">保存菜品</button><div data-status></div></form>`,
  );
  d.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const f = formData(e.target),
        restaurant = catalog.restaurants.find(
          (x) => x.id === Number(f.restaurantId),
        );
      const body = {
        name: f.name,
        category: f.category,
        window: f.window,
        price: Number(f.price),
        stock: Number(f.stock),
        portionG: Number(f.portionG),
        campus: restaurant.campus,
        restaurant: restaurant.name,
        sourceName: f.sourceName,
        sourceDate: f.sourceDate,
        nutrition: Object.fromEntries(
          ["calories", "protein", "carbs", "fat", "fiber", "sodium"].map(
            (k) => [k, Number(f[k])],
          ),
        ),
        ...Object.fromEntries(
          ["ingredients", "allergens", "tasteTags", "dietaryTags"].map((k) => [
            k,
            f[k].split(/[、,，]+/).filter(Boolean),
          ]),
        ),
      };
      await api("/dishes" + (row ? "/" + row.id : ""), {
        method: row ? "PUT" : "POST",
        body,
      });
      d.close();
      await reload();
    } catch (err) {
      d.querySelector("[data-status]").innerHTML = notice(err.message, "error");
    }
  };
}
