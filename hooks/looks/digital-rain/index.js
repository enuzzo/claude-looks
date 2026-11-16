import { problems, theme } from './palette.js'
import * as SCENE_MODULE from './scene.js'

const { SCENE } = SCENE_MODULE

/** @type {import('../types').Look} */
export default {
  id: 'digital-rain',
  label: 'Digital rain',
  description: 'A slow curtain of green glyph rain at the right edge of a dark screen, bright green accents.',
  problems,
  args: {
    colors: theme,
    backdrop: { id: 'digital-rain', glass: { blur: 3, tint: '#050c07', opacity: 0.3 } },
  },
  scene: {
    source: SCENE,
    poster: /** @type {{ POSTER?: string }} */ (SCENE_MODULE).POSTER,
    alt: 'Slow drops of light falling down columns of green katakana along the right edge of a dark screen',
  },
}
