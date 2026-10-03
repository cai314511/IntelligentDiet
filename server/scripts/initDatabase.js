import { db, initDatabase } from '../database.js';

try {
  initDatabase();
  console.log('数据库与学校参考数据初始化完成。');
} catch (error) {
  console.error('数据库初始化失败：', error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
