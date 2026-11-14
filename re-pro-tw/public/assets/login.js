'use strict';
const $ = (s) => document.querySelector(s);
const post = async (url, body) => {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '發生錯誤，請稍後再試');
  return data;
};
const show = (el, text, isError) => { el.hidden = false; el.textContent = text; el.classList.toggle('error', !!isError); };

document.querySelectorAll('[data-tab]').forEach((btn) => btn.addEventListener('click', () => {
  document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b === btn));
  $('#login-form').hidden = btn.dataset.tab !== 'login';
  $('#register-form').hidden = btn.dataset.tab !== 'register';
}));

fetch('/api/meta').then((r) => r.json()).then((meta) => {
  $('#profession').innerHTML = meta.professions.map((p) => `<option>${p}</option>`).join('');
  const input = $('#invite-field input');
  if (meta.registrationMode === 'invite') { $('#invite-field').firstChild.textContent = '邀請碼（必填）'; input.required = true; }
  if (meta.registrationMode === 'closed') { $('#register-form').innerHTML = '<div class="alert info">目前暫停開放註冊，請洽管理員取得帳號。</div>'; }
});

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.submitter; btn.disabled = true;
  try {
    await post('/api/auth/login', Object.fromEntries(new FormData(e.target)));
    location.href = '/';
  } catch (err) { show($('#login-msg'), err.message, true); }
  btn.disabled = false;
});

$('#register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.submitter; btn.disabled = true;
  try {
    const r = await post('/api/auth/register', Object.fromEntries(new FormData(e.target)));
    show($('#register-msg'), r.message, false);
    e.target.reset();
  } catch (err) { show($('#register-msg'), err.message, true); }
  btn.disabled = false;
});
