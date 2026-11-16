import { problems, theme } from './palette.js'
import { SCENE } from './scene.js'

/** @type {import('../types').Look} */
export default {
  id: 'cyberpunk',
  label: 'Cyberpunk',
  description: 'Rain over a neon megacity at night, glowing sign towers, electric cyan accents.',
  problems,
  args: {
    colors: theme,
    backdrop: { id: 'cyberpunk', glass: { blur: 16, tint: '#081217', opacity: 0.55 } },
  },
  scene: {
    source: SCENE,
    alt: 'A rain-soaked city skyline at night with lit windows, glowing sign strips and flying lights',
  },
}
