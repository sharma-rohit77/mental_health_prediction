/* =========================================================
   MindMetric – front-end logic
   Sections: 1 Config · 2 Form builder · 3 Navigation ·
             4 Validation · 5 API call · 6 Results · 7 Init
   ========================================================= */
'use strict';

/* ---------- 1. CONFIG ----------
   Dropdown values match the FastAPI `StudentData` schema (Literal types). */
const API_URL = 'http://127.0.0.1:8000/predict';

const SECTIONS = [
  { title: 'About you', icon: 'user', fields: [
    { name: 'Age', label: 'Age', type: 'number', min: 10, max: 100, value: 21, hint: 'Years (10–100)' },
    { name: 'Gender', label: 'Gender', type: 'select', options: ['Male', 'Female'] },
    { name: 'Country', label: 'Country', type: 'select', options: ["Afghanistan", "Albania", "Andorra", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Belgium", "Bhutan", "Brazil", "Bulgaria", "Canada", "Chile", "China", "Costa Rica", "Croatia", "Cyprus", "Czech Republic", "Denmark", "Egypt", "Estonia", "Finland", "France", "Georgia", "Germany", "Ghana", "Greece", "Hong Kong", "Hungary", "Iceland", "India", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kosovo", "Kyrgyzstan", "Latvia", "Lebanon", "Liechtenstein", "Lithuania", "Luxembourg", "Malaysia", "Maldives", "Malta", "Mexico", "Moldova", "Monaco", "Morocco", "Nepal", "Netherlands", "New Zealand", "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan", "Panama", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "San Marino", "Serbia", "Singapore", "Slovakia", "Slovenia", "South Africa", "South Korea", "Spain", "Sri Lanka", "Sweden", "Switzerland", "Taiwan", "Tajikistan", "Trinidad", "Turkey", "UAE", "UK", "USA", "Ukraine", "Uruguay", "Uzbekistan", "Vatican City", "Venezuela", "Vietnam", "Other"], hint: 'Choose Other if your country is not listed' },
    { name: 'Academic_Level', label: 'Academic level', type: 'select', options: ['High School', 'Undergraduate', 'Graduate'] },
  ]},
  { title: 'Digital habits', icon: 'smartphone', fields: [
    { name: 'Most_Used_Platform', label: 'Most used platform', type: 'select', options: ['Facebook', 'LinkedIn', 'Instagram', 'Snapchat', 'Twitter', 'YouTube', 'TikTok', 'LINE', 'KakaoTalk', 'VKontakte', 'WhatsApp', 'WeChat'] },
    { name: 'Purpose_Of_Use', label: 'Main purpose of use', type: 'select', options: ['Networking', 'Education', 'Entertainment', 'News'] },
    { name: 'Avg_Daily_Usage_Hours', label: 'Daily screen usage', type: 'range', min: 0, max: 24, step: 0.5, value: 4, unit: 'h', hint: 'Average hours per day on social apps' },
    { name: 'Daily_Unlocks', label: 'Daily phone unlocks', type: 'number', min: 0, max: 500, value: 60, hint: 'Times you unlock your phone per day' },
  ]},
  { title: 'Lifestyle & wellbeing', icon: 'heart-pulse', fields: [
    { name: 'Study_Hours', label: 'Study hours per day', type: 'range', min: 0, max: 16, step: 0.5, value: 4, unit: 'h', hint: 'Time spent studying or working' },
    { name: 'Physical_Activity_Hours', label: 'Physical activity', type: 'range', min: 0, max: 8, step: 0.5, value: 1, unit: 'h', hint: 'Exercise or sport per day' },
    { name: 'Sleep_Hours_Per_Night', label: 'Sleep per night', type: 'range', min: 0, max: 14, step: 0.5, value: 7, unit: 'h', hint: 'Average hours of sleep' },
    { name: 'Stress_Level', label: 'Stress level', type: 'select', options: ['Low', 'Medium', 'High', 'Very High'], hint: 'How stressed do you usually feel?' },
  ]},
];
const FIELDS = SECTIONS.flatMap(s => s.fields);

const STATUS = {   // colour + message per status returned by the API
  excellent:  { c: '--c-excellent', msg: 'Your habits point to strong wellbeing.' },
  good:       { c: '--c-good',      msg: 'Things look healthy, with room to fine-tune.' },
  average:    { c: '--c-average',   msg: 'A balanced picture, a few habits could be improved.' },
  bad:        { c: '--c-bad',       msg: 'Some habits may be affecting your wellbeing.' },
  'very bad': { c: '--c-very-bad',  msg: 'Several habits may be weighing on your wellbeing.' },
  poor:       { c: '--c-poor',      msg: 'Your habits suggest wellbeing is under strain.' },
};

const $ = (s, el = document) => el.querySelector(s);
const form = $('#predictForm');
const icons = () => window.lucide && lucide.createIcons();

/* ---------- 2. FORM BUILDER ---------- */
function buildForm() {
  form.innerHTML = SECTIONS.map(sec => `
    <fieldset><legend><i data-lucide="${sec.icon}"></i>${sec.title}</legend><div class="grid">
    ${sec.fields.map(f => {
      const id = 'f_' + f.name;
      let input;
      if (f.type === 'select') {
        input = `<select id="${id}" name="${f.name}" required><option value="" disabled selected hidden>Select…</option>${f.options.map(o => `<option>${o}</option>`).join('')}</select>`;
      } else if (f.type === 'range') {
        input = `<input id="${id}" name="${f.name}" type="range" min="${f.min}" max="${f.max}" step="${f.step}" value="${f.value}">`;
      } else {
        input = `<input id="${id}" name="${f.name}" type="number" min="${f.min}" max="${f.max}" value="${f.value}" required>`;
      }
      const out = f.type === 'range' ? `<output for="${id}">${f.value}${f.unit}</output>` : '';
      return `<div class="field"><label for="${id}">${f.label}${out}</label>${input}<small>${f.hint || 'Choose the closest option'}</small></div>`;
    }).join('')}
    </div></fieldset>`).join('');
  form.querySelectorAll('input[type=range]').forEach(fill);
  enhanceSelects();
  icons();
}

/* Custom dropdowns: the real <select> stays in the DOM (hidden) so values,
   validation and the API payload work exactly as before. */
function enhanceSelects() {
  const closeAll = () => document.querySelectorAll('.dd.open').forEach(d => {
    d.classList.remove('open'); d.querySelector('.dd-btn').setAttribute('aria-expanded', 'false');
  });
  form.querySelectorAll('select').forEach(sel => {
    const wrap = document.createElement('div'); wrap.className = 'dd';
    sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(sel); sel.tabIndex = -1;
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'dd-btn';
    btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
    const list = document.createElement('ul'); list.className = 'dd-list'; list.setAttribute('role', 'listbox');
    const values = [...sel.options].map(o => o.value).filter(Boolean);
    values.forEach(v => { const li = document.createElement('li'); li.setAttribute('role', 'option'); li.dataset.v = v; li.textContent = v; list.appendChild(li); });
    wrap.append(btn, list);

    const sync = () => {
      btn.textContent = sel.value || 'Select…';
      btn.classList.toggle('placeholder', !sel.value);
      list.querySelectorAll('li').forEach(li => li.setAttribute('aria-selected', li.dataset.v === sel.value));
    };
    const choose = v => {
      sel.value = v; sel.classList.remove('invalid');
      sel.dispatchEvent(new Event('input', { bubbles: true })); sync();
    };
    sel.syncDD = sync;

    btn.addEventListener('click', () => {
      const was = wrap.classList.contains('open'); closeAll();
      if (!was) {
        wrap.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
        const cur = list.querySelector('[aria-selected=true]'); cur && cur.scrollIntoView({ block: 'nearest' });
      }
    });
    list.addEventListener('click', e => {
      const li = e.target.closest('li'); if (!li) return;
      choose(li.dataset.v); closeAll(); btn.focus();
    });
    btn.addEventListener('keydown', e => {   // keyboard: arrows change value, Esc closes
      const i = values.indexOf(sel.value);
      if (e.key === 'ArrowDown') { e.preventDefault(); choose(values[Math.min(i + 1, values.length - 1)]); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); choose(values[Math.max(i - 1, 0)]); }
      else if (e.key === 'Escape') closeAll();
    });
    sync();
  });
  document.addEventListener('click', e => { if (!e.target.closest('.dd')) closeAll(); });
}

/* Paint the filled part of a slider track */
function fill(el) { el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%'); }

/* Live slider read-outs + progress bar */
form.addEventListener('input', e => {
  const f = FIELDS.find(x => x.name === e.target.name);
  if (f && f.type === 'range') fill(e.target);
  if (f && f.type === 'range') e.target.closest('.field').querySelector('output').textContent = e.target.value + f.unit;
  e.target.classList.remove('invalid');
  updateProgress();
});
function updateProgress() {
  const done = FIELDS.filter(f => form.elements[f.name].value !== '').length;
  $('#bar').style.width = (done / FIELDS.length * 100) + '%';
}

/* ---------- 3. NAVIGATION ---------- */
function show(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  icons();
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-go]');
  if (t) { e.preventDefault(); show(t.dataset.go); }
});
$('#learn').addEventListener('click', e => { e.preventDefault(); show('landing'); $('#features').scrollIntoView({ behavior: 'smooth' }); });
$('#resetBtn').addEventListener('click', resetForm);
$('#editBtn').addEventListener('click', () => show('form'));
$('#againBtn').addEventListener('click', () => { resetForm(); show('form'); });

function resetForm() {
  form.reset();
  form.querySelectorAll('select').forEach(s => s.syncDD && s.syncDD());
  form.querySelectorAll('input[type=range]').forEach(fill);
  FIELDS.filter(f => f.type === 'range').forEach(f => {
    form.elements[f.name].closest('.field').querySelector('output').textContent = f.value + f.unit;
  });
  form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
  showError('');
  updateProgress();
}

/* ---------- 4. VALIDATION ---------- */
function showError(msg) { const el = $('#formError'); el.textContent = msg; el.hidden = !msg; }

/** Returns the payload with correct types, or null if invalid. */
function collect() {
  const payload = {}, bad = [];
  FIELDS.forEach(f => {
    const el = form.elements[f.name], v = el.value.trim();
    const num = f.type !== 'select';
    const n = Number(v);
    const ok = v !== '' && (!num || (!isNaN(n) && n >= f.min && n <= f.max));
    el.classList.toggle('invalid', !ok);
    if (!ok) bad.push(f.label);
    payload[f.name] = num ? (f.name === 'Age' || f.name === 'Daily_Unlocks' ? Math.round(n) : n) : v;
  });
  if (bad.length) {
    showError('Please check: ' + bad.join(', ') + '.');
    const first = form.querySelector('.invalid');
    if (first) (first.closest('.dd')?.querySelector('.dd-btn') || first).focus();
    return null;
  }
  showError('');
  return payload;
}

/* ---------- 5. API CALL ---------- */
form.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = collect();
  if (!payload) return;

  show('loading');
  const msgs = ['Preparing your data', 'Sending to the model', 'Calculating your score'];
  let i = 0; const timer = setInterval(() => $('#loadMsg').textContent = msgs[++i % msgs.length], 1100);

  try {
    const ctrl = new AbortController(), to = setTimeout(() => ctrl.abort(), 20000);
    const [res] = await Promise.all([
      fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal }),
      new Promise(r => setTimeout(r, 1800)),   // keep the loading screen visible long enough to read
    ]);
    clearTimeout(to);
    if (!res.ok) {
      let detail = ''; try { detail = JSON.stringify((await res.json()).detail); } catch (_) {}
      throw new Error(`The server returned ${res.status}. ${detail}`);
    }
    renderResult(await res.json(), payload);
  } catch (err) {
    const offline = err.name === 'AbortError' || err instanceof TypeError;
    showError(offline
      ? 'Could not reach the prediction server at ' + API_URL + '. Check that FastAPI is running and CORS is enabled, then try again.'
      : err.message);
    show('form');
  } finally { clearInterval(timer); }
});

/* ---------- 6. RESULTS ---------- */
function recommendations(p, status) {
  const r = [];
  if (p.Sleep_Hours_Per_Night < 7) r.push(['moon', 'Aim for 7–9 hours of sleep. Keep a fixed bedtime and put screens away 30 minutes before.']);
  if (p.Avg_Daily_Usage_Hours > 5) r.push(['smartphone', 'Your screen time is high. Try app timers or one phone-free hour each day.']);
  if (p.Daily_Unlocks > 100) r.push(['bell-off', 'Frequent unlocks fragment attention. Silence non-essential notifications.']);
  if (p.Physical_Activity_Hours < 1) r.push(['footprints', 'Add a 20–30 minute walk or workout. Even light movement lifts mood.']);
  if (['High', 'Very High'].includes(p.Stress_Level)) r.push(['wind', 'Stress is high. Try slow breathing, short breaks, or talking with someone you trust.']);
  if (p.Study_Hours > 10) r.push(['coffee', 'Long study days need breaks. Use short rests every 50 minutes.']);
  if (['bad', 'very bad', 'poor'].includes(status)) r.push(['life-buoy', 'If you feel low for weeks, consider speaking with a counsellor or doctor.']);
  if (!r.length) r.push(['check-circle-2', 'Keep up your current routine and check in with yourself regularly.']);
  return r.slice(0, 5);
}

function renderResult(data, p) {
  const score = Number(data.predicted_score), key = String(data.status || '').toLowerCase();
  const st = STATUS[key] || { c: '--violet', msg: 'Here is your estimated score.' };
  const card = $('#result');
  card.style.setProperty('--accent', `var(${st.c})`);

  $('#status').textContent = data.status || 'Result';
  $('#statusText').textContent = st.msg;
  $('#recs').innerHTML = recommendations(p, key).map(([ic, t], i) =>
    `<li style="animation-delay:${i * 90}ms"><i data-lucide="${ic}"></i><span>${t}</span></li>`).join('');
  $('#summary').innerHTML = FIELDS.map(f => {
    const v = p[f.name] + (f.type === 'range' ? f.unit : '');
    return `<div><dt>${f.label}</dt><dd>${v}</dd></div>`;
  }).join('');

  show('result');

  // Animate ring (circumference = 2πr ≈ 326.7) and count-up number
  const arc = $('#arc'); arc.style.strokeDashoffset = 326.7;
  const pct = Math.max(0, Math.min(1, score / 10));
  requestAnimationFrame(() => requestAnimationFrame(() => arc.style.strokeDashoffset = 326.7 * (1 - pct)));
  const out = $('#score'), t0 = performance.now();
  (function tick(t) {
    const k = Math.min(1, (t - t0) / 1600);
    out.textContent = (score * (1 - Math.pow(1 - k, 3))).toFixed(1);
    if (k < 1) requestAnimationFrame(tick);
  })(t0);
}

/* ---------- 7. INIT ---------- */
buildForm();
updateProgress();
icons();