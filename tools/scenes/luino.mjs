// luino scene generator. Run: node tools/scenes/luino.mjs
// A flat night of colour for a rainy winter at the computer: ink blue going to violet, a magenta haze low
// on the left and a cold cyan one high on the right, under a weave of ASCII so faint it is felt more than
// seen. And every so often, in the open bands beside the conversation, a few lines of code surface from the dark: they come
// in as noise, decode left to right, hold for a while, glitch once, scramble again and are gone. Each
// fragment on its own prime cycle, so they never meet the same way twice.
// Built to draw cheaply (docs/DIRECTION.md rule 9): the weave is a pattern tile, a fragment's
// pages are switched with visibility and steps(), everything hidden while away.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

let seed = 20261125
const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
const f = n => +n.toFixed(1)
const p3 = n => +n.toFixed(3)
// a slash next to a star reads as a CSS comment (/* or */) to the app's validator, which then refuses the
// whole scene: in any text such a star becomes a plus
const esc = s => s.replace(/\/\*/g, '/+').replace(/\*\//g, '+/').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const W = 1600, H = 1000
const FONT = 'ui-monospace,Menlo,"SF Mono","Hiragino Sans","DejaVu Sans Mono",Consolas,monospace'
const INK = '#0a0a1d' // surface-0 in palette.js: the field under the conversation
const PINK = '#ff7ac0', CYAN = '#7fe6ff', VIOLET = '#a98bff', DIM = '#6f6aa8'

let css = ''
const kf = (name, body) => { css += `@keyframes ${name}{${body}}\n` }

// ── the weave: a tile of faint glyphs on a grid of 12 × 16 units, about a quarter of the cells filled,
// in two tones. Drawn once, repeated over the whole field.
const CW = 12, CH = 16, TILE_C = 41, TILE_R = 23 // a large tile, primes of cells, so its repeat is hard to see
const WEAVE = '.:-+=*/\\|01<>'
const tones = [[], []]
for (let r = 0; r < TILE_R; r++) for (let c = 0; c < TILE_C; c++) {
  if (R() > 0.24) continue
  tones[R() < 0.75 ? 0 : 1].push([c * CW + CW / 2, r * CH + CH / 2, WEAVE[Math.floor(R() * WEAVE.length)]])
}
const tileText = (cs, fill, a) => `<text fill="${fill}" fill-opacity="${a}" x="${cs.map(c => c[0]).join(' ')}" y="${cs.map(c => c[1]).join(' ')}">${esc(cs.map(c => c[2]).join(''))}</text>`
const weaveTile = `<pattern id="weave" width="${CW * TILE_C}" height="${CH * TILE_R}" patternUnits="userSpaceOnUse"><g style="font-size:10px">${tileText(tones[0], '#8a84d6', 0.07)}${tileText(tones[1], PINK, 0.075)}</g></pattern>`

// ── the fragments: a few lines of code each, placed by hand in the open bands (docs/DIRECTION.md,
// Layout): the field beside the sidebar (270 to 550), the band between the conversation and the right
// panel (1150 to 1340), and two in the edge bands that panels cover. Each line has a colour of its own.
// The noise a line scrambles through: digits, katakana and the weave's own marks. Never @, ( or the
// brackets: a scene whose text held `@x` or the like drew nothing at all in the desktop app (2026-11-25).
const NOISE = [...'01*+=/\\<>:|アイウエオカキクケコサシスセソ']
// Written in Netmilk's voice (Vibemilk's docs/brand-voice.md and the studio's rotating phrases): a bit tech, a
// bit visual, a bit cheeky; milk, cookies and pixels.
const FRAGS = [
  { x: 290, y: 430, cycle: 31, first: 2, lines: [
    ['// netmilk.studio · build 42', DIM],
    ["const latte = await mungi.pixel", CYAN],
    ["if (latte.versato) mood = 'lol'", PINK],
    ['export default { latte, design }', VIOLET]] },
  { x: 1160, y: 300, cycle: 37, first: 8, lines: [
    ['for (const cookie of jar) {', PINK],
    ['  cookie.inzuppato = true', CYAN],
    ['}', PINK]] },
  { x: 1160, y: 470, cycle: 41, first: 14, lines: [
    ['gravity = undefined', CYAN],
    ['// indifferenti alla gravità', DIM]] },
  { x: 300, y: 760, cycle: 43, first: 20, lines: [
    ['$ netmilk --wake', VIOLET],
    ['> caffè ............ ok', DIM],
    ['> biscotti ......... ok', DIM],
    ['> siamo il glitch nel Matrix', PINK]] },
  { x: 1160, y: 640, cycle: 47, first: 26, lines: [
    ['01101011 01110101', CYAN],
    ['01100100 01101111!', CYAN],
    ['// non è un bug, è una feature', DIM]] },
  { x: 54, y: 250, cycle: 53, first: 32, lines: [
    ['↑ ↑ ↓ ↓ ← → ← → B A', PINK],
    ['> cheat: +1 mucca', DIM]] },
  { x: 1380, y: 860, cycle: 59, first: 38, lines: [
    ["milk.color = 'black'", CYAN],
    ['// the new black', DIM]] },
]
const LH = 15.5 // line height
// a fragment's life, in seconds from its start: it scrambles in over six pages while it rises out of the
// dark, holds, glitches once, holds, and scrambles out the same pages in reverse as it sinks back
const DECODED = [0, 0.18, 0.36, 0.54, 0.72, 0.88] // the share of each line decoded on each page
const N = DECODED.length, STEP = 0.12, HOLD_A = 4.4, GLITCH = 0.12, HOLD_B = 3.8
const IN = DECODED.map((_, k) => [k * STEP, (k + 1) * STEP])
const T_HOLD = N * STEP, T_GLITCH = T_HOLD + HOLD_A, T_HOLD2 = T_GLITCH + GLITCH, T_OUT = T_HOLD2 + HOLD_B
const OUT = DECODED.map((_, i) => [N - 1 - i, [T_OUT + i * STEP, T_OUT + (i + 1) * STEP]])
const LIFE = T_OUT + N * STEP
const FADE = 0.9 // the whole fragment rises out of the dark and sinks back, eased

// a visibility track: visible over the given spans of a cycle, hidden elsewhere
function track(name, cycle, spans) {
  const keys = ['0%{visibility:hidden}']
  for (const [a, b] of spans) keys.push(`${p3((a / cycle) * 100)}%{visibility:visible}`, `${p3((b / cycle) * 100)}%{visibility:hidden}`)
  kf(name, keys.join(''))
}
const scramble = (line, share) => [...line].map((ch, i) => (ch === ' ' ? ' ' : i < share * line.length ? ch : NOISE[Math.floor(R() * NOISE.length)])).join('')
const page = (fr, share) => fr.lines.map(([text, colour], i) => `<text x="${fr.x}" y="${fr.y + i * LH}" fill="${colour}">${esc(share >= 1 ? text : scramble(text, share))}</text>`).join('')

let fragSvg = ''
FRAGS.forEach((fr, n) => {
  const id = `f${n}`
  // the scramble pages, each shown on its way in and again on its way out (and the next to last in the
  // glitch)
  const pages = DECODED.map((share, k) => {
    const spans = [IN[k], OUT.find(o => o[0] === k)[1]]
    if (k === N - 2) spans.push([T_GLITCH, T_HOLD2])
    track(`${id}p${k}`, fr.cycle, spans)
    return `<g class="${id}p${k}">${page(fr, share)}</g>`
  }).join('')
  track(`${id}t`, fr.cycle, [[T_HOLD, T_GLITCH], [T_HOLD2, T_OUT]])
  // the settled text, with a block cursor after its last line
  const last = fr.lines[fr.lines.length - 1][0]
  const cursor = `<text x="${f(fr.x + (last.length + 0.6) * 6.32)}" y="${fr.y + (fr.lines.length - 1) * LH}" fill="${PINK}" fill-opacity=".7" class="cur">▌</text>`
  const delay = fr.first - fr.cycle
  for (let k = 0; k < N; k++) css += `.${id}p${k}{visibility:hidden;animation:${id}p${k} ${fr.cycle}s steps(1) infinite ${delay}s}`
  // the first fragment rests in view in the still (reduce motion); the others are away
  css += `.${id}t{${n === 0 ? '' : 'visibility:hidden;'}animation:${id}t ${fr.cycle}s steps(1) infinite ${delay}s}\n`
  // the rise and the sink: opacity eased over FADE seconds at each end of its life, still the rest of the cycle
  const q = t => p3((t / fr.cycle) * 100)
  kf(`${id}o`, `0%{opacity:0;animation-timing-function:ease-out}${q(FADE)}%{opacity:1}${q(LIFE - FADE)}%{opacity:1;animation-timing-function:ease-in}${q(LIFE)}%,100%{opacity:0}`)
  css += `.${id}o{animation:${id}o ${fr.cycle}s linear infinite ${delay}s}\n`
  fragSvg += `<g class="frag ${id}o">${pages}<g class="${id}t">${page(fr, 1)}${cursor}</g></g>`
})
if (LIFE > Math.min(...FRAGS.map(fr => fr.cycle))) throw new Error('a fragment lives longer than its cycle')

// ── never under the conversation. The panels are pixels and the scene scales with the window (xMinYMax
// slice: k = max(width / 1600, height / 1000)), so a fragment placed in scene units drifts toward the
// column on smaller or taller windows. For each band of window widths and of shapes (16:10 and wider,
// then two bands of taller windows down to 13:10), every fragment is moved (a translateX on its group) to
// where it clears the column and its 48 px of glass in the three states the owner works in (both panels
// open, the sidebar alone, neither; tools/qa/app-frame.mjs holds the geometry), with 16 px to spare,
// taking the band's worst scale; where no such place is left on screen it is hidden for that band.
// Windows taller than 13:10 and phones, where the column takes the middle of everything, show none.
const CHAR = 10.5 * 0.602, SPARE = 16, SIDEBAR = 236
const colLeft = w => w / 2 - 418 // both panels open: (236 + w - 296) / 2 - 340 - 48
const colRight = w => w / 2 + 506 // the sidebar alone: (236 + w) / 2 + 340 + 48
// shapes as width per 1000 of height: [lowest, highest, the media query that picks the band]
const SHAPES = [
  [1600, 1600, '(min-aspect-ratio:1600/1000)'],
  [1450, 1600, '(min-aspect-ratio:1450/1000) and (max-aspect-ratio:1599/1000)'],
  [1300, 1450, '(min-aspect-ratio:1300/1000) and (max-aspect-ratio:1449/1000)'],
]
let media = ''
for (const [lo, hi, shape] of SHAPES) {
  for (let w0 = 1000; w0 < 4000; w0 += 40) {
    const w1 = w0 + 40
    const kMax = w1 / lo, kMin = w0 / hi // the band's largest and smallest scale
    let rules = ''
    FRAGS.forEach((fr, n) => {
      const len = Math.max(...fr.lines.map(l => l[0].length)) * CHAR
      if (fr.x < 800) {
        // left of the column: its right end at most at the column's left edge, at the band's largest scale
        const max = (colLeft(w0) - SPARE) / kMax - len
        // one beside the sidebar may not slide under it, cut in half: hidden instead (236 px, the sidebar)
        const under = fr.x * kMin >= SIDEBAR && Math.min(max, fr.x) * kMin < SIDEBAR + 8
        if (max < 4 || under) rules += `.f${n}o{opacity:0!important}`
        else if (max < fr.x) rules += `.f${n}o{transform:translateX(${f(max - fr.x)}px)}`
      } else {
        // right of it: its left end at least at the column's right edge, at the band's smallest scale,
        // and its right end still on screen (the scene shows lo scene units across, at the least)
        const min = (colRight(w1) + SPARE) / kMin
        if (min + len > lo - 4) rules += `.f${n}o{opacity:0!important}`
        else if (min > fr.x) rules += `.f${n}o{transform:translateX(${f(min - fr.x)}px)}`
      }
    })
    if (rules) media += `@media (min-width:${w0}px) and (max-width:${w1 - 0.01}px) and ${shape}{${rules}}\n`
  }
}
media += `@media (max-width:999.99px),(max-aspect-ratio:1299/1000){.frag{opacity:0!important}}\n`

const style = `<style>
text{font-family:${FONT};white-space:pre}
.frag{font-size:10.5px}.frag text{fill-opacity:.62}.cur{animation:cur 1.2s ease-in-out infinite}
${css}${media}@keyframes cur{0%,100%{opacity:.15}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>`

const DEFS = `<linearGradient id="field" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${H}"><stop offset="0" stop-color="#07081a"/><stop offset=".45" stop-color="${INK}"/><stop offset=".8" stop-color="#110d27"/><stop offset="1" stop-color="#170d2c"/></linearGradient>
<radialGradient id="magenta" gradientUnits="userSpaceOnUse" cx="260" cy="1020" r="720"><stop offset="0" stop-color="#a8307f" stop-opacity=".2"/><stop offset=".45" stop-color="#6a2470" stop-opacity=".08"/><stop offset="1" stop-color="#5a2a80" stop-opacity="0"/></radialGradient>
<radialGradient id="cyan" gradientUnits="userSpaceOnUse" cx="1440" cy="60" r="640"><stop offset="0" stop-color="#2fb6d8" stop-opacity=".16"/><stop offset=".5" stop-color="#2a6aa8" stop-opacity=".06"/><stop offset="1" stop-color="#2a4a90" stop-opacity="0"/></radialGradient>`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMax slice">
${style}
<defs>${DEFS}${weaveTile}</defs>
<rect x="-200" y="-400" width="${W + 400}" height="${H + 400}" fill="url(#field)"/>
<rect x="-200" y="-400" width="${W + 400}" height="${H + 400}" fill="url(#magenta)"/>
<rect x="-200" y="-400" width="${W + 400}" height="${H + 400}" fill="url(#cyan)"/>
<rect x="-240" y="-416" width="${W + 480}" height="${H + 432}" fill="url(#weave)"/>
${fragSvg}
</svg>`.replace(/\n\s*\n/g, '\n')

// the poster: the field, the weave a little stronger so it reads small, and the first fragment settled
const poster = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMax slice" width="320" height="180">
<style>text{font-family:${FONT};white-space:pre}</style>
<defs>${DEFS}${weaveTile.replace(/fill-opacity="0\.0\d+"/g, 'fill-opacity=".2"')}</defs>
<rect width="${W}" height="${H}" fill="url(#field)"/><rect width="${W}" height="${H}" fill="url(#magenta)"/><rect width="${W}" height="${H}" fill="url(#cyan)"/>
<rect width="${W}" height="${H}" fill="url(#weave)"/>
<g style="font-size:30px">${FRAGS[0].lines.map(([t, c], i) => `<text x="290" y="${430 + i * 40}" fill="${c}">${esc(t)}</text>`).join('')}</g>
</svg>`.replace(/\n/g, '')

console.log(`luino: ${svg.length} characters, poster ${poster.length}; a fragment lives ${f(LIFE)} s`)
if (/\/\*|\*\//.test(svg.replace(/<style>[\s\S]*?<\/style>/, '')) || /\/\*|\*\//.test(poster)) throw new Error('a /* or */ in the scene: the app refuses it')
if (poster.length >= 12000) throw new Error(`poster is ${poster.length} characters, over 12,000`)
if (svg.length >= 131072) throw new Error(`scene is ${svg.length} characters, over 131,072`)
writeFileSync(join(ROOT, 'hooks/looks/luino/scene.js'),
  `// Generated by tools/scenes/luino.mjs: a flat night of colour under a faint ASCII weave, code surfacing now and then.\nexport const SCENE = ${JSON.stringify(svg)}\nexport const POSTER = ${JSON.stringify(poster)}\n`)
