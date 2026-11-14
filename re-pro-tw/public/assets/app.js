'use strict';
/* 不動產最強工具：會員前台（無框架單頁應用，以 #/路徑 切換頁面） */

const state = { user: null, catalog: null, charts: [] };
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const view = $('#view');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function api(path, opts = {}) {
  const init = { method: opts.method || 'GET', headers: {} };
  if (opts.body instanceof Blob) { init.body = opts.body; init.headers['Content-Type'] = 'application/zip'; }
  else if (opts.body !== undefined) { init.body = JSON.stringify(opts.body); init.headers['Content-Type'] = 'application/json'; }
  const res = await fetch(`/api${path}`, init);
  if (res.status === 401) { location.href = '/login'; throw new Error('請重新登入'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const err = new Error(data.error || `錯誤 ${res.status}`); err.upgrade = data.upgrade; throw err; }
  return data;
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), 3200);
}

const fmt = {
  n: (v, d = 0) => (v == null || Number.isNaN(v) ? '—' : Number(v).toLocaleString('zh-TW', { minimumFractionDigits: d, maximumFractionDigits: d })),
  dt: (iso) => (iso ? new Date(iso).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'),
  d: (iso) => (iso ? new Date(iso).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' }) : '—'),
  ago(iso) {
    if (!iso) return '尚未執行';
    const m = Math.round((Date.now() - Date.parse(iso)) / 60e3);
    if (m < 1) return '剛剛';
    if (m < 60) return `${m} 分鐘前`;
    if (m < 60 * 24) return `${Math.round(m / 60)} 小時前`;
    return `${Math.round(m / 1440)} 天前`;
  },
  pct: (v) => (v == null ? '<span class="muted">—</span>' : `<span class="${v > 0 ? 'up' : v < 0 ? 'down' : ''}">${v > 0 ? '▲' : v < 0 ? '▼' : ''}${Math.abs(v).toFixed(1)}%</span>`),
};
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const has = (feature) => state.user?.features.includes(feature);
const TRUST = () => state.catalog.trustLevels;
const ACCESS = () => state.catalog.accessTypes;
const STATUS_LABEL = { live: '已上線', links: '連結整合', planned: '規劃中' };

function destroyCharts() {
  state.charts.forEach((c) => c.destroy());
  state.charts = [];
}
function chart(canvas, config) {
  if (!window.Chart) return null;
  Chart.defaults.color = css('--muted');
  Chart.defaults.borderColor = css('--line');
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  const c = new Chart(canvas, config);
  state.charts.push(c);
  return c;
}

function sparkline(values) {
  const v = values.filter((x) => x != null);
  if (v.length < 2) return '';
  const min = Math.min(...v); const max = Math.max(...v); const span = max - min || 1;
  const pts = v.map((x, i) => `${(i / (v.length - 1)) * 100},${30 - ((x - min) / span) * 26 - 2}`).join(' ');
  return `<svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${css('--brand-2')}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
}

function checkDot(check) {
  if (!check) return '<span class="dot" title="尚未進行連結確認"></span>';
  const label = { ok: '正常', warn: '網站有回應但限制自動檢查，請人工確認', fail: '連線失敗' }[check.level];
  const detail = check.http ? `HTTP ${check.http}` : check.error || '';
  return `<span class="dot ${check.level}" title="連結確認：${esc(label)}（${esc(detail)}）· ${esc(fmt.dt(check.at))}"></span>`;
}

function linkCard(it) {
  return `<a class="link-card" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">
    <span class="title">${checkDot(it.check)}<span>${esc(it.name)}</span><span class="ext">↗</span></span>
    <span class="desc">${esc(it.desc)}</span>
    <span class="meta"><span class="badge ${esc(it.trust)}">${esc(TRUST()[it.trust])}</span><span class="badge">${esc(ACCESS()[it.access])}</span>
      <span>⟳ ${esc(it.update)}</span><span>· ${esc(it.cost)}</span></span>
  </a>`;
}

function moduleLinks(m, filter = () => true) {
  return (m.groups || [])
    .map((g) => {
      const items = g.items.filter(filter);
      if (!items.length) return '';
      return `<h3 style="margin-top:14px">${esc(g.title)}</h3><div class="grid auto">${items.map(linkCard).join('')}</div>`;
    })
    .join('');
}

function lockCard(title, text) {
  return `<div class="card lock"><div class="big">🔒</div><h2>${esc(title)}</h2><p class="muted">${esc(text)}</p>
    <p class="muted">升級方案請聯絡平台管理員（線上付款將於第二階段開放）。</p></div>`;
}

// ---------------- 導覽列 ----------------
function buildNav() {
  const mods = state.catalog.modules.filter((m) => !['market', 'transcripts'].includes(m.id));
  const link = (href, ico, label, tag = '') => `<a href="${href}" data-href="${href}"><span class="ico">${ico}</span><span>${esc(label)}</span>${tag ? `<span class="tag">${esc(tag)}</span>` : ''}</a>`;
  $('#nav').innerHTML = `
    <div class="nav-group"><span>總覽</span>${link('#/home', '🏠', '首頁總覽')}${link('#/news', '📰', '每日資訊')}</div>
    <div class="nav-group"><span>分析與業務工具</span>
      ${link('#/market', '📈', '房價走勢', has('market') ? '' : '專業')}
      ${link('#/transcripts', '📜', '謄本中心')}
      ${link('#/tools', '🧮', '試算工具')}</div>
    <div class="nav-group"><span>資源整合庫</span>${link('#/directory', '🔗', '全部資源')}
      ${mods.map((m) => link(`#/m/${m.id}`, m.icon, m.title, m.status === 'planned' ? '規劃中' : '')).join('')}</div>
    <div class="nav-group"><span>系統</span>${link('#/roadmap', '🧭', '發展藍圖')}${link('#/account', '👤', '我的帳號')}
      ${state.user.role === 'admin' ? link('#/admin', '⚙️', '管理後台') : ''}</div>`;
  $('#sidebar-foot').innerHTML = `資源目錄版本 ${esc(state.catalog.version)}<br>資料僅供參考，以官方公告為準`;
  $('#user-chip').innerHTML = `<span class="name">${esc(state.user.name)}</span><span class="plan">${esc(state.user.planLabel)}</span>
    <button class="btn small" id="logout-btn">登出</button>`;
  $('#logout-btn').onclick = async () => { await api('/auth/logout', { method: 'POST', body: {} }); location.href = '/login'; };
}

// ---------------- 頁面：首頁總覽 ----------------
async function pageHome() {
  const d = await api('/dashboard');
  const jobs = d.jobs || {};
  const jobChip = (id, label) => {
    const j = jobs[id];
    const level = !j ? '' : j.ok ? 'ok' : 'fail';
    return `<span class="item" title="${esc(j?.message || '')}"><span class="dot ${level}"></span>${label}：${j ? fmt.ago(j.finished_at || j.started_at) : '尚未執行'}</span>`;
  };
  const today = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const hour = Number(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei', hour: 'numeric', hour12: false }));
  const hello = hour < 11 ? '早安' : hour < 18 ? '午安' : '晚安';

  let market;
  if (!d.market) market = `<div class="card"><div class="card-head"><h2>六都房價快照</h2><span class="badge planned">專業會員</span></div>
      <p class="muted">升級專業會員即可查看六都單價中位數、月增率、年增率，以及各行政區房價走勢圖。</p></div>`;
  else if (d.market.every((c) => c.empty)) market = `<div class="card"><div class="card-head"><h2>六都房價快照</h2></div>
      <div class="empty"><span class="big">📊</span>尚未匯入實價登錄資料。${state.user.role === 'admin' ? '<br><a href="#/admin/data">前往管理後台匯入 →</a>' : '<br>系統會在每日排程自動匯入。'}</div></div>`;
  else market = `<div class="card"><div class="card-head"><h2>六都房價快照 <small>中古屋買賣・住宅類・單價中位數</small></h2><a href="#/market">看走勢圖 →</a></div>
      ${d.demoData ? '<div class="alert" style="margin-bottom:12px">⚠ 目前顯示的是<b>示範資料（非真實行情）</b>，匯入實價登錄後會自動取代。</div>' : ''}
      <div class="grid kpis">${d.market.map((c) => (c.empty ? `<div class="kpi card"><div class="label">${esc(c.city)}</div><div class="muted">尚無資料</div></div>` : `
        <div class="kpi card"><div class="label">${esc(c.city)} · ${esc(c.ym)}</div>
          <div class="value">${fmt.n(c.median, 1)} <small>萬/坪</small></div>
          <div class="delta">月 ${fmt.pct(c.mom)}　年 ${fmt.pct(c.yoy)}　<span class="muted">${fmt.n(c.n)} 件</span></div>
          ${sparkline(c.spark)}</div>`)).join('')}</div>
      <p class="note" style="margin-top:12px">資料來源：內政部實價登錄開放資料。排除特殊交易（親友、瑕疵、法拍等）與純土地／車位交易；最近 1～2 個月因登錄時差，件數會持續增加，快照取件數 ≥ 30 的最新月份。</p></div>`;

  const cats = d.newsCategories;
  const first = Object.keys(cats)[0];
  view.innerHTML = `
    <div class="page-head"><div><h1>${hello}，${esc(state.user.name)}</h1><p>${esc(today)}・房市、土地、政策、經濟最新動態</p></div>
      <div class="freshness">${jobChip('news', '新聞更新')}${jobChip('lvr', '實價登錄')}${jobChip('linkcheck', '連結確認')}
        <span class="item"><span class="dot ${d.links.fail ? 'warn' : d.links.ok ? 'ok' : ''}"></span>連結 ${fmt.n(d.links.ok || 0)} / ${fmt.n(d.links.total)} 正常${d.links.fail ? `・<b style="color:var(--fail)">${d.links.fail} 失效</b>` : ''}</span></div></div>
    <div class="stack">
      ${market}
      <div class="card"><div class="card-head"><h2>今日資訊</h2><a href="#/news">全部新聞 →</a></div>
        <div class="tabs" id="news-tabs">${Object.entries(cats).map(([k, v]) => `<button data-cat="${esc(k)}" class="${k === first ? 'active' : ''}">${esc(v)}</button>`).join('')}</div>
        <div id="news-box"></div></div>
      <div class="card"><div class="card-head"><h2>功能模組</h2><a href="#/roadmap">發展藍圖 →</a></div>
        <div class="grid auto">
          ${tile('#/market', '📈', '房價走勢分析', '實價登錄自動匯入，縣市／行政區／建物型態走勢', 'live')}
          ${tile('#/transcripts', '📜', '謄本中心', '收費說明、申領需求單、一鍵前往官方系統', 'live')}
          ${tile('#/tools', '🧮', '試算工具', '坪數、單價換算、房貸、仲介服務費上限', 'live')}
          ${state.catalog.modules.filter((m) => !['market', 'transcripts'].includes(m.id)).map((m) => tile(`#/m/${m.id}`, m.icon, m.title, m.summary, m.status)).join('')}
        </div></div>
    </div>`;
  const renderNews = (cat) => {
    const items = d.news[cat] || [];
    $('#news-box').innerHTML = items.length ? newsList(items) : '<div class="empty"><span class="big">📰</span>這個分類還沒有新聞。系統每幾個小時會自動抓取一次。</div>';
  };
  $$('#news-tabs button').forEach((b) => (b.onclick = () => { $$('#news-tabs button').forEach((x) => x.classList.toggle('active', x === b)); renderNews(b.dataset.cat); }));
  renderNews(first);
}

function tile(href, ico, title, text, status) {
  return `<a class="module-tile" href="${href}"><span class="ico">${ico}</span><span><strong>${esc(title)}</strong> <span class="badge ${esc(status)}">${esc(STATUS_LABEL[status] || '')}</span><p>${esc(text)}</p></span></a>`;
}

function newsList(items) {
  return `<ul class="news-list">${items.map((n) => `<li><a href="${esc(n.link)}" target="_blank" rel="noopener noreferrer">${esc(n.title)}</a>
    <span class="meta">${esc(n.source)}・${esc(fmt.ago(n.published_at))}</span></li>`).join('')}</ul>`;
}

// ---------------- 頁面：每日資訊 ----------------
async function pageNews(_arg, params) {
  const cat = params.get('cat') || '';
  const q = params.get('q') || '';
  const first = await api(`/news?limit=40&category=${encodeURIComponent(cat)}&q=${encodeURIComponent(q)}`);
  view.innerHTML = `
    <div class="page-head"><div><h1>每日資訊</h1><p>自動彙整各媒體與政府的房市、土地、政策、經濟新聞；只列標題，點擊前往原文。</p></div></div>
    <div class="card">
      <div class="form-row" style="margin-bottom:12px">
        <div class="chips" id="cat-chips"><span class="chip ${cat ? '' : 'active'}" data-cat="">全部</span>
          ${Object.entries(first.categories).map(([k, v]) => `<span class="chip ${k === cat ? 'active' : ''}" data-cat="${esc(k)}">${esc(v)}</span>`).join('')}</div>
        <form id="news-q" style="margin-left:auto;display:flex;gap:6px"><input class="input" name="q" value="${esc(q)}" placeholder="關鍵字，例如：重劃區" /><button class="btn">搜尋</button></form>
      </div>
      <div id="news-items">${first.items.length ? newsList(first.items) : '<div class="empty"><span class="big">📰</span>沒有符合的新聞</div>'}</div>
      ${first.items.length === 40 ? '<div style="text-align:center;margin-top:12px"><button class="btn" id="more">載入更多</button></div>' : ''}
    </div>`;
  $$('#cat-chips .chip').forEach((c) => (c.onclick = () => (location.hash = `#/news?cat=${c.dataset.cat}&q=${encodeURIComponent(q)}`)));
  $('#news-q').onsubmit = (e) => { e.preventDefault(); location.hash = `#/news?cat=${cat}&q=${encodeURIComponent(e.target.q.value)}`; };
  let offset = 40;
  const more = $('#more');
  if (more) more.onclick = async () => {
    const r = await api(`/news?limit=40&offset=${offset}&category=${encodeURIComponent(cat)}&q=${encodeURIComponent(q)}`);
    offset += 40;
    $('#news-items').insertAdjacentHTML('beforeend', newsList(r.items));
    if (r.items.length < 40) more.remove();
  };
}

// ---------------- 頁面：房價走勢 ----------------
async function pageMarket() {
  const mod = state.catalog.modules.find((m) => m.id === 'market');
  const linksHtml = `<div class="card"><div class="card-head"><h2>房價資料來源</h2></div>${moduleLinks(mod)}</div>`;
  if (!has('market')) {
    view.innerHTML = `<div class="page-head"><div><h1>房價走勢</h1><p>實價登錄自動匯入與分析</p></div></div>
      ${lockCard('房價走勢分析為專業會員功能', '包含各縣市、行政區、建物型態的單價中位數走勢、成交量、區域排行與最新成交明細。')}${linksHtml}`;
    return;
  }
  const opt = await api('/market/options');
  if (!opt.cities.length) {
    view.innerHTML = `<div class="page-head"><div><h1>房價走勢</h1></div></div><div class="card"><div class="empty"><span class="big">📊</span>
      尚未匯入實價登錄資料。${state.user.role === 'admin' ? '<br><a href="#/admin/data">前往管理後台匯入 →</a>' : '<br>系統每日排程會自動從內政部下載。'}</div></div>${linksHtml}`;
    return;
  }
  const saved = JSON.parse(sessionStorage.getItem('market') || '{}');
  const sel = { kind: saved.kind || 'sale', city: opt.cities.includes(saved.city) ? saved.city : opt.cities[0], district: saved.district || '', type: saved.type || '' };
  view.innerHTML = `
    <div class="page-head"><div><h1>房價走勢</h1><p>資料期間 ${esc(opt.range.min)} ～ ${esc(opt.range.max)}・${opt.demo ? '示範資料' : `最近匯入 ${esc(fmt.dt(opt.lastImport?.at))}`}</p></div></div>
    ${opt.demo ? '<div class="alert" style="margin-bottom:16px">⚠ 目前為<b>示範資料（隨機產生，非真實行情）</b>，僅供預覽畫面。管理員匯入實價登錄後會自動清除。</div>' : ''}
    <div class="card"><div class="form-row">
      <label class="field">交易類型<select id="f-kind"><option value="sale">中古屋／成屋買賣</option><option value="presale">預售屋</option></select></label>
      <label class="field">縣市<select id="f-city">${opt.cities.map((c) => `<option>${esc(c)}</option>`).join('')}</select></label>
      <label class="field">行政區<select id="f-district"></select></label>
      <label class="field">建物型態<select id="f-type"><option value="">全部住宅類</option>${opt.types.map((t) => `<option>${esc(t)}</option>`).join('')}</select></label>
    </div></div>
    <div class="grid cols-2" style="margin-top:16px">
      <div class="card"><div class="card-head"><h3 id="t-title">單價中位數走勢</h3></div><div class="chart-box">${opt.demo ? '<div class="watermark">示範資料</div>' : ''}<canvas id="c-trend"></canvas></div></div>
      <div class="card"><div class="card-head"><h3>成交件數</h3><small>最近月份會隨登錄持續增加</small></div><div class="chart-box">${opt.demo ? '<div class="watermark">示範資料</div>' : ''}<canvas id="c-volume"></canvas></div></div>
    </div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h3 id="r-title">行政區排行</h3><small>點長條可切換到該區</small></div><div class="chart-box" id="rank-box">${opt.demo ? '<div class="watermark">示範資料</div>' : ''}<canvas id="c-rank"></canvas></div></div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h3>最新成交明細（100 筆）</h3></div><div class="table-wrap" style="max-height:480px" id="trades"></div></div>
    <div class="card" style="margin-top:16px"><h3>計算方式與資料準確度</h3><ul class="plain note">
      <li>來源：內政部不動產交易實價查詢服務網開放資料，每月 1、11、21 日發布，系統每日檢查並自動匯入。</li>
      <li>單價＝原始資料「單價元/平方公尺」× 3.305785 ÷ 10,000（萬元/坪）；使用<b>中位數</b>避免豪宅或極端值拉高平均。</li>
      <li>排除：備註含親友、員工、特殊關係、瑕疵、凶宅、法拍、毛胚、持分、含增建等特殊交易，以及純土地、純車位交易。</li>
      <li>只計算住宅類（住宅大樓、華廈、公寓、透天厝、套房）；店面、辦公、廠房不列入。</li>
      <li>登錄時差：交易後約 1～2 個月才會陸續登錄，最近月份的件數偏少、單價波動較大。件數少於 10 件的月份僅供參考。</li>
    </ul></div>
    ${linksHtml}`;
  const els = { kind: $('#f-kind'), city: $('#f-city'), district: $('#f-district'), type: $('#f-type') };
  const fillDistricts = () => {
    els.district.innerHTML = `<option value="">全市</option>${(opt.districts[els.city.value] || []).map((x) => `<option>${esc(x)}</option>`).join('')}`;
  };
  els.kind.value = sel.kind; els.city.value = sel.city; fillDistricts(); els.district.value = sel.district; els.type.value = sel.type;
  if (els.district.value !== sel.district) els.district.value = '';

  const brand = css('--brand-2'); const accent = css('--accent');
  const trend = chart($('#c-trend'), { type: 'line', data: { labels: [], datasets: [
    { label: '25% 分位', data: [], borderWidth: 0, pointRadius: 0, fill: false },
    { label: '25%～75% 區間', data: [], borderWidth: 0, pointRadius: 0, fill: '-1', backgroundColor: brand + '22' },
    { label: '單價中位數（萬/坪）', data: [], borderColor: brand, backgroundColor: brand, borderWidth: 2, pointRadius: 2, tension: .25 },
  ] }, options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
    plugins: { legend: { labels: { filter: (i) => i.datasetIndex !== 0 } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}：${fmt.n(c.parsed.y, 1)}` } } },
    scales: { y: { title: { display: true, text: '萬元/坪' } } } } });
  const volume = chart($('#c-volume'), { type: 'bar', data: { labels: [], datasets: [{ label: '成交件數', data: [], backgroundColor: accent }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } } } });
  let rankRows = [];
  const rank = chart($('#c-rank'), { type: 'bar', data: { labels: [], datasets: [{ label: '單價（萬/坪）', data: [], backgroundColor: brand }] },
    options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { afterLabel: (c) => `件數 ${fmt.n(rankRows[c.dataIndex]?.n)}` } } },
      onClick: (_e, elements) => { if (elements[0]) { els.district.value = rankRows[elements[0].index].district; update(); } } } });

  async function update() {
    const p = { kind: els.kind.value, city: els.city.value, district: els.district.value, type: els.type.value };
    sessionStorage.setItem('market', JSON.stringify(p));
    const qs = new URLSearchParams(p).toString();
    const [t, r, tr] = await Promise.all([api(`/market/trend?${qs}`), api(`/market/compare?${qs}&months=6`), api(`/market/trades?${qs}`)]);
    $('#t-title').textContent = `${p.city}${p.district || '全市'}・${p.type || '住宅類'} 單價中位數`;
    const rows = t.rows;
    trend.data.labels = rows.map((x) => x.ym);
    trend.data.datasets[0].data = rows.map((x) => x.p25_ping);
    trend.data.datasets[1].data = rows.map((x) => x.p75_ping);
    trend.data.datasets[2].data = rows.map((x) => x.median_ping);
    trend.update();
    volume.data.labels = rows.map((x) => x.ym);
    volume.data.datasets[0].data = rows.map((x) => x.n);
    volume.update();
    rankRows = r.rows;
    $('#r-title').textContent = `${p.city} 行政區單價排行（${r.from || ''} ～ ${r.to || ''}）`;
    $('#rank-box').style.height = `${Math.max(220, rankRows.length * 24 + 40)}px`;
    rank.data.labels = rankRows.map((x) => x.district);
    rank.data.datasets[0].data = rankRows.map((x) => x.median_ping);
    rank.data.datasets[0].backgroundColor = rankRows.map((x) => (x.district === p.district ? accent : brand));
    rank.resize(); rank.update();
    $('#trades').innerHTML = tr.rows.length ? `<table><thead><tr><th>日期</th><th>行政區</th><th>地址／建案</th><th>型態</th><th class="num">總價(萬)</th><th class="num">單價(萬/坪)</th><th class="num">建坪</th><th>備註</th></tr></thead><tbody>
      ${tr.rows.map((x) => `<tr${x.special ? ' style="opacity:.55" title="特殊交易，不列入行情"' : ''}><td>${esc(x.trade_date)}</td><td>${esc(x.district)}</td>
        <td>${esc(x.project ? `${x.project}・` : '')}${esc(x.address)}</td><td>${esc(x.building_type)}</td>
        <td class="num">${fmt.n(x.total_price / 1e4)}</td><td class="num">${fmt.n((x.unit_price_sqm * 3.305785) / 1e4, 1)}</td>
        <td class="num">${fmt.n(x.building_sqm / 3.305785, 1)}</td><td><small>${esc(x.note)}</small></td></tr>`).join('')}</tbody></table>` : '<div class="empty">沒有資料</div>';
  }
  els.city.onchange = () => { fillDistricts(); update(); };
  els.kind.onchange = els.district.onchange = els.type.onchange = update;
  await update();
}

// ---------------- 頁面：謄本中心 ----------------
async function pageTranscripts() {
  const [info, reqs] = await Promise.all([api('/transcripts/info'), api('/transcripts/requests')]);
  const mod = state.catalog.modules.find((m) => m.id === 'transcripts');
  const docName = Object.fromEntries(info.docTypes.map((d) => [d.id, d.name]));
  const STATUS = { draft: '待申領', applied: '已申領', done: '已完成' };
  const official = info.channels?.find((c) => c.primary)?.url || 'https://ep.land.nat.gov.tw/';
  view.innerHTML = `
    <div class="page-head"><div><h1>謄本中心</h1><p>${esc(mod.summary)}</p></div>
      <div class="freshness"><span class="item">💎 我的點數：<b>${fmt.n(state.user.points)}</b></span></div></div>
    <div class="grid cols-2">
      <div class="card"><div class="card-head"><h2>謄本種類與官方規費</h2>${info.verifiedAt ? `<small>查證日期 ${esc(info.verifiedAt)}</small>` : ''}</div>
        <div class="table-wrap"><table><thead><tr><th>種類</th><th class="num">官方規費</th><th>說明</th></tr></thead><tbody>
        ${info.docTypes.map((d) => `<tr><td><b>${esc(d.name)}</b></td><td class="num">${d.officialFee == null ? '—' : `${fmt.n(d.officialFee)} 元${d.unit ? `/${esc(d.unit)}` : ''}`}</td><td><small>${esc(d.note)}</small></td></tr>`).join('')}
        </tbody></table></div>
        ${info.feeNote ? `<p class="note" style="margin-top:10px">${esc(info.feeNote)}</p>` : ''}</div>
      <div class="card"><div class="card-head"><h2>取得管道比較</h2></div>
        ${(info.channels || []).map((c) => `<div style="padding:8px 0;border-bottom:1px dashed var(--line)"><b>${esc(c.name)}</b> ${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">↗</a>` : ''}
          <div><small>${esc(c.desc)}</small></div>${c.fee ? `<div><small>💰 ${esc(c.fee)}</small></div>` : ''}${c.who ? `<div><small>👤 ${esc(c.who)}</small></div>` : ''}</div>`).join('') || '<p class="muted">資料整理中</p>'}
      </div>
    </div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h2>我的謄本需求單</h2><a class="btn primary small" href="${esc(official)}" target="_blank" rel="noopener noreferrer">前往全國地政電子謄本系統 ↗</a></div>
      <p class="muted">先把要調的地號、建號記下來，到官方系統一次申領；第二階段串接共享協作平台後，這張清單可一鍵查詢地籍標示與他項權利、自動扣點。</p>
      <form id="req-form" class="form-row" style="margin-bottom:14px">
        <label class="field">種類<select name="doc_type">${info.docTypes.map((d) => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('')}</select></label>
        <label class="field">縣市<input name="city" required placeholder="臺北市" /></label>
        <label class="field">鄉鎮市區<input name="district" placeholder="大安區" /></label>
        <label class="field">段／小段<input name="section" placeholder="仁愛段一小段" /></label>
        <label class="field">地號／建號<input name="number" required placeholder="0123-0000" /></label>
        <label class="field">備註<input name="memo" placeholder="客戶、案名" /></label>
        <button class="btn primary">加入清單</button>
      </form>
      <div class="table-wrap">${reqs.rows.length ? `<table><thead><tr><th>建立日期</th><th>種類</th><th>標的</th><th>備註</th><th>狀態</th><th></th></tr></thead><tbody>
        ${reqs.rows.map((r) => `<tr><td>${esc(fmt.d(r.created_at + 'Z'))}</td><td>${esc(docName[r.doc_type] || r.doc_type)}</td>
          <td>${esc(`${r.city}${r.district} ${r.section} ${r.number}`)}</td><td>${esc(r.memo)}</td>
          <td><select class="input" data-status="${r.id}">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === r.status ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
          <td><button class="btn small danger" data-del="${r.id}">刪除</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">尚無需求單</div>'}</div>
    </div>
    ${info.steps?.length ? `<div class="card" style="margin-top:16px"><h2>線上申領步驟</h2><ol>${info.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>` : ''}
    ${info.faq?.length ? `<div class="card" style="margin-top:16px"><h2>常見問題</h2>${info.faq.map((f) => `<p><b>Q：${esc(f.q)}</b><br><span class="muted">${esc(f.a)}</span></p>`).join('')}</div>` : ''}
    <div class="card" style="margin-top:16px"><h2>系統串接規劃（點數制）</h2>
      <div class="grid auto">${info.providers.map((p) => `<div class="card"><small class="muted">第 ${p.stage} 階段</small><br><b>${esc(p.label)}</b><br><span class="badge ${p.enabled ? 'live' : 'planned'}">${p.enabled ? '已啟用' : '尚未啟用'}</span></div>`).join('')}</div>
      <p class="note" style="margin-top:12px">查證結果：中華電信、關貿目前沒有公開的謄本／電傳 API；官方唯一的系統串接管道是內政部「共享協作平台」（每筆約 1 元，不含私人所有權人個資）。
      因此第二階段規劃為：① 共享協作平台 API 取得地籍標示、他項權利（站內扣點）② 會員上傳自購電子謄本，系統在 3 個月內自動查驗真偽並歸檔 ③ 與電傳業者洽談企業介接。點數扣款與退款都有完整帳本可追溯（1 點 = 1 元）。</p></div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h2>地籍與地價查詢</h2></div>${moduleLinks(mod)}</div>`;
  $('#req-form').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/transcripts/requests', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); toast('已加入需求單'); pageTranscripts(); }
    catch (err) { toast(err.message); }
  };
  $$('[data-status]').forEach((s) => (s.onchange = async () => { await api(`/transcripts/requests/${s.dataset.status}`, { method: 'PATCH', body: { status: s.value } }); toast('已更新'); }));
  $$('[data-del]').forEach((b) => (b.onclick = async () => { if (confirm('確定刪除？')) { await api(`/transcripts/requests/${b.dataset.del}`, { method: 'DELETE' }); pageTranscripts(); } }));
}

// ---------------- 頁面：試算工具 ----------------
function pageTools() {
  view.innerHTML = `
    <div class="page-head"><div><h1>試算工具</h1><p>日常最常用的換算；稅金請以財政部官方試算為準。</p></div></div>
    <div class="grid cols-2">
      <div class="card"><h2>📐 坪數換算</h2><div class="form-row">
        <label class="field">平方公尺<input class="input" id="sqm" type="number" step="any" value="100" /></label>
        <label class="field">坪<input class="input" id="ping" type="number" step="any" /></label></div>
        <p class="note" style="margin-top:10px">1 坪 = 3.305785 平方公尺（400/121）</p></div>
      <div class="card"><h2>💲 實價登錄單價換算</h2><div class="form-row">
        <label class="field">元／平方公尺<input class="input" id="u-sqm" type="number" step="any" value="250000" /></label>
        <div class="field">萬元／坪<span class="result" id="u-ping"></span></div></div></div>
      <div class="card"><h2>🏦 房貸試算（本息平均攤還）</h2><div class="form-row">
        <label class="field">貸款金額（萬）<input class="input" id="l-amt" type="number" value="1000" /></label>
        <label class="field">年利率（%）<input class="input" id="l-rate" type="number" step="0.001" value="2.2" /></label>
        <label class="field">年限<input class="input" id="l-years" type="number" value="30" /></label>
        <label class="field">寬限期（年）<input class="input" id="l-grace" type="number" value="0" /></label></div>
        <div id="l-out" style="margin-top:12px"></div></div>
      <div class="card"><h2>🤝 仲介服務報酬上限</h2><div class="form-row">
        <label class="field">成交總價（萬）<input class="input" id="c-price" type="number" value="2000" /></label></div>
        <div id="c-out" style="margin-top:12px"></div>
        <p class="note" style="margin-top:10px">依內政部「不動產經紀業報酬計收標準規定」：買賣雙方合計不得超過成交價 6%（實務上常見賣方 4%、買方 2%）；租賃雙方合計不得超過一個半月租金。此為上限，實際依委託契約約定。</p></div>
    </div>
    <div class="card" style="margin-top:16px"><h2>官方稅務試算</h2><p class="muted">房地合一稅、土地增值稅、遺產稅、贈與稅等規定複雜（持有年限、自住優惠、免稅額每年調整），請使用財政部官方試算。</p>
      ${moduleLinks(state.catalog.modules.find((m) => m.id === 'tax'))}</div>`;
  const P = 3.305785;
  const sqm = $('#sqm'); const ping = $('#ping');
  sqm.oninput = () => (ping.value = sqm.value ? (sqm.value / P).toFixed(2) : '');
  ping.oninput = () => (sqm.value = ping.value ? (ping.value * P).toFixed(2) : '');
  sqm.oninput();
  const us = $('#u-sqm');
  us.oninput = () => ($('#u-ping').textContent = `${fmt.n((us.value * P) / 1e4, 2)} 萬`);
  us.oninput();
  const loan = () => {
    const P0 = $('#l-amt').value * 1e4; const r = $('#l-rate').value / 100 / 12;
    const n = $('#l-years').value * 12; const g = Math.min($('#l-grace').value * 12, n - 1);
    if (!(P0 > 0 && n > 0)) return ($('#l-out').innerHTML = '');
    const m = n - g;
    const pay = r ? (P0 * r) / (1 - (1 + r) ** -m) : P0 / m;
    const total = pay * m + P0 * r * g;
    $('#l-out').innerHTML = `${g ? `<div>寬限期每月（只繳息）：<span class="result">${fmt.n(P0 * r)}</span> 元</div>` : ''}
      <div>每月應繳：<span class="result">${fmt.n(pay)}</span> 元</div><div class="muted">總利息約 ${fmt.n((total - P0) / 1e4, 1)} 萬元・總繳 ${fmt.n(total / 1e4, 1)} 萬元</div>`;
  };
  $$('#l-amt,#l-rate,#l-years,#l-grace').forEach((i) => (i.oninput = loan)); loan();
  const com = () => {
    const p = $('#c-price').value * 1e4;
    $('#c-out').innerHTML = `<div>雙方合計上限（6%）：<span class="result">${fmt.n((p * 0.06) / 1e4, 1)}</span> 萬元</div>
      <div class="muted">常見分配：賣方 4% = ${fmt.n((p * 0.04) / 1e4, 1)} 萬、買方 2% = ${fmt.n((p * 0.02) / 1e4, 1)} 萬</div>`;
  };
  $('#c-price').oninput = com; com();
}

// ---------------- 頁面：資源整合庫 ----------------
function pageDirectory(_arg, params) {
  const q = (params.get('q') || '').trim();
  const trust = params.get('trust') || '';
  const access = params.get('access') || '';
  const match = (it) => (!trust || it.trust === trust) && (!access || it.access === access)
    && (!q || `${it.name} ${it.desc}`.toLowerCase().includes(q.toLowerCase()));
  const total = state.catalog.modules.reduce((a, m) => a + m.groups.reduce((b, g) => b + g.items.length, 0), 0);
  const body = state.catalog.modules.map((m) => {
    const inner = moduleLinks(m, match);
    return inner ? `<div class="card"><div class="card-head"><h2>${m.icon} ${esc(m.title)} <span class="badge ${esc(m.status)}">${esc(STATUS_LABEL[m.status])}</span></h2><a href="#/m/${esc(m.id)}">模組頁 →</a></div>${inner}</div>` : '';
  }).join('');
  view.innerHTML = `
    <div class="page-head"><div><h1>資源整合庫</h1><p>共 ${total} 個精選來源，分 ${state.catalog.modules.length} 大類。每天自動「連結確認」：<span class="dot ok"></span> 正常 <span class="dot warn"></span> 需人工確認 <span class="dot fail"></span> 失效</p></div></div>
    <div class="card" style="margin-bottom:16px"><form class="form-row" id="dir-form">
      <label class="field">關鍵字<input name="q" value="${esc(q)}" placeholder="例如：謄本、實價、液化" /></label>
      <label class="field">來源可信度<select name="trust"><option value="">全部</option>${Object.entries(TRUST()).map(([k, v]) => `<option value="${k}" ${k === trust ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
      <label class="field">取得方式<select name="access"><option value="">全部</option>${Object.entries(ACCESS()).map(([k, v]) => `<option value="${k}" ${k === access ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
      <button class="btn primary">篩選</button></form></div>
    <div class="stack">${body || '<div class="card empty">沒有符合的資源</div>'}</div>`;
  $('#dir-form').onsubmit = (e) => { e.preventDefault(); location.hash = `#/directory?${new URLSearchParams(new FormData(e.target))}`; };
}

function pageModule(id) {
  const m = state.catalog.modules.find((x) => x.id === id);
  if (!m) return (view.innerHTML = '<div class="card empty">找不到這個模組</div>');
  view.innerHTML = `
    <div class="page-head"><div><h1>${m.icon} ${esc(m.title)} <span class="badge ${esc(m.status)}">${esc(STATUS_LABEL[m.status])}</span></h1><p>${esc(m.summary)}</p></div></div>
    ${m.analysis?.length ? `<div class="card" style="margin-bottom:16px"><h2>📊 可以怎麼分析</h2><ul class="plain">${m.analysis.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>` : ''}
    <div class="card">${moduleLinks(m)}</div>
    ${m.status === 'planned' ? `<div class="alert info" style="margin-top:16px">🧭 這個模組目前以外部連結整合為主，完整功能請見 <a href="#/roadmap">發展藍圖</a>。</div>` : ''}`;
}

async function pageSearch(_arg, params) {
  const q = (params.get('q') || '').trim();
  const lower = q.toLowerCase();
  const links = [];
  for (const m of state.catalog.modules) for (const g of m.groups) for (const it of g.items) {
    if (`${it.name} ${it.desc} ${m.title} ${g.title}`.toLowerCase().includes(lower)) links.push(it);
  }
  const news = q ? (await api(`/news?q=${encodeURIComponent(q)}&limit=20`)).items : [];
  view.innerHTML = `<div class="page-head"><div><h1>搜尋「${esc(q)}」</h1><p>資源 ${links.length} 筆・新聞 ${news.length} 筆</p></div></div>
    <div class="card"><h2>資源</h2>${links.length ? `<div class="grid auto">${links.map(linkCard).join('')}</div>` : '<p class="muted">沒有符合的資源</p>'}</div>
    <div class="card"><h2>新聞</h2>${news.length ? newsList(news) : '<p class="muted">沒有符合的新聞</p>'}</div>`;
}

// ---------------- 頁面：發展藍圖 ----------------
function pageRoadmap() {
  view.innerHTML = `
    <div class="page-head"><div><h1>發展藍圖</h1><p>先用「連結＋開放資料」把框架搭起來，再逐步把最常用、最值錢的功能內建。</p></div></div>
    <div class="stack">
      <div class="card phase now"><h2>第一階段（現在）・整合框架</h2><ul>
        <li>會員制登入、審核、邀請碼、方案（基本／專業／企業）與到期管理</li>
        <li>資源整合庫：${state.catalog.modules.length} 大類精選來源，標註可信度、更新頻率、費用，每日自動連結確認</li>
        <li>每日資訊：房市、土地開發、政策、總經、稅務新聞自動彙整</li>
        <li>實價登錄自動匯入：各縣市／行政區／建物型態單價中位數、成交量、區域排行</li>
        <li>謄本中心：規費與管道說明、申領需求單；試算工具</li></ul></div>
      <div class="card phase next"><h2>第二階段・付費與謄本調閱</h2><ul>
        <li>線上金流（綠界／藍新等）：會員方案訂閱、點數儲值、電子發票</li>
        <li>串接內政部「共享協作平台」API（每筆約 1 元）：站內查地籍標示、他項權利，自動扣點</li>
        <li>上傳自購電子謄本：3 個月內自動查驗真偽、歸檔、擷取重點；並與地政電傳業者洽談企業介接</li>
        <li>建照／使照開放資料匯入、營造工程物價指數圖表、央行房貸利率與景氣燈號圖表</li>
        <li>推薦名單：地政士（代書）、室內設計師、估價師，開放會員推薦與評價</li>
        <li>法規修正與判決追蹤：關鍵字訂閱、每日 Email 摘要</li></ul></div>
      <div class="card phase later"><h2>第三階段・自建台灣不動產地圖</h2><ul>
        <li>以國土測繪中心圖資為底圖，疊加實價登錄成交點、土地使用分區、捷運站、災害潛勢</li>
        <li>物件位置一鍵產出「周邊行情＋風險＋分區」分析報告</li>
        <li>API 開放給企業會員串接自家系統</li></ul></div>
    </div>`;
}

// ---------------- 頁面：我的帳號 ----------------
async function pageAccount() {
  const u = state.user;
  const [meta, pts] = await Promise.all([fetch('/api/meta').then((r) => r.json()), api('/account/points')]);
  view.innerHTML = `
    <div class="page-head"><div><h1>我的帳號</h1><p>${esc(u.email)}・加入於 ${esc(fmt.d(u.createdAt + 'Z'))}</p></div></div>
    <div class="grid cols-2">
      <div class="card"><h2>會員方案</h2><p><span class="badge planned" style="font-size:.9rem">${esc(u.planLabel)}</span>
        ${u.planExpiresAt ? `　到期日 ${esc(u.planExpiresAt)}` : ''}${u.plan !== u.effectivePlan ? '　<span style="color:var(--fail)">（已到期，暫以基本會員使用）</span>' : ''}</p>
        <p>可用功能：${u.features.map((f) => ({ home: '總覽', news: '每日資訊', directory: '資源整合庫', tools: '試算工具', transcripts: '謄本中心', market: '房價走勢', team: '團隊', admin: '管理後台' })[f] || f).join('、')}</p>
        <h3>點數：${fmt.n(pts.points)}</h3>
        ${pts.ledger.length ? `<table><thead><tr><th>日期</th><th>說明</th><th class="num">點數</th></tr></thead><tbody>${pts.ledger.map((l) => `<tr><td>${esc(fmt.d(l.created_at + 'Z'))}</td><td>${esc(l.reason)}</td><td class="num">${l.delta > 0 ? '+' : ''}${l.delta}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">尚無點數紀錄。點數將用於站內謄本調閱（第二階段）。</p>'}</div>
      <div class="card"><h2>基本資料</h2><form id="profile" class="stack">
        <label class="field">姓名<input class="input" name="name" value="${esc(u.name)}" required /></label>
        <label class="field">職業<select name="profession">${meta.professions.map((p) => `<option ${p === u.profession ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></label>
        <label class="field">公司／事務所<input class="input" name="company" value="${esc(u.company)}" /></label>
        <label class="field">手機<input class="input" name="phone" value="${esc(u.phone)}" /></label>
        <button class="btn primary">儲存</button></form></div>
      <div class="card"><h2>變更密碼</h2><form id="pw" class="stack">
        <label class="field">目前密碼<input class="input" type="password" name="current" required autocomplete="current-password" /></label>
        <label class="field">新密碼（至少 8 碼，含英文與數字）<input class="input" type="password" name="next" required autocomplete="new-password" /></label>
        <button class="btn primary">變更密碼</button><small>變更後，其他裝置會自動登出。</small></form></div>
    </div>`;
  $('#profile').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/account', { method: 'PATCH', body: Object.fromEntries(new FormData(e.target)) }); await loadMe(); buildNav(); toast('已儲存'); } catch (err) { toast(err.message); }
  };
  $('#pw').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/account/password', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); e.target.reset(); toast('密碼已變更'); } catch (err) { toast(err.message); }
  };
}

// ---------------- 頁面：管理後台 ----------------
async function pageAdmin(tab = 'users') {
  if (state.user.role !== 'admin') return (view.innerHTML = '<div class="card empty">需要管理員權限</div>');
  const tabs = { users: '會員管理', invites: '邀請碼', data: '排程與資料', links: '連結確認' };
  view.innerHTML = `<div class="page-head"><div><h1>管理後台</h1></div></div>
    <div class="tabs">${Object.entries(tabs).map(([k, v]) => `<button class="${k === tab ? 'active' : ''}" onclick="location.hash='#/admin/${k}'">${v}</button>`).join('')}</div>
    <div id="admin-body"></div>`;
  // CSP 不允許 inline onclick，改用事件綁定
  $$('.tabs button').forEach((b, i) => { b.removeAttribute('onclick'); b.onclick = () => (location.hash = `#/admin/${Object.keys(tabs)[i]}`); });
  const body = $('#admin-body');
  if (tab === 'users') return adminUsers(body);
  if (tab === 'invites') return adminInvites(body);
  if (tab === 'data') return adminData(body);
  if (tab === 'links') return adminLinks(body);
}

async function adminUsers(body) {
  const { rows } = await api('/admin/users');
  const pending = rows.filter((u) => u.status === 'pending').length;
  body.innerHTML = `<div class="card">${pending ? `<div class="alert" style="margin-bottom:12px">有 ${pending} 位會員等待審核</div>` : ''}
    <div class="table-wrap"><table><thead><tr><th>會員</th><th>職業／公司</th><th>狀態</th><th>方案</th><th>到期日</th><th class="num">點數</th><th>最後登入</th><th></th></tr></thead><tbody>
    ${rows.map((u) => `<tr data-id="${u.id}"><td><b>${esc(u.name)}</b>${u.role === 'admin' ? ' <span class="badge planned">管理員</span>' : ''}<br><small>${esc(u.email)}${u.phone ? `・${esc(u.phone)}` : ''}</small></td>
      <td><small>${esc(u.profession)}<br>${esc(u.company)}</small></td>
      <td><select class="input" name="status">${['pending', 'active', 'suspended'].map((s) => `<option value="${s}" ${s === u.status ? 'selected' : ''}>${{ pending: '待審核', active: '啟用', suspended: '停用' }[s]}</option>`).join('')}</select></td>
      <td><select class="input" name="plan">${['basic', 'pro', 'enterprise'].map((p) => `<option value="${p}" ${p === u.plan ? 'selected' : ''}>${{ basic: '基本', pro: '專業', enterprise: '企業' }[p]}</option>`).join('')}</select></td>
      <td><input class="input" type="date" name="plan_expires_at" value="${esc(u.planExpiresAt || '')}" /></td>
      <td class="num">${fmt.n(u.points)}<br><input class="input" name="pointsDelta" type="number" placeholder="±點數" style="width:80px" /></td>
      <td><small>${esc(u.lastLoginAt ? fmt.dt(u.lastLoginAt + 'Z') : '—')}</small></td>
      <td><button class="btn small primary" data-save>儲存</button></td></tr>`).join('')}</tbody></table></div></div>`;
  $$('[data-save]', body).forEach((b) => (b.onclick = async () => {
    const tr = b.closest('tr');
    const val = (n) => $(`[name=${n}]`, tr).value;
    try {
      await api(`/admin/users/${tr.dataset.id}`, { method: 'PATCH', body: { status: val('status'), plan: val('plan'), plan_expires_at: val('plan_expires_at'), pointsDelta: val('pointsDelta') } });
      toast('已儲存'); adminUsers(body);
    } catch (err) { toast(err.message); }
  }));
}

async function adminInvites(body) {
  const { rows } = await api('/admin/invites');
  body.innerHTML = `<div class="card"><h2>產生邀請碼</h2><form class="form-row" id="inv">
      <label class="field">方案<select name="plan"><option value="basic">基本</option><option value="pro">專業</option><option value="enterprise">企業</option></select></label>
      <label class="field">方案天數<input class="input" name="days" type="number" value="30" /></label>
      <label class="field">可使用次數<input class="input" name="max_uses" type="number" value="1" /></label>
      <label class="field">備註<input class="input" name="note" placeholder="例：某某房屋加盟店" /></label>
      <button class="btn primary">產生</button></form></div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>邀請碼</th><th>方案</th><th>天數</th><th>使用</th><th>備註</th><th>建立</th><th></th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td><code>${esc(r.code)}</code></td><td>${esc(r.plan)}</td><td>${r.days}</td><td>${r.uses}/${r.max_uses}</td><td>${esc(r.note)}</td><td><small>${esc(fmt.d(r.created_at + 'Z'))}</small></td>
      <td><button class="btn small danger" data-del="${esc(r.code)}">刪除</button></td></tr>`).join('') || '<tr><td colspan="7" class="muted">尚無邀請碼</td></tr>'}</tbody></table></div></div>`;
  $('#inv').onsubmit = async (e) => {
    e.preventDefault();
    const r = await api('/admin/invites', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) });
    toast(`邀請碼：${r.code}`); adminInvites(body);
  };
  $$('[data-del]', body).forEach((b) => (b.onclick = async () => { await api(`/admin/invites/${b.dataset.del}`, { method: 'DELETE' }); adminInvites(body); }));
}

async function adminData(body) {
  const j = await api('/admin/jobs');
  body.innerHTML = `<div class="card"><h2>自動排程</h2>
      <p class="muted">${j.config.schedulerEnabled ? `新聞每 ${j.config.newsIntervalHours} 小時更新；每天 ${j.config.dailyJobsHour}:00（台北時間）後執行連結確認與實價登錄匯入。` : '自動排程已關閉（SCHEDULER_ENABLED=0）'}</p>
      <div class="table-wrap"><table><thead><tr><th>工作</th><th>上次執行</th><th>結果</th><th></th></tr></thead><tbody>
      ${j.jobs.map((x) => { const l = j.last[x.id]; return `<tr><td><b>${esc(x.label)}</b></td><td>${esc(l ? fmt.dt(l.started_at) : '—')}</td>
        <td>${l ? `<span class="dot ${l.ok ? 'ok' : l.ok === 0 ? 'fail' : ''}"></span> ${esc(l.message || (l.finished_at ? '' : '執行中…'))}` : '—'}</td>
        <td><button class="btn small" data-run="${x.id}" ${x.running ? 'disabled' : ''}>${x.running ? '執行中' : '立即執行'}</button></td></tr>`; }).join('')}</tbody></table></div></div>
    <div class="card"><h2>實價登錄：回補歷史資料</h2><p class="muted">輸入民國季別，例如 <code>113S1-114S3</code>（一次最多 60 季，背景依序下載）。</p>
      <form class="form-row" id="seasons"><label class="field">季別範圍<input class="input" name="seasons" placeholder="113S1-114S3" required /></label><button class="btn primary">開始回補</button></form></div>
    <div class="card"><h2>實價登錄：手動上傳</h2><p class="muted">若主機無法連到內政部網站，可到 <a href="https://plvr.land.moi.gov.tw/DownloadOpenData" target="_blank" rel="noopener noreferrer">實價登錄開放資料</a> 下載「CSV 格式」的 zip 後在此上傳。</p>
      <form class="form-row" id="upload"><input type="file" name="file" accept=".zip" required /><button class="btn primary">上傳匯入</button></form></div>
    <div class="card"><h2>最近 30 次執行紀錄</h2><div class="table-wrap" style="max-height:360px"><table><thead><tr><th>時間</th><th>工作</th><th>結果</th></tr></thead><tbody>
      ${j.recent.map((r) => `<tr><td><small>${esc(fmt.dt(r.started_at))}</small></td><td>${esc(r.job)}</td><td><span class="dot ${r.ok ? 'ok' : r.ok === 0 ? 'fail' : ''}"></span> <small>${esc(r.message)}</small></td></tr>`).join('')}</tbody></table></div></div>`;
  $$('[data-run]', body).forEach((b) => (b.onclick = async () => {
    b.disabled = true; b.textContent = '執行中…';
    try { const r = await api(`/admin/jobs/${b.dataset.run}/run`, { method: 'POST', body: {} }); toast(r.message); } catch (err) { toast(err.message); }
    adminData(body);
  }));
  $('#seasons').onsubmit = async (e) => {
    e.preventDefault();
    try { const r = await api('/admin/jobs/lvr/run', { method: 'POST', body: { seasons: e.target.seasons.value } }); toast(r.message); } catch (err) { toast(err.message); }
  };
  $('#upload').onsubmit = async (e) => {
    e.preventDefault();
    const file = e.target.file.files[0];
    if (!file) return;
    toast('上傳與匯入中，檔案較大時需要一點時間…');
    try {
      const r = await api('/admin/lvr/upload', { method: 'POST', body: file });
      toast(`匯入完成：${Object.values(r.summary).reduce((a, b) => a + b, 0)} 筆`); adminData(body);
    } catch (err) { toast(err.message); }
  };
}

async function adminLinks(body) {
  const { rows } = await api('/admin/links');
  const order = { fail: 0, warn: 1, ok: 2 };
  rows.sort((a, b) => (order[a.check?.level] ?? -1) - (order[b.check?.level] ?? -1));
  body.innerHTML = `<div class="card"><p class="muted">失效或需確認的連結排在最前面。修正方式：編輯 <code>data/catalog.json</code> 中對應的網址後重新部署（不需重啟資料庫）。</p>
    <div class="table-wrap"><table><thead><tr><th>狀態</th><th>名稱</th><th>模組</th><th>HTTP</th><th>回應</th><th>檢查時間</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${checkDot(r.check)}</td><td><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.name)}</a><br><small>${esc(r.url)}</small>
      ${r.check?.final_url && r.check.final_url !== r.url ? `<br><small>↪ 轉址至 ${esc(r.check.final_url)}</small>` : ''}</td>
      <td><small>${esc(r.module)} / ${esc(r.group)}</small></td><td>${esc(r.check?.http_status ?? r.check?.error ?? '—')}</td>
      <td class="num">${r.check?.ms != null ? `${fmt.n(r.check.ms / 1000, 1)}s` : '—'}</td><td><small>${esc(r.check ? fmt.dt(r.check.checked_at) : '尚未檢查')}</small></td></tr>`).join('')}</tbody></table></div></div>`;
}

// ---------------- 路由 ----------------
const ROUTES = {
  home: pageHome, news: pageNews, market: pageMarket, transcripts: pageTranscripts, tools: pageTools,
  directory: pageDirectory, m: pageModule, search: pageSearch, roadmap: pageRoadmap, account: pageAccount, admin: pageAdmin,
};

async function route() {
  const hash = location.hash.replace(/^#\/?/, '') || 'home';
  const [path, query = ''] = hash.split('?');
  const [name, arg] = path.split('/');
  const fn = ROUTES[name] || pageHome;
  destroyCharts();
  document.body.classList.remove('nav-open');
  $$('#nav a').forEach((a) => {
    const href = a.dataset.href.slice(2);
    a.classList.toggle('active', href === path || href === name || (name === 'admin' && href === 'admin'));
  });
  view.innerHTML = '<div class="empty">載入中…</div>';
  window.scrollTo(0, 0);
  try {
    await fn(arg, new URLSearchParams(query));
  } catch (err) {
    view.innerHTML = `<div class="card"><div class="alert error">${esc(err.message)}</div></div>`;
  }
}

async function loadMe() {
  state.user = (await api('/auth/me')).user;
}

async function boot() {
  await loadMe();
  state.catalog = await api('/catalog');
  buildNav();
  $('#menu-btn').onclick = () => document.body.classList.toggle('nav-open');
  $('#backdrop').onclick = () => document.body.classList.remove('nav-open');
  $('#search-form').onsubmit = (e) => { e.preventDefault(); const q = $('#search-input').value.trim(); if (q) location.hash = `#/search?q=${encodeURIComponent(q)}`; };
  window.addEventListener('hashchange', route);
  route();
}

boot().catch((e) => { view.innerHTML = `<div class="alert error">${esc(e.message)}</div>`; });
