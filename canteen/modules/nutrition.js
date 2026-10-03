import {
  api,
  post,
  del,
  esc,
  options,
  modal,
  closeModal,
  toast,
  dateTime,
  chart,
  empty,
  source,
  store,
} from "../../shared/core.js";
import { dishCard } from "./menu.js";
function nowLocal() {
  const now = new Date();
  return new Date(now - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export async function render(ctx) {
  const [report, records, rights] = await Promise.all([
    api("/nutrition/report"),
    api("/nutrition/records"),
    api("/nutrition/entitlements"),
  ]);
  ctx.nutritionReport = report.data;
  ctx.foodRecords = records.data;
  ctx.advanced = rights.data.advanced;
  const r = report.data,
    t = r.today,
    totalEnergy = t.carbs * 4 + t.protein * 4 + t.fat * 9,
    carbs = totalEnergy ? ((t.carbs * 4) / totalEnergy) * 100 : 0,
    protein = totalEnergy ? ((t.protein * 4) / totalEnergy) * 100 : 0;
  const selected = ctx.nutritionDay || t.day,
    dayRecords = records.data.filter(
      (x) =>
        new Date(x.eaten_at).toLocaleDateString("sv-SE", {
          timeZone: "Asia/Shanghai",
        }) === selected,
    );
  return `<div class="page-head row spread wrap"><div><span class="eyebrow">NOURISH YOUR DAY</span><h1>吃得有记录，健康有方向</h1><p>目标与忌口持续生效，可在“我的”随时调整。</p></div><div class="row"><button class="btn secondary" data-action="photo-record">拍照记录</button><button class="btn" data-action="manual-record">记录一餐 ＋</button></div></div><div class="grid three"><section class="card nutrition-hero"><span class="eyebrow">TODAY</span><h3 style="margin-top:6px">今日目标匹配度</h3><h1 style="font-size:55px;margin:13px 0">${r.score ?? "—"}<small style="font-size:15px"> / 100</small></h1><p>已记录 ${t.records} 餐 · ${Math.round(t.calories)} / ${r.profile.calorieTarget || 2000} kcal</p><div class="progress" style="margin:14px 0"><i style="width:${Math.min(100, (t.calories / (r.profile.calorieTarget || 2000)) * 100)}%"></i></div><small>按已记录热量与自定日目标的偏差计算</small></section><section class="card"><h3>营养结构</h3><div class="macro-ring" style="margin-top:17px;background:${totalEnergy ? "conic-gradient(#739bd3 0 ${carbs}%,#e8b765 ${carbs}% ${carbs+protein}%,#7cbaa0 ${carbs+protein}% 100%)" : "#e8eeed"}"><strong>${Math.round(t.calories)}<small style="display:block;font-size:11px;text-align:center">kcal</small></strong></div><div class="macro-legend"><span><i style="background:#739bd3"></i>碳水 ${Math.round(t.carbs)}g</span><span><i style="background:#e8b765"></i>蛋白 ${Math.round(t.protein)}g</span><span><i style="background:#7cbaa0"></i>脂肪 ${Math.round(t.fat)}g</span></div></section><section class="card"><h3>主要问题与下一餐</h3><div class="side-list">${r.issues.map((i) => `<p>• ${esc(i)}</p>`).join("")}<p>按目标 ${esc(r.profile.goal || "均衡饮食")} 安排下一餐，留意菜单过敏原。</p></div><a href="#agent" class="btn secondary" style="margin-top:22px">让小智帮我搭配</a></section></div><section class="card" style="margin-top:20px"><div class="row spread wrap"><h3>近 14 天饮食记录</h3><small>${r.recordedDays} 天有记录 · ${r.missingDays} 天未记录</small></div><div class="calendar" style="margin-top:18px">${r.days.map((d) => `<button data-action="nutrition-day" data-day="${d.day}" class="${d.records ? "recorded" : ""} ${d.day === selected ? "selected" : ""}"><b>${d.day.slice(8)}</b>${d.records ? `${Math.round(d.calories)} kcal` : "未记录"}<br>${esc(d.meals.join(" · ") || "—")}</button>`).join("")}</div><h3 style="margin-top:22px">${esc(selected)} · ${dayRecords.length} 餐</h3>${dayRecords.length ? dayRecords.map((d) => `<div class="log-item row spread"><div><b>${esc(d.name)}</b><p>${esc(d.meal)} · ${d.grams} g · ${Math.round(Number(d.nutrition.calories) || 0)} kcal · ${esc(dateTime(d.eaten_at))}</p></div><button class="btn ghost" data-action="delete-record" data-id="${d.id}">删除</button></div>`).join("") : '<p class="muted" style="margin-top:12px">这一天还没有饮食记录。</p>'}${source(r.sourceName, r.updatedAt)}</section><section class="card ${ctx.advanced ? "" : "locked"}" style="margin-top:20px"><div class="row spread wrap"><div><span class="eyebrow">NUTRITION PLUS</span><h3 style="margin-top:6px">深度点评与长期趋势 ${ctx.advanced ? "" : "▣"}</h3></div><button class="btn secondary" data-action="${ctx.advanced ? "deep-report" : "membership"}">${ctx.advanced ? "生成深度点评" : "查看会员权益"}</button></div>${ctx.advanced ? `<p class="muted" style="margin-top:16px">${esc(ctx.deepReport?.text || "记录饮食后，可结合偏好生成点评，并查看长期趋势。")}</p>${ctx.deepReport ? `<small>${esc(ctx.deepReport.sourceName)}</small>` : ""}<button class="btn ghost" data-action="nutrition-trend" style="margin-top:10px">查看 90 天记录趋势 →</button>` : '<div class="locked-preview"><p>每日结构趋势与本校菜品搭配</p><div class="chart"><div class="chart-column"><i style="height:50px"></i></div><div class="chart-column"><i style="height:90px"></i></div><div class="chart-column"><i style="height:70px"></i></div></div></div><p class="muted">会员包含拍照识别、深度点评、精准推荐和长期趋势。</p>'}</section><h2 class="section-title">下一餐 · 本校菜品建议</h2>${ctx.advanced ? `<div class="dish-grid">${r.recommendations.map((d) => `<div>${dishCard(d)}<button class="btn ghost" data-action="nutrition-task" data-id="${d.id}">用这道菜规划一餐 →</button></div>`).join("")}</div>` : `<div class="card locked"><h3>本校菜品精准推荐 ▣</h3><p class="muted">基础点餐、占座与拥挤度查询永久免费。</p><button class="btn secondary" style="margin-top:15px" data-action="membership">查看权益</button></div>`}`;
}
function recordForm(ctx, initial = {}) {
  const foods = ctx.data.dishes.filter((d) => d.forSale);
  const selected = Number(initial.dishId) || foods[0]?.id || 0,
    dish = foods.find((d) => d.id === selected);
  const d = modal(
    "记录一餐",
    `<form data-action="save-record"><label>搜索菜品</label><input id="record-search" data-input="record-search" placeholder="输入菜名筛选"><label>食物</label><select id="record-dish" name="dishId" data-change="record-dish">${options([{ value: 0, label: "其他食物（手动填写）" }, ...foods.map((d) => ({ value: d.id, label: `${d.name} · ${d.restaurant}` }))], selected)}</select><div id="record-custom" ${selected ? "hidden" : ""}><label>食物名称</label><input name="name" maxlength="80"><div class="form-grid">${[
      ["calories", "热量 kcal"],
      ["protein", "蛋白质 g"],
      ["carbs", "碳水 g"],
      ["fat", "脂肪 g"],
    ]
      .map(
        ([key, label]) =>
          `<div><label>${label}（这一份）</label><input type="number" min="0" step="0.1" name="${key}"></div>`,
      )
      .join(
        "",
      )}</div></div><div class="form-grid"><div><label>实际份量 g</label><input id="record-grams" name="grams" type="number" step="0.1" min="1" max="5000" value="${initial.grams || dish?.portionG || 300}" required></div><div><label>餐次</label><select name="meal">${options(["早餐", "午餐", "晚餐", "加餐"], "午餐")}</select></div></div><label>就餐时间</label><input type="datetime-local" name="eatenAt" value="${nowLocal()}" max="${nowLocal()}" required><div class="actions"><button class="btn" type="submit">保存饮食记录</button></div></form>`,
  );
  ctx.recordFoods = foods;
  return d;
}
async function photo(ctx) {
  const d = modal(
    "拍照 / 上传饮食记录",
    `<p class="muted">选择餐盘照片或账单截图，识别后由你校对菜品和份量。</p><label>选择图片或拍照</label><input id="record-photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" data-change="photo-file"><div id="photo-preview" style="margin-top:15px"></div><p id="photo-status" class="muted" role="status"></p><div class="actions"><button class="btn secondary" data-action="photo-manual">手动校对并记录</button><button class="btn" data-action="photo-recognize" ${ctx.advanced ? "" : "disabled"} id="photo-recognize" disabled>识别照片</button></div>${ctx.advanced ? "" : '<div class="info-box" style="margin-top:18px">拍照识别为会员权益。<button class="btn ghost" data-action="membership">查看权益</button></div>'}`,
  );
  ctx.photoData = null;
}
export const actions = {
  "manual-record": (ctx) => {
    ctx.recognized = [];
    recordForm(ctx);
  },
  "record-search": (ctx, e) => {
    const q = e.target.value;
    document.getElementById("record-dish").innerHTML = options([
      { value: 0, label: "其他食物（手动填写）" },
      ...ctx.recordFoods
        .filter((d) => d.name.includes(q))
        .map((d) => ({ value: d.id, label: `${d.name} · ${d.restaurant}` })),
    ]);
    document.getElementById("record-custom").hidden = false;
  },
  "record-dish": (ctx, e) => {
    const d = ctx.data.dishes.find((d) => d.id === Number(e.target.value));
    document.getElementById("record-custom").hidden = Boolean(d);
    if (d) document.getElementById("record-grams").value = d.portionG;
  },
  "save-record": async (ctx, e) => {
    const f = Object.fromEntries(new FormData(e.target)),
      body = {
        dishId: Number(f.dishId) || null,
        name: f.name,
        grams: Number(f.grams),
        meal: f.meal,
        eatenAt: new Date(f.eatenAt).toISOString(),
        nutrition: Object.fromEntries(
          ["calories", "protein", "carbs", "fat"].map((k) => [k, Number(f[k])]),
        ),
      };
    await post("/nutrition/records", body);
    closeModal();
    toast("饮食记录已保存", "success");
    if (ctx.recognized?.length) {
      ctx.recognized.shift();
      if (ctx.recognized.length) {
        recordForm(ctx, ctx.recognized[0]);
        toast(`继续校对剩余 ${ctx.recognized.length} 项`);
      }
    }
    ctx.render();
  },
  "nutrition-day": (ctx, e) => {
    ctx.nutritionDay = e.target.closest("[data-day]").dataset.day;
    ctx.render();
  },
  "delete-record": (ctx, e) => {
    modal(
      "删除饮食记录",
      `<p>确认删除这一餐记录？</p><div class="actions"><button class="btn danger" data-action="delete-record-confirm" data-id="${e.target.closest("[data-id]").dataset.id}">确认删除</button></div>`,
    );
  },
  "delete-record-confirm": async (ctx, e) => {
    await del(`/nutrition/records/${e.target.closest("[data-id]").dataset.id}`);
    closeModal();
    ctx.render();
  },
  "photo-record": photo,
  "photo-file": async (ctx, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 4 * 1024 * 1024
    )
      throw new Error("请选择 4 MB 内的 JPG、PNG 或 WebP");
    ctx.photoData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const image = document.createElement("img");
    image.src = ctx.photoData;
    image.alt = "待校对的饮食照片";
    image.className = "photo-preview";
    document.getElementById("photo-preview").replaceChildren(image);
    document.getElementById("photo-recognize").disabled = !ctx.advanced;
  },
  "photo-manual": (ctx) => recordForm(ctx),
  "photo-recognize": async (ctx) => {
    if (!ctx.photoData) throw new Error("请先选择图片");
    document.getElementById("photo-status").textContent =
      "正在识别，完成后请校对…";
    try {
      const result = (
        await post("/nutrition/recognize", { image: ctx.photoData })
      ).data;
      if (!result.items.length)
        throw new Error("没有匹配到本校菜品，请手动校对");
      ctx.recognized = result.items;
      recordForm(ctx, result.items[0]);
      toast(
        `识别到 ${result.items.length} 项，先校对第 1 项；保存后继续校对下一项`,
      );
    } catch (e) {
      document.getElementById("photo-status").textContent = e.message;
      throw e;
    }
  },
  "deep-report": async (ctx) => {
    ctx.deepReport = (await post("/nutrition/deep-report", {})).data;
    ctx.render();
  },
  "nutrition-trend": async () => {
    const rows = (await api("/nutrition/trend")).data;
    modal(
      "近 90 天记录趋势",
      rows.length
        ? chart(rows.map((r) => ({ label: r.day.slice(5), value: r.calories })))
        : empty("还没有长期记录"),
    );
  },
  "nutrition-task": async (ctx, e) => {
    const id = Number(e.target.closest("[data-id]").dataset.id),
      d = ctx.data.dishes.find((d) => d.id === id);
    const p = (
      await post("/tasks", {
        message: `用${d.name}规划一餐`,
        constraints: {
          dishId: id,
          restaurantId: d.restaurantId,
          budget: Math.max(30, d.price),
          goal: ctx.preferences.goal,
        },
      })
    ).data;
    ctx.latestPlan = p;
    store("plan", p);
    await ctx.load();
    ctx.navigate("agent");
  },
};
