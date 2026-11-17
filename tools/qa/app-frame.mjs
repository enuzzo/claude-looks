// A stand-in of the Claude desktop app's window, in a look's own colours, with its scene behind it as
// the app draws it: an <img> of the SVG filling the whole window under everything; the sidebar and the
// right panel opaque; the glass (the look's blur and tint) only behind the conversation column, with soft
// edges. Used by tools/qa/layout.mjs (the check by eye) and tools/preview.mjs (the README's pictures).
//
// The geometry was measured from the desktop app (2026-11-17, Claude 1.x on macOS): change APP when the
// app changes, and docs/DIRECTION.md (Layout) with it.

// ── the app's window, in CSS pixels
export const APP = {
  title: 40, // the title bar
  sidebar: 236, // the left sidebar, when open
  panel: 296, // the right panel (environment, context), when open
  column: 680, // the conversation's column, centred between the panels
  columnTop: 90,
  prompt: { width: 712, height: 42, bottom: 40 }, // the prompt box, centred like the column
  glassEdge: 48, // the glass behind the column reaches this far past it, fading out
}
// the surfaces, texts and roles a look's theme paints, at the ramp steps hooks/make-colors.js maps them to
const RAMP = { s0: 900, s1: 850, s2: 830, s3: 800, t1: 50, t2: 200, t3: 400, role: 300, success: 400 }
export function palette(look) {
  const c = look.args.colors.inputs.dark
  const g = n => c[`gray-${n}`]
  const role = name => c[`role-${name}-${name === 'success' ? RAMP.success : RAMP.role}`] ?? c[`role-${name}-fill`]
  return { s0: g(RAMP.s0), s1: g(RAMP.s1), s2: g(RAMP.s2), s3: g(RAMP.s3), t1: g(RAMP.t1), t2: g(RAMP.t2), t3: g(RAMP.t3),
    accent: role('accent'), success: role('success'), warning: role('warning'), danger: role('danger'), pro: role('pro') }
}
export const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})` }

/** One window of the app, `w` × `h` CSS px, with the look's scene behind it; `st` says which panels are open. */
export function windowHtml(look, w, h, st, phone, guides = false) {
  const p = palette(look)
  const glass = look.args.backdrop?.glass ?? {}
  const left = phone ? 0 : st.side ? APP.sidebar : 0
  const right = phone ? 0 : st.panel ? APP.panel : 0
  const mid = left + (w - left - right) / 2
  const col = phone ? w - 32 : Math.min(APP.column, w - left - right - 64)
  const pw = phone ? w - 24 : Math.min(APP.prompt.width, w - left - right - 48)
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(look.scene?.source ?? '<svg xmlns="http://www.w3.org/2000/svg"/>')}`
  const gx0 = mid - col / 2 - APP.glassEdge, gx1 = mid + col / 2 + APP.glassEdge
  const k = t => `<span style="color:${p.accent}">${t}</span>`, v = t => `<span style="color:${p.warning}">${t}</span>`
  const s = t => `<span style="color:${p.success}">${t}</span>`, f = t => `<span style="color:${p.danger}">${t}</span>`
  const guide = !guides ? '' : `
<div style="position:absolute;left:${left}px;right:${right}px;top:${phone ? 0 : APP.title}px;bottom:0;outline:3px dashed rgba(80,255,120,.9);outline-offset:-3px"></div>
<div style="position:absolute;left:${mid - col / 2}px;width:${col}px;top:${phone ? 60 : APP.columnTop}px;bottom:${APP.prompt.bottom + APP.prompt.height + 16}px;background:rgba(255,60,60,.13);outline:2px dashed rgba(255,80,80,.9)"></div>
<div style="position:absolute;left:${mid - pw / 2}px;width:${pw}px;bottom:${APP.prompt.bottom - 20}px;height:${APP.prompt.height + 40}px;background:rgba(255,60,60,.13);outline:2px dashed rgba(255,80,80,.9)"></div>`
  const hatch = 'repeating-linear-gradient(45deg,rgba(255,255,255,.07) 0 6px,transparent 6px 14px)'
  return `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}html,body{width:${w}px;height:${h}px;overflow:hidden;background:${p.s0};color:${p.t1};font:14px/1.55 -apple-system,"Helvetica Neue",sans-serif}
.abs{position:absolute}
</style>
<img class="abs" style="left:0;top:0;width:${w}px;height:${h}px" src="${src}">
<div class="abs" style="left:${gx0}px;width:${gx1 - gx0}px;top:0;bottom:0;backdrop-filter:blur(${glass.blur ?? 6}px);background:${rgba(glass.tint ?? p.s0, glass.opacity ?? 0.4)};-webkit-mask-image:linear-gradient(90deg,transparent,#000 ${APP.glassEdge}px,#000 calc(100% - ${APP.glassEdge}px),transparent)"></div>
${phone ? '' : `<div class="abs" style="left:0;right:0;top:0;height:${APP.title}px;border-bottom:1px solid ${rgba(p.t3, 0.12)};display:flex;align-items:center;padding-left:${left + 90}px;font-size:13px;color:${p.t2}">Migrate the vantlewell</div>`}
${st.side && !phone ? `<nav class="abs" style="left:0;top:0;bottom:0;width:${APP.sidebar}px;background:${p.s1};border-right:1px solid ${rgba(p.t3, 0.15)};padding:52px 14px;font-size:13px;color:${p.t2};line-height:2.3${guides ? `;background-image:${hatch}` : ''}">+ New<br>Search<br>Artifacts<br>Scheduled<br><br><span style="color:${p.t3}">Projects</span><br>glimmerfold<br><span style="color:${p.t1};background:${p.s3};padding:3px 8px;border-radius:6px">Plimwick cache drift</span><br>orbi-tassel<br>Zentaro sketches</nav>` : ''}
${st.panel && !phone ? `<aside class="abs" style="right:0;top:${APP.title}px;bottom:0;width:${APP.panel}px;background:${p.s0};border-left:1px solid ${rgba(p.t3, 0.15)};padding:20px 16px;font-size:13px;color:${p.t2};line-height:2.2${guides ? `;background-image:${hatch}` : ''}">Environment<br>This computer<br>main<br><br>Context<br><span style="color:${p.t3}">7% used</span><br><span style="color:${p.accent}">■</span> MCP tools<br><span style="color:${p.danger}">■</span> System tools<br><span style="color:${p.success}">■</span> System prompt<br><span style="color:${p.warning}">■</span> Skills</aside>` : ''}
<main class="abs" style="left:${mid - col / 2}px;width:${col}px;top:${phone ? 60 : APP.columnTop}px;display:flex;flex-direction:column;gap:14px">
<div style="align-self:flex-end;max-width:80%;background:${p.s3};padding:9px 13px;border-radius:12px">Can you plonk the vantlewell so it stops wibbling on cold starts?</div>
<div style="font-size:13px;color:${p.t2};border:1px solid ${rgba(p.t3, 0.2)};background:${p.s2};padding:8px 12px;border-radius:10px"><span style="color:${p.success}">●</span> Read <b style="color:${p.t1}">src/vantle/well.ts</b> <span style="color:${p.t3}">· 84 lines</span></div>
<div>The wibble comes from <span style="color:${p.accent};border-bottom:1px solid ${rgba(p.accent, 0.4)}">zorpify()</span> running before the trellis is warm. Glomming it behind a flag keeps the first frame still.</div>
<pre style="background:${p.s1};border:1px solid ${rgba(p.t3, 0.15)};border-radius:10px;padding:10px 12px;font:12px/1.6 ui-monospace,Menlo,monospace;color:${p.t2};white-space:pre-wrap">${k('if')} (!${v('well')}.warm) ${k('await')} ${f('warm')}(${v('well')})
${k('return')} zorpify(${v('well')}, { mode: ${s("'quiet'")} })</pre>
<div style="color:${p.t3};font-size:13px">Snorbled 2 files. <span style="color:${p.danger}">1 test failed</span>, <span style="color:${p.warning}">1 warning</span>, <span style="color:${p.success}">11 passed</span>.</div>
</main>
<div class="abs" style="left:${mid - pw / 2}px;width:${pw}px;bottom:${APP.prompt.bottom}px;height:${APP.prompt.height}px;background:${p.s1};border:1px solid ${rgba(p.t3, 0.3)};border-radius:10px;display:flex;align-items:center;padding:0 14px;color:${p.t3}">+&nbsp;&nbsp;⏎ to send, ⌘⏎ to queue for later</div>
<div class="abs" style="left:${mid - pw / 2}px;width:${pw}px;bottom:14px;text-align:right;font-size:12px;color:${p.t3}">Opus 5.5 <span style="color:${p.accent}">Medium</span> Auto</div>
${guide}`
}

