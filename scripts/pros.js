/* ATX Home Rescue — Our Pros page logic
 * Requires i18n.js + ranger-shared.js to be loaded first
 * (provides setLang/lang/t/applyI18n/bindLangToggle and window.RangerShared).
 */

/* ---- Apply translations + lang toggle ---- */
applyI18n();
bindLangToggle(applyI18n);

/* ---- Category filter tabs (filter the gallery by data-cat) ---- */
document.querySelectorAll('.cat-tabs').forEach(group => {
  group.querySelectorAll('.cat').forEach(c => {
    c.addEventListener('click', () => {
      group.querySelectorAll('.cat').forEach(x => x.classList.remove('on'));
      c.classList.add('on');
      const cat = c.dataset.cat || 'all';
      const gallery = document.querySelector('.gallery');
      if (!gallery) return;
      gallery.querySelectorAll('.shot').forEach(s => {
        const sc = s.dataset.cat || '';
        s.style.display = (cat === 'all' || sc === cat) ? '' : 'none';
      });
    });
  });
});

/* ---- Smooth scroll for in-page anchors ---- */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const el = document.getElementById(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', '#' + id);
    }
  });
});

/* ---- Contractor application form ---- */
const form = document.getElementById('contractor-form');
if (form) {
  const submitBtn = form.querySelector('button[type="submit"]');
  let errorBox = null;

  function showError(key) {
    if (!errorBox) {
      errorBox = document.createElement('div');
      errorBox.className = 'apply-error';
      errorBox.style.cssText =
        'background:#fde6e0;border:1.5px solid #c44;color:#7a1f1f;' +
        'padding:12px 14px;font-size:13px;font-weight:600;' +
        'margin:14px 28px 0;line-height:1.5;border-radius:2px';
      const foot = form.querySelector('.form-foot');
      foot.parentNode.insertBefore(errorBox, foot);
    }
    errorBox.textContent = t(key);
  }
  function clearError() {
    if (errorBox) errorBox.remove();
    errorBox = null;
  }

  function collectForm() {
    const fd = new FormData(form);
    const obj = {};
    for (const [k, v] of fd.entries()) {
      if (k === 'trade') continue;  // handled separately
      obj[k] = (typeof v === 'string') ? v : '';
    }
    obj.trades = fd.getAll('trade');
    /* Required agreements as booleans */
    for (const k of ['agree_booking', 'agree_photos', 'agree_brand', 'agree_review']) {
      obj[k] = !!form.querySelector(`input[name="${k}"]`)?.checked;
    }
    return obj;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    clearError();

    /* Client-side required-field check */
    const required = form.querySelectorAll('[required]');
    let bad = false;
    let firstBad = null;
    required.forEach(el => {
      if (el.type === 'checkbox') {
        const wrap = el.closest('.agree');
        if (!el.checked) {
          bad = true;
          if (wrap) wrap.style.borderColor = '#c44';
          if (!firstBad) firstBad = wrap || el;
        } else if (wrap) {
          wrap.style.borderColor = '';
        }
      } else {
        if (!el.value) {
          bad = true;
          el.style.borderColor = '#c44';
          if (!firstBad) firstBad = el;
        } else {
          el.style.borderColor = '';
        }
      }
    });
    if (bad) {
      if (firstBad) firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showError('pros.apply.err.fill');
      return;
    }

    /* Lock the button + collect payload */
    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = t('pros.apply.sending');

    const payload = collectForm();

    /* Turnstile (best-effort — Worker enforces if configured) */
    if (window.RangerShared && typeof window.RangerShared.getTurnstileToken === 'function') {
      try { payload.turnstileToken = await window.RangerShared.getTurnstileToken(); }
      catch { payload.turnstileToken = null; }
    }

    const base = (window.RangerShared && window.RangerShared.WORKER_BASE)
      || 'https://ranger-api.atxhomerescue.workers.dev';

    let resp;
    try {
      resp = await fetch(base + '/apply', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
    } catch {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
      showError('pros.apply.err.network');
      return;
    }

    if (!resp.ok) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
      let key = 'pros.apply.err.generic';
      if (resp.status === 429)      key = 'pros.apply.err.rate';
      else if (resp.status === 403) key = 'pros.apply.err.bot';
      showError(key);
      return;
    }

    /* Success */
    document.getElementById('form-body').style.display = 'none';
    form.querySelector('.form-foot').style.display = 'none';
    const ok = document.getElementById('form-success');
    ok.classList.add('on');
    ok.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}
