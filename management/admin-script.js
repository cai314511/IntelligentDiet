// 智饷 - 高校后勤管理系统主脚本文件 (前后端分离 API 交互版)

const API_BASE_URL = 'http://localhost:5000/api';

// 全局 Toast 提示函数 (Apple 风格)
function showToast(message, type = 'info') {
    const modalId = 'admin-toast';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = modalId;
    toast.className = 'fade-in';
    
    let bgColor = '#0066cc'; // info
    if (type === 'success') bgColor = '#34c759';
    if (type === 'warning') bgColor = '#ff9500';
    if (type === 'error') bgColor = '#ff3b30';

    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${bgColor};
        color: white;
        padding: 12px 24px;
        border-radius: 14px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        z-index: 20000;
        font-weight: 600;
        font-size: 14px;
        transition: all 0.3s ease;
        pointer-events: none;
    `;
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 数据库存 UTC，展示统一转北京时间（UTC+8）
function fmtTime(t) {
    if (!t) return '';
    const d = new Date(String(t).replace(' ', 'T') + 'Z');
    if (isNaN(d)) return t;
    return d.toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// 统一 API 请求封装
async function apiCall(method, endpoint, data = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('zx_admin_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (data) options.body = JSON.stringify(data);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (response.status === 401 && !endpoint.startsWith('/users/login')) {
            localStorage.removeItem('zx_admin_token');
            const overlay = document.getElementById('login-overlay');
            if (overlay) overlay.style.display = 'flex';
            throw new Error('登录已过期，请重新登录');
        }
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || '请求失败');
        return json;
    } catch (error) {
        console.error(`API Error [${method} ${endpoint}]:`, error);
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    let currentModule = 'dashboard';
    const mainContent = document.getElementById('main-content');
    const sidebar = document.getElementById('sidebar');

    // 初始化
    init();

    function init() {
        setupNavigation();
        if (localStorage.getItem('zx_admin_token')) {
            enterDashboard();
        } else {
            showLoginOverlay();
        }
    }

    function showLoginOverlay() {
        document.getElementById('login-overlay').style.display = 'flex';
    }

    function enterDashboard() {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('admin-name').innerText =
            localStorage.getItem('zx_admin_name') || '管理员';
        loadModule('dashboard');
    }

    // 管理员登录（onclick 调用，需挂 window）
    window.submitAdminLogin = async function() {
        const zhanghao = document.getElementById('login-account').value.trim();
        const mima = document.getElementById('login-password').value;
        if (!zhanghao || !mima) return showToast('请输入账号和密码', 'warning');
        try {
            const res = await apiCall('POST', '/users/login', { zhanghao, mima });
            if (res.data?.user?.role !== 'admin') {
                return showToast('该账号不是管理员，无权进入后勤系统', 'error');
            }
            localStorage.setItem('zx_admin_token', res.data.token);
            localStorage.setItem('zx_admin_name', res.data.user.xingming);
            showToast(`欢迎，${res.data.user.xingming}`, 'success');
            enterDashboard();
        } catch (e) {
            showToast(e.message || '登录失败', 'error');
        }
    };

    // 导航设置
    function setupNavigation() {
        // 顶部导航
        document.querySelectorAll('[data-module]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const module = link.getAttribute('data-module');
                loadModule(module);
            });
        });

        // 侧边栏菜单
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
                item.classList.add('active');
                const link = item.parentElement.querySelector('[data-module]');
                if (link) {
                    const module = link.getAttribute('data-module');
                    loadModule(module);
                }
            });
        });

        // 退出按钮
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('zx_admin_token');
            localStorage.removeItem('zx_admin_name');
            showToast('已安全退出登录', 'success');
            setTimeout(() => showLoginOverlay(), 600);
        });
    }

    // 异步加载模块
    async function loadModule(module) {
        currentModule = module;
        updateActiveNav(module);
        
        mainContent.innerHTML = `
            <div class="fade-in" style="padding: 40px; text-align: center; color: #86868b; font-size: 15px;">
                <div style="width: 32px; height: 32px; border: 3px solid #f5f5f7; border-top-color: #0066cc; border-radius: 50%; animate: spin 1s linear infinite; margin: 0 auto 15px; animation: spin 0.8s linear infinite;"></div>
                正在实时同步 SQLite 数据库数据...
            </div>
            <style>
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>
        `;
        
        let html = '';

        try {
            switch(module) {
                case 'dashboard':
                    html = await renderDashboard();
                    break;
                case 'canteen':
                    html = await renderCanteenManagement();
                    break;
                case 'safety':
                    html = renderSafetyManagement();
                    break;
                case 'conservation':
                    html = renderConservationManagement();
                    break;
                case 'service':
                    html = await renderServiceManagement();
                    break;
            }

            mainContent.innerHTML = html;
            mainContent.classList.add('fade-in');
            initModuleInteraction(module);
        } catch (error) {
            mainContent.innerHTML = `
                <div class="card fade-in" style="padding: 40px; text-align: center; max-width: 500px; margin: 50px auto; border-radius: 20px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🔌</div>
                    <h3 style="color: #ff3b30; margin-bottom: 10px; font-size: 18px;">无法连接至智饷食堂 API 服务</h3>
                    <p style="color: #86868b; font-size: 13px; line-height: 1.5; margin-bottom: 25px;">
                        未检测到运行在 <strong>http://localhost:5000</strong> 的后端服务。<br>
                        请双击运行 <strong>canteen/startup.bat</strong> 启动完整服务。
                    </p>
                    <button class="btn" style="background: #0066cc; color: white; padding: 10px 24px;" onclick="location.reload()">重新连接</button>
                </div>
            `;
        }
    }

    // 更新活跃导航
    function updateActiveNav(module) {
        document.querySelectorAll('[data-module]').forEach(link => {
            if (link.getAttribute('data-module') === module) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        document.querySelectorAll('.menu-item').forEach(item => {
            const parent = item.parentElement;
            const link = parent.querySelector('[data-module]');
            if (link && link.getAttribute('data-module') === module) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // ==================== 1. 数据统计与决策支持模块 ====================
    async function renderDashboard() {
        const dishesRes = await apiCall('GET', '/dishes');
        const ordersRes = await apiCall('GET', '/orders');
        const msgRes = await apiCall('GET', '/social/messages');
        const statsRes = await apiCall('GET', '/stats/dashboard');
        const stats = statsRes.data || {};
        
        const dishes = dishesRes.data || [];
        const orders = ordersRes.data || [];
        const feedbacks = msgRes.data || [];

        // 核心统计指标
        const totalOrders = stats.totalOrders ?? 0;
        const totalRevenue = stats.totalRevenue ?? 0;
        const avgRating = dishes.length > 0 ? (dishes.reduce((sum, d) => sum + (d.pinfen || 5.0), 0) / dishes.length).toFixed(1) : 4.8;
        
        // 今日指标
        const todayOrders = stats.todayOrders ?? 0;
        const todayRevenue = stats.todayRevenue ?? 0;

        return `
            <div class="page-title">📊 数据统计与决策支持</div>
            
            <div class="grid grid-4">
                <div class="kpi-card" style="background: linear-gradient(135deg, #0066cc 0%, #0071e3 100%);">
                    <div class="kpi-label">累计订单量</div>
                    <div class="kpi-value">${totalOrders} 单</div>
                    <div class="kpi-change positive">实时读写 SQLite</div>
                </div>
                <div class="kpi-card" style="background: linear-gradient(135deg, #34c759 0%, #30b550 100%);">
                    <div class="kpi-label">累计销售总额</div>
                    <div class="kpi-value">¥${totalRevenue.toFixed(2)}</div>
                    <div class="kpi-change positive">真实交易统计</div>
                </div>
                <div class="kpi-card" style="background: linear-gradient(135deg, #ff9500 0%, #f08500 100%);">
                    <div class="kpi-label">菜品平均评分</div>
                    <div class="kpi-value">${avgRating} 分</div>
                    <div class="kpi-change positive">基于 ${dishes.length} 款在售菜品</div>
                </div>
                <div class="kpi-card" style="background: linear-gradient(135deg, #50e3c2 0%, #3fd9b8 100%);">
                    <div class="kpi-label">今日成交额</div>
                    <div class="kpi-value">¥${todayRevenue.toFixed(2)}</div>
                    <div class="kpi-change positive">${todayOrders} 笔订单</div>
                </div>
            </div>

            <div class="grid grid-2">
                <div class="chart-container">
                    <div class="chart-title">周度运营趋势 (SQLite 原生数据)</div>
                    <div style="padding: 10px 0; font-size: 13px; line-height: 1.6; color: #1d1d1f;">
                        <strong>数据库最近下单记录：</strong>
                        <div style="margin-top: 10px; max-height: 150px; overflow-y: auto; padding-right: 5px;">
                            ${orders.slice(0, 5).map(o => `
                                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #f5f5f7;">
                                    <span>${fmtTime(o.addtime)} - ${o.caipinmingcheng} x${o.buyshu}</span>
                                    <span style="color: #0066cc; font-weight: 500;">¥${o.total} (${o.status})</span>
                                </div>
                            `).join('') || '<div style="color: #86868b; text-align: center;">暂无订单记录，等待前台用户下单</div>'}
                        </div>
                    </div>
                </div>
                <div class="chart-container">
                    <div class="chart-title">实时后勤运营指标</div>
                    <div class="stats-row">
                        <div class="stat-item">
                            <div class="stat-label">注册学生总数</div>
                            <div class="stat-value">${stats.totalUsers ?? 0}</div>
                        </div>
                    </div>
                    <div class="stats-row">
                        <div class="stat-item">
                            <div class="stat-label">未处理学生反馈</div>
                            <div class="stat-value">${stats.unrepliedMessages ?? 0} 件</div>
                        </div>
                    </div>
                    <div class="stats-row">
                        <div class="stat-item">
                            <div class="stat-label">菜品种类数量</div>
                            <div class="stat-value">${stats.totalDishes ?? dishes.length} 种</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>核心后勤指标看板</h3>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>指标名称</th>
                                <th>当前值</th>
                                <th>目标值</th>
                                <th>完成度</th>
                                <th>状态</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>待接单订单</td>
                                <td>${stats.pendingAccept ?? 0} 笔</td>
                                <td>0 笔</td>
                                <td>${(stats.pendingAccept ?? 0) === 0 ? '100%' : '处理中'}</td>
                                <td><span class="badge ${(stats.pendingAccept ?? 0) === 0 ? 'badge-success' : 'badge-warning'}">${(stats.pendingAccept ?? 0) === 0 ? '正常' : '需接单'}</span></td>
                            </tr>
                            <tr>
                                <td>待核销取餐</td>
                                <td>${stats.pendingPickup ?? 0} 笔</td>
                                <td>0 笔</td>
                                <td>${(stats.pendingPickup ?? 0) === 0 ? '100%' : '待取餐'}</td>
                                <td><span class="badge ${(stats.pendingPickup ?? 0) === 0 ? 'badge-success' : 'badge-warning'}">${(stats.pendingPickup ?? 0) === 0 ? '正常' : '待核销'}</span></td>
                            </tr>
                            <tr>
                                <td>低库存预警菜品</td>
                                <td>${stats.lowStockCount ?? 0} 种</td>
                                <td>≤ 3 种</td>
                                <td>${(stats.lowStockCount ?? 0) <= 3 ? '达标' : '超标'}</td>
                                <td><span class="badge ${(stats.lowStockCount ?? 0) <= 3 ? 'badge-success' : 'badge-danger'}">${(stats.lowStockCount ?? 0) <= 3 ? '正常' : '需补货'}</span></td>
                            </tr>
                            <tr>
                                <td>在售菜品率</td>
                                <td>${stats.totalDishes ? Math.round((stats.onSaleDishes / stats.totalDishes) * 100) : 100}%</td>
                                <td>≥ 90%</td>
                                <td>${stats.totalDishes ? Math.round((stats.onSaleDishes / stats.totalDishes) * 100) : 100}%</td>
                                <td><span class="badge badge-success">实时</span></td>
                            </tr>
                            <tr>
                                <td>平均客单价</td>
                                <td>¥${(stats.avgOrderValue ?? 0).toFixed(2)}</td>
                                <td>¥15.00</td>
                                <td>${(stats.avgOrderValue ?? 0) >= 15 ? '达标' : '偏低'}</td>
                                <td><span class="badge ${(stats.avgOrderValue ?? 0) >= 15 ? 'badge-success' : 'badge-warning'}">${(stats.avgOrderValue ?? 0) >= 15 ? '正常' : '关注'}</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <button class="btn" onclick="generateReport()">生成详细报告</button>
            </div>
        `;
    }

    // ==================== 2. 食堂运营管控模块 (菜品与订单 CRUD) ====================
    async function renderCanteenManagement() {
        const dishesRes = await apiCall('GET', '/dishes');
        const ordersRes = await apiCall('GET', '/orders');
        const restaurantsRes = await apiCall('GET', '/restaurants');

        const dishes = dishesRes.data || [];
        const orders = ordersRes.data || [];
        const restaurants = restaurantsRes.data || [];

        // 订单按 orderid 分组
        const groupedOrders = {};
        for (const o of orders) {
            if (!groupedOrders[o.orderid]) {
                groupedOrders[o.orderid] = {
                    orderid: o.orderid,
                    userid: o.userid,
                    addtime: o.addtime,
                    status: o.status,
                    address: o.address,
                    phone: o.phone,
                    remark: o.remark,
                    pickupCode: o.pickup_code,
                    items: [],
                    totalPrice: 0
                };
            }
            groupedOrders[o.orderid].items.push({
                name: o.caipinmingcheng,
                quantity: o.buyshu,
                price: o.price,
                total: o.total
            });
            groupedOrders[o.orderid].totalPrice += o.total;
        }
        const orderList = Object.values(groupedOrders);

        return `
            <div class="page-title">🏪 食堂运营管控</div>

            <div class="tabs">
                <button class="tab-button active" onclick="switchTab('canteen-overview', this)">运营概览</button>
                <button class="tab-button" onclick="switchTab('dish-mgmt', this)">菜品管理</button>
                <button class="tab-button" onclick="switchTab('order-mgmt', this)">订单管理</button>
            </div>

            <!-- 子模块1：运营概览 -->
            <div id="canteen-overview" class="tab-content active">
                <div class="grid grid-3">
                    ${restaurants.map(r => `
                        <div class="card">
                            <h3>${r.name}</h3>
                            <div class="stats-row">
                                <div class="stat-item">
                                    <div class="stat-label">⏱️ 排队时间</div>
                                    <div class="stat-value" style="font-size: 20px;">${r.queueTime} 分钟</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-label">👥 排队人数</div>
                                    <div class="stat-value" style="font-size: 20px;">${r.queueCount} 人</div>
                                </div>
                            </div>
                            <div class="stats-row" style="margin-top: 10px;">
                                <div class="stat-item">
                                    <div class="stat-label">空闲座位</div>
                                    <div class="stat-value" style="font-size: 20px; color: #34c759;">${r.availableSeats} / ${r.totalSeats}</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-label">评分</div>
                                    <div class="stat-value" style="font-size: 20px; color: #ff9500;">⭐ ${r.rating}</div>
                                </div>
                            </div>
                            <p style="margin: 15px 0 0 0; font-size: 13px; color: #86868b;">${r.description}</p>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- 子模块2：菜品管理 (CRUD) -->
            <div id="dish-mgmt" class="tab-content">
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <div>
                            <h3 style="margin: 0;">菜品管理看板</h3>
                            <p style="color: #86868b; font-size: 13px; margin-top: 4px;">此处数据实时同步自 SQLite 数据库中的 caipinxinxi 表，支持完全的增删改查。</p>
                        </div>
                        <button class="btn btn-success" style="padding: 10px 20px;" onclick="openAddDishModal()">+ 新增菜品</button>
                    </div>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>图片</th>
                                    <th>菜品名称</th>
                                    <th>分类</th>
                                    <th>单价</th>
                                    <th>库存</th>
                                    <th>月销量</th>
                                    <th>评分</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${dishes.map(dish => `
                                    <tr>
                                        <td>${dish.id}</td>
                                        <td>
                                            <img src="${dish.tupian && dish.tupian.startsWith('http') ? dish.tupian : '../canteen/' + (dish.tupian || 'dish-placeholder.svg')}" 
                                                 style="width: 44px; height: 34px; object-fit: cover; border-radius: 6px;"
                                                 onerror="this.src='../canteen/dish-placeholder.svg'">
                                        </td>
                                        <td><strong>${dish.caipinmingcheng}</strong>${dish.shangjia === '否' ? ' <span class="badge badge-danger">已下架</span>' : ''}</td>
                                        <td><span class="badge badge-info">${dish.caipinfenlei}</span></td>
                                        <td><strong style="color: #0066cc;">¥${dish.jiage}</strong></td>
                                        <td style="${dish.kucun < 20 ? 'color: #ff3b30; font-weight: 700;' : ''}">
                                            ${dish.kucun} 份${dish.kucun < 20 ? ' ⚠️' : ''}
                                        </td>
                                        <td>${dish.yueshuxiao}</td>
                                        <td>⭐ ${dish.pinfen}</td>
                                        <td>
                                            <button class="btn" style="padding: 6px 12px; font-size: 12px;" 
                                                    onclick="editDish(${JSON.stringify(dish).replace(/"/g, '&quot;')})">编辑</button>
                                            <button class="btn btn-danger" style="padding: 6px 12px; font-size: 12px; margin-left: 4px;" 
                                                    onclick="deleteDish(${dish.id})">删除</button>
                                            <button class="btn" style="padding: 6px 12px; font-size: 12px; margin-left: 4px; ${dish.shangjia === '否' ? 'background: #34c759; color: white;' : ''}"
                                                    onclick="toggleDishSale(${dish.id}, '${dish.shangjia === '否' ? '是' : '否'}')">${dish.shangjia === '否' ? '上架' : '下架'}</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- 子模块3：订单管理 (联动刷新) -->
            <div id="order-mgmt" class="tab-content">
                <div class="card">
                    <div>
                        <h3 style="margin: 0;">实时订单管理</h3>
                        <p style="color: #86868b; font-size: 13px; margin: 4px 0 20px 0;">当前共有 ${orderList.length} 笔独立订单。学生在前台支付下单，后台可实现秒级刷新同步！</p>
                    </div>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>下单时间</th>
                                    <th>订单号</th>
                                    <th>菜品详情</th>
                                    <th>实付总额</th>
                                    <th>收货地址 / 备注</th>
                                    <th>当前状态</th>
                                    <th>状态调整 (联动前台)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${orderList.length === 0 ? `
                                    <tr><td colspan="7" style="text-align: center; color: #86868b; padding: 40px;">暂无订单记录。前台点餐支付后，订单会实时加载在这里。</td></tr>
                                ` : orderList.map(order => `
                                    <tr>
                                        <td style="font-size: 13px; color: #86868b;">${order.addtime}</td>
                                        <td><code style="background: #f5f5f7; padding: 4px 8px; border-radius: 4px; font-size: 11px;">${order.orderid.slice(-8)}</code></td>
                                        <td>
                                            ${order.items.map(item => `
                                                <div style="font-size: 13px; margin-bottom: 2px;">
                                                    • ${item.name} x${item.quantity} 
                                                    <span style="color: #86868b; font-size: 11px;">(¥${item.price})</span>
                                                </div>
                                            `).join('')}
                                        </td>
                                        <td><strong style="color: #34c759; font-size: 15px;">¥${order.totalPrice.toFixed(2)}</strong></td>
                                        <td style="font-size: 12px; line-height: 1.4;">
                                            <strong>${order.address || '食堂自取'}</strong><br>
                                            <span style="color: #86868b;">Tel: ${order.phone || '无'}</span><br>
                                            <span style="color: #ff9500;">备注: ${order.remark || '无'}</span>
                                        </td>
                                        <td>
                                            <span class="badge ${
                                                order.status === '待取餐' ? 'badge-warning' :
                                                order.status === '已支付' ? 'badge-success' :
                                                order.status === '制作中' ? 'badge-warning' :
                                                order.status === '已完成' ? 'badge-success' : 'badge-danger'
                                            }">
                                                ${order.status}
                                            </span>
                                                ${order.pickupCode ? `<div style="font-size: 11px; color: #86868b; margin-top: 4px;">码: <b>${order.pickupCode}</b></div>` : ''}
                                        </td>
                                        <td>
                                            ${order.status === '已支付' ? `
                                                <button class="btn btn-success" style="padding: 6px 14px; font-size: 12px;" onclick="acceptOrder('${order.orderid}')">接单</button>
                                                <button class="btn" style="padding: 6px 10px; font-size: 12px; margin-left: 4px; color: #ff3b30;" onclick="refundOrder('${order.orderid}')">退款</button>
                                            ` : order.status === '制作中' ? `
                                                <button class="btn" style="padding: 6px 14px; font-size: 12px; background: #ff9500; color: white;" onclick="callOrder('${order.orderid}')">叫号取餐</button>
                                            ` : order.status === '待取餐' ? `
                                                <div style="display: flex; gap: 6px; align-items: center;">
                                                    <input id="pickup-input-${order.orderid}" placeholder="取餐码" maxlength="4"
                                                           style="width: 64px; padding: 6px 8px; border: 1px solid #d2d2d7; border-radius: 8px; font-size: 12px; text-transform: uppercase; outline: none;">
                                                    <button class="btn btn-success" style="padding: 6px 12px; font-size: 12px;" onclick="verifyPickup('${order.orderid}')">核销</button>
                                                </div>
                                            ` : `<span style="color: #86868b; font-size: 12px;">—</span>`}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    // ==================== 3. 食品安全监管模块 (静态展示) ====================
    function renderSafetyManagement() {
        return `
            <div class="page-title">🔒 食品安全监管 <span class="badge badge-warning" style="font-size: 12px; vertical-align: middle;">🚧 规划功能 · 演示数据</span></div>

            <div class="grid grid-3">
                <div class="alert alert-danger">
                    <div class="alert-icon">⚠️</div>
                    <div class="alert-content">
                        <div class="alert-title">高风险预警</div>
                        <div class="alert-message">检测到异常投诉集中于某菜品</div>
                    </div>
                </div>
                <div class="alert alert-warning">
                    <div class="alert-icon">⚡</div>
                    <div class="alert-content">
                        <div class="alert-title">供应商待审核</div>
                        <div class="alert-message">1家供应商资质待审核</div>
                    </div>
                </div>
                <div class="alert alert-info">
                    <div class="alert-icon">ℹ️</div>
                    <div class="alert-content">
                        <div class="alert-title">安全提示</div>
                        <div class="alert-message">本周食品安全合规率98%</div>
                    </div>
                </div>
            </div>

            <div class="tabs">
                <button class="tab-button active" onclick="switchTab('incidents', this)">事件管理</button>
                <button class="tab-button" onclick="switchTab('suppliers', this)">供应商管理</button>
                <button class="tab-button" onclick="switchTab('traceability', this)">溯源追踪</button>
            </div>

            <div id="incidents" class="tab-content active">
                <div class="card">
                    <h3>食品安全事件</h3>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>日期</th>
                                    <th>事件类型</th>
                                    <th>菜品</th>
                                    <th>严重程度</th>
                                    <th>处理状态</th>
                                    <th>处理措施</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${safetyData.incidents.map(incident => `
                                    <tr>
                                        <td>${incident.date}</td>
                                        <td>${incident.type}</td>
                                        <td>${incident.dish}</td>
                                        <td><span class="badge badge-danger">${incident.severity}</span></td>
                                        <td><span class="badge ${incident.status === '已处理' ? 'badge-success' : 'badge-warning'}">${incident.status}</span></td>
                                        <td>${incident.action}</td>
                                        <td>
                                            <button class="btn" style="padding: 6px 12px; font-size: 12px;" onclick="viewIncident(${incident.id})">查看</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="suppliers" class="tab-content">
                <div class="card">
                    <h3>供应商资质管理</h3>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>供应商名称</th>
                                    <th>认证状态</th>
                                    <th>证书有效期</th>
                                    <th>最近检查</th>
                                    <th>状态</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${safetyData.suppliers.map(supplier => `
                                    <tr>
                                        <td>${supplier.name}</td>
                                        <td><span class="badge ${supplier.qualification === '已认证' ? 'badge-success' : 'badge-warning'}">${supplier.qualification}</span></td>
                                        <td>${supplier.certEndDate}</td>
                                        <td>${supplier.recentInspection}</td>
                                        <td><span class="badge badge-info">${supplier.status}</span></td>
                                        <td>
                                            <button class="btn" style="padding: 6px 12px; font-size: 12px;" onclick="approveSupplier(${supplier.id})">审核</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <button class="btn btn-success" onclick="addSupplier()">+ 新增供应商</button>
                </div>
            </div>

            <div id="traceability" class="tab-content">
                <div class="card">
                    <h3>食材溯源管理</h3>
                    <div class="form-group">
                        <label>搜索食材批次</label>
                        <input type="text" placeholder="输入批次号或食材名称..." id="search-input">
                    </div>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>食材名称</th>
                                    <th>供应商ID</th>
                                    <th>批次号</th>
                                    <th>检验日期</th>
                                    <th>质量评分</th>
                                    <th>状态</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${safetyData.traceability.map(item => `
                                    <tr>
                                        <td>${item.ingredient}</td>
                                        <td>${item.supplier}</td>
                                        <td>${item.batch}</td>
                                        <td>${item.inspectionDate}</td>
                                        <td>${item.qualityScore}</td>
                                        <td><span class="badge badge-success">${item.status}</span></td>
                                        <td>
                                            <button class="btn" style="padding: 6px 12px; font-size: 12px;" onclick="traceIngredient('${item.batch}')">追溯</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    // ==================== 4. 节约型校园管理模块 (静态与交互) ====================
    function renderConservationManagement() {
        return `
            <div class="page-title">🌱 节约型校园管理 <span class="badge badge-warning" style="font-size: 12px; vertical-align: middle;">🚧 规划功能 · 演示数据</span></div>

            <div class="grid grid-3">
                <div class="kpi-card" style="background: linear-gradient(135deg, #34c759 0%, #30b550 100%);">
                    <div class="kpi-label">食材减耗率</div>
                    <div class="kpi-value">${conservationData.wasteAnalysis.dayData[5].reduction}%</div>
                    <div class="kpi-change positive">↑ 较昨日提升</div>
                </div>
                <div class="kpi-card" style="background: linear-gradient(135deg, #50b3e0 0%, #409ecf 100%);">
                    <div class="kpi-label">参与光盘人数</div>
                    <div class="kpi-value">${conservationData.lightPlate.totalParticipants}</div>
                    <div class="kpi-change">累计打卡</div>
                </div>
                <div class="kpi-card" style="background: linear-gradient(135deg, #ffa500 0%, #ff8c00 100%);">
                    <div class="kpi-label">本月累计节能电量</div>
                    <div class="kpi-value">1250 kWh</div>
                    <div class="kpi-change positive">↑ 节约12%</div>
                </div>
            </div>

            <div class="tabs">
                <button class="tab-button active" onclick="switchTab('waste-mgmt', this)">食材浪费监测</button>
                <button class="tab-button" onclick="switchTab('energy-mgmt', this)">能耗分析</button>
                <button class="tab-button" onclick="switchTab('lightplate', this)">光盘计划</button>
            </div>

            <div id="waste-mgmt" class="tab-content active">
                <div class="card">
                    <h3>近日食材浪费趋势</h3>
                    <div class="chart-container">
                        <div style="text-align: left; width: 100%;">
                            <div style="margin-bottom: 10px; font-size: 13px; line-height: 1.6;">
                                ${conservationData.wasteAnalysis.dayData.map(item => 
                                    `<div>📅 ${item.date}: 浪费 ${item.waste}kg → <span style="color: #34c759; font-weight: 500;">减耗 ${item.reduction}%</span></div>`
                                ).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h3>高浪费菜品排行</h3>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>菜品名称</th>
                                    <th>浪费率</th>
                                    <th>浪费量(kg)</th>
                                    <th>后勤部处理建议</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${conservationData.wasteAnalysis.topWasteDishes.map((item, idx) => `
                                    <tr>
                                        <td><strong>${item.name}</strong></td>
                                        <td><span style="color: #ff3b30; font-weight: 600;">${item.wasteRate}%</span></td>
                                        <td>${item.quantity} kg</td>
                                        <td>
                                            <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" 
                                                    onclick="getOptimizeSuggestion(${idx})">查看建议</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="energy-mgmt" class="tab-content">
                <div class="card">
                    <h3>今日食堂用能能耗指标</h3>
                    <div class="grid grid-3">
                        <div class="stat-item" style="border: 1px solid #e8e8ed; padding: 15px; border-radius: 12px;">
                            <div class="stat-label">💧 用水量</div>
                            <div class="stat-value" style="font-size: 24px;">${conservationData.energyConsumption.water.today} ${conservationData.energyConsumption.water.unit}</div>
                            <div style="margin-top: 8px; font-size: 12px; color: #34c759;">↓ ${Math.abs(conservationData.energyConsumption.water.trend)}% 较昨日</div>
                        </div>
                        <div class="stat-item" style="border: 1px solid #e8e8ed; padding: 15px; border-radius: 12px;">
                            <div class="stat-label">⚡ 用电量</div>
                            <div class="stat-value" style="font-size: 24px;">${conservationData.energyConsumption.electricity.today} ${conservationData.energyConsumption.electricity.unit}</div>
                            <div style="margin-top: 8px; font-size: 12px; color: #34c759;">↓ ${Math.abs(conservationData.energyConsumption.electricity.trend)}% 较昨日</div>
                        </div>
                        <div class="stat-item" style="border: 1px solid #e8e8ed; padding: 15px; border-radius: 12px;">
                            <div class="stat-label">🔥 天然气</div>
                            <div class="stat-value" style="font-size: 24px;">${conservationData.energyConsumption.gas.today} ${conservationData.energyConsumption.gas.unit}</div>
                            <div style="margin-top: 8px; font-size: 12px; color: #ff3b30;">↑ ${conservationData.energyConsumption.gas.trend}% 较昨日</div>
                        </div>
                    </div>
                    <button class="btn" style="margin-top: 15px;" onclick="getEnergyReport()">生成能耗报告</button>
                </div>
            </div>

            <div id="lightplate" class="tab-content">
                <div class="card">
                    <h3>光盘打卡计划统计</h3>
                    <div class="stats-row">
                        <div class="stat-item">
                            <div class="stat-label">累计参与打卡</div>
                            <div class="stat-value">${conservationData.lightPlate.totalParticipants} 人</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">今日参与打卡</div>
                            <div class="stat-value">${conservationData.lightPlate.todayParticipants} 人</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">累计打卡积分</div>
                            <div class="stat-value" style="color: #34c759;">${conservationData.lightPlate.points} 分</div>
                        </div>
                    </div>

                    <h4 style="margin-top: 25px; margin-bottom: 12px;">可换取奖励管理</h4>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>奖励券名称</th>
                                    <th>已被学生兑换数量</th>
                                    <th>库存操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${conservationData.lightPlate.rewards.map(reward => `
                                    <tr>
                                        <td><strong>${reward.name}</strong></td>
                                        <td>${reward.count} 张</td>
                                        <td>
                                            <button class="btn" style="padding: 6px 12px; font-size: 12px;" onclick="adjustReward('${reward.name}', 1)">增加</button>
                                            <button class="btn btn-danger" style="padding: 6px 12px; font-size: 12px;" onclick="adjustReward('${reward.name}', -1)">减少</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <button class="btn btn-success" style="margin-top: 15px;" onclick="addNewReward()">+ 新增奖励</button>
                </div>
            </div>
        `;
    }

    // ==================== 5. 校园服务管理模块 (留言管理) ====================
    async function renderServiceManagement() {
        const msgRes = await apiCall('GET', '/social/messages');
        const messages = msgRes.data || [];

        return `
            <div class="page-title">💼 校园服务管理</div>

            <div class="tabs">
                <button class="tab-button active" onclick="switchTab('feedback-mgmt', this)">留言与意见反馈</button>
                <button class="tab-button" onclick="switchTab('merchant-review', this)">校园商户审核</button>
            </div>

            <!-- 反馈管理 (SQLite messages 表) -->
            <div id="feedback-mgmt" class="tab-content active">
                <div class="card">
                    <h3>学生意见反馈处理进度</h3>
                    <p style="color: #86868b; font-size: 13px; margin: 4px 0 20px 0;">此处数据实时同步自 SQLite 数据库中的 messages 表。学生在前台留言，后勤处在此实时进行官方答复！</p>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>反馈ID</th>
                                    <th>留言学生</th>
                                    <th>反馈意见内容</th>
                                    <th>后勤处官方答复</th>
                                    <th>提交时间</th>
                                    <th>状态</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${messages.length === 0 ? `
                                    <tr><td colspan="7" style="text-align: center; color: #86868b; padding: 40px;">暂无学生留言。学生在互动广场留言后，会在此同步展示。</td></tr>
                                ` : messages.map(item => `
                                    <tr>
                                        <td>#${item.id}</td>
                                        <td><strong>${item.yonghuming}</strong></td>
                                        <td style="max-width: 250px; word-break: break-all; line-height: 1.4;">${item.content}</td>
                                        <td style="max-width: 250px; word-break: break-all; line-height: 1.4; color: #0066cc;">
                                            ${item.replycontent 
                                                ? `<strong>[已答复]</strong> ${item.replycontent}` 
                                                : '<span style="color: #ff9500;">⌛ 尚未处理，等待回复...</span>'}
                                        </td>
                                        <td style="font-size: 12px; color: #86868b;">${item.addtime}</td>
                                        <td>
                                            <span class="badge ${item.replycontent ? 'badge-success' : 'badge-warning'}">
                                                ${item.replycontent ? '已处理' : '待处理'}
                                            </span>
                                        </td>
                                        <td>
                                            <button class="btn" style="padding: 6px 12px; font-size: 12px;" 
                                                    onclick="replyFeedback(${item.id}, '${item.yonghuming}', ${JSON.stringify(item.content).replace(/"/g, '&quot;')})">
                                                ${item.replycontent ? '修改答复' : '立即答复'}
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- 商户审核 -->
            <div id="merchant-review" class="tab-content">
                <div class="card">
                    <h3>校园后勤服务商户名录 <span class="badge badge-warning" style="font-size: 12px; vertical-align: middle;">🚧 规划功能 · 演示数据</span></h3>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>服务机构名称</th>
                                    <th>服务类别</th>
                                    <th>评价得分</th>
                                    <th>当前运营状态</th>
                                    <th>最近审核时间</th>
                                    <th>审核人</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${serviceData.merchants.map(merchant => `
                                    <tr>
                                        <td><strong>${merchant.name}</strong></td>
                                        <td>${merchant.category}</td>
                                        <td>⭐ ${merchant.rating}</td>
                                        <td><span class="badge badge-success">${merchant.status}</span></td>
                                        <td>${merchant.reviewDate}</td>
                                        <td>${merchant.reviewer}</td>
                                        <td>
                                            <button class="btn" style="padding: 6px 12px; font-size: 12px;" onclick="suspendMerchant(${merchant.id})">暂停</button>
                                            <button class="btn btn-danger" style="padding: 6px 12px; font-size: 12px;" onclick="removeMerchantService(${merchant.id})">下线</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <button class="btn btn-success" onclick="addServiceMerchant()">+ 新增后勤商户</button>
                </div>
            </div>
        `;
    }

    // 交互初始化
    function initModuleInteraction(module) {
        // 大屏或模块特定交互
    }

    // 全局交互选项卡切换
    window.switchTab = function(tabId, button) {
        const tabs = button.parentElement.querySelectorAll('.tab-button');
        const contents = button.parentElement.parentElement.querySelectorAll('.tab-content');
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        button.classList.add('active');
        document.getElementById(tabId).classList.add('active');
    };

    // ==================== 数据库交互：菜品 CRUD 操作 ====================
    
    // 打开菜品编辑/新增 Modal
    window.openAddDishModal = function() {
        openDishModal();
    };

    window.editDish = function(dish) {
        openDishModal(dish);
    };

    function openDishModal(dish = null) {
        const isEdit = !!dish;
        const modalId = 'dish-form-modal';
        
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();
        
        const categories = ['米饭', '面食', '热菜', '凉菜', '汤品', '饮品', '套餐'];
        
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.4);
            backdrop-filter: blur(15px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 11000;
            animation: fadeIn 0.25s ease;
        `;
        
        modal.innerHTML = `
            <div class="card" style="width: 480px; max-width: 90%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 50px rgba(0,0,0,0.3); border-radius: 24px; text-align: left; padding: 25px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #f5f5f7; padding-bottom: 12px;">
                    <h3 style="margin: 0; font-size: 20px; font-weight: 700;">${isEdit ? '📝 编辑菜品信息' : '🍽️ 新增在售菜品'}</h3>
                    <span onclick="document.getElementById('${modalId}').remove()" style="cursor: pointer; font-size: 28px; color: #86868b; line-height: 1;">&times;</span>
                </div>
                
                <form id="dish-form" onsubmit="submitDishForm(event, ${isEdit ? dish.id : 'null'})">
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #1d1d1f;">菜品名称 *</label>
                        <input type="text" id="m-dish-name" required value="${isEdit ? dish.caipinmingcheng : ''}" 
                               style="width: 100%; padding: 10px; border: 1px solid #d2d2d7; border-radius: 10px; outline: none; font-size: 14px;">
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #1d1d1f;">菜品分类 *</label>
                        <select id="m-dish-category" required style="width: 100%; padding: 10px; border: 1px solid #d2d2d7; border-radius: 10px; outline: none; background: white; font-size: 14px;">
                            ${categories.map(c => `<option value="${c}" ${isEdit && dish.caipinfenlei === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #1d1d1f;">售价 (元) *</label>
                        <input type="number" step="0.5" min="0" id="m-dish-price" required value="${isEdit ? dish.jiage : ''}" 
                               style="width: 100%; padding: 10px; border: 1px solid #d2d2d7; border-radius: 10px; outline: none; font-size: 14px;">
                    </div>

                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #1d1d1f;">在库份数 *</label>
                        <input type="number" min="0" id="m-dish-stock" required value="${isEdit ? dish.kucun : '100'}" 
                               style="width: 100%; padding: 10px; border: 1px solid #d2d2d7; border-radius: 10px; outline: none; font-size: 14px;">
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #1d1d1f;">图片链接 (可选)</label>
                        <input type="text" id="m-dish-image" value="${isEdit ? dish.tupian : ''}" placeholder="默认使用系统占位图" 
                               style="width: 100%; padding: 10px; border: 1px solid #d2d2d7; border-radius: 10px; outline: none; font-size: 14px;">
                    </div>

                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #1d1d1f;">主要配料 (逗号分隔)</label>
                        <input type="text" id="m-dish-cailiao" value="${isEdit ? (dish.cailiao || '') : ''}" placeholder="如：大米，蔬菜，香肠" 
                               style="width: 100%; padding: 10px; border: 1px solid #d2d2d7; border-radius: 10px; outline: none; font-size: 14px;">
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 25px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #1d1d1f;">营养参考 (如 kcal，蛋白质等)</label>
                        <input type="text" id="m-dish-yingyang" value="${isEdit ? (dish.yingyang || '') : ''}" placeholder="如：热量 350kcal，蛋白质 15g" 
                               style="width: 100%; padding: 10px; border: 1px solid #d2d2d7; border-radius: 10px; outline: none; font-size: 14px;">
                    </div>
                    
                    <div style="display: flex; gap: 12px;">
                        <button type="button" class="btn" style="flex: 1; background: #e8e8ed; color: #1d1d1f;" onclick="document.getElementById('${modalId}').remove()">取消</button>
                        <button type="submit" class="btn" style="flex: 1; background: #0066cc; color: white;">保存提交</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // 提交菜品表单
    window.submitDishForm = async function(event, dishId = null) {
        event.preventDefault();
        const isEdit = dishId !== null;
        
        const payload = {
            caipinmingcheng: document.getElementById('m-dish-name').value.trim(),
            caipinfenlei: document.getElementById('m-dish-category').value,
            jiage: parseFloat(document.getElementById('m-dish-price').value),
            kucun: parseInt(document.getElementById('m-dish-stock').value),
            tupian: document.getElementById('m-dish-image').value.trim() || 'dish-placeholder.svg',
            cailiao: document.getElementById('m-dish-cailiao').value.trim() || '热菜配方',
            guige: '标准份',
            yingyang: document.getElementById('m-dish-yingyang').value.trim() || '热量 280kcal'
        };
        
        try {
            const url = isEdit ? `/dishes/${dishId}` : '/dishes';
            const method = isEdit ? 'PUT' : 'POST';
            const res = await apiCall(method, url, payload);
            
            showToast(res.message || '菜品数据保存成功！', 'success');
            document.getElementById('dish-form-modal').remove();
            
            // 局部重新加载食堂管控页面的最新数据
            loadModule('canteen');
        } catch (error) {
            showToast(error.message || '操作失败，请重试', 'error');
        }
    };

    // 删除菜品
    window.deleteDish = async function(dishId) {
        if (!confirm('🚨 危险警告：\n您确定要删除该在售菜品吗？删除后前台用户将无法点餐该菜品，此操作无法撤销。')) return;

        try {
            const res = await apiCall('DELETE', `/dishes/${dishId}`);
            showToast(res.message || '菜品已被成功移除！', 'success');
            loadModule('canteen');
        } catch (error) {
            showToast(error.message || '删除失败，可能该菜品已被绑定到已有订单', 'error');
        }
    };

    // 菜品上下架
    window.toggleDishSale = async function(id, next) {
        try {
            await apiCall('PUT', `/dishes/${id}`, { shangjia: next });
            showToast(next === '是' ? '菜品已上架' : '菜品已下架', 'success');
            await loadModule('canteen');
            const tabs = document.querySelectorAll('.tab-button');
            if (tabs[1]) tabs[1].click();
        } catch (e) { showToast(e.message, 'error'); }
    };

    // ==================== 订单操作流：接单 → 叫号 → 核销 ====================
    async function refreshOrderModule() {
        await loadModule('canteen');
        // 重新激活"订单管理"Tab（第 3 个 tab-button）
        const tabs = document.querySelectorAll('.tab-button');
        if (tabs[2]) tabs[2].click();
    }

    window.acceptOrder = async function(orderid) {
        try {
            await apiCall('PUT', `/orders/${orderid}/status`, { status: '制作中' });
            showToast('已接单，开始制作', 'success');
            await refreshOrderModule();
        } catch (e) { showToast(e.message, 'error'); }
    };

    window.callOrder = async function(orderid) {
        try {
            await apiCall('PUT', `/orders/${orderid}/status`, { status: '待取餐' });
            showToast('已叫号，等待学生取餐', 'success');
            await refreshOrderModule();
        } catch (e) { showToast(e.message, 'error'); }
    };

    window.verifyPickup = async function(orderid) {
        const input = document.getElementById(`pickup-input-${orderid}`);
        const pickupCode = (input?.value || '').trim().toUpperCase();
        if (!pickupCode) return showToast('请输入学生出示的取餐码', 'warning');
        try {
            await apiCall('POST', `/orders/${orderid}/pickup`, { pickupCode });
            showToast('核销成功，订单完成', 'success');
            await refreshOrderModule();
        } catch (e) { showToast(e.message, 'error'); }
    };

    window.refundOrder = async function(orderid) {
        if (!confirm('确认对该订单退款？')) return;
        try {
            await apiCall('PUT', `/orders/${orderid}/status`, { status: '已退款' });
            showToast('已退款', 'success');
            await refreshOrderModule();
        } catch (e) { showToast(e.message, 'error'); }
    };

    // ==================== 反馈留言交互：官方处理回复 ====================
    window.replyFeedback = function(msgId, username, content) {
        const modalId = 'reply-form-modal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.4);
            backdrop-filter: blur(15px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 11000;
            animation: fadeIn 0.25s ease;
        `;
        
        modal.innerHTML = `
            <div class="card" style="width: 480px; max-width: 90%; box-shadow: 0 20px 50px rgba(0,0,0,0.3); border-radius: 24px; text-align: left; padding: 25px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #f5f5f7; padding-bottom: 12px;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 700;">💼 答复学生意见反馈</h3>
                    <span onclick="document.getElementById('${modalId}').remove()" style="cursor: pointer; font-size: 28px; color: #86868b; line-height: 1;">&times;</span>
                </div>
                
                <div style="background: #f5f5f7; padding: 15px; border-radius: 12px; margin-bottom: 20px; font-size: 13px; color: #1d1d1f; line-height: 1.5;">
                    <strong style="color: #0066cc;">学生 (@${username}) 反馈：</strong><br>
                    <div style="margin-top: 6px; white-space: pre-wrap;">${content}</div>
                </div>
                
                <form onsubmit="submitFeedbackReply(event, ${msgId})">
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">后勤处处理及意见答复 *</label>
                        <textarea id="m-reply-content" required placeholder="请友好、客观、详细地回复该学生的合理关切..."
                                  style="width: 100%; height: 120px; padding: 12px; border: 1px solid #d2d2d7; border-radius: 10px; outline: none; font-size: 14px; resize: none; line-height: 1.5;"></textarea>
                    </div>
                    
                    <div style="display: flex; gap: 12px;">
                        <button type="button" class="btn" style="flex: 1; background: #e8e8ed; color: #1d1d1f;" onclick="document.getElementById('${modalId}').remove()">取消</button>
                        <button type="submit" class="btn" style="flex: 1; background: #0066cc; color: white;">提交官方答复</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    };

    window.submitFeedbackReply = async function(event, msgId) {
        event.preventDefault();
        const replycontent = document.getElementById('m-reply-content').value.trim();
        
        try {
            const res = await apiCall('PUT', `/social/messages/${msgId}/reply`, { replycontent });
            showToast('已成功处理反馈并进行官方答复！', 'success');
            document.getElementById('reply-form-modal').remove();
            loadModule('service');
        } catch (error) {
            showToast(error.message || '提交回复失败', 'error');
        }
    };

    // ==================== 其他后勤静态操作操作 ====================
    window.viewCanteenDetail = function(id) {
        const restaurant = canteenData.restaurants.find(r => r.id === id);
        alert(`查看 ${restaurant.name} 详情：\n\n今日订单: ${restaurant.todayOrders}\n今日收入: ¥${restaurant.todayRevenue}\n商户数: ${restaurant.merchants}\n评分: ${restaurant.rating}\n状态: ${restaurant.status}`);
    };

    window.viewIncident = function(id) {
        const incident = safetyData.incidents.find(i => i.id === id);
        alert(`事件详情：\n\n日期: ${incident.date}\n类型: ${incident.type}\n菜品: ${incident.dish}\n严重程度: ${incident.severity}\n描述: ${incident.description}`);
    };

    window.approveSupplier = function(id) {
        if (confirm('确认审核通过此供应商?')) {
            showToast('供应商资质审核通过！', 'success');
        }
    };

    window.addSupplier = function() {
        alert('打开供应商注册表单');
    };

    window.traceIngredient = function(batch) {
        alert(`正在追溯食材批次: ${batch}\n\n来源 → 入库 → 加工 → 销售\n完整溯源链路已建立`);
    };

    window.getOptimizeSuggestion = function(idx) {
        const suggestions = [
            '建议减少每份份量，提高销售效率',
            '改进烹饪工艺，降低损耗率',
            '与商户沟通，调整配菜比例'
        ];
        alert(`优化建议：\n\n${suggestions[idx]}`);
    };

    window.getEnergyReport = function() {
        alert('能耗分析报告已生成：\n\n本月用电: 25,000kWh (+12%)\n本月用水: 120吨 (-8%)\n建议: 重点关注用气异常情况');
    };

    window.adjustReward = function(name, delta) {
        showToast(`${delta > 0 ? '增加' : '减少'} ${name} 奖励`);
    };

    window.addNewReward = function() {
        alert('打开新增奖励表单');
    };

    window.suspendMerchant = function(id) {
        if (confirm('确认暂停此商户运营?')) {
            showToast('商户已暂停运营', 'warning');
        }
    };

    window.removeMerchantService = function(id) {
        if (confirm('确认下线此商户?')) {
            showToast('商户已被下线', 'error');
        }
    };

    window.addServiceMerchant = function() {
        alert('打开商户注册表单');
    };

    window.generateReport = function() {
        showToast('详细财务与运营决策报告生成中...', 'info');
        setTimeout(() => {
            alert('正在生成详细报告...\n\n已包含：\n- 运营数据分析\n- 商户合规情况\n- 食品安全评估\n- 节能减排成果\n\n报告已发送到您的邮箱');
        }, 1000);
    };
});