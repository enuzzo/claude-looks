import { problems, theme } from './palette.js'
import * as SCENE_MODULE from './scene.js'

const { SCENE } = SCENE_MODULE

/** @type {import('../types').Look} */
export default {
  id: 'luino',
  label: 'Luino',
  description: 'A flat night of ink and violet for a rainy winter at the computer: a magenta haze low on the left, a cold cyan one high on the right, a faint ASCII weave, and now and then a few lines of code that decode out of the dark and scramble away. The conversation set in code type, your messages in a violet bubble.',
  problems,
  args: {
    colors: theme,
    backdrop: { id: 'luino', glass: { blur: 6, tint: '#0a0a1d', opacity: 0.45 } },
    // the conversation's own rows, all in code type (the sidebar and the prompt box keep the app's own):
    // the person's messages in a violet bubble with a thin neon rim and a faint pink glow, like a line typed
    // into a terminal; headings in the haze's pink; tool rows on a dark plate
    style: {
      Text: { fontFamily: ['code'] },
      Heading: { color: '#ff9fd2', fontFamily: ['code'] },
      UserMessage: {
        backgroundColor: 'bg-user-message',
        color: 'text-user-message',
        fontFamily: ['code'],
        radius: 10,
        borderColor: '#ff7ac066',
        borderWidth: 1,
        paddingX: 14,
        paddingY: 10,
        shadow: { y: 0, blur: 16, color: '#ff6ab830' },
      },
      ToolUse: { color: '#c9c4f2', fontFamily: ['code'], backgroundColor: '#11122cf0', radius: 6, paddingX: 8 },
    },
  },
  scene: {
    source: SCENE,
    poster: /** @type {{ POSTER?: string }} */ (SCENE_MODULE).POSTER,
    alt: 'A flat dark field of ink blue and violet, a soft magenta glow at the bottom left and a cyan one at the top right, under a barely visible weave of text characters; now and then a few lines of code in pink, cyan and violet surface beside the conversation as scrambled symbols, settle into readable code with a block cursor, and scramble away',
  },
}
