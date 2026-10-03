import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, zhanghao: user.zhanghao, role: user.role || 'user', schoolId: user.school_id || user.schoolId, development: Boolean(user.development) },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ code: 401, message: '未登录或登录已过期' });
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    if (req.user.development && config.nodeEnv !== 'development') throw new Error('Development session disabled');
    next();
  } catch {
    return res.status(401).json({ code: 401, message: '未登录或登录已过期' });
  }
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try { const user=jwt.verify(token, config.jwtSecret);if(!user.development||config.nodeEnv==='development')req.user=user; } catch { /* public endpoints remain usable with expired sessions */ }
  }
  next();
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '需要管理员权限' });
    }
    next();
  });
}
