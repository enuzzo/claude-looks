// Shoots a look's scene at chosen moments, to see it in motion without the app.
//
//   node tools/qa/frames.mjs <look> [times in s, comma-separated] [export name] [out dir]
//   node tools/qa/frames.mjs rain 0,5,10,60
//   node tools/qa/frames.mjs koi 0,30 SCENE_DAY
//
// Writes <out dir>/<look>-<name>-<t>s.png (1600×1000) plus <look>-<name>-still.png: the scene with every
// animation removed, which is what the desktop app's still copy shows (and what reduce motion leaves).
// Default out dir: $TMPDIR/looks-frames.
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { launchChrome, connectPage } from './chrome.mjs'

const [look, times = '0,10,30', name = 'SCENE', out = join(tmpdir(), 'looks-frames')] = process.argv.slice(2)
if (!look) { console.error('usage: node tools/qa/frames.mjs <look> [times] [name] [out]'); process.exit(1) }
const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const svg = (await import(pathToFileURL(join(ROOT, 'hooks/looks', look, 'scene.js')).href))[name]
if (typeof svg !== 'string') { console.error(`frames: ${look} has no ${name}`); process.exit(1) }
mkdirSync(out, { recursive: true })

const still = svg.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g, '').replace(/animation[\w-]*\s*:[^;"}]*;?/g, '')
const PORT = 9300 + (process.pid % 500)
const browser = launchChrome(PORT, ['--window-size=1600,1000'])
try {
  const page = await connectPage(PORT)
  await page.send('Page.enable')
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
  const show = async (markup, t) => {
    await page.send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `(async () => {
        document.body.style.cssText = 'margin:0;background:#000'
        document.body.innerHTML = ${JSON.stringify(markup.replace('<svg ', '<svg style="display:block;width:100vw;height:100vh" '))}
        await document.fonts.ready
        for (const a of document.getAnimations()) { a.pause(); a.currentTime = ${t * 1000} }
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      })()`,
    })
    return Buffer.from((await page.send('Page.captureScreenshot', { format: 'png' })).data, 'base64')
  }
  for (const t of times.split(',').map(Number)) {
    const file = join(out, `${look}-${name}-${t}s.png`)
    writeFileSync(file, await show(svg, t))
    console.log(file)
  }
  const file = join(out, `${look}-${name}-still.png`)
  writeFileSync(file, await show(still, 0))
  console.log(file)
  page.close()
} finally {
  await browser.close()
}
