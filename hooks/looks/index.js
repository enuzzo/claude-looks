// Every look in the collection. A new look is a folder beside this file,
// exporting a Look as default, and one line here.
import synthwave from './synthwave/index.js'
import basic from './basic/index.js'
import rain from './rain/index.js'
import tide from './tide/index.js'
import abyssal from './abyssal/index.js'
import koi from './koi/index.js'

/** @type {readonly import('./types').Look[]} */
export const LOOKS = [
  synthwave,
  basic,
  rain,
  tide,
  abyssal,
  koi,
]

export const DEFAULT_LOOK = 'synthwave'
