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
