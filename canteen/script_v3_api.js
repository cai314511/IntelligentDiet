// 智饷食堂运营管理系统 v3.0 - 前后端分离版本
// 与Express后端API集成的完整脚本

const API_BASE_URL = 'http://localhost:5000/api';

// ==================== 全局状态管理 ====================
let currentUser = null;
let currentCart = [];
let currentPage = 'home';

// ==================== API 调用函数 ====================

async function apiCall(method, endpoint, data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '请求失败');
    }
    return await response.json();
  } catch (error) {
    console.error('API错误:', error);
    showNotification('错误: ' + error.message, 'error');
    throw error;
  }
}

// ==================== 初始化函数 ====================

function init() {
  setupNavigation();
  setupXiaozhi();
  loadPage('home');
  checkUserSession();
}

// ==================== 用户认证 ====================

function openUserModal() {
  const modal = document.getElementById('user-modal');
  modal.classList.remove('hidden');
  showLoginForm();
}

function showLoginForm() {
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('profile-form').classList.add('hidden');
}

function showProfileForm() {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('profile-form').classList.remove('hidden');
}

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  if (!username || !password) {
    showNotification('请输入用户名和密码', 'warning');
    return;
  }

  try {
    const response = await apiCall('POST', '/users/login', {
      zhanghao: username,
      mima: password
    });

    if (response.code === 200) {
      currentUser = response.data.user;
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(currentUser));
      
      showNotification('登录成功！', 'success');
      document.getElementById('user-center').textContent = currentUser.xingming || '用户中心';
      
      setTimeout(() => {
        document.getElementById('user-modal').classList.add('hidden');
        showProfileForm();
      }, 1000);
    }
  } catch (error) {
    showNotification('登录失败，请检查用户名和密码', 'error');
  }
}

function checkUserSession() {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    currentUser = JSON.parse(userStr);
    document.getElementById('user-center').textContent = currentUser.xingming || '用户中心';
  }
}

// ==================== 页面导航 ====================

function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-menu a');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.getAttribute('data-page');
      loadPage(page);
      updateNavActive(page);
    });
  });

  document.getElementById('user-center').addEventListener('click', openUserModal);
  document.getElementById('login-btn').addEventListener('click', login);
  document.getElementById('close-user-modal').addEventListener('click', () => {
    document.getElementById('user-modal').classList.add('hidden');
  });
}

function updateNavActive(page) {
  document.querySelectorAll('.nav-menu a').forEach(a => {
    a.classList.remove('active');
    if (a.getAttribute('data-page') === page) {
      a.classList.add('active');
    }
  });
}

async function loadPage(page) {
  currentPage = page;
  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = '<div class="fade-in">加载中...</div>';

  try {
    switch (page) {
      case 'home':
        await renderHomePage();
        break;
      case 'order':
        await renderOrderPage();
        break;
      case 'recommend':
        await renderRecommendPage();
        break;
      case 'social':
        await renderSocialPage();
        break;
      case 'culture':
        await renderCulturePage();
        break;
    }
  } catch (error) {
    mainContent.innerHTML = `<div class="card fade-in"><h3>页面加载失败</h3><p>${error.message}</p></div>`;
  }
}

// ==================== 主页 ====================

async function renderHomePage() {
  const mainContent = document.getElementById('main-content');
  
  let html = `
    <div class="fade-in">
      <div class="banner">
        <h2>欢迎来到智饷食堂</h2>
        <p>用AI技术，让就餐更智慧</p>
      </div>

      <div class="grid grid-4">
        <div class="card">
          <h3>🍽️ 智能点餐</h3>
          <p>轻松浏览40+菜品，一键下单</p>
          <button class="btn" onclick="loadPage('order')">开始点餐</button>
        </div>
        <div class="card">
          <h3>💪 营养推荐</h3>
          <p>根据健康目标，智能推荐食谱</p>
          <button class="btn" onclick="loadPage('recommend')">查看食谱</button>
        </div>
        <div class="card">
          <h3>💬 社交评价</h3>
          <p>分享美食体验，浏览用户评价</p>
          <button class="btn" onclick="loadPage('social')">进入广场</button>
        </div>
        <div class="card">
          <h3>🎨 文化创意</h3>
          <p>探索校园创意，参与文化活动</p>
          <button class="btn" onclick="loadPage('culture')">浏览创意</button>
        </div>
      </div>

      <div class="card fade-in">
        <h2>热门餐厅</h2>
        <div id="restaurant-list" class="grid grid-3"></div>
      </div>
    </div>
  `;

  mainContent.innerHTML = html;
  
  // 加载餐厅信息
  try {
    const response = await apiCall('GET', '/restaurants');
    if (response.code === 200) {
      const restaurantList = document.getElementById('restaurant-list');
      restaurantList.innerHTML = response.data.map(r => `
        <div class="card">
          <h3>${r.name}</h3>
          <p>⏱️ 排队时间: ${r.queueTime}分钟</p>
          <p>👥 当前排队: ${r.queueCount}人</p>
          <p>⭐ 评分: ${r.rating}</p>
          <p>${r.description}</p>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('加载餐厅失败:', error);
  }
}

// ==================== 点餐页面 ====================

async function renderOrderPage() {
  const mainContent = document.getElementById('main-content');
  
  const html = `
    <div class="fade-in">
      <h1 class="page-title">智能点餐</h1>
      
      <div class="grid grid-2-sidebar">
        <div>
          <div class="card">
            <h3>选择餐厅</h3>
            <div id="restaurant-selector" class="grid grid-3"></div>
          </div>

          <div class="card">
            <h3>菜品分类</h3>
            <div id="category-buttons"></div>
          </div>

          <div class="card">
            <h3>菜品列表</h3>
            <div id="dishes-list" class="grid grid-2"></div>
          </div>
        </div>

        <div class="cart-sidebar">
          <div class="card">
            <h3>🛒 购物车</h3>
            <div id="cart-items"></div>
            <div class="cart-total" id="cart-total">¥0.00</div>
            <button class="btn" style="width: 100%" onclick="checkout()">去结算</button>
          </div>
        </div>
      </div>
    </div>
  `;

  mainContent.innerHTML = html;
  
  // 加载菜品
  await loadDishes();
}

async function loadDishes(category = null) {
  try {
    const url = category ? `/dishes?category=${category}` : '/dishes';
    const response = await apiCall('GET', url);
    
    if (response.code === 200) {
      const dishesList = document.getElementById('dishes-list');
      dishesList.innerHTML = response.data.map(dish => `
        <div class="card dish-card">
          <img src="${dish.tupian || 'dish-placeholder.svg'}" alt="${dish.caipinmingcheng}" 
               class="dish-image" onerror="this.src='dish-placeholder.svg'">
          <div class="dish-info">
            <h4>${dish.caipinmingcheng}</h4>
            <div class="dish-tags">
              <span class="tag">${dish.caipinfenlei}</span>
            </div>
            <div class="dish-stats">
              <span class="price">¥${dish.jiage}</span>
              <span>⭐ ${dish.pinfen}</span>
            </div>
            <button class="btn btn-success" style="width: 100%; margin-top: 8px"
                    onclick="addToCart(${dish.id}, '${dish.caipinmingcheng}', ${dish.jiage}, '${dish.tupian}')">
              加入购物车
            </button>
          </div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('加载菜品失败:', error);
  }
}

function addToCart(dishId, dishName, price, image) {
  const item = {
    dishId,
    dishName,
    price,
    image,
    quantity: 1
  };

  currentCart.push(item);
  updateCartDisplay();
  showNotification(`${dishName} 已加入购物车`, 'success');
}

function updateCartDisplay() {
  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
  
  let html = '';
  let total = 0;

  currentCart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    html += `
      <div class="cart-item">
        <span>${item.dishName}</span>
        <span>${item.quantity}x ¥${item.price}</span>
        <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px"
                onclick="removeFromCart(${index})">删除</button>
      </div>
    `;
  });

  cartItems.innerHTML = html || '<p style="color: #86868B;">购物车为空</p>';
  cartTotal.textContent = `¥${total.toFixed(2)}`;
}

function removeFromCart(index) {
  currentCart.splice(index, 1);
  updateCartDisplay();
}

async function checkout() {
  if (currentCart.length === 0) {
    showNotification('购物车为空，请先添加菜品', 'warning');
    return;
  }

  if (!currentUser) {
    showNotification('请先登录', 'warning');
    openUserModal();
    return;
  }

  try {
    const response = await apiCall('POST', '/orders', {
      userid: currentUser.id,
      items: currentCart,
      address: '学校食堂',
      phone: currentUser.lianxifangshi
    });

    if (response.code === 200) {
      showNotification(`订单创建成功！取餐码: ${response.data.orderid.slice(-6)}`, 'success');
      currentCart = [];
      updateCartDisplay();
    }
  } catch (error) {
    showNotification('下单失败，请重试', 'error');
  }
}

// ==================== 推荐页面 ====================

async function renderRecommendPage() {
  const mainContent = document.getElementById('main-content');
  
  const html = `
    <div class="fade-in">
      <h1 class="page-title">营养推荐</h1>
      <p class="page-subtitle">根据你的健康目标，获得个性化食谱推荐</p>

      <div class="grid grid-2-sidebar">
        <div>
          <div class="card">
            <h3>📋 健康食谱</h3>
            <div id="recipes-list" class="grid grid-2"></div>
          </div>
        </div>

        <div class="card">
          <h3>👤 我的健康资料</h3>
          <div id="health-profile"></div>
          <button class="btn" style="width: 100%; margin-top: 16px" onclick="openUserModal()">
            编辑资料
          </button>
        </div>
      </div>
    </div>
  `;

  mainContent.innerHTML = html;

  // 加载食谱
  try {
    const response = await apiCall('GET', '/recipes');
    if (response.code === 200) {
      const recipesList = document.getElementById('recipes-list');
      recipesList.innerHTML = response.data.map(recipe => `
        <div class="card recipe-card">
          <h4>${recipe.goal}</h4>
          <p>${recipe.description}</p>
          <p>📊 日目标热量: ${recipe.dailyCalories}kcal</p>
          <button class="btn" style="width: 100%"
                  onclick="viewRecipe(${recipe.id})">查看详情</button>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('加载食谱失败:', error);
  }

  // 显示用户健康资料
  if (currentUser) {
    document.getElementById('health-profile').innerHTML = `
      <p><strong>姓名:</strong> ${currentUser.xingming}</p>
      <p><strong>联系方式:</strong> ${currentUser.lianxifangshi}</p>
      <p><strong>账户余额:</strong> ¥${currentUser.jine}</p>
    `;
  }
}

// ==================== 社交页面 ====================

async function renderSocialPage() {
  const mainContent = document.getElementById('main-content');
  
  const html = `
    <div class="fade-in">
      <h1 class="page-title">互动广场</h1>

      <div class="grid grid-2-sidebar">
        <div>
          <div class="card">
            <h3>📊 热门排行</h3>
            <div id="rankings"></div>
          </div>

          <div class="card">
            <h3>💬 用户评论</h3>
            <div id="reviews"></div>
          </div>
        </div>

        <div class="card">
          <h3>💡 发布建议</h3>
          <textarea id="suggestion-content" placeholder="分享你的想法..." 
                    style="width: 100%; height: 100px; padding: 12px; border: 1px solid #D2D2D7; border-radius: 8px;"></textarea>
          <button class="btn" style="width: 100%; margin-top: 12px"
                  onclick="submitSuggestion()">提交建议</button>
        </div>
      </div>
    </div>
  `;

  mainContent.innerHTML = html;

  // 加载排行榜
  try {
    const response = await apiCall('GET', '/social/rankings');
    if (response.code === 200) {
      const rankings = response.data;
      let rankingsHtml = '<h4>🏆 推荐菜品</h4>';
      rankings.recommend.forEach((dish, i) => {
        rankingsHtml += `<p>${i + 1}. ${dish.dishName} (${dish.rating}⭐) - ${dish.reason}</p>`;
      });
      document.getElementById('rankings').innerHTML = rankingsHtml;
    }
  } catch (error) {
    console.error('加载排行榜失败:', error);
  }
}

// ==================== 文化页面 ====================

async function renderCulturePage() {
  const mainContent = document.getElementById('main-content');
  
  const html = `
    <div class="fade-in">
      <h1 class="page-title">文化创意展厅</h1>

      <div class="card">
        <h2>🎉 校园活动</h2>
        <div id="activities-list" class="grid grid-3"></div>
      </div>

      <div class="card">
        <h2>🎨 学生创作</h2>
        <div id="creations-list" class="grid grid-3"></div>
      </div>

      <div class="card">
        <h2>🏪 文创产品</h2>
        <div id="products-list" class="grid grid-4"></div>
      </div>
    </div>
  `;

  mainContent.innerHTML = html;

  // 加载活动
  try {
    const response = await apiCall('GET', '/activities');
    if (response.code === 200) {
      document.getElementById('activities-list').innerHTML = response.data.map(activity => `
        <div class="card activity-card">
          <h3>${activity.title}</h3>
          <p>${activity.description}</p>
          <p>👥 ${activity.participants}人参加</p>
          <button class="btn" style="width: 100%"
                  onclick="joinActivity(${activity.id})">立即参加</button>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('加载活动失败:', error);
  }
}

// ==================== Xiaozhi AI助手 ====================

function setupXiaozhi() {
  const xiaozhi = document.getElementById('xiaozhi-icon');
  const panel = document.getElementById('xiaozhi-panel');
  const sendBtn = document.getElementById('send-btn');
  const closeBtn = document.getElementById('close-panel');

  xiaozhi.addEventListener('click', () => {
    panel.classList.toggle('hidden');
  });

  closeBtn.addEventListener('click', () => {
    panel.classList.add('hidden');
  });

  sendBtn.addEventListener('click', sendMessage);

  document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  // 快速按钮
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      handleQuickAction(action);
    });
  });
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();

  if (!message) return;

  // 添加用户消息
  addMessage(message, 'user');
  input.value = '';

  try {
    const response = await apiCall('POST', '/ai/chat', { message });
    if (response.code === 200) {
      addMessage(response.reply, 'bot');
    } else {
      addMessage('💡 同学，小智刚刚走神了，您再说一次好吗？', 'bot');
    }
  } catch (error) {
    // 捕获异常，给出高拟真 Mock 降级回复
    const reply = getXiaozhiReply(message);
    addMessage(reply + ' \n\n【离线服务提示：小智目前已降级为本地模拟回复，请确保 canteen/startup.bat 正常运行且后端端口 5000 可达。若要使用谷歌 Gemini AI 脑，请在 server/.env 中填入有效的 GEMINI_API_KEY】', 'bot');
  }
}

function addMessage(text, sender) {
  const history = document.getElementById('chat-history');
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${sender}`;
  messageDiv.innerHTML = text.replace(/\n/g, '<br>');
  history.appendChild(messageDiv);
  history.scrollTop = history.scrollHeight;
}

function getXiaozhiReply(message) {
  const responses = {
    '排队': '当前食堂排队时间较长。建议您在11点之前或下午2点之后就餐，可避免高峰期。',
    '食谱': '根据您的健康目标，我为您推荐了"增肌健身套餐"。包含高蛋白食物，很适合坚持运动的同学。',
    '活动': '最新活动有"轻食挑战赛"和"美食节"。您可前往文化创意页面查看详情～',
    '订单': '您还没有下过订单。建议先浏览菜单，选择喜欢的菜品试试看！',
    '问题': '很遗憾听到这个反馈。您可在社交广场发布建议，我们会认真听取～'
  };

  for (const [key, value] of Object.entries(responses)) {
    if (message.includes(key)) {
      return value;
    }
  }

  return '您好！有任何关于食堂的问题吗？我可以帮您查看排队情况、推荐菜品、了解活动等信息。😊';
}

function handleQuickAction(action) {
  const actions = {
    'queue': '一食堂排队情况如何？',
    'diet': '推荐一个适合我的健康食谱',
    'activity': '最近有什么美食活动？',
    'order': '帮我查一下我的最新订单状态'
  };

  const labels = {
    'queue': '正在查询当前排队情况...',
    'diet': '为您生成个性化食谱...',
    'activity': '正在加载最新活动...',
    'order': '正在查询您的订单...'
  };

  if (actions[action]) {
    addMessage(labels[action], 'user');
    
    // 直接模拟发送对应的请求至后端 AI
    setTimeout(async () => {
      try {
        const response = await apiCall('POST', '/ai/chat', { message: actions[action] });
        if (response.code === 200) {
          addMessage(response.reply, 'bot');
        } else {
          addMessage(getXiaozhiReply(action), 'bot');
        }
      } catch (error) {
        addMessage(getXiaozhiReply(action) + ' \n\n【离线服务提示：小智目前已降级为本地模拟回复。】', 'bot');
      }
    }, 600);
  }
}

// ==================== 辅助函数 ====================

function showNotification(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // 可扩展为显示toast提示
}

function viewRecipe(id) {
  showNotification('查看食谱详情：ID ' + id, 'info');
}

function submitSuggestion() {
  const content = document.getElementById('suggestion-content').value;
  if (!content.trim()) {
    showNotification('建议不能为空', 'warning');
    return;
  }

  showNotification('感谢您的建议！我们会认真听取。', 'success');
  document.getElementById('suggestion-content').value = '';
}

function joinActivity(activityId) {
  showNotification('成功加入活动！积极参与，获取奖励吧～', 'success');
}

// ==================== 启动应用 ====================

document.addEventListener('DOMContentLoaded', init);
