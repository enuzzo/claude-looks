// neon-punk scene: a generated alley wall (JPEG inlined) with light animated over it.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Run: node tools/scenes/neon-punk.mjs (the wall is neon-punk-wall.jpg beside this file)
const root = fileURLToPath(new URL('../..', import.meta.url))
const jpg = fileURLToPath(new URL('./neon-punk-wall.jpg', import.meta.url))
const b64 = readFileSync(jpg).toString('base64')
const W = 1152, H = 720
const k = W / 1586 // the source was drawn at 1586 wide

let seed = 7
const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
const f = n => +n.toFixed(1)

// drops sliding off the paint drips (top right, acid green; top left, magenta)
const drips = [[1282, 300, '#c8f02a'], [1308, 230, '#c8f02a'], [1338, 190, '#c8f02a'], [1366, 150, '#c8f02a'], [185, 205, '#ff2f9e'], [214, 240, '#ff2f9e'], [300, 470, '#ff2f9e']]
let drops = ''
drips.forEach(([x, y, c], i) => {
  drops += `<ellipse class="drop" cx="${f(x * k)}" cy="${f(y * k)}" rx="2.2" ry="3.2" fill="${c}" style="animation-duration:${f(11 + R() * 9)}s;animation-delay:-${f(R() * 14)}s"/>`
})

// glints on the wet ground: short strokes that shimmer
let glints = ''
for (let i = 0; i < 46; i++) {
  const left = R() < 0.5
  const x = left ? R() * 360 : 1150 + R() * 430
  const y = 905 + Math.pow(R(), 0.7) * 85
  const w = 8 + R() * 40
  const c = left ? '#ff4fb0' : '#d6ff3a'
  glints += `<rect class="gl" x="${f(x * k)}" y="${f(y * k)}" width="${f(w * k)}" height="1.4" rx=".7" fill="${c}" style="animation-duration:${f(2.5 + R() * 3.5)}s;animation-delay:-${f(R() * 5)}s"/>`
}

const style = `
.drop{opacity:0;animation:drop ease-in infinite}
@keyframes drop{0%,70%{opacity:0;transform:translateY(0)}72%{opacity:.95}96%{opacity:.8;transform:translateY(60px)}100%{opacity:0;transform:translateY(70px)}}
.gl{opacity:.15;animation:gl ease-in-out infinite}
@keyframes gl{0%,100%{opacity:.08}50%{opacity:.7}}
.lm{animation:fl 7s steps(1) infinite}
@keyframes fl{0%,62%,66%,100%{opacity:.55}63%{opacity:.15}64%{opacity:.6}65%{opacity:.2}}
.lg{animation:fl2 11s steps(1) infinite}
@keyframes fl2{0%,80%,83%,100%{opacity:.5}81%{opacity:.12}82%{opacity:.55}}
.beam{opacity:0;mix-blend-mode:screen;animation:beam 19s ease-in-out infinite 4s}
@keyframes beam{0%{opacity:0;transform:translateX(-500px) skewX(-18deg)}3%{opacity:.5}17%{opacity:.5}20%{opacity:0;transform:translateX(${W + 300}px) skewX(-18deg)}100%{opacity:0;transform:translateX(${W + 300}px) skewX(-18deg)}}
.buzz{opacity:0;animation:buzz 23s steps(1) infinite 9s}
@keyframes buzz{0%,95%,100%{opacity:0}95.5%{opacity:.18}96%{opacity:0}96.4%{opacity:.12}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.beam,.drop,.buzz{opacity:0}}
`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<style>${style}</style>
<defs>
<radialGradient id="mg" cx="0" cy=".35" r=".55"><stop offset="0" stop-color="#ff2f9e" stop-opacity=".45"/><stop offset="1" stop-color="#ff2f9e" stop-opacity="0"/></radialGradient>
<radialGradient id="gg" cx="1" cy=".25" r=".5"><stop offset="0" stop-color="#c8f02a" stop-opacity=".35"/><stop offset="1" stop-color="#c8f02a" stop-opacity="0"/></radialGradient>
<linearGradient id="bm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff6e8" stop-opacity="0"/><stop offset=".5" stop-color="#fff6e8" stop-opacity=".22"/><stop offset="1" stop-color="#fff6e8" stop-opacity="0"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="#07060a"/>
<image href="data:image/jpeg;base64,${b64}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>
<rect class="lm" width="${W}" height="${H}" fill="url(#mg)" style="mix-blend-mode:screen"/>
<rect class="lg" width="${W}" height="${H}" fill="url(#gg)" style="mix-blend-mode:screen"/>
<g>${glints}</g>
<g>${drops}</g>
<rect class="beam" x="0" y="0" width="260" height="${H}" fill="url(#bm)"/>
<rect class="buzz" width="${W}" height="${H}" fill="#ff8ad0"/>
</svg>`

writeFileSync(join(root, 'hooks/looks/neon-punk/scene.js'), `// A back-alley wall (generated image, inlined) under flickering neon light,\n// with dripping paint, glints on the wet ground and a passing headlight.\nexport const SCENE = ${JSON.stringify(svg)}\n`)
console.log('neon-punk', svg.length)
