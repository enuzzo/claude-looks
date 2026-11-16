// home-computer scene generator. Run: node tools/scenes/home-computer.mjs
// The memory of an 8-bit home computer loading from tape, late at night. Down the left edge runs a
// narrow band of raster stripes made of block glyphs, the colour of the tape's sound: a calm pilot tone
// most of the time, data while a picture loads. In the bottom-left corner a small picture made of
// quadrant blocks (a crescent moon over a still sea) loads line by line, in the interleaved order such
// machines drew their screens, first in one dim colour and then flooded with its own colours row by row.
// It holds for minutes, dissolves, the pilot tone swells, and it loads again, on a cycle of 613 s.
// A block cursor breathes beside it whenever the machine is idle.
import { writeFileSync } from 'node:fs'
import { inlineUses } from './inline-uses.mjs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

let seed = 20261116
const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
const f = n => +n.toFixed(2)
const pc = (s, C) => f((s / C) * 100) // seconds into a cycle, as a keyframe percentage
const W = 1600
const H = 1000
const FONT = 'Menlo,ui-monospace,"DejaVu Sans Mono",Consolas,monospace' // Menlo's blocks fill the cell exactly

// ── the colours: a night ground, a restrained 8-bit set dimmed to fit it
const GROUND = ['#0d0a26', '#100c2e', '#120d34']
const PILOT = ['#4f45a6', '#356f8f'] // violet and a dusty cyan
const DATA = ['#6f8bd6', '#9a7f45'] // light blue and ochre
const MONO = '#5f58a4' // the one colour a picture loads in, before its attributes
const INK = { star: '#b9b2ee', halo: '#4d46a0', moon: '#efe5bd', ghost: '#3a3486', horizon: '#8fb4ff', refl: '#dccb8e', wave: '#39408e' }

let css = ''
const kf = (name, body) => { css += `@keyframes ${name}{${body}}\n` }

// ── the loading cycle, in seconds; the scene opens at OPEN, with the picture whole and holding
const C = 613
const LOAD0 = 4, STEP = 3.1, FADE_IN = 4.5 // one pixel line every STEP s
const OPEN = 400

// ── the picture: 76 × 46 square pixels, drawn in quadrant blocks
const PW = 76, PH = 46
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map(r => r.map(v => (v + 0.5) / 16))
const dith = (x, y, d) => d > BAYER[y & 3][x & 3]
const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }
const MX = 50, MY = 11.5, MR = 8.6 // the moon
const CX = 54.2, CY = 8.4, CR = 7.8 // the shadow that makes it a crescent
const HZ = 29 // the horizon line
const STARS = [[7, 4], [18, 13], [27, 3], [35, 18], [62, 22], [65, 4], [11, 21], [60, 1], [41, 7], [3, 13]]
const SEA_W = 31 // half-width of the sea's vignette

function pixel(x, y, variant) {
  const dm = Math.hypot(x - MX, y - MY), dc = Math.hypot(x - CX, y - CY)
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
  // variants that dissolve into one another so the water seems to move
  const w = 8.5 - k * 0.12, RC = 47 // under the lit edge of the crescent
  const rx = Math.abs(x - RC)
  if (k % 2 === 0 && rx <= w + 1) {
    // two or three runs of light per line, set symmetrically about the road's centre and jittered
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
const K = 0.74 // the picture's scale: small enough to sit within a sidebar's width on a desktop
const PX = 32, PY = 640 // the picture's top-left in the viewBox
const PIX = CW_P / 2 // the side of one pixel, in viewBox units
const QUAD = [[' ', '▝'], ['▘', '▀']] // top half: [left][right]
const QUAD_B = [[' ', '▗'], ['▖', '▄']]

// one pixel line → its texts, one per ink; `cls` picks which inks
function lineTexts(y, inks, variant, extraCls = '') {
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
    out += `<text class="r${row}${extraCls}" x="${f(lead * CW_P)}" y="${f(row * FS_P)}" style="--c:${INK[ink]}">${s}</text>`
  }
  return out
}

// the order lines arrive in: the picture in thirds, and within a third every eighth line first
const order = Array.from({ length: PH }, (_, y) => y).sort((a, b) => (Math.floor(a / 16) - Math.floor(b / 16)) || (a % 8 - b % 8) || a - b)
const arrive = []
order.forEach((y, o) => { arrive[y] = LOAD0 + o * STEP })
const LOADED = LOAD0 + (PH - 1) * STEP + FADE_IN // ~148 s
// colour arrives a char row at a time, top to bottom, once every line is in
const ATTR0 = LOADED + 4, ATTR_STEP = 1.4, ATTR_FADE = 4
const HELD = ATTR0 + (PH / 2) * ATTR_STEP + ATTR_FADE // ~188 s
// then it holds, until the lines dissolve in a scattered order
const GONE0 = 520, GONE_SPREAD = 42, GONE_FADE = 12
const goneOrder = order.map(y => [y, R()]).sort((a, b) => a[1] - b[1]).map(([y]) => y)
const gone = []
goneOrder.forEach((y, o) => { gone[y] = GONE0 + (o / (PH - 1)) * GONE_SPREAD })

let picture = ''
for (let y = 0; y < PH; y++) {
  const a = arrive[y], d = gone[y]
  kf(`l${y}`, `0%,${pc(a, C)}%{opacity:0}${pc(a + FADE_IN, C)}%,${pc(d, C)}%{opacity:1}${pc(d + GONE_FADE, C)}%,100%{opacity:0}`)
  const still = lineTexts(y, ['star', 'halo', 'ghost', 'moon', 'horizon', 'wave'], 0)
  const shA = lineTexts(y, ['refl'], 0), shB = lineTexts(y, ['refl'], 1)
  picture += `<g class="ln" style="animation-name:l${y}">${still}${shA ? `<g class="shA">${shA}</g>` : ''}${shB ? `<g class="shB">${shB}</g>` : ''}</g>`
}
for (let r = 0; r < PH / 2; r++) {
  const t = ATTR0 + r * ATTR_STEP
  kf(`a${r}`, `0%,${pc(t, C)}%{fill:var(--m)}${pc(t + ATTR_FADE, C)}%,${pc(GONE0 + GONE_SPREAD + GONE_FADE, C)}%{fill:var(--c)}${pc(GONE0 + GONE_SPREAD + GONE_FADE + 1, C)}%,100%{fill:var(--m)}`)
  css += `.r${r}{animation:a${r} ${C}s linear infinite ${-OPEN}s}`
}
css += '\n'

// ── the band: raster stripes made of block glyphs, a solid core that frays into shades
const FS_B = 9, CW_B = FS_B * 0.602, STEP_B = 8.85
const ROWSTR = '█'.repeat(7) + '▓▓▓▒▒▒░░'
const bandRow = (y, color) => `<text x="0" y="${f(y)}" fill="${color}">${ROWSTR}</text>`
// pilot: an even rhythm, two rows of each colour
const PILOT_T = 4 * STEP_B
let pilotTile = ''
for (let i = 0; i < 4; i++) pilotTile += bandRow(i * STEP_B, PILOT[i < 2 ? 0 : 1])
// data: the bits of a line of text, each bit a pulse pair, a 0 short and a 1 long, after a sync
const MESSAGE = 'MOON OVER A STILL SEA '
const rows = [0, 0, 0, 0, 1, 1, 1, 1, 0, 1] // sync
for (const ch of MESSAGE) {
  for (let b = 7; b >= 0; b--) {
    const n = (ch.charCodeAt(0) >> b) & 1 ? 2 : 1
    for (let i = 0; i < n; i++) rows.push(0)
    for (let i = 0; i < n; i++) rows.push(1)
  }
  if (rows.length * STEP_B > 1060) break
}
const DATA_T = f(rows.length * STEP_B)
const dataTile = rows.map((c, i) => bandRow(i * STEP_B, DATA[c])).join('')

// the band's two voices share the loading cycle: data while a picture loads, the pilot tone the rest
// of the time, swelling in the last minute before a load
kf('pilotA', `0%{opacity:.85}${pc(LOAD0 + 2, C)}%{opacity:.08}${pc(LOADED - 2, C)}%{opacity:.08}${pc(LOADED + 10, C)}%,${pc(GONE0 + 30, C)}%{opacity:.46}${pc(C - 8, C)}%,100%{opacity:.85}`)
kf('dataA', `0%{opacity:0}${pc(LOAD0 + 2, C)}%,${pc(LOADED - 2, C)}%{opacity:.55}${pc(LOADED + 10, C)}%,100%{opacity:0}`)
// the cursor rests while the machine is busy loading
kf('idle', `0%{opacity:1}${pc(LOAD0, C)}%,${pc(HELD, C)}%{opacity:0}${pc(HELD + 3, C)}%,100%{opacity:1}`)

const PERIOD_PILOT = 11 // the pilot pattern rises one tile in 11 s (2.1 units/s)
const PERIOD_DATA = 367 // the data tile rises over 367 s (about 3 units/s)
kf('riseP', `from{transform:translateY(0)}to{transform:translateY(${-PILOT_T * 1}px)}`)
kf('riseD', `from{transform:translateY(0)}to{transform:translateY(${-DATA_T}px)}`)
kf('riseF', 'from{transform:translateY(0)}to{transform:translateY(-180px)}')
kf('blink', '0%,100%{opacity:.18}45%,60%{opacity:.85}')
kf('breathe', '0%,100%{opacity:.7;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}')
kf('scan', '0%,100%{opacity:.5}50%{opacity:.85}')
kf('shA', '0%,100%{opacity:1}50%{opacity:.15}')
kf('shB', '0%,100%{opacity:.15}50%{opacity:1}')

const style = `<style>
svg{--m:${MONO}}
text{font-family:${FONT};white-space:pre;dominant-baseline:hanging}
.pic text{font-size:${FS_P}px;fill:var(--c)}.band text{font-size:${FS_B}px}
.ln{animation-duration:${C}s;animation-timing-function:linear;animation-iteration-count:infinite;animation-delay:${-OPEN}s}
.shA{animation:shA 11s ease-in-out infinite}.shB{opacity:0;animation:shB 11s ease-in-out infinite}
.pilot{opacity:.46;animation:pilotA ${C}s linear infinite ${-OPEN}s}.data{opacity:0;animation:dataA ${C}s linear infinite ${-OPEN}s}
.rp{animation:riseP ${PERIOD_PILOT}s linear infinite}.rd{animation:riseD ${PERIOD_DATA}s linear infinite}.rf{animation:riseF 97s linear infinite}
.idle{animation:idle ${C}s linear infinite ${-OPEN}s}.cur{opacity:.85;animation:blink 1.9s ease-in-out infinite}
.glow{transform-box:fill-box;transform-origin:center;animation:breathe 47s ease-in-out infinite}
.scan{opacity:.6;animation:scan 29s ease-in-out infinite -7s}\n.pos{transform-box:view-box;transform-origin:${PX}px ${f(PY + PH * PIX * K)}px}\n@media (max-aspect-ratio:3/4){.pos{transform:scale(1.22)}}
${css}@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>`

const DEFS = `<defs>
<linearGradient id="ground" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${GROUND[0]}"/><stop offset=".6" stop-color="${GROUND[1]}"/><stop offset="1" stop-color="${GROUND[2]}"/></linearGradient>
<radialGradient id="phos"><stop offset="0" stop-color="#3b3396" stop-opacity=".42"/><stop offset=".5" stop-color="#2a2378" stop-opacity=".14"/><stop offset="1" stop-color="#2a2378" stop-opacity="0"/></radialGradient>
<linearGradient id="spill" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3c3494" stop-opacity=".3"/><stop offset="1" stop-color="#3c3494" stop-opacity="0"/></linearGradient>
<linearGradient id="fadeX" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
<linearGradient id="fadeX2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
<linearGradient id="fadeY" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset=".35" stop-color="#666"/><stop offset=".8" stop-color="#fff"/></linearGradient>
<linearGradient id="soft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5248b0" stop-opacity="0"/><stop offset=".5" stop-color="#5248b0" stop-opacity=".5"/><stop offset="1" stop-color="#5248b0" stop-opacity="0"/></linearGradient>
<mask id="mX" maskContentUnits="userSpaceOnUse"><rect width="${f(ROWSTR.length * CW_B)}" height="${H + 2000}" y="-1000" fill="url(#fadeX)"/></mask>
<mask id="mY" maskContentUnits="userSpaceOnUse"><rect width="400" height="${H}" fill="url(#fadeY)"/></mask>
<mask id="mS" maskContentUnits="userSpaceOnUse"><rect width="340" height="${H}" fill="url(#fadeX2)"/></mask>
<mask id="mL" maskContentUnits="userSpaceOnUse"><rect x="-20" y="-20" width="${f(PW * PIX + 40)}" height="${f(PH * PIX + 40)}" fill="#fff"/><rect class="scan" x="-20" y="-20" width="${f(PW * PIX + 40)}" height="${f(PH * PIX + 40)}" fill="url(#scanP)"/></mask>
<pattern id="pilotP" width="${f(ROWSTR.length * CW_B)}" height="${f(PILOT_T)}" patternUnits="userSpaceOnUse"><g class="band">${pilotTile}</g></pattern>
<pattern id="softP" width="260" height="180" patternUnits="userSpaceOnUse"><rect y="20" width="260" height="70" fill="url(#soft)"/><rect y="118" width="260" height="34" fill="url(#soft)"/></pattern>
<pattern id="scanP" width="20" height="${f(PIX)}" patternUnits="userSpaceOnUse"><rect width="20" height="${f(PIX * 0.28)}" fill="#000"/></pattern>
<g id="dataTile" class="band">${dataTile}</g>
</defs>`

const PIC_W = PW * PIX, PIC_H = PH * PIX // unscaled
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMax slice">
${style}
${DEFS}
<rect width="${W}" height="${H}" fill="url(#ground)"/>
<g mask="url(#mY)"><g mask="url(#mS)"><rect width="340" height="${H}" fill="url(#spill)"/><g class="rf"><rect width="340" height="${H + 180}" fill="url(#softP)" opacity=".2"/></g></g></g>
<g class="glow"><ellipse cx="${f(PX + PIC_W * K * 0.6)}" cy="${f(PY + PIC_H * K * 0.4)}" rx="320" ry="260" fill="url(#phos)"/></g>
<g mask="url(#mY)"><g mask="url(#mX)">
<g class="pilot"><g class="rp"><rect width="${f(ROWSTR.length * CW_B)}" height="${f(H + PILOT_T)}" fill="url(#pilotP)"/></g></g>
<g class="data"><g class="rd"><use href="#dataTile"/><use href="#dataTile" y="${DATA_T}"/></g></g>
</g></g>
<g class="pos"><g transform="translate(${PX} ${PY}) scale(${K})"><g mask="url(#mL)"><g class="pic" transform="scale(1 ${SY_P})">${picture}</g></g>
<g class="idle"><g class="cur"><rect x="${f(PIX * 8)}" y="${f(PIC_H + PIX * 2)}" width="${f(PIX * 2)}" height="${f(PIX * 3.3)}" fill="${INK.horizon}"/></g></g></g></g>
</svg>`.replace(/\n\s*\n/g, '\n')

// ── the poster: the picture whole, the pilot tone at rest, no motion
let posterPic = ''
for (let y = 0; y < PH; y++) posterPic += lineTexts(y, ['star', 'halo', 'ghost', 'moon', 'horizon', 'wave', 'refl'], 0).replace(/ class="r\d+"/g, '').replace(/ style="--c:([^"]+)"/g, ' fill="$1"')
let posterBand = ''
for (let y = 0, i = 0; y < H; y += STEP_B * 2, i++) posterBand += `<rect y="${f(y)}" width="${f(ROWSTR.length * CW_B)}" height="${f(STEP_B * 2)}" fill="${PILOT[i % 2]}"/>`
const poster = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMax slice" width="320" height="180">
<style>text{font-family:${FONT};font-size:${FS_P}px;white-space:pre;dominant-baseline:hanging}</style>
<defs><linearGradient id="ground" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${GROUND[0]}"/><stop offset="1" stop-color="${GROUND[2]}"/></linearGradient>
<radialGradient id="phos"><stop offset="0" stop-color="#3b3396" stop-opacity=".42"/><stop offset="1" stop-color="#2a2378" stop-opacity="0"/></radialGradient>
<linearGradient id="fadeX" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
<linearGradient id="fadeX2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
<linearGradient id="fadeY" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset=".35" stop-color="#666"/><stop offset=".8" stop-color="#fff"/></linearGradient>
<mask id="mX" maskContentUnits="userSpaceOnUse"><rect width="${f(ROWSTR.length * CW_B)}" height="${H}" fill="url(#fadeX)"/></mask>
<mask id="mY" maskContentUnits="userSpaceOnUse"><rect width="400" height="${H}" fill="url(#fadeY)"/></mask></defs>
<rect width="${W}" height="${H}" fill="url(#ground)"/>
<ellipse cx="${f(PX + PIC_W * K * 0.6)}" cy="${f(PY + PIC_H * K * 0.4)}" rx="320" ry="260" fill="url(#phos)"/>
<g mask="url(#mY)"><g mask="url(#mX)" opacity=".46">${posterBand}</g></g>
<g transform="translate(${PX} ${PY}) scale(${K})"><g transform="scale(1 ${SY_P})">${posterPic}</g>
<rect x="${f(PIX * 8)}" y="${f(PIC_H + PIX * 2)}" width="${f(PIX * 2)}" height="${f(PIX * 3.3)}" fill="${INK.horizon}" opacity=".85"/></g>
</svg>`.replace(/\n/g, '')

// the app draws nothing a <use> points at: every scene is written out in full
const SVG = inlineUses(svg), POSTER_SVG = inlineUses(poster)
console.log(`home-computer: ${SVG.length} characters, poster ${POSTER_SVG.length}; loaded at ${f(LOADED)} s, coloured at ${f(HELD)} s of ${C}`)
if (POSTER_SVG.length >= 12000) throw new Error('poster over 12,000 characters')
if (SVG.length >= 131072) throw new Error(`scene is ${SVG.length} characters, over 131,072`)
writeFileSync(join(ROOT, 'hooks/looks/home-computer/scene.js'),
  `// Generated by tools/scenes/home-computer.mjs: a picture loading from tape at night, in block glyphs.\nexport const SCENE = ${JSON.stringify(SVG)}\nexport const POSTER = ${JSON.stringify(POSTER_SVG)}\n`)
