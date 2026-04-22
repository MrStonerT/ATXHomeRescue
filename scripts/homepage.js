/* ATX Home Rescue — Homepage interactions
 * Requires i18n.js to be loaded first (provides I18N, lang, t, setLang).
 */

/* ---------- Headline variants for each language ---------- */
const HEADLINES = {
  en: {
    rescue:  { l1: 'Half-finished&nbsp;project?',    l2: 'Mile-long&nbsp;to-do&nbsp;list?', l3: 'We rescue homes.' },
    reclaim: { l1: 'Your weekend is not',             l2: 'a to-do list.',                   l3: 'Reclaim it.' },
    crush:   { l1: 'Half-done, long overdue,',        l2: 'and just plain annoying?',         l3: 'We crush to-do lists.' },
    finish:  { l1: 'You started it.',                 l2: 'Life got busy.',                   l3: 'We finish what you started.' }
  },
  es: {
    rescue:  { l1: '¿Proyecto a medias?',             l2: '¿Lista interminable?',             l3: 'Rescatamos hogares.' },
    reclaim: { l1: 'Tu fin de semana',                l2: 'no es una lista.',                 l3: 'Recupéralo.' },
    crush:   { l1: 'A medias, atrasado',              l2: 'y molesto.',                       l3: 'Acabamos con tu lista.' },
    finish:  { l1: 'Tú lo empezaste.',                l2: 'La vida se atravesó.',             l3: 'Nosotros lo terminamos.' }
  }
};

const HEADLINE_KEYS = ['rescue', 'reclaim', 'crush', 'finish'];
let currentHeadline = 'reclaim';

/* Measure every variant in every language and pin the h1 to the tallest result.
   Called on load and on window resize so the locked height stays correct. */
let _resizeTimer;
function lockHeadlineHeight() {
  const h1 = document.querySelector('.hero h1');
  if (!h1) return;
  const savedHTML = h1.innerHTML;
  h1.style.transition = 'none'; // freeze transition during measurement
  h1.style.height = '';         // release any previous lock

  let maxH = 0;
  ['en', 'es'].forEach(l => {
    HEADLINE_KEYS.forEach(key => {
      const hv = HEADLINES[l] && HEADLINES[l][key];
      if (!hv) return;
      h1.innerHTML = `${hv.l1}<br/>${hv.l2}<br/><span class="hi">${hv.l3}</span>`;
      maxH = Math.max(maxH, h1.offsetHeight);
    });
  });

  h1.innerHTML = savedHTML;
  h1.style.height = maxH + 'px';
  requestAnimationFrame(() => { h1.style.transition = ''; }); // re-enable after paint
}

window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(lockHeadlineHeight, 150);
});

function renderHeadline(key) {
  const h  = (HEADLINES[lang] || HEADLINES.en)[key] || (HEADLINES[lang] || HEADLINES.en).reclaim;
  const h1 = document.querySelector('.hero h1');
  if (!h || !h1) return;
  h1.style.opacity = '0';
  setTimeout(() => {
    h1.innerHTML = `${h.l1}<br/>${h.l2}<br/><span class="hi">${h.l3}</span>`;
    h1.style.opacity = '1';
  }, 300);
}

/* Rotate headline every 9 seconds */
setInterval(() => {
  currentHeadline = HEADLINE_KEYS[(HEADLINE_KEYS.indexOf(currentHeadline) + 1) % HEADLINE_KEYS.length];
  renderHeadline(currentHeadline);
}, 9000);

/* ---------- i18n DOM wiring ---------- */
const I18N_FIELDS = [
  { s: '.announce', k: 'announce' },
  { s: 'header.site .nav-links a[href="#packages"]', k: 'nav.packages' },
  { s: 'header.site .nav-links a[href="#how"]', k: 'nav.how' },
  { s: 'header.site .nav-links a[href="#gallery"]', k: 'nav.work' },
  { s: 'header.site .nav-links a[href="#reviews"]', k: 'nav.reviews' },
  { s: 'header.site .nav-links a[href="#faq"]', k: 'nav.faq' },
  { s: 'header.site .nav > a.btn', k: 'nav.cta' },
  { s: '.hero .eyebrow', k: 'hero.eyebrow' },
  { s: '.hero p.lede', k: 'hero.lede' },
  { s: '.hero-ctas .btn:nth-of-type(1)', k: 'hero.ctaA' },
  { s: '.hero-ctas .btn:nth-of-type(2)', k: 'hero.ctaB' },
  { s: '.chat .chat-head .name small', k: 'chat.sub' },
  { s: '#chatBody .bubble', k: 'chat.greet', first: true },
  { s: '.chat-input input', k: 'chat.placeholder', attr: 'placeholder' },
  { s: '.float-agent', k: 'float', append: true },
];

function applyLang() {
  document.documentElement.lang = lang;

  // Simple text/html fields
  I18N_FIELDS.forEach(f => {
    const nodes = f.first ? [document.querySelector(f.s)] : document.querySelectorAll(f.s);
    nodes.forEach(el => {
      if (!el) return;
      if (f.attr) {
        el.setAttribute(f.attr, t(f.k));
      } else if (f.append) {
        const av = el.querySelector('.av');
        el.innerHTML = '';
        if (av) el.appendChild(av);
        el.appendChild(document.createTextNode(' ' + t(f.k)));
      } else {
        el.innerHTML = t(f.k);
      }
    });
  });

  // Hero headline — no fade on lang swap, instant update
  const _h  = (HEADLINES[lang] || HEADLINES.en)[currentHeadline] || (HEADLINES[lang] || HEADLINES.en).reclaim;
  const _h1 = document.querySelector('.hero h1');
  if (_h && _h1) _h1.innerHTML = `${_h.l1}<br/>${_h.l2}<br/><span class="hi">${_h.l3}</span>`;

  // Hero stats
  document.querySelectorAll('.hero-stats > div').forEach((d, i) => {
    d.innerHTML = `<b>${t('stat.' + (i + 1) + 'v')}</b>${t('stat.' + (i + 1))}`;
  });

  // Chat suggestions
  const sugs = document.querySelectorAll('#chatBody .suggestions .sug');
  ['chat.s1', 'chat.s2', 'chat.s3', 'chat.s4', 'chat.s5'].forEach((k, i) => {
    if (sugs[i]) sugs[i].textContent = t(k);
  });

  // Chat foot — preserve dot
  const cf = document.querySelector('.chat .chat-foot');
  if (cf) cf.innerHTML = `<span style="color:var(--orange)">●</span> ${t('chat.foot')}`;

  // Trust items — preserve SVG
  document.querySelectorAll('.trust-item').forEach((el, i) => {
    const svg = el.querySelector('svg');
    el.innerHTML = '';
    if (svg) el.appendChild(svg);
    el.appendChild(document.createTextNode(' ' + t('trust.' + (i + 1))));
  });

  // ZIP band
  const zipH = document.querySelector('.zipband h3');
  if (zipH) zipH.innerHTML = t('zip.h');
  const zipP = document.querySelector('.zipband p');
  if (zipP) zipP.textContent = t('zip.p');
  const zipBtn = document.querySelector('.zipband button[type=submit]');
  if (zipBtn) zipBtn.innerHTML = t('zip.btn');
  const zipRes = document.getElementById('zipResult');
  if (zipRes && !zipRes.dataset.dirty) {
    zipRes.innerHTML = `${t('zip.serve')} <code>78726</code><code>78727</code><code>78729</code><code>78730</code><code>78731</code><code>78750</code><code>78759</code>`;
  }

  // Packages heading
  const pkgHead = document.querySelector('#packages .sec-head');
  if (pkgHead) {
    const eb = pkgHead.querySelector('.eyebrow');
    if (eb) {
      const dot = document.createElement('span'); dot.style.background = 'var(--orange)';
      eb.innerHTML = ''; eb.appendChild(dot); eb.appendChild(document.createTextNode(t('pkg.eyebrow')));
    }
    const h2 = pkgHead.querySelector('h2'); if (h2) h2.innerHTML = t('pkg.h');
    const sb = pkgHead.querySelector('.sub'); if (sb) sb.textContent = t('pkg.sub');
  }

  // Category tabs
  const cats = document.querySelectorAll('#packages .cat');
  ['pkg.all', 'pkg.pop', 'pkg.hand', 'pkg.smart', 'pkg.out', 'pkg.room'].forEach((k, i) => {
    if (cats[i]) cats[i].textContent = t(k);
  });

  // Package cards
  document.querySelectorAll('.pkg-grid .pkg').forEach((p, i) => {
    const h3 = p.querySelector('h3');      if (h3)    h3.textContent  = t('pkg' + (i + 1) + '.n');
    const d  = p.querySelector('.desc');   if (d)     d.textContent   = t('pkg' + (i + 1) + '.d');
    const dur= p.querySelector('.dur');    if (dur)   dur.textContent = t('pkg' + (i + 1) + '.dur');
    const btn= p.querySelector('.btn.wide');if (btn)  btn.innerHTML   = t('pkg.book');
    const badge = p.querySelector('.badge');
    if (badge) badge.textContent = i === 0 ? t('pkg.popular') : t('pkg.best');
  });

  // Hourly heading (second sec-head in #packages)
  const hrlyHead = document.querySelectorAll('#packages .sec-head')[1];
  if (hrlyHead) {
    const eb = hrlyHead.querySelector('.eyebrow');
    if (eb) {
      const dot = document.createElement('span'); dot.style.background = 'var(--orange)';
      eb.innerHTML = ''; eb.appendChild(dot); eb.appendChild(document.createTextNode(t('hrly.eyebrow')));
    }
    const h2 = hrlyHead.querySelector('h2'); if (h2) h2.innerHTML = t('hrly.h');
    const sb = hrlyHead.querySelector('.sub'); if (sb) sb.textContent = t('hrly.sub');
  }

  // Hourly blocks
  document.querySelectorAll('.hourly .block').forEach((b, i) => {
    const idx = i + 1;
    const h4  = b.querySelector('h4');      if (h4)  h4.textContent  = t('hrly.' + idx + 'n');
    const hrs = b.querySelector('.hrs');    if (hrs) hrs.textContent = t('hrly.' + idx + 'h');
    const note= b.querySelector('.note');   if (note)note.textContent= t('hrly.' + idx + 'note');
    const rsv = b.querySelector('.btn');    if (rsv) rsv.innerHTML   = t('hrly.reserve');
    const tag = b.querySelector('.pop-tag');if (tag) tag.textContent = t('hrly.2tag');
  });

  // How it works
  const howSec = document.getElementById('how');
  if (howSec) {
    const eb = howSec.querySelector('.eyebrow'); if (eb) eb.textContent = t('how.eyebrow');
    const h2 = howSec.querySelector('h2'); if (h2) h2.innerHTML = t('how.h');
    const sb = howSec.querySelector('.sub'); if (sb) sb.textContent = t('how.sub');
    howSec.querySelectorAll('.step').forEach((s, i) => {
      const h4 = s.querySelector('h4'); if (h4) h4.textContent = t('how.' + (i + 1) + 'h');
      const p  = s.querySelector('p');  if (p)  p.textContent  = t('how.' + (i + 1) + 'p');
    });
  }

  // Gallery
  const galSec = document.getElementById('gallery');
  if (galSec) {
    const eb = galSec.querySelector('.eyebrow'); if (eb) { const dot=document.createElement('span');dot.style.background='var(--orange)';eb.innerHTML='';eb.appendChild(dot);eb.appendChild(document.createTextNode(t('gal.eyebrow'))); }
    const h2 = galSec.querySelector('h2'); if (h2) h2.innerHTML = t('gal.h');
    const sb = galSec.querySelector('.sub'); if (sb) sb.textContent = t('gal.sub');
    galSec.querySelectorAll('.half.before .lbl').forEach(el => el.textContent = t('gal.before'));
    galSec.querySelectorAll('.half.after .lbl').forEach(el  => el.textContent = t('gal.after'));
    galSec.querySelectorAll('.stock-note').forEach(el       => el.textContent = t('gal.photo'));
  }

  // Reviews
  const revSec = document.getElementById('reviews');
  if (revSec) {
    const eb = revSec.querySelector('.eyebrow'); if (eb) { const dot=document.createElement('span');dot.style.background='var(--orange)';eb.innerHTML='';eb.appendChild(dot);eb.appendChild(document.createTextNode(t('rev.eyebrow'))); }
    const h2 = revSec.querySelector('h2'); if (h2) h2.innerHTML = t('rev.h');
    const sb = revSec.querySelector('.sub'); if (sb) sb.textContent = t('rev.sub');
    const zips = ['78750', '78759', '78730'];
    revSec.querySelectorAll('.quote').forEach((q, i) => {
      const p = q.querySelector('p');    if (p) p.textContent = t('rev.' + (i + 1));
      const c = q.querySelector('cite'); if (c) c.textContent = t('rev.c') + ' · ' + zips[i];
    });
  }

  // FAQ
  const faqSec = document.getElementById('faq');
  if (faqSec) {
    const eb = faqSec.querySelector('.eyebrow'); if (eb) { const dot=document.createElement('span');dot.style.background='var(--orange)';eb.innerHTML='';eb.appendChild(dot);eb.appendChild(document.createTextNode(t('faq.eyebrow'))); }
    const h2 = faqSec.querySelector('h2'); if (h2) h2.textContent = t('faq.h');
    faqSec.querySelectorAll('details').forEach((d, i) => {
      const s = d.querySelector('summary'); if (s) s.textContent = t('faq.' + (i + 1) + 'q');
      const p = d.querySelector('p');       if (p) p.textContent = t('faq.' + (i + 1) + 'a');
    });
  }

  // Big CTA
  const bc = document.querySelector('.bigcta');
  if (bc) {
    const h2 = bc.querySelector('h2'); if (h2) h2.innerHTML = t('big.h');
    const pp = bc.querySelector('p');  if (pp) pp.textContent = t('big.p');
    const cas = bc.querySelectorAll('.btn');
    if (cas[0]) cas[0].innerHTML = t('big.a');
    if (cas[1]) cas[1].innerHTML = t('big.b');
  }

  // Footer
  const fp = document.querySelector('.foot-brand p'); if (fp) fp.textContent = t('foot.brand');
  const fh = document.querySelectorAll('.foot-grid h5');
  if (fh[1]) fh[1].textContent = t('foot.pk');
  if (fh[2]) fh[2].textContent = t('foot.co');
  if (fh[3]) fh[3].textContent = t('foot.sa');
  const fb = document.querySelector('.foot-bottom > div'); if (fb) fb.textContent = t('foot.rights');
  const fbl = document.querySelectorAll('.foot-bottom a');
  if (fbl[0]) fbl[0].textContent = t('foot.priv');
  if (fbl[1]) fbl[1].textContent = t('foot.terms');

  // Language toggle visual
  const tog = document.getElementById('langToggle');
  if (tog) tog.innerHTML = `<span class="lang-flag ${lang === 'en' ? '' : 'off'}">EN</span> / <span class="lang-flag ${lang === 'es' ? '' : 'off'}">ES</span>`;
}

/* ---------- Language toggle ---------- */
document.getElementById('langToggle').addEventListener('click', () => {
  setLang(lang === 'en' ? 'es' : 'en');
  applyLang();
});

/* ---------- ZIP checker ---------- */
function checkZip(e) {
  e.preventDefault();
  const val = document.getElementById('zipIn').value.trim();
  const ok  = ['78726', '78727', '78729', '78730', '78731', '78750', '78759'];
  const r   = document.getElementById('zipResult');
  r.dataset.dirty = '1';
  if (ok.includes(val)) {
    r.innerHTML = `✅ <b style="color:#2bb673">You're covered!</b> Ranger can likely book this week in <code>${val}</code>.`;
  } else if (val.length === 5) {
    r.innerHTML = `⚠️ <b style="color:#e85a1a">Not yet</b> — we're NW Austin only today. Drop your email and we'll ping you when we expand.`;
  } else {
    r.dataset.dirty = '';
    r.innerHTML = `Enter a 5-digit ZIP. We serve <code>78726</code><code>78727</code><code>78729</code><code>78730</code><code>78731</code><code>78750</code><code>78759</code>.`;
  }
}

/* ---------- Chat demo ---------- */
const chatBody = document.getElementById('chatBody');
const chatInput = document.getElementById('chatInput');
const chatSend  = document.getElementById('chatSend');

function addBubble(text, cls) {
  const d = document.createElement('div');
  d.className = 'bubble ' + (cls || '');
  d.innerHTML = text;
  chatBody.appendChild(d);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function handleSend(text) {
  if (!text) return;
  addBubble(text, 'me');
  chatInput.value = '';
  setTimeout(() => addBubble('Got it — let me match that to a bundle…'), 500);
  setTimeout(() => {
    const low = text.toLowerCase();
    let match = { name: 'Half-Day Rescue Block', price: '$249', dur: '4 hrs' };
    if      (low.includes('deck'))                                          match = { name: 'Deck Revive',        price: '$599', dur: '½ day' };
    else if (low.includes('tv'))                                            match = { name: 'TV Mount Pro',       price: '$149', dur: '1 hr' };
    else if (low.includes('mount') || low.includes('shelves'))              match = { name: 'Move-in Rescue',     price: '$389', dur: '3 hrs' };
    else if (low.includes('smart') || low.includes('camera') || low.includes('thermostat')) match = { name: 'Smart Home Starter', price: '$329', dur: '2 hrs' };
    else if (low.includes('fence'))                                         match = { name: 'Fence Patch-Up',    price: '$449', dur: '½ day' };
    addBubble(`<b>${match.name}</b> · <span style="color:var(--orange);font-weight:800">${match.price}</span> · ${match.dur}<br/><small>Sound right? I'll pull up open slots next.</small>`);
  }, 1300);
}

chatSend.onclick = () => handleSend(chatInput.value.trim());
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(chatInput.value.trim()); });
document.querySelectorAll('.sug').forEach(b => {
  b.onclick = () => handleSend(b.dataset.msg);
});

/* ---------- Category tabs (visual only) ---------- */
document.querySelectorAll('.cat').forEach(c => {
  c.onclick = () => {
    document.querySelectorAll('.cat').forEach(x => x.classList.remove('on'));
    c.classList.add('on');
  };
});

/* ---------- Smooth scroll ---------- */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

/* ---------- Boot ---------- */
applyLang();
lockHeadlineHeight();
