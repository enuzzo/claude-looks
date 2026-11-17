import { problems, theme } from './palette.js'
import * as SCENE_MODULE from './scene.js'

const { SCENE } = SCENE_MODULE

/** @type {import('../types').Look} */
export default {
  id: 'home-computer',
  label: 'Home computer',
  description: 'An 8-bit computer of the C64 kind at night: blue screen, light-blue border and type, a picture loading from tape in block glyphs.',
  problems,
  args: {
    colors: theme,
    backdrop: { id: 'home-computer', glass: { blur: 5, tint: '#16144f', opacity: 0.42 } },
  },
  scene: {
    source: SCENE,
    poster: /** @type {{ POSTER?: string }} */ (SCENE_MODULE).POSTER,
    alt: 'A night-blue 8-bit computer screen: a light-blue border down the left edge, the machine\'s log in uppercase type at the top left (READY., LOAD, PRESS PLAY ON TAPE, LOADING, RUN), and in the bottom-left corner a small picture of a crescent moon over a still sea made of quadrant block characters, which loads line by line while raster stripes rise in the border, then holds while a small sprite ship now and then sails across',
  },
}
