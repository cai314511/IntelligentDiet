// 智饷高校智慧食堂系统主脚本 v2.0 - 完整版本
// 实现SPA路由、小智AI、全模块交互、订单跟踪、座位预约等完整功能

document.addEventListener('DOMContentLoaded', function() {
    // ========== 全局变量 ==========
    let currentPage = 'home';
    let cart = [];
    let currentRestaurantId = null;
    let loggedIn = false;
    let userVotes = {}; // 用户投票记录

    // ========== 初始化 ==========
    init();

    function init() {
        setupNavigation();
        setupXiaozhi();
        loadPage('home');
        updateNavbarScroll();
        window.addEventListener('scroll', updateNavbarScroll);
    }

    // ========== 导航设置 ==========
    function setupNavigation() {
        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const page = this.getAttribute('data-page');
                loadPage(page);
            });
        });

        document.getElementById('user-center').addEventListener('click', openUserModal);
    }

    // ========== 页面加载主函数 ==========
    function loadPage(page) {
        currentPage = page;
        updateNavActive(page);
        let content = '';

        switch(page) {
            case 'home': content = renderHomePage(); break;
            case 'order': content = renderOrderPage(); break;
            case 'recommend': content = renderRecommendPage(); break;
            case 'social': content = renderSocialPage(); break;
            case 'culture': content = renderCulturePage(); break;
            default: content = renderHomePage();
        }

        document.getElementById('main-content').innerHTML = content;
        document.getElementById('main-content').classList.add('fade-in');

        // 页面特定初始化
        switch(page) {
            case 'order': setTimeout(initOrderPage, 100); break;
            case 'recommend': setTimeout(initRecommendPage, 100); break;
            case 'social': setTimeout(initSocialPage, 100); break;
            case 'culture': setTimeout(initCulturePage, 100); break;
        }
    }

    // ========== 导航栏 ==========
    function updateNavbarScroll() {
        const navbar = document.getElementById('navbar');
        if (window.scrollY > 50) {
            navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        } else {
            navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        }
    }

    function updateNavActive(page) {
        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === page) link.classList.add('active');
        });
    }

    // ========== 小智AI精灵 ==========
    function setupXiaozhi() {
        const xiaozhiIcon = document.getElementById('xiaozhi-icon');
        const xiaozhiPanel = document.getElementById('xiaozhi-panel');
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const voiceBtn = document.getElementById('voice-btn');
        const closePanel = document.getElementById('close-panel');

        xiaozhiIcon.addEventListener('click', () => xiaozhiPanel.classList.toggle('hidden'));
        closePanel.addEventListener('click', () => xiaozhiPanel.classList.add('hidden'));
        sendBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });
        voiceBtn.addEventListener('click', () => alert('语音模式示例'));

        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const action = this.getAttribute('data-action');
                handleQuickAction(action);
            });
        });
    }

    function sendMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();
        if (!message) return;

        addChatMessage(message, 'user');
        chatInput.value = '';

        setTimeout(() => {
            const reply = getXiaozhiReply(message);
            addChatMessage(reply, 'bot');
        }, 800);
    }

    function addChatMessage(text, type) {
        const chatHistory = document.getElementById('chat-history');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        messageDiv.textContent = text;
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function getXiaozhiReply(message) {
        const msg = message.toLowerCase();
        for (let key in xiaozhiQA) {
            if (msg.includes(key)) return xiaozhiQA[key];
        }
        if (msg.includes('菜品') || msg.includes('推荐')) return xiaozhiQA['推荐菜品'];
        if (msg.includes('活动')) return xiaozhiQA['活动'];
        if (msg.includes('排队')) return xiaozhiQA['排队情况'];
        return '您好！我是小智AI精灵。有什么需要帮助吗？';
    }

    function handleQuickAction(action) {
        switch(action) {
            case 'queue':
                addChatMessage('查看排队情况', 'user');
                setTimeout(() => addChatMessage(xiaozhiQA['排队情况'], 'bot'), 500);
                break;
            case 'diet':
                loadPage('recommend');
                addChatMessage('为您生成个性化食谱...', 'bot');
                break;
            case 'activity':
                loadPage('culture');
                break;
            case 'order':
                addChatMessage('查看我的订单...', 'bot');
                displayMyOrders();
                break;
        }
    }

    // ========== 用户中心登录 ==========
    function openUserModal() {
        document.getElementById('user-modal').classList.remove('hidden');
        if (loggedIn) showProfileForm();
        else showLoginForm();
    }

    function closeUserModal() {
        document.getElementById('user-modal').classList.add('hidden');
    }

    function showLoginForm() {
        document.getElementById('user-modal-title').textContent = '登录';
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('profile-form').classList.add('hidden');
    }

    function showProfileForm() {
        document.getElementById('user-modal-title').textContent = '个人资料';
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('profile-form').classList.remove('hidden');
        document.getElementById('profile-height').value = userProfile.height;
        document.getElementById('profile-weight').value = userProfile.weight;
        document.getElementById('profile-bmi').value = userProfile.bmi;
        document.getElementById('profile-goals').value = userProfile.goals;
    }

    if (document.getElementById('login-btn')) {
        document.getElementById('login-btn').addEventListener('click', function() {
            const user = document.getElementById('username').value.trim();
            const pwd = document.getElementById('password').value;
            if (user && pwd) {
                loggedIn = true;
                document.getElementById('user-center').textContent = user;
                alert(`欢迎 ${user}`);
                showProfileForm();
            } else alert('请输入用户名和密码');
        });

        document.getElementById('save-profile-btn').addEventListener('click', function() {
            userProfile.height = parseFloat(document.getElementById('profile-height').value) || userProfile.height;
            userProfile.weight = parseFloat(document.getElementById('profile-weight').value) || userProfile.weight;
            userProfile.bmi = ((userProfile.weight) / ((userProfile.height/100)**2)).toFixed(1);
            userProfile.goals = document.getElementById('profile-goals').value || userProfile.goals;
            document.getElementById('profile-bmi').value = userProfile.bmi;
            alert('资料已保存');
            addChatMessage('个人资料已更新，小智已记录您的健康目标', 'bot');
        });

        document.getElementById('close-user-modal').addEventListener('click', closeUserModal);
    }

    // ========== 页面渲染函数 ==========

    function renderHomePage() {
        return `
            <div class="page-title">欢迎使用智饷</div>
            <div class="page-subtitle">AI驱动的智慧食堂体验，让用餐更便捷</div>
            <div class="banner" style="background: linear-gradient(135deg, #0066CC, #0071E3); color: white; padding: 40px; border-radius: 20px; margin-bottom: 40px; text-align: center;">
                <h2>🎉 今日特惠 | 新品上线</h2>
                <p style="margin: 10px 0;">糖醋里脊、西兰花意面限时优惠！</p>
            </div>
            <div class="grid grid-2">
                <div class="card">
                    <h3>🍽️ 智能点餐</h3>
                    <p>实时查看排队，智能推荐，一键下单取餐</p>
                    <button class="btn" onclick="window.loadPage('order')">开始点餐</button>
                </div>
                <div class="card">
                    <h3>🥗 AI营养推荐</h3>
                    <p>基于您的健康档案，生成个性化食谱</p>
                    <button class="btn" onclick="window.loadPage('recommend')">查看推荐</button>
                </div>
                <div class="card">
                    <h3>💬 互动社区</h3>
                    <p>分享体验，查看菜品评价，食堂榜单</p>
                    <button class="btn" onclick="window.loadPage('social')">进入社区</button>
                </div>
                <div class="card">
                    <h3>🎁 文创活动</h3>
                    <p>校园周边，创意美食，学生共创</p>
                    <button class="btn" onclick="window.loadPage('culture')">发现精彩</button>
                </div>
            </div>
        `;
    }

    function renderOrderPage() {
        let html = `<div class="page-title">智能点餐</div>
            <div class="grid grid-3" id="restaurant-status">`;

        restaurants.forEach(r => {
            const queueStyle = r.queueTime > 15 ? 'color: #FF3B30' : 'color: #34C759';
            html += `
                <div class="card restaurant-card">
                    <h3>${r.name} (${r.floor})</h3>
                    <div style="font-size: 14px; color: #86868B;">
                        排队: ${r.queueCount}人 | <span style="${queueStyle}">预计${r.queueTime}分钟</span>
                        <br>座位: ${r.seatsTotal - r.seatsOccupied}/${r.seatsTotal}
                    </div>
                    <button class="btn" onclick="selectRestaurant(${r.id})">进入点餐</button>
                </div>
            `;
        });

        html += `</div><div id="order-content" class="hidden">
            <div class="grid grid-6" style="margin-bottom: 30px;">`;

        categories.forEach(cat => {
            html += `<button class="btn btn-secondary category-btn" data-category="${cat.id}">${cat.name}</button>`;
        });

        html += `</div>
            <div class="grid grid-2-sidebar">
                <div id="dishes-list" class="grid grid-1"></div>
                <div class="cart-sidebar card">
                    <h3>🛒 购物车</h3>
                    <div id="cart-list" style="max-height: 300px; overflow-y: auto;"></div>
                    <div class="cart-total" id="cart-total">总价: ¥0</div>
                    <button class="btn btn-success" style="width: 100%;" onclick="checkout()">下单结算</button>
                </div>
            </div>
        </div>`;
        return html;
    }

    function renderRecommendPage() {
        return `
            <div class="page-title">菜品推荐与AI营养系统</div>
            <div class="banner" style="background: linear-gradient(135deg, #34C759, #00C896); color: white; padding: 30px; border-radius: 20px; margin-bottom: 30px; text-align: center;">
                <h3>🥗 个性化营养推荐</h3>
                <p>根据您的健康目标制定每日食谱</p>
            </div>

            <div class="grid grid-2">
                <div class="card">
                    <h3>📊 健康档案</h3>
                    <p>身高: ${userProfile.height}cm | 体重: ${userProfile.weight}kg</p>
                    <p>BMI: ${userProfile.bmi} | 目标: ${userProfile.goals}</p>
                    <button class="btn btn-secondary" onclick="openUserModal()">编辑档案</button>
                </div>

                <div class="card">
                    <h3>📋 推荐食谱</h3>
                    <select id="recipe-select" onchange="displayRecipe()">
                        <option value="">选择健康目标...</option>
                        ${dietRecipes.map((r, i) => `<option value="${i}">${r.goal} (${r.dailyCalories}卡)</option>`).join('')}
                    </select>
                </div>
            </div>

            <div id="recipe-display"></div>

            <div class="card">
                <h3>🍽️ 热门推荐</h3>
                <div class="grid grid-3">
                    ${dishes.slice(0, 9).map(dish => `
                        <div class="card dish-card">
                            <img src="${dish.image}" alt="${dish.name}" class="dish-image">
                            <h4>${dish.name}</h4>
                            ${dish.introImage ? `<img src="${dish.introImage}" alt="${dish.name}" class="intro-img">` : ''}
                            <div class="dish-stats">
                                <span class="price">¥${dish.price}</span>
                                <button class="btn" onclick="addToCart(${dish.id})">添加</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderSocialPage() {
        return `
            <div class="page-title">互动广场</div>
            
            <div class="grid grid-2">
                <div class="card">
                    <h3>📊 食堂榜单</h3>
                    <div style="margin-bottom: 20px;">
                        <strong>⭐ 推荐榜</strong>
                        ${rankings.recommend.map(r => `<p style="font-size: 14px;">${r.rank}. ${r.name}(${r.price}¥) - ${r.reason}</p>`).join('')}
                    </div>
                    <div style="margin-bottom: 20px;">
                        <strong>❌ 避雷榜</strong>
                        ${rankings.pitfall.map(r => `<p style="font-size: 14px;">${r.rank}. ${r.name} - ${r.reason}</p>`).join('')}
                    </div>
                    <div>
                        <strong>💰 性价比榜</strong>
                        ${rankings.costEffective.map(r => `<p style="font-size: 14px;">${r.rank}. ${r.name}(${r.price}¥) - 评分${r.score}</p>`).join('')}
                    </div>
                </div>

                <div class="card">
                    <h3>💬 发布动态</h3>
                    <textarea id="post-content" placeholder="分享您的用餐体验..." style="width: 100%; height: 80px; padding: 8px; border-radius: 8px; border: 1px solid #d2d2d7;"></textarea>
                    <button class="btn btn-success" style="margin-top: 10px; width: 100%;" onclick="publishPost()">发布</button>
                </div>
            </div>

            <div class="card">
                <h3>🎤 用户评价</h3>
                ${reviews.slice(0, 5).map(r => `
                    <div style="padding: 12px; border-bottom: 1px solid #f5f5f7;">
                        <strong>${r.user}</strong> ${'⭐'.repeat(r.rating)}
                        <p>${r.content}</p>
                        <div style="font-size: 12px; color: #86868B;">👍${r.likes} 👎${r.dislikes}</div>
                    </div>
                `).join('')}
            </div>

            <div class="card">
                <h3>✏️ 改进建议</h3>
                ${suggestions.map(s => `
                    <div style="padding: 12px; border-bottom: 1px solid #f5f5f7;">
                        <strong>${s.user}</strong> [${s.status}]
                        <p>${s.content}</p>
                        <div style="font-size: 12px; color: #86868B;">👍${s.likes} · ${s.date}</div>
                    </div>
                `).join('')}
                <button class="btn btn-secondary" style="width: 100%; margin-top: 10px;" onclick="submitSuggestion()">提交建议</button>
            </div>
        `;
    }

    function renderCulturePage() {
        return `
            <div class="page-title">高校文创&活动专区</div>
            
            <div class="card">
                <h3>🎖️ 校园文创产品</h3>
                <div class="grid grid-5">
                    ${culturalProducts.map(p => `
                        <div class="card" style="text-align: center;">
                            <img src="${p.image}" alt="${p.name}" style="width: 100%; height: 120px; border-radius: 8px; margin-bottom: 8px;">
                            <h4 style="font-size: 14px;">${p.name}</h4>
                            <p style="font-size: 12px; color: #86868B;">¥${p.price}</p>
                            <button class="btn" style="font-size: 12px; padding: 6px 12px;" onclick="addToCart(${p.id}, 'product')">购买</button>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="card">
                <h3>🍜 特色文创餐品</h3>
                <div class="grid grid-4">
                    ${culturalDishes.map(d => `
                        <div class="card dish-card">
                            <img src="${d.image}" alt="${d.name}" class="dish-image">
                            <h4>${d.name}</h4>
                            <p style="font-size: 12px; color: #86868B;">${d.description}</p>
                            <p style="font-size: 12px;">⏰ ${d.duration}</p>
                            <div class="dish-stats">
                                <span class="price">¥${d.price}</span>
                                <button class="btn" onclick="addToCart(${d.id}, 'cultural-dish')">点餐</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="card">
                <h3>👨‍🍳 学生创意菜品</h3>
                <div class="grid grid-1">
                    ${studentCreations.map(s => `
                        <div style="padding: 16px; border: 1px solid #f5f5f7; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h4>${s.name}</h4>
                                <p style="color: #86868B; font-size: 14px;">${s.description}</p>
                                <p style="color: #86868B; font-size: 12px;">状态: ${s.status} | 投票: ${s.votes} | 评论: ${s.comments}</p>
                            </div>
                            <button class="btn ${userVotes[s.id] ? 'btn-secondary' : ''}" onclick="voteCreation(${s.id})">${userVotes[s.id] ? '✓ 已投' : '投票'}</button>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="card">
                <h3>🎉 活动专区</h3>
                <div class="grid grid-2">
                    ${activities.map(a => `
                        <div style="padding: 16px; border: 2px solid #0066CC; border-radius: 12px;">
                            <h4>${a.name}</h4>
                            <p>${a.description}</p>
                            <p style="color: #86868B; font-size: 12px;">⏰ ${a.time}</p>
                            <p style="color: #86868B; font-size: 12px;">👥 ${a.participants}人报名</p>
                            <button class="btn btn-success" style="width: 100%; margin-top: 10px;" onclick="joinActivity(${a.id})">${a.status === '进行中' ? '立即参加' : '查看详情'}</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // ========== 页面初始化函数 ==========

    function initOrderPage() {
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const categoryId = parseInt(this.getAttribute('data-category'));
                displayDishes(categoryId);
            });
        });
    }

    function initRecommendPage() {
        window.displayRecipe = function() {
            const select = document.getElementById('recipe-select');
            const index = select.value;
            if (index === '') {
                document.getElementById('recipe-display').innerHTML = '';
                return;
            }
            const recipe = dietRecipes[index];
            let html = `
                <div class="card">
                    <h3>${recipe.goal} (${recipe.dailyCalories}卡)</h3>
                    <p>${recipe.desc}</p>
                    <div class="grid grid-3">
            `;
            const mealNames = ['早餐', '午餐', '晚餐'];
            recipe.meals.forEach((meal, i) => {
                html += `<div><strong>${mealNames[i]}</strong><p>${meal.join(' + ')}</p></div>`;
            });
            html += `</div><button class="btn btn-success" onclick="addRecipeToCart()">一键加入购物车</button></div>`;
            document.getElementById('recipe-display').innerHTML = html;
        };
    }

    function initSocialPage() {}
    function initCulturePage() {}

    // ========== 购物车函数 ==========

    function displayDishes(categoryId) {
        const filtered = dishes.filter(d => d.category === categoryId);
        let html = filtered.map(d => `
            <div class="card dish-card">
                <img src="${d.image}" alt="${d.name}" class="dish-image">
                <div class="dish-info">
                    <h4>${d.name}</h4>
                    ${d.introImage ? `<img src="${d.introImage}" alt="${d.name}" class="intro-img">` : ''}
                    <div class="dish-tags">${d.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
                    <div class="dish-stats">
                        <span class="price">¥${d.price}</span>
                        <button class="btn" onclick="addToCart(${d.id})">添加</button>
                    </div>
                </div>
            </div>
        `).join('');
        document.getElementById('dishes-list').innerHTML = html;
    }

    window.selectRestaurant = function(id) {
        currentRestaurantId = id;
        document.getElementById('restaurant-status').style.display = 'none';
        document.getElementById('order-content').classList.remove('hidden');
        displayDishes(1);
    };

    window.addToCart = function(dishId, type = 'dish') {
        let item;
        if (type === 'dish') {
            item = dishes.find(d => d.id === dishId);
        } else if (type === 'product') {
            item = culturalProducts.find(d => d.id === dishId);
        } else if (type === 'cultural-dish') {
            item = culturalDishes.find(d => d.id === dishId);
        }
        
        if (!item) return;

        const existingItem = cart.find(c => c.id === dishId && c.type === type);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({ ...item, quantity: 1, type });
        }

        updateCartDisplay();
        addChatMessage(`✅ 已添加 ${item.name} 到购物车`, 'bot');
    };

    function updateCartDisplay() {
        const cartList = document.getElementById('cart-list');
        const cartTotal = document.getElementById('cart-total');

        if (!cartList) return;

        let html = cart.map((item, idx) => `
            <div style="padding: 8px; border-bottom: 1px solid #f5f5f7; display: flex; justify-content: space-between;">
                <span>${item.name} x${item.quantity}</span>
                <div>
                    <span style="color: #0066CC;">¥${(item.price * item.quantity).toFixed(2)}</span>
                    <button onclick="removeFromCart(${idx})" style="margin-left: 8px; padding: 2px 6px; border: none; background: #FF3B30; color: white; border-radius: 4px; cursor: pointer;">✕</button>
                </div>
            </div>
        `).join('');

        cartList.innerHTML = html;

        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        cartTotal.textContent = `总价: ¥${total.toFixed(2)}`;
    }

    window.removeFromCart = function(index) {
        cart.splice(index, 1);
        updateCartDisplay();
    };

    window.checkout = function() {
        if (cart.length === 0) {
            alert('购物车为空');
            return;
        }
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        
        // 生成订单
        const orderId = orders.length + 1;
        const code = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + String(1000 + orderId);
        const newOrder = {
            id: orderId,
            items: cart.map(c => ({ dishId: c.id, quantity: c.quantity })),
            total,
            status: '待制作',
            pickupCode: code,
            pickupCounter: '1号窗口',
            time: new Date().toLocaleString()
        };
        orders.push(newOrder);
        
        alert(`✅ 下单成功！\n取餐号: ${code}\n预计10分钟完成\n请前往1号窗口取餐`);
        addChatMessage(`订单${code}已提交，预计10分钟完成`, 'bot');
        cart = [];
        updateCartDisplay();
    };

    // ========== 其他功能函数 ==========

    window.publishPost = function() {
        const content = document.getElementById('post-content').value;
        if (!content.trim()) alert('请输入内容');
        else {
            alert('动态发布成功！');
            document.getElementById('post-content').value = '';
        }
    };

    window.submitSuggestion = function() {
        alert('感谢您的建议，我们会尽快处理！');
    };

    window.voteCreation = function(id) {
        if (userVotes[id]) {
            alert('您已投票');
            return;
        }
        userVotes[id] = true;
        const creation = studentCreations.find(c => c.id === id);
        creation.votes++;
        loadPage('culture');
        alert('投票成功！');
    };

    window.joinActivity = function(id) {
        alert('✅ 您已成功报名活动！小智会在活动前提醒您。');
        addChatMessage('您已报名活动，小智将提醒您活动信息', 'bot');
    };

    window.addRecipeToCart = function() {
        const select = document.getElementById('recipe-select');
        const index = select.value;
        if (index === '') {
            alert('请先选择食谱');
            return;
        }
        const recipe = dietRecipes[index];
        recipe.meals.forEach(meal => {
            meal.forEach(item => {
                const match = item.match(/(.+?)\s+(\d+)¥/);
                if (match) {
                    const dishName = match[1];
                    const d = dishes.find(dish => dish.name.includes(dishName));
                    if (d) addToCart(d.id);
                }
            });
        });
    };

    function displayMyOrders() {
        let html = '<div style="padding: 16px;">';
        if (orders.length === 0) {
            html += '暂无订单';
        } else {
            orders.forEach(ord => {
                html += `<div style="padding: 8px; border-bottom: 1px solid #f5f5f7;">
                    <strong>订单${ord.pickupCode}</strong> - ${ord.status}
                    <p>总价: ¥${ord.total} | 取餐: ${ord.pickupCounter}</p>
                </div>`;
            });
        }
        html += '</div>';
        document.getElementById('main-content').insertAdjacentHTML('beforeend', html);
    }

    // ========== 全局导出 ==========
    window.loadPage = loadPage;
});
