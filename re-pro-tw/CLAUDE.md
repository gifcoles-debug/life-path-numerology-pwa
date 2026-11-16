# re-pro-tw｜AI 工作守則（先讀這頁，不要全專案搜尋）

不動產最強工具：台灣房仲、地政士、開發商的會員制資訊平台。Owner：風青雲。
語言：繁體中文、臺灣用語，結論先行。結論標註證據等級：VERIFIED、INFERRED、HYPOTHESIS、UNKNOWN。

## 1. 找東西：先查表，再打開檔案

| 要找 | 位置 |
|---|---|
| 所有文件的總目錄 | `docs/00-INDEX.md` |
| 外部資料來源（83 個網站） | `data/catalog.json`；格式檢查在 `src/catalog.js` |
| 新聞來源 | `data/feeds.json` |
| 謄本規費、管道 | `data/transcripts.json`；研究在 `docs/02-research/TRANSCRIPTS.md` |
| API 路由 | `src/routes.js`：依「// ----------」分段 |
| 資料表 | `src/db.js` 的 SCHEMA |
| 登入、權限、方案 | `src/auth.js` 的 PLANS |
| 排程 | `src/scheduler.js` |
| 實價登錄解析與統計 | `src/jobs/lvr.js` |
| 前端各頁面 | `public/assets/app.js`：函式名 `page*`、`admin*` |
| 測試 | `test/*.test.js` |
| 除錯紀錄 | `docs/05-logs/DEBUG-LOG.md` |
| 決策紀錄 | `docs/04-decisions/` |
| 企劃書、目標、AI 員工、任務 | Notion：見 `docs/00-INDEX.md` 第 3 節 |

## 2. 指令

```bash
npm test                 # 必跑：改完任何程式
npm run doctor           # 健康檢查（加 --offline 可跳過外網檢查）
npm run demo-data        # 產生示範資料（畫面會標示）
node scripts/run-job.js news|linkcheck|lvr [季別]
```

## 3. 固定規則

- 改 `data/*.json` 之後要跑 `npm test`，因為測試會驗證格式。
- 新增功能時，要一起補 `test/` 裡的測試。
- AI 只產生草稿，對外內容與收費相關一律由人工批准。對外內容不顯示門牌。
- 開價、成交價、推估價要分開存放；資料版本與取得日期也要分欄。
- 沒有證據的數字標 UNKNOWN，不自行估造。
- 除錯走 `repro-debug` 技能；找資料走 `repro-find`；新增資料來源走 `repro-add-source`；完成工作後依 `repro-record` 歸檔。
- 開發環境沒有對外網路，外部抓取只能在部署主機上驗證。
