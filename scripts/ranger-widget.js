/* ATX Home Rescue — Ranger floating widget
 * Renders the floating button + slide-up modal on non-booking pages.
 * Requires: i18n.js, ranger-shared.js, ranger-agent.js
 */

(function () {
  const { shouldAutoOpenWidget, getDeepLinkAsk, SummaryStore } = window.RangerShared;

  /* ---------- Build widget DOM ---------- */
  const btn = document.createElement('button');
  btn.className   = 'rg-float-btn';
  btn.setAttribute('aria-label', 'Chat with Ranger');
  btn.innerHTML = `
    <span class="rg-float-avatar">R</span>
    <span class="rg-float-label" data-i18n="float">Chat with Ranger</span>
  `;

  const modal = document.createElement('div');
  modal.className  = 'rg-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-label', 'Rescue Ranger chat');
  modal.innerHTML = `
    <div class="rg-modal-head">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="rg-avatar">R</div>
        <div>
          <div class="rg-name" data-i18n="rangerName">Rescue Ranger</div>
          <small class="rg-sub" data-i18n="rangerSub">AI CONCIERGE · ATX HOME RESCUE</small>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <a class="rg-expand-link" href="booking.html" id="rgExpandLink" title="Open full booking view">⤢</a>
        <button class="rg-close-btn" id="rgCloseBtn" aria-label="Close">✕</button>
      </div>
    </div>
    <div class="rg-modal-body" id="rgModalBody"></div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(modal);

  /* ---------- State ---------- */
  let isOpen     = false;
  let agentMounted = false;
  let summaryStore;

  /* ---------- Open / close ---------- */
  function open() {
    isOpen = true;
    modal.classList.add('rg-modal-open');
    btn.classList.add('rg-float-open');
    btn.setAttribute('aria-expanded', 'true');

    if (!agentMounted) {
      summaryStore = new SummaryStore();
      const body   = modal.querySelector('#rgModalBody');
      const ask    = getDeepLinkAsk();
      window.RangerAgent.mount({
        container:    body,
        summaryStore,
        lang:         (typeof lang !== 'undefined' ? lang : 'en'),
        initialMessage: ask || null,
        onBooked:     () => { /* widget stays open on booking page */ },
      });
      agentMounted = true;

      /* Add "Continue in full view" footer link with conversation ID */
      const convId = sessionStorage.getItem('atx_conv_id') || '';
      const link   = modal.querySelector('#rgExpandLink');
      if (link) link.href = `booking.html?resume=${convId}`;
    }

    /* Trap focus */
    setTimeout(() => modal.querySelector('input')?.focus(), 100);
  }

  function close() {
    isOpen = false;
    modal.classList.remove('rg-modal-open');
    btn.classList.remove('rg-float-open');
    btn.setAttribute('aria-expanded', 'false');
  }

  /* ---------- Events ---------- */
  btn.addEventListener('click', () => isOpen ? close() : open());
  modal.querySelector('#rgCloseBtn').addEventListener('click', close);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) close();
  });

  /* Click outside modal body closes it */
  document.addEventListener('click', e => {
    if (isOpen && !modal.contains(e.target) && e.target !== btn) close();
  }, true);

  /* ---------- Deep link / auto-open ---------- */
  if (shouldAutoOpenWidget()) {
    requestAnimationFrame(open);
  }

  /* Pulse animation reset after 3 cycles */
  let pulseCount = 0;
  const pulseInterval = setInterval(() => {
    if (isOpen || ++pulseCount > 3) { clearInterval(pulseInterval); return; }
    btn.classList.add('rg-float-pulse');
    setTimeout(() => btn.classList.remove('rg-float-pulse'), 1200);
  }, 8000);
})();
