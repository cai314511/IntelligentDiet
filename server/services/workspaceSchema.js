import fs from "fs";
import path from "path";
import { config } from "../config.js";
export function initWorkspace(db) {
  const column = (table, name, definition) => {
    if (
      !db
        .prepare(`PRAGMA table_info(${table})`)
        .all()
        .some((c) => c.name === name)
    )
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  };
  column("restaurants", "distance_m", "distance_m INTEGER DEFAULT 350");
  column(
    "restaurants",
    "data_source",
    "data_source TEXT DEFAULT '餐厅运营台账'",
  );
  column("restaurants", "updated_at", "updated_at TEXT");
  column("restaurants", "trend", "trend TEXT DEFAULT '平稳'");
  column("caipinxinxi", "window_name", "window_name TEXT DEFAULT ''");
  column("cultural_items", "stock", "stock INTEGER NOT NULL DEFAULT 50");
  column("messages", "campus", "campus TEXT DEFAULT ''");
  column("messages", "restaurant_id", "restaurant_id INTEGER");
  column("messages", "window_name", "window_name TEXT DEFAULT ''");
  column("messages", "category", "category TEXT DEFAULT '建议'");
  column("messages", "priority", "priority TEXT DEFAULT '普通'");
  column("messages", "owner", "owner TEXT DEFAULT ''");
  column("messages", "due_at", "due_at TEXT DEFAULT ''");
  column("messages", "workflow", "workflow TEXT DEFAULT '待处理'");
  db.exec(`
    CREATE TABLE IF NOT EXISTS nutrition_profiles(user_id INTEGER PRIMARY KEY REFERENCES yonghu(id),profile_json TEXT NOT NULL DEFAULT '{}',updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS food_records(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES yonghu(id),school_id TEXT NOT NULL,dish_id INTEGER REFERENCES caipinxinxi(id),name TEXT NOT NULL,grams REAL NOT NULL,meal TEXT NOT NULL,eaten_at TEXT NOT NULL,nutrition_json TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS agent_tasks(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES yonghu(id),school_id TEXT NOT NULL,message TEXT NOT NULL,plan_json TEXT NOT NULL,status TEXT DEFAULT 'draft',order_id TEXT,reservation_ids_json TEXT DEFAULT '[]',created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS audit_events(id INTEGER PRIMARY KEY,school_id TEXT NOT NULL,user_id INTEGER NOT NULL,entity TEXT NOT NULL,entity_id INTEGER NOT NULL,action TEXT NOT NULL,before_json TEXT,after_json TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS proposals(id INTEGER PRIMARY KEY,school_id TEXT NOT NULL,user_id INTEGER NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS proposal_votes(proposal_id INTEGER NOT NULL REFERENCES proposals(id),user_id INTEGER NOT NULL REFERENCES yonghu(id),choice TEXT NOT NULL,PRIMARY KEY(proposal_id,user_id));
    CREATE TABLE IF NOT EXISTS point_ledger(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES yonghu(id),school_id TEXT NOT NULL,reason TEXT NOT NULL,reference TEXT NOT NULL,points INTEGER NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id,reason,reference));
    CREATE TABLE IF NOT EXISTS point_redemptions(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES yonghu(id),school_id TEXT NOT NULL,item_id INTEGER NOT NULL REFERENCES cultural_items(id),points INTEGER NOT NULL,status TEXT DEFAULT '待领取',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX IF NOT EXISTS idx_food_records_user_time ON food_records(user_id,eaten_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_user ON agent_tasks(user_id,school_id,created_at);
  `);
  db.exec(
    "CREATE TABLE IF NOT EXISTS workspace_bootstrap(key TEXT PRIMARY KEY)",
  );
  const file = path.join(config.userDataDir, "restaurant_context.json");
  if (
    fs.existsSync(file) &&
    !db
      .prepare("SELECT 1 FROM workspace_bootstrap WHERE key=?")
      .get("restaurant_context")
  )
    db.transaction(() => {
      for (const r of JSON.parse(fs.readFileSync(file, "utf8")))
        db.prepare(
          "UPDATE restaurants SET distance_m=?,data_source=? WHERE school_id=? AND campus=? AND name=?",
        ).run(r.distanceM, r.sourceName, r.schoolId, r.campus, r.name);
      db.prepare("INSERT INTO workspace_bootstrap(key) VALUES(?)").run(
        "restaurant_context",
      );
    })();
  db.prepare(
    "UPDATE caipinxinxi SET window_name=caipinfenlei||'窗口' WHERE window_name=''",
  ).run();
  db.prepare(
    "UPDATE restaurants SET updated_at=CURRENT_TIMESTAMP WHERE updated_at IS NULL",
  ).run();
}
