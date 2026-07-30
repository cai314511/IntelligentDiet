import app from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 智饷食堂API服务已启动`);
  console.log(`📍 监听地址: http://localhost:${PORT}`);
  console.log(`🔗 API文档: http://localhost:${PORT}/api/health\n`);
});
