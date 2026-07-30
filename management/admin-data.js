// 智饷 - 高校后勤管理系统模拟数据

// 1. 食堂运营管控模块数据
const canteenData = {
    restaurants: [
        {
            id: 1,
            name: '一食堂',
            location: '学生宿舍区',
            merchants: 8,
            status: '正常运营',
            rating: 4.8,
            todayOrders: 2450,
            todayRevenue: 12250,
            monthlyRevenue: 380000,
            avgQueueTime: 12,
            complaintCount: 3,
            complianceScore: 95
        },
        {
            id: 2,
            name: '二食堂',
            location: '教学楼东侧',
            merchants: 6,
            status: '正常运营',
            rating: 4.6,
            todayOrders: 1890,
            todayRevenue: 9450,
            monthlyRevenue: 285000,
            avgQueueTime: 14,
            complaintCount: 5,
            complianceScore: 92
        },
        {
            id: 3,
            name: '三食堂',
            location: '教学楼西侧',
            merchants: 5,
            status: '整改中',
            rating: 3.9,
            todayOrders: 1200,
            todayRevenue: 6000,
            monthlyRevenue: 180000,
            avgQueueTime: 18,
            complaintCount: 12,
            complianceScore: 78
        }
    ],
    merchants: [
        {
            id: 1,
            name: '炳炳川菜',
            restaurant: 1,
            serviceTypes: ['川菜', '热菜'],
            rating: 4.9,
            monthlyRevenue: 85000,
            orderCount: 2180,
            creditScore: 98,
            status: '优质商户'
        },
        {
            id: 2,
            name: '天下面馆',
            restaurant: 1,
            serviceTypes: ['面类', '粥品'],
            rating: 4.7,
            monthlyRevenue: 62000,
            orderCount: 1650,
            creditScore: 95,
            status: '优质商户'
        },
        {
            id: 3,
            name: '阿姨包子店',
            restaurant: 2,
            serviceTypes: ['主食', '早餐'],
            rating: 4.3,
            monthlyRevenue: 45000,
            orderCount: 980,
            creditScore: 78,
            status: '预警商户'
        }
    ],
    monthlyTrend: [
        { date: '3月1日', orders: 1800, revenue: 9000 },
        { date: '3月2日', orders: 2100, revenue: 10500 },
        { date: '3月3日', orders: 1950, revenue: 9750 },
        { date: '3月4日', orders: 2300, revenue: 11500 },
        { date: '3月5日', orders: 2200, revenue: 11000 },
        { date: '3月6日', orders: 2450, revenue: 12250 }
    ]
};

// 2. 食品安全监管模块数据
const safetyData = {
    incidents: [
        {
            id: 1,
            date: '2026-04-03',
            type: '投诉',
            severity: '高',
            dish: '尖椒炒肉',
            description: '学生反映菜品中有异物',
            restaurant: 1,
            status: '已处理',
            action: '商户赔偿，加强检查'
        },
        {
            id: 2,
            date: '2026-04-02',
            type: '差评',
            severity: '中',
            dish: '学生套餐',
            description: '卫生不达标',
            restaurant: 3,
            status: '处理中',
            action: '下达整改通知'
        }
    ],
    suppliers: [
        {
            id: 1,
            name: '中央农产品有限公司',
            qualification: '已认证',
            certEndDate: '2026-12-31',
            recentInspection: '2026-03-20',
            status: '正常'
        },
        {
            id: 2,
            name: '鑫鑫食材供应',
            qualification: '待审核',
            certEndDate: '2026-06-30',
            recentInspection: '2026-03-15',
            status: '待审'
        }
    ],
    traceability: [
        {
            id: 1,
            ingredient: '青菜',
            supplier: 1,
            batch: 'BZ202604001',
            inspectionDate: '2026-04-01',
            qualityScore: 95,
            status: '合格'
        },
        {
            id: 2,
            ingredient: '大米',
            supplier: 1,
            batch: 'BZ202604002',
            inspectionDate: '2026-04-01',
            qualityScore: 92,
            status: '合格'
        }
    ]
};

// 3. 节约型校园管理模块数据
const conservationData = {
    wasteAnalysis: {
        dayData: [
            { date: '3月1日', waste: 45, reduction: 12 },
            { date: '3月2日', waste: 38, reduction: 18 },
            { date: '3月3日', waste: 42, reduction: 15 },
            { date: '3月4日', waste: 35, reduction: 22 },
            { date: '3月5日', waste: 32, reduction: 25 },
            { date: '3月6日', waste: 28, reduction: 28 }
        ],
        topWasteDishes: [
            { name: '红烧肉', wasteRate: 15, quantity: 45 },
            { name: '鱼香肉丝', wasteRate: 12, quantity: 38 },
            { name: '糖醋排骨', wasteRate: 10, quantity: 32 }
        ]
    },
    energyConsumption: {
        water: { today: 2450, unit: 'L', trend: -5 },
        electricity: { today: 850, unit: 'kWh', trend: -3 },
        gas: { today: 320, unit: 'M3', trend: 2 }
    },
    lightPlate: {
        totalParticipants: 8750,
        weekParticipants: 2150,
        todayParticipants: 450,
        points: 12800,
        rewards: [
            { name: '免费饮品券', count: 120 },
            { name: '校园卡充值', count: 85 }
        ]
    }
};

// 4. 校园服务管理模块数据
const serviceData = {
    merchants: [
        {
            id: 1,
            name: '校内便利店',
            category: '便利服务',
            rating: 4.5,
            status: '运营中',
            reviewer: '李明',
            reviewDate: '2026-03-20'
        },
        {
            id: 2,
            name: '校园快递站',
            category: '快递服务',
            rating: 4.7,
            status: '运营中',
            reviewer: '王芳',
            reviewDate: '2026-03-22'
        }
    ],
    feedback: [
        {
            id: 1,
            type: '投诉',
            category: '食堂服务',
            user: '学生001',
            content: '食堂菜品质量下降，希望改进',
            date: '2026-04-03',
            status: '处理中',
            handler: '张主任',
            progress: 60
        },
        {
            id: 2,
            type: '建议',
            category: '后勤服务',
            user: '学生002',
            content: '建议增加夜间食堂营业时间',
            date: '2026-04-02',
            status: '已反馈',
            handler: '李科长',
            progress: 100
        },
        {
            id: 3,
            type: '咨询',
            category: '校园生活',
            user: '学生003',
            content: '校园内是否有校医院？',
            date: '2026-04-01',
            status: '已回复',
            handler: '王医生',
            progress: 100
        }
    ]
};

// 5. 数据统计与决策支持模块数据
const dashboardData = {
    kpi: {
        totalOrders: 8540,
        monthlyRevenue: 845000,
        studentSatisfaction: 4.7,
        foodSafetyScore: 93.5,
        wasteReduction: 28,
        merchantCompliance: 92,
        complaintRate: 0.35,
        energySavings: 12
    },
    realtime: {
        activeUsers: 3245,
        activeWindows: 42,
        avgWaitTime: 13,
        todayTransactions: 2450
    },
    monthlyMetrics: [
        { week: '第1周', orders: 8450, revenue: 42250, satisfaction: 4.6 },
        { week: '第2周', orders: 9120, revenue: 45600, satisfaction: 4.65 },
        { week: '第3周', orders: 8890, revenue: 44450, satisfaction: 4.7 },
        { week: '第4周', orders: 9540, revenue: 47700, satisfaction: 4.75 }
    ]
};