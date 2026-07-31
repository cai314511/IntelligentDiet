        // --- 模拟数据库 (Mock Data) ---
        const DB = {
            restaurants: [
                { id: 1, name: '沙河校区·东区一楼餐厅', queues: 120, waitTime: 26, seats: 28, totalSeats: 200, status: 'warning' },
                { id: 2, name: '沙河校区·子衿食园', queues: 73, waitTime: 6, seats: 60, totalSeats: 130, status: 'good' },
                { id: 3, name: '沙河校区·风味餐厅', queues: 68, waitTime: 4, seats: 100, totalSeats: 150, status: 'good' },
                { id: 4, name: '南路校区·龙马一餐厅', queues: 15, waitTime: 2, seats: 100, totalSeats: 120, status: 'empty' }
            ],
            menu: [
                { id: 106, name: '爆炒孜然羊肉', category: '热菜', price: 18.0, img: 'https://images.unsplash.com/photo-1627042633145-b780d842ba45?w=400&q=80', cal: 400, protein: 30, tag: '本周上新', sales: 15, rating: 4.9, isNew: true, nutritionGoal: '吃饱吃好', window: '二楼特色小炒' },
                { id: 107, name: '白灼菜心', category: '凉菜', price: 5.0, img: 'https://images.unsplash.com/photo-1556801712-76c8eb07bbc9?w=400&q=80', cal: 60, protein: 2, tag: '农场直供', sales: 40, rating: 4.7, isNew: true, nutritionGoal: '营养均衡', window: '一楼大众自选' },
                { id: 108, name: '鲜榨橙汁', category: '饮品', price: 12.0, img: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&q=80', cal: 150, protein: 4, tag: '打工人必备', sales: 80, rating: 4.8, isNew: true, nutritionGoal: '营养均衡', window: '一楼水吧' },
                { id: 101, name: '减脂鸡肉沙拉', category: '热菜', price: 6.5, img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80', cal: 250, protein: 25, tag: '减脂推荐', sales: 450, rating: 4.8, nutritionGoal: '减脂增肌', window: '二楼轻食轻语' },
                { id: 102, name: '豚骨拉面套餐', category: '套餐', price: 15.0, img: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400&q=80', cal: 800, protein: 25, tag: '人气爆款', sales: 980, rating: 4.9, nutritionGoal: '吃饱吃好', window: '一楼面食档口' },
                { id: 105, name: '清炖萝卜牛腩粥', category: '汤品', price: 8.0, img: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80', cal: 180, protein: 8, tag: '温补', sales: 12, rating: 4.5, overstocked: true, nutritionGoal: '性价比', window: '一楼粥粉面' },
                { id: 109, name: '香煎秋刀鱼', category: '热菜', price: 9.0, img: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=400&q=80', cal: 220, protein: 18, tag: '特价', sales: 8, rating: 4.2, overstocked: true, nutritionGoal: '性价比', window: '一楼大众自选' },
                { id: 110, name: '慢烤低脂雪花牛排', category: '热菜', price: 22.0, img: 'https://images.unsplash.com/photo-1544025162-811114bd4b6e?w=400&q=80', cal: 300, protein: 35, tag: '优质蛋白', sales: 150, rating: 4.9, nutritionGoal: '减脂增肌', window: '二楼西式简餐' }
            ],
            social: [
                { id: 1, user: '种菜闪餐小队长', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80', rating: 5, content: '今天风味餐厅上新的爆炒羊肉绝了！排队只用了5分钟。', img: 'https://images.unsplash.com/photo-1627042633145-b780d842ba45?w=400&q=80', time: '10分钟前', likes: 45 },
                { id: 2, user: '高数使我快乐', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80', rating: 4, content: '减脂鸡肉沙拉分量很足，但是酱汁稍少了一点点，建议可以自己备一点油醋汁。', img: null, time: '2小时前', likes: 12 },
                { id: 3, user: '深夜碳水星人', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&q=80', rating: 1, content: '避雷！一食堂那个所谓创新菜“草莓炒芹菜”，简直是反人类的设计！', img: null, time: '昨天', likes: 108 }
            ],
            culture: [
                { id: 1, name: '校庆限定：银杏流沙包', price: 12.0, img: 'https://images.unsplash.com/photo-1512152272829-459f0f971c26?w=400&q=80', desc: '以秋季校园满地银杏为灵感。', type: 'food' },
                { id: 2, name: '「智饷」联名帆布袋', price: 29.9, img: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&q=80', desc: '采用环保有机棉，大容量，装得下MacBook和你的饭盒。', type: 'merch' },
                { id: 3, name: '校园四季明信片套组', price: 15.0, img: 'https://images.unsplash.com/photo-1586724236151-6893692a7e78?w=400&q=80', desc: '记录中财大最美的春花与秋月。', type: 'merch' }
            ],
            leaderboards: {
                top: [{name: '豚骨拉面套餐', reason: '连续三周霸榜'}, {name: '爆炒孜然羊肉', reason: '口碑爆棚'}],
                cheap: [{name: '白灼菜心', reason: '¥5.0 极致良心'}, {name: '清炖萝卜牛腩粥', reason: '¥8.0 温补首选'}],
                avoid: [{name: '草莓炒芹菜', reason: '黑暗料理界新星'}, {name: '超咸麻婆豆腐', reason: '打死卖盐的'}]
            }
        };

        // --- 真实数据接入：用后端数据覆盖 mock DB（字段映射回原结构，下游 UI 零改动） ---
        function parseNutrition(yingyang) {
            const text = yingyang || '';
            const cal = text.match(/热量\s*(\d+)\s*kcal/);
            const protein = text.match(/蛋白质\s*(\d+)\s*g/);
            return { cal: cal ? Number(cal[1]) : 0, protein: protein ? Number(protein[1]) : 0 };
        }

        async function loadRemoteData() {
            // 菜品
            const dishRes = await api('GET', '/dishes');
            if (dishRes.status === 200 && dishRes.json.data) {
                const onSale = dishRes.json.data.filter(d => d.shangjia !== '否');
                if (onSale.length > 0) {
                    DB.menu = onSale.map(d => {
                        const n = parseNutrition(d.yingyang);
                        return {
                            id: d.id,
                            name: d.caipinmingcheng,
                            category: d.caipinfenlei,
                            price: d.jiage,
                            img: (d.tupian && d.tupian.startsWith('http')) ? d.tupian : (d.tupian || 'dish-placeholder.svg'),
                            cal: n.cal,
                            protein: n.protein,
                            tag: d.cailiao ? d.cailiao.split('，')[0] : '',
                            sales: d.yueshuxiao || 0,
                            rating: d.pinfen || 5.0,
                            stock: d.kucun,
                            isNew: (d.yueshuxiao || 0) < 20,
                            overstocked: (d.kucun || 0) > 80,
                            nutritionGoal: '',
                            window: d.caipinfenlei
                        };
                    });
                }
            }
            // 餐厅（后端目前为硬编码演示数据，做字段映射）
            const restRes = await api('GET', '/restaurants');
            if (restRes.status === 200 && Array.isArray(restRes.json.data) && restRes.json.data.length > 0) {
                DB.restaurants = restRes.json.data.map((r, i) => ({
                    id: r.id ?? i + 1,
                    name: r.name,
                    queues: r.queueCount ?? r.queues ?? 0,
                    waitTime: r.queueTime ?? r.waitTime ?? 0,
                    seats: r.availableSeats ?? r.seats ?? 0,
                    totalSeats: r.totalSeats ?? 0,
                    status: (r.queueTime ?? 0) > 20 ? 'warning' : ((r.queueCount ?? 0) === 0 ? 'empty' : 'good')
                }));
            }
        }

        // 🚨 补充缺失的核心选项数组（用于 AI 营养师多步向导） 🚨
        const GOAL_OPTIONS = ['💪 减脂增肌', '🥬 低碳水', '🥚 高蛋白质', '😋 吃饱吃好', '🌶️ 无辣不欢', '🍵 清淡养生', '✨ 抗糖抗老', '💰 性价比最高'];
        const TASTE_OPTIONS = ['辛辣', '油腻', '清淡', '过甜', '重咸', '生冷', '酸涩'];
        const INGRED_OPTIONS = ['香菜', '大蒜', '洋葱', '青椒', '苦瓜', '折耳根', '内脏', '肥肉', '洋白菜'];
        const INTEREST_TAGS = ['🎮 游戏', '📺 二次元动漫', '🏀 体育竞技', '🎵 流行音乐', '🌟 娱乐明星', '📚 沉浸阅读', '💄 美妆穿搭', '🎬 热门影视'];

        // 🚨 补充并修复完整的全局 State（包含了 nutritionStep 等必需属性） 🚨
        let state = {
            cart: [],
            currentView: 'order', 
            aiOpen: false,
            
            // 营养师专属多步状态配置
            nutritionStep: 'goal', // 确保初始化时是有值的，步骤: goal -> upload -> taste -> ingredient -> loading -> dashboard
            nutriProfile: { goals: [], tastes: [], ingredients: [] },
            
            // 智能点餐塔罗状态
            hasSetPreferences: false,
            selectedTags: [],
            specificInterest: '',
            todayMood: '',
            
            // 小智 AI 状态机属性
            aiContext: 'idle',
            isListening: false
        };

        const appRoot = document.getElementById('app-root');
        const modalRoot = document.getElementById('modal-container');

        // --- 路由系统 ---
        function navigate(view) {
            state.currentView = view;
            document.querySelectorAll('.nav-link').forEach(link => {
                link.style.color = link.dataset.target === view ? '#0071E3' : '#424245';
            });
            if (view === 'orders') startOrderPolling(); else stopOrderPolling();
            render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navigate(e.target.dataset.target);
            });
        });

        function render() {
            appRoot.className = 'pt-24 pb-20 min-h-screen max-w-[1200px] mx-auto px-4 sm:px-6 fade-in';
            if (state.currentView === 'order') renderOrderView();
            else if (state.currentView === 'nutrition') renderNutritionView();
            else if (state.currentView === 'social') renderSocialView();
            else if (state.currentView === 'culture') renderCultureView();
            else if (state.currentView === 'orders') renderOrdersView();
        }

        // ================= 模块1：智能点餐系统 =================
        function renderOrderView() {
            const newDishes = DB.menu.filter(m => m.isNew);
            const normalDishes = DB.menu.filter(m => !m.isNew && !m.overstocked);

            let html = `
                <div class="mb-10">
                    <h1 class="text-4xl font-bold mb-2 tracking-tight">智能点餐</h1>
                    <p class="text-appleLightGray text-lg mb-8">实时避开高峰，锁定专属座位。</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${DB.restaurants.map(r => `
                            <div class="bg-white rounded-[20px] p-6 shadow-apple border border-gray-100 hover:-translate-y-1 transition-transform relative overflow-hidden">
                                <div class="absolute top-0 right-0 w-2 h-full ${r.status === 'warning' ? 'bg-red-500' : 'bg-green-500'}"></div>
                                <h3 class="text-xl font-semibold mb-4">${r.name}</h3>
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-gray-500"><i class="fa-solid fa-users mr-2"></i>排队人数</span>
                                    <span class="font-bold ${r.status === 'warning' ? 'text-red-500' : ''}">${r.queues} 人</span>
                                </div>
                                <div class="flex justify-between items-center mb-4">
                                    <span class="text-gray-500"><i class="fa-regular fa-clock mr-2"></i>预计时长</span>
                                    <span class="font-bold ${r.status === 'warning' ? 'text-red-500 pulse-red rounded-full px-2' : ''}">${r.waitTime} min</span>
                                </div>
                                <button class="w-full bg-gray-100 hover:bg-gray-200 text-appleDark py-2 rounded-xl transition font-medium glass-btn-active" onclick="openSeatSelectionModal('${r.name}')">查看菜单 & 选座</button>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="mb-12 bg-gradient-to-r from-indigo-900 via-purple-800 to-indigo-900 rounded-[24px] p-8 text-white shadow-appleHover cursor-pointer hover:scale-[1.01] transition-transform relative overflow-hidden glass-btn-active" onclick="startSmartRecommendation()">
                    <div class="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                    <div class="relative z-10 flex flex-col md:flex-row justify-between items-center">
                        <div class="mb-4 md:mb-0">
                            <h2 class="text-3xl font-bold mb-2 flex items-center"><i class="fa-solid fa-sparkles text-yellow-300 mr-3"></i> 不知道吃什么？让命运替你决定</h2>
                            <p class="opacity-90 text-sm md:text-base">结合你的灵魂爱好与今日运势，小智为你抽取专属高能美食盲盒！</p>
                        </div>
                        <button class="bg-white/20 backdrop-blur-md border border-white/40 text-white px-8 py-3 rounded-full font-bold">
                            立即抽取
                        </button>
                    </div>
                </div>

                <div class="mb-12">
                    <h2 class="text-2xl font-bold mb-6 flex items-center">✨ 近期上新 <span class="ml-3 text-xs bg-red-100 text-red-500 px-2 py-1 rounded-full font-normal">本周必吃</span></h2>
                    <div class="flex space-x-6 overflow-x-auto pb-6 no-scrollbar snap-x">
                        ${newDishes.map(item => `
                            <div class="min-w-[280px] bg-white rounded-[20px] overflow-hidden shadow-apple border border-gray-100 snap-center shrink-0 group">
                                <div class="h-40 overflow-hidden relative">
                                    <img src="${item.img}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                                    <div class="absolute top-3 left-3 bg-white/90 backdrop-blur text-xs px-2 py-1 rounded-md font-semibold text-appleBlue"><i class="fa-solid fa-certificate"></i> ${item.tag}</div>
                                </div>
                                <div class="p-5">
                                    <h3 class="text-lg font-bold mb-1">${item.name}</h3>
                                    <div class="flex justify-between items-center mt-4">
                                        <span class="text-appleBlue font-bold text-lg">¥${item.price.toFixed(1)}</span>
                                        <button onclick="addToCart(${item.id})" class="bg-gray-100 text-appleDark px-4 py-1.5 rounded-full text-sm font-bold glass-btn-active">添加</button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div>
                    <h2 class="text-2xl font-bold mb-6">人气精选</h2>
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                        ${normalDishes.map(item => `
                            <div class="bg-white rounded-[20px] overflow-hidden shadow-apple border border-gray-100 group">
                                <div class="h-40 overflow-hidden relative">
                                    <img src="${item.img}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                                </div>
                                <div class="p-5">
                                    <h3 class="text-md font-bold mb-1">${item.name}</h3>
                                    <span class="text-xs text-gray-400">评分 ${item.rating}</span>
                                    <div class="flex justify-between items-center mt-3">
                                        <span class="text-appleDark font-bold">¥${item.price.toFixed(1)}</span>
                                        <button onclick="addToCart(${item.id})" class="bg-appleBlue text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md glass-btn-active"><i class="fa-solid fa-plus"></i></button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            appRoot.innerHTML = html;
        }

        // ================= 个性化喜好收集与塔罗牌流 =================
        function startSmartRecommendation() {
            if (!state.hasSetPreferences) {
                renderPreferenceOnboarding();
            } else {
                renderTarotFlow();
            }
        }

        function renderPreferenceOnboarding() {
            let tagsHtml = INTEREST_TAGS.map(tag => `
                <button onclick="toggleInterest(this, '${tag}')" class="interest-tag bg-gray-100 text-gray-600 border border-transparent px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 m-1 glass-btn-active">
                    ${tag}
                </button>
            `).join('');

            modalRoot.innerHTML = `
                <div id="pref-modal" class="fixed inset-0 z-[200] glass-modal flex items-center justify-center fade-in">
                    <div class="bg-white/95 backdrop-blur-xl w-[90%] max-w-lg rounded-[32px] p-8 shadow-2xl border border-white/50 pop-in relative overflow-hidden">
                        <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-purple-500"></div>
                        <button onclick="closeModal()" class="absolute top-6 right-6 text-gray-400 hover:text-gray-800"><i class="fa-solid fa-xmark text-xl"></i></button>
                        
                        <div class="text-center mb-8">
                            <h2 class="text-2xl font-bold mb-2">初次见面，了解一下你？</h2>
                            <p class="text-sm text-gray-500">定制属于你的校园美食推荐基因</p>
                        </div>
                        <div class="mb-6">
                            <h3 class="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">选择你感兴趣的领域 (多选)</h3>
                            <div class="flex flex-wrap justify-center gap-2">${tagsHtml}</div>
                        </div>
                        <div class="mb-8">
                            <h3 class="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">具体说说你最近在沉迷什么？</h3>
                            <input type="text" id="specific-interest" placeholder="例如：黑神话悟空、五月天、排球少年..." class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-appleBlue/50 text-sm transition-all">
                        </div>
                        <button onclick="savePreferencesAndContinue()" class="w-full bg-appleDark text-white py-3.5 rounded-2xl font-bold hover:bg-black transition-colors shadow-lg glass-btn-active">
                            生成我的美食基因 <i class="fa-solid fa-arrow-right ml-2"></i>
                        </button>
                    </div>
                </div>
            `;
        }

        function toggleInterest(btn, tag) {
            btn.classList.toggle('active');
            if (state.selectedTags.includes(tag)) {
                state.selectedTags = state.selectedTags.filter(t => t !== tag);
            } else {
                state.selectedTags.push(tag);
            }
        }

        function savePreferencesAndContinue() {
            const specific = document.getElementById('specific-interest').value.trim();
            if (state.selectedTags.length === 0 && !specific) {
                toast('请至少选择或输入一个你的爱好哦！', 'warning');
                return;
            }
            state.hasSetPreferences = true;
            state.specificInterest = specific || state.selectedTags[0];
            closeModal();
            setTimeout(renderTarotFlow, 300);
        }

        function renderTarotFlow() {
            modalRoot.innerHTML = `
                <div id="tarot-modal" class="fixed inset-0 z-[200] glass-modal flex items-center justify-center fade-in">
                    <div class="bg-[#1a1a24]/95 backdrop-blur-xl w-full h-full md:w-[90%] md:h-[90%] md:max-w-5xl md:rounded-[40px] p-6 md:p-12 shadow-2xl flex flex-col items-center justify-center relative pop-in">
                        <button onclick="closeModal()" class="absolute top-6 right-6 text-white/50 hover:text-white"><i class="fa-solid fa-xmark text-2xl"></i></button>
                        <div id="mood-section" class="text-center transition-all duration-500 w-full max-w-2xl">
                            <h2 class="text-3xl font-bold text-white mb-3">你现在处于什么状态？</h2>
                            <p class="text-white/60 mb-8">小智将根据你的状态，注入塔罗牌的能量。</p>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <button onclick="selectMood('📚 刚上完高数/专业课，大脑已宕机')" class="bg-white/10 hover:bg-white/20 border border-white/20 text-white p-4 rounded-2xl transition glass-btn-active">📚 刚上完专业课，大脑宕机</button>
                                <button onclick="selectMood('🏃‍♂️ 刚运动完，急需能量补充')" class="bg-white/10 hover:bg-white/20 border border-white/20 text-white p-4 rounded-2xl transition glass-btn-active">🏃‍♂️ 刚运动完，急需能量</button>
                                <button onclick="selectMood('🎮 想躺平，只想追我的【${state.specificInterest}】')" class="bg-white/10 hover:bg-white/20 border border-white/20 text-white p-4 rounded-2xl transition glass-btn-active">🎮 想躺平，只想追热爱</button>
                            </div>
                        </div>
                        <div id="tarot-section" class="hidden text-center w-full mt-8">
                            <h2 class="text-2xl font-bold text-yellow-400 mb-8 tracking-widest text-shadow">凭直觉，抽取一张你的今日食运牌</h2>
                            <div class="flex justify-center gap-4 md:gap-8 perspective-1000">
                                ${[0, 1, 2].map(i => `
                                    <div class="flip-card w-28 h-44 md:w-48 md:h-72 glass-btn-active" onclick="flipTarotCard(this)">
                                        <div class="flip-card-inner">
                                            <div class="flip-card-front"><div class="card-pattern"></div><i class="fa-solid fa-star-and-crescent text-white/30 text-3xl md:text-5xl"></i></div>
                                            <div class="flip-card-back bg-gradient-to-br from-yellow-100 to-yellow-300 text-yellow-900 border-4 border-yellow-500">
                                                <i class="fa-solid fa-sun text-4xl md:text-6xl mb-4"></i>
                                                <h3 class="font-bold text-lg md:text-xl">命运之轮</h3>
                                                <p class="text-[10px] md:text-xs mt-2 opacity-80 font-medium">能量流转，惊喜降临</p>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        function selectMood(mood) {
            state.todayMood = mood;
            document.getElementById('mood-section').classList.add('opacity-0', 'scale-95', 'pointer-events-none', 'hidden');
            const tarotSec = document.getElementById('tarot-section');
            tarotSec.classList.remove('hidden');
            setTimeout(() => tarotSec.classList.add('pop-in'), 50);
        }

        function flipTarotCard(cardEl) {
            if (cardEl.classList.contains('flipped')) return;
            cardEl.classList.add('flipped');
            document.querySelectorAll('.flip-card').forEach(c => {
                if (c !== cardEl) c.style.transform = 'scale(0.8) opacity(0.5)';
            });
            const overstockedDishes = DB.menu.filter(m => m.overstocked);
            const targetDish = overstockedDishes[Math.floor(Math.random() * overstockedDishes.length)];
            setTimeout(() => { showTarotResult(targetDish); }, 1200);
        }

        function showTarotResult(dish) {
            const reasoning = `你今天处于「${state.todayMood.split(' ')[1]}」的状态，同时心里挂念着【${state.specificInterest}】。塔罗牌指示你需要特殊能量。食堂的这道隐秘美食，完美契合！`;
            modalRoot.innerHTML = `
                <div class="fixed inset-0 z-[200] glass-modal flex items-center justify-center fade-in">
                    <div class="bg-white w-[90%] max-w-md rounded-[32px] overflow-hidden shadow-2xl pop-in text-center">
                        <div class="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 text-white relative">
                            <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-md"><i class="fa-solid fa-wand-magic-sparkles text-2xl"></i></div>
                            <h2 class="text-2xl font-bold">你的专属食运降临</h2>
                        </div>
                        <div class="p-8">
                            <p class="text-sm text-gray-500 mb-6 leading-relaxed bg-gray-50 p-4 rounded-xl italic">"${reasoning}"</p>
                            <div class="border border-yellow-200 bg-yellow-50 rounded-2xl p-4 mb-6 flex items-center space-x-4 shadow-sm text-left">
                                <img src="${dish.img}" class="w-20 h-20 rounded-xl object-cover">
                                <div><span class="text-xs font-bold text-orange-500 bg-orange-100 px-2 py-1 rounded mb-1 inline-block">天选之菜</span><h3 class="text-lg font-bold text-appleDark">${dish.name}</h3><p class="text-sm font-bold text-appleBlue mt-1">¥${dish.price.toFixed(1)}</p></div>
                            </div>
                            <div class="flex space-x-3">
                                <button onclick="closeModal()" class="flex-1 bg-gray-100 text-gray-600 py-3 rounded-full font-bold transition glass-btn-active">我不信邪</button>
                                <button onclick="addToCart(${dish.id}); closeModal(); toggleAI(); sendAiMessage('我听你的，就吃${dish.name}了！', true); setTimeout(()=>renderAiMsg('聪明人的选择！已加入餐盘！'),500);" class="flex-[2] bg-appleDark text-white py-3 rounded-full font-bold shadow-md glass-btn-active">听天由命加入餐盘</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // ================= 智能选座交互流 =================
        function openSeatSelectionModal(canteenName) {
            let seatsHtml = '';
            for(let i = 0; i < 42; i++) {
                const isOccupied = Math.random() > 0.6;
                if (isOccupied) seatsHtml += `<div class="w-10 h-10 bg-gray-200 rounded-lg m-1 flex items-center justify-center cursor-not-allowed text-gray-400"><i class="fa-solid fa-user text-sm"></i></div>`;
                else seatsHtml += `<div class="w-10 h-10 bg-green-50 border-2 border-green-200 hover:bg-green-400 rounded-lg m-1 flex items-center justify-center cursor-pointer transition-colors duration-200 text-green-500 hover:text-white glass-btn-active" onclick="confirmSeatSelection(this, ${i})"><i class="fa-solid fa-chair text-sm"></i></div>`;
            }
            modalRoot.innerHTML = `
                <div id="seat-modal" class="fixed inset-0 z-[200] glass-modal flex items-center justify-center fade-in">
                    <div class="bg-white w-[90%] max-w-2xl rounded-[32px] p-6 md:p-8 shadow-2xl pop-in relative">
                        <button onclick="closeModal()" class="absolute top-6 right-6 text-gray-400 hover:text-gray-800"><i class="fa-solid fa-xmark text-xl"></i></button>
                        <div class="text-center mb-6">
                            <h2 class="text-2xl font-bold mb-2">${canteenName} - 实时选座</h2>
                            <div class="flex justify-center items-center space-x-6 text-sm text-gray-500">
                                <span class="flex items-center"><div class="w-4 h-4 bg-green-50 border-2 border-green-200 rounded mr-2"></div> 可选</span>
                                <span class="flex items-center"><div class="w-4 h-4 bg-gray-200 rounded mr-2"></div> 已占</span>
                                <span class="flex items-center"><div class="w-4 h-4 bg-appleBlue rounded mr-2"></div> 当前选择</span>
                            </div>
                        </div>
                        <div class="bg-gray-50 rounded-[20px] p-6 border border-gray-100 shadow-inner">
                            <div class="flex justify-center mb-6"><div class="w-1/2 h-6 bg-gray-300 rounded-full text-center text-xs text-gray-600 font-bold leading-6">取餐 / 打饭窗口</div></div>
                            <div class="flex flex-wrap justify-center content-start max-h-[40vh] overflow-y-auto no-scrollbar">${seatsHtml}</div>
                        </div>
                    </div>
                </div>
            `;
        }

        function confirmSeatSelection(element, seatId) {
            document.querySelectorAll('#seat-modal .bg-appleBlue').forEach(el => {
                el.className = "w-10 h-10 bg-green-50 border-2 border-green-200 hover:bg-green-400 rounded-lg m-1 flex items-center justify-center cursor-pointer transition-colors duration-200 text-green-500 hover:text-white glass-btn-active";
                el.innerHTML = '<i class="fa-solid fa-chair text-sm"></i>';
            });
            element.className = "w-10 h-10 bg-appleBlue rounded-lg m-1 flex items-center justify-center cursor-pointer transition text-white shadow-md transform scale-110 glass-btn-active";
            element.innerHTML = '<i class="fa-solid fa-check"></i>';
            
            setTimeout(() => {
                closeModal();
                if(!state.aiOpen) toggleAI();
                renderAiMsg(`✅ <b>选座成功！</b><br>小智已为您锁定 <b>${seatId + 1}号座位</b>。<br>记得在15分钟内前往就座，享用美食哦！`);
            }, 600);
        }

        function closeModal() { modalRoot.innerHTML = ''; }

         // ================= 模块2：AI 营养师 (全新多步骤逻辑) =================
        function renderNutritionView() {
            let html = '';
            const step = state.nutritionStep; // 此处已通过修补 state 获得正确的值 'goal'

            if (step === 'goal') {
                html = `
                    <div class="max-w-3xl mx-auto pt-10 fade-in text-center">
                        <div class="w-16 h-16 bg-appleBlue/10 text-appleBlue rounded-full flex items-center justify-center text-3xl mx-auto mb-6"><i class="fa-solid fa-bullseye"></i></div>
                        <h1 class="text-4xl font-bold mb-3 tracking-tight">开启专属营养之旅</h1>
                        <p class="text-appleLightGray mb-10">首先，请告诉小智您近期的核心饮食目标（可多选）</p>
                        <div class="flex flex-wrap justify-center gap-3 mb-12">
                            ${GOAL_OPTIONS.map(g => `
                                <button onclick="toggleNutriArr(this, 'goals', '${g}')" class="option-tag bg-white border border-gray-200 text-gray-600 px-6 py-3 rounded-full font-bold shadow-sm transition-all duration-300 hover:shadow-md glass-btn-active ${state.nutriProfile.goals.includes(g) ? 'active' : ''}">
                                    ${g}
                                </button>
                            `).join('')}
                        </div>
                        <button onclick="nextNutriStep('upload')" class="bg-appleDark text-white px-12 py-3 rounded-full font-bold hover:bg-black transition shadow-lg glass-btn-active">下一步</button>
                    </div>`;
            } 
            else if (step === 'upload') {
                html = `
                    <div class="max-w-4xl mx-auto pt-10 slide-up text-center">
                        <div class="flex items-center justify-center space-x-3 mb-8 bg-white w-fit mx-auto px-6 py-2 rounded-full shadow-sm border border-gray-100">
                            <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80" class="w-8 h-8 rounded-full">
                            <span class="font-bold text-sm text-appleDark">当前用户：种菜闪餐小队长</span>
                        </div>
                        <h1 class="text-3xl font-bold mb-3">记录过去14天的饮食轨迹</h1>
                        <p class="text-appleLightGray mb-10">为了精准分析，请提供您近期的就餐数据。</p>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                            <div onclick="nextNutriStep('taste')" class="bg-white/60 backdrop-blur-xl border-2 border-dashed border-appleBlue/30 hover:border-appleBlue/60 rounded-[32px] p-12 shadow-apple transition-all duration-300 cursor-pointer group glass-btn-active">
                                <div class="w-16 h-16 bg-blue-50 text-appleBlue rounded-full flex items-center justify-center text-2xl mx-auto mb-4 group-hover:scale-110 transition"><i class="fa-solid fa-camera"></i></div>
                                <h3 class="text-xl font-bold mb-2">智能拍照识别</h3>
                                <p class="text-sm text-gray-500">上传账单截图或餐盘照片</p>
                            </div>
                            <div onclick="nextNutriStep('taste')" class="bg-white/60 backdrop-blur-xl border-2 border-dashed border-green-500/30 hover:border-green-500/60 rounded-[32px] p-12 shadow-apple transition-all duration-300 cursor-pointer group glass-btn-active">
                                <div class="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 group-hover:scale-110 transition"><i class="fa-solid fa-pen-nib"></i></div>
                                <h3 class="text-xl font-bold mb-2">手动录入数据</h3>
                                <p class="text-sm text-gray-500">输入菜品名称与预估克重</p>
                            </div>
                        </div>
                    </div>`;
            }
            else if (step === 'taste' || step === 'ingredient') {
                const isTaste = step === 'taste';
                const title = isTaste ? '避雷指南 (1/2)' : '避雷指南 (2/2)';
                const sub = isTaste ? '有哪些您绝对不想碰的口味？' : '哪些特定食材是您的“一生之敌”？';
                const arrName = isTaste ? 'tastes' : 'ingredients';
                const opts = isTaste ? TASTE_OPTIONS : INGRED_OPTIONS;
                
                html = `
                    <div class="max-w-3xl mx-auto pt-10 pop-in text-center">
                        <span class="text-appleBlue font-bold tracking-widest uppercase text-xs">${title}</span>
                        <h1 class="text-4xl font-bold mt-2 mb-3 tracking-tight">${sub}</h1>
                        <p class="text-appleLightGray mb-10">小智会牢记您的喜好，永不推荐踩雷菜品。</p>
                        <div class="flex flex-wrap justify-center gap-3 mb-6">
                            ${opts.map(o => `
                                <button onclick="toggleNutriArr(this, '${arrName}', '${o}')" class="option-tag bg-white border border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all duration-300 hover:shadow-md glass-btn-active ${state.nutriProfile[arrName].includes(o) ? 'active' : ''}">
                                    ${o}
                                </button>
                            `).join('')}
                        </div>
                        <input type="text" placeholder="没有找到？手动输入 (回车添加)" class="w-full max-w-md bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-appleBlue/50 text-sm mb-12 shadow-sm">
                        <br>
                        <button onclick="nextNutriStep('${isTaste ? 'ingredient' : 'loading'}')" class="bg-appleDark text-white px-12 py-3 rounded-full font-bold hover:bg-black transition shadow-lg glass-btn-active">
                            ${isTaste ? '下一步' : '开始生成个性化画像'}
                        </button>
                    </div>`;
            }
            else if (step === 'loading') {
                html = `
                    <div class="flex flex-col items-center justify-center min-h-[60vh] fade-in text-center">
                        <div class="w-20 h-20 border-4 border-gray-200 border-t-appleBlue border-solid rounded-full animate-spin mb-6 mx-auto"></div>
                        <h2 class="text-2xl font-bold text-appleDark mb-2">小智营养师正在进行AI深度分析...</h2>
                        <p class="text-gray-500 animate-pulse">匹配食堂菜谱 • 规避忌口食材 • 生成个性化配餐</p>
                    </div>`;
                
                // 向后端真实 API 发送营养分析请求
                fetch('http://localhost:5000/api/ai/analyze-nutrition', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        goals: state.nutriProfile.goals,
                        tastes: state.nutriProfile.tastes,
                        ingredients: state.nutriProfile.ingredients
                    })
                })
                .then(res => res.json())
                .then(res => {
                    state.nutritionReport = res.report || '# 暂无报告数据';
                    nextNutriStep('dashboard');
                })
                .catch(err => {
                    console.error(err);
                    state.nutritionReport = `# ❌ AI 营养分析加载失败\n\n小智暂时无法与后勤膳食数据库建立连接。请确保后端服务启动且地址可达 (canteen/startup.bat)。`;
                    nextNutriStep('dashboard');
                });
            }
            else if (step === 'dashboard') {
                const reportContent = state.nutritionReport ? marked.parse(state.nutritionReport) : '报告加载失败，请重试';
                html = `
                    <div class="fade-in pb-10">
                        <div class="flex justify-between items-end mb-8">
                            <div>
                                <h1 class="text-3xl font-bold tracking-tight">个性化营养分析报告</h1>
                                <p class="text-gray-500 mt-1">小智营养师大模型根据您的身体数据与就餐偏好深度定制。</p>
                            </div>
                            <button onclick="nextNutriStep('goal')" class="bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition glass-btn-active"><i class="fa-solid fa-pen mr-1"></i> 重新定制偏好</button>
                        </div>
                        
                        <div class="bg-white/80 backdrop-blur-xl rounded-[32px] p-8 shadow-apple border border-white/50 prose prose-slate max-w-none text-appleText leading-relaxed">
                            ${reportContent}
                        </div>
                    </div>`;
            }
            appRoot.innerHTML = html;
        }

        // 🚨 必须定义在全局或脚本块根部的辅助函数 🚨
        function toggleNutriArr(btn, arrName, val) {
            btn.classList.toggle('active');
            let arr = state.nutriProfile[arrName];
            if (arr.includes(val)) state.nutriProfile[arrName] = arr.filter(x => x !== val);
            else arr.push(val);
        }
        function nextNutriStep(nextStep) {
            state.nutritionStep = nextStep;
            renderNutritionView();
        }

        // ================= 模块3：食话广场 (Masonry & 榜单) =================
        function renderSocialView() {
            let html = `
                <div class="fade-in pb-10 pt-4">
                    <div class="text-center mb-10">
                        <h1 class="text-4xl font-bold tracking-tight mb-2">食话广场</h1>
                        <p class="text-appleLightGray">真实评价，告别踩雷，吃得明白。</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        <div class="bg-gradient-to-br from-orange-50 to-red-50 rounded-[24px] p-6 border border-orange-100 shadow-sm hover:shadow-md transition">
                            <h3 class="text-xl font-bold text-orange-600 mb-4 flex items-center"><i class="fa-solid fa-fire mr-2"></i> 封神推荐榜</h3>
                            <div class="space-y-3">
                                ${DB.leaderboards.top.map((item, i) => `
                                    <div class="flex items-center bg-white/60 p-3 rounded-xl">
                                        <span class="text-xl font-bold italic text-orange-300 mr-3 w-4">${i+1}</span>
                                        <div>
                                            <p class="font-bold text-sm text-appleDark">${item.name}</p>
                                            <p class="text-xs text-gray-500">${item.reason}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-[24px] p-6 border border-green-100 shadow-sm hover:shadow-md transition">
                            <h3 class="text-xl font-bold text-green-600 mb-4 flex items-center"><i class="fa-solid fa-piggy-bank mr-2"></i> 极致性价比榜</h3>
                            <div class="space-y-3">
                                ${DB.leaderboards.cheap.map((item, i) => `
                                    <div class="flex items-center bg-white/60 p-3 rounded-xl">
                                        <span class="text-xl font-bold italic text-green-300 mr-3 w-4">${i+1}</span>
                                        <div>
                                            <p class="font-bold text-sm text-appleDark">${item.name}</p>
                                            <p class="text-xs text-gray-500">${item.reason}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="bg-gradient-to-br from-gray-50 to-slate-100 rounded-[24px] p-6 border border-gray-200 shadow-sm hover:shadow-md transition">
                            <h3 class="text-xl font-bold text-gray-600 mb-4 flex items-center"><i class="fa-solid fa-bolt mr-2"></i> 踩雷避坑榜</h3>
                            <div class="space-y-3">
                                ${DB.leaderboards.avoid.map((item, i) => `
                                    <div class="flex items-center bg-white/60 p-3 rounded-xl">
                                        <span class="text-xl font-bold italic text-gray-400 mr-3 w-4">${i+1}</span>
                                        <div>
                                            <p class="font-bold text-sm text-appleDark">${item.name}</p>
                                            <p class="text-xs text-gray-500">${item.reason}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <h2 class="text-2xl font-bold mb-6">最新动态</h2>
                    <div class="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                        ${DB.social.map(post => `
                            <div class="break-inside-avoid bg-white rounded-[24px] p-5 shadow-apple border border-gray-100">
                                <div class="flex items-center space-x-3 mb-3">
                                    <img src="${post.avatar}" class="w-10 h-10 rounded-full object-cover">
                                    <div>
                                        <p class="font-bold text-sm">${post.user}</p>
                                        <p class="text-xs text-gray-400">${post.time}</p>
                                    </div>
                                    <div class="ml-auto text-yellow-400 text-xs">
                                        ${'<i class="fa-solid fa-star"></i>'.repeat(post.rating)}${'<i class="fa-regular fa-star"></i>'.repeat(5-post.rating)}
                                    </div>
                                </div>
                                <p class="text-sm text-appleText mb-3 leading-relaxed">${post.content}</p>
                                ${post.img ? `<img src="${post.img}" class="w-full rounded-[16px] mb-3 object-cover max-h-48">` : ''}
                                <div class="flex justify-end space-x-4 text-gray-400 text-sm">
                                    <button class="hover:text-appleBlue transition glass-btn-active"><i class="fa-regular fa-comment"></i> 评论</button>
                                    <button class="hover:text-red-500 transition glass-btn-active" onclick="this.innerHTML='<i class=\\'fa-solid fa-heart text-red-500\\'></i> ' + (${post.likes} + 1)"><i class="fa-regular fa-heart"></i> ${post.likes}</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            appRoot.innerHTML = html;
        }

        // ================= 模块4：文创活动 (Dynamic Banner & Co-creation) =================
        function renderCultureView() {
            let html = `
                <div class="fade-in pb-10 pt-4">
                    <div class="w-full h-64 rounded-[32px] bg-animated-gradient mb-10 relative overflow-hidden shadow-appleHover flex items-center justify-center text-center px-6">
                        <div class="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>
                        <div class="relative z-10 text-white">
                            <span class="bg-white/20 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase backdrop-blur-md mb-4 inline-block border border-white/30">CUFE · 春季嘉年华</span>
                            <h1 class="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">校园寻味之旅</h1>
                            <p class="text-lg opacity-90 drop-shadow-md">参与共创设计，赢取限量周边与免费霸王餐</p>
                        </div>
                    </div>

                    <h2 class="text-2xl font-bold mb-6">周边与联名特供</h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        ${DB.culture.map(item => `
                            <div class="bg-white rounded-[24px] overflow-hidden shadow-apple border border-gray-100 flex flex-col group">
                                <div class="h-48 overflow-hidden relative bg-gray-50 flex items-center justify-center p-4">
                                    <img src="${item.img}" class="max-w-full max-h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500 shadow-sm">
                                    <div class="absolute top-3 left-3 ${item.type === 'food' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'} text-xs px-2 py-1 rounded-md font-bold">
                                        ${item.type === 'food' ? '🍜 特供美食' : '🛍️ 文创周边'}
                                    </div>
                                </div>
                                <div class="p-5 flex flex-col flex-1">
                                    <h3 class="text-lg font-bold mb-2">${item.name}</h3>
                                    <p class="text-sm text-gray-500 mb-4 line-clamp-2">${item.desc}</p>
                                    <div class="mt-auto flex justify-between items-center">
                                        <span class="text-appleDark font-bold text-lg">¥${item.price.toFixed(1)}</span>
                                        <button onclick="toast('已加入购物车 (演示效果)', 'success');" class="bg-appleDark text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-black transition glass-btn-active">
                                            兑换/购买
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="mt-12 bg-white/60 backdrop-blur-xl border border-gray-200 rounded-[32px] p-8 text-center shadow-sm">
                        <div class="w-16 h-16 bg-yellow-100 text-yellow-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                            <i class="fa-solid fa-lightbulb"></i>
                        </div>
                        <h2 class="text-2xl font-bold mb-2">你有更好的点子？</h2>
                        <p class="text-gray-500 mb-6">提交你的菜品创意或设计图，得票Top3下月直接上架食堂！</p>
                        <button class="bg-appleBlue text-white px-8 py-3 rounded-full font-bold hover:bg-blue-600 transition shadow-appleHover glass-btn-active">
                            立即发起共创提案
                        </button>
                    </div>
                </div>
            `;
            appRoot.innerHTML = html;
        }

        // ================= 购物车与AI管家系统 =================
        // --- 购物车：localStorage 持久化 + 同款合并 ---
        function loadCart() {
            try { state.cart = JSON.parse(localStorage.getItem('zx_cart')) || []; }
            catch { state.cart = []; }
        }

        function saveCart() {
            localStorage.setItem('zx_cart', JSON.stringify(state.cart));
        }

        function addToCart(id) {
            const dish = DB.menu.find(m => m.id === id);
            if (!dish) return;
            if (dish.stock !== undefined && dish.stock <= 0) {
                return toast(`「${dish.name}」今日已售罄`, 'warning');
            }
            const existing = state.cart.find(i => i.id === id);
            if (existing) existing.qty += 1;
            else state.cart.push({ id: dish.id, name: dish.name, price: dish.price, img: dish.img, qty: 1 });
            saveCart();
            updateCartUI();
            toast(`${dish.name} 已加入餐盘`, 'success');
        }

        function removeFromCart(id) {
            state.cart = state.cart.filter(i => i.id !== id);
            saveCart();
            updateCartUI();
        }

        function updateCartUI() {
            const drawer = document.getElementById('cart-items');
            const totalEl = document.getElementById('cart-total');
            const badge = document.getElementById('cart-badge');
            
            let total = 0, qtyTotal = 0;
            drawer.innerHTML = '';
            
            if (state.cart.length === 0) {
                drawer.innerHTML = '<div class="text-center text-gray-400 mt-10"><i class="fa-solid fa-basket-shopping text-4xl mb-4"></i><p>餐盘空空如也~</p></div>';
            } else {
                state.cart.forEach(item => {
                    total += item.price * item.qty;
                    qtyTotal += item.qty;
                    drawer.innerHTML += `
                        <div class="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                            <div class="flex items-center space-x-3">
                                <img src="${item.img}" class="w-12 h-12 rounded-lg object-cover">
                                <div>
                                    <p class="font-semibold text-sm">${item.name}</p>
                                    <p class="text-appleBlue text-sm font-bold">¥${item.price.toFixed(1)}</p>
                                </div>
                            </div>
                            <div class="flex items-center space-x-3">
                                <span class="text-sm font-medium">x${item.qty}</span>
                                <button onclick="removeFromCart(${item.id})" class="text-red-400 hover:text-red-600 glass-btn-active"><i class="fa-regular fa-trash-can"></i></button>
                            </div>
                        </div>
                    `;
                });
            }
            totalEl.innerText = `¥${total.toFixed(2)}`;
            qtyTotal > 0 ? (badge.innerText = qtyTotal, badge.classList.remove('hidden')) : badge.classList.add('hidden');
        }

        function toggleCart() {
            document.getElementById('cart-drawer').classList.toggle('translate-x-full');
        }

        // ================= 结算链路：确认 → 收银台 → 支付 → 取餐码 =================
        function cartTotal() {
            return state.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
        }

        function simulateCheckout() {
            if (state.cart.length === 0) return toast('请先添加菜品！', 'warning');
            if (!requireLogin()) return;
            toggleCart();
            const user = currentUser();
            const total = cartTotal();
            modalRoot.innerHTML = `
                <div class="fixed inset-0 z-[100] flex items-center justify-center glass-modal" onclick="if(event.target===this)closeModal()">
                    <div class="bg-white rounded-[28px] p-8 w-[92%] max-w-[480px] shadow-appleHover slide-up max-h-[85vh] overflow-y-auto">
                        <h2 class="text-2xl font-bold mb-1">确认订单</h2>
                        <p class="text-appleLightGray text-sm mb-6">核对菜品与取餐信息</p>
                        <div class="space-y-3 mb-5">
                            ${state.cart.map(i => `
                                <div class="flex justify-between items-center bg-appleGray rounded-xl p-3">
                                    <div class="flex items-center space-x-3">
                                        <img src="${i.img}" class="w-10 h-10 rounded-lg object-cover" onerror="this.src='dish-placeholder.svg'">
                                        <span class="font-medium text-sm">${i.name} <span class="text-appleLightGray">x${i.qty}</span></span>
                                    </div>
                                    <span class="font-bold text-sm">¥${(i.price * i.qty).toFixed(2)}</span>
                                </div>`).join('')}
                        </div>
                        <div class="mb-4">
                            <label class="text-sm text-appleLightGray block mb-2">取餐食堂</label>
                            <select id="checkout-address" class="w-full bg-appleGray rounded-xl px-4 py-3 outline-none text-sm">
                                ${DB.restaurants.map(r => `<option value="${r.name}">${r.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="mb-6">
                            <label class="text-sm text-appleLightGray block mb-2">备注（口味偏好等）</label>
                            <input id="checkout-remark" placeholder="少辣 / 不要香菜…" class="w-full bg-appleGray rounded-xl px-4 py-3 outline-none text-sm">
                        </div>
                        <div class="flex justify-between items-center mb-6">
                            <span class="text-appleLightGray text-sm">账户余额 <b class="text-appleDark">¥${Number(user.jine).toFixed(2)}</b></span>
                            <span class="text-xl font-bold">合计 <span class="text-appleBlue">¥${total.toFixed(2)}</span></span>
                        </div>
                        <button onclick="confirmOrder()" class="w-full bg-appleBlue text-white py-3.5 rounded-full font-bold hover:opacity-90 transition glass-btn-active">去支付</button>
                    </div>
                </div>`;
        }

        async function confirmOrder() {
            const items = state.cart.map(i => ({ dishId: i.id, quantity: i.qty }));
            const address = document.getElementById('checkout-address').value;
            const remark = document.getElementById('checkout-remark').value.trim();
            const user = currentUser();
            const btn = document.querySelector('#modal-container button[onclick="confirmOrder()"]');
            if (btn) { btn.disabled = true; btn.innerText = '下单中…'; }

            const { status, json } = await api('POST', '/orders', {
                items, address, remark, phone: user.lianxifangshi || ''
            });
            if (status !== 200) {
                if (btn) { btn.disabled = false; btn.innerText = '去支付'; }
                return toast(json.message || '下单失败', 'error');
            }
            openCashier(json.data.orderid, json.data.totalPrice);
        }

        function openCashier(orderid, totalPrice) {
            const user = currentUser();
            const enough = Number(user.jine) >= totalPrice;
            modalRoot.innerHTML = `
                <div class="fixed inset-0 z-[100] flex items-center justify-center glass-modal">
                    <div class="bg-white rounded-[28px] p-8 w-[92%] max-w-[400px] shadow-appleHover slide-up text-center">
                        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-appleGray flex items-center justify-center text-3xl">🍚</div>
                        <p class="text-appleLightGray text-sm mb-1">校园卡余额支付</p>
                        <p class="text-4xl font-bold mb-1">¥${totalPrice.toFixed(2)}</p>
                        <p class="text-sm mb-6 ${enough ? 'text-appleLightGray' : 'text-red-500 font-medium'}">
                            当前余额 ¥${Number(user.jine).toFixed(2)}${enough ? '' : '（余额不足）'}
                        </p>
                        <button id="pay-btn" onclick="payOrder('${orderid}')" ${enough ? '' : 'disabled'}
                            class="w-full ${enough ? 'bg-appleBlue' : 'bg-gray-300 cursor-not-allowed'} text-white py-3.5 rounded-full font-bold transition glass-btn-active">
                            确认支付
                        </button>
                        <button onclick="closeModal()" class="w-full text-appleLightGray text-sm mt-4 hover:text-appleDark transition">暂不支付（订单保留为未支付）</button>
                    </div>
                </div>`;
        }

        async function payOrder(orderid) {
            const btn = document.getElementById('pay-btn');
            if (btn) { btn.disabled = true; btn.innerText = '支付中…'; }
            const { status, json } = await api('POST', `/orders/${orderid}/pay`);
            if (status !== 200) {
                if (btn) { btn.disabled = false; btn.innerText = '确认支付'; }
                return toast(json.message || '支付失败', 'error');
            }
            // 更新本地余额
            const user = currentUser();
            user.jine = json.data.balance;
            setSession(getToken(), user);
            // 清空购物车
            state.cart = [];
            saveCart();
            updateCartUI();
            renderUserEntry();
            showPickupCode(json.data.pickupCode);
        }

        function showPickupCode(pickupCode) {
            modalRoot.innerHTML = `
                <div class="fixed inset-0 z-[100] flex items-center justify-center glass-modal">
                    <div class="bg-white rounded-[28px] p-10 w-[92%] max-w-[400px] shadow-appleHover slide-up text-center">
                        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
                            <i class="fa-solid fa-check text-3xl text-green-500"></i>
                        </div>
                        <h2 class="text-2xl font-bold mb-1">支付成功</h2>
                        <p class="text-appleLightGray text-sm mb-6">取餐时请向档口出示取餐码</p>
                        <div class="bg-appleGray rounded-2xl py-6 mb-6">
                            <span class="text-6xl font-black tracking-[0.2em] text-appleDark">${pickupCode}</span>
                        </div>
                        <button onclick="closeModal(); navigate('orders')" class="w-full bg-appleBlue text-white py-3.5 rounded-full font-bold hover:opacity-90 transition glass-btn-active">查看订单进度</button>
                    </div>
                </div>`;
        }

        // ================= 我的订单：状态时间线 + 3 秒轮询 =================
        let orderPollTimer = null;

        function startOrderPolling() {
            stopOrderPolling();
            orderPollTimer = setInterval(() => {
                if (state.currentView === 'orders') renderOrdersView();
                else stopOrderPolling();
            }, 3000);
        }

        function stopOrderPolling() {
            if (orderPollTimer) { clearInterval(orderPollTimer); orderPollTimer = null; }
        }

        const ORDER_FLOW = ['已支付', '制作中', '待取餐', '已完成'];

        async function renderOrdersView() {
            if (!getToken()) {
                appRoot.innerHTML = `
                    <div class="text-center py-24 fade-in">
                        <div class="text-5xl mb-4">🔐</div>
                        <p class="text-appleLightGray mb-6">登录后即可查看你的订单</p>
                        <button onclick="openLoginModal()" class="bg-appleBlue text-white px-8 py-3 rounded-full font-bold glass-btn-active">去登录</button>
                    </div>`;
                return;
            }

            const { status, json } = await api('GET', `/orders/user/${currentUser().id}`);
            if (status !== 200) {
                appRoot.innerHTML = '<div class="text-center py-24 text-appleLightGray">订单加载失败，请稍后重试</div>';
                return;
            }
            if (state.currentView !== 'orders') return;

            // 按 orderid 分组（订单表一行一菜品）
            const groups = {};
            for (const row of json.data) {
                if (!groups[row.orderid]) groups[row.orderid] = { orderid: row.orderid, status: row.status, addtime: row.addtime, pickupCode: row.pickup_code, items: [], total: 0 };
                groups[row.orderid].items.push({ name: row.caipinmingcheng, qty: row.buyshu, img: row.tupian });
                groups[row.orderid].total += row.total;
            }
            const orders = Object.values(groups);

            const stepIndex = s => ORDER_FLOW.indexOf(s);

            appRoot.innerHTML = `
                <div class="mb-8 flex items-end justify-between">
                    <div>
                        <h1 class="text-4xl font-bold tracking-tight">我的订单</h1>
                        <p class="text-appleLightGray mt-1">状态每 3 秒自动刷新，餐好立即可见</p>
                    </div>
                    <span class="text-sm text-appleLightGray">${orders.length} 笔订单</span>
                </div>
                ${orders.length === 0 ? `
                    <div class="text-center py-24 fade-in">
                        <div class="text-5xl mb-4">🍽️</div>
                        <p class="text-appleLightGray mb-6">还没有订单，去点一份心仪的美食吧</p>
                        <button onclick="navigate('order')" class="bg-appleBlue text-white px-8 py-3 rounded-full font-bold glass-btn-active">去点餐</button>
                    </div>` : orders.map(o => `
                    <div class="bg-white rounded-[24px] p-6 shadow-apple border border-gray-100 mb-5 fade-in">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <span class="text-xs text-appleLightGray">订单号 ${o.orderid.slice(-8)} · ${fmtTime(o.addtime)}</span>
                                <div class="mt-2 space-y-1">
                                    ${o.items.map(i => `<p class="text-sm font-medium">• ${i.name} <span class="text-appleLightGray">x${i.qty}</span></p>`).join('')}
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="font-bold text-lg">¥${o.total.toFixed(2)}</p>
                                ${o.status === '待取餐' && o.pickupCode ? `
                                    <div class="mt-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 animate-pulse">
                                        <span class="text-xs text-yellow-700 block">取餐码</span>
                                        <span class="text-2xl font-black tracking-widest text-yellow-700">${o.pickupCode}</span>
                                    </div>` : ''}
                            </div>
                        </div>
                        ${ORDER_FLOW.includes(o.status) ? `
                        <div class="flex items-center mt-4">
                            ${ORDER_FLOW.map((s, idx) => `
                                <div class="flex items-center ${idx < ORDER_FLOW.length - 1 ? 'flex-1' : ''}">
                                    <div class="flex flex-col items-center">
                                        <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                                            ${idx <= stepIndex(o.status) ? (o.status === '待取餐' && idx === stepIndex(o.status) ? 'bg-yellow-400 text-white animate-pulse' : 'bg-appleBlue text-white') : 'bg-gray-200 text-gray-400'}">
                                            ${idx < stepIndex(o.status) ? '✓' : idx + 1}
                                        </div>
                                        <span class="text-[11px] mt-1 ${idx <= stepIndex(o.status) ? 'text-appleDark font-medium' : 'text-gray-400'}">${s}</span>
                                    </div>
                                    ${idx < ORDER_FLOW.length - 1 ? `<div class="flex-1 h-0.5 mx-2 ${idx < stepIndex(o.status) ? 'bg-appleBlue' : 'bg-gray-200'}"></div>` : ''}
                                </div>`).join('')}
                        </div>` : `<div class="mt-4 flex items-center justify-between">
                            <p class="text-sm font-medium ${o.status === '已取消' || o.status === '已退款' ? 'text-red-500' : 'text-appleLightGray'}">当前状态：${o.status}</p>
                            ${o.status === '未支付' ? `<button onclick="openCashier('${o.orderid}', ${o.total})" class="bg-appleBlue text-white text-sm px-5 py-2 rounded-full font-bold glass-btn-active">去支付</button>` : ''}
                        </div>`}
                    </div>`).join('')}
            `;
        }

        // ================= AI 对话框交互 =================
        function toggleAI() {
            const panel = document.getElementById('ai-panel');
            state.aiOpen = !state.aiOpen;
            if (state.aiOpen) panel.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
            else panel.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
        }

        function handleAiInput() {
            const text = document.getElementById('ai-input').value.trim();
            if (!text) return;
            sendAiMessage(text);
            document.getElementById('ai-input').value = '';
        }
        
        function sendAiMessage(text, silent = false) {
            const messagesDiv = document.getElementById('ai-messages');
            if (!silent) {
                messagesDiv.innerHTML += `<div class="flex items-start justify-end space-x-2 mt-4 slide-up"><div class="bg-appleBlue text-white p-3 rounded-2xl rounded-tr-none shadow-sm text-sm">${text}</div></div>`;
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
            
            setTimeout(() => {
                // 1. 优先捕获上下文状态机逻辑
                if (state.aiContext === 'awaiting_taste') {
                    if (text.includes("清淡") || text.includes("爽口") || text.includes("素") || text.includes("绿")) {
                        executeAiTasteFilter('清淡爽口', true);
                        return;
                    } else if (text.includes("浓郁") || text.includes("鲜香") || text.includes("肉") || text.includes("重")) {
                        executeAiTasteFilter('浓郁鲜香', true);
                        return;
                    } else if (text.includes("酸甜") || text.includes("开胃") || text.includes("水果") || text.includes("莓")) {
                        executeAiTasteFilter('酸甜开胃', true);
                        return;
                    } else if (text.includes("取消") || text.includes("退出") || text.includes("不要")) {
                        state.aiContext = 'idle';
                        renderAiMsg("好的同学，小智已为您退出了点餐推荐模式。有什么其他想聊的吗？😊");
                        return;
                    } else {
                        renderAiMsg(`💡 同学，小智正等待您的口味偏好呢。<br><br>您更偏向于品尝哪种口味呢？🌱 <b>清淡爽口</b> / 🍛 <b>浓郁鲜香</b> / 🍓 <b>酸甜开胃</b>？可以直接告诉我，或者输入“取消”退出哦！`);
                        return;
                    }
                }
                
                if (state.aiContext === 'awaiting_checkout') {
                    if (text.includes("取消") || text.includes("退出") || text.includes("不要")) {
                        state.aiContext = 'idle';
                        renderAiMsg("好的同学，已为您取消本次点餐推荐。有什么需要随时唤醒小智哦！🎯");
                        return;
                    }
                    
                    // 智能提取和匹配菜单中的菜品
                    let matchedDish = null;
                    for (const d of DB.menu) {
                        if (text.includes(d.name) || (d.name.length > 2 && text.includes(d.name.substring(1, d.name.length - 1)))) {
                            matchedDish = d;
                            break;
                        }
                    }
                    
                    // 模糊匹配
                    if (!matchedDish) {
                        if (text.includes("羊肉") || text.includes("孜然")) matchedDish = DB.menu.find(d => d.id === 106);
                        else if (text.includes("菜心") || text.includes("白灼")) matchedDish = DB.menu.find(d => d.id === 107);
                        else if (text.includes("橙汁") || text.includes("饮料") || text.includes("果汁")) matchedDish = DB.menu.find(d => d.id === 108);
                        else if (text.includes("沙拉") || text.includes("鸡肉")) matchedDish = DB.menu.find(d => d.id === 101);
                        else if (text.includes("拉面") || text.includes("豚骨")) matchedDish = DB.menu.find(d => d.id === 102);
                        else if (text.includes("牛腩") || text.includes("粥") || text.includes("萝卜")) matchedDish = DB.menu.find(d => d.id === 105);
                        else if (text.includes("秋刀鱼") || text.includes("煎鱼")) matchedDish = DB.menu.find(d => d.id === 109);
                        else if (text.includes("牛排") || text.includes("雪花")) matchedDish = DB.menu.find(d => d.id === 110);
                    }
                    
                    if (matchedDish) {
                        renderAiMsg(`🎉 <b>成功匹配到美食！</b><br>正在为您快捷下单 <b>${matchedDish.name}</b>...`);
                        setTimeout(() => {
                            executeAiOrderCheckout(matchedDish.id, matchedDish.name);
                        }, 800);
                        return;
                    } else {
                        renderAiMsg(`💡 同学，您想预订推荐列表中的哪款美食呢？<br><br>可以直接告诉我菜名（如：“白灼菜心”或“孜然羊肉”），小智会自动帮您一键预订并生成取餐码！🛒 (输入“取消”可退出)`);
                        return;
                    }
                }

                // 2. 正常意图分类流
                const canteenKeywords = ["推荐", "吃", "餐", "菜", "饿", "新", "喝", "汤", "面", "饭", "肉", "饱", "口味", "忌口", "画像", "盲盒", "点餐", "下单", "排队", "座", "位置"];
                let isCanteenRelated = false;
                for (const keyword of canteenKeywords) {
                    if (text.includes(keyword)) {
                        isCanteenRelated = true;
                        break;
                    }
                }
                
                if (text.includes("运势") || text.includes("吃什么") || text.includes("盲盒") || text.includes("占卜")) {
                    renderAiMsg("🔮 为您开启神秘美食占卜牌！");
                    startSmartRecommendation();
                } else if (text.includes("座") || text.includes("位置") || text.includes("占位") || text.includes("排队")) {
                    renderAiMsg("好的！小智马上为您调出今日餐厅的 <b>2D座位实时占用图</b> 🪑👇");
                    setTimeout(() => {
                        let canteenName = text.includes("东区") ? "东区一楼餐厅" : (text.includes("子衿") ? "子衿食园" : "沙河校区·第一食堂");
                        openSeatSelectionModal(canteenName);
                    }, 800);
                } else if (isCanteenRelated && (text.includes("推荐") || text.includes("新") || text.includes("画像") || text.includes("口味") || text.includes("饿"))) {
                    // --- 触发 AI 推荐与自动化点餐工作流 ---
                    const goalsStr = state.nutriProfile.goals.join('/') || '日常营养均衡';
                    const tastesStr = state.nutriProfile.tastes.join('/') || '暂无偏好';
                    const ingredientsStr = state.nutriProfile.ingredients.join('/') || '暂无忌口';
                    
                    state.aiContext = 'awaiting_taste'; // 转移为口味等待状态
                    
                    renderAiMsg(`🔍 <b>正在调取并分析您的个人饮食画像...</b><br><br>` + 
                                `🎯 <b>您的健康目标</b>：<span class="text-appleBlue font-bold">${goalsStr}</span><br>` + 
                                `🚫 <b>口味避雷与忌口</b>：<span class="text-orange-600 font-bold">${tastesStr}</span> | 不要 <span class="text-red-500 font-bold">${ingredientsStr}</span><br><br>` + 
                                `为了小智给您做出最精准的今日新菜推荐，<b>您今天更偏向于品尝以下哪种口味呢？</b> 👇`);
                                
                    setTimeout(() => {
                        messagesDiv.innerHTML += `
                            <div class="flex flex-wrap gap-2 mt-2 ml-10 slide-up">
                                <button onclick="executeAiTasteFilter('清淡爽口')" class="bg-green-50 text-green-600 border border-green-200 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-green-600 hover:text-white transition shadow-sm glass-btn-active">🌱 清淡爽口</button>
                                <button onclick="executeAiTasteFilter('浓郁鲜香')" class="bg-orange-50 text-orange-600 border border-orange-200 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-orange-600 hover:text-white transition shadow-sm glass-btn-active">🍛 浓郁鲜香</button>
                                <button onclick="executeAiTasteFilter('酸甜开胃')" class="bg-red-50 text-red-600 border border-red-200 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-red-600 hover:text-white transition shadow-sm glass-btn-active">🍓 酸甜开胃</button>
                            </div>`;
                        messagesDiv.scrollTop = messagesDiv.scrollHeight;
                    }, 500);
                } else {
                    // 与食堂用餐无关，或纯聊天，调用后端真实的 Gemini AI 对话服务
                    fetch('http://localhost:5000/api/ai/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: text })
                    })
                    .then(res => res.json())
                    .then(res => {
                        if (res.code === 200) {
                            renderAiMsg(res.reply);
                        } else {
                            renderAiMsg("💡 同学，小智刚刚走神了，您再说一次好吗？");
                        }
                    })
                    .catch(err => {
                        console.error(err);
                        
                        // 开放式闲聊模式智能离线模拟回复 (Workflow 4)
                        let responseMsg = "💡 收到您的消息！小智现在正全心全意陪伴你在 CUFE 校园的生活。";
                        if (text.includes("高数")) {
                            responseMsg = "呜呜，高数确实是咱们中财大人的痛！🧠 别伤心同学，当年小智考前刷了三遍吉米多维奇才勉强及格。学累了别忘了吃顿饱饭，咱们一食堂的豚骨拉面特别热乎，碳水能瞬间唤醒你的多巴胺哦！加油！✨";
                        } else if (text.includes("表白") || text.includes("萌萌")) {
                            responseMsg = "哇塞！满屏幕的粉红泡泡！🌸 喜欢就要大声说出来，不过咱们中财人的浪漫怎么能少得了美食呢？要不带她去子衿食园，挑个靠窗的安静位置，小智悄悄帮你们把校庆限定银杏流沙包送过去？祝你表白成功！✨";
                        } else if (text.includes("Stata") || text.includes("计量") || text.includes("回归")) {
                            responseMsg = "哈哈，抓到一只正在努力的计量经济学学霸！跑面板数据，如果是固定效应，记得用 `xtreg y x, fe`。如果是随机效应，用 `xtreg y x, re`，别忘了最后跑个 Hausman 检验 (`hausman fe re`)。代码敲累了，需要小智帮你点杯鲜榨橙汁送去图书馆吗？🥤";
                        } else {
                            responseMsg = `同学，你刚才说：“${text}” 对吧？小智听得很认真哦！虽然目前处于离线接待，但我随时可以化身你的树洞。今天在校园里遇到了什么有趣的事，或者在学习上有什么困惑，都可以跟我聊聊，小智会一直陪着你的！💙`;
                        }
                        renderAiMsg(responseMsg);
                    });
                }
            }, 600);
        }

        function executeAiTasteFilter(selectedTaste, byNaturalLanguage = false) {
            const messagesDiv = document.getElementById('ai-messages');
            // 如果是通过自然语言打字命中的，用户气泡已经在最开始被 sendAiMessage 渲染过了，这里不需要重复渲染用户气泡
            if (!byNaturalLanguage) {
                messagesDiv.innerHTML += `<div class="flex items-start justify-end space-x-2 mt-4 slide-up"><div class="bg-appleBlue text-white p-3 rounded-2xl rounded-tr-none shadow-sm text-sm">我想吃${selectedTaste}的。</div></div>`;
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
            
            setTimeout(() => {
                const newDishes = DB.menu.filter(d => d.isNew || d.overstocked || d.protein > 20);
                
                let matchedDishes = [];
                if (selectedTaste === '清淡爽口') {
                    matchedDishes = newDishes.filter(d => d.id === 101 || d.id === 107 || d.id === 105);
                } else if (selectedTaste === '浓郁鲜香') {
                    matchedDishes = newDishes.filter(d => d.id === 106 || d.id === 102 || d.id === 110);
                } else if (selectedTaste === '酸甜开胃') {
                    matchedDishes = newDishes.filter(d => d.id === 108 || d.id === 105 || d.id === 109);
                }
                
                const avoidIngreds = state.nutriProfile.ingredients || [];
                matchedDishes = matchedDishes.filter(d => {
                    let hasAvoid = false;
                    for (const ing of avoidIngreds) {
                        if (d.name.includes(ing) || (d.tag && d.tag.includes(ing))) {
                            hasAvoid = true;
                            break;
                        }
                    }
                    return !hasAvoid;
                });
                
                if (matchedDishes.length === 0) {
                    renderAiMsg(`💡 根据您偏好的【${selectedTaste}】口味，今天的新品中暂时没有完全匹配您画像且无忌口的菜品。小智为您强力推荐：<b>减脂鸡肉沙拉 (¥6.5)</b>，健康又爽口！`);
                    state.aiContext = 'awaiting_checkout'; // 设置为等待下单状态
                    return;
                }
                
                let dishesHtml = `✨ <b>小智已为您智能筛选并排除雷区食材，为您精选以下今日上新菜品：</b><br><br>`;
                matchedDishes.forEach(dish => {
                    dishesHtml += `
                        <div class="border border-gray-100 bg-gray-50/50 p-3 rounded-2xl mb-3 flex items-center space-x-3 shadow-sm hover:shadow-md transition">
                            <img src="${dish.img}" class="w-14 h-14 rounded-xl object-cover">
                            <div class="flex-1 min-w-0">
                                <h4 class="font-bold text-sm text-appleDark truncate">${dish.name}</h4>
                                <p class="text-xs text-gray-400 mt-0.5">${dish.window || '学校自选档口'} | ${dish.rating}⭐</p>
                                <p class="text-xs font-bold text-appleBlue mt-0.5">¥${dish.price.toFixed(1)}</p>
                            </div>
                            <button onclick="executeAiOrderCheckout(${dish.id}, '${dish.name}')" class="bg-appleDark text-white text-[11px] font-bold px-3 py-1.5 rounded-full hover:bg-black transition glass-btn-active shrink-0">
                                <i class="fa-solid fa-cart-shopping"></i> 一键预订
                            </button>
                        </div>
                    `;
                });
                
                renderAiMsg(dishesHtml);
                state.aiContext = 'awaiting_checkout'; // 成功转换状态
            }, 800);
        }
        
        function executeAiOrderCheckout(dishId, dishName) {
            addToCart(dishId);
            
            renderAiMsg(`🛒 <b>正在为您执行自动点餐工作流...</b><br>已将 <b>${dishName}</b> 自动放入您的餐盘！正在拉起快捷支付与选座系统... 💳`);
            
            setTimeout(() => {
                const drawer = document.getElementById('cart-drawer');
                if (drawer.classList.contains('translate-x-full')) {
                    toggleCart();
                }
            }, 800);
            
            setTimeout(() => {
                toggleCart(); 
                simulateCheckout();
                state.aiContext = 'idle'; // 点餐圆满结束，重置状态
            }, 2200);
        }

        function renderAiMsg(htmlContent) {
            const messagesDiv = document.getElementById('ai-messages');
            messagesDiv.innerHTML += `
                <div class="flex items-start space-x-2 mt-4 slide-up">
                    <div class="w-8 h-8 rounded-full bg-appleBlue text-white flex shrink-0 items-center justify-center shadow-md"><i class="fa-solid fa-robot text-xs"></i></div>
                    <div class="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 text-appleText text-sm leading-relaxed">
                        ${htmlContent}
                    </div>
                </div>`;
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        // ================= 智能语音交互控制模块 =================
        function toggleSpeechRecognition() {
            const micBtn = document.getElementById('ai-mic-btn');
            const waveContainer = document.getElementById('ai-speech-wave-container');
            const speechText = document.getElementById('ai-speech-text');
            
            if (state.isListening) {
                stopSpeechRecognition();
                return;
            }
            
            state.isListening = true;
            micBtn.classList.remove('bg-gray-100', 'text-gray-500');
            micBtn.classList.add('bg-red-500', 'text-white', 'pulse-red');
            waveContainer.classList.remove('hidden');
            speechText.innerHTML = "正在聆听中，请说话...";
            
            // 真实 Web Speech API 识别模块
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.lang = 'zh-CN';
                recognition.interimResults = true;
                recognition.maxAlternatives = 1;
                
                recognition.onresult = (event) => {
                    const resultText = event.results[0][0].transcript;
                    speechText.innerHTML = `“ ${resultText} ”`;
                    document.getElementById('ai-input').value = resultText;
                };
                
                recognition.onerror = (e) => {
                    console.warn("Speech API error, falling back to mock mode:", e.error);
                    startMockSpeechWave();
                };
                
                recognition.onend = () => {
                    if (state.isListening) {
                        const finalResult = document.getElementById('ai-input').value.trim();
                        stopSpeechRecognition();
                        if (finalResult) {
                            handleAiInput();
                        }
                    }
                };
                
                state.speechRecognitionInstance = recognition;
                recognition.start();
            } else {
                // 降级：无设备或非安全域 (HTTPS) 策略阻断时，优雅降级为拟真声波模拟
                startMockSpeechWave();
            }
        }
        
        function stopSpeechRecognition() {
            const micBtn = document.getElementById('ai-mic-btn');
            const waveContainer = document.getElementById('ai-speech-wave-container');
            state.isListening = false;
            micBtn.classList.remove('bg-red-500', 'text-white', 'pulse-red');
            micBtn.classList.add('bg-gray-100', 'text-gray-500');
            waveContainer.classList.add('hidden');
            
            if (state.speechRecognitionInstance) {
                state.speechRecognitionInstance.stop();
                state.speechRecognitionInstance = null;
            }
            if (state.mockSpeechInterval) {
                clearInterval(state.mockSpeechInterval);
                state.mockSpeechInterval = null;
            }
        }
        
        function startMockSpeechWave() {
            const speechText = document.getElementById('ai-speech-text');
            const phrases = {
                'idle': '小智同学，我肚子饿了，有什么新菜推荐吗？',
                'awaiting_taste': '今天中午我想尝尝浓郁鲜香的口味，多来点肉！',
                'awaiting_checkout': '爆炒孜然羊肉看起来太棒了，帮我订一份吧！'
            };
            const phrase = phrases[state.aiContext] || '小智，帮我推荐个新品吧！';
            
            if (state.mockSpeechInterval) clearInterval(state.mockSpeechInterval);
            
            let index = 0;
            document.getElementById('ai-input').value = '';
            
            // 加速声波柱的跳动以显示捕获状态
            const bars = document.querySelectorAll('.speech-wave-bar');
            bars.forEach((bar, idx) => {
                bar.style.animation = `speechWaveJump ${0.4 + idx * 0.1}s ease-in-out infinite`;
            });
            
            state.mockSpeechInterval = setInterval(() => {
                if (index <= phrase.length) {
                    let currentStr = phrase.substring(0, index);
                    speechText.innerHTML = `“ ${currentStr} ”`;
                    document.getElementById('ai-input').value = currentStr;
                    index++;
                } else {
                    clearInterval(state.mockSpeechInterval);
                    state.mockSpeechInterval = null;
                    
                    setTimeout(() => {
                        stopSpeechRecognition();
                        handleAiInput();
                    }, 800);
                }
            }, 100);
        }

        // ================= 核心启动项 =================
        window.onload = () => {
            // 监听键盘回车事件发送消息
            const aiInput = document.getElementById('ai-input');
            if (aiInput) {
                aiInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAiInput();
                    }
                });
            }

            setTimeout(() => {
                if (!state.hasSetPreferences) {
                    renderPreferenceOnboarding();
                }
            }, 800);
        };

        // --- 启动引导 ---
        loadCart();
        applyTheme(currentTheme());
        renderUserEntry();
        (async () => {
            await loadRemoteData();
            navigate(state.currentView);
            updateCartUI();
        })();

        // ================= 个人中心：资料编辑 =================
        function openProfileModal() {
            const user = currentUser();
            if (!user) return openLoginModal();
            modalRoot.innerHTML = `
                <div class="fixed inset-0 z-[100] flex items-center justify-center glass-modal" onclick="if(event.target===this)closeModal()">
                    <div class="bg-white rounded-[28px] p-8 w-[92%] max-w-[400px] shadow-appleHover slide-up">
                        <h2 class="text-2xl font-bold mb-1">个人资料</h2>
                        <p class="text-appleLightGray text-sm mb-6">账号 ${user.zhanghao} · 余额 ¥${Number(user.jine).toFixed(2)}</p>
                        <label class="text-sm text-appleLightGray block mb-2">姓名</label>
                        <input id="profile-name" value="${user.xingming || ''}" class="w-full bg-appleGray rounded-xl px-4 py-3 mb-4 outline-none focus:ring-2 ring-appleBlue/50 text-sm">
                        <label class="text-sm text-appleLightGray block mb-2">性别</label>
                        <select id="profile-gender" class="w-full bg-appleGray rounded-xl px-4 py-3 mb-4 outline-none text-sm">
                            <option value="男" ${user.xingbie === '男' ? 'selected' : ''}>男</option>
                            <option value="女" ${user.xingbie === '女' ? 'selected' : ''}>女</option>
                        </select>
                        <label class="text-sm text-appleLightGray block mb-2">联系方式</label>
                        <input id="profile-phone" value="${user.lianxifangshi || ''}" class="w-full bg-appleGray rounded-xl px-4 py-3 mb-6 outline-none focus:ring-2 ring-appleBlue/50 text-sm">
                        <button onclick="saveProfile()" class="w-full bg-appleBlue text-white py-3 rounded-full font-bold hover:opacity-90 transition glass-btn-active">保存</button>
                    </div>
                </div>`;
        }

        async function saveProfile() {
            const user = currentUser();
            const payload = {
                xingming: document.getElementById('profile-name').value.trim(),
                xingbie: document.getElementById('profile-gender').value,
                lianxifangshi: document.getElementById('profile-phone').value.trim()
            };
            if (!payload.xingming) return toast('姓名不能为空', 'warning');
            const { status, json } = await api('PUT', `/users/${user.id}`, payload);
            if (status !== 200) return toast(json.message || '保存失败', 'error');
            setSession(getToken(), { ...user, ...payload });
            closeModal();
            renderUserEntry();
            toast('资料已保存', 'success');
        }
