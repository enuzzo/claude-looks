// The signed distance field of the koi, seen from above.
// The camera looks straight down (elev = π/2), so the screen shows the x–z plane, +z towards the viewer's feet.
import { clamp, rot } from './ascii3d.mjs'

// colour tags a koi cell can carry
export const WHITE = 0, RED = 1, FIN = 2, SUMI = 3

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

// Proportions follow the golden ratio where the form allows: the body (nose to tail stock) is φ³ times as
// long as it is broad, its broadest point sits at the golden section of that length from the nose, the
// tail veil is the body's length over φ², and the circle it swims has a radius of φ body units.
export const PHI = (1 + Math.sqrt(5)) / 2
const NOSE = 1.04, STOCK = -0.97 // the body runs from NOSE to STOCK along the spine
const LEN = NOSE - STOCK
const HALF = LEN / PHI ** 3 / 2 // half-breadth at the shoulders
const SHOULDER = NOSE - LEN / PHI ** 2 // where it is broadest
const TIP = STOCK + 0.1 - LEN / PHI ** 2 // the end of the tail veil
const FULL = NOSE - TIP // nose to tail tip: the body length L of the swimming model
// the caudal fin of a long-finned koi, spread on the water: a slender forked veil
const TAIL = [[-0.82, 0.045], [-1.08, 0.13], [-1.36, 0.25], [TIP, 0.33], [TIP + 0.08, 0.19], [TIP + 0.19, 0.07], [TIP + 0.24, 0], [TIP + 0.19, -0.07], [TIP + 0.08, -0.19], [TIP, -0.33], [-1.36, -0.25], [-1.08, -0.13], [-0.82, -0.045]]
// a leaf-shaped fin lying along +u from its hinge: length 2a, half-width b
const leaf = (u, v, a, b) => (Math.hypot((u - a) / a, v / b) - 1) * b

// ── stroke and glide. A koi does not beat like a metronome: a slow stroke of the tail, then a long glide
// in which the wave dies down and the body straightens. Over one cycle (τ from 0 to 1) the amplitude
// swells and fades, and the wave's phase advances by one whole turn, quickly while the stroke is strong
// and hardly at all in the glide.
const strength = tau => 0.26 + 0.74 * (0.5 + 0.5 * Math.cos(2 * Math.PI * (tau - 0.3))) ** 1.5
const RATE = tau => 0.3 + strength(tau)
const STEPS = 720
const PHASE = (() => {
  const acc = [0]
  for (let i = 0; i < STEPS; i++) acc.push(acc[i] + RATE((i + 0.5) / STEPS))
  return acc.map(v => (v / acc[STEPS]) * 2 * Math.PI)
})()
export const stroke = tau => {
  const x = (((tau % 1) + 1) % 1) * STEPS, i = Math.floor(x)
  return { a: strength(tau), phase: PHASE[i] + (PHASE[i + 1] - PHASE[i]) * (x - i) }
}

/**
 * A koi, nose towards +x, at the point τ (0..1) of its stroke-and-glide cycle. The spine is bent twice:
 * to the arc of the circle it swims (radius `radius`, so the whole body follows its path through the
 * turn), and by the carangiform body wave h(u, t) = A(u) sin(2π(u/λ − t/T)), with the envelope
 * A(u) = 0.02 − 0.08u + 0.16u² in body lengths (u = 0 at the nose, 1 at the tail tip; Videler & Hess's
 * fit): the head hardly moves, the front third stays stiff, the tail sweeps about a tenth of its length.
 * The cross-section turns with the spine's tangent, so the body bends instead of shearing.
 * `turn`: +1 the circle's centre lies at +z (on screen it turns clockwise), -1 at -z (counter-clockwise).
 * `marks`: the red patches of its coat, ellipses [s, z, rs, rz] along the back; `spots`: smaller ink
 * marks, given the same way and counted only where no red lies. The cells carry the tags RED and SUMI,
 * and a scene colours them as each koi's coat asks (a kohaku leaves the ink white, an ogon wears one colour).
 * Returns { sdf, tex, tag }.
 */
export function koi(tau, { radius = PHI, turn = 1, marks = [], spots = [] } = {}) {
  const { a, phase } = stroke(tau)
  const K = (2 * Math.PI) / FULL // one wavelength along the body
  const wave = s => {
    const u = clamp((NOSE - s) / FULL, 0, 1.05)
    return a * FULL * (0.02 - 0.08 * u + 0.16 * u * u) * Math.sin(K * s + phase)
  }
  // world → body coordinates: s along the spine, zb across it
  const local = (x, z) => {
    const c = turn * radius
    const s0 = radius * Math.atan2(x, turn * (c - z)), z0 = turn * (radius - Math.hypot(x, z - c))
    const h = wave(s0), slope = (wave(s0 + 0.01) - wave(s0 - 0.01)) / 0.02
    const n = 1 + slope * slope
    return [s0 + ((z0 - h) * slope) / n, (z0 - h) / Math.sqrt(n)]
  }
  const parts = (x, y, z) => {
    const [s, zb] = local(x, z)
    // body: a rounded head, broadest at the shoulders, tapering evenly into the tail stock
    const p = (s - SHOULDER) / (NOSE - SHOULDER), q = clamp((SHOULDER - s) / (SHOULDER - STOCK), 0, 1)
    const w = s > SHOULDER ? HALF * (1 - clamp(p, 0, 1) ** 2) ** 0.72 : HALF - (HALF - 0.065) * q ** 2.2
    const body = Math.max(Math.hypot(zb, y * 1.08) - w, s - NOSE, STOCK - s) * 0.6
    // the tail veil is heavy: it trails the spine, its tips most of all
    const v = clamp((-0.85 - s) / 0.8, 0, 1)
    const zt = zb - a * 0.08 * v * v * Math.sin(K * s + phase - 1.1 - 1.8 * Math.abs(zb))
    let edge = poly2(s, zt * 1.2, TAIL) - 0.01 // how far inside a fin's outline, for its shading
    let fin = Math.max(edge, Math.abs(y + 0.02 + 0.05 * v) - 0.016)
    for (const side of [-1, 1]) {
      // pectorals: rounded paddles, held wider in the glide, sculling gently and out of step
      let [qx, qz] = [s - 0.52, side * zb - 0.15]
      ;[qx, qz] = rot(qx, qz, -(2.25 - 0.3 * (1 - a) + 0.2 * Math.sin(phase + side * 1.3)))
      const pe = leaf(qx, qz, 0.25, 0.14)
      fin = Math.min(fin, Math.max(pe, Math.abs(y + 0.06 + 0.12 * qx) - 0.014))
      // pelvics: small, swept back
      let [rx, rz] = [s + 0.14, side * zb - 0.15]
      ;[rx, rz] = rot(rx, rz, -(2.6 + 0.12 * Math.sin(phase + side * 1.3 - 0.8)))
      const ve = leaf(rx, rz, 0.13, 0.07)
      fin = Math.min(fin, Math.max(ve, Math.abs(y + 0.07 + 0.12 * rx) - 0.012))
      edge = Math.min(edge, pe, ve)
    }
    return [body, fin, s, zb, edge]
  }
  const inside = list => (s, zb) => list.some(([ms, mz, rs, rz]) => {
    const p = (s - ms) / rs, q = (zb - mz) / rz
    // a ragged edge, fixed to the body
    return p * p + q * q < 1 + 0.22 * Math.sin(19 * s + 3 * ms) * Math.sin(27 * zb + 5 * mz)
  })
  const red = inside(marks), ink = inside(spots)
  return {
    sdf: (x, y, z) => { const [b, f] = parts(x, y, z); return Math.min(b, f) * 0.7 },
    tag: (x, y, z) => { const [b, f, s, zb] = parts(x, y, z); return f < b ? FIN : red(s, zb) ? RED : ink(s, zb) ? SUMI : WHITE },
    // fins are thin and let the water through, ribbed by their rays; scales catch the light in a faint lattice
    tex: (x, y, z) => {
      const [b, f, s, zb, edge] = parts(x, y, z)
      // a fin is a veil of dots, fainter still along its rim
      if (f < b) return edge > -0.03 ? 0.09 : 0.25 + 0.06 * Math.sin(46 * zb + 6 * s)
      const lattice = Math.sin(33 * s + 38 * zb) * Math.sin(33 * s - 38 * zb)
      // the dorsal line: a thin darker seam down the back
      const seam = Math.abs(zb) < 0.02 && s > -0.5 && s < 0.3 ? 0.7 : 1
      return ((red(s, zb) ? 0.84 : 1.12) + 0.1 * lattice) * seam
    },
  }
}
