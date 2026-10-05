import {acceptsProfile, acceptsNutritionGoal} from "./preferenceFilter.js";
import {displaySeat} from "./floorLayout.js";
import { modelRequest } from "./modelClient.js";
import { randomUUID } from "crypto";
import { db } from "../database.js";
import { config } from "../config.js";
import { catalog, parse } from "./catalog.js";
export async function understand(message, history = []) {
  if (!(config.aiBaseUrl && config.aiApiKey && config.aiModel)) {
    const budget = [...message.matchAll(/(\d+(?:\.\d+)?)\s*(元|块)/g)].at(-1),
      people = [
        ...message
          .replace(/一个人/g, "1人")
          .replace(/两个人|两人/g, "2人")
          .replace(/三个人/g, "3人")
          .matchAll(/([1-6])\s*(人|位)/g),
      ].at(-1),
      time = [
        ...message.matchAll(/(?:^|\D)([01]?\d|2[0-3])[:：]([0-5]\d)/g),
      ].at(-1);
    let startsAt;
    if (time) {
      const day = new Date().toLocaleDateString("sv-SE", {
        timeZone: "Asia/Shanghai",
      });
      const at = new Date(
        `${day}T${time[1].padStart(2, "0")}:${time[2]}:00+08:00`,
      );
      if (at <= new Date()) at.setDate(at.getDate() + 1);
      startsAt = at.toISOString();
    }
    return {
      constraints: {
        ...(budget ? { budget: Number(budget[1]) } : {}),
        ...(people ? { people: Number(people[1]) } : {}),
        ...(startsAt ? { startsAt } : {}),
        ...(/低脂|减脂/.test(message)
          ? { goal: "低脂" }
          : /蛋白|增肌/.test(message)
            ? { goal: "高蛋白" }
            : {}),
        ...(/排队|最快|快点/.test(message) ? { sort: "queue" } : {}),
        ...(/不.{0,3}(占座|选座|座位|预约)/.test(message)
          ? { reserve: false }
          : /占座|选座|座位|预约/.test(message)
            ? { reserve: true }
            : {}),
        ...(/不辣|不吃辣/.test(message) ? { exclusions: ["辣"] } : {}),
      },
      mode: "database",
    };
  }
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), config.aiTimeoutMs);
  try {
    const response = await requestModel({
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.aiApiKey}`,
      },
      body: JSON.stringify({
        model: config.aiModel,
        messages: [
          {
            role: "system",
            content:
              "理解校园就餐需求，通过 prepare_meal_plan 工具给出条件，不得承诺已下单或付款。预算为所有人的合计预算。用户未给出的条件不要填。",
          },
          ...history
            .filter(
              (x) =>
                x &&
                ["user", "assistant"].includes(x.role) &&
                typeof x.content === "string",
            )
            .slice(-8)
            .map((x) => ({ role: x.role, content: x.content.slice(0, 2000) })),
          { role: "user", content: message },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "prepare_meal_plan",
              description: "根据已明确的条件查询学校菜单并准备待确认就餐方案",
              parameters: {
                type: "object",
                properties: {
                  budget: { type: "number" },
                  goal: { type: "string" },
                  campus: { type: "string" },
                  query: { type: "string" },
                  sort: {
                    type: "string",
                    enum: ["distance", "queue", "price", "rating", "sales"],
                  },
                  people: { type: "integer", minimum: 1, maximum: 6 },
                  reserve: { type: "boolean" },
                  exclusions: { type: "array", items: { type: "string" } },
                  tastes: { type: "array", items: { type: "string" } },
                  startsAt: { type: "string" },
                },
                required: [],
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "prepare_meal_plan" },
        },
      }),
    });
    if (!response.ok) throw new Error("智能服务暂不可用");
    const data = await response.json(),
      call = data.choices?.[0]?.message?.tool_calls?.find(
        (c) => c.function?.name === "prepare_meal_plan",
      );
    if (!call) throw new Error("智能服务未返回可执行方案条件");
    return { constraints: JSON.parse(call.function.arguments), mode: "agent" };
  } finally {
    clearTimeout(timer);
  }
}
export function planMeal(
  user,
  input = {},
  message = "",
  onProgress = () => {},
) {
  const profile = parse(
    db
      .prepare("SELECT profile_json FROM nutrition_profiles WHERE user_id=?")
      .get(user.id)?.profile_json,
    { goal: "均衡饮食", exclusions: [], tastes: [] },
  );
  const constraints = {
    budget: 30,
    goal: profile.goal,
    sort: "distance",
    people: 1,
    reserve: false,
    ...input,
  };
  constraints.people = Number(constraints.people);
  constraints.budget = Number(constraints.budget);
  if (
    !Number.isSafeInteger(constraints.people) ||
    constraints.people < 1 ||
    constraints.people > 6 ||
    !Number.isFinite(constraints.budget) ||
    constraints.budget <= 0 ||
    constraints.budget > 6000
  )
    throw Object.assign(new Error("请检查预算与用餐人数"), { status: 400 });
  const dataForExclusions = catalog(user.schoolId);
  const terms = [
    ...new Set(
      dataForExclusions.dishes.flatMap((d) => [
        ...d.ingredients,
        ...d.allergens,
      ]),
    ),
  ].filter((t) => t.length > 1 && t.length < 12);
  const messageExclusions = terms.filter((t) =>
    [`不吃${t}`, `不要${t}`, `对${t}过敏`, `${t}过敏`].some((x) =>
      message.includes(x),
    ),
  );
  constraints.exclusions = [
    ...new Set([
      ...(Array.isArray(input.exclusions)
        ? input.exclusions
        : [...messageExclusions, ...(profile.exclusions || [])]),
    ]),
  ]
    .map(String)
    .slice(0, 30);
  constraints.tastes = Array.isArray(input.tastes)
    ? input.tastes
    : profile.tastes || [];
  onProgress(2);
  const data = catalog(user.schoolId);
  let candidates = data.dishes.filter(
    (d) =>
      d.forSale &&
      acceptsProfile(d,profile) &&
      acceptsNutritionGoal(d,constraints.goal) &&
      d.stock >= constraints.people &&
      d.price * constraints.people <= constraints.budget &&
      d.restaurantId &&
      (!constraints.campus || d.campus === constraints.campus) &&
      (!constraints.restaurantId ||
        d.restaurantId === Number(constraints.restaurantId)) &&
      (!constraints.query || [d.name, ...d.ingredients].some(text =>
        text.includes(constraints.query) || (/^[鸡牛猪羊]肉$/.test(constraints.query) &&
          new RegExp(`^${constraints.query[0]}.*肉$`).test(text)))) &&
      (!constraints.dietary || (constraints.dietary === "纯素"
        ? d.dietaryTags.includes("素食") && ![d.name, ...d.ingredients, ...d.allergens].join(" ").match(/蛋|奶|乳|蜂蜜/)
        : d.dietaryTags.includes(constraints.dietary))) &&
      (!constraints.category || d.category === constraints.category) &&
      !constraints.exclusions.some((x) =>
        x === "辣"
          ? !["不辣", "无辣", "无", ""].includes(d.spiceLevel || "") || [d.name, ...d.ingredients].join(" ").includes("辣")
          : [d.name, ...d.ingredients, ...d.allergens].join(" ").includes(x),
      ),
  );
  const recentSales=new Map(db.prepare("SELECT caipinxinxiid AS id,SUM(buyshu) AS quantity FROM orders WHERE school_id=? AND status IN ('已支付','制作中','待取餐','已完成') AND julianday(addtime)>=julianday('now','-7 days') GROUP BY caipinxinxiid").all(user.schoolId).map(r=>[r.id,Number(r.quantity)]));
  onProgress(3);
  if(!input.sort) candidates.sort((a,b)=>(recentSales.get(a.id)||0)-(recentSales.get(b.id)||0));
  if (/低脂|减脂|减重/.test(constraints.goal || ""))
    candidates.sort(
      (a, b) => Number(a.nutrition.fat) - Number(b.nutrition.fat),
    );
  else if (constraints.goal === "高蛋白")
    candidates.sort(
      (a, b) => Number(b.nutrition.protein) - Number(a.nutrition.protein),
    );
  else
    candidates.sort((a, b) => {
      const primary = constraints.sort === "price" ? a.price - b.price
        : constraints.sort === "queue" ? a.queueMinutes - b.queueMinutes
        : constraints.sort === "rating" ? (b.reviewCount >= 2 ? b.rating : 0) - (a.reviewCount >= 2 ? a.rating : 0)
        : constraints.sort === "sales" ? b.sales - a.sales
        : a.distanceM - b.distanceM;
      const mealRank = dish => ["套餐", "面食", "轻食", "自选"].includes(dish.category) ? 1 : 0;
      return (input.sort ? primary : (recentSales.get(a.id)||0)-(recentSales.get(b.id)||0)) || mealRank(b) - mealRank(a) || primary;
    });
  if (constraints.tastes.length)
    candidates.sort(
      (a, b) =>
        constraints.tastes.filter((t) =>
          [b.name, ...b.tasteTags].join(" ").includes(t),
        ).length -
        constraints.tastes.filter((t) =>
          [a.name, ...a.tasteTags].join(" ").includes(t),
        ).length,
    );
  const chosen = constraints.dishId
    ? candidates.find((d) => d.id === Number(constraints.dishId))
    : candidates[0];
  if (!chosen)
    throw Object.assign(
      new Error("没有符合当前预算、校区和忌口条件的在售菜品，请调整条件"),
      { status: 409 },
    );
  onProgress(4);
  const restaurant = data.restaurants.find((r) => r.id === chosen.restaurantId),
    startsAt = input.startsAt
      ? new Date(input.startsAt)
      : new Date(Date.now() + 30 * 60000),
    endsAt = new Date(startsAt.getTime() + 45 * 60000);
  if (!Number.isFinite(startsAt.getTime()) || startsAt <= new Date())
    throw Object.assign(new Error("用餐时间已过，请更新后再确认"), {
      status: 400,
    });
  const seatRows = db
    .prepare(
      `SELECT s.* FROM restaurant_seats s WHERE s.restaurant_id=? AND s.status='available' AND NOT EXISTS(SELECT 1 FROM seat_reservations r WHERE r.seat_id=s.id AND r.status='confirmed' AND julianday(r.starts_at)<julianday(?) AND julianday(r.ends_at)>julianday(?)) ORDER BY floor,seat_label`,
    )
    .all(restaurant.id, endsAt.toISOString(), startsAt.toISOString());
  const seats = [];
  let capacity = 0;
  if (constraints.reserve && restaurant.hasSeating===false) throw Object.assign(new Error("该餐厅不提供座位预约，请调整条件"),{status:409});
  if (constraints.reserve) {
    for (const row of seatRows) {
      if (
        input.seatIds &&
        Array.isArray(input.seatIds) &&
        !input.seatIds.map(Number).includes(row.id)
      )
        continue;
      if (capacity >= constraints.people) break;
      seats.push({ id: row.id, label: displaySeat({label:row.seat_label,floor:row.floor,seat_number:row.seat_number},restaurant).label, floor:displaySeat({label:row.seat_label,floor:row.floor,seat_number:row.seat_number},restaurant).floor, type: row.seat_type });
      capacity += 1;
    }
    if (capacity < constraints.people)
      throw Object.assign(new Error("所选时段座位不足，请调整食堂或时段"), {
        status: 409,
      });
  }
  onProgress(5);
  const total = Math.round(chosen.price * constraints.people * 100) / 100;
  onProgress(6);
  return {
    id: randomUUID(),
    message,
    constraints,
    items: [{ ...chosen, quantity: constraints.people }],
    restaurant,
    seats,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    total,
    estimatedMinutes:
      Math.ceil(restaurant.distanceM / 75) + restaurant.queueMinutes + 5,
    preferences: profile,
    alternatives: candidates
      .filter((d) => d.id !== chosen.id)
      .slice(0, 6)
      .map((d) => ({
        id: d.id,
        name: d.name,
        price: d.price,
        restaurant: d.restaurant,
        restaurantId: d.restaurantId,
      })),
    sourceName: data.sourceName,
    updatedAt: data.updatedAt,
    steps: [
      { label: "理解需求", status: "complete" },
      { label: "核对偏好", status: "complete" },
      { label: "检索菜品", status: "complete" },
      { label: "比较食堂", status: "complete" },
      {
        label: "规划座位",
        status: constraints.reserve ? "complete" : "skipped",
      },
      { label: "生成方案", status: "complete" },
      { label: "等待确认", status: "current" },
      { label: "创建订单", status: "pending" },
    ],
  };
}

function requestModel(options) { return modelRequest(JSON.parse(options.body), { signal: options.signal }); }
