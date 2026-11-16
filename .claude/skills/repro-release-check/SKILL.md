---
name: repro-release-check
description: re-pro-tw 上線或更新正式站之前的檢查清單（測試、健康檢查、設定、備份、授權、個資）。部署前、開始對會員收費前使用。
---

# repro-release-check

逐項打勾。任何一項沒過，就不部署；把原因記進 Notion 任務路線圖。

**程式**
- [ ] `npm test` 全部通過
- [ ] 在部署主機上執行 `npm run doctor`，沒有 ✘，外網檢查也通過

**設定**
- [ ] `.env`：`NODE_ENV=production`
- [ ] `.env`：`REGISTRATION_MODE` 已決定
- [ ] `.env`：`ADMIN_PASSWORD` 已移除
- [ ] 全站 HTTPS；反向代理有保留 Host
- [ ] `storage/` 放在永久磁碟；每日備份已設定，而且做過一次還原測試

**資料**
- [ ] 正式資料庫裡沒有示範資料：`SELECT COUNT(*) FROM trades WHERE source='demo'` 為 0
- [ ] 實價登錄已回補至少 8 季

**授權與法遵**
- [ ] 新聞來源授權已確認；非商業授權的來源已關閉
- [ ] 隱私權政策、會員條款、退款規則已上線
- [ ] 謄本相關說明沒有承諾「站內調閱具法律效力的謄本」

**紀錄**
- [ ] CHANGELOG 已更新
- [ ] Notion 任務狀態已更新
