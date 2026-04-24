/* ATX Home Rescue — Booking page bootstrap
 * Mounts the Ranger Agent into #chatWrap, wires the summary panel,
 * and handles the lang toggle.
 * Requires: i18n.js, jobber-config.js, ranger-shared.js, ranger-agent.js
 */

/* Destructure from window.RangerShared (set by ranger-shared.js) */
var _rs = window.RangerShared;
var SummaryStore              = _rs.SummaryStore;
var saveConversation          = _rs.saveConversation;
var getDeepLinkAsk            = _rs.getDeepLinkAsk;

/* ---------- Step bar ---------- */
const STEP_KEYS = ['step1','step2','step3','step4','step5'];
let currentStep = 1;

function renderSteps(step) {
  currentStep = step || currentStep;
  const root = document.getElementById('steps');
  if (!root) return;
  root.innerHTML = STEP_KEYS.map((k, i) => {
    const n   = i + 1;
    const cls = currentStep > n ? 'done' : currentStep === n ? 'on' : '';
    return `<div class="step ${cls}"><div class="n">${currentStep > n ? '✓' : n}</div><label>${t(k)}</label></div>`;
  }).join('');
}

/* ---------- Summary panel ---------- */
const summaryStore = new SummaryStore();

function renderSummary(state) {
  const title  = document.getElementById('sumTitle');
  const price  = document.getElementById('sumPrice');
  const meta   = document.getElementById('sumMeta');

  if (state.package_name) {
    title.textContent = state.package_name;
    price.textContent = state.package_price || '—';
    meta.textContent  = state.package_data?.duration || '';
    renderSteps(3);

    /* What's included */
    const inclSec = document.getElementById('sumInclSec');
    const inclList = document.getElementById('sumIncl');
    const includes = lang === 'es'
      ? state.package_data?.includes_es
      : state.package_data?.includes_en;
    if (includes?.length) {
      inclSec.style.display = '';
      inclList.innerHTML = includes.map(i => `<li>${i}</li>`).join('');
    }
  } else {
    title.textContent = '—';
    price.textContent = '—';
    meta.textContent  = t('sumEmpty');
    document.getElementById('sumInclSec').style.display = 'none';
  }

  /* Photos */
  const photoSec = document.getElementById('sumPhotoSec');
  if (state.photos > 0) {
    photoSec.style.display = '';
    document.getElementById('sumPhotos').innerHTML =
      Array.from({ length: state.photos }).map((_, i) =>
        `<div class="upload filled">PH ${i + 1}</div>`).join('');
  } else {
    photoSec.style.display = 'none';
  }

  /* "What Ranger knows" detail fields */
  const detailSec = document.getElementById('sumDetailsSec');
  const detailDiv = document.getElementById('sumDetails');
  const fields = [];
  if (state.zip)          fields.push({ lbl: 'ZIP',     val: state.zip });
  if (state.service_name) fields.push({ lbl: 'Service', val: state.service_name });
  if (state.contact_name) fields.push({ lbl: 'Name',    val: state.contact_name });
  if (state.contact_phone)fields.push({ lbl: 'Phone',   val: state.contact_phone });
  if (state.preferred_windows?.length) {
    fields.push({ lbl: 'Times', val: state.preferred_windows.join(', ') });
  }
  if (fields.length) {
    detailSec.style.display = '';
    detailDiv.innerHTML = fields.map(f =>
      `<div class="sum-field-row sum-field-enter">
         <span class="sum-field-lbl">${f.lbl}</span>
         <span class="sum-field-val">${f.val}</span>
       </div>`).join('');
  } else {
    detailSec.style.display = 'none';
  }

  /* Contact section (once name + phone are collected) */
  const contactSec = document.getElementById('sumContactSec');
  if (state.contact_name || state.contact_phone) {
    contactSec.style.display = '';
    document.getElementById('sumContact').innerHTML =
      `<div style="font-size:13px;line-height:1.7">
        ${state.contact_name  ? `<div>${state.contact_name}</div>`  : ''}
        ${state.contact_phone ? `<div>${state.contact_phone}</div>` : ''}
        ${state.contact_email ? `<div>${state.contact_email}</div>` : ''}
      </div>`;
  } else {
    contactSec.style.display = 'none';
  }
}

summaryStore.on(renderSummary);

/* ---------- Static i18n labels ---------- */
function renderStaticLabels() {
  const el = (id) => document.getElementById(id);
  if (el('backLink'))   el('backLink').textContent   = t('back');
  if (el('sumEyebrow')) el('sumEyebrow').textContent = t('sumEyebrow');
  if (el('inclLbl'))    el('inclLbl').textContent    = t('inclLbl');
  if (el('photoLbl'))   el('photoLbl').textContent   = t('photoLbl');
  if (el('contactLbl')) el('contactLbl').textContent = 'Contact';
  if (el('sumNote'))    el('sumNote').textContent    = t('sumNote');
  if (el('sumDetailsSec')) el('sumDetailsSec').querySelector('h4').textContent = lang === 'es' ? 'Lo que sabe Ranger' : 'What Ranger knows';
  const tog = document.getElementById('langToggle');
  if (tog) tog.innerHTML = `<span class="lang-flag ${lang === 'en' ? '' : 'off'}">EN</span> / <span class="lang-flag ${lang === 'es' ? '' : 'off'}">ES</span>`;
}

/* ---------- Mount agent ---------- */
const chatWrap = document.getElementById('chatWrap');

/* Check for ?resume= to restore a specific conversation */
const resumeId = new URLSearchParams(location.search).get('resume');
if (resumeId) sessionStorage.setItem('atx_conv_id', resumeId);

window.RangerAgent.mount({
  container:    chatWrap,
  summaryStore: summaryStore,
  lang:         lang,
  initialMessage: getDeepLinkAsk(),
  onBooked: () => renderSteps(5),
});

/* ---------- Lang toggle ---------- */
document.getElementById('langToggle').addEventListener('click', () => {
  setLang(lang === 'en' ? 'es' : 'en');
  renderStaticLabels();
  renderSteps(1);
  summaryStore.reset();
  chatWrap.innerHTML = '';
  window.RangerAgent.mount({
    container:    chatWrap,
    summaryStore: summaryStore,
    lang:         lang,
    onBooked:     () => renderSteps(5),
  });
});

/* ---------- Boot ---------- */
renderStaticLabels();
renderSteps(1);
