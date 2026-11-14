'use strict';
const path = require('node:path');
const express = require('express');
const config = require('./src/config');
const db = require('./src/db');
const auth = require('./src/auth');
const catalog = require('./src/catalog');
const scheduler = require('./src/scheduler');
const { router } = require('./src/routes');

function createApp() {
  db.open();
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');

  // 基本安全標頭
  app.use((_req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });

  app.use(auth.loadUser);

  // 防止跨站請求：會改資料的 API 必須來自本站
  app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.headers.origin;
    if (origin && new URL(origin).host !== req.headers.host) return res.status(403).json({ error: '跨站請求被拒絕' });
    next();
  });
  app.use('/api', express.json({ limit: '200kb' }), router);
  app.use('/api', (_req, res) => res.status(404).json({ error: '找不到這個 API' }));

  const pub = path.join(__dirname, 'public');
  app.use('/assets', express.static(path.join(pub, 'assets'), { maxAge: '1h' }));
  const chartJs = path.join(__dirname, 'node_modules', 'chart.js', 'dist', 'chart.umd.min.js');
  app.get('/vendor/chart.umd.js', (_req, res) => res.sendFile(chartJs, { maxAge: '7d' }));
  app.get('/favicon.svg', (_req, res) => res.sendFile(path.join(pub, 'favicon.svg')));

  // 會員制：未登入一律導向登入頁
  app.get('/login', (req, res) => (req.user ? res.redirect('/') : res.sendFile(path.join(pub, 'login.html'))));
  app.get('/', (req, res) => (req.user ? res.sendFile(path.join(pub, 'app.html')) : res.redirect('/login')));
  app.use((_req, res) => res.redirect('/'));

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.expose ? err.message : '伺服器錯誤' });
  });
  return app;
}

// 第一次啟動：若設定了 ADMIN_EMAIL / ADMIN_PASSWORD 且尚無管理員，自動建立
function bootstrapAdmin() {
  const d = db.get();
  if (d.prepare("SELECT 1 FROM users WHERE role = 'admin'").get()) return;
  if (!config.adminEmail || !config.adminPassword) {
    console.warn('⚠ 尚未建立管理員。請執行：npm run create-admin -- 你的Email 你的密碼');
    return;
  }
  const err = auth.validatePassword(config.adminPassword);
  if (err) return console.warn(`⚠ ADMIN_PASSWORD 不符規則：${err}`);
  d.prepare("INSERT INTO users (email, name, password_hash, role, status, plan) VALUES (?, '管理員', ?, 'admin', 'active', 'enterprise')")
    .run(config.adminEmail.toLowerCase(), auth.hashPassword(config.adminPassword));
  console.log(`✔ 已建立管理員 ${config.adminEmail}`);
}

if (require.main === module) {
  const errors = catalog.validate();
  if (errors.length) {
    console.error('data/catalog.json 格式錯誤：\n' + errors.join('\n'));
    process.exit(1);
  }
  const app = createApp();
  bootstrapAdmin();
  scheduler.start();
  setInterval(auth.cleanupSessions, 3600e3).unref();
  app.listen(config.port, () => console.log(`不動產最強工具 已啟動：http://localhost:${config.port}`));
}

module.exports = { createApp, bootstrapAdmin };
