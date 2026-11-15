import { fileURLToPath } from 'node:url'
export const REPO = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\/$/, '')
import { writeFileSync } from 'node:fs'
export function rng(seed) {
  let s = seed >>> 0
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
export const f = n => +n.toFixed(1)
// Layout shifts so edge art stays in view on wide and tall boxes (viewBox 1600x1000, slice).
// .L/.R move inward on tall boxes, .B moves up and .T down on wide ones.
// Tall boxes: the visible band starts at x = 800 - 500 * aspect, so each step moves .L/.R
// (times k) about that far in. Wide boxes: .B moves up and .T down.
const TALL = [[7, 5, 100], [6, 5, 200], [1, 1, 300], [4, 5, 400], [3, 5, 520]]
export const tall = (cls, k) => TALL.map(([a, b, x]) => `@media (max-aspect-ratio:${a}/${b}){${cls.map(([c, sg]) => `.${c}{transform:translateX(${Math.round(sg * x * k)}px)}`).join('')}}`).join('\n')
export const FIT = (k = 1) => `
@media (min-aspect-ratio:2/1){.B{transform:translateY(-100px)}.T{transform:translateY(100px)}}
@media (min-aspect-ratio:12/5){.B{transform:translateY(-165px)}.T{transform:translateY(165px)}}
${tall([['L', 1], ['R', -1]], k)}`
export function write(file, comment, svg) {
  const src = `// Generated scene: ${comment}\nexport const SCENE = ${JSON.stringify(svg)}\n`
  writeFileSync(file, src)
  console.log(file, svg.length, 'chars')
}
