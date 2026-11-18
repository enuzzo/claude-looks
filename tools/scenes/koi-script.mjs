// koi scene generator. Run: node tools/scenes/koi-script.mjs
// A still pond seen from above, in glyphs. Three koi circle in the bottom-right corner, each on its own
// depth: the near one large, bright and slow, the far ones smaller, dimmer and closer to the water.
// The koi is a real solid (a signed distance field in koi.mjs), raymarched here at build time into ASCII,
// one frame per step of a stroke-and-glide cycle, shown in turn like a flipbook, and the lap is a
// slow turn of the whole sprite, whose spine is already bent to the circle it swims. The three wear the
// same flipbook in different coats: a kohaku, a sanke and a pale ogon. In the near koi's wake a few rings
// of dots open; minutes apart a petal comes down at the heart of it all.
//
// Everything is laid out on the golden ratio. The frame's own golden spiral converges on its eye, at
// φ²/(φ²+1) of the width and of the height; from that point a second golden spiral winds into the
// corner, in the strip the conversation leaves open. The koi swim the full circles of three successive
// quarter-arcs of it, so their circles, and their sizes, shrink by φ each time (1, 1/φ, 1/φ²) and touch
// where the arcs meet. The petal lands on that spiral's eye. The periods are Fibonacci numbers (laps of
// 144, 89 and 55 s, the petal every 233 s), which sit in the same ratio and share no factor.
//
// The same pond is written twice: at night (SCENE) and by day (SCENE_DAY), under slow caustics.
import { writeFileSync } from 'node:fs'
import { inlineUses } from './inline-uses.mjs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { render } from './ascii3d.mjs'
import { koi, PHI, RED, SUMI, FIN } from './koi.mjs'
import { glyphSvg, surface } from './glyph3d.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

const f = n => +n.toFixed(2)
const W = 1600
const H = 1000
const RAMP = ' .,:;-=+*#'
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const cell = fs => [0.602 * fs, 0.7 * fs] // a monospace advance at a font size, and a tight line step

// ── the composition
// G is the eye of the frame's golden spiral. The rectangle from G to the corner has the frame's own
// proportions; the second spiral is drawn in it at 7/8 of its size, so the largest circle and the
// koi's fins clear the frame's edges.
const G = [(W * PHI ** 2) / (PHI ** 2 + 1), (H * PHI ** 2) / (PHI ** 2 + 1)]
const INSET = 7 / 8
const A2 = (H - G[1]) * INSET // the spiral's first quarter-arc from G (no koi swims it)
const RADII = [A2 / PHI, A2 / PHI ** 2, A2 / PHI ** 3] // the three circles
const C1 = [G[0] + A2, G[1] + A2 - RADII[0]]
const C2 = [C1[0] + RADII[0] - RADII[1], C1[1]]
const C3 = [C2[0], C2[1] - RADII[1] + RADII[2]]
// the eye: where the centres of the ever smaller arcs converge
const EYE = (() => {
  let [x, y] = C3, r = RADII[2]
  const turns = [[1, 0], [0, -1], [-1, 0], [0, 1]] // the centre steps left, down, right, up, by r − r/φ
  for (let i = 0; i < 24; i++) { const [dx, dy] = turns[(i + 2) % 4]; const step = r - r / PHI; x += dx * step; y += dy * step; r /= PHI }
  return [x, y]
})()

// the whole spiral moves left by KX, from the corner into the open field: the near koi's circle centred at ~400
const KX = -1070

const UNIT = RADII[0] / PHI // viewBox units per body unit: each koi's circle has a radius of φ body units
const DX = 0.0472 // one glyph cell, in body units: the detail of the sprite
const FS = (DX * UNIT) / 0.602 // the near koi's font size; the others are the same sprite at 1/φ and 1/φ²
const FRAMES = 8
// centre, scale, lap and stroke periods (s), the angle on its circle at t = 0 (counter-clockwise from the
// foot), and the frame it holds when nothing moves
const KOI = [
  { id: 'k1', c: C1, scale: 1, lap: 144, beat: 19, start: 100, hold: 2 },
  { id: 'k2', c: C2, scale: 1 / PHI, lap: 89, beat: 17, start: 320, hold: 4, frames: 4 },
  { id: 'k3', c: C3, scale: 1 / PHI ** 2, lap: 55, beat: 13, start: 270, hold: 7, frames: 1 },
]
// the markings every frame carries, [s, z, rs, rz] in body units: red patches along the back, and small
// ink marks in the white between them. Each koi colours them its own way (see the coats below).
const MARKS = [[0.66, 0, 0.17, 0.17], [0.14, -0.07, 0.25, 0.2], [-0.38, 0.06, 0.16, 0.18], [-0.78, 0, 0.09, 0.08]]
const SPOTS = [[0.93, -0.05, 0.06, 0.06], [0.43, 0.1, 0.07, 0.08], [0.3, 0.2, 0.09, 0.05], [-0.15, 0.13, 0.07, 0.08], [-0.6, -0.03, 0.07, 0.06]]

// ── sprites: frames of [char, level, depth, tag] rows → <text> rows, the tag as a tspan class
function trimAll(frames) {
  let r0 = Infinity, r1 = -1, c0 = Infinity, c1 = -1
  for (const fr of frames) fr.forEach((row, r) => row.forEach(([ch], c) => {
    if (ch !== ' ') { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c) }
  }))
  return { frames: frames.map(fr => fr.slice(r0, r1 + 1).map(row => row.slice(c0, c1 + 1))), r0, c0 }
}
function rows(frame, cw, ch, cls = {}) {
  let s = ''
  frame.forEach((row, r) => {
    let end = row.length
    while (end > 0 && row[end - 1][0] === ' ') end--
    let start = 0
    while (start < end && row[start][0] === ' ') start++
    if (start >= end) return
    let line = '', cur, run = ''
    const flush = () => { if (run) line += cls[cur] ? `<tspan class="${cls[cur]}">${esc(run)}</tspan>` : esc(run); run = '' }
    for (let c = start; c < end; c++) {
      const [chr, , , tag] = row[c]
      if (chr !== ' ' && cls[tag] !== cls[cur]) { flush(); cur = tag }
      run += chr
    }
    flush()
    s += `<text x="${f(start * cw)}" y="${f(r * ch)}">${line}</text>`
  })
  return s
}

// ── the koi, drawn the way ASCII games like Effulgence draw their creatures (tools/scenes/glyph3d.mjs):
// glyphs set on the body's own surface, seen from a little off straight down so the body has volume,
// each glyph coloured by the part of the coat it lies on (white, red patch, ink mark, fin) and lit by the
// body's shading, in a soft bloom. One pose per koi, cut into strips along the body; each strip sways
// across the swim on its own phase, later toward the tail, so the stroke is a wave running from head to
// tail, smooth and cheap (a flipbook of poses is drawn whole on every frame, shown or not).
const KOI_STEP = [0.058, 0.075, 0.098] // body units between glyphs: the far koi are sampled more sparsely
const KOI_SIZE = [6.6, 8.2, 10] // font size before each koi's own scale: the small ones stay legible
const POSE = KOI.map(k => koi(k.hold / FRAMES, { radius: PHI, turn: -1, marks: MARKS, spots: SPOTS }))
const sample = (i, step) => surface(POSE[i].sdf, { x: [-1.9, 1.2], z: [-1.3, 0.7], step, elev: 1.3, dist: 3, ramp: ' .,:;-=+*#%', tag: POSE[i].tag, tex: POSE[i].tex })
const PTS = KOI.map((k, i) => sample(i, KOI_STEP[i]))
const PTS_POSTER = KOI.map((k, i) => sample(i, KOI_STEP[i] * 2))
const hex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
const coatColour = c => p => {
  const lv = (Math.round((0.4 + 0.75 * p.v) * 4) / 4) * (c.dim ?? 1)
  const base = p.tag === RED ? c.red : p.tag === SUMI ? c.ink : p.tag === FIN ? c.fin : c.white
  return [hex(base.map(x => x * lv)), p.tag === FIN ? 0.6 : 1]
}
const STRIPS = 12, NOSE_X = 1.2, TAIL_X = -1.9
function koiGlyphs(i, coat, anim, pts = PTS[i]) {
  const k = KOI[i], opts = { scale: UNIT, size: KOI_SIZE[i], sizes: 3, colour: coatColour(coat) }
  if (!anim) return glyphSvg(pts, opts)
  const beat = f(k.beat / 2.4)
  let out = ''
  for (let j = 0; j < STRIPS; j++) {
    const xa = NOSE_X - ((NOSE_X - TAIL_X) * j) / STRIPS, xb = NOSE_X - ((NOSE_X - TAIL_X) * (j + 1)) / STRIPS
    const strip = pts.filter(p => p.x <= xa && (p.x > xb || j === STRIPS - 1))
    if (!strip.length) continue
    const u = (j + 0.5) / STRIPS // 0 at the nose, 1 at the tail
    const amp = f(0.11 * UNIT * u * u)
    const name = `sw${i}_${j}`
    css.push(`@keyframes ${name}{0%,100%{transform:translateY(${-amp}px)}50%{transform:translateY(${amp}px)}}`)
    out += `<g style="animation:${name} ${beat}s ease-in-out infinite ${f(-(u * 0.45 + 1) * beat)}s">${glyphSvg(strip, opts)}</g>`
  }
  return out
}
const css = []
// a koi in place: turned to its starting angle, lapping counter-clockwise, at the foot of its circle
function koiAt(k, i, anim, glyphs) {
  const r = RADII[i]
  const body = `<g transform="scale(${f(k.scale)})">${i === 0 ? `<circle r="${f(15 * FS)}" fill="url(#halo)"/>` : ''}<g class="book">${glyphs}</g></g>`
  const at = `translate(${f(k.c[0])} ${f(k.c[1])}) rotate(${-k.start})`
  if (!anim) return `<g class="${k.id}" transform="${at}"><g transform="translate(0 ${f(r)})">${body}</g></g>`
  // the place glides round the circle; only the heading turns in steps, half a degree about the fish's own
  // middle, too small to see under the wave. Text turned smoothly is drawn afresh every frame and costs
  // 1.5 ms more than this (koi 0.5.5 stuttered, its whole lap stepped about the circle's centre).
  return `<g class="${k.id}" transform="${at}"><g style="animation:orbit${i} ${k.lap}s linear infinite"><g class="lap" style="animation-duration:${k.lap}s">${body}</g></g></g>`
}
// the orbit as a polygon of 72 sides: off the circle by r·(1 − cos 2.5°), under half a unit
const ORBIT_CSS = KOI.map((k, i) => {
  const r = RADII[i], n = 72
  const stops = Array.from({ length: n + 1 }, (_, j) => {
    const a = (2 * Math.PI * j) / n
    return `${f((100 * j) / n)}%{transform:translate(${f(r * Math.sin(a))}px,${f(r * Math.cos(a))}px)}`
  })
  return `@keyframes orbit${i}{${stops.join('')}}`
}).join('\n')
// ── lily pads, in glyphs set in 3D like the koi: thin discs with a notch, veins running out from the
// middle, deep green going to lime at the rim; on two of them a lotus in pink and magenta, the scene's
// bright accent. They lie still, as pads do on a calm pond. One by the koi on the left, two far off on the right.
const PADS = [
  // x, y, radius (viewBox), notch angle (deg), lotus?, rock period (s)
  [236, 548, 70, 30, true, 23], [1336, 652, 48, 300, false, 19], [1470, 872, 76, 70, true, 37],
]
// A pad is a shape, an ellipse foreshortened by the view with its notch cut out, filled with a small
// tile of dithered block glyphs (drawn once, repeated: a leaf of a few hundred glyphs for the cost of a
// handful); a second, smaller shape in a lighter tile lights its middle.
const padTile = (id, fill) => {
  let t = ''
  for (let r = 0; r < 8; r++) {
    let row = ''
    for (let c = 0; c < 10; c++) { const v = R(); row += v < 0.45 ? '▓' : v < 0.8 ? '▒' : '░' }
    t += `<text x="0" y="${f(r * 9)}" style="fill:${fill}">${row}</text>` // its own fill: `pattern text` styles the specks
  }
  return `<pattern id="${id}" width="${f(10 * 0.602 * 9)}" height="72" patternUnits="userSpaceOnUse"><g style="font-size:10px;fill:${fill};dominant-baseline:hanging">${t}</g></pattern>` // 10px glyphs on 9-unit rows overlap: no seam
}
const PAD_TILES = night => padTile('padD', night ? '#2a6b34' : '#337d3c') + padTile('padL', night ? '#6ac24c' : '#82d85a')
function padShape(rad, notch, k) {
  const rx = rad * k, ry = rad * 0.78 * k, a = (notch * Math.PI) / 180, w = 0.2
  const p = t => `${f(Math.cos(t) * rx)} ${f(Math.sin(t) * ry)}`
  return `M0 0L${p(a + w)}A${f(rx)} ${f(ry)} 0 1 1 ${p(a - w)}Z`
}
function padGlyphs([, , rad, notch]) {
  return `<path d="${padShape(rad, notch, 1)}" fill="url(#padD)"/><path d="${padShape(rad, notch, 0.62)}" fill="url(#padL)" opacity=".7"/>`
}
function lotus(rad) {
  // two rings of petals and a pale heart, a little above the pad
  let out = ''
  const ring = (n, rr, ch, col, fs, off = 0) => {
    const xs = [], ys = []
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + off; xs.push(f(Math.cos(a) * rr - 0.3 * fs)); ys.push(f(Math.sin(a) * rr * 0.62 + 0.35 * fs - rad * 0.12)) }
    out += `<text font-size="${fs}" fill="${col}" x="${xs.join(' ')}" y="${ys.join(' ')}">${ch.repeat(n)}</text>`
  }
  ring(12, rad * 0.42, 'o', '#ff4cc0', 13)
  ring(10, rad * 0.3, '%', '#ff8ee0', 12, 0.3)
  ring(7, rad * 0.17, '*', '#ffb3e6', 11, 0.1)
  out += `<text font-size="12" fill="#ffe9a8" x="${f(-3.6)}" y="${f(4.2 - rad * 0.12)}">@</text>`
  return out // no bloom here: a filter inside a moving group is recomputed on every frame
}
// the pads, then the flowers: bright on their own, without a bloom (a filter costs even on still type)
const padsSvg = night => PADS.map(([x, y, rad, notch]) => `<g transform="translate(${x} ${y})">${padGlyphs([x, y, rad, notch], night)}</g>`).join('') +
  PADS.filter(p => p[4]).map(([x, y, rad]) => `<g transform="translate(${x} ${y})">${lotus(rad)}</g>`).join('')

// where a koi's middle is t seconds in
const where = (i, t) => {
  const k = KOI[i], a = ((k.start + (360 * t) / k.lap) * Math.PI) / 180
  return [k.c[0] + RADII[i] * Math.sin(a), k.c[1] + RADII[i] * Math.cos(a)]
}

// ── a petal: a few glyphs set as a small leaning blade
const PETAL_FS = 9
const PETAL = `<g id="petal" class="pt" style="font-size:${PETAL_FS}px" transform="translate(-8 -7)"><text x="${f(0.602 * PETAL_FS)}" y="0">/')</text><text x="0" y="${f(0.8 * PETAL_FS)}">(,/</text></g>`

// ── rings: circles of middle dots on a fine grid, each a little wider and a little sparser than the last
const RING_FS = 6
function ring(j, radius, keep) {
  const [cw, ch] = cell(RING_FS)
  const nc = Math.ceil(radius / cw) + 1, nr = Math.ceil(radius / ch) + 1
  const fr = []
  for (let r = -nr; r <= nr; r++) {
    const row = []
    for (let c = -nc; c <= nc; c++) {
      const d = Math.hypot(c * cw, r * ch)
      row.push([Math.abs(d - radius) < ch * 0.5 && (c * 7 + r * 13 + j * 5 + 1000) % 10 < keep * 10 ? '·' : ' '])
    }
    fr.push(row)
  }
  return `<g id="rg${j}" style="font-size:${RING_FS}px" transform="translate(${f(-(nc + 0.5) * cw)} ${f(-(nr + 0.5) * ch)})">${rows(fr, cw, ch)}</g>`
}
const RING_R = [13, 21, 34, 55] // Fibonacci again
const RINGS = RING_R.map((r, j) => ring(j, r, 1 - j * 0.07)).join('')
const STEP = 3.4 // seconds between one ring and the next: they open slowly
// one set of rings opening at (x, y), `first` seconds after the scene opens and every `cycle` after;
// `count` rings, the outer ones fainter. Each fades in over STEP and lingers three more.
const ringCycles = new Set()
function ripple([x, y], { cycle, first, count = RING_R.length, peak = 1 }) {
  ringCycles.add(cycle)
  let s = ''
  for (let j = 0; j < count; j++) s += `<use href="#rg${j}" class="rg" style="--o:${f(peak * (1 - j / (count + 3)))};animation:rg${cycle} ${cycle}s steps(${cycle * 3}) infinite ${f(first + j * STEP)}s"/>`
  return `<g transform="translate(${f(x)} ${f(y)})">${s}</g>`
}
const ringKf = cycle => `@keyframes rg${cycle}{0%{opacity:0}${f((STEP / cycle) * 100)}%{opacity:var(--o)}${f(((4 * STEP) / cycle) * 100)}%,100%{opacity:0}}\n`
// the near koi's wake: rings open where its tail has just passed, WAKE seconds behind its middle
const WAKE = 19
const wake = t => ripple(where(0, t - WAKE), { cycle: KOI[0].lap, first: t })

// ── specks on the surface: a sparse tile of dots, seeded
let seed = 20261116
const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
function speckTile(id, size, n) {
  let t = ''
  for (let i = 0; i < n; i++) t += `<text x="${f(R() * size)}" y="${f(R() * size)}" fill-opacity="${f(0.25 + R() * 0.5)}">${'.·'[Math.floor(R() * 2)]}</text>`
  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><g style="font-size:9px">${t}</g></pattern>`
}
const SPECKS = speckTile('specks', 420, 22)

// ── daylight: caustics, the thin bright lines ripples focus on the floor of a pond. They are the
// zero-lines of a slow field of bent waves, which close into irregular cells; where a line crosses a
// glyph cell it is set by its height in the cell (' high, - or ~ in the middle, , low; a . where it
// runs steep), so the lines curve in type. They are densest by the koi and gone before the middle. The
// sheet is drawn once and laid down twice, the two copies drifting apart and breathing out of step.
const CAUSTIC_FS = 9
const CAUSTICS = (() => {
  const cw = 0.602 * CAUSTIC_FS, ch = CAUSTIC_FS
  const x0 = 1010, y0 = 440, cols = Math.ceil((W + 30 - x0) / cw), nrows = Math.ceil((H + 30 - y0) / ch)
  const field = (x, y) => Math.sin(x / 55 + 1.7 * Math.sin(y / 89 + 1)) + Math.sin(y / 34 + 1.9 * Math.sin(x / 89 + 2)) + 0.7 * Math.sin((x + y) / 89 + 1.3 * Math.sin((x - y) / 55))
  const fr = []
  for (let r = 0; r < nrows; r++) {
    const row = []
    for (let c = 0; c < cols; c++) {
      const x = x0 + (c + 0.5) * cw, y = y0 + r * ch
      const top = field(x, y), foot = field(x, y + ch), left = field(x - cw / 2, y + ch / 2), right = field(x + cw / 2, y + ch / 2)
      // how much of the sheet is left this far from the spiral's eye
      const far = Math.hypot(x - EYE[0], y + ch / 2 - EYE[1]) / 380
      let chr = ' '
      if (R() > far ** 2.5) {
        if (top * foot < 0) {
          const p = top / (top - foot)
          chr = p < 0.3 ? "'" : p > 0.7 ? ',' : left * right < 0 ? '-' : '~'
        } else if (left * right < 0) chr = '.'
      }
      row.push([chr])
    }
    fr.push(row)
  }
  return `<g id="caustics" class="cs" style="font-size:${CAUSTIC_FS}px" transform="translate(${x0} ${y0})">${rows(fr, cw, ch)}</g>`
})()

// ── the two ponds. A coat is the colour of the white (a gradient from head to tail on the near koi), of
// the red marks, of the ink marks, and how much of the koi shows at its depth: the near koi is a kohaku
// (its ink stays white), the middle one a sanke, the far one an ogon, one pale metal all over.
const LOOKS = {
  night: {
    water: ['#08161f', '#060f19', '#050b14'],
    glowA: ['#17606a', 0.34, '#0f4654', 0.12], // the lit water around the koi
    glowB: ['#2c2f7a', 0.26, '#1f2260', 0.09], // moonlight far across the pond
    halo: ['#ffc2a6', 0.1],
    coats: [
      { white: [255, 244, 228], red: [255, 118, 76], ink: [255, 244, 228], fin: [150, 205, 218] }, // kohaku
      { white: [226, 240, 240], red: [255, 126, 88], ink: [44, 56, 104], fin: [140, 190, 210], dim: 0.8 }, // sanke
      { white: [255, 198, 88], red: [255, 198, 88], ink: [255, 198, 88], fin: [210, 190, 130], dim: 0.6 }, // ogon
    ],
    k1: { white: ['#f6eede', '#d6d8d0', '#a3b7ba'], red: '#e45b3d', opacity: 1 },
    k2: { white: '#b4c9ca', red: '#c0553f', ink: '#32405c', opacity: 0.7 },
    k3: { white: '#b3a47c', opacity: 0.5 },
    ring: '#c4ece6', speck: '#8fc7c4', speckOpacity: 0.3,
    petal: ['#fde9e4', '#e3a9ad'],
  },
  // the same pond by day: jade water under a high, soft sun; muted, and still dark enough to sit behind code
  day: {
    water: ['#0e2925', '#0b211f', '#091b1a'],
    glowA: ['#3f8a6c', 0.3, '#2a6a58', 0.1], // sunlit water around the koi
    glowB: ['#6f8f5a', 0.16, '#4c7050', 0.06], // light through leaves, far across the pond
    halo: ['#fff0d0', 0.06],
    coats: [
      { white: [255, 247, 232], red: [255, 120, 80], ink: [255, 247, 232], fin: [190, 228, 205] },
      { white: [232, 244, 236], red: [255, 128, 90], ink: [40, 64, 60], fin: [170, 215, 195], dim: 0.82 },
      { white: [255, 206, 96], red: [255, 206, 96], ink: [255, 206, 96], fin: [215, 205, 140], dim: 0.62 },
    ],
    k1: { white: ['#fbf4e4', '#e6e4d6', '#bccabf'], red: '#ea6040', opacity: 1 },
    k2: { white: '#c3d5c8', red: '#c95e43', ink: '#2f4640', opacity: 0.74 },
    k3: { white: '#c2b684', opacity: 0.55 },
    ring: '#e0f3e3', speck: '#b5d8bf', speckOpacity: 0.3,
    petal: ['#fff0ea', '#eab5b3'],
    caustics: '#e6f4cf',
  },
}

function scene(name) {
  const L = LOOKS[name]
  // twice a lap rings open in the near koi's wake
  const ripples = wake(34) + wake(34 + 89)
  const petalRings = ripple([0, 0], { cycle: 233, first: 55 + 5, count: 3, peak: 0.85 })
  const base = `text{font-family:ui-monospace,Menlo,"SF Mono","DejaVu Sans Mono",Consolas,monospace;white-space:pre;dominant-baseline:hanging}
svg{font-size:${f(FS)}px}.r{fill:var(--r)}.s{fill:var(--s)}
.k1{fill:url(#kw);--r:${L.k1.red};--s:url(#kw)}.k2{fill:${L.k2.white};--r:${L.k2.red};--s:${L.k2.ink};opacity:${L.k2.opacity}}.k3{fill:${L.k3.white};--r:${L.k3.white};--s:${L.k3.white};opacity:${L.k3.opacity}}`
  const style = `<style>
${base}
.book text{dominant-baseline:auto}
${css.join('\n')}
.lap{animation:lap 144s steps(720) infinite}
${ORBIT_CSS}
.rg{opacity:0;fill:${L.ring}}
.pt{fill:url(#pt)}.petal{opacity:0;animation:petal 233s steps(932) infinite 55s}
${L.caustics ? `.cs{fill:${L.caustics}}.cA{opacity:.3;animation:cA 47s steps(94) infinite}
@keyframes cA{0%,100%{opacity:.3;transform:translate(0,0)}50%{opacity:.12;transform:translate(-13px,8px)}}
` : ''}pattern text{fill:${L.speck}}.specks{opacity:${L.speckOpacity};animation:slide 311s steps(311) infinite}
.glowA{--x:-50px;--y:-34px;animation:breathe 61s steps(61) infinite}.glowB{--x:80px;--y:60px;animation:breathe 97s steps(97) infinite -30s}
${[...ringCycles].map(ringKf).join('')}@keyframes lap{to{transform:rotate(-360deg)}}
.pads text{dominant-baseline:auto}
@keyframes breathe{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(var(--x),var(--y)) scale(1.12)}}
@keyframes slide{to{transform:translate(-420px,420px)}}
@keyframes petal{0%{opacity:0;transform:translate(13px,-21px) rotate(-55deg) scale(2.2)}2.15%{opacity:.95;transform:translate(0,0) rotate(0deg) scale(1)}25.7%{opacity:.8;transform:translate(-34px,21px) rotate(34deg) scale(1)}28.3%,100%{opacity:0;transform:translate(-37px,23px) rotate(38deg) scale(.92)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>`
  const grad = (id, [c0, o0, c1, o1]) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c0}" stop-opacity="${o0}"/><stop offset=".55" stop-color="${c1}" stop-opacity="${o1}"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/></radialGradient>`
  const shared = `<linearGradient id="water" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="${L.water[0]}"/><stop offset=".6" stop-color="${L.water[1]}"/><stop offset="1" stop-color="${L.water[2]}"/></linearGradient>
${grad('glowA', L.glowA)}${grad('glowB', L.glowB)}
<radialGradient id="halo"><stop offset="0" stop-color="${L.halo[0]}" stop-opacity="${L.halo[1]}"/><stop offset="1" stop-color="${L.halo[0]}" stop-opacity="0"/></radialGradient>
<linearGradient id="kw" gradientUnits="userSpaceOnUse" x1="${f(33 * FS)}" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${L.k1.white[0]}"/><stop offset=".6" stop-color="${L.k1.white[1]}"/><stop offset="1" stop-color="${L.k1.white[2]}"/></linearGradient>`
  const ground = `<rect width="${W}" height="${H}" fill="url(#water)"/>`
  const glows = anim => `<g${anim ? ' class="glowB"' : ''}><circle cx="1300" cy="240" r="640" fill="url(#glowB)"/></g><g${anim ? ' class="glowA"' : ''}><circle cx="${f(EYE[0] + KX)}" cy="${f(EYE[1])}" r="480" fill="url(#glowA)"/></g>`
  const fish = anim => [2, 1, 0].map(i => koiAt(KOI[i], i, anim, koiGlyphs(i, L.coats[i], anim, anim ? PTS[i] : PTS_POSTER[i]))).join('\n')

  // Anchored bottom-left: the spiral is laid out in the frame's bottom-right corner, then the whole of it
  // (koi, rings, petal, caustics) is moved by KX into the open field beside the sidebar (docs/DIRECTION.md,
  // Layout), where no panel of the app covers it.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMax slice">
${style}
<defs>
${shared}
<linearGradient id="pt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${L.petal[0]}"/><stop offset="1" stop-color="${L.petal[1]}"/></linearGradient>
${SPECKS}${L.caustics ? CAUSTICS : ''}${PETAL}${RINGS}${PAD_TILES(name === 'night')}
<filter id="bloom" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
${ground}
${glows(true)}
${L.caustics ? `<g transform="translate(${KX} 0)"><g class="cA"><use href="#caustics"/></g></g>` : ''}
<g class="pads">${padsSvg(name === 'night')}</g>
<g class="specks"><rect y="-420" width="${W + 420}" height="${H + 420}" fill="url(#specks)"/></g>
<g transform="translate(${f(EYE[0] + KX)} ${f(EYE[1])}) scale(1.2) translate(${f(-EYE[0])} ${f(-EYE[1])})">
<g filter="url(#bloom)">${fish(true)}</g>
${ripples}
<g transform="translate(${f(EYE[0])} ${f(EYE[1])})">${petalRings}<g class="petal"><use href="#petal"/></g></g>
</g>
</svg>`.replace(/\n\s*\n/g, '\n')

  const poster = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMax slice" width="320" height="180">
<style>${base}</style>
<defs>${shared}</defs>${ground}${glows(false)}<g transform="translate(${f(EYE[0] + KX)} ${f(EYE[1])}) scale(1.2) translate(${f(-EYE[0])} ${f(-EYE[1])})">${fish(false)}</g>
</svg>`.replace(/\n/g, '')
  return { svg, poster }
}

// the app draws nothing a <use> points at: every scene is written out in full
const written = ({ svg, poster }) => ({ svg: inlineUses(svg), poster: inlineUses(poster) })
const night = written(scene('night')), day = written(scene('day'))
console.log(`koi: night ${night.svg.length} characters, day ${day.svg.length}, poster ${night.poster.length}`)
if (process.env.SIZES) console.log({ rings: RINGS.length, caustics: CAUSTICS.length, FS, G, RADII, C1, C2, C3, EYE })
if (night.poster.length >= 12000) throw new Error('poster over 12,000 characters')
for (const v of [night.svg, day.svg]) if (v.length >= 131072) throw new Error(`scene is ${v.length} characters, over 131,072`)
writeFileSync(join(ROOT, 'hooks/looks/koi/scene.js'),
  `// Generated by tools/scenes/koi-script.mjs: a koi pond from above in glyphs, its koi raymarched into ASCII; by night and by day.\nexport const SCENE = ${JSON.stringify(night.svg)}\nexport const SCENE_DAY = ${JSON.stringify(day.svg)}\nexport const POSTER = ${JSON.stringify(night.poster)}\n`)
