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

// 加载环境配置
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 中间件配置
app.use(cors({
  origin: 'http://localhost:8000',
  credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// 初始化数据库
try {
  initDatabase();
  console.log('✓ 数据库初始化成功');
} catch (error) {
  console.error('✗ 数据库初始化失败:', error);
  process.exit(1);
}

// API路由
app.use('/api/dishes', dishRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/ai', aiRoutes);

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '智饷食堂API服务正常运行' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('API错误:', err);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: err.message 
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n🚀 智饷食堂API服务已启动`);
  console.log(`📍 监听地址: http://localhost:${PORT}`);
  console.log(`🔗 API文档: http://localhost:${PORT}/api/health\n`);
});
