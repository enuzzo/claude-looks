// Glyphs placed in 3D, the way ASCII games like Effulgence draw their creatures: not a screen grid of
// cells, but characters set on the body's own surface, in rows that follow it and bend with it, seen in
// perspective, so near glyphs are larger and brighter, far ones smaller and dimmer, and colour runs along
// the body. Everything happens at build time; the scene gets plain <text> lists, one per size and colour.
import { clamp, len3 } from './ascii3d.mjs'

/**
 * Sample the top surface of `sdf` on a lattice in its own (x, z) plane and project what the camera sees.
 * opts: { x: [x0, x1], z: [z0, z1], step, elev (rad), yaw (rad), dist, focal, light, ramp,
 *   tag(x, y, z) → a label kept on the point (e.g. which part of a coat), tex(x, y, z) → a light multiplier }
 * Returns points { sx, sy, depth, v (light 0..1), u (−1..1 across z), x, y, z, tag, ch }.
 */
export function surface(sdf, opts) {
  const { x: [x0, x1], z: [z0, z1], step, elev = 1.1, yaw = 0, dist = 3.6, focal = 1, light = [0.3, 1, 0.5], ramp = ' .:-=+!*#%', tag, tex } = opts
  const ce = Math.cos(elev), se = Math.sin(elev), cy = Math.cos(yaw), sy = Math.sin(yaw)
  const d = [0, -se, -ce], up = [0, ce, -se] // view direction and screen up, as in ascii3d.mjs
  const ll = len3(...light), L = light.map(v => v / ll)
  const span = Math.max(Math.abs(z0), Math.abs(z1))
  const out = []
  let row = 0
  for (let x = x0; x <= x1; x += step, row++) {
    for (let z = z0 + (row % 2) * step * 0.5; z <= z1; z += step) {
      // drop onto the top surface along −y
      let y = 0.6, hit = false
      for (let i = 0; i < 80 && y > -0.6; i++) {
        const s = sdf(x, y, z)
        if (s < 0.0012) { hit = true; break }
        y -= Math.max(s * 0.7, 0.002)
      }
      if (!hit) continue
      const e = 0.003
      let nx = sdf(x + e, y, z) - sdf(x - e, y, z), ny = sdf(x, y + e, z) - sdf(x, y - e, z), nz = sdf(x, y, z + e) - sdf(x, y, z - e)
      const nl = len3(nx, ny, nz) || 1
      nx /= nl; ny /= nl; nz /= nl
      // turn the body by yaw (about y) before the camera tilts
      const wx = x * cy - z * sy, wz = x * sy + z * cy
      const wnx = nx * cy - nz * sy, wnz = nx * sy + nz * cy
      // seen at all? facing the camera, and nothing of the body between it and the camera
      if (wnx * d[0] + ny * d[1] + wnz * d[2] > 0.05) continue
      let occluded = false
      for (let t = 0.03; t < 2; ) {
        // back in body space: undo the yaw on the ray's point
        const px = wx - d[0] * t, py = y - d[1] * t, pz = wz - d[2] * t
        const bx = px * cy + pz * sy, bz = -px * sy + pz * cy
        const s = sdf(bx, py, bz)
        if (s < 0.002) { occluded = true; break }
        t += Math.max(s * 0.8, 0.01)
      }
      if (occluded) continue
      const depth = wx * d[0] + y * d[1] + wz * d[2] // + is away from the camera
      const k = focal * dist / (dist + depth)
      const sx = wx * k, syy = (wx * up[0] + y * up[1] + wz * up[2]) * k
      const diff = Math.max(0, wnx * L[0] + ny * L[1] + wnz * L[2])
      const facing = Math.abs(wnx * d[0] + ny * d[1] + wnz * d[2])
      const rim = (1 - facing) ** 2
      const v = clamp((0.18 + 0.62 * diff + 0.35 * rim) * (tex ? tex(x, y, z) : 1), 0, 1)
      out.push({ sx, sy: -syy, depth, k, v, u: z / span, x, y, z, tag: tag ? tag(x, y, z) : undefined })
    }
  }
  // the glyph from the light, stretched over this frame's own range so the whole ramp is used
  const vs = out.map(p => p.v), v0 = Math.min(...vs), v1 = Math.max(...vs)
  for (const p of out) {
    const vn = v1 > v0 ? (p.v - v0) / (v1 - v0) : 0.5
    p.ch = ramp[Math.min(ramp.length - 1, 1 + Math.floor(vn * (ramp.length - 1.001)))]
  }
  return out
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const f = n => +n.toFixed(1)

/**
 * Points → <text> elements, grouped by glyph size and colour so each group is one list.
 * opts: { scale (viewBox units per world unit), size (font size at k = 1), sizes (buckets), colour(p) → [hex, opacity] }
 */
export function glyphSvg(points, { scale, size, sizes = 3, colour }) {
  if (!points.length) return ''
  const ks = points.map(p => p.k), kmin = Math.min(...ks), kmax = Math.max(...ks)
  const groups = new Map()
  for (const p of points) {
    const b = kmax === kmin ? 0 : Math.min(sizes - 1, Math.floor(((p.k - kmin) / (kmax - kmin)) * sizes))
    const fs = f(size * (kmin + ((b + 0.5) / sizes) * (kmax - kmin)))
    const [hex, op] = colour(p)
    const key = `${fs}|${hex}|${op}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(p)
  }
  let out = ''
  // far and dim first, near and bright last
  for (const [key, ps] of [...groups].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))) {
    const [fs, hex, op] = key.split('|')
    // centred by hand (a monospace glyph is 0.6 em wide; its middle sits ~0.35 em above the baseline):
    // text-anchor and dominant-baseline on a list of positions cost more to draw
    const dx = 0.3 * fs, dy = 0.35 * fs
    out += `<text font-size="${fs}" fill="${hex}"${op === '1' ? '' : ` fill-opacity="${op}"`} x="${ps.map(p => f(p.sx * scale - dx)).join(' ')}" y="${ps.map(p => f(p.sy * scale + dy)).join(' ')}">${esc(ps.map(p => p.ch).join(''))}</text>`
  }
  return out
}
