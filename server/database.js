import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(__dirname, 'data');
const dbPath = path.join(dbDir, 'zhixiang.db');

// 确保数据库目录存在
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 创建/连接数据库
export const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

export function initDatabase() {
  // 使用表
  db.exec(`
    -- 菜品分类
    CREATE TABLE IF NOT EXISTS caipinfenlei (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caipinfenlei TEXT NOT NULL UNIQUE,
      addtime DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 菜品信息
    CREATE TABLE IF NOT EXISTS caipinxinxi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caipinmingcheng TEXT NOT NULL,
      caipinfenlei TEXT NOT NULL,
      tupian TEXT,
      cailiao TEXT,
      guige TEXT,
      jiage DECIMAL(10, 2) NOT NULL DEFAULT 0,
      yingyang TEXT,
      yueshuxiao INTEGER DEFAULT 0,
      pinfen DECIMAL(3, 1) DEFAULT 5.0,
      kucun INTEGER DEFAULT 100,
      addtime DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(caipinfenlei) REFERENCES caipinfenlei(caipinfenlei)
    );

    -- 用户表
    CREATE TABLE IF NOT EXISTS yonghu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zhanghao TEXT NOT NULL UNIQUE,
      mima TEXT NOT NULL,
      xingming TEXT NOT NULL,
      touxiang TEXT,
      xingbie TEXT,
      lianxifangshi TEXT,
      jine DECIMAL(12, 2) DEFAULT 0,
      addtime DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 地址表
    CREATE TABLE IF NOT EXISTS address (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userid INTEGER NOT NULL,
      address TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      isdefault TEXT DEFAULT '否',
      addtime DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userid) REFERENCES yonghu(id)
    );

    -- 订单表
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderid TEXT NOT NULL UNIQUE,
      userid INTEGER NOT NULL,
      caipinxinxiid INTEGER NOT NULL,
      caipinmingcheng TEXT NOT NULL,
      tupian TEXT,
      buyshu INTEGER DEFAULT 1,
      price DECIMAL(10, 2) NOT NULL,
      total DECIMAL(10, 2) NOT NULL,
      discountprice DECIMAL(10, 2) DEFAULT 0,
      status TEXT DEFAULT '未支付',
      address TEXT,
      phone TEXT,
      remark TEXT,
      addtime DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userid) REFERENCES yonghu(id),
      FOREIGN KEY(caipinxinxiid) REFERENCES caipinxinxi(id)
    );

    -- 购物车表
    CREATE TABLE IF NOT EXISTS cart (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userid INTEGER NOT NULL,
      caipinxinxiid INTEGER NOT NULL,
      caipinmingcheng TEXT NOT NULL,
      tupian TEXT,
      buyshu INTEGER DEFAULT 1,
      price DECIMAL(10, 2) NOT NULL,
      discountprice DECIMAL(10, 2) DEFAULT 0,
      addtime DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userid) REFERENCES yonghu(id),
      FOREIGN KEY(caipinxinxiid) REFERENCES caipinxinxi(id)
    );

    -- 收藏表
    CREATE TABLE IF NOT EXISTS storeup (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userid INTEGER NOT NULL,
      caipinxinxiid INTEGER NOT NULL,
      caipinmingcheng TEXT NOT NULL,
      tupian TEXT,
      remark TEXT,
      addtime DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userid) REFERENCES yonghu(id),
      FOREIGN KEY(caipinxinxiid) REFERENCES caipinxinxi(id)
    );

    -- 评论表
    CREATE TABLE IF NOT EXISTS discusscaipinxinxi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caipinxinxiid INTEGER NOT NULL,
      userid INTEGER NOT NULL,
      yonghuming TEXT NOT NULL,
      commentcontent TEXT NOT NULL,
      replycontent TEXT,
      addtime DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(caipinxinxiid) REFERENCES caipinxinxi(id),
      FOREIGN KEY(userid) REFERENCES yonghu(id)
    );

    -- 留言表
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userid INTEGER NOT NULL,
      yonghuming TEXT NOT NULL,
      content TEXT NOT NULL,
      cpicture TEXT,
      replycontent TEXT,
      rpicture TEXT,
      addtime DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userid) REFERENCES yonghu(id)
    );

    -- 创建索引以提高查询性能
    CREATE INDEX IF NOT EXISTS idx_caipinxinxi_fenlei ON caipinxinxi(caipinfenlei);
    CREATE INDEX IF NOT EXISTS idx_orders_userid ON orders(userid);
    CREATE INDEX IF NOT EXISTS idx_cart_userid ON cart(userid);
  `);

  console.log('✓ 数据库表创建成功');
}

// 获取数据库连接
export function getDb() {
  return db;
}
