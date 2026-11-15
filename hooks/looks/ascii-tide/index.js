import { problems, theme } from './palette.js'
import { SCENE } from './scene.js'

/** @type {import('../types').Look} */
export default {
  id: 'ascii-tide',
  label: 'ASCII tide',
  description: 'A sea of drifting glyphs under an ASCII moon; now and then a star falls in.',
  problems,
  args: {
    colors: theme,
    backdrop: { scene: 'ascii-tide', glass: { blur: 3, tint: '#06121b', opacity: 0.74 } },
  },
  scene: {
    source: SCENE,
    alt: 'A sea of ASCII characters rolling under a shaded ASCII moon, with stars and drifting clouds of glyphs',
  },
}
