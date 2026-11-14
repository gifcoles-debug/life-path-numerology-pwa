'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

let db;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  profession TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
  plan TEXT NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic','pro','enterprise')),
  plan_expires_at TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS invites (
  code TEXT PRIMARY KEY,
  plan TEXT NOT NULL DEFAULT 'basic',
  days INTEGER NOT NULL DEFAULT 30,
  max_uses INTEGER NOT NULL DEFAULT 1,
  uses INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS points_ledger (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS link_status (
  url TEXT PRIMARY KEY,
  level TEXT NOT NULL,          -- ok | warn | fail
  http_status INTEGER,
  ms INTEGER,
  error TEXT,
  final_url TEXT,
  checked_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY,
  feed_id TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  link TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT '',
  published_at TEXT,
  fetched_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS news_cat_pub ON news(category, published_at DESC);
CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,           -- 實價登錄「編號」
  kind TEXT NOT NULL,            -- sale 買賣 | presale 預售屋
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  target TEXT NOT NULL,          -- 交易標的
  address TEXT NOT NULL DEFAULT '',
  building_type TEXT NOT NULL,   -- 正規化後的建物型態
  ym TEXT NOT NULL,              -- 交易年月（西元 YYYY-MM）
  trade_date TEXT NOT NULL,      -- 西元 YYYY-MM-DD
  total_price INTEGER,
  unit_price_sqm REAL,           -- 元/平方公尺（原始資料）
  building_sqm REAL,
  land_sqm REAL,
  zoning TEXT NOT NULL DEFAULT '',
  built_ym TEXT NOT NULL DEFAULT '',
  project TEXT NOT NULL DEFAULT '', -- 預售屋建案名稱
  note TEXT NOT NULL DEFAULT '',
  special INTEGER NOT NULL DEFAULT 0, -- 1 = 特殊交易（親友、瑕疵…）不列入行情
  source TEXT NOT NULL,          -- lvr | demo
  imported_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS trades_city_ym ON trades(city, ym);
CREATE TABLE IF NOT EXISTS trade_stats (
  kind TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,        -- '' = 全市
  building_type TEXT NOT NULL,   -- '' = 全部住宅類
  ym TEXT NOT NULL,
  n INTEGER NOT NULL,
  median_ping REAL,              -- 單價中位數（萬元/坪）
  p25_ping REAL,
  p75_ping REAL,
  median_total REAL,             -- 總價中位數（萬元）
  source TEXT NOT NULL,
  PRIMARY KEY (kind, city, district, building_type, ym)
);
CREATE TABLE IF NOT EXISTS transcript_requests (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,        -- land_reg | building_reg | cadastral_map | building_survey | land_value
  city TEXT NOT NULL,
  district TEXT NOT NULL DEFAULT '',
  section TEXT NOT NULL DEFAULT '', -- 段／小段
  number TEXT NOT NULL,          -- 地號或建號
  memo TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft', -- draft | applied | done
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS job_runs (
  id INTEGER PRIMARY KEY,
  job TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  ok INTEGER,
  message TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

function open(file = config.dbFile) {
  if (db) return db;
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec(SCHEMA);
  return db;
}

function get() {
  return db || open();
}

function close() {
  if (db) db.close();
  db = undefined;
}

function tx(fn) {
  const d = get();
  d.exec('BEGIN');
  try {
    const r = fn(d);
    d.exec('COMMIT');
    return r;
  } catch (e) {
    d.exec('ROLLBACK');
    throw e;
  }
}

function getSetting(key, fallback = null) {
  const row = get().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? JSON.parse(row.value) : fallback;
}

function setSetting(key, value) {
  get()
    .prepare('INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, JSON.stringify(value));
}

module.exports = { open, get, close, tx, getSetting, setSetting };
