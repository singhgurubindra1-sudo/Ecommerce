// Netlify Function for POST /api/verify-payment. Logic lives in lib/payments.js.
import { verifyPayment } from '../../lib/payments.js';

export default async req => {
  if (req.method !== 'POST') return Response.json({ error: 'Use POST.' }, { status: 405 });
  let input;
  try { input = await req.json(); } catch { return Response.json({ verified: false, error: 'Request body must be valid JSON.' }, { status: 400 }); }
  const { status, body } = verifyPayment(input);
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
};

export const config = { path: '/api/verify-payment' };
