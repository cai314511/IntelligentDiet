import {
  api,
  esc,
  money,
  dateTime,
  session,
  read,
  store,
  button,
  card,
  options,
  field,
  source,
  notice,
  bind,
  dialog,
  formData,
  bars,
} from "../../shared/feature-ui.js";
import { openAgent } from "./agent.js";
let root, catalog, report, records, advanced, selectedDay;
export async function renderNutrition() {
  root = document.getElementById("app-root");
  root.innerHTML = notice("正在读取饮食记录…");
  try {
    const data = await Promise.all([
      api("/workspace/catalog"),
      api("/nutrition/report"),
      api("/nutrition/records"),
      api("/nutrition/entitlements"),
    ]);
    if (location.hash !== "#nutrition") return;
    [catalog, report, records] = data.slice(0, 3).map((r) => r.data);
    advanced = data[3].data.advanced;
    selectedDay ??= report.today.day;
    draw();
  } catch (e) {
    root.innerHTML = notice(e.message, "error") + button("重新加载", "reload");
    bind(root, { reload: renderNutrition });
  }
}
function draw() {
  const day = report.days.find((d) => d.day === selectedDay) || report.today;
  const energy = day.protein * 4 + day.carbs * 4 + day.fat * 9;
  root.innerHTML = `<h1 class="text-4xl font-bold mb-6">AI营养师</h1><div class="zx-row" style="margin-bottom:22px">${button("手动记录", "record", true)}${button("拍照 / 上传识别", "photo")}${button("编辑饮食目标与偏好", "preferences")}</div><div class="zx-grid">${card("今日评分", `<p class="zx-stat">${report.score ?? "—"}</p><p>目标 ${report.profile.calorieTarget} kcal · 已记录 ${report.today.calories.toFixed(0)} kcal</p>`)}${card("营养结构", `${["protein", "carbs", "fat"].map((k, i) => `<p>${["蛋白质", "碳水化合物", "脂肪"][i]}：${day[k].toFixed(1)}g · ${energy ? Math.round(((day[k] * (k === "fat" ? 9 : 4)) / energy) * 100) : 0}%</p>`).join("")}`)}${card("主要问题", report.issues.map((t) => `<p>${esc(t)}</p>`).join(""))}${card("下一餐建议", "<p>结合已记录餐次与饮食目标选择份量，优先搭配蔬菜、蛋白质和主食。</p>")}</div>${card(
    "近14天饮食记录",
    `<p>已记录 ${report.recordedDays}天 · 缺失 ${report.missingDays}天</p><div class="zx-calendar">${report.days.map((d) => `<button class="${d.records ? "recorded" : ""}" data-action="day" data-day="${d.day}">${d.day.slice(5)}<br>${d.records ? Math.round(d.calories) + " kcal" : "未记录"}<br>${esc(d.meals.join("、"))}</button>`).join("")}</div><h4 style="margin:18px 0">${esc(selectedDay)}</h4>${
      records
        .filter(
          (r) =>
            new Date(r.eaten_at).toLocaleDateString("sv-SE", {
              timeZone: "Asia/Shanghai",
            }) === selectedDay,
        )
        .map(
          (r) =>
            `<div class="zx-row" style="justify-content:space-between;padding:8px 0"><span>${esc(r.name)} · ${r.grams}g · ${esc(r.meal)} · ${esc(dateTime(r.eaten_at))}</span>${button("删除", "delete").replace('data-action="delete"', `data-action="delete" data-id="${r.id}"`)}</div>`,
        )
        .join("") || "<p>这一天尚未记录餐次。</p>"
    }`,
  )}${card("本校下一餐推荐", `<div class="zx-grid">${(advanced ? report.recommendations : report.recommendations.slice(0, 1)).map((d) => `<div><b>${esc(d.name)}</b><p>${esc(d.restaurant)} · ${money(d.price)} · ${d.nutrition.calories} kcal</p>${button("请小智规划", "recommend", true).replace('data-action="recommend"', `data-action="recommend" data-id="${d.id}"`)}</div>`).join("")}</div>`)}${card("深度点评与长期趋势", advanced ? `${button("生成深度点评", "deep", true)}${button("查看90天趋势", "trend")}<div id="nutrition-deep"></div>` : `<div class="zx-locked"><p>营养问题分析 · 精准推荐 · 长期饮食趋势</p><div class="zx-chart"><i style="height:80px;width:100%;background:#eef5fc"></i></div></div><p>会员权益：拍照识别、AI深度点评、本校精准推荐和长期趋势。</p>${button("查看会员权益", "upgrade")}`)}${source(report.sourceName, report.updatedAt)}`;
  bind(root, {
    reload: renderNutrition,
    record: () => record(),
    photo: photo,
    preferences: preferences,
    day: (b) => {
      selectedDay = b.dataset.day;
      draw();
    },
    delete: async (b) => {
      await api("/nutrition/records/" + b.dataset.id, { method: "DELETE" });
      await renderNutrition();
    },
    recommend: (b) =>
      openAgent("请按我的饮食目标安排下一餐", { dishId: Number(b.dataset.id) }),
    deep: async () => {
      await ensureProfile();
      const r = (await api("/nutrition/deep-report", { method: "POST" })).data;
      root.querySelector("#nutrition-deep").innerHTML =
        `<p style="white-space:pre-wrap;margin-top:16px">${esc(r.text)}</p>${source(r.sourceName, new Date().toISOString())}`;
    },
    trend: async () => {
      const data = (await api("/nutrition/trend")).data;
      const rows = Array.isArray(data) ? data : data.days || [];
      dialog(
        "90天饮食趋势",
        bars(
          rows.map((r) => ({ ...r, label: r.day })),
          "calories",
        ),
      );
    },
    upgrade: () =>
      dialog(
        "营养会员权益",
        "<p>拍照识别、AI深度点评、本校精准推荐、长期趋势。</p><p>会员服务暂未开放购买，手动记录与基础分析可继续使用。</p>",
      ),
  });
}
async function record(suggested) {
  const d = dialog(
    "记录一餐",
    `<form>${field("search", "搜索菜品", '<input placeholder="搜索菜名或食堂">')}<div class="zx-grid">${field("dishId", "本校菜品", `<select>${options([["", "自行填写食物"], ...catalog.dishes.map((d) => [d.id, d.name])], suggested?.dishId || catalog.dishes[0]?.id)}</select>`)}${field("name", "自填食物名称", '<input maxlength="80">')}${field("grams", "实际份量（g）", `<input type="number" min="1" max="5000" value="${suggested?.grams || 300}" required>`)}${field(
      "meal",
      "餐次",
      `<select>${options(
        ["早餐", "午餐", "晚餐", "加餐"].map((x) => [x, x]),
        "午餐",
      )}</select>`,
    )}${field("eatenAt", "时间", `<input type="datetime-local" value="${new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}" required>`)}</div><details><summary>自填食物的实际营养值</summary><div class="zx-grid">${["calories", "protein", "carbs", "fat"].map((k, i) => field(k, ["热量 kcal", "蛋白质 g", "碳水 g", "脂肪 g"][i], '<input type="number" min="0" step="0.1" value="0">')).join("")}</div></details><button class="zx-button zx-primary" type="submit">保存记录</button><div data-status></div></form>`,
  );
  d.querySelector("[name=search]").oninput = (e) => {
    d.querySelector("[name=dishId]").innerHTML = options([
      ["", "自行填写食物"],
      ...catalog.dishes
        .filter((x) => (x.name + x.restaurant).includes(e.target.value))
        .map((x) => [x.id, x.name + " · " + x.restaurant]),
    ]);
  };
  d.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const f = formData(e.target);
    try {
      await api("/nutrition/records", {
        method: "POST",
        body: {
          dishId: f.dishId ? Number(f.dishId) : undefined,
          name: f.name,
          grams: Number(f.grams),
          meal: f.meal,
          eatenAt: new Date(f.eatenAt).toISOString(),
          nutrition: Object.fromEntries(
            ["calories", "protein", "carbs", "fat"].map((k) => [
              k,
              Number(f[k]),
            ]),
          ),
        },
      });
      d.close();
      await renderNutrition();
    } catch (err) {
      d.querySelector("[data-status]").innerHTML = notice(err.message, "error");
    }
  };
}
async function preferences() {
  const p = (await api("/workspace/preferences")).data;
  const d = dialog(
    "饮食目标与长期偏好",
    `<form><div class="zx-grid">${field("goal", "饮食目标", `<input value="${esc(p.goal)}" required maxlength="80">`)}${field("calorieTarget", "每日热量目标", `<input type="number" min="1000" max="5000" value="${p.calorieTarget}" required>`)}${field("exclusions", "忌口与过敏食材", `<input value="${esc(p.exclusions.join("、"))}">`)}${field("tastes", "喜欢的口味", `<input value="${esc((p.tastes || []).join("、"))}">`)}${["carbs", "protein", "fat"].map((k, i) => field(k, ["碳水比例 %", "蛋白质比例 %", "脂肪比例 %"][i], `<input type="number" min="0" max="100" value="${p.macros[k]}" required>`)).join("")}</div><button class="zx-button zx-primary">保存偏好</button><div data-status></div></form>`,
  );
  return new Promise((resolve) => {
    d.addEventListener("close", () => resolve(false));
    d.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const f = formData(e.target);
      try {
        await api("/workspace/preferences", {
          method: "PUT",
          body: {
            goal: f.goal,
            calorieTarget: Number(f.calorieTarget),
            exclusions: f.exclusions.split(/[、,，]+/).filter(Boolean),
            tastes: f.tastes.split(/[、,，]+/).filter(Boolean),
            macros: {
              carbs: Number(f.carbs),
              protein: Number(f.protein),
              fat: Number(f.fat),
            },
          },
        });
        store("nutrition-profile-established", true);
        resolve(true);
        d.close();
        await renderNutrition();
      } catch (err) {
        d.querySelector("[data-status]").innerHTML = notice(
          err.message,
          "error",
        );
      }
    };
  });
}
async function ensureProfile() {
  if (!read("nutrition-profile-established", false)) {
    const saved = await preferences();
    if (!saved) throw new Error("请先建立饮食目标与偏好");
  }
}
async function photo() {
  if (!advanced) {
    root.querySelector('[data-action="upgrade"]').click();
    return;
  }
  await ensureProfile();
  const d = dialog(
    "拍照或上传饮食照片",
    `<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment"><div id="photo-preview"></div><div data-status></div>${button("识别并校对", "recognize", true)}${button("手动校对记录", "manual")}`,
  );
  let image;
  d.querySelector("input").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      d.querySelector("[data-status]").innerHTML = notice(
        "请选择4MB内的图片。",
        "error",
      );
      return;
    }
    image = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    d.querySelector("#photo-preview").innerHTML =
      `<img class="zx-photo-preview" src="${esc(image)}" alt="饮食照片预览">`;
  };
  bind(d, {
    manual: () => {
      d.close();
      return record();
    },
    recognize: async () => {
      if (!image) throw new Error("请先选择照片");
      const r = (
        await api("/nutrition/recognize", { method: "POST", body: { image } })
      ).data;
      d.querySelector("#photo-preview").innerHTML += r.items
        .map(
          (item, i) =>
            `<p>${esc(catalog.dishes.find((x) => x.id === item.dishId)?.name)} · ${item.grams}g ${button("校对并记录", "item-" + i, true)}</p>`,
        )
        .join("");
      r.items.forEach(
        (item, i) =>
          (d.querySelector(`[data-action="item-${i}"]`).onclick = () =>
            record(item)),
      );
      d.querySelector("[data-status]").innerHTML =
        notice("请逐项核对食物和份量后保存。");
    },
  });
}
