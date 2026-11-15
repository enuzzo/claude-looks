import { problems, theme } from './palette.js'
import { SCENE } from './scene.js'

/** @type {import('../types').Look} */
export default {
  id: 'abyssal',
  label: 'Abyssal',
  description: 'The deep sea in block glyphs: a pulsing jellyfish, an anglerfish and its lure, rising motes of light.',
  problems,
  args: {
    colors: theme,
    backdrop: { scene: 'abyssal', glass: { blur: 3, tint: '#070a1a', opacity: 0.6 } },
  },
  scene: {
    source: SCENE,
    alt: 'A dark deep sea drawn in block and box-drawing glyphs: a pulsing jellyfish, a glowing siphonophore chain and an anglerfish with a lit lure',
  },
}
