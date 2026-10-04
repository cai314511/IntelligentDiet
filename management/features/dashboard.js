import {
  api,
  esc,
  money,
  button,
  card,
  source,
  notice,
  bars,
  bind,
} from "../../shared/feature-ui.js";
export async function dashboard(root, context, reload) {
  const query = new URLSearchParams(context),
    [d, f] = await Promise.all([
      api("/insights/dashboard?" + query),
      api("/insights/forecast?" + query),
    ]),
    data = d.data,
    forecast = f.data;
  const stats = [
    [
      context.from === context.to &&
      context.to ===
        new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" })
        ? "今日成交量"
        : "区间成交量",
      data.current.orders + "单",
    ],
    ["销售额", money(data.current.revenue)],
    ["翻台率", data.turnover ?? "—"],
    ["平均排队", data.averageQueue === null ? "—" : data.averageQueue + "分钟"],
    ["缺货风险", data.lowStock.length + "种"],
    ["预计可节省", forecast.savings === null ? "—" : money(forecast.savings)],
    [
      "预计浪费",
      forecast.items.some((i) => i.waste !== null)
        ? forecast.items.reduce((s, i) => s + (i.waste || 0), 0) + "份"
        : "—",
    ],
    ["待接单", data.pendingOrders + "单"],
    ["待处理反馈", data.pendingFeedback + "条"],
  ];
  root.innerHTML = `<h2 style="font-size:24px;font-weight:600;margin-bottom:20px">📊 数据统计与决策支持</h2><div class="zx-grid">${stats.map(([name, value], i) => `<section class="card zx-card" style="${i < 4 ? "background:" + ["#3b73ce", "#6bc371", "#f49d42", "#83d6c1"][i] + ";color:white" : ""}"><h3>${name}</h3><p class="zx-stat">${esc(value)}</p></section>`).join("")}</div>${card("运营趋势", `<div class="zx-row">${["hour", "day", "week"].map((p, i) => button(["小时", "日", "周"][i], p, context.period === p)).join("")}</div>${bars(data.series)}<p>上一周期：${data.previous.orders}单 · ${money(data.previous.revenue)}<br>目标营业额：${data.targets?.revenue ? money(data.targets.revenue) : "尚未设置"} ${button("设置目标", "targets")}</p>`)}${card("哪里拥堵", `<div class="zx-grid">${data.restaurants.map((r) => `<div><b>${esc(r.name)}</b><p>${r.queueCount}人 · 等待${r.queueMinutes}分钟 · ${r.queueMinutes > 20 ? "拥挤" : r.queueMinutes > 10 ? "适中" : "空闲"}</p>${source(r.sourceName, r.updatedAt)}</div>`).join("")}</div>`)}${card(
    "备餐与异常建议",
    forecast.items
      .filter((i) => i.purchase > 0 || i.waste > 0)
      .slice(0, 8)
      .map(
        (i) =>
          `<p>${esc(i.name)}：采购缺口 ${i.purchase ?? "—"}份 · 可减少备餐 ${i.waste ?? "—"}份 · 节省 ${i.savings === null ? "—" : money(i.savings)}</p>`,
      )
      .join("") || "<p>当前区间没有可计算的备餐异常。</p>",
  )}${card("同校区食堂对比", data.peers.map((r) => `<p>${esc(r.name)} · ${r.orders}单 · ${money(r.revenue)}</p>`).join(""))}${card("高频反馈分类", data.feedbackCategories.map((x) => `<p>${esc(x.name)} · ${x.count}条</p>`).join("") || "<p>暂无反馈。</p>")}${source(data.sourceName, data.updatedAt)}<div data-status></div>`;
  bind(root, {
    hour: () => reload({ ...context, period: "hour" }),
    day: () => reload({ ...context, period: "day" }),
    week: () => reload({ ...context, period: "week" }),
    targets: async () => {
      const { dialog, field, formData } = await import(
        "../../shared/feature-ui.js"
      );
      const d = dialog(
        "设置运营目标",
        `<form>${field("revenue", "营业额目标（元）", '<input type="number" min="0" required>')}<button class="zx-button zx-primary">保存</button><div data-status></div></form>`,
      );
      d.querySelector("form").onsubmit = async (e) => {
        e.preventDefault();
        try {
          await api("/operations", {
            method: "POST",
            body: {
              type: "canteen",
              title: "经营目标 " + context.from + " 至 " + context.to,
              payload: {
                kind: "dashboardTargets",
                ...context,
                restaurantId: Number(context.restaurantId) || 0,
                revenue: Number(formData(e.target).revenue),
              },
              status: "运行中",
            },
          });
          d.close();
          await reload(context);
        } catch (err) {
          d.querySelector("[data-status]").innerHTML = notice(
            err.message,
            "error",
          );
        }
      };
    },
  });
}
export async function forecast(root, context, reload) {
  const d = (await api("/insights/forecast?" + new URLSearchParams(context)))
    .data;
  root.innerHTML = `<h2 style="font-size:24px;font-weight:600;margin-bottom:20px">供需预测</h2><div class="zx-grid">${card("预计节省金额", `<p class="zx-stat">${d.savings === null ? "—" : money(d.savings)}</p>`)}${card("预测准确率", `<p class="zx-stat">${d.accuracy === null ? "—" : d.accuracy + "%"}</p><p>MAE：${d.mae ?? "—"} · 历史 ${d.trainingDays}天 / ${d.historyOrders}单</p>`)}</div>${card("未来时段菜品需求", bars(d.hourly, "demand"))}${card("未来时段就餐人次", bars(d.hourly, "visits"))}${card("菜品备餐与采购建议", '<div id="forecast-table"></div>')}<p class="zx-source">${esc(d.method)}</p>${source("历史订单与库存台账", new Date().toISOString())}`;
  const { table } = await import("./table.js");
  table(
    root.querySelector("#forecast-table"),
    d.items,
    [
      { key: "name", label: "菜品" },
      { key: "restaurant", label: "食堂" },
      { key: "stock", label: "库存" },
      { key: "demand", label: "预测销量" },
      { key: "prepare", label: "备餐建议" },
      { key: "purchase", label: "采购缺口" },
      { key: "waste", label: "可减少备餐" },
      { key: "savings", label: "可节省金额" },
    ],
    {
      生成采购计划: async (r) => {
        if (r.purchase === null || r.purchase <= 0)
          throw new Error("当前菜品没有可计算的采购缺口");
        await api("/operations", {
          method: "POST",
          body: {
            type: "procurement",
            title: r.name + "采购计划",
            status: "待采购",
            payload: {
              dishId: r.id,
              restaurantId: context.restaurantId || "",
              campus: r.campus,
              window: r.window,
              quantity: r.purchase,
              unitCost: r.unitCost,
              owner: "",
              arrivalStatus: "待到货",
            },
          },
        });
        window.toast?.("采购计划已生成", "success");
      },
    },
  );
}
