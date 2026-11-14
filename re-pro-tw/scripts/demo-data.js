'use strict';
// 產生「示範資料」讓你在還沒匯入實價登錄前先看到圖表長相。
// 數字是隨機產生的，畫面上會明確標示「示範資料（非真實行情）」；匯入真實資料時會自動清除。
// 用法：npm run demo-data          產生
//       npm run demo-data -- --clear 清除
const db = require('../src/db');
const lvr = require('../src/jobs/lvr');

const d = db.open();
if (process.argv.includes('--clear')) {
  d.prepare("DELETE FROM trades WHERE source = 'demo'").run();
  lvr.rebuildStats();
  console.log('✔ 已清除示範資料');
  process.exit(0);
}
if (d.prepare("SELECT 1 FROM trades WHERE source <> 'demo' LIMIT 1").get()) {
  console.error('資料庫已有真實實價登錄資料，不產生示範資料。');
  process.exit(1);
}

// 簡單的可重現亂數，讓每次產生的示範資料一樣
let seed = 20261114;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const CITIES = {
  臺北市: [92, ['大安區', '信義區', '中山區', '內湖區', '士林區', '文山區']],
  新北市: [52, ['板橋區', '新店區', '中和區', '三重區', '新莊區', '淡水區']],
  桃園市: [31, ['桃園區', '中壢區', '龜山區', '八德區', '蘆竹區']],
  臺中市: [36, ['西屯區', '北屯區', '南屯區', '西區', '太平區']],
  臺南市: [28, ['東區', '永康區', '安平區', '北區', '善化區']],
  高雄市: [31, ['左營區', '鼓山區', '三民區', '前鎮區', '鳳山區']],
};
const TYPES = [['住宅大樓', 1.05, 0.5], ['華廈', 0.92, 0.2], ['公寓', 0.78, 0.15], ['透天厝', 0.7, 0.1], ['套房', 1.1, 0.05]];
const pickType = () => { let r = rand(); for (const t of TYPES) { if ((r -= t[2]) <= 0) return t; } return TYPES[0]; };

const now = new Date();
const trades = [];
const importedAt = now.toISOString();
for (const [city, [base, districts]] of Object.entries(CITIES)) {
  districts.forEach((district, di) => {
    const dMul = 1.25 - di * 0.09;
    for (let back = 36; back >= 1; back--) {
      const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
      const growth = 1 + ((36 - back) / 12) * 0.05;
      const count = Math.round((back <= 2 ? 6 : 18) + rand() * 10);
      for (let i = 0; i < count; i++) {
        const [type, tMul] = pickType();
        const ping = base * dMul * tMul * growth * (0.85 + rand() * 0.3);
        const size = type === '套房' ? 12 + rand() * 8 : type === '透天厝' ? 45 + rand() * 40 : 22 + rand() * 30;
        const day = String(1 + Math.floor(rand() * 28)).padStart(2, '0');
        const ym = dt.toISOString().slice(0, 7);
        trades.push({
          id: `DEMO-${city}-${district}-${ym}-${i}`, kind: 'sale', city, district, target: '房地(土地+建物)',
          address: `${city}${district}示範路${Math.floor(rand() * 300) + 1}號（示範資料）`, building_type: type,
          ym, trade_date: `${ym}-${day}`, total_price: Math.round(ping * size * 1e4), unit_price_sqm: Math.round((ping * 1e4) / lvr.SQM_PER_PING),
          building_sqm: Math.round(size * lvr.SQM_PER_PING * 100) / 100, land_sqm: null, zoning: '住', built_ym: '', project: '',
          note: '', special: 0, source: 'demo', imported_at: importedAt,
        });
      }
    }
  });
}
lvr.saveTrades(trades);
lvr.rebuildStats();
console.log(`✔ 已產生 ${trades.length} 筆示範資料（非真實行情）`);
