import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareLocal} from './prepare-local.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
prepareLocal(root);
const port=process.env.PORT||'5010',frontend=process.env.FRONTEND_PORT||'8000';
const children=[];
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM');process.exitCode=code;}
for(const [file,cwd,extra] of [
 ['server.js',path.join(root,'server'),{PORT:port,DB_PATH:path.join(root,'userdata/zhixiang.db'),USERDATA_DIR:path.join(root,'userdata')}],
 ['scripts/serve-frontend.mjs',root,{FRONTEND_PORT:frontend,API_TARGET:`http://127.0.0.1:${port}`}],
]){
 const child=spawn(process.execPath,[file],{cwd,env:{...process.env,...extra},stdio:'inherit'});
 children.push(child);
 child.on('error',error=>{console.error(error.message);stop(1);});
 child.on('exit',code=>{if(!stopping)stop(code||1);});
}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
console.log(`智饷访问地址：http://localhost:${frontend}/（API ${port}）`);
