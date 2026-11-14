import { expect, test } from 'claude-code/testing'

const START = { cwd: '/', surface: 'desktop', isInteractive: true } as const

function engine(on: Parameters<Parameters<typeof test>[1]>[1], stored: unknown) {
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
  expect((await $.command.run({ command: 'look', args: '' })).text).toMatch(/▸ synthwave-sunset/)
})

test('a session after /look off stays off', async ($, on) => {
  const seen = engine(on, 'off')

  on('command.run', () => ({ text: 'engine' }))
  await $.session.start(START)
  expect((await $.command.run({ command: 'look', args: '' })).text).toMatch(/▸ off/)
})

test('/look lists, refuses an unknown name and switches (off needs the real theme noun)', async ($, on) => {
  const seen = engine(on, undefined)

  on('command.run', () => ({ text: 'engine' }))
  await $.session.start(START)

  const list = await $.command.run({ command: 'look', args: '' })
  expect(list.text).toMatch(/▸ synthwave-sunset/)

  const unknown = await $.command.run({ command: 'look', args: 'nope' })
  expect(unknown.text).toMatch(/No look named/)

  await seen.store.set('look', 'off')
  const back = await $.command.run({ command: 'look', args: 'Synthwave-Sunset' })
  expect(back.text).toMatch(/Synthwave sunset/)
  expect(seen.store.get('look')).toBe('synthwave-sunset')
})
