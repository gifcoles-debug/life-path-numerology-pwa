'use strict';
const crypto = require('node:crypto');
const db = require('./db');
const config = require('./config');

const COOKIE = 'repro_sid';
const PLANS = {
  basic: { label: '基本會員', features: ['home', 'news', 'directory', 'tools', 'transcripts'] },
  pro: { label: '專業會員', features: ['home', 'news', 'directory', 'tools', 'transcripts', 'market'] },
  enterprise: { label: '企業會員', features: ['home', 'news', 'directory', 'tools', 'transcripts', 'market', 'team'] },
};

// ---- 密碼：scrypt + 隨機 salt ----
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function verifyPassword(password, stored) {
  const [algo, saltB64, hashB64] = String(stored).split('$');
  if (algo !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(actual, expected);
}

function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return '密碼至少 8 個字元';
  if (pw.length > 200) return '密碼太長';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return '密碼需同時包含英文字母與數字';
  return null;
}

// ---- Session：隨機 token，資料庫只存雜湊 ----
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  db.get()
    .prepare('INSERT INTO sessions(token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(sha256(token), userId, now + config.sessionDays * 86400e3, now);
  return token;
}

function destroySession(token) {
  if (token) db.get().prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function setSessionCookie(res, token) {
  const attrs = [`${COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${config.sessionDays * 86400}`];
  if (config.production) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

// 會員方案到期後自動降為基本會員權限（資料不刪除）
function effectivePlan(user) {
  if (user.role === 'admin') return 'enterprise';
  if (user.plan !== 'basic' && user.plan_expires_at && user.plan_expires_at < new Date().toISOString().slice(0, 10)) return 'basic';
  return user.plan;
}

function publicUser(u) {
  const plan = effectivePlan(u);
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    company: u.company,
    profession: u.profession,
    phone: u.phone,
    role: u.role,
    status: u.status,
    plan: u.plan,
    effectivePlan: plan,
    planLabel: PLANS[plan].label,
    planExpiresAt: u.plan_expires_at,
    points: u.points,
    features: u.role === 'admin' ? [...PLANS.enterprise.features, 'admin'] : PLANS[plan].features,
    createdAt: u.created_at,
    lastLoginAt: u.last_login_at,
  };
}

// 從 cookie 取出目前登入者；不阻擋請求
function loadUser(req, _res, next) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  req.sessionToken = token;
  req.user = null;
  if (token) {
    const row = db
      .get()
      .prepare(
        `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > ? AND u.status = 'active'`,
      )
      .get(sha256(token), Date.now());
    if (row) req.user = row;
  }
  next();
}

function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: '請先登入會員' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: '需要管理員權限' });
  next();
}

function requireFeature(feature) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: '請先登入會員' });
    if (!publicUser(req.user).features.includes(feature)) {
      return res.status(403).json({ error: '此功能需升級會員方案', upgrade: true });
    }
    next();
  };
}

// ---- 登入嘗試限制（記憶體版，單機部署足夠） ----
const attempts = new Map();
function tooManyAttempts(key) {
  const now = Date.now();
  const list = (attempts.get(key) || []).filter((t) => now - t < 15 * 60e3);
  attempts.set(key, list);
  return list.length >= 10;
}
function recordAttempt(key) {
  const list = attempts.get(key) || [];
  list.push(Date.now());
  attempts.set(key, list);
}
function clearAttempts(key) {
  attempts.delete(key);
}

function cleanupSessions() {
  db.get().prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
}

module.exports = {
  COOKIE,
  PLANS,
  hashPassword,
  verifyPassword,
  validatePassword,
  createSession,
  destroySession,
  parseCookies,
  setSessionCookie,
  clearSessionCookie,
  effectivePlan,
  publicUser,
  loadUser,
  requireUser,
  requireAdmin,
  requireFeature,
  tooManyAttempts,
  recordAttempt,
  clearAttempts,
  cleanupSessions,
};
