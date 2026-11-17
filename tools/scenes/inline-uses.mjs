// Writes every <use href="#id"/> out as a copy of #id, and drops definitions nothing points at any more.
// The desktop app draws <use> (it passes the validator), but on the frame-cost bench a written-out scene is
// cheaper: abyssal measured 3.3 ms written out against 4.9 ms with <use> (tools/qa/scenes.mjs, 2026-11-17).
// A copy has no id, so style it by class, never by #id. Attributes of the <use> and of the definition's own
// <g> never land on one element twice (0.3.6 wrote `style` twice and the app threw the koi scene away): when
// they share a name, the definition's attributes go on a nested <g>.

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

const attributes = text => new Map([...text.matchAll(/([^\s=]+)="([^"]*)"/g)].map(m => [m[1], m[2]]))
const write = map => [...map].map(([k, v]) => ` ${k}="${v}"`).join('')

export function inlineUses(svg) {
  let out = svg
  for (let pass = 0; pass < 4 && /<use\b/.test(out); pass++) {
    const defs = definitions(out)
    out = out.replace(/<use\s+([^>]*?)\/>/g, (all, attrs) => {
      const ref = attrs.match(/(?:xlink:)?href="#([^"]+)"/)
      const d = ref && defs.get(ref[1])
      if (!d) return all
      const outer = attributes(attrs.replace(ref[0], ''))
      const x = outer.get('x'), y = outer.get('y')
      outer.delete('x'); outer.delete('y')
      if (x || y) {
        const move = `translate(${x ?? 0} ${y ?? 0})`
        outer.set('transform', outer.has('transform') ? `${outer.get('transform')} ${move}` : move)
      }
      const body = d.tag === 'g' || d.tag === 'symbol' ? d.inner : `<${d.tag}${d.attrs}>${d.inner}</${d.tag}>`
      const own = d.tag === 'g' ? attributes(d.attrs) : new Map()
      if ([...own.keys()].some(k => outer.has(k))) return `<g${write(outer)}><g${write(own)}>${body}</g></g>`
      for (const [k, v] of own) outer.set(k, v)
      return `<g${write(outer)}>${body}</g>`
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
