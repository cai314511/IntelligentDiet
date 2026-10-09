import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { mainDb } from '../database.js';
export function initAdminAccess() {
  // 保留历史体验记录，正式高校不再新建免认证会话。
  mainDb.exec('CREATE TABLE IF NOT EXISTS admin_certificates (school_id TEXT PRIMARY KEY, code_hash TEXT NOT NULL); CREATE TABLE IF NOT EXISTS admin_trials (user_id INTEGER PRIMARY KEY REFERENCES yonghu(id), expires_at INTEGER NOT NULL);');
}
export function issueCertificate(schoolId) {
  if (!mainDb.prepare('SELECT 1 FROM universities WHERE id=?').get(schoolId)) throw new Error('学校不存在');
  const code = 'ZX-' + randomBytes(24).toString('hex');
  mainDb.prepare('INSERT INTO admin_certificates VALUES(?,?) ON CONFLICT(school_id) DO UPDATE SET code_hash=excluded.code_hash').run(schoolId, createHash('sha256').update(code).digest('hex'));
  return code;
}
export function validCertificate(schoolId, code) {
  const row = mainDb.prepare('SELECT code_hash FROM admin_certificates WHERE school_id=?').get(schoolId);
  const hash = createHash('sha256').update(String(code || '').trim()).digest();
  return Boolean(row && timingSafeEqual(Buffer.from(row.code_hash, 'hex'), hash));
}
export function isolateTrial(req, res, next) {
  if (/^\/users\/(login|register|schools)$/.test(req.path.toLowerCase().replace(/\/+$/, ''))) return next();
  if (req.headers.authorization && !req.user) return res.status(401).json({ message: '登录已到期，请重新进入' });
  if (req.user?.trial) return res.status(403).json({message:'高校体验入口已关闭，请在院校栏选择演示数据'});
  next();
}
