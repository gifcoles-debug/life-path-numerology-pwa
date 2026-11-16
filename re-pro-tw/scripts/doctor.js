'use strict';
// 健康檢查：npm run doctor（沒有外網時加 -- --offline）
// 一次列出環境、資料庫、資料檔、排程與外網狀態。✘ = 必須處理；⚠ = 建議處理。
const fs = require('node:fs');
const config = require('../src/config');

const offline = process.argv.includes('--offline');
const results = [];
const ok = (msg) => results.push(['✔', msg]);
const warn = (msg) => results.push(['⚠', msg]);
const fail = (msg) => results.push(['✘', msg]);

async function main() {
  // 1. 執行環境
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major > 22 || (major === 22 && minor >= 13)) ok(`Node.js ${process.versions.node}`);
  else fail(`Node.js ${process.versions.node}：需要 22.13 以上（內建 SQLite）`);
  if (!fs.existsSync(`${config.root}/.env`)) warn('.env 不存在（使用預設值）；正式環境請由 .env.example 複製後修改');
  if (config.production) ok('NODE_ENV=production（Cookie 啟用 Secure，必須走 HTTPS）');
  else warn('NODE_ENV 不是 production：正式站請改為 production');
  if (!['approval', 'invite', 'closed'].includes(config.registrationMode)) fail(`REGISTRATION_MODE=${config.registrationMode} 無效`);
  if (config.adminPassword) warn('.env 仍有 ADMIN_PASSWORD：管理員建立後請刪除');

  // 2. 資料檔
  try {
    const errors = require('../src/catalog').validate();
    if (errors.length) fail(`data/catalog.json 有 ${errors.length} 個錯誤：${errors.slice(0, 3).join('；')}`);
    else ok(`data/catalog.json 格式正確（${require('../src/catalog').allLinks().length} 個連結）`);
  } catch (e) { fail(`data/catalog.json 無法讀取：${e.message}`); }
  try {
    const feeds = require('../data/feeds.json');
    const active = feeds.feeds.filter((f) => f.enabled !== false);
    const bad = feeds.feeds.filter((f) => !feeds.categories[f.category] || !f.license);
    if (bad.length) fail(`data/feeds.json：${bad.map((f) => f.id).join('、')} 缺分類或授權說明`);
    else ok(`data/feeds.json：${active.length} 個啟用來源`);
  } catch (e) { fail(`data/feeds.json 無法讀取：${e.message}`); }

  // 3. 資料庫
  let d;
  try {
    fs.mkdirSync(config.storageDir, { recursive: true });
    fs.accessSync(config.storageDir, fs.constants.W_OK);
    d = require('../src/db').open();
    ok(`資料庫可寫入：${config.dbFile}`);
  } catch (e) { fail(`資料庫無法開啟：${e.message}`); }
  if (d) {
    const n = (sql) => d.prepare(sql).get().n;
    if (n("SELECT COUNT(*) n FROM users WHERE role='admin' AND status='active'")) ok('已有啟用中的管理員');
    else fail('沒有管理員：npm run create-admin -- you@example.com 密碼');
    const pending = n("SELECT COUNT(*) n FROM users WHERE status='pending'");
    if (pending) warn(`${pending} 位會員等待審核`);
    const demo = n("SELECT COUNT(*) n FROM trades WHERE source='demo'");
    const real = n("SELECT COUNT(*) n FROM trades WHERE source<>'demo'");
    if (demo) warn(`資料庫有 ${demo} 筆示範資料（正式站上線前請 npm run demo-data -- --clear）`);
    if (real) ok(`實價登錄 ${real.toLocaleString()} 筆，期間 ${d.prepare("SELECT MIN(ym) a, MAX(ym) b FROM trades WHERE source<>'demo'").get().a}～${d.prepare("SELECT MAX(ym) b FROM trades WHERE source<>'demo'").get().b}`);
    else warn('尚未匯入真實實價登錄資料');
    const news = n("SELECT COUNT(*) n FROM news WHERE published_at > datetime('now','-2 days')");
    if (news) ok(`近 2 天新聞 ${news} 則`); else warn('近 2 天沒有新聞（排程未跑或來源失效）');
    const failedLinks = n("SELECT COUNT(*) n FROM link_status WHERE level='fail'");
    if (failedLinks) warn(`${failedLinks} 個失效連結：管理後台 → 連結確認`);
    for (const job of ['news', 'linkcheck', 'lvr']) {
      const r = d.prepare('SELECT ok, message, started_at FROM job_runs WHERE job=? ORDER BY id DESC LIMIT 1').get(job);
      if (!r) warn(`排程 ${job}：尚未執行過`);
      else if (r.ok === 0) fail(`排程 ${job} 上次失敗（${r.started_at}）：${r.message}`);
      else ok(`排程 ${job} 上次成功（${r.started_at}）`);
    }
  }

  // 4. 外網（部署主機必過）
  if (offline) warn('已略過外網檢查（--offline）');
  else {
    const hosts = [
      ['實價登錄', 'https://plvr.land.moi.gov.tw/DownloadOpenData'],
      ['Google 新聞', 'https://news.google.com/rss?hl=zh-TW&gl=TW&ceid=TW:zh-Hant'],
      ['電子謄本系統', 'https://ep.land.nat.gov.tw/'],
    ];
    await Promise.all(hosts.map(async ([name, url]) => {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': config.userAgent }, signal: AbortSignal.timeout(10e3) });
        res.body?.cancel?.().catch(() => {});
        if (res.status < 400) ok(`外網：${name} HTTP ${res.status}`); else warn(`外網：${name} HTTP ${res.status}`);
      } catch (e) {
        fail(`外網：${name} 連不到（${e.cause?.code || e.name}）`);
      }
    }));
  }

  for (const [mark, msg] of results) console.log(`${mark} ${msg}`);
  const fails = results.filter((r) => r[0] === '✘').length;
  const warns = results.filter((r) => r[0] === '⚠').length;
  console.log(`\n結果：${fails} 個必須處理、${warns} 個建議處理。${fails ? '除錯流程見 .claude/skills/repro-debug/SKILL.md' : ''}`);
  process.exit(fails ? 1 : 0);
}

main();
