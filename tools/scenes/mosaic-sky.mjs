// mosaic-sky scene generator. Run: node tools/scenes/mosaic-sky.mjs
// A night sky drawn like a broadcast teletext page: every shape is a 2x2 bitmap
// per character cell, written with quadrant and half block glyphs.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

// prefix every selector (and keyframe name) with the root's class, so the scene can never touch the page around it
function scope(css, root) {
  // keyframe names get the root's name too
  const tag = root.slice(1)
  for (const [, k] of css.matchAll(/@keyframes ([\w-]+)/g))
    css = css.replace(new RegExp(`(@keyframes |animation:|animation-name:)${k}\\b`, 'g'), `$1${tag}-${k}`)
  let out = '', i = 0
  const walk = inKeyframes => {
    while (i < css.length) {
      const open = css.indexOf('{', i), close = css.indexOf('}', i)
      if (close !== -1 && (open === -1 || close < open)) { out += css.slice(i, close + 1); i = close + 1; return }
      if (open === -1) { out += css.slice(i); i = css.length; return }
      const sel = css.slice(i, open)
      i = open + 1
      if (sel.trim().startsWith('@keyframes')) { out += sel + '{'; walk(true) }
      else if (sel.trim().startsWith('@media')) { out += sel + '{'; walk(false) }
      else if (inKeyframes) { const end = css.indexOf('}', i); out += sel + '{' + css.slice(i, end + 1); i = end + 1 }
      else {
        const lead = sel.match(/^\s*/)[0]
        out += lead + sel.trim().split(',').map(s => `${root} ${s.trim()}`).join(',') + '{'
        const end = css.indexOf('}', i); out += css.slice(i, end + 1); i = end + 1
      }
    }
  }
  walk(false)
  return out
}

let seed = 19830401
const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
const f = n => +n.toFixed(2)

// the broadcast palette (plus the night itself)
const C = { b: '#3048e8', c: '#46e2f2', m: '#d453dc', y: '#f8d94a', w: '#eef1ff', r: '#ff5a6e', g: '#4be37a', k: '#0a0f44' }

const W = 1600, H = 1000 // viewBox
const CELL = 20, SUB = CELL / 2 // a character cell, and one mosaic pixel
// Menlo's block metrics: a full block spans 1.02em, its top 0.77em above the baseline.
// The glyphs are drawn a hair taller than the cell so rows meet without seams.
const FS = f((CELL + 0.6) / 1.0195)
const BASE = f(0.7695 * FS - 0.3)

// quadrant glyph from four bits: top-left, top-right, bottom-left, bottom-right
const Q = ' ▗▖▄▝▐▞▟▘▚▌▙▀▜▛█'
const glyph = (tl, tr, bl, br) => Q[(tl << 3) | (tr << 2) | (bl << 1) | br]

// A layer: a function (x, y) -> colour key or '' over a w x h pixel grid, drawn at (X, Y).
// One <text> per cell row per colour, trimmed, stretched to whole cells with textLength.
function draw(w, h, at, X, Y) {
  const keys = new Set()
  const px = []
  for (let y = 0; y < h; y++) {
    const row = []
    for (let x = 0; x < w; x++) {
      const k = at(x, y)
      row.push(k)
      if (k) keys.add(k)
    }
    px.push(row)
  }
  let out = ''
  for (const k of keys) {
    let rows = ''
    for (let cy = 0; cy < h / 2; cy++) {
      let s = ''
      for (let cx = 0; cx < w / 2; cx++) {
        const q = (dx, dy) => (px[cy * 2 + dy]?.[cx * 2 + dx] === k ? 1 : 0)
        s += glyph(q(0, 0), q(1, 0), q(0, 1), q(1, 1))
      }
      const a = s.length - s.trimStart().length
      const t = s.trim()
      if (!t) continue
      rows += `<text x="${X + a * CELL}" y="${f(Y + cy * CELL + BASE)}" textLength="${t.length * CELL}" lengthAdjust="spacingAndGlyphs">${t}</text>`
    }
    out += `<g class="${k}">${rows}</g>`
  }
  return out
}

// ── clouds: a union of ellipses on a seamless strip two screens wide
const PW = W / SUB // pixels in one period (one screen)
function bank({ puffs, floor = Infinity, edge = 'c', body = 'b', shade = '', under = '' }) {
  const inside = (x, y) => {
    if (y >= floor) return true
    for (const p of puffs) {
      let dx = (((x - p.x) % PW) + PW) % PW
      if (dx > PW / 2) dx -= PW
      if ((dx / p.rx) ** 2 + ((y - p.y) / p.ry) ** 2 <= 1) return true
    }
    return false
  }
  return (x, y) => {
    if (!inside(x, y)) return ''
    if (!inside(x, y - 1)) return edge
    if (under && !inside(x, y + 1)) return under
    if (shade && !inside(x, y - 2) && (x + y) % 2) return shade // a dithered second row under the edge
    return body
  }
}
// cumulus: a flat base with round heads on top, n of them spread over one period
function cumulus(n, y0, size) {
  const out = []
  for (let i = 0; i < n; i++) {
    const cx = (i + 0.2 + R() * 0.6) * (PW / n), w = size * (1.2 + R() * 0.8)
    out.push({ x: cx, y: y0, rx: w, ry: size * 0.32 })
    const heads = 2 + Math.floor(R() * 3)
    for (let j = 0; j < heads; j++) {
      const r = size * (0.28 + R() * 0.3)
      out.push({ x: cx + (j / (heads - 1 || 1) - 0.5) * w * 1.1 + (R() - 0.5) * 3, y: y0 - r * 0.45, rx: r * 1.25, ry: r })
    }
  }
  return out
}
// a bank: a solid floor with a billowing row of heads, each crowned by smaller lumps
function ridge(n, y0, size) {
  const out = []
  for (let i = 0; i < n; i++) {
    const r = size * (0.5 + R() * 0.7), x = (i + R() * 0.5) * (PW / n)
    out.push({ x, y: y0, rx: r * (1.3 + R() * 0.5), ry: r })
    for (let j = 0; j < 2; j++) {
      const q = r * (0.35 + R() * 0.25)
      out.push({ x: x + (j ? 1 : -1) * r * (0.3 + R() * 0.5), y: y0 - r * (0.55 + R() * 0.25), rx: q * 1.3, ry: q })
    }
  }
  return out
}
const strip = (top, h, fn, dur) =>
  `<g class="drift" style="animation-duration:${dur}s">${draw(PW * 2, h, fn, 0, top)}</g>`

const clouds = {
  // high, far wisps: dim and slow
  highFar: strip(40, 14, bank({ puffs: cumulus(3, 8, 5), edge: 'b', body: 'k' }), 360),
  // high cumulus: cyan tops, blue bodies, magenta undersides
  high: strip(250, 22, bank({ puffs: cumulus(2, 14, 9), edge: 'c', body: 'b', shade: 'c', under: 'm' }), 230),
  // low banks over the horizon, one behind the other
  lowFar: strip(540, 24, bank({ puffs: cumulus(3, 15, 10), edge: 'b', body: 'k', under: 'm' }), 320),
  lowNear: strip(660, 34, bank({ puffs: cumulus(3, 20, 12).concat(ridge(5, 22, 5)), floor: 22, edge: 'c', body: 'b', shade: 'c' }), 180),
}

// ── the moon: a full mosaic moon with block craters, top right
const MX = 1450, MY = 262, MR = 9.5 // pixel-space radius
const MOON_W = 22
const craters = [[-3.5, -2, 2.4], [3, 2.5, 2.8], [-1, 5, 1.7], [4, -4, 1.5], [-5.5, 3, 1.2]]
const moon = draw(MOON_W, MOON_W, (x, y) => {
  const dx = x - MOON_W / 2 + 0.5, dy = y - MOON_W / 2 + 0.5
  const d = Math.hypot(dx, dy)
  if (d > MR) return ''
  const odd = (x + y) % 2
  if (d > MR - 1.2 && dx + dy < -6) return 'w' // a bright rim on the upper left
  for (const [cx, cy, r] of craters) if (Math.hypot(dx - cx, dy - cy) < r) return odd ? '' : 'y' // dithered seas
  if (d > MR - 2.2 && dx + dy > 6 && odd) return '' // the far limb falls into shade
  return 'y'
}, MX - MOON_W * SUB / 2, MY - MOON_W * SUB / 2)

// ── stars: single mosaic pixels (and a few crosses) that blink between two colours
let stars = ''
const QUAD = ['▘', '▝', '▖', '▗']
for (let i = 0; i < 70; i++) {
  const cx = Math.floor(R() * (W / CELL)), cy = Math.floor(R() * 30)
  const x = cx * CELL, y = cy * CELL
  const mid = x > 380 && x < 1220 && y > 260
  if (mid && R() < 0.85) continue
  if (Math.hypot(x - MX, y - MY) < 150) continue
  const kind = ['sa', 'sb', 'sc'][Math.floor(R() * 3)]
  stars += `<text x="${x}" y="${f(y + BASE)}" textLength="${CELL}" lengthAdjust="spacingAndGlyphs" class="${kind}" style="animation-duration:${f(3 + R() * 6)}s;animation-delay:-${f(R() * 9)}s">${QUAD[Math.floor(R() * 4)]}</text>`
}
// crosses: a 3x3 pixel plus, two cells wide
const cross = (x, y, d) =>
  `<g class="sx" style="animation-delay:-${d}s">` +
  draw(4, 4, (px, py) => ((px === 1 && py < 3) || (py === 1 && px < 3) ? 'w' : ''), x, y) + '</g>'
const crosses = cross(160, 120, 1) + cross(560, 60, 3.4) + cross(1220, 420, 2.2) + cross(90, 420, 5.1) + cross(1040, 30, 0.6)

// ── a distant city along the foot, static, with a few windows that come and go
const CW = W / SUB // pixels across
const heights = []
{
  let x = 0
  while (x < CW) {
    const w = 3 + Math.floor(R() * 6)
    const mid = x > CW * 0.3 && x < CW * 0.7
    const h = mid ? 3 + Math.floor(R() * 5) : 5 + Math.floor(R() * 12)
    for (let i = 0; i < w && x + i < CW; i++) heights[x + i] = h
    x += w
  }
}
const CITY_H = 18
const cityTop = H - CITY_H * SUB
const city = draw(CW, CITY_H, (x, y) => (CITY_H - y <= heights[x] ? 'k2' : ''), 0, cityTop)
const lit = new Set(), blink = new Set()
for (let x = 1; x < CW - 1; x += 2) {
  for (let y = CITY_H - heights[x] + 1; y < CITY_H - 1; y += 2) {
    if (heights[x - 1] !== heights[x] || heights[x + 1] !== heights[x]) continue
    const r = R()
    if (r < 0.1) lit.add(`${x},${y}`)
    else if (r < 0.16) blink.add(`${x},${y}`)
  }
}
const winAt = set => (x, y) => (set.has(`${x},${y}`) ? 'y' : '')
const windows = draw(CW, CITY_H, winAt(lit), 0, cityTop) +
  `<g class="win">${draw(CW, CITY_H, winAt(blink), 0, cityTop)}</g>`
// a red light on the tallest tower, flashing like a teletext flash attribute
let tx = 0
for (let x = 0; x < CW; x++) if (heights[x] > heights[tx]) tx = x
const bx = tx - (tx % 2), by = CITY_H - heights[tx] - 2
const beacon = `<g class="flash">${draw(2, 2, (x, y) => (x === tx % 2 && y === 1 ? 'r' : ''), bx * SUB, cityTop + by * SUB)}</g>`

// ── rare events
// a shooting star: a stepped mosaic streak, white head and a cooling tail
const STREAK = ['w', 'w', 'c', 'c', 'b', 'b', 'm', 'm']
const shoot = `<g transform="translate(860 40)"><g class="shoot">` +
  draw(16, 6, (x, y) => {
    // head at the lower left, the tail trailing up and to the right
    return Math.abs(x - (5 - y) * 2.6) < 1.4 ? STREAK[Math.min(7, Math.floor(x / 2))] : ''
  }, 0, 0) + '</g></g>'
// a page refresh: one bright cell row that wipes down the page, a row at a time
const wipe = `<rect class="wipe" x="0" y="-20" width="${W}" height="${CELL}" fill="url(#wipe)"/>`

const style = `
text{font-family:Menlo,Monaco,Consolas,"DejaVu Sans Mono",monospace;font-size:${FS}px;white-space:pre}
.b{fill:${C.b}}.c{fill:${C.c}}.m{fill:${C.m}}.y{fill:${C.y}}.w{fill:${C.w}}.r{fill:${C.r}}.k{fill:#1a2590}.k2{fill:#060925}
.drift{animation:drift linear infinite}
@keyframes drift{from{transform:translateX(0)}to{transform:translateX(-${W}px)}}
.far{opacity:.5}.far2{opacity:.7}.mid{opacity:.9}
.sa,.sb,.sc{animation:sa steps(1) infinite}.sb{animation-name:sb}.sc{animation-name:sc}
@keyframes sa{0%{fill:${C.w};opacity:.9}50%{fill:${C.c};opacity:.7}}
@keyframes sb{0%{fill:${C.y};opacity:.85}50%{fill:${C.w};opacity:.5}}
@keyframes sc{0%{fill:${C.c};opacity:.6}60%{fill:${C.b};opacity:.9}}
.sx{animation:sx 7s steps(1) infinite}
@keyframes sx{0%{opacity:.95}70%{opacity:.35}}
.halo{animation:halo 12s ease-in-out infinite}
@keyframes halo{0%,100%{opacity:.75}50%{opacity:1}}
.win{animation:win 11s steps(1) infinite}
@keyframes win{0%{opacity:1}64%{opacity:0}}
.flash{animation:flash 2.4s steps(1) infinite}
@keyframes flash{0%{opacity:1}50%{opacity:.15}}
.recolor .c{animation:recolor 29s steps(1) infinite 12s}
@keyframes recolor{0%{fill:${C.c}}2%{fill:${C.w}}3%{fill:${C.m}}9%{fill:${C.w}}10%{fill:${C.c}}}
.shoot{opacity:0;animation:shoot 19s steps(1) infinite 5s}
@keyframes shoot{0%{opacity:1;transform:translate(0,0)}1%{transform:translate(-40px,20px)}2%{transform:translate(-80px,40px)}3%{transform:translate(-120px,60px)}4%{transform:translate(-160px,80px)}5%{transform:translate(-200px,100px);opacity:.6}6%,100%{opacity:0;transform:translate(-240px,120px)}}
.wipe{opacity:0;animation:wipe 24s steps(50) infinite 8s}
@keyframes wipe{0%{opacity:.9;transform:translateY(0)}12%{opacity:.9;transform:translateY(${H + 40}px)}12.01%,100%{opacity:0;transform:translateY(${H + 40}px)}}
@media (max-aspect-ratio:4/5){.moonpos{transform:translate(-530px,-140px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.shoot,.wipe{opacity:0}}
`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" class="msky" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xml:space="preserve">
<style>${scope(style, '.msky')}</style>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#04061e"/><stop offset=".5" stop-color="#080c34"/><stop offset="1" stop-color="#121a5e"/></linearGradient>
<radialGradient id="halo"><stop offset="0" stop-color="${C.y}" stop-opacity=".2"/><stop offset=".45" stop-color="${C.b}" stop-opacity=".1"/><stop offset="1" stop-color="${C.b}" stop-opacity="0"/></radialGradient>
<linearGradient id="wipe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.c}" stop-opacity="0"/><stop offset=".7" stop-color="${C.c}" stop-opacity=".06"/><stop offset=".85" stop-color="${C.c}" stop-opacity=".22"/><stop offset="1" stop-color="${C.c}" stop-opacity="0"/></linearGradient>
</defs>
<rect x="-400" y="-400" width="${W + 800}" height="${H + 800}" fill="url(#sky)"/>
<g>${stars}${crosses}</g>
<g class="moonpos"><circle class="halo" cx="${MX}" cy="${MY}" r="260" fill="url(#halo)"/>${moon}</g>
<g class="far">${clouds.highFar}</g>
<g class="recolor">${clouds.high}</g>
${shoot}
<g class="far2">${clouds.lowFar}</g>
<g class="mid">${clouds.lowNear}</g>
${city}${windows}${beacon}
${wipe}
</svg>`

const out = join(ROOT, 'hooks/looks/mosaic-sky/scene.js')
writeFileSync(out, `// Generated by tools/scenes/mosaic-sky.mjs: a teletext night sky in quadrant block glyphs.\nexport const SCENE = ${JSON.stringify(svg)}\n`)
console.log('mosaic-sky', svg.length)
