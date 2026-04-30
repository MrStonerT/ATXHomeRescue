/* ATX Home Rescue — Direct Booking Form (request.html)
 * Requires: i18n.js, jobber-config.js to be loaded first.
 */

(function () {
  var VALID_ZIPS = ['78726','78727','78729','78730','78731','78750','78759'];
  var MAX_ADDONS = 2;
  var MAX_SLOTS  = 3;

  var catalog   = null;
  var pkg       = null;
  var selectedAddOns = [];  // array of add-on objects
  var slotCount = 1;
  var formSubmitted = false;

  /* ---------- Bootstrap ---------- */

  // Visual + duration metadata for add-ons booked standalone (catalog.add_ons
  // entries don't carry emoji/duration since they normally piggyback on a
  // base package).
  var ADDON_META = {
    addon_headlight:    { emoji: '🚗', duration: '1 hr'   },
    addon_fixture_swap: { emoji: '💡', duration: '45 min' },
    addon_power_wash:   { emoji: '💦', duration: '1 hr'   },
    addon_caulking:     { emoji: '🛁', duration: '45 min' },
  };

  document.addEventListener('DOMContentLoaded', function () {
    var params    = new URLSearchParams(location.search);
    var packageId = params.get('package');
    var addonId   = params.get('addon');

    if (!packageId && !addonId) { showError('No package specified.'); return; }

    fetch('scripts/services-catalog.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        catalog = data;

        if (packageId) {
          pkg = data.packages.find(function (p) { return p.id === packageId; });
        } else if (addonId) {
          var addon = (data.add_ons || []).find(function (a) { return a.id === addonId; });
          if (addon) pkg = synthesizePkgFromAddon(addon);
        }

        if (!pkg) { showError(t('req.pkgNotFound'), t('req.pkgNotFoundSub')); return; }
        renderPackage();
        renderAddOns();
        renderSlots();
        wireForm();
        updateTotal();
        document.getElementById('reqShell').style.display = '';
      })
      .catch(function () { showError('Could not load catalog. Please try again.'); });
  });

  // Build a package-shaped object from an add-on so the rest of the form
  // (renderPackage, totals, Jobber notes, recap) can run unchanged.
  function synthesizePkgFromAddon(addon) {
    var meta = ADDON_META[addon.id] || { emoji: '➕', duration: '1 hr' };
    return {
      id:          addon.id,
      name:        addon.name,
      name_es:     addon.name_es || addon.name,
      emoji:       meta.emoji,
      price:       addon.price,
      duration:    meta.duration,
      full_day:    false,
      desc_en:     addon.desc_en,
      desc_es:     addon.desc_es || addon.desc_en,
      badge:       null,
      includes_en: [],
      includes_es: [],
      notes_en:    null,
      notes_es:    null,
      is_addon_only: true
    };
  }

  function showError(msg, sub) {
    document.getElementById('reqLoading').style.display = 'none';
    var err = document.getElementById('reqLoadError');
    err.style.display = '';
    err.querySelector('.req-load-msg').textContent = msg || 'Something went wrong.';
    if (sub) err.querySelector('.req-load-sub').textContent = sub;
  }

  /* ---------- Package rendering ---------- */

  function renderPackage() {
    var l = getLang();
    var name = l === 'es' ? (pkg.name_es || pkg.name) : pkg.name;

    document.getElementById('reqPkgEmoji').textContent = pkg.emoji || '🔧';
    document.getElementById('reqPkgName').textContent  = name;
    document.getElementById('reqPkgDesc').textContent  = l === 'es' ? (pkg.desc_es || pkg.desc_en) : pkg.desc_en;
    document.title = name + ' — ATX Home Rescue';

    var badge = document.getElementById('reqPkgBadge');
    if (pkg.badge) { badge.textContent = pkg.badge; badge.style.display = ''; }

    var notes = l === 'es' ? pkg.notes_es : pkg.notes_en;
    var notesEl = document.getElementById('reqPkgNotes');
    if (notes) { notesEl.textContent = notes; notesEl.style.display = ''; }

    var includes = l === 'es' ? pkg.includes_es : pkg.includes_en;
    var inclEl = document.getElementById('reqPkgIncl');
    if (includes && includes.length) {
      inclEl.innerHTML = includes.map(function (i) { return '<li>' + escHtml(i) + '</li>'; }).join('');
      inclEl.parentNode.style.display = '';
    }
  }

  /* ---------- Add-on rendering ---------- */

  function renderAddOns() {
    var addOnsSection = document.getElementById('reqAddOnsSection');
    var addOnsContainer = document.getElementById('reqAddOnsContainer');
    var maxNote = document.getElementById('reqAddonMaxNote');

    if (!catalog.add_ons || catalog.add_ons.length === 0) {
      addOnsSection.style.display = 'none'; return;
    }

    // Standalone add-on bookings can't take further add-ons.
    if (pkg.is_addon_only) {
      addOnsSection.style.display = 'none'; return;
    }

    if (pkg.full_day) {
      addOnsContainer.innerHTML = '<div class="req-addon-disabled-note">' + escHtml(t('req.addonsFullDay')) + '</div>';
      return;
    }

    addOnsContainer.innerHTML = '';
    catalog.add_ons.forEach(function (ao) {
      var row = document.createElement('label');
      row.className = 'req-addon-check';
      row.dataset.id = ao.id;
      row.innerHTML =
        '<input type="checkbox" value="' + escHtml(ao.id) + '"/>' +
        '<div class="req-addon-check-body">' +
          '<div class="req-addon-check-name">' + escHtml(ao.name) + '</div>' +
          '<div class="req-addon-check-desc">' + escHtml(ao.desc_en) + ' (' + escHtml(ao.unit) + ')</div>' +
        '</div>' +
        '<div class="req-addon-check-price">+$' + ao.price + '</div>';

      row.querySelector('input').addEventListener('change', function () {
        var id = ao.id;
        if (this.checked) {
          if (selectedAddOns.length >= MAX_ADDONS) {
            this.checked = false;
            maxNote.classList.add('show');
            return;
          }
          selectedAddOns.push(ao);
          row.classList.add('selected');
        } else {
          selectedAddOns = selectedAddOns.filter(function (a) { return a.id !== id; });
          row.classList.remove('selected');
          maxNote.classList.remove('show');
        }
        updateTotal();
        updateAddOnDisabledState();
      });
      addOnsContainer.appendChild(row);
    });
  }

  function updateAddOnDisabledState() {
    var boxes = document.querySelectorAll('#reqAddOnsContainer .req-addon-check');
    boxes.forEach(function (box) {
      var cb = box.querySelector('input[type="checkbox"]');
      if (!cb.checked && selectedAddOns.length >= MAX_ADDONS) {
        box.classList.add('disabled');
      } else {
        box.classList.remove('disabled');
      }
    });
  }

  /* ---------- Date slots ---------- */

  function renderSlots() {
    var list = document.getElementById('reqSlotList');
    list.innerHTML = '';
    slotCount = 1;
    addSlot();

    document.getElementById('reqAddSlot').addEventListener('click', function () {
      if (slotCount < MAX_SLOTS) {
        addSlot();
        if (slotCount >= MAX_SLOTS) this.disabled = true;
      }
    });
  }

  function addSlot() {
    var today = new Date();
    today.setDate(today.getDate() + 1);  // min = tomorrow
    var maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 60);
    var minStr = today.toISOString().slice(0, 10);
    var maxStr = maxDate.toISOString().slice(0, 10);

    var row = document.createElement('div');
    row.className = 'req-slot-row';
    var required = slotCount === 1 ? 'required' : '';
    row.innerHTML =
      '<input type="date" min="' + minStr + '" max="' + maxStr + '" ' + required + '/>' +
      '<select>' +
        '<option value="morning">' + escHtml(t('req.slotMorning')) + '</option>' +
        '<option value="afternoon">' + escHtml(t('req.slotAfternoon')) + '</option>' +
        '<option value="anytime" selected>' + escHtml(t('req.slotAnytime')) + '</option>' +
      '</select>' +
      (slotCount > 1 ? '<button type="button" class="req-slot-remove" aria-label="Remove">×</button>' : '');

    if (slotCount > 1) {
      row.querySelector('.req-slot-remove').addEventListener('click', function () {
        row.remove();
        slotCount--;
        document.getElementById('reqAddSlot').disabled = false;
      });
    }
    document.getElementById('reqSlotList').appendChild(row);
    slotCount++;
  }

  /* ---------- Live total ---------- */

  function updateTotal() {
    var base = pkg.price;
    var addOnTotal = selectedAddOns.reduce(function (s, a) { return s + a.price; }, 0);
    var total = base + addOnTotal;

    document.getElementById('reqTotalVal').textContent = '$' + total;

    var dur = pkg.duration;
    document.getElementById('reqTotalDur').textContent = dur;

    // Add-on breakdown rows
    var addonRows = document.getElementById('reqAddonRows');
    if (selectedAddOns.length) {
      addonRows.innerHTML =
        '<div class="req-addon-row" style="color:var(--ink-soft);font-size:12px;padding:2px 0">' +
          '<span>' + escHtml(pkg.name) + '</span><span>$' + pkg.price + '</span>' +
        '</div>' +
        selectedAddOns.map(function (a) {
          return '<div class="req-addon-row"><span>+ ' + escHtml(a.name) + '</span><span>$' + a.price + '</span></div>';
        }).join('');
    } else {
      addonRows.innerHTML = '';
    }
  }

  /* ---------- Form wiring ---------- */

  function wireForm() {
    // ZIP validation
    var zipInput = document.getElementById('reqZip');
    var zipErr   = document.getElementById('reqZipError');
    zipInput.addEventListener('blur', function () {
      var z = zipInput.value.trim().replace(/\D/g, '').slice(0, 5);
      if (z && VALID_ZIPS.indexOf(z) === -1) {
        zipInput.classList.add('error');
        zipErr.classList.add('show');
      } else {
        zipInput.classList.remove('error');
        zipErr.classList.remove('show');
      }
    });

    // Submit
    document.getElementById('reqForm').addEventListener('submit', function (e) {
      e.preventDefault();
      if (formSubmitted) return;
      if (!validateForm()) return;
      formSubmitted = true;
      showHandoff();
    });
  }

  function validateForm() {
    var ok = true;
    var formError = document.getElementById('reqFormError');
    formError.classList.remove('show');

    // Required text/email/tel inputs
    var required = document.querySelectorAll('#reqForm [required]');
    required.forEach(function (el) {
      if (!el.value.trim()) {
        el.classList.add('error');
        ok = false;
      } else {
        el.classList.remove('error');
      }
    });

    // ZIP must be in service area
    var zip = document.getElementById('reqZip').value.trim().replace(/\D/g, '').slice(0, 5);
    if (VALID_ZIPS.indexOf(zip) === -1) {
      document.getElementById('reqZip').classList.add('error');
      document.getElementById('reqZipError').classList.add('show');
      ok = false;
    }

    if (!ok) {
      formError.textContent = t('req.required');
      formError.classList.add('show');
      document.querySelector('.req-shell').scrollIntoView({ behavior: 'smooth' });
    }
    return ok;
  }

  function getFormData() {
    var l = getLang();
    var name = l === 'es' ? (pkg.name_es || pkg.name) : pkg.name;
    var slots = collectSlots();
    var addOnNames = selectedAddOns.map(function (a) { return a.name + ' ($' + a.price + ')'; });
    var total = pkg.price + selectedAddOns.reduce(function (s, a) { return s + a.price; }, 0);

    return {
      firstName: document.getElementById('reqFirstName').value.trim(),
      lastName:  document.getElementById('reqLastName').value.trim(),
      phone:     document.getElementById('reqPhone').value.trim(),
      email:     document.getElementById('reqEmail').value.trim(),
      street:    document.getElementById('reqStreet').value.trim(),
      unit:      document.getElementById('reqUnit').value.trim(),
      city:      document.getElementById('reqCity').value.trim(),
      state:     document.getElementById('reqState').value.trim(),
      zip:       document.getElementById('reqZip').value.trim(),
      slots:     slots,
      notes:     document.getElementById('reqNotes').value.trim(),
      pkgName:   name,
      pkgId:     pkg.id,
      addOns:    addOnNames,
      total:     total,
    };
  }

  function collectSlots() {
    var rows = document.querySelectorAll('#reqSlotList .req-slot-row');
    var slots = [];
    rows.forEach(function (row) {
      var d = row.querySelector('input[type="date"]').value;
      var s = row.querySelector('select').value;
      if (d) slots.push(d + ' ' + s);
    });
    return slots;
  }

  function buildNotesString(fd) {
    var lines = [
      'Package: ' + fd.pkgName + ' ($' + pkg.price + ')',
    ];
    if (fd.addOns.length) lines.push('Add-ons: ' + fd.addOns.join(', '));
    lines.push('Total: $' + fd.total);
    if (fd.slots.length) lines.push('Preferred dates: ' + fd.slots.join(' | '));
    lines.push('Address: ' + fd.street + (fd.unit ? ' ' + fd.unit : '') + ', ' + fd.city + ', ' + fd.state + ' ' + fd.zip);
    if (fd.notes) lines.push('Notes: ' + fd.notes);
    lines.push('Booked via Direct Form on atxhomerescue.com');
    return lines.join('\n');
  }

  /* ---------- Handoff screen ---------- */

  function showHandoff() {
    var fd = getFormData();
    var notesStr = buildNotesString(fd);
    var jobberUrl = window.JOBBER_CONFIG.buildUrl(notesStr);

    // Hide form, show handoff
    document.getElementById('reqShell').style.display    = 'none';
    document.getElementById('reqDone').style.display     = 'none';
    var handoff = document.getElementById('reqHandoff');
    handoff.classList.add('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Render recap
    var recap = document.getElementById('reqRecapRows');
    var l = getLang();
    var recapFields = [
      { lbl: t('req.firstName') + ' ' + t('req.lastName'), val: fd.firstName + ' ' + fd.lastName },
      { lbl: t('req.phone'),   val: fd.phone },
      { lbl: t('req.email'),   val: fd.email },
      { lbl: t('req.street'),  val: fd.street + (fd.unit ? ' ' + fd.unit : '') },
      { lbl: t('req.city'),    val: fd.city + ', ' + fd.state + ' ' + fd.zip },
      { lbl: 'Package',        val: fd.pkgName + ' — $' + pkg.price },
    ];
    fd.addOns.forEach(function (a) {
      recapFields.push({ lbl: l === 'es' ? 'Adicional' : 'Add-on', val: a });
    });
    recapFields.push({ lbl: l === 'es' ? 'Total' : 'Total', val: '$' + fd.total });
    if (fd.slots.length) recapFields.push({ lbl: l === 'es' ? 'Fechas preferidas' : 'Preferred dates', val: fd.slots.join(', ') });

    recap.innerHTML = recapFields.map(function (f) {
      return '<div class="req-recap-row"><span>' + escHtml(f.lbl) + '</span><b>' + escHtml(f.val) + '</b></div>';
    }).join('');

    // Embed iframe
    var iframe = document.getElementById('reqJobberIframe');
    iframe.src = jobberUrl;

    // Enable finish button after 6s (time to fill Jobber form) or on postMessage
    var finishBtn = document.getElementById('reqFinishBtn');
    var enableTimer = setTimeout(function () { finishBtn.disabled = false; }, 6000);

    window.addEventListener('message', function onMsg(e) {
      if (/submit|complete|success|thank/i.test(String(e.data))) {
        clearTimeout(enableTimer);
        finishBtn.disabled = false;
        window.removeEventListener('message', onMsg);
      }
    });

    finishBtn.addEventListener('click', function () {
      clearTimeout(enableTimer);
      handoff.classList.remove('show');
      var done = document.getElementById('reqDone');
      done.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, { once: true });
  }

  /* ---------- Helpers ---------- */

  function getLang() {
    return (typeof lang !== 'undefined' ? lang : null) || 'en';
  }

  function escHtml(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // Expose t() locally in case window.t isn't loaded yet
  function t(key) {
    if (typeof window.t === 'function') return window.t(key);
    return key;
  }

})();
