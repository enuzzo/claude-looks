import type { ThemeSetArgs } from 'claude-code'

/** The moving scene a backdrop names. */
export type LookScene = { source: string; alt: string }

/** One look: a theme, and the moving scene its backdrop names, if any. */
export type Look = {
  /** What `/look <id>` takes: lowercase letters, digits and hyphens. */
  id: string
  label: string
  description: string
  /** The contrast lines `makeColors` returned for this look's palette. */
  problems: readonly string[]
  args: ThemeSetArgs
  /**
   * The moving scene its backdrop names, and a still poster of it (a small SVG,
   * under 12,000 characters) that `/look preview` draws in its place.
   */
  scene?: LookScene & { poster?: string }
  /**
   * A daylight dress, for a look that follows the time of day: worn in place of
   * `args` and `scene` when the look is put on (at session start, or by `/look`)
   * while the local hour is at or after `hours[0]` and before `hours[1]`. Its
   * backdrop carries its own id.
   */
  day?: { hours: readonly [number, number]; args: ThemeSetArgs; scene?: LookScene }
}
