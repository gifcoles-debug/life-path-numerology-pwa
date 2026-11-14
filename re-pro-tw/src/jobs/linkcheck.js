'use strict';
// 「連結確認」：每天檢查資源整合庫中每一個外部連結是否仍可連通
const db = require('../db');
const config = require('../config');
const { allLinks } = require('../catalog');

// ok：可正常開啟；warn：網站有回應但拒絕機器人（401/403/429）或需人工確認；fail：404、5xx、逾時、DNS 錯誤
function classify(status) {
  if (status >= 200 && status < 400) return 'ok';
  if ([401, 403, 405, 429].includes(status)) return 'warn';
  return 'fail';
}

async function checkOne(url) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': config.userAgent, Accept: 'text/html,*/*' },
      signal: AbortSignal.timeout(20e3),
    });
    res.body?.cancel?.().catch(() => {});
    return { url, level: classify(res.status), http_status: res.status, ms: Date.now() - started, error: null, final_url: res.url };
  } catch (e) {
    const reason = e.name === 'TimeoutError' ? '逾時' : e.cause?.code || e.message;
    return { url, level: 'fail', http_status: null, ms: Date.now() - started, error: String(reason), final_url: null };
  }
}

function saveResult(r, at = new Date().toISOString()) {
  db.get()
    .prepare(`INSERT INTO link_status (url, level, http_status, ms, error, final_url, checked_at) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(url) DO UPDATE SET level = excluded.level, http_status = excluded.http_status, ms = excluded.ms,
      error = excluded.error, final_url = excluded.final_url, checked_at = excluded.checked_at`)
    .run(r.url, r.level, r.http_status, r.ms, r.error, r.final_url, at);
}

async function run({ concurrency = 6 } = {}) {
  const urls = [...new Set(allLinks().map((l) => l.url))];
  const queue = [...urls];
  const counts = { ok: 0, warn: 0, fail: 0 };
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (queue.length) {
        const r = await checkOne(queue.shift());
        saveResult(r);
        counts[r.level]++;
      }
    }),
  );
  const msg = `檢查 ${urls.length} 個連結：正常 ${counts.ok}、需留意 ${counts.warn}、失效 ${counts.fail}`;
  if (urls.length && counts.fail === urls.length) throw new Error(`${msg}（可能是伺服器沒有對外網路）`);
  return msg;
}

module.exports = { classify, checkOne, saveResult, run };
