/* ATX Home Rescue — Booking flow state machine
 * Requires i18n.js to be loaded first (provides I18N, lang, t, setLang).
 */

/* ---------- State ---------- */
const STATE = {
  step: 1, // 1..5
  zip: null,
  photos: 0,
  slot: null,
  slotDay: null,
};

/* ---------- DOM refs ---------- */
const body    = document.getElementById('chatBody');
const input   = document.getElementById('chatInput');
const sendBtn = document.getElementById('chatSend');

/* ---------- Renderers ---------- */
function renderSteps() {
  const root = document.getElementById('steps');
  const keys = ['step1', 'step2', 'step3', 'step4', 'step5'];
  root.innerHTML = keys.map((k, i) => {
    const n   = i + 1;
    const cls = STATE.step > n ? 'done' : STATE.step === n ? 'on' : '';
    return `<div class="step ${cls}"><div class="n">${STATE.step > n ? '✓' : n}</div><label>${t(k)}</label></div>`;
  }).join('');
}

function renderHeader() {
  document.getElementById('backLink').textContent   = t('back');
  document.getElementById('rangerName').textContent = t('rangerName');
  document.getElementById('rangerSub').textContent  = t('rangerSub');
  document.getElementById('chatInput').placeholder  = t('chatPlaceholder');
  document.getElementById('chatFoot').innerHTML     = `<span style="color:var(--orange)">●</span> ${t('chatFoot')}`;
  document.getElementById('sumEyebrow').textContent = t('sumEyebrow');
  document.getElementById('inclLbl').textContent    = t('inclLbl');
  document.getElementById('photoLbl').textContent   = t('photoLbl');
  document.getElementById('slotLbl').textContent    = t('slotLbl');
  document.getElementById('totalsLbl').textContent  = t('totalsLbl');
  document.getElementById('sumNote').textContent    = t('sumNote');
  const tog = document.getElementById('langToggle');
  if (tog) tog.innerHTML = `<span class="lang-flag ${lang === 'en' ? '' : 'off'}">EN</span> / <span class="lang-flag ${lang === 'es' ? '' : 'off'}">ES</span>`;
}

function renderSummary() {
  const title = document.getElementById('sumTitle');
  const price = document.getElementById('sumPrice');
  const meta  = document.getElementById('sumMeta');

  if (STATE.step >= 3) {
    title.textContent = t('pkgName');
    price.textContent = t('pkgPrice');
    meta.textContent  = t('pkgDur');
    document.getElementById('sumInclSec').style.display = '';
    document.getElementById('sumIncl').innerHTML = [1,2,3,4,5,6].map(i => `<li>${t('inc' + i)}</li>`).join('');
  } else {
    title.textContent = '—';
    price.textContent = '—';
    meta.textContent  = t('sumEmpty');
    document.getElementById('sumInclSec').style.display = 'none';
  }

  const photoSec = document.getElementById('sumPhotoSec');
  if (STATE.photos > 0) {
    photoSec.style.display = '';
    document.getElementById('sumPhotos').innerHTML =
      Array.from({ length: STATE.photos }).map((_, i) => `<div class="upload filled">PH ${i + 1}</div>`).join('');
  } else {
    photoSec.style.display = 'none';
  }

  const slotSec = document.getElementById('sumSlotSec');
  if (STATE.slot) {
    slotSec.style.display = '';
    document.getElementById('sumSlotText').textContent = STATE.slotDay + ' · ' + STATE.slot;
  } else {
    slotSec.style.display = 'none';
  }

  const totSec = document.getElementById('sumTotalsSec');
  if (STATE.step >= 5) {
    totSec.style.display = '';
    document.getElementById('sumTotals').innerHTML = `
      <div class="row"><span>${t('dep')}</span><b>$59.90</b></div>
      <div class="row"><span>${t('bal')}</span><b>$539.10</b></div>
      <div class="row total"><span>${t('total')}</span><span>$599.00</span></div>`;
  } else {
    totSec.style.display = 'none';
  }
}

/* ---------- Chat helpers ---------- */
function addBubble(html, cls) {
  const d = document.createElement('div');
  d.className = 'bubble ' + (cls || '');
  d.innerHTML = html;
  body.appendChild(d);
  body.scrollTop = body.scrollHeight;
  return d;
}

function typing(cb, delay) {
  delay = delay === undefined ? 900 : delay;
  const d = addBubble('<span class="typing"><span></span><span></span><span></span></span>');
  setTimeout(() => { d.remove(); cb(); }, delay);
}

function addSuggestions(options) {
  const s = document.createElement('div');
  s.className = 'suggestions';
  s.innerHTML = options.map(o => `<button class="sug" data-val="${o.val}">${o.label}</button>`).join('');
  body.appendChild(s);
  body.scrollTop = body.scrollHeight;
  s.querySelectorAll('.sug').forEach(b => {
    b.onclick = () => {
      const v = b.dataset.val;
      const label = b.textContent;
      addBubble(label, 'me');
      s.remove();
      onAnswer(v, label);
    };
  });
}

/* ---------- Flow ---------- */
let flowStage = 'greet';
let currentInputHandler = null;

function start() {
  body.innerHTML = '';
  STATE.step = 1; STATE.zip = null; STATE.photos = 0; STATE.slot = null; STATE.slotDay = null;
  flowStage = 'greet';
  currentInputHandler = null;
  renderSteps(); renderSummary();
  typing(() => {
    addBubble(t('greet'));
    addSuggestions([
      { val: 'deck',  label: t('s1') },
      { val: 'list',  label: t('s2') },
      { val: 'tv',    label: t('s3') },
      { val: 'fence', label: t('s4') },
      { val: 'smart', label: t('s5') },
      { val: 'other', label: t('sOther') },
    ]);
  }, 400);
}

function onAnswer(val, label) {
  if (flowStage === 'greet') {
    flowStage = 'zip';
    typing(() => {
      addBubble(t('askZip'));
      currentInputHandler = (text) => {
        addBubble(text, 'me');
        const ok  = ['78726', '78727', '78729', '78730', '78731', '78750', '78759'];
        const zip = text.match(/\d{5}/);
        if (zip && ok.includes(zip[0])) {
          STATE.zip = zip[0];
          currentInputHandler = null;
          typing(() => { addBubble(`✅ ${t('zipOk')}`); askPhotos(); });
        } else {
          typing(() => addBubble(t('zipBad')));
        }
      };
      addSuggestions([
        { val: '78750', label: '78750' },
        { val: '78759', label: '78759' },
        { val: '78730', label: '78730' },
      ]);
      // ZIP chip clicks bypass the text handler
      body.querySelectorAll('.suggestions:last-child .sug').forEach(b => {
        b.onclick = () => {
          STATE.zip = b.dataset.val;
          addBubble(b.textContent, 'me');
          b.parentElement.remove();
          typing(() => { addBubble(`✅ ${t('zipOk')}`); askPhotos(); });
        };
      });
    });
  }
}

function askPhotos() {
  flowStage = 'photos';
  STATE.step = 2; renderSteps();
  typing(() => {
    addBubble(t('askPhotos'));
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="uploads" style="margin:6px 0 10px;max-width:320px">
        <div class="upload" data-i="0">＋</div>
        <div class="upload" data-i="1">＋</div>
        <div class="upload" data-i="2">＋</div>
        <div class="upload" data-i="3">＋</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="sug" id="skipPhotos">${t('photoSkip')}</button>
        <button class="sug" id="donePhotos" style="background:var(--navy);color:#fff;border-color:var(--navy)">${t('photoDone')} →</button>
      </div>`;
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;
    wrap.querySelectorAll('.upload').forEach(u => {
      u.onclick = () => {
        if (u.classList.contains('filled')) return;
        u.classList.add('filled');
        u.textContent = 'PH ' + (+u.dataset.i + 1);
        STATE.photos++;
        renderSummary();
      };
    });
    wrap.querySelector('#skipPhotos').onclick = () => { wrap.remove(); askDetails(); };
    wrap.querySelector('#donePhotos').onclick = () => { wrap.remove(); askDetails(); };
  });
}

function askDetails() {
  flowStage = 'details';
  typing(() => {
    addBubble(t('askDetails') + `<br/>• ${t('qSqft')}<br/>• ${t('qBoards')}<br/>• ${t('qStain')}`);
    addSuggestions([
      { val: 'sqft',  label: t('aSqft') },
      { val: 'boards',label: t('aBoards') },
      { val: 'stain', label: t('aStain') },
    ]);
    let answered = 0;
    body.querySelectorAll('.suggestions:last-child .sug').forEach(b => {
      b.onclick = () => {
        addBubble(b.textContent, 'me');
        b.remove();
        answered++;
        if (answered >= 2) {
          const sugWrap = body.querySelector('.suggestions:last-child');
          if (sugWrap) sugWrap.remove();
          proposeBundle();
        }
      };
    });
  });
}

function proposeBundle() {
  flowStage = 'propose';
  STATE.step = 3; renderSteps(); renderSummary();
  typing(() => {
    addBubble(t('propose'));
    const card = addBubble(`
      <div class="ch">
        <div style="font-family:'Anton';font-size:18px;text-transform:uppercase;letter-spacing:.01em">🪵 ${t('pkgName')}</div>
        <div style="font-size:12px;color:var(--ink-soft);margin-top:2px">${t('inc1')} · ${t('inc4')}</div>
      </div>
      <div class="cm">
        <span class="price">${t('pkgPrice')}</span>
        <span class="dur">${t('pkgDur')}</span>
      </div>
      <div class="cbtns">
        <button class="btn" id="acceptBtn">${t('accept')}</button>
        <button class="btn ghost" style="padding:8px 14px;font-size:12px">${t('alt')}</button>
      </div>`, 'card');
    card.querySelector('#acceptBtn').onclick = () => {
      addBubble(t('accept'), 'me');
      openSchedule();
    };
  }, 1100);
}

function openSchedule() {
  flowStage = 'schedule';
  STATE.step = 4; renderSteps();
  typing(() => {
    addBubble(t('picking'));
    const cal = document.createElement('div');
    cal.innerHTML = `<div class="cal"></div><div style="margin-top:14px;font-weight:700;font-size:13px" id="pickSlotLbl">${t('pickSlot')}</div><div class="slots" id="slotGrid"></div>`;
    body.appendChild(cal);
    body.scrollTop = body.scrollHeight;

    const calGrid = cal.querySelector('.cal');
    ['M','T','W','T','F','S','S'].forEach(x => {
      const el = document.createElement('div'); el.className = 'dh'; el.textContent = x; calGrid.appendChild(el);
    });

    const start = new Date(); start.setDate(start.getDate() + 2);
    for (let i = 0; i < 7; i++) {
      const dt = new Date(start); dt.setDate(start.getDate() + i);
      const d = document.createElement('div'); d.className = 'day';
      if (i === 5 || i === 6) d.classList.add('muted');
      const dayNames = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
      const dayIdx = dt.getDay() === 0 ? 6 : dt.getDay() - 1;
      d.innerHTML = `<div class="d">${dayNames[dayIdx]}</div><div class="n">${dt.getDate()}</div>${i < 3 ? '<div class="tag">3 LEFT</div>' : ''}`;
      d.onclick = () => {
        if (d.classList.contains('muted')) return;
        cal.querySelectorAll('.day').forEach(x => x.classList.remove('on'));
        d.classList.add('on');
        STATE.slotDay = `${d.querySelector('.d').textContent} ${dt.getDate()}`;
        showSlots();
      };
      calGrid.appendChild(d);
    }

    function showSlots() {
      const grid = document.getElementById('slotGrid');
      const slots = [
        { t: '8–10 AM',       tag: '3 LEFT' },
        { t: '10 AM – 12 PM', tag: 'POPULAR' },
        { t: '1–3 PM',        tag: '1 LEFT' },
        { t: '3–5 PM',        tag: '',   full: true },
      ];
      grid.innerHTML = '';
      slots.forEach(s => {
        const b = document.createElement('button');
        b.className = 'slot' + (s.full ? ' full' : '');
        b.innerHTML = `<span>${s.t}</span>${s.tag ? `<span class="tag">${s.tag}</span>` : ''}`;
        b.onclick = () => {
          if (s.full) return;
          grid.querySelectorAll('.slot').forEach(x => x.classList.remove('on'));
          b.classList.add('on');
          STATE.slot = s.t;
          renderSummary();
          setTimeout(() => {
            addBubble(`${STATE.slotDay} · ${s.t}`, 'me');
            cal.remove();
            askContact();
          }, 400);
        };
        grid.appendChild(b);
      });
    }
  });
}

function askContact() {
  flowStage = 'contact';
  typing(() => {
    addBubble(t('confirm'));
    const form = document.createElement('div');
    form.className = 'fform';
    form.innerHTML = `
      <div><label>${t('fName')}</label><input type="text" autocomplete="name" placeholder="Your name"/></div>
      <div><label>${t('fPhone')}</label><input type="tel" autocomplete="tel" placeholder="(512) 555-0123"/></div>
      <div class="full"><label>${t('fAddr')}</label><input type="text" autocomplete="street-address" placeholder="Street address, Austin TX"/></div>
      <div class="full"><label>${t('fNotes')}</label><textarea rows="2" placeholder="Gate code, pets, where to park, etc."></textarea></div>
      <div class="full" style="display:flex;gap:8px;margin-top:6px">
        <button class="btn" id="toPay">Continue to payment →</button>
      </div>`;
    body.appendChild(form);
    body.scrollTop = body.scrollHeight;
    form.querySelector('#toPay').onclick = () => { form.remove(); reviewAndPay(); };
  });
}

function reviewAndPay() {
  flowStage = 'pay';
  STATE.step = 5; renderSteps(); renderSummary();
  typing(() => {
    addBubble(t('reviewPay'));
    const pay = document.createElement('div');
    pay.innerHTML = `
      <div class="bubble card">
        <div class="ch" style="display:flex;align-items:center;gap:8px">
          <span style="font-weight:800">💳 Jobber Payments</span>
          <span class="mono" style="margin-left:auto;font-size:11px;color:var(--ink-soft)">Visa •••4242</span>
        </div>
        <div class="cm" style="display:grid;gap:6px">
          <div style="display:flex;justify-content:space-between;font-size:14px"><span>${t('dep')}</span><b>$59.90</b></div>
          <div style="display:flex;justify-content:space-between;font-size:14px"><span>${t('bal')}</span><b>$539.10</b></div>
          <div style="display:flex;justify-content:space-between;font-size:16px;padding-top:6px;border-top:1px solid var(--rule)"><b>${t('total')}</b><b>$599.00</b></div>
        </div>
        <div class="cbtns">
          <button class="btn" id="payBtn">${t('payBtn')}</button>
          <button class="btn ghost" style="padding:8px 14px;font-size:12px">${t('payAlt')}</button>
        </div>
      </div>`;
    body.appendChild(pay);
    body.scrollTop = body.scrollHeight;
    pay.querySelector('#payBtn').onclick = () => { pay.remove(); showDone(); };
  });
}

function showDone() {
  flowStage = 'done';
  body.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'done-wrap';
  el.innerHTML = `
    <div class="check">✓</div>
    <h1>${t('success')}</h1>
    <p class="sub">${t('successSub')}</p>
    <div class="recap">
      <div class="row"><span class="lbl">${t('recJob')}</span><span class="val">${t('pkgName')} · ${t('pkgPrice')}</span></div>
      <div class="row"><span class="lbl">${t('recWhen')}</span><span class="val">${STATE.slotDay} · ${STATE.slot}</span></div>
      <div class="row"><span class="lbl">${t('recWhere')}</span><span class="val">NW Austin · ${STATE.zip || '—'}</span></div>
      <div class="row"><span class="lbl">${t('recPaid')}</span><span class="val" style="color:var(--green)">✓ $59.90</span></div>
    </div>
    <div class="next-actions">
      <button class="btn">${t('a1')}</button>
      <button class="btn navy">${t('a2')}</button>
      <button class="btn ghost" style="padding:10px 16px">${t('a3')}</button>
    </div>`;
  body.appendChild(el);
  body.scrollTop = body.scrollHeight;
}

/* ---------- Input handling ---------- */
function sendText() {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  if (currentInputHandler) {
    currentInputHandler(text);
  } else if (flowStage === 'greet') {
    addBubble(text, 'me');
    onAnswer('other', text);
  }
}

sendBtn.onclick = sendText;
input.addEventListener('keydown', e => { if (e.key === 'Enter') sendText(); });

document.getElementById('attachBtn').onclick = () => {
  if (flowStage === 'photos') {
    const u = body.querySelector('.upload:not(.filled)');
    if (u) u.click();
  }
};

/* ---------- Language toggle ---------- */
document.getElementById('langToggle').addEventListener('click', () => {
  setLang(lang === 'en' ? 'es' : 'en');
  renderHeader();
  renderSteps();
  renderSummary();
  start();
});

/* ---------- Boot ---------- */
renderHeader(); renderSteps(); renderSummary(); start();
