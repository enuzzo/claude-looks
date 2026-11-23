import { problems, theme } from './palette.js'
import * as SCENE_MODULE from './scene.js'

const { SCENE } = SCENE_MODULE

/** @type {import('../types').Look} */
export default {
  id: 'tide',
  label: 'Tide',
  description: 'A night sea in glowing glyphs: a full moon high on the left, gentle swells, a sleepy kawaii lighthouse whose beam turns now and then; a whale spouts or dives in the moonlight.',
  problems,
  args: {
    colors: theme,
    backdrop: { id: 'tide', glass: { blur: 3, tint: '#070a17', opacity: 0.34 } },
  },
  scene: {
    source: SCENE,
    poster: /** @type {{ POSTER?: string }} */ (SCENE_MODULE).POSTER,
    alt: 'A dark indigo night drawn in glowing characters: a full moon with its seas and craters hangs in the upper left over a sea of rows of dashes and tildes, a road of bright glints below it; low on the right a small white and mint lighthouse with a sleepy smiling face stands on a rock, its lamp glowing mint; a few faint stars',
  },
}
