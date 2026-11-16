import { problems, theme } from './palette.js'
import { SCENE } from './scene.js'

/** @type {import('../types').Look} */
export default {
  id: 'solarpunk',
  label: 'Solarpunk',
  description: 'Sunlit leaves or firefly dusk, swaying vines, turbines on green hills, leafy accents.',
  problems,
  args: {
    colors: theme,
    backdrop: { id: 'solarpunk', glass: { blur: 14, opacity: 0.8 } },
  },
  scene: {
    source: SCENE,
    alt: 'Hanging vines sway in the top corners above white wind turbines turning on green hills',
  },
}
