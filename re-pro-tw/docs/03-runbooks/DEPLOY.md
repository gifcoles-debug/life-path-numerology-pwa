# 部署手冊

## 最簡單：一台 VPS 或雲端主機（Docker）

```bash
git clone <repo> && cd <repo>/re-pro-tw
docker build -t re-pro-tw .
docker run -d --name repro -p 3000:3000 -v /srv/repro-data:/data \
  -e NODE_ENV=production -e REGISTRATION_MODE=approval re-pro-tw
docker exec repro node scripts/create-admin.js you@example.com 你的密碼123
docker exec repro node scripts/doctor.js           # 外網檢查必須全部 ✔
```

前面架一層 Caddy 或 Nginx 處理 HTTPS（Caddy 會自動申請憑證）。反向代理要保留 `Host` 標頭。

## 不用 Docker

- Node 22.13 以上，在專案目錄執行 `npm ci --omit=dev`。
- 用 `pm2` 或 systemd 執行 `npm start`。

## 備份與還原

- 每天在離峰時間備份：`sqlite3 /srv/repro-data/repro.db ".backup '/backup/repro-$(date +%F).db'"`，或在停機時直接複製整個資料夾。
- 備份至少保留 30 天，並且要放在**另一台機器或雲端儲存空間**。
- 每月做一次還原測試：把備份檔放到測試機的 `STORAGE_DIR`，啟動後執行 doctor。

## 更新版本

1. 部署前依 `repro-release-check` 技能逐項檢查。
2. `git pull` 之後重建映像檔，或重新啟動服務。資料表會在啟動時自動補建。
3. 部署後執行 doctor，並開首頁、房價走勢、謄本中心各看一次。
