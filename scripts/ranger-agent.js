/* ATX Home Rescue — Ranger Agent
 * Full chat surface for booking.html and the floating widget.
 * Requires: i18n.js, ranger-shared.js
 *
 * RangerAgent.mount({ container, summaryStore, onBooked, initialMessage, lang })
 */

const RangerAgent = (() => {
  const TOOL_LABELS = {
    check_service_area: { en: 'Checking service area…', es: 'Verificando área de servicio…' },
    quote_package:      { en: 'Pricing your job…',       es: 'Calculando precio…' },
    update_summary:     { en: 'Updating summary…',        es: 'Actualizando resumen…' },
    present_chips:      { en: 'Loading options…',         es: 'Cargando opciones…' },
    submit_request:     { en: 'Sending to dispatch…',     es: 'Enviando al equipo…' },
  };

  function mount({ container, summaryStore, onBooked, initialMessage, lang: initLang }) {
    /* State */
    let messages      = [];
    let conversationId;
    let isStreaming   = false;
    let activeToolEl  = null;

    const { RangerClient, saveConversation, loadConversation, getOrCreateConversationId, getDeepLinkAsk } =
      window.RangerShared;

    conversationId = getOrCreateConversationId();

    /* Try to resume a previous conversation */
    const saved = loadConversation(conversationId);
    if (saved && saved.length > 0) messages = saved;

    /* Build DOM */
    container.innerHTML = `
      <div class="rg-head">
        <div class="rg-avatar">R</div>
        <div class="rg-title">
          <span class="rg-name" data-i18n="rangerName">Rescue Ranger</span>
          <small class="rg-sub" data-i18n="rangerSub">AI CONCIERGE · ATX HOME RESCUE</small>
        </div>
        <div class="rg-live-dot" title="Live"></div>
      </div>
      <div class="rg-body" id="rgBody"></div>
      <div class="rg-input-row">
        <button class="rg-iconbtn" id="rgAttach" title="Attach photo" aria-label="Attach photo">📎</button>
        <input id="rgInput" type="text" autocomplete="off" placeholder="${t('chatPlaceholder')}"/>
        <button class="rg-send" id="rgSend" aria-label="Send">↑</button>
      </div>
      <div class="rg-foot" id="rgFoot"></div>
    `;

    const body      = container.querySelector('#rgBody');
    const input     = container.querySelector('#rgInput');
    const sendBtn   = container.querySelector('#rgSend');
    const attachBtn = container.querySelector('#rgAttach');
    const foot      = container.querySelector('#rgFoot');

    foot.innerHTML = `<span style="color:var(--orange)">●</span> ${t('chatFoot')}`;

    /* Render saved messages or start fresh */
    if (messages.length === 0) {
      kick(initialMessage || getDeepLinkAsk());
    } else {
      replayMessages();
    }

    /* ---------- Bubble helpers ---------- */

    function addBubble(html, cls = '') {
      const d = document.createElement('div');
      d.className = `rg-bubble ${cls}`.trim();
      d.innerHTML = html;
      body.appendChild(d);
      scroll();
      return d;
    }

    function addStreamBubble() {
      const d = document.createElement('div');
      d.className = 'rg-bubble rg-them rg-streaming';
      d.innerHTML = '<span class="rg-cursor"></span>';
      body.appendChild(d);
      scroll();
      return d;
    }

    function appendToken(bubble, text) {
      const cursor = bubble.querySelector('.rg-cursor');
      const node   = document.createTextNode(text);
      if (cursor) bubble.insertBefore(node, cursor);
      else bubble.appendChild(node);
      scroll();
    }

    function settleStreamBubble(bubble) {
      bubble.classList.remove('rg-streaming');
      bubble.querySelector('.rg-cursor')?.remove();
    }

    function showToolChip(name) {
      const l = getCurrentLang();
      const label = (TOOL_LABELS[name] || {})[l] || name;
      const chip = document.createElement('div');
      chip.className = 'rg-tool-chip';
      chip.textContent = `⚙ ${label}`;
      body.appendChild(chip);
      scroll();
      activeToolEl = chip;
      return chip;
    }

    function hideToolChip() {
      if (!activeToolEl) return;
      activeToolEl.classList.add('rg-tool-done');
      setTimeout(() => activeToolEl?.remove(), 800);
      activeToolEl = null;
    }

    function addChips(chips) {
      const row = document.createElement('div');
      row.className = 'rg-chips';
      chips.forEach(({ label, value }) => {
        const b = document.createElement('button');
        b.className = 'rg-chip';
        b.textContent = label;
        b.onclick = () => {
          row.remove();
          sendMessage(value, label);
        };
        row.appendChild(b);
      });
      body.appendChild(row);
      scroll();
    }

    function renderPackageCard(pkg) {
      const l = getCurrentLang();
      const name     = l === 'es' ? (pkg.name_es || pkg.name) : pkg.name;
      const includes = (l === 'es' ? pkg.includes_es : pkg.includes_en) || [];
      const notes    = l === 'es' ? pkg.notes_es : pkg.notes_en;

      const card = document.createElement('div');
      card.className = 'rg-bubble rg-them rg-card';
      card.innerHTML = `
        <div class="rg-card-head">
          <span class="rg-card-emoji">${pkg.emoji}</span>
          <div>
            <div class="rg-card-name">${name}</div>
            ${pkg.badge ? `<span class="rg-card-badge">${pkg.badge}</span>` : ''}
          </div>
        </div>
        <div class="rg-card-price">${pkg.total_fmt || pkg.price_fmt}<span class="rg-card-dur">${pkg.duration}</span></div>
        ${includes.length ? `<ul class="rg-card-includes">${includes.map(i => `<li>${i}</li>`).join('')}</ul>` : ''}
        ${notes ? `<div class="rg-card-notes">${notes}</div>` : ''}
      `;
      body.appendChild(card);
      scroll();

      if (summaryStore) summaryStore.setPackage(pkg);
    }

    function renderJobberHandoff(data) {
      const l = getCurrentLang();
      const conf = l === 'es' ? data.confirmation_es : data.confirmation_en;
      addBubble(`<b>✅ ${conf}</b>`, 'rg-them');

      if (data.url) {
        const wrap = document.createElement('div');
        wrap.className = 'rg-jobber-wrap';

        const iframe = document.createElement('iframe');
        iframe.src   = data.url;
        iframe.className = 'rg-jobber-iframe';
        iframe.title = 'Request service — Jobber';
        iframe.setAttribute('allow', 'camera; microphone; clipboard-write');
        iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
        wrap.appendChild(iframe);
        body.appendChild(wrap);

        const done = document.createElement('div');
        done.className = 'rg-jobber-manual';
        done.innerHTML = `
          <button class="rg-btn" id="rgJobberDone">${t('jobberDone')}</button>
          <div class="rg-jobber-hint">${t('jobberDoneHint')}</div>
        `;
        body.appendChild(done);

        const onMsg = (e) => {
          if (/submit|complete|success|thank/i.test(String(e.data))) {
            cleanup(); showDone(data);
          }
        };
        const cleanup = () => {
          window.removeEventListener('message', onMsg);
          wrap.remove(); done.remove();
        };
        window.addEventListener('message', onMsg);
        done.querySelector('#rgJobberDone').onclick = () => { cleanup(); showDone(data); };
      }

      scroll();
      if (typeof onBooked === 'function') onBooked(data);
    }

    function showDone(data) {
      const l = getCurrentLang();
      body.innerHTML = '';
      const el = document.createElement('div');
      el.className = 'rg-done';
      el.innerHTML = `
        <div class="rg-done-icon">⏳</div>
        <h2>${t('requested')}</h2>
        <p>${t('requestedSub')}</p>
        <p><b>${data.sla}</b></p>
        <div class="rg-done-recap">
          <div><span>${t('recJob')}</span><b>${data.package_name} · ${data.package_price}</b></div>
          <div><span>${t('recStatus')}</span><b style="color:var(--orange)">${t('statusPending')}</b></div>
        </div>
        <p>${t('nextSteps')}</p>
        <a class="rg-btn" href="index.html">${t('backHome')}</a>
      `;
      body.appendChild(el);
      scroll();
    }

    /* ---------- Message sending ---------- */

    function buildApiMessages() {
      return messages.map(m => ({ role: m.role, content: m.content }));
    }

    async function sendMessage(value, displayLabel) {
      if (isStreaming) return;

      const text = (displayLabel || value || '').trim();
      if (!text) return;

      /* Clear input */
      input.value = '';

      /* Add user bubble */
      addBubble(escHtml(text), 'rg-me');

      /* Record in history */
      messages.push({ role: 'user', content: value });
      saveConversation(conversationId, messages);

      isStreaming = true;
      sendBtn.disabled = true;

      const streamBubble = addStreamBubble();
      let assistantText  = '';

      const client = new RangerClient();

      client
        .on('token', ({ text: tok }) => {
          appendToken(streamBubble, tok);
          assistantText += tok;
        })
        .on('tool_start', ({ name }) => showToolChip(name))
        .on('tool_end',   ()         => hideToolChip())
        .on('summary_update', ({ fields }) => {
          if (summaryStore) summaryStore.update(fields);
        })
        .on('chips', ({ chips }) => {
          settleStreamBubble(streamBubble);
          addChips(chips);
        })
        .on('package_card', ({ package: pkg }) => {
          renderPackageCard(pkg);
        })
        .on('jobber_handoff', (data) => {
          renderJobberHandoff(data);
        })
        .on('done', () => {
          settleStreamBubble(streamBubble);
          if (assistantText) {
            messages.push({ role: 'assistant', content: assistantText });
            saveConversation(conversationId, messages);
          }
          isStreaming      = false;
          sendBtn.disabled = false;
          input.focus();
        })
        .on('error', ({ message: msg }) => {
          settleStreamBubble(streamBubble);
          streamBubble.innerHTML = `<span class="rg-error">${escHtml(msg)}</span>`;
          isStreaming      = false;
          sendBtn.disabled = false;
        });

      const l = getCurrentLang();
      await client.send(buildApiMessages(), { lang: l });
    }

    /* ---------- Boot ---------- */

    async function kick(seed) {
      /* Seed a user message silently (no bubble) to prime the agent */
      const seedMsg = seed || (getCurrentLang() === 'es'
        ? '¡Hola! ¿Qué servicios ofrecen?'
        : "Hi! What services do you offer?");

      messages = [{ role: 'user', content: seedMsg }];

      isStreaming = true;
      sendBtn.disabled = true;

      const streamBubble = addStreamBubble();
      let assistantText  = '';

      const client = new RangerClient();

      client
        .on('token', ({ text }) => {
          appendToken(streamBubble, text);
          assistantText += text;
        })
        .on('tool_start', ({ name }) => showToolChip(name))
        .on('tool_end',   ()         => hideToolChip())
        .on('summary_update', ({ fields }) => {
          if (summaryStore) summaryStore.update(fields);
        })
        .on('chips', ({ chips }) => {
          settleStreamBubble(streamBubble);
          addChips(chips);
        })
        .on('package_card', ({ package: pkg }) => renderPackageCard(pkg))
        .on('jobber_handoff', (data)           => renderJobberHandoff(data))
        .on('done', () => {
          settleStreamBubble(streamBubble);
          if (assistantText) {
            messages.push({ role: 'assistant', content: assistantText });
            saveConversation(conversationId, messages);
          }
          isStreaming      = false;
          sendBtn.disabled = false;
          input.focus();
        })
        .on('error', ({ message: msg }) => {
          settleStreamBubble(streamBubble);
          streamBubble.innerHTML = `<span class="rg-error">${escHtml(msg)}</span>`;
          isStreaming      = false;
          sendBtn.disabled = false;
        });

      await client.send([{ role: 'user', content: seedMsg }], { lang: getCurrentLang() });
    }

    function replayMessages() {
      /* Render previous turns from saved history (text only, no tool events) */
      for (const m of messages) {
        if (m.role === 'user') {
          addBubble(escHtml(m.content), 'rg-me');
        } else if (m.role === 'assistant' && m.content) {
          addBubble(escHtml(m.content), 'rg-them');
        }
      }
      addBubble(getCurrentLang() === 'es'
        ? '↑ Retomamos donde lo dejaste.'
        : '↑ Picking up where we left off.', 'rg-them rg-resume');
    }

    /* ---------- Input events ---------- */

    sendBtn.onclick = () => sendMessage(input.value.trim());
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input.value.trim()); }
    });
    attachBtn.onclick = () => {
      /* Photo upload — open a file picker and count the files */
      const picker = document.createElement('input');
      picker.type  = 'file';
      picker.accept = 'image/*';
      picker.multiple = true;
      picker.onchange = () => {
        const n = picker.files.length;
        if (n > 0 && summaryStore) {
          summaryStore.update({ photos: (summaryStore.state.photos || 0) + n });
        }
        if (n > 0) {
          const label = n === 1
            ? (getCurrentLang() === 'es' ? '1 foto adjunta' : '1 photo attached')
            : (getCurrentLang() === 'es' ? `${n} fotos adjuntas` : `${n} photos attached`);
          addBubble(label, 'rg-me');
          messages.push({ role: 'user', content: `[${label}]` });
        }
      };
      picker.click();
    };

    /* ---------- Helpers ---------- */

    function scroll() {
      requestAnimationFrame(() => { body.scrollTop = body.scrollHeight; });
    }

    function escHtml(s) {
      return String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    function getCurrentLang() {
      return (typeof lang !== 'undefined' ? lang : null) || initLang || 'en';
    }

    function t(key) {
      if (typeof window.t === 'function') return window.t(key);
      return key;
    }

    return { sendMessage, reset: () => { messages = []; kick(); } };
  }

  return { mount };
})();

window.RangerAgent = RangerAgent;
