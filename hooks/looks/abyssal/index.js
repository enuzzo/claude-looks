import { problems, theme } from './palette.js'
import { SCENE } from './scene.js'

/** @type {import('../types').Look} */
export default {
  id: 'abyssal',
  label: 'Abyssal',
  description: 'Slow teal water in ASCII: a raymarched turtle, manta and humpback, moon jellies, a drifting school of glyph fish.',
  problems,
  args: {
    colors: theme,
    backdrop: { id: 'abyssal', glass: { blur: 6, tint: '#041820', opacity: 0.34 } },
  },
  scene: {
    source: SCENE,
    alt: 'Dark teal open water under faint shafts of light, its animals made of ASCII characters: a green turtle, a manta ray, a humpback and calf far off, moon jellies and a school of tiny glyph fish',
  },
}
