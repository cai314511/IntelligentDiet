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
    return { orderid, totalPrice: cents / 100 };
  })();
}
