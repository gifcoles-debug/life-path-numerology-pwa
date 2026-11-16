# 00 總目錄（快速調閱）

調閱規則：先查 `../CLAUDE.md`，再查本頁，最後才搜尋，而且搜尋要限定範圍。
每個資訊只有一個正本：程式與資料在 repo，企劃與決策在 Notion（ADR-0005）。

## 1. 先讀這三份

1. `../CLAUDE.md`：AI 工作地圖與固定規則
2. `01-architecture/ARCHITECTURE.md`：框架、資料流、準確度原則
3. Notion 總部頁（第 3 節）：企劃、目標、任務

## 2. repo 資料夾

| 位置 | 內容 |
|---|---|
| `01-architecture/ARCHITECTURE.md` | 架構、資料準確度原則、會員權限、發展藍圖 |
| `01-architecture/DIAGRAMS.md` | 7 張設計圖：架構、資料流程、會員、謄本點數、AI 員工、資料表、公司階段 |
| `02-research/TRANSCRIPTS.md` | 謄本收費與串接的查證結論 |
| `02-research/raw-transcripts-data-2026-11-14.md` | 原始查證資料：謄本、電傳、實價登錄、指數、RSS，附來源與證據等級 |
| `02-research/raw-market-business-2026-11-15.md` | 原始查證資料：市場規模、競品價格、金流、公司設立、個資法 |
| `02-research/market-reports/` | 市場分析師的月報草稿（匯入真實資料後才會產生） |
| `03-runbooks/DEPLOY.md` | 部署、備份、還原、更新 |
| `03-runbooks/OPERATIONS.md` | 每日、每週、每月由誰做什麼 |
| `04-decisions/ADR-0001～0005` | 技術架構、先串接後自建、謄本串接、新聞授權、文件正本規則 |
| `05-logs/DEBUG-LOG.md` | 除錯紀錄（新的在最上面） |
| `05-logs/CHANGELOG.md` | 版本變更 |
| `screenshots/` | 畫面截圖（示範資料） |
| `../data/` | `catalog.json`（框架與 83 個來源）、`feeds.json`、`transcripts.json` |
| `../scripts/doctor.js` | 健康檢查 |
| repo 根目錄 `.claude/skills/repro-*` | 技能：除錯、調閱、新增來源、歸檔、上線檢查 |
| repo 根目錄 `.claude/agents/repro-*` | 6 位第一階段 AI 員工 |

## 3. Notion（企劃與營運，正本）

- 總部：https://app.notion.com/p/419c7d088a1c818c9a77c39ee7e82e16
- 頁面：

  | 頁面 | 連結 |
  |---|---|
  | 01 總報告企劃書 v1.0 | https://app.notion.com/p/41ac7d088a1c81549a3ddcb4a9748f7a |
  | 02 目標與公司發展階段 | https://app.notion.com/p/41ac7d088a1c81589046d039dafa6db4 |
  | 03 系統設計圖與建置手冊 | https://app.notion.com/p/419c7d088a1c819fa83bf40ced917c5e |
  | 04 AI 員工編制與治理 | https://app.notion.com/p/419c7d088a1c8140bca5c202b57643a1 |
  | 05 除錯手冊（技能） | https://app.notion.com/p/419c7d088a1c81178f3ff5e68281df8c |
  | 06 資料檔案總目錄 | https://app.notion.com/p/419c7d088a1c814c8431f248d1010c5f |

- 資料庫：

  | 資料庫 | 連結 | 寫入時使用的資料來源 |
  |---|---|---|
  | AI 員工名冊 | https://app.notion.com/p/419c7d088a1c8171bd61ff8daf17c341 | `collection://419c7d08-8a1c-810d-aa0e-000b38fa91aa` |
  | 除錯紀錄 | https://app.notion.com/p/419c7d088a1c815e8b35f13586ca8758 | `collection://419c7d08-8a1c-81c8-8a6c-000bf72f066f` |
  | 資料來源庫 | https://app.notion.com/p/419c7d088a1c817b8a1ddd5ae8f3cf20 | `collection://419c7d08-8a1c-81da-8cff-000b12c29f32` |
  | 任務路線圖 | https://app.notion.com/p/419c7d088a1c812bbc33f0d5b2a00c0e | `collection://419c7d08-8a1c-81cd-a184-000bd0ea5244` |
  | 決策紀錄 | https://app.notion.com/p/419c7d088a1c8187b57adc6496c1a82d | `collection://419c7d08-8a1c-812e-becc-000b938f87f1` |

- 既有相關專案：
  - 「Codex 專案重點｜不動產專用自動化系統」：https://app.notion.com/p/40bc7d088a1c81b39cdae4e24366c7f6
  - 「不動產整合系統研發」：https://app.notion.com/p/40ec7d088a1c8189825ed9acda3b95c3

## 4. 問題 → 答案位置

| 問題 | 答案位置 |
|---|---|
| 謄本一張多少錢？可以串接嗎？ | `02-research/TRANSCRIPTS.md`；ADR-0003 |
| 實價登錄的下載網址、欄位？ | `../src/jobs/lvr.js`；原始查證資料第 4 節 |
| 房價怎麼算？排除哪些交易？ | ARCHITECTURE.md 的「資料準確度原則」 |
| 新增一個網站要改哪裡？ | 技能 `repro-add-source` |
| 網站壞了從哪裡查？ | 技能 `repro-debug`，第一步 `npm run doctor` |
| 會員方案可以用哪些功能？ | `../src/auth.js` 的 `PLANS` |
| 新聞來源的授權狀態？ | `../data/feeds.json` 的 `license`；ADR-0004 |
| 怎麼部署、怎麼備份？ | `03-runbooks/DEPLOY.md` |
| 每天、每週要做什麼？ | `03-runbooks/OPERATIONS.md` |
| 市場規模、競品價格？ | `02-research/raw-market-business-2026-11-15.md`；Notion 01 企劃書 |
| 公司下一步做什麼？ | Notion 任務路線圖，篩選 P0 |
