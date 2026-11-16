// A tiny build-time raymarcher: renders a signed distance field to shaded ASCII, frame by frame.
// The scenes cannot run script, so the 3D happens here, in Node, and the scene only flips frames.

export const RAMP = ' .,:;=+*#%@'

// ── vector helpers on plain arrays
export const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z)
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export function smin(a, b, k) {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1)
  return b * (1 - h) + a * h - k * h * (1 - h)
}
// a good-enough ellipsoid distance (Quilez)
export function ellipsoid(x, y, z, rx, ry, rz) {
  const k0 = len3(x / rx, y / ry, z / rz)
  const k1 = len3(x / (rx * rx), y / (ry * ry), z / (rz * rz))
  return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1
}
export function capsule(x, y, z, ax, ay, az, bx, by, bz, r) {
  const px = x - ax, py = y - ay, pz = z - az, bax = bx - ax, bay = by - ay, baz = bz - az
  const h = clamp((px * bax + py * bay + pz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1)
  return len3(px - bax * h, py - bay * h, pz - baz * h) - r
}
// rotate (a, b) by angle t, returns [a', b']
export const rot = (a, b, t) => [a * Math.cos(t) - b * Math.sin(t), a * Math.sin(t) + b * Math.cos(t)]

/**
 * Render one frame. sdf(x, y, z) -> distance; tex(x, y, z, nx, ny, nz) -> brightness multiplier (optional).
 * view: { cols, rows, dx, aspect, elev (rad), cx, cy } — cell size dx in world units, rows are aspect× taller.
 * Returns rows of [char, level 0..1].
 */
export function render(sdf, view, tex) {
  const { cols, rows, dx, aspect = 1.83, elev = 0, cx = 0, cy = 0, light = [0.35, 1, 0.45], ramp = RAMP } = view
  const ce = Math.cos(elev), se = Math.sin(elev)
  // camera looks along d, with up u and right +x
  const d = [0, -se, -ce], u = [0, ce, -se]
  const ll = len3(...light), L = light.map(v => v / ll)
  const out = []
  for (let r = 0; r < rows; r++) {
    const row = []
    for (let c = 0; c < cols; c++) {
      const sx = cx + (c - cols / 2 + 0.5) * dx
      const sy = cy - (r - rows / 2 + 0.5) * dx * aspect
      let ox = sx, oy = u[1] * sy - d[1] * 6, oz = u[2] * sy - d[2] * 6
      let t = 0, hit = false
      for (let i = 0; i < 110 && t < 12; i++) {
        const dist = sdf(ox + d[0] * t, oy + d[1] * t, oz + d[2] * t)
        if (dist < 0.0015) { hit = true; break }
        t += dist * 0.6
      }
      if (!hit) { row.push([' ', 0, Infinity]); continue }
      const px = ox + d[0] * t, py = oy + d[1] * t, pz = oz + d[2] * t
      const e = 0.003
      let nx = sdf(px + e, py, pz) - sdf(px - e, py, pz)
      let ny = sdf(px, py + e, pz) - sdf(px, py - e, pz)
      let nz = sdf(px, py, pz + e) - sdf(px, py, pz - e)
      const nl = len3(nx, ny, nz) || 1
      nx /= nl; ny /= nl; nz /= nl
      const diff = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2])
      const facing = Math.abs(nx * d[0] + ny * d[1] + nz * d[2])
      const rim = (1 - facing) ** 3
      // a half vector for a small wet highlight
      const hx = L[0] - d[0], hy = L[1] - d[1], hz = L[2] - d[2], hl = len3(hx, hy, hz)
      const spec = Math.max(0, (nx * hx + ny * hy + nz * hz) / hl) ** 24
      let v = 0.1 + 0.62 * diff + 0.28 * rim + 0.5 * spec
      if (tex) v *= tex(px, py, pz, nx, ny, nz)
      v = clamp(v, 0.06, 1)
      row.push([ramp[Math.min(ramp.length - 1, 1 + Math.floor(v * (ramp.length - 1)))], v, t])
    }
    out.push(row)
  }
  return edges(out)
}

// Outline the silhouette (and sharp depth steps) with glyphs that follow its direction, so a shape
// reads at a glance; the inside keeps its shading.
function edges(img) {
  const H = img.length, W = img[0].length
  const solid = (r, c) => r >= 0 && r < H && c >= 0 && c < W && img[r][c][0] !== ' '
  const depth = (r, c) => (solid(r, c) ? img[r][c][2] : Infinity)
  return img.map((row, r) => row.map((cell, c) => {
    if (cell[0] === ' ') return cell
    const z = cell[2]
    const out = (rr, cc) => !solid(rr, cc) || depth(rr, cc) - z > 0.6
    // a cell is on the edge when one of its four neighbours is outside
    if (!(out(r, c + 1) || out(r, c - 1) || out(r + 1, c) || out(r - 1, c))) return cell
    // Sobel on the outside mask gives the edge normal; the cells are taller than wide
    const o = (dr, dc) => (out(r + dr, c + dc) ? 1 : 0)
    const gx = o(-1, 1) + 2 * o(0, 1) + o(1, 1) - o(-1, -1) - 2 * o(0, -1) - o(1, -1)
    const gy = (o(1, -1) + 2 * o(1, 0) + o(1, 1) - o(-1, -1) - 2 * o(-1, 0) - o(-1, 1)) / 1.83
    if (gx === 0 && gy === 0) return cell
    const a = ((Math.atan2(gy, gx) * 180) / Math.PI + 360) % 180 // normal direction, 0..180
    let ch
    if (a < 22.5 || a >= 157.5) ch = '|'
    else if (a < 67.5) ch = '/'
    else if (a < 112.5) ch = gy > 0 ? '_' : '-'
    else ch = '\\'
    return [ch, Math.max(cell[1], 0.55), z]
  }))
}

/** Trim blank margins shared by all frames. */
export function trim(frames) {
  let r0 = Infinity, r1 = -1, c0 = Infinity, c1 = -1
  for (const f of frames) f.forEach((row, r) => row.forEach(([ch], c) => {
    if (ch !== ' ') { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c) }
  }))
  return frames.map(f => f.slice(r0, r1 + 1).map(row => row.slice(c0, c1 + 1)))
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * One frame as SVG: a <text> per row, runs of a brightness band in a <tspan class>.
 * bands: thresholds ascending, e.g. [.3, .55, .8] -> classes p0..p3 (prefix).
 */
export function frameSvg(frame, { cw, ch, prefix, bands, plain = false }) {
  const band = v => { let k = 0; while (k < bands.length && v >= bands[k]) k++; return k }
  if (plain) {
    // one <text> per row: the glyphs carry the shading, the fill (a gradient) the colour
    let s = ''
    frame.forEach((row, r) => {
      const line = row.map(c => c[0]).join('').replace(/\s+$/, '')
      const start = line.length - line.trimStart().length
      if (line.trim()) s += `<text x="${+(start * cw).toFixed(1)}" y="${+(r * ch).toFixed(1)}">${esc(line.trimStart())}</text>`
    })
    return s
  }
  let s = ''
  frame.forEach((row, r) => {
    let end = row.length
    while (end > 0 && row[end - 1][0] === ' ') end--
    let start = 0
    while (start < end && row[start][0] === ' ') start++
    if (start >= end) return
    let line = '', cur = -1, run = ''
    const flush = () => { if (run) line += cur < 0 ? esc(run) : `<tspan class="${prefix}${cur}">${esc(run)}</tspan>`; run = '' }
    for (let c = start; c < end; c++) {
      const [chr, v] = row[c]
      const b = chr === ' ' ? cur : band(v)
      if (b !== cur) { flush(); cur = b }
      run += chr
    }
    flush()
    s += `<text x="${+(start * cw).toFixed(1)}" y="${+(r * ch).toFixed(1)}">${line}</text>`
  })
  return s
}
