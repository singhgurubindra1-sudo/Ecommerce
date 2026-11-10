import * as THREE from './vendor/three.module.min.js';
import { PRODUCTS, SIZES, CURRENCY } from './products.js';
import { drawCard, drawPhotoCard, starSprite } from './cards.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const money = n => CURRENCY + n.toLocaleString('en-US');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const state = { current: 0, size: 'M', qty: 1 };
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ------------------------------------------------------------------ product cards */
const thumbs = [];
const loadImage = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

async function buildCards() {
  try { await Promise.race([Promise.all([document.fonts.load('400 19px Jost'), document.fonts.load('italic 400 30px "Cormorant Garamond"')]), new Promise(r => setTimeout(r, 2000))]); } catch { /* fallback fonts */ }
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    let cv = null;
    if (p.image) { try { cv = drawPhotoCard(await loadImage(p.image)); } catch { cv = null; } }
    thumbs.push((cv || drawCard(p, i)).toDataURL('image/jpeg', .86));
  }
}

function renderGrid() {
  const grid = $('#grid');
  PRODUCTS.forEach((p, i) => {
    const card = document.createElement('article');
    card.className = 'card rv';
    card.style.transitionDelay = `${(i % 4) * 70}ms`;
    const pic = document.createElement('button');
    pic.className = 'card-pic';
    pic.setAttribute('aria-label', `View ${p.name}`);
    const img = document.createElement('img');
    img.src = thumbs[i]; img.alt = `${p.name} in ${p.tone}`; img.loading = 'lazy';
    pic.append(img);
    const h = document.createElement('h3'); h.textContent = p.name;
    const meta = document.createElement('p'); meta.textContent = p.cat;
    const price = document.createElement('b'); price.textContent = money(p.price);
    meta.append(price);
    card.append(pic, h, meta);
    pic.addEventListener('click', () => openDetail(i));
    if (fine && !reduce) {
      // light 3D tilt on hover
      pic.addEventListener('pointermove', e => {
        const r = pic.getBoundingClientRect();
        pic.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - .5) * 14}deg`);
        pic.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - .5) * 10}deg`);
      });
      pic.addEventListener('pointerleave', () => { pic.style.setProperty('--ry', '0deg'); pic.style.setProperty('--rx', '0deg'); });
    }
    grid.append(card);
  });
}

/* ------------------------------------------------------------------ hero 3D (the only WebGL on the page) */
function initHero() {
  const canvas = $('#gl'), hero = $('#home');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: devicePixelRatio < 2, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const scene = new THREE.Scene();
  const FOV = 40, TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const camera = new THREE.PerspectiveCamera(FOV, 1, .1, 100);

  const mask = new THREE.TextureLoader().load('assets/logo-full.png');
  const uniforms = { uTime: { value: 0 }, uMask: { value: mask }, uPush: { value: new THREE.Vector2() } };
  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 4.2, 48, 48),
    new THREE.ShaderMaterial({
      side: THREE.DoubleSide, uniforms,
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
        uniform sampler2D uMask; uniform float uTime;
        varying vec2 vUv; varying vec3 vView;
        void main() {
          vec3 n = normalize(cross(dFdx(vView), dFdy(vView)));
          float l = dot(n, normalize(vec3(0.35, 0.5, 1.0)));
          vec2 q = vec2((vUv.x - 0.5) / 0.76 + 0.5, (vUv.y - 0.5) / (0.76 * 0.779) + 0.5);
          float a = (q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0) ? texture2D(uMask, q).a : 0.0;
          float g = vUv.y + 0.12 * sin(vUv.x * 3.0 + uTime * 0.5);
          vec3 base = mix(vec3(1.0, 0.62, 0.20), vec3(1.0, 0.86, 0.30), smoothstep(0.15, 0.9, g));
          base = mix(vec3(0.07, 0.80, 0.72), base, smoothstep(-0.15, 0.35, g));
          vec3 c = mix(base, vec3(0.09, 0.04, 0.24), a) * (0.66 + 0.42 * l);
          gl_FragColor = vec4(c, 1.0);
        }`,
    })
  );
  scene.add(cloth);

  const count = 110, pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - .5) * 26; pos[i * 3 + 1] = (Math.random() - .5) * 14; pos[i * 3 + 2] = -8 + Math.random() * 10;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(starSprite()), size: .36, transparent: true, opacity: .85, depthWrite: false, color: 0xfff1b8 }));
  scene.add(stars);

  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight, a = w / h;
    renderer.setSize(w, h, false);
    camera.aspect = a; camera.updateProjectionMatrix();
    const d = Math.max(8.6, (4.2 * 1.3) / (2 * TAN * a)), vh = 2 * d * TAN, vw = vh * a;
    if (w <= 860) camera.position.set(0, -vh * .2, d); else camera.position.set(-vw * .21, 0, d);
  }
  resize();
  addEventListener('resize', resize);

  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  if (fine) hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
  });

  // Render only while the hero is on screen and the tab is visible.
  let visible = true, running = false, last = 0, time = 0;
  function frame(now) {
    if (!visible || document.hidden) { running = false; return; }
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000 || 0, .05); last = now; time += dt;
    mouse.sx += (mouse.x - mouse.sx) * .06; mouse.sy += (mouse.y - mouse.sy) * .06;
    uniforms.uTime.value = time;
    uniforms.uPush.value.set(mouse.sx, mouse.sy);
    cloth.rotation.y = mouse.sx * .14; cloth.rotation.x = -mouse.sy * .06;
    stars.position.y = Math.sin(time * .25) * .3;
    renderer.render(scene, camera);
  }
  const start = () => { if (!running && visible && !document.hidden) { running = true; last = performance.now(); requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(hero);
  document.addEventListener('visibilitychange', start);
  if (reduce) { renderer.render(scene, camera); visible = false; } else start();
}

/* ------------------------------------------------------------------ panels */
const lock = () => {
  const open = $$('.panel.open').length > 0 || $('#menu').classList.contains('open');
  document.documentElement.classList.toggle('lock', open);
  document.body.classList.toggle('panel-open', $$('.panel.open').length > 0);
};
function setOpen(id, on) { const el = $(id); el.classList.toggle('open', on); el.setAttribute('aria-hidden', String(!on)); lock(); }
const closeAll = () => ['#detail', '#cart', '#menu'].forEach(id => setOpen(id, false));

function openDetail(i) {
  state.current = i; state.qty = 1; $('#q-val').textContent = 1;
  const p = PRODUCTS[i];
  $('#d-img').src = thumbs[i]; $('#d-img').alt = `${p.name} in ${p.tone}`;
  $('#d-cat').textContent = p.cat;
  $('#d-name').textContent = p.name;
  $('#d-price').textContent = money(p.price);
  $('#d-desc').textContent = p.desc;
  $('#d-tone').textContent = p.tone;
  $('#detail .panel-body').scrollTop = 0;
  setOpen('#detail', true);
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
    const e = document.createElement('p'); e.className = 'empty'; e.textContent = 'Your bag is empty. Pick something you love from the collection.';
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

let toastT;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ------------------------------------------------------------------ UI */
function bindUI() {
  $$('[data-go]').forEach(b => b.addEventListener('click', () => {
    closeAll();
    document.getElementById(b.dataset.go)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }));
  $$('[data-close]').forEach(b => b.addEventListener('click', () => setOpen('#' + b.parentElement.id, false)));
  $('#scrim').addEventListener('click', closeAll);
  $('#bag-btn').addEventListener('click', () => { setOpen('#detail', false); setOpen('#cart', !$('#cart').classList.contains('open')); });
  $('#menu-btn').addEventListener('click', () => setOpen('#menu', true));
  addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

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
    const p = PRODUCTS[state.current], key = `${p.id}|${state.size}`;
    bag[key] = (bag[key] || 0) + state.qty;
    saveBag(); renderBag();
    const c = $('#bag-count'); c.classList.add('bump'); setTimeout(() => c.classList.remove('bump'), 300);
    toast(`${p.name} added to your bag`);
    setOpen('#detail', false); setOpen('#cart', true);
  });
  $('#checkout-btn').addEventListener('click', () => toast('Checkout is not connected yet. This is a preview.'));
  $('#news-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#news-email');
    if (!/^\S+@\S+\.\S+$/.test(input.value.trim())) { toast('Enter a valid email address to subscribe.'); input.focus(); return; }
    input.value = ''; toast('Thank you. You are on the list.');
  });

  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv').forEach(el => io.observe(el));
}

/* ------------------------------------------------------------------ boot */
async function boot() {
  const fill = $('#loader-fill');
  fill.style.width = '35%';
  $('#p-count').textContent = PRODUCTS.length;
  $$('.cur-150').forEach(e => (e.textContent = money(150)));
  await buildCards();
  renderGrid();
  fill.style.width = '75%';
  try { initHero(); } catch (err) { console.warn('WebGL unavailable', err); $('#gl').style.display = 'none'; }
  bindUI();
  renderBag();
  fill.style.width = '100%';
  setTimeout(() => document.body.classList.add('ready'), 450);
}
boot();
