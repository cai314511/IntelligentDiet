# 智饷食堂 API 参考文档

## 📋 目录

1. [基础信息](#基础信息)
2. [菜品接口](#菜品接口)
3. [用户接口](#用户接口)
4. [订单接口](#订单接口)
5. [餐厅接口](#餐厅接口)
6. [食谱接口](#食谱接口)
7. [社交接口](#社交接口)
8. [活动接口](#活动接口)
9. [错误处理](#错误处理)

---

## 基础信息

### 服务地址

```
http://localhost:5000/api
```

### 响应格式

所有API返回JSON格式：

```json
{
  "code": 200,
  "data": {},
  "message": "成功"
}
```

### 状态码

| 状态码 | 含义 |
|-------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

---

## 菜品接口

### 获取菜品列表

**请求**

```
GET /dishes
GET /dishes?category=菜品分类
```

**参数**

| 参数 | 类型 | 说明 | 可选 |
|------|------|------|------|
| category | string | 菜品分类 | ✅ |

**响应示例**

```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "caipinmingcheng": "蔬菜炒米饭",
      "caipinfenlei": "米饭",
      "tupian": "image_url",
      "jiage": 12,
      "pinfen": 4.8,
      "kucun": 99
    }
  ]
}
```

---

### 获取菜品分类

**请求**

```
GET /dishes/categories
```

**响应**

```json
{
  "code": 200,
  "data": [
    { "caipinfenlei": "米饭" },
    { "caipinfenlei": "面食" },
    { "caipinfenlei": "汤类" }
  ]
}
```

---

### 获取菜品详情

**请求**

```
GET /dishes/:id
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | integer | 菜品ID |

**响应示例**

```json
{
  "code": 200,
  "data": {
    "id": 1,
    "caipinmingcheng": "蔬菜炒米饭",
    "caipinfenlei": "米饭",
    "tupian": "dish1.jpg",
    "cailiao": "米、蔬菜、油",
    "guige": "标准份",
    "jiage": 12,
    "yingyang": "热量 280kcal",
    "yueshuxiao": 325,
    "pinfen": 4.8,
    "kucun": 99
  }
}
```

---

### 搜索菜品

**请求**

```
GET /dishes/search/:keyword
```

**响应**

```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "caipinmingcheng": "蔬菜炒米饭",
      "jiage": 12,
      "pinfen": 4.8
    }
  ]
}
```

---

## 用户接口

### 用户登录

**请求**

```
POST /users/login
Content-Type: application/json

{
  "zhanghao": "student1",
  "mima": "password123"
}
```

**响应**

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "base64_token",
    "user": {
      "id": 1,
      "zhanghao": "student1",
      "xingming": "张三",
      "jine": 5000
    }
  }
}
```

---

### 用户注册

**请求**

```
POST /users/register
{
  "zhanghao": "newuser",
  "mima": "password123",
  "xingming": "新用户",
  "lianxifangshi": "13800138000"
}
```

**响应**

```json
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "id": 2
  }
}
```

---

### 获取用户信息

**请求**

```
GET /users/:id
```

**响应**

```json
{
  "code": 200,
  "data": {
    "id": 1,
    "xingming": "张三",
    "lianxifangshi": "13800138000",
    "jine": 5000
  }
}
```

---

### 更新用户信息

**请求**

```
PUT /users/:id
{
  "xingming": "李四",
  "xingbie": "男",
  "lianxifangshi": "13900139000"
}
```

**响应**

```json
{
  "code": 200,
  "message": "用户信息更新成功"
}
```

---

### 获取用户地址

**请求**

```
GET /users/:id/addresses
```

**响应**

```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "address": "宿舍楼A",
      "name": "张三",
      "phone": "13800138000",
      "isdefault": "是"
    }
  ]
}
```

---

### 添加收货地址

**请求**

```
POST /users/:id/addresses
{
  "address": "宿舍楼B",
  "name": "张三",
  "phone": "13800138000",
  "isdefault": "否"
}
```

---

## 订单接口

### 创建订单

**请求**

```
POST /orders
{
  "userid": 1,
  "items": [
    {
      "dishId": 1,
      "dishName": "蔬菜炒米饭",
      "quantity": 2,
      "image": "dish1.jpg"
    }
  ],
  "address": "食堂1",
  "phone": "13800138000",
  "remark": "不要辣"
}
```

**响应**

```json
{
  "code": 200,
  "message": "订单创建成功",
  "data": {
    "orderid": "ORDER-1234567890",
    "totalPrice": 24
  }
}
```

---

### 获取用户订单列表

**请求**

```
GET /orders/user/:userid
```

**响应**

```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "orderid": "ORDER-1234567890",
      "caipinmingcheng": "蔬菜炒米饭",
      "buyshu": 2,
      "total": 24,
      "status": "已支付",
      "addtime": "2025-04-01 11:30:00"
    }
  ]
}
```

---

### 获取订单详情

**请求**

```
GET /orders/:orderid
```

**响应**

```json
{
  "code": 200,
  "data": [
    {
      "orderid": "ORDER-1234567890",
      "caipinmingcheng": "蔬菜炒米饭",
      "buyshu": 2,
      "price": 12,
      "total": 24,
      "status": "已支付",
      "address": "食堂1",
      "phone": "13800138000",
      "addtime": "2025-04-01 11:30:00"
    }
  ]
}
```

---

## 餐厅接口

### 获取餐厅列表

**请求**

```
GET /restaurants
```

**响应**

```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "name": "沙河校区·东区一楼餐厅",
      "queueTime": 10,
      "queueCount": 47,
      "totalSeats": 200,
      "availableSeats": 47,
      "rating": 4.8,
      "description": "学校主食堂"
    }
  ]
}
```

---

## 食谱接口

### 获取食谱列表

**请求**

```
GET /recipes
```

**响应**

```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "goal": "减肥瘦身",
      "dailyCalories": 1800,
      "description": "低热量营养套餐",
      "meals": ["蔬菜炒米饭", "清汤鱼丸", "水果沙拉"],
      "nutrition": {
        "protein": 85,
        "carbs": 180,
        "fat": 45
      }
    }
  ]
}
```

---

## 社交接口

### 获取排行榜

**请求**

```
GET /social/rankings
```

**响应**

```json
{
  "code": 200,
  "data": {
    "recommend": [
      {
        "rank": 1,
        "dishName": "黑椒牛柳",
        "rating": 4.9,
        "sales": 520,
        "reason": "高分热卖，口感一绝"
      }
    ],
    "costEffective": [],
    "pitfall": [],
    "newArrivals": []
  }
}
```

---

### 发布评论

**请求**

```
POST /social/reviews
{
  "dishId": 1,
  "userId": 1,
  "username": "张三",
  "comment": "很不错，推荐！"
}
```

---

## 活动接口

### 获取活动列表

**请求**

```
GET /activities
```

**响应**

```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "title": "轻食挑战赛",
      "description": "参与轻食套餐消费，赢取积分奖励",
      "difficulty": "easy",
      "participants": 234,
      "rewards": "积分 x100",
      "duration": "2025-04-01 至 2025-04-30"
    }
  ]
}
```

---

### 加入活动

**请求**

```
POST /activities/:id/join
{
  "userId": 1
}
```

---

## 错误处理

### 常见错误

#### 404 资源不存在

```json
{
  "code": 404,
  "message": "菜品不存在"
}
```

#### 400 参数错误

```json
{
  "code": 400,
  "message": "缺少必要参数"
}
```

#### 401 未授权

```json
{
  "code": 401,
  "message": "账号或密码错误"
}
```

#### 500 服务器错误

```json
{
  "code": 500,
  "message": "服务器内部错误"
}
```

---

## 测试用例

### 完整订单流程

```bash
# 1. 登录
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"zhanghao":"student1","mima":"password123"}'

# 2. 获取菜品
curl http://localhost:5000/api/dishes

# 3. 创建订单
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userid":1,"items":[{"dishId":1,"quantity":1}],"address":"食堂1","phone":"13800138000"}'

# 4. 查询订单
curl http://localhost:5000/api/orders/user/1
```

---

**API文档版本**: 3.0
**最后更新**: 2025年4月
