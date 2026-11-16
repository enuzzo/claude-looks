import { problems, theme } from './palette.js'
import { SCENE } from './scene.js'

/** @type {import('../types').Look} */
export default {
  id: 'zen-garden',
  label: 'Zen garden',
  description: 'Rice paper or moonlit stone, raked sand around mossy rocks, falling maple leaves.',
  problems,
  args: {
    colors: theme,
    backdrop: { id: 'zen-garden', glass: { blur: 14, opacity: 0.84 } },
  },
  scene: {
    source: SCENE,
    alt: 'Raked sand rippling around mossy stones, with a maple branch letting red leaves drift down',
  },
}
