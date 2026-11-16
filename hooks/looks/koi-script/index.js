import { dayProblems, dayTheme, problems, theme } from './palette.js'
import * as SCENE_MODULE from './scene.js'

const { SCENE, SCENE_DAY } = SCENE_MODULE

/** @type {import('../types').Look} */
export default {
  id: 'koi-script',
  label: 'Koi script',
  description: 'A still pond from above, in glyphs: three raymarched ASCII koi circling on a golden spiral, rings of dots where one brushes the surface, a rare petal. Night water after dusk, jade water by day.',
  problems: [...problems, ...dayProblems],
  args: {
    colors: theme,
    backdrop: { id: 'koi-script', glass: { blur: 3, tint: '#07141c', opacity: 0.32 } },
  },
  scene: {
    source: SCENE,
    poster: /** @type {{ POSTER?: string }} */ (SCENE_MODULE).POSTER,
    alt: 'A dark ink-teal pond at night seen from above: three koi made of ASCII characters, bone white with vermilion patches, one large and bright and two smaller and dimmer, circle slowly in the bottom-right corner; faint rings of dots open on the water',
  },
  day: {
    hours: [7, 19],
    args: {
      colors: dayTheme,
      backdrop: { id: 'koi-script-day', glass: { blur: 3, tint: '#0a201e', opacity: 0.32 } },
    },
    scene: {
      source: SCENE_DAY,
      alt: 'A muted jade pond by day seen from above: three koi made of ASCII characters, bone white with vermilion patches, circle slowly in the bottom-right corner over a faint net of dappled light',
    },
  },
}
