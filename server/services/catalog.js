import { db } from "../database.js";
export const parse = (value, fallback = []) => {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
};
export function catalog(schoolId) {
  const restaurants = db
    .prepare(
      `SELECT r.*, (SELECT COUNT(*) FROM restaurant_seats s WHERE s.restaurant_id=r.id AND s.status='available' AND NOT EXISTS(SELECT 1 FROM seat_reservations sr WHERE sr.seat_id=s.id AND sr.status='confirmed' AND julianday(sr.starts_at)<=julianday('now') AND julianday(sr.ends_at)>julianday('now'))) AS availableSeats,(SELECT COUNT(*) FROM restaurant_seats s WHERE s.restaurant_id=r.id) AS bookableSeats FROM restaurants r WHERE school_id=? ORDER BY campus,name`,
    )
    .all(schoolId)
    .map((r) => ({
      id: r.id,
      schoolId: r.school_id,
      campus: r.campus,
      name: r.name,
      description: r.description,
      openingHours: r.opening_hours,
      queueMinutes: r.queue_minutes,
      queueCount: r.queue_count,
      totalSeats: r.bookableSeats,
      availableSeats: r.availableSeats,
      distanceM: r.distance_m,
      trend: r.trend,
      updatedAt: r.updated_at,
      sourceName: r.data_source,
    }));
  const dishes = db
    .prepare(
      `SELECT d.*, COALESCE((SELECT AVG(r.rating) FROM discusscaipinxinxi r WHERE r.caipinxinxiid=d.id),0) AS actual_rating,COALESCE((SELECT SUM(o.buyshu) FROM orders o WHERE o.caipinxinxiid=d.id AND o.status IN ('已支付','制作中','待取餐','已完成') AND o.addtime>=datetime('now','-30 days')),0) AS sales FROM caipinxinxi d WHERE school_id=?`,
    )
    .all(schoolId)
    .map((d) => {
      const restaurant = restaurants.find(
        (r) => r.name === d.restaurant_name && r.campus === d.campus,
      );
      const reviews = db
        .prepare(
          "SELECT rating,commentcontent AS content,replycontent AS reply,addtime FROM discusscaipinxinxi WHERE caipinxinxiid=? ORDER BY addtime DESC LIMIT 20",
        )
        .all(d.id);
      return {
        reviewCount: db
          .prepare(
            "SELECT COUNT(*) n FROM discusscaipinxinxi WHERE caipinxinxiid=?",
          )
          .get(d.id).n,
        recentCriticism: reviews.filter((r) => r.rating <= 2).slice(0, 3),
        id: d.id,
        schoolId: d.school_id,
        name: d.caipinmingcheng,
        category: d.caipinfenlei,
        price: Number(d.jiage),
        stock: d.kucun,
        forSale: d.shangjia === "是",
        image: d.tupian,
        campus: d.campus,
        restaurant: d.restaurant_name,
        restaurantId: restaurant?.id || null,
        window: d.window_name,
        nutrition: parse(d.nutrition_json, {}),
        ingredients: parse(d.ingredients_json),
        allergens: parse(d.allergens_json),
        tasteTags: parse(d.taste_tags_json),
        dietaryTags: parse(d.dietary_tags_json),
        spiceLevel: d.spice_level,
        portionG: d.portion_g,
        rating: Number(d.actual_rating),
        sales: Number(d.sales),
        sourceName: d.data_source,
        sourceUrl: d.source_url,
        sourceDate: d.source_date,
        priceBasis: d.price_basis,
        nutritionBasis: d.nutrition_basis,
        distanceM: restaurant?.distanceM ?? null,
        queueMinutes: restaurant?.queueMinutes ?? null,
      };
    });
  return {
    restaurants,
    dishes,
    updatedAt: new Date().toISOString(),
    sourceName: "学校菜单与餐厅运营台账",
  };
}
export function awardPoints(user, reason, reference, points) {
  db.prepare(
    "INSERT OR IGNORE INTO point_ledger(user_id,school_id,reason,reference,points) VALUES(?,?,?,?,?)",
  ).run(user.id, user.schoolId, reason, String(reference), points);
}
