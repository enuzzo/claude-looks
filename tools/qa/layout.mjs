// Shows a look the way the desktop app will: its scene behind a stand-in of the app's window, in the
// look's own colours, at four window sizes, each with the sidebar and the right panel open or closed,
// plus a phone. One contact sheet per dress, to look at before a look ships (docs/DIRECTION.md, "Layout").
//
//   node tools/qa/layout.mjs <look> [--guides] [--out dir]
//   node tools/qa/layout.mjs basic --guides
//
// Writes <out>/<look>.png (and <look>-day.png for a look with a daylight dress). Default out:
// $TMPDIR/looks-layout. --guides draws the zones of docs/DIRECTION.md over each window: the open
// field in green, the conversation column and the prompt box in red, the panels hatched.
//
// The window itself is tools/qa/app-frame.mjs (its geometry measured from the app). The scene is shown at
// its first frame.
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launchChrome, connectPage } from './chrome.mjs'
import { LOOKS } from '../../hooks/looks/index.js'
import { windowHtml } from './app-frame.mjs'

const args = process.argv.slice(2)
const id = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--out')
const guides = args.includes('--guides')
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : join(tmpdir(), 'looks-layout')
const base = LOOKS.find(l => l.id === id)
if (!base) { console.error(`usage: node tools/qa/layout.mjs <look> [--guides] [--out dir]; looks: ${LOOKS.map(l => l.id).join(', ')}`); process.exit(1) }
mkdirSync(out, { recursive: true })

const WINDOWS = [[1280, 800], [1512, 945], [1920, 1080], [2560, 1440]]
const STATES = [
  { name: 'sidebar + panel', side: true, panel: true },
  { name: 'sidebar', side: true, panel: false },
  { name: 'neither', side: false, panel: false },
]
const PHONE = [390, 844]


function sheet(look) {
  const CELL = 620
  let cells = ''
  for (const [w, h] of WINDOWS) {
    for (const st of STATES) {
      const k = CELL / w
      cells += `<figure><div style="width:${CELL}px;height:${f2(h * k)}px;overflow:hidden;position:relative;border-radius:8px"><iframe style="width:${w}px;height:${h}px;transform:scale(${k});transform-origin:0 0;border:0" srcdoc="${windowHtml(look, w, h, st, false, guides).replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"></iframe></div><figcaption>${w}×${h} · ${st.name}</figcaption></figure>`
    }
  }
  const [pw, ph] = PHONE, k = 0.62
  cells += `<figure><div style="width:${f2(pw * k)}px;height:${f2(ph * k)}px;overflow:hidden;position:relative;border-radius:14px"><iframe style="width:${pw}px;height:${ph}px;transform:scale(${k});transform-origin:0 0;border:0" srcdoc="${windowHtml(look, pw, ph, {}, true, guides).replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"></iframe></div><figcaption>phone ${pw}×${ph}</figcaption></figure>`
  return `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:20px;background:#222;color:#ccc;font:13px -apple-system,sans-serif;display:grid;grid-template-columns:repeat(3,${CELL}px);gap:18px 16px}figure{margin:0}figcaption{margin-top:5px}h1{grid-column:1/-1;margin:0;font-size:16px;color:#eee}</style><h1>${look.label}${look.dress ? ` (${look.dress})` : ''}${guides ? ' · guides' : ''}</h1>${cells}`
}
function f2(n) { return +n.toFixed(1) }

const dresses = [{ ...base, dress: '' }]
if (base.day) dresses.push({ ...base, args: base.day.args, scene: base.day.scene, dress: 'day' })

const PORT = 9700 + (process.pid % 200)
const browser = launchChrome(PORT, ['--hide-scrollbars'])
try {
  const page = await connectPage(PORT)
  await page.send('Page.enable')
  for (const look of dresses) {
    const html = sheet(look)
    const file = join(out, `${look.id}${look.dress ? '-' + look.dress : ''}.html`)
    writeFileSync(file, html)
    await page.send('Emulation.setDeviceMetricsOverride', { width: 3 * 620 + 2 * 16 + 40, height: 2400, deviceScaleFactor: 1, mobile: false })
    await page.send('Page.navigate', { url: `file://${file}` })
    await new Promise(r => setTimeout(r, 2500))
    const { result } = await page.send('Runtime.evaluate', { expression: 'document.body.scrollHeight', returnByValue: true })
    await page.send('Emulation.setDeviceMetricsOverride', { width: 3 * 620 + 2 * 16 + 40, height: result.value, deviceScaleFactor: 1, mobile: false })
    await new Promise(r => setTimeout(r, 800))
    const png = file.replace(/\.html$/, guides ? '-guides.png' : '.png')
    writeFileSync(png, Buffer.from((await page.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
    console.log(png)
  }
  page.close()
} finally {
  await browser.close()
}
