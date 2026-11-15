import { rng, f, anchorCss, write } from './common.mjs'
const R = rng(1499)
const SAND = '#cbc2ad', SH = '#ada38c', HI = '#e4dccb'

// A maple leaf: five lobes, stem down, radius about 10.
function mapleLeaf() {
  const lobes = [[-90, 1], [-35, 0.85], [-145, 0.85], [15, 0.5], [165, 0.5]]
  const pts = []
  for (let d = -180; d < 180; d += 7.5) {
    let r = 0.28
    for (const [a, h] of lobes) {
      let dd = Math.abs(((d - a + 540) % 360) - 180)
      r = Math.max(r, h * Math.exp(-(dd * dd) / (2 * 15 * 15)) + 0.25 * Math.exp(-(dd * dd) / 1800))
    }
    if (d % 15 !== 0) r *= 0.9 // serration
    const t = (d * Math.PI) / 180
    pts.push([Math.cos(t) * r * 10, Math.sin(t) * r * 10])
  }
  return 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z'
}

function stone(cx, cy, r, ringR, phase) {
  let s = `<circle cx="${cx}" cy="${cy}" r="${ringR}" fill="${SAND}"/>`
  let k = 0
  for (let rr = r + 16; rr <= ringR - 4; rr += 15, k++) {
    s += `<circle cx="${cx}" cy="${cy + 1.5}" r="${rr}" fill="none" stroke="${SH}" stroke-width="2.6"/>`
    s += `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="${HI}" stroke-width="1.6" class="sh" style="animation-delay:${f(-(phase + k * 0.9))}s"/>`
  }
  // the stone: an irregular rounded blob
  const n = 14, pts = []
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2
    const rad = r * (0.86 + R() * 0.22)
    pts.push([cx + Math.cos(t) * rad * 1.12, cy + Math.sin(t) * rad * 0.82])
  }
  let d = ''
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n]
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2
    d += (i ? '' : `M${f((pts[n - 1][0] + x0) / 2)} ${f((pts[n - 1][1] + y0) / 2)}`) + `Q${f(x0)} ${f(y0)} ${f(mx)} ${f(my)}`
  }
  s += `<ellipse cx="${cx + r * 0.12}" cy="${cy + r * 0.55}" rx="${r * 1.15}" ry="${r * 0.45}" fill="#7d7464" opacity=".45"/>`
  s += `<path d="${d}Z" fill="url(#stone)"/>`
  s += `<path d="${d}Z" fill="url(#moss)"/>`
  return s
}

function branch() {
  let s = `<g class="br0"><path d="M-80 40C40 70 140 60 250 105S390 150 430 132" fill="none" stroke="#3a2c27" stroke-width="11" stroke-linecap="round"/>`
  s += `<path d="M120 66C150 110 170 130 212 160M250 105C260 70 300 50 330 44M330 128C350 170 352 190 372 214M60 58C80 30 90 20 120 6" fill="none" stroke="#3a2c27" stroke-width="5" stroke-linecap="round"/>`
  const RED = ['#b3352a', '#c44a2c', '#9b2b23', '#cf6230', '#a83e2a']
  const tips = [[212, 160, 9], [330, 44, 8], [372, 214, 9], [120, 6, 7], [430, 132, 9], [175, 85, 5], [280, 120, 5]]
  for (const [x, y, n] of tips) {
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, dist = 8 + R() * 30
      s += `<use href="#ml" fill="${RED[Math.floor(R() * RED.length)]}" transform="translate(${Math.round(x + Math.cos(a) * dist)} ${Math.round(y + Math.sin(a) * dist * 0.8)})rotate(${Math.round(R() * 80 - 40 + 180 * (R() < 0.3))})scale(${(1.4 + R() * 0.9).toFixed(1)})"/>`
    }
  }
  return s + `</g>`
}

function falling() {
  let s = ''
  const starts = [[150, 120], [240, 160], [340, 110], [90, 70], [300, 220]]
  starts.forEach(([x, y], i) => {
    const dur = 26 + i * 4.5 + R() * 3
    const del = -(i * dur) / starts.length
    const sway = 7 + R() * 3
    s += `<g transform="translate(${x} ${y})"><g class="fall" style="animation-duration:${f(dur)}s;animation-delay:${f(del)}s"><g class="sway" style="animation-duration:${f(sway)}s;animation-delay:${f(-R() * sway)}s"><use href="#ml" fill="${['#c44a2c', '#b3352a', '#cf6230'][i % 3]}" transform="scale(1.7)"/></g></g></g>`
  })
  return s
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
<style>
${anchorCss()}
.sh{animation:sh 9s ease-in-out infinite}
@keyframes sh{0%,100%{opacity:.55}50%{opacity:1}}
.br0{animation:bw 14s ease-in-out infinite alternate}
@keyframes bw{from{transform:rotate(-.6deg)}to{transform:rotate(.8deg)}}
.fall{opacity:0;animation:fall 30s linear infinite}
@keyframes fall{0%{transform:translate(0,0);opacity:0}8%{opacity:1}85%{opacity:.9}100%{transform:translate(90px,760px);opacity:0}}
.sway{animation:sway 8s ease-in-out infinite alternate}
@keyframes sway{from{transform:translateX(-26px) rotate(-50deg)}to{transform:translateX(26px) rotate(60deg)}}
@media (prefers-reduced-motion:reduce){.sh,.br0,.sway{animation:none}.fall{animation:none;opacity:0}}
</style>
<defs>
<path id="ml" d="${mapleLeaf()}"/>
<pattern id="rake" patternUnits="userSpaceOnUse" width="200" height="15"><rect width="200" height="15" fill="${SAND}"/><path d="M0 8Q50 6.5 100 8T200 8" fill="none" stroke="${SH}" stroke-width="2.6"/><path d="M0 6.5Q50 5 100 6.5T200 6.5" fill="none" stroke="${HI}" stroke-width="1.6"/></pattern>
<radialGradient id="stone" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#8d877c"/><stop offset=".7" stop-color="#5f5a52"/><stop offset="1" stop-color="#4a463f"/></radialGradient>
<radialGradient id="moss" cx=".42" cy=".12" r=".55"><stop offset="0" stop-color="#6f8a3a" stop-opacity=".95"/><stop offset=".6" stop-color="#6f8a3a" stop-opacity=".7"/><stop offset="1" stop-color="#6f8a3a" stop-opacity="0"/></radialGradient>
</defs>
<rect x="-2000" y="-1000" width="5000" height="3000" fill="url(#rake)"/>
<g class="bl">${stone(110, 880, 62, 200, 0)}${stone(300, 975, 34, 110, 3)}</g>
<g class="br">${stone(880, 860, 74, 225, 1.5)}</g>
<g class="tr">${stone(935, 300, 30, 105, 4.5)}</g>
<g class="tl">${branch()}${falling()}</g>
</svg>`
write('zen-garden', 'Generated scene: raked sand around mossy stones, a maple branch with leaves drifting down.', svg)
