import { problems, theme } from './palette.js'
import * as SCENE_MODULE from './scene.js'

const { SCENE } = SCENE_MODULE

/** @type {import('../types').Look} */
export default {
  id: 'synthwave-sunset',
  label: 'Synthwave sunset',
  description: 'A dark dusk set in type: a banded sun of glyphs on the horizon, a field of dots drifting toward you, hot pink accents.',
  problems,
  args: {
    colors: theme,
    backdrop: { id: 'synthwave-sunset', glass: { blur: 6, tint: '#140a24', opacity: 0.5 } },
  },
  scene: {
    source: SCENE,
    poster: /** @type {{ POSTER?: string }} */ (SCENE_MODULE).POSTER,
    alt: 'A dark violet dusk made of text characters: low on the left a banded sun of glyphs sits on the horizon between low glyph ridges, a field of pink dots in perspective drifts slowly toward the viewer below it, and a few glyph stars hang in the sky',
  },
}
