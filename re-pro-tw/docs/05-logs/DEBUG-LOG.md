# 除錯紀錄（新的在最上面）

格式：
`## YYYY-MM-DD｜症狀一句話`
- **症狀**：錯誤原文或畫面描述
- **根因**：說明（證據等級）
- **修正**：改了哪些檔案
- **防再發**：新增的測試或檢查
- **commit**：雜湊值

---

## 2026-11-14｜房價走勢圖表空白，Console 顯示 MIME type 錯誤
- **症狀**：`Refused to execute script from '/vendor/chart.umd.js' because its MIME type ('application/json')…`；伺服器回 500。
- **根因**：chart.js 4 的 `package.json` 有 `exports` 限制，`require.resolve('chart.js/dist/chart.umd.js')` 丟出 `ERR_PACKAGE_PATH_NOT_EXPORTED`（VERIFIED，伺服器 log）。
- **修正**：`server.js` 改用固定路徑 `node_modules/chart.js/dist/chart.umd.min.js`。
- **防再發**：Playwright 截圖腳本會檢查 Console 錯誤；之後列入 release-check。
- **commit**：f8d1f5f

## 2026-11-14｜`npm test` 找不到 test 目錄
- **症狀**：`Cannot find module '/…/re-pro-tw/test'`。
- **根因**：Node 22 的 `--test` 不接受「目錄」參數（VERIFIED）。
- **修正**：`package.json` 的 test 改成 `--test 'test/*.test.js'`。
- **防再發**：沒有另外加檢查；測試指令寫死在 package.json。
- **commit**：f8d1f5f
