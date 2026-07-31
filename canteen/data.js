// 模拟数据文件 - data.js

// 餐厅数据
const restaurants = [
    {
        id: 1,
        name: "一食堂",
        floor: "1楼",
        queueCount: 25,
        queueTime: 12,
        seatsTotal: 200,
        seatsOccupied: 150,
        occupancyRate: 75
    },
    {
        id: 2,
        name: "二食堂",
        floor: "2楼",
        queueCount: 18,
        queueTime: 8,
        seatsTotal: 150,
        seatsOccupied: 90,
        occupancyRate: 60
    },
    {
        id: 3,
        name: "三食堂",
        floor: "3楼",
        queueCount: 35,
        queueTime: 18,
        seatsTotal: 180,
        seatsOccupied: 120,
        occupancyRate: 67
    }
];

// 菜品分类
const categories = [
    { id: 1, name: "主食" },
    { id: 2, name: "热菜" },
    { id: 3, name: "凉菜" },
    { id: 4, name: "汤品" },
    { id: 5, name: "饮品" },
    { id: 6, name: "套餐" }
];

// 菜品数据
const dishes = [
    {
        id: 1,
        name: "米饭",
        category: 1,
        price: 2,
        image: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400&q=80",
        introImage: "https://via.placeholder.com/300x200?text=米饭介绍图",
        nutrition: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
        tags: ["主食", "基础"],
        monthlySales: 1250,
        rating: 4.8,
        stock: 100
    },
    {
        id: 2,
        name: "面条",
        category: 1,
        price: 5,
        image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80",
        introImage: "https://via.placeholder.com/300x200?text=面条介绍图",
        nutrition: { calories: 220, protein: 8, carbs: 45, fat: 1 },
        tags: ["主食", "热食"],
        monthlySales: 980,
        rating: 4.6,
        stock: 80
    },
    {
        id: 3,
        name: "蔬菜沙拉",
        category: 3,
        price: 8,
        image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80",
        introImage: "https://via.placeholder.com/300x200?text=蔬菜沙拉介绍图",
        nutrition: { calories: 80, protein: 2, carbs: 12, fat: 3 },
        tags: ["凉菜", "健康", "减脂"],
        monthlySales: 650,
        rating: 4.4,
        stock: 50
    },
    {
        id: 4,
        name: "鸡肉炒饭",
        category: 2,
        price: 10,
        image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80",
        introImage: "https://via.placeholder.com/300x200?text=鸡肉炒饭介绍图",
        nutrition: { calories: 350, protein: 18, carbs: 45, fat: 12 },
        tags: ["热菜", "荤菜", "人气"],
        monthlySales: 1500,
        rating: 4.7,
        stock: 30
    },
    // 添加更多菜品...
    {
        id: 5,
        name: "红烧肉",
        category: 2,
        price: 15,
        image: "https://images.unsplash.com/photo-1625477811233-044633d10dd1?w=400&q=80",
        nutrition: { calories: 420, protein: 25, carbs: 8, fat: 32 },
        tags: ["热菜", "荤菜", "经典"],
        monthlySales: 1200,
        rating: 4.9,
        stock: 40
    },
    {
        id: 6,
        name: "清汤",
        category: 4,
        price: 3,
        image: "https://images.unsplash.com/photo-1665593998976-d957f2827fe7?w=400&q=80",
        nutrition: { calories: 20, protein: 1, carbs: 2, fat: 0.5 },
        tags: ["汤品", "清淡"],
        monthlySales: 800,
        rating: 4.2,
        stock: 100
    },
    {
        id: 7,
        name: "橙汁",
        category: 5,
        price: 4,
        image: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80",
        nutrition: { calories: 45, protein: 1, carbs: 11, fat: 0 },
        tags: ["饮品", "水果"],
        monthlySales: 600,
        rating: 4.3,
        stock: 70
    },
    {
        id: 8,
        name: "学生套餐",
        category: 6,
        price: 18,
        image: "https://images.unsplash.com/photo-1781747835478-a9c3bab5a670?w=400&q=80",
        introImage: "https://via.placeholder.com/300x200?text=学生套餐介绍",
        nutrition: { calories: 550, protein: 28, carbs: 75, fat: 15 },
        tags: ["套餐", "经济"],
        monthlySales: 900,
        rating: 4.5,
        stock: 60
    },
    // 扩展菜品 (9-40)
    { id: 9, name: "番茄鸡蛋面", category: 2, price: 7, image: "https://images.unsplash.com/photo-1585417791023-a5a6164b2646?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 280, protein: 9, carbs: 50, fat: 5 }, tags: ["热菜", "番茄"], monthlySales: 720, rating: 4.6, stock: 45 },
    { id: 10, name: "麻辣烫", category: 2, price: 12, image: "https://images.unsplash.com/photo-1677030137853-03a83b0bd630?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 320, protein: 15, carbs: 35, fat: 14 }, tags: ["热菜", "辛辣"], monthlySales: 1100, rating: 4.4, stock: 50 },
    { id: 11, name: "黑米粥", category: 1, price: 3, image: "https://images.unsplash.com/photo-1766761562530-c8dd12c96d9a?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 110, protein: 3, carbs: 24, fat: 0.5 }, tags: ["主食", "养生"], monthlySales: 580, rating: 4.7, stock: 80 },
    { id: 12, name: "牛肉盖饭", category: 2, price: 16, image: "https://images.unsplash.com/photo-1783375175952-705a0600e05c?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 480, protein: 32, carbs: 55, fat: 18 }, tags: ["热菜", "牛肉"], monthlySales: 1300, rating: 4.8, stock: 35 },
    { id: 13, name: "豆腐脑", category: 4, price: 4, image: "https://images.unsplash.com/photo-1758293121435-396ed31ebcf4?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 80, protein: 8, carbs: 6, fat: 4 }, tags: ["汤品"], monthlySales: 420, rating: 4.3, stock: 60 },
    { id: 14, name: "紫菜蛋花汤", category: 4, price: 2.5, image: "https://images.unsplash.com/photo-1652088079703-38f4a8d6b981?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 45, protein: 3, carbs: 5, fat: 1 }, tags: ["汤品"], monthlySales: 950, rating: 4.5, stock: 100 },
    { id: 15, name: "西兰花意面", category: 2, price: 9, image: "https://images.unsplash.com/photo-1647782180635-53abbb1e2ec4?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 250, protein: 10, carbs: 42, fat: 4 }, tags: ["热菜", "健康"], monthlySales: 640, rating: 4.4, stock: 40 },
    { id: 16, name: "咸鸭蛋", category: 3, price: 3, image: "https://images.unsplash.com/photo-1577111064880-4601019411fe?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 150, protein: 13, carbs: 1, fat: 11 }, tags: ["凉菜"], monthlySales: 380, rating: 4.2, stock: 90 },
    { id: 17, name: "水果沙拉", category: 3, price: 8, image: "https://images.unsplash.com/photo-1641642399576-487909d0ddbc?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 95, protein: 1, carbs: 24, fat: 0.3 }, tags: ["凉菜", "水果"], monthlySales: 510, rating: 4.6, stock: 50 },
    { id: 18, name: "青菜蛋花", category: 2, price: 6, image: "https://images.unsplash.com/photo-1771573042838-8b3adf17562e?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 120, protein: 8, carbs: 8, fat: 6 }, tags: ["热菜"], monthlySales: 630, rating: 4.3, stock: 70 },
    { id: 19, name: "红枣粥", category: 1, price: 4, image: "https://images.unsplash.com/photo-1647998270792-69ac80570183?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 150, protein: 3, carbs: 33, fat: 1 }, tags: ["主食", "养生"], monthlySales: 490, rating: 4.5, stock: 60 },
    { id: 20, name: "鱼香肉丝", category: 2, price: 11, image: "https://images.unsplash.com/photo-1775229909605-e683a47f979f?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 280, protein: 20, carbs: 18, fat: 16 }, tags: ["热菜", "经典"], monthlySales: 870, rating: 4.7, stock: 45 },
    { id: 21, name: "馄饨汤", category: 4, price: 5, image: "https://images.unsplash.com/photo-1763994685090-c0927ff195d1?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 120, protein: 6, carbs: 18, fat: 2 }, tags: ["汤品"], monthlySales: 720, rating: 4.4, stock: 80 },
    { id: 22, name: "榨菜肉丝面", category: 1, price: 6, image: "https://images.unsplash.com/photo-1731460202531-bf8389d565f7?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 210, protein: 8, carbs: 38, fat: 4 }, tags: ["主食"], monthlySales: 580, rating: 4.3, stock: 55 },
    { id: 23, name: "炸鸡块", category: 2, price: 10, image: "https://images.unsplash.com/photo-1426869981800-95ebf51ce900?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 380, protein: 22, carbs: 28, fat: 22 }, tags: ["热菜"], monthlySales: 920, rating: 4.5, stock: 50 },
    { id: 24, name: "豌豆粥", category: 1, price: 3.5, image: "https://images.unsplash.com/photo-1594756202469-9ff9799b2e4e?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 140, protein: 5, carbs: 27, fat: 1 }, tags: ["主食"], monthlySales: 410, rating: 4.4, stock: 75 },
    { id: 25, name: "番茄牛肉汤", category: 4, price: 7, image: "https://images.unsplash.com/photo-1608949621301-dc970e104c90?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 160, protein: 14, carbs: 12, fat: 6 }, tags: ["汤品", "牛肉"], monthlySales: 620, rating: 4.6, stock: 40 },
    { id: 26, name: "红烧排骨", category: 2, price: 14, image: "https://images.unsplash.com/photo-1550367363-ea12860cc124?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 420, protein: 28, carbs: 8, fat: 32 }, tags: ["热菜", "荤菜"], monthlySales: 980, rating: 4.8, stock: 35 },
    { id: 27, name: "凉拌黄瓜", category: 3, price: 3, image: "https://images.unsplash.com/photo-1679735107918-15112296e28d?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 40, protein: 1, carbs: 7, fat: 0.2 }, tags: ["凉菜"], monthlySales: 520, rating: 4.2, stock: 100 },
    { id: 28, name: "奶茶", category: 5, price: 5, image: "https://images.unsplash.com/photo-1692783029695-1956cd253e10?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 180, protein: 2, carbs: 32, fat: 5 }, tags: ["饮品", "奶茶"], monthlySales: 1080, rating: 4.3, stock: 120 },
    { id: 29, name: "豆浆", category: 5, price: 2, image: "https://images.unsplash.com/photo-1517448931760-9bf4414148c5?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 60, protein: 3, carbs: 6, fat: 3 }, tags: ["饮品"], monthlySales: 1250, rating: 4.4, stock: 200 },
    { id: 30, name: "青菜豆腐汤", category: 4, price: 3.5, image: "https://images.unsplash.com/photo-1763470260582-894ae15f43bb?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 85, protein: 7, carbs: 8, fat: 3 }, tags: ["汤品"], monthlySales: 440, rating: 4.3, stock: 90 },
    { id: 31, name: "五谷粥", category: 1, price: 4, image: "https://images.unsplash.com/photo-1555078604-b2379f0e964a?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 130, protein: 4, carbs: 28, fat: 1 }, tags: ["主食"], monthlySales: 380, rating: 4.5, stock: 65 },
    { id: 32, name: "糖醋里脊", category: 2, price: 13, image: "https://images.unsplash.com/photo-1702705481217-846e30915076?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 340, protein: 24, carbs: 32, fat: 14 }, tags: ["热菜"], monthlySales: 760, rating: 4.6, stock: 40 },
    { id: 33, name: "蚝油生菜", category: 3, price: 5, image: "https://images.unsplash.com/photo-1740707590670-8ceeaa899b2f?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 60, protein: 2, carbs: 10, fat: 2 }, tags: ["凉菜"], monthlySales: 290, rating: 4.2, stock: 50 },
    { id: 34, name: "咖啡", category: 5, price: 6, image: "https://images.unsplash.com/photo-1512568400610-62da28bc8a13?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 5, protein: 0.3, carbs: 1, fat: 0 }, tags: ["饮品"], monthlySales: 450, rating: 4.4, stock: 100 },
    { id: 35, name: "玉米饼", category: 1, price: 2.5, image: "https://images.unsplash.com/photo-1593986799230-f9755e668580?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 85, protein: 2, carbs: 18, fat: 0.5 }, tags: ["主食"], monthlySales: 310, rating: 4.2, stock: 80 },
    { id: 36, name: "宫保鸡丁", category: 2, price: 12, image: "https://images.unsplash.com/photo-1605704922285-e82455dba38b?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 300, protein: 22, carbs: 22, fat: 14 }, tags: ["热菜"], monthlySales: 950, rating: 4.7, stock: 45 },
    { id: 37, name: "黑木耳", category: 3, price: 4, image: "https://images.unsplash.com/photo-1607835498598-29e40be5eed0?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 65, protein: 2, carbs: 12, fat: 0.2 }, tags: ["凉菜"], monthlySales: 240, rating: 4.3, stock: 60 },
    { id: 38, name: "柠檬茶", category: 5, price: 4, image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 30, protein: 0, carbs: 8, fat: 0 }, tags: ["饮品"], monthlySales: 580, rating: 4.5, stock: 150 },
    { id: 39, name: "馄饨饺子", category: 1, price: 6, image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 200, protein: 8, carbs: 35, fat: 3 }, tags: ["主食"], monthlySales: 520, rating: 4.4, stock: 50 },
    { id: 40, name: "蒸鸡腿", category: 2, price: 10, image: "https://images.unsplash.com/photo-1767324673558-2704e2d08595?w=400&q=80", introImage: "https://via.placeholder.com/300x200", nutrition: { calories: 280, protein: 35, carbs: 2, fat: 14 }, tags: ["热菜"], monthlySales: 680, rating: 4.6, stock: 55 }
];

// 评论数据
const reviews = [
    {
        id: 1,
        dishId: 4,
        user: "小明同学",
        avatar: "https://via.placeholder.com/40x40?text=小明",
        rating: 5,
        content: "鸡肉炒饭超级好吃，鸡肉鲜嫩，饭粒粒分明！",
        images: [],
        time: "2026-03-01",
        likes: 12,
        dislikes: 0
    },
    {
        id: 2,
        dishId: 4,
        user: "李华",
        avatar: "https://via.placeholder.com/40x40?text=李华",
        rating: 4,
        content: "味道不错，就是有点油腻，下次少放点油就完美了。",
        images: [],
        time: "2026-02-28",
        likes: 8,
        dislikes: 1
    },
    // 添加更多评论...
];

// 社交动态
const posts = [
    {
        id: 1,
        user: "食堂探险家",
        avatar: "https://via.placeholder.com/40x40?text=探险家",
        content: "今天发现了一食堂的新菜品，超级美味！大家快来试试😋",
        images: ["https://via.placeholder.com/300x200?text=新菜品"],
        location: "一食堂",
        time: "2026-03-05 12:30",
        likes: 25,
        comments: 8,
        shares: 3
    },
    // 添加更多动态...
];

// 文创产品
const culturalProducts = [
    { id: 1, name: "中央财经大学纪念杯", price: 25, image: "https://via.placeholder.com/200x150?text=纪念杯", description: "精美陶瓷杯，印有学校Logo" },
    { id: 2, name: "学生食堂主题T恤", price: 35, image: "https://via.placeholder.com/200x150", description: "创意设计，舒适面料" },
    { id: 3, name: "校园地标明信片", price: 15, image: "https://via.placeholder.com/200x150", description: "10张精美明信片套装" },
    { id: 4, name: "智饷品牌便当盒", price: 45, image: "https://via.placeholder.com/200x150", description: "环保设计，可重复使用" },
    { id: 5, name: "学校徽章盒", price: 8, image: "https://via.placeholder.com/200x150", description: "精致小配件集合" },
    { id: 6, name: "宿舍必备帆布包", price: 60, image: "https://via.placeholder.com/200x150", description: "大容量，实用耐用" },
    { id: 7, name: "食堂美食地图", price: 20, image: "https://via.placeholder.com/200x150", description: "新生必备指南" },
    { id: 8, name: "纪念礼盒套装", price: 88, image: "https://via.placeholder.com/200x150", description: "限量版礼盒" },
    { id: 9, name: "智饷品牌水壶", price: 50, image: "https://via.placeholder.com/200x150", description: "保温效果好" },
    { id: 10, name: "食堂美食笔记本", price: 28, image: "https://via.placeholder.com/200x150", description: "学生原创美食笔记" }
];

// 文创餐品
const culturalDishes = [
    { id: 1, name: "校庆限定红烧肉", price: 16, image: "https://via.placeholder.com/200x150", introImage: "https://via.placeholder.com/300x200", description: "校庆特制", duration: "2026-03-01 至 2026-04-08" },
    { id: 2, name: "地标主题餐", price: 18, image: "https://via.placeholder.com/200x150", introImage: "https://via.placeholder.com/300x200", description: "建筑创意", duration: "长期" },
    { id: 3, name: "节气养生粥", price: 8, image: "https://via.placeholder.com/200x150", introImage: "https://via.placeholder.com/300x200", description: "时令设计", duration: "2026-04-01 至 2026-05-01" },
    { id: 4, name: "樱花限定套餐", price: 22, image: "https://via.placeholder.com/200x150", introImage: "https://via.placeholder.com/300x200", description: "春季特供", duration: "2026-03-15 至 2026-04-15" },
    { id: 5, name: "学生创意便当", price: 15, image: "https://via.placeholder.com/200x150", introImage: "https://via.placeholder.com/300x200", description: "创意合作版", duration: "长期" },
    { id: 6, name: "传统节日餐", price: 16, image: "https://via.placeholder.com/200x150", introImage: "https://via.placeholder.com/300x200", description: "节日特色", duration: "节日供应" },
    { id: 7, name: "国际美食节", price: 24, image: "https://via.placeholder.com/200x150", introImage: "https://via.placeholder.com/300x200", description: "世界风味", duration: "2026-05-01 至 2026-05-31" },
    { id: 8, name: "健康运动餐", price: 20, image: "https://via.placeholder.com/200x150", introImage: "https://via.placeholder.com/300x200", description: "高营养专供", duration: "长期" }
];

// 活动
const activities = [
    { id: 1, name: "光盘打卡挑战", description: "上传光盘照片获得积分奖励", time: "2026-03-10 至 2026-03-20", participants: 156, status: "进行中", reward: "每次奖励1元积分" },
    { id: 2, name: "校园美食节", description: "汇聚各食堂特色菜品，畅享美食盛宴", time: "2026-04-05 至 2026-04-08", participants: 890, status: "即将开始", reward: "满50元打9折" },
    { id: 3, name: "新品试吃会", description: "免费品尝新推出菜品，提供反馈即获赠券", time: "2026-03-25", participants: 320, status: "进行中", reward: "送10元试吃券" },
    { id: 4, name: "厨艺比赛", description: "学生参赛，评选菜品纳入菜单", time: "2026-04-15", participants: 45, status: "报名中", reward: "优胜者菜品上架" }
];

// 用户健康档案
let userProfile = {
    name: "学生用户",
    height: 170,
    weight: 60,
    bmi: 20.8,
    allergies: [],
    goals: "日常均衡",
    preferences: ["清淡", "健康", "高蛋白"],
    avoidFoods: []
};

// 订单数据
let orders = [
    { id: 1, items: [{ dishId: 1, quantity: 1 }, { dishId: 4, quantity: 1 }], total: 12, status: "已完成", pickupCode: "A001", pickupCounter: "1号窗口", time: "2026-04-02 11:30" },
    { id: 2, items: [{ dishId: 5, quantity: 1 }], total: 15, status: "制作中", pickupCode: "A002", pickupCounter: "2号窗口", time: "2026-04-02 12:00", estimatedTime: 8 }
];

// 座位预约数据
const seats = {
    1: { total: 200, available: 47, timeSlots: ["11:00-11:30", "11:30-12:00", "12:00-12:30", "12:30-13:00"] },
    2: { total: 150, available: 65, timeSlots: ["11:00-11:30", "11:30-12:00", "12:00-12:30", "12:30-13:00"] },
    3: { total: 180, available: 58, timeSlots: ["11:00-11:30", "11:30-12:00", "12:00-12:30", "12:30-13:00"] }
};

// 10套食谱模板
const dietRecipes = [
    { goal: "减脂", meals: [["蔬菜沙拉 8¥", "清汤 3¥"], ["鸡胸肉 12¥", "米饭 2¥"], ["水果沙拉 8¥", "豆浆 2¥"]], dailyCalories: 1500, desc: "低脂高纤维" },
    { goal: "增肌", meals: [["鸡蛋 3¥", "米饭 2¥"], ["牛肉盖饭 16¥"], ["红烧排骨 14¥", "米饭 2¥"]], dailyCalories: 2500, desc: "高蛋白高热量" },
    { goal: "控糖", meals: [["绿叶菜 3¥", "蒸鸡腿 10¥"], ["黑米粥 3¥"], ["豆腐脑 4¥"]], dailyCalories: 1200, desc: "低糖低GI" },
    { goal: "日常均衡", meals: [["米饭 2¥", "青菜蛋花 6¥"], ["面条 5¥", "豆浆 2¥"], ["水果沙拉 8¥"]], dailyCalories: 1800, desc: "营养均衡" },
    { goal: "控血压", meals: [["清淡粥 4¥"], ["蒸鱼 11¥", "绿菜 3¥"], ["豆腐汤 3.5¥"]], dailyCalories: 1400, desc: "低盐清淡" },
    { goal: "快手早餐", meals: [["豆浆 2¥", "油条 2¥"], [], []], dailyCalories: 500, desc: "快速补充" },
    { goal: "健身补充", meals: [["鸡胸肉 10¥", "米饭 2¥"], [], []], dailyCalories: 700, desc: "蛋白质碳水" },
    { goal: "素食主义", meals: [["蔬菜沙拉 8¥", "豆腐 4¥"], ["黑米粥 3¥"], ["水果 5¥"]], dailyCalories: 1600, desc: "植物基" },
    { goal: "学生经济", meals: [["米饭 2¥", "番茄蛋 5¥"], ["学生套餐 18¥"], ["馄饨汤 5¥"]], dailyCalories: 1700, desc: "经济环保" },
    { goal: "能量满满", meals: [["蛋炒饭 8¥"], ["牛肉面 11¥"], ["奶茶 5¥"]], dailyCalories: 2200, desc: "高能量" }
];

// 食堂榜单
const rankings = {
    recommend: [{ rank: 1, dishId: 4, name: "鸡肉炒饭", price: 10, rating: 4.7, reason: "口感好" }, { rank: 2, dishId: 20, name: "鱼香肉丝", price: 11, rating: 4.7, reason: "经典菜" }, { rank: 3, dishId: 26, name: "红烧排骨", price: 14, rating: 4.8, reason: "肉质鲜" }],
    pitfall: [{ rank: 1, dishId: 10, name: "麻辣烫", reason: "太辛辣" }, { rank: 2, dishId: 23, name: "炸鸡块", reason: "油量大" }],
    costEffective: [{ rank: 1, dishId: 14, name: "紫菜蛋花汤", price: 2.5, score: 9.5 }, { rank: 2, dishId: 29, name: "豆浆", price: 2, score: 9.2 }],
    newArrivals: [{ rank: 1, dishId: 32, name: "糖醋里脊", price: 13 }, { rank: 2, dishId: 15, name: "西兰花意面", price: 9 }]
};

// 学生共创菜品
const studentCreations = [
    { id: 1, name: "麻辣小龙虾意面", description: "川菜麻辣与意式融合", votes: 580, comments: 145, status: "制作中" },
    { id: 2, name: "黑松露蛋炒饭", description: "高端黑松露香气", votes: 420, comments: 98, status: "投票中" },
    { id: 3, name: "番茄肉酱披萨", description: "自制番茄酱搭配马苏里拉", votes: 350, comments: 76, status: "投票中" },
    { id: 4, name: "健身鸡胸肉沙拉", description: "高蛋白低脂肪", votes: 610, comments: 128, status: "已上线" },
    { id: 5, name: "火焰芝士炒饭", description: "舞台感餐品，芝士牵丝", votes: 490, comments: 112, status: "投票中" }
];

// 改进建议
let suggestions = [
    { id: 1, user: "学生A", content: "希望增加更多素食选项", status: "已反馈至厨房", date: "2026-03-28", likes: 45 },
    { id: 2, user: "学生B", content: "希望延长晚间营业时间", status: "处理中", date: "2026-03-25", likes: 67 },
    { id: 3, user: "学生C", content: "建议菜品营养标签更详细", status: "已采纳", date: "2026-03-20", likes: 34 }
];

// 小智问答库 (扩展版)
const xiaozhiQA = {
    "排队情况": "当前一食堂排队12分钟(25人)，二食堂8分钟(18人)，三食堂18分钟(35人)。建议选择二食堂。",
    "推荐菜品": "根据您的健康档案，推荐蔬菜沙拉和清汤，营养均衡。",
    "活动": "近期有光盘打卡挑战、校园美食节、新品试吃会、厨艺比赛。",
    "订单": "您的订单A001已完成，请前往一食堂1号窗口取餐。",
    "座位": "一食堂还有47个座位，二食堂65个，三食堂58个。",
    "营养": "您今日摄入卡路里650，建议多补充碳水。",
    "优惠": "新用户送5元优惠券，光盘打卡每次送1元。",
    "反馈": "您可以在互动广场提交改进建议。"
};