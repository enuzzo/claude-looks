import { expect, test, type TestBody } from 'claude-code/testing'

const START = { cwd: '/', surface: 'desktop', isInteractive: true } as const

// What the engine stamps on every /look typed at the prompt.
const look = (args: string) => ({
  command: 'look',
  args,
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 80 },
}) as const

function engine(on: Parameters<TestBody>[1], stored: unknown) {
  const store = new Map<string, unknown>(stored === undefined ? [] : [['look', stored]])
  on('command.register', () => ({ value: { command: 'look' } }))
  on('store.get', (_, e) => ({ value: store.get(e.key) }))
  on('store.set', (_, e) => {
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  return { store }
}

test('a new session starts on synthwave-sunset', async ($, on) => {
  const seen = engine(on, undefined)

  on('command.run', () => ({ text: 'engine' }))
  await $.session.start(START)
  expect(seen.store.has('look')).toBe(false)
  expect((await $.command.run(look(''))).text).toMatch(/▸ synthwave-sunset/)
})

test('a session after /look off stays off', async ($, on) => {
  const seen = engine(on, 'off')

  on('command.run', () => ({ text: 'engine' }))
  await $.session.start(START)
  expect((await $.command.run(look(''))).text).toMatch(/▸ off/)
})

test('/look lists, refuses an unknown name and switches (off needs the real theme noun)', async ($, on) => {
  const seen = engine(on, undefined)

  on('command.run', () => ({ text: 'engine' }))
  await $.session.start(START)

  const list = await $.command.run(look(''))
  expect(list.text).toMatch(/▸ synthwave-sunset/)

  const unknown = await $.command.run(look('nope'))
  expect(unknown.text).toMatch(/No look named/)

  await seen.store.set('look', 'off')
  const back = await $.command.run(look('Synthwave-Sunset'))
  expect(back.text).toMatch(/Synthwave sunset/)
  expect(seen.store.get('look')).toBe('synthwave-sunset')
})

const OUTPUT = (args: string, surface: 'desktop' | 'terminal') => ({
  plugin: 'looks',
  component: 'CommandOutput',
  requestId: 'look-row',
  surface,
  props: { command: 'look', args, text: '', isErrored: false },
}) as const

test('/look draws a button per look, and pressing one wears it', async ($, on) => {
  const seen = engine(on, undefined)

  on('command.run', () => ({ text: 'engine' }))
  await $.session.start(START)

  const ui = await $.ui.mount(OUTPUT('', 'terminal'))
  expect((await ui.findAll({ type: 'Button' })).length).toBeGreaterThan(2)
  await ui.press({ key: 'off' })
  expect(seen.store.get('look')).toBe('off')
  await ui.unmount()
})

test('/look preview draws a picture of each look on the apps', async ($, on) => {
  engine(on, undefined)

  on('command.run', () => ({ text: 'engine' }))
  await $.session.start(START)

  const ui = await $.ui.mount(OUTPUT('preview', 'desktop'))
  const pictures = await ui.findAll({ type: 'Svg' })
  expect(pictures.length).toBeGreaterThan(0)
  await ui.unmount()
})

// The attributes $.theme.set takes (ThemeSetArgs, ThemeBackdrop): it refuses any other by name,
// so a renamed one must fail here, not in the app. Builds have named the backdrop `scene`, then
// `id`, then (2.1.325) `scene` again; the plugin sends `id` and falls back to `scene`.
const THEME_KEYS = ['backdrop', 'colors']
const BACKDROP_KEYS = ['id', 'scene', 'glass', 'colorScheme']

test('every look sets a theme this build takes', async ($, on) => {
  engine(on, undefined)
  on('theme.set', (_, e) => {
    const attributes = e as unknown as Record<string, unknown>
    const unknown = [
      ...Object.keys(attributes).filter(key => !THEME_KEYS.includes(key)),
      ...Object.keys((attributes.backdrop ?? {}) as object).filter(key => !BACKDROP_KEYS.includes(key)).map(key => `backdrop.${key}`),
    ]
    return unknown.length > 0 ? { deny: `unknown attribute ${unknown.join(', ')}` } : { value: { isDrawn: true, requestId: 'backdrop' } }
  })

  on('command.run', () => ({ text: 'engine' }))
  await $.session.start(START)

  const list = (await $.command.run(look(''))).text ?? ''
  const names = [...list.matchAll(/^[ ▸] ([a-z0-9-]+) —/gm)].map(m => m[1] ?? '').filter(id => id !== '' && id !== 'off')
  expect(names.length).toBeGreaterThan(2)

  for (const id of names) {
    expect((await $.command.run(look(id))).text).toMatch(/^Now wearing/)
  }
})

test('a stored look this version lacks leaves the theme alone at start', async ($, on) => {
  engine(on, 'a-look-that-was-removed')
  let cleared = false
  on('theme.clear', () => {
    cleared = true
    return { value: { isDrawn: false, reason: 'cleared' } }
  })

  await $.session.start(START)
  expect(cleared).toBe(false)
})

const BACKDROP = (id: string, plugin: string, surface: 'desktop' | 'mobile') => ({
  plugin: 'looks',
  component: 'Backdrop',
  requestId: 'backdrop',
  surface,
  props: { id, plugin, glass: { blur: 3, opacity: 0.76 } },
}) as const

test('the backdrop draws every look that has a scene', async ($, on) => {
  engine(on, undefined)
  on('command.run', () => ({ text: 'engine' }))
  await $.session.start(START)

  const list = (await $.command.run(look(''))).text ?? ''
  const names = [...list.matchAll(/^[ ▸] ([a-z0-9-]+) —/gm)].map(m => m[1] ?? '').filter(id => id !== '' && id !== 'off')

  for (const surface of ['desktop', 'mobile'] as const) {
    for (const plugin of ['looks', 'looks@claude-looks']) {
      for (const id of names) {
        const ui = await $.ui.mount(BACKDROP(id, plugin, surface))
        const pictures = await ui.findAll({ type: 'Svg' })
        expect({ id, surface, plugin, pictures: pictures.length }).toEqual({ id, surface, plugin, pictures: 1 })
        await ui.unmount()
      }
    }
  }
})

// A look with a daylight dress picks it by the local hour, each time it is put on.
test('koi-script wears jade water by day and night water after dusk', async ($, on) => {
  engine(on, 'koi-script')
  let hour = 12
  const worn: unknown[] = []
  on('clock.now', () => ({ value: new Date(2026, 10, 16, hour).getTime() }))
  on('theme.set', (_, e) => {
    // builds name the backdrop `id` or `scene`
    const backdrop = (e as unknown as { backdrop?: { id?: string; scene?: string } }).backdrop ?? {}
    worn.push(backdrop.id ?? backdrop.scene)
    return { value: { isDrawn: true, requestId: 'backdrop' } }
  })
  on('command.run', () => ({ text: 'engine' }))

  await $.session.start(START)
  hour = 22
  await $.command.run(look('koi-script'))
  hour = 7
  await $.command.run(look('koi-script'))
  expect(worn).toEqual(['koi-script-day', 'koi-script', 'koi-script-day'])

  for (const id of ['koi-script', 'koi-script-day']) {
    const ui = await $.ui.mount(BACKDROP(id, 'looks', 'desktop'))
    expect((await ui.findAll({ type: 'Svg' })).length).toBe(1)
    await ui.unmount()
  }
})
