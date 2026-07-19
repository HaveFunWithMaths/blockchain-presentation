/* =====================================================================
   DEMO 3 — Digital signatures (sign with private key, verify with public)  ·  slide 13
   ---------------------------------------------------------------------
   Real public-key crypto via the Web Crypto API: ECDSA over P-256 with
   SHA-256. On mount we generate Alice's keypair. Her PUBLIC key is shared
   with everyone; her PRIVATE key never leaves her.

     sign   : signature = ECDSA_sign(privateKey,  SHA-256(message))
     verify : ECDSA_verify(publicKey, signature, SHA-256(message)) → ✓ / ✗

   Sign the message as Alice, then edit one character → the signature no
   longer verifies (✗ forged). Only Alice — the holder of the private key —
   can produce a signature that verifies against her public key. This proves
   *authenticity* (who sent it), the piece the tamper-domino (integrity)
   didn't cover.

   Mounts into #demo-sign. Needs crypto.subtle (localhost/https); on file://
   it degrades to an explanatory message. Respects prefers-reduced-motion.
   ===================================================================== */
(function () {
  'use strict';
  var mount = document.getElementById('demo-sign');
  if (!mount) return;

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HAS_SUBTLE = !!(window.crypto && window.crypto.subtle && window.crypto.subtle.generateKey);

  /* ---- crypto helpers ---------------------------------------------- */
  var ALGO = { name: 'ECDSA', namedCurve: 'P-256' };
  var SIGN = { name: 'ECDSA', hash: 'SHA-256' };

  function bytesToHex(buf) {
    return Array.from(new Uint8Array(buf)).map(function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }
  function enc(str) { return new TextEncoder().encode(str); }

  /* ---- scramble → settle ("decode" motif, < 600ms) ----------------- */
  function scramble(el, target) {
    el.textContent = target;
    if (REDUCED) return;
    if (el._raf) cancelAnimationFrame(el._raf);
    var pool = '0123456789abcdef', n = target.length, start = performance.now();
    function frame(now) {
      var t = Math.min(1, (now - start) / 480), out = '';
      for (var i = 0; i < n; i++) {
        var settle = (i / n) * 0.6;
        out += (t >= settle + 0.4 || target[i] === '…') ? target[i]
             : pool[(Math.random() * pool.length) | 0];
      }
      el.textContent = out;
      if (t < 1) el._raf = requestAnimationFrame(frame);
      else { el.textContent = target; el._raf = null; }
    }
    el._raf = requestAnimationFrame(frame);
  }

  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;';
    });
  }
  function escAttr(s) { return esc(s).replace(/"/g, '&quot;'); }
  function trunc(hex) { return hex.slice(0, 16) + '…' + hex.slice(-8); }
  // Flip one character to a clearly different one (the "forge attempt" helper).
  function nextChar(c) {
    if (/[a-y]/.test(c)) return String.fromCharCode(c.charCodeAt(0) + 1);
    if (c === 'z') return 'a';
    if (/[0-8]/.test(c)) return String(+c + 1);
    if (c === '9') return '0';
    return 'x';
  }

  /* ---- no secure context: explain instead of erroring -------------- */
  if (!HAS_SUBTLE) {
    mount.classList.add('mounted');
    mount.innerHTML =
      '<div class="ds"><p class="dh-warn">⚠ Web Crypto (crypto.subtle) needs a secure ' +
      'context.</p><p class="dh-cap">Serve the deck over <b>http://localhost</b> ' +
      '(<code>npm start</code>) rather than opening the file directly, and the live ' +
      'ECDSA sign / verify demo will run here.</p></div>';
    return;
  }

  /* ---- state ------------------------------------------------------- */
  var keys = null, pubHex = '', signed = null;   // signed = { message, sigHex, sig }
  var verified = false;                          // has Bob run his check at least once?
  var msgEl, sigEl, badgeEl, hintEl, verifyEl;

  function buildDOM() {
    mount.classList.add('mounted');
    mount.innerHTML =
      '<div class="ds">' +
        '<div class="ds-keys">' +
          '<span class="ds-tag ds-priv">🔒 Alice\'s private key <b>(secret)</b></span>' +
          '<span class="ds-tag ds-pub">🔑 Alice\'s public key <b>(shared)</b> ' +
            '<span class="ds-pubhex" data-pub>…</span></span>' +
        '</div>' +
        '<div class="dh-top">' +
          '<label>message</label>' +
          '<input class="dh-input" data-msg spellcheck="false" autocomplete="off" ' +
            'value="Alice → Bob : 50">' +
          '<button class="dh-btn" data-sign>🔏 Sign as Alice</button>' +
          '<button class="dh-btn" data-verify disabled ' +
            'title="Check the signature using only Alice\'s public key">👤 Verify as Bob (using Alice\'s public key)</button>' +
          '<button class="dh-btn" data-forge title="Flip a character without Alice\'s key">😈 Forge a char</button>' +
        '</div>' +
        '<div class="ds-sigline">' +
          '<span class="dh-fp-label">signature</span>' +
          '<span class="dh-fp ds-sig" data-sig>— not signed yet —</span>' +
        '</div>' +
        '<div class="ds-verify">' +
          '<span class="dh-fp-label">Bob verifies with Alice\'s public key</span>' +
          '<span class="ds-badge" data-badge>— sign first —</span>' +
        '</div>' +
        '<p class="dh-cap" data-hint>Private key signs · public key verifies. ' +
          'Sign as Alice, then click "Verify as Bob" — he never sees her private key, only the public one.</p>' +
      '</div>';

    msgEl    = mount.querySelector('[data-msg]');
    sigEl    = mount.querySelector('[data-sig]');
    badgeEl  = mount.querySelector('[data-badge]');
    hintEl   = mount.querySelector('[data-hint]');
    verifyEl = mount.querySelector('[data-verify]');

    var deb;
    msgEl.addEventListener('input', function () {
      clearTimeout(deb);
      // live: editing the message re-runs Bob's check once he's verified at least once
      deb = setTimeout(function () { if (verified) verifyAsBob(); }, 120);
    });
    mount.querySelector('[data-sign]').addEventListener('click', signMessage);
    mount.querySelector('[data-forge]').addEventListener('click', forgeChar);
    verifyEl.addEventListener('click', verifyAsBob);
  }

  async function init() {
    keys = await crypto.subtle.generateKey(ALGO, true, ['sign', 'verify']);
    var raw = await crypto.subtle.exportKey('raw', keys.publicKey);
    pubHex = bytesToHex(raw);
    scramble(mount.querySelector('[data-pub]'), trunc(pubHex));
  }

  /* ---- interactions ------------------------------------------------ */
  async function signMessage() {
    var message = msgEl.value;
    var sig = await crypto.subtle.sign(SIGN, keys.privateKey, enc(message));
    var sigHex = bytesToHex(sig);
    signed = { message: message, sigHex: sigHex, sig: sig };
    verified = false;
    scramble(sigEl, trunc(sigHex));
    setBadge('neutral', '— click "Verify as Bob" —');
    verifyEl.disabled = false;
    hintEl.textContent = 'Signed by Alice with her private key. Now click ' +
      '"Verify as Bob" — he only ever sees her public key.';
  }

  async function verifyAsBob() {
    if (!signed) return;
    verified = true;
    var ok = await crypto.subtle.verify(SIGN, keys.publicKey, signed.sig, enc(msgEl.value));
    if (ok) {
      setBadge(true, '✓ genuine — Bob confirms this really came from Alice');
      hintEl.textContent = 'Bob checked the signature against Alice\'s public key: it matches. ' +
        'Now edit the message (or "Forge a char") and watch his check fail.';
    } else {
      setBadge(false, '✗ forged — Bob\'s check against Alice\'s public key fails');
      hintEl.textContent = 'The message changed, so Alice\'s signature no longer verifies ' +
        'against her public key. Forging a valid one needs her private key — which only she has.';
    }
  }

  // "Forge" = change the message a hacker-style, WITHOUT re-signing → verify fails.
  function forgeChar() {
    var s = msgEl.value;
    if (!s.length) { msgEl.value = 'Alice → Bob : 5000'; verifyAsBob(); return; }
    // flip the last digit if there is one (the juicy "pay myself more" edit), else first letter
    var m = s.match(/\d(?=\D*$)/);
    if (m) {
      var idx = s.lastIndexOf(m[0]);
      msgEl.value = s.slice(0, idx) + nextChar(m[0]) + s.slice(idx + 1);
    } else {
      var i = s.search(/[a-z]/i);
      if (i < 0) i = 0;
      msgEl.value = s.slice(0, i) + nextChar(s[i]) + s.slice(i + 1);
    }
    verifyAsBob();
  }

  function setBadge(state, text) {
    badgeEl.className = 'ds-badge' + (state === 'neutral' ? '' : state ? ' ok' : ' bad');
    badgeEl.textContent = text;
  }

  /* ---- init -------------------------------------------------------- */
  (async function () {
    buildDOM();
    await init();
  })();
})();
