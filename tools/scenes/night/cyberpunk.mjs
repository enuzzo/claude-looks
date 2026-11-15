import { rng, f, FIT, write , REPO } from './common.mjs'
const r = rng(2077)
const W = 1600, H = 1000
const WIN = ['a', 'a', 'a', 'b', 'c']

// One building: body, an optional rim light, and windows by floor (lit ones as one
// relative path per color, a few blinking).
function building(x, w, h, fill, litP, blinkP, rim) {
  const y = H - h
  let s = `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h + 5)}" fill="${fill}"/>`
  if (rim) s += `<rect x="${f(rim > 0 ? x + w - 2 : x)}" y="${f(y)}" width="2" height="${f(h)}" fill="${rim > 0 ? '#00e5ff' : '#ff2bd6'}" opacity=".35"/>`
  const main = WIN[Math.floor(r() * WIN.length)]
  const gx = 10, gy = 14
  const d = { a: '', b: '', c: '' }, last = {}
  let blink = ''
  for (let yy = y + 16; yy < H - 8; yy += gy) {
    const floor = r() < 0.45 ? litP * 2.2 : litP * 0.3
    for (let xx = x + 6; xx < x + w - 8; xx += gx) {
      if (r() < floor) {
        const c = r() < 0.8 ? main : WIN[Math.floor(r() * WIN.length)]
        const X = Math.round(xx), Y = Math.round(yy)
        if (r() < blinkP) blink += `<rect class="${c}" x="${X}" y="${Y}" width="4" height="5" style="animation-duration:${f(6 + r() * 10)}s;animation-delay:-${f(r() * 14)}s"/>`
        else { d[c] += d[c] ? `m${X - last[c][0]} ${Y - last[c][1]}h4v5h-4z` : `M${X} ${Y}h4v5h-4z`; last[c] = [X, Y] }
      }
    }
  }
  for (const c of 'abc') if (d[c]) s += `<path class="${c}" d="${d[c]}"/>`
  return s + (blink ? `<g class="bl">${blink}</g>` : '')
}

// Vertical sign strip: abstract glyph blocks, no letters.
function sign(x, y, w, h, color, dur) {
  let blocks = ''
  const cell = (w - 10) / 3
  for (let yy = y + 8; yy < y + h - cell * 2.6; yy += cell * 3.2) {
    let any = false
    for (let gy = 0; gy < 2; gy++) for (let gx = 0; gx < 3; gx++) if (r() < 0.55) { any = true; blocks += `<rect x="${f(x + 5 + gx * cell)}" y="${f(yy + gy * cell)}" width="${f(cell - 2)}" height="${f(cell - 2)}"/>` }
    if (!any) blocks += `<rect x="${f(x + 5)}" y="${f(yy)}" width="${f(cell * 3 - 2)}" height="${f(cell - 2)}"/>`
  }
  return `<g class="sg" style="animation-duration:${dur}s;animation-delay:-${f(r() * dur)}s"><rect x="${x - 8}" y="${y - 8}" width="${w + 16}" height="${h + 16}" fill="${color}" opacity=".18" filter="url(#bb)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#02080b" stroke="${color}" stroke-width="2.5" filter="url(#gl)"/><g fill="${color}" filter="url(#gl)">${blocks}</g></g>`
}

// Horizontal screen: a wide panel of glyph blocks.
function board(x, y, w, h, color, dur) {
  let blocks = ''
  for (let yy = y + 8; yy < y + h - 10; yy += 12) for (let xx = x + 8; xx < x + w - 10; xx += 12) if (r() < 0.45) blocks += `M${xx} ${yy}h9v9h-9z`
  return `<g class="sg" style="animation-duration:${dur}s;animation-delay:-${f(r() * dur)}s"><rect x="${x - 14}" y="${y - 14}" width="${w + 28}" height="${h + 28}" fill="${color}" opacity=".2" filter="url(#bb)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#02080b" stroke="${color}" stroke-width="2.5"/><path d="${blocks}" fill="${color}" opacity=".85" filter="url(#gl)"/></g>`
}

function skyline(x0, x1, hmin, hmax, wmin, wmax, fill, litP, blinkP) {
  let s = '', x = x0
  while (x < x1) { const w = wmin + r() * (wmax - wmin); s += building(x, w, hmin + r() * (hmax - hmin), fill, litP, blinkP, 0); x += w - 2 }
  return s
}

// Rain tile, repeated one tile up-right so the loop is seamless.
function rain(n, len, op) {
  let s = ''
  for (let i = 0; i < n; i++) { const x = -300 + r() * (W + 600), y = r() * H; s += `M${f(x)} ${f(y)}l${f(-len / 4)} ${len}` }
  const id = 'rn' + len
  return `<path id="${id}" d="${s}" stroke-opacity="${op}"/><use href="#${id}" transform="translate(250 -1000)"/>`
}

const beam = (x, cls, col) => `<g transform="translate(${x} 1000)"><path class="${cls}" d="M-6 0L-70 -1100L70 -1100L6 0Z" fill="url(#bm${col})"/></g>`
const beams = beam(560, 'sw1', 'c') + beam(1090, 'sw2', 'm')

const back = skyline(-20, W + 20, 120, 330, 50, 110, '#0b2a37', 0.05, 0)
const midL = skyline(-20, 520, 240, 540, 60, 120, '#06161e', 0.09, 0.05)
const midR = skyline(1080, W + 20, 240, 540, 60, 120, '#06161e', 0.09, 0.05)
let frontL = building(-10, 160, 1040, '#02080c', 0.12, 0.05, 1) + building(150, 120, 780, '#030a0f', 0.12, 0.05, 1) + building(270, 80, 440, '#030a0f', 0.14, 0.05, 1)
let frontR = building(1440, 180, 1040, '#02080c', 0.12, 0.05, -1) + building(1320, 124, 810, '#030a0f', 0.12, 0.05, -1) + building(1240, 82, 470, '#030a0f', 0.14, 0.05, -1)
frontL += sign(112, 140, 34, 360, '#00e5ff', 7) + sign(228, 320, 28, 260, '#ff2bd6', 11) + sign(18, 560, 26, 200, '#ffe11a', 9)
frontR += sign(1452, 110, 36, 380, '#ff2bd6', 8) + sign(1334, 300, 28, 280, '#00e5ff', 10) + sign(1566, 580, 26, 220, '#7a5cff', 13)
const boards = `<g class="L">${board(330, 640, 150, 84, '#ff2bd6', 12)}</g><g class="R">${board(1120, 600, 140, 90, '#00e5ff', 15)}</g>`
const beacon = pts => pts.map(([x, y], i) => `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - 50}" stroke="#0a1c24" stroke-width="3"/><circle class="bc" cx="${x}" cy="${y - 50}" r="3.5" style="animation-delay:-${i * 1.3}s"/>`).join('')
const beaconsL = beacon([[210, 220], [310, 560]]), beaconsR = beacon([[1382, 190], [1281, 530]])
const car = (cls, y, dur, delay, col, tr) => `<g class="${cls}" style="animation-duration:${dur}s;animation-delay:-${delay}s"><rect x="-80" y="${y - 1}" width="80" height="2" fill="url(#tr${tr})"/><circle cx="0" cy="${y}" r="3.2" fill="${col}" filter="url(#gl)"/><circle cx="-7" cy="${y + 4}" r="1.5" class="bc"/></g>`
const cars = car('fl', 150, 70, 10, '#00e5ff', 'c') + car('fr', 220, 95, 50, '#ff2bd6', 'm') + car('fl', 310, 120, 80, '#e8fbff', 'c')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<style>
.a{fill:#5fe6ff}.b{fill:#ffcf5a}.c{fill:#ff6be0}
.bl rect{animation:bk 9s steps(1) infinite}
@keyframes bk{0%,100%{opacity:1}40%{opacity:.12}62%{opacity:1}}
.sg{animation:fk 9s linear infinite}
@keyframes fk{0%,45%{opacity:1}46%{opacity:.4}47%{opacity:1}49%{opacity:.6}50%,100%{opacity:1}}
.bc{fill:#ff3b5c;animation:bp 3.2s ease-in-out infinite}
@keyframes bp{0%,100%{opacity:.15}50%{opacity:1}}
.rain{stroke:#a6ecff;stroke-width:1.2;fill:none}
.r1{animation:rn 4s linear infinite}.r2{animation:rn 6.5s linear infinite}
@keyframes rn{from{transform:translate(0,0)}to{transform:translate(-250px,1000px)}}
.fl{animation:fl linear infinite}.fr{animation:fr linear infinite}
@keyframes fl{from{transform:translateX(-120px)}to{transform:translateX(1720px)}}
@keyframes fr{from{transform:translateX(1720px) scaleX(-1)}to{transform:translateX(-120px) scaleX(-1)}}
.sw1{animation:sw 34s ease-in-out infinite}.sw2{animation:sw 41s ease-in-out infinite reverse}
@keyframes sw{0%,100%{transform:rotate(-16deg)}50%{transform:rotate(18deg)}}
.haze{animation:hz 18s ease-in-out infinite}
@keyframes hz{0%,100%{opacity:.7}50%{opacity:1}}
${FIT(0.8)}
@media (prefers-reduced-motion:reduce){.bl rect,.sg,.bc,.r1,.r2,.fl,.fr,.sw1,.sw2,.haze{animation:none}}
</style>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#01050a"/><stop offset=".4" stop-color="#061722"/><stop offset=".72" stop-color="#0f3b4b"/><stop offset="1" stop-color="#1b5566"/></linearGradient>
<radialGradient id="glo" cx=".5" cy="1" r=".75"><stop offset="0" stop-color="#ff2bd6" stop-opacity=".35"/><stop offset=".45" stop-color="#00e5ff" stop-opacity=".12"/><stop offset="1" stop-color="#00e5ff" stop-opacity="0"/></radialGradient>
<linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14495a" stop-opacity="0"/><stop offset="1" stop-color="#14495a" stop-opacity=".55"/></linearGradient>
<linearGradient id="bmc" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#7ff0ff" stop-opacity=".22"/><stop offset="1" stop-color="#7ff0ff" stop-opacity="0"/></linearGradient>
<linearGradient id="bmm" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff7be6" stop-opacity=".2"/><stop offset="1" stop-color="#ff7be6" stop-opacity="0"/></linearGradient>
<linearGradient id="trc"><stop offset="0" stop-color="#00e5ff" stop-opacity="0"/><stop offset="1" stop-color="#00e5ff" stop-opacity=".7"/></linearGradient>
<linearGradient id="trm"><stop offset="0" stop-color="#ff2bd6" stop-opacity="0"/><stop offset="1" stop-color="#ff2bd6" stop-opacity=".7"/></linearGradient>
<filter id="gl" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="bb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
</defs>
<rect x="-400" y="-400" width="2400" height="1800" fill="url(#sky)"/>
<g class="B">${beams}</g>
<rect class="haze" x="-400" y="250" width="2400" height="900" fill="url(#glo)"/>
<g class="T">${cars}</g>
<g class="B">${back}<rect x="-400" y="600" width="2400" height="420" fill="url(#fog)"/></g>
<g class="B"><g class="L">${midL}</g><g class="R">${midR}</g>${boards}<rect x="-400" y="760" width="2400" height="260" fill="url(#fog)" opacity=".7"/></g>
<g class="L">${frontL}${beaconsL}</g>
<g class="R">${frontR}${beaconsR}</g>
<g class="rain"><g class="r2">${rain(150, 26, 0.18)}</g><g class="r1">${rain(100, 46, 0.3)}</g></g>
</svg>`
write(REPO + '/hooks/looks/cyberpunk/scene.js', 'rain-soaked megacity at night, neon sign strips, searchlights, rain and flying lights.', svg)
