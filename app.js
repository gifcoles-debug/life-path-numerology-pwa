const MASTERS = [11, 22, 33];
const VALUES = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9, J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9, S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8 };

const NUMBERS = {
  1: { name: '開創者', traits: ['獨立', '主動', '原創'], direction: '從清楚的第一步開始，並為合作留出空間。', caution: '留意把所有責任都攬在自己身上；請求支持不會削弱自主性。' },
  2: { name: '協調者', traits: ['敏銳', '合作', '體貼'], direction: '把感受轉成清楚需求，讓溫和也有界線。', caution: '留意為了和諧而延後表達；沉默不必是唯一的善意。' },
  3: { name: '表達者', traits: ['創意', '溝通', '感染力'], direction: '選一件想表達的事持續完成，讓靈感落地。', caution: '留意分心或只停在構想；完成一個小作品比累積更多想法重要。' },
  4: { name: '建構者', traits: ['務實', '耐心', '可靠'], direction: '用規律支撐目標，也保留調整的彈性。', caution: '留意把安全感綁在完美流程；有些改變能讓基礎更穩。' },
  5: { name: '探索者', traits: ['靈活', '好奇', '冒險'], direction: '為探索設一個可回來的錨點，讓自由與持續並存。', caution: '留意在厭倦時立刻轉向；先確認自己正靠近什麼。' },
  6: { name: '守護者', traits: ['責任感', '關懷', '品味'], direction: '先照顧自己的能量，再把關懷分享出去。', caution: '留意把幫助變成代替；讓每個人保有自己的學習空間。' },
  7: { name: '思辨者', traits: ['洞察', '研究', '內省'], direction: '把思考後的發現說出來，讓理解成為連結。', caution: '留意用距離保護自己；被理解不一定要先把一切想清楚。' },
  8: { name: '實踐者', traits: ['企圖', '管理', '效率'], direction: '以成果、關係與價值一起衡量成功。', caution: '留意只以結果評價自己；長期信任也是重要資產。' },
  9: { name: '完成者', traits: ['包容', '理想', '整合'], direction: '把大關懷化為今天能做到的一件小事。', caution: '留意為了全局而忽略自己；你也值得被納入關心範圍。' },
  11: { name: '直覺的啟示者', traits: ['直覺', '靈感', '感受力'], direction: '以規律或創作安放感受，將靈感化為可分享的訊息。', caution: '留意感受過載；減少雜訊與維持作息能讓洞察更清楚。' },
  22: { name: '遠見的建造者', traits: ['遠見', '規劃', '落實'], direction: '將遠大願景拆成階段，從最小可持續的一步開始。', caution: '留意被目標規模壓住；大計畫需要可驗證的小里程碑。' },
  33: { name: '同理的引導者', traits: ['同理', '引導', '奉獻'], direction: '以清楚界線支持你的關懷，讓給予可以長久。', caution: '留意把所有人的需要視為自己的責任；自我照顧也是服務。' },
};

const YEAR = {
  1: { name: '啟動與自主', focus: '選定一個真正想開始的方向，先完成第一個可見步驟。', watch: '避免急著證明自己；穩定起步比一次到位更重要。' },
  2: { name: '關係與醞釀', focus: '培養耐心並整理合作關係，讓尚未成熟的想法慢慢長出輪廓。', watch: '避免把等待誤解為停滯；細緻調整本身就是前進。' },
  3: { name: '表達與連結', focus: '選一種想被看見的表達方式，讓它成為持續練習。', watch: '避免開太多支線；為真正重要的創作留位置。' },
  4: { name: '結構與深耕', focus: '整理時間、資源與工作方式，建立日後仍可使用的結構。', watch: '避免讓規則僵硬；留一點彈性，系統才有生命力。' },
  5: { name: '變動與擴張', focus: '主動接觸新經驗，同時設定能讓自己回穩的生活錨點。', watch: '避免只為逃離而改變；每次轉向前先確認正在靠近什麼。' },
  6: { name: '承諾與照料', focus: '把關懷轉為可持續的承諾，也讓自己的需求被納入安排。', watch: '避免為每個人負責；成熟的愛包含適度界線。' },
  7: { name: '回望與研究', focus: '為閱讀、研究、休息與內在整理留出固定空白。', watch: '避免用孤立取代獨處；選擇少數可信任的人保持連結。' },
  8: { name: '成果與影響', focus: '設定清楚成果指標，並以價值感檢查每一個重要決定。', watch: '避免只用效率衡量一切；健康與信任也屬於資產。' },
  9: { name: '完成與釋放', focus: '完成真正重要的最後一段，並整理經驗作為下一輪養分。', watch: '避免因不捨而延後結束；有些告別會帶來更清楚的開始。' },
  11: { name: '靈感與覺察', focus: '以穩定作息承接靈感，讓感受到的訊息有可以落地的出口。', watch: '避免讓感受過載；減少雜訊會讓洞察更清楚。' },
  22: { name: '遠見與落實', focus: '將大型計畫拆成可驗證的里程碑，並找到能一起完成的人。', watch: '避免被目標規模壓住；先完成最小而穩定的一步。' },
  33: { name: '服務與引導', focus: '選擇值得投入的對象或主題，以成熟界線擴大你的支持。', watch: '避免把所有人的需要都變成自己的責任。' },
};

const GROUPS = {
  1: '推進', 5: '推進', 8: '推進', 11: '靈感', 22: '建構', 33: '關懷',
  2: '連結', 6: '連結', 9: '連結',
  3: '表達', 7: '探索',
  4: '建構',
};
const OPPOSITES = { 推進: ['連結', '探索'], 連結: ['推進'], 表達: ['建構'], 建構: ['表達', '推進'], 探索: ['推進'] };

const digitSum = (number) => String(number).split('').reduce((sum, digit) => sum + Number(digit), 0);
function reduce(digits, labels = digits.map(String)) {
  const total = digits.reduce((sum, digit) => sum + digit, 0);
  let value = total;
  const steps = [total];
  while (value > 9 && !MASTERS.includes(value)) { value = digitSum(value); steps.push(value); }
  return { value, total, steps, labels };
}
const formula = (calculation) => `${calculation.labels.join(' + ')} = ${calculation.total}${calculation.steps.slice(1).map((step) => ` → ${step}`).join('')}`;
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));

function calculate(date, name, year) {
  const parts = date.split('-');
  const life = reduce(date.replaceAll('-', '').split('').map(Number));
  const birthDay = reduce([Number(parts[2])], [String(Number(parts[2]))]);
  const consonants = (name.toUpperCase().match(/[A-Z]/g) || []).filter((letter) => !'AEIOU'.includes(letter));
  const personality = consonants.length ? reduce(consonants.map((letter) => VALUES[letter]), consonants.map((letter) => `${letter}(${VALUES[letter]})`)) : null;
  const yearDigits = (String(Number(parts[1])) + String(Number(parts[2])) + String(year)).split('').map(Number);
  return { life, birthDay, personality, personalYear: reduce(yearDigits), year };
}

function numberCard(label, calculation, copy) {
  const profile = calculation ? NUMBERS[calculation.value] : { name: '待輸入', direction: '請輸入羅馬拼音或英文姓名。' };
  return `<article class="number-card"><span class="eyebrow">${label}</span><strong>${calculation ? calculation.value : '—'}</strong><h3>${profile.name}</h3><p>${copy}</p><div class="formula">${calculation ? formula(calculation) : '未提供姓名拼音'}</div></article>`;
}

function relationship(left, right, leftLabel, rightLabel) {
  const leftGroup = GROUPS[left.value];
  const rightGroup = GROUPS[right.value];
  if (left.value === right.value) return `你的${leftLabel}與${rightLabel}同為 ${left.value} 號，這使「${NUMBERS[left.value].name}」的傾向在不同情境中反覆出現。它可以帶來清楚的一致性，也值得留意不要把單一做法用在所有問題上。`;
  if (leftGroup === rightGroup) return `${leftLabel}的「${NUMBERS[left.value].name}」與${rightLabel}的「${NUMBERS[right.value].name}」都偏向${leftGroup}。兩者容易相互放大；可把共同能量用在一件有界線的具體事情上。`;
  if ((OPPOSITES[leftGroup] || []).includes(rightGroup)) return `${leftLabel}偏向${leftGroup}，${rightLabel}偏向${rightGroup}。這不是衝突證明，而是提醒你在「先行動」與「先理解」之間建立自己的切換節奏。`;
  return `${leftLabel}的${leftGroup}傾向與${rightLabel}的${rightGroup}傾向提供兩種不同鏡頭。當一種方法卡住時，另一種往往能補足你尚未看見的面向。`;
}

function buildReport(report) {
  const life = NUMBERS[report.life.value];
  const birthday = NUMBERS[report.birthDay.value];
  const personality = report.personality ? NUMBERS[report.personality.value] : null;
  const year = YEAR[report.personalYear.value];
  const lifeBirthday = relationship(report.life, report.birthDay, '生命道路', '生日數');
  const innerOuter = report.personality
    ? relationship(report.life, report.personality, '生命道路', '人格數')
    : '尚未輸入姓名拼音，因此本報告不推論你在他人面前的外在呈現。若希望加入這個角度，可重新輸入英文或羅馬拼音姓名。';
  const yearCross = relationship(report.life, report.personalYear, '生命道路', `${report.year} 年流年`);
  const collaboration = report.personality
    ? relationship(report.birthDay, report.personality, '生日數', '人格數')
    : `生日數的「${birthday.name}」可先作為你在熟悉情境中的觀察線索；暫不加入外在印象的比較。`;
  const uniqueValues = new Set([report.life.value, report.birthDay.value, report.personality?.value, report.personalYear.value].filter(Boolean));
  const masters = [report.life.value, report.birthDay.value, report.personality?.value, report.personalYear.value].filter((value) => MASTERS.includes(value));
  const density = uniqueValues.size <= 2 ? '配置中的數字重複度較高，主題可能更集中；適合把重複出現的傾向化為一個可持續的練習。' : '配置中的數字分布較多元，能在不同情境切換不同工具；適合先釐清此刻最需要優先使用哪一種能力。';
  const masterNote = masters.length ? `本次配置包含主數 ${masters.join('、')}。本工具將主數保留為閱讀標記，但不把它視為責任、等級或壓力來源。` : '本次配置未出現 11、22、33 主數；所有數字均按可檢查的化簡規則呈現。';
  return { life, birthday, personality, year, lifeBirthday, innerOuter, yearCross, collaboration, density, masterNote };
}

function reportSection(kicker, title, paragraphs, accent = false) {
  return `<article class="report-card${accent ? ' report-card-accent' : ''}"><span class="eyebrow">${kicker}</span><h3>${title}</h3>${paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('')}</article>`;
}

function render(report, displayName) {
  const analysis = buildReport(report);
  const prompts = [
    ['life', '生命道路', `回看近期經驗時，「${analysis.life.direction}」是否能協助你理解自己的選擇？`],
    ['birthday', '生日數', `在熟悉或需要快速反應的情境裡，你是否曾看見「${analysis.birthday.traits.join('、')}」這些傾向？`],
    ...(report.personality ? [['personality', '人格數', `你是否曾從可信任的人收到與「${analysis.personality.name}」相近的外在印象？`]] : []),
    ['year', `${report.year} 年流年`, `以今年已發生的事件來看，「${analysis.year.name}」是否提供了值得思考的角度？`],
    ['combination', '組合報告', '這份組合式閱讀中，是否至少有一段能幫助你把近期經驗說得更清楚？'],
  ];
  const audit = [
    ['生命道路數', report.life, '出生年月日所有數字相加；主數保留。'],
    ['生日數', report.birthDay, '直接取出生「日」；主數保留。'],
    ['人格數', report.personality, '英文／拼音子音以 A=1 至 I=9 循環換算；Y 視為子音。'],
    [`${report.year} 年流年`, report.personalYear, '出生月、生日與年度數字相加；主數保留。'],
  ];
  const reportHtml = `<section class="full-report" aria-labelledby="full-report-title"><div class="report-intro"><div><span class="eyebrow">COMBINATION REPORT · 04</span><h2 id="full-report-title">四條軌道，<br />一份完整閱讀。</h2></div><p>這一段把四個數字放進同一個脈絡：先看你長期的方向，再看自然反應、外在呈現與今年的節奏。它描述可能的互動，不定義你是誰。</p></div><div class="report-map"><div><span>長期主軸</span><strong>${report.life.value}</strong><small>${analysis.life.name}</small></div><div><span>自然反應</span><strong>${report.birthDay.value}</strong><small>${analysis.birthday.name}</small></div><div><span>外在呈現</span><strong>${report.personality ? report.personality.value : '—'}</strong><small>${analysis.personality ? analysis.personality.name : '未提供姓名'}</small></div><div><span>${report.year} 年節奏</span><strong>${report.personalYear.value}</strong><small>${analysis.year.name}</small></div></div><div class="report-grid">${reportSection('01 · 核心配置', '長期方向與自然反應', [analysis.lifeBirthday, `生命道路的順流方向：${analysis.life.direction}`, `生日數的成長提醒：${analysis.birthday.caution}`])}${reportSection('02 · 內外呈現', '你如何展現與被感受', [analysis.innerOuter, analysis.personality ? `人格數的平衡提醒：${analysis.personality.caution}` : '這不是資料不足造成的錯誤，而是刻意保留不臆測的界線。'])}${reportSection('03 · 年度交會', `${report.year} 年如何遇見你的主軸`, [analysis.yearCross, `年度著力點：${analysis.year.focus}`, `年度提醒：${analysis.year.watch}`], true)}${reportSection('04 · 互補與張力', '不同元素如何一起工作', [analysis.collaboration, analysis.density, analysis.masterNote])}</div><section class="integration-plan"><span class="eyebrow">INTEGRATION PLAN · 05</span><h3>把組合閱讀放回日常</h3><div class="integration-steps"><div><b>看見</b><p>本週留意一次「${analysis.life.traits[0]}」如何出現在真正重要的選擇中。</p></div><div><b>平衡</b><p>當${analysis.life.name}的習慣卡住時，試著改用生日數的「${analysis.birthday.traits[0]}」角度再看一次。</p></div><div><b>落地</b><p>依照${report.year}年的${analysis.year.name}主題，選一件小到能在七天內完成的行動。</p></div></div><p class="report-boundary">本報告不預測事件、不評定人格真實性，也不取代你的經驗與判斷。它的價值在於提供一個可回看、可修改的問題框架。</p></section></section>`;
  document.querySelector('#results').hidden = false;
  document.querySelector('#results').innerHTML = `<div class="overview"><div class="life-number">${report.life.value}</div><div class="life-copy"><p class="eyebrow">${displayName ? `給 ${escapeHtml(displayName)} 的檔案` : 'YOUR LOCAL DOSSIER'}</p><h2>${report.life.value} 號 · ${analysis.life.name}</h2><p>生命道路數提供一個長期傾向的反思角度，並非人格定論。</p><div class="traits">${analysis.life.traits.map((trait) => `<span>${trait}</span>`).join('')}</div><p><strong>順流方向：</strong>${analysis.life.direction}</p><div class="formula">生命道路公式：${formula(report.life)}</div></div></div><h2 class="grid-title">四條數字軌道</h2><div class="number-grid">${numberCard('生命道路數', report.life, '長期學習主題與行動傾向。')}${numberCard('生日數', report.birthDay, '熟悉情境下自然啟動的方式。')}${numberCard('人格數', report.personality, '他人初見時容易感受到的互動風格。')}${numberCard(`${report.year} 年流年`, report.personalYear, `年度主題：${analysis.year.name}。`)}</div>${reportHtml}<section class="audit"><h3>公式稽核</h3><div class="audit-grid">${audit.map(([label, calculation, rule]) => `<div class="audit-item"><span class="eyebrow">${label}</span><p>${rule}</p><code>${calculation ? formula(calculation) : '未提供姓名拼音'}</code></div>`).join('')}</div></section><section class="reflection"><h3>自我分析對照</h3><p>這些選項只記錄你對文字的當下共鳴，不代表排盤或人格的客觀準確率。</p>${prompts.map(([key, label, question]) => `<div class="reflection-item"><div><span class="eyebrow">${label}</span><p>${question}</p></div><div class="choices" data-key="${key}"><button data-value="符合">符合</button><button data-value="部分符合">部分符合</button><button data-value="尚不確定">尚不確定</button></div></div>`).join('')}<p class="reflection-summary" id="reflection-summary">尚未留下自我對照；「尚不確定」也是有效的結果。</p></section>`;
  document.querySelectorAll('.choices button').forEach((button) => button.addEventListener('click', () => {
    const group = button.parentElement;
    group.querySelectorAll('button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    const count = document.querySelectorAll('.choices button.active').length;
    document.querySelector('#reflection-summary').textContent = `已完成 ${count} 項自我對照。這是當下的主觀閱讀紀錄，不是對人格或未來的定論。`;
  }));
  document.querySelector('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.addEventListener('DOMContentLoaded', () => {
  const year = document.querySelector('#analysis-year');
  year.value = new Date().getFullYear();
  document.querySelector('#numerology-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const date = document.querySelector('#birth-date').value;
    const name = document.querySelector('#romanized-name').value;
    const displayName = document.querySelector('#display-name').value;
    const targetYear = Number(year.value);
    const error = document.querySelector('#form-error');
    if (!date) { error.textContent = '請先選擇出生日期。'; return; }
    if (!Number.isInteger(targetYear) || targetYear < 1900 || targetYear > 2200) { error.textContent = '請輸入 1900 至 2200 之間的年度。'; return; }
    error.textContent = '';
    render(calculate(date, name, targetYear), displayName);
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
});
