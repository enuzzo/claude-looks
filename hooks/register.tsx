import type { EngineInterface, Register } from 'claude-code'

import { DEFAULT_LOOK, LOOKS } from './looks/index.js'

// The chosen look lives in the plugin's store, so it survives restarts and
// follows every session; 'off' means the app's own look.
const STORE_KEY = 'look'
const OFF = 'off'

const findLook = (id: string) => LOOKS.find(look => look.id === id)

// Where no theme noun is offered (the plugin test kit), a look is only remembered.
const NO_THEME = { isDrawn: false as const, reason: 'this host draws no looks' }

async function clearLook($: EngineInterface) {
  try {
    await $.theme.clear()
  } catch {
    // No theme noun here: nothing to clear.
  }
}

async function apply($: EngineInterface, id: string) {
  const look = findLook(id)

  if (look === undefined) {
    await clearLook($)
    return { isDrawn: false as const, reason: 'off' }
  }

  const unpainted = look.problems.find(line => line.startsWith("Desktop won't paint"))

  if (unpainted !== undefined) {
    $.ui.toast(`${look.label}: ${unpainted}`)
  }

  try {
    return await $.theme.set(look.args)
  } catch {
    return NO_THEME
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'look',
      description: 'Switch the look: /look lists them, /look <name> wears one, /look off goes back to the app’s own.',
      argumentHint: '[name|off]',
    })
    const stored = await $.store.get(STORE_KEY)
    const id = typeof stored === 'string' ? stored : DEFAULT_LOOK

    if (id !== OFF) {
      const set = await apply($, id)

      if (!set.isDrawn && 'reason' in set) {
        $.ui.status(set.reason)
      }
    }

    return next(e)
  })

  on('command.run', { command: 'look' }, async ($, e) => {
    const wanted = e.args.trim().toLowerCase()
    const stored = await $.store.get(STORE_KEY)
    const current = typeof stored === 'string' ? stored : DEFAULT_LOOK

    if (wanted === '') {
      const lines = LOOKS.map(look => `${look.id === current ? '▸' : ' '} ${look.id} — ${look.description}`)
      lines.push(`${current === OFF ? '▸' : ' '} off — the app’s own look`)
      return { text: `Looks:\n${lines.join('\n')}\n\n/look <name> to switch.` }
    }

    if (wanted === OFF) {
      await $.store.set(STORE_KEY, OFF)
      await $.theme.clear()
      return { text: 'Back to the app’s own look.' }
    }
    const look = findLook(wanted)

    if (look === undefined) {
      return { text: `No look named “${wanted}”. Known: ${LOOKS.map(l => l.id).join(', ')}, off.` }
    }
    await $.store.set(STORE_KEY, look.id)
    const set = await apply($, look.id)

    return { text: set.isDrawn ? `Now wearing ${look.label}.` : `Chose ${look.label}; nothing draws here (${'reason' in set ? set.reason : 'unknown'}).` }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    const scene = LOOKS.find(look => look.args.backdrop !== undefined && 'scene' in look.args.backdrop && look.args.backdrop.scene === e.props.scene)?.scene

    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || scene === undefined) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    return <Svg source={scene.source} alt={scene.alt} isInteractive />
  })
}
