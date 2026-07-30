import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
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

// 加载环境配置
dotenv.config();

const app = express();

// CORS：允许 C 端(8000) 与 B 端(8000/5500/3000 等本地端口) 访问
const allowedOrigins = (process.env.CORS_ORIGIN ||
  'http://localhost:8000,http://127.0.0.1:8000,http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000'
).split(',');

app.use(cors({
  origin: (origin, callback) => {
    // 无 origin（同源/curl/服务器间调用）直接放行
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS 拦截: ${origin}`));
  },
  credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// 初始化数据库
initDatabase();

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

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '智饷食堂API服务正常运行' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('API错误:', err);
  res.status(500).json({
    code: 500,
    error: '服务器内部错误',
    message: err.message
  });
});

export default app;
