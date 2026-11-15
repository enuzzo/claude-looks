#!/usr/bin/env node
// Renders a README screenshot of every look (or the ones named): a made-up chat
// in the look's colors over its scene, desktop and phone, with headless Chrome.
// Usage: node tools/preview.mjs [look-id ...]
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { LOOKS } from '../hooks/looks/index.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'docs', 'screenshots')
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const SIZES = { desktop: [1440, 900, 1], mobile: [390, 844, 2] }

// Which ramp step each surface, text and role text sits on, per mode, as
// hooks/make-colors.js maps them (surface-0 is gray-20 / gray-900, and so on).
const RAMP = {
  dark: { s0: 900, s1: 850, s2: 830, s3: 800, t1: 50, t2: 200, t3: 400, role: 300, success: 400 },
  light: { s0: 20, s1: 10, s2: 0, s3: 0, t1: 900, t2: 600, t3: 400, role: 600, success: 600 },
}

function palette(look, mode) {
  const c = look.args.colors.inputs[mode]
  const g = n => c[`gray-${n}`]
  const r = RAMP[mode]
  const role = name => c[`role-${name}-${name === 'success' ? r.success : r.role}`] ?? c[`role-${name}-fill`]
  return {
    s0: g(r.s0), s1: g(r.s1), s2: g(r.s2), s3: g(r.s3), t1: g(r.t1), t2: g(r.t2), t3: g(r.t3),
    accent: role('accent'), fill: c['role-accent-fill'], on: c['role-accent-on'],
    success: role('success'), warning: role('warning'), danger: role('danger'), pro: role('pro'),
  }
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`
}

function page(look, mode, size, width) {
  const p = palette(look, mode)
  const bd = look.args.backdrop
  const glass = bd && 'scene' in bd ? bd.glass ?? {} : false
  const veil = glass ? hexA(glass.tint ?? p.s1, glass.opacity ?? 0.6) : p.s1
  const blur = glass ? `blur(${glass.blur ?? 16}px)` : 'none'
  const scene = look.scene?.source ?? ''
  const phone = size === 'mobile'
  const k = t => `<span style="color:${p.accent}">${t}</span>`
  const s = t => `<span style="color:${p.success}">${t}</span>`
  const n = t => `<span style="color:${p.pro}">${t}</span>`
  const f = t => `<span style="color:${p.danger}">${t}</span>`
  const v = t => `<span style="color:${p.warning}">${t}</span>`
  return `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
html,body{height:100%;width:${width}px;background:${p.s0};color:${p.t1};font:15px/1.55 -apple-system,"Helvetica Neue",sans-serif;overflow:hidden}
.scene{position:fixed;top:0;left:0;bottom:0;width:${width}px}.scene svg{width:100%;height:100%;display:block}
.app{position:relative;display:flex;height:100%;gap:${phone ? 0 : 10}px;padding:${phone ? 0 : 10}px}
.panel{background:${veil};backdrop-filter:${blur};-webkit-backdrop-filter:${blur};border:1px solid ${hexA(p.t3, 0.18)};border-radius:${phone ? 0 : 14}px}
.side{width:250px;padding:16px 12px;display:${phone ? 'none' : 'flex'};flex-direction:column;gap:4px}
.side .h{color:${p.t3};font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:14px 8px 6px}
.side .i{padding:7px 10px;border-radius:8px;color:${p.t2};font-size:14px}
.side .i.on{background:${hexA(p.accent, 0.16)};color:${p.t1};box-shadow:inset 2px 0 0 ${p.accent}}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.top{padding:14px 22px;border-bottom:1px solid ${hexA(p.t3, 0.15)};display:flex;justify-content:space-between;align-items:center}
.top b{font-weight:600}.chip{font-size:12px;color:${p.t2};background:${p.s3};padding:3px 9px;border-radius:99px}
.chat{flex:1;padding:${phone ? '18px 16px' : '26px 0'};overflow:hidden}
.col{max-width:720px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
.user{align-self:flex-end;max-width:80%;background:${p.s3};padding:10px 14px;border-radius:14px 14px 4px 14px}
.muted{color:${p.t3};font-size:13px}
.tool{display:flex;gap:8px;align-items:center;font-size:13px;color:${p.t2};background:${p.s2};border:1px solid ${hexA(p.t3, 0.15)};padding:8px 12px;border-radius:10px}
.dot{width:8px;height:8px;border-radius:50%;background:${p.success}}
a{color:${p.accent};text-decoration:none;border-bottom:1px solid ${hexA(p.accent, 0.4)}}
pre{background:${p.s1};border:1px solid ${hexA(p.t3, 0.15)};border-radius:10px;padding:12px 14px;font:13px/1.6 ui-monospace,Menlo,monospace;color:${p.t2};overflow:hidden}
.prompt{margin:${phone ? '0 12px 14px' : '0 auto 22px'};width:${phone ? 'auto' : '720px'};background:${p.s2};border:1px solid ${hexA(p.accent, 0.45)};box-shadow:0 0 18px ${hexA(p.accent, 0.25)};border-radius:16px;padding:12px 12px 12px 16px;display:flex;align-items:center;gap:10px}
.prompt span{flex:1;color:${p.t3}}
.send{width:34px;height:34px;border-radius:10px;background:${p.fill};color:${p.on};display:grid;place-items:center;font-weight:700}
</style>
<div class="scene">${scene}</div>
<div class="app">
 <nav class="panel side">
  <div class="h">Recents</div>
  <div class="i on">Flombrix the vantlewell</div><div class="i">Quorble seed migration</div><div class="i">Snarvel index tuning</div>
  <div class="i">Plimwick cache drift</div><div class="i">Zentaro theme sketches</div>
  <div class="h">Projects</div><div class="i">glimmerfold</div><div class="i">orbi-tassel</div>
 </nav>
 <section class="panel main">
  <div class="top"><b>Flombrix the vantlewell</b><span class="chip">${look.label}</span></div>
  <div class="chat"><div class="col">
   <div class="user">Can you plonk the vantlewell so it stops wibbling on cold starts?</div>
   <div class="tool"><span class="dot"></span>Read <b style="color:${p.t1}">src/vantle/well.ts</b><span class="muted">· 84 lines</span></div>
   <div>The wibble comes from <a>zorpify()</a> running before the trellis is warm. Glomming it behind a flag keeps the first frame still:</div>
   <pre>${k('export async function')} ${f('plonk')}(${v('well')}: Vantlewell) {
  ${k('if')} (!${v('well')}.trellis.warm) ${k('await')} ${f('warmTrellis')}(${v('well')}, ${n('250')})
  ${k('return')} ${f('zorpify')}(${v('well')}, { mode: ${s("'quiet'")}, retries: ${n('3')} })
}</pre>
   <div class="muted">Snorbled 2 files, frizzled 0 tests. The vantlewell now hums at ${n('60')} glims.</div>
  </div></div>
  <div class="prompt"><span>Reply to the vantlewell…</span><div class="send">↑</div></div>
 </section>
</div>`
}

function shoot(html, png, [w, h, scale]) {
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--force-device-scale-factor=${scale}`,
    `--window-size=${w},${h}`, `--screenshot=${png}`, '--virtual-time-budget=1500', `file://${html}`], { stdio: 'ignore' })
  console.log(png.replace(ROOT + '/', ''))
}

const wanted = process.argv.slice(2)
const looks = wanted.length ? LOOKS.filter(l => wanted.includes(l.id)) : LOOKS
const tmp = mkdtempSync(join(tmpdir(), 'looks-'))

for (const look of looks) {
  if (look.scene !== undefined) {
    const html = join(tmp, `${look.id}-scene.html`)
    writeFileSync(html, `<!doctype html><style>*{margin:0}html,body{width:1440px;height:600px;overflow:hidden}svg{width:100%;height:100%;display:block}</style>${look.scene.source}`)
    shoot(html, join(OUT, `${look.id}-scene.png`), [1440, 600, 1])
  }
  for (const mode of ['dark', 'light']) {
    if (look.args.colors.inputs[mode] === undefined) continue
    for (const [size, [w, h, scale]] of Object.entries(SIZES)) {
      const html = join(tmp, `${look.id}-${mode}-${size}.html`)
      const png = join(OUT, `${look.id}-${mode}-${size}.png`)
      writeFileSync(html, page(look, mode, size, w))
      shoot(html, png, [w, h, scale])
    }
  }
}
