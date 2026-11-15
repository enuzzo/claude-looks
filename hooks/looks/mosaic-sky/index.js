import { problems, theme } from './palette.js'
import { SCENE } from './scene.js'

/** @type {import('../types').Look} */
export default {
  id: 'mosaic-sky',
  label: 'Mosaic sky',
  description: 'A teletext night in block mosaics: drifting cloud banks, a cratered moon, blinking stars.',
  problems,
  args: {
    colors: theme,
    backdrop: { scene: 'mosaic-sky', glass: { blur: 3, tint: '#070a2a', opacity: 0.76 } },
  },
  scene: {
    source: SCENE,
    alt: 'A night sky drawn in teletext block mosaics: layered cloud banks, a cratered full moon, blinking stars and a distant city',
  },
}
