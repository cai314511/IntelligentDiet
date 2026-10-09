import { initDatabase, mainDb } from '../database.js';
import { initAdminAccess, issueCertificate } from '../services/adminAccess.js';
const schoolId = process.argv[2];
if (!schoolId) {
  console.error('用法：node server/scripts/issueAdminCertificate.js 学校编号');
  process.exitCode = 1;
} else {
  try {
    initDatabase();
    initAdminAccess();
    console.log('学校：' + schoolId + '\n管理员认证号（请私下分发）：' + issueCertificate(schoolId));
    console.log('重新执行会替换该校旧认证号，已认证账号不受影响。');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { mainDb.close(); }
}
