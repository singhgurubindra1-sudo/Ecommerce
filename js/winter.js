// Winter sale dressing for the home banner: falling snowflakes, a snowbank and
// three snowmen. Remove the initWinter() call in main.js to switch it off.

const SNOWMAN = `
<svg viewBox="0 0 120 170" aria-hidden="true">
  <ellipse cx="60" cy="164" rx="40" ry="5" fill="rgba(11,42,74,.2)"/>
  <g stroke="#7a4a21" stroke-width="3.5" stroke-linecap="round" fill="none">
    <path d="M36 70 10 50M20 58l-9 6M17 56l-2-10"/>
    <g class="sm-arm"><path d="M84 70l26-24M101 54l11 3M104 51l1-11"/></g>
  </g>
  <g fill="#fff" stroke="#cfe8f7" stroke-width="2">
    <circle cx="60" cy="122" r="40"/><circle cx="60" cy="72" r="28"/><circle cx="60" cy="36" r="20"/>
  </g>
  <path d="M30 138a40 40 0 0 0 60 0 46 46 0 0 1-60 0z" fill="#dff1fb"/>
  <rect x="66" y="54" width="10" height="27" rx="3" fill="#dc1470"/>
  <rect x="39" y="49" width="42" height="10" rx="5" fill="#ff3d8b"/>
  <rect x="36" y="20" width="48" height="6" rx="3" fill="#0f2a3d"/>
  <rect x="44" y="2" width="32" height="20" rx="3" fill="#0f2a3d"/>
  <rect x="44" y="14" width="32" height="5" fill="#ffd23f"/>
  <g fill="#0f2a3d">
    <circle cx="53" cy="32" r="2.6"/><circle cx="67" cy="32" r="2.6"/>
    <circle cx="52" cy="43" r="1.3"/><circle cx="56" cy="45.5" r="1.3"/><circle cx="60" cy="46.5" r="1.3"/><circle cx="64" cy="45.5" r="1.3"/><circle cx="68" cy="43" r="1.3"/>
    <circle cx="60" cy="68" r="3"/><circle cx="60" cy="80" r="3"/><circle cx="60" cy="92" r="3"/>
  </g>
  <path d="M60 35l19 4-19 3z" fill="#ff8a3c"/>
</svg>`;

const SNOWBANK = `
<svg class="snowbank" viewBox="0 0 1440 110" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 48c160-40 300-34 470-8s300 26 470-4 330-30 500 6v68H0z" fill="#cfe8f7"/>
  <path d="M0 70c180-34 340-22 520-2s330 14 500-10 280-12 420 12v40H0z" fill="#fff"/>
</svg>`;

export function initWinter(hero) {
  const layer = document.createElement('div');
  layer.className = 'winter';
  layer.setAttribute('aria-hidden', 'true');

  const rand = (a, b) => a + Math.random() * (b - a);
  const flakes = innerWidth < 700 ? 30 : 55;
  for (let i = 0; i < flakes; i++) {
    const f = document.createElement('span');
    f.className = 'flake';
    f.textContent = '❄❅❆'[i % 3];
    const dur = rand(7, 17);
    f.style.cssText = `left:${rand(-4, 100).toFixed(1)}%;font-size:${rand(10, 30).toFixed(0)}px;opacity:${rand(.45, 1).toFixed(2)};--dx:${rand(-90, 90).toFixed(0)}px;animation-duration:${dur.toFixed(1)}s;animation-delay:-${rand(0, dur).toFixed(1)}s`;
    layer.append(f);
  }

  layer.insertAdjacentHTML('beforeend', SNOWBANK);
  ['sm-back', 'sm-wave', 'sm-walk'].forEach(kind => {
    const s = document.createElement('div');
    s.className = `snowman ${kind}`;
    s.innerHTML = `<div class="sm-in">${SNOWMAN}</div>`;
    layer.append(s);
  });

  hero.querySelector('canvas').after(layer);
}
