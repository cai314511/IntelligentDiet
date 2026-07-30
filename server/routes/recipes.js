import express from 'express';

const router = express.Router();

// 获取所有健康食谱
router.get('/', (req, res) => {
  try {
    const recipes = [
      {
        id: 1,
        goal: "减肥瘦身",
        dailyCalories: 1800,
        description: "低热量营养套餐，帮助健康减重",
        meals: ["蔬菜炒米饭", "清汤鱼丸", "水果沙拉"],
        nutrition: { protein: 85, carbs: 180, fat: 45 }
      },
      {
        id: 2,
        goal: "增肌健身",
        dailyCalories: 2800,
        description: "高蛋白营养套餐，适合健身人群",
        meals: ["牛肉饭", "蛋白粉", "坚果"],
        nutrition: { protein: 140, carbs: 280, fat: 70 }
      },
      {
        id: 3,
        goal: "血糖控制",
        dailyCalories: 1600,
        description: "低GI食物组合，适合血糖偏高人群",
        meals: ["糙米饭", "清蒸鸡胸", "绿菜"],
        nutrition: { protein: 75, carbs: 140, fat: 35 }
      },
      {
        id: 4,
        goal: "日常均衡",
        dailyCalories: 2000,
        description: "营养均衡组合，适合大多数人群",
        meals: ["米饭", "红烧肉", "蔬菜汤"],
        nutrition: { protein: 85, carbs: 200, fat: 60 }
      },
      {
        id: 5,
        goal: "学生定制",
        dailyCalories: 2200,
        description: "专为学生设计，经济又营养",
        meals: ["拌面", "卤蛋", "白菜汤"],
        nutrition: { protein: 75, carbs: 220, fat: 50 }
      }
    ];

    res.json({ code: 200, data: recipes });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 获取某个食谱详情
router.get('/:id', (req, res) => {
  try {
    const recipes = [
      {
        id: 1,
        goal: "减肥瘦身",
        dailyCalories: 1800,
        description: "低热量营养套餐，帮助健康减重",
        meals: [
          { name: "蔬菜炒米饭", calories: 600, nutrition: { protein: 15, carbs: 80, fat: 15 } },
          { name: "清汤鱼丸", calories: 400, nutrition: { protein: 35, carbs: 20, fat: 10 } },
          { name: "水果沙拉", calories: 400, nutrition: { protein: 10, carbs: 60, fat: 5 } }
        ],
        tips: [
          "每天坚持运动30分钟以上",
          "多喝水，少喝饮料",
          "晚上8点后不进食"
        ]
      }
    ];

    const recipe = recipes.find(r => r.id === parseInt(req.params.id));
    if (!recipe) {
      return res.status(404).json({ code: 404, message: '食谱不存在' });
    }

    res.json({ code: 200, data: recipe });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

export default router;
