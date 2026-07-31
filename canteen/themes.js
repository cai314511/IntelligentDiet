// ================= 智饷「风格宇宙」主题注册表 =================
// 6 套原创风格化主题（不使用任何具体 IP 名称与素材）。
// score(dish) 为主题人设推荐打分函数，dish 字段见 app.js 的 DB.menu 映射。

const THEMES = [
  {
    id: 'minimal', name: '极简留白', emoji: '⚪',
    tagline: '少即是多，回归食物本身',
    persona: '为你精选全店评分最高的口碑菜——简单，但不会错。',
    cardBg: 'linear-gradient(135deg,#F5F5F7,#FFFFFF)', cardText: '#1D1D1F',
    score: d => d.rating * 20 + Math.min(d.sales, 100) * 0.1
  },
  {
    id: 'anime', name: '动漫次元', emoji: '🌸',
    tagline: '二次元能量补给站',
    persona: '欧皇附体！为你捕捉本周上新与人气爆棚的梦幻菜品✨',
    cardBg: 'linear-gradient(135deg,#FF6B9D,#FFC2D9)', cardText: '#FFFFFF',
    score: d => (d.isNew ? 50 : 0) + d.sales * 0.2 + d.rating * 5
  },
  {
    id: 'esports', name: '电竞赛博', emoji: '⚡',
    tagline: '高能快充，Carry 全场',
    persona: '检测到能量缺口：为你锁定高热量快充组合，手速不掉线。',
    cardBg: 'linear-gradient(135deg,#0A0E17,#00E5FF)', cardText: '#E0F7FF',
    score: d => d.cal * 0.2 + (d.category === '套餐' || d.category === '面食' ? 40 : 0) + d.rating * 3
  },
  {
    id: 'guofeng', name: '国风墨韵', emoji: '🏮',
    tagline: '一箸一饮，皆是风雅',
    persona: '为你寻得温润滋补之选——慢火细炖，最抚凡人心。',
    cardBg: 'linear-gradient(135deg,#F5F0E1,#C8102E)', cardText: '#2B2118',
    score: d => (d.category === '汤品' || d.category === '粥品' ? 60 : 0)
      + (/汤|粥|炖|温补|清/.test(d.name + (d.tag || '')) ? 40 : 0) + d.rating * 4
  },
  {
    id: 'music', name: '音乐现场', emoji: '🎧',
    tagline: '把午餐开成 Livehouse',
    persona: '今日歌单已就绪：新品首发与特调饮品，为你的午后打 Call。',
    cardBg: 'linear-gradient(135deg,#12101F,#A78BFA)', cardText: '#EDE9FE',
    score: d => (d.category === '饮品' ? 50 : 0) + (d.isNew ? 40 : 0) + d.rating * 4
  },
  {
    id: 'sports', name: '运动活力', emoji: '🔥',
    tagline: '三分练，七分吃',
    persona: '增肌减脂模式 ON：为你筛出高蛋白、低负担的实力派。',
    cardBg: 'linear-gradient(135deg,#FF6B35,#FFB58A)', cardText: '#FFFFFF',
    score: d => d.protein * 3 - d.cal * 0.02 + d.rating * 3
  }
];

function getThemeById(id) {
  return THEMES.find(t => t.id === id) || THEMES[0];
}

function currentTheme() {
  return localStorage.getItem('zx_theme') || 'minimal';
}

function applyTheme(id) {
  document.body.setAttribute('data-theme', id);
  localStorage.setItem('zx_theme', id);
}

// 主题人设推荐：对真实菜单按 score 降序取前 4，过滤售罄
function getThemeRecommendations() {
  const theme = getThemeById(currentTheme());
  return [...DB.menu]
    .filter(d => d.stock === undefined || d.stock > 0)
    .sort((a, b) => theme.score(b) - theme.score(a))
    .slice(0, 4);
}

function selectTheme(id) {
  applyTheme(id);
  const t = getThemeById(id);
  toast(`${t.emoji} 已切换到「${t.name}」`, 'success');
  render();
}
