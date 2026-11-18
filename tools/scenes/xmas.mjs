// xmas scene generator. Run: node tools/scenes/xmas.mjs
// A snowy village at night, in glyphs. The picture is the owner's chosen composition (tools/scenes/xmas/
// reference.png, made for this look in the style of abyssal): a mosaic of characters, which this script reads
// cell by cell, at build time, into <text> lists, so the scene is that picture in type and nothing else.
// The picture is cut in two and each half laid in a band of the app that no panel covers (docs/DIRECTION.md,
// Layout): the cottages and the snowman on the left, between the sidebar and the conversation; the kawaii
// snowplow and the candy-cane lamps on the right, between the conversation and the right panel. The middle
// is night sky. Snow falls over everything, in three layers at three speeds, smooth and seamless (the fall
// loops by exactly one tile, the sideways sway is a separate slow ease); the fairy lights on the eaves
// glow up in turn, one string every 2.5 s, fading up and down, never all together.
import { readFileSync, writeFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const W = 1600, H = 1000
const f = n => +n.toFixed(1)
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
let seed = 20261225
const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)

// ── the picture: a PNG (8-bit RGB, not interlaced) read with zlib, no dependency
function readPng(file) {
  const b = readFileSync(file)
  let p = 8, w = 0, h = 0, ct = 0
  const idat = []
  while (p < b.length) {
    const len = b.readUInt32BE(p), type = b.toString('ascii', p + 4, p + 8), data = b.subarray(p + 8, p + 8 + len)
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; if (data[8] !== 8 || data[12] !== 0) throw new Error('reference: 8-bit, non-interlaced PNG only') }
    if (type === 'IDAT') idat.push(data)
    p += 12 + len
  }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 0
  if (!bpp) throw new Error('reference: RGB or RGBA PNG only')
  const raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, px = Buffer.alloc(h * stride)
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0, up = y ? px[(y - 1) * stride + x] : 0, c = y && x >= bpp ? px[(y - 1) * stride + x - bpp] : 0
      let v = src[x]
      if (ft === 1) v += a
      else if (ft === 2) v += up
      else if (ft === 3) v += (a + up) >> 1
      else if (ft === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c }
      px[y * stride + x] = v & 255
    }
  }
  return { w, h, at: (x, y) => { const i = (Math.min(h - 1, Math.max(0, y | 0)) * w + Math.min(w - 1, Math.max(0, x | 0))) * bpp; return [px[i], px[i + 1], px[i + 2]] } }
}
const REF = readPng(join(ROOT, 'tools/scenes/xmas/reference.png'))
const K = REF.w / 1586 // the reference is stored smaller than the 1586 × 992 original; regions below are in the original's pixels

const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
// The colour of a box of the picture (original pixels): the picture is itself glyphs on black, so a mean
// would wash every cell out with the dark between the strokes. A cell takes the colour of its brightest
// quarter of pixels (the glyph's own colour), and its light from how much of it is lit at all.
function sample(x0, y0, x1, y1) {
  const px = []
  for (let y = y0 * K; y < y1 * K; y += 1) for (let x = x0 * K; x < x1 * K; x += 1) px.push(REF.at(x, y))
  if (!px.length) return { c: [0, 0, 0], L: 0, cover: 0 }
  px.sort((a, b) => lum(b) - lum(a))
  const top = px.slice(0, Math.max(1, Math.ceil(px.length / 4)))
  const c = [0, 1, 2].map(i => top.reduce((s, p) => s + p[i], 0) / top.length)
  const cover = px.filter(p => lum(p) > 0.12).length / px.length
  return { c, L: lum(c), cover }
}
function hsv([r, g, b]) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let h = 0
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx / 255]
}

// ── the two halves of the picture and where each goes. src: a box of the original (x0, y0, x1, y1);
// at: where its top-left lands in the viewBox; scale: viewBox units per original pixel. Laid out for
// xMidYMax: the left band clear between the sidebar and the conversation runs about x 200 to 450, the
// right one, between the conversation and the right panel, x 1100 to 1350, at 1920 px with both open.
const PARTS = [
  { id: 'village', src: [0, 380, 700, 960], at: [112, 515], scale: 0.84 },
  { id: 'street', src: [985, 320, 1586, 960], at: [962, 500], scale: 0.78 },
]
// The picture is a grid of glyphs itself, one every 12 pixels or so, and its grid is read as it is:
// each output cell is one cell of the picture, so it takes one whole glyph (its colour, how much of the
// cell it fills) with the dark around it, crisp, instead of half a glyph and half the night. The pitch and
// where the grid starts are measured on each part (the picture's grid drifts a little across the frame).
const SKY_REF = [4, 13, 25] // the picture's night
const q = v => Math.min(255, Math.round(v / 40) * 40) // the poster's colours, to steps of 40
// a little more colour than the picture: away from grey, and a touch brighter
const GLYPH = 1.12 // a glyph's width over its cell's: the strokes nearly touch, as in the picture
const BRIGHT = 1.2 // finer cells catch more of the dark between the picture's strokes
const VIVID = 2 // measured against the picture: lit pixels' saturation 0.54 against its 0.57, value 0.51 against 0.50
// the push is strongest on colours already vivid and slight on the whites of the snow, which stay white;
// the amber of the windows and lamps gets less of it, or it turns to a flat yellow
const vivid = c => { const m = (c[0] + c[1] + c[2]) / 3, s0 = hsv(c)[1], h0 = hsv(c)[0], k = (h0 > 25 && h0 < 62 ? 1.35 : VIVID) ** Math.min(1, s0 / 0.45) ** 1.5; return c.map(v => Math.max(0, Math.min(255, (m + (v - m) * k) * BRIGHT))) }

// the grid of a box of the picture: its period and offset along x and y, by the strongest frequency of
// its brightness profile (a small discrete Fourier sweep, periods 6 to 20 px)
const TMIN = 7, TMAX = 10.5 // its glyphs are about 10 px apart; outside this the sweep finds beats, not the grid
function grid([x0, y0, x1, y1]) {
  const along = axis => {
    const n = axis === 'x' ? x1 - x0 : y1 - y0, prof = []
    for (let i = 0; i < n; i++) {
      let s = 0, m = 0
      for (let j = (axis === 'x' ? y0 : x0); j < (axis === 'x' ? y1 : x1); j += 2) { s += lum(axis === 'x' ? REF.at((x0 + i) * K, j * K) : REF.at(j * K, (y0 + i) * K)); m++ }
      prof.push(s / m)
    }
    const mean = prof.reduce((a, v) => a + v, 0) / n
    let best = [0, 12, 0]
    for (let T = TMIN; T <= TMAX; T += 0.05) {
      let re = 0, im = 0
      prof.forEach((v, i) => { const a = (2 * Math.PI * i) / T; re += (v - mean) * Math.cos(a); im += (v - mean) * Math.sin(a) })
      const mag = Math.hypot(re, im)
      if (mag > best[0]) best = [mag, T, Math.atan2(im, re)]
    }
    const [, T, ph] = best
    // the profile peaks at the glyphs' middles: a cell starts half a period before a peak
    const peak = ((((ph / (2 * Math.PI)) * T) % T) + T) % T
    return { T, start: (((peak - T / 2) % T) + T) % T }
  }
  return { x: along('x'), y: along('y') }
}

// finer than the picture's own grid: DIV cells across each of its glyphs, so smaller glyphs, finer edges
const DIV = 1.6 // 2 would pass the app's 131,072 characters; 1.6 is 116,000 and 3.2 ms
const cells = []
for (const part of PARTS) {
  const [sx0, sy0, sx1, sy1] = part.src, k = part.scale
  const g = grid(part.src)
  part.grid = g
  const tx = g.x.T / DIV, ty = g.y.T / DIV
  part.S = [tx * k, ty * k] // one cell, in viewBox units
  part.origin = [part.at[0] + g.x.start * k, part.at[1] + g.y.start * k]
  for (let j = 0, cy = sy0 + g.y.start; cy + ty <= sy1; cy += ty, j++) {
    for (let i = 0, cx = sx0 + g.x.start; cx + tx <= sx1; cx += tx, i++) {
      const s0 = sample(cx, cy, cx + tx, cy + ty)
      // the night sky shows through: what is no different from the picture's night
      if (Math.max(...s0.c.map((v, n) => Math.abs(v - SKY_REF[n]))) < 26) continue
      // the cut's edges fray: near the sides and top of a part, fewer cells survive
      const edge = Math.min(cx - sx0, sx1 - cx, cy - sy0) / 40
      if (edge < 1 && R() > edge) continue
      const c = vivid(s0.c), [hue, sat, val] = hsv(c), raw = hsv(s0.c)
      cells.push({ part: part.id, i, j, x: part.at[0] + (cx - sx0) * k, y: part.at[1] + (cy - sy0) * k, S: part.S, c, L: lum(c), cover: s0.cover, hue, sat, val, raw })
    }
  }
}
const FS = 10 // the poster's base size

// what each cell is, for light and motion: the fairy lights on the eaves (bright, saturated, not the amber
// of the windows nor the red of the snowman's scarf) twinkle; the windows breathe; the brightest glow.
for (const p of cells) {
  const amber = p.hue > 22 && p.hue < 55
  // fairy lights, judged on the picture's own colour: vivid and bright, pink to violet, green or yellow,
  // never the blue of the snow, the amber of the windows or the red of the scarf
  const [h0, s0, v0] = p.raw, fairyHue = (h0 > 275 && h0 < 340) || (h0 > 70 && h0 < 165) || (h0 > 52 && h0 < 66)
  p.role = p.part === 'village' && s0 > 0.38 && v0 > 0.42 && fairyHue && p.y < 900 ? 'fairy'
    : p.part === 'village' && amber && p.val > 0.6 ? 'window'
    : p.L > 0.78 || (p.sat > 0.5 && p.val > 0.55) ? 'detail'
    : 'texture'
}

// ── how it is drawn: every cell is a shape filled with a pattern of one glyph per cell, on its half's grid.
// A tile is drawn once and repeated, so thousands of cells cost what a handful would. (Measured on the
// bench: as <text>, under the falling snow, 2,300 glyphs cost 4 ms a frame; ten thousand finer ones, even
// gathered inside one large pattern tile, 12 ms. The app's limit is 5.56.) Colours are pooled per half
// by k-means into a small palette; each colour and glyph is one tile.
const hex = c => '#' + c.map(v => Math.round(Math.min(255, v)).toString(16).padStart(2, '0')).join('')
let patternDefs = '', nPattern = 0
const U = 10 // one cell, in the units shapes() draws in
function pool(ps, k) {
  if (!ps.length) return
  const part = PARTS.find(pt => pt.id === ps[0].part), [SW, SH] = part.S, [ox, oy] = part.origin
  const fs = f(Math.min(SW / 0.602 * GLYPH, SH * 1.25)) // the strokes nearly touch, as in the picture
  let cs = ps.filter((_, i) => i % Math.ceil(ps.length / k) === 0).slice(0, k).map(p => [...p.c])
  for (let it = 0; it < 12; it++) {
    const acc = cs.map(() => [0, 0, 0, 0])
    for (const p of ps) {
      let best = 0, bd = Infinity
      cs.forEach((c, j) => { const d = (c[0] - p.c[0]) ** 2 + (c[1] - p.c[1]) ** 2 + (c[2] - p.c[2]) ** 2; if (d < bd) { bd = d; best = j } })
      p.pool = best; const a = acc[best]; a[0] += p.c[0]; a[1] += p.c[1]; a[2] += p.c[2]; a[3]++
    }
    cs = cs.map((c, j) => acc[j][3] ? acc[j].slice(0, 3).map(v => v / acc[j][3]) : c)
  }
  // every cell of one colour has one glyph, from a small set chosen by what the colour is (the owner's
  // call): * for snow and ice (pale, hardly coloured), # for anything coloured or lit, + for the dark
  // (wood in shadow, glass, the road). Runs stay long and the file small. (A glyph chosen per cell, for its
  // light or for the edge it lies on, the way Acerola's ASCII shader does, breaks the runs: the scene grew
  // past 190,000 characters, over the app's 131,072, and the strokes read as noise at this size.)
  const fill = cs.map(c => { const [, sat, val] = hsv(c); return val < 0.34 ? '+' : sat < 0.32 && val > 0.5 ? '*' : '#' })
  for (const p of ps) p.ch = fill[p.pool]
  const ids = new Map()
  for (const p of ps) {
    const key = `${p.pool}|${p.ch}`
    if (!ids.has(key)) {
      const id = `p${nPattern++}`
      ids.set(key, id)
      // the tile is one cell of U × U units, in the cell-unit space shapes() draws in (see there)
      const u = U / SW
      patternDefs += `<pattern id="${id}" width="${U}" height="${U}" patternUnits="userSpaceOnUse"><text x="${f((U - 0.602 * fs * u) / 2)}" y="${f(U * 0.5 + fs * u * 0.36)}" style="fill:${hex(cs[p.pool])};font-size:${f(fs * u)}px;font-weight:700">${esc(p.ch)}</text></pattern>`
    }
    p.pid = ids.get(key)
  }
}
for (const part of PARTS) {
  pool(cells.filter(p => p.part === part.id && p.role === 'texture'), 20)
  pool(cells.filter(p => p.part === part.id && p.role !== 'texture'), 26)
}
// cells → for each half, a group in cell units (one cell is U × U, scaled to the half's cell), and in it
// one path per pattern: each run of cells along a row is a line stroked U wide with the pattern, from its
// first cell to its last. Whole numbers, relative moves: about ten characters a run.
function shapes(ps) {
  let out = ''
  for (const part of PARTS) {
    const mine = ps.filter(p => p.part === part.id)
    if (!mine.length) continue
    const [SW, SH] = part.S, by = new Map()
    for (const p of mine) { if (!by.has(p.pid)) by.set(p.pid, []); by.get(p.pid).push(p) }
    let g = ''
    for (const [id, list] of by) {
      list.sort((a, b) => a.j - b.j || a.i - b.i)
      let d = '', run = null, px = 0, py = 0
      const flush = () => {
        if (!run) return
        const x = run.i * U, y = run.j * U + U / 2
        d += `${d ? 'm' : 'M'}${x - px} ${y - py}h${run.n * U}`
        px = x + run.n * U; py = y
      }
      for (const p of list) {
        if (run && p.j === run.j && p.i === run.i + run.n) run.n++
        else { flush(); run = { i: p.i, j: p.j, n: 1 } }
      }
      flush()
      g += `<path d="${d}" stroke="url(#${id})" stroke-width="${U}"/>`
    }
    out += `<g transform="translate(${f(part.origin[0])} ${f(part.origin[1])}) scale(${+(SW / U).toFixed(4)} ${+(SH / U).toFixed(4)})" fill="none">${g}</g>`
  }
  return out
}

// the poster: a coarse still, as <text> (it is drawn once, not animated)
function textLists(ps, size) {
  const groups = new Map()
  for (const p of ps) {
    const h = '#' + p.c.map(v => q(v).toString(16).padStart(2, '0')).join('')
    if (!groups.has(h)) groups.set(h, [])
    groups.get(h).push(p)
  }
  let out = ''
  for (const [h, g] of groups) out += `<text fill="${h}" x="${g.map(p => f(p.x)).join(' ')}" y="${g.map(p => f(p.y + size * 0.8)).join(' ')}">${esc(g.map(p => p.ch).join(''))}</text>`
  return out
}

// ── snow: three sheets of flakes, each a pattern tile drawn once and slid down its own height, linear and
// endless, so the fall is smooth and seamless; nearer sheets have larger, brighter, faster flakes and sway
// a little sideways.
const SNOW = [
  { id: 'sf', tile: 220, n: 26, glyphs: '..·', fs: 7, fill: '#8fa9c9', op: 0.55, period: 46, drift: 14 },
  { id: 'sm', tile: 260, n: 16, glyphs: '·*+', fs: 9, fill: '#c4d6ee', op: 0.7, period: 30, drift: 26 },
  { id: 'sn', tile: 320, n: 9, glyphs: '*✱*', fs: 13, fill: '#eef5ff', op: 0.85, period: 19, drift: 40 },
]
const snowTile = s => {
  let t = ''
  for (let i = 0; i < s.n; i++) t += `<text x="${f(12 + R() * (s.tile - 24))}" y="${f(12 + R() * (s.tile - 24))}" fill-opacity="${f(0.5 + R() * 0.5)}">${s.glyphs[Math.floor(R() * s.glyphs.length)]}</text>`
  return `<pattern id="${s.id}" width="${s.tile}" height="${s.tile}" patternUnits="userSpaceOnUse"><g style="font-size:${s.fs}px;fill:${s.fill}">${t}</g></pattern>`
}

// ── the night
const SKY = '#040c18'
// the fairy lights: four strings that glow up in turn, one every 2.5 s, each fading up, holding and
// fading down over a few seconds of its 10, so the eaves always shimmer somewhere and never flash
const TWINKLE = [10, 10, 10, 10]

function scene() {
  const fairy = cells.filter(p => p.role === 'fairy'), windows = cells.filter(p => p.role === 'window'), still = cells.filter(p => p.role === 'detail'), plain = cells.filter(p => p.role === 'texture')
  const sets = TWINKLE.map(() => [])
  fairy.forEach(p => sets[Math.floor(R() * sets.length)].push(p))
  const bright = still.filter(p => p.L > 0.55), rest = still.filter(p => p.L <= 0.55)
  const style = `<style>
text{font-family:ui-monospace,Menlo,"SF Mono","DejaVu Sans Mono",Consolas,monospace;font-size:${FS}px;white-space:pre}
${SNOW.map(s => `.${s.id}{opacity:${s.op};animation:${s.id} ${s.period}s linear infinite}@keyframes ${s.id}{from{transform:translateY(${-s.tile}px)}to{transform:translateY(0)}}.${s.id}w{animation:${s.id}w ${f(s.period * 1.7)}s ease-in-out infinite alternate}@keyframes ${s.id}w{from{transform:translateX(${-s.drift / 2}px)}to{transform:translateX(${s.drift / 2}px)}}`).join('\n')}
${TWINKLE.map((t, i) => `.tw${i}{opacity:.15;animation:tw ${t}s ease-in-out infinite ${f(-i * t / TWINKLE.length)}s}`).join('')}
@keyframes tw{0%,55%,100%{opacity:.15}18%,30%{opacity:1}}
.win{animation:win 13s ease-in-out infinite}@keyframes win{0%,100%{opacity:1}50%{opacity:.82}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>`
  const bloom = `<filter id="bloom" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
  // the fall slides exactly one tile and starts over where it began: no seam. The sway is apart from it,
  // a slow ease back and forth, so nothing jumps when the fall loops (0.6.1 drifted sideways in the same
  // loop, and snapped back by the drift at every turn).
  const sheet = s => `<g class="${s.id}w"><g class="${s.id}"><rect x="-60" y="0" width="${W + 120}" height="${H + s.tile}" fill="url(#${s.id})"/></g></g>`
  const glowOf = part => `<g filter="url(#bloom)">${shapes(bright.filter(p => p.part === part))}</g>`
  // the drawing first (it fills the tiles), then the page around it
  const body = `${shapes([...plain, ...rest])}
${glowOf('village')}${glowOf('street')}
<g class="win">${shapes(windows)}</g>
<g filter="url(#bloom)">${sets.map((s, i) => `<g class="tw${i}">${shapes(s)}</g>`).join('')}</g>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">
${style}
<defs>${SNOW.map(snowTile).join('')}${patternDefs}${bloom}</defs>
<rect width="${W}" height="${H}" fill="${SKY}"/>
${sheet(SNOW[0])}
${body}
${SNOW.slice(1).map(sheet).join('')}
</svg>`.replace(/\n\s*\n/g, '\n')
  // the poster: the same picture on a coarser grid, still
  const coarse = cells.filter(p => p.i % Math.round(4 * DIV) === 0 && p.j % Math.round(3 * DIV) === 0)
  const poster = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" width="320" height="180"><style>text{font-family:ui-monospace,Menlo,monospace;font-size:${FS * 2}px}</style><rect width="${W}" height="${H}" fill="${SKY}"/>${textLists(coarse, FS * 2)}</svg>`
  return { svg, poster, counts: { cells: cells.length, patterns: nPattern, fairy: fairy.length, windows: windows.length, bright: bright.length } }
}

const { svg, poster, counts } = scene()
console.log(`xmas: ${svg.length} characters, poster ${poster.length},`, counts)
if (poster.length >= 12000) throw new Error('poster over 12,000 characters')
if (svg.length >= 131072) throw new Error(`scene is ${svg.length} characters, over 131,072`)
writeFileSync(join(ROOT, 'hooks/looks/xmas/scene.js'),
  `// Generated by tools/scenes/xmas.mjs: a snowy village at night in glyphs, read from tools/scenes/xmas/reference.png.\nexport const SCENE = ${JSON.stringify(svg)}\nexport const POSTER = ${JSON.stringify(poster)}\n`)
