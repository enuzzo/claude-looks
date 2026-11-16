import { problems, theme } from './palette.js'
import { SCENE } from './scene.js'

/** @type {import('../types').Look} */
export default {
  id: 'home-computer',
  label: 'Home computer',
  description: 'Blue boot screen, rainbow raster bars in the border, pixel sprites, light blue accents.',
  problems,
  args: {
    colors: theme,
    backdrop: { id: 'home-computer', glass: { blur: 14, tint: '#1e1752', opacity: 0.66 } },
  },
  scene: {
    source: SCENE,
    alt: 'An 8-bit home computer screen with rainbow raster bars rolling in its border and pixel sprites drifting along the top',
  },
}
