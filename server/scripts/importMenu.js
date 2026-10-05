import { db,initDatabase } from '../database.js';
import {normalizeRestaurants,ensureSeatCapacity} from '../services/restaurantTopology.js';
import {syncDishImages} from '../services/dishImages.js';
import { seedReferenceData } from '../seed.js';
initDatabase();
seedReferenceData(db,{refreshMenu:true,preserveCommerce:true});
db.transaction(()=>{normalizeRestaurants(db);ensureSeatCapacity(db);syncDishImages(db);})();
console.log('菜单 CSV 已导入，现有库存和订单保留。');
db.close();
