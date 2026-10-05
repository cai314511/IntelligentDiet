import {db} from '../database.js';import {catalog} from '../services/catalog.js';import {supplementDiary} from '../services/supplementDiary.js';
const [id,school]=process.argv.slice(2);if(!/^\d+$/.test(id||'')||!['cufe','bjfu','tju'].includes(school))throw new Error('用法：node server/scripts/supplementDiary.js 用户ID 学校ID');
const file=new URL(`../../userdata/nutrition-before-supplement-${Date.now()}.db`,import.meta.url).pathname;
await db.backup(file);console.log(JSON.stringify({...supplementDiary(db,{userId:Number(id),schoolId:school},catalog(school).dishes),backup:file},null,2));db.close();
