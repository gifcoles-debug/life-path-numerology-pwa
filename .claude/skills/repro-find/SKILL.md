---
name: repro-find
description: 在 re-pro-tw 專案與 Notion 中快速調閱資料、檔案、紀錄的固定路線。要找「某功能在哪個檔案、某決策為什麼這樣做、某資料來源、某份企劃或紀錄」時使用，避免全專案搜尋浪費時間與 token。
---

# repro-find：三步調閱，不全域搜尋

1. **先讀地圖**：`re-pro-tw/CLAUDE.md` 第 1 節對照表 → 通常就能直接定位檔案。
2. **再讀總目錄**：`re-pro-tw/docs/00-INDEX.md`，內容包括：
   - 第 2 節：每個資料夾放什麼。
   - 第 3 節：Notion 頁面與資料庫連結，例如企劃書、目標、AI 員工、任務、除錯紀錄、資料來源庫。
   - 第 4 節：「問題 → 答案位置」速查表。
3. **最後才搜尋，而且要限定範圍**：
   - 程式：`Grep` 加上 `path`（例如 `re-pro-tw/src`）與 `glob`，不搜整個專案、不搜 `node_modules`。
   - 資料來源：`node -e "console.log(require('./data/catalog.json').modules.map(m=>m.id))"`，或直接 grep 名稱。
   - Notion：`notion-search` 加 `page_url` 限定在總部頁之下；查資料庫時用資料庫 URL 查詢，不在全工作區亂搜。

## 規則

- 檔案已經讀過就不要重讀；大檔案只讀需要的行範圍（用 offset 與 limit）。
- 找到答案後，把「問題 → 位置」補進 `00-INDEX.md` 第 4 節，下次就不用再找。
- Notion 與 repo 內容衝突時：程式與資料以 repo 為準；企劃、目標、決策以 Notion 為準。把衝突寫進決策紀錄。
