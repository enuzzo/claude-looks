// Writes a scene out in full: each <use href="#id"/> becomes a <g> holding a copy of #id, and a
// definition nothing points at any more is dropped. Used by abyssal. It also gives a scene's true
// drawing cost, the one the budget in docs/DIRECTION.md counts: what the app draws once every <use>
// is expanded.

// every element with an id, by id: its tag, the rest of its open tag, what it holds, and where it sits
function definitions(svg) {
  const found = new Map()
  const open = /<(\w+)\s+id="([^"]+)"([^>]*?)(\/?)>/g
  let m
  while ((m = open.exec(svg))) {
    if (m[4] === '/') continue
    const tag = m[1]
    const start = m.index + m[0].length
    const tags = new RegExp(`<(/?)${tag}\\b[^>]*?(/?)>`, 'g')
    tags.lastIndex = start
    let depth = 1, t
    while (depth && (t = tags.exec(svg))) if (t[2] !== '/') depth += t[1] ? -1 : 1
    found.set(m[2], { tag, attrs: m[3], inner: svg.slice(start, t.index), from: m.index, to: t.index + t[0].length })
  }
  return found
}

export function inlineUses(svg) {
  let out = svg
  for (let pass = 0; pass < 4 && /<use\b/.test(out); pass++) {
    const defs = definitions(out)
    out = out.replace(/<use\s+([^>]*?)\/>/g, (all, attrs) => {
      const ref = attrs.match(/(?:xlink:)?href="#([^"]+)"/)
      const d = ref && defs.get(ref[1])
      if (!d) return all
      let rest = attrs.replace(ref[0], '')
      const x = rest.match(/\bx="([^"]+)"/), y = rest.match(/\by="([^"]+)"/)
      rest = rest.replace(/\b[xy]="[^"]+"/g, '').replace(/\s+/g, ' ').trim()
      const move = x || y ? ` transform="translate(${x ? x[1] : 0} ${y ? y[1] : 0})"` : ''
      const body = d.tag === 'g' || d.tag === 'symbol' ? d.inner : `<${d.tag}${d.attrs}>${d.inner}</${d.tag}>`
      const own = d.tag === 'g' ? d.attrs.trim() : ''
      return `<g${move}${rest ? ' ' + rest : ''}${own ? ' ' + own : ''}>${body}</g>`
    })
  }
  // drop the definitions inside <defs> that nothing names any more
  const a = out.indexOf('<defs>'), b = out.indexOf('</defs>')
  if (a < 0 || b < 0) return out
  const defs = definitions(out.slice(a, b + 7))
  const named = id => new RegExp(`(?:href="#|url\\(#)${id.replace(/[-]/g, '\\-')}[")]`).test(out)
  const drop = [...defs].filter(([id]) => !named(id)).map(([, d]) => [a + d.from, a + d.to]).sort((p, q) => q[0] - p[0])
  // keep only the outermost of nested spans
  let s = out, last = Infinity
  for (const [from, to] of drop) if (to <= last) { s = s.slice(0, from) + s.slice(to); last = from }
  return s
}
