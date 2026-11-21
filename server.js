// FOR ME Studios server: serves the site and the Razorpay payment endpoints.
//   POST /api/create-order    { items: [{ id, qty }] }  -> { order_id, amount, currency, key_id }
//   POST /api/verify-payment  { razorpay_order_id, razorpay_payment_id, razorpay_signature } -> { verified: true }
// Credentials come from the environment (.env locally). The key secret never leaves this file.

import http from 'node:http';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Razorpay from 'razorpay';
import { PRODUCTS } from './js/products.js';

try { process.loadEnvFile(); } catch { /* no .env file: use the host's environment variables */ }

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8000;
const { RAZORPAY_KEY_ID: KEY_ID, RAZORPAY_KEY_SECRET: KEY_SECRET } = process.env;
const razorpay = KEY_ID && KEY_SECRET ? new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET }) : null;
if (!razorpay) console.warn('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing: online payments are switched off.');

const MIN_PAISE = 100;
const MAX_QTY = 9;

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

/* ---------------------------------------------------------------- POST /api/create-order */
async function createOrder(req, res) {
  if (!razorpay) return send(res, 503, { error: 'Online payments are not configured on this server.' });
  const { items } = await readJson(req);
  if (!Array.isArray(items) || !items.length || items.length > 20) return send(res, 400, { error: 'Send the items you want to buy.' });

  // Price every line from the catalogue on the server; never trust an amount sent by the browser.
  let amount = 0;
  const lines = [];
  for (const it of items) {
    const p = PRODUCTS.find(x => x.id === it?.id);
    const qty = Number(it?.qty);
    if (!p) return send(res, 400, { error: `Unknown product: ${String(it?.id).slice(0, 40)}` });
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return send(res, 400, { error: `Quantity for ${p.name} must be between 1 and ${MAX_QTY}.` });
    amount += p.price * 100 * qty;
    lines.push(`${p.id} x${qty}`);
  }
  if (amount < MIN_PAISE) return send(res, 400, { error: 'The order total must be at least ₹1.' });

  try {
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `fm_${Date.now().toString(36)}`,
      notes: { items: lines.join(', ').slice(0, 250) },
    });
    send(res, 200, { order_id: order.id, amount: order.amount, currency: order.currency, key_id: KEY_ID });
  } catch (err) {
    const status = err?.statusCode;
    console.error('Razorpay create order failed:', status, err?.error?.description || err?.message || err);
    if (status === 401) return send(res, 401, { error: 'The payment gateway rejected our credentials.' });
    send(res, 500, { error: 'Could not start the payment. Please try again.' });
  }
}

/* ---------------------------------------------------------------- POST /api/verify-payment */
async function verifyPayment(req, res) {
  if (!KEY_SECRET) return send(res, 503, { error: 'Online payments are not configured on this server.' });
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = await readJson(req);
  if (![orderId, paymentId, signature].every(v => typeof v === 'string' && v.length > 0 && v.length < 200)) {
    return send(res, 400, { verified: false, error: 'razorpay_order_id, razorpay_payment_id and razorpay_signature are required.' });
  }
  const expected = crypto.createHmac('sha256', KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    console.warn('Payment signature mismatch for order', orderId);
    return send(res, 400, { verified: false, error: 'Payment could not be verified.' });
  }
  send(res, 200, { verified: true, order_id: orderId, payment_id: paymentId });
}

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
const ROUTES = { '/api/create-order': createOrder, '/api/verify-payment': verifyPayment };

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
