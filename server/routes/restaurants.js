import express from 'express';
import { db } from '../database.js';

const router = express.Router();

// 获取所有餐厅信息（模拟数据）
router.get('/', (req, res) => {
  try {
    const restaurants = [
      {
        id: 1,
        name: "食尚苑食堂",
        queueTime: 10,
        queueCount: 47,
        totalSeats: 200,
        availableSeats: 47,
        image: "https://via.placeholder.com/200x150/0066CC/FFFFFF?text=食堂1",
        rating: 4.8,
        description: "学校主食堂，提供多样化饮食选择"
      },
      {
        id: 2,
        name: "美食广场",
        queueTime: 15,
        queueCount: 65,
        totalSeats: 150,
        availableSeats: 65,
        image: "https://via.placeholder.com/200x150/0071E3/FFFFFF?text=食堂2",
        rating: 4.6,
        description: "创意美食集聚地，汇集各地风味"
      },
      {
        id: 3,
        name: "健康食屋",
        queueTime: 8,
        queueCount: 58,
        totalSeats: 180,
        availableSeats: 58,
        image: "https://via.placeholder.com/200x150/34C759/FFFFFF?text=食堂3",
        rating: 4.9,
        description: "专注健康营养的食堂，低油低盐"
      }
    ];

    res.json({ code: 200, data: restaurants });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 获取某个餐厅的座位信息
router.get('/:restaurantId/seats', (req, res) => {
  try {
    const seats = {
      boothSeats: [
        { id: 1, type: "2人座", available: 8 },
        { id: 2, type: "4人座", available: 12 },
        { id: 3, type: "6人座", available: 5 }
      ],
      timeSlots: [
        { time: "11:00-11:30", available: true },
        { time: "11:30-12:00", available: false },
        { time: "12:00-12:30", available: true },
        { time: "12:30-13:00", available: true }
      ]
    };

    res.json({ code: 200, data: seats });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 预约座位
router.post('/:restaurantId/reserve-seat', (req, res) => {
  try {
    const { userid, seatType, timeSlot } = req.body;

    if (!userid || !seatType || !timeSlot) {
      return res.status(400).json({ code: 400, message: '缺少必要参数' });
    }

    const reservationId = `SEAT-${Date.now()}`;

    res.json({ 
      code: 200, 
      message: '座位预约成功',
      data: { 
        reservationId, 
        seatType, 
        timeSlot,
        tips: '请在规定时间内到达食堂'
      }
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

export default router;
