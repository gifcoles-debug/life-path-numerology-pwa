---
name: repro-add-source
description: 在 re-pro-tw 的資源整合庫（data/catalog.json）新增、修正或下架外部資料來源，以及新增新聞 RSS 來源時使用。確保格式正確、網址有查證、授權有標註。
---

# repro-add-source

## 新增或修正網站（`data/catalog.json`）

1. 先判斷屬於哪個模組（`id`）與分組（`groups[].title`），用既有分組，不另外新增。
2. 每筆欄位：
   - `name`、`url`（https 優先）、`desc`（20 字內）。
   - `trust`：official、industry、research、media 擇一。
   - `access`：link、open-data、rss、api、paid 擇一。
   - `update`、`cost`。
3. 查證：網址要有出處，例如官方頁面或搜尋結果；沒查證到的不要加。查不到時記 UNKNOWN，並寫進 DEBUG-LOG 或任務。
4. `npm test`：news-catalog 測試會檢查格式與網址重複。
5. 部署後執行 `node scripts/run-job.js linkcheck`，確認新網址的狀態。
6. 同步更新 Notion「資料來源庫」對應的列。

## 新增新聞來源（`data/feeds.json`）

- 欄位：`id`、`name`、`kind`（google-news 或 rss）、`category`（必須是 categories 裡的鍵）、`url`、`license`（必填，寫授權條件）。
- 授權限非商業使用的來源，預設加 `"enabled": false`，等 Owner 決定後再開。
- 只抓標題與連結，不轉載內文。

## 下架

把連結確認連續失效、或來源已停止服務的項目，從 catalog 移除。在 commit 訊息寫明原因，並在 Notion 資料來源庫把狀態改為「停用」，不要直接刪除該列。
