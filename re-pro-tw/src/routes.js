'use strict';
const express = require('express');
const crypto = require('node:crypto');
const db = require('./db');
const config = require('./config');
const auth = require('./auth');
const catalog = require('./catalog');
const scheduler = require('./scheduler');
const transcripts = require('./transcripts');

const router = express.Router();
const SIX_CITIES = ['臺北市', '新北市', '桃園市', '臺中市', '臺南市', '高雄市'];
const PROFESSIONS = ['房仲／經紀人員', '地政士（代書）', '開發商／建商', '土地開發', '估價師', '室內設計', '金融／保險', '其他'];

const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
const str = (v, max = 100) => String(v ?? '').trim().slice(0, max);
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const clientIp = (req) => req.ip || req.socket.remoteAddress || '';

// ---------- 公開：註冊／登入 ----------
router.get('/meta', (_req, res) => {
  res.json({ registrationMode: config.registrationMode, professions: PROFESSIONS });
});

router.post('/auth/register', (req, res) => {
  if (config.registrationMode === 'closed') return bad(res, '目前暫停開放註冊');
  const email = str(req.body.email, 200).toLowerCase();
  const password = String(req.body.password || '');
  const name = str(req.body.name, 50);
  const inviteCode = str(req.body.invite, 40).toUpperCase();
  if (!isEmail(email)) return bad(res, '請輸入正確的 Email');
  if (!name) return bad(res, '請輸入姓名');
  const pwErr = auth.validatePassword(password);
  if (pwErr) return bad(res, pwErr);
  const d = db.get();
  if (d.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) return bad(res, '此 Email 已註冊');

  let invite = null;
  if (inviteCode) {
    invite = d.prepare('SELECT * FROM invites WHERE code = ? AND uses < max_uses').get(inviteCode);
    if (!invite) return bad(res, '邀請碼無效或已用完');
  } else if (config.registrationMode === 'invite') {
    return bad(res, '目前僅開放邀請碼註冊');
  }
  const expires = invite && invite.plan !== 'basic' ? new Date(Date.now() + invite.days * 86400e3).toISOString().slice(0, 10) : null;
  db.tx(() => {
    d.prepare(
      `INSERT INTO users (email, password_hash, name, company, profession, phone, status, plan, plan_expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(email, auth.hashPassword(password), name, str(req.body.company), str(req.body.profession, 30), str(req.body.phone, 30),
      invite ? 'active' : 'pending', invite ? invite.plan : 'basic', expires);
    if (invite) d.prepare('UPDATE invites SET uses = uses + 1 WHERE code = ?').run(inviteCode);
  });
  res.json({
    ok: true,
    status: invite ? 'active' : 'pending',
    message: invite ? '註冊完成，請登入。' : '註冊完成！管理員審核通過後即可登入使用。',
  });
});

router.post('/auth/login', (req, res) => {
  const email = str(req.body.email, 200).toLowerCase();
  const key = `${clientIp(req)}|${email}`;
  if (auth.tooManyAttempts(key)) return bad(res, '登入失敗次數過多，請 15 分鐘後再試', 429);
  const user = db.get().prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !auth.verifyPassword(String(req.body.password || ''), user.password_hash)) {
    auth.recordAttempt(key);
    return bad(res, 'Email 或密碼錯誤', 401);
  }
  if (user.status === 'pending') return bad(res, '帳號審核中，通過後即可登入', 403);
  if (user.status === 'suspended') return bad(res, '帳號已停用，請聯絡管理員', 403);
  auth.clearAttempts(key);
  db.get().prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);
  auth.setSessionCookie(res, auth.createSession(user.id));
  res.json({ ok: true, user: auth.publicUser(user) });
});

router.post('/auth/logout', (req, res) => {
  auth.destroySession(req.sessionToken);
  auth.clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/auth/me', auth.requireUser, (req, res) => res.json({ user: auth.publicUser(req.user) }));

// ---------- 以下皆需登入 ----------
router.use(auth.requireUser);

router.patch('/account', (req, res) => {
  const name = str(req.body.name, 50);
  if (!name) return bad(res, '姓名不可空白');
  db.get()
    .prepare('UPDATE users SET name = ?, company = ?, profession = ?, phone = ? WHERE id = ?')
    .run(name, str(req.body.company), str(req.body.profession, 30), str(req.body.phone, 30), req.user.id);
  res.json({ ok: true });
});

router.post('/account/password', (req, res) => {
  if (!auth.verifyPassword(String(req.body.current || ''), req.user.password_hash)) return bad(res, '目前密碼不正確');
  const err = auth.validatePassword(req.body.next);
  if (err) return bad(res, err);
  const d = db.get();
  d.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(auth.hashPassword(req.body.next), req.user.id);
  // 其他裝置的登入一律登出
  d.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.user.id);
  auth.setSessionCookie(res, auth.createSession(req.user.id));
  res.json({ ok: true });
});

router.get('/account/points', (req, res) => {
  const rows = db.get().prepare('SELECT delta, reason, ref, created_at FROM points_ledger WHERE user_id = ? ORDER BY id DESC LIMIT 50').all(req.user.id);
  res.json({ points: req.user.points, ledger: rows });
});

// ---------- 資源整合庫（含連結確認狀態） ----------
function linkStatusMap() {
  return new Map(db.get().prepare('SELECT * FROM link_status').all().map((r) => [r.url, r]));
}

router.get('/catalog', (_req, res) => {
  const c = catalog.load();
  const status = linkStatusMap();
  const modules = c.modules.map((m) => ({
    ...m,
    groups: (m.groups || []).map((g) => ({
      ...g,
      items: g.items.map((it) => {
        const s = status.get(it.url);
        return { ...it, check: s ? { level: s.level, http: s.http_status, ms: s.ms, error: s.error, at: s.checked_at } : null };
      }),
    })),
  }));
  res.json({ version: c.version, trustLevels: c.trustLevels, accessTypes: c.accessTypes, modules });
});

// ---------- 每日資訊 ----------
const newsCats = () => require('../data/feeds.json').categories;

router.get('/news', (req, res) => {
  const where = [];
  const args = [];
  if (req.query.category && newsCats()[req.query.category]) { where.push('category = ?'); args.push(req.query.category); }
  const q = str(req.query.q, 50);
  if (q) { where.push('title LIKE ?'); args.push(`%${q.replace(/[%_]/g, '')}%`); }
  const limit = Math.min(Number(req.query.limit) || 40, 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const sql = `SELECT id, category, title, link, source, published_at FROM news ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY published_at DESC LIMIT ? OFFSET ?`;
  res.json({ categories: newsCats(), items: db.get().prepare(sql).all(...args, limit, offset) });
});

// ---------- 總覽 ----------
function snapshot(kind = 'sale') {
  const d = db.get();
  return SIX_CITIES.map((city) => {
    const rows = d
      .prepare(`SELECT ym, n, median_ping, source FROM trade_stats WHERE kind = ? AND city = ? AND district = '' AND building_type = ''
        ORDER BY ym DESC LIMIT 18`)
      .all(kind, city);
    // 最近月份因「登錄時差」件數偏少，取件數 ≥ 30 的最新月份作為代表
    const latest = rows.find((r) => r.n >= 30) || rows[0];
    if (!latest) return { city, empty: true };
    const [y, m] = latest.ym.split('-').map(Number);
    const prevYm = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
    const lastYearYm = `${y - 1}-${String(m).padStart(2, '0')}`;
    const prev = rows.find((r) => r.ym === prevYm);
    const lastYear = rows.find((r) => r.ym === lastYearYm);
    const pct = (a, b) => (a && b ? Math.round(((a - b) / b) * 1000) / 10 : null);
    return {
      city, ym: latest.ym, n: latest.n, median: latest.median_ping, source: latest.source,
      mom: pct(latest.median_ping, prev?.median_ping), yoy: pct(latest.median_ping, lastYear?.median_ping),
      spark: rows.slice().reverse().map((r) => r.median_ping),
    };
  });
}

router.get('/dashboard', (req, res) => {
  const d = db.get();
  const cats = newsCats();
  const news = {};
  for (const c of Object.keys(cats)) {
    news[c] = d.prepare('SELECT id, title, link, source, published_at FROM news WHERE category = ? ORDER BY published_at DESC LIMIT 6').all(c);
  }
  const links = d.prepare('SELECT level, COUNT(*) n FROM link_status GROUP BY level').all().reduce((a, r) => ({ ...a, [r.level]: r.n }), {});
  const plan = auth.publicUser(req.user);
  res.json({
    jobs: scheduler.lastRuns(),
    lvr: db.getSetting('lvr_last_import'),
    links: { ...links, total: catalog.allLinks().length },
    newsCategories: cats,
    news,
    market: plan.features.includes('market') ? snapshot() : null,
    demoData: !!d.prepare("SELECT 1 FROM trade_stats WHERE source = 'demo' LIMIT 1").get(),
  });
});

// ---------- 房價走勢（專業會員） ----------
const market = express.Router();
market.use(auth.requireFeature('market'));

market.get('/options', (_req, res) => {
  const d = db.get();
  const rows = d.prepare("SELECT DISTINCT city, district FROM trade_stats WHERE district <> '' ORDER BY city, district").all();
  const districts = {};
  for (const r of rows) (districts[r.city] ||= []).push(r.district);
  const cities = Object.keys(districts).sort((a, b) => {
    const ia = SIX_CITIES.indexOf(a); const ib = SIX_CITIES.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b, 'zh-Hant');
  });
  const range = d.prepare('SELECT MIN(ym) min, MAX(ym) max FROM trade_stats').get();
  res.json({
    cities, districts, types: require('./jobs/lvr').RESIDENTIAL_TYPES, range,
    demo: !!d.prepare("SELECT 1 FROM trade_stats WHERE source = 'demo' LIMIT 1").get(),
    lastImport: db.getSetting('lvr_last_import'),
  });
});

market.get('/trend', (req, res) => {
  const kind = req.query.kind === 'presale' ? 'presale' : 'sale';
  const rows = db
    .get()
    .prepare(`SELECT ym, n, median_ping, p25_ping, p75_ping, median_total, source FROM trade_stats
      WHERE kind = ? AND city = ? AND district = ? AND building_type = ? ORDER BY ym`)
    .all(kind, str(req.query.city), str(req.query.district), str(req.query.type));
  res.json({ rows });
});

market.get('/compare', (req, res) => {
  const kind = req.query.kind === 'presale' ? 'presale' : 'sale';
  const city = str(req.query.city);
  const type = str(req.query.type);
  const months = Math.min(Math.max(Number(req.query.months) || 6, 1), 24);
  const d = db.get();
  const maxYm = d.prepare('SELECT MAX(ym) m FROM trade_stats WHERE kind = ? AND city = ?').get(kind, city)?.m;
  if (!maxYm) return res.json({ rows: [] });
  const [y, m] = maxYm.split('-').map(Number);
  const from = new Date(Date.UTC(y, m - months, 1)).toISOString().slice(0, 7);
  // 各行政區近 N 個月：成交件數加總、以件數加權的單價中位數近似值
  const rows = d
    .prepare(`SELECT district, SUM(n) n, ROUND(SUM(median_ping * n) / SUM(n), 2) median_ping FROM trade_stats
      WHERE kind = ? AND city = ? AND district <> '' AND building_type = ? AND ym >= ? GROUP BY district ORDER BY median_ping DESC`)
    .all(kind, city, type, from);
  res.json({ from, to: maxYm, rows });
});

market.get('/trades', (req, res) => {
  const where = ['kind = ?', 'city = ?'];
  const args = [req.query.kind === 'presale' ? 'presale' : 'sale', str(req.query.city)];
  if (req.query.district) { where.push('district = ?'); args.push(str(req.query.district)); }
  if (req.query.type) { where.push('building_type = ?'); args.push(str(req.query.type)); }
  const rows = db
    .get()
    .prepare(`SELECT district, address, building_type, trade_date, total_price, unit_price_sqm, building_sqm, built_ym, project, note, special, source
      FROM trades WHERE ${where.join(' AND ')} ORDER BY trade_date DESC LIMIT 100`)
    .all(...args);
  res.json({ rows });
});

router.use('/market', market);

// ---------- 謄本中心 ----------
router.get('/transcripts/info', (_req, res) => res.json(transcripts.info()));

router.get('/transcripts/requests', (req, res) => {
  res.json({ rows: db.get().prepare('SELECT * FROM transcript_requests WHERE user_id = ? ORDER BY id DESC LIMIT 200').all(req.user.id) });
});

router.post('/transcripts/requests', (req, res) => {
  const docType = str(req.body.doc_type, 30);
  if (!transcripts.DOC_TYPES[docType]) return bad(res, '請選擇謄本種類');
  const city = str(req.body.city, 10);
  const number = str(req.body.number, 40);
  if (!city || !number) return bad(res, '請填寫縣市與地號／建號');
  const r = db
    .get()
    .prepare('INSERT INTO transcript_requests (user_id, doc_type, city, district, section, number, memo) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(req.user.id, docType, city, str(req.body.district, 20), str(req.body.section, 40), number, str(req.body.memo, 200));
  res.json({ ok: true, id: Number(r.lastInsertRowid) });
});

router.patch('/transcripts/requests/:id', (req, res) => {
  const status = str(req.body.status, 10);
  if (!['draft', 'applied', 'done'].includes(status)) return bad(res, '狀態錯誤');
  db.get().prepare('UPDATE transcript_requests SET status = ? WHERE id = ? AND user_id = ?').run(status, Number(req.params.id), req.user.id);
  res.json({ ok: true });
});

router.delete('/transcripts/requests/:id', (req, res) => {
  db.get().prepare('DELETE FROM transcript_requests WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
  res.json({ ok: true });
});

// ---------- 管理後台 ----------
const admin = express.Router();
admin.use(auth.requireAdmin);

admin.get('/users', (_req, res) => {
  const rows = db.get().prepare('SELECT * FROM users ORDER BY (status = \'pending\') DESC, id DESC').all();
  res.json({ rows: rows.map(auth.publicUser) });
});

admin.patch('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const d = db.get();
  const user = d.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return bad(res, '找不到會員', 404);
  const b = req.body;
  const status = b.status ?? user.status;
  const plan = b.plan ?? user.plan;
  const role = b.role ?? user.role;
  const expires = b.plan_expires_at === undefined ? user.plan_expires_at : b.plan_expires_at || null;
  if (!['pending', 'active', 'suspended'].includes(status)) return bad(res, '狀態錯誤');
  if (!auth.PLANS[plan]) return bad(res, '方案錯誤');
  if (!['member', 'admin'].includes(role)) return bad(res, '角色錯誤');
  if (expires && !/^\d{4}-\d{2}-\d{2}$/.test(expires)) return bad(res, '到期日格式應為 YYYY-MM-DD');
  if (id === req.user.id && (role !== 'admin' || status !== 'active')) return bad(res, '不能停用或降級自己的管理員帳號');
  const delta = Math.trunc(Number(b.pointsDelta) || 0);
  db.tx(() => {
    d.prepare('UPDATE users SET status = ?, plan = ?, role = ?, plan_expires_at = ?, points = points + ? WHERE id = ?').run(status, plan, role, expires, delta, id);
    if (delta) d.prepare('INSERT INTO points_ledger (user_id, delta, reason, ref) VALUES (?, ?, ?, ?)').run(id, delta, str(b.reason, 100) || '管理員調整', `admin:${req.user.id}`);
    if (status !== 'active') d.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  });
  res.json({ ok: true });
});

admin.get('/invites', (_req, res) => res.json({ rows: db.get().prepare('SELECT * FROM invites ORDER BY created_at DESC').all() }));

admin.post('/invites', (req, res) => {
  const plan = auth.PLANS[req.body.plan] ? req.body.plan : 'basic';
  const days = Math.min(Math.max(Number(req.body.days) || 30, 1), 3650);
  const maxUses = Math.min(Math.max(Number(req.body.max_uses) || 1, 1), 1000);
  const code = crypto.randomBytes(5).toString('hex').toUpperCase();
  db.get().prepare('INSERT INTO invites (code, plan, days, max_uses, note) VALUES (?, ?, ?, ?, ?)').run(code, plan, days, maxUses, str(req.body.note, 100));
  res.json({ ok: true, code });
});

admin.delete('/invites/:code', (req, res) => {
  db.get().prepare('DELETE FROM invites WHERE code = ?').run(str(req.params.code, 40));
  res.json({ ok: true });
});

admin.get('/jobs', (_req, res) => {
  res.json({
    jobs: Object.entries(scheduler.JOBS).map(([id, j]) => ({ id, label: j.label, running: scheduler.isRunning(id) })),
    last: scheduler.lastRuns(),
    recent: db.get().prepare('SELECT * FROM job_runs ORDER BY id DESC LIMIT 30').all(),
    config: { dailyJobsHour: config.dailyJobsHour, newsIntervalHours: config.newsIntervalHours, schedulerEnabled: config.schedulerEnabled },
  });
});

admin.post('/jobs/:name/run', async (req, res) => {
  const name = req.params.name;
  if (!scheduler.JOBS[name]) return bad(res, '未知的工作', 404);
  if (name === 'lvr' && req.body.seasons) {
    let seasons;
    try { seasons = require('./jobs/lvr').expandSeasons(req.body.seasons); } catch (e) { return bad(res, e.message); }
    // 回補多季：背景依序執行，立即回應
    (async () => { for (const season of seasons) await scheduler.runJob('lvr', { season }); })().catch(console.error);
    return res.json({ ok: true, message: `已開始回補 ${seasons.length} 季：${seasons.join('、')}` });
  }
  res.json(await scheduler.runJob(name));
});

admin.post('/lvr/upload', express.raw({ type: ['application/zip', 'application/octet-stream'], limit: '300mb' }), (req, res) => {
  if (!Buffer.isBuffer(req.body) || req.body.length < 100) return bad(res, '請上傳實價登錄 CSV 壓縮檔（.zip）');
  try {
    const summary = require('./jobs/lvr').importZip(req.body);
    db.setSetting('lvr_last_import', { at: new Date().toISOString(), season: 'upload', summary });
    res.json({ ok: true, summary });
  } catch (e) {
    bad(res, e.message);
  }
});

admin.get('/links', (_req, res) => {
  const status = linkStatusMap();
  res.json({ rows: catalog.allLinks().map((l) => ({ ...l, check: status.get(l.url) || null })) });
});

router.use('/admin', admin);

module.exports = { router, SIX_CITIES, PROFESSIONS };
