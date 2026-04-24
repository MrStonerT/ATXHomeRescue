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
    var resp;
    try {
      resp = await fetch(WORKER_BASE + '/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(Object.assign({ messages: messages }, context)),
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
