import { rng, f, anchorCss, write } from './common.mjs'
const R = rng(1957)
const TQ = '#2fb3a8', CO = '#ef6b47', MU = '#e2a92b', CR = '#fbf1dc', CH = '#2c3436'

const star = (x, y, s, c, dur) =>
  `<g transform="translate(${f(x)} ${f(y)})scale(${s.toFixed(1)})"><use href="#st" fill="${c}" class="tw" style="animation-duration:${f(dur)}s;animation-delay:${f(-R() * dur)}s"/></g>`

function stars() {
  let s = ''
  const spots = []
  while (spots.length < 26) {
    const x = R() * 1000, y = 40 + R() * 900
    const edge = x < 230 || x > 770 || y < 150
    if (!edge) continue
    if (spots.some(([a, b]) => Math.hypot(a - x, b - y) < 70)) continue
    spots.push([x, y])
  }
  for (const [x, y] of spots) s += star(x, y, 6 + R() * 12, [CR, MU, CR, MU, CO][Math.floor(R() * 5)], 4 + R() * 5)
  return s
}

function atom(cx, cy) {
  const rx = 125, ry = 40
  const orbit = `M${rx} 0A${rx} ${ry} 0 1 1 ${-rx} 0A${rx} ${ry} 0 1 1 ${rx} 0`
  let s = `<circle cx="${cx}" cy="${cy}" r="175" fill="${CR}" opacity=".3"/><g transform="translate(${cx} ${cy})"><g class="atom">`
  ;[0, 60, 120].forEach((a, i) => {
    s += `<g transform="rotate(${a})"><path d="${orbit}" fill="none" stroke="${CH}" stroke-width="3.2"/><circle r="9" fill="${[TQ, CO, MU][i]}" stroke="${CH}" stroke-width="2.4" class="el" style="offset-path:path('${orbit}');animation-duration:${6 + i * 1.5}s;animation-delay:${-i * 2}s"/></g>`
  })
  s += `</g>`
  for (const [x, y, c] of [[-9, -6, CO], [8, -8, MU], [0, 8, CO], [10, 7, CR], [-10, 9, MU], [1, -1, CO]]) s += `<circle cx="${x}" cy="${y}" r="11" fill="${c}" stroke="${CH}" stroke-width="2"/>`
  return s + `</g>`
}

function planet(cx, cy) {
  const ring = (front) => `<path d="M-140 0A140 30 0 0 ${front ? 0 : 1} 140 0" fill="none" stroke="${front ? CO : '#c8573a'}" stroke-width="11" stroke-linecap="round"/><path d="M-118 0A118 23 0 0 ${front ? 0 : 1} 118 0" fill="none" stroke="${CR}" stroke-width="4"/>`
  return `<g transform="translate(${cx} ${cy})"><g class="bob"><g transform="rotate(-16)">${ring(false)}<circle r="72" fill="url(#pl)"/><path d="M-70 -12Q0 -2 70 -12M-62 22Q0 32 62 22" stroke="#c98a1c" stroke-width="7" fill="none" opacity=".6"/>${ring(true)}</g></g></g>`
}

const boomerang = (x, y, rot, sc, c, dur) =>
  `<g transform="translate(${x} ${y})rotate(${rot})scale(${sc})"><g class="fl" style="animation-duration:${f(dur)}s;animation-delay:${f(-R() * dur)}s"><path d="M0 0C30-60 90-88 160-78C110-60 70-30 46 12C90 32 130 74 150 120C88 104 30 64 0 0Z" fill="${c}" stroke="${CH}" stroke-width="3" stroke-linejoin="round"/></g></g>`

function sputnik(x, y, sc) {
  let s = `<g transform="translate(${x} ${y})scale(${sc})"><g class="slow">`
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, L = i % 2 ? 46 : 70
    s += `<line x2="${f(Math.cos(a) * L)}" y2="${f(Math.sin(a) * L)}" stroke="${CH}" stroke-width="2.5"/><circle cx="${f(Math.cos(a) * L)}" cy="${f(Math.sin(a) * L)}" r="${i % 2 ? 5 : 7}" fill="${i % 3 ? MU : TQ}" stroke="${CH}" stroke-width="2"/>`
  }
  return s + `<circle r="13" fill="${CO}" stroke="${CH}" stroke-width="2.5"/></g></g>`
}

const blob = (x, y, rot, sc, c, o) =>
  `<path transform="translate(${x} ${y})rotate(${rot})scale(${sc})" d="M-60-10C-60-50 0-55 25-35C45-20 70-40 80-10C92 25 50 45 10 35C-20 28-60 40-60-10Z" fill="${c}" opacity="${o}"/>`

const rocket = `<g class="rk"><g transform="scale(.9)">
<path d="M-62 0C-74-10-84-6-96 0C-84 6-74 10-62 0Z" fill="${MU}" class="fire"/>
<path d="M-40-12L-70-42L-52-42L-14-14Z" fill="${CO}" stroke="${CH}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M-40 12L-70 42L-52 42L-14 14Z" fill="${CO}" stroke="${CH}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M-58-12C-20-20 30-20 60-10C76-5 84 0 84 0C84 0 76 5 60 10C30 20-20 20-58 12Z" fill="${CR}" stroke="${CH}" stroke-width="3"/>
<path d="M60-10C76-5 84 0 84 0C84 0 76 5 60 10C64 3 64-3 60-10Z" fill="${CO}"/>
<circle cx="22" cy="0" r="7" fill="${TQ}" stroke="${CH}" stroke-width="2.5"/>
<path d="M-50 0L10 0" stroke="${CO}" stroke-width="3"/></g></g>`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
<style>
${anchorCss()}
.tw{transform-box:fill-box;transform-origin:center;animation:tw 6s ease-in-out infinite}
@keyframes tw{0%,100%{transform:scale(.45);opacity:.45}50%{transform:scale(1);opacity:1}}
.atom{animation:spin 90s linear infinite}.slow{animation:spin 140s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.el{offset-rotate:0deg;animation:orbit 7s linear infinite}
@keyframes orbit{from{offset-distance:0%}to{offset-distance:100%}}
.bob{animation:bob 12s ease-in-out infinite alternate}
@keyframes bob{from{transform:translateY(-8px)}to{transform:translateY(8px)}}
.fl{animation:fl 11s ease-in-out infinite alternate}
@keyframes fl{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}
.rk{offset-path:path('M-200 300C150 40 850 40 1200 300');offset-rotate:auto;animation:fly 48s linear infinite}
@keyframes fly{0%{offset-distance:0%}100%{offset-distance:100%}}
.fire{transform-box:fill-box;transform-origin:100% 50%;animation:fire .5s ease-in-out infinite alternate}
@keyframes fire{from{transform:scaleX(.7)}to{transform:scaleX(1.15)}}
@media (prefers-reduced-motion:reduce){.tw,.atom,.slow,.el,.bob,.fl,.rk,.fire{animation:none}.el{offset-distance:20%}.rk{offset-distance:30%}}
</style>
<defs>
<path id="st" d="M0-1Q.13-.13 1 0Q.13 .13 0 1Q-.13 .13-1 0Q-.13-.13 0-1Z"/>
<linearGradient id="sky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1000"><stop offset="0" stop-color="#5fa9a6"/><stop offset=".5" stop-color="#93c3b8"/><stop offset="1" stop-color="#d8c79f"/></linearGradient>
<radialGradient id="pl" cx=".38" cy=".35" r=".75"><stop offset="0" stop-color="#f6d27a"/><stop offset="1" stop-color="${MU}"/></radialGradient>
</defs>
<rect x="-2000" y="-1000" width="5000" height="3000" fill="url(#sky)"/>
<g class="bl">${blob(90, 900, -12, 2.6, CR, '.35')}${boomerang(40, 760, -18, 1.05, CO, 12)}${boomerang(210, 880, 24, 0.7, MU, 14)}${sputnik(320, 950, 0.75)}</g>
<g class="br">${blob(900, 880, 160, 2.8, CO, '.28')}${sputnik(850, 800, 1)}${boomerang(980, 930, 190, 0.85, TQ, 13)}${boomerang(700, 960, -40, 0.55, CO, 10)}</g>
<g class="t">${stars()}${rocket}</g>
<g class="tr">${planet(830, 200)}</g>
<g class="tl">${atom(170, 190)}</g>
</svg>`
write('atomic-age', 'Generated scene: googie boomerangs, twinkling starbursts, a turning atom, a ringed planet and a rocket on a slow arc.', svg)
