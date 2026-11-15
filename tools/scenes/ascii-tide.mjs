// ascii-tide scene generator. Run: node tools/scenes/ascii-tide.mjs
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

let seed = 424242
const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
const f = n => +n.toFixed(1)
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const RAMP = ' .,:-~=+*#'
const ch = v => RAMP[Math.max(0, Math.min(RAMP.length - 1, Math.round(v * (RAMP.length - 1))))]
const CW = 0.6 // monospace advance, in ems
const HY = 600 // horizon

// ── the sea: rows in perspective, each a seamless periodic wave that scrolls
let sea = ''
const ROWS = 22
let y = HY + 6
for (let r = 0; r < ROWS; r++) {
  const d = r / (ROWS - 1) // 0 far, 1 near
  const size = f(7 + d * d * 17)
  const P = 48 // chars per period: every harmonic divides it
  const n = Math.ceil(1000 / (size * CW)) + P + 2
  const ph = R() * 6.28, ph2 = R() * 6.28
  let s = ''
  for (let i = 0; i < n; i++) {
    const t = (i % P) / P * Math.PI * 2
    let v = 0.5 + 0.32 * Math.sin(t * 2 + ph) + 0.18 * Math.sin(t * 3 + ph2) + 0.1 * Math.sin(t * 8 + ph * 2)
    v = v * (0.35 + 0.65 * d) + (R() - 0.5) * 0.12
    s += ch(Math.max(0, v))
  }
  const shift = f(P * size * CW)
  const dur = f(26 - d * 16) // near rows move faster
  const dir = r % 2 ? 'sw' : 'sw2' // alternate drift, reads as chop
  const op = f(0.28 + d * 0.62)
  sea += `<text x="0" y="${f(y)}" font-size="${size}" class="${dir}" style="--s:-${shift}px;animation-duration:${dur}s;opacity:${op}">${esc(s)}</text>`
  y += size * 1.05
}

// ── moon, upper right: a shaded ASCII disc
const MX = 790, MY = 330, MS = 9 // centre, font size
const RP = 120 // radius in px
let moon = ''
const rows = Math.ceil(RP / MS), cols = Math.ceil(RP / (MS * CW))
for (let j = -rows; j <= rows; j++) {
  let s = ''
  for (let i = -cols; i <= cols; i++) {
    const nx = (i * MS * CW) / RP, ny = (j * MS) / RP
    const rr = nx * nx + ny * ny
    if (rr > 1) { s += ' '; continue }
    const z = Math.sqrt(1 - rr)
    let v = 0.2 + 0.8 * Math.max(0, -0.5 * nx - 0.3 * ny + 0.81 * z)
    const c1 = Math.hypot(nx + 0.25, ny + 0.2), c2 = Math.hypot(nx - 0.3, ny - 0.35), c3 = Math.hypot(nx + 0.1, ny - 0.55)
    if (c1 < 0.18 || c2 < 0.14 || c3 < 0.1) v -= 0.22
    if (rr > 0.9) v = Math.min(v, 0.5)
    s += ch(v)
  }
  moon += `<text x="${MX}" y="${f(MY + j * MS)}" font-size="${MS}" text-anchor="middle">${esc(s)}</text>`
}

// ── moon glow on the water: a column of brighter glyphs that shimmer
let glint = ''
for (let k = 0; k < 16; k++) {
  const gy = HY + 14 + Math.pow(k / 15, 1.6) * 360
  const w = 3 + k * 1.2
  const size = f(8 + (k / 15) ** 2 * 14)
  let s = ''
  for (let i = 0; i < w; i++) s += R() < 0.55 ? '-' : R() < 0.5 ? '=' : '~'
  glint += `<text x="${MX}" y="${f(gy)}" font-size="${size}" text-anchor="middle" class="gl" style="animation-delay:-${f(R() * 4)}s">${s}</text>`
}

// ── clouds: two ASCII wisps drifting across the sky
const cloud = (w, h) => {
  let out = []
  for (let j = 0; j < h; j++) {
    let s = ''
    for (let i = 0; i < w; i++) {
      const nx = (i / w - 0.5) * 2, ny = (j / h - 0.5) * 2
      const v = 1 - (nx * nx * 0.8 + ny * ny * 1.6) + Math.sin(i * 0.7 + j) * 0.12
      s += v > 0.55 ? (R() < 0.5 ? '~' : '-') : v > 0.25 ? (R() < 0.6 ? '.' : ' ') : ' '
    }
    out.push(s)
  }
  return out
}
const cloudG = (cx, cy, w, h, cls, dur, delay) =>
  `<g class="${cls}" style="animation-duration:${dur}s;animation-delay:${delay}s">` +
  cloud(w, h).map((s, j) => `<text x="${cx}" y="${cy + j * 11}" font-size="11">${esc(s)}</text>`).join('') + '</g>'
const clouds = cloudG(-300, 120, 44, 4, 'cl', 140, -30) + cloudG(-300, 300, 34, 3, 'cl', 190, -120)

// ── stars: ASCII, twinkling, kept out of the middle
let stars = ''
for (let i = 0; i < 46; i++) {
  const x = f(R() * 1000), sy = f(20 + R() * 480)
  if (x > 330 && x < 670 && sy > 160) continue
  const g = R() < 0.5 ? '.' : R() < 0.6 ? '+' : '*'
  stars += `<text x="${x}" y="${sy}" font-size="${f(9 + R() * 7)}" class="tw" style="animation-duration:${f(4 + R() * 7)}s;animation-delay:-${f(R() * 9)}s">${g}</text>`
}

// ── the rare event: a star falls into the sea, rings open where it lands
const drop = (x, sy, ly, cycle, delay) => {
  let rings = ''
  for (let k = 0; k < 3; k++) {
    let s = ''
    // a ring is an ellipse of glyphs, flattened by perspective
    const N = 28
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2
      s += `<text x="${f(Math.cos(a) * 60)}" y="${f(Math.sin(a) * 12)}" font-size="11" text-anchor="middle">${i % 3 ? 'o' : '.'}</text>`
    }
    rings += `<g class="ring" style="animation-duration:${cycle}s;animation-delay:${f(delay + 0.9 + k * 0.7)}s">${s}</g>`
  }
  return `<g transform="translate(${x} ${sy})"><g class="fall" style="--fy:${ly - sy}px;animation-duration:${cycle}s;animation-delay:${delay}s"><text font-size="16" text-anchor="middle">*</text></g></g>` +
    `<g transform="translate(${x} ${ly})">${rings}</g>`
}
const drops = drop(150, 330, 700, 19, 4) + drop(880, 260, 780, 27, 13)

// ── a scan line sweeps down now and then, brightening the glyphs it crosses
const scan = `<rect class="scan" x="-2000" y="-40" width="5000" height="40" fill="url(#scan)"/>`

const style = `
text{font-family:ui-monospace,Menlo,Consolas,monospace;fill:#bff7ec;white-space:pre}
.sw{animation:sw linear infinite}.sw2{animation:sw linear infinite reverse}
@keyframes sw{from{transform:translateX(0)}to{transform:translateX(var(--s))}}
.sea text{fill:#7fe3d4}
.moon text{fill:#e9fff8}
.moon{animation:moon 14s ease-in-out infinite}
@keyframes moon{0%,100%{opacity:.85}50%{opacity:1}}
.gl{fill:#f2fffb;animation:gl 3.2s steps(4) infinite}
@keyframes gl{0%{opacity:.9}25%{opacity:.35}50%{opacity:.75}75%{opacity:.2}100%{opacity:.9}}
.cl{opacity:.32;animation:cl linear infinite}
@keyframes cl{from{transform:translateX(0)}to{transform:translateX(1700px)}}
.tw{animation:tw ease-in-out infinite}
@keyframes tw{0%,100%{opacity:.2}50%{opacity:.95}}
.fall{opacity:0;animation:fall ease-in infinite}
@keyframes fall{0%{opacity:0;transform:translateY(0)}1%{opacity:1}5%{opacity:1;transform:translateY(var(--fy))}5.5%,100%{opacity:0;transform:translateY(var(--fy))}}
.fall text{fill:#ffffff}
.ring{opacity:0;transform-box:fill-box;transform-origin:center;animation:ring ease-out infinite}
.ring text{fill:#d8fff6}
@keyframes ring{0%{opacity:0;transform:scale(.15)}2%{opacity:.95}16%{opacity:0;transform:scale(1.9)}100%{opacity:0;transform:scale(1.9)}}
.scan{opacity:0;animation:scan 23s linear infinite 6s;mix-blend-mode:screen}
@keyframes scan{0%{opacity:0;transform:translateY(0)}1%{opacity:1}14%{opacity:1;transform:translateY(1080px)}15%,100%{opacity:0;transform:translateY(1080px)}}
@media (max-aspect-ratio:4/5){.moonpos{transform:translateX(-170px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.fall,.ring,.scan{opacity:0}}
`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" xml:space="preserve">
<style>${style}</style>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#030812"/><stop offset=".52" stop-color="#071a26"/><stop offset=".56" stop-color="#0b2a33"/><stop offset="1" stop-color="#030a12"/></linearGradient>
<radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#7fffe6" stop-opacity=".16"/><stop offset="1" stop-color="#7fffe6" stop-opacity="0"/></radialGradient>
<linearGradient id="scan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fffe6" stop-opacity="0"/><stop offset=".8" stop-color="#7fffe6" stop-opacity=".16"/><stop offset="1" stop-color="#b6fff1" stop-opacity=".3"/></linearGradient>
<linearGradient id="far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#071a26"/><stop offset="1" stop-color="#071a26" stop-opacity="0"/></linearGradient>
</defs>
<rect x="-2000" y="-1000" width="5000" height="3000" fill="url(#sky)"/>
<g>${stars}</g>
<g>${clouds}</g>
<g class="moonpos"><circle cx="${MX}" cy="${MY}" r="260" fill="url(#halo)"/><g class="moon">${moon}</g></g>
<g class="sea">${sea}</g>
<rect x="-2000" y="${HY}" width="5000" height="70" fill="url(#far)"/>
<g class="moonpos">${glint}</g>
${drops}
${scan}
</svg>`

const out = join(ROOT, 'hooks/looks/ascii-tide/scene.js')
writeFileSync(out, `// Generated: an ASCII sea under an ASCII moon; now and then a star falls in.\nexport const SCENE = ${JSON.stringify(svg)}\n`)
console.log('ascii-tide', svg.length)
