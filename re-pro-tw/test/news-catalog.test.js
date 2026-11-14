'use strict';
process.env.DB_FILE = ':memory:';
const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const news = require('../src/jobs/news');
const catalog = require('../src/catalog');
const { classify } = require('../src/jobs/linkcheck');

const GOOGLE = `<?xml version="1.0"?><rss version="2.0"><channel><title>x</title>
<item><title>台北房價創新高 - 經濟日報</title><link>https://news.example.com/a</link><pubDate>Fri, 13 Nov 2026 08:00:00 GMT</pubDate><source url="https://money.udn.com">經濟日報</source></item>
<item><title>央行理監事會 維持利率 - 中央社 CNA</title><link>https://news.example.com/b</link><pubDate>Fri, 13 Nov 2026 09:00:00 GMT</pubDate></item>
<item><title>壞連結</title><link>javascript:alert(1)</link></item>
</channel></rss>`;
const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>t</title>
<entry><title>都市計畫變更公告</title><link rel="alternate" href="https://gov.example.tw/1"/><updated>2026-11-12T00:00:00Z</updated></entry></feed>`;

test('解析 Google 新聞 RSS：拆出媒體名稱、過濾非 http 連結', () => {
  const items = news.parseFeed(GOOGLE, { kind: 'google-news', name: 'G' });
  assert.equal(items.length, 2);
  assert.equal(items[0].title, '台北房價創新高');
  assert.equal(items[0].source, '經濟日報');
  assert.equal(items[1].source, '中央社 CNA');
  assert.equal(items[0].published, '2026-11-13T08:00:00.000Z');
});

test('解析 Atom', () => {
  const items = news.parseFeed(ATOM, { kind: 'rss', name: '某機關' });
  assert.equal(items[0].link, 'https://gov.example.tw/1');
  assert.equal(items[0].source, '某機關');
});

test('新聞依連結去重', () => {
  db.open(':memory:');
  const feed = { id: 'f', category: 'market' };
  const items = news.parseFeed(GOOGLE, { kind: 'google-news', name: 'G' });
  assert.equal(news.saveItems(feed, items), 2);
  assert.equal(news.saveItems(feed, items), 0);
});

test('資源目錄格式正確、網址不重複', () => {
  assert.deepEqual(catalog.validate(), []);
  const urls = catalog.allLinks().map((l) => l.url);
  assert.ok(urls.length > 50, `連結數 ${urls.length}`);
});

test('feeds.json 每個來源都有分類與授權說明', () => {
  const feeds = require('../data/feeds.json');
  for (const f of feeds.feeds) {
    assert.ok(feeds.categories[f.category], f.id);
    assert.ok(f.license, f.id);
    assert.match(f.url, /^https:\/\//);
  }
});

test('連結確認分級', () => {
  assert.equal(classify(200), 'ok');
  assert.equal(classify(301), 'ok');
  assert.equal(classify(403), 'warn');
  assert.equal(classify(404), 'fail');
  assert.equal(classify(503), 'fail');
});
