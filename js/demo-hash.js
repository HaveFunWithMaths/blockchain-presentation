/* =====================================================================
   DEMO 1 — Hashing (two stages, one input)  ·  slide 10
   ---------------------------------------------------------------------
   Stage A — MiniHash (custom, positional letter-sum): every step revealed
     one at a time in a colorful animation.
       1. letters → numbers     A=1, B=2, … Z=26 (letters only)
       2. sum by position       odd positions (1,3,5…) vs even (2,4,6…),
                                shown as a live addition expression
       3. multiply              oddSum × evenSum = resultant number
       4. digits → hash         odd-valued digits → letters (1=A…9=I),
                                even-valued digits kept as-is
     e.g. MAZE → 39 × 6 = 234 → "2C4"  ·  "the quick brown fox" → 11020 → "AA020"
   Stage B — SHA-256 via the Web Crypto API (crypto.subtle) — the real thing.
   Mounts into #demo-hash. No dependencies. Respects prefers-reduced-motion.
   ===================================================================== */
(function () {
  'use strict';
  var mount = document.getElementById('demo-hash');
  if (!mount) return;

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HAS_SUBTLE = !!(window.crypto && window.crypto.subtle);

  /* ---- Stage A algorithm: positional letter-sum -------------------- */
  function miniHash(str) {
    var letters = [];
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      if (/[a-zA-Z]/.test(ch)) {
        var up = ch.toUpperCase();
        letters.push({ ch: up, val: up.charCodeAt(0) - 64 });   // A=1 … Z=26
      }
    }
    var oddSum = 0, evenSum = 0, oddVals = [], evenVals = [];
    for (var j = 0; j < letters.length; j++) {
      var L = letters[j];
      L.pos = j + 1;                                            // 1-indexed
      L.parity = (L.pos % 2 === 1) ? 'odd' : 'even';
      if (L.parity === 'odd') { oddSum += L.val; oddVals.push(L.val); }
      else { evenSum += L.val; evenVals.push(L.val); }
    }
    var product = oddSum * evenSum;                            // resultant number
    var digits = String(product).split('').map(Number);
    var out = '';
    for (var k = 0; k < digits.length; k++) {
      out += (digits[k] % 2 === 1) ? String.fromCharCode(64 + digits[k]) // odd → letter
                                   : String(digits[k]);                  // even → kept
    }
    return {
      letters: letters, oddVals: oddVals, evenVals: evenVals,
      oddSum: oddSum, evenSum: evenSum, product: product, digits: digits, hash: out
    };
  }

  /* ---- Stage B algorithm: SHA-256 (verbatim from the brief §6) ------ */
  async function sha256Hex(str) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  /* ---- scramble → settle ("decode" motif, < 600ms) ----------------- */
  function scramble(el, target, opts) {
    opts = opts || {};
    var dur = opts.duration || 520;
    var pool = opts.pool || (opts.upper ? '0123456789ABCDEF' : '0123456789abcdef');
    // Final value up-front → always correct even if rAF is paused (bg tab).
    el.textContent = target;
    if (REDUCED) return;
    if (el._raf) cancelAnimationFrame(el._raf);
    var n = target.length, start = performance.now();
    function frame(now) {
      var t = Math.min(1, (now - start) / dur), out = '';
      for (var i = 0; i < n; i++) {
        var settle = (i / n) * 0.6;
        if (t >= settle + 0.4 || target[i] === ' ') out += target[i];
        else out += pool[(Math.random() * pool.length) | 0];
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
  // Flip one character to a clearly different one (for the change-a-letter demo).
  function nextChar(c) {
    if (/[a-y]/.test(c)) return String.fromCharCode(c.charCodeAt(0) + 1);
    if (c === 'z') return 'a';
    if (/[A-Y]/.test(c)) return String.fromCharCode(c.charCodeAt(0) + 1);
    if (c === 'Z') return 'A';
    return 'x';                                                // spaces / punctuation
  }

  /* ---- build UI ---------------------------------------------------- */
  mount.classList.add('mounted');
  mount.innerHTML =
    '<div class="dh">' +
      '<div class="dh-top">' +
        '<label>Input</label>' +
        '<input class="dh-input" type="text" spellcheck="false" autocomplete="off" value="the quick brown fox">' +
        '<button class="dh-btn" data-flip>Change one letter</button>' +
        '<span class="dh-toggle">' +
          '<button data-stage="A" class="active">Stage A · MiniHash</button>' +
          '<button data-stage="B">Stage B · SHA-256</button>' +
        '</span>' +
      '</div>' +
      '<div class="dh-callout">input changed — re-running the steps</div>' +

      '<div class="dh-stage stageA active">' +
        '<div class="mh-step" data-step>' +
          '<div class="mh-h">1 · letters → numbers <span class="mh-hint">A=1 · B=2 · … · Z=26</span></div>' +
          '<div class="mh-letters"></div>' +
        '</div>' +
        '<div class="mh-step" data-step>' +
          '<div class="mh-h">2 · sum by position</div>' +
          '<div class="mh-buckets">' +
            '<div class="mh-bucket odd">' +
              '<span class="lbl">odd positions (1,3,5…)</span>' +
              '<div class="mh-calc" data-odd-calc></div>' +
            '</div>' +
            '<div class="mh-bucket even">' +
              '<span class="lbl">even positions (2,4,6…)</span>' +
              '<div class="mh-calc" data-even-calc></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="mh-step" data-step>' +
          '<div class="mh-h">3 · multiply</div>' +
          '<div class="mh-mult"><span data-oddm>0</span> × <span data-evenm>0</span> = <b data-prod>0</b> <span class="mh-hint">← resultant number</span></div>' +
        '</div>' +
        '<div class="mh-step" data-step>' +
          '<div class="mh-h">4 · digits → hash <span class="mh-hint">odd digit → letter (1=A…9=I) · even digit kept</span></div>' +
          '<div class="mh-digits" data-digits></div>' +
        '</div>' +
        '<div class="dh-controls">' +
          '<button class="dh-btn" data-a="play">▶ Play</button>' +
          '<button class="dh-btn" data-a="replay">⟲ Replay</button>' +
        '</div>' +
        '<div class="dh-fp-label">MiniHash value</div>' +
        '<div class="dh-fp" data-fp-a>0</div>' +
        '<div class="dh-compare" data-cmp-a>' +
          '<div class="crow"><span class="k">before</span><span class="old"></span></div>' +
          '<div class="crow"><span class="k">after</span><span class="new"></span></div>' +
        '</div>' +
      '</div>' +

      '<div class="dh-stage stageB">' +
        '<div class="dh-fp-label">SHA-256 digest (64 hex)</div>' +
        '<div class="dh-fp big64" data-fp-b>…</div>' +
        '<div class="dh-compare" data-cmp-b>' +
          '<div class="crow"><span class="k">before</span><span class="old"></span></div>' +
          '<div class="crow"><span class="k">after</span><span class="new"></span></div>' +
        '</div>' +
        '<div class="sha-explain">' +
          '<div class="mh-h">what SHA-256 is (high level)</div>' +
          '<ul>' +
            '<li><b>A fixed 256-bit fingerprint.</b> Any input — one letter or an entire book — always collapses to these 64 hex characters.</li>' +
            '<li><b>Same three properties as MiniHash,</b> deterministic · avalanche · one-way — but cryptographically hardened: reversing it, or finding two inputs with the same digest, is computationally infeasible.</li>' +
            '<li><b>It quietly runs the modern world:</b> Bitcoin block hashes &amp; proof-of-work, Git commits, TLS certificates, password storage.</li>' +
          '</ul>' +
          '<div class="dh-cap">We\'re showing the input → fingerprint behavior, not the internal 64-round compression that makes it secure.</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  var input   = mount.querySelector('.dh-input');
  var callout = mount.querySelector('.dh-callout');
  var lettersEl = mount.querySelector('.mh-letters');
  var oddCalc = mount.querySelector('[data-odd-calc]');
  var evenCalc = mount.querySelector('[data-even-calc]');
  var digitsEl  = mount.querySelector('[data-digits]');
  var oddMEl  = mount.querySelector('[data-oddm]');
  var evenMEl = mount.querySelector('[data-evenm]');
  var prodEl  = mount.querySelector('[data-prod]');
  var stepEls = mount.querySelectorAll('.stageA .mh-step');
  var fpA     = mount.querySelector('[data-fp-a]');
  var fpB     = mount.querySelector('[data-fp-b]');
  var cmpA    = mount.querySelector('[data-cmp-a]');
  var cmpB    = mount.querySelector('[data-cmp-b]');
  var stageAEl = mount.querySelector('.stageA');
  var stageBEl = mount.querySelector('.stageB');
  var toggleBtns = mount.querySelectorAll('.dh-toggle button');

  /* ---- state ------------------------------------------------------- */
  var stage = 'A';
  var data = miniHash(input.value);
  var seqTimers = [];
  var shaToken = 0;

  /* Build one bucket's "a + b + c = sum" expression. */
  function renderCalc(container, vals, sum, sumAttr) {
    container.innerHTML = '';
    var arr = vals.length ? vals : [0];
    arr.forEach(function (v, i) {
      if (i > 0) {
        var op = document.createElement('span');
        op.className = 'op'; op.textContent = '+'; container.appendChild(op);
      }
      var term = document.createElement('span');
      term.className = 'term'; term.textContent = v; container.appendChild(term);
    });
    var eq = document.createElement('span'); eq.className = 'op'; eq.textContent = '='; container.appendChild(eq);
    var s = document.createElement('span'); s.className = 'sum'; s.setAttribute(sumAttr, ''); s.textContent = sum;
    container.appendChild(s);
  }

  /* ---- Stage A rendering (values set synchronously → always correct) */
  function buildStageA() {
    lettersEl.innerHTML = '';
    data.letters.forEach(function (L) {
      var t = document.createElement('div');
      t.className = 'mh-let ' + L.parity;
      t.innerHTML = '<span class="pos">' + L.pos + '</span>' +
                    '<span class="ch">' + esc(L.ch) + '</span>' +
                    '<span class="val">' + L.val + '</span>';
      lettersEl.appendChild(t);
    });

    renderCalc(oddCalc, data.oddVals, data.oddSum, 'data-odd');
    renderCalc(evenCalc, data.evenVals, data.evenSum, 'data-even');
    oddMEl.textContent = data.oddSum; evenMEl.textContent = data.evenSum;
    prodEl.textContent = data.product;

    digitsEl.innerHTML = '';
    data.digits.forEach(function (d) {
      var odd = d % 2 === 1;
      var chip = document.createElement('div');
      chip.className = 'mh-dig ' + (odd ? 'odd' : 'even');
      chip.innerHTML = '<span class="d">' + d + '</span>' +
                       '<span class="to">' + (odd ? String.fromCharCode(64 + d) : d) + '</span>';
      digitsEl.appendChild(chip);
    });
    fpA.textContent = data.hash;
  }

  function clearSeq() { seqTimers.forEach(clearTimeout); seqTimers = []; }
  function at(ms, fn) { seqTimers.push(setTimeout(fn, ms)); }
  function showAll(nodeList, on) {
    for (var i = 0; i < nodeList.length; i++) nodeList[i].classList.toggle('show', on);
  }
  function resetReveal() {
    showAll(stepEls, false);
    showAll(lettersEl.children, false);
    showAll(oddCalc.children, false);
    showAll(evenCalc.children, false);
    showAll(digitsEl.children, false);
  }

  function playSeq() {
    clearSeq();
    if (REDUCED) {                       // no motion → reveal everything at once
      showAll(stepEls, true); showAll(lettersEl.children, true);
      showAll(oddCalc.children, true); showAll(evenCalc.children, true);
      showAll(digitsEl.children, true); fpA.textContent = data.hash;
      return;
    }
    resetReveal();
    var t = 120;
    // 1 · letters drop in
    at(t, function () { stepEls[0].classList.add('show'); }); t += 160;
    var L = lettersEl.children;
    for (var i = 0; i < L.length; i++) (function (n) { at(t, function () { L[n].classList.add('show'); }); })(i), t += 80;
    t += 160;
    // 2 · buckets: terms clone down, then the sum
    at(t, function () { stepEls[1].classList.add('show'); }); t += 160;
    var oc = oddCalc.children, ec = evenCalc.children, maxc = Math.max(oc.length, ec.length);
    for (var c = 0; c < maxc; c++) (function (n) {
      at(t, function () { if (oc[n]) oc[n].classList.add('show'); if (ec[n]) ec[n].classList.add('show'); });
    })(c), t += 130;
    t += 220;
    // 3 · multiply
    at(t, function () { stepEls[2].classList.add('show'); }); t += 520;
    // 4 · digits → hash
    at(t, function () { stepEls[3].classList.add('show'); }); t += 160;
    var D = digitsEl.children;
    for (var d = 0; d < D.length; d++) (function (n) { at(t, function () { D[n].classList.add('show'); }); })(d), t += 90;
    t += 160;
    at(t, function () { scramble(fpA, data.hash, { pool: 'ABCDEFGHI0123456789', duration: 460 }); });
  }

  /* ---- Stage B (SHA-256) ------------------------------------------- */
  async function updateSha() {
    if (!HAS_SUBTLE) {
      fpB.classList.add('dh-warn');
      fpB.textContent = 'SHA-256 needs a secure context — serve on http://localhost (not file://).';
      return;
    }
    var my = ++shaToken;
    var target = await sha256Hex(input.value);
    if (my !== shaToken) return;                    // a newer keystroke won
    scramble(fpB, target, { upper: false, duration: 520 });
  }

  /* ---- recompute on any input change ------------------------------- */
  function update() {
    data = miniHash(input.value);
    buildStageA();
    updateSha();
    if (stage === 'A') playSeq(); else clearSeq();
  }

  function flashCallout() {
    callout.classList.add('flash');
    clearTimeout(callout._t);
    callout._t = setTimeout(function () { callout.classList.remove('flash'); }, 1100);
  }

  /* ---- change one letter → before/after side-by-side --------------- */
  async function flipOne() {
    var beforeStr = input.value;
    var before = { mini: miniHash(beforeStr).hash, sha: HAS_SUBTLE ? await sha256Hex(beforeStr) : null };
    var arr = beforeStr.length ? beforeStr.split('') : ['a'];
    var idx = Math.floor((arr.length - 1) / 2);
    arr[idx] = nextChar(arr[idx]);
    input.value = arr.join('');
    update();
    var afterStr = input.value;
    var after = { mini: miniHash(afterStr).hash, sha: HAS_SUBTLE ? await sha256Hex(afterStr) : null };

    cmpA.querySelector('.old').textContent = before.mini;
    cmpA.querySelector('.new').textContent = after.mini;
    cmpA.classList.add('show');
    if (before.sha != null) {
      cmpB.querySelector('.old').textContent = before.sha;
      cmpB.querySelector('.new').textContent = after.sha;
      cmpB.classList.add('show');
    }
    flashCallout();
  }

  /* ---- stage switching --------------------------------------------- */
  function setStage(s) {
    stage = s;
    for (var i = 0; i < toggleBtns.length; i++) {
      toggleBtns[i].classList.toggle('active', toggleBtns[i].dataset.stage === s);
    }
    stageAEl.classList.toggle('active', s === 'A');
    stageBEl.classList.toggle('active', s === 'B');
    if (s === 'A') playSeq(); else { clearSeq(); updateSha(); }
  }

  /* ---- events ------------------------------------------------------ */
  var deb;
  input.addEventListener('input', function () {
    clearTimeout(deb);
    flashCallout();
    cmpA.classList.remove('show');
    cmpB.classList.remove('show');
    deb = setTimeout(update, 140);
  });
  mount.querySelector('[data-flip]').addEventListener('click', flipOne);
  mount.querySelector('[data-a="play"]').addEventListener('click', playSeq);
  mount.querySelector('[data-a="replay"]').addEventListener('click', function () { buildStageA(); playSeq(); });
  for (var b = 0; b < toggleBtns.length; b++) {
    toggleBtns[b].addEventListener('click', function () { setStage(this.dataset.stage); });
  }

  /* ---- init -------------------------------------------------------- */
  buildStageA();
  updateSha();
  playSeq();
})();
