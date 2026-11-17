// home-computer scene generator. Run: node tools/scenes/home-computer.mjs
// An 8-bit home computer of the C64 kind, left on late at night, in its own sixteen colours dimmed for
// the dark. The screen's light-blue border runs down the left edge, frayed into shade glyphs. At the top
// left, in its uppercase type, the machine's log of one evening: the start-up banner, READY., a LOAD
// typed in, PRESS PLAY ON TAPE, SEARCHING, FOUND MOONRISE, LOADING. While it loads, the border fills
// with slow raster stripes of the palette, and in the bottom-left corner a small picture made of
// quadrant blocks (a crescent moon over a still sea) arrives line by line in the interleaved order such
// machines drew their screens, first in one colour and then coloured in row by row. RUN: it holds, the
// moon's road shifts on the water, and once in a while a small sprite ship sails across. Before the
// cycle of 613 s closes the picture dissolves, the screen clears to a lone cursor, and the machine
// starts again. Everything switches (visibility, steps()), nothing fades: cheap to draw, and how the
// machine itself would show it.
import { writeFileSync } from 'node:fs'
import { inlineUses } from './inline-uses.mjs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

let seed = 20261117
const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
const f = n => +n.toFixed(2)
const pc = (s, C) => f((s / C) * 100) // seconds into a cycle, as a keyframe percentage
const W = 1600
const H = 1000
const FONT = 'Menlo,ui-monospace,"DejaVu Sans Mono",Consolas,monospace' // Menlo's blocks fill the cell exactly

// ── the colours: the machine's sixteen (as measured from the hardware), the screen blue taken down
// for night work. The ground is darkest away from the left edge, where the conversation sits.
const C64 = {
  black: '#000000', white: '#ffffff', red: '#813338', cyan: '#75cec8', purple: '#8e3c97', green: '#56ac4d',
  blue: '#2e2c9b', yellow: '#edf171', orange: '#8e5029', brown: '#553800', lred: '#c46c71', dgrey: '#4a4a4a',
  grey: '#7b7b7b', lgreen: '#a9ff9f', lblue: '#706deb', lgrey: '#b2b2b2',
}
// Two dresses: night (a crescent moon over a still sea) and day (the sun over the same sea, a few
// clouds, birds), the day one on a lighter blue, nearer the machine's own. Run without DRESS, the script
// runs itself once per dress and writes both into scene.js.
const DRESS = process.env.DRESS
const DAY = DRESS === 'day'
const GROUND = DAY ? ['#262380', '#1f1c6e', '#1b1962'] : ['#201d6e', '#18165a', '#141249']
const BORDER = DAY ? '#6c69e0' : '#5a57c8' // the light-blue border, a step down
const TYPE = DAY ? '#a3a0ff' : '#8b88f0' // the screen's light-blue type
const MONO = DAY ? '#5f5cd0' : '#4f4cb8' // the one colour a picture loads in, before its colours
const GLOW = DAY ? '#4c49c4' : '#3b38a8'
// ink names are the night's; by day the moon is the sun, the ghost a cloud, a star a bird
const INK = DAY
  ? { star: '#34318a', halo: '#5754c6', moon: C64.yellow, ghost: '#9a98c8', horizon: C64.cyan, refl: '#eef0a8', wave: '#4c96a0' }
  : { star: C64.lgrey, halo: '#3d3aa8', moon: '#e3e68c', ghost: '#34319a', horizon: C64.lblue, refl: '#c8cb66', wave: '#3b6f86' }

let css = ''
const kf = (name, body) => { css += `@keyframes ${name}{${body}}\n` }
// shown from `on` to `off` (seconds into the cycle), hidden the rest; with steps(1) a switch, never a fade
const shown = (name, on, off) => kf(name, on <= 0
  ? `0%{visibility:visible}${pc(off, C)}%,100%{visibility:hidden}`
  : `0%{visibility:hidden}${pc(on, C)}%{visibility:visible}${pc(off, C)}%,100%{visibility:hidden}`)

// ── the evening, in seconds of a cycle of C; the scene opens at OPEN, with the picture whole and holding
const C = 613
const OPEN = 400
const T_LOAD = 3, T_PLAY = 4, T_OK = 8, T_SEARCH = 9, T_FOUND = 15, T_LOADING = 17
const LOAD0 = 19, STEP = 3.1 // one pixel line every STEP s
const PH = 46
const LOADED = LOAD0 + (PH - 1) * STEP + 2 // ~160 s
const T_READY = LOADED + 1, T_RUN = LOADED + 4
const ATTR0 = T_RUN + 2, ATTR_STEP = 1.4
const GONE0 = 540, GONE_SPREAD = 30
const CLEAR = GONE0 + GONE_SPREAD + 4 // the screen clears; a lone cursor until the cycle starts again
const SHIP0 = 300, SHIP_T = 150 // the sprite ship's crossing

// ── the picture: 76 × 46 square pixels, drawn in quadrant blocks
const PW = 76
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map(r => r.map(v => (v + 0.5) / 16))
const dith = (x, y, d) => d > BAYER[y & 3][x & 3]
const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }
const MX = 50, MY = 11.5, MR = 8.6 // the moon
const CX = 54.2, CY = 8.4, CR = 7.8 // the shadow that makes it a crescent
const HZ = 29 // the horizon line
const STARS = [[7, 4], [18, 13], [27, 3], [35, 18], [62, 22], [65, 4], [11, 21], [60, 1], [41, 7], [3, 13]]
const SEA_W = 31 // half-width of the sea's vignette

const CLOUDS = [[17, 9, 9, 2.4], [29, 16, 7, 1.8], [64, 21, 6, 1.5]] // x, y, half-width, half-height
const BIRDS = [[23, 5], [32, 8], [27, 11]]
function daySky(x, y) {
  const ds = Math.hypot(x - MX, y - MY)
  if (ds <= 7) return 'moon'
  if (ds < 15) { const t = 1 - (ds - 7) / 8; if (dith(x, y, 0.3 * t * t)) return 'halo' }
  for (const [cx, cy, w, h] of CLOUDS) { const e = ((x - cx) / w) ** 2 + ((y - cy) / h) ** 2; if (e < 1 && dith(x, y, 1.15 - e)) return 'ghost' }
  for (const [bx, by] of BIRDS) if ((y === by && Math.abs(x - bx) === 1) || (y === by + 1 && x === bx)) return 'star'
  return null
}

// The picture has no frame: toward its edges its pixels thin out, in the same ordered dither, until
// only the ground is left, so it dissolves into the screen instead of sitting in a box. The moon (or
// the sun) is the heart of it and keeps every pixel.
function fade(x, y) {
  const r = Math.hypot((x - 40) / 42, (y - 24) / 27)
  return Math.max(0, Math.min(1, (1 - r) / 0.42))
}
function pixel(x, y, variant) {
  const ink = pixelRaw(x, y, variant)
  if (ink === null || ink === 'moon') return ink
  return dith(x, y, fade(x, y)) ? ink : null
}
function pixelRaw(x, y, variant) {
  const dm = Math.hypot(x - MX, y - MY), dc = Math.hypot(x - CX, y - CY)
  if (y < HZ && DAY) return daySky(x, y)
  if (y < HZ) {
    if (dm <= MR) return dc > CR ? 'moon' : dith(x, y, 0.22) ? 'ghost' : null // earthshine on the dark side
    if (dm < MR + 10) { const t = 1 - (dm - MR) / 10; if (dith(x, y, 0.27 * t * t)) return 'halo' }
    if (STARS.some(([sx, sy]) => sx === x && sy === y)) return 'star'
    return null
  }
  const ex = Math.abs(x - 35) / 32 // how far toward the picture's sides
  if (y === HZ) return dith(x, y, 1.7 - ex * 1.75) ? 'horizon' : null
  const k = y - HZ // depth below the horizon
  // the moon's road on the water: broken runs of light that narrow and thin with depth, in two
  // variants that take turns so the water seems to move
  const w = 8.5 - k * 0.12, RC = 47 // under the lit edge of the crescent
  const rx = Math.abs(x - RC)
  if (k % 2 === 0 && rx <= w + 1) {
    for (let j = 0; j < 3; j++) {
      const off = (j - 1) * w * 0.55 + (hash(j, y, 5 + variant) - 0.5) * 1.6
      const half = (1.1 + hash(j, y, 9 + variant) * 2.6) * (1 - k / 26) * (j === 1 ? 1.5 : 0.75)
      if ((j !== 1 || k > 9) && hash(j, y, 13 + variant) < 0.14 + k * 0.025) continue // a gap now and then, more with depth
      if (Math.abs(x - (RC + off)) <= half) return 'refl'
    }
  }
  // far swells: a dash here and there on every third line, fading to the sides
  if (k % 3 === 1 && variant === 0) {
    const seg = Math.floor((x + hash(1, y, 3) * 5) / 4)
    const fade = 1 - Math.pow(Math.abs(x - 35) / SEA_W, 2)
    if (fade > 0 && hash(seg, y, 11) < 0.42 * fade * (1 - k / 22) && rx > w + 2) return 'wave'
  }
  return null
}

const FS_P = 17, CW_P = FS_P * 0.602, SY_P = 0.602 // scaled vertically so a quadrant is square
const K = 0.78 // the picture's scale
// The picture sits low on the right, between the conversation and the right panel (the owner's choice,
// 2026-11-17): its right edge ~270 units in from the frame's, clear of the panel when it opens.
const PX = 1028, PY = 700 // the picture's top-left in the viewBox
const PIX = CW_P / 2 // the side of one pixel, in viewBox units
const QUAD = [[' ', '▝'], ['▘', '▀']] // top half: [left][right]
const QUAD_B = [[' ', '▗'], ['▖', '▄']]

// one pixel line → its texts, one per ink
function lineTexts(y, inks, variant) {
  const row = Math.floor(y / 2), q = y % 2 ? QUAD_B : QUAD
  let out = ''
  for (const ink of inks) {
    let s = ''
    for (let c = 0; c < PW / 2; c++) {
      const l = pixel(2 * c, y, variant) === ink ? 1 : 0
      const r = pixel(2 * c + 1, y, variant) === ink ? 1 : 0
      s += q[l][r]
    }
    const lead = s.length - s.trimStart().length
    s = s.trim()
    if (!s) continue
    out += `<text class="r${row}" x="${f(lead * CW_P)}" y="${f(row * FS_P)}" style="--c:${INK[ink]}">${s}</text>`
  }
  return out
}

// the order lines arrive in: the picture in thirds, and within a third every eighth line first
const order = Array.from({ length: PH }, (_, y) => y).sort((a, b) => (Math.floor(a / 16) - Math.floor(b / 16)) || (a % 8 - b % 8) || a - b)
const arrive = []
order.forEach((y, o) => { arrive[y] = LOAD0 + o * STEP })
const goneOrder = order.map(y => [y, R()]).sort((a, b) => a[1] - b[1]).map(([y]) => y)
const gone = []
goneOrder.forEach((y, o) => { gone[y] = GONE0 + (o / (PH - 1)) * GONE_SPREAD })

let picture = ''
for (let y = 0; y < PH; y++) {
  shown(`l${y}`, arrive[y], gone[y])
  const still = lineTexts(y, ['star', 'halo', 'ghost', 'moon', 'horizon', 'wave'], 0)
  const shA = lineTexts(y, ['refl'], 0), shB = lineTexts(y, ['refl'], 1)
  picture += `<g class="ln" style="animation-name:l${y}">${still}${shA ? `<g class="shA">${shA}</g>` : ''}${shB ? `<g class="shB">${shB}</g>` : ''}</g>`
}
// colour arrives a character row at a time, top to bottom, after RUN
for (let r = 0; r < PH / 2; r++) {
  const t = ATTR0 + r * ATTR_STEP
  kf(`a${r}`, `0%{fill:var(--m)}${pc(t, C)}%{fill:var(--c)}${pc(GONE0, C)}%,100%{fill:var(--m)}`)
  css += `.r${r}{animation:a${r} ${C}s steps(1) infinite ${-OPEN}s}`
}
css += '\n'

// ── the sprite: a small ship, 12 × 8 hi-res pixels, white sail and grey hull, across the sea once a cycle
const SHIP = [
  '.....#......',
  '.....##.....',
  '.....###....',
  '.....####...',
  '.....#####..',
  '.....#......',
  '.==========.',
  '..========..',
]
const shipPath = ch => {
  let d = ''
  SHIP.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === ch) d += `M${x} ${y}h1v1h-1z` })
  return d
}
const SX0 = 4, SX1 = PW - 16, SY = HZ - 6 // ship pixels: from, to, top (its hull rides on the horizon)
const shipSteps = SX1 - SX0 // one pixel a step, as a sprite moves
// one keyframe segment for the crossing, stepped a pixel at a time (steps() applies to each segment)
kf('ship', `0%,${pc(SHIP0, C)}%{transform:translateX(${f(SX0 * PIX)}px)}${pc(SHIP0 + SHIP_T, C)}%,100%{transform:translateX(${f(SX1 * PIX)}px)}`)
shown('shipOn', SHIP0, SHIP0 + SHIP_T)
const ship = `<g class="shipOn"><g class="ship" transform="translate(${f(SX0 * PIX)} 0)"><g transform="translate(0 ${f(SY * PIX)}) scale(${f(PIX)})"><path d="${shipPath('#')}" fill="${C64.lgrey}"/><path d="${shipPath('=')}" fill="${C64.grey}"/></g></g></g>`

// ── the log: the screen's type at the top of the open field, the picture well below it (the scene is cropped from the top on wide
// windows), 40 columns, one line every 18 units
const FS_T = 13, LH = 16, TX = 236, TY = 250 // at the top left, close to the sidebar, clear of the cropped top (wide windows lose up to ~150)
const LOG = [
  ['    **** HOME BASIC V2 ****', 0],
  [' 64K RAM SYSTEM  38911 BYTES FREE', 0],
  ['', 0],
  ['READY.', 0],
  ['LOAD', T_LOAD],
  ['', 0],
  ['PRESS PLAY ON TAPE', T_PLAY],
  ['OK', T_OK],
  ['', 0],
  ['SEARCHING', T_SEARCH],
  [DAY ? 'FOUND SEASIDE' : 'FOUND MOONRISE', T_FOUND],
  ['LOADING', T_LOADING],
  ['READY.', T_READY],
  ['RUN', T_RUN],
]
let log = ''
LOG.forEach(([line, on], i) => {
  if (!line) return
  shown(`t${i}`, on, CLEAR)
  log += `<text class="tl" style="animation-name:t${i}" y="${i * LH}">${line}</text>`
})
// the cursor: where the machine waits for a key; hidden while it is busy
// after RUN the cursor waits on the next line, blinking, while the picture holds
const CURSORS = [[4, 0, T_LOAD], [13, T_READY, T_RUN], [14, T_RUN + 3, CLEAR], [0, CLEAR, C]]
const cell = FS_T * 0.602
let cursor = ''
CURSORS.forEach(([row, on, off], i) => {
  shown(`c${i}`, on, off)
  cursor += `<rect class="cu" style="animation-name:c${i}" y="${f(row * LH - 1)}" width="${f(cell)}" height="${FS_T + 2}" fill="${TYPE}"/>`
})


// ── the border: the light-blue frame of the screen at the left edge, a solid core that frays into
// shades. While a picture loads it fills with raster stripes of the palette, rising slowly.
const FS_B = 9, CW_B = FS_B * 0.602, STEP_B = 9
const ROWSTR = '█'.repeat(8) + '▓▓▓▒▒▒░░'
const bandRows = (colors, n) => Array.from({ length: n }, (_, i) => `<text x="0" y="${f(i * STEP_B)}" fill="${colors(i)}">${ROWSTR}</text>`).join('')
const ROWS = Math.ceil(H / STEP_B) + 1
// one band of rest rows: one <text> per row, all one colour
const rest = bandRows(() => BORDER, ROWS)
// the stripes: the palette in runs of two to five rows, seeded, one tile that repeats
const STRIPE = [C64.lblue, C64.cyan, C64.purple, C64.yellow, C64.lgreen, C64.lred, C64.blue, C64.orange, C64.grey]
const stripeColors = []
while (stripeColors.length < 64) {
  const c = STRIPE[Math.floor(R() * STRIPE.length)], n = 2 + Math.floor(R() * 4)
  for (let i = 0; i < n; i++) stripeColors.push(c)
}
const TILE = stripeColors.length
const stripes = bandRows(i => stripeColors[i % TILE], ROWS + TILE)
kf('rise', `from{transform:translateY(0)}to{transform:translateY(${-TILE * STEP_B}px)}`)
shown('loadOn', T_LOADING, LOADED)
kf('loadOff', `0%{visibility:visible}${pc(T_LOADING, C)}%{visibility:hidden}${pc(LOADED, C)}%,100%{visibility:visible}`)

// the moon's road takes turns between two shapes on the water, every 6 s
kf('shA', '0%{visibility:visible}50%,100%{visibility:hidden}')
kf('shB', '0%{visibility:hidden}50%,100%{visibility:visible}')
kf('blink', '0%{visibility:visible}50%,100%{visibility:hidden}')

const cyc = `${C}s steps(1) infinite ${-OPEN}s`
const style = `<style>
svg{--m:${MONO}}
text{font-family:${FONT};white-space:pre;dominant-baseline:hanging}
.pic{opacity:.78}.pic text{font-size:${FS_P}px;fill:var(--c)}.band text{font-size:${FS_B}px}
.ln,.tl,.cu{animation-duration:${C}s;animation-timing-function:steps(1);animation-iteration-count:infinite;animation-delay:${-OPEN}s}
.tl{font-size:${FS_T}px;fill:${TYPE}}
.blink{animation:blink 1.8s steps(1) infinite}
.shA{animation:shA 12s steps(1) infinite}.shB{visibility:hidden;animation:shB 12s steps(1) infinite}
.rest{opacity:.8;animation:loadOff ${cyc}}.load{visibility:hidden;opacity:.46;animation:loadOn ${cyc}}
.rise{animation:rise ${f(TILE * 2.2)}s steps(${TILE}) infinite}
.shipOn{visibility:hidden;animation:shipOn ${cyc}}.ship{animation:ship ${C}s steps(${shipSteps}) infinite ${-OPEN}s}
.pos{transform-box:view-box;transform-origin:${PX}px ${f(PY + PH * PIX * K)}px}\n@media (max-aspect-ratio:3/4){.pos{transform:scale(1.22)}}
${css}@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>`

const DEFS = `<defs>
<linearGradient id="ground" x1="0" y1="0" x2="1" y2=".25"><stop offset="0" stop-color="${GROUND[0]}"/><stop offset=".3" stop-color="${GROUND[1]}"/><stop offset="1" stop-color="${GROUND[2]}"/></linearGradient>
<radialGradient id="phos"><stop offset="0" stop-color="${GLOW}" stop-opacity=".38"/><stop offset=".5" stop-color="#2a2790" stop-opacity=".13"/><stop offset="1" stop-color="#2a2790" stop-opacity="0"/></radialGradient>
<pattern id="scanP" width="20" height="${f(PIX)}" patternUnits="userSpaceOnUse"><rect width="20" height="${f(PIX * 0.26)}" fill="#0b0a2a"/></pattern>
</defs>`

const PIC_W = PW * PIX, PIC_H = PH * PIX // unscaled
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMax slice">
${style}
${DEFS}
<rect width="${W}" height="${H}" fill="url(#ground)"/>
<ellipse cx="${f(PX + PIC_W * K * 0.62)}" cy="${f(PY + PIC_H * K * 0.4)}" rx="330" ry="260" fill="url(#phos)"/>
<g class="band"><g class="rest">${rest}</g><g class="load"><g class="rise">${stripes}</g></g></g>
<g transform="translate(${TX} ${TY})">${log}<g class="blink">${cursor}</g></g>
<g class="pos"><g transform="translate(${PX} ${PY}) scale(${K})"><g class="pic" transform="scale(1 ${SY_P})">${picture}</g>${ship}
</g></g>
</svg>`.replace(/\n\s*\n/g, '\n')

// ── the poster: the screen at rest, the picture whole, no motion
let posterPic = ''
for (let y = 0; y < PH; y++) posterPic += lineTexts(y, ['star', 'halo', 'ghost', 'moon', 'horizon', 'wave', 'refl'], 0).replace(/ class="r\d+"/g, '').replace(/ style="--c:([^"]+)"/g, ' fill="$1"')
const posterLog = LOG.map(([line], i) => line ? `<text y="${i * LH}">${line}</text>` : '').join('')
const poster = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMax slice" width="320" height="180">
<style>text{font-family:${FONT};font-size:${FS_P}px;white-space:pre;dominant-baseline:hanging}.tl text{font-size:${FS_T}px;fill:${TYPE}}</style>
<defs><linearGradient id="ground" x1="0" y1="0" x2="1" y2=".25"><stop offset="0" stop-color="${GROUND[0]}"/><stop offset=".3" stop-color="${GROUND[1]}"/><stop offset="1" stop-color="${GROUND[2]}"/></linearGradient>
<radialGradient id="phos"><stop offset="0" stop-color="${GLOW}" stop-opacity=".38"/><stop offset="1" stop-color="#2a2790" stop-opacity="0"/></radialGradient>
<linearGradient id="fray" x1="0" y1="0" x2="1" y2="0"><stop offset=".5" stop-color="${BORDER}"/><stop offset="1" stop-color="${BORDER}" stop-opacity="0"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#ground)"/>
<ellipse cx="${f(PX + PIC_W * K * 0.62)}" cy="${f(PY + PIC_H * K * 0.4)}" rx="330" ry="260" fill="url(#phos)"/>
<rect width="${f(ROWSTR.length * CW_B)}" height="${H}" fill="url(#fray)" opacity=".8"/>
<g class="tl" transform="translate(${TX} ${TY})">${posterLog}<rect y="${f(14 * LH - 1)}" width="${f(cell)}" height="${FS_T + 2}" fill="${TYPE}"/></g>
<g transform="translate(${PX} ${PY}) scale(${K})"><g transform="scale(1 ${SY_P})">${posterPic}</g></g>
</svg>`.replace(/\n/g, '')

const SVG = inlineUses(svg), POSTER_SVG = inlineUses(poster)
if (POSTER_SVG.length >= 12000) throw new Error(`poster is ${POSTER_SVG.length} characters, over 12,000`)
if (SVG.length >= 131072) throw new Error(`scene is ${SVG.length} characters, over 131,072`)
if (DRESS) {
  process.stdout.write(JSON.stringify({ SVG, POSTER_SVG }))
} else {
  const { execFileSync } = await import('node:child_process')
  const me = fileURLToPath(import.meta.url)
  const run = d => JSON.parse(execFileSync(process.execPath, [me], { env: { ...process.env, DRESS: d }, maxBuffer: 1 << 26 }).toString())
  const night = run('night'), day = run('day')
  console.log(`home-computer: night ${night.SVG.length} characters, day ${day.SVG.length}, poster ${night.POSTER_SVG.length}; loaded at ${f(LOADED)} s, run at ${f(T_RUN)} s of ${C}`)
  writeFileSync(join(ROOT, 'hooks/looks/home-computer/scene.js'),
    `// Generated by tools/scenes/home-computer.mjs: an 8-bit computer loading a picture from tape, in block glyphs, by night and by day.\nexport const SCENE = ${JSON.stringify(night.SVG)}\nexport const SCENE_DAY = ${JSON.stringify(day.SVG)}\nexport const POSTER = ${JSON.stringify(night.POSTER_SVG)}\n`)
}
