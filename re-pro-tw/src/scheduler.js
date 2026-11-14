'use strict';
// 每日自動更新：新聞每 N 小時；連結確認與實價登錄每天固定時間（台北時間）
const db = require('./db');
const config = require('./config');

const JOBS = {
  news: { label: '每日資訊（新聞 RSS）', run: () => require('./jobs/news').run() },
  linkcheck: { label: '連結確認', run: () => require('./jobs/linkcheck').run() },
  lvr: { label: '實價登錄匯入', run: (opts) => require('./jobs/lvr').run(opts) },
};
const running = new Set();

async function runJob(name, opts) {
  const job = JOBS[name];
  if (!job) throw new Error(`未知的工作：${name}`);
  if (running.has(name)) return { ok: false, message: '這個工作正在執行中' };
  running.add(name);
  const d = db.get();
  const { lastInsertRowid: id } = d.prepare('INSERT INTO job_runs (job, started_at) VALUES (?, ?)').run(name, new Date().toISOString());
  let ok = 1;
  let message;
  try {
    message = await job.run(opts);
  } catch (e) {
    ok = 0;
    message = e.message;
  } finally {
    running.delete(name);
  }
  d.prepare('UPDATE job_runs SET finished_at = ?, ok = ?, message = ? WHERE id = ?').run(new Date().toISOString(), ok, String(message), id);
  return { ok: !!ok, message };
}

function lastRuns() {
  return db
    .get()
    .prepare(`SELECT j.* FROM job_runs j JOIN (SELECT job, MAX(id) id FROM job_runs GROUP BY job) l ON l.id = j.id`)
    .all()
    .reduce((acc, r) => ({ ...acc, [r.job]: r }), {});
}

function lastSuccess(name) {
  return db.get().prepare('SELECT finished_at FROM job_runs WHERE job = ? AND ok = 1 ORDER BY id DESC LIMIT 1').get(name)?.finished_at;
}

function taipeiNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

async function tick() {
  const now = taipeiNow();
  const newsAt = lastSuccess('news');
  if (!newsAt || Date.now() - Date.parse(newsAt) > config.newsIntervalHours * 3600e3) await runJob('news');
  if (now.hour >= config.dailyJobsHour && db.getSetting('daily_jobs_date') !== now.date) {
    db.setSetting('daily_jobs_date', now.date);
    await runJob('linkcheck');
    await runJob('lvr');
  }
}

let timer;
function start() {
  if (!config.schedulerEnabled) return;
  const safeTick = () => tick().catch((e) => console.error('[scheduler]', e));
  setTimeout(safeTick, 5e3);
  timer = setInterval(safeTick, 10 * 60e3);
  timer.unref();
}

module.exports = { JOBS, runJob, lastRuns, start, taipeiNow, isRunning: (n) => running.has(n) };
