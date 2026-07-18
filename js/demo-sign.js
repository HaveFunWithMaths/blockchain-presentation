/* =====================================================================
   DEMO 3 — Digital signatures (sign with private key, verify with public)
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
  var msgEl, sigEl, badgeEl, hintEl;

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
          '<button class="dh-btn" data-forge title="Flip a character without Alice\'s key">😈 Forge a char</button>' +
        '</div>' +
        '<div class="ds-sigline">' +
          '<span class="dh-fp-label">signature</span>' +
          '<span class="dh-fp ds-sig" data-sig>— not signed yet —</span>' +
        '</div>' +
        '<div class="ds-verify">' +
          '<span class="dh-fp-label">verify with public key</span>' +
          '<span class="ds-badge" data-badge>— sign first —</span>' +
        '</div>' +
        '<p class="dh-cap" data-hint>Private key signs · public key verifies. ' +
          'Sign, then change one character — the signature stops verifying.</p>' +
      '</div>';

    msgEl   = mount.querySelector('[data-msg]');
    sigEl   = mount.querySelector('[data-sig]');
    badgeEl = mount.querySelector('[data-badge]');
    hintEl  = mount.querySelector('[data-hint]');

    var deb;
    msgEl.addEventListener('input', function () {
      clearTimeout(deb);
      deb = setTimeout(reverify, 120);          // live: editing breaks the signature
    });
    mount.querySelector('[data-sign]').addEventListener('click', signMessage);
    mount.querySelector('[data-forge]').addEventListener('click', forgeChar);
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
    scramble(sigEl, trunc(sigHex));
    setBadge(true, '✓ genuine — signature matches this message');
    hintEl.textContent = 'Signed. Now edit the message (or "Forge a char") — ' +
      'the same signature will no longer verify.';
  }

  async function reverify() {
    if (!signed) return;
    var ok = await crypto.subtle.verify(SIGN, keys.publicKey, signed.sig, enc(msgEl.value));
    if (ok) {
      setBadge(true, '✓ genuine — signature matches this message');
      hintEl.textContent = 'Message matches what Alice signed.';
    } else {
      setBadge(false, '✗ forged — signature does not match this message');
      hintEl.textContent = 'The message changed, so Alice\'s signature no longer ' +
        'verifies. Forging a valid one needs her private key — which no one else has.';
    }
  }

  // "Forge" = change the message a hacker-style, WITHOUT re-signing → verify fails.
  function forgeChar() {
    var s = msgEl.value;
    if (!s.length) { msgEl.value = 'Alice → Bob : 5000'; reverify(); return; }
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
    reverify();
  }

  function setBadge(ok, text) {
    badgeEl.className = 'ds-badge ' + (ok ? 'ok' : 'bad');
    badgeEl.textContent = text;
  }

  /* ---- init -------------------------------------------------------- */
  (async function () {
    buildDOM();
    await init();
  })();
})();
