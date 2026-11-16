import { problems, theme } from './palette.js'
import { SCENE } from './scene.js'

/** @type {import('../types').Look} */
export default {
  id: 'aurora',
  label: 'Aurora',
  description: 'Northern lights swaying over a snowy pine forest, aurora green accents.',
  problems,
  args: {
    colors: theme,
    backdrop: { id: 'aurora', glass: { blur: 18, tint: '#0a1020', opacity: 0.5 } },
  },
  scene: {
    source: SCENE,
    alt: 'Green and violet northern lights swaying above a starry sky and a snowy pine forest',
  },
}
