import { dayProblems, dayTheme, problems, theme } from './palette.js'
import * as SCENE_MODULE from './scene.js'

const { SCENE, SCENE_DAY } = SCENE_MODULE

/** @type {import('../types').Look} */
export default {
  id: 'koi',
  label: 'Koi',
  description: 'A still pond from above: two koi of glyphs set in 3D (a kohaku and a sanke) gliding in the top right under block-mosaic lily pads, their lotus open by day. Night water after dusk, jade water by day.',
  problems: [...problems, ...dayProblems],
  args: {
    colors: theme,
    backdrop: { id: 'koi', glass: { blur: 3, tint: '#061219', opacity: 0.3 } },
  },
  scene: {
    source: SCENE,
    poster: /** @type {{ POSTER?: string }} */ (SCENE_MODULE).POSTER,
    alt: 'A dark ink-teal pond at night seen from above: two koi made of ASCII characters glide slowly in the top right under lily pads of green blocks, a large bright one in bone white with vermilion patches and a smaller, deeper one with ink marks as well; faint rings of dots open on the water',
  },
  day: {
    hours: [7, 19],
    args: {
      colors: dayTheme,
      backdrop: { id: 'koi-day', glass: { blur: 3, tint: '#091d1b', opacity: 0.3 } },
    },
    scene: {
      source: SCENE_DAY,
      alt: 'A muted jade pond by day seen from above: two koi made of ASCII characters, one bone white with vermilion patches, one with ink marks as well, glide slowly in the top right under lily pads with open pink lotus',
    },
  },
}
