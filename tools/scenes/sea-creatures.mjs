// Signed distance fields of the abyssal animals, each a function of the swim phase t (0..2π).
// All face +x; `dir = -1` mirrors one to swim the other way.
import { capsule, clamp, ellipsoid, len3, rot, smin } from './ascii3d.mjs'

// ── a silver fish: a body that bends in a travelling wave, a forked tail, a dorsal fin
export function fish(t, dir = 1) {
  return (x, y, z) => {
    x *= dir
    const back = clamp((0.6 - x) / 1.6, 0, 1)
    z -= 0.22 * back * back * Math.sin(t - 3.2 * x)
    let d = ellipsoid(x - 0.05, y, z, 0.85, 0.3, 0.14)
    // forked tail: two lobes swept back
    d = smin(d, ellipsoid(x + 0.95, y - 0.16, z, 0.2, 0.2, 0.03), 0.06)
    d = smin(d, ellipsoid(x + 0.95, y + 0.16, z, 0.2, 0.2, 0.03), 0.06)
    d = smin(d, ellipsoid(x + 0.05, y - 0.28, z, 0.28, 0.1, 0.02), 0.04)
    return d
  }
}

// ── a green turtle: a domed carapace with a flat plastron, a head on a short neck, long front
// flippers making the flying stroke (down and back fast, up and forward slow), small rear paddles
export function turtle(t, dir = 1) {
  // a power stroke over the first ~40% of the cycle, recovery over the rest
  const s = t / (2 * Math.PI)
  const ph = s < 0.4 ? (s / 0.4) * Math.PI : Math.PI + ((s - 0.4) / 0.6) * Math.PI
  const flap = 0.6 * Math.cos(ph) // + up, - down
  const sweep = 0.55 * Math.sin(ph) - 0.1 // + swept back during the power stroke
  return (x, y, z) => {
    x *= dir
    let d = Math.max(ellipsoid(x, y, z, 0.82, 0.33, 0.66), -y - 0.04)
    d = smin(d, ellipsoid(x - 1.0, y - 0.02, z, 0.27, 0.15, 0.19), 0.12)
    for (const side of [-1, 1]) {
      // front flipper: hinge at the shoulder, flap about x, sweep about y
      let qx = x - 0.42, qy = y + 0.02, qz = z - side * 0.45
      ;[qz, qy] = rot(qz, qy, side * flap)
      ;[qx, qz] = rot(qx, qz, side * sweep)
      d = smin(d, ellipsoid(qx + 0.1 - Math.abs(qz) * 0.3, qy, qz - side * 0.45, 0.17, 0.04, 0.5), 0.06)
      // rear paddle
      let rx = x + 0.72, ry = y + 0.03, rz = z - side * 0.3
      ;[rz, ry] = rot(rz, ry, side * 0.25 * Math.sin(t + 1))
      d = smin(d, ellipsoid(rx + 0.1, ry, rz - side * 0.12, 0.2, 0.03, 0.15), 0.05)
    }
    return d
  }
}
// scutes: darken along the borders of hexagonal cells on the carapace
export function turtleTex(dir = 1) {
  return (x, y, z) => {
    x *= dir
    if (y < 0.02 || x > 0.82) return x > 0.82 ? 1.05 : 0.95
    const u = x * 3.2, v = z * 3.2
    const a = Math.abs(((u + 0.5 * Math.floor(v + 0.5)) % 1 + 1) % 1 - 0.5)
    const b = Math.abs(((v % 1) + 1) % 1 - 0.5)
    const edge = Math.min(0.5 - a, 0.5 - b)
    return edge < 0.07 ? 0.55 : 1.05
  }
}

// a 2D polygon distance (signed), vertices [[x, z], ...]
function poly2(px, pz, V) {
  let d = Infinity, s = 1
  for (let i = 0, j = V.length - 1; i < V.length; j = i++) {
    const [ax, az] = V[j], [bx, bz] = V[i]
    const ex = bx - ax, ez = bz - az, wx = px - ax, wz = pz - az
    const h = clamp((wx * ex + wz * ez) / (ex * ex + ez * ez), 0, 1)
    d = Math.min(d, Math.hypot(wx - ex * h, wz - ez * h))
    const c1 = pz >= az, c2 = pz < bz, c3 = ex * wz > ez * wx
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s
  }
  return s * d
}

// ── a manta from above: swept wings that flap with a wave running out to the tips, cephalic fins, a whip tail
const MANTA = [[0.64, 0], [0.56, 0.3], [0.32, 0.76], [0.02, 1.16], [-0.3, 1.4], [-0.56, 1.48], [-0.3, 1.05], [-0.14, 0.66], [-0.16, 0.32], [-0.42, 0.12], [-0.48, 0], [-0.42, -0.12], [-0.16, -0.32], [-0.14, -0.66], [-0.3, -1.05], [-0.56, -1.48], [-0.3, -1.4], [0.02, -1.16], [0.32, -0.76], [0.56, -0.3]]
export function manta(t, dir = 1) {
  return (x, y, z) => {
    x *= dir
    const az = Math.abs(z)
    const bend = 0.3 * Math.sin(t - 1.4 * az) * az ** 1.5
    const qy = y - bend + 0.12 * az * az * Math.sin(t - 0.4)
    const th = 0.11 * (1 - Math.min(1, az / 1.35)) ** 1.2 + 0.012
    let d = Math.max(poly2(x, z, MANTA), Math.abs(qy) - th) * 0.7
    d = smin(d, ellipsoid(x - 0.05, y - 0.03, z, 0.5, 0.11, 0.24), 0.08)
    for (const side of [-1, 1]) d = Math.min(d, ellipsoid(x - 0.68, y, z - side * 0.2, 0.15, 0.035, 0.05))
    d = Math.min(d, capsule(x, y, z, -0.42, 0, 0, -1.25, 0.02 * Math.sin(t), 0, 0.035))
    return d
  }
}

// ── a humpback, side on: a long tapered body with a wave in its tail stock, flukes that rise and fall,
// long pectoral fins, a small dorsal hump, grooves under the throat
export function whale(t, dir = 1) {
  return (x, y, z) => {
    x *= dir
    const back = clamp((0.2 - x) / 2.1, 0, 1)
    y -= 0.2 * back * back * Math.sin(t - 1.3 * x)
    const k = (x - 0.25) / 1.95
    const r = 0.42 * Math.max(0, 1 - k * k) ** 0.7 * (x > 1.4 ? 1 - (x - 1.4) * 0.35 : 1)
    let d = Math.max(Math.abs(x - 0.2) - 2.05, (Math.hypot(y * 1.05 + (x > 0.8 ? (x - 0.8) * 0.12 : 0), z) - r)) * 0.8
    // flukes: wide, thin, swept back, tilted by the beat
    const fy = y - 0.04 * Math.cos(t)
    d = smin(d, ellipsoid(x + 1.95 + Math.abs(z) * 0.35, fy, z, 0.2, 0.03, 0.62), 0.08)
    d = smin(d, ellipsoid(x + 0.55, y - 0.36, z, 0.16, 0.07, 0.03), 0.08)
    for (const side of [-1, 1]) {
      let qx = x - 0.75, qy = y + 0.22, qz = z - side * 0.3
      ;[qx, qy] = rot(qx, qy, 0.65 + 0.06 * Math.sin(t))
      ;[qz, qy] = rot(qz, qy, side * 0.35)
      d = smin(d, ellipsoid(qx + 0.55, qy, qz, 0.62, 0.03, 0.1), 0.06)
    }
    return d
  }
}
export function whaleTex(dir = 1) {
  return (x, y, z) => {
    x *= dir
    // ventral pleats under the head, a paler belly
    if (y < -0.12 && x > 0.4) return 0.75 + 0.35 * (Math.sin(y * 70) > 0 ? 1 : 0)
    return y < -0.2 ? 1.1 : 0.95
  }
}

// ── a moon jelly bell: a thin dome that contracts and relaxes
export function jellyBell(t) {
  const s = t / (2 * Math.PI)
  const c = s < 0.25 ? Math.sin((s / 0.25) * Math.PI / 2) : Math.cos(((s - 0.25) / 0.75) * Math.PI / 2)
  const rx = 0.9 - 0.18 * c, ry = 0.55 + 0.12 * c
  return (x, y, z) => {
    const outer = ellipsoid(x, y, z, rx, ry, rx)
    const inner = ellipsoid(x, y + 0.08, z, rx - 0.08, ry - 0.1, rx - 0.08)
    return Math.max(Math.max(outer, -inner), -y - 0.05)
  }
}
