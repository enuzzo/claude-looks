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
for (let i = 0; i < 46; i++) {
  const x = f(R() * 1000), y = f(R() * 520)
  // keep the middle of the sky a little quieter
  if (x > 380 && x < 620 && y > 200 && R() < 0.6) continue
  const [a, b] = GLYPHS[Math.floor(R() * GLYPHS.length)]
  const size = f(9 + R() * 8), dur = f(11 + R() * 14), delay = f(-R() * 24)
  const dim = f(0.35 + R() * 0.5)
  stars += `<g class="st" style="--d:${dur}s;animation-delay:${delay}s;opacity:${dim}"><text x="${x}" y="${y}" font-size="${size}" class="ga">${a}</text><text x="${x}" y="${y}" font-size="${size}" class="gb" style="animation-delay:${delay}s">${b}</text></g>`
}

// ── sun on the left third: stripes that slowly sink
const SX = 290, SY = 590, SR = 165
let cuts = ''
for (let i = 0; i < 9; i++) cuts += `<rect x="${SX - SR - 10}" y="${f(SY - 40 + i * 26)}" width="${SR * 2 + 20}" height="${f(4 + i * 2)}"/>`

// ── the sun in glyphs: denser toward its heart, a halftone made of type
const SCW = 5.4, SCH = 9.9
let sunText = ''
for (let y = SY - SR; y <= SY + SR; y += SCH) {
  let line = '', x0 = null
  for (let x = SX - SR; x <= SX + SR; x += SCW) {
    const d = Math.hypot((x - SX) / SR, (y - SY) / SR)
    if (d > 1) { if (x0 !== null) line += ' '; continue }
    if (x0 === null) x0 = x
    const v = 1 - d * 0.75 + (R() - 0.5) * 0.12
    line += ' .:-=+*#%@'[Math.max(1, Math.min(9, Math.round(v * 9)))]
  }
  if (x0 !== null) sunText += `<text x="${f(x0)}" y="${f(y)}">${line.trimEnd()}</text>`
}

// ── wireframe mountains on the right: ridge + struts down to the base
const ridge = [[560, HY], [610, 600], [655, 615], [720, 548], [770, 590], [815, 520], [880, 585], [930, 560], [1000, 610], [1080, 590], [1150, HY]]
const ridgeD = 'M' + ridge.map(p => p.join(' ')).join(' L')
// the same ridge in glyphs: slope characters along it, a dust of dots below that thins toward the base
const MCW = 6, MCH = 11
const ridgeAt = x => { for (let i = 1; i < ridge.length; i++) { const [x1, y1] = ridge[i - 1], [x2, y2] = ridge[i]; if (x <= x2) return [y1 + ((y2 - y1) * (x - x1)) / (x2 - x1), (y2 - y1) / (x2 - x1)] } return [HY, 0] }
let mtText = ''
for (let y = 510; y < HY; y += MCH) {
  let line = ''
  for (let x = 560; x <= 1150; x += MCW) {
    const [ry, slope] = ridgeAt(x)
    if (y < ry - MCH / 2) line += ' '
    else if (y < ry + MCH / 2) line += Math.abs(slope) < 0.35 ? '_' : slope < 0 ? '/' : '\\'
    else line += R() < 0.5 * (1 - (y - ry) / (HY - ry + 1)) ? (R() < 0.3 ? ':' : '.') : ' '
  }
  mtText += `<text x="560" y="${f(y)}">${line.trimEnd()}</text>`
}
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
const PULSES = [[-3, 4], [5, 33]]
let pulses = ''
for (const [i, at] of PULSES) {
  const x2 = VX + i * 1120
  const dx = (x2 - VX) / 3200, len = 0.012 * 3200 // dash length along the line, in y
  const tx = f(dx * 360), ty = 360
  pulses += `<g class="pu" style="--tx:${tx}px;--ty:${ty}px;animation-delay:${at}s"><line x1="${VX}" y1="${HY}" x2="${f(VX + dx * len)}" y2="${f(HY + len)}"/></g>`
}

const style = `
text{font-family:ui-monospace,Menlo,Consolas,monospace;fill:#fbe8ff;white-space:pre}
.suntext text{font-size:9px;dominant-baseline:central;fill:url(#sunfillU)}.mtext text{font-size:10px;fill:${HOT};dominant-baseline:central}.mtext{opacity:.85}
.st{animation:tw var(--d) ease-in-out infinite}
@keyframes tw{0%,100%{opacity:.25}50%{opacity:1}}
.st .gb{opacity:0;animation:swap 23s steps(1) infinite}
.st .ga{animation:swap2 23s steps(1) infinite;animation-delay:inherit}
@keyframes swap{0%,70%{opacity:0}71%,100%{opacity:1}}
@keyframes swap2{0%,70%{opacity:1}71%,100%{opacity:0}}
.sunbands{animation:sink 38s linear infinite}
@keyframes sink{from{transform:translateY(0)}to{transform:translateY(26px)}}
.sun{animation:breathe 23s ease-in-out infinite}
@keyframes breathe{0%,100%{opacity:.93}50%{opacity:1}}
.roll{transform-box:view-box;transform-origin:${VX}px ${HY}px;animation:roll 17s linear infinite}
@keyframes roll{from{transform:scale(1)}to{transform:scale(1.38)}}
.grid line{stroke:${PINK};stroke-width:1.1;stroke-opacity:.75;vector-effect:non-scaling-stroke}
.pu{opacity:0;animation:pulse 61s cubic-bezier(.55,0,.9,.5) infinite}
.pu line{stroke:${CYAN};stroke-width:3;stroke-linecap:round;vector-effect:non-scaling-stroke;filter:url(#glow)}
@keyframes pulse{0%{opacity:0;transform:translate(0,0)}1%{opacity:.8}12%{opacity:.6;transform:translate(var(--tx),var(--ty))}13%,100%{opacity:0;transform:translate(var(--tx),var(--ty))}}
.wire{fill:none;stroke:${HOT};stroke-width:1.3;vector-effect:non-scaling-stroke;stroke-linejoin:round}
.wire line{stroke:${PINK};stroke-opacity:.45;stroke-width:1;vector-effect:non-scaling-stroke}
.trace{stroke:${CYAN};stroke-width:2;fill:none;stroke-dasharray:60 2000;stroke-dashoffset:60;opacity:0;animation:trace 67s ease-in-out infinite 12s;vector-effect:non-scaling-stroke;filter:url(#glow)}
@keyframes trace{0%{stroke-dashoffset:60;opacity:0}2%{opacity:.8}20%{stroke-dashoffset:-760;opacity:.8}22%,100%{stroke-dashoffset:-760;opacity:0}}
.shoot{opacity:0;animation:shoot 83s ease-out infinite 25s}
@keyframes shoot{0%{opacity:0;transform:translate(0,0)}.4%{opacity:.9}2.6%{opacity:0;transform:translate(-260px,120px)}100%{opacity:0;transform:translate(-260px,120px)}}
.flare{opacity:.35;animation:flare 71s ease-in-out infinite 20s}
@keyframes flare{0%,88%,100%{opacity:.35}93%{opacity:.9}}
.haze{animation:haze 37s ease-in-out infinite}
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
<linearGradient id="sunfillU" gradientUnits="userSpaceOnUse" x1="0" y1="${SY - SR}" x2="0" y2="${SY + SR}"><stop offset="0" stop-color="${SUN_TOP}"/><stop offset=".5" stop-color="#ff9a4a"/><stop offset="1" stop-color="${PINK}"/></linearGradient>
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
<g clip-path="url(#above)"><g class="sun" mask="url(#bands)"><g class="suntext" fill="url(#sunfillU)">${sunText}</g></g></g>
<path d="${far}" fill="#1a0835" stroke="${PINK}" stroke-opacity=".5" stroke-width="1" vector-effect="non-scaling-stroke"/>
</g>
<g class="right">
<path d="${ridgeD} L1150 ${HY} L560 ${HY} Z" fill="#14062c" opacity=".7"/>
<g class="mtext">${mtText}</g><g class="wire"><path class="trace" d="${ridgeD}"/></g>
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

// the poster: sky, the sun of type, the glyph ridge, a still grid; no stars or events
const poster = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" width="320" height="180">
<style>text{font-family:ui-monospace,Menlo,Consolas,monospace;white-space:pre;dominant-baseline:central}.s text{font-size:9px;fill:url(#sunfillU)}.m text{font-size:10px;fill:${HOT}}</style>
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#06021a"/><stop offset=".3" stop-color="#140834"/><stop offset=".5" stop-color="#2e0c55"/><stop offset=".6" stop-color="#6a1470"/><stop offset=".64" stop-color="#c2307e"/><stop offset=".641" stop-color="#12052a"/><stop offset="1" stop-color="#07021a"/></linearGradient>
<linearGradient id="sunfillU" gradientUnits="userSpaceOnUse" x1="0" y1="${SY - SR}" x2="0" y2="${SY + SR}"><stop offset="0" stop-color="${SUN_TOP}"/><stop offset=".5" stop-color="#ff9a4a"/><stop offset="1" stop-color="${PINK}"/></linearGradient>
<clipPath id="above"><rect x="-2000" y="-1000" width="5000" height="${HY + 1000}"/></clipPath></defs>
<rect x="-2000" y="-1000" width="5000" height="3000" fill="url(#sky)"/>
<g class="s" clip-path="url(#above)">${sunText}</g><g class="m" opacity=".85">${mtText}</g>
<g stroke="${PINK}" stroke-opacity=".7" stroke-width="1.6">${hz.slice(0, hz.length)}${rad}</g>
</svg>`.replace(/\n/g, '')
if (poster.length >= 12000) throw new Error(`poster is ${poster.length} characters`)

const out = join(ROOT, 'hooks/looks/synthwave-sunset/scene.js')
writeFileSync(out, `// Generated: a striped sun setting on the left, wireframe mountains on the right,
// ASCII stars, a rolling neon grid with now-and-then light pulses.\nexport const SCENE = ${JSON.stringify(svg)}\nexport const POSTER = ${JSON.stringify(poster)}\n`)
console.log('synthwave-sunset', svg.length, 'poster', poster.length)
