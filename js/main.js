import { PRODUCTS, SIZES, CURRENCY, COUPONS } from './products.js?v=3';
import { drawCard, drawPhotoCard } from './cards.js';
import { initHero } from './hero.js';
import { INDIA } from './india.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const money = n => CURRENCY + n.toLocaleString('en-IN');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const byId = id => PRODUCTS.find(p => p.id === id);

// Selling price, then the struck-through MRP and the saving when a piece has one.
function priceNodes(p) {
  const nodes = [el('span', 'now', money(p.price))];
  if (p.mrp > p.price) {
    const was = el('s', 'was', money(p.mrp));
    was.setAttribute('aria-label', `MRP ${money(p.mrp)}`);
    nodes.push(was, el('span', 'off', `${Math.round((1 - p.price / p.mrp) * 100)}% off`));
  }
  return nodes;
}

const state = { current: 0, size: 'M', qty: 1, checkout: [], fromCart: false, rating: 5, ticketType: '' };
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

// Everything the shopper saves lives in this browser only until a backend is connected.
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
let bag = load('forme-bag', {});
let wish = load('forme-wish', []).filter(byId);
let feedback = load('forme-feedback', []);

/* ------------------------------------------------------------------ coupons */
let couponCode = load('forme-coupon', '');
let couponMsg = '';
const hasOrdered = () => load('forme-orders', []).length > 0;
const findCoupon = code => COUPONS.find(c => c.code === String(code).trim().toUpperCase());
const couponProblem = c => (c.firstOrder && hasOrdered() ? `${c.code} is only for your first order.` : '');
function totals(lines) {
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
  const c = findCoupon(couponCode);
  const coupon = c && !couponProblem(c) ? c : null;
  const discount = coupon ? Math.round(subtotal * coupon.percent / 100) : 0;
  return { subtotal, discount, total: subtotal - discount, coupon };
}
function setCoupon(code, quiet) {
  const c = code ? findCoupon(code) : null;
  const problem = !code ? '' : !c ? 'That code is not valid. Check the spelling and try again.' : couponProblem(c);
  if (code && problem) couponMsg = problem;
  else { couponCode = c ? c.code : ''; couponMsg = ''; save('forme-coupon', couponCode); }
  renderBag(); renderCheckout();
  if (!quiet && c && !problem) toast(`${c.code} applied: ${c.percent}% off your order`);
  return !problem;
}
// The "apply coupon" block shown in the cart and in the checkout summary.
function couponBox(lines) {
  const box = el('div', 'coupon');
  const { coupon, discount } = totals(lines);
  if (coupon) {
    const on = el('div', 'coupon-on');
    const text = el('p'); text.append(el('b', '', coupon.code), ` applied. You save ${money(discount)}.`);
    const rm = el('button', '', 'Remove'); rm.type = 'button';
    rm.addEventListener('click', () => setCoupon(''));
    on.append(el('span', 'coupon-tick', '✓'), text, rm);
    box.append(on);
    return box;
  }
  box.append(el('h3', 'co-h', 'Apply coupon code'));
  const row = el('div', 'coupon-row');
  const input = el('input'); input.type = 'text'; input.placeholder = 'Enter code'; input.maxLength = 20; input.autocapitalize = 'characters'; input.spellcheck = false;
  input.setAttribute('aria-label', 'Coupon code');
  const btn = el('button', 'mini', 'Apply'); btn.type = 'button';
  const apply = () => { if (input.value.trim()) setCoupon(input.value); else { couponMsg = 'Enter a coupon code first.'; renderBag(); renderCheckout(); } };
  btn.addEventListener('click', apply);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
  row.append(input, btn);
  const msg = el('p', 'co-err', couponMsg); msg.setAttribute('role', 'alert');
  box.append(row, msg);
  const offers = el('div', 'offers');
  COUPONS.forEach(c => {
    const used = !!couponProblem(c);
    const t = el('button', 'ticket'); t.type = 'button'; t.disabled = used;
    const cut = el('span', 'ticket-cut'); cut.append(el('b', '', `${c.percent}%`), el('i', '', 'off'));
    const body = el('span', 'ticket-body');
    body.append(el('small', '', c.title), el('strong', '', c.code), el('em', '', used ? 'Already used on your first order' : `${c.note} · Tap to apply`));
    t.append(cut, body);
    t.addEventListener('click', () => setCoupon(c.code));
    offers.append(t);
  });
  box.append(offers);
  return box;
}
function renderTotals(holder, lines, label) {
  const { subtotal, discount, total, coupon } = totals(lines);
  const row = (cls, a, b) => { const p = el('p', cls); p.append(el('span', '', a), el('b', '', b)); return p; };
  holder.textContent = '';
  holder.append(couponBox(lines));
  if (coupon) holder.append(row('sub small', 'Subtotal', money(subtotal)), row('sub small save', `Coupon ${coupon.code} (${coupon.percent}% off)`, '− ' + money(discount)));
  holder.append(row('sub', label, money(total)));
  return total;
}
function buildTicker() {
  const run = $('#ticker-run');
  for (let n = 0; n < 4; n++) {
    COUPONS.forEach(c => {
      const offer = el('span', 'tk-offer', c.strip + ' · use code');
      const code = el('button', 'tk-code', c.code); code.type = 'button'; code.tabIndex = -1;
      code.addEventListener('click', () => { navigator.clipboard?.writeText(c.code).catch(() => {}); if (setCoupon(c.code, true)) toast(`${c.code} copied and applied. ${c.percent}% off shows in your cart.`); else toast(couponMsg); });
      offer.append(code);
      run.append(offer, el('b', '', '✦'));
    });
    run.append(el('span', '', 'Cash on delivery'), el('b', '', '✦'), el('span', '', 'Only at FOR ME'), el('b', '', '✦'));
  }
}

/* ------------------------------------------------------------------ product images */
const thumbs = {};
const loadImage = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

async function buildCards() {
  try { await Promise.race([Promise.all([document.fonts.load('400 19px Jost'), document.fonts.load('italic 400 30px "Cormorant Garamond"')]), new Promise(r => setTimeout(r, 2000))]); } catch { /* fallback fonts */ }
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    if (p.images?.length) { thumbs[p.id] = p.images[0]; continue; }
    let cv = null;
    if (p.image) { try { cv = drawPhotoCard(await loadImage(p.image)); } catch { cv = null; } }
    thumbs[p.id] = (cv || drawCard(p, i)).toDataURL('image/jpeg', .86);
  }
}

/* ------------------------------------------------------------------ grid */
function makeCard(p, reveal, n = 0) {
  const card = el('article', reveal ? 'card rv' : 'card');
  if (reveal) card.style.transitionDelay = `${(n % 4) * 70}ms`;
  const pic = el('button', 'card-pic');
  pic.setAttribute('aria-label', `View ${p.name}`);
  const img = el('img');
  img.src = thumbs[p.id]; img.alt = `${p.name} in ${p.tone}`; img.loading = 'lazy';
  pic.append(img);
  const heart = el('button', 'heart');
  heart.dataset.wish = p.id;
  heart.addEventListener('click', () => toggleWish(p.id));
  const meta = el('p', '', p.cat);
  const price = el('b'); price.append(...priceNodes(p));
  meta.append(price);
  card.append(pic, heart);
  if (p.badge) card.append(el('span', 'badge', p.badge));
  card.append(el('h3', '', p.name), meta);
  pic.addEventListener('click', () => go(p.id));
  if (fine && !reduce) {
    pic.addEventListener('pointermove', e => {
      const r = pic.getBoundingClientRect();
      pic.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - .5) * 14}deg`);
      pic.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - .5) * 10}deg`);
    });
    pic.addEventListener('pointerleave', () => { pic.style.setProperty('--ry', '0deg'); pic.style.setProperty('--rx', '0deg'); });
  }
  return card;
}
function renderGrid() { PRODUCTS.forEach((p, i) => $('#grid').append(makeCard(p, true, i))); }

/* ------------------------------------------------------------------ routing: each product has its own page at #product-id */
let onProduct = false, savedScroll = 0, navClick = false, cameFromSite = false;
function go(hash) {
  navClick = true;
  if (location.hash.slice(1) === hash) route(); else location.hash = hash;
}
function route() {
  const hash = decodeURIComponent(location.hash.slice(1));
  const p = byId(hash);
  const was = onProduct, clicked = navClick;
  navClick = false;
  ['#cart', '#wish', '#support', '#menu', '#checkout'].forEach(id => setOpen(id, false));
  if (p) {
    if (!was) { savedScroll = scrollY; cameFromSite = clicked; }
    onProduct = true;
    $$('main > *').forEach(s => (s.hidden = s.id !== 'product'));
    document.body.classList.add('on-product');
    fillProduct(p);
    scrollTo({ top: 0, behavior: 'instant' });
    return;
  }
  onProduct = false;
  $$('main > *').forEach(s => (s.hidden = s.id === 'product'));
  document.body.classList.remove('on-product');
  const sec = hash && document.getElementById(hash);
  if (clicked && sec) sec.scrollIntoView({ behavior: was || reduce ? 'instant' : 'smooth' });
  else if (was) scrollTo({ top: savedScroll, behavior: 'instant' });
  else if (sec && sec.closest('main')) sec.scrollIntoView({ behavior: 'instant' });
}

/* ------------------------------------------------------------------ panels */
const lock = () => {
  const panels = $$('.panel.open').length > 0;
  document.documentElement.classList.toggle('lock', panels || $$('#menu.open, .sheet.open').length > 0);
  document.body.classList.toggle('panel-open', panels);
};
function setOpen(id, on) { const e = $(id); e.classList.toggle('open', on); e.setAttribute('aria-hidden', String(!on)); lock(); }
const closeAll = () => ['#cart', '#wish', '#support', '#menu', '#checkout'].forEach(id => setOpen(id, false));
const only = id => { ['#cart', '#wish', '#support'].forEach(x => setOpen(x, x === id)); };

function showImage(p, n) {
  const list = p.images?.length ? p.images : [thumbs[p.id]];
  const img = $('#d-img');
  img.src = list[n]; img.alt = `${p.name} in ${p.tone}, view ${n + 1}`;
  [...$('#d-thumbs').children].forEach((t, k) => t.classList.toggle('on', k === n));
}
function fillProduct(p) {
  state.current = PRODUCTS.indexOf(p); state.qty = 1; $('#q-val').textContent = 1;
  const tw = $('#d-thumbs'); tw.textContent = '';
  if (p.images?.length > 1) p.images.forEach((src, n) => {
    const b = el('button'); b.setAttribute('aria-label', `Show photo ${n + 1}`);
    const im = el('img'); im.src = src; im.alt = ''; b.append(im);
    b.addEventListener('click', () => showImage(p, n));
    tw.append(b);
  });
  showImage(p, 0);
  $('#d-cat').textContent = p.cat;
  $('#d-name').textContent = p.name;
  $('#d-price').replaceChildren(...priceNodes(p));
  $('#d-desc').textContent = p.desc;
  $('#d-tone').textContent = p.tone;
  document.title = `${p.name} · FOR ME Studios`;

  const more = $('#pd-more'); more.textContent = '';
  if (p.story?.length) { more.append(el('h2', 'pd-h', 'About this piece')); p.story.forEach(t => more.append(el('p', 'pd-p', t))); }
  if (p.details?.length) {
    more.append(el('h2', 'pd-h', 'Design details'));
    const ul = el('ul', 'pd-list'); p.details.forEach(t => ul.append(el('li', '', t))); more.append(ul);
  }
  if (p.fabric?.length) {
    more.append(el('h2', 'pd-h', 'Fabric'));
    const dl = el('dl', 'pd-fab'); p.fabric.forEach(([k, v]) => dl.append(el('dt', '', k), el('dd', '', v))); more.append(dl);
  }

  const rel = $('#related'); rel.textContent = '';
  PRODUCTS.filter(x => x !== p).slice(0, 4).forEach(x => rel.append(makeCard(x, false)));
  syncWish();
}

/* ------------------------------------------------------------------ item rows (cart, wishlist, summary) */
function itemRow(p, sub, right, controls) {
  const row = el('div', 'item');
  const img = el('img'); img.src = thumbs[p.id]; img.alt = '';
  const mid = el('div');
  mid.append(el('h3', '', p.name), el('small', '', sub));
  if (controls) mid.append(controls);
  row.append(img, mid, right);
  return row;
}

/* ------------------------------------------------------------------ cart */
const cartLines = () => Object.keys(bag).filter(k => byId(k.split('|')[0])).map(k => { const [id, size] = k.split('|'); return { key: k, p: byId(id), size, qty: bag[k] }; });

function renderBag() {
  const lines = cartLines(), wrap = $('#cart-items');
  wrap.textContent = '';
  if (!lines.length) wrap.append(el('p', 'empty', 'Your cart is empty. Pick something you love from the collection.'));
  let count = 0;
  lines.forEach(({ key, p, size, qty }) => {
    count += qty;
    const q = el('div', 'qty');
    const minus = el('button', '', '−'), plus = el('button', '', '+');
    minus.setAttribute('aria-label', 'Decrease quantity'); plus.setAttribute('aria-label', 'Increase quantity');
    q.append(minus, el('span', '', qty), plus);
    const side = el('div', 'item-side');
    const rm = el('button', '', 'Remove');
    side.append(el('span', '', money(p.price * qty)), rm);
    const change = d => { if (d === 0 || bag[key] + d <= 0) delete bag[key]; else bag[key] = Math.min(9, bag[key] + d); save('forme-bag', bag); renderBag(); };
    minus.addEventListener('click', () => change(-1)); plus.addEventListener('click', () => change(1)); rm.addEventListener('click', () => change(0));
    wrap.append(itemRow(p, `${p.tone} · Size ${size}`, side, q));
  });
  renderTotals($('#cart-totals'), lines, 'Total');
  $('#cart-foot').hidden = !lines.length;
  $('#bag-count').textContent = count;
}
function addToCart(p, size, qty) {
  const key = `${p.id}|${size}`;
  bag[key] = Math.min(9, (bag[key] || 0) + qty);
  save('forme-bag', bag); renderBag();
  const c = $('#bag-count'); c.classList.add('bump'); setTimeout(() => c.classList.remove('bump'), 300);
}

/* ------------------------------------------------------------------ wishlist */
function syncWish() {
  $$('[data-wish]').forEach(b => {
    const on = wish.includes(b.dataset.wish);
    b.classList.toggle('on', on); b.textContent = on ? '♥' : '♡';
    b.setAttribute('aria-label', on ? 'Remove from wishlist' : 'Add to wishlist');
    b.setAttribute('aria-pressed', String(on));
  });
  const on = wish.includes(PRODUCTS[state.current].id);
  $('#d-wish').textContent = on ? '♥ Saved to wishlist' : '♡ Add to wishlist';
  $('#d-wish').classList.toggle('on', on);
  $('#wish-count').textContent = wish.length;
}
function toggleWish(id) {
  const on = wish.includes(id);
  wish = on ? wish.filter(x => x !== id) : [...wish, id];
  save('forme-wish', wish); syncWish(); renderWish();
  toast(on ? 'Removed from your wishlist' : `${byId(id).name} saved to your wishlist`);
}
function renderWish() {
  const wrap = $('#wish-items');
  wrap.textContent = '';
  if (!wish.length) wrap.append(el('p', 'empty', 'Nothing saved yet. Tap the heart on any piece to keep it here.'));
  wish.forEach(id => {
    const p = byId(id);
    const side = el('div', 'item-side');
    const rm = el('button', '', 'Remove');
    rm.addEventListener('click', () => toggleWish(id));
    side.append(el('span', '', money(p.price)), rm);
    const view = el('button', 'mini', 'Choose size');
    view.addEventListener('click', () => go(p.id));
    wrap.append(itemRow(p, `${p.cat} · ${p.tone}`, side, view));
  });
}

/* ------------------------------------------------------------------ checkout (Cash on Delivery only) */
function openCheckout(lines, fromCart) {
  if (!lines.length) return;
  state.checkout = lines; state.fromCart = fromCart;
  couponMsg = '';
  const wrap = $('#co-items'); wrap.textContent = '';
  lines.forEach(({ p, size, qty }) => {
    const side = el('div', 'item-side'); side.append(el('span', '', money(p.price * qty)));
    wrap.append(itemRow(p, `${p.tone} · Size ${size} · Qty ${qty}`, side));
  });
  renderCheckout();
  $('#co-err').textContent = '';
  $('#co-main').hidden = false; $('#co-done').hidden = true;
  ['#cart', '#wish', '#support'].forEach(x => setOpen(x, false));
  setOpen('#checkout', true);
  $('#checkout').scrollTop = 0;
}
function renderCheckout() {
  $('#co-total-btn').textContent = money(renderTotals($('#co-totals'), state.checkout, 'Total to pay on delivery'));
}
const OTHER = 'Other';
function fillCities() {
  const state = $('#co-state').value, city = $('#co-city');
  city.textContent = '';
  city.append(new Option(state ? 'Select city' : 'Select state first', ''));
  if (state) { INDIA[state].forEach(c => city.append(new Option(c, c))); city.append(new Option('Other (type it below)', OTHER)); }
  city.disabled = !state;
  $('#co-city-other-wrap').hidden = true;
}
function placeOrder(e) {
  e.preventDefault();
  const v = id => $(id).value.trim();
  const checks = [
    ['#co-name', v('#co-name').length >= 2, 'Enter your full name.'],
    ['#co-phone', /^[6-9]\d{9}$/.test(v('#co-phone')), 'Enter a valid 10-digit Indian mobile number.'],
    ['#co-address', v('#co-address').length >= 6, 'Enter your full address.'],
    ['#co-state', !!v('#co-state'), 'Select your state.'],
    ['#co-city', !!v('#co-city'), 'Select your city.'],
    ['#co-city-other', v('#co-city') !== OTHER || v('#co-city-other').length >= 2, 'Enter the name of your city, town or village.'],
    ['#co-pin', /^[1-9]\d{5}$/.test(v('#co-pin')), 'Enter a valid 6-digit PIN code.'],
  ];
  const bad = checks.find(c => !c[1]);
  if (bad) { $('#co-err').textContent = bad[2]; $(bad[0]).focus(); return; }
  const { subtotal, discount, total, coupon } = totals(state.checkout);
  const order = {
    id: 'FM' + Date.now().toString(36).toUpperCase().slice(-7), date: new Date().toISOString(), payment: 'Cash on Delivery', subtotal, discount, coupon: coupon?.code || '', total,
    items: state.checkout.map(l => ({ id: l.p.id, name: l.p.name, size: l.size, qty: l.qty, price: l.p.price })),
    customer: { name: v('#co-name'), phone: '+91 ' + v('#co-phone'), address: v('#co-address'), city: v('#co-city') === OTHER ? v('#co-city-other') : v('#co-city'), state: v('#co-state'), pin: v('#co-pin') },
  };
  save('forme-orders', [...load('forme-orders', []), order]);
  couponCode = ''; couponMsg = ''; save('forme-coupon', couponCode);
  if (state.fromCart) { bag = {}; save('forme-bag', bag); }
  renderBag();
  $('#co-done-text').textContent = `Thank you, ${order.customer.name.split(' ')[0]}. Your order ${order.id} is confirmed. Please keep ${money(total)} ready in cash for delivery.`;
  $('#co-main').hidden = true; $('#co-done').hidden = false;
  $('#checkout').scrollTop = 0;
}

/* ------------------------------------------------------------------ feedback */
function renderStars() {
  const wrap = $('#fb-stars'); wrap.textContent = '';
  for (let n = 1; n <= 5; n++) {
    const b = el('button', n <= state.rating ? 'on' : '', '★');
    b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(n === state.rating)); b.setAttribute('aria-label', `${n} star${n > 1 ? 's' : ''}`);
    b.addEventListener('click', () => { state.rating = n; renderStars(); });
    wrap.append(b);
  }
}
function renderFeedback() {
  const list = $('#fb-list'); list.textContent = '';
  if (!feedback.length) {
    $('#fb-avg').textContent = 'No feedback yet';
    list.append(el('p', 'empty', 'Be the first to share what you think.'));
    return;
  }
  const avg = feedback.reduce((s, f) => s + f.rating, 0) / feedback.length;
  $('#fb-avg').textContent = `${avg.toFixed(1)} ★ from ${feedback.length} review${feedback.length > 1 ? 's' : ''}`;
  [...feedback].reverse().forEach(f => {
    const card = el('article', 'fb-card');
    card.append(el('p', 'fb-stars', '★'.repeat(f.rating) + '☆'.repeat(5 - f.rating)), el('p', 'fb-text', f.text),
      el('p', 'fb-by', `${f.name}${f.product ? ' · ' + f.product : ''} · ${new Date(f.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`));
    list.append(card);
  });
}

/* ------------------------------------------------------------------ support tickets */
const TICKET_TYPES = ['Shipping issue', 'Order issue', 'Other issue'];
let tickets = load('forme-tickets', []);
function renderTypes() {
  const wrap = $('#sp-types'); wrap.textContent = '';
  TICKET_TYPES.forEach(t => {
    const b = el('button', t === state.ticketType ? 'on' : '', t);
    b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(t === state.ticketType));
    b.addEventListener('click', () => { state.ticketType = t; renderTypes(); });
    wrap.append(b);
  });
}
function renderTickets() {
  const list = $('#sp-list'); list.textContent = '';
  $('#sp-list-h').hidden = !tickets.length;
  [...tickets].reverse().forEach(t => {
    const card = el('article', 'sp-card');
    const top = el('p', 'sp-top'); top.append(el('b', '', t.id), el('span', 'sp-status', 'Open'));
    card.append(top, el('p', 'fb-by', `${t.type}${t.order ? ' · Order ' + t.order : ''} · ${new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`), el('p', 'fb-text', t.text));
    list.append(card);
  });
}
function submitTicket(e) {
  e.preventDefault();
  const v = id => $(id).value.trim(), err = (msg, id) => { $('#sp-err').textContent = msg; $(id)?.focus(); };
  if (!state.ticketType) return err('Choose what your query is about.');
  if (v('#sp-name').length < 2) return err('Enter your name.', '#sp-name');
  if (!/^[6-9]\d{9}$/.test(v('#sp-phone'))) return err('Enter a valid 10-digit Indian mobile number.', '#sp-phone');
  if (v('#sp-text').length < 10) return err('Describe your query in a few words.', '#sp-text');
  const t = { id: 'TKT' + Date.now().toString(36).toUpperCase().slice(-6), type: state.ticketType, name: v('#sp-name'), phone: '+91 ' + v('#sp-phone'), order: v('#sp-order'), text: v('#sp-text'), date: new Date().toISOString() };
  tickets.push(t); save('forme-tickets', tickets);
  e.target.reset(); state.ticketType = ''; $('#sp-err').textContent = '';
  renderTypes(); renderTickets();
  toast(`Ticket ${t.id} created`);
  $('#sp-list-h').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ------------------------------------------------------------------ UI */
function bindUI() {
  buildTicker();
  $$('[data-go]').forEach(b => b.addEventListener('click', () => { closeAll(); go(b.dataset.go); }));
  $('#back-btn').addEventListener('click', () => (cameFromSite ? history.back() : go('collection')));
  addEventListener('hashchange', route);
  $$('[data-close]').forEach(b => b.addEventListener('click', () => setOpen('#' + b.parentElement.id, false)));
  $('#scrim').addEventListener('click', closeAll);
  $('#bag-btn').addEventListener('click', () => ($('#cart').classList.contains('open') ? closeAll() : only('#cart')));
  $('#wish-btn').addEventListener('click', () => ($('#wish').classList.contains('open') ? closeAll() : only('#wish')));
  $('#menu-btn').addEventListener('click', () => setOpen('#menu', true));
  $('#support-btn').addEventListener('click', () => { $('#sp-err').textContent = ''; only('#support'); });
  $('#sp-form').addEventListener('submit', submitTicket);
  renderTypes(); renderTickets();
  addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 30);
  const baseTitle = document.title;
  addEventListener('hashchange', () => { if (!byId(decodeURIComponent(location.hash.slice(1)))) document.title = baseTitle; });
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const sizes = $('#d-sizes');
  SIZES.forEach(s => {
    const b = el('button', s === state.size ? 'on' : '', s);
    b.addEventListener('click', () => { state.size = s; [...sizes.children].forEach(c => c.classList.toggle('on', c === b)); });
    sizes.append(b);
  });
  const setQty = q => { state.qty = clamp(q, 1, 9); $('#q-val').textContent = state.qty; };
  $('#q-minus').addEventListener('click', () => setQty(state.qty - 1));
  $('#q-plus').addEventListener('click', () => setQty(state.qty + 1));
  $('#add-btn').addEventListener('click', () => {
    const p = PRODUCTS[state.current];
    addToCart(p, state.size, state.qty);
    toast(`${p.name} added to your cart`);
    only('#cart');
  });
  $('#buy-btn').addEventListener('click', () => openCheckout([{ p: PRODUCTS[state.current], size: state.size, qty: state.qty }], false));
  $('#d-wish').addEventListener('click', () => toggleWish(PRODUCTS[state.current].id));
  $('#checkout-btn').addEventListener('click', () => openCheckout(cartLines(), true));
  $('#co-form').addEventListener('submit', placeOrder);
  Object.keys(INDIA).forEach(st => $('#co-state').append(new Option(st, st)));
  $('#co-state').addEventListener('change', fillCities);
  $('#co-city').addEventListener('change', () => { $('#co-city-other-wrap').hidden = $('#co-city').value !== OTHER; });
  $$('.tel-in, .num-in').forEach(i => i.addEventListener('input', () => { i.value = i.value.replace(/\D/g, '').slice(0, i.maxLength); }));
  $('#co-done-btn').addEventListener('click', () => { closeAll(); $('#co-form').reset(); fillCities(); });

  const sel = $('#fb-product');
  sel.append(new Option('The store in general', ''));
  PRODUCTS.forEach(p => sel.append(new Option(p.name, p.name)));
  renderStars();
  $('#fb-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#fb-name').value.trim(), text = $('#fb-text').value.trim();
    if (!name) { toast('Add your name to send feedback.'); $('#fb-name').focus(); return; }
    if (text.length < 5) { toast('Write a few words of feedback first.'); $('#fb-text').focus(); return; }
    feedback.push({ name, text, product: sel.value, rating: state.rating, date: new Date().toISOString() });
    save('forme-feedback', feedback); renderFeedback();
    e.target.reset(); state.rating = 5; renderStars();
    toast('Thank you for your feedback.');
  });
  $('#news-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#news-email');
    if (!/^\S+@\S+\.\S+$/.test(input.value.trim())) { toast('Enter a valid email address to subscribe.'); input.focus(); return; }
    input.value = ''; toast('Thank you. You are on the list.');
  });

  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv').forEach(x => io.observe(x));
}

/* ------------------------------------------------------------------ boot */
async function boot() {
  const fill = $('#loader-fill');
  fill.style.width = '35%';
  $('#p-count').textContent = PRODUCTS.length;
  await buildCards();
  renderGrid();
  fill.style.width = '75%';
  try { initHero(); } catch (err) { console.warn('WebGL unavailable', err); $('#gl').style.display = 'none'; }
  bindUI();
  renderBag(); renderWish(); syncWish(); renderFeedback();
  route();
  fill.style.width = '100%';
  setTimeout(() => document.body.classList.add('ready'), 450);
}
boot();
