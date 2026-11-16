// A diagnostic, not a look: abyssal with one part taken out in each variant (tools/scenes/lab.mjs).
// Taken out again once the cause is found.
import { problems, theme } from '../abyssal/palette.js'
import { VARIANTS } from './scenes.js'

/** @type {import('../types').Look[]} */
export const LAB = VARIANTS.map(v => ({
  id: v.id,
  label: `Lab: ${v.label}`,
  description: `Abyssal, ${v.label}: a test of what stops a backdrop in the desktop app.`,
  problems,
  args: { colors: theme, backdrop: { id: v.id, glass: { blur: 6, tint: '#041820', opacity: 0.34 } } },
  scene: { source: v.source, alt: `Abyssal, ${v.label}` },
}))
