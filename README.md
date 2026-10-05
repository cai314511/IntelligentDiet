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

## 数据与维护

- `userdata/schools.json`：学校名称、品牌色和校区配置。
- `userdata/menu_catalog.csv`：213 条菜品及食材、过敏原、营养、份量、价格和来源字段。
- `userdata/restaurant_context.json`：初始餐厅运营参数。
- `userdata/operations_seed.json`：初始运营台账。
- `userdata/zhixiang.db`：账号及业务记录；初始导入后保留后台维护结果。

`npm run init-db` 幂等建表，不覆盖运营人员维护的菜单。修改 CSV 后，使用 `npm --prefix server run import-menu` 显式刷新菜单字段。一致性数据库快照随仓库发布；运行数据库、密钥、环境配置和日志不纳入版本控制。前端静态服务器拒绝访问这些目录。

## 验证

`npm test` 运行接口回归；`API_BASE_URL=http://localhost:5010/api npm --prefix server run smoke` 检查连接。当前功能、验证证据与外部接入边界见 `docs/PROJECT_STATUS_AND_ROADMAP.md`。
