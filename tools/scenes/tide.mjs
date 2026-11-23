// tide scene generator. Run: node tools/scenes/tide.mjs
// A night sea in glowing glyphs, read cell by cell from pictures made for this look (tools/scenes/tide/,
// cut from the owner's picks of the Codex compositions, in the style xmas began): the full moon high on
// the left, in the open field beside the sidebar; the sea under it, its road of silver glints; a sleepy
// kawaii lighthouse low on the far right, dozing, its beam turning once every 157 s.
// Nothing festive.
// Motion is soft and slow, like xmas's snow: the sea never churns; its rows sway sideways in bands, a
// slow ease back and forth whose phase runs toward the viewer, so a long swell passes under the road; the
// road's glints breathe in three sets; the lamp breathes. Rarely, a whale: its long back and a tall spout
// rise in the moon's road, and half a cycle later its tail lifts and slips back under; falling stars, as
// before. Each event on its own prime cycle.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readPng, readPart, mosaic, hsv, hex } from './mosaic.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const PIC = name => readPng(join(ROOT, 'tools/scenes/tide', `${name}.png`))
const W = 1600, H = 1000
const f = n => +n.toFixed(1)
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const rng = s => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
let R = rng(20261123)

let css = ''
const kf = (name, body) => { css += `@keyframes ${name}{${body}}\n` }
const pc = (s, cycle) => f((s / cycle) * 100)

const SKY_REF = [1, 9, 25] // the pictures' night
const nearSky = c => Math.max(...c.map((v, n) => Math.abs(v - SKY_REF[n]))) < 22
const HZ = 560 // the horizon
const MOON = [375, 330] // the moon's middle: the open field beside the sidebar (docs/DIRECTION.md, Layout)

// ── the parts. src is the whole crop; at and scale place it (xMidYMax: at 1920 × 1080 with both panels
// open the left band is clear from about x 200 to 490, the right one from 1060 to 1350).
const moonP = { id: 'moon', img: PIC('moon'), scale: 0.72, div: 1.2 }
moonP.src = [0, 0, moonP.img.w, moonP.img.h]
moonP.at = [MOON[0] - 187 * 0.72, MOON[1] - 190 * 0.72] // the disc's middle is at (187, 190) of the crop

// The moon's road: from the picture's sea, only the glints under its moon (x 150 to 620), stretched a
// little to reach the foot. The rest of the sea is drawn in rows below (code, not the picture: read
// whole it was coarse, sparse, and 40,000 characters).
const seaP = { id: 'sea', img: PIC('sea'), div: 1.6, glyphScale: 0.72 }
seaP.src = [150, 12, 620, seaP.img.h]
seaP.scale = [1, (H - HZ) / (seaP.img.h - 12)]
seaP.at = [150, HZ]

// the lighthouse on its rock, low on the right; the rock's foot is at y 290 of the crop, its middle x 165
// the lighthouse sits well to the right, clear of the conversation's glass with the right panel closed
// (the panel, open, covers it: the owner's call, 2026-11-23)
const LH = { s: 0.95, x: 1465, foot: 895 }
const lightP = { id: 'light', img: PIC('lighthouse'), scale: LH.s, div: 1 } // the picture's own glyphs
lightP.colour = c => c.map(v => Math.min(255, v * 1.22))
// its face (closed eyes, smile, rosy cheeks) is drawn finer than the picture's glyphs: read on a grid
// four times finer, as mean colours, and kept as small dark and pink blocks over the body
// In the picture the face is a smooth white plate on the tower with the marks drawn on it: here the
// plate's cells replace the tower's glyphs there, as small blocks of their own colour.
const FACE = [122, 128, 210, 174]
const faceP = { id: 'face', img: lightP.img, scale: LH.s, div: 3.4, src: FACE, at: [0, 0] }
lightP.src = [0, 0, lightP.img.w, lightP.img.h]
lightP.at = [LH.x - 165 * LH.s, LH.foot - 290 * LH.s]
faceP.at = [lightP.at[0] + FACE[0] * LH.s, lightP.at[1] + FACE[1] * LH.s]
faceP.mean = () => true
const inRock = (x, y) => y >= 196 && y <= 296 && x >= 52 + ((296 - y) / 84) * 53 && x <= 292 - ((296 - y) / 84) * 77

// the whale, three poses, each on its own waterline in the moon's road
const WHALE = { x: 400, y: 705 }
const pose = (id, scale, div, waterX, waterY, y = WHALE.y) => {
  const p = { id, img: PIC(id), scale, div }
  p.src = [0, 0, p.img.w, p.img.h]
  p.at = [WHALE.x - waterX * scale, y - waterY * scale]
  p.water = y
  // the body's blue under its silver edge: coarse cells read as their mean, lifted, keep both
  p.mean = () => true
  p.colour = c => c.map(v => Math.min(255, v * (id === 'spout' ? 2.9 : 2.3)))
  return p
}
const spoutP = pose('spout', 0.3, 0.7, 690, 656)
const tailP = pose('tail', 0.64, 1.25, 212, 282, 740)
const diveP = pose('dive', 0.3, 0.62, 725, 420, 740)

// ── read the cells
const glyphSolid = c => { const [, sat, val] = hsv(c); return val < 0.3 ? '+' : sat < 0.32 && val > 0.55 ? '*' : '#' }
const glyphSea = c => (hsv(c)[2] > 0.78 ? '=' : '-') // glints on water are streaks
const M = mosaic({ glyph: (c, p) => (p.part === 'sea' ? glyphSea(c) : glyphSolid(c)) })

const moon = readPart(Object.assign(moonP, { keep: p => !nearSky(p.c) && p.L > 0.06 }))
const sea = readPart(Object.assign(seaP, { keep: p => p.sat < 0.38 && p.val > 0.5 }))
const light = readPart(Object.assign(lightP, {
  keep: p => {
    if (nearSky(p.c) || p.L < 0.16) return false
    // the tower and lamp above the horizon (its row of = is the sea's, but for the tower's own foot)
    if (p.sy < 193 || (p.sy < 215 && p.sx > 100 && p.sx < 225)) return true
    if (inRock(p.sx, p.sy)) return true
    return p.sy > 290 && p.hue > 135 && p.hue < 195 && p.sat > 0.3 // its mint reflection
  },
}))
const poses = [spoutP, tailP, diveP].map(pt => readPart(Object.assign(pt, { keep: p => p.L > 0.12 })))
const face = readPart(faceP)
// the whole shape, lit or not, for the backing: the tower above the horizon and the rock below it
const shapeP = { ...lightP, id: 'shape', keep: undefined, colour: undefined }
const shape = readPart(Object.assign(shapeP, { keep: p => inRock(p.sx, p.sy) }))
// marks are dark on a bright neighbourhood; plate cells keep only where the picture is lit, so the
// plate's edge follows the tower instead of a box
for (const p of face) p.kind = p.sat > 0.12 && (p.hue < 30 || p.hue > 315) && p.val > 0.45 ? 'pink' : p.L < 0.5 && p.val < 0.6 ? 'mark' : p.L > 0.62 ? 'plate' : 'none'
const lit = (i, j) => face.some(q => q.i === i && q.j === j && q.kind !== 'none')
// round the plate: its corner cells off
const [mi, mj] = [Math.max(...face.map(p => p.i)), Math.max(...face.map(p => p.j))]
for (const p of face) if (p.kind === 'plate' && Math.min(p.i, mi - p.i) + Math.min(p.j, mj - p.j) < 1) p.kind = 'none'
for (const p of face) if (p.kind === 'mark' && !(lit(p.i - 2, p.j) && lit(p.i + 2, p.j)) && !(lit(p.i, p.j - 2) && lit(p.i, p.j + 2))) p.kind = 'none'
const inFace = p => p.sx + p.S0 > FACE[0] && p.sx < FACE[2] && p.sy + p.S0 > FACE[1] && p.sy < FACE[3]

// roles: the road's glints (pale and bright, under the moon) breathe in three sets; the lamp and its
// reflection breathe together; sea rows are banded for the swell
// ── the sea: rows of glyphs in perspective, each a strip filled with a pattern tile of one swell's
// length. Along the tile the water rises and falls (a swell and a smaller second wave on it): dashes
// in the troughs, tildes on the slopes, bright = on the crests, with a few gaps; each row's tile is set
// a little further along than the last, on a gentle curve, so the crests run in long bowed lines across
// the rows, as in the picture. Colours from the picture's water.
const ROWS = 28, BANDS = 8 // every glyph costs a frame (docs/DIRECTION.md): about 2,500 in the sea
const LEVELS = [['-', '#172c58'], ['-', '#22427a'], ['~', '#3266a8'], ['~', '#6299da'], ['=', '#bcd8f8']]
const rowY = r => HZ + 5 + (H - HZ) * ((r + 0.5) / ROWS) ** 1.35
const rows = []
let seaTiles = ''
R = rng(7041)
for (let r = 0; r < ROWS; r++) {
  // glyphs small (4 to 11 units), set a little apart, so the water reads fine-grained, not as type
  const t = (r + 0.5) / ROWS, y = rowY(r), fs = 4 + 7 * t
  const lambda = 260 + 620 * t, n = Math.round(lambda / (0.602 * (5 + 11.5 * t) * 1.3)), px = lambda / n
  const per = LEVELS.map(() => [])
  for (let k = 0; k < n; k++) {
    const u = (2 * Math.PI * k) / n
    const crest = 0.78 * Math.cos(u) + 0.22 * Math.cos(2 * u + 1.3)
    const lv = crest > 0.86 ? 4 : crest > 0.6 ? 3 : crest > 0.2 ? 2 : crest > -0.35 ? 1 : 0
    if (R() < [0.5, 0.3, 0.14, 0.06, 0.02][lv]) continue
    per[lv].push(f(k * px))
  }
  const h = f((5 + 11.5 * t) * 1.25), id = `r${r}`
  // where this row's crest lies: on lines that run down and across the water, bowing gently; one swell's
  // length apart on each row, so the lines spread toward the viewer as swells do in perspective
  const dy = y - HZ, shift = 180 + 0.85 * dy + 55 * Math.sin(dy / 65)
  seaTiles += `<pattern id="${id}" width="${f(lambda)}" height="${h}" patternUnits="userSpaceOnUse" patternTransform="translate(${f(shift)} ${f(y - h / 2)})"><g style="font-size:${f(fs)}px">${per.map((xs, i) => (xs.length ? `<text fill="${LEVELS[i][1]}" x="${xs.join(' ')}" y="${f(h * 0.72)}">${LEVELS[i][0].repeat(xs.length)}</text>` : '')).join('')}</g></pattern>`
  rows.push({ r, y, h, id, band: Math.min(BANDS - 1, Math.floor(t * BANDS)), o: f(0.5 + 0.5 * t) })
}
// the road's glints stay where the moon puts them, and breathe in three sets
for (const p of sea) p.set = Math.floor(R() * 3)
for (const p of light) p.lamp = p.hue > 135 && p.hue < 195 && p.sat > 0.3 && p.val > 0.45 && (p.sy < 75 || p.sy > 290)

M.pool(moon, moonP, 22)
for (const p of sea) p.c = p.c.map(v => v * 0.78) // the road a little dimmer than the picture's (the owner)
M.pool(sea, seaP, 8)
M.pool(light.filter(p => !p.lamp), lightP, 18)
M.pool(light.filter(p => p.lamp), lightP, 8)
poses.forEach((cs, i) => M.pool(cs, [spoutP, tailP, diveP][i], 12))

// ── stars: few, far from the moon and off the middle, twinkling slowly
let stars = '', posterStars = ''
for (let i = 0, made = 0; made < 22 && i < 600; i++) {
  const x = 40 + R() * 1520, y = 110 + R() * (HZ - 150)
  const g = R()
  if (x > 520 && x < 1080) continue
  if (Math.hypot(x - MOON[0], y - MOON[1]) < 190) continue
  made++
  const near = g > 0.8
  const ch = near ? '+' : g > 0.45 ? '*' : '·'
  const o = near ? 0.8 : f(0.45 + R() * 0.3)
  const dur = f(29 + R() * 37)
  stars += `<text class="tw" x="${f(x)}" y="${f(y)}" fill-opacity="${o}" style="font-size:${near ? 11 : 9}px;animation-duration:${dur}s;animation-delay:${f(-R() * dur)}s">${ch}</text>`
  posterStars += `<text x="${f(x)}" y="${f(y)}">${ch}</text>`
}
kf('tw', '0%,100%{opacity:.4}50%{opacity:1}') // each star's own brightness is its fill-opacity (calc() would make the app draw the scene at zoom 8)

// ── the swell: each band of rows rocks gently, sideways and a little up and down, nearer bands
// further, each a little later than the one beyond it, so the swell runs toward the viewer. The rock is
// a sine, written as keyframes every sixteenth of a turn, and each stretch moves in steps of a third of a
// unit: the browser redraws the sea only when it has moved that far, not every frame (smooth, it cost
// 1.4 ms of the frame; the steps are under half a pixel, too small to see).
const SWELL = 46 // one full rock, there and back
let swellCss = ''
for (let b = 0; b < BANDS; b++) {
  const d = b / (BANDS - 1), ax = 1.5 + d * 6, ay = 0.4 + d * 1.6
  const N = 16, keys = []
  for (let i = 0; i <= N; i++) {
    const ph = (2 * Math.PI * i) / N
    const x = -ax * Math.cos(ph), y = ay * Math.sin(ph)
    let steps = 1
    if (i < N) {
      const ph2 = (2 * Math.PI * (i + 1)) / N
      steps = Math.max(1, Math.round(Math.hypot(ax * (Math.cos(ph2) - Math.cos(ph)), ay * (Math.sin(ph2) - Math.sin(ph))) / 0.33))
    }
    keys.push(`${f((i / N) * 100)}%{transform:translate(${f(x)}px,${f(y)}px);animation-timing-function:steps(${steps})}`)
  }
  kf(`sw${b}`, keys.join(''))
  swellCss += `.sw${b}{animation:sw${b} ${SWELL}s infinite ${f(-SWELL + d * 9)}s}`
}
// the road's glints breathe in three sets, never together
const GLINT = [11, 13, 17]
kf('gl', '0%,100%{opacity:.5}50%{opacity:.9}')

// ── the whale: one cycle of 263 s (prime), the spout at its start and the tail half a cycle later.
// A pose rises by growing up from its waterline (scaleY), fading in, so nothing dips below the water.
const WCYCLE = 263, WFIRST = 20
// each pose is also hidden (visibility) outside its own seconds, so it costs nothing while away
const wkf = (name, keys) => {
  const on = keys.filter(([, v]) => !/opacity:0(?![.\d])/.test(v)).map(([t]) => t)
  const [a, b] = [Math.min(...on) - 0.2, Math.max(...on) + 0.2]
  kf(name, keys.map(([t, v]) => `${pc(t, WCYCLE)}%{${v};visibility:${t > a && t < b ? 'visible' : 'hidden'}}`).join(''))
}
const up = (s0, sc) => `transform:scaleY(${sc});opacity:${s0}`
// spout: the back rises over 5 s, the spout blooms at 3 s and drifts away by 13 s, the back sinks by 18 s
wkf('wBack', [[0, up(0, 0.5)], [5, up(1, 1)], [13, up(1, 1)], [18, up(0, 0.45)], [WCYCLE, up(0, 0.45)]])
wkf('wSpout', [[0, 'transform:scale(.6,.2);opacity:0'], [3, 'transform:scale(.6,.2);opacity:0'], [6, 'transform:scale(1,1);opacity:.95'], [13, 'transform:scale(1.25,1.12);opacity:0'], [WCYCLE, 'transform:scale(1.25,1.12);opacity:0']])
// tail, 131 s later: it lifts over 5 s, holds, eases into the dive at 10 s and is gone by 17 s
const T0 = 131
wkf('wTail', [[0, up(0, 0.4)], [T0, up(0, 0.4)], [T0 + 5, up(1, 1)], [T0 + 9, up(1, 1)], [T0 + 11.5, up(0, 1)], [WCYCLE, up(0, 1)]])
wkf('wDive', [[0, up(0, 1)], [T0 + 9, up(0, 1)], [T0 + 11, up(1, 1)], [T0 + 17, up(0, 0.3)], [WCYCLE, up(0, 0.3)]])
// ── the lighthouse's light: it dozes, its lamp low and breathing; every 157 s (prime) it wakes, its
// lamp brightens and a fan of mint glyphs turns once about it: pointing left, swinging toward the
// viewer (the lamp flashing as it faces us), out to the right, and gone. Twelve seconds; hidden the rest.
const lampCells = light.filter(p => p.lamp && p.sy < 75)
const LAMP = [lampCells.reduce((a, p) => a + p.x, 0) / lampCells.length + 4, lampCells.reduce((a, p) => a + p.y, 0) / lampCells.length + 4]
const BCYCLE = 157, BFIRST = 35
kf('doze', '0%,100%{opacity:.45}50%{opacity:.7}')
const bk = (name, keys) => kf(name, keys.map(([t, v]) => `${pc(t, BCYCLE)}%{${v};visibility:${t > 0 && t < 13 ? 'visible' : 'hidden'}}`).join(''))
bk('wake', [[0, 'opacity:0'], [0.1, 'opacity:0'], [2, 'opacity:.6'], [5.6, 'opacity:1'], [6.6, 'opacity:1'], [10, 'opacity:.55'], [12.9, 'opacity:0'], [BCYCLE, 'opacity:0']])
bk('beam', [[0, 'transform:scaleX(1);opacity:0'], [0.1, 'transform:scaleX(1);opacity:0'], [2, 'transform:scaleX(1);opacity:.85'], [6, 'transform:scaleX(.04);opacity:1'], [10, 'transform:scaleX(-1);opacity:.85'], [12.9, 'transform:scaleX(-1);opacity:0'], [BCYCLE, 'transform:scaleX(-1);opacity:0']])
let beamSvg = ''
{
  const L = 470, rays = 11, spread = 0.15, byBand = [[], [], [], []]
  for (let k = 0; k < rays; k++) {
    const a = ((k - (rays - 1) / 2) / ((rays - 1) / 2)) * spread
    for (let d = 14; d < L; d += 9 + d * 0.012) {
      const band = Math.min(3, Math.floor((d / L) * 4))
      if (Math.abs(k - (rays - 1) / 2) > 3 && R() < 0.3) continue
      byBand[band].push([LAMP[0] - d, LAMP[1] + d * Math.tan(a)])
    }
  }
  beamSvg = `<g class="beam">${byBand.map((pts, b) => `<text fill-opacity="${[1, 0.75, 0.48, 0.22][b]}" style="font-size:${10 + b}px;font-weight:700" x="${pts.map(q => f(q[0])).join(' ')}" y="${pts.map(q => f(q[1] + 3)).join(' ')}">${(b < 1 ? '=' : b < 3 ? '-' : '·').repeat(pts.length)}</text>`).join('')}</g>`
}
const wAnim = name => `animation:${name} ${WCYCLE}s ease-in-out infinite ${WFIRST - WCYCLE}s`

// the spout is cut from the back where it leaves the blowhole (x 560 to 720 of its crop runs up to
// y 620): above y 630 of the crop it is the spout, below it the back
const spoutCells = poses[0].filter(p => p.sy < 630), backCells = poses[0].filter(p => p.sy >= 630)
const blow = [spoutP.at[0] + 690 * spoutP.scale, spoutP.at[1] + 640 * spoutP.scale]

// ── falling stars (as before): one into the sea right of the road, rings opening where it lands; one
// far off on the right that never reaches the water. 307 s and 449 s, prime.
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
const STAR_A = fallingStar('sa', { x0: 640, y0: 140, x1: 610, y1: 660, cycle: 307, first: 40, fall: 5.5, glyphs: 40, size: 11, rings: true })
const STAR_B = fallingStar('sb', { x0: 1300, y0: 130, x1: 1420, y1: 280, cycle: 449, first: 190, fall: 3.6, glyphs: 18, size: 8, rings: false })

// ── the page
const SKY = '#060a18'
const bloom = `<filter id="bloom" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
const grads = `<linearGradient id="sky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${H}"><stop offset="0" stop-color="#03061a"/><stop offset="${f(HZ / H - 0.012)}" stop-color="#091026"/><stop offset="${f(HZ / H + 0.004)}" stop-color="#060b1d"/><stop offset="1" stop-color="${SKY}"/></linearGradient>
<radialGradient id="lampGlow"><stop offset="0" stop-color="#c8fff4" stop-opacity=".95"/><stop offset=".18" stop-color="#7ff5df" stop-opacity=".55"/><stop offset=".5" stop-color="#5cf2d6" stop-opacity=".14"/><stop offset="1" stop-color="#5cf2d6" stop-opacity="0"/></radialGradient>
<radialGradient id="halo"><stop offset="0" stop-color="#9fb2ec" stop-opacity=".16"/><stop offset=".45" stop-color="#7286c8" stop-opacity=".05"/><stop offset="1" stop-color="#5b6db0" stop-opacity="0"/></radialGradient>`

const style = `<style>
text{font-family:ui-monospace,Menlo,"SF Mono","DejaVu Sans Mono",Consolas,monospace;white-space:pre}
.tw{fill:#b7c3ea;animation:tw steps(16) infinite}
${swellCss}
${GLINT.map((t, i) => `.g${i}{animation:gl ${t}s steps(36) infinite ${f(-i * 4.3)}s}`).join('')}
.lamp{opacity:.55;animation:doze 14s steps(30) infinite}
.wake{transform-origin:${f(LAMP[0])}px ${f(LAMP[1])}px;opacity:0;animation:wake ${BCYCLE}s ease-in-out infinite ${BFIRST - BCYCLE}s}
.beam{transform-origin:${f(LAMP[0])}px ${f(LAMP[1])}px;opacity:0;animation:beam ${BCYCLE}s ease-in-out infinite ${BFIRST - BCYCLE}s}
.beam text{fill:#7ff5df}
.wb{transform-origin:${f(WHALE.x)}px ${f(spoutP.water)}px;opacity:0;${wAnim('wBack')}}
.ws{transform-origin:${f(blow[0])}px ${f(blow[1])}px;opacity:0;${wAnim('wSpout')}}
.wt{transform-origin:${f(WHALE.x)}px ${f(tailP.water)}px;opacity:0;${wAnim('wTail')}}
.wd{transform-origin:${f(WHALE.x)}px ${f(diveP.water)}px;opacity:0;${wAnim('wDive')}}
.head{fill:#efffff;opacity:0}.trail{fill:#5cf2d6;opacity:0}.ring{opacity:0}.ring text{fill:#8cefdc;font-size:8px}
${css}@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>`

function scene() {
  const bright = moon.filter(p => p.L > 0.6), soft = moon.filter(p => p.L <= 0.6)
  let seaSvg = ''
  for (let b = 0; b < BANDS; b++) {
    seaSvg += `<g class="sw${b}">${rows.filter(rw => rw.band === b).map(rw => `<rect x="-24" y="${f(rw.y - rw.h / 2)}" width="${W + 48}" height="${rw.h}" fill="url(#${rw.id})" opacity="${rw.o}"/>`).join('')}</g>`
  }
  for (const p of light) p.S0 = lightP.grid.x.T * 0.5
  const lightBody = light.filter(p => !p.lamp && p.sy <= 296 && !inFace(p))
  const lamp = light.filter(p => p.lamp)
  // each pose over a dark backing of its own shape, so it stands out against the road's glints
  const pose = (cs, pt) => `${M.solid(cs, pt, SKY)}${M.shapes(cs, pt)}`
  const whale = `<g class="wb">${pose(backCells, spoutP)}</g><g class="ws">${M.shapes(spoutCells, spoutP)}</g><g class="wt">${pose(poses[1], tailP)}</g><g class="wd">${pose(poses[2], diveP)}</g>`
  const body = `<rect x="-400" y="-300" width="${W + 800}" height="${H + 300}" fill="url(#sky)"/>
<g>${stars}</g>
<circle cx="${MOON[0]}" cy="${MOON[1]}" r="260" fill="url(#halo)"/>
${M.shapes(soft, moonP)}<g filter="url(#bloom)">${M.shapes(bright, moonP)}</g>
${STAR_B}
${seaSvg}
${GLINT.map((_, i) => `<g class="g${i}">${M.shapes(sea.filter(p => p.set === i), seaP)}</g>`).join('')}
${whale}
${M.solid(shape, shapeP, '#080d20')}${M.solid(lightBody, lightP, '#080d20')}${M.shapes(lightBody, lightP)}${M.shapes(light.filter(p => !p.lamp && p.sy > 296), lightP)}
${M.solid(face.filter(p => p.kind === 'plate'), faceP, '#d4e2f7')}${M.solid(face.filter(p => p.kind === 'mark'), faceP, '#18213a')}${M.solid(face.filter(p => p.kind === 'pink'), faceP, '#f29bb0')}
<g class="lamp">${M.shapes(lamp, lightP)}</g><circle class="wake" cx="${f(LAMP[0])}" cy="${f(LAMP[1])}" r="70" fill="url(#lampGlow)"/>
${beamSvg}
${STAR_A}`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">
${style}
<defs>${grads}${seaTiles}${M.defs}${bloom}</defs>
${body}
</svg>`.replace(/\n\s*\n/g, '\n')
  return svg
}

// the poster: a coarse still of the moon, the sea and the lighthouse, as <text>, no events
function poster() {
  const q = v => Math.min(255, Math.round(v / 40) * 40)
  const coarse = [...moon.filter(p => p.i % 4 === 0 && p.j % 3 === 0), ...sea.filter(p => p.i % 4 === 0 && p.j % 3 === 0), ...light.filter(p => p.i % 5 === 0 && p.j % 4 === 0)]
  const groups = new Map()
  for (const p of coarse) {
    const h = hex(p.c.map(q))
    if (!groups.has(h)) groups.set(h, [])
    groups.get(h).push(p)
  }
  let out = ''
  for (const [h, g] of groups) out += `<text fill="${h}" x="${g.map(p => f(p.x)).join(' ')}" y="${g.map(p => f(p.y + 14)).join(' ')}">${esc(g.map(p => p.ch).join(''))}</text>`
  return `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" width="320" height="180"><style>text{font-family:ui-monospace,Menlo,monospace;font-size:20px}.st{fill:#b7c3ea;font-size:12px;opacity:.6}</style><rect width="${W}" height="${H}" fill="${SKY}"/><g class="st">${posterStars}</g>${out}</svg>`
}

const svg = scene(), post = poster()
console.log(`tide: ${svg.length} characters, poster ${post.length}, cells`, { moon: moon.length, sea: sea.length, light: light.length, face: face.length, whale: poses.map(p => p.length), patterns: M.count })
if (post.length >= 12000) throw new Error(`poster is ${post.length} characters, over 12,000`)
if (svg.length >= 131072) throw new Error(`scene is ${svg.length} characters, over 131,072`)
writeFileSync(join(ROOT, 'hooks/looks/tide/scene.js'),
  `// Generated by tools/scenes/tide.mjs: a night sea in glyphs, read from the pictures in tools/scenes/tide/.\nexport const SCENE = ${JSON.stringify(svg)}\nexport const POSTER = ${JSON.stringify(post)}\n`)
