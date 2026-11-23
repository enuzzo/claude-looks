// Pictures read as glyph mosaics, cell by cell, at build time (the method xmas.mjs began with).
// A picture made for a look is itself a grid of glowing glyphs on a dark ground. readPart() measures that
// grid on a box of it and reads each cell (DIV cells to each of the picture's glyphs): its colour is the
// colour of its brightest quarter of pixels (the glyph's own colour, not a mean washed out by the dark
// between the strokes). mosaic() pools the colours of a set of cells by k-means into a small palette
// and draws them as pattern-stroked lines in cell units: one tile per colour and glyph, drawn once and
// repeated, and a run of cells along a row is one `h` of whole numbers. Thousands of cells cost what a
// handful would (xmas: 12,000 cells in 116,000 characters, under 3 ms a frame).
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

const f = n => +n.toFixed(1)
export const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export const hex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
export const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
export function hsv([r, g, b]) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let h = 0
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx / 255]
}

// a PNG (8-bit RGB or RGBA, not interlaced) read with zlib, no dependency
export function readPng(file) {
  const b = readFileSync(file)
  let p = 8, w = 0, h = 0, ct = 0
  const idat = []
  while (p < b.length) {
    const len = b.readUInt32BE(p), type = b.toString('ascii', p + 4, p + 8), data = b.subarray(p + 8, p + 8 + len)
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; if (data[8] !== 8 || data[12] !== 0) throw new Error(`${file}: 8-bit, non-interlaced PNG only`) }
    if (type === 'IDAT') idat.push(data)
    p += 12 + len
  }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 0
  if (!bpp) throw new Error(`${file}: RGB or RGBA PNG only`)
  const raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, px = Buffer.alloc(h * stride)
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0, up = y ? px[(y - 1) * stride + x] : 0, c = y && x >= bpp ? px[(y - 1) * stride + x - bpp] : 0
      let v = src[x]
      if (ft === 1) v += a
      else if (ft === 2) v += up
      else if (ft === 3) v += (a + up) >> 1
      else if (ft === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c }
      px[y * stride + x] = v & 255
    }
  }
  return { w, h, at: (x, y) => { const i = (Math.min(h - 1, Math.max(0, y | 0)) * w + Math.min(w - 1, Math.max(0, x | 0))) * bpp; return [px[i], px[i + 1], px[i + 2]] } }
}

// The colour of a box of the picture: its brightest quarter of pixels, and how much of the box is lit.
function sample(img, x0, y0, x1, y1, mean = false) {
  const px = []
  for (let y = Math.floor(y0); y < y1; y++) for (let x = Math.floor(x0); x < x1; x++) px.push(img.at(x, y))
  if (!px.length) return { c: [0, 0, 0], cover: 0 }
  px.sort((a, b) => lum(b) - lum(a))
  // mean: for fine dark marks drawn on a bright body (a face), which the brightest quarter would lose
  const top = mean ? px : px.slice(0, Math.max(1, Math.ceil(px.length / 4)))
  return { c: [0, 1, 2].map(i => top.reduce((s, p) => s + p[i], 0) / top.length), cover: px.filter(p => lum(p) > 0.12).length / px.length }
}

// The picture's own glyph grid on a box: period and offset along x and y, from the strongest frequency
// of the box's brightness profile (a small discrete Fourier sweep between tMin and tMax pixels).
export function measureGrid(img, [x0, y0, x1, y1], tMin = 7, tMax = 14) {
  const along = axis => {
    const n = axis === 'x' ? x1 - x0 : y1 - y0, prof = []
    for (let i = 0; i < n; i++) {
      let s = 0, m = 0
      for (let j = axis === 'x' ? y0 : x0; j < (axis === 'x' ? y1 : x1); j += 2) { s += lum(axis === 'x' ? img.at(x0 + i, j) : img.at(j, y0 + i)); m++ }
      prof.push(s / m)
    }
    const mean = prof.reduce((a, v) => a + v, 0) / n
    let best = [0, 12, 0]
    for (let T = tMin; T <= tMax; T += 0.05) {
      let re = 0, im = 0
      prof.forEach((v, i) => { const a = (2 * Math.PI * i) / T; re += (v - mean) * Math.cos(a); im += (v - mean) * Math.sin(a) })
      const mag = Math.hypot(re, im)
      if (mag > best[0]) best = [mag, T, Math.atan2(im, re)]
    }
    const [, T, ph] = best
    const peak = ((((ph / (2 * Math.PI)) * T) % T) + T) % T // the profile peaks at the glyphs' middles
    return { T, start: (((peak - T / 2) % T) + T) % T }
  }
  return { x: along('x'), y: along('y') }
}

// Read one part of a picture into cells. part: { id, img, src: [x0, y0, x1, y1] in the picture's pixels,
// at: [x, y] where the box's top-left lands in the viewBox, scale: viewBox units per picture pixel (a
// number, or [x, y] to stretch), div: cells per picture glyph, grid?: a measured grid to reuse,
// remap?(x, y) → [x, y]: where in the picture to read a cell instead (to fill a hole), colour?(c) → c,
// mean?(x, y) → true: read that cell's mean colour instead of its brightest quarter (fine dark marks),
// glyphScale?: glyphs smaller than their cells (1 fills them), keep?(cell) → false to drop }.
// Returns the cells, each { part, i, j, x, y, c, raw, L, cover, hue, sat, val }, and sets part.S (one
// cell in viewBox units) and part.origin (the viewBox point of cell 0, 0).
export function readPart(part) {
  const { img, src: [sx0, sy0, sx1, sy1], div = 1.6 } = part
  const [kx, ky] = Array.isArray(part.scale) ? part.scale : [part.scale, part.scale]
  const g = part.grid ?? measureGrid(img, part.src, part.tMin, part.tMax)
  part.grid = g
  const tx = g.x.T / div, ty = g.y.T / div
  part.S = [tx * kx, ty * ky]
  part.origin = [part.at[0] + g.x.start * kx, part.at[1] + g.y.start * ky]
  const cells = []
  for (let j = 0, cy = sy0 + g.y.start; cy + ty <= sy1; cy += ty, j++) {
    for (let i = 0, cx = sx0 + g.x.start; cx + tx <= sx1; cx += tx, i++) {
      const [rx, ry] = part.remap ? part.remap(cx, cy) : [cx, cy]
      const s = sample(img, rx, ry, rx + tx, ry + ty, part.mean?.(cx, cy))
      const c = part.colour ? part.colour(s.c) : s.c
      const [hue, sat, val] = hsv(c)
      const cell = { part: part.id, i, j, x: part.at[0] + (cx - sx0) * kx, y: part.at[1] + (cy - sy0) * ky, sx: cx, sy: cy, c, raw: s.c, L: lum(c), cover: s.cover, hue, sat, val }
      if (part.keep && !part.keep(cell)) continue
      cells.push(cell)
    }
  }
  return cells
}

// Draws sets of cells. One instance per scene: it gathers every pattern tile in `defs`.
export function mosaic({ glyph, U = 10, GLYPH = 1.12 } = {}) {
  let defs = '', n = 0
  // pool a set of cells (of one part) into k colours; give each cell its glyph and tile
  function pool(ps, part, k) {
    if (!ps.length) return
    const [SW, SH] = part.S
    const fs = Math.min((SW / 0.602) * GLYPH, SH * 1.25) * (part.glyphScale ?? 1) // glyphScale: smaller glyphs in the same cells
    let cs = ps.filter((_, i) => i % Math.ceil(ps.length / k) === 0).slice(0, k).map(p => [...p.c])
    for (let it = 0; it < 12; it++) {
      const acc = cs.map(() => [0, 0, 0, 0])
      for (const p of ps) {
        let best = 0, bd = Infinity
        cs.forEach((c, j) => { const d = (c[0] - p.c[0]) ** 2 + (c[1] - p.c[1]) ** 2 + (c[2] - p.c[2]) ** 2; if (d < bd) { bd = d; best = j } })
        p.pool = best; const a = acc[best]; a[0] += p.c[0]; a[1] += p.c[1]; a[2] += p.c[2]; a[3]++
      }
      cs = cs.map((c, j) => (acc[j][3] ? acc[j].slice(0, 3).map(v => v / acc[j][3]) : c))
    }
    const ids = new Map()
    for (const p of ps) {
      p.ch = glyph(cs[p.pool], p)
      const key = `${part.id}|${p.pool}|${p.ch}`
      if (!ids.has(key)) {
        const id = `p${n++}`
        ids.set(key, id)
        const u = U / SW
        defs += `<pattern id="${id}" width="${U}" height="${U}" patternUnits="userSpaceOnUse"><text x="${f((U - 0.602 * fs * u) / 2)}" y="${f(U * 0.5 + fs * u * 0.36)}" style="fill:${hex(cs[p.pool])};font-size:${f(fs * u)}px;font-weight:700">${esc(p.ch)}</text></pattern>`
      }
      p.pid = ids.get(key)
    }
  }
  // cells of one part → a group in cell units, one path per tile, each run along a row one stroked line
  function shapes(ps, part) {
    if (!ps.length) return ''
    const [SW, SH] = part.S, by = new Map()
    for (const p of ps) { if (!by.has(p.pid)) by.set(p.pid, []); by.get(p.pid).push(p) }
    let g = ''
    for (const [id, list] of by) {
      list.sort((a, b) => a.j - b.j || a.i - b.i)
      let d = '', run = null, px = 0, py = 0
      const flush = () => {
        if (!run) return
        const x = run.i * U, y = run.j * U + U / 2
        d += `${d ? 'm' : 'M'}${x - px} ${y - py}h${run.n * U}`
        px = x + run.n * U; py = y
      }
      for (const p of list) {
        if (run && p.j === run.j && p.i === run.i + run.n) run.n++
        else { flush(); run = { i: p.i, j: p.j, n: 1 } }
      }
      flush()
      g += `<path d="${d}" stroke="url(#${id})" stroke-width="${U}"/>`
    }
    return `<g transform="translate(${f(part.origin[0])} ${f(part.origin[1])}) scale(${+(SW / U).toFixed(4)} ${+(SH / U).toFixed(4)})" fill="none">${g}</g>`
  }
  // the same cells as one solid shape in a flat colour (a backing that hides what lies under a part)
  function solid(ps, part, colour) {
    if (!ps.length) return ''
    const saved = ps.map(p => p.pid)
    for (const p of ps) p.pid = 'solid'
    const out = shapes(ps, part).replace('url(#solid)', colour)
    ps.forEach((p, i) => { p.pid = saved[i] })
    return out
  }
  return { pool, shapes, solid, get defs() { return defs }, get count() { return n } }
}
