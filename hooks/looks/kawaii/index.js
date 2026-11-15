import { problems, theme } from './palette.js'
import { SCENE } from './scene.js'

/** @type {import('../types').Look} */
export default {
  id: 'kawaii',
  label: 'Kawaii',
  description: 'Strawberry-milk sky or a lavender night: kaomoji clouds, glyph stars, a mochi bunny.',
  problems,
  args: {
    colors: theme,
    backdrop: { scene: 'kawaii', glass: { blur: 4, opacity: 0.78 } },
  },
  scene: {
    source: SCENE,
    alt: 'Puffy pastel clouds with tiny kaomoji faces, twinkling glyph stars, a smiling sun or a sleeping crescent moon, and a mochi bunny on a mint hill sending up hearts',
  },
}
