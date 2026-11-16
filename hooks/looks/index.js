// Every look in the collection. A new look is a folder beside this file,
// exporting a Look as default, and one line here.
import synthwaveSunset from './synthwave-sunset/index.js'
import homeComputer from './home-computer/index.js'
import digitalRain from './digital-rain/index.js'
import asciiTide from './ascii-tide/index.js'
import abyssal from './abyssal/index.js'

/** @type {readonly import('./types').Look[]} */
export const LOOKS = [
  synthwaveSunset,
  homeComputer,
  digitalRain,
  asciiTide,
  abyssal,
]

export const DEFAULT_LOOK = 'synthwave-sunset'
