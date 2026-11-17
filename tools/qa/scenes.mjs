// Checks every look's scenes the way the desktop app will treat them, before a release.
//
//   node tools/qa/scenes.mjs                 all looks
//   node tools/qa/scenes.mjs koi      only looks whose folder name contains this
//   SCENE_LIMIT_MS=3 node tools/qa/scenes.mjs
//
// For each exported scene (SCENE, SCENE_DAY, …) and poster:
//   1. Well-formed XML, parsed by Chrome's own DOMParser. The app throws away a scene that is not.
//   2. The app's validator (validator.mjs). A refused scene never moves.
//   3. Frame cost, animated scenes only: the scene as an <img src="data:image/svg+xml…"> at 1600×1000, device scale 2,
//      and once per frame for 5 s a drawImage of it into a 96×60 canvas plus a 1-pixel read. That copies the app's
//      guard, which stops a scene for good when its mean sampling cost over 3 s passes 5.56 ms. On this bench a
//      scene over 4.5 ms fails (abyssal 0.3.4 measured 5.3 and froze in the app; 3.4-4.0 moves on both Macs; runs
//      vary by about 0.5 ms), and one over 2.5 ms gets a warning: aim under it, so slower Macs keep headroom.
// Exits 1 if any scene fails. On this bench our scenes sorted exactly as the app treated them (2026-11-16):
// those that froze in the app measured 5.3 ms and up, those that kept moving 3.6 ms and less.
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { launchChrome, connectPage } from './chrome.mjs'
import { refusals, readsSize } from './validator.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const LOOKS = join(ROOT, 'hooks/looks')
const LIMIT = Number(process.env.SCENE_LIMIT_MS ?? 4.5)
const TARGET = 2.5
const APP_LIMIT = 1000 / 180
const PORT = 9300 + (process.pid % 500)
const only = process.argv[2]

const scenes = []
for (const look of readdirSync(LOOKS, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort()) {
  if (only && !look.includes(only)) continue
  const mod = await import(pathToFileURL(join(LOOKS, look, 'scene.js')).href)
  for (const [name, svg] of Object.entries(mod)) {
    if (typeof svg === 'string' && svg.trimStart().startsWith('<svg')) scenes.push({ look, name, svg })
  }
}
if (!scenes.length) { console.error('scenes: no scenes found'); process.exit(1) }

const animated = svg => /@keyframes|<animate|<set\b/.test(svg)

// Runs in the page: parse, then (if asked) time drawImage of the scene for `ms`.
const probe = (svg, time, ms) => `(async () => {
  const svg = ${JSON.stringify(svg)}
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const err = doc.querySelector('parsererror')
  if (err) return { xml: err.textContent.replace(/\\s+/g, ' ').replace(/^.*?errors?:/, '').replace(/Below is.*$/, '').trim().slice(0, 200) }
  if (!${time}) return { xml: null }
  document.body.innerHTML = ''
  const img = new Image()
  img.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh'
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg width="1600" height="1000" '))
  document.body.append(img)
  try { await img.decode() } catch (e) { return { xml: null, error: 'the image did not decode: ' + e.message } }
  await new Promise(r => setTimeout(r, 500))
  const c = document.createElement('canvas'); c.width = 96; c.height = 60
  const ctx = c.getContext('2d', { willReadFrequently: true })
  const ts = []
  await new Promise(done => {
    let start
    const f = t => {
      start ??= t
      const a = performance.now()
      ctx.clearRect(0, 0, 96, 60); ctx.drawImage(img, 0, 0, 96, 60); ctx.getImageData(0, 0, 1, 1)
      ts.push(performance.now() - a)
      if (t - start < ${ms}) requestAnimationFrame(f); else done()
    }
    requestAnimationFrame(f)
  })
  ts.sort((x, y) => x - y)
  return { xml: null, mean: ts.reduce((x, y) => x + y, 0) / ts.length, p95: ts[Math.floor(ts.length * 0.95)], frames: ts.length }
})()`

const browser = launchChrome(PORT, ['--window-size=1600,1000', '--force-device-scale-factor=2'])
let failed = 0
try {
  const page = await connectPage(PORT)
  await page.send('Page.enable')
  for (const s of scenes) {
    const problems = []
    const time = s.name !== 'POSTER' && animated(s.svg)
    const { result, exceptionDetails } = await page.send('Runtime.evaluate', {
      expression: probe(s.svg, time, 5000), awaitPromise: true, returnByValue: true, timeout: 60000,
    })
    if (exceptionDetails) problems.push(`probe failed: ${exceptionDetails.text}`)
    const r = result?.value ?? {}
    if (r.xml) problems.push(`not well-formed XML: ${r.xml}`)
    if (r.error) problems.push(r.error)
    for (const why of refusals(s.svg)) problems.push(`validator: ${why}`)
    if (s.svg.length > 131072) problems.push(`${s.svg.length} chars, over the 131,072 limit`)
    if (s.name === 'POSTER' && s.svg.length > 12000) problems.push(`poster ${s.svg.length} chars, over 12,000`)
    let cost = time ? 'still' : '-'
    if (typeof r.mean === 'number') {
      cost = `${r.mean.toFixed(2)} ms (p95 ${r.p95.toFixed(1)})`
      if (r.mean > LIMIT) problems.push(`frame cost ${r.mean.toFixed(2)} ms over our ${LIMIT} ms limit (the app stops at ${APP_LIMIT.toFixed(2)})`)
      else if (r.mean > TARGET) cost += `  warning: over the ${TARGET} ms target`
    }
    const tag = problems.length ? 'FAIL' : 'ok  '
    const note = readsSize(s.svg) ? ' readsSize' : ''
    console.log(`${tag} ${`${s.look}:${s.name}`.padEnd(30)} ${String(s.svg.length).padStart(7)} chars  ${cost}${note}`)
    for (const p of problems) console.log(`       ${p}`)
    if (problems.length) failed++
  }
  page.close()
} finally {
  await browser.close()
}
if (failed) { console.error(`scenes: ${failed} of ${scenes.length} failed`); process.exit(1) }
console.log(`scenes: all ${scenes.length} pass (limit ${LIMIT} ms)`)
