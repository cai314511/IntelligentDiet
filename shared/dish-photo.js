import {esc} from './feature-ui.js';
export function dishImage(dish, catalog = []) {
  const id = dish && 'dish_id' in dish ? dish.dish_id : dish?.caipinxinxiid ?? dish?.id;
  let current = id ? catalog.find(d => Number(d.id) === Number(id)) : null;
  if (!current && dish?.name) {
    const matches = catalog.filter(d => d.name === dish.name);
    if (new Set(matches.map(d=>d.image).filter(Boolean)).size === 1) current = matches.find(d=>d.image);
  }
  const candidates = [current?.image, dish?.dishImage, dish?.image, dish?.tupian, dish?.img];
  return candidates.find(url => typeof url === 'string' && url && !url.includes('placeholder') && (/^\/assets\//.test(url) || /^https?:\/\//.test(url) || /^data:image\/(png|jpeg|webp);base64,/.test(url))) || '';
}
export function dishPhoto(dish, {catalog = [], width = '100%', height = 140} = {}) {
  const image = dishImage(dish,catalog), name = dish?.name || dish?.caipinmingcheng || '菜品';
  const style = `width:${width};height:${height}px;border-radius:14px;object-fit:cover;flex-shrink:0;display:block;`;
  return image ? `<img src="${esc(image)}" alt="${esc(name)}" loading="lazy" style="${style}" onerror="this.style.visibility='hidden'">` : `<span role="img" aria-label="${esc(name)}暂无图片" style="${style}background:var(--zx-soft,#f5f5f7)"></span>`;
}
