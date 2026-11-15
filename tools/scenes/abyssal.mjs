// abyssal scene generator. Run: node tools/scenes/abyssal.mjs
// The deep sea at night, drawn in block elements and box drawing: a pulsing jellyfish,
// a siphonophore chain, an anglerfish with its lure, rising motes on a faint sonar grid.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

let seed = 31337
const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
const f = n => +n.toFixed(1)
const pick = a => a[Math.floor(R() * a.length)]
const T = 16 // one tile, in viewBox units

// ── tiles, grouped by class: a square-capped stroke of almost no length per tile (one path per
// group), and the glyphs of a row share one <text>, each glyph placed by its own x.
// cells: [{ x, y, c (class), g (glyph) }]; c '' means a glyph with no tile behind it
function tiles(cells) {
  const byC = {}
  for (const t of cells) (byC[t.c] ??= []).push(t)
  let out = ''
  for (const [cls, list] of Object.entries(byC)) {
    out += `<g class="${cls}">`
    if (!/\bbare\b/.test(cls)) out += `<path d="${list.map(t => `M${f(t.x)} ${f(t.y)}h.1`).join('')}"/>`
    const rows = {}
    for (const t of list) if (t.g) (rows[f(t.y)] ??= []).push(t)
    for (const [y, r] of Object.entries(rows)) out += `<text x="${r.map(t => f(t.x)).join(' ')}" y="${y}">${r.map(t => t.g).join('')}</text>`
    out += '</g>'
  }
  return out
}

// ── jellyfish: a dome of tiles, a scalloped rim, tentacles of bare glyphs that sway and glimmer
function jelly(r, nTent, len) {
  const bell = []
  const h = Math.round(r * 1.05)
  const inside = (i, j) => j <= 0 && j >= -h && Math.abs(i) <= r * Math.sqrt(Math.max(0, 1 - (-j / (h + 0.7)) ** 1.5)) + 0.3
  for (let j = -h; j <= 0; j++) for (let i = -r; i <= r; i++) {
    // a dome: full at the margin, rounding over the top; its outline in the brightest tiles
    if (!inside(i, j)) continue
    const edge = j < 0 && (!inside(i - 1, j) || !inside(i + 1, j) || !inside(i, j - 1))
    const d = (i / (r + 0.3)) ** 2 + (j / (h + 0.7)) ** 2
    let g, c
    if (j === 0) { g = i % 2 ? '◣' : '◢'; c = 'jr' }
    else if (edge) { g = (i + j) % 2 ? '▚' : '▞'; c = 'j1' }
    else if (d > 0.4) { g = pick(['▒', '░', '▒']); c = 'j2' }
    else { g = pick(['◦', '┼', '◦']); c = 'j3' }
    bell.push({ x: i * T, y: j * T, c, g })
  }
  // tentacles: one <g> each so they sway on their own; glyphs fade down their length
  let tent = ''
  for (let k = 0; k < nTent; k++) {
    const x0 = (-r + 1 + (k * (2 * r - 2)) / (nTent - 1)) * T
    const L = Math.round(len * (0.6 + R() * 0.5))
    const ph = R() * 6.28
    let s = ''
    for (let n = 1; n <= L; n++) {
      const x = x0 + Math.sin(ph + n * 0.45) * 7 * (n / L)
      const dx = Math.cos(ph + n * 0.45)
      const g = n % 5 === 0 ? '◦' : Math.abs(dx) < 0.35 ? pick(['│', '┊', '╎']) : dx > 0 ? '╲' : '╱'
      s += `<text x="${f(x)}" y="${n * T}" style="opacity:${f(1 - n / (L + 2))};animation-delay:${f(n * 0.18 - 9)}s">${g}</text>`
    }
    tent += `<g class="tent" style="animation-delay:${f(-R() * 8)}s">${s}</g>`
  }
  // two oral arms: thicker block ribbons under the centre
  let arms = ''
  for (const sx of [-1, 1]) {
    let s = ''
    for (let n = 1; n <= Math.round(len * 0.4); n++) {
      const x = sx * (T * 0.8) + Math.sin(n * 0.5 + sx) * 6
      s += `<text x="${f(x)}" y="${n * T}">${n % 2 ? '▚' : '▞'}</text>`
    }
    arms += `<g class="arm tent" style="animation-delay:${f(-R() * 8)}s">${s}</g>`
  }
  return `<g class="tents">${tent}${arms}</g><g class="bell">${tiles(bell)}</g>`
}

// ── anglerfish facing right, drawn as a sprite: B body, E edge, o eye, v/^ teeth, m mouth, f tail
const ANGLER = [
  '            EEEEE          ',
  '        EEEEBBBBBEE        ',
  '     EEEBBBBBBBBBBBE       ',
  '   EEBBBBBBBBBBBBBBBE      ',
  'f EBBBBBBBBBBBBBBBoBBE     ',
  'fEBBBBBBBBBBBBBBBBBBBBE    ',
  'fBBBBBBBBBBBBBBBBBBvvvvv   ',
  'fEBBBBBBBBBBBBBBBBmmmmmm   ',
  'f EBBBBBBBBBBBBBBmmmmmmmm  ',
  '   EBBBBBBBBBBBBBB^^^^^^^E ',
  '     EEBBBBBBBBBBBBBBBBBE  ',
  '        EEEEBBBBBBBBEEE    ',
  '            EEEEEEE        ',
]
function angler() {
  const cells = []
  const cx = 13, cy = 6
  ANGLER.forEach((row, j) => [...row].forEach((ch, i) => {
    const x = (i - cx) * T, y = (j - cy) * T
    if (ch === 'B') cells.push({ x, y, c: 'ab', g: pick(['░', '▒', '░', '', '░', '▒']) })
    else if (ch === 'E') cells.push({ x, y, c: 'ae', g: (i + j) % 2 ? '▚' : '▞' })
    else if (ch === 'o') cells.push({ x, y, c: 'ai', g: '◉' })
    else if (ch === 'v') cells.push({ x, y, c: 'at', g: '▼' })
    else if (ch === '^') cells.push({ x, y, c: 'at', g: '▲' })
    else if (ch === 'm') cells.push({ x, y, c: 'am', g: '' })
    else if (ch === 'f') cells.push({ x: x - T * 0.6, y, c: 'af bare', g: j < cy ? '╲' : j > cy ? '╱' : '╳' })
  }))
  for (const [i, j, g] of [[-15, 4, '╲'], [-15, 8, '╱'], [-14.5, 6, '─'], [2, 7.2, '◣'], [3, 7.2, '◢'], [3, 8.2, '◣']]) cells.push({ x: i * T, y: j * T, c: 'af bare', g })
  // the stalk: a bent rod of box glyphs from the brow, arching out over the jaw
  const p0 = [1 * T, -6.6 * T], p1 = [9 * T, -13 * T], p2 = [15.5 * T, -6.4 * T]
  let stalk = ''
  for (let k = 0; k <= 16; k++) {
    const t = k / 16, u = 1 - t
    const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]
    const dx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]), dy = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])
    const a = Math.atan2(-dy, dx) * 180 / Math.PI
    const g = Math.abs(a) < 22 ? '─' : Math.abs(a) > 68 ? '│' : a > 0 ? '╱' : '╲'
    stalk += `<text x="${f(x)}" y="${f(y)}">${g}</text>`
  }
  const lure = `<g class="lure" transform="translate(${f(p2[0])} ${f(p2[1] + 12)})"><circle r="70" fill="url(#lureGlow)"/><g class="blink"><circle r="24" fill="url(#lureGlow)"/><text class="bulb">●</text></g></g>`
  return `<g class="stalk">${stalk}</g>${tiles(cells)}${lure}`
}

// ── siphonophore: a long chain of small glowing units along a lazy curve
function siphonophore(path, n) {
  let s = ''
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1)
    const [x, y] = path(t)
    const [x2, y2] = path(Math.min(1, t + 0.01))
    const a = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI
    const big = k % 4 === 0
    const g = big ? '◈' : pick(['◇', '┼', '╳', '◇', '◆'])
    const side = k % 3 === 0 ? `<text x="0" y="${big ? 16 : 13}" class="sd">${pick(['╎', '┊', '│'])}</text><text x="0" y="${big ? 29 : 25}" class="sd">${pick(['·', '◦', '˙'])}</text>` : ''
    s += `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a)})"><g class="su" style="animation-delay:${f(t * 2.4 + 8)}s"><text class="${big ? 'sb' : 'ss'}">${g}</text>${side}</g></g>`
  }
  return s
}

// ── motes: specks of light that rise and fade, fewer in the middle
function motes(n) {
  let s = ''
  for (let k = 0; k < n; k++) {
    const x = f(R() * 1000), y = f(300 + R() * 760)
    if (x > 330 && x < 680 && R() < 0.75) continue
    const dur = f(22 + R() * 30), dl = f(-R() * 50), dx = f((R() - 0.5) * 60)
    s += `<text x="${x}" y="${y}" class="mo ${R() < 0.3 ? 'mv' : 'mc'}" style="--dx:${dx}px;animation-duration:${dur}s;animation-delay:${dl}s;font-size:${f(8 + R() * 9)}px">${pick(['·', '∙', '˙', '°', '·', '◦'])}</text>`
  }
  return s
}

// ── shoal: tiny glyph fish that cross at the top edge now and then
function shoal() {
  let s = ''
  for (let k = 0; k < 13; k++) {
    const x = f(-R() * 150), y = f((R() - 0.5) * 60)
    s += `<text x="${x}" y="${y}" style="animation-delay:${f(-R() * 2)}s">${pick(['›', '»', '⋗', '›', '»'])}</text>`
  }
  return s
}

// ── sonar: faint range rings from the lower left and a grid of crossings
let rings = ''
for (let k = 1; k <= 6; k++) rings += `<circle cx="0" cy="1000" r="${k * 170}"/>`
let spokes = ''
for (let k = 1; k < 6; k++) { const a = (k / 6) * Math.PI / 2; spokes += `<line x1="0" y1="1000" x2="${f(Math.cos(a) * 1100)}" y2="${f(1000 - Math.sin(a) * 1100)}"/>` }

// ── compose
const sipPath = t => [880 + Math.sin(t * 5.2) * 38 + t * 60, 1060 - t * 520 + Math.sin(t * 3) * 20]

const tr = `<g class="tr"><g class="drift"><g transform="translate(790 170)">${jelly(6, 9, 17)}</g></g></g>`
const tl = `<g class="tl"><g class="drift2"><g transform="translate(250 140) scale(.55)" class="far">${jelly(5, 6, 14)}</g></g></g>`
const bl = `<g class="bl"><g class="hover"><g transform="translate(205 815) scale(.82)">${angler()}</g></g></g>`
const br = `<g class="br"><g class="sway">${siphonophore(sipPath, 30)}</g></g>`

// corner groups stay pinned to the visible box under slice cropping (see koi-script for the bands)
function anchorCss() {
  const o = { tl: '0 0', tr: '1000px 0', bl: '0 1000px', br: '1000px 1000px' }
  const sign = { tl: [1, 1], tr: [-1, 1], bl: [1, -1], br: [-1, -1] }
  let css = Object.entries(o).map(([k, v]) => `.${k}{transform-origin:${v}}`).join('')
  const rule = (dx, dy, s) => Object.keys(o).map(k => `.${k}{transform:translate(${sign[k][0] * dx}px,${sign[k][1] * dy}px) scale(${s})}`).join('')
  for (const [r, dy, s] of [['6/5', 143, 0.92], ['7/5', 187, 0.86], ['8/5', 222, 0.8], ['9/5', 250, 0.74], ['2/1', 292, 0.68], ['12/5', 320, 0.62]]) css += `\n@media (min-aspect-ratio:${r}){${rule(0, dy, s)}}`
  for (const [r, dx, s] of [['4/5', 150, 0.9], ['7/10', 200, 0.8], ['3/5', 225, 0.72], ['11/20', 250, 0.68], ['1/2', 275, 0.64], ['9/20', 300, 0.6], ['2/5', 320, 0.56]]) css += `\n@media (max-aspect-ratio:${r}){${rule(dx, 0, s)}}`
  return css
}

const CY = '#3fe6d2', VI = '#a184ff', ICE = '#d8fff8'
const style = `
text{font-family:ui-monospace,Menlo,"DejaVu Sans Mono",Consolas,monospace;font-size:13px;text-anchor:middle;dominant-baseline:central}
path{fill:none;stroke-width:14;stroke-linecap:square}text{stroke:none}
.j1{stroke:#2e2a78;fill:${VI}}.j2{stroke:#241f62;fill:#8a74ee}.j3{stroke:#1f1b55;fill:${CY}}.jr{stroke:#14405a;fill:${CY}}.bell path{stroke-opacity:.8}.arm{fill-opacity:.4;font-size:11px}
.bell{transform-origin:0 0;transform-box:view-box;animation:pulse 6s ease-in-out infinite}
@keyframes pulse{0%,100%{transform:scale(1,1)}45%{transform:scale(1.07,.9)}}
.tent{fill:${CY};transform-origin:0 0;animation:tent 7s ease-in-out infinite alternate}
.tent text{animation:glim 4.5s ease-in-out infinite}
.arm{fill:${VI}}
@keyframes tent{from{transform:skewX(-5deg)}to{transform:skewX(5deg)}}
@keyframes glim{0%,100%{fill-opacity:.55}50%{fill-opacity:1}}
.far{opacity:.45}
.drift{animation:drift 22s ease-in-out infinite alternate}
@keyframes drift{from{transform:translate(0,0)}to{transform:translate(-14px,46px)}}
.drift2{animation:drift 30s ease-in-out infinite alternate-reverse}
.ab{stroke:#141838;fill:#3b4383}.ae{stroke:#1a1f48;fill:#5560a8}.am{stroke:#05070f}.at{stroke:#0b0e22;fill:#cfd6ff}.af{fill:#4b5598}.ai{stroke:#0b0e22;fill:${CY}}
.stalk{fill:#6c76b8}
.bulb{fill:${ICE};font-size:15px}
.lure{animation:lure 5s ease-in-out infinite}
@keyframes lure{0%,100%{opacity:.8}50%{opacity:1}}
.blink{animation:blink 17s steps(1) infinite 6s}
@keyframes blink{0%,90%,100%{opacity:1}91%{opacity:.08}92.5%{opacity:1}94%{opacity:.08}95.5%{opacity:1}}
.hover{animation:hover 16s ease-in-out infinite alternate}
@keyframes hover{from{transform:translate(0,0)}to{transform:translate(18px,-10px)}}
.ss{fill:${CY};font-size:11px}.sb{fill:${VI};font-size:14px}.sd{fill:${CY};fill-opacity:.55;font-size:10px}
.sway{transform-origin:940px 1000px;animation:sway 14s ease-in-out infinite alternate}
@keyframes sway{from{transform:rotate(-2.5deg)}to{transform:rotate(2.5deg)}}
.mo{animation:rise linear infinite;opacity:0}.mc{fill:${CY}}.mv{fill:${VI}}
@keyframes rise{0%{opacity:0;transform:translate(0,0)}15%{opacity:.8}80%{opacity:.5}100%{opacity:0;transform:translate(var(--dx),-340px)}}
.shoal{opacity:0;animation:shoal 27s linear infinite 4s}
.shoal text{fill:${CY};fill-opacity:.75;font-size:11px;animation:dart 1.4s ease-in-out infinite alternate}
@keyframes shoal{0%{opacity:0;transform:translateX(-80px)}2%{opacity:1}34%{opacity:1}36%,100%{opacity:0;transform:translateX(1250px)}}
@keyframes dart{from{transform:translateY(-2px)}to{transform:translateY(2px)}}
.sonar{fill:none;stroke:#5a6cc4;stroke-opacity:.12;stroke-width:1;stroke-dasharray:2 6;vector-effect:non-scaling-stroke}
.cross{fill:#6d7fd6;fill-opacity:.1;font-size:10px}
${anchorCss()}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.shoal{opacity:0}.mo{opacity:.4}}
`

// the lights ripple along the siphonophore: a flash runs from its base to its tip every 21 s
const rippleCss = `.su{opacity:.5;animation:flash 21s ease-out infinite}
@keyframes flash{0%,7%,100%{opacity:.5;transform:scale(1)}1.5%{opacity:1;transform:scale(1.5)}}`

// crossings of the sonar grid: one pattern cell, very faint
const grid = `<pattern id="grid" width="${T * 4}" height="${T * 4}" patternUnits="userSpaceOnUse"><text x="${T * 2}" y="${T * 2}" class="cross">┼</text></pattern>`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
<style>${style}${rippleCss}</style>
<defs>
<linearGradient id="deep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1338"/><stop offset=".55" stop-color="#080c26"/><stop offset="1" stop-color="#03050f"/></linearGradient>
<radialGradient id="haze" cx=".82" cy=".2" r=".5"><stop offset="0" stop-color="#4a3fa8" stop-opacity=".22"/><stop offset="1" stop-color="#4a3fa8" stop-opacity="0"/></radialGradient>
<radialGradient id="haze2" cx=".15" cy=".85" r=".45"><stop offset="0" stop-color="#1fa59a" stop-opacity=".14"/><stop offset="1" stop-color="#1fa59a" stop-opacity="0"/></radialGradient>
<radialGradient id="lureGlow"><stop offset="0" stop-color="#bffcf3" stop-opacity=".55"/><stop offset=".35" stop-color="#3fe6d2" stop-opacity=".18"/><stop offset="1" stop-color="#3fe6d2" stop-opacity="0"/></radialGradient>
${grid}
</defs>
<rect x="-10" y="-10" width="1020" height="1020" fill="url(#deep)"/>
<rect x="-10" y="-10" width="1020" height="1020" fill="url(#haze)"/>
<rect x="-10" y="-10" width="1020" height="1020" fill="url(#haze2)"/>
<rect x="-10" y="-10" width="1020" height="1020" fill="url(#grid)"/>
<g class="sonar">${rings}${spokes}</g>
<g>${motes(95)}</g>
${tl}${br}${bl}${tr}
<g transform="translate(0 250)"><g class="shoal">${shoal()}</g></g>
</svg>`

writeFileSync(join(ROOT, 'hooks/looks/abyssal/scene.js'),
  `// Generated by tools/scenes/abyssal.mjs: the deep sea in block glyphs, a jellyfish, a siphonophore, an anglerfish and its lure.\nexport const SCENE = ${JSON.stringify(svg)}\n`)
console.log('abyssal', svg.length)
