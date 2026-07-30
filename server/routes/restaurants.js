import express from 'express';
import { db } from '../database.js';

const router = express.Router();

// 获取所有餐厅信息（模拟数据）
router.get('/', (req, res) => {
  try {
    const restaurants = [
      {
        id: 1,
        name: "沙河校区·东区一楼餐厅",
        queueTime: 26,
        queueCount: 120,
        totalSeats: 200,
        availableSeats: 28,
        image: "https://via.placeholder.com/200x150/0066CC/FFFFFF?text=东区一楼",
        rating: 4.6,
        description: "学校主食堂，大众自选与面食档口，高峰期建议错峰"
      },
      {
        id: 2,
        name: "沙河校区·子衿食园",
        queueTime: 6,
        queueCount: 73,
        totalSeats: 130,
        availableSeats: 60,
        image: "https://via.placeholder.com/200x150/0071E3/FFFFFF?text=子衿食园",
        rating: 4.8,
        description: "环境清幽，二楼轻食轻语区适合自习简餐"
      },
      {
        id: 3,
        name: "沙河校区·风味餐厅",
        queueTime: 4,
        queueCount: 68,
        totalSeats: 150,
        availableSeats: 100,
        image: "https://via.placeholder.com/200x150/34C759/FFFFFF?text=风味餐厅",
        rating: 4.9,
        description: "特色小炒与地方风味，本周上新爆炒孜然羊肉"
      },
      {
        id: 4,
        name: "南路校区·龙马一餐厅",
        queueTime: 2,
        queueCount: 15,
        totalSeats: 120,
        availableSeats: 100,
        image: "https://via.placeholder.com/200x150/FF9500/FFFFFF?text=龙马一餐",
        rating: 4.5,
        description: "南路校区主力餐厅，宽敞人少"
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
