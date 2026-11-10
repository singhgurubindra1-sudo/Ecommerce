import * as THREE from './vendor/three.module.min.js';
import { starSprite } from './cards.js';

const $ = s => document.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ------------------------------------------------------------------ hero 3D (the only WebGL on the page) */
export function initHero() {
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
