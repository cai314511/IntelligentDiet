// One exclusion rule for nutrition recommendations and dining plans.
export function matchesExclusion(dish, value) {
 const term=String(value).trim().replace(/^(?:不喜欢|不想吃|不要|不吃|避开|拒绝|讨厌)\s*/, '');
 if(!term)return false;
 if(term==='辣'||term==='辛辣')return !['不辣','无辣','无',''].includes(dish.spiceLevel||'') || /辣/.test([dish.name,...(dish.ingredients||[])].join(' '));
 const text=[dish.name,...(dish.ingredients||[]),...(dish.allergens||[]),...(dish.tasteTags||[])].join(' ');
 const aliases={大豆:['大豆','黄豆','豆浆','豆腐','豆皮','豆干','豆芽','酱油'],小麦:['小麦','面粉','面条','馒头','油条','饺子','馄饨','汉堡','三明治','铜锣烧'],牛奶:['牛奶','乳制品','奶','芝士'],鸡蛋:['鸡蛋','蛋'],鱼:['鱼']};
 return (aliases[term]||[term]).some(t=>text.includes(t));
}
export function acceptsProfile(dish,profile={}) {
 const portrait=profile.portrait||{};
 const negativeTastes=[...(profile.tastes||[]),...(portrait.tastes||[])].filter(x=>/^(不喜欢|不要|不吃|拒绝|讨厌)/.test(x));
 const terms=[...(profile.exclusions||[]),...(portrait.allergies||[]),...(portrait.dislikes||[]),...negativeTastes];
 return acceptsNutritionGoal(dish,profile.goal) && !terms.some(term=>matchesExclusion(dish,term)) && !((profile.tastes||[]).some(x=>['不辣','无辣'].includes(x))&&matchesExclusion(dish,'辣'));
}

// Operational recommendation limits, not a measured recipe or a medical prescription.
// Apply before sales/price sorting; manual ordering remains available.
export function acceptsNutritionGoal(dish, goal = '') {
 if (!/低脂|减脂|减重/.test(String(goal))) return true;
 const n=dish.nutrition || {}, portion=Number(dish.portionG);
 if (n.confidence==='low' || !Number.isFinite(portion) || portion<=0 ||
     ['calories','protein','carbs','fat'].some(k=>n[k]==null || !Number.isFinite(Number(n[k])) || Number(n[k])<0)) return false;
 const energy=Number(n.calories),fat=Number(n.fat);
 if (energy<=0) return false;
 return energy<=750 && fat<=25 && energy*100/portion<=200 && fat*100/portion<=10 && fat*9/energy<=0.35;
}
