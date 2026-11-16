import { problems, theme } from './palette.js'
import * as SCENE_MODULE from './scene.js'

const { SCENE } = SCENE_MODULE

/** @type {import('../types').Look} */
export default {
  id: 'synthwave-sunset',
  label: 'Synthwave sunset',
  description: 'Violet night sky, striped sun, rolling neon grid, hot pink accents.',
  problems,
  args: {
    colors: theme,
    backdrop: { id: 'synthwave-sunset', glass: { blur: 6, tint: '#140a24', opacity: 0.5 } },
  },
  scene: {
    source: SCENE,
    poster: /** @type {{ POSTER?: string }} */ (SCENE_MODULE).POSTER,
    alt: 'A striped synthwave sun setting behind mountains over a rolling neon grid',
  },
}
