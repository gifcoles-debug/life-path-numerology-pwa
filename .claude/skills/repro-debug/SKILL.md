---
name: repro-debug
description: re-pro-tw（不動產最強工具）的除錯流程。網站報錯、測試失敗、排程（新聞／連結確認／實價登錄）失敗、登入異常或圖表不出現時使用。依固定順序定位，避免全專案亂搜。
---

# repro-debug：七步除錯

工作目錄：`re-pro-tw/`。每一步都要有證據（指令輸出、錯誤原文）；推測要標 INFERRED。

1. **健康檢查**：`npm run doctor`（沒有外網時加 `-- --offline`）。輸出有 ✘ 的話，先處理 ✘ 項目。
2. **對照症狀表定位**（下表），只打開表中指到的檔案。
3. **最小重現**：用單一指令重現問題，例如 `node scripts/run-job.js lvr 114S2`、`node --test test/api.test.js`，或用 curl 打單一 API。
4. **先寫會失敗的測試**：加在 `test/` 對應的檔案。資料格式問題放進 `lvr.test.js` 或 `news-catalog.test.js` 的 fixture。
5. **修正**：用最小改動修正。不能為了讓測試通過而刪測試、放寬斷言。
6. **驗證**：`npm test` 全部通過，必要時再跑一次 doctor。
7. **紀錄**：在 `docs/05-logs/DEBUG-LOG.md` 最上方加一筆（格式見該檔），同一筆也寫進 Notion「除錯紀錄」資料庫。

## 症狀 → 位置

| 症狀 | 先看 | 常見原因 |
|---|---|---|
| 實價登錄匯入「下載內容不是 zip 檔」 | `src/jobs/lvr.js` 的 `download` | 該季尚未發布，官網回 HTML（HTTP 200）；或憑證鏈問題 |
| 匯入「CSV 欄位格式不符」 | `parseTradeFile`、zip 內的 `schema-main.csv` | 內政部改了欄名，要更新 `columnIndex` 的對照 |
| 圖表空白 | 瀏覽器 Console、`/vendor/chart.umd.js` | chart.js 路徑錯誤、CSP 擋住、`trade_stats` 沒有資料 |
| 首頁快照全空 | `trade_stats`：`SELECT COUNT(*)` | 還沒匯入資料；或 `rebuildStats` 沒有執行 |
| 新聞 0 則 | `job_runs`（job='news'）的 message | 主機沒有外網、RSS 網址改了、被擋（403） |
| 連結確認大量失敗 | `link_status`、doctor 的網路檢查 | 主機出口被擋；單一網站失敗時改 `catalog.json` |
| 登入後又被踢回登入頁 | `src/auth.js` 的 `loadUser` 與 Cookie | 正式環境沒用 HTTPS（Secure Cookie 不會送出）；帳號被停用 |
| 403「跨站請求被拒絕」 | `server.js` 的 Origin 檢查 | 反向代理改了 Host，要讓 Host 與 Origin 一致 |
| 403「此功能需升級」 | `PLANS`、`effectivePlan` | 方案已到期，會自動降為基本會員 |
| SQLite busy 或 locked | `src/db.js` 的 PRAGMA | 同時跑兩個程序寫入；確認只有一個 server |
| 啟動就結束、顯示 catalog 格式錯誤 | `npm test`：news-catalog 測試 | `catalog.json` 的 trust 或 access 值打錯、網址格式錯 |

## 查資料庫

```bash
node --disable-warning=ExperimentalWarning -e "const d=require('./src/db').open(); console.log(d.prepare('SELECT job,ok,message,started_at FROM job_runs ORDER BY id DESC LIMIT 10').all())"
```

## 完成條件

- 測試通過、doctor 沒有 ✘。
- DEBUG-LOG 已記錄症狀、根因、修正、新增的測試名稱與 commit。
