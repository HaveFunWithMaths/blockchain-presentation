/* =====================================================================
   DEMO 2 — Tamper → domino (the money shot)  ·  slide 12
   ---------------------------------------------------------------------
   ~4 SHA-256-linked blocks. Each block stores { index, data, prevHash, hash }
   where hash = SHA-256(index | data | prevHash) and prevHash = the previous
   block's hash — so the blocks are cryptographically welded in order.

   Edit any block's data → its hash changes → the NEXT block's stored prevHash
   no longer matches → the break cascades red down the chain. Tampering isn't
   prevented, it's made instantly visible. "Fix chain" re-mines every block
   downstream (driving home how much work hiding it takes); "Reset" restores.
   Mounts into #demo-chain. No dependencies. Respects prefers-reduced-motion.
   ===================================================================== */
(function () {
  'use strict';
  var mount = document.getElementById('demo-chain');
  if (!mount) return;

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HAS_SUBTLE = !!(window.crypto && window.crypto.subtle);
  var ZERO = '0000000000000000000000000000000000000000000000000000000000000000';

  var PRISTINE = [
    { data: 'Genesis',          fixed: true },
    { data: 'Alice → Bob : 50' },
    { data: 'Bob → Carol : 30' },
    { data: 'Carol → Dave : 10' }
  ];

  /* ---- hashing: SHA-256, with a sync fallback for file:// ----------- */
  async function sha256Hex(str) {
    if (HAS_SUBTLE) {
      var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(function (b) {
        return b.toString(16).padStart(2, '0');
      }).join('');
    }
    var h1 = 0x811c9dc5, h2 = (0x01000193 ^ str.length) >>> 0;   // FNV-ish fallback
    for (var i = 0; i < str.length; i++) {
      h1 = Math.imul(h1 ^ str.charCodeAt(i), 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ str.charCodeAt(i), 0x85ebca6b) >>> 0;
    }
    return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
  }
  function computeHash(b) { return sha256Hex(b.index + '|' + b.data + '|' + b.prevHash); }
  function trunc(h) { return h.slice(0, 10) + '…'; }

  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;';
    });
  }
  function escAttr(s) { return esc(s).replace(/"/g, '&quot;'); }

  /* ---- state ------------------------------------------------------- */
  var blocks = [];
  var rowEl, hintEl;

  async function buildChain() {
    blocks = PRISTINE.map(function (b, i) {
      return { index: i, data: b.data, fixed: !!b.fixed, prevHash: '', hash: '' };
    });
    var prev = ZERO;
    for (var i = 0; i < blocks.length; i++) {
      blocks[i].prevHash = prev;
      blocks[i].hash = await computeHash(blocks[i]);
      prev = blocks[i].hash;
    }
  }

  /* ---- DOM --------------------------------------------------------- */
  function buildDOM() {
    mount.classList.add('mounted');
    mount.innerHTML =
      '<div class="bc">' +
        '<div class="bc-row"></div>' +
        '<div class="bc-controls">' +
          '<button class="dh-btn" data-fix>⛏ Fix chain (re-mine)</button>' +
          '<button class="dh-btn" data-reset>⟲ Reset</button>' +
          '<span class="bc-hint">Edit a block\'s data → the chain breaks from there down.</span>' +
        '</div>' +
      '</div>';
    rowEl = mount.querySelector('.bc-row');
    hintEl = mount.querySelector('.bc-hint');

    var html = '';
    blocks.forEach(function (b, i) {
      if (i > 0) html += '<div class="bc-weld" data-weld="' + i + '">⛓</div>';
      html +=
        '<div class="bc-block valid" data-i="' + i + '">' +
          '<div class="bc-head"><span class="bc-idx">Block ' + i + '</span>' +
            '<span class="bc-badge valid" data-badge>✓ linked</span></div>' +
          (b.fixed
            ? '<div class="bc-static">' + esc(b.data) + '</div>'
            : '<input class="bc-data" data-edit="' + i + '" spellcheck="false" autocomplete="off" value="' + escAttr(b.data) + '">') +
          '<div class="bc-field">prev <span class="bc-prev" data-prev>' + trunc(b.prevHash) + '</span></div>' +
          '<div class="bc-field">hash <span class="bc-hash" data-hash>' + trunc(b.hash) + '</span></div>' +
        '</div>';
    });
    rowEl.innerHTML = html;

    // wire the editable data fields
    var edits = rowEl.querySelectorAll('[data-edit]');
    for (var e = 0; e < edits.length; e++) {
      (function (el) {
        var deb;
        el.addEventListener('input', function () {
          clearTimeout(deb);
          deb = setTimeout(function () { onEdit(+el.dataset.edit, el.value); }, 150);
        });
      })(edits[e]);
    }
    mount.querySelector('[data-fix]').addEventListener('click', fixChain);
    mount.querySelector('[data-reset]').addEventListener('click', resetChain);
  }

  /* ---- render ------------------------------------------------------ */
  function firstBroken() {
    for (var i = 1; i < blocks.length; i++) {
      if (blocks[i].prevHash !== blocks[i - 1].hash) return i;
    }
    return blocks.length;                       // whole chain intact
  }

  function renderHashes() {
    blocks.forEach(function (b, i) {
      var el = rowEl.querySelector('[data-i="' + i + '"]');
      el.querySelector('[data-prev]').textContent = trunc(b.prevHash);
      el.querySelector('[data-hash]').textContent = trunc(b.hash);
    });
  }

  function applyState(i, broken, isFirst) {
    var el = rowEl.querySelector('[data-i="' + i + '"]');
    el.classList.toggle('broken', broken);
    el.classList.toggle('valid', !broken);
    var badge = el.querySelector('[data-badge]');
    badge.className = 'bc-badge ' + (broken ? 'broken' : 'valid');
    badge.textContent = broken ? '✗ broken' : '✓ linked';
    // the mismatch lives on the FIRST broken block's prevHash
    el.querySelector('[data-prev]').classList.toggle('mismatch', broken && isFirst);
    if (i > 0) {
      var weld = rowEl.querySelector('[data-weld="' + i + '"]');
      if (weld) weld.classList.toggle('broken', broken);
    }
  }

  function renderStates(animate) {
    var bf = firstBroken();
    hintEl.textContent = bf < blocks.length
      ? 'Broken from Block ' + bf + ' onward — every downstream hash no longer lines up.'
      : 'Chain intact — every block\'s prevHash matches the one before it.';
    // State is applied SYNCHRONOUSLY (always correct, no interleaving timers);
    // the domino is purely visual via CSS transition-delay down the chain.
    blocks.forEach(function (b, i) {
      var broken = i >= bf;
      var delay = (animate && !REDUCED && broken) ? ((i - bf) * 0.14) + 's' : '0s';
      var el = rowEl.querySelector('[data-i="' + i + '"]');
      el.style.transitionDelay = delay;
      if (i > 0) {
        var weld = rowEl.querySelector('[data-weld="' + i + '"]');
        if (weld) weld.style.transitionDelay = delay;
      }
      applyState(i, broken, i === bf);
    });
  }

  /* ---- interactions ------------------------------------------------ */
  async function onEdit(k, value) {
    blocks[k].data = value;
    blocks[k].hash = await computeHash(blocks[k]);   // re-hash the edited block…
    // …but downstream prevHashes still point at the OLD hashes → links break
    renderHashes();
    renderStates(true);
  }

  async function fixChain() {
    for (var i = 1; i < blocks.length; i++) {
      blocks[i].prevHash = blocks[i - 1].hash;        // re-link
      blocks[i].hash = await computeHash(blocks[i]);  // re-mine
    }
    renderHashes();
    renderStates(true);
  }

  async function resetChain() {
    await buildChain();
    // restore the input fields to pristine data
    var edits = rowEl.querySelectorAll('[data-edit]');
    for (var e = 0; e < edits.length; e++) {
      edits[e].value = blocks[+edits[e].dataset.edit].data;
    }
    renderHashes();
    renderStates(false);
  }

  /* ---- init -------------------------------------------------------- */
  (async function () {
    await buildChain();
    buildDOM();
    renderHashes();
    renderStates(false);
  })();
})();
