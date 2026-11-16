import { problems, theme } from './palette.js'
import { SCENE } from './scene.js'

/** @type {import('../types').Look} */
export default {
  id: 'koi-script',
  label: 'Koi script',
  description: 'A koi pond tiled in glyphs: koi glide past lily pads, and now and then a ripple spreads.',
  problems,
  args: {
    colors: theme,
    backdrop: { id: 'koi-script', glass: { blur: 3, opacity: 0.72 } },
  },
  scene: {
    source: SCENE,
    alt: 'A koi pond seen from above as a mosaic of glyph tiles: koi of ideogram tiles glide past lily pads and pebbles',
  },
}
