'use strict';
// 內政部「不動產交易實價查詢服務網」開放資料匯入與行情統計
// 資料來源：https://plvr.land.moi.gov.tw/DownloadOpenData
const AdmZip = require('adm-zip');
const db = require('../db');
const config = require('../config');

const BASE = 'https://plvr.land.moi.gov.tw';
// 本期（最新發布）與指定季別（例如 114S2 = 民國 114 年第 2 季）的 CSV 壓縮檔
const CURRENT_URL = `${BASE}/Download?type=zip&fileName=lvr_landcsv.zip`;
const seasonUrl = (season) => `${BASE}/DownloadSeason?season=${season}&type=zip&fileName=lvr_landcsv.zip`;

const CITY_CODES = {
  a: '臺北市', b: '臺中市', c: '基隆市', d: '臺南市', e: '高雄市', f: '新北市',
  g: '宜蘭縣', h: '桃園市', i: '嘉義市', j: '新竹縣', k: '苗栗縣', m: '南投縣',
  n: '彰化縣', o: '新竹市', p: '雲林縣', q: '嘉義縣', t: '屏東縣', u: '花蓮縣',
  v: '臺東縣', w: '金門縣', x: '澎湖縣', z: '連江縣',
};
const KIND_BY_SUFFIX = { a: 'sale', b: 'presale' }; // c = 租賃，暫不匯入

const SQM_PER_PING = 3.305785;
// 備註含這些字眼視為特殊交易，不列入行情統計（仍保留原始資料）
const SPECIAL_KEYWORDS = [
  '親友', '員工', '特殊關係', '共有人', '瑕疵', '凶宅', '急買急賣', '債權債務', '法拍', '拍賣',
  '政府機關', '標讓售', '合建', '地上權', '含增建', '未登記建物', '毛胚', '受贈', '畸零地', '持分',
];
// 行情統計只計算住宅類建物型態
const RESIDENTIAL_TYPES = ['住宅大樓', '華廈', '公寓', '透天厝', '套房'];

// ---- CSV ----
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function decode(buf) {
  // 新版開放資料為 UTF-8（可能帶 BOM）；保險起見偵測亂碼時改用 Big5
  let text = new TextDecoder('utf-8').decode(buf);
  if (text.includes('�')) {
    try { text = new TextDecoder('big5').decode(buf); } catch { /* 保留 UTF-8 結果 */ }
  }
  return text.replace(/^﻿/, '');
}

const num = (v) => {
  const n = Number(String(v ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
};

// 民國日期 1130315 / 990101 → 2024-03-15
function rocToIso(v) {
  const s = String(v || '').trim();
  if (!/^\d{6,7}$/.test(s)) return null;
  const y = Number(s.slice(0, -4)) + 1911;
  const m = s.slice(-4, -2);
  const d = s.slice(-2);
  if (m < '01' || m > '12') return null;
  return `${y}-${m}-${d === '00' ? '01' : d}`;
}

function normalizeType(raw) {
  const t = String(raw || '').split('(')[0].split('（')[0].trim();
  return t || '其他';
}

function isSpecial(note, target) {
  if (/^(土地|車位)$/.test(target)) return true;
  return SPECIAL_KEYWORDS.some((k) => note.includes(k));
}

// 依欄位名稱取值（容忍欄名微調，例如括號差異）
function columnIndex(header) {
  const clean = (s) => s.replace(/[()（）\s]/g, '');
  const map = new Map(header.map((h, i) => [clean(h), i]));
  return (name) => map.get(clean(name));
}

function parseTradeFile(text, { city, kind, source = 'lvr', importedAt = new Date().toISOString() }) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const col = columnIndex(rows[0]);
  const idx = {
    district: col('鄉鎮市區'), target: col('交易標的'), address: col('土地位置建物門牌'),
    landSqm: col('土地移轉總面積平方公尺'), zoning: col('都市土地使用分區'), date: col('交易年月日'),
    type: col('建物型態'), builtYm: col('建築完成年月'), bldSqm: col('建物移轉總面積平方公尺'),
    total: col('總價元'), unit: col('單價元平方公尺'), note: col('備註'), id: col('編號'),
    project: col('建案名稱'),
  };
  if (idx.date === undefined || idx.id === undefined) throw new Error('CSV 欄位格式不符（找不到交易年月日／編號）');
  const out = [];
  for (const r of rows.slice(1)) {
    const tradeDate = rocToIso(r[idx.date]);
    if (!tradeDate) continue; // 第二列英文標題或壞資料
    const id = String(r[idx.id] || '').trim();
    if (!id) continue;
    const target = String(r[idx.target] || '').trim();
    const note = String(r[idx.note] ?? '').trim();
    out.push({
      id, kind, city,
      district: String(r[idx.district] || '').trim(),
      target,
      address: String(r[idx.address] || '').trim(),
      building_type: normalizeType(r[idx.type]),
      ym: tradeDate.slice(0, 7),
      trade_date: tradeDate,
      total_price: num(r[idx.total]),
      unit_price_sqm: num(r[idx.unit]),
      building_sqm: num(r[idx.bldSqm]),
      land_sqm: num(r[idx.landSqm]),
      zoning: String(r[idx.zoning] ?? '').trim(),
      built_ym: String(r[idx.builtYm] ?? '').trim(),
      project: idx.project !== undefined ? String(r[idx.project] ?? '').trim() : '',
      note,
      special: isSpecial(note, target) ? 1 : 0,
      source,
      imported_at: importedAt,
    });
  }
  return out;
}

function saveTrades(trades) {
  const stmt = db.get().prepare(`INSERT INTO trades (id, kind, city, district, target, address, building_type, ym, trade_date,
      total_price, unit_price_sqm, building_sqm, land_sqm, zoning, built_ym, project, note, special, source, imported_at)
    VALUES (:id, :kind, :city, :district, :target, :address, :building_type, :ym, :trade_date, :total_price, :unit_price_sqm,
      :building_sqm, :land_sqm, :zoning, :built_ym, :project, :note, :special, :source, :imported_at)
    ON CONFLICT(id) DO UPDATE SET total_price = excluded.total_price, unit_price_sqm = excluded.unit_price_sqm,
      note = excluded.note, special = excluded.special, imported_at = excluded.imported_at, source = excluded.source`);
  db.tx(() => {
    for (const t of trades) stmt.run(t);
  });
  return trades.length;
}

// 匯入一個 zip（Buffer），回傳每個縣市筆數
function importZip(buffer, { source = 'lvr' } = {}) {
  const zip = new AdmZip(buffer);
  const importedAt = new Date().toISOString();
  const summary = {};
  for (const entry of zip.getEntries()) {
    const m = entry.entryName.toLowerCase().match(/(?:^|\/)([a-z])_lvr_land_([ab])\.csv$/);
    if (!m) continue;
    const city = CITY_CODES[m[1]];
    const kind = KIND_BY_SUFFIX[m[2]];
    if (!city || !kind) continue;
    const trades = parseTradeFile(decode(entry.getData()), { city, kind, source, importedAt });
    summary[`${city}${kind === 'presale' ? '（預售）' : ''}`] = saveTrades(trades);
  }
  if (!Object.keys(summary).length) throw new Error('壓縮檔內找不到 *_lvr_land_a.csv / _b.csv，請確認下載的是 CSV 格式');
  // 匯入真實資料後清除示範資料，避免混在一起
  if (source !== 'demo') db.get().prepare("DELETE FROM trades WHERE source = 'demo'").run();
  rebuildStats();
  return summary;
}

// ---- 行情統計（預先計算，查詢時不需重算） ----
function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function rebuildStats() {
  const d = db.get();
  const cities = d.prepare('SELECT DISTINCT city FROM trades').all().map((r) => r.city);
  const insert = d.prepare(`INSERT INTO trade_stats (kind, city, district, building_type, ym, n, median_ping, p25_ping, p75_ping, median_total, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const placeholders = RESIDENTIAL_TYPES.map(() => '?').join(',');
  db.tx(() => {
    d.exec('DELETE FROM trade_stats');
    for (const city of cities) {
      const rows = d
        .prepare(`SELECT kind, district, building_type, ym, unit_price_sqm, total_price, source FROM trades
          WHERE city = ? AND special = 0 AND unit_price_sqm > 0 AND building_type IN (${placeholders})`)
        .all(city, ...RESIDENTIAL_TYPES);
      const groups = new Map();
      const add = (key, r) => {
        let g = groups.get(key);
        if (!g) groups.set(key, (g = { ping: [], total: [], sources: new Set() }));
        g.ping.push((r.unit_price_sqm * SQM_PER_PING) / 10000);
        if (r.total_price > 0) g.total.push(r.total_price / 10000);
        g.sources.add(r.source);
      };
      for (const r of rows) {
        for (const district of ['', r.district]) {
          for (const type of ['', r.building_type]) add([r.kind, district, type, r.ym].join('|'), r);
        }
      }
      for (const [key, g] of groups) {
        const [kind, district, type, ym] = key.split('|');
        g.ping.sort((a, b) => a - b);
        g.total.sort((a, b) => a - b);
        const round = (v) => (v == null ? null : Math.round(v * 100) / 100);
        insert.run(kind, city, district, type, ym, g.ping.length, round(quantile(g.ping, 0.5)), round(quantile(g.ping, 0.25)),
          round(quantile(g.ping, 0.75)), round(quantile(g.total, 0.5)), g.sources.has('demo') ? 'demo' : 'lvr');
      }
    }
  });
}

async function download(url) {
  const res = await fetch(url, { headers: { 'User-Agent': config.userAgent }, signal: AbortSignal.timeout(180e3) });
  if (!res.ok) throw new Error(`下載失敗 HTTP ${res.status}：${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000 || buf.readUInt32LE(0) !== 0x04034b50) throw new Error(`下載內容不是 zip 檔：${url}`);
  return buf;
}

// 每日排程：抓「本期」資料；內容沒變（雜湊相同）就跳過
async function run({ season } = {}) {
  const url = season ? seasonUrl(season) : CURRENT_URL;
  const buf = await download(url);
  const hash = require('node:crypto').createHash('sha256').update(buf).digest('hex');
  const key = `lvr_hash_${season || 'current'}`;
  if (db.getSetting(key) === hash) return `資料未變動（${season || '本期'}），略過匯入`;
  const summary = importZip(buf);
  db.setSetting(key, hash);
  db.setSetting('lvr_last_import', { at: new Date().toISOString(), season: season || 'current', summary });
  const total = Object.values(summary).reduce((a, b) => a + b, 0);
  return `匯入 ${season || '本期'} 共 ${total} 筆（${Object.keys(summary).length} 個檔案）`;
}

// 例如 '113S1-114S2' → ['113S1', ..., '114S2']
function expandSeasons(spec) {
  const m = String(spec).trim().toUpperCase().match(/^(\d{3})S([1-4])(?:\s*-\s*(\d{3})S([1-4]))?$/);
  if (!m) throw new Error('季別格式應為 113S1 或 113S1-114S2');
  let y = Number(m[1]);
  let q = Number(m[2]);
  const endY = Number(m[3] || m[1]);
  const endQ = Number(m[4] || m[2]);
  const out = [];
  while (y < endY || (y === endY && q <= endQ)) {
    out.push(`${y}S${q}`);
    if (++q > 4) { q = 1; y++; }
    if (out.length > 60) throw new Error('一次最多回補 60 季');
  }
  return out;
}

module.exports = {
  CITY_CODES, RESIDENTIAL_TYPES, SQM_PER_PING, CURRENT_URL, seasonUrl,
  parseCsv, decode, rocToIso, normalizeType, isSpecial, parseTradeFile, saveTrades, importZip, rebuildStats,
  expandSeasons, run,
};
