import { problems, theme } from './palette.js'
import * as SCENE_MODULE from './scene.js'

const { SCENE } = SCENE_MODULE

/** @type {import('../types').Look} */
export default {
  id: 'xmas',
  label: 'Xmas',
  description: 'A snowy village at night in glowing glyphs: cottages with fairy lights and a snowman on the left, a kawaii snowplow under candy-cane lamps on the right, snow falling over everything.',
  problems,
  args: {
    colors: theme,
    backdrop: { id: 'xmas', glass: { blur: 3, tint: '#040c18', opacity: 0.35 } },
  },
  scene: {
    source: SCENE,
    poster: /** @type {{ POSTER?: string }} */ (SCENE_MODULE).POSTER,
    alt: 'A snowy village at night made of glowing characters: on the left snow-covered cottages with warm windows and strings of coloured fairy lights that glow up and down slowly, and a snowman with a red scarf; on the right a chubby kawaii snowplow with big round headlight eyes, a smile and a yellow blade, under street lamps shaped like giant red and white candy canes; snow falls over everything',
  },
}
