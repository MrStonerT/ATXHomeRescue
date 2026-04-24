/* ATX Home Rescue — Catalog page interactions
 * Category chips filter sections; search filters cards by name/description.
 * Supports ?cat=<key> deep links from footer/external.
 */

const chips = document.querySelectorAll('#catChips .chip');
const sections = document.querySelectorAll('.cat-section');
const cards = document.querySelectorAll('.cat-card');
const searchInput = document.getElementById('catSearch');
const emptyMsg = document.getElementById('catEmpty');

let activeCat = 'all';
let activeQuery = '';

/* ---- Initial counts (per category + total) ---- */
function countAll() {
  document.getElementById('count-all').textContent = `(${cards.length})`;
  sections.forEach(sec => {
    const tally = sec.querySelector('.cat-tally');
    const n = sec.querySelectorAll('.cat-card').length;
    if (tally) tally.textContent = `${n} ${n === 1 ? 'package' : 'packages'}`;
  });
}

/* ---- Filter logic ---- */
function applyFilters() {
  const q = activeQuery.trim().toLowerCase();
  let anyVisible = false;

  sections.forEach(sec => {
    const secCat = sec.getAttribute('data-cat');
    const catMatch = (activeCat === 'all') || (activeCat === secCat);

    if (!catMatch) {
      sec.classList.add('hide');
      return;
    }

    let sectionHasMatch = false;
    sec.querySelectorAll('.cat-card').forEach(card => {
      const name = (card.getAttribute('data-name') || '').toLowerCase();
      const desc = (card.querySelector('.desc')?.textContent || '').toLowerCase();
      const queryMatch = !q || name.includes(q) || desc.includes(q);

      if (queryMatch) {
        card.classList.remove('hide');
        sectionHasMatch = true;
      } else {
        card.classList.add('hide');
      }
    });

    if (sectionHasMatch) {
      sec.classList.remove('hide');
      anyVisible = true;
    } else {
      sec.classList.add('hide');
    }
  });

  emptyMsg.hidden = anyVisible;
}

/* ---- Chip click handler ---- */
chips.forEach(chip => {
  chip.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('on'));
    chip.classList.add('on');
    activeCat = chip.getAttribute('data-cat');
    applyFilters();

    if (activeCat !== 'all') {
      const target = document.querySelector(`.cat-section[data-cat="${activeCat}"]`);
      if (target) {
        const offset = 110;
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }
  });
});

/* ---- Search handler (debounced) ---- */
let searchTimer;
searchInput.addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    activeQuery = e.target.value;
    applyFilters();
  }, 120);
});

/* ---- Deep link: ?cat=<key> ---- */
function handleDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const cat = params.get('cat');
  if (!cat) return;
  const chip = document.querySelector(`#catChips .chip[data-cat="${cat}"]`);
  if (chip) chip.click();
}

/* ---- Language toggle (shared with homepage) ---- */
const langBtn = document.getElementById('langToggle');
if (langBtn) {
  langBtn.addEventListener('click', () => {
    setLang(lang === 'en' ? 'es' : 'en');
    langBtn.innerHTML = `<span class="lang-flag ${lang === 'en' ? '' : 'off'}">EN</span> / <span class="lang-flag ${lang === 'es' ? '' : 'off'}">ES</span>`;
  });
  langBtn.innerHTML = `<span class="lang-flag ${lang === 'en' ? '' : 'off'}">EN</span> / <span class="lang-flag ${lang === 'es' ? '' : 'off'}">ES</span>`;
}

/* ---- Float button ---- */
const floatBtn = document.querySelector('.float-agent');
if (floatBtn) floatBtn.addEventListener('click', () => { window.location.href = 'booking.html'; });

/* ---- Boot ---- */
countAll();
handleDeepLink();
