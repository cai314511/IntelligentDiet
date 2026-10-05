import {db} from "./database.js";
import {initNutritionMembership,entitlements} from "./services/nutritionMembership.js";
import app from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🚀 智饷食堂API服务已启动`);
  console.log(`📍 监听地址: http://localhost:${PORT}`);
  console.log(`🔗 API文档: http://localhost:${PORT}/api/health\n`);
});

initNutritionMembership(db);
const renewals=setInterval(()=>{const due=db.prepare("SELECT u.id,u.school_id AS schoolId,u.role FROM nutrition_memberships m JOIN yonghu u ON u.id=m.user_id WHERE m.auto_renew=1 AND m.expires_at<=?").all(new Date().toISOString());for(const user of due){try{entitlements(db,user);}catch(error){console.error('Nutrition membership renewal failed:',error.message);}}},60000);renewals.unref();
