import { problems, theme } from './palette.js'
import { SCENE } from './scene.js'

/** @type {import('../types').Look} */
export default {
  id: 'steampunk',
  label: 'Steampunk',
  description: 'Brass gears, copper pipes and drifting steam on parchment or lamp-lit mahogany.',
  problems,
  args: {
    colors: theme,
    backdrop: { id: 'steampunk', glass: { blur: 14, opacity: 0.66 } },
  },
  scene: {
    source: SCENE,
    alt: 'Brass and copper gears turning in the corners of a workshop, with pipes, a pressure gauge and rising steam',
  },
}
