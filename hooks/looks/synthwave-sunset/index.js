import { problems, theme } from './palette.js'
import { SCENE } from './scene.js'

/** @type {import('../types').Look} */
export default {
  id: 'synthwave-sunset',
  label: 'Synthwave sunset',
  description: 'Violet night sky, striped sun, rolling neon grid, hot pink accents.',
  problems,
  args: {
    colors: theme,
    backdrop: { scene: 'synthwave-sunset', glass: { blur: 18, tint: '#140a24', opacity: 0.62 } },
  },
  scene: {
    source: SCENE,
    alt: 'A striped synthwave sun setting behind mountains over a rolling neon grid',
  },
}
