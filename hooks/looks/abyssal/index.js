import { problems, theme } from './palette.js'
import * as SCENE_MODULE from './scene.js'

const { SCENE } = SCENE_MODULE

/** @type {import('../types').Look} */
export default {
  id: 'abyssal',
  label: 'Abyssal',
  description: 'The deep sea in glowing glyphs set in 3D: a manta in a shaft of block-glyph light, magenta moon jellies, lime and magenta algae.',
  problems,
  args: {
    colors: theme,
    backdrop: { id: 'abyssal', glass: { blur: 8, tint: '#041820', opacity: 0.55 } },
  },
  scene: {
    source: SCENE,
    poster: /** @type {{ POSTER?: string }} */ (SCENE_MODULE).POSTER,
    alt: 'Dark teal deep water: low on the left a shaft of light made of columns of small block characters falls on a manta whose wings are made of glowing characters in violet, white and aquamarine; on the right two moon jellies of magenta and blue characters with trailing coloured tentacles; lime and magenta algae of characters sway at the bottom',
  },
}
