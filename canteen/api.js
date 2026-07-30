// 智饷 C 端 API 层：统一请求、登录态、登录/注册模态框
const API_BASE = 'http://localhost:5000/api';

function getToken() { return localStorage.getItem('zx_token') || ''; }
function currentUser() {
  try { return JSON.parse(localStorage.getItem('zx_user')) || null; } catch { return null; }
}
function setSession(token, user) {
  localStorage.setItem('zx_token', token);
  localStorage.setItem('zx_user', JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('zx_token');
  localStorage.removeItem('zx_user');
}

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method, headers, body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    toast('无法连接服务器，请确认后端已启动', 'error');
    return { status: 0, json: { code: 0, message: '网络错误' } };
  }
  const json = await res.json().catch(() => ({}));
  // 登录/注册自身的 401 由调用方提示，不做全局劫持
  if (res.status === 401 && !path.startsWith('/users/login') && !path.startsWith('/users/register')) {
    clearSession();
    renderUserEntry();
    openLoginModal();
  }
  return { status: res.status, json };
}

// ---- 登录 / 注册模态框 ----
function openLoginModal() {
  modalRoot.innerHTML = `
    <div class="fixed inset-0 z-[100] flex items-center justify-center glass-modal" onclick="if(event.target===this)closeModal()">
      <div class="bg-white rounded-[28px] p-8 w-[92%] max-w-[400px] shadow-appleHover slide-up">
        <div class="text-center mb-6">
          <img src="xiaozhi-logo.svg" class="w-14 h-14 mx-auto mb-3" onerror="this.style.display='none'">
          <h2 id="auth-title" class="text-2xl font-bold">登录智饷</h2>
          <p class="text-appleLightGray text-sm mt-1">校园卡账号一键登录，开启智慧就餐</p>
        </div>
        <input id="auth-account" placeholder="账号" class="w-full bg-appleGray rounded-xl px-4 py-3 mb-3 outline-none focus:ring-2 ring-appleBlue/50 text-sm">
        <input id="auth-password" type="password" placeholder="密码" class="w-full bg-appleGray rounded-xl px-4 py-3 mb-3 outline-none focus:ring-2 ring-appleBlue/50 text-sm">
        <div id="auth-extra" class="hidden">
          <input id="auth-name" placeholder="姓名" class="w-full bg-appleGray rounded-xl px-4 py-3 mb-3 outline-none focus:ring-2 ring-appleBlue/50 text-sm">
          <input id="auth-phone" placeholder="手机号" class="w-full bg-appleGray rounded-xl px-4 py-3 mb-3 outline-none focus:ring-2 ring-appleBlue/50 text-sm">
        </div>
        <button onclick="submitAuth()" id="auth-submit" class="w-full bg-appleBlue text-white py-3 rounded-full font-bold hover:opacity-90 transition glass-btn-active">登 录</button>
        <p class="text-center text-sm text-appleLightGray mt-4">
          <span id="auth-switch-text">还没有账号？</span>
          <a href="javascript:void(0)" class="text-appleBlue font-medium" onclick="toggleAuthMode()" id="auth-switch">立即注册</a>
        </p>
      </div>
    </div>`;
}

let authMode = 'login';
function toggleAuthMode() {
  authMode = authMode === 'login' ? 'register' : 'login';
  const isLogin = authMode === 'login';
  document.getElementById('auth-title').innerText = isLogin ? '登录智饷' : '注册智饷';
  document.getElementById('auth-extra').classList.toggle('hidden', isLogin);
  document.getElementById('auth-submit').innerText = isLogin ? '登 录' : '注 册';
  document.getElementById('auth-switch-text').innerText = isLogin ? '还没有账号？' : '已有账号？';
  document.getElementById('auth-switch').innerText = isLogin ? '立即注册' : '去登录';
}

async function submitAuth() {
  const zhanghao = document.getElementById('auth-account').value.trim();
  const mima = document.getElementById('auth-password').value;
  if (!zhanghao || !mima) return toast('请输入账号和密码', 'warning');

  if (authMode === 'register') {
    const xingming = document.getElementById('auth-name').value.trim();
    const lianxifangshi = document.getElementById('auth-phone').value.trim();
    if (!xingming) return toast('请输入姓名', 'warning');
    const { status, json } = await api('POST', '/users/register', { zhanghao, mima, xingming, lianxifangshi });
    if (status !== 200) return toast(json.message || '注册失败', 'error');
    toast('注册成功，已赠送 ¥10000 体验金', 'success');
  }

  const { status, json } = await api('POST', '/users/login', { zhanghao, mima });
  if (status !== 200) return toast(json.message || '登录失败', 'error');
  setSession(json.data.token, json.data.user);
  closeModal();
  renderUserEntry();
  toast(`欢迎回来，${json.data.user.xingming}`, 'success');
  render();
}

function logout() {
  clearSession();
  renderUserEntry();
  toast('已退出登录', 'success');
  render();
}

function requireLogin() {
  if (getToken()) return true;
  openLoginModal();
  return false;
}

// 导航栏用户入口（登录按钮 / 用户名 + 退出）
function renderUserEntry() {
  const slot = document.getElementById('user-entry');
  if (!slot) return;
  const user = currentUser();
  slot.innerHTML = user
    ? `<a href="javascript:void(0)" onclick="openProfileModal()" class="text-sm font-medium mr-3 hover:opacity-80 transition" title="编辑资料">👋 ${user.xingming} <span class="text-appleBlue font-bold">¥${Number(user.jine).toFixed(2)}</span></a>
       <button onclick="logout()" class="text-sm text-appleLightGray hover:text-appleDark transition">退出</button>`
    : `<button onclick="openLoginModal()" class="bg-appleBlue text-white text-sm px-5 py-2 rounded-full font-medium hover:opacity-90 transition glass-btn-active">登录 / 注册</button>`;
}

// ---- 全局 toast 通知 ----
function toast(message, type = 'info') {
  document.getElementById('zx-toast')?.remove();
  const el = document.createElement('div');
  el.id = 'zx-toast';
  const colors = { info: '#0071E3', success: '#34c759', warning: '#ff9500', error: '#ff3b30' };
  el.style.cssText = `
    position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
    background: ${colors[type] || colors.info}; color: #fff; padding: 12px 28px;
    border-radius: 999px; box-shadow: 0 10px 30px rgba(0,0,0,0.18);
    z-index: 20000; font-weight: 600; font-size: 14px; transition: all .3s ease;
  `;
  el.innerText = message;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.marginTop = '-12px'; setTimeout(() => el.remove(), 300); }, 2600);
}
