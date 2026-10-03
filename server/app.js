import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { config } from './config.js';
import { optionalAuth } from './middleware/auth.js';
import { initDatabase } from './database.js';
import dishRoutes from './routes/dishes.js';
import restaurantRoutes from './routes/restaurants.js';
import userRoutes from './routes/users.js';
import orderRoutes from './routes/orders.js';
import recipeRoutes from './routes/recipes.js';
import socialRoutes from './routes/social.js';
import activityRoutes from './routes/activities.js';
import aiRoutes from './routes/ai.js';
import statsRoutes from './routes/stats.js';
import operationsRoutes from './routes/operations.js';

import workspaceRoutes from './routes/workspace.js';
import nutritionRoutes from './routes/nutrition.js';
import tasksRoutes from './routes/tasks.js';
import insightsRoutes from './routes/insights.js';
import communityRoutes from './routes/community.js';

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin denied'));
  },
  credentials: true
}));
app.use(bodyParser.json({ limit: '6mb' }));
app.use(bodyParser.urlencoded({ limit: '100kb', extended: false }));
app.disable('x-powered-by');

// 初始化数据库
initDatabase();

app.use('/api', optionalAuth);

// API路由
app.use('/api/dishes', dishRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/operations', operationsRoutes);

app.use('/api/workspace', workspaceRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/community', communityRoutes);

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '智饷食堂API服务正常运行', aiConfigured: Boolean(config.aiBaseUrl && config.aiApiKey && config.aiModel) });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error('API错误:', err.message);
  if (err.message === 'CORS origin denied') {
    return res.status(403).json({ code: 403, message: '该网页地址未获本地 API 授权' });
  }
  res.status(500).json({
    code: 500,
    error: '服务器内部错误',
    message: config.nodeEnv === 'development' ? err.message : '请求暂时无法完成'
  });
});

export default app;
