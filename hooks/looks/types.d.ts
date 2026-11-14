import type { ThemeSetArgs } from 'claude-code'

/** One look: a theme, and the moving scene its backdrop names, if any. */
export type Look = {
  /** What `/look <id>` takes: lowercase letters, digits and hyphens. */
  id: string
  label: string
  description: string
  /** The contrast lines `makeColors` returned for this look's palette. */
  problems: readonly string[]
  args: ThemeSetArgs
  scene?: { source: string; alt: string }
}
