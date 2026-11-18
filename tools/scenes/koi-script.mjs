// koi scene generator. Run: node tools/scenes/koi-script.mjs
// A still pond seen from above, in glyphs, in the band at the top right beside the conversation. Two koi
// glide along that band, each on its own depth (the near one large and bright, the far one smaller and
// deeper), under lily pads of block mosaic whose lotus lie open by day and closed at night. Each koi is a
// real solid (a signed distance field in koi.mjs) set in glyphs in 3D (glyph3d.mjs): one pose, cut into
// strips that sway in turn, so a stroke runs from head to tail, and a straight journey like abyssal's
// manta (rise, glide, sink), never a turn. In the near koi's wake a few rings of dots open; minutes apart
// a petal comes down. The light in the water is block glyphs, never a gradient.
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

// ── the composition: the pond in the top right, beside the conversation (the owner's placement,
// 2026-11-18: low on the left the koi kept passing under the text just written). Anchored top right
// (xMaxYMin), so the koi keep their place as the window widens; the right panel covers them while it is
// open. POND is the middle of the lit water, PETAL where a petal comes down now and then.
const POND = [1420, 350]
const PETAL_AT = [1322, 318]

const UNIT = 92.4 // viewBox units per body unit (a body is 3.1 long): the near koi is about 290 units nose to tail
const DX = 0.0472 // one glyph cell, in body units: the detail of the sprite
const FS = (DX * UNIT) / 0.602 // the near koi's font size; the others are the same sprite at 1/φ and 1/φ²
const FRAMES = 8
// centre, scale, lap and stroke periods (s), the angle on its circle at t = 0 (counter-clockwise from the
// foot), and the frame it holds when nothing moves
// Each koi glides the way abyssal's manta does: it rises out of the deep (growing and showing) at one end
// of a straight run, glides, and sinks away at the other (shrinking and going); after a pause it comes
// again. Only translate, scale and opacity move: a koi never turns, so its glyphs are never redrawn at a
// new angle (that is what made the lap of 0.5.5 and 0.5.6 jump). mid: the middle of its run, head: the
// way it swims (unit vector on screen), reach: from the middle to either end, journey (s), shift: how far
// into its journey it is when the scene opens (0..1), and the stroke period.
const KOI = [
  // The two swim along the open band, not across it: the kohaku down from under the corner pad, the
  // sanke up from the foot, side by side and never crossing, so neither spends its run under the text.
  { id: 'k1', mid: [1470, 270], head: [-0.42, 0.908], reach: 200, journey: 121, shift: 0.42, scale: 1, beat: 19, hold: 2 },
  { id: 'k2', mid: [1326, 540], head: [0.2, -0.98], reach: 170, journey: 97, shift: 0.62, scale: 0.76, beat: 17, hold: 5 },
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
const KOI_STEP = [0.058, 0.072] // body units between glyphs: the smaller koi is sampled more sparsely
const KOI_SIZE = [7.4, 9.6] // font size before each koi's own scale: the small one stays legible
const POSE = KOI.map(k => koi(k.hold / FRAMES, { radius: 3.2, turn: -1, marks: MARKS, spots: SPOTS }))
const sample = (i, step) => surface(POSE[i].sdf, { x: [-1.9, 1.2], z: [-1.3, 0.7], step, elev: 1.3, dist: 3, ramp: ' .,:;-=+*#%', tag: POSE[i].tag, tex: POSE[i].tex })
const PTS = KOI.map((k, i) => sample(i, KOI_STEP[i]))
const PTS_POSTER = KOI.map((k, i) => sample(i, KOI_STEP[i] * 2))
const hex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
// Each part of a coat runs from its own shadow colour to its own lit colour, in four steps of the
// glyph's light: the white falls to a cool grey-blue and the red to a deep vermilion, never to black
// (shaded towards black, the red came out brown). The fins are veils, pale and a little see-through, lit
// far more than their thin light would give, since the fins and the forked tail are what make it a koi.
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t)
const coatColour = c => p => {
  const fin = p.tag === FIN
  const t = Math.round(Math.min(1, Math.max(0, fin ? 0.25 + p.v * 3 : p.tag === RED ? (p.v - 0.1) * 1.7 : (p.v - 0.25) * 1.5)) * 3) / 3
  const [deep, lit] = p.tag === RED ? c.red : p.tag === SUMI ? c.ink : fin ? c.fin : c.white
  return [hex(mix(deep, lit, t)), fin ? 0.8 : 1]
}
// the koi drawn, far first. There were three; the smallest came out a gold crescent with no head or fins
// (0.5.6), more leaf than fish, and is left out.
const SWIMMING = [1, 0]
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
// a koi on its run: set at the middle of it and turned once to its heading (a still turn costs nothing),
// then moved along its own length by the journey
const deg = ([x, y]) => f((Math.atan2(y, x) * 180) / Math.PI)
const RISE = 0.58 // its size when it shows and when it is gone, deep in the water
const JOURNEY_KF = (i, k) => {
  const at = (d, z = 1) => `transform:translate(${f(d)}px,0) scale(${z})`
  return `@keyframes j${i}{0%{${at(-k.reach, RISE)};opacity:0}12%{opacity:1}40%{${at(-k.reach * 0.12)}}60%{${at(k.reach * 0.12)}}86%{${at(k.reach, RISE)};opacity:1}94%,100%{${at(k.reach, RISE)};opacity:0}}`
}
function koiAt(k, i, anim, glyphs) {
  const body = `<g transform="scale(${f(k.scale)})"><g class="book">${glyphs}</g></g>`
  const run = anim ? ` style="animation:j${i} ${k.journey}s ease-in-out infinite ${f(-k.shift * k.journey)}s"` : ''
  return `<g class="${k.id}" transform="translate(${f(k.mid[0])} ${f(k.mid[1])}) rotate(${deg(k.head)})"><g${run}>${body}</g></g>`
}
// where a koi's middle is at progress p of its journey (0..1), the CSS way: each keyframe span eased
const ease = x => { // cubic-bezier(.42,0,.58,1), solved for t
  let lo = 0, hi = 1
  for (let n = 0; n < 40; n++) { const t = (lo + hi) / 2, bx = 3 * (1 - t) ** 2 * t * 0.42 + 3 * (1 - t) * t * t * 0.58 + t ** 3; if (bx < x) lo = t; else hi = t }
  const t = (lo + hi) / 2
  return 3 * (1 - t) * t * t + t ** 3
}
function along(k, p) {
  const stops = [[0, -k.reach], [0.4, -k.reach * 0.12], [0.6, k.reach * 0.12], [0.86, k.reach], [1, k.reach]]
  for (let n = 1; n < stops.length; n++) {
    const [p0, d0] = stops[n - 1], [p1, d1] = stops[n]
    if (p <= p1) { const d = d0 + (d1 - d0) * ease((p - p0) / (p1 - p0)); return [k.mid[0] + k.head[0] * d, k.mid[1] + k.head[1] * d] }
  }
}
// ── lily pads, in glyphs set in 3D like the koi: thin discs with a notch, veins running out from the
// middle, deep green going to lime at the rim; on two of them a lotus in pink and magenta, the scene's
// bright accent. They lie still, as pads do on a calm pond. Three around the koi, which swim beneath them.
const PADS = [
  // x, y, radius (viewBox), notch angle (deg), lotus?
  [1546, 98, 86, 205, true], [1496, 606, 64, 55, true], [1368, 92, 38, 330, false], [1368, 668, 27, 140, false],
]
// A pad is a mosaic: every part of it is a shape with staircase edges on the cells of a small tile of
// block glyphs (drawn once, repeated: a leaf of a few hundred glyphs for the cost of a handful), so its
// rim, its notch and its veins are steps of whole glyphs, never a drawn curve. Three tiles from deep to
// light: the leaf, the blade between its veins, and the light on the side the moon or the sun is.
const PW = 6.02, PH = 9 // a pad's cell: a 10px glyph's advance on 9-unit rows, which overlap: no seam
function mosaic(inside, r, cw = PW, ch = PH) {
  let d = ''
  for (let y = -Math.ceil(r / ch) * ch; y < r; y += ch) {
    let start = null
    for (let x = -Math.ceil(r / cw) * cw; x <= r + cw; x += cw) {
      const on = x < r && inside(x + cw / 2, y + ch / 2)
      if (on && start === null) start = x
      if (!on && start !== null) { d += `M${f(start)} ${f(y)}h${f(x - start)}v${ch}h${f(start - x)}z`; start = null }
    }
  }
  return d
}
const blockTile = (id, fill, glyphs, fs = 10, cw = PW, ch = PH, cols = 9, nrows = 6) => {
  let t = ''
  for (let r = 0; r < nrows; r++) {
    let row = ''
    for (let c = 0; c < cols; c++) row += glyphs[Math.floor(R() * glyphs.length)]
    t += `<text x="0" y="${f(r * ch)}" style="fill:${fill}">${row}</text>` // its own fill: `pattern text` styles the specks
  }
  return `<pattern id="${id}" width="${f(cols * cw)}" height="${f(nrows * ch)}" patternUnits="userSpaceOnUse"><g style="font-size:${fs}px;dominant-baseline:hanging">${t}</g></pattern>`
}
const LW = 3.61, LH = 5.4 // a lotus's cell: 6px glyphs
const PAD_TILES = L => blockTile('padD', L.pad[0], '▓▓▒') + blockTile('padM', L.pad[1], '▓▓▒█') + blockTile('padL', L.pad[2], '█▓▓') +
  L.lotus.map((c, n) => blockTile('lo' + n, c, '█▓█', 6.4, LW, LH, 8, 5)).join('')
function padGlyphs([, , rad, notch]) {
  const a0 = (notch * Math.PI) / 180
  const polar = (x, y) => { const yy = y / 0.82; return [Math.hypot(x, yy) / rad, Math.atan2(yy, x)] }
  const turn = t => Math.abs(((t - a0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) // the angle from the notch
  const leaf = (x, y) => { const [r, t] = polar(x, y); return r < 1 + 0.035 * Math.sin(5 * t + rad) && turn(t) > 0.17 * Math.min(1, r * 1.6) }
  // the veins run out from the middle like spokes; the blade is what lies between them, inside the rim
  // (a small pad is too few cells for veins: it keeps its rim and its light)
  const veins = rad > 50 ? 9 : 0
  const vein = (r, t) => { const s = (((t - a0 + Math.PI * 4) / (Math.PI * 2)) * veins) % 1; return veins > 0 && r > 0.22 && Math.min(s, 1 - s) * (Math.PI * 2 / veins) * r * rad < 1.7 }
  const blade = (x, y) => { const [r, t] = polar(x, y); return leaf(x, y) && r < 0.86 && !vein(r, t) && turn(t) > 0.27 }
  const lit = (x, y) => blade(x, y) && Math.hypot(x + rad * 0.3, y + rad * 0.26) < rad * 0.5
  return `<path d="${mosaic(leaf, rad * 1.1)}" fill="url(#padD)"/><path d="${mosaic(blade, rad)}" fill="url(#padM)"/><path d="${mosaic(lit, rad)}" fill="url(#padL)"/>`
}
// A lotus, in the same mosaic on a finer cell: two rings of petals, a pale middle and a gold heart. By
// day it lies open; at night it is closed to a bud, smaller and deeper (`open` is how far, 0..1).
function lotus(rad, open) {
  const R0 = rad * (0.26 + 0.2 * open)
  const flower = (n, k, off) => (x, y) => { const t = Math.atan2(y / 0.8, x); return Math.hypot(x, y / 0.8) < R0 * k * (0.5 + 0.5 * Math.abs(Math.cos((n * (t - off)) / 2)) ** 0.8) }
  const layers = [[flower(8, 1, 0.2), 0], [flower(8, 0.74, 0.2 + Math.PI / 8), 1], [flower(6, 0.46, 0.5), 2], [(x, y) => Math.hypot(x, y / 0.8) < R0 * 0.15, 3]]
  return layers.map(([inside, n]) => `<path d="${mosaic(inside, R0 * 1.05, LW, LH)}" fill="url(#lo${n})"/>`).join('')
}
// the pads, then the flowers, set a little off the pad's middle, away from the notch
const padsSvg = L => PADS.map(p => `<g transform="translate(${p[0]} ${p[1]})">${padGlyphs(p)}</g>`).join('') +
  PADS.filter(p => p[4]).map(([x, y, rad, notch]) => { const a = (notch * Math.PI) / 180; return `<g transform="translate(${f(x - Math.cos(a) * rad * 0.16)} ${f(y - Math.sin(a) * rad * 0.13)})">${lotus(rad, L.open)}</g>` }).join('')


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
// the near koi's wake: rings open where it passed a few seconds before, at progress p of its journey
const WAKE = 6
const wake = p => {
  const k = KOI[0], first = (((p - k.shift) * k.journey + WAKE) % k.journey + k.journey) % k.journey
  return ripple(along(k, p), { cycle: k.journey, first })
}

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
  const x0 = 860, y0 = -10, cols = Math.ceil((W + 30 - x0) / cw), nrows = Math.ceil((760 - y0) / ch)
  const field = (x, y) => Math.sin(x / 55 + 1.7 * Math.sin(y / 89 + 1)) + Math.sin(y / 34 + 1.9 * Math.sin(x / 89 + 2)) + 0.7 * Math.sin((x + y) / 89 + 1.3 * Math.sin((x - y) / 55))
  const fr = []
  for (let r = 0; r < nrows; r++) {
    const row = []
    for (let c = 0; c < cols; c++) {
      const x = x0 + (c + 0.5) * cw, y = y0 + r * ch
      const top = field(x, y), foot = field(x, y + ch), left = field(x - cw / 2, y + ch / 2), right = field(x + cw / 2, y + ch / 2)
      // how much of the sheet is left this far from the spiral's eye
      const far = Math.hypot(x - POND[0], y + ch / 2 - POND[1]) / 420
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
// (its ink stays white), the far one a sanke.
const LOOKS = {
  night: {
    water: ['#08161f', '#060f19', '#050b14'],
    glowA: '#2f9fa6', // the block light of the lit water around the koi
    glowB: '#5056c8', // moonlight far across the pond
    coats: [
      { white: [[150, 172, 192], [255, 246, 230]], red: [[206, 54, 30], [255, 116, 62]], ink: [[150, 172, 192], [255, 246, 230]], fin: [[96, 150, 170], [214, 238, 244]] }, // kohaku
      { white: [[112, 136, 158], [222, 234, 236]], red: [[176, 48, 32], [244, 104, 62]], ink: [[14, 20, 40], [44, 54, 92]], fin: [[80, 128, 150], [176, 208, 222]] }, // sanke
    ],
    k1: { white: ['#f6eede', '#d6d8d0', '#a3b7ba'], red: '#e45b3d', opacity: 1 },
    k2: { white: '#b4c9ca', red: '#c0553f', ink: '#32405c', opacity: 0.9 },
    ring: '#c4ece6', speck: '#8fc7c4', speckOpacity: 0.3,
    petal: ['#fde9e4', '#e3a9ad'],
    pad: ['#184a30', '#25663a', '#398544'], lotus: ['#a83a80', '#c9609f', '#dc9cc4', '#d9b877'], open: 0,
  },
  // the same pond by day: jade water under a high, soft sun; muted, and still dark enough to sit behind code
  day: {
    water: ['#0e2925', '#0b211f', '#091b1a'],
    glowA: '#6cc995', // sunlit water around the koi
    glowB: '#a7c77c', // light through leaves, far across the pond
    coats: [
      { white: [[160, 190, 180], [255, 248, 232]], red: [[210, 56, 30], [255, 118, 64]], ink: [[160, 190, 180], [255, 248, 232]], fin: [[120, 176, 160], [226, 244, 232]] },
      { white: [[124, 156, 148], [230, 240, 232]], red: [[182, 50, 32], [246, 106, 64]], ink: [[12, 26, 26], [40, 62, 60]], fin: [[98, 150, 136], [190, 222, 206]] },
    ],
    k1: { white: ['#fbf4e4', '#e6e4d6', '#bccabf'], red: '#ea6040', opacity: 1 },
    k2: { white: '#c3d5c8', red: '#c95e43', ink: '#2f4640', opacity: 0.9 },
    ring: '#e0f3e3', speck: '#b5d8bf', speckOpacity: 0.3,
    petal: ['#fff0ea', '#eab5b3'],
    pad: ['#256638', '#388a43', '#62b34f'], lotus: ['#d8489c', '#f57cc0', '#ffc4e6', '#ffd98a'], open: 1,
    caustics: '#e6f4cf',
  },
}

// ── light in the water, in block glyphs like abyssal's shaft, never a gradient: an ellipse of light in a
// few levels, each a staircase of glyph rows with ragged ends, filled with one small tile of ░▒▓. The
// levels are stacked, so the middle, under all of them, is brightest; each breathes on its own period.
const GLOW_FS = 9, GW = 0.602 * GLOW_FS, GH = GLOW_FS, GT_C = 23, GT_R = 13 // a tile large enough not to show its repeat
const glowTile = (id, fill) => {
  let t = ''
  for (let r = 0; r < GT_R; r++) {
    let row = ''
    for (let c = 0; c < GT_C; c++) { const v = R(); row += v < 0.12 ? '▓' : v < 0.4 ? '▒' : v < 0.78 ? '░' : ' ' }
    t += `<text x="0" y="${f(r * GH)}" style="fill:${fill}">${row}</text>`
  }
  return `<pattern id="${id}" width="${f(GT_C * GW)}" height="${GT_R * GH}" patternUnits="userSpaceOnUse"><g style="font-size:${GLOW_FS}px;dominant-baseline:hanging">${t}</g></pattern>`
}
function blockGlow([cx, cy], rx, ry, levels) {
  return levels.map(([k, o]) => {
    let d = ''
    for (let y = Math.round((cy - ry * k) / GH) * GH; y <= cy + ry * k; y += GH) {
      const v = (y + GH / 2 - cy) / (ry * k)
      if (Math.abs(v) >= 1) continue
      const half = rx * k * Math.sqrt(1 - v * v)
      const x0 = Math.round((cx - half + (R() - 0.5) * 16 * GW) / GW) * GW, x1 = Math.round((cx + half + (R() - 0.5) * 16 * GW) / GW) * GW
      if (x1 > x0) d += `M${f(x0)} ${y}h${f(x1 - x0)}v${GH}h${f(x0 - x1)}z`
    }
    return { d, o }
  })
}
// One pool of light, tall like the band the pond lies in. (A second, far light across the top left was
// a slab with a hard foot under the conversation; the middle is ground only.)
const POND_LIGHT = blockGlow(POND, 300, 370, [[1, 0.045], [0.56, 0.07]])
const BREATHS = [17, 23, 29, 37, 43]

function scene(name) {
  const L = LOOKS[name]
  // rings open twice a journey where the near koi has just passed
  const ripples = wake(0.45) + wake(0.62)
  const petalRings = ripple([0, 0], { cycle: 233, first: 55 + 5, count: 3, peak: 0.85 })
  const base = `text{font-family:ui-monospace,Menlo,"SF Mono","DejaVu Sans Mono",Consolas,monospace;white-space:pre;dominant-baseline:hanging}
svg{font-size:${f(FS)}px}`
  const style = `<style>
${base}
.book text{dominant-baseline:auto}
${css.join('\n')}
${SWIMMING.map(i => JOURNEY_KF(i, KOI[i])).join('\n')}
.k2{opacity:${L.k2.opacity}}
.rg{opacity:0;fill:${L.ring}}
.pt{fill:url(#pt)}.petal{opacity:0;animation:petal 233s steps(932) infinite 55s}
${L.caustics ? `.cs{fill:${L.caustics}}.cA{opacity:.3;animation:cA 47s steps(94) infinite}
@keyframes cA{0%,100%{opacity:.3;transform:translate(0,0)}50%{opacity:.12;transform:translate(-13px,8px)}}
` : ''}pattern text{fill:${L.speck}}.specks{opacity:${L.speckOpacity};animation:slide 311s steps(311) infinite}
.gl{opacity:var(--o)}.lean{animation:lean 41s steps(82) infinite}
@keyframes gl{0%,100%{opacity:var(--o)}50%{opacity:var(--p)}}
@keyframes lean{0%,100%{transform:translate(-4px,2px)}50%{transform:translate(4px,-2px)}}
${[...ringCycles].map(ringKf).join('')}
@keyframes slide{to{transform:translate(-420px,420px)}}
@keyframes petal{0%{opacity:0;transform:translate(13px,-21px) rotate(-55deg) scale(2.2)}2.15%{opacity:.95;transform:translate(0,0) rotate(0deg) scale(1)}25.7%{opacity:.8;transform:translate(-34px,21px) rotate(34deg) scale(1)}28.3%,100%{opacity:0;transform:translate(-37px,23px) rotate(38deg) scale(.92)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>`
  const shared = `<linearGradient id="water" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="${L.water[0]}"/><stop offset=".6" stop-color="${L.water[1]}"/><stop offset="1" stop-color="${L.water[2]}"/></linearGradient>
${glowTile('gA', L.glowA)}`
  const ground = `<rect width="${W}" height="${H}" fill="url(#water)"/>`
  const light = (levels, tile, anim) => levels.map(({ d, o }, n) => `<path class="gl" d="${d}" fill="url(#${tile})" style="--o:${o}${anim ? `;--p:${f(o * 0.55)};animation:gl ${BREATHS[n]}s steps(${BREATHS[n] * 2}) infinite -${BREATHS[n] * 0.37 * (n + 1)}s` : ''}"/>`).join('')
  const glows = anim => `<g${anim ? ' class="lean"' : ''}>${light(POND_LIGHT, 'gA', anim)}</g>`
  const fish = anim => SWIMMING.map(i => koiAt(KOI[i], i, anim, koiGlyphs(i, L.coats[i], anim, anim ? PTS[i] : PTS_POSTER[i]))).join('\n')

  // Anchored top right (docs/DIRECTION.md, Layout): the pond sits beside the conversation, under the
  // right panel while it is open. The pads lie on the water above the koi, which pass beneath them.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMin slice">
${style}
<defs>
${shared}
<linearGradient id="pt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${L.petal[0]}"/><stop offset="1" stop-color="${L.petal[1]}"/></linearGradient>
${SPECKS}${L.caustics ? CAUSTICS : ''}${PETAL}${RINGS}${PAD_TILES(L)}
<filter id="bloom" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
${ground}
${glows(true)}
${L.caustics ? `<g class="cA"><use href="#caustics"/></g>` : ''}
<g class="specks"><rect y="-420" width="${W + 420}" height="${H + 420}" fill="url(#specks)"/></g>
<g filter="url(#bloom)">${fish(true)}</g>
${ripples}
<g class="pads">${padsSvg(L)}</g>
<g transform="translate(${PETAL_AT[0]} ${PETAL_AT[1]})">${petalRings}<g class="petal"><use href="#petal"/></g></g>
</svg>`.replace(/\n\s*\n/g, '\n')

  const poster = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMin slice" width="320" height="180">
<style>${base}.k2{opacity:${L.k2.opacity}}</style>
<defs>${shared}</defs>${ground}${light(POND_LIGHT, 'gA', false)}${fish(false)}
</svg>`.replace(/\n/g, '')
  return { svg, poster }
}

// the app draws nothing a <use> points at: every scene is written out in full
const written = ({ svg, poster }) => ({ svg: inlineUses(svg), poster: inlineUses(poster) })
const night = written(scene('night')), day = written(scene('day'))
console.log(`koi: night ${night.svg.length} characters, day ${day.svg.length}, poster ${night.poster.length}`)
if (process.env.SIZES) console.log({ rings: RINGS.length, caustics: CAUSTICS.length, FS })
if (night.poster.length >= 12000) throw new Error('poster over 12,000 characters')
for (const v of [night.svg, day.svg]) if (v.length >= 131072) throw new Error(`scene is ${v.length} characters, over 131,072`)
writeFileSync(join(ROOT, 'hooks/looks/koi/scene.js'),
  `// Generated by tools/scenes/koi-script.mjs: a koi pond from above in glyphs, its koi raymarched into ASCII; by night and by day.\nexport const SCENE = ${JSON.stringify(night.svg)}\nexport const SCENE_DAY = ${JSON.stringify(day.svg)}\nexport const POSTER = ${JSON.stringify(night.poster)}\n`)
