import { problems, theme } from './palette.js'
import { SCENE } from './scene.js'

/** @type {import('../types').Look} */
export default {
  id: 'dot-matrix',
  label: 'Dot matrix',
  description: 'A motorway LED panel at night: amber dots, chevrons in sequence, a slow ticker of signs.',
  problems,
  args: {
    colors: theme,
    backdrop: { id: 'dot-matrix', glass: { blur: 3, tint: '#0b0806', opacity: 0.76 } },
  },
  scene: {
    source: SCENE,
    alt: 'A dark motorway information panel of round amber LED dots: a red ring, sequenced chevrons, a hazard triangle, lane signals and a scrolling band of symbols',
  },
}
