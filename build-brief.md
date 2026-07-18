# Build Brief — "Decode the Tech: Blockchain" (Interactive Browser Presentation)

> Paste this entire file into Claude Code as the spec. Build the presentation exactly to this brief. Ask me before adding anything from the "Optional topics" section — those are not part of the core build.

---

## 1. Objective

Build a **browser-based, interactive slide presentation** that explains blockchain to **software engineers who are new to it**, in **~35 minutes + Q&A** (40 min total slot).

Series framing — **"Decode the Tech"**: everyday tech feels simple on the surface, but underneath sits extraordinary engineering we rarely notice. This talk decodes the buzzword "blockchain" into the small pile of elegant engineering that actually powers it. The whole deck is structured as a *reveal*: it sounds like finance hype → it's actually just hashing, append-only logs, and consensus.

Audience are engineers, so **anchor everything to things they already know**: hash functions, append-only logs, and **Git** (a hash-linked, append-only, content-addressed history — basically a blockchain minus the trustless part).

---

## 2. Tech stack & structure

- **Base framework:** [reveal.js](https://revealjs.com) (v5.x). Reasons: free keyboard nav, progress bar, fragments, and — importantly — **built-in speaker notes** via `S` key. This satisfies the hard requirement that *speaker notes must NOT appear on the slides themselves.*
- **Speaker notes:** every slide's presenter notes go in `<aside class="notes">…</aside>`. They must never render on the slide.
- **Interactive demos:** plain vanilla JS + DOM, embedded directly in their slide `<section>`. No React needed.
- **Real hashing:** use the Web Crypto API — `crypto.subtle.digest('SHA-256', …)`. No hashing library.
  - ⚠️ `crypto.subtle` only works in a **secure context** (https or `localhost`), **not** `file://`. So the app must be served. Add an `npm start` / simple static-server script and a README line telling me to open `http://localhost:PORT`, not the raw file.
- **Offline-safe for the venue:** download reveal.js assets **locally / bundle them** rather than relying on a CDN at talk time. The demos use only built-in browser APIs, so they already work offline.
- **File structure (suggested):**
  ```
  /index.html          reveal deck, one <section> per slide
  /css/theme.css       Decode-the-Tech theme tokens + overrides
  /js/demo-hash.js     Demo 1 (toy hash + SHA-256)
  /js/demo-chain.js    Demo 2 (tamper domino)
  /js/demo-mine.js     Demo 3 (optional, only if I ask)
  /vendor/revealjs/…   bundled locally
  /README.md           how to run + present (press S for notes)
  ```
- **Nav:** arrow keys / space / clickable arrows, ESC for overview, `S` for speaker view, `F` fullscreen. Show a slide progress bar.
- **Responsive:** must look right on a projector at 1920×1080; also degrade gracefully on a laptop screen.

---

## 3. Design direction ("Decode the Tech" theme)

Make it feel like a technical-but-polished dark deck, not a corporate template.

- **Mood:** dark, engineered, terminal-adjacent. High contrast. Lots of breathing room.
- **Palette (tokens — expose as CSS variables so I can rebrand later):**
  - `--bg: #0B0E14` (near-black navy)
  - `--surface: #121722`
  - `--text: #E6EAF2`
  - `--muted: #8A93A6`
  - `--accent: #35E0C1` (electric teal — used sparingly for the "decoded" signal)
  - `--danger: #FF5C7A` (tamper / broken-chain red)
  - `--ok: #3DDC84` (valid / green)
- **Type:** a clean geometric/grotesk sans for headings & body (e.g. Inter or system-ui); a **monospace** (e.g. JetBrains Mono / ui-monospace) for all hashes, code, char-codes, and ledger entries. Hashes must always be monospace so they align and the "avalanche" change is obvious.
- **Motif — the "decode" reveal:** optional but on-theme — titles and, especially, **hash outputs** resolve via a short *scramble→settle* animation (random chars snapping into the final value). Use it on the hash demo output; it literally visualizes "decoding." Keep it fast (<600ms) and respect `prefers-reduced-motion`.
- Keep decoration minimal: thin accent rules, subtle grid/dot background at low opacity. No stock imagery except the Satoshi paper on slide 3.
- If a "Decode the Tech" brand kit (logo/colors/fonts) exists later, it should be swappable via the CSS tokens above — leave a clearly commented `:root` block.

---

## 4. Global requirements

- One `<section>` per slide, in the order below.
- Each slide: **on-screen content** (concise — headline + a few beats, not paragraphs) + **`<aside class="notes">`** with the speaker notes I've written.
- Use reveal **fragments** to reveal beats one at a time where the notes imply a build.
- Interactive slides must be **usable live** (big tap targets, legible from the back of a room, keyboard-friendly).
- No analytics, no external network calls at runtime (besides local reveal assets).

---

## 5. Slide-by-slide spec

> On each slide, "Screen" = what renders; "Notes" = goes in `<aside class="notes">`. Keep on-screen text terse.

### ACT 1 — THE PROBLEM (~8 min)

**1 · Title (0.5m)**
- Screen: "Decode the Tech" (series lockup) · **Blockchain** · presenter name. Optional scramble-in on the word "Blockchain."
- Notes: Frame it — "Everyone's heard the word, almost no one can explain it. By the end you'll see it's simpler than the hype." Set expectation: we'll build it up from first principles, engineer-style.

**2 · What people *think* blockchain is (1.5m)**
- Screen: three misconceptions as fragments — "…something about Bitcoin?" / "…a way to make electronic contracts?" / "…something about financial transactions?"
- Notes: Read them, let the room recognize themselves. Hook: each is *partly* right and *mostly* wrong. Promise to fix all three. (Callback to this slide at the very end.)

**3 · Where it came from (2m)**
- Screen: image of Satoshi Nakamoto's 2008 paper *"Bitcoin: A Peer-to-Peer Electronic Cash System."*
- Notes: The invention wasn't digital money (people tried for decades) — it was **a shared record no one controls and no one can secretly rewrite.** Blockchain = the mechanism; Bitcoin = the first *application*. CERN parallel: the web was built to share physics papers, then ate the world — same story, built for one problem, escaped into many.

**4 · The real problem: ledgers & trust (2.5m)**
- Screen: a tiny ledger table (Date / From / To / Amount), then the **Alice vs Bob** dispute.
- Notes: Define a ledger — append-only; you never edit an entry, you only add. Apples example: I record a sale, you record a purchase. Failure modes: ledgers get **damaged**, drift **out of sync**, or get **altered on purpose.** Land on Alice/Bob — she says she paid, he says she didn't. Whose copy is truth? *That discrepancy is the entire problem.*

**5 · Today's fix: the middleman (1.5m)**
- Screen: Alice → 🏦 Bank → Bob.
- Notes: We outsource trust to a neutral third party. It works — but fees, delay, single point of control, and you still have to trust *them.* Provocation to close Act 1: **can we get the trust without the trusted party?**

### ACT 2 — THE ENGINEERING (~19 min)

**6 · A shared, distributed ledger (2m)**
- Screen: one ledger mirrored across many computers; no owner.
- Notes: Imagine what Alice writes instantly appears on Bob's copy, and nobody owns it — everyone holds a copy. No middleman; works for 2 people or 10,000 or the public. This raises the two questions the rest of the talk answers: **(1) how does everyone agree what's true? (2) what stops someone editing their own copy?**

**7 · Blocks & the chain — with the Git analogy (2m)**
- Screen: transaction → a *block* (batch of transactions) → blocks appended in sequence.
- Notes: A block = a batch of transactions = think "a page." Blocks are appended to the end, in order; you can't insert in the middle or reorder → append-only. You get current state **plus** full history.
  - **Git analogy (keep it light):** "You already use one of these every day — Git. A commit batches changes, gets appended, is named by a hash, and the whole history hangs off it. A blockchain is that idea, shared across strangers who don't trust each other." One sentence — don't turn it into a Git lecture.

**8 · The obvious attack (1.5m)**
- Screen: a villain editing an old transaction on their local copy.
- Notes: Every copy lives on someone's machine. What stops a bad actor quietly rewriting an old entry to pay themselves? Naively — nothing. This is *the* problem the rest of the engineering exists to kill. Cue the reveal.

**9 · Hashing, explained (1.5m)**
- Screen: any data → fixed-size fingerprint. Three properties as fragments: deterministic · avalanche (tiny change → totally different) · one-way.
- Notes: A hash maps any input to a fixed-size fingerprint. Same input → same output; one-char change → completely different output; can't be reversed. They know this (SHA-256, Git SHAs). Say it explicitly: **hashing ≠ encryption** — encryption is reversible, hashing is not.

**10 · 🔴 INTERACTIVE — Hashing demo (two stages) (4m)**
- Screen: **Stage A** a *toy* hash where every step is visible; then **Stage B** the *real* SHA-256. (Full spec in §6, Demo 1.)
- Notes: Stage A — change one letter, watch the running value diverge; the fingerprint is *entirely determined by the data* and hypersensitive. Then reveal Stage B: "here's the industrial-strength version — same idea, same avalanche, just uncrackable." The toy demystifies; SHA-256 makes it real.

**11 · Why hash — and chaining hashes (2m)**
- Screen: each block stores **the hash of the previous block**. Small diagram: [Block N-1 | hash] → embedded as `prevHash` in [Block N].
- Notes: A hash is a fingerprint/signature. Store it, re-hash later, compare — mismatch = tampering. The trick that makes it a *chain*: each block embeds the previous block's hash, so blocks are cryptographically welded in order. (Optional one-liner: the transactions *inside* a block are also hashed together — a Merkle tree — but we won't go deeper today.)

**12 · 🔴 INTERACTIVE — Tamper → domino (3m)**
- Screen: ~4 linked blocks; edit a transaction in block 2 live and watch the chain break downstream. (Full spec in §6, Demo 2.)
- Notes: Editing block 2 changes its hash → block 3's stored `prevHash` no longer matches → the break cascades. **Tampering isn't prevented — it's made instantly visible.** This is the emotional peak; give it room. Then: "to hide this, you'd have to recompute *every* block after it, on *every* copy, faster than everyone else — which is what consensus makes absurdly hard."

**13 · Consensus & Proof-of-Work (deep-ish) (3m)**
- Screen: many nodes; two candidate chains; "longest valid chain wins." Small PoW illustration: find a nonce so `hash(block)` starts with N zeros.
- Notes (this slide gets real depth):
  - **The problem:** with thousands of copies — and sometimes two valid blocks appearing at once — which chain is *the* truth? Consensus = the network's rules for agreeing on one canonical chain.
  - **Proof-of-Work:** to add a block you must find a **nonce** that makes the block's hash start with N leading zeros. Hard to find (brute force), trivial to verify. This makes writing history *expensive*.
  - **Why tampering dies here:** callback to the domino — rewriting block 2 means redoing the Proof-of-Work for block 2 *and every block after it*, then out-racing the entire honest network that keeps extending the real chain. Economically irrational.
  - **Longest/heaviest chain wins** → honest majority converges.
  - **51% attack:** you'd need a majority of the world's compute to rewrite history — the whole security model is "cheating costs more than it's worth."
  - **One-line alternative:** Proof-of-Stake — instead of burning compute, validators post collateral and lose it if they cheat. Ethereum switched to this (much lower energy). Mention, don't dive.
  - If time-pressed, keep PoW + 51% and cut PoS.

### ACT 3 — WHY IT MATTERS (~9 min)

**14 · Trust, reframed (1.5m)**
- Screen: "Trust the data, not the people."
- Notes: The real invention. You no longer trust Alice, Bob, or the bank — you trust the shared record and the math. Trust moves from individuals/institutions *to the system itself*, even with no central authority. That's the whole magic trick, decoded.

**15 · Beyond money (1.5m)** *(combinable with 16 if running long)*
- Screen: supply chains · property titles · medical records · credentials.
- Notes: A ledger needn't hold money — anything you want an agreed, tamper-evident history of. Use the hospital-records example.

**16 · Permissioned blockchains (1.5m)**
- Screen: Public (anyone) vs Permissioned (known, authenticated members, role-based access).
- Notes: Open by default — but businesses often want control. Permissioned chains have authenticated participants with unique IDs and differentiated access. Example: a hospital network sharing records across providers securely and consistently.

**17 · Smart contracts (2m)**
- Screen: an agreement *as code* that self-executes when conditions are met.
- Notes: Instead of storing just data, store a small program — an agreement in code — that runs automatically. E.g. "payment received → ownership transfers." No intermediary, deterministic, always runs the same way. Ethereum is the usual home. One crisp example, don't sprawl.

**18 · When you *don't* need a blockchain (1.5m)** — the credibility slide
- Screen: "Have a trusted central party? Use a database."
- Notes: If you already have a trusted central party, a normal database is simpler, faster, cheaper. Blockchain earns its overhead **only** when participants *don't* trust each other and you want *no* central controller. Saying this out loud is what makes the rest believable — and decoding the hype is literally the point of the series.

**19 · The future + close (1.5m)**
- Screen: "Like TCP/IP — invisible infrastructure."
- Notes: Winning infrastructure disappears — we stopped talking about TCP/IP; it just runs underneath. A shared, tamper-evident ledger with trust built in is a genuinely useful primitive, and that's what hides under the buzzword. **Callback to slide 2's three misconceptions** — briefly correct each — to close the loop.

**→ Q&A (~4 min)**

*Pacing note: core content ≈ 36–37 min. If long, compress slides 15+16 into one and keep the two demos sacred. Never rush Demo 1 or Demo 2 — they're the whole talk.*

---

## 6. Interactive demo specs (detailed)

### DEMO 1 — Hashing (two stages, same input box)

**Goal:** show that a hash is (a) fully determined by the data and (b) wildly sensitive to it — first with a hash you can follow by hand, then with the real thing.

**Shared UI**
- One editable text `<input>` (prefilled, e.g. `the quick brown fox`).
- A **toggle / two panels:** "Stage A — MiniHash (see every step)" and "Stage B — SHA-256 (the real one)".
- A subtle "one-char-changes-everything" callout that flashes when the output changes.

**Stage A — MiniHash (visible, step-by-step)**

Use a real technique — a **polynomial rolling hash** (the `×31 + charCode` trick behind Java's `String.hashCode`). It's simple enough to animate every step, and it demonstrates avalanche + positional sensitivity honestly.

```js
// MiniHash: 8-char hex fingerprint, every step is visualizable
function miniHash(str) {
  let h = 0;                                   // running accumulator
  const steps = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    h = (Math.imul(h, 31) + code) >>> 0;       // 32-bit unsigned
    steps.push({ i, char: str[i], code, h });  // capture for animation
  }
  return { hex: h.toString(16).padStart(8, '0').toUpperCase(), steps };
}
```

Visualization requirements:
1. Show the input string with each character and its `charCode` underneath (monospace).
2. Show a **running accumulator row** that updates character by character: after each char display `h = (prev × 31 + code) mod 2³² = newValue`. Animate through the steps (fast, ~120ms each, or a "step ▶" button to advance manually — support both: auto-play with a replay button).
3. Show the final 8-char hex fingerprint big, in the accent color, with the scramble→settle animation.
4. **Live edit:** as I type/change one character, recompute and re-animate. Emphasize how early a change is, the more the tail diverges.
5. Add a **"change one letter" helper**: a button that flips one character and shows old-vs-new fingerprint side by side so the avalanche is undeniable.

Correctness notes for the build: use `Math.imul` for the 32-bit multiply and `>>> 0` to keep it unsigned; pad to 8 hex chars; uppercase.

**Stage B — SHA-256 (the real one)**

```js
async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
```

Visualization requirements:
1. Same input box → output the full 64-char hex digest, monospace, wrapping neatly, with scramble→settle.
2. Live update on every keystroke (it's fast — fine to run on `input`).
3. Provide the **same "change one letter" side-by-side** so they see full avalanche on the industrial hash too.
4. A one-line caption: "Same idea as MiniHash — deterministic, avalanche, one-way — just cryptographically unbreakable." Do **not** claim to show SHA-256's internals; the point is the input→fingerprint behavior.

Edge cases: empty input → show a valid hash (empty-string hash), not an error. Non-ASCII input is fine (TextEncoder handles UTF-8). Remind me in the README that SHA-256 needs `localhost`/https.

---

### DEMO 2 — Tamper → domino (the money shot)

**Goal:** show that changing one past entry silently breaks every downstream block, so tampering is *tamper-evident*, not preventable.

**Data model**
```js
// each block: { index, data, prevHash, hash }
// hash = H(index + data + prevHash)
```
- Use **SHA-256** for realism (via the async helper above) — or MiniHash if you need it fully synchronous/snappier for a live room. Prefer SHA-256; fall back to MiniHash only if async makes the UI feel laggy. Pick one and be consistent.
- Genesis block: `index 0`, fixed `data` (e.g. "Genesis"), `prevHash = "0000…0"`.
- Build ~4 blocks with human-readable transactions, e.g.:
  - 1: "Alice → Bob : 50"
  - 2: "Bob → Carol : 30"
  - 3: "Carol → Dave : 10"

**Render**
- A horizontal (or vertical on narrow screens) row of block cards. Each card shows: index, an **editable** `data` field, `prevHash` (truncated, monospace), and this block's computed `hash` (truncated, monospace).
- Draw a connector/arrow from each block's `hash` to the next block's `prevHash` — this is the visible "weld."

**Validation logic (run after any edit)**
```
for each block i > 0:
  recompute hash_i from (index_i, data_i, prevHash_i)
  valid_i = (block[i].prevHash === block[i-1].hash) && (recomputed hash_i === block[i].hash)
```
- A block is **valid (green, --ok)** when its stored `prevHash` matches the previous block's current `hash`.
- On edit of block k's `data`: recompute block k's `hash`; now block k+1's `prevHash` no longer matches → mark the link **broken (red, --danger)**; the mismatch propagates so every block from k+1 onward flags red. Animate the break travelling down the chain (staggered, ~150ms per block) so it visibly *dominoes*.

**Controls**
- **Editable data fields** (the core interaction — let me type live).
- **"Re-mine / Fix chain from here"** button: recomputes and re-links all downstream blocks so they go green again — driving home that to hide tampering you must redo *all* subsequent blocks (and, per slide 13, out-race the network). Optional but strongly recommended; it sets up the consensus slide perfectly.
- **"Reset"** button to restore the pristine chain.

**Visual states:** green = valid & linked; red = broken/mismatch; a small ✓/✗ badge per block; the broken connector arrow turns red and could go dashed.

Accessibility: don't rely on color alone — include the ✓/✗ badge and a text label ("linked" / "broken").

---

### DEMO 3 — "Mine a block" (OPTIONAL — only build if I ask)

**Goal:** make Proof-of-Work tangible on slide 13.
- Input: a block's data + a difficulty selector (leading-zero count, 1–4).
- On "Mine": loop `nonce = 0,1,2,…`, compute `sha256Hex(data + nonce)`, stop when the hex starts with the required number of `0`s. Show attempts/sec, current nonce, and the winning hash (green).
- Teaches: finding is hard (many attempts), verifying is instant, and difficulty ↑ → exponentially harder. Keep difficulty ≤4 so it finishes in a couple seconds live. Run the loop in chunks (`requestAnimationFrame` / `setTimeout(0)`) so the UI doesn't freeze; ideally offload to a Web Worker.

---

## 7. Optional topics to add (ask me first — do NOT build unprompted)

Menu, roughly prioritized. Each notes the time cost so I can trade against Q&A. I most recommend the first two.

1. **Digital signatures / public-private keys (~2 min) — biggest gap in the current deck.** The talk proves data *wasn't altered* but never shows how we know *Alice actually sent it*. Answer: she signs with her private key; anyone verifies with her public key. This is core and engineers will wonder about it. Strongly consider adding after slide 11.
2. **The double-spend problem, named explicitly (~1 min).** This is literally *the* problem Bitcoin solved. Naming it makes slides 6–13 click harder. Cheap to add.
3. **Merkle trees (~1.5 min).** How transactions inside a block get hashed together; enables efficient verification. Only if the room is hungry — otherwise keep as the one-liner on slide 11.
4. **PoW vs PoS + the energy debate (~1.5 min).** Expand the slide-13 one-liner into its own beat; topical and often asked.
5. **Real-world cautionary tales (~1.5 min).** Mt. Gox, The DAO hack — pairs beautifully with slide 18 ("the chain was fine; the humans/code around it weren't").
6. **Forks — soft vs hard (~1 min).** How networks upgrade / disagree.
7. **Scalability trilemma & Layer-2 / rollups (~2 min).** Why chains are slow and how they scale. Probably too deep for a 40-min intro.
8. **Gas / fees (~1 min).** Why transactions cost money; ties to smart contracts.

If I pick several, propose trims elsewhere (usually merge 15+16, drop PoS one-liner) to protect the 40-min budget and the two core demos.

---

## 8. Build order & acceptance checklist

Build in this order and confirm each:
1. Reveal.js scaffold with local (bundled) assets, theme tokens, nav, progress bar, and `S`-key speaker notes working. Add a couple of placeholder slides to prove notes stay off-screen.
2. All 19 slides with on-screen content + `<aside class="notes">` from §5.
3. Demo 1 (MiniHash animated steps → SHA-256), live-editable, avalanche side-by-side.
4. Demo 2 (tamper domino) with cascade animation, fix/reset controls, color-independent valid/broken states.
5. README: how to serve on `localhost`, present (press `S`), and the `crypto.subtle` secure-context caveat.

**Acceptance criteria**
- Speaker notes are visible in presenter view (`S`) and **never** on the slides.
- Runs fully offline once served locally (no runtime network calls).
- Editing one character in Demo 1 visibly changes the whole fingerprint (both stages).
- Editing block 2 in Demo 2 turns every downstream block red with a visible domino, and "Fix chain" restores green.
- Readable on a 1080p projector; monospace hashes align; respects `prefers-reduced-motion`.
- Total core runtime paces to ~35 min.

> Do not implement anything from §7 unless I explicitly select it.