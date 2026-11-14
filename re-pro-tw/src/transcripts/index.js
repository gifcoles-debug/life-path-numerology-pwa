'use strict';
// 謄本中心
// 查證結果（2026-11，詳見 docs/TRANSCRIPTS.md）：
//   - 中華電信、關貿都「沒有公開」謄本／電傳 API。
//   - 官方唯一系統對系統管道：內政部「地政整合資訊服務共享協作平台」（cop.land.moi.gov.tw），
//     付費、Token 驗證、每筆約 1 元，但所有權部不含私人個資。
// 因此設計成「供應商轉接層」：前端與點數計費邏輯固定，背後的取得管道可以逐步替換。
const db = require('../db');
const data = require('../../data/transcripts.json');

const DOC_TYPES = Object.fromEntries(data.docTypes.map((d) => [d.id, d]));
const servicePoints = () => Number(process.env.TRANSCRIPT_SERVICE_POINTS || 5);

// 每個供應商實作同一個介面：
//   quote(request)  → { points, breakdown }   報價（官方規費 + 平台服務費，1 點 = 1 元）
//   fetch(request)  → { pdf | records, meta } 實際取得資料
const providers = {
  // 第一階段（現在）：產生前往官方系統的連結，會員自行申領
  manual: {
    id: 'manual',
    label: '官方系統自行申領',
    stage: 1,
    enabled: true,
    quote: () => ({ points: 0, breakdown: [{ item: '官方規費於官方網站另行繳納（每張 20 元）', points: 0 }] }),
    fetch: async () => {
      throw new Error('請至全國地政電子謄本系統申領');
    },
  },
  // 第二階段 A：會員上傳自購的電子謄本 PDF → 3 個月內自動查驗真偽、歸檔、擷取重點
  upload: {
    id: 'upload',
    label: '上傳自購謄本：自動查驗與歸檔',
    stage: 2,
    enabled: false,
    quote: () => ({ points: 0, breakdown: [{ item: '歸檔與查驗', points: 0 }] }),
    fetch: async () => {
      throw new Error('尚未開放');
    },
  },
  // 第二階段 B：內政部共享協作平台 API（地籍標示、他項權利；不含私人所有權人個資）
  cop: {
    id: 'cop',
    label: '共享協作平台 API：地籍標示與他項權利',
    stage: 2,
    enabled: Boolean(process.env.COP_API_TOKEN),
    quote: (req) => {
      const fee = { land_reg: 2, building_reg: 1 }[req.doc_type] ?? 1;
      return { points: fee + servicePoints(), breakdown: [{ item: '官方資料費', points: fee }, { item: '平台服務費', points: servicePoints() }] };
    },
    fetch: async () => {
      throw new Error('共享協作平台尚未串接：待註冊取得 Token 與介接文件後實作');
    },
  },
  // 待洽談：地政電傳業者若提供企業介接，才可能在站內調閱完整謄本
  landTelecom: {
    id: 'landTelecom',
    label: '地政電傳企業介接（洽談中）',
    stage: 2,
    enabled: false,
    quote: () => ({ points: 10 + servicePoints(), breakdown: [{ item: '電傳閱覽費（每人每筆）', points: 10 }, { item: '平台服務費', points: servicePoints() }] }),
    fetch: async () => {
      throw new Error('中華電信、關貿目前沒有公開 API，需另行洽談');
    },
  },
};

// 點數扣款（交易內完成：餘額不足就整筆取消）
function chargePoints(userId, points, reason, ref) {
  return db.tx((d) => {
    const r = d.prepare('UPDATE users SET points = points - ? WHERE id = ? AND points >= ?').run(points, userId, points);
    if (!r.changes) throw new Error('點數不足，請先儲值');
    d.prepare('INSERT INTO points_ledger (user_id, delta, reason, ref) VALUES (?, ?, ?, ?)').run(userId, -points, reason, ref);
    return true;
  });
}

function info() {
  return {
    ...data,
    providers: Object.values(providers).map(({ id, label, enabled, stage }) => ({ id, label, enabled, stage })),
  };
}

module.exports = { DOC_TYPES, providers, chargePoints, info };
