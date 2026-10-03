import { db,initDatabase } from '../database.js';
import { seedReferenceData } from '../seed.js';
initDatabase();
seedReferenceData(db,{refreshMenu:true});
console.log('菜单 CSV 已导入，现有库存和订单保留。');
db.close();
