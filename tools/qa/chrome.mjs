// Headless Chrome for the scene checks: Playwright's "Google Chrome for Testing" from ~/Library/Caches/ms-playwright
// (the newest chromium-* there), never the owner's own Chrome. Modelled on botanica's tools/qa/chrome.mjs.
//
// It leaves nothing on the disk: a temp profile `looks-chrome-…` with a marker file, removed on close; a graceful
// Browser.close over DevTools (a plain kill leaves a ~200 MB profile and an app clone behind on every run), a kill
// only if Chrome has not exited after a few seconds; Ctrl-C and an exit without close still stop it and remove the
// profile; a profile orphaned by a crash is swept by the next launch. `--use-mock-keychain` keeps it out of the login
// keychain (otherwise macOS asks for "Chromium Safe Storage" on every run).
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'

const PREFIX = 'looks-chrome-'
const MARKER = '.looks-chrome'
const ORPHAN_AGE_MS = 60 * 60 * 1000
const sleep = ms => new Promise(r => setTimeout(r, ms))

/** The newest Chrome for Testing Playwright has downloaded; throws if there is none. */
export function chromeForTesting() {
  const cache = join(homedir(), 'Library/Caches/ms-playwright')
  const dirs = existsSync(cache) ? readdirSync(cache).filter(d => /^chromium-\d+$/.test(d)) : []
  dirs.sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))
  for (const d of dirs) {
    for (const arch of ['chrome-mac-arm64', 'chrome-mac']) {
      const p = join(cache, d, arch, 'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
      if (existsSync(p)) return p
    }
  }
  throw new Error('chrome.mjs: no Chrome for Testing found: run `npx playwright install chromium`')
}

const alive = pid => { try { process.kill(pid, 0); return true } catch (e) { return e.code === 'EPERM' } }

function sweepOrphans() {
  let names = []
  try { names = readdirSync(tmpdir()).filter(n => n.startsWith(PREFIX)) } catch { return }
  for (const name of names) {
    const dir = join(tmpdir(), name)
    try {
      const mark = JSON.parse(readFileSync(join(dir, MARKER), 'utf8'))
      if (Date.now() - statSync(dir).mtimeMs < ORPHAN_AGE_MS) continue
      if (alive(mark.chrome) || alive(mark.node)) continue
      rmSync(dir, { recursive: true, force: true })
    } catch { /* no marker, not ours */ }
  }
}

let open = null
let hooked = false
function hookExit() {
  if (hooked) return
  hooked = true
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.once(signal, () => {
      const closing = open ? open.close(3000) : Promise.resolve()
      closing.finally(() => process.exit(130))
    })
  }
  process.once('exit', () => {
    if (!open) return
    try { open.chrome.kill('SIGKILL') } catch { /* gone */ }
    rmSync(open.profile, { recursive: true, force: true })
  })
}

/** Start headless Chrome on `port` with a fresh profile; returns { chrome, profile, close() }. One at a time. */
export function launchChrome(port, args = []) {
  if (open) throw new Error('chrome.mjs: a browser is already open; close() it first')
  const binary = chromeForTesting()
  sweepOrphans()
  hookExit()
  const profile = mkdtempSync(join(tmpdir(), PREFIX))
  const chrome = spawn(binary, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--use-mock-keychain', '--no-first-run', ...args, 'about:blank'], { stdio: 'ignore' })
  writeFileSync(join(profile, MARKER), JSON.stringify({ node: process.pid, chrome: chrome.pid }))
  let exited = chrome.exitCode !== null
  chrome.once('exit', () => { exited = true })
  const browser = {
    chrome,
    profile,
    /** Browser.close over DevTools, wait, kill only after `graceMs`, then remove the profile. Never throws. */
    async close(graceMs = 5000) {
      try {
        if (!exited) {
          const ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
          const ws = new WebSocket(ver.webSocketDebuggerUrl)
          await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }) })
          ws.send(JSON.stringify({ id: 1, method: 'Browser.close' }))
        }
      } catch { /* unreachable: kill below */ }
      for (let w = 0; !exited && w < graceMs; w += 100) await sleep(100)
      if (!exited) {
        chrome.kill()
        for (let w = 0; !exited && w < 2000; w += 100) await sleep(100)
      }
      rmSync(profile, { recursive: true, force: true })
      if (open === browser) open = null
    },
  }
  open = browser
  return browser
}

/** Connect to the first page target over DevTools; returns send(method, params). */
export async function connectPage(port) {
  let tabs = []
  for (let i = 0; i < 50 && !tabs.some(t => t.type === 'page'); i++) {
    try { tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() } catch { /* starting */ }
    if (!tabs.some(t => t.type === 'page')) await sleep(200)
  }
  const page = tabs.find(t => t.type === 'page')
  if (!page) throw new Error('chrome.mjs: no page target')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise(r => ws.addEventListener('open', r, { once: true }))
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  })
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id
    pending.set(i, m => m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result))
    ws.send(JSON.stringify({ id: i, method, params }))
  })
  return { send, close: () => ws.close() }
}
