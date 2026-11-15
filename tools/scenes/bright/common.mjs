import { fileURLToPath } from 'node:url'
import { writeFileSync } from 'node:fs'
export const REPO = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\/$/, '')
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export const f = n => (Math.round(n * 10) / 10).toString()
// Pins corner groups (.tl .tr .bl .br .t .b) to the visible box under slice cropping,
// shrinking them on tall screens so they stay at the edges.
export function anchorCss() {
  const o = { tl: '0 0', tr: '1000px 0', bl: '0 1000px', br: '1000px 1000px', t: '500px 0', b: '500px 1000px' }
  const sign = { tl: [1, 1], tr: [-1, 1], bl: [1, -1], br: [-1, -1], t: [0, 1], b: [0, -1] }
  let css = Object.entries(o).map(([k, v]) => `.${k}{transform-origin:${v}}`).join('')
  const rule = (dx, dy, s) => Object.keys(o).map(k => `.${k}{transform:translate(${sign[k][0] * dx}px,${sign[k][1] * dy}px) scale(${s})}`).join('')
  for (const [r, dy, s] of [['5/4', 100, 0.95], ['3/2', 167, 0.86], ['7/4', 214, 0.78], ['2/1', 250, 0.7], ['9/4', 278, 0.62]]) css += `\n@media (min-aspect-ratio:${r}){${rule(0, dy, s)}}`
  for (const [r, dx, s] of [['4/5', 100, 0.85], ['2/3', 167, 0.7], ['1/2', 250, 0.6]]) css += `\n@media (max-aspect-ratio:${r}){${rule(dx, 0, s)}}`
  return css
}
export function write(id, comment, svg) {
  const src = `// ${comment}\nexport const SCENE = ${JSON.stringify(svg)}\n`
  writeFileSync(`${REPO}/hooks/looks/${id}/scene.js`, src)
  console.log(id, 'scene chars', svg.length)
}
