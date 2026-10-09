import Database from 'better-sqlite3';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { mainDb, databaseContext, initDatabase } from '../database.js';
import { config } from '../config.js';

export function initAdminAccess() {
  mainDb.exec(`CREATE TABLE IF NOT EXISTS admin_certificates (
    school_id TEXT PRIMARY KEY, code_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS admin_trials (
    user_id INTEGER PRIMARY KEY REFERENCES yonghu(id), expires_at INTEGER NOT NULL);`);
}
export function issueCertificate(schoolId) {
  if (!mainDb.prepare('SELECT 1 FROM universities WHERE id=?').get(schoolId)) throw new Error('学校不存在');
  const code = 'ZX-' + randomBytes(24).toString('hex');
  mainDb.prepare('INSERT INTO admin_certificates VALUES(?,?) ON CONFLICT(school_id) DO UPDATE SET code_hash=excluded.code_hash')
    .run(schoolId, createHash('sha256').update(code).digest('hex'));
  return code;
}
export function validCertificate(schoolId, code) {
  const row = mainDb.prepare('SELECT code_hash FROM admin_certificates WHERE school_id=?').get(schoolId);
  const hash = createHash('sha256').update(String(code || '').trim()).digest();
  return Boolean(row && timingSafeEqual(Buffer.from(row.code_hash, 'hex'), hash));
}
const connections = new Map();
export function trialDatabase(user, expiresAt) {
  const existing = connections.get(user.id);
  if (existing) return existing;
  const directory = path.join(config.userDataDir, 'admin-trials');
  fs.mkdirSync(directory, { recursive: true });
  const connection = new Database(path.join(directory, String(user.id) + '.sqlite'));
  connection.pragma('foreign_keys = ON');
  try {
  connection.transaction(() => databaseContext.run(connection, () => {
    initDatabase();
    connection.prepare(`INSERT INTO yonghu(id,zhanghao,mima,xingming,school_id,role)
      VALUES(?,?,?,?,?,'admin') ON CONFLICT(id) DO NOTHING`)
      .run(user.id, user.zhanghao, user.mima, user.xingming, user.school_id);
  }))();
  } catch (error) { connection.close(); throw error; }
  connections.set(user.id, connection);
  // 到期关闭连接；期限依据服务端绝对时间，重登不会重置。
  const timer = setTimeout(() => { connections.delete(user.id); if (connection.open) connection.close(); }, Math.max(1, expiresAt - Date.now()) + 60000);
  timer.unref();
  return connection;
}
export function trialSession(user) {
  const trial = mainDb.prepare('SELECT expires_at FROM admin_trials WHERE user_id=?').get(user.id);
  if (!trial || trial.expires_at <= Date.now()) return null;
  trialDatabase(user, trial.expires_at);
  return { ...user, role: 'admin', trial: true, trialExpiresAt: trial.expires_at };
}
export function isolateTrial(req, res, next) {
  // 登录和认证使用正式账号库，允许到期用户重新提交认证号。
  if (/^\/users\/(login|register|schools)$/.test(req.path.toLowerCase().replace(/\/+$/, ''))) return next();
  if (req.headers.authorization && !req.user) return res.status(401).json({ message: '登录或体验已到期，请重新登录并认证' });
  if (!req.user?.trial) return next();
  if (req.path.toLowerCase().startsWith("/users/development-")) return res.status(403).json({ message: "体验账号不能使用开发管理员入口" });
  const trial = mainDb.prepare('SELECT expires_at FROM admin_trials WHERE user_id=?').get(req.user.id);
  const user = mainDb.prepare('SELECT * FROM yonghu WHERE id=?').get(req.user.id);
  if (!trial || !user || trial.expires_at <= Date.now()) return res.status(401).json({ message: '体验已到期，请填写高校管理员认证号' });
  const connection = trialDatabase(user, trial.expires_at);
  databaseContext.run(connection, next);
}

export function closeTrialDatabases() {
  for (const connection of connections.values()) if (connection.open) connection.close();
  connections.clear();
}
