// koi-script scene generator. Run: node tools/scenes/koi-script.mjs
// A still pond seen from above, in glyphs. Three koi circle in the bottom-right corner, each on its own
// depth: the near one large, bright and slow, the far ones smaller, dimmer and closer to the water.
// The koi is a real solid (a signed distance field in koi.mjs), raymarched here at build time into ASCII,
// one frame per step of a stroke-and-glide cycle; the frames dissolve into one another, and the lap is a
// slow turn of the whole sprite, whose spine is already bent to the circle it swims. Where the near koi
// brushes the surface a few rings of dots open; minutes apart a petal comes down at the heart of it all.
//
// Everything is laid out on the golden ratio. From the frame's golden point G = (W/φ, H/φ) a golden
// spiral winds into the corner; the koi swim the full circles of three successive quarter-arcs of it,
// so their circles, and their sizes, shrink by φ each time (1, 1/φ, 1/φ²) and touch where the arcs
// meet. The petal lands on the spiral's eye. The periods are Fibonacci numbers (laps of 144, 89 and
// 55 s, the petal every 233 s), which sit in the same ratio and share no factor.
//
// The same pond is written twice: at night (SCENE) and by day (SCENE_DAY), under dappled light.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { render } from './ascii3d.mjs'
import { koi, petal, PHI, RED } from './koi.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

const f = n => +n.toFixed(2)
const W = 1600
const H = 1000
const RAMP = ' .,:;-=+*#'
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const cell = fs => [0.602 * fs, 0.7 * fs] // a monospace advance at a font size, and a tight line step

// ── the composition
// G is the golden point of the frame. The rectangle from G to the corner is itself golden; the spiral
// is drawn in it at 7/8 of its size, so the largest circle and the koi's fins clear the frame's edges.
const G = [W / PHI, H / PHI]
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

const FS = 10 // the near koi's font size; the others are the same sprite, scaled by 1/φ and 1/φ²
const UNIT = RADII[0] / PHI // viewBox units per body unit: each koi's circle has a radius of φ body units
const FRAMES = 24
// centre, scale, lap and stroke periods (s), the angle on its circle at t = 0 (counter-clockwise from the
// foot), and the frame it holds when nothing moves
const KOI = [
  { id: 'k1', c: C1, scale: 1, lap: 144, beat: 19, start: 100, hold: 7 },
  { id: 'k2', c: C2, scale: 1 / PHI, lap: 89, beat: 17, start: 320, hold: 15 },
  { id: 'k3', c: C3, scale: 1 / PHI ** 2, lap: 55, beat: 13, start: 270, hold: 21 },
]
// the coat: red patches along the back, [s, z, rs, rz] in body units
const COAT = [[0.66, 0, 0.17, 0.17], [0.14, -0.07, 0.25, 0.2], [-0.38, 0.06, 0.16, 0.18], [-0.78, 0, 0.09, 0.08]]

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
      if (chr !== ' ' && tag !== cur) { flush(); cur = tag }
      run += chr
    }
    flush()
    s += `<text x="${f(start * cw)}" y="${f(r * ch)}">${line}</text>`
  })
  return s
}

// ── the koi's flipbook, drawn once and worn by all three: each frame is a <g> in <defs>, and a koi is a
// stack of <use>, one per frame, each fading in over 1/n of its cycle and out over the next. The frames
// add their light (plus-lighter, inside an isolated group), so where two neighbours hold the same glyph
// the pair is exactly as bright as one: no pulse at the frame rate.
const [CW, CH] = cell(FS)
const VIEW = { cols: 96, rows: 84, dx: CW / UNIT, aspect: CH / CW, elev: Math.PI / 2, ramp: RAMP, outline: false, light: [0.12, 1, 0.1] }
const BOOK = (() => {
  const raw = Array.from({ length: FRAMES }, (_, i) => {
    const K = koi(i / FRAMES, { radius: PHI, turn: -1, marks: COAT })
    return render(K.sdf, { ...VIEW, tag: K.tag }, K.tex)
  })
  const { frames, r0, c0 } = trimAll(raw)
  return {
    frames: frames.map((fr, i) => `<g id="f${i}">${rows(fr, CW, CH, { [RED]: 'r' })}</g>`),
    // the koi's middle (the world origin, on its circle) sits at the sprite's origin
    tf: `translate(${f(-(VIEW.cols / 2 - c0) * CW)} ${f(-(VIEW.rows / 2 - r0) * CH)})`,
  }
})()
const XF = `@keyframes xf{0%{opacity:0}${f(100 / FRAMES)}%{opacity:1}${f(200 / FRAMES)}%,100%{opacity:0}}\n`
// a koi in place: turned to its starting angle, lapping counter-clockwise, at the foot of its circle
function koiAt(k, i, anim) {
  const r = RADII[i]
  const stack = anim
    ? Array.from({ length: FRAMES }, (_, j) => `<use href="#f${j}" class="fr${j === k.hold ? ' f0' : ''}" style="animation:xf ${k.beat}s linear infinite ${f(((j - k.hold - 1) / FRAMES) * k.beat - k.beat)}s"/>`).join('')
    : `<use href="#f${k.hold}"/>`
  return `<g class="${k.id}" transform="translate(${f(k.c[0])} ${f(k.c[1])}) rotate(${-k.start})"><g${anim ? ` class="lap" style="animation-duration:${k.lap}s"` : ''}><g transform="translate(0 ${f(r)}) scale(${f(k.scale)})">${i === 0 ? '<circle r="150" fill="url(#halo)"/>' : ''}<g class="book" transform="${BOOK.tf}">${stack}</g></g></g></g>`
}
// where a koi is t seconds in
const where = (i, t) => {
  const k = KOI[i], a = ((k.start + (360 * t) / k.lap) * Math.PI) / 180
  return [k.c[0] + RADII[i] * Math.sin(a), k.c[1] + RADII[i] * Math.cos(a)]
}

// ── a still sprite from one render
function still(id, sdf, tex, view, fs) {
  const [cw, ch] = cell(fs)
  const { frames: [fr] } = trimAll([render(sdf, { ...view, aspect: ch / cw, elev: Math.PI / 2, ramp: RAMP, outline: false, light: [0, 1, 0] }, tex)])
  return `<g id="${id}" style="font-size:${fs}px" transform="translate(${f(-fr[0].length * cw / 2)} ${f(-fr.length * ch / 2)})">${rows(fr, cw, ch)}</g>`
}
const PET = petal()
const PETAL = still('petal', PET.sdf, PET.tex, { cols: 16, rows: 12, dx: 0.1 }, 6)

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
const RING_R = [8, 13, 21, 34, 55, 89] // Fibonacci again
const RINGS = RING_R.map((r, j) => ring(j, r, 1 - j * 0.08)).join('')
const STEP = 2.6 // seconds between one ring and the next
// one set of rings opening at (x, y), `first` seconds after the scene opens and every `cycle` after;
// `count` rings, the outer ones fainter
const ringCycles = new Set()
function ripple([x, y], { cycle, first, count = RING_R.length, peak = 0.8 }) {
  ringCycles.add(cycle)
  let s = ''
  for (let j = 0; j < count; j++) s += `<use href="#rg${j}" class="rg" style="--o:${f(peak * (1 - j / (count + 1)))};animation:rg${cycle} ${cycle}s linear infinite ${f(first + j * STEP)}s"/>`
  return `<g transform="translate(${f(x)} ${f(y)})">${s}</g>`
}
const ringKf = cycle => `@keyframes rg${cycle}{0%{opacity:0}${f((STEP / cycle) * 100)}%{opacity:var(--o)}${f(((2.6 * STEP) / cycle) * 100)}%,100%{opacity:0}}\n`

// ── specks on the surface: a sparse tile of dots, seeded
let seed = 20261116
const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
function speckTile(id, size, n) {
  let t = ''
  for (let i = 0; i < n; i++) t += `<text x="${f(R() * size)}" y="${f(R() * size)}" fill-opacity="${f(0.25 + R() * 0.5)}">${'.·'[Math.floor(R() * 2)]}</text>`
  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><g style="font-size:9px">${t}</g></pattern>`
}
const SPECKS = speckTile('specks', 420, 22)

// ── daylight: a net of light on the pond floor, as ripples focus the sun. The borders of a seeded
// field of cells, set in dots (a colon where the border is sharpest); the net thins away from
// the koi's corner, so the middle stays empty. It is drawn once and laid down twice, the two copies
// drifting apart and breathing out of step, so the mesh seems to flex without ever being redrawn.
const NET_FS = 9
const NET = (() => {
  const [cw, ch] = [0.602 * NET_FS, NET_FS]
  const x0 = 900, y0 = 330, cols = Math.ceil((W + 40 - x0) / cw), nrows = Math.ceil((H + 40 - y0) / ch)
  const gap = 89, seeds = []
  for (let gy = -1; gy * gap < H - y0 + 2 * gap; gy++) for (let gx = -1; gx * gap < W - x0 + 2 * gap; gx++) seeds.push([x0 + (gx + 0.15 + 0.7 * R()) * gap, y0 + (gy + 0.15 + 0.7 * R()) * gap])
  const fr = []
  for (let r = 0; r < nrows; r++) {
    const row = []
    for (let c = 0; c < cols; c++) {
      const px = x0 + (c + 0.5) * cw, py = y0 + (r + 0.5) * ch
      // a slow warp rounds the cells, as water does
      const x = px + 24 * Math.sin(py / 55), y = py + 24 * Math.sin(px / 34)
      let da = Infinity, db = Infinity
      for (const sd of seeds) {
        const d = Math.hypot(x - sd[0], y - sd[1])
        if (d < da) { db = da; da = d } else if (d < db) db = d
      }
      // density falls off with the distance from the spiral's eye
      const far = Math.hypot(px - EYE[0], py - EYE[1]) / 400
      const keep = R() > far ** 3
      row.push([db - da < 9 && keep ? (db - da < 3.5 ? ':' : '·') : ' '])
    }
    fr.push(row)
  }
  return `<g id="net" style="font-size:${NET_FS}px" transform="translate(${x0} ${y0})">${rows(fr, cw, ch)}</g>`
})()

// ── the two ponds
const LOOKS = {
  night: {
    water: ['#08161f', '#060f19', '#050b14'],
    glowA: ['#17606a', 0.34, '#0f4654', 0.12], // the lit water around the koi
    glowB: ['#2c2f7a', 0.26, '#1f2260', 0.09], // moonlight far across the pond
    halo: ['#ffc2a6', 0.1],
    // white (a gradient from head to tail on the near koi), red, opacity, by depth
    k1: { white: ['#f6eede', '#d6d8d0', '#a3b7ba'], red: '#e45b3d', opacity: 1 },
    k2: { white: '#a9c0c2', red: '#b9533f', opacity: 0.62 },
    k3: { white: '#6f979f', red: '#8a4a45', opacity: 0.5 },
    ring: '#a8dcd6', speck: '#8fc7c4', speckOpacity: 0.3,
    petal: ['#fbe6e0', '#dba9ab'],
  },
  // the same pond by day: jade water under a high, soft sun; muted, and still dark enough to sit behind code
  day: {
    water: ['#0e2925', '#0b211f', '#091b1a'],
    glowA: ['#3f8a6c', 0.3, '#2a6a58', 0.1], // sunlit water around the koi
    glowB: ['#6f8f5a', 0.16, '#4c7050', 0.06], // light through leaves, far across the pond
    halo: ['#fff0d0', 0.06],
    k1: { white: ['#fbf4e4', '#e6e4d6', '#bccabf'], red: '#ea6040', opacity: 1 },
    k2: { white: '#b9cdbf', red: '#c25c42', opacity: 0.66 },
    k3: { white: '#86a99a', red: '#96584a', opacity: 0.55 },
    ring: '#d3ecd9', speck: '#b5d8bf', speckOpacity: 0.3,
    petal: ['#fff0ea', '#e8b9b6'],
    net: '#d9efc6',
  },
}

function scene(name) {
  const L = LOOKS[name]
  // ripples: on each lap the near koi brushes the surface at two places
  const ripples = ripple(where(0, 34), { cycle: KOI[0].lap, first: 34 }) + ripple(where(0, 34 + 89), { cycle: KOI[0].lap, first: 34 + 89, count: 5 })
  const petalRings = ripple([0, 0], { cycle: 233, first: 55 + 5, count: 4, peak: 0.7 })
  const base = `text{font-family:ui-monospace,Menlo,"SF Mono","DejaVu Sans Mono",Consolas,monospace;white-space:pre;dominant-baseline:hanging}
svg{font-size:${FS}px}.r{fill:var(--r)}
.k1{fill:url(#kw);--r:${L.k1.red}}.k2{fill:${L.k2.white};--r:${L.k2.red};opacity:${L.k2.opacity}}.k3{fill:${L.k3.white};--r:${L.k3.red};opacity:${L.k3.opacity}}`
  const style = `<style>
${base}
.book{isolation:isolate}.fr{opacity:0;mix-blend-mode:plus-lighter}.fr.f0{opacity:1}
.lap{animation:lap 144s linear infinite}
.rg{opacity:0;fill:${L.ring}}
#petal{fill:url(#pt)}.petal{opacity:0;animation:petal 233s linear infinite 55s}
${L.net ? `#net{fill:${L.net}}.netA{opacity:.36;animation:netA 47s ease-in-out infinite}.netB{opacity:.1;animation:netB 29s ease-in-out infinite -11s}
@keyframes netA{0%,100%{opacity:.36;transform:translate(0,0)}50%{opacity:.16;transform:translate(-13px,8px)}}
@keyframes netB{0%,100%{opacity:.1;transform:translate(21px,-13px)}50%{opacity:.3;transform:translate(34px,-5px)}}
` : ''}pattern text{fill:${L.speck}}.specks{opacity:${L.speckOpacity};animation:slide 311s linear infinite}
.glowA{--x:-50px;--y:-34px;animation:breathe 61s ease-in-out infinite}.glowB{--x:80px;--y:60px;animation:breathe 97s ease-in-out infinite -30s}
${XF}${[...ringCycles].map(ringKf).join('')}@keyframes lap{to{transform:rotate(-360deg)}}
@keyframes breathe{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(var(--x),var(--y)) scale(1.12)}}
@keyframes slide{to{transform:translate(-420px,420px)}}
@keyframes petal{0%{opacity:0;transform:translate(13px,-21px) rotate(-55deg) scale(2.2)}2.15%{opacity:.85;transform:translate(0,0) rotate(0deg) scale(1)}25.7%{opacity:.7;transform:translate(-21px,13px) rotate(34deg) scale(1)}27.9%,100%{opacity:0;transform:translate(-23px,14px) rotate(37deg) scale(.92)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>`
  const grad = (id, [c0, o0, c1, o1]) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c0}" stop-opacity="${o0}"/><stop offset=".55" stop-color="${c1}" stop-opacity="${o1}"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/></radialGradient>`
  const shared = `<linearGradient id="water" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="${L.water[0]}"/><stop offset=".6" stop-color="${L.water[1]}"/><stop offset="1" stop-color="${L.water[2]}"/></linearGradient>
${grad('glowA', L.glowA)}${grad('glowB', L.glowB)}
<radialGradient id="halo"><stop offset="0" stop-color="${L.halo[0]}" stop-opacity="${L.halo[1]}"/><stop offset="1" stop-color="${L.halo[0]}" stop-opacity="0"/></radialGradient>
<linearGradient id="kw" gradientUnits="userSpaceOnUse" x1="330" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${L.k1.white[0]}"/><stop offset=".6" stop-color="${L.k1.white[1]}"/><stop offset="1" stop-color="${L.k1.white[2]}"/></linearGradient>`
  const ground = `<rect width="${W}" height="${H}" fill="url(#water)"/>`
  const glows = anim => `<g${anim ? ' class="glowB"' : ''}><circle cx="330" cy="240" r="640" fill="url(#glowB)"/></g><g${anim ? ' class="glowA"' : ''}><circle cx="${f(EYE[0])}" cy="${f(EYE[1])}" r="560" fill="url(#glowA)"/></g>`
  const fish = anim => [2, 1, 0].map(i => koiAt(KOI[i], i, anim)).join('\n')

  // Anchored bottom-right: on a tall phone the left is cropped, on a wide window the top; the corner
  // with the koi stays in view and the middle, where the words are, stays empty.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMax slice">
${style}
<defs>
${shared}
<linearGradient id="pt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${L.petal[0]}"/><stop offset="1" stop-color="${L.petal[1]}"/></linearGradient>
${SPECKS}${L.net ? NET : ''}${BOOK.frames.join('')}${PETAL}${RINGS}
</defs>
${ground}
${glows(true)}
<g class="specks"><rect y="-420" width="${W + 420}" height="${H + 420}" fill="url(#specks)"/></g>
${L.net ? '<g class="netA"><use href="#net"/></g><g class="netB"><use href="#net"/></g>' : ''}
${fish(true)}
${ripples}
<g transform="translate(${f(EYE[0])} ${f(EYE[1])})">${petalRings}<g class="petal"><use href="#petal"/></g></g>
</svg>`.replace(/\n\s*\n/g, '\n')

  const poster = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMax slice" width="320" height="180">
<style>${base}</style>
<defs>${shared}${KOI.map(k => BOOK.frames[k.hold]).join('')}</defs>${ground}${glows(false)}${fish(false)}
</svg>`.replace(/\n/g, '')
  return { svg, poster }
}

const night = scene('night'), day = scene('day')
console.log(`koi-script: night ${night.svg.length} characters, day ${day.svg.length}, poster ${night.poster.length}`)
if (process.env.SIZES) console.log({ frames: BOOK.frames.join('').length, rings: RINGS.length, net: NET.length, G, RADII, C1, C2, C3, EYE })
if (night.poster.length >= 12000) throw new Error('poster over 12,000 characters')
for (const v of [night.svg, day.svg]) if (v.length >= 131072) throw new Error(`scene is ${v.length} characters, over 131,072`)
writeFileSync(join(ROOT, 'hooks/looks/koi-script/scene.js'),
  `// Generated by tools/scenes/koi-script.mjs: a koi pond from above in glyphs, its koi raymarched into ASCII; by night and by day.\nexport const SCENE = ${JSON.stringify(night.svg)}\nexport const SCENE_DAY = ${JSON.stringify(day.svg)}\nexport const POSTER = ${JSON.stringify(night.poster)}\n`)
