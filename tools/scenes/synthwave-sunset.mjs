// Synthwave sunset scene generator. Run: node tools/scenes/synthwave-sunset.mjs
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

let seed = 20261115
const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
const f = n => +n.toFixed(1)

const VX = 500, HY = 640 // vanishing point on the horizon
const PINK = '#ff2fa8', HOT = '#ff7ad0', CYAN = '#5ef0ff', SUN_TOP = '#ffe58a'

// ── stars: ASCII glyph pairs that cross-fade (+ ↔ *, . ↔ ·), twinkling at their own pace
const GLYPHS = [['+', '*'], ['*', '+'], ['x', '+'], ['+', 'x'], ['*', 'x'], ['+', '.']]
let stars = ''
for (let i = 0; i < 70; i++) {
  const x = f(R() * 1000), y = f(R() * 520)
  // keep the middle of the sky a little quieter
  if (x > 380 && x < 620 && y > 200 && R() < 0.6) continue
  const [a, b] = GLYPHS[Math.floor(R() * GLYPHS.length)]
  const size = f(10 + R() * 10), dur = f(5 + R() * 9), delay = f(-R() * 14)
  const dim = f(0.35 + R() * 0.5)
  stars += `<g class="st" style="--d:${dur}s;animation-delay:${delay}s;opacity:${dim}"><text x="${x}" y="${y}" font-size="${size}" class="ga">${a}</text><text x="${x}" y="${y}" font-size="${size}" class="gb" style="animation-delay:${delay}s">${b}</text></g>`
}

// ── sun on the left third: stripes that slowly sink
const SX = 290, SY = 590, SR = 165
let cuts = ''
for (let i = 0; i < 9; i++) cuts += `<rect x="${SX - SR - 10}" y="${f(SY - 40 + i * 26)}" width="${SR * 2 + 20}" height="${f(2 + i * 1.6)}"/>`

// ── wireframe mountains on the right: ridge + struts down to the base
const ridge = [[560, HY], [610, 600], [655, 615], [720, 548], [770, 590], [815, 520], [880, 585], [930, 560], [1000, 610], [1080, 590], [1150, HY]]
const ridgeD = 'M' + ridge.map(p => p.join(' ')).join(' L')
let struts = ''
for (let i = 1; i < ridge.length - 1; i++) {
  const [x, y] = ridge[i]
  struts += `<line x1="${x}" y1="${y}" x2="${f(x - 26)}" y2="${HY}"/><line x1="${x}" y1="${y}" x2="${f(x + 22)}" y2="${HY}"/>`
}
// a low far ridge on the left
const far = 'M-400 640 L-60 640 L20 612 L90 628 L150 600 L210 626 L260 640 Z'

// ── grid: horizontals rolling toward the viewer, radials fixed
let hz = ''
for (let k = 0; k < 18; k++) hz += `<line x1="-2000" y1="${f(HY + 4 * Math.pow(1.38, k))}" x2="3000" y2="${f(HY + 4 * Math.pow(1.38, k))}"/>`
let rad = ''
const radials = []
for (let i = -14; i <= 14; i++) {
  const x2 = VX + i * 1120
  radials.push(x2)
  rad += `<line x1="${VX}" y1="${HY}" x2="${x2}" y2="3840"/>`
}
// pulses: a bright dash that runs down a radial from the horizon, now and then
const PULSES = [[-3, 0], [2, 0.6], [-6, 8.1], [5, 8.5], [-1, 15.8]]
let pulses = ''
for (const [i, at] of PULSES) {
  const x2 = VX + i * 1120
  const dx = (x2 - VX) / 3200, len = 0.012 * 3200 // dash length along the line, in y
  const tx = f(dx * 360), ty = 360
  pulses += `<g class="pu" style="--tx:${tx}px;--ty:${ty}px;animation-delay:${at}s"><line x1="${VX}" y1="${HY}" x2="${f(VX + dx * len)}" y2="${f(HY + len)}"/></g>`
}

const style = `
text{font-family:ui-monospace,Menlo,Consolas,monospace;fill:#fbe8ff}
.st{animation:tw var(--d) ease-in-out infinite}
@keyframes tw{0%,100%{opacity:.25}50%{opacity:1}}
.st .gb{opacity:0;animation:swap 11s steps(1) infinite}
.st .ga{animation:swap2 11s steps(1) infinite;animation-delay:inherit}
@keyframes swap{0%,70%{opacity:0}71%,100%{opacity:1}}
@keyframes swap2{0%,70%{opacity:1}71%,100%{opacity:0}}
.sunbands{animation:sink 14s linear infinite}
@keyframes sink{from{transform:translateY(0)}to{transform:translateY(26px)}}
.sun{animation:breathe 12s ease-in-out infinite}
@keyframes breathe{0%,100%{opacity:.93}50%{opacity:1}}
.roll{transform-box:view-box;transform-origin:${VX}px ${HY}px;animation:roll 4.2s linear infinite}
@keyframes roll{from{transform:scale(1)}to{transform:scale(1.38)}}
.grid line{stroke:${PINK};stroke-width:1.4;vector-effect:non-scaling-stroke}
.pu{opacity:0;animation:pulse 16s cubic-bezier(.55,0,.9,.5) infinite}
.pu line{stroke:${CYAN};stroke-width:3;stroke-linecap:round;vector-effect:non-scaling-stroke;filter:url(#glow)}
@keyframes pulse{0%{opacity:0;transform:translate(0,0)}1%{opacity:1}14%{opacity:.9;transform:translate(var(--tx),var(--ty))}15%,100%{opacity:0;transform:translate(var(--tx),var(--ty))}}
.wire{fill:none;stroke:${HOT};stroke-width:1.3;vector-effect:non-scaling-stroke;stroke-linejoin:round}
.wire line{stroke:${PINK};stroke-opacity:.45;stroke-width:1;vector-effect:non-scaling-stroke}
.trace{stroke:${CYAN};stroke-width:2;fill:none;stroke-dasharray:60 2000;stroke-dashoffset:60;opacity:0;animation:trace 21s ease-in-out infinite 5s;vector-effect:non-scaling-stroke;filter:url(#glow)}
@keyframes trace{0%{stroke-dashoffset:60;opacity:0}2%{opacity:1}22%{stroke-dashoffset:-760;opacity:1}24%,100%{stroke-dashoffset:-760;opacity:0}}
.shoot{opacity:0;animation:shoot 23s ease-out infinite 9s}
@keyframes shoot{0%{opacity:0;transform:translate(0,0)}.5%{opacity:1}4%{opacity:0;transform:translate(-260px,120px)}100%{opacity:0;transform:translate(-260px,120px)}}
.flare{opacity:.35;animation:flare 29s ease-in-out infinite 3s}
@keyframes flare{0%,88%,100%{opacity:.35}93%{opacity:.9}}
.haze{animation:haze 18s ease-in-out infinite}
@keyframes haze{0%,100%{opacity:.75}50%{opacity:1}}
@media (max-aspect-ratio:4/5){.left{transform:translateX(150px)}.right{transform:translateX(-170px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.pu,.shoot,.trace{opacity:0}}
`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
<style>${style}</style>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#06021a"/><stop offset=".3" stop-color="#140834"/><stop offset=".5" stop-color="#2e0c55"/><stop offset=".6" stop-color="#6a1470"/><stop offset=".64" stop-color="#c2307e"/><stop offset=".641" stop-color="#12052a"/><stop offset="1" stop-color="#07021a"/>
</linearGradient>
<linearGradient id="sunfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SUN_TOP}"/><stop offset=".5" stop-color="#ff9a4a"/><stop offset="1" stop-color="${PINK}"/></linearGradient>
<radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff5fb4" stop-opacity=".5"/><stop offset=".6" stop-color="#ff2fa8" stop-opacity=".12"/><stop offset="1" stop-color="#ff2fa8" stop-opacity="0"/></radialGradient>
<linearGradient id="hz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff4fb8" stop-opacity="0"/><stop offset=".55" stop-color="#ff4fb8" stop-opacity=".5"/><stop offset="1" stop-color="#ff4fb8" stop-opacity="0"/></linearGradient>
<linearGradient id="floorfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12052a"/><stop offset=".12" stop-color="#12052a" stop-opacity="0"/><stop offset="1" stop-color="#07021a" stop-opacity=".35"/></linearGradient>
<linearGradient id="streak" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>
<mask id="bands"><rect x="-500" y="-500" width="2000" height="2000" fill="#fff"/><g class="sunbands" fill="#000">${cuts}</g></mask>
<clipPath id="above"><rect x="-2000" y="-1000" width="5000" height="${HY + 1000}"/></clipPath>
<clipPath id="floor"><rect x="-2000" y="${HY}" width="5000" height="2000"/></clipPath>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<rect x="-2000" y="-1000" width="5000" height="3000" fill="url(#sky)"/>
<g>${stars}</g>
<g class="shoot"><line x1="840" y1="120" x2="900" y2="92" stroke="url(#streak)" stroke-width="1.6" transform="rotate(180 870 106)"/></g>
<g class="left">
<circle cx="${SX}" cy="${SY}" r="${SR * 2}" fill="url(#halo)"/>
<g clip-path="url(#above)"><g class="sun" mask="url(#bands)"><circle cx="${SX}" cy="${SY}" r="${SR}" fill="url(#sunfill)"/></g></g>
<path d="${far}" fill="#1a0835" stroke="${PINK}" stroke-opacity=".5" stroke-width="1" vector-effect="non-scaling-stroke"/>
</g>
<g class="right">
<path d="${ridgeD} L1150 ${HY} L560 ${HY} Z" fill="#14062c"/>
<g class="wire">${struts}<path d="${ridgeD}"/><path class="trace" d="${ridgeD}"/></g>
</g>
<rect class="haze" x="-2000" y="${HY - 70}" width="5000" height="110" fill="url(#hz)"/>
<rect x="-2000" y="${HY}" width="5000" height="2000" fill="#0b0320"/>
<g clip-path="url(#floor)" class="grid">
<g class="roll">${hz}</g>
<g>${rad}</g>
${pulses}
<rect x="-2000" y="${HY}" width="5000" height="400" fill="url(#floorfade)"/>
</g>
<line class="flare" x1="-2000" y1="${HY}" x2="3000" y2="${HY}" stroke="${HOT}" stroke-width="2.4" vector-effect="non-scaling-stroke"/>
</svg>`

const out = join(ROOT, 'hooks/looks/synthwave-sunset/scene.js')
writeFileSync(out, `// Generated: a striped sun setting on the left, wireframe mountains on the right,
// ASCII stars, a rolling neon grid with now-and-then light pulses.\nexport const SCENE = ${JSON.stringify(svg)}\n`)
console.log('synthwave-sunset', svg.length)
