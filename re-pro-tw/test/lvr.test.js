'use strict';
process.env.DB_FILE = ':memory:';
const test = require('node:test');
const assert = require('node:assert/strict');
const AdmZip = require('adm-zip');
const db = require('../src/db');
const lvr = require('../src/jobs/lvr');

const HEADER = '鄉鎮市區,交易標的,土地位置建物門牌,土地移轉總面積平方公尺,都市土地使用分區,非都市土地使用分區,非都市土地使用編定,交易年月日,交易筆棟數,移轉層次,總樓層數,建物型態,主要用途,主要建材,建築完成年月,建物移轉總面積平方公尺,建物現況格局-房,建物現況格局-廳,建物現況格局-衛,建物現況格局-隔間,有無管理組織,總價元,單價元平方公尺,車位類別,車位移轉總面積(平方公尺),車位總價元,備註,編號';
const ENGLISH = 'The villages and towns urban district,transaction sign,land sector position building sector house number plate,land shifting total area square meter,the use zoning or compiles and checks,the non-metropolis land use district,non-metropolis land use,transaction year month and day,transaction pen number,shifting level,total floor number,building state,main use,main building materials,construction to complete the years,building shifting total area,Building present situation pattern - room,building present situation pattern - hall,building present situation pattern - health,building present situation pattern - compartmented,Whether there is manages the organization,total price NTD,the unit price (NTD / square meter),the berth category,berth shifting total area square meter,the berth total price NTD,the note,serial number';
const row = (id, date, type, unit, note = '', target = '房地(土地+建物)') =>
  `大安區,${target},"臺北市大安區和平東路,1段",20.5,住,,,${date},土地1建物1車位0,五層,十二層,${type},住家用,鋼筋混凝土造,1000101,100.0,3,2,2,有,有,${unit * 100},${unit},,0,0,${note},${id}`;
const CSV = '﻿' + [HEADER, ENGLISH,
  row('A1', '1130305', '住宅大樓(11層含以上有電梯)', 300000),
  row('A2', '1130320', '住宅大樓(11層含以上有電梯)', 330000),
  row('A3', '1130322', '公寓(5樓含以下無電梯)', 200000),
  row('A4', '1130325', '住宅大樓(11層含以上有電梯)', 900000, '親友間交易'),
  row('A5', '1130401', '華廈(10層含以下有電梯)', 270000),
].join('\r\n') + '\r\n';

test('民國日期轉西元', () => {
  assert.equal(lvr.rocToIso('1130315'), '2024-03-15');
  assert.equal(lvr.rocToIso('990101'), '2010-01-01');
  assert.equal(lvr.rocToIso('transaction year'), null);
  assert.equal(lvr.rocToIso('1131315'), null);
});

test('CSV 解析支援引號內逗號', () => {
  assert.deepEqual(lvr.parseCsv('a,"b,c",d\r\n1,2,3\n'), [['a', 'b,c', 'd'], ['1', '2', '3']]);
});

test('建物型態正規化與特殊交易判斷', () => {
  assert.equal(lvr.normalizeType('住宅大樓(11層含以上有電梯)'), '住宅大樓');
  assert.equal(lvr.isSpecial('親友間交易', '房地(土地+建物)'), true);
  assert.equal(lvr.isSpecial('', '車位'), true);
  assert.equal(lvr.isSpecial('', '房地(土地+建物)'), false);
});

test('解析實價登錄 CSV：略過英文標題列、標記特殊交易', () => {
  const trades = lvr.parseTradeFile(lvr.decode(Buffer.from(CSV)), { city: '臺北市', kind: 'sale' });
  assert.equal(trades.length, 5);
  assert.equal(trades[0].address, '臺北市大安區和平東路,1段');
  assert.equal(trades[0].ym, '2024-03');
  assert.equal(trades[3].special, 1);
  assert.equal(trades[4].building_type, '華廈');
});

test('匯入 zip 並計算單價中位數（排除特殊交易）', () => {
  db.open(':memory:');
  const zip = new AdmZip();
  zip.addFile('a_lvr_land_a.csv', Buffer.from(CSV));
  zip.addFile('a_lvr_land_a_build.csv', Buffer.from('ignored'));
  zip.addFile('manifest.csv', Buffer.from('ignored'));
  const summary = lvr.importZip(zip.toBuffer());
  assert.deepEqual(summary, { 臺北市: 5 });
  const s = db.get().prepare("SELECT * FROM trade_stats WHERE city='臺北市' AND district='' AND building_type='' AND ym='2024-03'").get();
  assert.equal(s.n, 3); // A4 為親友交易，排除
  // 中位數 = 300000 元/㎡ → 99.17 萬/坪
  assert.equal(s.median_ping, Math.round(((300000 * lvr.SQM_PER_PING) / 10000) * 100) / 100);
  const byType = db.get().prepare("SELECT n FROM trade_stats WHERE city='臺北市' AND district='大安區' AND building_type='住宅大樓' AND ym='2024-03'").get();
  assert.equal(byType.n, 2);
  // 重複匯入同一份資料不會重複計算
  lvr.importZip(zip.toBuffer());
  assert.equal(db.get().prepare('SELECT COUNT(*) c FROM trades').get().c, 5);
});

test('真實資料匯入時清除示範資料', () => {
  lvr.saveTrades([{ id: 'DEMO-1', kind: 'sale', city: '臺北市', district: '大安區', target: '房地', address: '', building_type: '公寓', ym: '2024-03', trade_date: '2024-03-01',
    total_price: 1, unit_price_sqm: 1, building_sqm: 1, land_sqm: null, zoning: '', built_ym: '', project: '', note: '', special: 0, source: 'demo', imported_at: '' }]);
  const zip = new AdmZip();
  zip.addFile('a_lvr_land_a.csv', Buffer.from(CSV));
  lvr.importZip(zip.toBuffer());
  assert.equal(db.get().prepare("SELECT COUNT(*) c FROM trades WHERE source='demo'").get().c, 0);
});

test('zip 內沒有 CSV 時給出清楚錯誤', () => {
  const zip = new AdmZip();
  zip.addFile('readme.txt', Buffer.from('x'));
  assert.throws(() => lvr.importZip(zip.toBuffer()), /找不到/);
});

test('季別範圍展開', () => {
  assert.deepEqual(lvr.expandSeasons('113S3-114S2'), ['113S3', '113S4', '114S1', '114S2']);
  assert.deepEqual(lvr.expandSeasons('114s1'), ['114S1']);
  assert.throws(() => lvr.expandSeasons('2024Q1'));
});
