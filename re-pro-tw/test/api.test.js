'use strict';
process.env.DB_FILE = ':memory:';
process.env.SCHEDULER_ENABLED = '0';
process.env.REGISTRATION_MODE = 'approval';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');
const db = require('../src/db');
const auth = require('../src/auth');

let server;
let base;
test.before(async () => {
  const app = createApp();
  await new Promise((r) => (server = app.listen(0, r)));
  base = `http://127.0.0.1:${server.address().port}`;
  db.get().prepare("INSERT INTO users (email, name, password_hash, role, status, plan) VALUES ('admin@test.tw', '管理員', ?, 'admin', 'active', 'enterprise')")
    .run(auth.hashPassword('admin12345'));
});
test.after(() => server.close());

async function call(path, { method = 'GET', body, cookie, headers = {} } = {}) {
  const res = await fetch(base + path, {
    method, redirect: 'manual',
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, json, cookie: res.headers.get('set-cookie')?.split(';')[0], location: res.headers.get('location') };
}
const login = async (email, password) => (await call('/api/auth/login', { method: 'POST', body: { email, password } })).cookie;

test('未登入：首頁導向登入頁、API 回 401', async () => {
  assert.equal((await call('/')).location, '/login');
  assert.equal((await call('/api/catalog')).status, 401);
  assert.equal((await call('/login')).status, 200);
});

test('會員註冊 → 待審核 → 管理員開通 → 登入 → 方案權限', async () => {
  const weak = await call('/api/auth/register', { method: 'POST', body: { email: 'a@b.tw', password: 'short', name: '王小明' } });
  assert.equal(weak.status, 400);
  const reg = await call('/api/auth/register', { method: 'POST', body: { email: 'Agent@Test.tw', password: 'house2026', name: '王小明', profession: '房仲／經紀人員' } });
  assert.equal(reg.json.status, 'pending');
  const dup = await call('/api/auth/register', { method: 'POST', body: { email: 'agent@test.tw', password: 'house2026', name: 'x' } });
  assert.equal(dup.status, 400);

  const pending = await call('/api/auth/login', { method: 'POST', body: { email: 'agent@test.tw', password: 'house2026' } });
  assert.equal(pending.status, 403);

  const admin = await login('admin@test.tw', 'admin12345');
  assert.ok(admin);
  const users = await call('/api/admin/users', { cookie: admin });
  const u = users.json.rows.find((x) => x.email === 'agent@test.tw');
  assert.equal((await call(`/api/admin/users/${u.id}`, { method: 'PATCH', cookie: admin, body: { status: 'active' } })).status, 200);

  const member = await login('agent@test.tw', 'house2026');
  const me = await call('/api/auth/me', { cookie: member });
  assert.equal(me.json.user.effectivePlan, 'basic');
  assert.equal((await call('/api/admin/users', { cookie: member })).status, 403);
  const locked = await call('/api/market/options', { cookie: member });
  assert.equal(locked.status, 403);
  assert.equal(locked.json.upgrade, true);

  // 升級專業會員（未過期）→ 可用房價走勢
  await call(`/api/admin/users/${u.id}`, { method: 'PATCH', cookie: admin, body: { plan: 'pro', plan_expires_at: '2099-12-31', pointsDelta: 100, reason: '測試贈點' } });
  assert.equal((await call('/api/market/options', { cookie: member })).status, 200);
  const pts = await call('/api/account/points', { cookie: member });
  assert.equal(pts.json.points, 100);

  // 方案過期 → 自動降回基本會員權限
  await call(`/api/admin/users/${u.id}`, { method: 'PATCH', cookie: admin, body: { plan_expires_at: '2020-01-01' } });
  assert.equal((await call('/api/market/options', { cookie: member })).status, 403);

  // 停用 → 立即失效
  await call(`/api/admin/users/${u.id}`, { method: 'PATCH', cookie: admin, body: { status: 'suspended' } });
  assert.equal((await call('/api/auth/me', { cookie: member })).status, 401);
});

test('邀請碼註冊可立即開通指定方案', async () => {
  const admin = await login('admin@test.tw', 'admin12345');
  const inv = await call('/api/admin/invites', { method: 'POST', cookie: admin, body: { plan: 'pro', days: 30, max_uses: 1 } });
  const reg = await call('/api/auth/register', { method: 'POST', body: { email: 'vip@test.tw', password: 'house2026', name: '陳代書', invite: inv.json.code.toLowerCase() } });
  assert.equal(reg.json.status, 'active');
  const again = await call('/api/auth/register', { method: 'POST', body: { email: 'vip2@test.tw', password: 'house2026', name: 'x', invite: inv.json.code } });
  assert.equal(again.status, 400);
  const c = await login('vip@test.tw', 'house2026');
  assert.equal((await call('/api/auth/me', { cookie: c })).json.user.effectivePlan, 'pro');
});

test('錯誤密碼與跨站請求被拒', async () => {
  assert.equal((await call('/api/auth/login', { method: 'POST', body: { email: 'admin@test.tw', password: 'wrong' } })).status, 401);
  const admin = await login('admin@test.tw', 'admin12345');
  const cross = await call('/api/admin/invites', { method: 'POST', cookie: admin, body: {}, headers: { Origin: 'https://evil.example' } });
  assert.equal(cross.status, 403);
});

test('會員資料：目錄、新聞、謄本需求單、總覽', async () => {
  const admin = await login('admin@test.tw', 'admin12345');
  const cat = await call('/api/catalog', { cookie: admin });
  assert.ok(cat.json.modules.length >= 10);
  assert.equal((await call('/api/news?category=market', { cookie: admin })).status, 200);
  const info = await call('/api/transcripts/info', { cookie: admin });
  assert.equal(info.json.docTypes.find((d) => d.id === 'land_reg').officialFee, 20);
  const bad = await call('/api/transcripts/requests', { method: 'POST', cookie: admin, body: { doc_type: 'x', city: '臺北市', number: '1' } });
  assert.equal(bad.status, 400);
  await call('/api/transcripts/requests', { method: 'POST', cookie: admin, body: { doc_type: 'land_reg', city: '臺北市', district: '大安區', section: '仁愛段', number: '0123-0000' } });
  const list = await call('/api/transcripts/requests', { cookie: admin });
  assert.equal(list.json.rows.length, 1);
  const dash = await call('/api/dashboard', { cookie: admin });
  assert.ok(dash.json.market.every((c) => c.empty));
  assert.equal((await call('/api/auth/logout', { method: 'POST', cookie: admin, body: {} })).status, 200);
  assert.equal((await call('/api/auth/me', { cookie: admin })).status, 401);
});

test('點數扣款：餘額不足整筆取消', () => {
  const { chargePoints } = require('../src/transcripts');
  const id = db.get().prepare("INSERT INTO users (email, name, password_hash, status, points) VALUES ('p@test.tw', 'p', 'x', 'active', 30)").run().lastInsertRowid;
  chargePoints(id, 25, '測試', 'r1');
  assert.throws(() => chargePoints(id, 25, '測試', 'r2'), /點數不足/);
  assert.equal(db.get().prepare('SELECT points FROM users WHERE id = ?').get(id).points, 5);
  assert.equal(db.get().prepare('SELECT COUNT(*) c FROM points_ledger WHERE user_id = ?').get(id).c, 1);
});
