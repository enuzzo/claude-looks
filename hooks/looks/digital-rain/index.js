import { problems, theme } from './palette.js'
import { SCENE } from './scene.js'

/** @type {import('../types').Look} */
export default {
  id: 'digital-rain',
  label: 'Digital rain',
  description: 'Green glyphs raining down the edges of a black screen, bright green accents.',
  problems,
  args: {
    colors: theme,
    backdrop: { scene: 'digital-rain', glass: { blur: 12, tint: '#050c07', opacity: 0.54 } },
  },
  scene: {
    source: SCENE,
    alt: 'Columns of green glyphs falling down the edges of a dark screen',
  },
}
