import { rng, f, FIT, write , REPO } from './common.mjs'
const r = rng(6603)
const W = 1600, H = 1000

// Stars: many tiny fixed ones as one path, some twinkling.
let still = '', tw = ''
for (let i = 0; i < 260; i++) {
  const x = r() * W, y = r() * 760, s = r()
  if (s < 0.82) still += `M${f(x)} ${f(y)}h1.4v1.4h-1.4z`
  else tw += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.9 + r() * 1.1)}" style="animation-delay:-${f(r() * 7)}s;animation-duration:${f(5 + r() * 5)}s"/>`
}

// A curtain: a wavy ribbon whose lower edge is bright green and upper edge fades to violet.
function curtain(y0, amp, thick, phase, waves) {
  const pts = []
  for (let i = 0; i <= 32; i++) {
    const x = -300 + (i / 32) * (W + 600)
    const y = y0 + Math.sin(phase + (i / 32) * Math.PI * waves) * amp + Math.sin(phase * 2 + i * 0.7) * amp * 0.15
    pts.push([x, y])
  }
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0p] = pts[i - 1], [x1, y1] = pts[i]
    d += `Q${f(x0)} ${f(y0p)} ${f((x0 + x1) / 2)} ${f((y0p + y1) / 2)}`
  }
  const top = [...pts].reverse().map(([x, y], i) => `L${f(x)} ${f(y - thick * (0.55 + 0.45 * Math.sin(phase * 1.7 + i * 0.45)))}`).join('')
  return d + top + 'Z'
}
// Vertical rays inside the curtains: random stripes in a mask, softened sideways.
const rayD = ['', '', '']
for (let x = -400; x < W + 400;) { const w = 2 + r() * 7; rayD[Math.floor(r() * 3)] += `M${f(x)} -400h${f(w)}v1800h${f(-w)}z`; x += w + 2 + r() * 9 }
const curtains = [
  { y: 330, amp: 70, t: 260, ph: 0.3, w: 2.2, g: 'au1', cls: 'c1', op: 1 },
  { y: 250, amp: 90, t: 220, ph: 2.1, w: 1.6, g: 'au2', cls: 'c2', op: 0.8 },
  { y: 410, amp: 55, t: 200, ph: 4.0, w: 2.8, g: 'au1', cls: 'c3', op: 0.7 },
  { y: 180, amp: 60, t: 170, ph: 5.2, w: 1.3, g: 'au3', cls: 'c4', op: 0.7 },
]
const au = curtains.map(c => `<g class="${c.cls}"><path d="${curtain(c.y, c.amp, c.t, c.ph, c.w)}" fill="url(#${c.g})" opacity="${c.op}"/></g>`).join('')

// Hills and pine forests: forests heavier toward the edges.
function hill(y, amp, ph, fill, k) {
  let d = `M-400 1100L-400 ${y}`
  for (let x = -400; x <= W + 400; x += 40) d += `L${x} ${f(y + Math.sin(ph + x / k) * amp + Math.sin(ph * 3 + x / (k * 0.37)) * amp * 0.3)}`
  return `<path d="${d}L${W + 400} 1100Z" fill="${fill}"/>`
}
function pine(x, base, h) {
  const w = h * 0.36
  let d = `M${f(x)} ${f(base - h)}`
  const tiers = 4
  for (let t = 1; t <= tiers; t++) { const yy = base - h + (h * t) / tiers; const ww = (w * t) / tiers; d += `L${f(x + ww)} ${f(yy)}L${f(x + ww * 0.45)} ${f(yy - h * 0.05)}` }
  d = d.replace(/L[^L]*$/, '') // drop the last notch on the right
  let left = ''
  for (let t = tiers; t >= 1; t--) { const yy = base - h + (h * t) / tiers; const ww = (w * t) / tiers; left += `L${f(x - ww * 0.45)} ${f(yy - h * 0.05)}L${f(x - ww)} ${f(yy)}` }
  left = left.replace(/^L[^L]*/, '')
  return `${d}L${f(x + w)} ${f(base)}L${f(x - w)} ${f(base)}${left}Z`
}
function forest(x0, x1, base, hmin, hmax, density, edgeBoost) {
  let d = ''
  for (let x = x0; x < x1; x += 12 + r() * 20 / density) {
    const edge = Math.min(1, Math.abs(x - W / 2) / (W / 2))
    const h = (hmin + r() * (hmax - hmin)) * (1 - edgeBoost + edgeBoost * edge * 1.4)
    if (h < 12) continue
    d += pine(x, base + r() * 10, h)
  }
  return d
}
const farHills = hill(800, 30, 1, '#1d2d4d', 260)
const nearHillL = `<path d="M-400 1100L-400 760Q100 700 380 820Q560 880 700 960L700 1100Z" fill="#14213b"/>`
const nearHillR = `<path d="M2000 1100L2000 740Q1500 690 1220 820Q1060 890 900 970L900 1100Z" fill="#14213b"/>`
const farForest = forest(-300, W + 300, 840, 18, 44, 1, 0.6)
const forestL = forest(-300, 640, 960, 60, 190, 1, 0) + forest(-300, 420, 830, 30, 90, 1, 0)
const forestR = forest(960, W + 300, 960, 60, 190, 1, 0) + forest(1180, W + 300, 820, 30, 90, 1, 0)

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<style>
.st{fill:#e6eeff;opacity:.7}
.tw circle{fill:#f4f8ff;animation:tw 7s ease-in-out infinite}
@keyframes tw{0%,100%{opacity:.25}50%{opacity:1}}
.c1,.c2,.c3,.c4{transform-box:fill-box;transform-origin:50% 100%}
.c1{animation:s1 26s ease-in-out infinite}.c2{animation:s2 33s ease-in-out infinite}
.c3{animation:s1 41s ease-in-out infinite reverse}.c4{animation:s2 29s ease-in-out infinite reverse}
@keyframes s1{0%,100%{transform:translateX(-60px) skewX(4deg) scaleY(1);opacity:.75}50%{transform:translateX(70px) skewX(-5deg) scaleY(1.12);opacity:1}}
@keyframes s2{0%,100%{transform:translateX(50px) skewX(-3deg) scaleY(1.08);opacity:1}50%{transform:translateX(-80px) skewX(5deg) scaleY(.92);opacity:.6}}
.glow{animation:gw 20s ease-in-out infinite}
@keyframes gw{0%,100%{opacity:.6}50%{opacity:1}}
${FIT()}
@media (prefers-reduced-motion:reduce){.tw circle,.c1,.c2,.c3,.c4,.glow{animation:none}}
</style>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03050e"/><stop offset=".45" stop-color="#081329"/><stop offset=".8" stop-color="#11244a"/><stop offset="1" stop-color="#1a3360"/></linearGradient>
<linearGradient id="au1" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#8affc8" stop-opacity="0"/><stop offset=".06" stop-color="#8affc8" stop-opacity="1"/><stop offset=".3" stop-color="#36f0a4" stop-opacity=".7"/><stop offset=".65" stop-color="#7b5cff" stop-opacity=".22"/><stop offset="1" stop-color="#b48cff" stop-opacity="0"/></linearGradient>
<linearGradient id="au2" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#3ff5a3" stop-opacity="0"/><stop offset=".1" stop-color="#5affb4" stop-opacity=".95"/><stop offset=".5" stop-color="#2bc9c0" stop-opacity=".5"/><stop offset="1" stop-color="#c06bff" stop-opacity="0"/></linearGradient>
<linearGradient id="au3" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#b48cff" stop-opacity="0"/><stop offset=".1" stop-color="#d98bff" stop-opacity=".85"/><stop offset=".6" stop-color="#8a5cff" stop-opacity=".3"/><stop offset="1" stop-color="#8a5cff" stop-opacity="0"/></linearGradient>
<radialGradient id="snow" cx=".5" cy="1.05" r=".65"><stop offset="0" stop-color="#9fc4ff" stop-opacity=".35"/><stop offset="1" stop-color="#9fc4ff" stop-opacity="0"/></radialGradient>
<radialGradient id="sk" cx=".5" cy=".35" r=".6"><stop offset="0" stop-color="#2fe39a" stop-opacity=".2"/><stop offset="1" stop-color="#2fe39a" stop-opacity="0"/></radialGradient>
<filter id="bl" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="16 6"/></filter>
<filter id="rs" x="-10%" y="0" width="120%" height="100%"><feGaussianBlur stdDeviation="2.5 0"/></filter>
<mask id="rays" maskUnits="userSpaceOnUse" x="-400" y="-400" width="2400" height="1800"><rect x="-400" y="-400" width="2400" height="1800" fill="#fff" opacity=".6"/><g fill="#fff" filter="url(#rs)"><path d="${rayD[0]}" opacity=".5"/><path d="${rayD[1]}" opacity=".3"/><path d="${rayD[2]}" opacity=".15"/></g></mask>
</defs>
<rect x="-400" y="-400" width="2400" height="1800" fill="url(#sky)"/>
<path class="st" d="${still}"/>
<g class="tw">${tw}</g>
<rect class="glow" x="-400" y="-100" width="2400" height="900" fill="url(#sk)"/>
<g class="T"><g filter="url(#bl)" mask="url(#rays)">${au}</g></g>
<g class="B">${farHills}<path d="${farForest}" fill="#13203a"/>
<rect x="-400" y="700" width="2400" height="400" fill="url(#snow)"/>
<g class="L">${nearHillL}<path d="${forestL}" fill="#060b18"/></g>
<g class="R">${nearHillR}<path d="${forestR}" fill="#060b18"/></g>
<path d="M-400 1100L-400 975Q800 940 2000 975L2000 1100Z" fill="#1c2f52"/></g>
</svg>`
write(REPO + '/hooks/looks/aurora/scene.js', 'polar night, swaying aurora curtains, stars, snowy pine forest.', svg)
