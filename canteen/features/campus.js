import { bjfuCulturePage, isBjfuCultureAccount } from "./bjfu-culture.js";
import { cufeCulturePage, isCufeCultureAccount } from "./cufe-culture.js";
import { renderSocial } from "./social.js";
import {
  api,
  esc,
  money,
  dateTime,
  session,
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
export async function renderCampus(kind) {
  const root = document.getElementById("app-root");
  root.dataset.view = kind;
  root.innerHTML = notice("正在加载校园内容…");
  try {
    if (kind === "social") {
      await renderSocial(root);
    } else {
      const [a, c, p] = await Promise.all([
        api("/activities"),
        api("/activities/culture"),
        api("/community/points"),
      ]);
      const [mine, signups] = await Promise.all([
        api("/activities/culture/orders/mine"),
        api("/activities/users/mine"),
      ]);
      if (location.hash !== "#" + kind) return;
      root.innerHTML = `<h1 class="text-4xl font-bold mb-6">文创活动</h1>${card("校园积分", `<p class="zx-stat">${p.data.balance}</p><p>活动参与和菜品共创获得积分，可兑换校园文创。</p>${p.data.redemptions.map((r) => `<p>${esc(r.title)} · ${esc(r.status)}</p>`).join("")}`)}${card("我的参与与文创订单", `<div>${signups.data.map((x) => `<p>${esc(x.title)} · ${esc(x.signupStatus)} · ${esc(dateTime(x.startsAt))}</p>`).join("")}${mine.data.map((x) => `<p>${esc(x.title)} × ${x.quantity} · ${money(x.total)} · ${esc(x.status)}</p>`).join("") || "<p>暂无文创订单。</p>"}</div>`)}${card("校园活动", `<div class="zx-grid">${a.data.map((x) => card(x.title, `<p>${esc(x.description)}</p><p>${esc(x.campus)} · ${esc(x.location)}<br>${esc(dateTime(x.startsAt))}—${esc(dateTime(x.endsAt))}</p>${source(x.sourceName, x.startsAt)}${button("报名参加", "join", true).replace('data-action="join"', `data-action="join" data-id="${x.id}"`)}`)).join("") || "<p>暂无活动。</p>"}</div>`)}${card("校园文创与积分兑换", `<div class="zx-grid">${c.data.map((x) => card(x.title, `<p>${esc(x.description)}</p><p>${money(x.price)} · 库存 ${x.stock}</p>${source(x.sourceName)}<div class="zx-row">${button("确认购买", "buy", true).replace('data-action="buy"', `data-action="buy" data-id="${x.id}"`)}${button("积分兑换", "redeem").replace('data-action="redeem"', `data-action="redeem" data-id="${x.id}"`)}</div>`)).join("")}</div>`)}<div data-status></div>`;
      if (isCufeCultureAccount(session())) {
        root.innerHTML = cufeCulturePage({activities:a.data,items:c.data,points:p.data,orders:mine.data,signups:signups.data});
      }
      if (isBjfuCultureAccount(session())) {
        root.innerHTML = bjfuCulturePage({activities:a.data,items:c.data,points:p.data,orders:mine.data,signups:signups.data});
      }
      bind(root, {
        join: async (b) => {
          await api("/activities/" + b.dataset.id + "/join", {
            method: "POST",
          });
          await renderCampus(kind);
        },
        buy: (b) => {
          const item = c.data.find((x) => x.id === Number(b.dataset.id));
          const d = dialog(
            "确认文创购买",
            `<p>${esc(item.title)} × 1 · 总计 ${money(item.price)}</p>${button("确认余额支付", "confirm", true)}<div data-status></div>`,
          );
          bind(d, {
            confirm: async () => {
              await api("/activities/culture/" + item.id + "/purchase", {
                method: "POST",
                body: { quantity: 1 },
              });
              d.close();
              await renderCampus(kind);
              await refreshBalance();
            },
          });
        },
        redeem: (b) => {
          const item = c.data.find((x) => x.id === Number(b.dataset.id));
          const points = Math.max(1, Math.round(item.price * 10));
          const d = dialog(
            "确认积分兑换",
            `<p>${esc(item.title)} · 需要 ${points}积分</p>${button("确认兑换", "confirm", true)}<div data-status></div>`,
          );
          bind(d, {
            confirm: async () => {
              await api("/community/redeem/" + item.id, { method: "POST" });
              d.close();
              await renderCampus(kind);
            },
          });
        },
      });
    }
  } catch (e) {
    root.innerHTML = notice(e.message, "error") + button("重新加载", "retry");
    bind(root, { retry: () => renderCampus(kind) });
  }
}
async function refreshBalance() {
  const user = (await api("/users/me")).data;
  window.setSession(window.getToken(), user);
  window.renderUserEntry();
}
function feedback() {
  const d = dialog(
    "提交校园反馈",
    `<form>${field("category", "类别", `<select>${options(["投诉", "建议", "菜品问题", "服务问题"].map((x) => [x, x]))}</select>`)}${field("content", "内容", '<textarea required maxlength="2000"></textarea>')}<button class="zx-button zx-primary">提交反馈</button><div data-status></div></form>`,
  );
  d.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api("/social/messages", {
        method: "POST",
        body: formData(e.target),
      });
      d.close();
      await renderCampus("social");
    } catch (err) {
      d.querySelector("[data-status]").innerHTML = notice(err.message, "error");
    }
  };
}
function proposal() {
  const d = dialog(
    "发起菜品共创",
    `<form>${field("title", "标题", '<input required maxlength="100">')}${field("description", "说明", '<textarea required maxlength="2000"></textarea>')}<button class="zx-button zx-primary">发布提案</button><div data-status></div></form>`,
  );
  d.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api("/community/proposals", {
        method: "POST",
        body: formData(e.target),
      });
      d.close();
      await renderCampus("social");
    } catch (err) {
      d.querySelector("[data-status]").innerHTML = notice(err.message, "error");
    }
  };
}
