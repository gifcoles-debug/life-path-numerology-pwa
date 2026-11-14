'use strict';
// 資源整合庫：讀取 data/catalog.json（整個平台的「框架」——模組、分組、外部連結）
const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', 'data', 'catalog.json');
let cache;
let mtime = 0;

function load() {
  const stat = fs.statSync(FILE);
  if (!cache || stat.mtimeMs !== mtime) {
    cache = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    mtime = stat.mtimeMs;
  }
  return cache;
}

function allLinks() {
  const out = [];
  for (const m of load().modules) {
    for (const g of m.groups || []) {
      for (const item of g.items || []) out.push({ ...item, module: m.id, group: g.title });
    }
  }
  return out;
}

// 檢查目錄格式，避免手動編輯時打錯（測試與啟動時都會跑）
function validate(catalog = load()) {
  const errors = [];
  const trust = Object.keys(catalog.trustLevels || {});
  const access = Object.keys(catalog.accessTypes || {});
  const ids = new Set();
  for (const m of catalog.modules) {
    if (!m.id || ids.has(m.id)) errors.push(`模組 id 重複或缺少：${m.id}`);
    ids.add(m.id);
    for (const g of m.groups || []) {
      for (const it of g.items || []) {
        const where = `${m.id} / ${g.title} / ${it.name}`;
        if (!it.name || !it.url) errors.push(`${where}：缺少 name 或 url`);
        try { const u = new URL(it.url); if (u.protocol !== 'https:' && u.protocol !== 'http:') throw 0; } catch { errors.push(`${where}：網址格式錯誤 ${it.url}`); }
        if (!trust.includes(it.trust)) errors.push(`${where}：trust 必須是 ${trust.join('/')}`);
        if (!access.includes(it.access)) errors.push(`${where}：access 必須是 ${access.join('/')}`);
      }
    }
  }
  return errors;
}

module.exports = { load, allLinks, validate };
