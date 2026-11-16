// digital-rain scene generator. Run: node tools/scenes/digital-rain.mjs
// The falling-glyph rain as a slow, deep curtain hugging the right edge. The glyphs never move: each
// column is a fixed strip of half-width katakana, digits and a few letters, mirrored, and a drop of
// light runs down it, lighting the glyphs it passes and leaving them to fade. A pale head leads the
// drop. Three layers of columns sit at three depths (far: small, dim, slow). Inside a column a few
// glyphs change by dissolving into others. A faint green haze breathes behind the band. Rarely, a single
// column far out in the empty field lights once and falls, very dim, like a thought crossing.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

let seed = 20261116
const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
const f = n => +n.toFixed(1)
const W = 1600
const H = 1000

const GROUND = '#040a06'
const KANA = [...'ｦｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ']
const DIGITS = [...'0123456789']
const LATIN = [...'ZTHEKXRL']
// texture only: which glyph sits in which cell
const glyph = () => { const r = R(); return r < 0.74 ? KANA[Math.floor(R() * KANA.length)] : r < 0.95 ? DIGITS[Math.floor(R() * 10)] : LATIN[Math.floor(R() * LATIN.length)] }

// ── the three depths: font size, row step, glyph colour, fall time for the full height (s)
const LAYERS = {
  far: { fs: 11, step: 12.5, fill: '#2f9a55', head: '#9fe8b4', fall: 60 },
  mid: { fs: 15, step: 17, fill: '#36c463', head: '#c8ffd6', fall: 50 },
  near: { fs: 21, step: 23.5, fill: '#4fef80', head: '#eafff0', fall: 40 },
}

// ── the columns, placed by hand: x, depth, opacity (thinning toward the middle), the cycle between two
// drops (s, primes so no two columns ever line up again), where the drop is at t = 0 (0..1 of the
// cycle), the trail length (viewBox units), the glyph-dissolve cycle (s), and where the trail rests in
// the still (head height, viewBox units; null: dark in the still).
const COLS = [
  // near: five columns at the edge, the subject
  { x: 1572, d: 'near', o: 0.95, p: 53, ph: 0.12, L: 430, xf: 29, still: 560 },
  { x: 1524, d: 'near', o: 0.82, p: 61, ph: 0.55, L: 380, xf: 37, still: 300 },
  { x: 1473, d: 'near', o: 0.68, p: 59, ph: 0.83, L: 460, xf: 31, still: 770 },
  { x: 1425, d: 'near', o: 0.5, p: 71, ph: 0.34, L: 400, xf: 41, still: null },
  { x: 1367, d: 'near', o: 0.32, p: 67, ph: 0.66, L: 360, xf: 23, still: 440 },
  // mid
  { x: 1591, d: 'mid', o: 0.62, p: 73, ph: 0.71, L: 440, xf: 19, still: 230 },
  { x: 1549, d: 'mid', o: 0.6, p: 79, ph: 0.25, L: 400, xf: 43, still: 680 },
  { x: 1499, d: 'mid', o: 0.54, p: 67, ph: 0.04, L: 480, xf: 31, still: null },
  { x: 1450, d: 'mid', o: 0.48, p: 83, ph: 0.47, L: 420, xf: 37, still: 520 },
  { x: 1342, d: 'mid', o: 0.3, p: 89, ph: 0.18, L: 460, xf: 29, still: 640 },
]
// far: a finer, dimmer screen behind, from the edge to where the band dissolves
const FARX = [1597, 1584, 1561, 1541, 1518, 1494, 1470, 1447, 1423, 1398, 1371, 1345, 1322, 1296, 1263, 1231, 1196]
const FARP = [83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167]
const FARXF = [17, 19, 23, 29, 31, 37, 41, 43, 47]
// every third: the desktop app stops a scene that animates too much type (2026-11-16)
FARX.forEach((x, i) => {
  if (i % 3 !== 0) return
  const t = (W - x) / (W - 1196) // 0 at the edge, 1 at the band's inner end
  COLS.push({ x, d: 'far', o: f(0.42 - t * 0.34), p: FARP[i], ph: (i * 0.618034) % 1, L: 380 + ((i * 7) % 5) * 40, xf: FARXF[i % FARXF.length], still: i % 3 === 1 ? 180 + ((i * 263) % 640) : null })
})
// the thoughts: one column far out in the empty field, at two places on two long cycles
const THOUGHTS = [
  { x: 372, d: 'mid', o: 0.2, p: 293, enter: 41, L: 420 },
  { x: 214, d: 'far', o: 0.16, p: 547, enter: 197, L: 460 },
]

// the waiting glyphs: every column is faintly there even when no drop passes
const RESIDUE = { far: 0.06, mid: 0.08, near: 0.1 }

let css = ''
let defs = ''
let body = ''
const kfs = new Set()
const kf = (name, b) => { if (!kfs.has(name)) { kfs.add(name); css += `@keyframes ${name}{${b}}\n` } }

// a column's glyphs: a stable strip, and two alternates (A, B) at about one cell in five, crossfaded
function strip(d, n) {
  const { step } = LAYERS[d]
  const st = [], a = [], b = []
  for (let r = 0; r < n; r++) {
    const y = f(r * step)
    if (R() < 0.2) { a.push([glyph(), y]); b.push([glyph(), y]) } else st.push([glyph(), y])
  }
  const t = cells => cells.length ? `<text x="${cells.map(() => 0).join(' ')}" y="${cells.map(c => c[1]).join(' ')}">${cells.map(c => c[0]).join('')}</text>` : ''
  return { st: t(st), a: t(a), b: t(b) }
}

// the drop's path: from above the top (head at -20) to past the foot, over `fall` of the cycle
function drop(c, i, thought) {
  const { step, fall } = LAYERS[c.d]
  const y0 = -20, y1 = H + c.L + 40
  const F = (fall * (y1 - y0)) / (H + 380) // the same speed for every column of a depth
  const share = Math.min(0.92, F / c.p)
  const name = `dr${i}`
  kf(name, `0%{transform:translateY(${y0}px)}${f(share * 100)}%,100%{transform:translateY(${y1}px)}`)
  const delay = thought ? c.enter - c.p : -c.ph * c.p
  css += `.${name}{animation:${name} ${c.p}s linear infinite ${f(delay)}s}\n`
  // in the still, the head rests at `still` (or the drop is gone)
  const rest = c.still == null ? y1 : c.still
  return { name, rest, step }
}

function column(c, i, thought = false) {
  const L0 = LAYERS[c.d]
  const n = Math.ceil(H / L0.step) + 1
  const g = strip(c.d, n)
  const { name, rest, step } = drop(c, i, thought)
  // masks: the trail (long, rising from nothing to full at the head) and the head (a short bright band)
  defs += `<mask id="t${i}" maskUnits="userSpaceOnUse" x="-20" y="-40" width="40" height="${H + 80}"><rect class="${name}" transform="translate(0 ${rest})" x="-20" y="${-c.L}" width="40" height="${f(c.L + step * 0.6)}" fill="url(#trail)"/></mask>`
  const hd = thought ? '' : `<mask id="h${i}" maskUnits="userSpaceOnUse" x="-20" y="-40" width="40" height="${H + 80}"><rect class="${name}" transform="translate(0 ${rest})" x="-20" y="${f(-step * 2.2)}" width="40" height="${f(step * 2.8)}" fill="url(#head)"/></mask>`
  defs += hd
  const xfA = `animation:xa ${c.xf}s ease-in-out infinite ${f(-R() * c.xf)}s`
  const glyphs = `${g.st}<g class="ga" style="${xfA}">${g.a}</g><g class="gb" style="${xfA.replace('xa', 'xb')}">${g.b}</g>`
  defs += `<g id="c${i}">${glyphs}</g>`
  const glow = !thought && c.d !== 'far' ? `<g class="${name} hg" transform="translate(0 ${rest})"><ellipse cy="${f(-step * 0.4)}" rx="${f(L0.fs * 1.6)}" ry="${f(L0.fs * 3.2)}" fill="url(#glow)"/></g>` : ''
  const residue = thought ? '' : `<use href="#c${i}" fill="${L0.fill}" opacity="${RESIDUE[c.d]}"/>`
  return `<g transform="translate(${c.x} 0) scale(-1 1)" opacity="${c.o}" class="${c.d}">${residue}${glow}<use href="#c${i}" fill="${L0.fill}" mask="url(#t${i})"/>${thought ? '' : `<use class="hd" href="#c${i}" fill="${L0.head}" mask="url(#h${i})"/>`}</g>`
}

// draw far first, near last
const order = ['far', 'mid', 'near']
const groups = { far: '', mid: '', near: '' }
COLS.forEach((c, i) => { groups[c.d] += column(c, i) })
let thoughts = ''
THOUGHTS.forEach((c, k) => { thoughts += column(c, COLS.length + k, true) })
// before its first fall and between falls a thought is gone; under reduce motion it stays gone
const rain = order.map(d => `<g style="font-size:${LAYERS[d].fs}px">${groups[d]}</g>`).join('')

kf('xa', '0%,38%{opacity:1}50%,88%{opacity:0}100%{opacity:1}')
kf('xb', '0%,38%{opacity:0}50%,88%{opacity:1}100%{opacity:0}')
kf('breathe', '0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}')

const SHARED = `<linearGradient id="trail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".3" stop-color="#fff" stop-opacity=".26"/><stop offset=".72" stop-color="#fff" stop-opacity=".65"/><stop offset=".95" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity=".2"/></linearGradient>
<linearGradient id="head" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".62" stop-color="#fff" stop-opacity=".75"/><stop offset=".8" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="#7dffa8" stop-opacity=".16"/><stop offset="1" stop-color="#7dffa8" stop-opacity="0"/></radialGradient>
<radialGradient id="haze" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#0f4a24" stop-opacity=".5"/><stop offset=".35" stop-color="#0d3f1f" stop-opacity=".3"/><stop offset=".62" stop-color="#0b3519" stop-opacity=".11"/><stop offset=".84" stop-color="#0b3519" stop-opacity=".03"/><stop offset="1" stop-color="#0b3519" stop-opacity="0"/></radialGradient>
<linearGradient id="ground" x1="0" y1="0" x2="1" y2=".3"><stop offset="0" stop-color="${GROUND}"/><stop offset=".6" stop-color="#040b06"/><stop offset="1" stop-color="#061209"/></linearGradient>
<linearGradient id="vfadeG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".13" stop-color="#fff"/><stop offset=".7" stop-color="#fff"/><stop offset=".93" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="vfade" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#vfadeG)"/></mask>`

const style = `<style>
text{font-family:ui-monospace,Menlo,"SF Mono","Hiragino Sans","MS Gothic","Noto Sans Mono CJK JP",monospace;text-anchor:middle;dominant-baseline:central}
.gb{opacity:0}
.haze{opacity:.78;transform-box:fill-box;transform-origin:center;animation:breathe 71s ease-in-out infinite -20s}
${css}@media (prefers-reduced-motion:reduce){*{animation:none!important}.hd,.hg,.thought{display:none}}
</style>`

// Anchored to the right edge, centred in height: on a phone only the band shows, on a wide window the
// top and foot are cropped; the middle, where the words are, stays dark.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMid slice">
${style}
<defs>${SHARED}
${defs}</defs>
<rect width="${W}" height="${H}" fill="${GROUND}"/>
<ellipse class="haze" cx="1560" cy="470" rx="340" ry="540" fill="url(#haze)"/>
<g mask="url(#vfade)">${rain}<g class="thought" style="font-size:13px">${thoughts}</g></g>
</svg>`.replace(/\n\s*\n/g, '\n')

// ── the poster: the same band, still, with only the lit stretch of each near and mid trail
function posterCol(c, i) {
  if (c.still == null || c.d === 'far') return ''
  const { step, fs, fill, head } = LAYERS[c.d]
  let t = ''
  for (let y = 0; y <= H; y += step) {
    const k = (c.still - y) / c.L // 0 at the head, 1 at the tail
    if (k < -0.02 || k > 1) continue
    const a = k < 0.06 ? 1 : Math.max(0, 0.9 - k * 0.85)
    if (a < 0.06) continue
    t += `<text y="${f(y)}" fill="${k < 0.06 ? head : fill}" fill-opacity="${f(a)}">${glyph()}</text>`
  }
  return `<g transform="translate(${c.x} 0) scale(-1 1)" opacity="${c.o}" style="font-size:${fs}px">${t}</g>`
}
const posterRain = COLS.filter(c => c.d === 'mid').map(posterCol).join('') + COLS.filter(c => c.d === 'near').map(posterCol).join('')
const poster = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMid slice" width="320" height="180">
<style>text{font-family:ui-monospace,Menlo,"Hiragino Sans",monospace;text-anchor:middle;dominant-baseline:central}</style>
<defs><linearGradient id="ground" x1="0" y1="0" x2="1" y2=".3"><stop offset="0" stop-color="${GROUND}"/><stop offset="1" stop-color="#061209"/></linearGradient>
<radialGradient id="haze"><stop offset="0" stop-color="#0f4a24" stop-opacity=".6"/><stop offset="1" stop-color="#0b3519" stop-opacity="0"/></radialGradient></defs>
<rect width="${W}" height="${H}" fill="url(#ground)"/><ellipse cx="1560" cy="470" rx="340" ry="540" fill="url(#haze)"/>
${posterRain}
</svg>`.replace(/\n/g, '')

console.log(`digital-rain: ${svg.length} characters, poster ${poster.length}`)
if (poster.length >= 12000) throw new Error(`poster is ${poster.length} characters, over 12,000`)
if (svg.length >= 131072) throw new Error(`scene is ${svg.length} characters, over 131,072`)
writeFileSync(join(ROOT, 'hooks/looks/digital-rain/scene.js'),
  `// Generated by tools/scenes/digital-rain.mjs: a slow curtain of green glyph rain at the right edge.\nexport const SCENE = ${JSON.stringify(svg)}\nexport const POSTER = ${JSON.stringify(poster)}\n`)
