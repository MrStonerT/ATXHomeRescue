/* ATX Home Rescue — Ranger shared utilities (global script, no module)
 * Sets window.RangerShared with all exports.
 * Requires: i18n.js (for `lang` global) to be loaded first.
 */

(function () {
  const WORKER_BASE =
    (window.RANGER_CONFIG && window.RANGER_CONFIG.workerBase) ||
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'http://localhost:8787'
      : 'https://ranger-api.atxhomerescue.workers.dev');

  const CONV_KEY_PREFIX = 'atx_conv_';
  const CONV_TTL_MS     = 7 * 24 * 60 * 60 * 1000;

  /* ---------- Cloudflare Turnstile (bot check) ----------
   * Renders an invisible widget once, then returns a fresh token on each
   * call. If the Turnstile script fails to load, resolves null and the
   * Worker will reject the request (fail closed in prod). */
  const TURNSTILE_SITEKEY = '0x4AAAAAADCr8SlpSMhd_MqP';
  let _tsWidgetId = null;
  let _tsResolvers = [];

  function _waitForTurnstile() {
    return new Promise(function (resolve) {
      if (typeof turnstile !== 'undefined') return resolve(true);
      var waited = 0;
      var iv = setInterval(function () {
        if (typeof turnstile !== 'undefined') { clearInterval(iv); resolve(true); }
        else if ((waited += 50) >= 10000) { clearInterval(iv); resolve(false); }
      }, 50);
    });
  }

  function _ensureWidget() {
    if (_tsWidgetId !== null) return;
    if (typeof turnstile === 'undefined') return;
    var host = document.getElementById('cf-turnstile');
    if (!host) {
      host = document.createElement('div');
      host.id = 'cf-turnstile';
      document.body.appendChild(host);
    }
    _tsWidgetId = turnstile.render('#cf-turnstile', {
      sitekey:    TURNSTILE_SITEKEY,
      appearance: 'interaction-only',
      execution:  'execute',
      callback: function (token) {
        var rs = _tsResolvers; _tsResolvers = [];
        rs.forEach(function (r) { r(token); });
      },
      'error-callback': function () {
        var rs = _tsResolvers; _tsResolvers = [];
        rs.forEach(function (r) { r(null); });
      },
      'expired-callback': function () {
        if (_tsWidgetId !== null) turnstile.reset(_tsWidgetId);
      },
    });
  }

  async function getTurnstileToken() {
    var ready = await _waitForTurnstile();
    if (!ready) return null;
    _ensureWidget();
    if (_tsWidgetId === null) return null;
    return new Promise(function (resolve) {
      _tsResolvers.push(resolve);
      try { turnstile.reset(_tsWidgetId); turnstile.execute(_tsWidgetId); }
      catch (e) { _tsResolvers = _tsResolvers.filter(function (r) { return r !== resolve; }); resolve(null); }
      setTimeout(function () {
        if (_tsResolvers.indexOf(resolve) !== -1) {
          _tsResolvers = _tsResolvers.filter(function (r) { return r !== resolve; });
          resolve(null);
        }
      }, 15000);
    });
  }

  /* ---------- RangerClient ---------- */
  function RangerClient() {
    this._listeners = {};
  }
  RangerClient.prototype.on = function (event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return this;
  };
  RangerClient.prototype._emit = function (event, data) {
    (this._listeners[event] || []).forEach(function (fn) { fn(data); });
  };
  RangerClient.prototype.send = async function (messages, context) {
    context = context || {};
    var self = this;
    var turnstileToken = await getTurnstileToken();
    var resp;
    try {
      resp = await fetch(WORKER_BASE + '/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(Object.assign({ messages: messages, turnstileToken: turnstileToken }, context)),
      });
    } catch (err) {
      self._emit('error', { message: 'Could not reach Ranger. Check your connection.' });
      return;
    }

    if (!resp.ok) {
      var status = resp.status;
      if (status === 429) {
        var retry = resp.headers.get('Retry-After') || '60';
        self._emit('error', { message: 'Ranger is busy. Try again in ' + Math.ceil(+retry / 60) + ' min.', code: 429 });
      } else {
        self._emit('error', { message: 'Ranger error (' + status + '). Please reload and try again.' });
      }
      return;
    }

    var reader  = resp.body.getReader();
    var decoder = new TextDecoder();
    var buffer  = '';

    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      var lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (!line.startsWith('data: ')) continue;
        var raw = line.slice(6).trim();
        if (!raw) continue;
        try {
          var ev = JSON.parse(raw);
          self._emit(ev.type, ev);
        } catch (e) {}
      }
    }
  };

  /* ---------- SummaryStore ---------- */
  function SummaryStore() {
    this._state = {
      service_name: null, package_id: null, package_name: null,
      package_price: null, package_data: null, zip: null, photos: 0,
      answers: {}, contact_name: null, contact_phone: null,
      contact_email: null, preferred_windows: [], notes: null,
    };
    this._listeners = [];
  }
  Object.defineProperty(SummaryStore.prototype, 'state', {
    get: function () { return Object.assign({}, this._state); }
  });
  SummaryStore.prototype.update = function (fields) {
    var changed = false;
    var self = this;
    Object.keys(fields).forEach(function (k) {
      if (self._state[k] !== fields[k]) { self._state[k] = fields[k]; changed = true; }
    });
    if (changed) this._listeners.forEach(function (fn) { fn(self._state); });
  };
  SummaryStore.prototype.setPackage = function (pkg) {
    this.update({
      package_id:    pkg.id,
      package_name:  pkg.name,
      package_price: pkg.price_fmt || ('$' + pkg.price),
      package_data:  pkg,
    });
  };
  SummaryStore.prototype.on = function (fn) {
    this._listeners.push(fn);
    var self = this;
    return function () {
      self._listeners = self._listeners.filter(function (l) { return l !== fn; });
    };
  };
  SummaryStore.prototype.reset = function () {
    this._state = {
      service_name: null, package_id: null, package_name: null,
      package_price: null, package_data: null, zip: null, photos: 0,
      answers: {}, contact_name: null, contact_phone: null,
      contact_email: null, preferred_windows: [], notes: null,
    };
    var s = this._state;
    this._listeners.forEach(function (fn) { fn(s); });
  };

  /* ---------- Conversation persistence ---------- */
  function genConversationId() {
    return 'conv_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function loadConversation(id) {
    try {
      var raw = localStorage.getItem(CONV_KEY_PREFIX + id);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (Date.now() - parsed.ts > CONV_TTL_MS) { dropConversation(id); return null; }
      return parsed.messages;
    } catch (e) { return null; }
  }

  function saveConversation(id, messages) {
    try {
      localStorage.setItem(CONV_KEY_PREFIX + id, JSON.stringify({ messages: messages, ts: Date.now() }));
    } catch (e) {}
  }

  function dropConversation(id) {
    try { localStorage.removeItem(CONV_KEY_PREFIX + id); } catch (e) {}
  }

  function getOrCreateConversationId() {
    var id = sessionStorage.getItem('atx_conv_id');
    if (!id) {
      id = genConversationId();
      sessionStorage.setItem('atx_conv_id', id);
    }
    return id;
  }

  function getDeepLinkAsk() {
    var params = new URLSearchParams(location.search);
    return params.get('ask') || null;
  }

  function shouldAutoOpenWidget() {
    return new URLSearchParams(location.search).get('ranger') === 'open';
  }

  /* ---------- Expose ---------- */
  window.RangerShared = {
    RangerClient:              RangerClient,
    SummaryStore:              SummaryStore,
    saveConversation:          saveConversation,
    loadConversation:          loadConversation,
    dropConversation:          dropConversation,
    getOrCreateConversationId: getOrCreateConversationId,
    getDeepLinkAsk:            getDeepLinkAsk,
    shouldAutoOpenWidget:      shouldAutoOpenWidget,
    WORKER_BASE:               WORKER_BASE,
  };
})();
