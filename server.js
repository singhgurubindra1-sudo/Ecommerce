// FOR ME Studios server: serves the site and the Razorpay payment endpoints.
//   POST /api/create-order    { items: [{ id, qty }] }  -> { order_id, amount, currency, key_id }
//   POST /api/verify-payment  { razorpay_order_id, razorpay_payment_id, razorpay_signature } -> { verified: true }
// Credentials come from the environment (.env locally). On Netlify the same logic runs as functions (netlify/functions).

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

try { process.loadEnvFile(); } catch { /* no .env file: use the host's environment variables */ }
const { createOrder, verifyPayment, paymentsConfigured } = await import('./lib/payments.js');

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8000;
if (!paymentsConfigured()) console.warn('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing: online payments are switched off.');

/* ---------------------------------------------------------------- helpers */
function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readJson(req, limit = 20_000) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('Request body is too large.'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { reject(Object.assign(new Error('Request body must be valid JSON.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

/* ---------------------------------------------------------------- payment endpoints (logic in lib/payments.js) */
const handle = fn => async (req, res) => { const { status, body } = await fn(await readJson(req)); send(res, status, body); };

/* ---------------------------------------------------------------- static files (site folders only) */
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};
const PUBLIC_DIRS = ['css', 'js', 'assets'];

async function serveStatic(req, res) {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, ''); }
  catch { res.writeHead(400).end(); return; }
  if (rel === '') rel = 'index.html';
  const file = path.normalize(path.join(ROOT, rel));
  const top = path.relative(ROOT, file).split(path.sep)[0];
  const allowed = file.startsWith(ROOT + path.sep) && (rel === 'index.html' || PUBLIC_DIRS.includes(top));
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!allowed || !type) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); return; }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}

/* ---------------------------------------------------------------- router */
const ROUTES = { '/api/create-order': handle(createOrder), '/api/verify-payment': handle(verifyPayment) };

http.createServer(async (req, res) => {
  const route = ROUTES[req.url.split('?')[0]];
  try {
    if (route) {
      if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' });
      return await route(req, res);
    }
    if (req.url.startsWith('/api/')) return send(res, 404, { error: 'Not found.' });
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    await serveStatic(req, res);
  } catch (err) {
    if (!res.headersSent) send(res, err.status || 500, { error: err.status ? err.message : 'Something went wrong.' });
    if (!err.status) console.error(err);
  }
}).listen(PORT, () => console.log(`FOR ME Studios running at http://localhost:${PORT}`));
