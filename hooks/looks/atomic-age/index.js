import { problems, theme } from './palette.js'
import { SCENE } from './scene.js'

/** @type {import('../types').Look} */
export default {
  id: 'atomic-age',
  label: 'Atomic age',
  description: 'World-of-tomorrow cream or teal night, starbursts, a turning atom, a rocket on its arc.',
  problems,
  args: {
    colors: theme,
    backdrop: { scene: 'atomic-age', glass: { blur: 14, opacity: 0.82 } },
  },
  scene: {
    source: SCENE,
    alt: 'Mid-century boomerangs and twinkling starbursts, a turning atom, a ringed planet and a finned rocket arcing overhead',
  },
}
