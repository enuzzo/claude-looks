// An approximation of the desktop app's scene validator, re-implemented from its live web UI code (read
// 2026-11-16). A scene the app's validator refuses never moves: only its still
// copy shows. These rules live in the web UI and can change without an app update, so a pass here is a good sign,
// not a guarantee. Well-formed XML is checked separately, in Chrome (scenes.mjs).

const ELEMENTS = new Set(('animate animateMotion animateTransform set circle clipPath defs desc ellipse feBlend ' +
  'feColorMatrix feComponentTransfer feComposite feConvolveMatrix feDisplacementMap feDropShadow feFlood feFuncA ' +
  'feFuncB feFuncG feFuncR feGaussianBlur feMerge feMergeNode feMorphology feOffset feTurbulence filter g line ' +
  'linearGradient marker mask metadata mpath path pattern polygon polyline radialGradient rect stop style svg symbol ' +
  'text textPath title tspan use').split(' '))

const FUNCTIONS = new Set(('alpha color color-mix contrast-color hsl hsla hwb lab lch light-dark oklab oklch rgb rgba ' +
  'abs acos asin atan atan2 calc clamp cos exp hypot log max min minmax mod pow rem repeat round sign sin sqrt tan ' +
  'env if var media selector style supports circle ellipse inset path polygon ray rect shape xywh conic-gradient ' +
  'from linear-gradient radial-gradient repeating-linear-gradient repeating-radial-gradient to matrix matrix3d ' +
  'perspective rotate rotate3d rotatex rotatey rotatez scale scale3d scalex scaley scalez skew skewx skewy translate ' +
  'translate3d translatex translatey translatez cubic-bezier linear scroll steps view blur brightness contrast ' +
  'drop-shadow grayscale hue-rotate invert opacity saturate sepia is not nth-child nth-last-child nth-last-of-type ' +
  'nth-of-type where has url').split(' '))

const AT_RULES = new Set(('keyframes -webkit-keyframes media supports layer container property scope starting-style ' +
  'page position-try counter-style charset view-transition').split(' '))

const HREF = /^#[A-Za-z_][\w.:-]*$/
const CALL = /([^\s()[\]{}<>;:,'"`=+*/!@#$%^&|~?]{0,64})\(/g
const AT_RULE = /@([^\s{};("'/]*)/g
const LOCAL_URL = /url\(#[A-Za-z_][\w.:-]*\)/gi
const COLOR_SCHEME = /prefers-color-scheme(?!\s*(?::\s*(?:dark|light)\s*)?\))/i

function valueRefusal(value) {
  if (value.includes('\\')) return 'a backslash'
  const flat = value.replace(/[\s\p{Cc}]/gu, '').toLowerCase()
  if (flat.includes('data:')) return 'data:'
  if (value.replace(LOCAL_URL, '').replace(/[\s\p{Cc}]/gu, '').toLowerCase().includes('url(')) return 'url( that is not url(#id)'
  if (COLOR_SCHEME.test(value)) return 'prefers-color-scheme in an unexpected form'
  for (const [, name = ''] of value.matchAll(CALL)) {
    const l = name.toLowerCase()
    if (l !== '' && !FUNCTIONS.has(l)) return `the function ${name}(`
  }
  for (const [, name = ''] of value.matchAll(AT_RULE)) if (!AT_RULES.has(name.toLowerCase())) return `@${name}`
  return null
}

/** Reasons the app's validator would refuse `svg`; an empty list means it passes. */
export function refusals(svg) {
  const out = new Set()
  for (const [, name] of svg.matchAll(/<([A-Za-z][\w:-]*)/g)) if (!ELEMENTS.has(name)) out.add(`the element <${name}>`)
  const sheets = [...svg.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1])
  for (const s of sheets) {
    if (/<[A-Za-z]/.test(s)) out.add('an element inside <style>')
    const why = valueRefusal(s.replaceAll('&gt;', '>').replaceAll('&lt;', '<').replaceAll('&amp;', '&'))
    if (why) out.add(`in a style sheet: ${why}`)
  }
  const rest = svg.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '')
  // Text between tags: an `@` straight before a letter. Luino 0.7.0's scramble noise held `@ス`, `@m` and the
  // like and the desktop app drew nothing at all (2026-11-25); `@@`, `@%` (synthwave) and a backslash draw fine.
  // The app's exact rule for text is not known: this is the narrowest one that told the two apart.
  const text = rest.replace(/<[^>]*>/g, '')
  if (/@\p{L}/u.test(text)) out.add('in text: an @ before a letter')
  for (const tag of rest.matchAll(/<([A-Za-z][\w:-]*)((?:\s+[^\s=>/]+\s*=\s*"[^"]*")*)\s*\/?>/g)) {
    const [, el, attrs] = tag
    for (const [, name, value] of attrs.matchAll(/([^\s=]+)\s*=\s*"([^"]*)"/g)) {
      if (/^on/i.test(name)) out.add(`the attribute ${name}`)
      if ((name === 'href' || name === 'xlink:href') && !HREF.test(value)) out.add(`${name}="${value.slice(0, 40)}"`)
      if (name.startsWith('xml:') && name !== 'xml:space' && name !== 'xml:lang') out.add(`the attribute ${name}`)
      if (/^(animate|set)/.test(el) && name === 'attributeName' && /^(href|xlink:href|style|on)/i.test(value)) out.add(`<${el}> animating ${value}`)
      if (name.startsWith('xmlns')) continue
      const why = valueRefusal(value)
      if (why) out.add(`in ${name}="${value.slice(0, 40)}": ${why}`)
    }
  }
  return [...out]
}

/** True when the app would draw the scene at zoom 8 ("readsSize"): legal, but likely costlier to rasterise. */
export function readsSize(svg) {
  return /(?:\d|\.)(?:[dsl]?v(?:w|h|i|b|min|max)|cq(?:w|h|i|b|min|max))(?![a-z0-9_-])/i.test(svg) ||
    /(?:calc|clamp|min|max|[a-z-]*gradient|media|size)\(/i.test(svg.replace(/<(?:linear|radial)Gradient/g, '')) ||
    /@container|@page|@scope|timeline|vector-effect/.test(svg)
}
