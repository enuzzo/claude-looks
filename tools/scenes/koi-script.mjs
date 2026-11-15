// koi-script scene generator. Run: node tools/scenes/koi-script.mjs
// A koi pond from above as a glyph mosaic: every tile carries a character.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

let seed = 7731
const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
const f = n => +n.toFixed(1)
const pick = a => a[Math.floor(R() * a.length)]
const T = 18 // one tile, in viewBox units

// ── tiles, grouped by class. A tile is a square-capped stroke of almost no length (one short
// path per group), and its glyphs share one <text> per row, each glyph placed by its own x.
// Shimmering groups (class sh) keep one <text> per glyph so each can fade on its own beat.
// cells: [{ x, y, c (color class), g (glyph), k (extra class) }]
function tiles(cells) {
  const byC = {}
  for (const t of cells) (byC[(t.k ? t.k + ' ' : '') + t.c] ??= []).push(t)
  let out = ''
  for (const [cls, list] of Object.entries(byC)) {
    out += `<g class="${cls}"><path d="${list.map(t => `M${f(t.x)} ${f(t.y)}h.1`).join('')}"/>`
    const withG = list.filter(t => t.g)
    if (/\bsh\b/.test(cls)) for (const t of withG) out += `<text x="${f(t.x)}" y="${f(t.y)}">${t.g}</text>`
    else {
      const rows = {}
      for (const t of withG) (rows[f(t.y)] ??= []).push(t)
      for (const [y, r] of Object.entries(rows)) out += `<text x="${r.map(t => f(t.x)).join(' ')}" y="${y}">${r.map(t => t.g).join('')}</text>`
    }
    out += '</g>'
  }
  return out
}

// ── a koi, rasterized on the tile grid. Head points +x, centre at the origin.
// L: length in tiles, W: half-width in tiles, bend: body curve, coat(s, lat) -> color class
function koi({ L, W, bend, coat, glyphs, fins = true, eyed = true }) {
  const spine = (s, wag) => {
    // s: 0 head .. 1 tail tip
    const x = L / 2 - s * L
    const y = bend * s * s * L * 0.22 + wag * Math.max(0, s - 0.55) ** 2 * L * 0.5
    return [x, y]
  }
  // half-width along the body: round head, full shoulders, a slim peduncle
  const PROF = [[0, 0], [0.04, 0.55], [0.1, 0.84], [0.22, 1], [0.36, 0.97], [0.5, 0.8], [0.64, 0.56], [0.78, 0.34]]
  const half = s => {
    if (s < 0 || s > 0.78) return 0
    for (let k = 1; k < PROF.length; k++) if (s <= PROF[k][0]) {
      const [a, wa] = PROF[k - 1], [b, wb] = PROF[k]
      return W * (wa + (wb - wa) * (s - a) / (b - a))
    }
    return 0
  }
  const frame = wag => {
    const pts = []
    for (let k = 0; k <= 240; k++) { const s = k / 240 * 1.08; pts.push([s, ...spine(s, wag)]) }
    const cells = new Map()
    const r = Math.ceil(L / 2 + 3)
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      let best = 1e9, bs = 0, side = 0
      for (const [s, x, y] of pts) {
        const d = Math.hypot(i - x, j - y)
        if (d < best) { best = d; bs = s; side = Math.sign(j - y) || 1 }
      }
      const w = half(bs)
      let kind = null
      if (bs <= 0.78 && best <= w + 0.15) kind = 'body'
      else if (bs > 0.74 && bs <= 1.08) {
        // tail fin: widens into a fan with a shallow notch at the tip
        const u = (bs - 0.74) / 0.34
        const tw = 0.45 + 1.55 * u ** 0.9
        if (best <= tw) kind = 'tail'
      }
      if (!kind && fins && bs > 0.16 && bs < 0.38) {
        const u = (bs - 0.16) / 0.22 // pectoral fins sweep back
        if (best > w && best <= w + 2.7 * (1 - u) ** 0.7 + 0.2) kind = 'fin'
      }
      if (kind) cells.set(i + ',' + j, { i, j, kind, s: bs, lat: best * side, w })
    }
    return cells
  }
  const A = frame(0.55), B = frame(-0.55)
  const out = []
  const glyphFor = (c, kind) => (kind === 'body' ? pick(glyphs[c] ?? glyphs.def) : pick(glyphs[kind]))
  for (const [key, t] of A) {
    const both = B.has(key)
    out.push({ ...t, ab: both ? '' : 'fa' })
  }
  for (const [key, t] of B) if (!A.has(key)) out.push({ ...t, ab: 'fb' })
  // eyes: the one body tile on each side nearest a point just behind the snout
  const eyes = new Set()
  for (const sd of eyed ? [-1, 1] : []) {
    const [ex, ey] = spine(0.13, 0), ew = half(0.13) * 0.45
    let best = null, bd = 1e9
    for (const t of out) if (t.kind === 'body' && t.ab === '') {
      const d = Math.hypot(t.i - ex, t.j - (ey + sd * ew))
      if (d < bd) { bd = d; best = t }
    }
    if (best) eyes.add(best)
  }
  return out.map(t => {
    let c = t.kind === 'body' ? coat(t.s, t.lat / Math.max(t.w, 0.5), t) : t.kind === 'tail' ? coat.tail : coat.fin
    if (eyes.has(t)) c = 'eye'
    const g = c === 'eye' ? '・' : glyphFor(c, t.kind)
    const k = [t.ab, t.kind === 'tail' || t.kind === 'fin' ? 'sh' : ''].filter(Boolean).join(' ')
    return { x: t.i * T, y: t.j * T, c, g, k }
  })
}

// blobs in (s, lat) space make the patches of a coat
const blob = (s, l, list) => list.some(([bs, bl, rs, rl]) => ((s - bs) / rs) ** 2 + ((l - bl) / rl) ** 2 < 1)

const kohaku = Object.assign(
  (s, l) => (blob(s, l, [[0.06, 0, 0.09, 0.7], [0.3, -0.25, 0.13, 0.95], [0.5, 0.35, 0.1, 0.8], [0.66, -0.1, 0.07, 0.9]]) ? 'red' : 'wht'),
  { tail: 'wht fin', fin: 'wht fin' },
)
const yamabuki = Object.assign(
  (s, l) => (blob(s, l, [[0.22, 0.55, 0.06, 0.35], [0.36, -0.45, 0.07, 0.4], [0.55, 0.2, 0.05, 0.45], [0.68, -0.2, 0.04, 0.4]]) ? 'blk' : 'gld'),
  { tail: 'gld fin', fin: 'wht fin' },
)
const ochiba = Object.assign(
  (s, l) => (blob(s, l, [[0.18, 0, 0.12, 1.2], [0.48, 0.1, 0.12, 1.1]]) ? 'red' : s < 0.08 ? 'wht' : 'org'),
  { tail: 'red fin', fin: 'wht fin' },
)
const shade = Object.assign(() => 'shd', { tail: 'shd', fin: 'shd' })

const GL = {
  red: ['紅', '鯉', '紅', '朱'], wht: ['白', '水', '・', 'ゝ', '白'], gld: ['金', '鯉', '金', '光'], blk: ['墨', '・', '黒'],
  org: ['橙', '鯉', '金'], shd: ['・', ''], def: ['・'], tail: ['波', 'ゝ', '〜', '泳'], fin: ['ゝ', '・', '波'],
}

// ── a lily pad: a disc of leaf tiles with a slit, maybe a flower on it
function pad(r, slit, flower) {
  const out = []
  const n = Math.ceil(r)
  for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
    const d = Math.hypot(i, j)
    if (d > r + 0.2) continue
    let a = Math.atan2(j, i) - slit
    a = Math.atan2(Math.sin(a), Math.cos(a))
    if (Math.abs(a) < 0.32 && d > 0.6) continue
    out.push({ x: i * T, y: j * T, c: R() < 0.55 ? 'lf1' : 'lf2', g: pick(['✿', '・', '❁', '・', 'ゝ', '']) })
  }
  if (flower) {
    const [fi, fj] = flower
    for (const [di, dj] of [[0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, 1]]) {
      const k = out.find(t => t.x === (fi + di) * T && t.y === (fj + dj) * T)
      if (k) Object.assign(k, { c: 'pnk', g: pick(['❀', '✿']) })
    }
    const c = out.find(t => t.x === fi * T && t.y === fj * T)
    if (c) Object.assign(c, { c: 'yel', g: '❁' })
  }
  return out
}

// ── pebbles: a shore of stone tiles tucked into a corner (cx, cy in tiles), thinning at its rim
function pebbles(cx, cy, rx, ry) {
  const out = []
  for (let j = cy - ry; j <= cy + ry; j++) for (let i = cx - rx; i <= cx + rx; i++) {
    const d = ((i - cx) / rx) ** 2 + ((j - cy) / ry) ** 2
    if (d > 1 || R() < d * 0.9 - 0.05) continue
    out.push({ x: i * T, y: j * T, c: pick(['pb1', 'pb2', 'pb3', 'pb1']), g: pick(['◦', '∘', '◦', '°', '', '∘']) })
  }
  return out
}

// ── ripple: rings of tiles around a pad, shown one after another
function ripple(cx, cy, radii, cycle, delay) {
  let s = ''
  radii.forEach((r, k) => {
    const cells = []
    const n = Math.ceil(r + 1)
    for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
      const d = Math.hypot(i, j)
      if (Math.abs(d - r) < 0.5) cells.push({ x: (cx + i) * T, y: (cy + j) * T, c: 'rip', g: k % 2 ? '◦' : '〜' })
    }
    s += `<g class="ring" style="animation-duration:${cycle}s;animation-delay:${f(delay + k * 0.9)}s">${tiles(cells)}</g>`
  })
  return s
}

// ── a fish that swims along a path; offset-path carries it, the inner groups sway and flick
function swimmer(cells, path, dur, delay, opts = {}) {
  const halo = opts.halo ? `<ellipse class="halo" rx="${opts.halo[0]}" ry="${opts.halo[1]}" fill="url(#lamp)"/>` : ''
  const inner = `<g class="sway" style="animation-delay:${f(-R() * 7)}s">${opts.flick ? `<g class="flick" style="animation-delay:${opts.flick}s">` : '<g>'}${halo}${cells ? tiles(cells) : '<use href="#shade"/>'}</g></g>`
  return `<g class="swim" style="offset-path:path('${path}');animation-duration:${dur}s;animation-delay:${delay}s;--rest:${opts.rest ?? 40}%">${inner}</g>`
}

// ── caustics: faint light tiles that ripple across the pond, sparser in the middle
function caustics() {
  const out = []
  for (let k = 0; k < 90; k++) {
    const i = Math.floor(R() * 56) - 3, j = Math.floor(R() * 56) - 3
    const x = i * T + T / 2, y = j * T + T / 2
    const cx = (x - 500) / 330, cy = (y - 470) / 300
    if (cx * cx + cy * cy < 1 && R() < 0.85) continue
    const dl = f(-((x * 0.7 + y) / 1000) * 9 - R() * 1.5)
    out.push(`<g style="animation-delay:${dl}s"><path d="M${x} ${y}h.1"/><text x="${x}" y="${y}">${pick(['水', '〜', '・', '波', '〜', '・'])}</text></g>`)
  }
  return out.join('')
}

// ── the mosaic: two tile-shade patterns of coprime periods, so the repeat never shows
function shadePattern(id, n) {
  let s = ''
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const v = R()
    if (v < 0.35) continue
    s += `<rect x="${i * T + 1}" y="${j * T + 1}" width="${T - 2}" height="${T - 2}" rx="2" class="${v > 0.75 ? 'mh' : 'md'}" style="opacity:${+((v - 0.35) * 0.16).toFixed(2)}"/>`
  }
  return `<pattern id="${id}" width="${n * T}" height="${n * T}" patternUnits="userSpaceOnUse">${s}</pattern>`
}

// ── the moon (or the sun, by day) caught in the water: a disc of pale tiles, shimmering row by row
function glint(cx, cy, r) {
  let s = ''
  for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) {
    const row = []
    const half = r * Math.sqrt(Math.max(0, 1 - (j / (r + 0.6)) ** 2)) * 1.3
    for (let i = -Math.ceil(half); i <= Math.ceil(half); i++) {
      const d = Math.abs(i) / (half + 0.01)
      if (d > 1 || R() < 0.15 + d * 0.5) continue
      row.push({ x: (cx + i) * T, y: (cy + j) * T, c: 'mr', g: pick(['〜', '・', '〜', '']), k: d < 0.4 ? 'm1' : d < 0.75 ? 'm2' : 'm3' })
    }
    if (row.length) s += `<g class="gr" style="animation-delay:${f(-Math.abs(j) * 0.9 - R())}s">${tiles(row)}</g>`
  }
  return s
}

// ── compose, corner by corner
const fishGold = koi({ L: 20, W: 2.9, bend: 0.5, coat: yamabuki, glyphs: GL })
const fishKohaku = koi({ L: 18, W: 2.7, bend: -0.6, coat: kohaku, glyphs: GL })
const fishSmall = koi({ L: 12, W: 1.9, bend: 0.7, coat: ochiba, glyphs: GL })
const fishShade = koi({ L: 9, W: 1.4, bend: -0.5, coat: shade, glyphs: GL, fins: false, eyed: false })

const padTR = pad(3.6, 2.5, [1, -1]), padTR2 = pad(2.3, 0.9), padTL = pad(2.8, -0.6, [-1, 1]), padBR = pad(2.5, 3.6), padBL = pad(1.8, 1.4)
const place = (cells, cx, cy) => tiles(cells.map(t => ({ ...t, x: t.x + cx * T, y: t.y + cy * T })))

const tl = `<g class="tl">
<g class="moonr">${glint(17, 6, 4.2)}</g>
<g class="bob" style="animation-delay:-3s">${place(padTL, 5, 6)}</g>
<g class="bob" style="animation-delay:-9s">${place(pad(1.6, 2.2), 10, 3)}</g>
${swimmer(fishSmall, 'M-180 380 C 80 300 140 120 360 -160', 74, -36, { halo: [110, 50], rest: 45 })}
</g>`

const tr = `<g class="tr">
<g class="bob" style="animation-delay:-6s">${place(padTR, 50, 7)}</g>
<g class="bob" style="animation-delay:-1s">${place(padTR2, 45, 3)}</g>
${ripple(50, 7, [4.6, 6.4, 8.2], 23, 7)}
${swimmer(fishGold, 'M1190 620 C 960 560 820 420 870 170 C 900 20 960 -60 1060 -200', 86, -40, { halo: [170, 70], flick: 11, rest: 42 })}
</g>`

const bl = `<g class="bl">
${place(pebbles(1, 55, 9, 6), 0, 0)}
<g class="bob" style="animation-delay:-4s">${place(padBL, 12, 48)}</g>
${swimmer(fishKohaku, 'M-220 640 C 60 700 260 800 240 1000 C 230 1100 200 1150 160 1240', 80, -30, { halo: [150, 64], rest: 38 })}
</g>`

const br = `<g class="br">
${place(pebbles(55, 55, 11, 5), 0, 0)}
<g class="bob" style="animation-delay:-7s">${place(padBR, 45, 49)}</g>
${swimmer(null, 'M1180 760 C 980 860 860 900 720 1180', 52, -14, { rest: 30 })}
${swimmer(null, 'M1220 820 C 1010 900 900 960 780 1220', 52, -19, { rest: 26 })}
</g>`

// Corner groups stay pinned to the visible box under slice cropping, and shrink on tall or wide boxes.
function anchorCss() {
  const o = { tl: '0 0', tr: '1000px 0', bl: '0 1000px', br: '1000px 1000px' }
  const sign = { tl: [1, 1], tr: [-1, 1], bl: [1, -1], br: [-1, -1] }
  let css = Object.entries(o).map(([k, v]) => `.${k}{transform-origin:${v}}`).join('')
  const rule = (dx, dy, s) => Object.keys(o).map(k => `.${k}{transform:translate(${sign[k][0] * dx}px,${sign[k][1] * dy}px) scale(${s})}`).join('')
  // each band moves art by the crop at the far end of the band, so nothing at the edge is lost
  for (const [r, dy, s] of [['6/5', 143, 0.92], ['7/5', 187, 0.86], ['8/5', 222, 0.8], ['9/5', 250, 0.74], ['2/1', 292, 0.68], ['12/5', 320, 0.62]]) css += `\n@media (min-aspect-ratio:${r}){${rule(0, dy, s)}}`
  for (const [r, dx, s] of [['4/5', 150, 0.9], ['7/10', 200, 0.8], ['3/5', 225, 0.72], ['11/20', 250, 0.68], ['1/2', 275, 0.64], ['9/20', 300, 0.6], ['2/5', 320, 0.56]]) css += `\n@media (max-aspect-ratio:${r}){${rule(dx, 0, s)}}`
  return css
}

const LIGHT = {
  w0: '#b4e3d6', w1: '#8fcfc2', w2: '#5aa8a6', gap: '#3e8e8a', mh: '#ffffff', md: '#2f7f7c', glow: '#ffffff',
  red: '#e4552d', redg: '#ffc0a6', wht: '#f7f2e7', whtg: '#c2b8a4', gld: '#efb43a', gldg: '#a8700f', blk: '#27343a', blkg: '#6a7d80',
  org: '#f08a3a', orgg: '#ffd2a8', shd: '#1f5f63', shdg: '#1f5f63', eye: '#1b2528', eyeg: '#8aa0a2',
  lf1: '#3f8b53', lf2: '#56a262', lfg: '#b6e3ad', pnk: '#f3a3bb', pnkg: '#fff1f5', yel: '#f5cd45', yelg: '#a77d0c',
  pb1: '#d8ceb6', pb2: '#c3b89f', pb3: '#aaa58f', pbg: '#7f7866', cau: '#effff9', caug: '#ffffff', rip: '#f4fffc', ripg: '#3f9a92',
  lamp: '#fff3c4', lampo: 0, shdo: 0.32, mr: '#ffffff', mrg: '#bff0e4', mro: 0.38,
}
const DARK = {
  w0: '#123b3e', w1: '#0b282c', w2: '#051417', gap: '#000000', mh: '#a8e6da', md: '#021012', glow: '#cfe9e2',
  red: '#ff6a3d', redg: '#ffd0b8', wht: '#f1e3c6', whtg: '#a99674', gld: '#ffc257', gldg: '#9a6a12', blk: '#2c2827', blkg: '#7a6a5e',
  org: '#ff9447', orgg: '#ffe0c0', shd: '#000000', shdg: '#000000', eye: '#141010', eyeg: '#7a6a5e',
  lf1: '#1c4935', lf2: '#245a40', lfg: '#6fa883', pnk: '#c77894', pnkg: '#f9dbe5', yel: '#e2b545', yelg: '#7a5a10',
  pb1: '#2a3b3a', pb2: '#32423f', pb3: '#25302f', pbg: '#5f716d', cau: '#9fe6da', caug: '#d9fff6', rip: '#a8efe3', ripg: '#0b282c',
  lamp: '#ffb55c', lampo: 1, shdo: 0.4, mr: '#e9f3d8', mrg: '#8fb6a6', mro: 0.6,
}
const vars = o => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';')
const C = ['mr', 'red', 'wht', 'gld', 'blk', 'org', 'shd', 'eye', 'pnk', 'yel', 'cau', 'rip']
const colorCss = C.map(c => `.${c}{stroke:var(--${c});fill:var(--${c}g)}`).join('') +
  '.lf1{stroke:var(--lf1)}.lf2{stroke:var(--lf2)}.lf1,.lf2{fill:var(--lfg)}' +
  '.pb1{stroke:var(--pb1)}.pb2{stroke:var(--pb2)}.pb3{stroke:var(--pb3)}.pb1,.pb2,.pb3{fill:var(--pbg)}'

const style = `
svg{${vars(LIGHT)}}
@media (prefers-color-scheme:dark){svg{${vars(DARK)}}}
text{font-family:"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic","Noto Sans CJK JP","Apple Symbols",sans-serif;font-size:11px;text-anchor:middle;dominant-baseline:central}
path{fill:none;stroke-width:16;stroke-linecap:square}text{stroke:none}
${colorCss}
.fin{opacity:.78}.shd{opacity:var(--shdo)}.shd text{display:none}
.mh{fill:var(--mh)}.md{fill:var(--md)}
.swim{offset-rotate:auto;animation:swim linear infinite}
@keyframes swim{from{offset-distance:0%}to{offset-distance:100%}}
.sway{animation:sway 7s ease-in-out infinite alternate}
@keyframes sway{from{transform:rotate(-3deg)}to{transform:rotate(3deg)}}
.fa{animation:fa 1.8s steps(1) infinite}.fb{opacity:0;animation:fb 1.8s steps(1) infinite}
@keyframes fa{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes fb{0%,49%{opacity:0}50%,100%{opacity:1}}
.fin.fa,.fin .fa{animation-name:fa2}.fin.fb{animation-name:fb2}
@keyframes fa2{0%,49%{opacity:.78}50%,100%{opacity:0}}
@keyframes fb2{0%,49%{opacity:0}50%,100%{opacity:.78}}
.sh text{animation:sh 2.6s ease-in-out infinite}
.sh text:nth-of-type(2n){animation-delay:-1.3s}.sh text:nth-of-type(3n){animation-delay:-.8s}
@keyframes sh{0%,100%{opacity:1}50%{opacity:.15}}
.flick{animation:flick 26s ease-in-out infinite}
@keyframes flick{0%,90%,100%{transform:rotate(0)}92%{transform:rotate(-24deg)}94.5%{transform:rotate(14deg)}97%{transform:rotate(-4deg)}}
.halo{opacity:var(--lampo)}.moonr{opacity:var(--mro)}.m2{opacity:.6}.m3{opacity:.3}
.gr{animation:gr 6s ease-in-out infinite}
@keyframes gr{0%,100%{opacity:1;transform:translateX(0)}50%{opacity:.55;transform:translateX(4px)}}
.bob{animation:bob 16s ease-in-out infinite alternate}
@keyframes bob{from{transform:translate(0,0)}to{transform:translate(3px,-2px)}}
.cau>g{opacity:0;animation:cau 9s ease-in-out infinite}
.cau{stroke:var(--cau);fill:var(--caug)}
@keyframes cau{0%,100%{opacity:0}45%{opacity:.34}60%{opacity:.08}}
.ring{opacity:0;animation:ring ease-out infinite}
.ring .rip{stroke:var(--rip);fill:var(--ripg)}.ring path{stroke-opacity:.45}
@keyframes ring{0%{opacity:0}2%{opacity:.85}9%{opacity:0}100%{opacity:0}}
.moon{animation:moon 20s ease-in-out infinite}
@keyframes moon{0%,100%{opacity:.75}50%{opacity:1}}
${anchorCss()}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.ring{opacity:0}.cau>g{opacity:.15}.swim{offset-distance:var(--rest)}.fb{opacity:0}}
`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
<style>${style}</style>
<defs>
<linearGradient id="water" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--w0)"/><stop offset=".55" style="stop-color:var(--w1)"/><stop offset="1" style="stop-color:var(--w2)"/></linearGradient>
<radialGradient id="glow" cx=".3" cy=".25" r=".6"><stop offset="0" style="stop-color:var(--glow);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--glow);stop-opacity:0"/></radialGradient>
<radialGradient id="lamp"><stop offset="0" style="stop-color:var(--lamp);stop-opacity:.34"/><stop offset="1" style="stop-color:var(--lamp);stop-opacity:0"/></radialGradient>
<pattern id="grid" width="${T}" height="${T}" patternUnits="userSpaceOnUse" x="-9" y="-9"><rect width="${T}" height="${T}" fill="none" stroke="var(--gap)" stroke-opacity=".16" stroke-width="2"/></pattern>
${shadePattern('m7', 7)}${shadePattern('m5', 5)}
<g id="shade">${tiles(fishShade)}</g>
</defs>
<rect x="-10" y="-10" width="1020" height="1020" fill="url(#water)"/>
<g transform="translate(-9 -9)"><rect width="1020" height="1020" fill="url(#m7)"/><rect width="1020" height="1020" fill="url(#m5)" transform="translate(${2 * T} ${3 * T})"/></g>
<rect x="-10" y="-10" width="1020" height="1020" fill="url(#grid)"/>
<rect class="moon" x="-10" y="-10" width="1020" height="1020" fill="url(#glow)"/>
<g class="cau">${caustics()}</g>
${br}${bl}${tl}${tr}
</svg>`

writeFileSync(join(ROOT, 'hooks/looks/koi-script/scene.js'),
  `// Generated by tools/scenes/koi-script.mjs: a glyph-mosaic koi pond with lily pads, ripples and gliding koi.\nexport const SCENE = ${JSON.stringify(svg)}\n`)
console.log('koi-script', svg.length)
