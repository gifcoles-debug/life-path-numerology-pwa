# Taiwan land transcripts, 實價登錄 and market data: research notes (as of 2026-11-14)

**How this was researched.** WebFetch could not reach the government hosts: `ep.land.nat.gov.tw`, `law.moj.gov.tw` and `plvr.land.moi.gov.tw` all failed with DNS errors because they are outside this session's network allowlist. Every fact below therefore comes from WebSearch result pages. Search returns indexed text, not the live page, so check a number on the live page before you rely on it in production.
Confidence tags:
- **verified**: the official page, or several official pages, state it in indexed text.
- **likely**: the source is official but dated, or several secondary sources agree.
- **unverified**: I could not confirm it. It may come from my own background knowledge, or from a gap I am naming.

---

## 1. 全國地政電子謄本系統

| Fact | Source | Conf. |
|---|---|---|
| Official national system: **https://ep.land.nat.gov.tw** (operated by 中華電信 HiNet). Customer service 0800-080-212. A 關貿 front end also exists: https://epaper.ttt.nat.gov.tw (網路申領地政電子謄本). | https://ep.land.nat.gov.tw/Home/SNPayNote ; https://epaper.ttt.nat.gov.tw/EpaperDoc/MainNewT | verified |
| **Fee: NT$20 per page (張)** for every e-transcript type: 登記 (土地/建物), 地價, 地籍圖, 建物測量成果圖, 異動索引, 異動清冊. Pages after "<本謄本列印完畢>" (the notes pages) are free. | https://ep.land.nat.gov.tw/Home/SNPayNote | verified |
| The fee does not depend on the 部別 (標示部/所有權部/他項權利部). You pay by the number of pages actually produced. The page count the system shows first is only an initial estimate, and you can resubmit if more pages are produced. | SNPayNote (above); http://epaper.hinet.net/Home/Discuss/4684?controllor=Home (forum reply) | likely |
| 門牌查地建號 (look up 地/建號 from a street address): **NT$10 per record (筆)**. Older pages say NT$20/張, so sources conflict. | SNPayNote; https://www.land.nat.gov.tw/About/PriceInfo2 | likely |
| 土地參考資訊: NT$20/張 | https://www.land.nat.gov.tw/About | likely |
| Legal basis: 內政部「土地法第六十七條及第七十九條之二規定之書狀費、工本費及閱覽費收費標準表」 sets 登記簿謄本 (computer printout) at NT$20/張 and 地籍圖謄本 (computer printout) at NT$20/張. | https://glrs.moi.gov.tw/LawContent.aspx?id=FL003197 | likely (full text not read) |
| 地籍圖 and 建物測量成果圖 e-transcripts are PDFs at the scale you choose. Print them at 100% or the scale will be wrong. | https://eservices.taichung.gov.tw/Common/CaseFormDownload?pkid=13211 | likely |
| **Payment methods:** (a) **HiNet 月繳制帳號**: the fee goes on the 中華電信 phone bill, which you pay at a 中華電信 counter, bank or convenience store. (b) **HiNet 點數卡** (prepaid, bought online): you must log in with a 自然人憑證 or 工商憑證 for either transcript class. (c) **晶片金融卡** if you have no 中華電信 account. Card charges cannot be cancelled once you click 預覽列印. | https://ep.land.nat.gov.tw/Home/SNPayNote ; https://ep.land.nat.gov.tw/Home/SNHinetAddress ; https://e-services.tycg.gov.tw/eservice/app/customize/item/detail?item_no=D0029 | verified (a, b); likely (c) |
| Credit card on ep.land.nat.gov.tw: **not confirmed**. On the 關貿 e點通 front end, non-members can pay by credit card plus a **NT$10 service fee per file**. | https://ttt.land.net.tw/APTCLN/Link.htm?action=link&target=rate | unverified (ep); likely (關貿) |
| Kiosks: 7-ELEVEN ibon charges NT$20/張 plus a NT$10 handling fee plus the A4 print fee. 全家 kiosk printing is also available. | https://land.gov.taipei/cp.aspx?n=A1746F80AA19450B ; https://www-ws.land.ntpc.gov.tw/001/upload/oldfile/userfiles/file/全家超商kiosk申領謄本操作說明檔.pdf | verified |
| **Verification window: an e-transcript can be checked online (謄本查驗) for 3 months from the 申領日.** Download (領件) is available for 1 week. The check covers integrity, tampering and the signer's identity. | https://ep.land.nat.gov.tw/Home/SNWorkDateTime ; https://ep.land.nat.gov.tw/EpaperDoc/MainNewT | verified |
| Service hours differ by county (page: 資料申請時間). The 北北桃 e點通 site issues e-transcripts Mon–Sat 08:00–21:00 and runs 電傳 24/7. | https://ep.land.nat.gov.tw/Home/SNWorkDateTime ; https://land.tycg.gov.tw/News_Content.aspx?n=4103&s=553587 | likely |

**第一類 vs 第二類 (土地登記規則 §24-1)**
- **第一類** shows all of the 登記名義人's data. Only the 登記名義人, their agent, or someone entitled by law may apply. Online, it requires a **自然人憑證 or 工商憑證**; a member username and password can only get 第二類. Even in 第一類, other co-owners', 他項權利人's and 管理者's 統一編號 and 出生日期 are masked (rule in force since 2008-04-01). Sources: https://laws.gov.taipei/Law/Interpretation/Content/FE265317 ; Taichung e點通 manual https://eservices.taichung.gov.tw/Common/CaseFormDownload?pkid=25170. **verified**
- **第二類**: anyone may apply. It masks the 登記名義人's **出生日期, part of the name, part of the 統一編號, 債務人及債務額比例, and 設定義務人**. 限制登記 entries and the names and IDs of non-natural persons are not masked. Only the **first character of the name** and the **first 4 and last digit of the ID** are shown. The **address is shown in full** unless the owner has asked to mask part of it. In force since 2015-02-02. Sources: https://ep.land.nat.gov.tw/home/snepaperkind ; Taipei 新制三類謄本 PDF https://www-ws.gov.taipei/Download.ashx?u=LzAwMS9VcGxvYWQvNTQzL3JlbGZpbGUvMjY2MDcvODA2NjI3MS8xMTBiNDdlMC1iNDE2LTRkYjAtOGJkYi0xYjc4Mjc5NTQ5YzcucGRm&n=6KyE5pys5paw5Yi2LnBkZg%3D%3D&icon=..pdf ; https://www.land.ntpc.gov.tw/cp.aspx?n=8019. **verified**
- **第三類** (since 2015-02-02): only the 登記名義人 or a 利害關係人 (someone with a legal relationship to the property) may apply. ID and birth date are masked. **Whether it can be applied for online is unverified.** I assume counter only. Source: https://www-ws.gov.taipei/001/Upload/305/relfile/11455/137855/aaf101a1-e0e4-440a-8771-1ecc6be3f9a2.pdf. **likely**

**Enterprise, bulk or prepaid accounts**
- No "企業會員", 儲值 wallet or 月結 product was found on ep.land.nat.gov.tw itself. **unverified (absence)**
- The closest options:
  - **HiNet 地政隨身碼 HN899 account**: no monthly fee; you are billed monthly only in months you use it. A company application needs the account form stamped with the company's 大小章, a company or business registration document, and the ID copies of the responsible person and the agent. Fax it first, then mail the originals within 7 days. https://www.land.nat.gov.tw/About/Apply ; application form (v113.10.30) https://www.land.nat.gov.tw/LandNatUpload/a4afa824-4c46-4b2b-ae79-d806df87caa1.pdf **verified**
  - **HiNet 點數卡** for prepaid use. **verified**
  - **關貿 e點通 月繳制會員**: one-off NT$200 registration fee per account, NT$200 monthly minimum, billing cycle runs from the 26th to the 25th. https://ttt.land.net.tw/APTCLN/Link.htm?action=link&target=rate **likely (dated)**
- **No deposit (保證金) requirement was found** for either provider. **unverified**

---

## 2. 地政電傳 (online land-registry query service)

**Providers**
- **中華電信 HiNet 地政服務**: https://www.land.nat.gov.tw (old domain land.hinet.net). It covers all counties for both 電傳 and 電子謄本. The site lists 地政士, 房仲業, 金融業, 估價業 and 開發業 as target users. Its 電傳 module has a "光特版" built by the vendor 光特資訊; that is a version of the system, not a separate provider. Sources: https://www.land.nat.gov.tw/About ; https://www.land.nat.gov.tw/Home/Practice. **verified**
- **關貿網路 (TradeVan) 地政資訊網路e點通**: https://ttt.land.net.tw/APTCLN/ (also https://www.ttt.nat.gov.tw/CS/Description). It has operated since 1996 for 臺北 (1996), 臺中 (1999), 新北 (2000) and 桃園 (2003). Phone 02-7737-0850. There is also a 北北桃 全功能電傳 site at https://pqt.ttt.nat.gov.tw/. Sources: https://www.tradevan.com.tw/services/index.do?act=services_info&type=15 ; https://land.gov.taipei/cp.aspx?n=12039CC54EC9564C. **verified**

**Who may apply**
- No professional licence is required.
  - HiNet: any HiNet customer can log in with their HN account. Non-customers can open an HN899 account, which needs company documents for a company.
  - 關貿: you must apply for a system account. 自然人憑證 and 工商憑證 cannot log in to 電傳.
- Sources: https://www.land.nat.gov.tw/About/Apply ; https://ttt.land.net.tw/APTCLN/m31. **verified (HiNet); likely (關貿)**

**Fees**
- **地籍資料電傳資訊閱覽費: NT$10 per person per 筆 (or 棟).**
  - Legal basis: 土地法 §79-2 I(6) and the 內政部 fee table FL003197 above. A 2004 MOI letter (內授中辦地字第0930016692號) applies the same rate to 異動索引 queries.
  - "Per person" means per owner record, so a 所有權部 query with 3 owners costs NT$30.
  - Each 部 (標示部, 所有權部, 他項權利部) and each parcel is charged separately.
  - Logging in again, or being logged out for inactivity, charges the same data again.
  - 門牌查詢 is NT$10 per 筆.
  - Official worked example: 1 門牌查詢 plus 5 transcript pages = NT$110.
  - Sources: https://www.ttt.nat.gov.tw/CS/Description ; https://www.land.ntpc.gov.tw/News_Content.aspx?n=32&sms=9150&s=52525 ; https://landoffice.chcg.gov.tw/changhua/07other/main.aspx?main_id=1452 ; https://www.chcland.org.tw/system/index.php?mod=mod_download&file_id=20090619144702836744. **verified**
- 電傳 output is **for reference only and has no legal effect**. Use an 電子謄本 for loans or official filings. Source: https://www.land.nat.gov.tw/About/PriceInfo2. **verified**
- **"地政電子資料流通收費標準": no national regulation by that name exists.** The bulk and API data fees are set locally, for example:
  - 臺北市, 高雄市 and 基隆市「土地基本資料庫電子資料流通(作業)收費標準」.
  - Kaohsiung charges NT$1 per record for the 標示部 and 所有權部 APIs, NT$2 for 土地標示及權利範圍, and nothing for the 地號 and code services.
  - Sources: https://orgws.kcg.gov.tw/001/KcgOrgUploadFiles/400/relfile/73703/203635/dcd4729b-bf11-44cd-98cb-52d61809af13.pdf ; https://exlaw.klcg.gov.tw/LawContent.aspx?id=GL000147. **likely**
- Provider surcharges:
  - HiNet: no extra fee for HiNet customers, and HN899 has no monthly fee. **verified**
  - 關貿: NT$200 registration plus a NT$200 monthly minimum. **likely (dated)**
  - Deposit (保證金): none found. **unverified**

**API or system-to-system integration**
- **HiNet and 關貿 publish no API** for 電傳 or 電子謄本, and no integration contract was found. **unverified (absence)**: ask HiNet (0800-080-212) and 關貿 directly.
- **The official machine route is 內政部地政司「地政整合資訊服務共享協作平台」 at https://cop.land.moi.gov.tw.** **verified unless noted**
  - Since **2019-07-01**, local governments have joined the platform and run **paid use for 加值業者, 公司行號 and individuals**. Fees follow 規費法 and each local fee schedule.
  - Paid users authenticate with a **Token**.
  - Fees are charged **per record (筆)**:
    - MOI_API_002 土地所有權部: NT$1 per 筆.
    - MOI_API_003 他項權利部: NT$1 per 筆.
    - MOI_API_004 建物標示部: NT$1 per 筆.
    - 土地標示及權利範圍: NT$2 per 筆.
    - 地號資料服務: NT$10 per 地段.
    - 地籍圖 WMS: NT$1 per 3 minutes.
  - **Important limit: the 所有權部 APIs return no personal data.** Following the 第二類 model, 權利人 is filled only for public owners (國有, 省市有, 縣市有, 鄉鎮市有) and is `null` for everyone else. The service that matches an owner name or ID to a parcel is **government-only**.
  - The site menu lists 會員註冊流程, 服務引用流程說明, 帳務API引用流程 and 繳費方式說明. I could not read those pages, so **the contract terms and onboarding steps are unverified**.
  - Sources: https://cop.land.moi.gov.tw/Infomation/platformInfo.aspx ; https://cop.land.moi.gov.tw/Services/service_list.aspx ; https://www.land.moi.gov.tw/chhtml/content/10?mcid=4481 ; https://land.chcg.gov.tw/03bulletin/bulletin02_con.aspx?bull_id=350565.
- Free OAS-documented APIs at **https://openapi.land.moi.gov.tw** cover 公告地價 and 公告土地現值 by county, 段小段代碼, and 地政事務所代碼. They are free under OGDL-1.0. Sources: https://data.gov.tw/en/datasets/163138 ; https://data.gov.tw/en/datasets/122674 ; https://data.gov.tw/en/datasets/103188. **verified**
- **What this means for the platform:** no documented channel lets a third party pull legally valid 謄本 PDFs for its members.
  - Members can buy transcripts on their own ep.land.nat.gov.tw or HiNet accounts and upload the PDFs. Your platform can then check each one with 謄本查驗 within the 3-month window.
  - Separately, you can use COP for de-identified parcel and building data.

---

## 3. Third-party Taiwan proptech reselling transcript or 電傳 data

- **foundi 房地** (FOUNDI CO., LTD / 知微科技) is an app for 房仲.
  - Its "調電傳" feature pulls 建物 標示部, 所有權部 and 他項權利部, and 土地 標示部, 所有權部 (with a 增值稅 estimate) and 他項權利部.
  - It prices by owner: **1 owner = 10 points**, at **1 point = NT$1.05**.
  - Point packs: 10 points (NT$11), 500 (NT$525), 3,000 (NT$3,150), 10,000 (NT$10,500).
  - Subscription: NT$8,388 per year. Another report says NT$8,688.
  - **No public API.**
  - Sources: https://www.foundi.info/tutorial ; https://agent.foundi.info/pricing/ ; https://www.bnext.com.tw/article/75556/foundi-house. **likely**
- **地籍小幫手** (Google Play app `com.cochenct.cn_taiwan`) looks up parcels, 公告地價 and ownership shares. Pricing and data source are unknown. https://play.google.com/store/apps/details?id=com.cochenct.cn_taiwan **unverified**
- **No Taiwan vendor publicly sells 謄本 or 電傳 through an API with published pricing.** Searches for 謄本 API, 加值業者 and OCR vendors found none. **unverified (absence)**

---

## 4. 實價登錄 open data

| Fact | Source | Conf. |
|---|---|---|
| Official download page: https://plvr.land.moi.gov.tw/DownloadOpenData. Data runs from 2012 (民國101年). Licence: 政府資料開放授權條款第1版, free. | https://data.gov.tw/dataset/18703 | verified |
| **Current period (本期):** `https://plvr.land.moi.gov.tw/Download?type=zip&fileName=lvr_landcsv.zip` | https://github.com/tonycheng-0118/TW_RealEstate_ETL | likely |
| **Given season:** `https://plvr.land.moi.gov.tw/DownloadSeason?season=114S2&type=zip&fileName=lvr_landcsv.zip`. The season code is the ROC year + `S` + the quarter (1–4). | https://gist.github.com/ShenTengTu/5c51f5b765108312181fb46338129679 | likely |
| A season that is not yet published returns **HTTP 200 with a non-zip (HTML) body**. Check that the file starts with the bytes `PK`. Some Python 3.13 `requests` setups reject the site's TWCA certificate chain. | https://github.com/tonycheng-0118/TW_RealEstate_ETL | likely |
| Whether a season file groups records by **publication batch or by transaction date** | none found | unverified |
| An XML version exists (data.gov.tw 162996). The `lvr_landxml.zip` and `lvr_landxls.zip` file names are unconfirmed. | https://data.gov.tw/en/datasets/162996 | unverified (names) |
| Zip contents: one file per county and type, named `{c}_lvr_land_{a|b|c}.csv`, where **a = 買賣, b = 預售屋, c = 租賃**. There are sub-files `_build`, `_land` and `_park` (for example `a_lvr_land_a_build.csv`), plus `manifest.csv` and `schema-main.csv`, `schema-build.csv`, `schema-land.csv`, `schema-park.csv`. Sub-files join to the main file on the 編號 column. | https://data.gov.tw/dataset/18703 ; https://gist.github.com/ronnywang/ffc5bf9ea38c513399e534383e04974b | verified (schema files, a/b/c); likely (exact sub-file set per type) |
| County letter codes: a 臺北市, b 臺中市, c 基隆市, d 臺南市, e 高雄市, f 新北市, g 宜蘭縣, h 桃園市, i 嘉義市, j 新竹縣, k 苗栗縣, m 南投縣, n 彰化縣, o 新竹市, p 雲林縣, q 嘉義縣, t 屏東縣, u 花蓮縣, v 臺東縣, w 金門縣, x 澎湖縣, z 連江縣. These follow the ID-card letter scheme. | ronnywang gist (A, C, H, I, J confirmed) | likely |
| Encoding: **UTF-8 with BOM**, so read with `utf-8-sig`. Some older notes say Big5. **Row 1 is the Chinese header, row 2 a machine-translated English header** (for example "land sector position building sector house number plate"), and data starts on row 3. | https://ithelp.ithome.com.tw/articles/10417251 ; YenLinWu Data_Science_Marathon notebook on GitHub | likely |
| **Release schedule: the 1st, 11th and 21st of every month.** Data is disclosed after registration and review. 實價登錄 2.0 has applied since 2021-07-01. | https://money.udn.com/money/story/5621/9047645 ; https://www.cna.com.tw/news/aipl/202108230160.aspx | verified (news) |
| **No official JSON API exists for transactions.** The only official channel is CSV, XML or XLS zips. openapi.land.moi.gov.tw covers only 公告地價 and 現值. New Taipei runs its own city API (data.ntpc.gov.tw), updated every 10 days. | https://data.gov.tw/dataset/18703 ; https://data.ntpc.gov.tw/datasets/acce802d-58cc-4dff-9e7a-9ecc517f78be | likely |

**買賣 (`_a`) CSV columns, in order.** This is my best list. The last six are confirmed on data.gov.tw. **Treat `schema-main.csv` inside the zip as authoritative.**
`鄉鎮市區, 交易標的, 土地位置建物門牌, 土地移轉總面積平方公尺, 都市土地使用分區, 非都市土地使用分區, 非都市土地使用編定, 交易年月日, 交易筆棟數, 移轉層次, 總樓層數, 建物型態, 主要用途, 主要建材, 建築完成年月, 建物移轉總面積平方公尺, 建物現況格局-房, 建物現況格局-廳, 建物現況格局-衛, 建物現況格局-隔間, 有無管理組織, 總價元, 單價元平方公尺, 車位類別, 車位移轉總面積(平方公尺), 車位總價元, 備註, 編號, 主建物面積, 附屬建物面積, 陽台面積, 電梯, 移轉編號`
— **likely**. Notes:
- Areas are in m² (multiply by 0.3025 for 坪).
- Dates are in ROC format, for example `1140315`.
- The 預售屋 (`_b`) file adds columns such as 建案名稱, 棟及號 and 解約情形. **unverified**

---

## 5. Price indices and macro data (canonical URL and how often it updates)

| Series | URL | Frequency | Conf. |
|---|---|---|---|
| 內政部 住宅價格指數 (national and 六都) | 地政司「不動產指數專區」 https://www.land.moi.gov.tw/chhtml/news/1125 ; press releases at https://www.moi.gov.tw/News.aspx?n=4&sms=9009 ; open-format files on 不動產資訊平台 https://pip.moi.gov.tw (exact download path not confirmed) | Quarterly, about 4.5 months after quarter end. Latest confirmed: 114Q2 = 148.65, released 2025-11-28. I found no 115-year release. | verified (專區, cadence); unverified (pip path) |
| 信義房價指數 | https://www.sinyi.com.tw/expertise/house-price-index (also sinyinews.com.tw) | Quarterly. 2026Q3 national index 168.64, reported in the news. | verified (URL); likely (value) |
| 國泰房地產指數 | No standalone official page confirmed. Reports are archived at 政大台灣房地產研究中心 https://www.ncscre.nccu.edu.tw | Quarterly, about 3–4 weeks after quarter end (2026Q3 came out 2026-10-22). | likely (cadence); unverified (URL) |
| 政大永慶房價指數 | https://rer.yungching.com.tw/ ; https://rer.nccu.edu.tw/article/list/74 | Quarterly, base 2020Q1. The 即時 index is released at quarter end; the 大樓 and 公寓 indices lag one quarter. Back-revised each release. | verified |
| 央行 五大銀行新承做放款(含購屋貸款)平均利率 | Monthly press release with an XLSX attachment, under 新聞稿 (https://www.cbc.gov.tw/tw/lp-302-1.html). Example (2026-09 data): https://www.cbc.gov.tw/tw/cp-302-193064-9acd9-1.html | Monthly, around the 20th–22nd of the following month | verified (release page); likely (list URL) |
| 國發會 景氣對策信號 | https://index.ndc.gov.tw/n/zh_tw/data/eco/signal (series exportable to Excel) | Monthly, near the end of the following month. January data comes out in early March. | verified (URL); likely (timing) |

---

## 6. RSS feeds

| Feed | URL | Conf. |
|---|---|---|
| Google News search, zh-TW | `https://news.google.com/rss/search?q=<url-encoded query>&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`. Example for 房市: `https://news.google.com/rss/search?q=%E6%88%BF%E5%B8%82&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`. You can add `when:7d` or `site:` to q. | likely (pattern documented; TW variant not test-fetched) |
| 經濟日報 RSS index | https://money.udn.com/rssfeed/lists/1001 (lists 房市 channels) | verified |
| 經濟日報 房市焦點 | https://money.udn.com/rssfeed/news/1001/5593/5621?ch=money | likely (third-party directory) |
| 經濟日報 房產投資 | https://money.udn.com/rssfeed/news/1001/5593/5930?ch=money | verified (feed indexed) |
| 中央社 產經證券 | https://feeds.feedburner.com/rsscna/finance (listed on https://www.cna.com.tw/about/rss.aspx) | verified |
| 自由時報 (all news) | https://news.ltn.com.tw/rss/all.xml. A finance feed at `news.ltn.com.tw/rss/business.xml` is **unconfirmed**. | likely / unverified |
| 內政部 | RSS directory https://www.moi.gov.tw/RSS.aspx?n=12363. The 新聞發布 list (https://www.moi.gov.tw/News.aspx?n=4&sms=9009) has an RSS/XML link. I could not see the exact feed URL. | verified (directory); unverified (feed URL) |
| 商業周刊 | No official RSS URL found. Feeder lists a feed called "商周網站 最新文章" served from cmsapi.businessweekly.com.tw, but the full path is unknown. https://feeder.co/discover/7bd902ede0/businessweekly-com-tw | unverified |

**Licensing caveat for a paid, members-only platform:**
- CNA's RSS terms allow only **personal or non-profit, non-commercial** use. Feeds carry only the title, lead and link, and you must credit 「中央通訊社」 (https://www.cna.com.tw/about/rss.aspx). **verified**
- Google News RSS is likewise meant for personal, non-commercial use (https://www.google.com/intl/en_us/terms_google_news.html). **likely**
- UDN's RSS terms were not found.
- Show headline and link only, or license the content.
