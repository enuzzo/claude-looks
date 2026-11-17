#!/usr/bin/env node
// Shoots the README's pictures of every look (or the ones named): the look in the desktop app's window
// (1920 × 1080, sidebar and right panel open) and on a phone, from the same stand-in of the app the layout check
// uses (tools/qa/app-frame.mjs), plus the scene alone. A look with a daylight dress is shot twice, the
// second time as `<id>-day`.
//
//   node tools/preview.mjs [look-id ...]
//
// Writes docs/screenshots/<id>-dark-desktop.png, <id>-dark-mobile.png and <id>-scene.png. PREVIEW_OUT
// writes elsewhere. Chrome for Testing runs headless on a temporary profile with the mock keychain, is
// closed over DevTools and its profile removed (tools/qa/chrome.mjs).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { LOOKS } from '../hooks/looks/index.js'
import { windowHtml } from './qa/app-frame.mjs'
import { connectPage, launchChrome } from './qa/chrome.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = process.env.PREVIEW_OUT ? resolve(process.env.PREVIEW_OUT) : join(ROOT, 'docs', 'screenshots')
const SHOTS = [
  { name: 'dark-desktop', w: 1920, h: 1080, scale: 1, page: look => windowHtml(look, 1920, 1080, { side: true, panel: true }, false) },
  { name: 'dark-mobile', w: 390, h: 844, scale: 2, page: look => windowHtml(look, 390, 844, {}, true) },
  { name: 'scene', w: 1440, h: 600, scale: 1, page: look => `<!doctype html><style>*{margin:0}html,body{width:1440px;height:600px;overflow:hidden}svg{width:100%;height:100%;display:block}</style>${look.scene.source}` },
]

const wanted = process.argv.slice(2)
const looks = (wanted.length ? LOOKS.filter(l => wanted.includes(l.id)) : LOOKS)
  .flatMap(l => (l.day ? [l, { ...l, id: `${l.id}-day`, args: l.day.args, scene: l.day.scene }] : [l]))
  .filter(l => l.scene !== undefined)
if (looks.length === 0) { console.error(`preview: no such look; looks: ${LOOKS.map(l => l.id).join(', ')}`); process.exit(1) }

mkdirSync(OUT, { recursive: true })
const tmp = mkdtempSync(join(tmpdir(), 'looks-preview-'))
const PORT = 9500 + (process.pid % 200)
const browser = launchChrome(PORT, ['--hide-scrollbars'])
try {
  const page = await connectPage(PORT)
  await page.send('Page.enable')
  for (const look of looks) {
    for (const shot of SHOTS) {
      const html = join(tmp, `${look.id}-${shot.name}.html`)
      writeFileSync(html, shot.page(look))
      await page.send('Emulation.setDeviceMetricsOverride', { width: shot.w, height: shot.h, deviceScaleFactor: shot.scale, mobile: false })
      await page.send('Page.navigate', { url: `file://${html}` })
      await new Promise(r => setTimeout(r, 1500)) // the scene's image decodes, the glass blurs it
      const png = join(OUT, `${look.id}-${shot.name}.png`)
      writeFileSync(png, Buffer.from((await page.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
      console.log(png.replace(ROOT + '/', ''))
    }
  }
  page.close()
} finally {
  await browser.close()
  rmSync(tmp, { recursive: true, force: true })
}
