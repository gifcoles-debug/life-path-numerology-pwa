---
name: repro-record
description: re-pro-tw 工作完成後的歸檔規則：什麼內容記到哪裡（DEBUG-LOG、決策紀錄、CHANGELOG、Notion 資料庫）。完成修正、做出決策、完成研究或結束一個工作階段時使用。
---

# repro-record：做完就歸檔，一個資訊只放一個主要位置

| 發生了什麼 | 主要位置（正本） | 次要位置（摘要＋連結） |
|---|---|---|
| 修好一個錯誤 | `docs/05-logs/DEBUG-LOG.md` | Notion「除錯紀錄」 |
| 做了取捨或決策（技術、商業、法遵） | `docs/04-decisions/ADR-XXXX-標題.md`；商業決策的正本在 Notion「決策紀錄」 | 另一邊放連結 |
| 完成一項功能 | `docs/05-logs/CHANGELOG.md` | Notion「任務路線圖」：把狀態改為完成 |
| 外部研究結果 | `docs/02-research/`（附來源網址與證據等級） | Notion 對應頁的摘要 |
| 新的資料來源 | `data/catalog.json` | Notion「資料來源庫」 |
| 企劃、目標、公司階段變更 | Notion「總報告企劃書」與「目標與公司發展階段」 | repo 不放副本 |

## 格式

- 日期用 YYYY-MM-DD（台北時間）。
- 每筆寫明證據等級（VERIFIED、INFERRED、HYPOTHESIS、UNKNOWN），與 commit 或來源網址。
- ADR 編號遞增，格式：背景 → 決定 → 理由 → 影響 → 狀態。
- 找到新的「問題 → 位置」對應，補進 `docs/00-INDEX.md` 第 4 節。
