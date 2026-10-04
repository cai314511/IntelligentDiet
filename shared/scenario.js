import {
  api,
  esc,
  session,
  button,
  card,
  notice,
  dialog,
  bind,
} from "./feature-ui.js";
export async function preflight() {
  const d = dialog("运行自检", notice("正在检查服务和页面资源…"));
  try {
    const [check, catalog] = await Promise.all([
      api("/workspace/checks"),
      api("/workspace/catalog"),
    ]);
    const assets = [
      ...new Set([
        "/assets/brand/xiaozhi-body.png",
        "/assets/brand/zhixiang-app-icon.png",
        "/canteen/dish-placeholder.svg",
        ...catalog.data.dishes.map((x) => x.image).filter(Boolean),
      ]),
    ];
    const results = await Promise.all(
      assets.map(
        (url) =>
          new Promise((resolve) => {
            const img = new Image(),
              timer = setTimeout(() => resolve({ url, ok: false }), 5000);
            img.onload = () => {
              clearTimeout(timer);
              resolve({ url, ok: true });
            };
            img.onerror = () => {
              clearTimeout(timer);
              resolve({ url, ok: false });
            };
            img.src = url;
          }),
      ),
    );
    if (!d.isConnected) return;
    const c = check.data;
    d.querySelector(".zx-status").outerHTML = card(
      "检查结果",
      `<p>学校：${esc(c.school)}<br>服务连接：${c.api ? "正常" : "未连接"}<br>数据库：${c.database ? "正常" : "未连接"}<br>登录账户：${esc(session().user.xingming)} · ${session().identity === "admin" ? "校方" : "学生"}<br>模型：${c.modelConfigured ? "已配置" : "未配置，点餐可使用数据库规则"}<br>在售菜品：${c.menus} · 食堂：${c.restaurants}<br>图片资源：${results.filter((x) => x.ok).length}/${results.length}可用</p>${results
        .filter((x) => !x.ok)
        .map((x) => `<p class="zx-source">无法加载：${esc(x.url)}</p>`)
        .join("")}<p class="zx-source">检查时间：${esc(c.checkedAt)}</p>`,
    );
  } catch (e) {
    if (!d.isConnected) return;
    d.querySelector(".zx-status").outerHTML =
      notice(e.message, "error") + button("重新检查", "retry");
    bind(d, {
      retry: () => {
        d.close();
        preflight();
      },
    });
  }
}
export function scenario() {
  const s = session(),
    student = s.identity === "student";
  const d = dialog(
    "就餐流程导览",
    `<p>${esc(s.school.name)} · 一人午餐 · 预算30元 · 少排队 · 需要座位</p><ol style="padding:20px;line-height:2"><li>小智理解需求，检索本校菜单和排队信息。</li><li>核对就餐方案，修改菜品、座位或时间。</li><li>确认创建未支付订单，再单独确认费用支付。</li><li>在我的订单查看制作状态和取餐码。</li><li>通过共用登录入口切换校方身份，接单、叫号和核销。</li><li>在供需预测查看销量、库存缺口、备餐及采购建议。</li></ol><div class="zx-row">${button("运行自检", "checks")}${student ? button("开始预置场景", "start", true) + button("查看我的订单", "orders") + button("切换校方入口", "switch") : button("订单管理", "orders", true) + button("供需预测", "forecast")}</div>`,
  );
  bind(d, {
    checks: () => {
      d.close();
      return preflight();
    },
    start: () => {
      d.close();
      return window.openAgent("一人午餐，预算30元，少排队，需要座位", {
        budget: 30,
        people: 1,
        reserve: true,
        sort: "queue",
      });
    },
    orders: () => {
      d.close();
      if (student) window.navigate("orders");
      else
        window.dispatchEvent(
          new CustomEvent("zx-admin-refresh", { detail: "orders" }),
        );
    },
    forecast: () => {
      d.close();
      window.dispatchEvent(
        new CustomEvent("zx-admin-refresh", { detail: "forecast" }),
      );
    },
    switch: () => {
      const schoolId = s.school.id;
      [
        "zx_session",
        "zx_token",
        "zx_user",
        "zx_admin_token",
        "zx_admin_name",
      ].forEach((k) => localStorage.removeItem(k));
      location.href =
        "/?identity=admin&schoolId=" + encodeURIComponent(schoolId);
    },
  });
}
