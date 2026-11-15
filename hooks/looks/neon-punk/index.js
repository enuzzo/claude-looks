import { problems, theme } from './palette.js'
import { SCENE } from './scene.js'

/** @type {import('../types').Look} */
export default {
  id: 'neon-punk',
  label: 'Neon punk',
  description: 'Grimy brick wall, flickering neon tubes, paint drips, acid green accents.',
  problems,
  args: {
    colors: theme,
    backdrop: { scene: 'neon-punk', glass: { blur: 16, tint: '#16121a', opacity: 0.6 } },
  },
  scene: {
    source: SCENE,
    alt: 'Flickering neon shapes and paint drips on a dark brick wall',
  },
}
