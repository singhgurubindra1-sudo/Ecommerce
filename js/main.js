import * as THREE from './vendor/three.module.min.js';
import { PRODUCTS, SIZES, CURRENCY } from './products.js';
import { drawCard, drawPhotoCard, starSprite } from './cards.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const money = n => CURRENCY + n.toLocaleString('en-US');
const mod = (n, m) => ((n % m) + m) % m;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

const N = PRODUCTS.length;
const SCENES = 4;
const THEMES = ['light', 'dark', 'dark', 'light'];
const state = { scene: 0, k: 0, detail: false, cart: false, menu: false, size: 'M', qty: 1, ready: false };

/* ------------------------------------------------------------------ cards */
const cardCanvases = [];
const thumbs = [];
const loadImage = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

async function buildCards() {
  try { await Promise.race([Promise.all([document.fonts.load('400 19px Jost'), document.fonts.load('italic 400 30px "Cormorant Garamond"')]), new Promise(r => setTimeout(r, 2500))]); } catch { /* fallback fonts */ }
  for (let i = 0; i < N; i++) {
    const p = PRODUCTS[i];
    let cv = null;
    if (p.image) { try { cv = drawPhotoCard(await loadImage(p.image)); } catch { cv = null; } }
    cv = cv || drawCard(p, i);
    cardCanvases.push(cv);
    thumbs.push(cv.toDataURL('image/jpeg', .8));
  }
}

/* ------------------------------------------------------------------ three */
const FOV = 40, TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const R = 7, STEP = (Math.PI * 2) / N, RING_Z = -40, FRONT_Z = RING_Z + R;
const CARD_W = 2.6, CARD_H = 3.575;
let renderer, scene3, camera, cloth, ring, cards = [], halos = [], stars, raycaster;
const camPos = new THREE.Vector3(0, 0, 9), camLook = new THREE.Vector3();
const tPos = new THREE.Vector3(), tLook = new THREE.Vector3();
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
let ringRot = 0, storyMix = 0, ringVis = 0, clothVis = 1, detailMix = 0, themeMix = 0;

function initThree() {
  const canvas = $('#gl');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  scene3 = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(FOV, 1, .1, 200);
  raycaster = new THREE.Raycaster();

  // Hero cloth carrying the logo
  const logoTex = new THREE.TextureLoader().load('assets/logo.webp');
  logoTex.colorSpace = THREE.SRGBColorSpace;
  logoTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 4.2, 90, 90),
    new THREE.ShaderMaterial({
      transparent: true, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uMap: { value: logoTex }, uOpacity: { value: 1 }, uPush: { value: new THREE.Vector2() } },
      vertexShader: `
        uniform float uTime; uniform vec2 uPush;
        varying vec2 vUv; varying vec3 vView;
        void main() {
          vUv = uv; vec3 p = position;
          float hang = 0.25 + 0.75 * (1.0 - uv.y);
          float w = sin(p.x * 1.5 + uTime * 1.1) * 0.13
                  + sin(p.y * 2.0 + p.x * 0.8 + uTime * 0.8) * 0.09
                  + sin((p.x - p.y) * 3.4 - uTime * 1.5) * 0.03;
          float d = distance(p.xy, uPush * 2.1);
          p.z += w * hang + exp(-d * d * 1.2) * 0.28;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vView = mv.xyz;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D uMap; uniform float uOpacity;
        varying vec2 vUv; varying vec3 vView;
        void main() {
          vec3 n = normalize(cross(dFdx(vView), dFdy(vView)));
          float l = dot(n, normalize(vec3(0.35, 0.5, 1.0)));
          vec3 c = texture2D(uMap, vUv).rgb * (0.62 + 0.42 * l);
          gl_FragColor = vec4(c, uOpacity);
          #include <colorspace_fragment>
        }`,
    })
  );
  scene3.add(cloth);

  // Carousel of product cards
  ring = new THREE.Group();
  ring.position.set(0, 0, RING_Z);
  scene3.add(ring);
  const geo = new THREE.PlaneGeometry(CARD_W, CARD_H);
  PRODUCTS.forEach((p, i) => {
    const tex = new THREE.CanvasTexture(cardCanvases[i]);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
    const a = i * STEP;
    m.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
    m.userData = { i, a };
    ring.add(m); cards.push(m);
  });
  [[R, -2.25, .55], [R + 1.6, -2.25, .22], [R, 2.25, .3]].forEach(([r, y, o]) => {
    const h = new THREE.Mesh(new THREE.TorusGeometry(r, .012, 6, 200), new THREE.MeshBasicMaterial({ color: 0xc9a06c, transparent: true }));
    h.rotation.x = Math.PI / 2; h.position.y = y; h.userData.o = o;
    ring.add(h); halos.push(h);
  });

  // Drifting four-point stars, after the sparkle in the logo
  const count = 340, pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - .5) * 46;
    pos[i * 3 + 1] = (Math.random() - .5) * 20;
    pos[i * 3 + 2] = -60 + Math.random() * 68;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  stars = new THREE.Points(sg, new THREE.PointsMaterial({
    map: new THREE.CanvasTexture(starSprite()), size: .34, transparent: true, opacity: .75, depthWrite: false, color: 0x8a5a30,
  }));
  scene3.add(stars);

  resize();
  addEventListener('resize', resize);
}

function resize() {
  if (!renderer) return;
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}

// Where the camera should sit for the current scene. Offsets pan the camera so
// the subject lands in the free part of the layout.
function cameraTarget() {
  const a = innerWidth / innerHeight, portrait = innerWidth <= 860;
  let d, vh, vw;
  const view = dist => { d = dist; vh = 2 * d * TAN; vw = vh * a; };
  switch (state.scene) {
    case 0: {
      view(Math.max(8.6, (4.2 * 1.3) / (2 * TAN * a)));
      if (portrait) { tPos.set(0, -vh * .2, d); tLook.set(0, -vh * .2, 0); }
      else { tPos.set(-vw * .21, 0, d); tLook.set(-vw * .21, 0, 0); }
      break;
    }
    case 1: {
      if (state.detail) {
        if (portrait) { view(CARD_H / .3 / (2 * TAN)); tPos.set(0, -vh * .27, FRONT_Z + d); tLook.set(0, -vh * .27, FRONT_Z); }
        else {
          view(7.6);
          const pf = Math.min(460, innerWidth) / innerWidth;
          tPos.set(vw * pf / 2, 0, FRONT_Z + d); tLook.set(vw * pf / 2, 0, FRONT_Z);
        }
      } else {
        view(Math.max(8.4, (CARD_W * 1.45) / (2 * TAN * a)));
        const s = vh * (portrait ? .1 : .085);
        tPos.set(0, -s, FRONT_Z + d); tLook.set(0, -s, FRONT_Z);
      }
      break;
    }
    case 2: tPos.set(0, 0, RING_Z); tLook.set(0, 0, RING_Z - R); break;
    default: {
      view(Math.max(8.6, (4.2 * 1.3) / (2 * TAN * a)));
      if (portrait) { tPos.set(1.2, -vh * .19, d); tLook.set(0, -vh * .19, 0); }
      else { tPos.set(-vw * .2 + 3.2, .9, d); tLook.set(-vw * .2, 0, 0); }
    }
  }
}

const clock = new THREE.Clock();
const cLight = new THREE.Color(0x8a5a30), cDark = new THREE.Color(0xe2bb86);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
  const ease = (rate) => 1 - Math.exp(-dt * rate);

  if (state.scene === 2 && !drag.active) state.k += dt * .11;
  cameraTarget();
  mouse.sx += (mouse.x - mouse.sx) * ease(3); mouse.sy += (mouse.y - mouse.sy) * ease(3);
  camPos.lerp(tPos, ease(reduce ? 30 : 2.5)); camLook.lerp(tLook, ease(reduce ? 30 : 2.5));
  camera.position.set(camPos.x + mouse.sx * .35, camPos.y + mouse.sy * .22, camPos.z);
  camera.lookAt(camLook);

  ringRot += (-state.k * STEP - ringRot) * ease(4.5);
  storyMix += ((state.scene === 2 ? 1 : 0) - storyMix) * ease(2.2);
  detailMix += ((state.detail ? 1 : 0) - detailMix) * ease(4);
  ringVis += ((state.scene === 1 || state.scene === 2 ? 1 : 0) - ringVis) * ease(state.scene === 1 || state.scene === 2 ? 2 : 4);
  clothVis += ((state.scene === 0 || state.scene === 3 ? 1 : 0) - clothVis) * ease(3);
  themeMix += ((THEMES[state.scene] === 'dark' ? 1 : 0) - themeMix) * ease(2);

  cloth.visible = clothVis > .01;
  cloth.material.uniforms.uTime.value = reduce ? 0 : t;
  cloth.material.uniforms.uOpacity.value = clothVis;
  cloth.material.uniforms.uPush.value.set(mouse.sx, mouse.sy);
  cloth.rotation.y = mouse.sx * .12;

  ring.visible = ringVis > .01;
  ring.rotation.y = ringRot;
  for (const c of cards) {
    const f = Math.cos(c.userData.a + ringRot);           // 1 = facing the camera
    const front = smooth(.75, 1, f);
    let o = .1 + .9 * smooth(-.35, .95, f);
    o *= 1 - detailMix * (1 - front) * .9;
    o = o + (.5 - o) * storyMix;
    c.material.opacity = o * ringVis;
    c.rotation.y = c.userData.a + storyMix * Math.PI;
    c.position.y = Math.sin(t * .8 + c.userData.i * 1.7) * .06 * (reduce ? 0 : 1);
    c.scale.setScalar(1 + front * .07 * (1 - storyMix));
  }
  for (const h of halos) h.material.opacity = h.userData.o * ringVis * (1 - detailMix * .6);

  stars.material.color.copy(cLight).lerp(cDark, themeMix);
  stars.rotation.z = Math.sin(t * .05) * .04;
  stars.position.y = Math.sin(t * .2) * .3;

  renderer.render(scene3, camera);
}

/* ------------------------------------------------------------------ scenes */
function goTo(n) {
  n = clamp(n, 0, SCENES - 1);
  if (state.scene === 2 && n !== 2) state.k = Math.round(state.k);
  if (n !== 1 && state.detail) closeDetail();
  state.scene = n;
  document.body.dataset.scene = n;
  document.body.dataset.theme = THEMES[n];
  $$('.scene').forEach(s => s.classList.toggle('active', +s.dataset.scene === n));
  $$('.rail button, .nav-links button').forEach(b => b.classList.toggle('on', +b.dataset.go === n));
  closeMenu();
}

let lastIdx = -1;
function syncProduct() {
  const i = mod(Math.round(state.k), N);
  if (i === lastIdx) return;
  lastIdx = i;
  const p = PRODUCTS[i];
  $('#p-num').textContent = String(i + 1).padStart(2, '0');
  $('#p-name').textContent = p.name;
  $('#p-cat').textContent = p.cat;
  $('#p-price').textContent = money(p.price);
  $('#fallback-card').src = thumbs[i];
  const info = $('#p-info');
  info.classList.remove('swap'); void info.offsetWidth; info.classList.add('swap');
  if (state.detail) fillDetail();
}
function stepProduct(dir) { state.k = Math.round(state.k) + dir; syncProduct(); }

// One "tick" of intent from wheel / keys / swipe.
function advance(dir) {
  if (state.detail || state.cart || state.menu) return;
  if (state.scene === 1) {
    const i = mod(Math.round(state.k), N);
    if ((dir > 0 && i < N - 1) || (dir < 0 && i > 0)) return stepProduct(dir);
  }
  goTo(state.scene + dir);
}

/* ------------------------------------------------------------------ detail */
const current = () => PRODUCTS[mod(Math.round(state.k), N)];
function fillDetail() {
  const p = current();
  $('#d-cat').textContent = p.cat;
  $('#d-name').textContent = p.name;
  $('#d-price').textContent = money(p.price);
  $('#d-desc').textContent = p.desc;
  $('#d-tone').textContent = p.tone;
}
function openDetail() {
  if (state.scene !== 1) return;
  state.detail = true; state.qty = 1; $('#q-val').textContent = 1;
  fillDetail();
  $('#detail').classList.add('open'); $('#detail').setAttribute('aria-hidden', 'false');
  document.body.classList.add('detail-open');
}
function closeDetail() {
  state.detail = false;
  $('#detail').classList.remove('open'); $('#detail').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('detail-open');
}

/* ------------------------------------------------------------------ bag */
let bag = {};
try { bag = JSON.parse(localStorage.getItem('forme-bag') || '{}') || {}; } catch { bag = {}; }
const saveBag = () => { try { localStorage.setItem('forme-bag', JSON.stringify(bag)); } catch { /* private mode */ } };

function renderBag() {
  const keys = Object.keys(bag).filter(k => PRODUCTS.some(p => p.id === k.split('|')[0]));
  let total = 0, count = 0;
  const wrap = $('#cart-items');
  wrap.textContent = '';
  if (!keys.length) {
    const e = document.createElement('p'); e.className = 'empty'; e.textContent = 'Your bag is empty. Turn the carousel and pick something you love.';
    wrap.append(e);
  }
  keys.forEach(key => {
    const [id, size] = key.split('|');
    const idx = PRODUCTS.findIndex(p => p.id === id), p = PRODUCTS[idx], q = bag[key];
    total += p.price * q; count += q;
    const row = document.createElement('div'); row.className = 'item';
    row.innerHTML = `<img alt=""><div><h3></h3><small></small>
      <div class="qty"><button data-d="-1" aria-label="Decrease quantity">−</button><span>${q}</span><button data-d="1" aria-label="Increase quantity">+</button></div></div>
      <div class="item-side"><span>${money(p.price * q)}</span><button data-d="0">Remove</button></div>`;
    row.querySelector('img').src = thumbs[idx] || '';
    row.querySelector('h3').textContent = p.name;
    row.querySelector('small').textContent = `${p.tone} · Size ${size}`;
    row.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      const d = +b.dataset.d;
      if (d === 0 || bag[key] + d <= 0) delete bag[key]; else bag[key] += d;
      saveBag(); renderBag();
    }));
    wrap.append(row);
  });
  $('#cart-total').textContent = money(total);
  $('#cart-foot').hidden = !keys.length;
  $('#bag-count').textContent = count;
}
function openCart() { state.cart = true; $('#cart').classList.add('open'); $('#cart').setAttribute('aria-hidden', 'false'); document.body.classList.add('cart-open'); }
function closeCart() { state.cart = false; $('#cart').classList.remove('open'); $('#cart').setAttribute('aria-hidden', 'true'); document.body.classList.remove('cart-open'); }
function openMenu() { state.menu = true; $('#menu').classList.add('open'); $('#menu').setAttribute('aria-hidden', 'false'); }
function closeMenu() { state.menu = false; $('#menu').classList.remove('open'); $('#menu').setAttribute('aria-hidden', 'true'); }

let toastT;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ------------------------------------------------------------------ input */
const drag = { active: false, moved: false, x: 0, y: 0, k0: 0, type: '' };
const isUI = el => !!el.closest?.('button, a, input, form, .panel, #menu, #scrim');

function pick(x, y) {
  if (!renderer || state.scene !== 1) return null;
  raycaster.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), camera);
  const hit = raycaster.intersectObjects(cards)[0];
  return hit ? hit.object.userData.i : null;
}

function bindInput() {
  // wheel: one gesture = one step
  let acc = 0, lock = 0;
  addEventListener('wheel', e => {
    if (state.cart || state.menu || (state.detail && e.target.closest?.('.panel'))) return;
    e.preventDefault();
    const now = performance.now();
    if (now < lock) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    acc += delta;
    if (Math.abs(acc) > 40) {
      const before = state.scene;
      advance(Math.sign(acc));
      lock = now + (state.scene !== before ? 1100 : 420);
      acc = 0;
    }
  }, { passive: false });

  addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeCart(); closeMenu(); closeDetail(); return; }
    if (e.target.matches?.('input')) return;
    if (['ArrowDown', 'PageDown'].includes(e.key)) advance(1);
    else if (['ArrowUp', 'PageUp'].includes(e.key)) advance(-1);
    else if (e.key === 'ArrowRight') state.scene === 1 && !state.cart ? stepProduct(1) : advance(1);
    else if (e.key === 'ArrowLeft') state.scene === 1 && !state.cart ? stepProduct(-1) : advance(-1);
  });

  addEventListener('pointerdown', e => {
    if (isUI(e.target) || state.cart || state.menu) return;
    Object.assign(drag, { active: true, moved: false, x: e.clientX, y: e.clientY, k0: state.k, type: e.pointerType, horiz: null });
  });
  addEventListener('pointermove', e => {
    mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = -((e.clientY / innerHeight) * 2 - 1);
    const cur = $('.cursor');
    cur.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    const overCard = !drag.active && !isUI(e.target) && pick(e.clientX, e.clientY) !== null;
    cur.classList.toggle('hot', overCard || !!e.target.closest?.('button, a'));
    document.body.style.cursor = overCard ? 'pointer' : '';
    if (!drag.active) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 7) { drag.moved = true; drag.horiz = Math.abs(dx) > Math.abs(dy); }
    if (drag.moved && drag.horiz && (state.scene === 1 || state.scene === 2) && !state.detail) {
      state.k = drag.k0 - dx / Math.min(300, innerWidth * .55);
      if (state.scene === 1) syncProduct();
    }
  });
  const up = e => {
    if (!drag.active) return;
    drag.active = false;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved) {
      const i = pick(e.clientX, e.clientY);
      if (i !== null) {
        const cur = mod(Math.round(state.k), N);
        if (i === cur) state.detail ? closeDetail() : openDetail();
        else if (!state.detail) { let d = i - cur; if (d > N / 2) d -= N; if (d < -N / 2) d += N; stepProduct(d); }
      } else if (state.detail) closeDetail();
      return;
    }
    if (drag.horiz) {
      if (state.scene === 1 && !state.detail) { state.k = Math.round(state.k); syncProduct(); }
      else if (state.scene !== 1 && state.scene !== 2 && drag.type !== 'mouse' && Math.abs(dx) > 60) advance(dx < 0 ? 1 : -1);
    } else if (drag.type !== 'mouse' && Math.abs(dy) > 50 && !state.detail) {
      goTo(state.scene + (dy < 0 ? 1 : -1));
    } else if (state.detail && drag.type !== 'mouse' && dy > 50) closeDetail();
  };
  addEventListener('pointerup', up);
  addEventListener('pointercancel', () => { drag.active = false; if (state.scene === 1) state.k = Math.round(state.k); });

  // UI
  $$('[data-go]').forEach(b => b.addEventListener('click', () => { closeCart(); goTo(+b.dataset.go); }));
  $$('[data-close]').forEach(b => b.addEventListener('click', () => { const p = b.parentElement.id; p === 'cart' ? closeCart() : p === 'menu' ? closeMenu() : closeDetail(); }));
  $('#scrim').addEventListener('click', closeCart);
  $('#bag-btn').addEventListener('click', () => (state.cart ? closeCart() : openCart()));
  $('#menu-btn').addEventListener('click', openMenu);
  $('#prev-btn').addEventListener('click', () => stepProduct(-1));
  $('#next-btn').addEventListener('click', () => stepProduct(1));
  $('#view-btn').addEventListener('click', openDetail);

  const sizes = $('#d-sizes');
  SIZES.forEach(s => {
    const b = document.createElement('button'); b.textContent = s; b.classList.toggle('on', s === state.size);
    b.addEventListener('click', () => { state.size = s; [...sizes.children].forEach(c => c.classList.toggle('on', c === b)); });
    sizes.append(b);
  });
  const setQty = q => { state.qty = clamp(q, 1, 9); $('#q-val').textContent = state.qty; };
  $('#q-minus').addEventListener('click', () => setQty(state.qty - 1));
  $('#q-plus').addEventListener('click', () => setQty(state.qty + 1));
  $('#add-btn').addEventListener('click', () => {
    const p = current(), key = `${p.id}|${state.size}`;
    bag[key] = (bag[key] || 0) + state.qty;
    saveBag(); renderBag();
    const c = $('#bag-count'); c.classList.add('bump'); setTimeout(() => c.classList.remove('bump'), 400);
    toast(`${p.name} added to your bag`);
    closeDetail(); openCart();
  });
  $('#checkout-btn').addEventListener('click', () => toast('Checkout is not connected yet. This is a preview.'));
  $('#news-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#news-email');
    if (!/^\S+@\S+\.\S+$/.test(input.value.trim())) { toast('Enter a valid email address to subscribe.'); input.focus(); return; }
    input.value = ''; toast('Thank you. You are on the list.');
  });
}

/* ------------------------------------------------------------------ boot */
async function boot() {
  document.body.dataset.theme = 'light';
  const fill = $('#loader-fill');
  fill.style.width = '30%';
  $('#p-total').textContent = String(N).padStart(2, '0');
  $('#p-count').textContent = N;
  $$('.cur-150').forEach(e => (e.textContent = money(150)));
  await buildCards();
  fill.style.width = '70%';
  try { initThree(); } catch (err) { console.warn('WebGL unavailable', err); renderer = null; document.body.classList.add('no-webgl'); $('#fallback-card').hidden = false; }
  bindInput();
  renderBag();
  syncProduct();
  if (renderer) { cameraTarget(); camPos.copy(tPos).add(new THREE.Vector3(0, 0, 5)); camLook.copy(tLook); frame(); }
  fill.style.width = '100%';
  setTimeout(() => { document.body.classList.add('ready'); state.ready = true; goTo(0); }, 900);
}
boot();
