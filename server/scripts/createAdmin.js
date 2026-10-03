import readline from 'readline';
import bcrypt from 'bcryptjs';
import { db, initDatabase } from '../database.js';

function readSecret(prompt) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    return Promise.reject(new Error('请在交互式终端中运行此命令。'));
  }
  return new Promise(resolve => {
    let value = '';
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const onData = chunk => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\u0003') { process.stdout.write('\n'); process.exit(130); }
        if (char === '\r' || char === '\n') {
          process.stdin.off('data', onData);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ') value += char;
      }
    };
    process.stdin.on('data', onData);
  });
}

let dbInitialized = false;
try {
  initDatabase();
  dbInitialized = true;
  const schools = db.prepare('SELECT id,name FROM universities ORDER BY name').all();
  console.log('可用学校：' + schools.map(school => `${school.id}：${school.name}`).join('；'));
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = prompt => new Promise(resolve => rl.question(prompt, resolve));
  const schoolId = (await ask('管理员所属学校 ID：')).trim();
  const account = (await ask('管理员账号：')).trim();
  rl.close();
  const password = await readSecret('管理员密码（至少 12 位）：');
  if (!schools.some(school => school.id === schoolId)) throw new Error('学校 ID 不存在。');
  if (!/^[\p{L}\p{N}_.-]{3,32}$/u.test(account)) throw new Error('账号需为 3 至 32 位字母、数字、点、下划线或短横线。');
  if (password.length < 12 || password.length > 128) throw new Error('密码长度需为 12 至 128 位。');
  const hash = bcrypt.hashSync(password, 12);
  const existing = db.prepare('SELECT id,school_id AS schoolId FROM yonghu WHERE zhanghao=?').get(account);
  if (existing) {
    if (existing.schoolId !== schoolId) throw new Error('该账号已绑定其他学校，请使用独立账号。');
    db.prepare("UPDATE yonghu SET mima=?,role='admin' WHERE id=?").run(hash, existing.id);
    console.log('管理员账号已更新。');
  } else {
    db.prepare("INSERT INTO yonghu(zhanghao,mima,xingming,jine,role,school_id) VALUES(?,?,?,0,'admin',?)")
      .run(account, hash, account, schoolId);
    console.log('管理员账号已创建。');
  }
} catch (error) {
  console.error('管理员初始化失败：' + error.message);
  process.exitCode = 1;
} finally {
  if (dbInitialized) db.close();
}
