// abyssal scene generator. Run: node tools/scenes/abyssal.mjs
// The deep sea, slow and dark, made of glyphs. Three layers of plankton drift at their own depth and
// pace; now and then a soft wave of light runs through them. Its animals are real solids (signed
// distance fields in sea-creatures.mjs), raymarched here at build time into ASCII, one frame per step
// of their swim cycle, and the frames dissolve into one another. They are rare: each keeps to its own
// depth (far ones small, dim and slow) and its own long cycle, so most of the time one or none is in view.
import { writeFileSync } from 'node:fs'
import { inlineUses } from './inline-uses.mjs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { frameSvg, render, trim } from './ascii3d.mjs'
import { jellyBell, manta, turtle, turtleTex, whale, whaleTex } from './sea-creatures.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

let seed = 20261116
const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
const f = n => +n.toFixed(2)
const rr = (a, b) => a + R() * (b - a)
const W = 1600
const H = 1000
const FS = 10 // font size of every sprite, in viewBox units
const CW = 6.02 // a monospace advance at that size
const CH = 11 // the line step; CH / CW is the cell aspect the renderer samples
const ASPECT = CH / CW

let css = ''
const kf = (name, body) => { css += `@keyframes ${name}{${body}}\n` }

// ── a flipbook whose frames dissolve: each fades in over 1/n of the cycle and out over the next,
// so two neighbours are always mid-crossfade and the body moves like breathing, never in jumps
const books = new Set()
const defs = []
const stills = {} // frame 0 of each book, for the poster
function book(frames, id, period, colors, oy = 0.5) {
  const n = frames.length
  if (!books.has(n)) {
    books.add(n)
    kf(`xf${n}`, `0%{opacity:0}${f(100 / n)}%{opacity:1}${f(200 / n)}%,100%{opacity:0}`)
  }
  const w = frames[0][0].length * CW, h = frames[0].length * CH
  const body = frames.map((fr, k) => `<g class="fr${k === 0 ? ' f0' : ''}" style="animation:xf${n} ${period}s linear infinite ${f(((k - 1) / n) * period - period)}s">${frameSvg(fr, { cw: CW, ch: CH, plain: true })}</g>`).join('')
  const stops = colors.map((c, i) => `<stop offset="${f(i / (colors.length - 1))}" stop-color="${c}"/>`).join('')
  defs.push(`<linearGradient id="${id}G" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${f(w * 0.25)}" y2="${f(h)}">${stops}</linearGradient>`)
  defs.push(`<g id="${id}" transform="translate(${f(-w / 2)} ${f(-h * oy)})" fill="url(#${id}G)">${body}</g>`)
  stills[id] = `<linearGradient id="${id}G" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${f(w * 0.25)}" y2="${f(h)}">${stops}</linearGradient><g id="${id}" transform="translate(${f(-w / 2)} ${f(-h * oy)})" fill="url(#${id}G)">${frameSvg(frames[Math.floor(n / 3)], { cw: CW, ch: CH, plain: true })}</g>`
  return `<use href="#${id}"/>`
}
function flipbook(id, make, n, view, { tex, period, colors }) {
  return book(trim(Array.from({ length: n }, (_, k) => render(make((k / n) * Math.PI * 2), { ...view, aspect: ASPECT }, tex))), id, period, colors)
}

// ── a rare passage: within a long cycle the animal crosses once (over `share` of it) and is away the
// rest; `enter` is when, after the scene opens, it first appears (0 = already halfway across).
// A slow bob and a pitch that leads it make it climb and dip nose first.
function passage(name, { y0, dir, cycle, share, enter, bob, bobDur, pitch, scale, depth }) {
  const from = dir > 0 ? -460 : W + 460
  const to = dir > 0 ? W + 460 : -460
  const p = f(share * 100)
  kf(`${name}X`, `0%{transform:translateX(${from}px)}${p}%,100%{transform:translateX(${to}px)}`)
  kf(`${name}Y`, `0%,100%{transform:translateY(${-bob}px)}50%{transform:translateY(${bob}px)}`)
  kf(`${name}P`, `0%,50%,100%{transform:rotate(0deg)}25%{transform:rotate(${pitch * dir}deg)}75%{transform:rotate(${-pitch * dir}deg)}`)
  // enter 0: halfway across at t = 0; otherwise the crossing starts `enter` seconds in
  const delay = enter === 0 ? -(share * cycle) / 2 : enter - cycle
  const ph = f(-R() * bobDur)
  css += `.${name}X{animation:${name}X ${cycle}s linear infinite ${f(delay)}s}.${name}Y{animation:${name}Y ${bobDur}s ease-in-out infinite ${ph}s}.${name}P{animation:${name}P ${bobDur}s ease-in-out infinite ${ph}s}\n`
  return [`<g class="${depth}" transform="translate(0 ${y0})"><g class="${name}X"><g class="${name}Y"><g class="${name}P"><g transform="scale(${scale})">`, '</g></g></g></g></g>']
}

// ── the animals: a manta for the corner, a small turtle for its rare passes
const MANTA = flipbook('manta', t => manta(t, -1), 16, { cols: 52, rows: 44, dx: 0.064, elev: 1.42, ramp: ' .,:;-=+*#' }, { period: 15, colors: ['#d6fff6', '#6fd8c8', '#3f86b4', '#4b3f94'] })
const TURTLE = flipbook('turtle', t => turtle(t, 1), 12, { cols: 44, rows: 30, dx: 0.068, elev: 1.3, ramp: ' .,:;-=+*#' }, { tex: turtleTex(1), period: 9.5, colors: ['#cfe3b0', '#86b296', '#3f7a72', '#1f4a52'] })

// a moon jelly: the raymarched bell, with a fringe and oral arms traced in glyphs beneath it
function jellyBook(id, n, period) {
  const frames = Array.from({ length: n }, (_, k) => {
    const t = (k / n) * Math.PI * 2
    const fr = render(jellyBell(t), { cols: 26, rows: 9, dx: 0.085, elev: 0.35, cy: 0.2, light: [0.2, 1, 0.6], aspect: ASPECT })
    const s = k / n, squeeze = s < 0.25 ? Math.sin((s / 0.25) * Math.PI / 2) : Math.cos(((s - 0.25) / 0.75) * Math.PI / 2)
    const rows = 13
    for (let r = 0; r < rows; r++) fr.push(Array.from({ length: 26 }, () => [' ', 0]))
    const put = (r, c, ch, v) => { const row = fr[r]; const cc = Math.round(c); if (row && cc >= 0 && cc < 26) row[cc] = [ch, v] }
    for (let i = 0; i < 9; i++) {
      const c0 = 13 + (i - 4) * (2.4 - squeeze * 0.6)
      for (let r = 0; r < rows - 2 - (i % 3) * 2; r++) {
        const sway = Math.sin(t - r * 0.55 + i) * (0.3 + r * 0.12)
        put(8 + r, c0 + sway, r > 6 ? (r % 2 ? ':' : '.') : Math.abs(Math.cos(t - r * 0.55 + i)) < 0.4 ? '|' : sway > 0 ? '(' : ')', 0.4)
      }
    }
    for (const c0 of [11, 15]) {
      for (let r = 0; r < 9; r++) {
        const sway = Math.sin(t - r * 0.7 + c0) * 1.1
        put(8 + r, c0 + sway, r % 3 === 2 ? '%' : sway > 0 ? '}' : '{', 0.7)
      }
    }
    return fr
  })
  return book(trim(frames), id, period, ['#e9e0ff', '#ad9aea', '#6a5bb3', '#226e6e'], 0.33)
}
jellyBook('jellyA', 16, 10.5)
jellyBook('jellyB', 16, 12.2)

// ── plankton: a sparse tile of glyphs, drifting down slowly
function planktonTile(id, size, n, glyphs, fs, o0, o1) {
  let t = ''
  for (let i = 0; i < n; i++) t += `<text x="${f(R() * size)}" y="${f(R() * size)}" fill-opacity="${f(rr(o0, o1))}">${glyphs[Math.floor(R() * glyphs.length)]}</text>`
  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><g style="font-size:${fs}px">${t}</g></pattern>`
}

const DEFS = `<defs>
<linearGradient id="sea" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#061620"/><stop offset=".6" stop-color="#050f18"/><stop offset="1" stop-color="#040b13"/></linearGradient>
<radialGradient id="tealGlow"><stop offset="0" stop-color="#1e8a86" stop-opacity=".42"/><stop offset=".55" stop-color="#145d66" stop-opacity=".14"/><stop offset="1" stop-color="#145d66" stop-opacity="0"/></radialGradient>
<radialGradient id="violetGlow"><stop offset="0" stop-color="#4a3aa0" stop-opacity=".3"/><stop offset=".6" stop-color="#2e2670" stop-opacity=".1"/><stop offset="1" stop-color="#2e2670" stop-opacity="0"/></radialGradient>
<radialGradient id="jglow"><stop offset="0" stop-color="#9c88ff" stop-opacity=".14"/><stop offset="1" stop-color="#9c88ff" stop-opacity="0"/></radialGradient>
${planktonTile('plankton', 480, 34, '.·', 10, 0.25, 0.7)}
${defs.join('')}
</defs>`

// a rare visitor: the turtle rises along the right margin once in a long cycle, small and far
kf('visit', `0%{transform:translate(-180px,260px)}${f(30)}%{transform:translate(120px,-760px)}${f(30.01)}%,100%{transform:translate(-180px,260px)}`)
kf('visitA', '0%{opacity:0}4%{opacity:1}26%{opacity:1}30%,100%{opacity:0}')
kf('orbitX', '0%,100%{transform:translateX(0)}50%{transform:translateX(-70px)}')
kf('orbitY', '0%,100%{transform:translateY(0)}50%{transform:translateY(-46px)}')
kf('bank', '0%,100%{transform:rotate(-5deg)}50%{transform:rotate(6deg)}')
kf('breathe', '0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(var(--x),var(--y)) scale(1.15)}')
kf('drift', '0%,100%{transform:translate(0,30px)}50%{transform:translate(10px,-60px)}')
kf('fall', 'from{transform:translateY(0)}to{transform:translateY(480px)}')

const style = `<style>
text{font-family:ui-monospace,Menlo,"SF Mono","DejaVu Sans Mono",Consolas,monospace;font-size:${FS}px;white-space:pre;dominant-baseline:hanging}
.fr{opacity:0}.fr.f0{opacity:1}
pattern text{fill:#7fd6cc}
.plank{animation:fall 240s linear infinite;opacity:.35}
.glowA{--x:-90px;--y:-50px;animation:breathe 67s ease-in-out infinite}.glowB{--x:80px;--y:60px;animation:breathe 89s ease-in-out infinite -30s}
.oX{animation:orbitX 53s ease-in-out infinite}.oY{animation:orbitY 37s ease-in-out infinite -9s}.bank{animation:bank 41s ease-in-out infinite -6s}
.manta{opacity:.95}
.visit{opacity:0;animation:visit 487s linear infinite 70s,visitA 487s linear infinite 70s}.visitor{opacity:.32}
.jdrift{animation:drift 83s ease-in-out infinite}.jelly{opacity:.5}
${css}@media (prefers-reduced-motion:reduce){*{animation:none!important}.visit{opacity:0}}
</style>`

// Anchored bottom-right: on a tall phone the left is cropped, on a wide window the top, and the corner
// with the manta stays in view; the middle, where the words are, stays empty.
const svg = inlineUses(`<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMax slice">
${style}
${DEFS}
<rect width="${W}" height="${H}" fill="url(#sea)"/>
<g class="glowB"><circle cx="300" cy="260" r="620" fill="url(#violetGlow)"/></g>
<g class="glowA"><circle cx="1380" cy="820" r="560" fill="url(#tealGlow)"/></g>
<g class="plank"><rect y="-480" width="${W}" height="${H + 480}" fill="url(#plankton)"/></g>
<g class="jelly"><g transform="translate(150 420) scale(.8)"><g class="jdrift"><circle r="120" fill="url(#jglow)"/><use href="#jellyA"/></g></g>
<g transform="translate(270 640) scale(.5)"><g class="jdrift" style="animation-delay:-40s"><circle r="120" fill="url(#jglow)"/><use href="#jellyB"/></g></g></g>
<g class="visitor"><g transform="translate(1450 900)"><g class="visit"><g transform="rotate(-74) scale(.62)">${TURTLE}</g></g></g></g>
<g class="manta" transform="translate(1330 790)"><g class="oX"><g class="oY"><g class="bank"><g transform="scale(1.25)">${MANTA}</g></g></g></g></g>
</svg>`.replace(/\n\s*\n/g, '\n'))

// the poster: the same composition, still, with only the manta and the near jelly
const poster = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMax slice" width="320" height="180">
<style>text{font-family:ui-monospace,Menlo,monospace;font-size:${FS}px;white-space:pre;dominant-baseline:hanging}</style>
<defs><linearGradient id="sea" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#061620"/><stop offset="1" stop-color="#040b13"/></linearGradient>
<radialGradient id="tealGlow"><stop offset="0" stop-color="#1e8a86" stop-opacity=".42"/><stop offset="1" stop-color="#145d66" stop-opacity="0"/></radialGradient>
<radialGradient id="violetGlow"><stop offset="0" stop-color="#4a3aa0" stop-opacity=".3"/><stop offset="1" stop-color="#2e2670" stop-opacity="0"/></radialGradient>
${stills.manta}${stills.jellyA}</defs>
<rect width="${W}" height="${H}" fill="url(#sea)"/><circle cx="300" cy="260" r="620" fill="url(#violetGlow)"/><circle cx="1380" cy="820" r="560" fill="url(#tealGlow)"/>
<g opacity=".5" transform="translate(150 420) scale(.8)"><use href="#jellyA"/></g>
<g opacity=".95" transform="translate(1330 790) scale(1.25)"><use href="#manta"/></g>
</svg>`.replace(/\n/g, '')

console.log(`abyssal: ${svg.length} characters, poster ${poster.length}`)
if (poster.length >= 12000) throw new Error('poster over 12,000 characters')
if (svg.length >= 131072) throw new Error(`scene is ${svg.length} characters, over 131,072`)
writeFileSync(join(ROOT, 'hooks/looks/abyssal/scene.js'),
  `// Generated by tools/scenes/abyssal.mjs: the deep sea in glyphs, its rare animals raymarched into ASCII.\nexport const SCENE = ${JSON.stringify(svg)}\nexport const POSTER = ${JSON.stringify(poster)}\n`)
