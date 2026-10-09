import {ensureBjfuCulture} from "./services/bjfuCulture.js";
import {syncDishImages} from "./services/dishImages.js";
import {normalizeRestaurants,ensureSeatCapacity} from "./services/restaurantTopology.js";
import Database from "better-sqlite3";
import { AsyncLocalStorage } from "node:async_hooks";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { seedReferenceData } from "./seed.js";
import { initWorkspace } from "./services/workspaceSchema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = config.dbPath;

// 确保数据库目录存在
const dbParentDir = path.dirname(dbPath);
if (!fs.existsSync(dbParentDir)) {
  fs.mkdirSync(dbParentDir, { recursive: true });
}

// 创建/连接数据库
export const mainDb = new Database(dbPath);
export const databaseContext = new AsyncLocalStorage();
// 每个请求绑定自己的数据库，体验操作不会落入正式业务库。
export const db = new Proxy({}, {
  get(_target, key) {
    const connection = databaseContext.getStore() || mainDb;
    const value = connection[key];
    return typeof value === 'function' ? value.bind(connection) : value;
  }
});

// 启用外键约束
db.pragma("foreign_keys = ON");

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
      school_id TEXT NOT NULL DEFAULT 'cufe',
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

    -- 订单表（一行一菜品，同一订单多行共用 orderid，故 orderid 不设 UNIQUE）
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderid TEXT NOT NULL,
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

  // ---- 幂等列迁移（重复执行安全）----
  const addColumn = (table, column, ddl) => {
    const cols = db
      .prepare(`PRAGMA table_info(${table})`)
      .all()
      .map((c) => c.name);
    if (!cols.includes(column))
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  };
  addColumn("orders", "pickup_code", "pickup_code TEXT");
  addColumn("orders", "school_id", "school_id TEXT NOT NULL DEFAULT 'cufe'");
  addColumn("yonghu", "role", "role TEXT DEFAULT 'user'");
  addColumn("yonghu", "school_id", "school_id TEXT NOT NULL DEFAULT 'cufe'");
  addColumn("caipinxinxi", "source_key", "source_key TEXT");
  addColumn("caipinxinxi", "window_name", "window_name TEXT NOT NULL DEFAULT ''");
  addColumn("caipinxinxi", "floor", "floor TEXT NOT NULL DEFAULT ''");
  addColumn("caipinxinxi", "location_basis", "location_basis TEXT NOT NULL DEFAULT ''");
  addColumn("caipinxinxi", "shangjia", "shangjia TEXT DEFAULT '是'");
  addColumn(
    "caipinxinxi",
    "school_id",
    "school_id TEXT NOT NULL DEFAULT 'cufe'",
  );
  addColumn(
    "caipinxinxi",
    "ingredients_json",
    "ingredients_json TEXT NOT NULL DEFAULT '[]'",
  );
  addColumn(
    "caipinxinxi",
    "allergens_json",
    "allergens_json TEXT NOT NULL DEFAULT '[]'",
  );
  addColumn(
    "caipinxinxi",
    "nutrition_json",
    "nutrition_json TEXT NOT NULL DEFAULT '{}'",
  );
  addColumn(
    "caipinxinxi",
    "portion_g",
    "portion_g INTEGER NOT NULL DEFAULT 300",
  );
  addColumn(
    "caipinxinxi",
    "data_source",
    "data_source TEXT NOT NULL DEFAULT ''",
  );
  addColumn("caipinxinxi", "source_url", "source_url TEXT NOT NULL DEFAULT ''");
  addColumn("caipinxinxi", "campus", "campus TEXT NOT NULL DEFAULT ''");
  addColumn(
    "caipinxinxi",
    "restaurant_name",
    "restaurant_name TEXT NOT NULL DEFAULT ''",
  );
  addColumn(
    "caipinxinxi",
    "price_unit",
    "price_unit TEXT NOT NULL DEFAULT '元/份'",
  );
  addColumn(
    "caipinxinxi",
    "taste_tags_json",
    "taste_tags_json TEXT NOT NULL DEFAULT '[]'",
  );
  addColumn(
    "caipinxinxi",
    "dietary_tags_json",
    "dietary_tags_json TEXT NOT NULL DEFAULT '[]'",
  );
  addColumn(
    "caipinxinxi",
    "spice_level",
    "spice_level TEXT NOT NULL DEFAULT ''",
  );
  addColumn(
    "caipinxinxi",
    "source_date",
    "source_date TEXT NOT NULL DEFAULT ''",
  );
  addColumn(
    "caipinxinxi",
    "source_kind",
    "source_kind TEXT NOT NULL DEFAULT ''",
  );
  addColumn(
    "caipinxinxi",
    "price_basis",
    "price_basis TEXT NOT NULL DEFAULT ''",
  );
  addColumn(
    "caipinxinxi",
    "nutrition_basis",
    "nutrition_basis TEXT NOT NULL DEFAULT ''",
  );
  addColumn(
    "discusscaipinxinxi",
    "school_id",
    "school_id TEXT NOT NULL DEFAULT 'cufe'",
  );
  addColumn(
    "discusscaipinxinxi",
    "rating",
    "rating INTEGER NOT NULL DEFAULT 5",
  );
  addColumn("messages", "school_id", "school_id TEXT NOT NULL DEFAULT 'cufe'");

  // ---- orders.orderid 唯一约束移除（一行一菜品共用 orderid，幂等重建）----
  // 必须放在 addColumn('orders', 'pickup_code', ...) 之后，保证旧表已有 pickup_code 列可复制
  const hasUniqueOrderid = db
    .prepare("PRAGMA index_list(orders)")
    .all()
    .some((idx) => {
      if (!idx.unique) return false;
      const cols = db.prepare(`PRAGMA index_info("${idx.name}")`).all();
      return cols.length === 1 && cols[0].name === "orderid";
    });
  if (hasUniqueOrderid) {
    db.pragma("foreign_keys = OFF");
    db.exec(`
      BEGIN;
      CREATE TABLE orders_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orderid TEXT NOT NULL,
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
        pickup_code TEXT,
        school_id TEXT NOT NULL DEFAULT 'cufe',
        addtime DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userid) REFERENCES yonghu(id),
        FOREIGN KEY(caipinxinxiid) REFERENCES caipinxinxi(id)
      );
      INSERT INTO orders_new (id, orderid, userid, caipinxinxiid, caipinmingcheng, tupian, buyshu, price, total, discountprice, status, address, phone, remark, pickup_code, school_id, addtime)
        SELECT id, orderid, userid, caipinxinxiid, caipinmingcheng, tupian, buyshu, price, total, discountprice, status, address, phone, remark, pickup_code, school_id, addtime FROM orders;
      DROP TABLE orders;
      ALTER TABLE orders_new RENAME TO orders;
      CREATE INDEX IF NOT EXISTS idx_orders_userid ON orders(userid);
      COMMIT;
    `);
    db.pragma("foreign_keys = ON");
    console.log("✓ orders 表已重建：移除 orderid 唯一约束");
  }

  // ---- 明文密码迁移为 bcrypt（幂等：已哈希的以 $2 开头，跳过）----
  const plaintextUsers = db
    .prepare("SELECT id, mima FROM yonghu WHERE mima NOT LIKE '$2%'")
    .all();
  const updatePwd = db.prepare("UPDATE yonghu SET mima = ? WHERE id = ?");
  for (const u of plaintextUsers) {
    updatePwd.run(bcrypt.hashSync(u.mima, 10), u.id);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS universities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      short_name TEXT NOT NULL,
      accent TEXT NOT NULL DEFAULT '#2357d8',
      logo TEXT NOT NULL DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS restaurants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id TEXT NOT NULL,
      campus TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '学生餐厅',
      description TEXT NOT NULL DEFAULT '',
      opening_hours TEXT NOT NULL DEFAULT '06:30-21:00',
      queue_minutes INTEGER NOT NULL DEFAULT 8,
      queue_count INTEGER NOT NULL DEFAULT 18,
      total_seats INTEGER NOT NULL DEFAULT 160,
      available_seats INTEGER NOT NULL DEFAULT 56,
      image TEXT NOT NULL DEFAULT '',
      UNIQUE(school_id, campus, name)
    );
    CREATE TABLE IF NOT EXISTS restaurant_seats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      seat_label TEXT NOT NULL,
      seat_type TEXT NOT NULL DEFAULT '单人座',
      status TEXT NOT NULL DEFAULT 'available',
      UNIQUE(restaurant_id, seat_label)
    );
    CREATE TABLE IF NOT EXISTS seat_reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservation_id TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES yonghu(id),
      restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
      seat_id INTEGER NOT NULL REFERENCES restaurant_seats(id),
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CHECK(ends_at > starts_at)
    );
    CREATE TABLE IF NOT EXISTS order_dining (
      order_id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, restaurant_id INTEGER NOT NULL, starts_at TEXT NOT NULL, reservation_ids_json TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '校园活动',
      campus TEXT NOT NULL DEFAULT '',
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      source_name TEXT NOT NULL DEFAULT '',
      source_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'published',
      capacity INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS activity_signups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES yonghu(id),
      status TEXT NOT NULL DEFAULT 'registered',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(activity_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id TEXT NOT NULL DEFAULT 'all',
      title TEXT NOT NULL,
      goal TEXT NOT NULL,
      description TEXT NOT NULL,
      dish_ids_json TEXT NOT NULL DEFAULT '[]',
      tips_json TEXT NOT NULL DEFAULT '[]',
      UNIQUE(school_id, title)
    );
    CREATE TABLE IF NOT EXISTS cultural_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '校园文创',
      description TEXT NOT NULL DEFAULT '',
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      image TEXT NOT NULL DEFAULT '',
      campus TEXT NOT NULL DEFAULT '',
      source_name TEXT NOT NULL DEFAULT '',
      source_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'published',
      UNIQUE(school_id, title)
    );
    CREATE TABLE IF NOT EXISTS cultural_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES yonghu(id),
      school_id TEXT NOT NULL,
      item_id INTEGER NOT NULL REFERENCES cultural_items(id),
      title TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      total DECIMAL(10,2) NOT NULL,
      status TEXT NOT NULL DEFAULT '已支付',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS operations_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT '正常',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(school_id,type,title)
    );
    CREATE TABLE IF NOT EXISTS payment_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT NOT NULL UNIQUE,
      orderid TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES yonghu(id),
      kind TEXT NOT NULL CHECK(kind IN ('payment','refund')),
      amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_one_refund ON payment_ledger(orderid, kind);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_school_title ON activities(school_id,title);
    CREATE INDEX IF NOT EXISTS idx_dish_school ON caipinxinxi(school_id, shangjia, caipinfenlei);
    CREATE INDEX IF NOT EXISTS idx_activity_school ON activities(school_id, starts_at);
    CREATE INDEX IF NOT EXISTS idx_reviews_school_dish ON discusscaipinxinxi(school_id,caipinxinxiid);
    CREATE INDEX IF NOT EXISTS idx_messages_school ON messages(school_id,addtime);
  `);

  const reservationSchema =
    db
      .prepare(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='seat_reservations'",
      )
      .get()?.sql || "";
  if (/UNIQUE\s*\(seat_id,\s*starts_at\)/i.test(reservationSchema)) {
    if (dbPath !== ":memory:") {
      const backupDir = path.join(path.dirname(dbPath), "backups");
      fs.mkdirSync(backupDir, { recursive: true });
      fs.writeFileSync(
        path.join(backupDir, `before-seat-index-${Date.now()}.sqlite`),
        db.serialize(),
      );
    }
    db.transaction(() => {
      db.exec(`CREATE TABLE seat_reservations_migrated (
        id INTEGER PRIMARY KEY AUTOINCREMENT, reservation_id TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL REFERENCES yonghu(id), restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
        seat_id INTEGER NOT NULL REFERENCES restaurant_seats(id), starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'confirmed', created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO seat_reservations_migrated SELECT * FROM seat_reservations;
      DROP TABLE seat_reservations;
      ALTER TABLE seat_reservations_migrated RENAME TO seat_reservations;`);
    })();
  }
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_active_seat_start ON seat_reservations(seat_id,starts_at) WHERE status='confirmed'",
  );

  const cultureColumns = db
    .prepare("PRAGMA table_info(cultural_items)")
    .all()
    .map((column) => column.name);
  if (!cultureColumns.includes("status"))
    db.exec(
      "ALTER TABLE cultural_items ADD COLUMN status TEXT NOT NULL DEFAULT 'published'",
    );

  if (
    !db
      .prepare("PRAGMA table_info(universities)")
      .all()
      .some((c) => c.name === "background")
  )
    db.exec(
      "ALTER TABLE universities ADD COLUMN background TEXT NOT NULL DEFAULT ''",
    );
  const seedSchools = db.prepare(
    `INSERT INTO universities(id,name,short_name,accent) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,short_name=excluded.short_name,accent=excluded.accent`,
  );
  for (const school of JSON.parse(
    fs.readFileSync(path.join(config.userDataDir, "schools.json"), "utf8"),
  )) {
    seedSchools.run(school.id, school.name, school.shortName, school.accent);
    if (typeof school.logo === "string")
      db.prepare("UPDATE universities SET logo=? WHERE id=?").run(
        school.logo,
        school.id,
      );
    if (typeof school.background === "string")
      db.prepare("UPDATE universities SET background=? WHERE id=?").run(
        school.background,
        school.id,
      );
  }

  if (!db.prepare("PRAGMA table_info(restaurant_seats)").all().some(c=>c.name==='floor')) db.exec("ALTER TABLE restaurant_seats ADD COLUMN floor TEXT NOT NULL DEFAULT '一层'");
  db.prepare("UPDATE restaurant_seats SET seat_type='单人座'").run();
  const topologyReady=db.prepare("PRAGMA table_info(restaurants)").all().some(c=>c.name==='canonical_id');
  if (config.seedReferenceData && !topologyReady) seedReferenceData(db);
  db.exec("CREATE TABLE IF NOT EXISTS agent_conversations(id TEXT NOT NULL,user_id INTEGER NOT NULL,school_id TEXT NOT NULL,payload TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(id,user_id,school_id))");
  initWorkspace(db);
  for(const [table,name,definition] of [['restaurants','canonical_id','INTEGER'],['restaurants','floors_json',"TEXT DEFAULT '[]'"],['restaurants','has_seating','INTEGER DEFAULT 1'],['restaurant_seats','seat_number','INTEGER']])if(!db.prepare(`PRAGMA table_info(${table})`).all().some(c=>c.name===name))db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  db.transaction(()=>{normalizeRestaurants(db);ensureSeatCapacity(db);})();

  ensureBjfuCulture(db);
  syncDishImages(db);
  console.log("✓ 数据库表创建成功");
}

// 获取数据库连接
export function getDb() {
  return db;
}
