# 設計圖集

GitHub 與 Notion 都會把 mermaid 程式碼繪成圖。修改時以本檔為正本，Notion「系統設計圖與建置手冊」頁複製本檔內容。

## 圖 1：系統架構（第一階段，已上線）

```mermaid
flowchart LR
  subgraph EXT["外部來源"]
    LVR["內政部實價登錄<br/>開放資料 CSV"]
    RSS["新聞 RSS<br/>Google 新聞・經濟日報"]
    WEB["83 個官方／業者網站"]
    EP["電子謄本系統<br/>（會員自行申領）"]
  end
  subgraph SRV["re-pro-tw 伺服器（Node.js 22）"]
    SCH["排程 scheduler.js"]
    J1["lvr.js 匯入＋統計"]
    J2["news.js 新聞"]
    J3["linkcheck.js 連結確認"]
    API["routes.js 會員 API<br/>auth.js 權限"]
    DB[("SQLite<br/>storage/repro.db")]
  end
  subgraph UI["瀏覽器（會員）"]
    APP["總覽・房價走勢・謄本中心<br/>資源整合庫・試算・後台"]
  end
  SCH --> J1 & J2 & J3
  LVR --> J1 --> DB
  RSS --> J2 --> DB
  WEB -.每日檢查.-> J3 --> DB
  DB --> API --> APP
  APP -.外連.-> WEB
  APP -.外連.-> EP
```

## 圖 2：資料處理流程與準確度關卡

```mermaid
flowchart TD
  A["下載 zip"] --> B{"開頭是 PK？"}
  B -- 否 --> X1["記錄失敗：該季尚未發布"]
  B -- 是 --> C{"內容雜湊與上次相同？"}
  C -- 是 --> X2["略過匯入"]
  C -- 否 --> D["逐檔解析 *_lvr_land_a/b.csv<br/>略過英文標題列"]
  D --> E["民國日期轉西元、建物型態正規化"]
  E --> F{"備註含特殊交易？<br/>或純土地／車位"}
  F -- 是 --> G["保留原始資料<br/>special=1 不列入行情"]
  F -- 否 --> H["列入行情"]
  G & H --> I["依編號 upsert（重複匯入不重複計算）"]
  I --> J["重算 trade_stats<br/>中位數・25%／75% 分位・件數"]
  J --> K["首頁快照：取件數 ≥ 30 的最新月份"]
```

## 圖 3：會員生命週期

```mermaid
sequenceDiagram
  actor U as 會員
  participant S as 網站
  actor A as 管理員
  U->>S: 申請加入（Email、職業、邀請碼可選）
  alt 有邀請碼
    S-->>U: 立即開通，方案依邀請碼
  else 無邀請碼
    S-->>A: 待審核名單
    A->>S: 核准、設定方案與到期日
  end
  U->>S: 登入（scrypt 驗證，Session Cookie）
  S-->>U: 依方案顯示功能（基本／專業／企業）
  Note over S: 到期 → 自動降為基本權限<br/>停用 → 所有登入立即失效
```

## 圖 4：謄本點數制（第二階段設計）

```mermaid
flowchart LR
  M["會員選地號／建號"] --> Q["供應商轉接層 quote()<br/>官方規費＋平台服務費"]
  Q --> C{"會員確認？"}
  C -- 否 --> E["結束，不扣點"]
  C -- 是 --> P["chargePoints()<br/>交易內扣點，不足即取消"]
  P --> F["供應商 fetch()"]
  F --> R{"成功？"}
  R -- 是 --> S["存檔＋寫入點數帳本"]
  R -- 否 --> B["退點＋記錄錯誤"]
  subgraph PV["供應商（可替換）"]
    P1["manual：官方自行申領（現在）"]
    P2["cop：內政部共享協作平台 API"]
    P3["upload：會員上傳自購謄本，自動查驗"]
    P4["landTelecom：電傳企業介接（洽談）"]
  end
  F -.-> PV
```

## 圖 5：AI 員工編制（沿用「風青雲 → 執行官 → 專業 AI 員工 → 人工批准 → 稽核回寫」）

```mermaid
flowchart TD
  O["風青雲（Owner）<br/>決策・批准"] --> X["執行官<br/>主對話 Claude：接令、拆工、彙整"]
  X --> D1["除錯工程師"]
  X --> D2["連結稽核員"]
  X --> D3["資料研究員"]
  X --> D4["市場分析師"]
  X --> D5["檔案管理員"]
  X --> D6["品質審查員（唯讀）"]
  X -.第二階段.-> D7["客服專員"]
  X -.第二階段.-> D8["內容行銷專員"]
  X -.第二階段.-> D9["法規追蹤員"]
  X -.第二階段.-> D10["財務對帳員"]
  D1 & D2 & D3 & D4 & D5 & D6 --> H{"人工批准<br/>對外・收費・部署"}
  H --> L["稽核回寫<br/>DEBUG-LOG・決策紀錄・Notion"]
```

## 圖 6：資料表關係

```mermaid
erDiagram
  users ||--o{ sessions : "登入"
  users ||--o{ points_ledger : "點數異動"
  users ||--o{ transcript_requests : "謄本需求單"
  invites }o--o{ users : "邀請開通"
  trades }o--|| trade_stats : "彙總為"
  news }o--|| feeds_json : "來源"
  link_status }o--|| catalog_json : "檢查"
  job_runs }o--|| scheduler : "執行紀錄"
```

## 圖 7：公司發展階段

```mermaid
timeline
  title 不動產最強工具：公司發展階段（目標為 HYPOTHESIS，依實際數據調整）
  階段 0 驗證期（2026-11～2027-01） : 個人工作室＋AI 員工 : 高雄 1 家 5～10 人門市試用 : 30 位免費測試會員
  階段 1 上線收費（2027-Q1～Q2） : 登記公司、金流、發票 : 100 位付費會員 : 共享協作平台串接
  階段 2 團隊化（2027-H2） : 首位客服兼業務、兼職工程 : 500 位付費會員 : 門市工作台模組
  階段 3 規模化（2028） : 加盟總部、企業方案 : 2,000 位付費會員 : 實體辦公室 6～10 人
  階段 4 資料公司（2029+） : 自建台灣不動產地圖 : 企業 API、估價與授信合作
```
