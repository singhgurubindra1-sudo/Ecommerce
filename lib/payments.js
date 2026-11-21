// Razorpay payment logic shared by the local server (server.js) and the Netlify Functions.
// Each function returns { status, body } so any host can turn it into an HTTP response.
// Credentials are read from environment variables; the key secret never leaves the server.

import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { PRODUCTS } from '../js/products.js';

const MIN_PAISE = 100;
const MAX_QTY = 9;
const NOT_CONFIGURED = { status: 503, body: { error: 'Online payments are not configured on this server.' } };

const keys = () => ({ id: process.env.RAZORPAY_KEY_ID, secret: process.env.RAZORPAY_KEY_SECRET });
let client = null, clientFor = '';
function razorpay() {
  const { id, secret } = keys();
  if (!id || !secret) return null;
  if (clientFor !== id) { client = new Razorpay({ key_id: id, key_secret: secret }); clientFor = id; }
  return client;
}

/** POST /api/create-order  { items: [{ id, qty }] } -> { order_id, amount, currency, key_id } */
export async function createOrder(input) {
  const rz = razorpay();
  if (!rz) return NOT_CONFIGURED;
  const items = input?.items;
  if (!Array.isArray(items) || !items.length || items.length > 20) return { status: 400, body: { error: 'Send the items you want to buy.' } };

  // Price every line from the catalogue on the server; never trust an amount sent by the browser.
  let amount = 0;
  const lines = [];
  for (const it of items) {
    const p = PRODUCTS.find(x => x.id === it?.id);
    const qty = Number(it?.qty);
    if (!p) return { status: 400, body: { error: `Unknown product: ${String(it?.id).slice(0, 40)}` } };
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return { status: 400, body: { error: `Quantity for ${p.name} must be between 1 and ${MAX_QTY}.` } };
    amount += p.price * 100 * qty;
    lines.push(`${p.id} x${qty}`);
  }
  if (amount < MIN_PAISE) return { status: 400, body: { error: 'The order total must be at least ₹1.' } };

  try {
    const order = await rz.orders.create({
      amount,
      currency: 'INR',
      receipt: `fm_${Date.now().toString(36)}`,
      notes: { items: lines.join(', ').slice(0, 250) },
    });
    return { status: 200, body: { order_id: order.id, amount: order.amount, currency: order.currency, key_id: keys().id } };
  } catch (err) {
    const status = err?.statusCode;
    console.error('Razorpay create order failed:', status, err?.error?.description || err?.message || err);
    if (status === 401) return { status: 401, body: { error: 'The payment gateway rejected our credentials.' } };
    return { status: 500, body: { error: 'Could not start the payment. Please try again.' } };
  }
}

/** POST /api/verify-payment  { razorpay_order_id, razorpay_payment_id, razorpay_signature } -> { verified } */
export function verifyPayment(input) {
  const { secret } = keys();
  if (!secret) return NOT_CONFIGURED;
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = input || {};
  if (![orderId, paymentId, signature].every(v => typeof v === 'string' && v.length > 0 && v.length < 200)) {
    return { status: 400, body: { verified: false, error: 'razorpay_order_id, razorpay_payment_id and razorpay_signature are required.' } };
  }
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    console.warn('Payment signature mismatch for order', orderId);
    return { status: 400, body: { verified: false, error: 'Payment could not be verified.' } };
  }
  return { status: 200, body: { verified: true, order_id: orderId, payment_id: paymentId } };
}

export const paymentsConfigured = () => Boolean(keys().id && keys().secret);
