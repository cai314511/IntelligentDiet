import {displaySeat} from "./floorLayout.js";
import { randomUUID } from "crypto";
import { db } from "../database.js";
export function createOrder(user, body) {
  const { items, address = "", phone = "", remark = "" } = body || {};
  const fail = (message, status = 400) => {
    throw Object.assign(new Error(message), { status });
  };
  if (!Array.isArray(items) || !items.length || items.length > 30)
    fail("请选择 1 至 30 项菜品");
  if (
    [address, phone, remark].some(
      (v) => typeof v !== "string" || v.length > 240,
    )
  )
    fail("取餐信息格式无效");
  const requested = new Map();
  for (const item of items) {
    const id = Number(item?.dishId),
      quantity = Number(item?.quantity);
    if (
      !Number.isSafeInteger(id) ||
      id < 1 ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > 20
    )
      fail("菜品或数量格式无效");
    requested.set(id, (requested.get(id) || 0) + quantity);
  }
  const orderid = `ZX-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  return db.transaction(() => {
    const agentTask = body.agentTaskId ? db.prepare("SELECT * FROM agent_tasks WHERE id=? AND user_id=? AND school_id=?").get(String(body.agentTaskId),user.id,user.schoolId) : null;
    if (body.agentTaskId && !agentTask) fail("就餐方案不存在",404);
    if (agentTask?.status === "cancelled") fail("就餐方案已取消",409);
    if (agentTask?.status === "confirmed") {
      const totalPrice=db.prepare("SELECT SUM(total) total FROM orders WHERE orderid=? AND userid=?").get(agentTask.order_id,user.id).total;
      return {orderid:agentTask.order_id,totalPrice,reservationIds:JSON.parse(agentTask.reservation_ids_json),replayed:true};
    }
    const lines = [];
    for (const [id, quantity] of requested) {
      const dish = db
        .prepare("SELECT * FROM caipinxinxi WHERE id=? AND school_id=?")
        .get(id, user.schoolId);
      if (!dish || dish.shangjia !== "是") fail("所选菜品暂不可购买", 409);
      if (dish.kucun < quantity || quantity > 20)
        fail(`「${dish.caipinmingcheng}」库存不足`, 409);
      lines.push({ dish, quantity });
    }
    if (body.expectedTotal !== undefined) {
      const quoted = Number(body.expectedTotal),
        actual = lines.reduce(
          (sum, { dish, quantity }) =>
            sum + Math.round(Number(dish.jiage) * 100) * quantity,
          0,
        );
      if (!Number.isFinite(quoted) || quoted < 0) fail("请核对订单费用");
      if (Math.round(quoted * 100) !== actual)
        fail("菜品价格已更新，请刷新菜单后重新确认费用", 409);
    }
    let dining = null;
    const reservationIds = [];
    if (body.dining) {
      const input = body.dining,
        start = new Date(input.startsAt),
        end = new Date(start.getTime() + 45 * 60000);
      const restaurant = db
        .prepare("SELECT * FROM restaurants WHERE id=? AND school_id=?")
        .get(Number(input.restaurantId), user.schoolId);
      if (
        !restaurant ||
        !Number.isFinite(start.getTime()) ||
        start <= new Date()
      )
        fail("请核对食堂与用餐时间");
      const ids = Array.isArray(input.seatIds)
        ? [...new Set(input.seatIds.map(Number))]
        : [];
      if (ids.length > 6) fail("请核对预约座位数量");
      if(ids.length && restaurant.has_seating===0) fail("该餐厅不提供座位预约",409);
      const people=Number(input.people ?? 1);
      if(!Number.isInteger(people) || people<1 || people>6) fail("请核对用餐人数");
      let capacity=0;
      for (const id of ids) {
        const seat = db
          .prepare(
            "SELECT * FROM restaurant_seats WHERE id=? AND restaurant_id=? AND status='available'",
          )
          .get(id, restaurant.id);
        if (
          !seat ||
          db
            .prepare(
              "SELECT 1 FROM seat_reservations WHERE seat_id=? AND status='confirmed' AND julianday(starts_at)<julianday(?) AND julianday(ends_at)>julianday(?)",
            )
            .get(id, end.toISOString(), start.toISOString())
        )
          fail("所选座位已被预约，请重新选择", 409);
        capacity += 1;
        const reservationId = `SEAT-${randomUUID()}`;
        db.prepare(
          "INSERT INTO seat_reservations(reservation_id,user_id,restaurant_id,seat_id,starts_at,ends_at) VALUES(?,?,?,?,?,?)",
        ).run(
          reservationId,
          user.id,
          restaurant.id,
          id,
          start.toISOString(),
          end.toISOString(),
        );
        reservationIds.push(reservationId);
      }
      if(ids.length && capacity<people) fail("所选座位容纳人数不足",409);
      dining = { restaurant, start };
      db.prepare(
        "INSERT INTO order_dining(order_id,user_id,restaurant_id,starts_at,reservation_ids_json) VALUES(?,?,?,?,?)",
      ).run(
        orderid,
        user.id,
        restaurant.id,
        start.toISOString(),
        JSON.stringify(reservationIds),
      );
    }
    let cents = 0;
    const insert = db.prepare(
      "INSERT INTO orders(orderid,userid,caipinxinxiid,caipinmingcheng,tupian,buyshu,price,total,address,phone,remark,school_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
    );
    for (const { dish, quantity } of lines) {
      const amount = Math.round(Number(dish.jiage) * 100) * quantity;
      cents += amount;
      insert.run(
        orderid,
        user.id,
        dish.id,
        dish.caipinmingcheng,
        dish.tupian,
        quantity,
        dish.jiage,
        amount / 100,
        address.trim() ||
          `${dish.campus}·${dish.restaurant_name}·${dish.window_name || dish.caipinfenlei}`,
        phone.trim(),
        remark.trim(),
        user.schoolId,
      );
    }
    let plan;
    if(agentTask) {
      plan=JSON.parse(agentTask.plan_json);
      if(dining) {
        plan.restaurant={...plan.restaurant,id:dining.restaurant.id,name:dining.restaurant.name,campus:dining.restaurant.campus,distanceM:dining.restaurant.distance_m,queueMinutes:dining.restaurant.queue_minutes};
        plan.startsAt=dining.start.toISOString();
        plan.constraints={...plan.constraints,startsAt:plan.startsAt,restaurantId:dining.restaurant.id,people:Number(body.dining.people ?? 1),reserve:Boolean(body.dining.seatIds?.length)};
        plan.estimatedMinutes=Math.ceil(dining.restaurant.distance_m/75)+dining.restaurant.queue_minutes+5;
        plan.seats=[...new Set(body.dining.seatIds || [])].map(id=>{const seat=db.prepare("SELECT * FROM restaurant_seats WHERE id=?").get(Number(id));return {id:seat.id,label:displaySeat({label:seat.seat_label,floor:seat.floor,seat_number:seat.seat_number},dining.restaurant).label,floor:displaySeat({label:seat.seat_label,floor:seat.floor,seat_number:seat.seat_number},dining.restaurant).floor,type:seat.seat_type};});
      }
      plan.items=lines.map(({dish,quantity})=>({id:dish.id,name:dish.caipinmingcheng,price:Number(dish.jiage),quantity,window:dish.window_name}));
      plan.total=cents/100;
      db.prepare("UPDATE agent_tasks SET status='confirmed',order_id=?,reservation_ids_json=?,plan_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(orderid,JSON.stringify(reservationIds),JSON.stringify(plan),agentTask.id);
    }
    return { orderid, totalPrice: cents / 100, reservationIds, ...(plan?{plan}:{}) };
  })();
}
