// digital-rain scene generator. Run: node tools/scenes/digital-rain.mjs
// The falling-glyph rain as a slow, deep curtain hugging the right edge. Every column is faintly there,
// a strip of half-width katakana, digits and a few letters, mirrored, where now and then two glyphs
// take turns. Down it falls a drop of light: a short string of glyphs, brightest just behind its pale
// head, that steps down one row at a time, as a terminal would draw it. Three layers of columns sit at
// three depths (far: small, dim, slow). A faint green haze breathes behind the band. Rarely, a single
// column far out in the empty field lights once and falls, very dim, like a thought crossing.
// Built to draw cheaply (docs/DIRECTION.md rule 9): stepped motion, flat fills, no masks.
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
// every third far column: enough for depth (tools/qa/scenes.mjs keeps the frame cost in check)
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
let body = ''
const kfs = new Set()
const kf = (name, b) => { if (!kfs.has(name)) { kfs.add(name); css += `@keyframes ${name}{${b}}\n` } }

// One <text> holding a list of cells: [glyph, y] pairs, each glyph centred on x = 0.
const text = (cells, attrs = '') => cells.length ? `<text${attrs} x="${cells.map(() => 0).join(' ')}" y="${cells.map(c => f(c[1])).join(' ')}">${cells.map(c => c[0]).join('')}</text>` : ''

// A drop of light is a short string of glyphs that falls one row at a time (steps(), one step a row:
// cheap to draw, and how a terminal would show it). Its rows grow dimmer away from the head, in four
// bands, one <text> each with a flat fill. Brightness of each band, from just behind the head to the tail.
const BANDS = [[0.18, 1], [0.42, 0.62], [0.7, 0.34], [1, 0.14]]

function drop(c, i, thought) {
  const L0 = LAYERS[c.d]
  const { step, fall } = L0
  const rows = Math.round(c.L / step)
  const cells = []
  for (let r = 1; r <= rows; r++) cells.push([glyph(), -r * step])
  const bands = []
  let from = 0
  for (const [to, a] of BANDS) {
    const end = Math.round(to * rows)
    bands.push(text(cells.slice(from, end), ` fill="${L0.fill}" fill-opacity="${a}"`))
    from = end
  }
  const head = text([[glyph(), 0]], ` fill="${L0.head}"`)
  // the path: head from above the top to past the foot, a whole number of rows
  const y0 = -step, n = Math.ceil((H + c.L + step * 2) / step), y1 = y0 + n * step
  const F = (fall * (y1 - y0)) / (H + 380) // the same speed for every column of a depth
  const share = Math.min(0.92, F / c.p)
  const name = `dr${i}`
  kf(name, `0%{transform:translateY(${f(y0)}px)}${f(share * 100)}%,100%{transform:translateY(${f(y1)}px)}`)
  const delay = thought ? c.enter - c.p : -c.ph * c.p
  css += `.${name}{animation:${name} ${c.p}s steps(${n}) infinite ${f(delay)}s}\n`
  // the base state is the still: the head resting at `still`, or past the foot (gone)
  const rest = c.still == null || thought ? y1 : Math.round(c.still / step) * step
  return `<g class="${name}" transform="translate(0 ${f(rest)})">${bands.join('')}${head}</g>`
}

// The waiting glyphs: every column is faintly there even when no drop passes. A few cells hold two
// glyphs that take turns (visibility, stepped: a switch, never a fade).
function residue(c) {
  const { step, fill } = LAYERS[c.d]
  const still = [], a = [], b = []
  for (let y = 0; y <= H; y += step) {
    if (R() < 0.12) { a.push([glyph(), y]); b.push([glyph(), y]) } else still.push([glyph(), y])
  }
  const d = f(-R() * c.xf)
  return `<g fill="${fill}" opacity="${RESIDUE[c.d]}">${text(still)}${text(a, ` class="sw" style="animation-duration:${c.xf}s;animation-delay:${d}s"`)}${text(b, ` class="sw sb" style="animation-duration:${c.xf}s;animation-delay:${d}s"`)}</g>`
}

function column(c, i, thought = false) {
  return `<g transform="translate(${c.x} 0) scale(-1 1)" opacity="${c.o}">${thought ? '' : residue(c)}${drop(c, i, thought)}</g>`
}

// draw far first, near last
const order = ['far', 'mid', 'near']
const groups = { far: '', mid: '', near: '' }
COLS.forEach((c, i) => { groups[c.d] += column(c, i) })
let thoughts = ''
THOUGHTS.forEach((c, k) => { thoughts += column(c, COLS.length + k, true) })
const rain = order.map(d => `<g style="font-size:${LAYERS[d].fs}px">${groups[d]}</g>`).join('')

kf('sw', '0%{visibility:visible}50%{visibility:hidden}')
kf('breathe', '0%,100%{opacity:.55}50%{opacity:1}')

const SHARED = `<radialGradient id="haze" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#0f4a24" stop-opacity=".5"/><stop offset=".35" stop-color="#0d3f1f" stop-opacity=".3"/><stop offset=".62" stop-color="#0b3519" stop-opacity=".11"/><stop offset=".84" stop-color="#0b3519" stop-opacity=".03"/><stop offset="1" stop-color="#0b3519" stop-opacity="0"/></radialGradient>
<linearGradient id="top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GROUND}"/><stop offset="1" stop-color="${GROUND}" stop-opacity="0"/></linearGradient>
<linearGradient id="foot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GROUND}" stop-opacity="0"/><stop offset="1" stop-color="${GROUND}"/></linearGradient>`

const style = `<style>
text{font-family:ui-monospace,Menlo,"SF Mono","Hiragino Sans","MS Gothic","Noto Sans Mono CJK JP",monospace;text-anchor:middle;dominant-baseline:central}
.sw{animation:sw 30s steps(1) infinite}.sb{animation-direction:reverse}
.haze{opacity:.78;animation:breathe 71s steps(24) infinite -20s}
${css}@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>`

// Anchored to the right edge, centred in height: on a phone only the band shows, on a wide window the
// top and foot are cropped; the middle, where the words are, stays dark. The band fades out at its top
// and foot under two still veils of the ground colour (a mask over moving type costs far more).
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMid slice">
${style}
<defs>${SHARED}</defs>
<rect width="${W}" height="${H}" fill="${GROUND}"/>
<ellipse class="haze" cx="1560" cy="470" rx="340" ry="540" fill="url(#haze)"/>
${rain}<g style="font-size:13px">${thoughts}</g>
<rect width="${W}" height="${f(H * 0.13)}" fill="url(#top)"/>
<rect y="${f(H * 0.7)}" width="${W}" height="${f(H * 0.3)}" fill="url(#foot)"/>
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

const SVG = svg, POSTER_SVG = poster
console.log(`digital-rain: ${SVG.length} characters, poster ${POSTER_SVG.length}`)
if (POSTER_SVG.length >= 12000) throw new Error(`poster is ${POSTER_SVG.length} characters, over 12,000`)
if (SVG.length >= 131072) throw new Error(`scene is ${SVG.length} characters, over 131,072`)
writeFileSync(join(ROOT, 'hooks/looks/digital-rain/scene.js'),
  `// Generated by tools/scenes/digital-rain.mjs: a slow curtain of green glyph rain at the right edge.\nexport const SCENE = ${JSON.stringify(SVG)}\nexport const POSTER = ${JSON.stringify(POSTER_SVG)}\n`)
