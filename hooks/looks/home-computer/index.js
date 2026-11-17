import { dayProblems, dayTheme, problems, theme } from './palette.js'
import * as SCENE_MODULE from './scene.js'

const { SCENE, SCENE_DAY } = SCENE_MODULE

/** @type {import('../types').Look} */
export default {
  id: 'home-computer',
  label: 'Home computer',
  description: 'An 8-bit computer of the C64 kind: blue screen, light-blue border and type, a picture loading from tape in block glyphs, a moon by night and the sun by day.',
  problems: [...problems, ...dayProblems],
  args: {
    colors: theme,
    backdrop: { id: 'home-computer', glass: { blur: 5, tint: '#16144f', opacity: 0.42 } },
  },
  scene: {
    source: SCENE,
    poster: /** @type {{ POSTER?: string }} */ (SCENE_MODULE).POSTER,
    alt: 'A night-blue 8-bit computer screen: a light-blue border down the left edge, the machine\'s log in uppercase type at the top left (READY., LOAD, PRESS PLAY ON TAPE, LOADING, RUN), and in the bottom-left corner a small picture of a crescent moon over a still sea made of quadrant block characters, which loads line by line while raster stripes rise in the border, then holds while a small sprite ship now and then sails across',
  },
  day: {
    hours: [7, 19],
    args: {
      colors: dayTheme,
      backdrop: { id: 'home-computer-day', glass: { blur: 5, tint: '#1c1a64', opacity: 0.42 } },
    },
    scene: {
      source: SCENE_DAY,
      alt: 'A blue 8-bit computer screen by day: a light-blue border down the left edge, the machine\'s log in uppercase type (READY., LOAD, PRESS PLAY ON TAPE, LOADING, RUN), and in the bottom-left corner a small picture of the sun over the sea with a few clouds and birds, made of quadrant block characters, which loads line by line while raster stripes rise in the border, then holds while a small sprite ship now and then sails across',
    },
  },
}
