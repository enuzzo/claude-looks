import { fileURLToPath } from 'node:url'
// Generates scene.js for home-computer, digital-rain and neon-punk.
// Usage: node gen.mjs <repo root>
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = fileURLToPath(new URL('../../..', import.meta.url))

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const r1 = n => Math.round(n * 10) / 10
const r0 = n => Math.round(n)
const r3 = n => Math.round(n * 1000) / 1000

// Anchor groups that follow the visible box of a 1000x1000 viewBox under
// xMidYMid slice. For each aspect range the box is the smallest one in it,
// so pinned content always stays in view. Classes: t b l r tl tr bl br.
const BREAKS = [0.35, 0.42, 0.5, 0.58, 0.66, 0.75, 0.85, 1, 1.15, 1.3, 1.45, 1.6, 1.8, 2.05, 2.4, 2.9, 3.6]
function box(a) {
  if (a >= 1) { const h = 1000 / a; return { x0: 0, x1: 1000, y0: 500 - h / 2, y1: 500 + h / 2, s: Math.min(1.3, Math.max(0.55, h / 700)) } }
  const w = 1000 * a; return { x0: 500 - w / 2, x1: 500 + w / 2, y0: 0, y1: 1000, s: Math.min(1.3, Math.max(0.55, w / 700)) }
}
function rules(bx, extra = '', fixed = false) {
  const { x0, x1, y0, y1 } = bx
  const s = fixed ? 1 : bx.s
  const S = `scale(${r1(s * 100) / 100})`
  const t = (x, y) => `translate(${r1(x)}px,${r1(y)}px) ${S}`
  return `.t{transform:${t(500, y0)} translate(-500px,0)}.b{transform:${t(500, y1)} translate(-500px,0)}` +
    `.l{transform:${t(x0, 500)} translate(0,-500px)}.r{transform:${t(x1, 500)} translate(0,-500px)}` +
    `.tl{transform:${t(x0, y0)}}.tr{transform:${t(x1, y0)}}.bl{transform:${t(x0, y1)}}.br{transform:${t(x1, y1)}}${extra}`
}
function anchorCss(extraFor = () => '', fixed = false) {
  // aspect a ≥ 1: the box shrinks as a grows, so use the range's top end; a < 1: the low end.
  let css = rules(box(BREAKS[0]), extraFor(BREAKS[0]), fixed) + '\n'
  for (let i = 0; i < BREAKS.length - 1; i++) {
    const lo = BREAKS[i], hi = BREAKS[i + 1]
    const a = hi <= 1 ? lo : hi
    css += `@media (min-aspect-ratio:${r0(lo * 1000)}/1000){${rules(box(a), extraFor(a), fixed)}}\n`
  }
  css += `@media (min-aspect-ratio:${r0(BREAKS.at(-1) * 1000)}/1000){${rules(box(5), extraFor(5), fixed)}}\n`
  return css
}
const ANCHOR_BASE = 'g.t,g.b,g.l,g.r,g.tl,g.tr,g.bl,g.br{transform-box:view-box;transform-origin:0 0}'

const svg = (style, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">\n<style>\n${style}</style>\n${body}</svg>`

function out(id, comment, s) {
  writeFileSync(join(ROOT, 'hooks/looks', id, 'scene.js'), `// Generated scene: ${comment}\nexport const SCENE = ${JSON.stringify(s)}\n`)
  console.log(id, s.length)
}

// ---------- home-computer ----------
function pixels(rows, colors, px, ox = 0, oy = 0) {
  let s = ''
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const c = row[x]
      if (c === '.') { x++; continue }
      let n = 1
      while (row[x + n] === c) n++
      s += `<rect x="${ox + x * px}" y="${oy + y * px}" width="${n * px}" height="${px}" fill="${colors[c]}"/>`
      x += n
    }
  })
  return s
}

function homeComputer() {
  const R = rng(64)
  const BORDER = '#7869c4', SCREEN = '#352879', TXT = '#b3aaf6'
  const T = 74, SIDE = 40 // band thickness in anchor units
  const PX = 6
  // Raster bars: each a little vertical gradient, rainbow order.
  const hues = [['#5a1a14', '#e0503c', '#ffb0a0'], ['#5c3208', '#e8902c', '#ffe0a0'], ['#4f4a10', '#e6dc5a', '#fffbd0'],
    ['#14400f', '#5cc84a', '#d0ffc0'], ['#0e3c44', '#52c6d2', '#d0fbff'], ['#3a1448', '#b05ad0', '#f4d0ff']]
  let defs = ''
  hues.forEach(([d, m, l], i) => {
    defs += `<linearGradient id="rb${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${d}"/><stop offset=".35" stop-color="${m}"/><stop offset=".5" stop-color="${l}"/><stop offset=".65" stop-color="${m}"/><stop offset="1" stop-color="${d}"/></linearGradient>`
  })
  const STEP = 30, CYCLE = STEP * hues.length
  const bars = (from, to) => {
    let s = ''
    for (let k = 0, y = from; y < to; k++, y += STEP) s += `<rect x="-2500" y="${y}" width="6000" height="16" fill="url(#rb${k % hues.length})"/>`
    return s
  }
  // top band: local y in [-2000, T]; bars live in [-260, T-10]
  const top = `<rect x="-2500" y="-2000" width="6000" height="${2000 + T}" fill="${BORDER}"/>` +
    `<g clip-path="url(#ctop)"><g class="roll">${bars(-260 - CYCLE, T)}</g></g>`
  const bot = `<rect x="-2500" y="${-T}" width="6000" height="${2000 + T}" fill="${BORDER}"/>` +
    `<g clip-path="url(#cbot)"><g class="roll2">${bars(-T + 10 - CYCLE, 260 + CYCLE)}</g></g>`
  defs += `<clipPath id="ctop"><rect x="-2500" y="-400" width="6000" height="${400 + T - 12}"/></clipPath>`
  defs += `<clipPath id="cbot"><rect x="-2500" y="${-T + 12}" width="6000" height="420"/></clipPath>`

  // Sprites of my own design.
  const C = { W: '#ffffff', L: '#a59cf0', C: '#7fe6ee', R: '#e86a5a', Y: '#f2e07a', G: '#8ce07a', P: '#c070e0', O: '#f0a040', D: '#222255', K: '#6a5ed0' }
  const saucer = ['.....CCCCCC.....', '....CWWCCCCC....', '..LLLLLLLLLLLL..', '.LLYLLYLLYLLYLL.', 'LLLLLLLLLLLLLLLL', '..KKKKKKKKKKKK..', '....Y......Y....']
  const balloon = ['....RRRR....', '..RRYYYYRR..', '.RRYYGGYYRR.', 'RRYYGGGGYYRR', 'RRYYGGGGYYRR', 'RRYYGGGGYYRR', '.RRYYGGYYRR.', '..RRYYYYRR..', '...RRYYRR...', '....W..W....', '....W..W....', '....OOOO....', '....OOOO....']
  const rocket = ['..RR..........', '..RRR.........', 'WWWWWWWWWW....', 'WCCWWCCWWWWW..', 'WWWWWWWWWWWWWW', 'WWWWWWWWWWWW..', 'WWWWWWWWWW....', '..RRR.........', '..RR..........']
  const flame = ['......', '......', '..OO..', 'YOOO..', '.YYOO.', 'YOOO..', '..OO..']
  const sprite = (cls, inner, y, dur, delay, bob) =>
    `<g class="${cls}" style="animation-duration:${dur}s;animation-delay:${delay}s"><g transform="translate(0 ${y})"><g class="bob" style="animation-duration:${bob}s">${inner}</g></g></g>`
  const sprites =
    sprite('fly', pixels(saucer, C, PX), T + 30, 64, -20, 5) +
    sprite('fly', pixels(balloon, C, PX), T + 64, 96, -78, 7) +
    sprite('fly', `<g class="flame">${pixels(flame, C, PX, -6 * PX)}</g>` + pixels(rocket, C, PX), T + 40, 52, -12, 4.5)

  // READY. in a 5x7 pixel face of my own, with a blinking block cursor.
  const F = {
    R: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X.X..', 'X..X.', 'X...X'],
    E: ['XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'XXXXX'],
    A: ['.XXX.', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X'],
    D: ['XXXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'XXXX.'],
    Y: ['X...X', 'X...X', '.X.X.', '..X..', '..X..', '..X..', '..X..'],
    '.': ['.....', '.....', '.....', '.....', '.....', '.XX..', '.XX..'],
  }
  const tp = 4
  let word = ''
  ;[...'READY.'].forEach((ch, i) => { word += pixels(F[ch], { X: TXT }, tp, i * 6 * tp, 0) })
  const ready = `<g transform="translate(${SIDE + 26} ${T + 30})">${word}<rect class="cur" x="0" y="${9 * tp}" width="${5 * tp}" height="${7 * tp}" fill="${TXT}"/></g>`

  // faint scanlines over everything for the CRT
  defs += `<pattern id="scan" width="8" height="6" patternUnits="userSpaceOnUse"><rect width="8" height="2" fill="#000" opacity=".16"/></pattern>`
  defs += `<radialGradient id="vig" gradientUnits="userSpaceOnUse" cx="500" cy="500" r="760"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>`

  const style = `${ANCHOR_BASE}
rect{shape-rendering:crispEdges}
.roll{animation:roll 14s linear infinite}.roll2{animation:roll 17s linear infinite reverse}
@keyframes roll{from{transform:translateY(0)}to{transform:translateY(${CYCLE}px)}}
.fly{animation:fly linear infinite}
@keyframes fly{from{transform:translateX(-700px)}to{transform:translateX(1700px)}}
.bob{animation:bob ease-in-out infinite alternate}
@keyframes bob{from{transform:translateY(-8px)}to{transform:translateY(8px)}}
.flame{animation:fl .5s steps(1) infinite}@keyframes fl{50%{opacity:.35}}
.cur{animation:blink 1.2s steps(1) infinite}@keyframes blink{50%{opacity:0}}
${anchorCss()}@media (prefers-reduced-motion:reduce){.roll,.roll2,.fly,.bob,.flame,.cur{animation:none}}
`
  const body = `<defs>${defs}</defs>
<rect x="-2500" y="-2500" width="6000" height="6000" fill="${SCREEN}"/>
<g class="t">${sprites}</g>
<g class="tl">${ready}</g>
<g class="l"><rect x="-2000" y="-2500" width="${2000 + SIDE}" height="6000" fill="${BORDER}"/></g>
<g class="r"><rect x="${-SIDE}" y="-2500" width="${2000 + SIDE}" height="6000" fill="${BORDER}"/></g>
<g class="t">${top}</g>
<g class="b">${bot}</g>
<rect x="-2500" y="-2500" width="6000" height="6000" fill="url(#scan)"/>
<rect x="-2500" y="-2500" width="6000" height="6000" fill="url(#vig)"/>
`
  out('home-computer', 'an 8-bit boot screen, raster bars rolling in its border, sprites drifting by.', svg(style, body))
}

// ---------- digital-rain ----------
function digitalRain() {
  const R = rng(1999)
  const KANA = [...'ｦｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ']
  const OTHER = [...'0123456789ZXEAK:=+*<>']
  const pick = () => { const set = R() < 0.74 ? KANA : OTHER; return set[Math.floor(R() * set.length)] }
  const FS = 15, GAP = 17
  const LENS = [11, 14, 18, 22, 27]
  const drop = (x, op, far) => {
    const li = Math.floor(R() * LENS.length), n = LENS[li]
    const len = n * FS
    const speed = 34 + R() * 70
    const dist = 1000 + len + 60
    const dur = r1(dist / speed)
    const delay = r1(-R() * dur)
    // the trail steps up in brightness toward the head
    const cut = [0.3, 0.55, 0.75, 1].map(f => Math.round(f * (n - 1)))
    let txt = '', at = 0
    cut.forEach((end, k) => {
      let seg = ''
      for (; at < end; at++) seg += pick()
      if (seg) txt += `<tspan class="c${k}">${seg}</tspan>`
    })
    txt += `<tspan class="h">${pick()}</tspan>`
    return `<text x="${x}" y="${-len - 30}" class="d${far ? ' far' : ''}" style="animation-duration:${dur}s;animation-delay:${delay}s${op < 1 ? `;opacity:${op}` : ''}">${txt}</text>`
  }
  let L = '', Rr = '', M = '', S = ''
  // edge zones: local x 0..330 from the visible edge, density falling off inward
  for (let i = 0; i * GAP < 330; i++) {
    const x = 9 + i * GAP
    const p = 1 - (i * GAP) / 330 * 0.75
    const far = x > 170
    for (const side of [0, 1]) {
      if (R() > p + 0.1) continue
      const drops = p > 0.8 ? 3 : p > 0.5 ? 2 : 1
      for (let k = 0; k < drops; k++) {
        const op = Math.min(1, r1(0.6 + 0.4 * p + R() * 0.2))
        if (side === 0) L += drop(x, op, far); else Rr += drop(-x, op, far)
      }
    }
  }
  // the middle: a few dim drops
  for (let x = 345; x < 660; x += GAP) if (R() < 0.26) M += drop(x, r1(0.18 + R() * 0.14), false)
  // still glyphs, very faint, for texture near the edges
  for (let i = 0; i < 70; i++) {
    const e = R() < 0.5
    const x = r0(Math.pow(R(), 1.6) * 300) * 1
    const y = r0(R() * 1000)
    S += `<text x="${e ? x : -x}" y="${y}" class="${e ? 'sl' : 'sr'}">${pick()}</text>`
  }
  let SL = '', SR = ''
  S.replace(/<text[^>]*class="(sl|sr)"[^>]*>.<\/text>/g, m => { if (m.includes('"sl"')) SL += m.replace(' class="sl"', ''); else SR += m.replace(' class="sr"', ''); return '' })
  const defs = ''+
    `<radialGradient id="dim" gradientUnits="userSpaceOnUse" cx="500" cy="470" r="330"><stop offset="0" stop-color="#020604" stop-opacity=".7"/><stop offset="1" stop-color="#020604" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#030a05"/><stop offset="1" stop-color="#010402"/></linearGradient>`
  const style = `${ANCHOR_BASE}
text{font-family:ui-monospace,monospace;font-size:${FS}px;writing-mode:vertical-lr;text-orientation:upright}
.d{animation:fall linear infinite}.c0{fill:#0d4a1f}.c1{fill:#127a32}.c2{fill:#1fb04a}.c3{fill:#3ae872}.h{fill:#e6ffea}
@keyframes fall{from{transform:translateY(0)}to{transform:translateY(1500px)}}
.st text{fill:#1d6b33;opacity:.35}
${anchorCss(a => (a < 0.75 ? '.far{display:none}' : '.far{display:inline}'), true)}@media (prefers-reduced-motion:reduce){.d{animation:none;transform:translateY(${600}px)}}
`
  // fall distance per drop is baked into duration; one keyframe of 1500px covers the longest drop
  const body = `<defs>${defs}</defs>
<rect x="-2500" y="-2500" width="6000" height="6000" fill="url(#bg)"/>
<g class="l st">${SL}</g><g class="r st">${SR}</g>
<g>${M}</g>
<g class="l">${L}</g>
<g class="r">${Rr}</g>
`
  out('digital-rain', 'green-phosphor glyphs falling, thick at the edges, thin in the middle.', svg(style, body))
}

// ---------- neon-punk ----------
function neonPunk() {
  const R = rng(1977)
  // brick tile: 4 bricks wide, 4 rows, offset every other row
  const BW = 62, BH = 26, M = 4, COLS = 4, ROWS = 4
  const shades = ['#221920', '#271b21', '#1f171e', '#2b1f23', '#241a20', '#1c151b', '#281d24', '#2e2024']
  let tile = `<rect width="${BW * COLS}" height="${BH * ROWS}" fill="#110c11"/>`
  for (let row = 0; row < ROWS; row++) {
    const off = row % 2 ? BW / 2 : 0
    for (let c = -1; c < COLS; c++) {
      const x = c * BW + off + M / 2
      if (x + BW < 0) continue
      const fill = shades[Math.floor(R() * shades.length)]
      tile += `<rect x="${x}" y="${row * BH + M / 2}" width="${BW - M}" height="${BH - M}" rx="2" fill="${fill}"/>`
      if (R() < 0.35) tile += `<rect x="${x + 6 + R() * 30}" y="${row * BH + M / 2 + 3}" width="${r0(8 + R() * 16)}" height="3" fill="#3a2b31" opacity=".5"/>`
    }
  }
  let defs = `<pattern id="brick" width="${BW * COLS}" height="${BH * ROWS}" patternUnits="userSpaceOnUse">${tile}</pattern>`
  defs += `<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>`
  defs += `<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>`
  defs += `<radialGradient id="vig" gradientUnits="userSpaceOnUse" cx="500" cy="500" r="720"><stop offset=".35" stop-color="#07050a" stop-opacity=".2"/><stop offset="1" stop-color="#07050a" stop-opacity=".82"/></radialGradient>`
  defs += `<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07050a" stop-opacity="0"/><stop offset="1" stop-color="#07050a" stop-opacity=".7"/></linearGradient>`
  const spillG = (id, c) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity=".34"/><stop offset=".5" stop-color="${c}" stop-opacity=".1"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`
  const ACID = '#c8ff2e', MAG = '#ff2fd0', BLUE = '#2fb4ff'
  defs += spillG('sa', ACID) + spillG('sm', MAG) + spillG('sb', BLUE)
  // grime stains
  let grime = ''
  for (let i = 0; i < 26; i++) {
    const x = r0(R() * 1400 - 200), y = r0(R() * 1400 - 200), rx = r0(40 + R() * 160), ry = r0(30 + R() * 120)
    grime += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${R() < 0.8 ? '#050305' : '#3a2a2a'}" opacity="${r1(0.25 + R() * 0.35)}"/>`
  }
  for (let i = 0; i < 9; i++) {
    const x = r0(R() * 1200 - 100), y = r0(R() * 600 - 100)
    grime += `<rect x="${x}" y="${y}" width="${r0(14 + R() * 30)}" height="${r0(250 + R() * 400)}" fill="#050305" opacity="${r1(0.3 + R() * 0.3)}"/>`
  }
  defs += `<filter id="grime" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="30"/></filter>`

  const tube = (d, c, core, cls, dur, delay, spill, sx, sy, sr) =>
    `<g class="${cls}" style="animation-duration:${dur}s;animation-delay:${delay}s">` +
    `<circle cx="${sx}" cy="${sy}" r="${sr}" fill="url(#${spill})"/>` +
    `<path d="${d}" stroke="${c}" stroke-width="26" opacity=".75" filter="url(#glow)"/>` +
    `<path d="${d}" stroke="${c}" stroke-width="10" filter="url(#soft)" opacity=".9"/>` +
    `<path d="${d}" stroke="${c}" stroke-width="7"/>` +
    `<path d="${d}" stroke="${core}" stroke-width="2.6"/></g>`
  const bracket = pts => pts.map(([x, y]) => `<rect x="${x - 4}" y="${y - 3}" width="8" height="6" fill="#5a4a52"/>`).join('')

  // top-left: zigzag bolt, and a blue arrow below it pointing right
  const bolt = 'M150 70 L102 160 L148 160 L96 262 L196 138 L150 138 L196 70 Z'
  const arrow = 'M70 352 L210 352 M176 318 L214 352 L176 386'
  const tl = tube(bolt, ACID, '#f4ffd0', 'fa', 9, -2, 'sa', 150, 165, 190) + bracket([[150, 70], [96, 262]]) +
    tube(arrow, BLUE, '#d8f2ff', 'fb', 13, -6, 'sb', 140, 352, 150) + bracket([[70, 352], [214, 352]])
  // top-right: magenta ring and a blue star
  const ring = 'M-150 175 m-82 0 a82 82 0 1 0 164 0 a82 82 0 1 0 -164 0'
  const star = (() => {
    let p = ''
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 22 : 54
      p += `${i ? 'L' : 'M'}${r1(-320 + rr * Math.cos(a))} ${r1(330 + rr * Math.sin(a))} `
    }
    return p + 'Z'
  })()
  const tr = tube(ring, MAG, '#ffd8f6', 'fc', 11, -4, 'sm', -150, 175, 220) + bracket([[-150, 93], [-150, 257]]) +
    tube(star, BLUE, '#d8f2ff', 'fa', 15, -9, 'sb', -320, 330, 130)
  // paint drips: a smear with runs hanging off it
  // a spray-paint swipe with runs hanging off it, one drop sliding down
  const drips = (x, y, w, c) => {
    // the swipe: a brush stroke, thick in the middle and frayed at both ends
    const top = [], bot = []
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, px = x + w * t, body = Math.sin(t * Math.PI) ** 0.6
      top.push(`${r1(px)} ${r1(y - body * 11 + (R() - 0.5) * 3 - t * 8)}`)
      bot.push(`${r1(px)} ${r1(y + body * 11 + (R() - 0.5) * 3 - t * 8)}`)
    }
    let s = `<path d="M${top.join(' L')} L${bot.reverse().join(' L')} Z"/>`
    // spray speckle around the stroke
    for (let i = 0; i < 26; i++) {
      const t = R(), px = x + w * t, py = y - t * 8 + (R() - 0.5) * 46
      s += `<circle cx="${r1(px)}" cy="${r1(py)}" r="${r1(0.6 + R() * 1.4)}" opacity="${r1(0.3 + R() * 0.5)}"/>`
    }
    // runs: tapered, each ending in a heavier bead
    const n = 4
    for (let i = 0; i < n; i++) {
      const t = (i + 0.3 + R() * 0.5) / n, dx = x + w * t, y0 = y - t * 8 + 6
      const ww = 3 + R() * 4, len = r0(22 + Math.pow(R(), 1.4) * 120), y1 = y0 + len
      s += `<path d="M${r1(dx - ww / 2)} ${r1(y0)} C${r1(dx - ww / 2)} ${r1(y0 + len * 0.5)} ${r1(dx - ww * 0.22)} ${r1(y0 + len * 0.8)} ${r1(dx - ww * 0.22)} ${r1(y1)} L${r1(dx + ww * 0.22)} ${r1(y1)} C${r1(dx + ww * 0.22)} ${r1(y0 + len * 0.8)} ${r1(dx + ww / 2)} ${r1(y0 + len * 0.5)} ${r1(dx + ww / 2)} ${r1(y0)} Z"/>`
      s += `<ellipse cx="${r1(dx)}" cy="${r1(y1 + ww * 0.25)}" rx="${r1(ww * 0.42)}" ry="${r1(ww * 0.6)}"/>`
      if (i === 1 || i === 2) s += `<circle class="dr" cx="${r1(dx)}" cy="${r1(y1 + ww * 0.5)}" r="${r1(ww * 0.38)}" style="animation-delay:-${r1(R() * 9)}s"/>`
    }
    return `<g fill="${c}" opacity=".6">${s}</g>`
  }
  const tl2 = drips(250, 300, 140, '#9cc426')
  const tr2 = drips(-250, 300, 170, '#c02aa8')
  // bottom corners: low wire and a dim blue zigzag pulse line
  const br = tube('M-70 -150 L-170 -150 L-120 -236 Z', MAG, '#ffd8f6', 'fb', 17, -3, 'sm', -120, -180, 140) + bracket([[-120, -150]])
  const bl = tube('M40 -170 l30 -30 l30 30 l30 -30 l30 30 l30 -30 l30 30', ACID, '#f4ffd0', 'fc', 19, -11, 'sa', 130, -185, 150)

  const style = `${ANCHOR_BASE}
.fa path,.fb path,.fc path{fill:none;stroke-linecap:round;stroke-linejoin:round}
.fa,.fb,.fc{animation:flick linear infinite}
@keyframes flick{0%,86%,100%{opacity:1}87%{opacity:.35}88%{opacity:.95}89.5%{opacity:.2}91%{opacity:1}95%{opacity:.85}96%{opacity:1}}
.fb{animation-name:flick2}@keyframes flick2{0%,70%,100%{opacity:.95}71%{opacity:.4}72%{opacity:1}}
.fc{animation-name:hum}@keyframes hum{0%,100%{opacity:1}50%{opacity:.86}93%{opacity:.92}94%{opacity:.3}95%{opacity:1}}
.dr{animation:drip 9s ease-in infinite}@keyframes drip{0%,55%{transform:translateY(0);opacity:1}100%{transform:translateY(90px);opacity:0}}
${anchorCss()}@media (prefers-reduced-motion:reduce){.fa,.fb,.fc,.dr{animation:none}}
`
  const body = `<defs>${defs}</defs>
<rect x="-2500" y="-2500" width="6000" height="6000" fill="url(#brick)"/>
<g filter="url(#grime)">${grime}</g>
<g class="tl">${tl2}</g><g class="tr">${tr2}</g>
<g class="tl">${tl}</g>
<g class="tr">${tr}</g>
<g class="bl">${bl}</g>
<g class="br">${br}</g>
<rect x="-2500" y="-2500" width="6000" height="6000" fill="url(#vig)"/>
`
  // neon-punk is made by tools/scenes/neon-punk.mjs now
  if (false) out('neon-punk', 'neon tubes flickering on a grimy brick wall, paint running down it.', svg(style, body))
}

homeComputer()
digitalRain()
neonPunk()
