# Decode the Tech — Blockchain

An interactive, browser-based slide deck that explains blockchain to software
engineers by building it up from first principles: hashing → append-only logs →
chaining → consensus. Built on [reveal.js](https://revealjs.com) with three live,
vanilla-JS demos. ~38 min + Q&A.

---

## Quick start

```bash
npm install     # one-time: fetches reveal.js (its assets are bundled under vendor/)
npm start       # serves the deck on http://localhost:8000
```

Then open **<http://localhost:8000>** in a browser.

> ⚠️ **Serve it — don't open `index.html` directly.**
> Demo 1's SHA-256 uses the Web Crypto API (`crypto.subtle`), which only works
> in a **secure context** — `https` or `http://localhost`. Opening the raw file
> (`file://…`) will break the real-SHA-256 stage. `npm start` puts you on
> `localhost`, which counts as secure, so everything works.

No build step, no framework, no bundler. `npm install` is only used to pull down
reveal.js; the assets it needs are already copied into `vendor/revealjs/`, so the
deck runs **fully offline** once served (no CDN or network calls at talk time).

**No Node?** Any static server works, e.g. `python3 -m http.server 8000`, then
open the same URL.

To change the port: `PORT=9000 npm start`.

---

## Presenting

Open the deck, then:

| Key | Action |
| --- | --- |
| `→` / `Space` | next slide / next fragment |
| `←` | previous |
| `↓` / `↑` | move within stacked (vertical) slides |
| `S` | **Speaker view** — presenter window with your notes, next slide, and a timer |
| `F` | fullscreen |
| `Esc` | slide overview grid |

**Speaker notes live only in the presenter view.** Every slide's notes are in
`<aside class="notes">` and never render on the slide itself — press **`S`** to
open the speaker window (allow the pop-up if the browser blocks it).

Before presenting, edit slide 1 in `index.html` and replace the
`‹ Presenter name ›` placeholder with your name.

---

## The three live demos

All are usable live — big targets, legible from the back, keyboard-friendly.

**Demo 1 — Hashing (slide 10)**
- **Stage A · MiniHash** — a deliberately simple *teaching* hash you can follow by
  hand, animated step by step:
  letters → numbers (A=1…Z=26) → sum by odd/even **position** → multiply the two
  sums → the resultant number's **odd digits become letters** (1=A…9=I) while even
  digits are kept. e.g. `MAZE → 39 × 6 = 234 → "2C4"`.
  *(This is a toy for intuition, not a real cryptographic hash.)*
- **Stage B · SHA-256** — the real thing, via `crypto.subtle`. Type in the box to
  watch the 64-hex digest recompute live; **Change one letter** shows the
  before/after avalanche.

**Demo 3 — Digital signatures (slide 12)**
- Real public-key crypto via `crypto.subtle`: **ECDSA over P-256 + SHA-256**. On
  load it generates Alice's key pair; her **public** key is shown (shared), her
  **private** key stays secret.
- **🔏 Sign as Alice** signs the message with the private key → a signature.
  **Verify** checks it against the message + public key: `✓ genuine`.
- Edit one character (or **😈 Forge a char**) → the same signature stops
  verifying (`✗ forged`). The point: only the private-key holder can produce a
  valid signature; anyone can verify. Proves *who sent it* (authenticity), the
  piece the tamper-domino (integrity) doesn't cover.
- Same secure-context caveat as Demo 1 — serve on `localhost`/`https`.

**Demo 2 — Tamper → domino (slide 13)**
- Four SHA-256-linked blocks (`hash = SHA-256(index | data | prevHash)`).
- **Edit any block's `data`** → its hash changes → the next block's stored
  `prevHash` no longer matches → the break **cascades red down the chain**.
  Tampering isn't prevented, it's made instantly visible.
- **⛏ Fix chain (re-mine)** re-links and re-hashes every downstream block (showing
  how much work hiding tampering takes); **⟲ Reset** restores the pristine chain.
- Valid/broken states use a `✓ linked` / `✗ broken` badge and text, not color alone.

---

## Project structure

```
index.html              reveal deck — one <section> per slide (22 slides + Q&A)
css/theme.css           "Decode the Tech" theme — all colors/fonts are :root tokens
js/demo-hash.js         Demo 1 (MiniHash steps → SHA-256)
js/demo-sign.js         Demo 3 (ECDSA sign → verify)
js/demo-chain.js        Demo 2 (tamper → domino)
serve.js                tiny zero-dependency static server (npm start)
vendor/revealjs/        reveal.js v5 bundled locally (dist + notes plugin)
package.json            scripts + reveal.js as the asset source
```

---

## Theming / rebranding

The whole look is driven by a single, clearly-commented `:root` token block at the
top of `css/theme.css` (background, surface, text, accent teal, danger red, ok
green, and the font stacks). Swap those values to rebrand; nothing else needs to
change. Fonts default to the system UI + monospace stacks so the deck stays fully
offline — point `--font-sans` / `--font-mono` at bundled web-fonts under
`vendor/` if you want a specific typeface.

The deck is sized for a **1920×1080** projector and respects
`prefers-reduced-motion`.

---

## Requirements

- Node.js (any recent version) for `npm start` — or any static file server.
- A modern browser with the Web Crypto API (all current browsers), served over
  `localhost`/`https`.
