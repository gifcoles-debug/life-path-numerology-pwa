'use strict';
// 用法：npm run create-admin -- you@example.com 你的密碼 [姓名]
const db = require('../src/db');
const auth = require('../src/auth');

const [email, password, name = '管理員'] = process.argv.slice(2);
if (!email || !password) {
  console.error('用法：npm run create-admin -- you@example.com 你的密碼 [姓名]');
  process.exit(1);
}
const err = auth.validatePassword(password);
if (err) {
  console.error(err);
  process.exit(1);
}
const d = db.open();
const existing = d.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
if (existing) {
  d.prepare("UPDATE users SET role = 'admin', status = 'active', plan = 'enterprise', password_hash = ? WHERE id = ?")
    .run(auth.hashPassword(password), existing.id);
  console.log(`✔ 已將 ${email} 設為管理員並更新密碼`);
} else {
  d.prepare("INSERT INTO users (email, name, password_hash, role, status, plan) VALUES (?, ?, ?, 'admin', 'active', 'enterprise')")
    .run(email.toLowerCase(), name, auth.hashPassword(password));
  console.log(`✔ 已建立管理員 ${email}`);
}
