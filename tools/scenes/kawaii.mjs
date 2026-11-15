// kawaii scene generator. Run: node tools/scenes/kawaii.mjs
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

let seed = 777123
const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
const f = n => +n.toFixed(1)
const pick = a => a[Math.floor(R() * a.length)]

// a face that blinks now and then: open and closed eyes stacked and cross-faded
const face = (x, y, open, shut, period, cls = '') =>
  `<g class="blinker" style="--b:${period}s;animation-delay:-${f(R() * period)}s"><text class="face fo ${cls}" x="${x}" y="${y}">${open}</text><text class="face fc ${cls}" x="${x}" y="${y}">${shut}</text></g>`

// ── a puffy cloud: overlapping circles on a rounded base, a kaomoji face, blush on the cheeks
function cloud(cx, cy, s, open, shut, blink, cls = '') {
  const puffs = [[-58, 4, 30], [-28, -18, 36], [12, -26, 40], [48, -10, 32], [70, 8, 24]]
  let body = `<rect x="-86" y="-2" width="176" height="44" rx="22"/>`
  for (const [x, y, r] of puffs) body += `<circle cx="${x}" cy="${y}" r="${r}"/>`
  return `<g transform="translate(${cx} ${cy}) scale(${s})"><g class="drift" style="--dx:${f(10 + R() * 14)}px;animation-duration:${f(28 + R() * 14)}s;animation-delay:-${f(R() * 30)}s"><g class="bob" style="animation-duration:${f(6 + R() * 3)}s;animation-delay:-${f(R() * 6)}s"><g class="${cls}">
<g class="cl-sh" transform="translate(0 7)">${body}</g><g class="cl">${body}</g>
<ellipse class="blush" cx="-32" cy="20" rx="9" ry="5"/><ellipse class="blush" cx="36" cy="20" rx="9" ry="5"/>
${face(2, 18, open, shut, blink)}
</g></g></g></g>`
}

// ── twinkling glyph stars in candy colors
const STAR = ['⋆', '✧', '☆', '✦', '⋆', '✧', '·']
const TINT = ['st-p', 'st-l', 'st-m', 'st-y', 'st-c']
function stars(n, x0, y0, x1, y1, avoid) {
  let s = ''
  for (let i = 0; i < n; i++) {
    const x = f(x0 + R() * (x1 - x0)), y = f(y0 + R() * (y1 - y0))
    const g = pick(STAR), size = f(g === '·' ? 24 : 12 + R() * 13), tint = pick(TINT)
    const dur = f(3.5 + R() * 5), del = f(R() * 8)
    if (avoid && avoid(x, y)) continue
    s += `<text class="st ${tint}" x="${x}" y="${y}" font-size="${size}" style="animation-duration:${dur}s;animation-delay:-${del}s">${g}</text>`
  }
  return s
}

// ── hearts that float up from a point and fade, staggered
function hearts(x, y, n, period, rise) {
  let s = ''
  for (let i = 0; i < n; i++) {
    const dx = f((R() - 0.5) * 40), size = f(13 + R() * 8)
    s += `<text class="ht" x="${f(x + dx)}" y="${y}" font-size="${size}" style="--rise:-${rise}px;--sway:${f((R() - 0.5) * 30)}px;animation-duration:${period}s;animation-delay:-${f((i / n) * period + R() * 1.5)}s">♡</text>`
  }
  return s
}

// ── the corners (each group pinned to its corner of the visible box by the aspect rules below)
// top left: a big cloud and stars
const TL = cloud(170, 150, 1, 'ᵔᴥᵔ', '˘ᴥ˘', 7.3) + stars(10, 20, 55, 380, 300, (x, y) => x > 60 && x < 290 && y > 80 && y < 215)
// top right: the sun (light) or the sleeping moon (dark), and a small cloud
const SX = 860, SY = 140
let rays = ''
for (let i = 0; i < 12; i++) {
  const a = (i / 12) * Math.PI * 2
  rays += `<line x1="${f(SX + Math.cos(a) * 62)}" y1="${f(SY + Math.sin(a) * 62)}" x2="${f(SX + Math.cos(a) * 74)}" y2="${f(SY + Math.sin(a) * 74)}"/>`
}
const SUN = `<g class="sun"><circle class="sun-halo" cx="${SX}" cy="${SY}" r="115"/><g class="rays">${rays}</g>
<circle class="sun-disc" cx="${SX}" cy="${SY}" r="48"/>
<ellipse class="blush" cx="${SX - 27}" cy="${SY + 12}" rx="8" ry="5"/><ellipse class="blush" cx="${SX + 27}" cy="${SY + 12}" rx="8" ry="5"/>
${face(SX, SY + 7, 'ᵔ ᵕ ᵔ', '˘ ᵕ ˘', 8.6, 'sface')}</g>`
// a crescent: the outer disc minus an offset disc, lit side to the lower left
const MOON = `<g class="moon"><circle class="moon-halo" cx="${SX}" cy="${SY}" r="125"/>
<path class="moon-disc" d="M${SX + 34} ${SY - 38} A52 52 0 1 0 ${SX + 40} ${SY + 33} A40 40 0 0 1 ${SX + 34} ${SY - 38} Z"/>
<text class="mface" x="${SX - 24}" y="${SY + 6}" transform="rotate(-20 ${SX - 24} ${SY})">︶</text>
<ellipse class="blush" cx="${SX - 28}" cy="${SY + 24}" rx="7" ry="4"/>
<text class="zz" x="${SX + 36}" y="${SY - 30}" font-size="15">z</text>
<text class="zz" x="${SX + 36}" y="${SY - 30}" font-size="20" style="animation-delay:-2s">z</text>
<text class="zz" x="${SX + 36}" y="${SY - 30}" font-size="13" style="animation-delay:-4s">z</text></g>`
const TR = SUN + MOON + '<g class="mini">' + cloud(690, 215, 0.55, '•ᴗ•', '-ᴗ-', 9.1) + '</g>' + stars(9, 600, 55, 990, 340, (x, y) => Math.hypot(x - SX, y - SY) < 130 || (x > 620 && x < 760 && y > 180 && y < 250))
// left middle: a cloud that now and then squishes
const LM = cloud(115, 470, 0.78, '・ω・', '˘ω˘', 6.4, 'squish') + stars(5, 10, 360, 230, 640, (x, y) => x < 200 && y > 420 && y < 520)
// right middle: a dozy cloud and its stars
const RM = cloud(880, 520, 0.85, 'ᵔᵕᵔ', '˘ᵕ˘', 5.2) + stars(6, 770, 380, 990, 680, (x, y) => x > 790 && y > 465 && y < 570)

// bottom left: a mint hill and a mochi bunny that breathes, sends up hearts and now and then hops
const BX = 150, BY = 910
const ear = (dx, rot) => `<ellipse class="bn" cx="${BX + dx}" cy="${BY - 58}" rx="10" ry="28" transform="rotate(${rot} ${BX + dx} ${BY - 40})"/><ellipse class="bn-ear-in" cx="${BX + dx}" cy="${BY - 58}" rx="4.5" ry="19" transform="rotate(${rot} ${BX + dx} ${BY - 40})"/>`
const BUNNY = `<g class="hop"><g class="breathe">${ear(-17, -14)}<g class="earflop">${ear(17, 16)}</g>
<path class="bn" d="M${BX - 50} ${BY - 6} C${BX - 54} ${BY - 48} ${BX - 22} ${BY - 54} ${BX} ${BY - 54} C${BX + 22} ${BY - 54} ${BX + 54} ${BY - 48} ${BX + 50} ${BY - 6} Q${BX + 48} ${BY + 4} ${BX} ${BY + 4} Q${BX - 48} ${BY + 4} ${BX - 50} ${BY - 6} Z"/>
${face(BX, BY - 16, '˶ᵔ ᵕ ᵔ˶', '˶˘ ᵕ ˘˶', 6.1, 'bface')}
</g></g>`
const BL = `<ellipse class="hill-m" cx="70" cy="1010" rx="300" ry="120"/>
<ellipse class="shadow" cx="${BX}" cy="${BY + 2}" rx="48" ry="6"/>${BUNNY}${hearts(BX + 10, BY - 74, 4, 11, 150)}
<text class="fl fl-p" x="40" y="932">✿</text><text class="fl fl-l" x="268" y="950" style="animation-delay:-2s">✿</text>`
// bottom right: a strawberry hill with flowers and a slow trickle of hearts
const BR = `<ellipse class="hill-p" cx="940" cy="1015" rx="280" ry="115"/>
<text class="fl fl-m" x="800" y="957" style="animation-delay:-1s">✿</text><text class="fl fl-p" x="890" y="932" style="animation-delay:-3s">✿</text><text class="fl fl-l" x="962" y="946">✿</text>
${hearts(900, 905, 3, 14, 170)}` + stars(4, 720, 760, 990, 870)

// shooting star: a ✧ with a trail of smaller glyphs, once in a while across the upper sky
const SHOOT = `<g class="shoot"><g transform="rotate(14 300 120)"><text class="trail" x="300" y="120" xml:space="preserve"><tspan opacity=".2">·  ⋆ </tspan><tspan opacity=".45">·  ⋆  </tspan><tspan opacity=".75">✧ · </tspan><tspan class="head" font-size="26">✧</tspan></text></g></g>`

// ── aspect rules: pin the groups to the visible corners, smaller on very wide or tall boxes
const ORIG = { tl: '0 0', tr: '1000px 0', bl: '0 1000px', br: '1000px 1000px', lm: '0 500px', rm: '1000px 500px', sh: '0 0' }
const SIGN = { tl: [1, 1], tr: [-1, 1], bl: [1, -1], br: [-1, -1], lm: [1, 0], rm: [-1, 0], sh: [1, 1] }
let anchor = Object.entries(ORIG).map(([k, v]) => `.${k}{transform-origin:${v}}`).join('')
const rule = (dx, dy, s) => Object.keys(ORIG).map(k => `.${k}{transform:translate(${SIGN[k][0] * dx}px,${SIGN[k][1] * dy}px) scale(${s})}`).join('')
for (const [r, a, s] of [['5/4', 1.25, 0.95], ['3/2', 1.5, 0.9], ['7/4', 1.75, 0.84], ['2/1', 2, 0.78], ['9/4', 2.25, 0.72]]) anchor += `\n@media (min-aspect-ratio:${r}){${rule(0, f(500 - 500 / a), s)}}`
for (const [r, a, s] of [['4/5', 0.667, 0.92], ['2/3', 0.5, 0.82], ['1/2', 0.4, 0.74]]) anchor += `\n@media (max-aspect-ratio:${r}){${rule(f(500 - 500 * a), 0, s)}}`

const style = `
svg{--sky0:#efe4fb;--sky1:#fde6f0;--sky2:#fff3ea;--cloud:#fff1f7;--cloud-top:#ffffff;--cloud-sh:#f2c9dc;--face:#6e4a66;--blush:#ff9cc4;
--hill-m:#c8efdc;--hill-p:#ffd7e6;--bunny:#fffafc;--ear-in:#ffc2d9;--bn-line:#f3c6da;--heart:#ff7fb4;--sun:#ffd98f;--ray:#ffc479;
--st-p:#f58bbb;--st-l:#a98cf0;--st-m:#5fc9a2;--st-y:#f4b860;--st-c:#ff9e9e;--trail:#c08cf0}
.moon{display:none}
text{font-family:ui-rounded,"Hiragino Maru Gothic ProN","Arial Rounded MT Bold",system-ui,sans-serif;text-anchor:middle}
.cl{fill:url(#cloudg)}.cl-sh{fill:var(--cloud-sh);opacity:.55}
.blush{fill:var(--blush);opacity:.55}
.face{fill:var(--face);font-size:24px;font-weight:600}
.fo{opacity:1;animation:bo var(--b) infinite;animation-delay:inherit}
.fc{opacity:0;animation:bc var(--b) infinite;animation-delay:inherit}
@keyframes bo{0%,95%,98.5%,100%{opacity:1}95.6%,97.9%{opacity:0}}
@keyframes bc{0%,95%,98.5%,100%{opacity:0}95.6%,97.9%{opacity:1}}
.sface{font-size:22px;fill:#8a5a3c}.bface{font-size:17px}
.mface{font-size:22px;fill:#8a76c8}
.drift{animation:drift 34s ease-in-out infinite alternate}
@keyframes drift{from{transform:translateX(calc(var(--dx) * -1))}to{transform:translateX(var(--dx))}}
.bob{animation:bob 7s ease-in-out infinite}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.squish{transform-box:fill-box;transform-origin:50% 100%;animation:squish 19s ease-in-out infinite 6s}
@keyframes squish{0%,90%,100%{transform:scale(1,1)}92%{transform:scale(1.08,.88)}94%{transform:scale(.96,1.06)}96%{transform:scale(1.02,.98)}}
.st{animation:tw 5s ease-in-out infinite;transform-box:fill-box;transform-origin:center;opacity:.6}
@keyframes tw{0%,100%{opacity:.3;transform:scale(.85)}50%{opacity:1;transform:scale(1.1)}}
.st-p{fill:var(--st-p)}.st-l{fill:var(--st-l)}.st-m{fill:var(--st-m)}.st-y{fill:var(--st-y)}.st-c{fill:var(--st-c)}
.ht{fill:var(--heart);opacity:0;animation:heart 11s ease-out infinite}
@keyframes heart{0%{opacity:0;transform:translate(0,0)}10%{opacity:.9}30%{transform:translate(var(--sway),calc(var(--rise) * .5))}55%,100%{opacity:0;transform:translate(0,var(--rise))}}
.sun-disc{fill:var(--sun)}.sun-halo{fill:url(#halo)}
.rays{stroke:var(--ray);stroke-width:7;stroke-linecap:round;transform-origin:${SX}px ${SY}px;animation:spin 90s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.moon-disc{fill:#fff2c4}.moon-halo{fill:url(#mhalo)}
.zz{fill:#e8d8ff;opacity:0;animation:zz 6s ease-out infinite}
@keyframes zz{0%{opacity:0;transform:translate(0,0)}15%{opacity:.85}100%{opacity:0;transform:translate(34px,-46px)}}
.hill-m{fill:var(--hill-m)}.hill-p{fill:var(--hill-p)}
.shadow{fill:#000;opacity:.07}
.bn{fill:var(--bunny);stroke:var(--bn-line);stroke-width:1.5}.bn-ear-in{fill:var(--ear-in)}
.breathe{transform-box:fill-box;transform-origin:50% 100%;animation:breathe 3.8s ease-in-out infinite}
@keyframes breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.03,.96)}}
.earflop{transform-origin:${BX + 14}px ${BY - 42}px;animation:flop 13s ease-in-out infinite}
@keyframes flop{0%,86%,100%{transform:rotate(0)}90%{transform:rotate(22deg)}95%{transform:rotate(16deg)}}
.hop{animation:hop 27s ease-in-out infinite 11s}
@keyframes hop{0%,92%,100%{transform:translateY(0)}93.5%{transform:translateY(-34px)}95%{transform:translateY(0)}96%{transform:translateY(-12px)}97%{transform:translateY(0)}}
.fl{font-size:20px;transform-box:fill-box;transform-origin:50% 100%;animation:sway 6s ease-in-out infinite}
@keyframes sway{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}
.fl-p{fill:var(--st-p)}.fl-l{fill:var(--st-l)}.fl-m{fill:var(--st-m)}
.trail{fill:var(--trail);font-size:16px;text-anchor:end}.head{fill:var(--st-y)}
.shoot{opacity:0;animation:shoot 23s ease-out infinite 8s}
@keyframes shoot{0%{opacity:0;transform:translate(0,0)}1%{opacity:1}7%{opacity:0;transform:translate(420px,105px)}100%{opacity:0;transform:translate(420px,105px)}}
@media (prefers-color-scheme:dark){svg{--sky0:#191536;--sky1:#262050;--sky2:#3a2c62;--cloud:#54468f;--cloud-top:#8d7bd2;--cloud-sh:#2a2252;--face:#fbeaff;--blush:#ff8fc0;
--hill-m:#2f3f6a;--hill-p:#45336f;--bunny:#efe6ff;--ear-in:#ff9fca;--bn-line:#c9b6f0;--heart:#ff9fcb;
--st-p:#ffb3d6;--st-l:#cdb9ff;--st-m:#9ff0d0;--st-y:#ffe3a0;--st-c:#ffc0c0;--trail:#e8d4ff}
.sun{display:none}.moon{display:inline}.face.bface{fill:#6e4a66}}
${anchor}
@media (max-aspect-ratio:2/3){.mini{display:none}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.shoot,.ht,.zz{opacity:0}}
`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
<style>${style}</style>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sky0)"/><stop offset=".55" style="stop-color:var(--sky1)"/><stop offset="1" style="stop-color:var(--sky2)"/></linearGradient>
<linearGradient id="cloudg" gradientUnits="userSpaceOnUse" x1="0" y1="-66" x2="0" y2="42"><stop offset=".1" style="stop-color:var(--cloud-top)"/><stop offset="1" style="stop-color:var(--cloud)"/></linearGradient>
<radialGradient id="halo"><stop offset=".35" stop-color="#ffe2a8" stop-opacity=".9"/><stop offset="1" stop-color="#ffe2a8" stop-opacity="0"/></radialGradient>
<radialGradient id="mhalo"><stop offset=".3" stop-color="#d9c8ff" stop-opacity=".35"/><stop offset="1" stop-color="#d9c8ff" stop-opacity="0"/></radialGradient>
</defs>
<rect x="-2000" y="-1000" width="5000" height="3000" fill="url(#sky)"/>
<g>${stars(18, 0, 0, 1000, 1000, (x, y) => x > 230 && x < 770 && y > 180 && y < 860)}</g>
<g class="lm">${LM}</g>
<g class="rm">${RM}</g>
<g class="tl">${TL}</g>
<g class="tr">${TR}</g>
<g class="sh">${SHOOT}</g>
<g class="bl">${BL}</g>
<g class="br">${BR}</g>
</svg>`

writeFileSync(join(ROOT, 'hooks/looks/kawaii/scene.js'), `// Generated by tools/scenes/kawaii.mjs: pastel kaomoji clouds, glyph stars, a sun or sleeping moon, a mochi bunny.
export const SCENE = ${JSON.stringify(svg)}\n`)
console.log('kawaii', svg.length)
