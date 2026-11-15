// Every look in the collection. A new look is a folder beside this file,
// exporting a Look as default, and one line here.
import synthwaveSunset from './synthwave-sunset/index.js'
import homeComputer from './home-computer/index.js'
import digitalRain from './digital-rain/index.js'
import neonPunk from './neon-punk/index.js'
import cyberpunk from './cyberpunk/index.js'
import aurora from './aurora/index.js'
import steampunk from './steampunk/index.js'
import solarpunk from './solarpunk/index.js'
import atomicAge from './atomic-age/index.js'
import zenGarden from './zen-garden/index.js'

/** @type {readonly import('./types').Look[]} */
export const LOOKS = [
  synthwaveSunset,
  homeComputer,
  digitalRain,
  neonPunk,
  cyberpunk,
  aurora,
  steampunk,
  solarpunk,
  atomicAge,
  zenGarden,
]

export const DEFAULT_LOOK = 'synthwave-sunset'
