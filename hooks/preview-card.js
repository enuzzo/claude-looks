// A small card for `/look preview`: the look's poster (or its page color) with a
// mock chat panel per mode in the look's own colors. Pure: takes a Look, returns
// an SVG string the desktop and mobile apps draw with `Svg`.

const W = 320
const H = 180

// Which ramp step each surface and text sits on, per mode, as make-colors.js maps them.
const RAMP = {
  dark: { s0: 900, s1: 850, t1: 50, t2: 200, t3: 400, role: 300, success: 400 },
  light: { s0: 20, s1: 10, t1: 900, t2: 600, t3: 400, role: 600, success: 600 },
}

/** @param {Record<string, string>} c @param {'light' | 'dark'} mode */
function colorsOf(c, mode) {
  const r = RAMP[mode]
  /** @param {string} name */
  const role = name => c[`role-${name}-${name === 'success' ? r.success : r.role}`] ?? c[`role-${name}-fill`] ?? '#888888'
  return {
    s0: c[`gray-${r.s0}`] ?? '#202020',
    s1: c[`gray-${r.s1}`] ?? '#262626',
    t1: c[`gray-${r.t1}`] ?? '#eeeeee',
    t2: c[`gray-${r.t2}`] ?? '#bbbbbb',
    t3: c[`gray-${r.t3}`] ?? '#999999',
    fill: c['role-accent-fill'] ?? role('accent'),
    success: role('success'),
    warning: role('warning'),
    danger: role('danger'),
    pro: role('pro'),
  }
}

/** @param {ReturnType<typeof colorsOf>} p @param {number} x @param {number} w @param {number} opacity */
function panel(p, x, w, opacity) {
  const y = 92
  const h = 74
  /** @param {number} dy @param {number} frac @param {string} fill */
  const bar = (dy, frac, fill) =>
    `<rect x="${x + 12}" y="${y + dy}" width="${Math.round((w - 24) * frac)}" height="6" rx="3" fill="${fill}"/>`
  const dots = [p.success, p.warning, p.danger, p.pro]
    .map((fill, i) => `<circle cx="${x + 16 + i * 13}" cy="${y + h - 14}" r="4" fill="${fill}"/>`)
    .join('')
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${p.s1}" fill-opacity="${opacity}" stroke="${p.t3}" stroke-opacity=".25"/>`
    + bar(12, 0.72, p.t1) + bar(24, 0.5, p.t2) + bar(36, 0.38, p.t3)
    + `<rect x="${x + w - 46}" y="${y + h - 22}" width="34" height="14" rx="7" fill="${p.fill}"/>`
    + dots
}

/** @param {import('./looks/types').Look} look */
export function previewCard(look) {
  /** @type {{ light?: Record<string, string>, dark?: Record<string, string> }} */
  const inputs = /** @type {any} */ (look.args.colors)?.inputs ?? {}
  /** @type {('light' | 'dark')[]} */
  const modes = []
  if (inputs.light !== undefined) modes.push('light')
  if (inputs.dark !== undefined) modes.push('dark')
  const first = modes[0] ?? 'dark'
  const ground = colorsOf(inputs[first] ?? {}, first).s0
  const backdrop = look.args.backdrop
  const glass = backdrop !== undefined && ('id' in backdrop || 'scene' in backdrop) ? /** @type {any} */ (backdrop).glass : undefined
  const opacity = glass ? Math.max(0.7, glass.opacity ?? 0.6) : 0.92
  // the still poster, never the live scene: sixteen animated scenes in one message is more than the app draws
  const scene = look.scene?.poster ?? ''
  const gap = 10
  const width = modes.length > 1 ? (W - 24 - gap) / 2 : W - 24
  const panels = modes.map((mode, i) => panel(colorsOf(inputs[mode] ?? {}, mode), 12 + i * (width + gap), width, opacity)).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`
    + `<clipPath id="card"><rect width="${W}" height="${H}" rx="12"/></clipPath>`
    + `<g clip-path="url(#card)"><rect width="${W}" height="${H}" fill="${ground}"/>${scene}${panels}</g>`
    + `</svg>`
}
