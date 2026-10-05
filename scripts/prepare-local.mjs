import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function prepareLocal(base=root){
 const snapshot=path.join(base,'userdata/snapshots/local-state.db');
 const runtime=path.join(base,'userdata/zhixiang.db');
 const manifest=JSON.parse(fs.readFileSync(path.join(base,'userdata/snapshots/manifest.json'),'utf8'));
 const digest=createHash('sha256').update(fs.readFileSync(snapshot)).digest('hex');
 if(digest!==manifest.database.sha256)throw new Error('数据库快照校验失败，请重新拉取仓库');
 if(!fs.existsSync(runtime)){fs.copyFileSync(snapshot,runtime,fs.constants.COPYFILE_EXCL);console.log('已恢复随仓库发布的本地业务数据快照');}
 else console.log('保留已有业务数据库');
 const env=path.join(base,'server/.env');
 if(!fs.existsSync(env)){fs.copyFileSync(path.join(base,'server/.env.example'),env,fs.constants.COPYFILE_EXCL);console.log('已创建 server/.env；在线 AI 请填写 DEEPSEEK_API_KEY');}
 return runtime;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))prepareLocal();
