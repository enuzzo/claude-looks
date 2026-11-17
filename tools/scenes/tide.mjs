// tide scene generator. Run: node tools/scenes/tide.mjs
// A night sea set in type. The subject is the moon, high in the open field beside the sidebar: a real sphere, ray-cast
// here at build time with lunar seas and craters on it, and turned into ASCII (dense glyphs where it is
// lit, thinning to nothing at the terminator). Under it a sea of glyphs in perspective, rows smaller
// toward the horizon, each row turning in the slow orbit a swell gives the water (24 s), the crest
// travelling toward the viewer; down the middle of it, the moon's road: brighter glyphs that shimmer by
// slow crossfades. Far stars, barely there. Rarely, minutes apart and never in step, a star falls: one
// into the sea, leaving a short trail of glyphs and rings of o and . opening where it lands; one far off
// over the left, small, that never reaches the water.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { frameSvg } from './ascii3d.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

// one seeded stream per material, so tuning one never reshuffles another
const rng = s => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
let R = rng(20261116)
const f = n => +n.toFixed(2)
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const ADV = 0.602 // monospace advance, in ems

// The frame: 16:9, anchored at the right and kept in the middle vertically. A phone keeps the right
// quarter (the moon and its road); a very wide window loses a band at the top and the foot, which the
// composition leaves empty.
const W = 1600
const H = 900
const HZ = 560 // the horizon
const MX = 375 // the moon, and the road under it: the open field beside the sidebar (docs/DIRECTION.md, Layout)
const MY = 258
const MR = 106

let css = ''
const kf = (name, body) => { css += `@keyframes ${name}{${body}}\n` }
const pc = (s, cycle) => f((s / cycle) * 100)

// ── the moon: a unit sphere ray-cast cell by cell, 4×4 rays per cell so the limb and the terminator
// thin out instead of stepping. Albedo carries the maria (smooth 3D value noise on the surface) and a
// few craters, each a darker floor with a bright rim; one young crater low on the face throws rays.
function noise3() {
  const P = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [P[i], P[j]] = [P[j], P[i]] }
  const V = Array.from({ length: 256 }, () => R())
  const h = (x, y, z) => V[P[(P[(P[x & 255] + y) & 255] + z) & 255]]
  const s = t => t * t * (3 - 2 * t)
  return (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
    const u = s(x - xi), v = s(y - yi), w = s(z - zi)
    const l = (a, b, t) => a + (b - a) * t
    return l(
      l(l(h(xi, yi, zi), h(xi + 1, yi, zi), u), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
      l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v),
      w)
  }
}
const N3 = noise3()
const fbm = (x, y, z) => N3(x, y, z) * 0.55 + N3(x * 2.1, y * 2.1, z * 2.1) * 0.3 + N3(x * 4.3, y * 4.3, z * 4.3) * 0.15
const norm = ([x, y, z]) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l] }
// craters, placed by hand on the face (x right, y up, z toward us), radius in radians
const CRATERS = [
  [[-0.12, -0.62, 0.78], 0.07, 0.7], // Tycho, young, with rays
  [[-0.26, 0.27, 0.93], 0.05, 0.3], // Copernicus
  [[0.42, 0.38, 0.82], 0.09], [[0.62, -0.18, 0.76], 0.07], [[-0.36, 0.55, 0.75], 0.08],
  [[0.18, 0.12, 0.98], 0.05], [[0.74, 0.44, 0.5], 0.06], [[-0.55, -0.2, 0.8], 0.06],
  [[0.3, -0.45, 0.84], 0.045], [[0.05, 0.72, 0.69], 0.05], [[0.82, 0.05, 0.57], 0.05],
].map(([d, r, rays]) => [norm(d), r, rays])
// the maria of the near side, roughly where they are on the real moon (x right, y up on the face)
const MARIA = [
  [-0.35, 0.55, 0.3], [-0.68, 0.12, 0.38], [0.18, 0.46, 0.17], [0.36, 0.17, 0.2], [0.71, 0.33, 0.11],
  [0.58, -0.09, 0.13], [0.37, -0.27, 0.09], [-0.27, -0.36, 0.17], [-0.05, 0.8, 0.1], [-0.3, 0.79, 0.1],
]
function albedo(n) {
  // a ragged edge: the distance to each mare is bent by noise
  const wob = (fbm(n[0] * 5 + 7, n[1] * 5, n[2] * 5) - 0.5) * 0.16
  let mare = 0
  for (const [mx, my, r] of MARIA) {
    const d = Math.hypot(n[0] - mx, n[1] - my) + wob
    mare = Math.max(mare, Math.min(1, Math.max(0, (r - d) / 0.05 + 0.5)))
  }
  let a = 0.94 - mare * 0.4
  a *= 0.92 + 0.16 * N3(n[0] * 14, n[1] * 14, n[2] * 14) // regolith grain
  for (const [c, r, rays] of CRATERS) {
    const d = Math.acos(Math.max(-1, Math.min(1, n[0] * c[0] + n[1] * c[1] + n[2] * c[2])))
    if (d < r * 0.78) a *= 0.72
    else if (d < r * 1.12) a *= 1.22
    else if (rays && d < rays) {
      // thin bright rays from the young craters
      const ang = Math.atan2(n[1] - c[1], n[0] - c[0])
      const ray = Math.max(0, Math.cos(ang * 7 + 0.6)) ** 18
      a *= 1 + 0.45 * ray * (1 - d / rays)
    }
  }
  return Math.min(1.15, a)
}
const MOON_FS = 9.4
// no dashes or equals in the ramp: on a grid they join into lines and the sphere reads as scanlines
const MRAMP = ' .,:;i!*ox%#@'
const LIGHT = norm([0.66, 0.22, 0.72]) // waxing gibbous: the terminator crosses the left of the face
function moonFrame(fs) {
  const MCW = fs * ADV, MCH = fs * 1.08
  const cols = Math.ceil((2 * MR) / MCW) + 2, rows = Math.ceil((2 * MR) / MCH) + 2
  const out = []
  for (let r = 0; r < rows; r++) {
    const row = []
    for (let c = 0; c < cols; c++) {
      let sum = 0
      for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
        const x = ((c + (sx + 0.5) / 4) * MCW - cols * MCW / 2) / MR
        const y = -((r + (sy + 0.5) / 4) * MCH - rows * MCH / 2) / MR
        const rr = x * x + y * y
        if (rr >= 1) continue
        const n = [x, y, Math.sqrt(1 - rr)]
        const lit = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2])
        // Lommel-Seeliger keeps the full face bright to the limb; a little earthshine on the night side
        const ls = lit > 0 ? (2 * lit) / (lit + n[2]) : 0
        sum += albedo(n) * (0.9 * Math.min(1.1, ls) ** 0.9 * Math.min(1, lit * 6)) + 0.035
      }
      const v = sum / 16
      row.push(v < 0.03 ? [' ', 0] : [MRAMP[Math.min(MRAMP.length - 1, Math.max(1, Math.round(v * (MRAMP.length - 1))))], v])
    }
    out.push(row)
  }
  return out
}
function moonSvgAt(fs) {
  const fr = moonFrame(fs), cw = fs * ADV, chh = fs * 1.08
  const mw = fr[0].length * cw, mh = fr.length * chh
  return `<g transform="translate(${f(MX - mw / 2)} ${f(MY - mh / 2)})" style="font-size:${fs}px">${frameSvg(fr, { cw: f(cw), ch: f(chh), prefix: 'm', bands: [0.07, 0.2, 0.38, 0.58, 0.8] })}</g>`
}
const moonSvg = moonSvgAt(MOON_FS)
const moonPoster = moonSvgAt(13)

R = rng(77101)
// ── the sea: rows from the horizon down, each bigger than the one behind it
const XL = -60, XR = 1170 // rows run past the left edge so their sway never shows an end
const rows = []
for (let y = HZ + 3; y < 905;) {
  const d = (y - HZ) / (H - HZ) // 0 at the horizon, 1 at the foot
  const fs = 5.4 + (y - HZ) * 0.052
  rows.push({ y, d, fs })
  y += fs * 1.2
}
const ROAD = (y, d) => 14 + d * 120 // half width of the moon's road on a row
const SWELL = 24 // seconds per swell
const LAMBDA = 0.9 // swell wavelength in "distance" (1 / height above the horizon, scaled)
kf('orb', '0%,100%{transform:translate(var(--a),0);opacity:.62}25%{transform:translate(0,var(--b));opacity:1}50%{transform:translate(calc(var(--a)*-1),0);opacity:.74}75%{transform:translate(0,calc(var(--b)*-1));opacity:.5}')
kf('xf3', `0%{opacity:0}${f(100 / 3)}%{opacity:1}${f(200 / 3)}%,100%{opacity:0}`)
let sea = ''
const posterRows = []
rows.forEach(({ y, d, fs }, k) => {
  const cw = fs * ADV
  const n = Math.ceil((XR - XL) / cw)
  const half = ROAD(y, d)
  const p1 = R() * 6.28, p2 = R() * 6.28, p3 = R() * 6.28
  let base = ''
  const roadStart = Math.max(0, Math.round((MX - half - XL) / cw)), roadEnd = Math.round((MX + half - XL) / cw)
  for (let i = 0; i < n; i++) {
    if (i >= roadStart && i < roadEnd) { base += ' '; continue }
    // wavelengths are counted in cells, so they shrink with distance like the glyphs do
    const v = 0.5 + 0.26 * Math.sin(i * 0.19 + p1) + 0.17 * Math.sin(i * 0.47 + p2) + 0.1 * Math.sin(i * 1.13 + p3) + (R() - 0.5) * 0.22
    base += v < 0.42 ? ' ' : v < 0.56 ? '.' : v < 0.68 ? '-' : v < 0.8 ? '~' : d > 0.35 ? '=' : '~'
  }
  // the road: three takes of the same glitter, dissolving into one another
  const roadX = XL + roadStart * cw
  const takes = [0, 1, 2].map(() => {
    let s = ''
    for (let i = roadStart; i < roadEnd; i++) {
      const off = (XL + (i + 0.5) * cw - MX) / half
      const p = Math.exp(-off * off * 2.2) * (0.92 - d * 0.25)
      const u = R()
      s += u < p * 0.45 ? '=' : u < p * 0.8 ? '-' : u < p ? '~' : u < p + 0.08 ? '.' : ' '
    }
    return s
  })
  const per = f(13 + R() * 6)
  const road = takes.map((s, t) => `<text class="fr${t ? '' : ' f0'}" x="${f(roadX)}" y="${f(y)}" style="animation:xf3 ${per}s linear infinite ${f(((t - 1) / 3) * per - per - R() * per)}s">${esc(s)}</text>`).join('')
  // the swell: a slow orbit, small far off; the crest reaches the near rows last
  const z = 1 / (d + 0.06)
  const delay = -(((z / LAMBDA) % 1) * SWELL)
  const a = f(fs * 0.55), b = f(-fs * 0.22)
  const op = f(0.34 + 0.66 * Math.min(1, d * 2.2))
  sea += `<g style="opacity:${op};font-size:${f(fs)}px"><g class="sw" style="--a:${a}px;--b:${b}px;animation-delay:${f(delay)}s"><text class="sea" x="${XL}" y="${f(y)}">${esc(base.replace(/\s+$/, ''))}</text><g class="road">${road}</g></g></g>\n`
  if (k % 3 === 0) posterRows.push(`<g style="opacity:${op};font-size:${f(fs)}px"><text class="sea" x="${XL}" y="${f(y)}">${esc(base.slice(0, Math.floor((900 - XL) / cw)).replace(/\s+$/, ''))}</text><text class="road" x="${f(roadX)}" y="${f(y)}">${esc(takes[0])}</text></g>`)
})

R = rng(31337)
// ── stars: few and far, kept off the middle third and away from the moon
let stars = ''
let posterStars = ''
for (let i = 0, made = 0; made < 26 && i < 400; i++) {
  const x = 60 + R() * 1520, y = 30 + R() * (HZ - 90)
  const g = R()
  if (x > 640 && x < 1280) continue
  if (Math.hypot(x - MX, y - MY) < MR * 2.1) continue
  made++
  const near = g > 0.85
  const ch = near ? '+' : g > 0.45 ? '.' : '·'
  const o = near ? 0.8 : f(0.4 + R() * 0.35)
  const dur = f(23 + R() * 31)
  stars += `<text class="tw" x="${f(x)}" y="${f(y)}" style="font-size:${near ? 9 : 7}px;--o:${o};animation-duration:${dur}s;animation-delay:${f(-R() * dur)}s">${ch}</text>`
  if (near || made % 2) posterStars += `<text x="${f(x)}" y="${f(y)}">${ch}</text>`
}
kf('tw', '0%,100%{opacity:calc(var(--o)*.35)}50%{opacity:var(--o)}')

// ── a falling star: a head that slides down its path, glyphs left behind it that fade, and, if it
// reaches the water, rings opening where it lands. `first`: seconds after the scene opens.
function fallingStar(name, { x0, y0, x1, y1, cycle, first, fall, glyphs, size, rings }) {
  const dx = x1 - x0, dy = y1 - y0
  kf(`${name}H`, `0%{transform:translate(0,0);opacity:0}${pc(0.5, cycle)}%{opacity:1}${pc(fall, cycle)}%{transform:translate(${f(dx)}px,${f(dy)}px);opacity:.9}${pc(fall + 0.4, cycle)}%,100%{transform:translate(${f(dx)}px,${f(dy)}px);opacity:0}`)
  kf(`${name}T`, `0%{opacity:0}${pc(0.25, cycle)}%{opacity:.85}${pc(1.9, cycle)}%,100%{opacity:0}`)
  const start = first - cycle
  let s = `<g transform="translate(${x0} ${y0})"><text class="head" style="font-size:${size}px;animation:${name}H ${cycle}s linear infinite ${f(start)}s">*</text></g>`
  for (let i = 1; i < glyphs; i++) {
    const t = i / glyphs
    s += `<text class="trail" x="${f(x0 + dx * t)}" y="${f(y0 + dy * t)}" style="font-size:${f(size * 0.8)}px;animation:${name}T ${cycle}s linear infinite ${f(start + fall * t)}s">${i % 4 === 1 ? ':' : '.'}</text>`
  }
  if (rings) {
    // one wave of rings, then a fainter second; each ring a flattened ellipse of glyphs on the water
    kf(`${name}R`, `0%{opacity:0}${pc(0.7, cycle)}%{opacity:.8}${pc(2.6, cycle)}%{opacity:0}${pc(3.2, cycle)}%{opacity:.4}${pc(5.6, cycle)}%,100%{opacity:0}`)
    for (let j = 0; j < 5; j++) {
      const rx = 16 + j * 22, ry = rx * 0.26, nG = Math.max(8, Math.round((2 * Math.PI * rx) / 15))
      let ring = ''
      for (let i = 0; i < nG; i++) {
        const a = (i / nG) * Math.PI * 2
        ring += `<text x="${f(x1 + Math.cos(a) * rx)}" y="${f(y1 + Math.sin(a) * ry)}">${Math.sin(a) > 0.3 ? 'o' : '.'}</text>`
      }
      s += `<g class="ring" style="animation:${name}R ${cycle}s linear infinite ${f(start + fall + j * 1.1)}s">${ring}</g>`
    }
  }
  return s
}
// into the sea, right of the road; and far off on the right, never landing. 307 s and 449 s: both prime.
const STAR_A = fallingStar('sa', { x0: 600, y0: 70, x1: 560, y1: 640, cycle: 307, first: 40, fall: 5.5, glyphs: 44, size: 11, rings: true })
const STAR_B = fallingStar('sb', { x0: 1320, y0: 70, x1: 1440, y1: 230, cycle: 449, first: 190, fall: 3.6, glyphs: 18, size: 8, rings: false })

const DEFS = `<defs>
<linearGradient id="sky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${H}"><stop offset="0" stop-color="#05071a"/><stop offset=".5" stop-color="#080c21"/><stop offset="${f(HZ / H - 0.004)}" stop-color="#0b1129"/><stop offset="${f(HZ / H + 0.006)}" stop-color="#070a1b"/><stop offset="1" stop-color="#05070f"/></linearGradient>
<radialGradient id="halo"><stop offset="0" stop-color="#9fb2ec" stop-opacity=".2"/><stop offset=".35" stop-color="#7286c8" stop-opacity=".08"/><stop offset="1" stop-color="#5b6db0" stop-opacity="0"/></radialGradient>
<radialGradient id="hz" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(${MX} ${HZ}) scale(560 40)"><stop offset="0" stop-color="#3a4c90" stop-opacity=".22"/><stop offset="1" stop-color="#2a3a78" stop-opacity="0"/></radialGradient>
<radialGradient id="seaG" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(${MX} ${HZ + 70}) scale(820 330)"><stop offset="0" stop-color="#7d93d6"/><stop offset=".4" stop-color="#5468a8" stop-opacity=".8"/><stop offset=".75" stop-color="#3a4a86" stop-opacity=".35"/><stop offset="1" stop-color="#2c3a72" stop-opacity="0"/></radialGradient>
<radialGradient id="roadG" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(${MX} ${HZ + 90}) scale(220 330)"><stop offset="0" stop-color="#f2f6ff"/><stop offset=".55" stop-color="#c8e9f0"/><stop offset="1" stop-color="#8fd8cf" stop-opacity=".2"/></radialGradient>
<radialGradient id="glint" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(${MX} ${HZ + 120}) scale(150 240)"><stop offset="0" stop-color="#a9bbf0" stop-opacity=".12"/><stop offset="1" stop-color="#a9bbf0" stop-opacity="0"/></radialGradient>
</defs>`

const style = `<style>
text{font-family:ui-monospace,Menlo,"SF Mono","DejaVu Sans Mono",Consolas,monospace;white-space:pre;dominant-baseline:hanging}
.m0{fill:#2b3560}.m1{fill:#56669c}.m2{fill:#8e9dcb}.m3{fill:#c3cdeb}.m4{fill:#e4eaf9}.m5{fill:#f7f9ff}
.moon{animation:moon 71s ease-in-out infinite}.halo{animation:halo 53s ease-in-out infinite;transform-origin:${MX}px ${MY}px}
.tw{fill:#b7c3ea;animation:tw ease-in-out infinite}
.sea{fill:url(#seaG)}.road text{fill:url(#roadG)}
.fr{opacity:0}.fr.f0{opacity:1}
.sw{animation:orb ${SWELL}s ease-in-out infinite}
.head{fill:#efffff;opacity:0}.trail{fill:#5cf2d6;opacity:0}.ring{opacity:0}.ring text{fill:#8cefdc;font-size:8px}
${css}@keyframes moon{0%,100%{opacity:.93}50%{opacity:1}}
@keyframes halo{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.08);opacity:1}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>`

// Anchored right, centred vertically: on a phone the right quarter stays (the moon and its road);
// on a wide window a band goes at the top and at the foot, where nothing lives.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMid slice">
${style}
${DEFS}
<rect x="-1200" y="-200" width="${W + 1400}" height="${H + 400}" fill="url(#sky)"/>
<g class="stars">${stars}</g>
<circle class="halo" cx="${MX}" cy="${MY}" r="300" fill="url(#halo)"/>
<g class="moon">${moonSvg}</g>
${STAR_B}
<rect x="${MX - 800}" y="${HZ - 70}" width="1600" height="140" fill="url(#hz)"/>
<rect x="${MX - 160}" y="${HZ}" width="320" height="${H - HZ}" fill="url(#glint)"/>
<g class="seaRows">
${sea}</g>
${STAR_A}
</svg>`.replace(/\n\s*\n/g, '\n')

// the poster: sky, stars, the moon, every other row of the sea with one take of the road; no events
const poster = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMid slice" width="320" height="180">
<style>text{font-family:ui-monospace,Menlo,monospace;white-space:pre;dominant-baseline:hanging}.m0{fill:#2b3560}.m1{fill:#56669c}.m2{fill:#8e9dcb}.m3{fill:#c3cdeb}.m4{fill:#e4eaf9}.m5{fill:#f7f9ff}.sea{fill:url(#seaG)}.road{fill:url(#roadG)}.st{fill:#b7c3ea;font-size:12px;opacity:.6}</style>
${DEFS}
<rect width="${W}" height="${H}" fill="url(#sky)"/><g class="st">${posterStars}</g><circle cx="${MX}" cy="${MY}" r="300" fill="url(#halo)"/>${moonPoster}
<rect x="${MX - 800}" y="${HZ - 70}" width="1600" height="140" fill="url(#hz)"/>${posterRows.join('')}
</svg>`.replace(/\n/g, '')

console.log(`tide: ${svg.length} characters, poster ${poster.length}`)
if (poster.length >= 12000) throw new Error(`poster is ${poster.length} characters, over 12,000`)
if (svg.length >= 131072) throw new Error(`scene is ${svg.length} characters, over 131,072`)
writeFileSync(join(ROOT, 'hooks/looks/tide/scene.js'),
  `// Generated by tools/scenes/tide.mjs: a night sea set in type under a ray-cast ASCII moon.\nexport const SCENE = ${JSON.stringify(svg)}\nexport const POSTER = ${JSON.stringify(poster)}\n`)
