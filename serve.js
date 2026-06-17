import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.join(__dirname, 'dist');
const PORT = 5175;
const BASE = '/one-man-army-office/';

const CT = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// CSP: allow unsafe-eval for Supabase JWT decoding, unsafe-inline for Vite bundled styles
const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; worker-src 'self' blob:; connect-src 'self' https://jikjcdrrcywnwmtaabzh.supabase.co https://*.supabase.co wss://*.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;";

const server = http.createServer((req, res) => {
  // Strip base path
  let urlPath = req.url.split('?')[0];
  if (urlPath.indexOf(BASE) === 0) urlPath = urlPath.slice(BASE.length - 1);
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(ROOT, urlPath);

  // Security: prevent path traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  const headers = { 'Content-Security-Policy': CSP };

  // Serve file or fallback to index.html
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const idx = path.join(ROOT, 'index.html');
    if (fs.existsSync(idx)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
      fs.createReadStream(idx).pipe(res);
    } else {
      res.writeHead(404); res.end('Not found');
    }
    return;
  }

  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': CT[ext] || 'application/octet-stream', ...headers });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log('http://localhost:' + PORT + BASE);
});