import { problems, theme } from './palette.js'
import * as SCENE_MODULE from './scene.js'

const { SCENE } = SCENE_MODULE

/** @type {import('../types').Look} */
export default {
  id: 'home-computer',
  label: 'Home computer',
  description: 'Night blue-violet, an 8-bit picture loading from tape in block glyphs, raster stripes at the edge, light blue accents.',
  problems,
  args: {
    colors: theme,
    backdrop: { id: 'home-computer', glass: { blur: 5, tint: '#110d2e', opacity: 0.42 } },
  },
  scene: {
    source: SCENE,
    poster: /** @type {{ POSTER?: string }} */ (SCENE_MODULE).POSTER,
    alt: 'A dark blue-violet night with, in the bottom-left corner, a small picture of a crescent moon over a still sea made of quadrant block characters, which now and then dissolves and loads again line by line, while a narrow band of tape-loading stripes rises slowly along the left edge and a block cursor breathes beneath it',
  },
}
