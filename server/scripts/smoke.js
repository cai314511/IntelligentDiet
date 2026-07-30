// 全链路冒烟：注册→登录→浏览→下单→支付→接单→叫号→核销
// 前置：后端已启动（npm start）
const BASE = 'http://localhost:5000/api';

let passed = 0;
function assert(cond, label) {
  if (!cond) {
    console.error(`✗ FAIL: ${label}`);
    process.exit(1);
  }
  passed++;
  console.log(`✓ ${label}`);
}

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, json: await res.json() };
}

const run = async () => {
  // 健康检查
  const health = await api('GET', '/health');
  assert(health.status === 200, '服务健康检查');

  // 注册 + 登录
  const account = `smoke${Date.now()}`;
  const reg = await api('POST', '/users/register', { body: { zhanghao: account, mima: 'smoke123', xingming: '冒烟测试', lianxifangshi: '13000000000' } });
  assert(reg.status === 200, '用户注册');
  const login = await api('POST', '/users/login', { body: { zhanghao: account, mima: 'smoke123' } });
  assert(login.status === 200 && login.json.data.token, '用户登录');
  const token = login.json.data.token;

  // 浏览菜品
  const dishes = await api('GET', '/dishes');
  assert(dishes.status === 200 && dishes.json.data.length > 0, '菜品列表');
  const dish = dishes.json.data.find(d => d.kucun > 0);
  assert(!!dish, '存在有库存的菜品');

  // 下单
  const order = await api('POST', '/orders', { token, body: { items: [{ dishId: dish.id, quantity: 1 }], remark: 'smoke' } });
  assert(order.status === 200 && order.json.data.orderid, '创建订单');
  const orderid = order.json.data.orderid;

  // 支付
  const pay = await api('POST', `/orders/${orderid}/pay`, { token });
  assert(pay.status === 200 && /^[A-Z]\d{3}$/.test(pay.json.data.pickupCode), '余额支付并生成取餐码');
  const pickupCode = pay.json.data.pickupCode;

  // 我的订单（C 端轮询所依赖的接口）
  const myOrders = await api('GET', `/orders/user/${login.json.data.user.id}`, { token });
  assert(myOrders.status === 200 && myOrders.json.data.some(o => o.orderid === orderid && o.status === '已支付'), '用户订单列表状态为已支付');

  // 管理员接单 → 叫号
  const adminLogin = await api('POST', '/users/login', { body: { zhanghao: 'admin', mima: 'admin123' } });
  assert(adminLogin.status === 200 && adminLogin.json.data.user.role === 'admin', '管理员登录');
  const adminToken = adminLogin.json.data.token;

  const accept = await api('PUT', `/orders/${orderid}/status`, { token: adminToken, body: { status: '制作中' } });
  assert(accept.status === 200, '管理员接单（→制作中）');
  const call = await api('PUT', `/orders/${orderid}/status`, { token: adminToken, body: { status: '待取餐' } });
  assert(call.status === 200, '管理员叫号（→待取餐）');

  // 非法流转被状态机拦截
  const illegal = await api('PUT', `/orders/${orderid}/status`, { token: adminToken, body: { status: '已退款' } });
  assert(illegal.status === 409, '非法状态流转被拦截（409）');

  // 错误取餐码核销被拒
  const wrongCode = await api('POST', `/orders/${orderid}/pickup`, { token: adminToken, body: { pickupCode: 'Z999' } });
  assert(wrongCode.status === 409, '错误取餐码核销被拒');

  // 正确取餐码核销
  const pickup = await api('POST', `/orders/${orderid}/pickup`, { token: adminToken, body: { pickupCode } });
  assert(pickup.status === 200, '取餐码核销成功（→已完成）');

  // 无鉴权写接口被拒
  const noAuth = await api('POST', '/dishes', { body: { caipinmingcheng: 'x', caipinfenlei: '热菜', jiage: 1 } });
  assert(noAuth.status === 401, '无 token 写接口返回 401');

  console.log(`\n🎉 SMOKE 全部通过（${passed} 项断言）`);
};

run().catch(err => {
  console.error('✗ SMOKE 执行异常:', err.message);
  console.error('请确认后端已启动：cd server && npm start');
  process.exit(1);
});
