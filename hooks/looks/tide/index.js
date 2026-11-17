import { problems, theme } from './palette.js'
import * as SCENE_MODULE from './scene.js'

const { SCENE } = SCENE_MODULE

/** @type {import('../types').Look} */
export default {
  id: 'tide',
  label: 'Tide',
  description: 'A night sea set in type: a ray-cast ASCII moon high on the left, slow swells of glyphs, its light shimmering on the water; minutes apart, a star falls in.',
  problems,
  args: {
    colors: theme,
    backdrop: { id: 'tide', glass: { blur: 3, tint: '#070a17', opacity: 0.34 } },
  },
  scene: {
    source: SCENE,
    poster: /** @type {{ POSTER?: string }} */ (SCENE_MODULE).POSTER,
    alt: 'A dark indigo night: a gibbous moon drawn in ASCII characters, its seas and craters shaded in glyphs, hangs in the upper left over a sea of rows of tildes and dashes, with a column of brighter glyphs where the moonlight falls on the water and a few faint stars',
  },
}
