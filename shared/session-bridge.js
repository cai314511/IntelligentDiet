(() => {
  const keys = ['zx_session', 'zx_token', 'zx_user', 'zx_admin_token', 'zx_admin_name'];
  let saved;
  try { saved = JSON.parse(localStorage.getItem('zx_session')); } catch {}
  const management = location.pathname.startsWith('/management');
  const identity = management ? 'admin' : 'student';
  let valid = Boolean(saved?.token && saved?.user);
  try {
    const payload = JSON.parse(atob(saved.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    valid = valid && payload.exp * 1000 > Date.now();
  } catch { valid = false; }
  if (!valid) {
    keys.forEach(key => localStorage.removeItem(key));
    location.replace('/?identity=' + identity);
    return;
  }
  if (management && (saved.identity !== 'admin' || saved.user.role !== 'admin')) {
    location.replace('/?identity=admin');
    return;
  }
  localStorage.setItem('zx_token', saved.token);
  localStorage.setItem('zx_user', JSON.stringify(saved.user));
  if (management) {
    localStorage.setItem('zx_admin_token', saved.token);
    localStorage.setItem('zx_admin_name', saved.user.xingming || saved.user.zhanghao);
  }
})();
