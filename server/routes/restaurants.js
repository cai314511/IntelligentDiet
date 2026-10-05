import {displaySeat,floorLayout} from "../services/floorLayout.js";
import express from 'express';
import { randomUUID } from 'crypto';
import { db } from '../database.js';
import { requireAuth,requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const schoolExists = id => db.prepare('SELECT 1 FROM universities WHERE id=?').get(id);
const validSchool = req => {
  const id = req.user?.schoolId || String(req.query.schoolId || 'cufe');
  return schoolExists(id) ? id : null;
};

router.get('/', (req, res) => {
  const schoolId = validSchool(req);
  if (!schoolId) return res.status(400).json({ code: 400, message: '请选择有效学校' });
  const rows = db.prepare(`SELECT r.id,r.school_id AS schoolId,r.campus,r.name,r.category,r.description,r.opening_hours AS openingHours,
    r.has_seating AS hasSeating,r.floors_json AS floorsJson,r.queue_minutes AS queueMinutes,r.queue_count AS queueCount,r.total_seats AS totalSeats,
    SUM(CASE WHEN r.has_seating=1 AND rs.status='available' AND sr.id IS NULL THEN 1 ELSE 0 END) AS availableSeats
    FROM restaurants r LEFT JOIN restaurant_seats rs ON rs.restaurant_id=r.id
    LEFT JOIN seat_reservations sr ON sr.seat_id=rs.id AND sr.status='confirmed' AND julianday(sr.starts_at)<=julianday('now') AND julianday(sr.ends_at)>julianday('now')
    WHERE r.school_id=? AND (r.canonical_id IS NULL OR r.canonical_id=r.id) GROUP BY r.id ORDER BY r.campus,r.name`).all(schoolId);
  res.json({ code: 200, data: rows.map(row => ({ ...row, name: `${row.campus}·${row.name}`, queueTime: row.queueMinutes })) });
});

router.get('/:restaurantId/seats', (req, res) => {
  const schoolId = validSchool(req);
  if (!schoolId) return res.status(400).json({ code: 400, message: '请选择有效学校' });
  const restaurant = db.prepare('SELECT id,name,campus,school_id AS schoolId,has_seating AS hasSeating FROM restaurants WHERE id=? AND school_id=?').get(req.params.restaurantId, schoolId);
  if (!restaurant) return res.status(404).json({ code: 404, message: '餐厅不存在' });
  const start=req.query.startsAt?new Date(String(req.query.startsAt)):new Date();
  const end=req.query.endsAt?new Date(String(req.query.endsAt)):new Date(start.getTime()+45*60000);
  if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)return res.status(400).json({message:'时段格式无效'});
  const seats=db.prepare(`SELECT s.id,s.seat_label AS label,s.seat_type AS type,s.seat_number AS seatNumber,s.floor,substr(s.seat_label,1,1) AS zone,CASE WHEN s.status='available' AND NOT EXISTS(SELECT 1 FROM seat_reservations r WHERE r.seat_id=s.id AND r.status='confirmed' AND julianday(r.starts_at)<julianday(?) AND julianday(r.ends_at)>julianday(?)) THEN 1 ELSE 0 END AS available FROM restaurant_seats s WHERE s.restaurant_id=? ORDER BY s.seat_label`).all(end.toISOString(),start.toISOString(),restaurant.id);
  res.json({ code: 200, data: { restaurant, seats:restaurant.hasSeating?seats.map(s=>displaySeat(s,restaurant)):[], layouts:restaurant.hasSeating?[...new Set(seats.map(s=>displaySeat(s,restaurant).floor))].map(f=>floorLayout(restaurant,f)):[], timeSlots: ['11:00','11:30','12:00','12:30','17:00','17:30','18:00','18:30'] } });
});

router.post('/:restaurantId/reserve-seat', requireAuth, (req, res) => {
  const { seatId, startsAt, endsAt } = req.body || {};
  if (!Number.isSafeInteger(Number(seatId)) || typeof startsAt !== 'string' || typeof endsAt !== 'string') return res.status(400).json({ code: 400, message: '请选择座位和时段' });
  const start = new Date(startsAt), end = new Date(endsAt), now = new Date();
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start <= now || end <= start || end - start > 2 * 60 * 60 * 1000 || start - now > 30 * 24 * 60 * 60 * 1000) return res.status(400).json({ code: 400, message: '预约时段格式无效' });
  const restaurant = db.prepare('SELECT id FROM restaurants WHERE id=? AND school_id=? AND has_seating=1').get(req.params.restaurantId, req.user.schoolId);
  if (!restaurant) return res.status(404).json({ code: 404, message: '餐厅不存在' });
  const seat = db.prepare("SELECT id FROM restaurant_seats WHERE id=? AND restaurant_id=? AND status='available'").get(seatId, restaurant.id);
  if (!seat) return res.status(404).json({ code: 404, message: '座位不存在或不可预约' });
  try {
    const reservationId = `SEAT-${randomUUID().slice(0, 12).toUpperCase()}`;
    const reserve = db.transaction(() => {
      const overlap = db.prepare(`SELECT 1 FROM seat_reservations WHERE seat_id=? AND status='confirmed' AND starts_at<? AND ends_at>?`)
        .get(seat.id, end.toISOString(), start.toISOString());
      if (overlap) throw Object.assign(new Error('该座位在所选时段已被预约'), { status: 409 });
      db.prepare(`INSERT INTO seat_reservations(reservation_id,user_id,restaurant_id,seat_id,starts_at,ends_at)
        VALUES(?,?,?,?,?,?)`).run(reservationId, req.user.id, restaurant.id, seat.id, start.toISOString(), end.toISOString());
    });
    reserve();
    res.status(201).json({ code: 200, message: '座位预约成功', data: { reservationId, seatId: seat.id, startsAt: start.toISOString(), endsAt: end.toISOString() } });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ code: 409, message: '该座位在此时段已被预约' });
    if (error.status === 409) return res.status(409).json({ code: 409, message: error.message });
    res.status(500).json({ code: 500, message: '座位预约暂时无法完成' });
  }
});

router.get('/reservations/mine', requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT sr.reservation_id AS reservationId,sr.starts_at AS startsAt,sr.ends_at AS endsAt,sr.status,
    r.campus,r.name AS restaurant,s.seat_label AS seatLabel
    FROM seat_reservations sr JOIN restaurants r ON r.id=sr.restaurant_id JOIN restaurant_seats s ON s.id=sr.seat_id
    WHERE sr.user_id=? AND r.school_id=? ORDER BY sr.starts_at DESC LIMIT 100`).all(req.user.id, req.user.schoolId);
  res.json({ code: 200, data: rows });
});

router.delete('/reservations/:id',requireAuth,(req,res)=>{const r=db.prepare("UPDATE seat_reservations SET status='cancelled' WHERE reservation_id=? AND user_id=? AND status='confirmed'").run(req.params.id,req.user.id);res.status(r.changes?200:404).json({message:r.changes?'预约已取消':'预约不存在或已取消'});});
router.put('/:id',requireAdmin,(req,res)=>{const b=req.body||{};if(!Number.isSafeInteger(Number(b.queueMinutes))||b.queueMinutes<0||b.queueMinutes>180||!Number.isSafeInteger(Number(b.queueCount))||b.queueCount<0||b.queueCount>10000||!Number.isSafeInteger(Number(b.distanceM))||b.distanceM<0||b.distanceM>10000||typeof b.openingHours!=='string'||b.openingHours.length>100)return res.status(400).json({message:'餐厅运营字段无效'});const r=db.prepare('UPDATE restaurants SET queue_minutes=?,queue_count=?,distance_m=?,opening_hours=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND school_id=?').run(Number(b.queueMinutes),Number(b.queueCount),Number(b.distanceM),b.openingHours,req.params.id,req.user.schoolId);res.status(r.changes?200:404).json({message:r.changes?'餐厅运营记录已保存':'餐厅不存在'});});
export default router;
