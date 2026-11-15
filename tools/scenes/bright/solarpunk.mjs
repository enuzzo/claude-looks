import { rng, f, anchorCss, write } from './common.mjs'
const R = rng(20261115)
const pick = a => a[Math.floor(R() * a.length)]
const LEAF = ['#2f6b34', '#3f8238', '#4f9a3c', '#67ad45', '#82c052', '#3a7a46']
const leaf = (x, y, ang, L, W, c) =>
  `<use href="#lf" fill="${c}" transform="translate(${Math.round(x)} ${Math.round(y)})rotate(${Math.round(ang)})scale(${(L / 10).toFixed(1)})"/>`

// One hanging vine at local origin (its attach point), with leaves down its length.
function vine(len, bend) {
  const pts = []
  const n = Math.max(3, Math.round(len / 20))
  for (let i = 0; i <= n; i++) {
    const t = i / n
    pts.push([Math.sin(t * Math.PI * 1.3) * bend * t, t * len])
  }
  let d = `M0 0`
  for (let i = 1; i < pts.length; i++) d += `L${f(pts[i][0])} ${f(pts[i][1])}`
  let s = `<path d="${d}" fill="none" stroke="#3b5e2c" stroke-width="2.2" stroke-linecap="round"/>`
  for (let i = 1; i < pts.length; i++) {
    const t = i / n
    const side = i % 2 ? 1 : -1
    const L = 30 - t * 14 + R() * 6
    s += leaf(pts[i][0], pts[i][1], 90 + side * (55 + R() * 25), L, L * 0.38, pick(LEAF))
  }
  // a small cluster at the tip
  const [tx, ty] = pts[pts.length - 1]
  for (let k = 0; k < 3; k++) s += leaf(tx, ty, 60 + k * 30 + R() * 10, 16 + R() * 6, 6, pick(LEAF))
  return s
}

// A corner of vines: a leafy canopy along the top and vines hanging from it.
function corner(mirror) {
  const X = x => (mirror ? 1000 - x : x)
  let s = ''
  // canopy along the top edge
  for (let i = 0; i < 55; i++) {
    const x = -260 + R() * 660 * Math.pow(R(), 0.6)
    const y = -30 + R() * 70 * (1 - Math.max(0, x) / 420)
    s += leaf(X(x), y, (mirror ? 180 - 1 : 0) + (R() * 360), 34 + R() * 26, 12 + R() * 6, pick(LEAF))
  }
  const vines = [[14, 430], [70, 290], [128, 360], [196, 210], [262, 150], [330, 90]]
  for (const [x, len] of vines) {
    const dur = 8 + R() * 6
    const del = -R() * dur
    s += `<g transform="translate(${f(X(x))} ${f(10 + R() * 15)})"><g class="sw" style="animation-duration:${f(dur)}s;animation-delay:${f(del)}s">${vine(len * (0.85 + R() * 0.3), (mirror ? -1 : 1) * (6 + R() * 14))}</g></g>`
  }
  return s
}

function turbine(x, yb, h, dur) {
  const w = h * 0.025
  let s = `<path d="M${f(x - w)} ${f(yb)}L${f(x - w * 0.45)} ${f(yb - h)}L${f(x + w * 0.45)} ${f(yb - h)}L${f(x + w)} ${f(yb)}Z" fill="#f4f6ee"/>`
  s += `<rect x="${f(x - w * 0.6)}" y="${f(yb - h - w * 0.7)}" width="${f(w * 2.4)}" height="${f(w * 1.3)}" rx="${f(w * 0.5)}" fill="#e6ebde"/>`
  const L = h * 0.55
  const blade = `<path d="M0 0L${f(-w * 0.55)} ${f(-L * 0.15)}L${f(-w * 0.12)} ${f(-L)}L${f(w * 0.25)} ${f(-L * 0.2)}Z" fill="#f8faf3"/>`
  s += `<g transform="translate(${f(x)} ${f(yb - h)})"><g class="spin" style="animation-duration:${f(dur)}s;animation-delay:${f(-R() * dur)}s">${blade}<g transform="rotate(120)">${blade}</g><g transform="rotate(240)">${blade}</g></g><circle r="${f(w * 0.7)}" fill="#dfe6d6"/></g>`
  return s
}

function hills(mirror) {
  const X = x => (mirror ? 1000 - x : x)
  const ridge = (pts, c) => {
    let d = `M${f(X(-1600))} 1700L${f(X(-1600))} ${pts[0][1]}`
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]
      d += `C${f(X(x0 + (x1 - x0) / 2))} ${y0} ${f(X(x0 + (x1 - x0) / 2))} ${y1} ${f(X(x1))} ${y1}`
    }
    d += `L${f(X(pts[pts.length - 1][0]))} 1700Z`
    return `<path d="${d}" fill="${c}"/>`
  }
  let s = ridge([[-1600, 860], [-500, 820], [0, 770], [180, 800], [380, 870], [620, 960], [700, 990]], '#9cc98a')
  const T = mirror ? [[90, 790, 150, 19], [215, 812, 118, 23], [330, 850, 90, 17]] : [[60, 782, 160, 21], [180, 800, 125, 17], [300, 842, 95, 24]]
  for (const [x, y, h, d] of T) s += turbine(X(x), y, h, d)
  s += ridge([[-1600, 930], [-300, 900], [60, 870], [250, 905], [480, 960], [640, 1000]], '#7db46c')
  s += ridge([[-1600, 980], [-200, 960], [120, 945], [300, 975], [480, 1010]], '#5f9d56')
  return s
}

const motes = []
for (let i = 0; i < 46; i++) {
  const side = i % 2
  const x = side ? 720 + R() * 300 : -20 + R() * 300
  const y = 120 + R() * 760
  const dur = 18 + R() * 16
  const r = 1.4 + R() * 2.2
  motes.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" style="animation-duration:${f(dur)}s;animation-delay:${f(-R() * dur)}s"/>`)
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
<style>
${anchorCss()}
.sw{animation:sway 10s ease-in-out infinite alternate}
@keyframes sway{from{transform:rotate(-2.2deg)}to{transform:rotate(2.2deg)}}
.spin{animation:spin 18s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.motes circle{fill:#fff7cf;opacity:0;animation:drift 24s linear infinite}
@keyframes drift{0%{transform:translate(0,0);opacity:0}15%{opacity:.85}80%{opacity:.7}100%{transform:translate(70px,-170px);opacity:0}}
.glow{animation:breathe 14s ease-in-out infinite alternate}
@keyframes breathe{from{opacity:.8}to{opacity:1}}
.k0{stop-color:#e9efc4}.k1{stop-color:#c4e0b0}.k2{stop-color:#a6d2ae}
@media (prefers-color-scheme:dark){.motes circle{fill:#eaff9a}}
@media (prefers-reduced-motion:reduce){.sw,.spin,.glow{animation:none}.motes circle{animation:none;opacity:.6}}
</style>
<defs>
<path id="lf" d="M0 0Q5-3.8 10 0Q5 3.8 0 0Z"/>
<linearGradient id="sky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1000"><stop class="k0" offset="0"/><stop class="k1" offset=".55"/><stop class="k2" offset="1"/></linearGradient>
<radialGradient id="sun" gradientUnits="userSpaceOnUse" cx="930" cy="40" r="520"><stop offset="0" stop-color="#fffbe0"/><stop offset=".18" stop-color="#ffefa0" stop-opacity=".9"/><stop offset=".5" stop-color="#ffe27a" stop-opacity=".35"/><stop offset="1" stop-color="#ffe27a" stop-opacity="0"/></radialGradient>
</defs>
<rect x="-2000" y="-1000" width="5000" height="3000" fill="url(#sky)"/>
<g class="tr"><circle class="glow" cx="930" cy="40" r="520" fill="url(#sun)"/></g>
<g class="b"><rect x="-2500" y="985" width="6000" height="800" fill="#5f9d56"/></g>
<g class="bl">${hills(false)}</g>
<g class="br">${hills(true)}</g>
<g class="motes">${motes.join('')}</g>
<g class="tl">${corner(false)}</g>
<g class="tr">${corner(true)}</g>
</svg>`
write('solarpunk', 'Generated scene: hanging vines in the top corners, wind turbines on green hills, sun glow, drifting pollen.', svg)
