/* =====================================================================
   serve.js — tiny zero-dependency static server for the deck.

   Why not just open index.html directly?
   Demo 1 (later) uses the Web Crypto API (crypto.subtle), which only works
   in a SECURE CONTEXT — https or http://localhost — NOT file://. Serving on
   localhost satisfies that now, and the reveal notes popup behaves better
   over http too.

   Usage:  npm start   →   open http://localhost:8000
   Uses only Node's built-in modules, so it stays fully offline-safe.
   ===================================================================== */
'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 8000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map':  'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.txt':  'text/plain; charset=utf-8',
  '.md':   'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  // Strip query string, decode, and normalize to keep the path inside ROOT.
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(ROOT, path.normalize(urlPath));
  if (!filePath.startsWith(ROOT)) {          // path-traversal guard
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + urlPath);
      return;
    }
    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  Decode the Tech — Blockchain`);
  console.log(`  Serving ${ROOT}`);
  console.log(`  →  http://localhost:${PORT}\n`);
  console.log(`  Present: open in a browser, press S for speaker notes.\n`);
});
