/* =====================================================================
   DEMO 4 — Merkle tree (§7·3)  ·  slide 12
   ---------------------------------------------------------------------
   10 leaf transactions get hashed, then their hashes are paired and
   hashed together going up — click "Combine level" to advance one level
   at a time (10 → 5 → 3 → 2 → 1). One hash remains: the Merkle root.

   Hashing uses the same ×31 rolling-hash trick as the brief's MiniHash
   (Math.imul + >>> 0 for a 32-bit unsigned accumulator) — good enough to
   visualize the avalanche property without an async round-trip per node.
   A parent's hash = hash(leftHex + rightHex).

   Layout is computed in JS, not flexbox: every parent node's x-position is
   the exact midpoint of its two children, so "Node 1 + Node 2 combine"
   visibly renders their result centered directly above them. When a level
   has an odd count, the last hash is rendered as an actual second box (a
   dashed "duplicate" node with the same hash) rather than a badge, so the
   pairing pattern — two boxes into one parent — stays consistent at every
   level, including that one.

   Editing a leaf's transaction re-hashes it and cascades up through
   whatever levels are already built. "Tamper" flips one character in a
   random leaf as a canned version of the same thing.

   Mounts into #demo-merkle. No dependencies. Respects prefers-reduced-motion.
   ===================================================================== */
(function () {
  'use strict';
  var mount = document.getElementById('demo-merkle');
  if (!mount) return;

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var PRISTINE = [
    'Alice → Bob : 50', 'Bob → Carol : 30', 'Carol → Dave : 10', 'Dave → Eve : 5',
    'Eve → Frank : 20', 'Frank → Grace : 15', 'Grace → Heidi : 8', 'Heidi → Ivan : 12',
    'Ivan → Judy : 25', 'Judy → Alice : 3'
  ];

  /* ---- layout constants (px, in the deck's 1920-wide authoring canvas) */
  var LEAF_W = 120, MID_W = 88, ROOT_W = 150, NODE_H = 78;
  var GAP = 16, CLONE_GAP = 10, ROW_GAP = 96;
  var TREE_W = PRISTINE.length * LEAF_W + (PRISTINE.length - 1) * GAP;

  /* ---- hashing: 32-bit rolling hash, 8 hex chars --------------------- */
  function miniHash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) >>> 0;
    return h.toString(16).padStart(8, '0').toUpperCase();
  }
  function combine(a, b) { return miniHash(a + b); }

  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;';
    });
  }
  function escAttr(s) { return esc(s).replace(/"/g, '&quot;'); }
  function nextChar(c) {
    if (/[a-y]/.test(c)) return String.fromCharCode(c.charCodeAt(0) + 1);
    if (c === 'z') return 'a';
    if (/[0-8]/.test(c)) return String(+c + 1);
    if (c === '9') return '0';
    return 'x';
  }

  /* ---- scramble → settle ("decode" motif, < 600ms) ------------------ */
  function scramble(el, target) {
    el.textContent = target;
    if (REDUCED) return;
    if (el._raf) cancelAnimationFrame(el._raf);
    var pool = '0123456789ABCDEF', n = target.length, start = performance.now();
    function frame(now) {
      var t = Math.min(1, (now - start) / 420), out = '';
      for (var i = 0; i < n; i++) {
        var settle = (i / n) * 0.6;
        out += (t >= settle + 0.4) ? target[i] : pool[(Math.random() * pool.length) | 0];
      }
      el.textContent = out;
      if (t < 1) el._raf = requestAnimationFrame(frame);
      else { el.textContent = target; el._raf = null; }
    }
    el._raf = requestAnimationFrame(frame);
  }

  /* ---- state ---------------------------------------------------------
     leaves     : current transaction text, one per leaf
     builtLevels: how many levels exist on screen (1 = just the leaves)
     prevHashes : last-rendered hash per node key, to flash diffs
  ------------------------------------------------------------------- */
  var leaves = PRISTINE.slice();
  var builtLevels = 1;
  var prevHashes = {};
  var treeEl, lineSvg, controlsHint, combineBtn;

  // real-hash levels only (no duplicates) — the actual Merkle math.
  function computeLevels() {
    var levels = [leaves.map(miniHash)];
    for (var L = 1; L < builtLevels; L++) {
      var prev = levels[L - 1];
      if (prev.length === 1) break;
      var next = [];
      for (var i = 0; i < prev.length; i += 2) {
        var r = (i + 1 < prev.length) ? i + 1 : i;   // odd one out pairs with itself
        next.push(combine(prev[i], prev[r]));
      }
      levels.push(next);
    }
    return levels;
  }

  // Turns real-hash levels into a positioned layout: each row's node list
  // (with an extra rendered "duplicate" node when the row is odd and feeds
  // a level above it) plus each node's x-center, so a parent's x is always
  // the exact midpoint of the two children it was combined from.
  function buildLayout(levels) {
    var rows = [], prevXs = null;
    for (var L = 0; L < levels.length; L++) {
      var real = levels[L];
      var nodeW = (real.length === 1) ? ROOT_W : (L === 0 ? LEAF_W : MID_W);
      var nodes = real.map(function (h) { return { hash: h, dup: false }; });
      var xs;
      if (L === 0) {
        xs = real.map(function (_, i) { return i * (LEAF_W + GAP) + LEAF_W / 2; });
      } else {
        xs = [];
        for (var j = 0; j < real.length; j++) xs.push((prevXs[2 * j] + prevXs[2 * j + 1]) / 2);
      }
      var realCount = nodes.length;
      var hasNext = L < levels.length - 1;
      if (real.length > 1 && real.length % 2 === 1 && hasNext) {
        // odd one out: render an actual duplicate box, same hash, right beside it
        nodes.push({ hash: real[real.length - 1], dup: true });
        xs.push(xs[xs.length - 1] + nodeW + CLONE_GAP);
      }
      rows.push({ nodes: nodes, xs: xs, nodeW: nodeW, realCount: realCount });
      prevXs = xs;
    }
    return rows;
  }

  /* ---- DOM ------------------------------------------------------------ */
  function buildDOM() {
    mount.classList.add('mounted');
    mount.innerHTML =
      '<div class="mk">' +
        '<div class="mk-tree"><svg class="mk-lines"></svg></div>' +
        '<div class="mk-controls">' +
          '<button class="dh-btn" data-combine>▶ Combine level</button>' +
          '<button class="dh-btn" data-tamper title="Flip a character in one transaction">🔀 Tamper one transaction</button>' +
          '<button class="dh-btn" data-reset>⟲ Reset</button>' +
        '</div>' +
        '<p class="dh-cap" data-hint>10 transactions, 10 leaf hashes. Click "Combine level" to start pairing them up.</p>' +
      '</div>';
    treeEl = mount.querySelector('.mk-tree');
    controlsHint = mount.querySelector('[data-hint]');
    combineBtn = mount.querySelector('[data-combine]');

    mount.querySelector('[data-combine]').addEventListener('click', onCombine);
    mount.querySelector('[data-tamper]').addEventListener('click', onTamper);
    mount.querySelector('[data-reset]').addEventListener('click', onReset);
  }

  function render(animate) {
    var levels = computeLevels();
    var rows = buildLayout(levels);
    var containerH = (rows.length - 1) * ROW_GAP + NODE_H;

    var html = '<svg class="mk-lines" width="' + TREE_W + '" height="' + containerH +
      '" viewBox="0 0 ' + TREE_W + ' ' + containerH + '">' + buildLinesSvg(rows, containerH) + '</svg>';

    for (var L = 0; L < rows.length; L++) {
      var row = rows[L];
      for (var j = 0; j < row.nodes.length; j++) {
        var node = row.nodes[j], key = 'L' + L + 'N' + j, hash = node.hash;
        var changed = animate && prevHashes[key] !== undefined && prevHashes[key] !== hash;
        prevHashes[key] = hash;
        var left = row.xs[j] - row.nodeW / 2, bottom = L * ROW_GAP;
        var style = 'left:' + left + 'px; bottom:' + bottom + 'px; width:' + row.nodeW + 'px; height:' + NODE_H + 'px;';
        var isRoot = row.nodes.length === 1 && !node.dup;

        var cls = 'mk-node' + (node.dup ? ' mk-node-dup' : '') + (isRoot ? ' mk-root' : (L === 0 ? ' mk-leaf' : '')) +
          (changed ? ' mk-flash' : '');
        var body;
        if (L === 0) {
          body = '<input class="mk-tx" data-leaf="' + j + '" spellcheck="false" autocomplete="off" value="' + escAttr(leaves[j]) + '">' +
                 '<div class="mk-hash" data-hash>' + hash + '</div>';
        } else if (isRoot) {
          body = '<div class="mk-label">Merkle root</div><div class="mk-hash mk-hash-root">' + hash + '</div>';
        } else {
          body = (node.dup ? '<div class="mk-label mk-dup-label">duplicate</div>' : '') +
                 '<div class="mk-hash">' + hash + '</div>';
        }
        html += '<div class="' + cls + '" style="' + style + '" data-key="' + key + '">' + body + '</div>';
      }
    }

    treeEl.style.width = TREE_W + 'px';
    treeEl.style.height = containerH + 'px';
    treeEl.innerHTML = html;

    // wire leaf edits (re-query each render since innerHTML was replaced)
    var edits = treeEl.querySelectorAll('[data-leaf]');
    for (var e = 0; e < edits.length; e++) {
      (function (el) {
        var deb;
        el.addEventListener('input', function () {
          clearTimeout(deb);
          deb = setTimeout(function () { leaves[+el.dataset.leaf] = el.value; render(true); }, 150);
        });
      })(edits[e]);
    }

    var topLen = levels[levels.length - 1].length;
    if (topLen === 1) {
      combineBtn.textContent = '✅ Merkle root reached';
      combineBtn.disabled = true;
      controlsHint.textContent = 'One hash — ' + levels[levels.length - 1][0] + ' — now represents all 10 transactions. ' +
        'Change any transaction (or hit "Tamper") and watch it change too.';
    } else {
      combineBtn.disabled = false;
      combineBtn.textContent = '▶ Combine level (' + topLen + ' → ' + Math.ceil(topLen / 2) + ')';
      var oddNote = (topLen % 2 === 1)
        ? ' ' + topLen + ' is odd, so the last hash is duplicated (dashed box) and paired with itself.'
        : '';
      controlsHint.textContent = levels.length === 1
        ? '10 leaf hashes. Click "Combine level" to pair them up.'
        : 'Level ' + (levels.length - 1) + ': ' + topLen + ' hashes so far.' + oddNote;
    }

    if (animate && !REDUCED) {
      var flashNodes = treeEl.querySelectorAll('.mk-flash');
      for (var f = 0; f < flashNodes.length; f++) {
        var hEl = flashNodes[f].querySelector('.mk-hash');
        if (hEl) scramble(hEl, hEl.textContent);
      }
    }
  }

  // Every parent's incoming lines connect to the exact x-centers its own
  // x-position was averaged from — geometry matches placement exactly,
  // no DOM measurement needed.
  function buildLinesSvg(rows, containerH) {
    var svg = '';
    for (var L = 1; L < rows.length; L++) {
      var parentY = containerH - L * ROW_GAP;                  // parent's bottom edge
      var childTopY = containerH - ((L - 1) * ROW_GAP + NODE_H); // child's top edge
      for (var j = 0; j < rows[L].realCount; j++) {
        var px = rows[L].xs[j];
        var c0 = rows[L - 1].xs[2 * j], c1 = rows[L - 1].xs[2 * j + 1];
        svg += '<line x1="' + px + '" y1="' + parentY + '" x2="' + c0 + '" y2="' + childTopY + '" class="mk-line" />';
        svg += '<line x1="' + px + '" y1="' + parentY + '" x2="' + c1 + '" y2="' + childTopY + '" class="mk-line" />';
      }
    }
    return svg;
  }

  /* ---- interactions --------------------------------------------------- */
  function onCombine() {
    var levels = computeLevels();
    if (levels[levels.length - 1].length === 1) return;
    builtLevels++;
    render(true);
  }
  function onTamper() {
    var idx = (Math.random() * leaves.length) | 0;
    var s = leaves[idx];
    var m = s.match(/\d(?=\D*$)/);
    if (m) {
      var pos = s.lastIndexOf(m[0]);
      leaves[idx] = s.slice(0, pos) + nextChar(m[0]) + s.slice(pos + 1);
    } else {
      var i = s.search(/[a-z]/i); if (i < 0) i = 0;
      leaves[idx] = s.slice(0, i) + nextChar(s[i]) + s.slice(i + 1);
    }
    render(true);
    var input = treeEl.querySelector('[data-leaf="' + idx + '"]');
    if (input) input.value = leaves[idx];
  }
  function onReset() {
    leaves = PRISTINE.slice();
    builtLevels = 1;
    prevHashes = {};
    render(false);
  }

  /* ---- init ------------------------------------------------------------ */
  buildDOM();
  render(false);
})();
