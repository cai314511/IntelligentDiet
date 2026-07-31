# 智饷食堂系统 - 完整部署指南

## 🎯 项目概述

**智饷** 是一个高校智慧食堂智能移动平台，采用前后端分离架构，提供完整的食堂管理和用户服务体系。

### ✨ 核心特性

- **前端**: HTML5 + CSS3 + Vanilla JavaScript (ES6+)，Apple设计风格
- **后端**: Node.js + Express + SQLite
- **架构**: 完全前后端分离的REST API
- **特色功能**: AI助手、健康推荐、社交评价、文创活动

---

## 📁 项目结构

```
ai project/
├── 前端文件/
│   ├── index.html              # 主页面 (SPA框架)
│   ├── styles_v2.css           # Apple设计风格 CSS
│   ├── script_v3_api.js        # 前端逻辑 (调用API)
│   ├── data.js                 # Mock数据 (备用)
│   ├── logo.svg                # 品牌logo
│   ├── xiaozhi-logo.svg        # AI精灵小智头像
│   └── dish-placeholder.svg    # 菜品占位图
│
└── server/                      # Node.js后端
    ├── package.json            # 依赖配置
    ├── server.js               # 主服务器文件
    ├── database.js             # 数据库初始化
    ├── .env.example            # 环境变量模板
    ├── data/
    │   └── zhixiang.db         # SQLite数据库
    └── routes/                 # API路由
        ├── dishes.js           # 菜品API
        ├── users.js            # 用户API
        ├── orders.js           # 订单API
        ├── restaurants.js      # 餐厅API
        ├── recipes.js          # 食谱API
        ├── social.js           # 社交API
        └── activities.js       # 活动API
```

---

## 🚀 快速启动

### 前置要求

- Node.js 16.0+
- npm 7.0+
- Python 3（用于 C/B 端静态服务）
- 浏览器（Chrome, Firefox, Safari, Edge）

### 1. 一键启动（推荐）

双击运行 `canteen/startup.bat`，脚本会自动完成：

1. 安装后端依赖（npm install）
2. 首跑种子数据（init-db，仅在数据库不存在时执行）
3. 启动后端 API 服务（端口 5000）
4. 启动 C 端学生前端（端口 8000）
5. 启动 B 端后勤管理端（端口 5500）

### 2. 三端访问地址

| 端 | 地址 | 说明 |
|----|------|------|
| C 端（学生） | http://localhost:8000 | 可注册新账号，或使用 student1 / password123 |
| B 端（后勤） | http://localhost:5500 | 管理员账号 admin / admin123 |
| 后端 API | http://localhost:5000/api/health | 健康检查接口 |

### 3. 手动启动（备选）

```bash
# 后端 API（端口 5000）
cd server && npm start

# C 端学生前端（端口 8000）
cd canteen && python -m http.server 8000

# B 端后勤管理端（端口 5500）
python -m http.server 5500 --directory management
```

### 4. 注意事项

- B 端**必须**通过 http://localhost:5500 访问，**禁止 file:// 直开**（CORS 拦截）。
- 首次启动后数据库自动生成于 `server/data/zhixiang.db`。

### 5. 测试

```bash
cd server
npm test        # 26 个接口用例
npm run smoke   # 15 项冒烟断言（需后端已启动）
```

---

## 🔌 API 接口文档

### 基础信息

- **基础URL**: `http://localhost:5000/api`
- **Content-Type**: `application/json`
- **跨域**: 已启用 (localhost:8000)

### 核心接口

#### 菜品管理
- `GET /dishes` - 获取所有菜品
- `GET /dishes/:id` - 获取菜品详情
- `GET /dishes/categories` - 获取分类列表
- `POST /dishes` - 添加菜品 (管理员)

#### 用户管理
- `POST /users/login` - 用户登录
- `POST /users/register` - 用户注册
- `GET /users/:id` - 获取用户信息
- `PUT /users/:id` - 更新用户信息

#### 订单管理
- `POST /orders` - 创建订单
- `GET /orders/user/:userid` - 获取用户订单列表
- `GET /orders/:orderid` - 获取订单详情
- `PUT /orders/:orderid/status` - 更新订单状态

#### 其他服务
- `GET /restaurants` - 获取餐厅信息
- `GET /recipes` - 获取食谱列表
- `GET /social/rankings` - 获取排行榜
- `GET /activities` - 获取活动列表

### 请求示例

**用户登录**
```bash
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"zhanghao":"student1","mima":"password123"}'
```

**创建订单**
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userid": 1,
    "items": [{"dishId": 1, "quantity": 1}],
    "address": "食堂1",
    "phone": "13800138000"
  }'
```

---

## 💾 数据库说明

### 使用技术

- **数据库**: SQLite (better-sqlite3)
- **存储位置**: `server/data/zhixiang.db`
- **自动创建**: 启动时自动初始化

### 主要表

| 表名 | 说明 |
|------|------|
| `caipinfenlei` | 菜品分类 |
| `caipinxinxi` | 菜品信息 |
| `yonghu` | 用户账户 |
| `orders` | 订单记录 |
| `cart` | 购物车 |
| `discusscaipinxinxi` | 菜品评论 |
| `address` | 收货地址 |
| `messages` | 用户留言 |

---

## 🎨 前端优化说明

### 新增资源

1. **xiaozhi-logo.svg** - AI助手头像
   - 现代渐变设计
   - 扁平风格
   - 完全响应式

2. **dish-placeholder.svg** - 菜品占位图
   - 优雅的食物插画
   - 轻量级SVG格式
   - 快速加载

3. **styles_v2.css** - 完整设计系统
   - Apple官网风格
   - 原生CSS网格布局
   - 完全响应式 (320px - 1200px)

### 前端架构

```
script_v3_api.js (3000+ 行)
├── API 调用层 (apiCall 函数)
├── 状态管理 (currentUser, currentCart)
├── 页面路由 (5个主页面)
├── 组件渲染 (render*Page 函数)
├── 用户认证 (login, register)
├── 购物车系统 (add/remove/checkout)
└── Xiaozhi AI (消息管理, 快速操作)
```

---

## 🔒 安全说明

### 当前实现

- 简单的基于token的认证
- CORS跨域保护
- JSON数据验证
- SQL注入防护 (prepared statements)

### 生产环境建议

1. **认证更新**
   - 实现JWT token
   - 添加刷新token机制
   - 实现权限管理

2. **加密**
   - 密码加密存储 (bcrypt)
   - HTTPS通信
   - 敏感数据加密

3. **验证**
   - 增强输入验证
   - 实现速率限制
   - 添加日志审计

---

## 📱 响应式设计

### 断点

- **PC**: ≥ 1200px - 完整布局
- **平板**: 768px - 1199px - 优化布局
- **手机**: < 768px - 单列布局

### 测试方法

```bash
# Chrome DevTools
1. F12 打开开发者工具
2. Ctrl+Shift+M 打开设备切换器
3. 测试不同分辨率
```

---

## 🐛 常见问题

### Q: 后端服务启动失败

**A:** 检查以下项：
```bash
# 确认Node.js已安装
node --version

# 确认依赖已安装
npm list express

# 检查端口是否被占用
netstat -ano | findstr :5000
```

### Q: 前端无法连接后端

**A:** 确保：
1. 后端已启动 (`http://localhost:5000/api/health`)
2. API_BASE_URL配置正确
3. CORS已启用
4. 浏览器控制台查看错误

### Q: 数据库无法初始化

**A:** 手动创建目录：
```bash
mkdir server/data
```

### Q: 某些菜品图片显示不了

**A:** 系统自动使用占位图 `dish-placeholder.svg`，这是预期行为。

---

## 🎓 学习资源

### 前端技术

- [MDN Web Docs](https://developer.mozilla.org)
- [ES6+ 教程](https://es6.ruanyifeng.com)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

### 后端技术

- [Express.js 官方文档](https://expressjs.com)
- [SQLite 教程](https://www.sqlite.org/docs.html)
- [REST API 设计](https://restfulapi.net)

---

## 📝 开发建议

### 短期改进 (1-2周)

- [ ] 添加用户认证完整流程
- [ ] 实现订单支付接口
- [ ] 完善菜品图片管理
- [ ] 优化查询性能

### 中期建设 (1-3个月)

- [ ] 实现实时通知 (WebSocket)
- [ ] 添加数据分析看板
- [ ] 构建管理后台
- [ ] 集成支付SDK

### 长期规划 (3个月+)

- [ ] 移动APP版本
- [ ] AI推荐算法优化
- [ ] 多校区协同
- [ ] 供应链整合

---

## 📞 技术支持

### 快速排查表

| 问题 | 症状 | 解决方案 |
|------|------|---------|
| 无法登录 | 403错误 | 检查用户名/密码 |
| 页面空白 | 加载中卡住 | 检查后端连接 |
| 菜品显示异常 | 布局混乱 | 清除浏览器缓存 |
| 购物车不显示 | 加入后消失 | 检查浏览器存储 |

---

## 📄 许可证

MIT License - 自由使用和修改

## 👥 项目团队

**智饷项目组**
- 项目负责人: 蔡雨轩
- 技术支持: 整个开发团队

---

## 🎉 版本历史

- **v3.0** (2025-04-01) - 前后端分离版本，完整API实现
- **v2.0** (2025-03-15) - SPA框架版本，核心功能完成
- **v1.0** (2025-03-01) - 初始版本

---

**祝你使用愉快！** 🚀

如有问题，欢迎提交反馈或创建Issue。
