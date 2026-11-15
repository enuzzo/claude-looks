// dot-matrix scene generator. Run: node tools/scenes/dot-matrix.mjs
// A motorway LED panel: a field of unlit dots (one SVG pattern), and lit dots drawn as
// zero-length round-capped path segments (fill and caps are inherited attributes: a selector
// would not reach the copies inside <use>), three strokes each for halo, body and hot core.
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

let seed = 1972
const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)

const W = 1600, H = 1000, P = 16 // viewBox and dot pitch: 100 x 62.5 dots
const COLS = W / P
const AMBER = '#ffa424', RED = '#ff4a36', GREEN = '#4dff86'

// ── helpers: shapes as dot lists in grid units
const fromRows = (rows, c0, r0) => {
  const out = []
  rows.forEach((s, r) => [...s].forEach((ch, c) => ch === '#' && out.push([c0 + c, r0 + r])))
  return out
}
const pathOf = dots => dots.map(([c, r]) => `M${c} ${r}h0`).join('')
let defs = '', n = 0
// a lit shape: one path, stroked three times
function led(dots, color, cls = '', style = '') {
  const id = `p${n++}`
  defs += `<path id="${id}" d="${pathOf(dots)}"/>`
  return `<g class="${cls}" stroke="${color}"${style ? ` style="${style}"` : ''}><use href="#${id}" class="h"/><use href="#${id}" class="d"/><use href="#${id}" class="hot"/></g>`
}

// ── top band, left: a speed-limit ring, no number
const ring = []
for (let r = -6; r <= 6; r++) for (let c = -6; c <= 6; c++) if (Math.abs(Math.hypot(c, r) - 5.3) < 0.8) ring.push([12 + c, 14 + r])
const ringG = `<g class="ringpos">${led(ring, RED, 'breathe')}${led([[12, 14]], AMBER, 'pip')}</g>`

// ── top band, middle: chevrons that light in sequence, left to right
const CHEV = ['##...', '.##..', '..##.', '...##', '..##.', '.##..', '##...']
let chevs = ''
for (let i = 0; i < 6; i++) chevs += led(fromRows(CHEV, 36 + i * 5, 11), AMBER, 'seq', `animation-delay:${(i * 0.45).toFixed(2)}s`)
const chevG = `<g class="chevpos">${chevs}</g>`

// ── top band, right: a hazard triangle outline, flanked by two alternating lanterns
const tri = []
const TX = 86, TY = 9
for (let r = 0; r < 10; r++) {
  if (r === 9) for (let c = -r; c <= r; c++) tri.push([TX + c, TY + r])
  else { tri.push([TX - r, TY + r]); if (r) tri.push([TX + r, TY + r]) }
}
const bang = [[TX, TY + 3], [TX, TY + 4], [TX, TY + 5], [TX, TY + 7]]
const lantern = (c, r) => [[c, r], [c + 1, r], [c, r + 1], [c + 1, r + 1]]
const triG = `<g class="tripos">${led(tri, AMBER)}${led(bang, AMBER, 'slow')}` +
  `${led(lantern(TX - 10, TY), AMBER, 'lan')}${led(lantern(TX + 9, TY), AMBER, 'lan', 'animation-delay:-1.1s')}</g>`

// ── bottom band: a slow ticker of abstract symbols (no letters), seamless over 100 dots
const SYM = [
  ['...#...', '..#.#..', '.#...#.', '#.....#', '.#...#.', '..#.#..', '...#...'], // diamond
  ['.....', '.###.', '#...#', '#.#.#', '#...#', '.###.', '.....'], // ringed dot
  ['#...', '##..', '###.', '####', '###.', '##..', '#...'], // play
  ['...#', '..##', '.###', '####', '.###', '..##', '...#'], // back
  ['#####', '.#.#.', '..#..', '.#.#.', '#####', '.....', '.....'].reverse(), // hourglass, low
  ['.......', '.......', '.##..##', '#..##..', '.......', '.......', '.......'], // wave
  ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'], // plus
  ['...', '...', '##.', '##.', '...', '...', '...'], // a single block
  ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'], // spark
  ['#.#.#.#', '.......', '#.#.#.#', '.......', '#.#.#.#', '.......', '#.#.#.#'], // dot field
  ['..#..', '.###.', '#####', '..#..', '..#..', '..#..', '.....'], // up arrow
  ['......', '##.##.', '.##.##', '..##.#', '.##.##', '##.##.', '......'], // double chevron
]
const TR = 41 // ticker top row
const tick = []
let col = 0
const order = []
while (true) {
  const s = SYM[Math.floor(R() * SYM.length)]
  const w = s[0].length
  if (col + w + 3 > COLS) break
  order.push([s, col])
  col += w + 3
}
for (const copy of [0, COLS]) for (const [s, c] of order) tick.push(...fromRows(s, c + copy, TR))
const tickG = `<g class="tick">${led(tick, AMBER)}</g>`
// thin rule lines framing the ticker, half lit
const rule = []
for (let c = 0; c < COLS; c += 2) rule.push([c, TR - 2], [c, TR + 8])
const ruleG = led(rule, AMBER, 'rule')

// ── bottom band, sides: lane signals (down arrow, diagonal arrow, cross)
const DOWN = ['....#....', '....#....', '....#....', '....#....', '#...#...#', '.#..#..#.', '..#.#.#..', '...###...', '....#....']
const DIAG = ['#........', '.#.......', '..#......', '...#.....', '....#...#', '.....#..#', '......#.#', '.......##', '....#####']
const CROSS = ['#.......#', '.#.....#.', '..#...#..', '...#.#...', '....#....', '...#.#...', '..#...#..', '.#.....#.', '#.......#']
const lanes = led(fromRows(DOWN, 4, 52), GREEN, 'lane') + led(fromRows(DIAG, 15, 52), AMBER, 'lane', 'animation-delay:-3s') +
  led(fromRows(CROSS, 87, 52), RED, 'lane', 'animation-delay:-5s')

// ── occasional flicker: a few stray dots that blip on once in a while
let blips = ''
for (let i = 0; i < 9; i++) {
  const c = Math.floor(R() * COLS), r = R() < 0.5 ? 4 + Math.floor(R() * 16) : 41 + Math.floor(R() * 18)
  blips += led([[c, r]], AMBER, 'blip', `animation-duration:${(7 + R() * 9).toFixed(1)}s;animation-delay:-${(R() * 9).toFixed(1)}s`)
}

// ── rare events
// a chevron train runs across the lower band
const MINI = ['#..', '.#.', '..#', '.#.', '#..']
const train = []
for (let i = 0; i < 5; i++) train.push(...fromRows(MINI, i * 4, 33))
const trainG = led(train, AMBER, 'train')
// a cluster pulses at the panel's edges: a core, then a ring that opens around it
const diamond = (c0, r0, rad) => {
  const out = []
  for (let r = -rad; r <= rad; r++) for (let c = -rad; c <= rad; c++) if (Math.abs(c) + Math.abs(r) === rad || (rad < 2 && Math.abs(c) + Math.abs(r) <= rad)) out.push([c0 + c, r0 + r])
  return out
}
const pulse = (c, r, d) =>
  led(diamond(c, r, 1), AMBER, 'pcore', `animation-delay:${d}s`) +
  led(diamond(c, r, 3), AMBER, 'pring', `animation-delay:${d + 0.35}s`) +
  led(diamond(c, r, 5), AMBER, 'pring2', `animation-delay:${d + 0.7}s`)
const pulses = `<g class="lpos">${pulse(6, 30, 11)}</g><g class="rpos">${pulse(93, 26, 25)}</g>`
// a full-row scan refresh: one row of dim lit dots steps down the panel
const scan = `<rect class="scan" x="0" y="0" width="${COLS}" height="1" fill="url(#lit)"/>`

const style = `
.h{stroke-width:1.5;opacity:.13}.d{stroke-width:.66}.hot{stroke-width:.3;stroke:#fff1cf;opacity:.5}
.tick{animation:tick 64s steps(${COLS}) infinite}
@keyframes tick{to{transform:translateX(-${COLS}px)}}
.seq{opacity:.22;animation:seq 6.5s ease-in-out infinite}
@keyframes seq{0%{opacity:.22}8%,55%{opacity:1}75%,100%{opacity:.22}}
.breathe{animation:breathe 9s ease-in-out infinite}
@keyframes breathe{0%,100%{opacity:.8}50%{opacity:1}}
.pip{opacity:.5}
.lan{animation:lan 2.2s steps(1) infinite}
@keyframes lan{0%{opacity:1}50%{opacity:.12}}
.slow{animation:breathe 4s ease-in-out infinite}
.lane{animation:breathe 11s ease-in-out infinite}
.rule{opacity:.35}
.blip{opacity:0;animation:blip linear infinite}
@keyframes blip{0%,93%{opacity:0}94%{opacity:.9}95%{opacity:.3}96%{opacity:.8}97%,100%{opacity:0}}
.train{opacity:0;animation:train 19s steps(60) infinite 3s}
@keyframes train{0%{opacity:1;transform:translateX(-22px)}22%{opacity:1;transform:translateX(${COLS + 2}px)}22.1%,100%{opacity:0;transform:translateX(${COLS + 2}px)}}
.pcore,.pring,.pring2{opacity:0;animation:pulse 27s ease-out infinite}
@keyframes pulse{0%{opacity:0}1%{opacity:1}6%{opacity:0}100%{opacity:0}}
.scan{opacity:0;animation:scan 23s steps(63) infinite 7s}
@keyframes scan{0%{opacity:1;transform:translateY(0)}14%{opacity:1;transform:translateY(63px)}14.1%,100%{opacity:0;transform:translateY(63px)}}
@media (max-aspect-ratio:4/5){.chevpos{display:none}.ringpos{transform:translate(29px,0)}.tripos{transform:translate(-27px,0)}.lpos{transform:translate(32px,0)}.rpos{transform:translate(-32px,0)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.train,.pcore,.pring,.pring2,.scan,.blip{opacity:0}}
`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" class="dmx" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<style>${scope(style, '.dmx')}</style>
<defs>
<pattern id="off" width="1" height="1" patternUnits="userSpaceOnUse"><circle cx=".5" cy=".5" r=".3" fill="#24180c"/></pattern>
<pattern id="lit" width="1" height="1" patternUnits="userSpaceOnUse"><circle cx=".5" cy=".5" r=".33" fill="${AMBER}" opacity=".32"/></pattern>
<linearGradient id="dim" x1="0" y1="0" x2="0" y2="1"><stop offset=".26" stop-color="#050302" stop-opacity="0"/><stop offset=".4" stop-color="#050302" stop-opacity=".6"/><stop offset=".62" stop-color="#050302" stop-opacity=".6"/><stop offset=".72" stop-color="#050302" stop-opacity="0"/></linearGradient>
${defs}
</defs>
<rect x="-400" y="-400" width="${W + 800}" height="${H + 800}" fill="#070504"/>
<g transform="scale(${P})">
<rect x="-25" y="-25" width="${COLS + 50}" height="${H / P + 50}" fill="url(#off)"/>
<rect x="-25" y="-25" width="${COLS + 50}" height="${H / P + 50}" fill="url(#dim)"/>
${scan}
<g transform="translate(.5 .5)" fill="none" stroke-linecap="round">
${ringG}${chevG}${triG}
${ruleG}${tickG}
${lanes}${blips}${trainG}${pulses}
</g>
</g>
</svg>`

const out = join(ROOT, 'hooks/looks/dot-matrix/scene.js')
writeFileSync(out, `// Generated by tools/scenes/dot-matrix.mjs: a motorway LED panel in amber dots.\nexport const SCENE = ${JSON.stringify(svg)}\n`)
console.log('dot-matrix', svg.length)
