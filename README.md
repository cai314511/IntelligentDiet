# 智饷校园餐饮系统

学生端与食堂后勤管理共用登录入口，分别使用独立前端，通过独立 REST API 访问 SQLite。三校和账号数据按学校、身份与用户范围隔离。数据保存在根目录 `userdata/`。

## 本地启动

推荐 Node.js 26.10.0。在仓库根目录执行：

```sh
npm run setup
npm start
```

打开 http://localhost:8000。前端与 API 自动启动（8000 / 5010），首次使用会恢复仓库内的业务数据快照。完整复现、已有数据保留及密钥配置见 [本地复现说明](docs/LOCAL_REPRODUCTION.md)。

开发环境提供“自动填入管理员账号”，只填入账号与密码，提交后按所选学生或校方身份进入对应系统。该功能仅接受本机请求，可通过 `ENABLE_DEV_ENTRY=false` 关闭；生产环境禁用开发入口。正式管理员可通过 `npm --prefix server run create-admin` 创建。

## 页面与业务

学生端与后勤端保留各自页面风格，共用会话与登录入口。学生端导航将账号和头像合并为个人主页入口。小智使用透明背景主体，聊天时停靠在卡片左上角。

后端提供学校隔离的菜单、订单、营养、校园社区、运营、分析及模型接口。部分接口尚未接入当前页面，具体状态见 `docs/PROJECT_STATUS_AND_ROADMAP.md`。

## 模型配置

在 `server/.env` 填 `DEEPSEEK_API_KEY` 和可选的 `AI_TIMEOUT_MS`，系统使用 DeepSeek 的 `deepseek-v4-flash`；密钥只保存在后端。模型通过工具调用返回方案条件，服务器查询本校菜单并重新校验约束。未配置时提供本地菜单检索及规则规划；图片识别需要支持图片输入和工具调用的模型。模型不会自动扣款。

环境变量统一使用全大写下划线名称 `DEEPSEEK_API_KEY`，不要使用 `Deepseek_API_KEY` 或 `AZURE_OPENAI_API_KEY`。后端明确读取 `server/.env`；根目录 `.env` 和用户主目录 `~/.env` 不会自动加载。已有进程环境变量优先于文件值，PM2 中如有旧值也需要同步更新。修改后重启实际 API 进程；本地联合启动应先停止再执行 `npm start`，PM2 部署应在服务器配置同步后重启对应进程。`/api/health` 的 `aiConfigured: true` 仅表示配置非空，不代表密钥和模型已验证可用。

## 数据与维护

- `userdata/schools.json`：学校名称、品牌色和校区配置。
- `userdata/menu_catalog.csv`：213 条菜品及食材、过敏原、营养、份量、价格和来源字段。
- `userdata/restaurant_context.json`：初始餐厅运营参数。
- `userdata/operations_seed.json`：初始运营台账。
- `userdata/zhixiang.db`：账号及业务记录；初始导入后保留后台维护结果。

`npm run init-db` 幂等建表，不覆盖运营人员维护的菜单。修改 CSV 后，使用 `npm --prefix server run import-menu` 显式刷新菜单字段。一致性数据库快照随仓库发布；运行数据库、密钥、环境配置和日志不纳入版本控制。前端静态服务器拒绝访问这些目录。

## 验证

`npm test` 运行接口回归；`API_BASE_URL=http://localhost:5010/api npm --prefix server run smoke` 检查连接。当前功能、验证证据与外部接入边界见 `docs/PROJECT_STATUS_AND_ROADMAP.md`。

## 学生端手机适配

学生端在小于 768px 的屏幕使用底部导航：点餐、营养、小智、订单、我的。中央圆形小智入口使用用户提供的头像，点击打开现有 Agent 对话页面；食话广场与文创活动仍可从左上角功能菜单进入。手机隐藏重复的悬浮小智，桌面导航和视觉主题沿用原样。

`canteen/mobile.css` 仅由学生端加载，处理窄屏卡片、表单字号、安全区和聊天键盘可视区域。公网 HTTP 中缺少 `crypto.randomUUID()` 时，通过 `crypto.getRandomValues()` 生成标准 UUID v4，不使用弱随机数。聊天和营养会员请求共用该方法。

浏览器回归脚本为 `scripts/mobile-ui.test.py`，使用 Python Playwright、Chromium 和 WebKit。脚本启动隔离的本地服务和临时数据库，模型回复使用固定测试数据，不验证真实模型质量；截图保存在 `outputs/mobile-review/`，服务结束自动关闭。WebKit 模拟不能代替微信与 iPhone 真机键盘测试。

本次修改只在本地；验收后部署时同步 `canteen/`、`shared/uuid.js` 与 `assets/brand/xiaozhi-mobile-avatar.png`。静态文件修改通常刷新页面即可；如使用打包或缓存服务，应重新发布并清除缓存。开发联合服务需要重启时，先停止旧进程，再从项目根目录运行 `npm start`；不要重复启动占用同一端口的服务。

## 登录身份与菜品浏览规则

普通登录入口默认选中“我是学生”，可直接登录或切换注册；点击“我是校方”后切换为管理身份并退出注册模式。显式指定 `?identity=admin` 的管理入口仍预选校方，其他无效身份参数按学生处理。

点餐页全天展示全部已上架菜品及图片，校区、食堂、菜名等筛选仍然有效。供餐时段仅限制直接加入餐盘和普通餐盘结算，不再过滤浏览目录：早餐 06:30–08:30、午餐 10:30–13:00、晚餐 17:00–19:00，均按北京时间判断。非当前餐次点击加入餐盘会提示无法购买，可改用小智预订；预订流程及其既有库存、时间和座位校验保持不变。

本次登录与菜单调整同样适用于手机和电脑。同步静态文件后刷新页面即可；如需重启本地联合服务，先停止旧进程，再在项目根目录运行 `npm start`。
