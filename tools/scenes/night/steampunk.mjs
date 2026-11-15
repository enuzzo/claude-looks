import { rng, f, FIT, tall, write , REPO } from './common.mjs'
const r = rng(1851)
const W = 1600, H = 1000
const M = 8 // gear module: pitch radius = M * N / 2, so meshing gears share tooth size
const K = 2.2 // seconds per tooth for one turn: speeds stay in ratio, so teeth keep meshing
const P = Math.PI

// A gear outline centered on 0,0 with spoke windows and an axle hole (even-odd holes).
function gearPath(N, spokes) {
  const R = (M * N) / 2, rt = R + M, rr = R - 1.25 * M, p = (2 * P) / N
  const pt = (rad, a) => `${f(rad * Math.cos(a))} ${f(rad * Math.sin(a))}`
  let d = `M${pt(rr, -p * 0.3)}`
  for (let k = 0; k < N; k++) {
    const a = k * p
    d += `L${pt(rr, a - p * 0.27)}L${pt(rt, a - p * 0.14)}L${pt(rt, a + p * 0.14)}L${pt(rr, a + p * 0.27)}A${f(rr)} ${f(rr)} 0 0 1 ${pt(rr, a + p * 0.73)}`
  }
  d += 'Z'
  const rin = rr - M * 1.6, rhub = Math.max(M * 2.2, R * 0.28)
  if (spokes && rin - rhub > M * 1.5) {
    const sw = Math.max(M * 0.9, R * 0.09) // spoke half-width
    const q = (2 * P) / spokes
    for (let s = 0; s < spokes; s++) {
      const a0 = s * q + Math.asin(sw / rin), a1 = (s + 1) * q - Math.asin(sw / rin)
      const b0 = s * q + Math.asin(Math.min(0.95, sw / rhub)), b1 = (s + 1) * q - Math.asin(Math.min(0.95, sw / rhub))
      d += `M${pt(rin, a0)}A${f(rin)} ${f(rin)} 0 0 1 ${pt(rin, a1)}L${pt(rhub + M * 0.6, b1)}A${f(rhub + M * 0.6)} ${f(rhub + M * 0.6)} 0 0 0 ${pt(rhub + M * 0.6, b0)}Z`
    }
  }
  const ah = Math.max(M * 0.9, R * 0.08)
  d += `M${ah} 0A${f(ah)} ${f(ah)} 0 1 0 ${-ah} 0A${f(ah)} ${f(ah)} 0 1 0 ${ah} 0Z`
  return { d, R, rr, rhub, rin }
}

// A gear placed at x,y with a phase (deg) and a turning direction.
const gears = []
function gear(N, x, y, phase, dir, metal, spokes) {
  const g = { N, x, y, phase, dir, metal, spokes, R: (M * N) / 2 }
  gears.push(g)
  return g
}
// Place gear b meshing with a, at angle th (deg) from a's center.
function mesh(a, N, th, metal, spokes) {
  const R = (M * N) / 2, t = (th * P) / 180
  const p1 = 360 / a.N, p2 = 360 / N
  const delta = ((((th - a.phase) % p1) + p1) % p1)
  const phase = th + 180 - delta * (a.R / R) + p2 / 2
  return gear(N, a.x + (a.R + R) * Math.cos(t), a.y + (a.R + R) * Math.sin(t), phase, -a.dir, metal, spokes)
}
function drawGear(g, cls) {
  const { d, rhub, rin } = gearPath(g.N, g.spokes)
  const dur = f(K * g.N)
  return `<g transform="translate(${f(g.x)} ${f(g.y)}) rotate(${f(g.phase)})"><g class="${g.dir > 0 ? 'cw' : 'ccw'}" style="animation-duration:${dur}s"><path d="${d}" fill="url(#${g.metal})" stroke="#3a2412" stroke-width="2" fill-rule="evenodd"/>${g.spokes ? `<circle r="${f(rin + 3)}" fill="none" stroke="#fff3c8" stroke-opacity=".25" stroke-width="2"/>` : ''}<circle r="${f(rhub * 0.75)}" fill="none" stroke="#3a2412" stroke-opacity=".5" stroke-width="3"/>${[0, 1, 2, 3, 4, 5].map(i => `<circle cx="${f(rhub * 0.55 * Math.cos(i * P / 3))}" cy="${f(rhub * 0.55 * Math.sin(i * P / 3))}" r="2.2" fill="#3a2412" opacity=".6"/>`).join('')}</g></g>`
}

// Top-left cluster
const a1 = gear(34, 70, 60, 0, 1, 'brass', 6)
const a2 = mesh(a1, 14, 52, 'copper', 4)
const a3 = mesh(a2, 22, 8, 'brass', 5)
const a4 = mesh(a1, 12, 95, 'steel', 0)
// Bottom-right cluster
const b1 = gear(40, 1560, 960, 3, -1, 'copper', 6)
const b2 = mesh(b1, 16, 200, 'brass', 4)
const b3 = mesh(b2, 24, 240, 'brass', 5)
const b4 = mesh(b1, 13, 262, 'steel', 0)
// Top-right small cluster
const c1 = gear(22, 1550, 40, 7, 1, 'brass', 5)
const c2 = mesh(c1, 12, 150, 'copper', 0)

const tl = [a1, a2, a3, a4].map(drawGear).join('')
const br = [b1, b2, b3, b4].map(drawGear).join('')
const tr = [c1, c2].map(drawGear).join('')

const vent = (x, y) => `<rect x="${x - 12}" y="${y}" width="24" height="16" fill="url(#brass)" stroke="#3a2412" stroke-width="2"/>`
// Pipes: a run up the left edge and along the bottom-left, flanges with rivets.
const pipe = (d, w) => `<path d="${d}" fill="none" stroke="#3a2412" stroke-width="${w + 4}" stroke-linecap="butt"/><path d="${d}" fill="none" stroke="url(#pipeV)" stroke-width="${w}"/><path d="${d}" fill="none" stroke="#ffd9a0" stroke-opacity=".35" stroke-width="${f(w * 0.18)}" transform="translate(-${f(w * 0.2)} -${f(w * 0.2)})"/>`
function flange(x, y, vertical) {
  const w = vertical ? 46 : 14, h = vertical ? 14 : 46
  let s = `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="2" fill="url(#brass)" stroke="#3a2412" stroke-width="2"/>`
  for (const o of [-15, 0, 15]) s += `<circle cx="${vertical ? x + o : x}" cy="${vertical ? y : y + o}" r="2.2" fill="#3a2412"/>`
  return s
}
const pipesL = pipe('M48 1100L48 520Q48 470 98 470L170 470', 30) + pipe('M-20 930L380 930Q430 930 430 880L430 840', 26) +
  flange(48, 760, true) + flange(48, 600, true) + flange(150, 470, false) + flange(250, 930, false) + flange(430, 860, true)
const pipesR = pipe('M1620 560L1540 560Q1505 560 1505 525L1505 440', 24) + flange(1505, 480, true) + flange(1570, 560, false) + vent(1505, 424)

// Valve wheel on the bottom pipe
const wheel = `<g transform="translate(330 930)"><g class="vw"><circle r="24" fill="none" stroke="url(#copper)" stroke-width="6"/>${[0, 1, 2, 3].map(i => `<line x1="0" y1="0" x2="${f(24 * Math.cos(i * P / 2))}" y2="${f(24 * Math.sin(i * P / 2))}" stroke="url(#copper)" stroke-width="4"/>`).join('')}<circle r="5" fill="#3a2412"/></g></g>`

// Pressure gauge on the left pipe: ticks, a red zone, a twitching needle.
let ticks = ''
for (let i = 0; i <= 20; i++) { const a = ((-225 + i * 13.5) * P) / 180, r0 = i % 5 ? 40 : 35; ticks += `M${f(r0 * Math.cos(a))} ${f(r0 * Math.sin(a))}L${f(46 * Math.cos(a))} ${f(46 * Math.sin(a))}` }
const ra0 = (-225 + 16 * 13.5) * P / 180, ra1 = (45 * P) / 180
const gauge = `<g transform="translate(118 650)"><line x1="-70" y1="0" x2="-30" y2="0" stroke="url(#pipeV)" stroke-width="14"/><circle r="62" fill="url(#brass)" stroke="#3a2412" stroke-width="3"/><circle r="54" fill="#efe2c2" stroke="#6b4a26" stroke-width="2"/><path d="M${f(44 * Math.cos(ra0))} ${f(44 * Math.sin(ra0))}A44 44 0 0 1 ${f(44 * Math.cos(ra1))} ${f(44 * Math.sin(ra1))}" fill="none" stroke="#a3292f" stroke-width="6"/><path d="${ticks}" stroke="#2a1b0e" stroke-width="2"/><g class="needle"><path d="M-3 6L0 -44L3 6Z" fill="#2a1b0e"/></g><circle r="6" fill="url(#copper)" stroke="#3a2412"/><circle r="56" fill="url(#shine)"/></g>`

// Steam puffs rising from a vent and fading.
function steam(x, y, n, dur, spread) {
  let s = `<g transform="translate(${x} ${y})">`
  for (let i = 0; i < n; i++) s += `<circle class="puff" cx="${f((r() - 0.5) * spread)}" cy="0" r="${f(18 + r() * 16)}" style="animation-duration:${dur}s;animation-delay:-${f((i * dur) / n)}s"/>`
  return s + '</g>'
}
const vent0 = (x, y) => `<rect x="${x - 12}" y="${y}" width="24" height="16" fill="url(#brass)" stroke="#3a2412" stroke-width="2"/>`
const steamL = vent(430, 828) + steam(430, 820, 7, 11, 24)
const steamR = steam(1505, 418, 6, 13, 20)
const steamT = steam(170, 470, 5, 12, 10)

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<style>
.cw{animation:cw linear infinite}.ccw{animation:ccw linear infinite}
@keyframes cw{to{transform:rotate(360deg)}}@keyframes ccw{to{transform:rotate(-360deg)}}
.puff{fill:#fffaf0;opacity:0;filter:url(#soft);transform-box:fill-box;transform-origin:50% 50%;animation:puff linear infinite}
@keyframes puff{0%{opacity:0;transform:translate(0,0) scale(.4)}15%{opacity:.6}100%{opacity:0;transform:translate(30px,-300px) scale(2.4)}}
.needle{animation:tw 8s ease-in-out infinite}
@keyframes tw{0%,100%{transform:rotate(40deg)}18%{transform:rotate(46deg)}21%{transform:rotate(42deg)}45%{transform:rotate(52deg)}48%{transform:rotate(49deg)}70%{transform:rotate(44deg)}73%{transform:rotate(47deg)}}
.vw{animation:vw 14s ease-in-out infinite}
@keyframes vw{0%,100%{transform:rotate(0)}50%{transform:rotate(25deg)}}
${FIT()}
${tall([['R2', -1]], 0.75)}
@media (prefers-reduced-motion:reduce){.cw,.ccw,.puff,.needle,.vw{animation:none}.puff{opacity:.25}}
</style>
<defs>
<radialGradient id="bg" cx=".5" cy=".45" r=".75"><stop offset="0" stop-color="#8c6a45"/><stop offset=".6" stop-color="#6e4f32"/><stop offset="1" stop-color="#4a3220"/></radialGradient>
<linearGradient id="brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0cf7a"/><stop offset=".45" stop-color="#c49a45"/><stop offset="1" stop-color="#8a6326"/></linearGradient>
<linearGradient id="copper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2a476"/><stop offset=".5" stop-color="#c06a3a"/><stop offset="1" stop-color="#7f3f1e"/></linearGradient>
<linearGradient id="steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d6cfc0"/><stop offset=".5" stop-color="#9a9283"/><stop offset="1" stop-color="#5f5849"/></linearGradient>
<linearGradient id="pipeV" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e09a68"/><stop offset=".5" stop-color="#b0612f"/><stop offset="1" stop-color="#7a3d1c"/></linearGradient>
<radialGradient id="shine" cx=".35" cy=".3" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></radialGradient>
<pattern id="plate" width="200" height="140" patternUnits="userSpaceOnUse"><path d="M0 .5H200M.5 0V140" stroke="#2e1d10" stroke-opacity=".35" stroke-width="2"/><path d="M1.5 2H200M2 1.5V140" stroke="#f3d9a8" stroke-opacity=".12"/><g fill="#2e1d10" fill-opacity=".35"><circle cx="12" cy="12" r="3"/><circle cx="188" cy="12" r="3"/><circle cx="12" cy="128" r="3"/><circle cx="188" cy="128" r="3"/><circle cx="100" cy="12" r="3"/><circle cx="100" cy="128" r="3"/></g></pattern>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
<filter id="drop" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="4" dy="6" stdDeviation="5" flood-color="#1e1208" flood-opacity=".45"/></filter>
</defs>
<rect x="-400" y="-400" width="2400" height="1800" fill="url(#bg)"/>
<rect x="-400" y="-400" width="2400" height="1800" fill="url(#plate)"/>
<g class="L"><g filter="url(#drop)">${pipesL}${wheel}${gauge}</g>${steamL}${steamT}</g>
<g class="R"><g filter="url(#drop)">${pipesR}</g>${steamR}</g>
<g class="T"><g class="L" filter="url(#drop)">${tl}</g><g class="R" filter="url(#drop)">${tr}</g></g>
<g class="B"><g class="R2" filter="url(#drop)">${br}</g></g>
</svg>`
write(REPO + '/hooks/looks/steampunk/scene.js', 'brass workshop, meshing gears, copper pipes, steam and a pressure gauge.', svg)
