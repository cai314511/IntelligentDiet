import { session } from '../../shared/core.js';
const nav = document.createElement('nav');
nav.className = 'admin-bottom-nav';
nav.setAttribute('aria-label', '后勤端底部导航');
nav.innerHTML = '<button data-module="dashboard">▦<span>概览</span></button><button data-module="canteen">▤<span>食堂</span></button><button id="admin-mobile-chat" aria-label="召唤小智"><img src="/assets/brand/xiaozhi-admin-avatar.png" alt="小智"><span>小智</span></button><button data-module="safety">◇<span>监管</span></button><button id="admin-mobile-more" aria-controls="sidebar" aria-expanded="false">☰<span>更多</span></button>';
document.body.append(nav);
nav.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.module) window.dispatchEvent(new CustomEvent('zx-admin-refresh', { detail: button.dataset.module }));
  if (button.id === 'admin-mobile-chat') {
    document.body.classList.remove('zx-menu-open');
    window.dispatchEvent(new Event('zx-admin-chat'));
  }
  if (button.id === 'admin-mobile-more') {
    event.stopPropagation();
    document.body.classList.toggle('zx-menu-open');
  }
});
const sync = () => {
  const selected = location.hash.slice(1) || 'dashboard';
  for (const button of nav.querySelectorAll('[data-module]')) {
    const active = button.dataset.module === selected;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  const more = document.getElementById('admin-mobile-more');
  more.classList.toggle('active', !['dashboard','canteen','safety'].includes(selected));
  more.setAttribute('aria-expanded', String(document.body.classList.contains('zx-menu-open')));
};
new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
window.addEventListener('zx-admin-navigation', sync);
window.addEventListener('popstate', sync);
sync();
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') document.body.classList.remove('zx-menu-open');
});
const viewport = () => {
  document.documentElement.style.setProperty('--admin-viewport-height', (window.visualViewport?.height || innerHeight) + 'px');
  document.documentElement.style.setProperty('--admin-viewport-top', (window.visualViewport?.offsetTop || 0) + 'px');
};
window.visualViewport?.addEventListener('resize', viewport);
window.visualViewport?.addEventListener('scroll', viewport);
window.addEventListener('resize', viewport);
viewport();
const user = session()?.user;
if (user?.trial) {
  const banner = document.createElement('aside');
  banner.className = 'admin-trial-banner';
  const label = document.createElement('span');
  const link = document.createElement('a');
  link.href = '/?identity=admin';
  link.textContent = '填写认证号';
  banner.append(label, link);
  document.getElementById('main-content').before(banner);
  const tick = () => {
    const left = Math.max(0, user.trialExpiresAt - Date.now());
    label.textContent = left > 0 ? '独立演示环境 · 体验剩余 ' + Math.ceil(left / 60000) + ' 分钟' : '体验已到期，请认证后继续';
    if (!left) { clearInterval(timer); location.replace('/?identity=admin'); }
  };
  const timer = setInterval(tick, 1000);
  tick();
}

matchMedia('(max-width:767px)').addEventListener('change', event => {
  const filters = document.querySelector('.admin-filter-panel');
  if (filters) filters.open = !event.matches;
});
