// Synthwave sunset scene generator. Run: node tools/scenes/synthwave-sunset.mjs
// The last minutes of a synthwave dusk, kept low and quiet to work beside for hours. Everything is
// type: a sun set in a halftone of glyphs sits on the horizon in the bottom-right corner, cut by the
// bands such suns have; a low ridge of slope glyphs runs out on either side of it; below, the floor is
// a field of dots in perspective, the points where a neon grid's lines would cross, drifting toward
// you one row every few seconds (a flipbook of phases, switched, never faded). The sky goes from ink
// to a dusk violet at the horizon, with a few glyph stars that change shape now and then. Rare: a
// light runs along the horizon; a star falls.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

let seed = 20261117
const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
const f = n => +n.toFixed(1)

const W = 1600, H = 1000
const HY = 770 // the horizon
const VX = 1290 // the vanishing point, under the sun
const FONT = 'ui-monospace,Menlo,Consolas,monospace'
const PINK = '#e2409c', HOT = '#f07ac4', SUN_TOP = '#f6d98a', SUN_MID = '#f0915a'

let css = ''
const kf = (name, body) => { css += `@keyframes ${name}{${body}}\n` }

// ── the sun: a halftone of type, denser toward its heart, only the part above the horizon. Its lower
// half is cut by bands that widen toward the horizon (rows left out).
const SX = VX, SY = HY - 18, SR = 158
const SCW = 6, SCH = 11
const RAMP = ' .:-=+*#%@'
let sunText = ''
for (let y = SY - SR, row = 0; y < HY - 4; y += SCH, row++) {
  const below = (y - (SY - SR * 0.25)) / (HY - (SY - SR * 0.25)) // 0 where the bands start, 1 at the horizon
  if (below > 0 && (row % 3 === 2 || (below > 0.45 && row % 3 === 1))) continue
  let line = '', x0 = null
  for (let x = SX - SR; x <= SX + SR; x += SCW) {
    const d = Math.hypot((x - SX) / SR, (y - SY) / SR)
    if (d > 1) { if (x0 !== null) line += ' '; continue }
    if (x0 === null) x0 = x
    const v = 1 - d * 0.7 + (R() - 0.5) * 0.12
    line += RAMP[Math.max(1, Math.min(9, Math.round(v * 9)))]
  }
  if (x0 !== null) sunText += `<text x="${f(x0)}" y="${f(y)}">${line.trimEnd()}</text>`
}

// ── the ridge: low slopes of glyphs on both sides of the sun, a dust of dots beneath
const ridge = [[760, HY], [820, HY - 22], [880, HY - 12], [950, HY - 46], [1010, HY - 20], [1070, HY - 34], [1120, HY - 8],
  [1460, HY - 10], [1500, HY - 38], [1545, HY - 24], [1600, HY - 64], [1640, HY - 40]]
const ridgeAt = x => {
  for (let i = 1; i < ridge.length; i++) {
    const [x1, y1] = ridge[i - 1], [x2, y2] = ridge[i]
    if (x <= x2) return [y1 + ((y2 - y1) * (x - x1)) / (x2 - x1), (y2 - y1) / (x2 - x1)]
  }
  return [HY, 0]
}
const MCW = 6, MCH = 11
let ridgeText = ''
for (let y = HY - 70; y < HY - 2; y += MCH) {
  let line = ''
  for (let x = 760; x <= W; x += MCW) {
    const [ry, slope] = ridgeAt(x)
    if (Math.abs(x - SX) < SR * 0.9) line += ' ' // the sun stands in front of the far ridge
    else if (y < ry - MCH / 2) line += ' '
    else if (y < ry + MCH / 2) line += Math.abs(slope) < 0.3 ? '_' : slope < 0 ? '/' : '\\'
    else line += R() < 0.4 * (1 - (y - ry) / (HY - ry + 1)) ? (R() < 0.3 ? ':' : '.') : ' '
  }
  ridgeText += `<text x="760" y="${f(y)}">${line.trimEnd()}</text>`
}

// ── the floor: the crossings of a grid in perspective, as dots. Row k of depth sits at
// y = HY + A·G^(k + phase); the flipbook shows PHASES phases of one row's advance, one after another.
const A = 4.2, G = 1.36, PHASES = 6, ROW_T = 7 // one row's advance takes ROW_T s
const COL = 70 // the grid's spacing at y = HY + 100, in viewBox units
function floorFrame(phase) {
  let out = ''
  for (let k = 0; ; k++) {
    const dy = A * Math.pow(G, k + phase)
    const y = HY + dy
    if (y > H + 10) break
    const sp = COL * dy / 100
    if (sp < 7) continue // too far: the dots would run together
    const xs = []
    for (let i = -Math.ceil(VX / sp); VX + i * sp <= W + 4; i++) xs.push(f(VX + i * sp))
    const near = Math.min(1, dy / 230) // 0 at the horizon, 1 toward the foot
    const glyph = near > 0.55 ? '+' : near > 0.2 ? '·' : '.'
    // bright by the horizon, dimming toward the foot, where the prompt box is
    const a = f(0.78 - near * 0.4)
    out += `<text y="${f(y)}" x="${xs.join(' ')}" fill-opacity="${a}">${glyph.repeat(xs.length)}</text>`
  }
  return out
}
kf('ph', `0%{visibility:visible}${f(100 / PHASES)}%,100%{visibility:hidden}`)
let floor = ''
for (let p = 0; p < PHASES; p++) {
  // frame p shows phase p/PHASES; frame 0 is the still
  const delay = f((p / PHASES) * ROW_T - ROW_T)
  floor += `<g class="ph${p === 0 ? ' p0' : ''}" style="animation-delay:${delay}s">${floorFrame(p / PHASES)}</g>`
}

// ── stars: glyphs that change shape now and then (one switch, never a fade), dim and sparse
const SHAPES = [['+', '·'], ['*', '+'], ['·', '+'], ['x', '·'], ['+', '*']]
let stars = ''
for (let i = 0; i < 40; i++) {
  const x = f(R() * W), y = f(20 + R() * (HY - 160))
  if (x < 1050 && R() < 0.55) continue // fewer over the conversation
  const [a, b] = SHAPES[Math.floor(R() * SHAPES.length)]
  const size = f(9 + R() * 7), dur = f(17 + R() * 40), delay = f(-R() * 60), dim = f(0.25 + R() * 0.45)
  stars += `<g opacity="${dim}" font-size="${size}"><text x="${x}" y="${y}" class="sa" style="animation-duration:${dur}s;animation-delay:${delay}s">${a}</text><text x="${x}" y="${y}" class="sb" style="animation-duration:${dur}s;animation-delay:${delay}s">${b}</text></g>`
}

// ── rare: a light that runs along the horizon (a string of dashes moved a cell at a time), a falling star
const RUN = 113, RUN_T = 9
kf('run', `0%{transform:translateX(0)}${f((RUN_T / RUN) * 100)}%,100%{transform:translateX(${-W - 300}px)}`)
kf('runOn', `0%{visibility:visible}${f((RUN_T / RUN) * 100)}%,100%{visibility:hidden}`)
const FALL = 151, FALL_T = 2.4
kf('fall', `0%{transform:translate(0,0)}${f((FALL_T / FALL) * 100)}%,100%{transform:translate(-240px,110px)}`)
kf('fallOn', `0%{visibility:visible}${f((FALL_T / FALL) * 100)}%,100%{visibility:hidden}`)
kf('sw', '0%{visibility:visible}85%,100%{visibility:hidden}')
kf('swb', '0%{visibility:hidden}85%,100%{visibility:visible}')

const style = `
text{font-family:${FONT};white-space:pre;dominant-baseline:central}
.sun text{font-size:10px;fill:url(#sunfill)}.sun{opacity:.82}
.ridge text{font-size:10px;fill:${HOT}}.ridge{opacity:.42}
.floor text{font-size:11px;fill:${PINK};text-anchor:middle}
.stars text{fill:#efe2ff}
.ph{visibility:hidden;animation:ph ${ROW_T}s steps(1) infinite}.p0{visibility:visible}
.sa{animation:sw 30s steps(1) infinite}.sb{visibility:hidden;animation:swb 30s steps(1) infinite}
.runOn{visibility:hidden;animation:runOn ${RUN}s steps(1) infinite 37s}.run{animation:run ${RUN}s steps(${Math.round((W + 300) / 12)}) infinite 37s}
.run text{font-size:10px;fill:${HOT}}
.fallOn{visibility:hidden;animation:fallOn ${FALL}s steps(1) infinite 71s}.fall{animation:fall ${FALL}s steps(24) infinite 71s}
.fall text{font-size:11px;fill:#f4eaff}
${css}@media (max-aspect-ratio:3/4){.pos{transform:translateX(-120px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`

const DEFS = `<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="${HY}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0b0520"/><stop offset=".45" stop-color="#140a2c"/><stop offset=".78" stop-color="#26103f"/><stop offset=".93" stop-color="#3d1450"/><stop offset="1" stop-color="#5a1a5c"/></linearGradient>
<linearGradient id="ground" x1="0" y1="${HY}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1c0a32"/><stop offset=".25" stop-color="#110624"/><stop offset="1" stop-color="#0c051c"/></linearGradient>
<linearGradient id="sunfill" gradientUnits="userSpaceOnUse" x1="0" y1="${SY - SR}" x2="0" y2="${HY}"><stop offset="0" stop-color="${SUN_TOP}"/><stop offset=".55" stop-color="${SUN_MID}"/><stop offset="1" stop-color="${PINK}"/></linearGradient>
<radialGradient id="halo" cx="${SX}" cy="${HY - 30}" r="430" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#d0408e" stop-opacity=".3"/><stop offset=".45" stop-color="#9a2a80" stop-opacity=".1"/><stop offset="1" stop-color="#9a2a80" stop-opacity="0"/></radialGradient>
<linearGradient id="hz" x1="0" y1="${HY - 26}" x2="0" y2="${HY + 26}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#e2409c" stop-opacity="0"/><stop offset=".5" stop-color="#e2409c" stop-opacity=".22"/><stop offset="1" stop-color="#e2409c" stop-opacity="0"/></linearGradient>
<linearGradient id="foot" x1="0" y1="${HY}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0c051c" stop-opacity="0"/><stop offset=".6" stop-color="#0c051c" stop-opacity=".25"/><stop offset="1" stop-color="#0c051c" stop-opacity=".75"/></linearGradient>
</defs>`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMax slice">
<style>${style}</style>
${DEFS}
<rect width="${W}" height="${HY}" fill="url(#sky)"/>
<rect y="${HY}" width="${W}" height="${H - HY}" fill="url(#ground)"/>
<g class="stars">${stars}</g>
<g class="fallOn"><g class="fall"><text x="1180" y="150">*</text><text x="1192" y="144" opacity=".5">.</text><text x="1204" y="138" opacity=".25">.</text></g></g>
<rect width="${W}" height="${H}" fill="url(#halo)"/>
<g class="pos">
<g class="ridge">${ridgeText}</g>
<g class="sun">${sunText}</g>
<g class="floor">${floor}</g>
</g>
<rect y="${HY - 26}" width="${W}" height="52" fill="url(#hz)"/>
<g class="runOn"><g class="run"><text x="${W + 20}" y="${HY + 1}">-=≡≡=-</text></g></g>
<rect y="${HY}" width="${W}" height="${H - HY}" fill="url(#foot)"/>
</svg>`.replace(/\n\s*\n/g, '\n')

// the poster: the scene at rest, without stars or events
const poster = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMax slice" width="320" height="180">
<style>text{font-family:${FONT};white-space:pre;dominant-baseline:central}.sun text{font-size:10px;fill:url(#sunfill)}.ridge text{font-size:10px;fill:${HOT}}</style>
${DEFS.replace(/<linearGradient id="foot".*?<\/linearGradient>/, '')}
<rect width="${W}" height="${HY}" fill="url(#sky)"/><rect y="${HY}" width="${W}" height="${H - HY}" fill="url(#ground)"/>
<rect width="${W}" height="${H}" fill="url(#halo)"/>
<g class="ridge" opacity=".42">${ridgeText}</g><g class="sun" opacity=".82">${sunText}</g>
<rect y="${HY - 26}" width="${W}" height="52" fill="url(#hz)"/>
</svg>`.replace(/\n/g, '')
if (poster.length >= 12000) throw new Error(`poster is ${poster.length} characters, over 12,000`)
if (svg.length >= 131072) throw new Error(`scene is ${svg.length} characters, over 131,072`)

writeFileSync(join(ROOT, 'hooks/looks/synthwave-sunset/scene.js'),
  `// Generated by tools/scenes/synthwave-sunset.mjs: a sun of type on the horizon, a field of dots drifting toward you.\nexport const SCENE = ${JSON.stringify(svg)}\nexport const POSTER = ${JSON.stringify(poster)}\n`)
console.log(`synthwave-sunset: ${svg.length} characters, poster ${poster.length}`)
