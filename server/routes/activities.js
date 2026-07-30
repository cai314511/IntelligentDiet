import express from 'express';

const router = express.Router();

// 获取所有活动
router.get('/', (req, res) => {
  try {
    const activities = [
      {
        id: 1,
        title: "轻食挑战赛",
        description: "参与轻食套餐消费，赢取积分奖励",
        image: "https://via.placeholder.com/300x200/0066CC/FFFFFF?text=轻食挑战",
        difficulty: "easy",
        participants: 234,
        rewards: "积分 x100",
        duration: "2025-04-01 至 2025-04-30"
      },
      {
        id: 2,
        title: "美食节",
        description: "全校美食节盛典，汇集全国风味",
        image: "https://via.placeholder.com/300x200/0071E3/FFFFFF?text=美食节",
        difficulty: "medium",
        participants: 1250,
        rewards: "代金券 ¥50",
        duration: "2025-04-15 至 2025-04-22"
      },
      {
        id: 3,
        title: "新品试吃会",
        description: "体验最新上线的创意菜品",
        image: "https://via.placeholder.com/300x200/34C759/FFFFFF?text=试吃会",
        difficulty: "easy",
        participants: 89,
        rewards: "免费餐券 x1",
        duration: "2025-04-10 至 2025-04-12"
      },
      {
        id: 4,
        title: "烹饪比赛",
        description: "展现你的厨艺，赢取大奖",
        image: "https://via.placeholder.com/300x200/FF3B30/FFFFFF?text=烹饪比赛",
        difficulty: "hard",
        participants: 45,
        rewards: "现金 ¥500",
        duration: "2025-05-01 至 2025-05-10"
      }
    ];

    res.json({ code: 200, data: activities });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 获取活动详情
router.get('/:id', (req, res) => {
  try {
    const activity = {
      id: req.params.id,
      title: "轻食挑战赛",
      description: "参与轻食套餐消费，赢取积分奖励",
      image: "https://via.placeholder.com/600x400/0066CC/FFFFFF?text=活动详情",
      difficulty: "easy",
      participants: 234,
      rewards: "积分 x100",
      duration: "2025-04-01 至 2025-04-30",
      details: `
        活动规则：
        1. 凡参加轻食套餐消费的学生，即可参与本活动
        2. 每消费一次轻食套餐，即可获得100积分
        3. 活动期间，前100名参与者可额外获得50积分
        4. 积分可用于兑换校园商城优惠券
      `,
      joinedCount: 234
    };

    res.json({ code: 200, data: activity });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 加入活动
router.post('/:id/join', (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ code: 400, message: '用户ID不能为空' });
    }

    res.json({ 
      code: 200, 
      message: '成功加入活动',
      data: {
        activityId: req.params.id,
        joinDate: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

export default router;
