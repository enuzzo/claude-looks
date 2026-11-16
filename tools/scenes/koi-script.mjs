// koi-script scene generator. Run: node tools/scenes/koi-script.mjs
// A still pond seen from above, in glyphs. Three koi circle in the bottom-right corner, each on its own
// depth: the near one large, bright and slow, the far ones smaller, dimmer and closer to the water.
// The koi is a real solid (a signed distance field in koi.mjs), raymarched here at build time into ASCII,
// one frame per step of a stroke-and-glide cycle; the frames dissolve into one another, and the lap is a
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
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { render } from './ascii3d.mjs'
import { koi, PHI, RED, SUMI } from './koi.mjs'

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

// ── the koi's flipbook, drawn once and worn by all three: each frame is a <g> in <defs>, and a koi is a
// stack of <use>, one per frame, each fading in over 1/n of its cycle and out over the next. Eight frames
// and a plain crossfade, as abyssal has: blending 3 x 24 frames (plus-lighter in isolated groups) was more
// than the desktop app's backdrop could draw under its glass, and it stopped every animation in the window.
const [CW, CH] = cell(FS)
const VIEW = { cols: 96, rows: 84, dx: DX, aspect: CH / CW, elev: Math.PI / 2, ramp: RAMP, outline: false, light: [0.12, 1, 0.1] }
const TAGS = { [RED]: 'r', [SUMI]: 's' }
const BOOK = (() => {
  const raw = Array.from({ length: FRAMES }, (_, i) => {
    const K = koi(i / FRAMES, { radius: PHI, turn: -1, marks: MARKS, spots: SPOTS })
    return render(K.sdf, { ...VIEW, tag: K.tag }, K.tex)
  })
  const { frames, r0, c0 } = trimAll(raw)
  return {
    frames: frames.map((fr, i) => `<g id="f${i}">${rows(fr, CW, CH, TAGS)}</g>`),
    // the koi's middle (the world origin, on its circle) sits at the sprite's origin
    tf: `translate(${f(-(VIEW.cols / 2 - c0) * CW)} ${f(-(VIEW.rows / 2 - r0) * CH)})`,
  }
})()
// a crossfade over n frames: each fades in over 1/n of the cycle and out over the next
const xf = n => `@keyframes xf${n}{0%{opacity:0}${f(100 / n)}%{opacity:1}${f(200 / n)}%,100%{opacity:0}}\n`
const XF = [...new Set(KOI.map(k => k.frames ?? FRAMES))].filter(n => n > 1).map(xf).join('')
// a koi in place: turned to its starting angle, lapping counter-clockwise, at the foot of its circle
function koiAt(k, i, anim) {
  const r = RADII[i]
  // the middle one takes every other frame of the book; the far one, small and dim, only glides
  // (one frame, still lapping): the desktop app stops a scene that animates too much type
  const n = k.frames ?? FRAMES, step = FRAMES / n, hold = Math.round(k.hold / step)
  const stack = anim && n > 1
    ? Array.from({ length: n }, (_, j) => `<use href="#f${j * step}" class="fr${j === hold ? ' f0' : ''}" style="animation:xf${n} ${k.beat}s linear infinite ${f(((j - hold - 1) / n) * k.beat - k.beat)}s"/>`).join('')
    : `<use href="#f${k.hold}"/>`
  return `<g class="${k.id}" transform="translate(${f(k.c[0])} ${f(k.c[1])}) rotate(${-k.start})"><g${anim ? ` class="lap" style="animation-duration:${k.lap}s"` : ''}><g transform="translate(0 ${f(r)}) scale(${f(k.scale)})">${i === 0 ? `<circle r="${f(15 * FS)}" fill="url(#halo)"/>` : ''}<g class="book" transform="${BOOK.tf}">${stack}</g></g></g></g>`
}
// where a koi's middle is t seconds in
const where = (i, t) => {
  const k = KOI[i], a = ((k.start + (360 * t) / k.lap) * Math.PI) / 180
  return [k.c[0] + RADII[i] * Math.sin(a), k.c[1] + RADII[i] * Math.cos(a)]
}

// ── a petal: a few glyphs set as a small leaning blade
const PETAL_FS = 9
const PETAL = `<g id="petal" style="font-size:${PETAL_FS}px" transform="translate(-8 -7)"><text x="${f(0.602 * PETAL_FS)}" y="0">/')</text><text x="0" y="${f(0.8 * PETAL_FS)}">(,/</text></g>`

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
  for (let j = 0; j < count; j++) s += `<use href="#rg${j}" class="rg" style="--o:${f(peak * (1 - j / (count + 3)))};animation:rg${cycle} ${cycle}s linear infinite ${f(first + j * STEP)}s"/>`
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
  return `<g id="caustics" style="font-size:${CAUSTIC_FS}px" transform="translate(${x0} ${y0})">${rows(fr, cw, ch)}</g>`
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
.fr{opacity:0}.fr.f0{opacity:1}
.lap{animation:lap 144s linear infinite}
.rg{opacity:0;fill:${L.ring}}
#petal{fill:url(#pt)}.petal{opacity:0;animation:petal 233s linear infinite 55s}
${L.caustics ? `#caustics{fill:${L.caustics}}.cA{opacity:.3;animation:cA 47s ease-in-out infinite}
@keyframes cA{0%,100%{opacity:.3;transform:translate(0,0)}50%{opacity:.12;transform:translate(-13px,8px)}}
` : ''}pattern text{fill:${L.speck}}.specks{opacity:${L.speckOpacity};animation:slide 311s linear infinite}
.glowA{--x:-50px;--y:-34px;animation:breathe 61s ease-in-out infinite}.glowB{--x:80px;--y:60px;animation:breathe 97s ease-in-out infinite -30s}
${XF}${[...ringCycles].map(ringKf).join('')}@keyframes lap{to{transform:rotate(-360deg)}}
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
  const glows = anim => `<g${anim ? ' class="glowB"' : ''}><circle cx="330" cy="240" r="640" fill="url(#glowB)"/></g><g${anim ? ' class="glowA"' : ''}><circle cx="${f(EYE[0])}" cy="${f(EYE[1])}" r="480" fill="url(#glowA)"/></g>`
  const fish = anim => [2, 1, 0].map(i => koiAt(KOI[i], i, anim)).join('\n')

  // Anchored bottom-right: on a tall phone the left is cropped, on a wide window the top; the corner
  // with the koi stays in view and the middle, where the words are, stays empty.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMax slice">
${style}
<defs>
${shared}
<linearGradient id="pt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${L.petal[0]}"/><stop offset="1" stop-color="${L.petal[1]}"/></linearGradient>
${SPECKS}${L.caustics ? CAUSTICS : ''}${BOOK.frames.join('')}${PETAL}${RINGS}
</defs>
${ground}
${glows(true)}
<g class="specks"><rect y="-420" width="${W + 420}" height="${H + 420}" fill="url(#specks)"/></g>
${L.caustics ? '<g class="cA"><use href="#caustics"/></g>' : ''}
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
if (process.env.SIZES) console.log({ frames: BOOK.frames.join('').length, rings: RINGS.length, caustics: CAUSTICS.length, FS, G, RADII, C1, C2, C3, EYE })
if (night.poster.length >= 12000) throw new Error('poster over 12,000 characters')
for (const v of [night.svg, day.svg]) if (v.length >= 131072) throw new Error(`scene is ${v.length} characters, over 131,072`)
writeFileSync(join(ROOT, 'hooks/looks/koi-script/scene.js'),
  `// Generated by tools/scenes/koi-script.mjs: a koi pond from above in glyphs, its koi raymarched into ASCII; by night and by day.\nexport const SCENE = ${JSON.stringify(night.svg)}\nexport const SCENE_DAY = ${JSON.stringify(day.svg)}\nexport const POSTER = ${JSON.stringify(night.poster)}\n`)
