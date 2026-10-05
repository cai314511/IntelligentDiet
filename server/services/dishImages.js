import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const folders={cufe:'zhongcai',bjfu:'beilin',tju:'tianda'};
const normalize=name=>name.replace(/[·\s]/g,'').replace(/肉沫/g,'肉末');
// Visually reviewed food illustrations supplied in the CUFE folder (2026-10-05).
// Keep original filenames and map them explicitly rather than guessing by file order.
const imageNames={cufe:{
 'ChatGPT 图像 2026年10月5日 13_04_32-3.png':'油条',
 'ChatGPT 图像 2026年10月5日 13_04_41-4.png':'咸豆腐脑',
 'ChatGPT 图像 2026年10月5日 13_04_49-5.png':'粥',
 'ChatGPT 图像 2026年10月5日 13_04_51-6.png':'酱香饼',
 'ChatGPT 图像 2026年10月5日 13_05_01-7.png':'玉米饼',
 'ChatGPT 图像 2026年10月5日 13_05_16-8.png':'烤鱼',
 'ChatGPT 图像 2026年10月5日 13_06_10-9.png':'羊肉泡馍',
 'ChatGPT 图像 2026年10月5日 13_06_33-10.png':'砂锅米线',
 'ChatGPT 图像 2026年10月5日 13_09_46-3.png':'馒头',
 'ChatGPT 图像 2026年10月5日 13_09_47-4.png':'咸菜',
}};
export function syncDishImages(db){
 const update=db.prepare('UPDATE caipinxinxi SET tupian=? WHERE id=? AND school_id=?');
 const dishes=db.prepare('SELECT id,caipinmingcheng FROM caipinxinxi WHERE school_id=?');
 const result={};
 db.transaction(()=>{
  for(const [school,folder] of Object.entries(folders)){
   const dir=fileURLToPath(new URL(`../../assets/${folder}/`,import.meta.url));
   if(!fs.existsSync(dir))continue;
   const images=new Map();
   for(const file of fs.readdirSync(dir)){
    if(!/\.(png|jpe?g|webp)$/i.test(file))continue;
    const name=normalize(file.replace(/\.[^.]+$/,''));
    if(images.has(name))throw new Error(`菜品图片名称重复：${folder}/${file}`);
    images.set(name,`/assets/${folder}/${encodeURIComponent(file)}`);
   }
   for(const [file,dishName] of Object.entries(imageNames[school] || {})){
    if(fs.existsSync(`${dir}/${file}`) && !images.has(normalize(dishName))) images.set(normalize(dishName),`/assets/${folder}/${encodeURIComponent(file)}`);
   }
   result[school]=0;
   for(const dish of dishes.all(school)){
    const image=images.get(normalize(dish.caipinmingcheng));
    if(image){update.run(image,dish.id,school);result[school]++;}
   }
  }
 })();
 return result;
}
