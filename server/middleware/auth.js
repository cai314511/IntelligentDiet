import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'zhixiang-dev-secret';
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ 未配置 JWT_SECRET，使用开发默认密钥（生产环境请务必配置）');
}

export function signToken(user) {
  return jwt.sign(
    { id: user.id, zhanghao: user.zhanghao, role: user.role || 'user' },
    JWT_SECRET,
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
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ code: 401, message: '未登录或登录已过期' });
  }
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '需要管理员权限' });
    }
    next();
  });
}
