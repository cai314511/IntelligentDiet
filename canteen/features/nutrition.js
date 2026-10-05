import {dishPhoto} from '../../shared/dish-photo.js';
import {showNutritionHistory} from "./nutrition-history.js";
import {membershipDialog,preferenceWizard,dietPlans,illustratedReport,portraitSummary,showPortrait} from "./nutrition-extras.js";
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
let root, catalog, report, records, advanced, selectedDay, access;
export async function renderNutrition() {
  root = document.getElementById("app-root");
  root.dataset.view = "nutrition";
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
    access = data[3].data; advanced = access.advanced;
    selectedDay ??= report.today.day;
    draw();
    if (advanced && !report.profile.profileEstablished && !read("nutrition-profile-established",false) && !read("nutrition-profile-invited",false)) {store("nutrition-profile-invited",true);preferences();}
    if (!advanced && !read("nutrition-expired-ad",false)) {store("nutrition-expired-ad",true); membershipDialog(access,renderNutrition);}
  } catch (e) {
    root.innerHTML = notice(e.message, "error") + button("重新加载", "reload");
    bind(root, { reload: renderNutrition });
  }
}
function draw() {
  const day = report.days.find((d) => d.day === selectedDay) || report.today;
  const energy = day.protein * 4 + day.carbs * 4 + day.fat * 9;
  root.innerHTML = `<h1 class="text-4xl font-bold mb-6">AI营养师</h1><div class="zx-row" style="margin-bottom:22px">${button("🍽️ 手动记录", "record", true)}${button((advanced?"📸 ":"🔒 ")+"拍照 / 上传识别", "photo")}${button("🎯 编辑饮食目标与偏好", "preferences")}${button("📝 自定义饮食方案", "plans")}</div>${access.admin?"":`<p class="zx-row">${access.member?"营养会员有效至 "+esc(dateTime(access.expires_at)):advanced?"免费试用至 "+esc(dateTime(access.trialEndsAt)):"免费功能可继续使用"}${button(access.member?"管理会员":"查看会员方案","upgrade")}</p>`}${advanced&&report.profile.profileEstablished?portraitSummary(report.profile):""}<div class="zx-grid">${card("今日评分", `<p class="zx-stat">${report.score ?? "—"}</p><p>目标 ${report.profile.calorieTarget} kcal · 已记录 ${report.today.calories.toFixed(0)} kcal</p>`)}${card("营养结构", `${["protein", "carbs", "fat"].map((k, i) => `<div class="zx-macro"><p>${["蛋白质", "碳水化合物", "脂肪"][i]}：${day[k].toFixed(1)}g · ${energy ? Math.round(((day[k] * (k === "fat" ? 9 : 4)) / energy) * 100) : 0}%</p><div><i style="width:${energy ? Math.min(100, (day[k] * (k === "fat" ? 9 : 4)) / energy * 100) : 0}%;background:${["#ff9500", "#ff453a", "#30c65a"][i]}"></i></div></div>`).join("")}`)}${card("主要问题", report.issues.map((t) => `<p>${esc(t)}</p>`).join(""))}${card("下一餐建议", `<p>${esc(report.recommendationContext?.note||"结合已记录餐次与饮食目标选择份量。")}</p>`)}</div>${card(
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
            `<div class="zx-row" style="justify-content:space-between;padding:8px 0">${dishPhoto(r,{catalog:catalog.dishes,width:"56px",height:56})}<span style="flex:1">${esc(r.name)} · ${r.grams}g · ${esc(r.meal)} · ${esc(dateTime(r.eaten_at))}</span>${r.nutrition?.supplemented?'<span class="nutrition-record-sample">示例补录</span>':""}${button("删除", "delete").replace('data-action="delete"', `data-action="delete" data-id="${r.id}"`)}</div>`,
        )
        .join("") || "<p>这一天尚未记录餐次。</p>"
    }`,
  )}${card("本校下一餐推荐", `<p class="nutrition-recommendation-context">${esc(report.recommendationContext?.note||"")}</p><div class="zx-grid">${(advanced ? report.recommendations : report.recommendations.slice(0, 1)).map((d) => `<div class="zx-nutrition-dish">${dishPhoto(d)}<b>${esc(d.name)}</b><p>${esc(d.restaurant)} · ${money(d.price)} · ${d.nutrition.calories} kcal / 菜单份</p><p>建议参考份量 ${d.suggestedGrams}g · 约 ${d.suggestedNutrition?.calories} kcal</p><p class="nutrition-rec-reason">${esc(d.recommendationReason||"")}</p>${button("请小智规划", "recommend", true).replace('data-action="recommend"', `data-action="recommend" data-id="${d.id}"`)}</div>`).join("")}</div>${report.recommendations.length?"":notice(report.recommendationContext?.emptyReason||"暂没有满足画像的推荐菜品")}`)}${card("深度点评与长期趋势", advanced ? `${button("生成深度点评", "deep", true)}${button("查看90天趋势", "trend")}<div id="nutrition-deep"></div>` : `<div class="zx-locked"><p>营养问题分析 · 精准推荐 · 长期饮食趋势</p><div class="zx-chart"><i style="height:80px;width:100%;background:#eef5fc"></i></div></div><p>会员权益：拍照识别、AI深度点评、本校精准推荐和长期趋势。</p>${button("查看会员权益", "upgrade")}`)}${source(report.sourceName, report.updatedAt)}`;
  decorateNutritionCards();
  bind(root, {
    reload: renderNutrition,
    record: () => record(),
    photo: photo,
    preferences: preferences,
    portrait: b => showPortrait(report.profile,b,preferences),
    plans: dietPlans,
    history: b => showNutritionHistory(report,b),
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
        illustratedReport(report,r.text)+source(r.sourceName,new Date().toISOString());
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
    upgrade: () => membershipDialog(access,renderNutrition),
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
 if(!advanced) {membershipDialog(access,renderNutrition); return false;}
 return preferenceWizard(async()=>{store("nutrition-profile-established",true);await renderNutrition();});
}
async function ensureProfile() {
  if (!report.profile.profileEstablished && !read("nutrition-profile-established", false)) {
    const saved = await preferences();
    if (!saved) throw new Error("请先建立饮食目标与偏好");
  }
}
async function photo() {
  if (!advanced) {
    membershipDialog(access,renderNutrition);
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

function decorateNutritionCards() {
 const icons={"今日评分":"🎯","营养结构":"🥗","主要问题":"🔎","下一餐建议":"🍱","近14天饮食记录":"📅","本校下一餐推荐":"🍽️","深度点评与长期趋势":"📊"};
 root.querySelectorAll('.zx-card > h3').forEach(h=>{const icon=icons[h.textContent.trim()];if(!icon)return;const mark=document.createElement('span');mark.className='nutrition-card-icon';mark.setAttribute('aria-hidden','true');mark.textContent=icon;h.prepend(mark);});
 const heading=[...root.querySelectorAll('.zx-card > h3')].find(h=>h.textContent.includes('近14天饮食记录'));
 if(heading){const row=document.createElement('div');row.className='nutrition-history-heading';heading.before(row);row.append(heading);row.insertAdjacentHTML('beforeend',button('📊 查看14天饮食状况','history',true));}

}
