import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { DEFAULT_LOOK, LOOKS } from './looks/index.js'
import type { Look, LookScene } from './looks/types'
import { previewCard } from './preview-card.js'

// The chosen look lives in the plugin's store, so it survives restarts and
// follows every session; 'off' means the app's own look. The session's copy in
// $.state is what the /look list draws its marker from.
const STORE_KEY = 'look'
const OFF = 'off'
const PREVIEW = 'preview'
const current = atom({ plugin: 'looks', key: 'current' } as const, DEFAULT_LOOK)

const findLook = (id: string) => LOOKS.find(look => look.id === id)

// The backdrop names the plugin that set it; installed from a marketplace the
// name may carry it (`looks@claude-looks`).
const isOurs = (plugin: string) => plugin === 'looks' || plugin.startsWith('looks@')

// Where no theme noun is offered (the plugin test kit), a look is only remembered.
const NO_THEME = { isDrawn: false as const, reason: 'this host draws no looks' }

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error))

// Builds before the backdrop was named by `id` took `scene` instead, and refuse
// an attribute they do not know: the same theme, spelled the old way.
function withSceneKey(args: ThemeSetArgs) {
  if (args.backdrop === undefined) {
    return undefined
  }
  const { id, ...rest } = args.backdrop
  return { ...args, backdrop: { ...rest, scene: id } } as unknown as ThemeSetArgs
}

async function clearLook($: EngineInterface) {
  try {
    await $.theme.clear()
  } catch {
    // No theme noun here: nothing to clear.
  }
}

// The local hour, by the engine's clock (the plugin's own where the host answers none).
async function localHour($: EngineInterface) {
  try {
    return new Date(await $.clock.now()).getHours()
  } catch {
    return new Date().getHours()
  }
}

// A look with a daylight dress wears it between its hours. The choice is made when
// the look is put on, at session start or by /look. No timer: each change to the
// backdrop's tree replaces the scene in the desktop app and restarts its animations.
async function argsFor($: EngineInterface, look: Look) {
  if (look.day === undefined) {
    return look.args
  }
  const hour = await localHour($)
  const [from, to] = look.day.hours

  return hour >= from && hour < to ? look.day.args : look.args
}

// Every scene by its backdrop's id: each look's own, and its daylight one.
const SCENES = new Map<string, LookScene>()

for (const look of LOOKS) {
  for (const dress of [look, look.day]) {
    const backdropId = (dress?.args.backdrop as { id?: string } | undefined)?.id

    if (dress?.scene !== undefined && backdropId !== undefined) {
      SCENES.set(backdropId, dress.scene)
    }
  }
}

async function apply($: EngineInterface, id: string) {
  const look = findLook(id)

  if (look === undefined) {
    await clearLook($)
    return { isDrawn: false as const, reason: 'off' }
  }
  const args = await argsFor($, look)

  const unpainted = look.problems.find(line => line.startsWith("Desktop won't paint"))

  if (unpainted !== undefined) {
    $.ui.toast(`${look.label}: ${unpainted}`)
  }

  try {
    return await $.theme.set(args)
  } catch (error) {
    if (/no implementation/.test(messageOf(error))) {
      return NO_THEME
    }
    const legacy = withSceneKey(args)

    if (legacy !== undefined) {
      try {
        return await $.theme.set(legacy)
      } catch {
        // Not the old spelling either: report the first refusal.
      }
    }
    return { isDrawn: false as const, reason: `the app refused the theme: ${messageOf(error)}` }
  }
}

// Wears a look (or 'off'): remembers it, then draws it. Answers one line.
async function wear($: EngineInterface, id: string) {
  await $.store.set(STORE_KEY, id)
  await update($, current, () => id)

  if (id === OFF) {
    await clearLook($)
    return 'Back to the app’s own look.'
  }
  const look = findLook(id)
  const set = await apply($, id)
  $.ui.status(undefined) // clears a refusal shown at session start

  return set.isDrawn ? `Now wearing ${look?.label ?? id}.` : `Chose ${look?.label ?? id}; nothing draws here (${'reason' in set ? set.reason : 'unknown'}).`
}

async function storedLook($: EngineInterface) {
  const stored = await $.store.get(STORE_KEY)
  return typeof stored === 'string' ? stored : DEFAULT_LOOK
}

function listText(worn: string) {
  const lines = LOOKS.map(look => `${look.id === worn ? '▸' : ' '} ${look.id} — ${look.description}`)
  lines.push(`${worn === OFF ? '▸' : ' '} off — the app’s own look`)
  return `Looks:\n${lines.join('\n')}\n\n/look <name> to switch, /look preview for pictures.`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'look',
      description: 'Switch the look: /look lists them, /look preview shows them, /look <name> wears one, /look off goes back.',
      argumentHint: '[name|preview|off]',
    })
    const id = await storedLook($)
    await update($, current, () => id)

    // Only a look this version still has: a stored id it lacks (a renamed or
    // removed look) must not clear another plugin's theme at session start.
    if (findLook(id) !== undefined) {
      const set = await apply($, id)

      // Only a refusal is worth a status line. A desktop session starts before its window attaches,
      // so "no client draws themes yet" is normal there: the theme stands and draws once it does.
      if (!set.isDrawn && 'reason' in set && set.reason.startsWith('the app refused')) {
        $.ui.status(set.reason)
      } else {
        $.ui.status(undefined)
      }
    }

    return next(e)
  })

  on('command.run', { command: 'look' }, async ($, e) => {
    const wanted = e.args.trim().toLowerCase()

    if (wanted === '' || wanted === PREVIEW) {
      return { text: listText(await storedLook($)) }
    }

    if (wanted !== OFF && findLook(wanted) === undefined) {
      return { text: `No look named “${wanted}”. Known: ${LOOKS.map(l => l.id).join(', ')}, off.` }
    }

    return { text: await wear($, wanted) }
  })

  // The list /look prints, drawn as buttons that wear a look when pressed;
  // /look preview adds a small picture of each on the apps.
  on('ui.render', { component: 'CommandOutput', props: { command: 'look' } }, async ($, e, next) => {
    const args = e.props.args.trim().toLowerCase()

    if (e.props.isErrored || (args !== '' && args !== PREVIEW)) {
      return next(e)
    }
    const worn = await read($, current)
    const { Box, Text, Button } = $.ui.resolve(e)
    const row = (id: string, label: string, description: string) => (
      <Box key={id} flexDirection="row" gap={1}>
        <Button key={id} plain onPress={() => wear($, id)}>{`${id === worn ? '▸' : ' '} ${label}`}</Button>
        <Text dimColor>{description}</Text>
      </Box>
    )

    if (args === PREVIEW && (e.surface === 'desktop' || e.surface === 'mobile')) {
      const { Svg } = $.ui.resolve(e)

      return (
        <Box flexDirection="column" gap={1}>
          {LOOKS.map(look => (
            <Box key={look.id} flexDirection="column">
              <Svg source={previewCard(look)} alt={`${look.label}: ${look.description}`} width={320} height={180} />
              {row(look.id, look.label, look.description)}
            </Box>
          ))}
          {row(OFF, 'Off', 'the app’s own look')}
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        {LOOKS.map(look => row(look.id, look.label, look.description))}
        {row(OFF, 'Off', 'the app’s own look')}
        <Text dimColor>Press one to wear it{args === PREVIEW ? ' (pictures show in the desktop and mobile apps)' : ', or /look preview for pictures'}.</Text>
      </Box>
    )
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    // Older builds name the backdrop `scene`, newer ones `id`.
    const props = e.props as { id?: string; scene?: string }
    const name = props.id ?? props.scene
    const scene = name === undefined ? undefined : SCENES.get(name)

    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || !isOurs(e.props.plugin) || scene === undefined) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    return <Svg source={scene.source} alt={scene.alt} isInteractive />
  })
}
