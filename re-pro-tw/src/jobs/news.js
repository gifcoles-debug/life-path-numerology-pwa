'use strict';
// 每日資訊：從 data/feeds.json 列出的 RSS／Atom 來源抓取標題與連結（只存標題與原文連結，不轉載內文）
const { XMLParser } = require('fast-xml-parser');
const db = require('../db');
const config = require('../config');
const feeds = require('../../data/feeds.json');

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@', textNodeName: '#text' });
const text = (v) => (v == null ? '' : typeof v === 'object' ? String(v['#text'] ?? '') : String(v)).trim();
const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

function parseFeed(xml, feed) {
  const doc = parser.parse(xml);
  const items = [];
  if (doc.rss) {
    for (const it of arr(doc.rss.channel?.item)) {
      let title = text(it.title);
      let source = text(it.source) || feed.name;
      // Google 新聞標題格式為「標題 - 媒體名稱」
      if (feed.kind === 'google-news') {
        const m = title.match(/^(.*) - ([^-]+)$/);
        if (m) { title = m[1].trim(); source = text(it.source) || m[2].trim(); }
      }
      items.push({ title, link: text(it.link), source, published: text(it.pubDate) });
    }
  } else if (doc.feed) {
    for (const it of arr(doc.feed.entry)) {
      const links = arr(it.link);
      const link = (links.find((l) => !l['@rel'] || l['@rel'] === 'alternate') || links[0] || {})['@href'] || text(it.link);
      items.push({ title: text(it.title), link, source: feed.name, published: text(it.updated || it.published) });
    }
  }
  return items
    .filter((i) => i.title && /^https?:\/\//.test(i.link))
    .map((i) => {
      const t = Date.parse(i.published);
      return { ...i, published: Number.isFinite(t) ? new Date(t).toISOString() : null };
    });
}

function saveItems(feed, items, fetchedAt = new Date().toISOString()) {
  const stmt = db.get().prepare(`INSERT INTO news (feed_id, category, title, link, source, published_at, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(link) DO NOTHING`);
  let added = 0;
  db.tx(() => {
    for (const i of items) added += Number(stmt.run(feed.id, feed.category, i.title, i.link, i.source, i.published || fetchedAt, fetchedAt).changes);
  });
  return added;
}

async function run() {
  const results = [];
  for (const feed of feeds.feeds.filter((f) => f.enabled !== false)) {
    try {
      const res = await fetch(feed.url, { headers: { 'User-Agent': config.userAgent }, signal: AbortSignal.timeout(20e3) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = parseFeed(await res.text(), feed);
      results.push({ id: feed.id, ok: true, added: saveItems(feed, items.slice(0, 60)) });
    } catch (e) {
      results.push({ id: feed.id, ok: false, error: e.message });
    }
  }
  // 只保留 120 天內的新聞，避免資料庫無限長大
  db.get().prepare("DELETE FROM news WHERE published_at < datetime('now', '-120 days')").run();
  const failed = results.filter((r) => !r.ok);
  const added = results.reduce((a, r) => a + (r.added || 0), 0);
  const msg = `新增 ${added} 則；${results.length - failed.length}/${results.length} 個來源成功`;
  if (failed.length === results.length) throw new Error(`${msg}。全部失敗：${failed.map((f) => `${f.id} ${f.error}`).join('；')}`);
  return failed.length ? `${msg}（失敗：${failed.map((f) => f.id).join('、')}）` : msg;
}

module.exports = { parseFeed, saveItems, run, categories: feeds.categories };
