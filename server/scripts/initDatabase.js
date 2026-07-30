import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { db, initDatabase } from '../database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 获取并解析 canteen/data.js 的 Mock 数据
function getMockData() {
  const dataPath = path.resolve(__dirname, '../../canteen/data.js');
  if (!fs.existsSync(dataPath)) {
    throw new Error(`找不到 mock 数据库文件: ${dataPath}`);
  }
  
  const code = fs.readFileSync(dataPath, 'utf8');
  
  // 使用正则将顶层的 const xxx = 或 let xxx = 替换为 this.xxx = 以便运行获取
  const transformed = code
    .replace(/^const\s+(\w+)\s*=/gm, 'this.$1 =')
    .replace(/^let\s+(\w+)\s*=/gm, 'this.$1 =');
  
  const fn = new Function(transformed);
  const context = {};
  fn.call(context);
  return context;
}

async function seed() {
  console.log('\n==================================================');
  console.log('🤖 正在启动「智饷智慧食堂」数据库初始化与数据刷入...');
  console.log('==================================================\n');

  // 初始化表结构
  initDatabase();

  const data = getMockData();
  const { categories, dishes, reviews } = data;

  if (!categories || !dishes) {
    throw new Error('Mock 数据解析失败，未找到 categories 或 dishes 数组');
  }

  console.log(`✓ 成功载入 Mock 数据: ${categories.length} 个分类, ${dishes.length} 个菜品, ${reviews?.length || 0} 条评价`);

  db.transaction(() => {
    // 1. 刷入分类数据 caipinfenlei
    console.log('正在刷入菜品分类...');
    const insertCategory = db.prepare('INSERT OR IGNORE INTO caipinfenlei (id, caipinfenlei) VALUES (?, ?)');
    for (const cat of categories) {
      insertCategory.run(cat.id, cat.name);
    }
    console.log(`✓ 分类数据刷入完成！`);

    // 2. 刷入菜品数据 caipinxinxi
    console.log('正在刷入菜品信息...');
    const insertDish = db.prepare(`
      INSERT OR REPLACE INTO caipinxinxi 
      (id, caipinmingcheng, caipinfenlei, tupian, cailiao, guige, jiage, yingyang, yueshuxiao, pinfen, kucun)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 建立 ID 到分类名称的映射
    const categoryMap = {};
    for (const cat of categories) {
      categoryMap[cat.id] = cat.name;
    }

    for (const dish of dishes) {
      const categoryName = categoryMap[dish.category] || '热菜';
      const cailiao = dish.tags ? dish.tags.join('，') : '';
      const guige = '标准份';
      const yingyang = dish.nutrition 
        ? `热量 ${dish.nutrition.calories}kcal，蛋白质 ${dish.nutrition.protein}g，碳水 ${dish.nutrition.carbs}g，脂肪 ${dish.nutrition.fat}g` 
        : '';
      
      insertDish.run(
        dish.id,
        dish.name,
        categoryName,
        dish.image || '',
        cailiao,
        guige,
        dish.price,
        yingyang,
        dish.monthlySales || 0,
        dish.rating || 5.0,
        dish.stock || 100
      );
    }
    console.log(`✓ ${dishes.length} 个菜品信息刷入完成！`);

    // 3. 刷入默认用户数据 yonghu
    console.log('正在刷入默认测试用户...');
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO yonghu (zhanghao, mima, xingming, touxiang, xingbie, lianxifangshi, jine, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run('student1', bcrypt.hashSync('password123', 10), '张三',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80',
      '男', '13800138000', 5000.00, 'user');

    insertUser.run('student2', bcrypt.hashSync('password123', 10), '种菜闪餐小队长',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80',
      '女', '13900139000', 10000.00, 'user');

    insertUser.run('admin', bcrypt.hashSync('admin123', 10), '后勤处管理员',
      '', '男', '13500135000', 99999.00, 'admin');
    console.log(`✓ 默认用户 (student1, student2, admin) 刷入完成！`);

    // 4. 刷入默认地址数据 address
    console.log('正在刷入默认地址信息...');
    const insertAddress = db.prepare(`
      INSERT OR IGNORE INTO address (userid, address, name, phone, isdefault)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    // 给 student1 和 student2 刷入默认地址
    insertAddress.run(1, '沙河校区 东方大学城A栋302', '张三', '13800138000', '是');
    insertAddress.run(2, '沙河校区 子衿学区B栋504', '种菜闪餐小队长', '13900139000', '是');
    console.log(`✓ 默认收货地址刷入完成！`);

    // 5. 刷入评论数据 discusscaipinxinxi
    if (reviews && reviews.length > 0) {
      console.log('正在刷入菜品初始点评...');
      const insertComment = db.prepare(`
        INSERT OR IGNORE INTO discusscaipinxinxi (caipinxinxiid, userid, yonghuming, commentcontent)
        VALUES (?, ?, ?, ?)
      `);
      for (const rev of reviews) {
        insertComment.run(rev.dishId, 1, rev.user, rev.content);
      }
      console.log(`✓ ${reviews.length} 条菜品初始点评刷入完成！`);
    }
  })();

  console.log('\n==================================================');
  console.log('🎉 所有初始种子数据刷入成功！SQLite 数据库已完全就绪。');
  console.log(`📍 数据库位置: ${path.resolve(__dirname, '../data/zhixiang.db')}`);
  console.log('==================================================\n');
}

seed().catch(err => {
  console.error('✗ 初始化数据库失败:', err);
  process.exit(1);
});
