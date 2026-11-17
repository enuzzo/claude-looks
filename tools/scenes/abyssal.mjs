// abyssal scene generator. Run: node tools/scenes/abyssal.mjs
// The deep sea, slow and dark, made of glyphs. Three layers of plankton drift at their own depth and
// pace; now and then a soft wave of light runs through them. Its animals are real solids (signed
// distance fields in sea-creatures.mjs), raymarched here at build time into ASCII, one frame per step
// of their swim cycle, and the frames dissolve into one another. They are rare: each keeps to its own
// depth (far ones small, dim and slow) and its own long cycle, so most of the time one or none is in view.
import { writeFileSync } from 'node:fs'
import { inlineUses } from './inline-uses.mjs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { frameSvg, render, trim } from './ascii3d.mjs'
import { jellyBell, manta } from './sea-creatures.mjs'
import { glyphSvg, surface } from './glyph3d.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

let seed = 20261116
const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
const f = n => +n.toFixed(2)
const rr = (a, b) => a + R() * (b - a)
const W = 1600
const H = 1000
const FS = 10 // font size of every sprite, in viewBox units
const CW = 6.02 // a monospace advance at that size
const CH = 11 // the line step; CH / CW is the cell aspect the renderer samples
const ASPECT = CH / CW

let css = ''
const kf = (name, body) => { css += `@keyframes ${name}{${body}}\n` }

// ── a flipbook whose frames dissolve: each fades in over 1/n of the cycle and out over the next,
// so two neighbours are always mid-crossfade and the body moves like breathing, never in jumps
const books = new Set()
const defs = []
const stills = {} // frame 0 of each book, for the poster
function book(frames, id, period, colors, oy = 0.5) {
  const n = frames.length
  if (n > 1 && !books.has(n)) {
    books.add(n)
    kf(`xf${n}`, `0%{opacity:0}${f(100 / n)}%{opacity:1}${f(200 / n)}%,100%{opacity:0}`)
  }
  const w = frames[0][0].length * CW, h = frames[0].length * CH
  // one frame: no flipbook (every page of one is drawn each frame, shown or not)
  const body = n === 1 ? frameSvg(frames[0], { cw: CW, ch: CH, plain: true }) : frames.map((fr, k) => `<g class="fr${k === 0 ? ' f0' : ''}" style="animation:xf${n} ${period}s linear infinite ${f(((k - 1) / n) * period - period)}s">${frameSvg(fr, { cw: CW, ch: CH, plain: true })}</g>`).join('')
  const stops = colors.map((c, i) => `<stop offset="${f(i / (colors.length - 1))}" stop-color="${c}"/>`).join('')
  defs.push(`<linearGradient id="${id}G" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${f(w * 0.25)}" y2="${f(h)}">${stops}</linearGradient>`)
  defs.push(`<g id="${id}" transform="translate(${f(-w / 2)} ${f(-h * oy)})" fill="url(#${id}G)">${body}</g>`)
  stills[id] = `<linearGradient id="${id}G" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${f(w * 0.25)}" y2="${f(h)}">${stops}</linearGradient><g id="${id}" transform="translate(${f(-w / 2)} ${f(-h * oy)})" fill="url(#${id}G)">${frameSvg(frames[Math.floor(n / 3)], { cw: CW, ch: CH, plain: true })}</g>`
  return `<use href="#${id}"/>`
}
function flipbook(id, make, n, view, { tex, period, colors }) {
  return book(trim(Array.from({ length: n }, (_, k) => render(make((k / n) * Math.PI * 2), { ...view, aspect: ASPECT }, tex))), id, period, colors)
}

// ── a rare passage: within a long cycle the animal crosses once (over `share` of it) and is away the
// rest; `enter` is when, after the scene opens, it first appears (0 = already halfway across).
// A slow bob and a pitch that leads it make it climb and dip nose first.
function passage(name, { y0, dir, cycle, share, enter, bob, bobDur, pitch, scale, depth }) {
  const from = dir > 0 ? -460 : W + 460
  const to = dir > 0 ? W + 460 : -460
  const p = f(share * 100)
  kf(`${name}X`, `0%{transform:translateX(${from}px)}${p}%,100%{transform:translateX(${to}px)}`)
  kf(`${name}Y`, `0%,100%{transform:translateY(${-bob}px)}50%{transform:translateY(${bob}px)}`)
  kf(`${name}P`, `0%,50%,100%{transform:rotate(0deg)}25%{transform:rotate(${pitch * dir}deg)}75%{transform:rotate(${-pitch * dir}deg)}`)
  // enter 0: halfway across at t = 0; otherwise the crossing starts `enter` seconds in
  const delay = enter === 0 ? -(share * cycle) / 2 : enter - cycle
  const ph = f(-R() * bobDur)
  css += `.${name}X{animation:${name}X ${cycle}s linear infinite ${f(delay)}s}.${name}Y{animation:${name}Y ${bobDur}s ease-in-out infinite ${ph}s}.${name}P{animation:${name}P ${bobDur}s ease-in-out infinite ${ph}s}\n`
  return [`<g class="${depth}" transform="translate(0 ${y0})"><g class="${name}X"><g class="${name}Y"><g class="${name}P"><g transform="scale(${scale})">`, '</g></g></g></g></g>']
}

// ── the animals
// The manta is drawn the way ASCII games like Effulgence draw their creatures (tools/scenes/glyph3d.mjs):
// glyphs set on its own surface, in rows that bend with the wings, seen in perspective (the near wing's
// glyphs larger and brighter), coloured along the span from violet through a pale core to teal, and
// lit by a soft bloom. Its wingbeat is a flipbook whose pages switch, never fade.
const SPAN = [[-1, [178, 92, 255]], [-0.45, [70, 170, 255]], [0, [235, 255, 255]], [0.4, [60, 255, 210]], [1, [20, 205, 230]]]
const mixSpan = u => {
  for (let i = 1; i < SPAN.length; i++) {
    const [a, ca] = SPAN[i - 1], [b, cb] = SPAN[i]
    if (u <= b) { const t = (u - a) / (b - a); return ca.map((c, j) => c + (cb[j] - c) * t) }
  }
  return SPAN.at(-1)[1]
}
const hex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
const mantaColour = p => {
  const near = Math.max(0, Math.min(1, (p.k - 0.85) / 0.35))
  const lv = Math.round((0.3 + 0.8 * p.v * (0.55 + 0.45 * near)) * 4) / 4 // four steps of light, the brightest a little over full
  return [hex(mixSpan(Math.round(p.u * 4) / 4).map(c => c * lv)), 1] // nine steps along the span
}
// One pose, cut into strips across the span; each strip rises and falls on its own phase, later and
// further toward the tips, so the wingbeat is a wave running out along the wing. (A flipbook of poses
// costs as much as drawing every pose at once: hidden pages are still walked every frame.)
const BEAT = 9 // s per wingbeat
const STRIPS = 14
const mantaPts = surface(manta(1.2, -1), { x: [-1.3, 0.85], z: [-1.6, 1.6], step: 0.072, elev: 0.9, yaw: 0.45, dist: 2.6, ramp: ' .,:;-=+*#%' })
let mantaBody = ''
for (let i = 0; i < STRIPS; i++) {
  const z0 = -1.6 + (3.2 * i) / STRIPS, z1 = z0 + 3.2 / STRIPS
  const pts = mantaPts.filter(p => p.z >= z0 && (p.z < z1 || i === STRIPS - 1))
  if (!pts.length) continue
  const az = Math.abs((z0 + z1) / 2)
  const amp = f(42 * az ** 1.6) // screen units at the tip
  const lag = f(-((az / 1.6) * 0.32 + 1) * BEAT) // the tips follow the body
  const name = `wb${i}`
  kf(name, `0%,100%{transform:translateY(${f(-amp * 0.55)}px)}50%{transform:translateY(${f(amp * 0.45)}px)}`)
  mantaBody += `<g style="animation:${name} ${BEAT}s ease-in-out infinite ${lag}s">${glyphSvg(pts, { scale: 150, size: 9.5, sizes: 4, colour: mantaColour })}</g>`
}
defs.push(`<g id="manta">${mantaBody}</g>`)
// the poster's manta: the same pose sampled more sparsely, so the poster stays small
stills.manta = `<g id="manta">${glyphSvg(surface(manta(1.2, -1), { x: [-1.3, 0.85], z: [-1.6, 1.6], step: 0.11, elev: 0.9, yaw: 0.45, dist: 2.6, ramp: ' .,:;-=+*#%' }), { scale: 150, size: 16, sizes: 2, colour: mantaColour })}</g>`
const MANTA = '<use href="#manta"/>'

// ── the moon jellies, drawn like the manta: the bell's glyphs set on its dome in 3D, magenta at the crown
// fading through violet to blue at the rim, the whole bell pulsing slowly (a squeeze, not a flipbook);
// beneath it strings of glyphs for tentacles, each lit from magenta through blue to cyan toward its tip,
// swaying one after another so a wave runs across them.
const BELL = [[0, [255, 120, 230]], [0.45, [200, 90, 255]], [0.8, [90, 120, 255]], [1, [60, 200, 255]]]
const mixBell = r => {
  for (let i = 1; i < BELL.length; i++) {
    const [a, ca] = BELL[i - 1], [b, cb] = BELL[i]
    if (r <= b) { const t = (r - a) / (b - a); return ca.map((c, j) => c + (cb[j] - c) * t) }
  }
  return BELL.at(-1)[1]
}
const TENTACLE = [[[255, 90, 220], [120, 110, 255], [70, 220, 255]], [[110, 120, 255], [190, 80, 255], [255, 120, 210]], [[60, 200, 255], [90, 120, 255], [220, 90, 255]]]
const along = (stops, t) => { const k = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(k)), u = k - i; return stops[i].map((c, j) => c + (stops[i + 1][j] - c) * u) }
function glyphJelly(id, pulse) {
  const pts = surface(jellyBell(0.9), { x: [-1, 1], z: [-1, 1], step: 0.085, elev: 0.5, yaw: 0, dist: 3, ramp: ' .,:;-=+*#%' })
  const bell = glyphSvg(pts, { scale: 92, size: 8.5, sizes: 3, colour: p => {
    const r = Math.min(1, Math.hypot(p.x, p.z) / 0.82)
    const lv = Math.round((0.45 + 0.75 * p.v) * 4) / 4
    return [hex(mixBell(Math.round(r * 6) / 6).map(c => c * lv)), 1]
  } })
  let tentacles = ''
  const N = 9
  for (let i = 0; i < N; i++) {
    const x0 = -66 + (132 * i) / (N - 1), len = 120 + ((i * 37) % 5) * 22, n = Math.round(len / 11)
    const stops = TENTACLE[i % TENTACLE.length]
    const groups = new Map()
    for (let j = 0; j < n; j++) {
      const t = j / (n - 1)
      const fs = f(9 - 3 * t)
      const col = hex(along(stops, t).map(c => c * (1 - 0.25 * t)))
      const key = `${fs}|${col}`
      if (!groups.has(key)) groups.set(key, [])
      const gx = x0 * (1 - 0.25 * t) + Math.sin(t * 5 + i) * 6 * t
      groups.get(key).push([gx - 0.3 * fs, 26 + len * t + 0.35 * fs, t > 0.7 ? (j % 2 ? '.' : ':') : '|)(|:'[(j + i) % 5]])
    }
    let body = ''
    for (const [key, gs] of groups) {
      const [fs, col] = key.split('|')
      body += `<text font-size="${fs}" fill="${col}" x="${gs.map(g => f(g[0])).join(' ')}" y="${gs.map(g => f(g[1])).join(' ')}">${gs.map(g => g[2]).join('')}</text>`
    }
    tentacles += `<g class="tw" style="transform-origin:${f(x0)}px 26px;animation-duration:${pulse}s;animation-delay:${f(-((i / N) * 0.5 + 1) * pulse)}s">${body}</g>`
  }
  // two frilled oral arms in the middle, pink
  for (const ox of [-10, 10]) {
    let xs = [], ys = [], ch = ''
    for (let j = 0; j < 9; j++) { xs.push(f(ox + Math.sin(j * 0.9 + ox) * 5 - 3)); ys.push(f(30 + j * 9)); ch += j % 2 ? '}' : '{' }
    tentacles += `<g class="tw" style="transform-origin:${ox}px 26px;animation-duration:${pulse}s;animation-delay:${f(-0.7 * pulse)}s"><text font-size="10" fill="#ff8ad8" x="${xs.join(' ')}" y="${ys.join(' ')}">${ch}</text></g>`
  }
  const body = `<g class="bell" style="animation-duration:${pulse}s">${bell}</g>${tentacles}`
  defs.push(`<g id="${id}">${body}</g>`)
  stills[id] = `<g id="${id}">${bell}</g>` // the poster: the bell alone
}
kf('pulse', '0%,100%{transform:scale(1,1)}22%{transform:scale(.86,1.1)}')
kf('trail', '0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}')
glyphJelly('jellyA', 10.5)
glyphJelly('jellyB', 12.2)

// ── a shaft of light from the surface, falling on the manta and fraying as it sinks, in block glyphs:
// columns of small ░▒▓ cells, on one grid, each column breaking into fainter and fainter runs toward
// its ragged end, like light in a pixel-art sea. The glyphs are a pattern tile (drawn once, then
// repeated), so a hundred columns cost almost nothing; under them a soft trapezoid of light.
const SHAFT_X = 430, SHAFT_TOP = 150, SHAFT_FOOT = 230 // centre and half-widths at top and foot
const CELL_W = 4.8, CELL_H = 8 // a block glyph at font size 8
const TILE_C = 12, TILE_R = 16
let tile = ''
for (let r = 0; r < TILE_R; r++) {
  let row = ''
  for (let c = 0; c < TILE_C; c++) { const v = R(); row += v < 0.42 ? '▓' : v < 0.78 ? '▒' : v < 0.94 ? '░' : ' ' }
  tile += `<text x="0" y="${f(r * CELL_H)}">${row}</text>`
}
// a second, paler tile for the light that flares now and then
const RAYS_PATTERN_W = `<pattern id="rayW" width="${f(TILE_C * CELL_W)}" height="${TILE_R * CELL_H}" patternUnits="userSpaceOnUse"><g style="font-size:8px;fill:#d8fbff;dominant-baseline:hanging">${tile}</g></pattern>`
const RAYS_PATTERN = `<pattern id="rayP" width="${f(TILE_C * CELL_W)}" height="${TILE_R * CELL_H}" patternUnits="userSpaceOnUse"><g style="font-size:8px;fill:#7fe3f7;dominant-baseline:hanging">${tile}</g></pattern>`
const snap = x => Math.round(x / CELL_W) * CELL_W
// runs grouped by brightness: each level is one path of many rectangles, so the pattern is painted
// a handful of times, not once per run
const LEVELS = [0.26, 0.15, 0.08, 0.04]
const runs = LEVELS.map(() => [])
const addRun = (x, y, h, a) => { const k = LEVELS.findIndex(l => a >= l * 0.8); if (k >= 0) runs[k].push(`M${f(x)} ${y}h${f(CELL_W)}v${h}h${f(-CELL_W)}z`) }
// one column every cell or two across the shaft, the middle brightest
for (let x = snap(SHAFT_X - SHAFT_FOOT); x <= SHAFT_X + SHAFT_FOOT; x += CELL_W * (R() < 0.7 ? 1 : 2)) {
  const u = (x - SHAFT_X) / SHAFT_FOOT
  if (Math.abs(u) > 1 || R() < 0.12) continue
  const edge = 1 - Math.abs(u) ** 1.6
  let y = Math.round((-40 + R() * 120) / CELL_H) * CELL_H
  const total = (300 + R() * 650) * (0.45 + 0.55 * edge)
  let a = (0.16 + R() * 0.16) * edge
  // runs, each shorter and fainter, with gaps between them: the ragged end
  while (y < total && a > 0.012) {
    const run = Math.round((40 + R() * 160) / CELL_H) * CELL_H
    addRun(x, y, run, a)
    y += run + Math.round((R() * 40) / CELL_H) * CELL_H
    a *= 0.62
  }
}
// dimmer columns either side, where the light hardly reaches
for (let i = 0; i < 24; i++) {
  const side = i % 2 ? 1 : -1
  const x = snap(SHAFT_X + side * (SHAFT_FOOT + 10 + R() * 300))
  let y = Math.round((60 + R() * 260) / CELL_H) * CELL_H, a = 0.05 + R() * 0.06
  while (y < H && a > 0.01) {
    const run = Math.round((60 + R() * 220) / CELL_H) * CELL_H
    addRun(x, y, run, a)
    y += run + Math.round((R() * 60) / CELL_H) * CELL_H
    a *= 0.7
  }
}
// two trapezoids, one narrower, so the glow under the columns has soft edges
const trap = k => `<path d="M${f(SHAFT_X - SHAFT_TOP * k)} -20 L${f(SHAFT_X + SHAFT_TOP * k)} -20 L${f(SHAFT_X + SHAFT_FOOT * k)} ${H} L${f(SHAFT_X - SHAFT_FOOT * k)} ${H} Z" fill="url(#shaft)" opacity=".55"/>`
// the light moves a little, like caustics: each level of columns breathes on its own slow period
// (co-prime, so they never line up), and the whole shaft leans a few units one way and the other
const BREATH = [13, 19, 23, 29]
LEVELS.forEach((l, k) => kf(`ray${k}`, `0%,100%{opacity:${l}}50%{opacity:${f(l * 0.45)}}`))
const streaks = runs.map((r, k) => r.length ? `<path d="${r.join('')}" fill="url(#rayP)" opacity="${LEVELS[k]}" style="animation:ray${k} ${BREATH[k]}s ease-in-out infinite ${f(-R() * BREATH[k])}s"/>` : '').join('')
// now and then a few columns near the middle light up paler, swell and fade, like sun through a wave
const flare = []
for (let i = 0; i < 14; i++) {
  const x = snap(SHAFT_X + (R() * 2 - 1) * SHAFT_TOP * 0.8)
  const y = Math.round((R() * 80) / CELL_H) * CELL_H, h = Math.round((160 + R() * 320) / CELL_H) * CELL_H
  flare.push(`M${f(x)} ${y}h${f(CELL_W)}v${h}h${f(-CELL_W)}z`)
}
kf('flare', '0%,72%,100%{opacity:0}84%{opacity:.22}')
kf('lean', `0%,100%{transform:translateX(-3px)}50%{transform:translateX(3px)}`)
const SHAFT = `${trap(1.1)}${trap(0.65)}<g style="animation:lean 41s ease-in-out infinite">${streaks}<path d="${flare.join('')}" fill="url(#rayW)" opacity="0" style="animation:flare 53s ease-in-out infinite -20s"/></g>`

// ── algae: strings of glyphs along a curve, as ASCII games draw their plants, larger at the root and
// smaller toward the tip, colour lighting up toward the tip, each swaying slowly about its root. Lime
// at the left, under the manta; magenta at the right, under the jellies. A little colour in the deep.
const ALGAE = {
  lime: { glyphs: 'Y|)(|v*:|)', root: [32, 92, 40], tip: [190, 255, 90] },
  magenta: { glyphs: 'Y%+*%+Y:', root: [90, 20, 110], tip: [255, 80, 220] },
}
const FRONDS = [
  // x, root y, height, bend (+ right), kind, sway period (s)
  [70, 1010, 330, 0.8, 'lime', 23], [170, 1010, 380, 0.5, 'lime', 31], [236, 1014, 210, -0.9, 'lime', 19],
  [1190, 1012, 200, -0.7, 'magenta', 25], [1250, 1010, 290, 0.6, 'magenta', 33], [1360, 1010, 240, 0.9, 'magenta', 28],
  
]
let algae = ''
FRONDS.forEach(([x, y, h, bend, kind, per], i) => {
  const A = ALGAE[kind]
  const n = Math.round(h / 14)
  const groups = new Map()
  // two or three strands side by side, a little apart at the root and closer toward the tip
  for (let strand = 0; strand < 2; strand++) for (let j = 0; j < n; j++) {
    const t = j / (n - 1)
    const off = (strand - 0.8) * 9 * (1 - t * 0.7)
    const gx = x + off + Math.sin(t * Math.PI * 0.9) * bend * h * 0.28 * t
    const gy = y - h * t - strand * 6
    const fs = f(14 - 7 * t)
    const lv = 0.75 + 0.6 * t
    const col = hex(A.root.map((c, k) => (c + (A.tip[k] - c) * t) * (0.7 + 0.5 * lv)))
    const key = `${fs}|${col}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push([gx - 0.3 * fs, gy + 0.35 * fs, A.glyphs[(j + i + strand * 3) % A.glyphs.length]])
  }
  let body = ''
  for (const [key, gs] of groups) {
    const [fs, col] = key.split('|')
    body += `<text font-size="${fs}" fill="${col}" x="${gs.map(g => f(g[0])).join(' ')}" y="${gs.map(g => f(g[1])).join(' ')}">${gs.map(g => g[2]).join('').replace(/</g, '&lt;')}</text>`
  }
  kf(`sway${i}`, `0%,100%{transform:rotate(${f(-2.5 - Math.abs(bend))}deg)}50%{transform:rotate(${f(2.5 + Math.abs(bend))}deg)}`)
  algae += `<g style="transform-box:view-box;transform-origin:${x}px ${y}px;animation:sway${i} ${per}s ease-in-out infinite ${f(-R() * per)}s">${body}</g>`
})

// ── plankton: a sparse tile of glyphs, drifting down slowly
function planktonTile(id, size, n, glyphs, fs, o0, o1) {
  let t = ''
  for (let i = 0; i < n; i++) t += `<text x="${f(R() * size)}" y="${f(R() * size)}" fill-opacity="${f(rr(o0, o1))}">${glyphs[Math.floor(R() * glyphs.length)]}</text>`
  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><g style="font-size:${fs}px">${t}</g></pattern>`
}

const DEFS = `<defs>
<linearGradient id="shaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fd2f0" stop-opacity=".12"/><stop offset=".35" stop-color="#2aa6c8" stop-opacity=".06"/><stop offset=".8" stop-color="#16708f" stop-opacity=".025"/><stop offset="1" stop-color="#16708f" stop-opacity="0"/></linearGradient>
<linearGradient id="streak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bff4ff" stop-opacity="0"/><stop offset=".18" stop-color="#bff4ff" stop-opacity=".8"/><stop offset=".45" stop-color="#5cd4ee" stop-opacity=".45"/><stop offset="1" stop-color="#2a9cbf" stop-opacity="0"/></linearGradient>
<linearGradient id="streakDim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d5f74" stop-opacity="0"/><stop offset=".3" stop-color="#1d5f74" stop-opacity=".35"/><stop offset="1" stop-color="#0d3a4a" stop-opacity="0"/></linearGradient>
${RAYS_PATTERN}${RAYS_PATTERN_W}
<filter id="bloom" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<linearGradient id="sea" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#061620"/><stop offset=".6" stop-color="#050f18"/><stop offset="1" stop-color="#040b13"/></linearGradient>
<radialGradient id="tealGlow"><stop offset="0" stop-color="#14b8a6" stop-opacity=".36"/><stop offset=".55" stop-color="#0e6f7a" stop-opacity=".16"/><stop offset="1" stop-color="#145d66" stop-opacity="0"/></radialGradient>
<radialGradient id="violetGlow"><stop offset="0" stop-color="#7b2ff0" stop-opacity=".26"/><stop offset=".6" stop-color="#4a1fa0" stop-opacity=".12"/><stop offset="1" stop-color="#2e2670" stop-opacity="0"/></radialGradient>
<radialGradient id="jglow"><stop offset="0" stop-color="#9c88ff" stop-opacity=".14"/><stop offset="1" stop-color="#9c88ff" stop-opacity="0"/></radialGradient>
${planktonTile('plankton', 480, 34, '.·', 10, 0.25, 0.7)}
${defs.join('')}
</defs>`

// The manta only ever swims forward, along its heading (left and a little up on screen): it comes in
// small and far from behind, grows to its place in the light, glides there a while, then swims on,
// shrinking away until it is gone; after a pause it comes again. One journey every JOURNEY seconds.
const JOURNEY = 150, HEAD = [-0.935, -0.355], REACH = 500
const at = (d, k = 1) => `translate(${f(HEAD[0] * d)}px,${f(HEAD[1] * d)}px) scale(${k})`
kf('journey', `0%{transform:${at(-REACH, 0.35)};opacity:0}10%{opacity:1}38%{transform:${at(0)}}62%{transform:${at(45)}}86%{transform:${at(REACH, 0.35)};opacity:1}92%,100%{transform:${at(REACH, 0.35)};opacity:0}`)
kf('orbitY', '0%,100%{transform:translateY(0)}50%{transform:translateY(-46px)}')
kf('bank', '0%,100%{transform:rotate(-5deg)}50%{transform:rotate(6deg)}')
kf('breathe', '0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(var(--x),var(--y)) scale(1.15)}')
kf('drift', '0%,100%{transform:translate(0,30px)}50%{transform:translate(10px,-60px)}')
kf('fall', 'from{transform:translateY(0)}to{transform:translateY(480px)}')

const style = `<style>
text{font-family:ui-monospace,Menlo,"SF Mono","DejaVu Sans Mono",Consolas,monospace;font-size:${FS}px;white-space:pre;dominant-baseline:hanging}
.fr{opacity:0}.fr.f0{opacity:1}
pattern text{fill:#7fd6cc}
.plank{animation:fall 240s linear infinite;opacity:.35}
.glowA{--x:-90px;--y:-50px;animation:breathe 67s ease-in-out infinite}.glowB{--x:80px;--y:60px;animation:breathe 89s ease-in-out infinite -30s}
.oX{animation:journey ${JOURNEY}s ease-in-out infinite ${f(-0.45 * JOURNEY)}s}.oY{animation:orbitY 37s ease-in-out infinite -9s}.bank{animation:bank 41s ease-in-out infinite -6s}
.manta{opacity:.95}.manta text,.algae text{dominant-baseline:auto}.algae{opacity:.9}

.jdrift{animation:drift 83s ease-in-out infinite}.jelly{opacity:.9}.jelly text{dominant-baseline:auto}.bell{transform-origin:0 0;animation-name:pulse;animation-timing-function:ease-in-out;animation-iteration-count:infinite}.tw{animation-name:trail;animation-timing-function:ease-in-out;animation-iteration-count:infinite}
${css}@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>`

// Anchored bottom-left, the manta in the open field beside the sidebar (docs/DIRECTION.md, Layout); the
// jellies keep to the right, companions that may vanish behind the right panel.
const svg = inlineUses(`<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMax slice">
${style}
${DEFS}
<rect width="${W}" height="${H}" fill="url(#sea)"/>
<g class="glowB"><circle cx="1300" cy="260" r="620" fill="url(#violetGlow)"/></g>
<g class="glowA"><circle cx="430" cy="820" r="560" fill="url(#tealGlow)"/></g>
<g class="shaft">${SHAFT}</g>
<g class="plank"><rect y="-480" width="${W}" height="${H + 480}" fill="url(#plankton)"/></g>
<g class="jelly" filter="url(#bloom)"><g transform="translate(1250 420) scale(.8)"><g class="jdrift"><circle r="120" fill="url(#jglow)"/><use href="#jellyA"/></g></g>
<g transform="translate(1390 640) scale(.5)"><g class="jdrift" style="animation-delay:-40s"><circle r="120" fill="url(#jglow)"/><use href="#jellyB"/></g></g></g>
<g class="algae">${algae}</g>
<g class="manta" transform="translate(420 760)"><g class="oX"><g class="oY"><g class="bank"><g filter="url(#bloom)">${MANTA}</g></g></g></g></g>
</svg>`.replace(/\n\s*\n/g, '\n'))

// the poster: the same composition, still, with only the manta and the near jelly
const poster = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMax slice" width="320" height="180">
<style>text{font-family:ui-monospace,Menlo,monospace;font-size:${FS}px;white-space:pre;dominant-baseline:hanging}</style>
<defs><linearGradient id="sea" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#061620"/><stop offset="1" stop-color="#040b13"/></linearGradient>
<radialGradient id="tealGlow"><stop offset="0" stop-color="#14b8a6" stop-opacity=".36"/><stop offset="1" stop-color="#145d66" stop-opacity="0"/></radialGradient>
<radialGradient id="violetGlow"><stop offset="0" stop-color="#7b2ff0" stop-opacity=".26"/><stop offset="1" stop-color="#2e2670" stop-opacity="0"/></radialGradient>
${stills.manta}${stills.jellyA}</defs>
<rect width="${W}" height="${H}" fill="url(#sea)"/><circle cx="1300" cy="260" r="620" fill="url(#violetGlow)"/><circle cx="430" cy="820" r="560" fill="url(#tealGlow)"/>
<g opacity=".5" transform="translate(1250 420) scale(.8)"><use href="#jellyA"/></g>
<g opacity=".95" transform="translate(420 760)"><use href="#manta"/></g>
</svg>`.replace(/\n/g, '')

// the app draws nothing a <use> points at: every scene is written out in full
const SVG = inlineUses(svg), POSTER_SVG = inlineUses(poster)
console.log(`abyssal: ${SVG.length} characters, poster ${POSTER_SVG.length}`)
if (POSTER_SVG.length >= 12000) throw new Error('poster over 12,000 characters')
if (SVG.length >= 131072) throw new Error(`scene is ${SVG.length} characters, over 131,072`)
writeFileSync(join(ROOT, 'hooks/looks/abyssal/scene.js'),
  `// Generated by tools/scenes/abyssal.mjs: the deep sea in glyphs, its rare animals raymarched into ASCII.\nexport const SCENE = ${JSON.stringify(SVG)}\nexport const POSTER = ${JSON.stringify(POSTER_SVG)}\n`)
