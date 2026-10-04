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
  root.innerHTML = notice("正在加载校园内容…");
  try {
    if (kind === "social") {
      const messages = (await api("/social/messages")).data,
        proposals = (await api("/community/proposals")).data;
      if (location.hash !== "#" + kind) return;
      root.innerHTML = `<h1 class="text-4xl font-bold mb-6">食话广场</h1><div class="zx-row" style="margin-bottom:18px">${button("提出建议或反馈", "feedback", true)}${button("发起菜品共创", "proposal")}</div>${card("菜品共创", proposals.map((p) => `<div style="margin:14px 0"><b>${esc(p.title)}</b><p>${esc(p.description)} · ${p.support || 0}人支持</p>${button(p.myVote ? "已投票" : "支持", "vote").replace('data-action="vote"', `data-action="vote" data-id="${p.id}" ${p.myVote ? "disabled" : ""}`)}</div>`).join("") || "<p>暂未发布提案。</p>")}${card("校园反馈与校方回复", messages.map((m) => `<div style="padding:14px 0;border-bottom:1px solid #eee"><b>${esc(m.category || "建议")} · ${esc(m.workflow || "待处理")}</b><p>${esc(m.content)}</p><p>${m.replycontent ? "校方回复：" + esc(m.replycontent) : "等待校方处理"}</p></div>`).join("") || "<p>暂无反馈。</p>")}`;
      bind(root, {
        feedback: () => feedback(),
        proposal: () => proposal(),
        vote: async (b) => {
          await api("/community/proposals/" + b.dataset.id + "/vote", {
            method: "POST",
            body: { choice: "支持" },
          });
          await renderCampus(kind);
        },
      });
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
