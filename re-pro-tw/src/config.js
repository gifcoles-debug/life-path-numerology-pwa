'use strict';
const fs = require('node:fs');
const path = require('node:path');

// 讀取 .env（不依賴套件；已存在的環境變數優先）
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const root = path.join(__dirname, '..');
const storageDir = path.resolve(root, process.env.STORAGE_DIR || './storage');

module.exports = {
  root,
  port: Number(process.env.PORT || 3000),
  production: process.env.NODE_ENV === 'production',
  storageDir,
  dbFile: process.env.DB_FILE || path.join(storageDir, 'repro.db'),
  registrationMode: process.env.REGISTRATION_MODE || 'approval',
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  dailyJobsHour: Number(process.env.DAILY_JOBS_HOUR || 6),
  newsIntervalHours: Number(process.env.NEWS_INTERVAL_HOURS || 3),
  schedulerEnabled: process.env.SCHEDULER_ENABLED !== '0',
  sessionDays: 14,
  timezone: 'Asia/Taipei',
  userAgent: 'Mozilla/5.0 (compatible; REProTW-LinkCheck/0.1)',
};
