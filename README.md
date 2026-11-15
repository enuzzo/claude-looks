# claude-looks

Looks for the Claude desktop and mobile apps: a color theme, and sometimes a slowly moving
scene behind the conversation. One plugin, `looks`, many looks, switched with `/look`.

![Synthwave sunset](docs/screenshots/synthwave-sunset-scene.png)

> The terminal and editor integrations draw no looks; the desktop and mobile apps do.
> An unofficial, community collection.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install looks --marketplace enuzzo/claude-looks
```

Answer `y` to add the marketplace, then pick a scope (user scope puts it in every session).

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then
**Plugins**, **Add marketplace** with `enuzzo/claude-looks`, then **Add plugin**.

## Use

| Command | What it does |
|---|---|
| `/look` | lists the looks as buttons, marking the one worn: press one to wear it |
| `/look preview` | the same list with a small picture of each look (desktop and mobile apps) |
| `/look <name>` | wears a look; it is remembered, and every new session starts with it |
| `/look off` | back to the app's own look |

A fresh install wears `synthwave-sunset`.

> The moving scenes are drawn by the app's backdrop layer, which the desktop app is still rolling
> out: where it is not on yet, a look brings its colors and no scene. Nothing to change in the
> plugin; the scene appears once the app draws backdrops.

## The looks

### `synthwave-sunset`

Dark only. A striped sun sinking on the left, its bands slowly drifting down, wireframe mountains on the right, a sky of twinkling ASCII stars, and a neon grid rolling toward you. Every so often something small happens: a light runs down the grid, a spark traces the ridge, a star shoots by, the horizon flares. Hot pink accent; errors stay red, successes go neon mint, warnings amber. Respects *reduce motion*.

| Desktop | Phone |
|---|---|
| ![Synthwave sunset on desktop](docs/screenshots/synthwave-sunset-dark-desktop.png) | <img src="docs/screenshots/synthwave-sunset-dark-mobile.png" alt="Synthwave sunset on a phone" width="260"> |

### `home-computer`

Dark only. A blue-on-blue 8-bit boot screen inside a thick lavender border, with rainbow raster bars rolling through the top and bottom of the border, a pixel saucer, rocket and hot-air balloon drifting along the top, and a blinking block cursor. Light blue accent; errors stay red, successes go 8-bit green, warnings yellow. Respects *reduce motion*.

| Desktop | Phone |
|---|---|
| ![Home computer on desktop](docs/screenshots/home-computer-dark-desktop.png) | <img src="docs/screenshots/home-computer-dark-mobile.png" alt="Home computer on a phone" width="260"> |

### `digital-rain`

Dark only. Columns of green half-width katakana, digits and letters fall at their own slow pace, each led by a white-hot glyph with a trail fading to dark; thick at the edges, a few dim drops in the middle. Bright green accent; errors stay a muted red, warnings amber. Respects *reduce motion*.

| Desktop | Phone |
|---|---|
| ![Digital rain on desktop](docs/screenshots/digital-rain-dark-desktop.png) | <img src="docs/screenshots/digital-rain-dark-mobile.png" alt="Digital rain on a phone" width="260"> |

### `neon-punk`

Dark only. A grimy back-alley wall (a generated painting, inlined in the scene) splashed with magenta and acid-green paint, lit by neon you never see: its light flickers on the bricks, paint drops slide off the drips, the wet ground glints, and now and then a passing car's headlight sweeps across. Acid yellow-green accent, magenta for pro; errors stay red, warnings amber. Respects *reduce motion*.

| Desktop | Phone |
|---|---|
| ![Neon punk on desktop](docs/screenshots/neon-punk-dark-desktop.png) | <img src="docs/screenshots/neon-punk-dark-mobile.png" alt="Neon punk on a phone" width="260"> |

### `cyberpunk`

Dark only. A rain-soaked megacity at night: towers along both edges with lit and blinking windows, glowing sign strips of abstract glyphs, slow searchlights, and small flying lights crossing high above while thin rain slants down. Electric cyan accent with hot yellow and magenta. Respects *reduce motion*.

| Desktop | Phone |
|---|---|
| ![Cyberpunk on desktop](docs/screenshots/cyberpunk-dark-desktop.png) | <img src="docs/screenshots/cyberpunk-dark-mobile.png" alt="Cyberpunk on a phone" width="260"> |

### `aurora`

Dark only. A polar night full of stars, with soft green-to-violet curtains slowly swaying across the top, above snowy hills and dark pines gathered at both edges. Aurora green accent with violet; success is a yellow-green so it stays apart from the accent. Respects *reduce motion*.

| Desktop | Phone |
|---|---|
| ![Aurora on desktop](docs/screenshots/aurora-dark-desktop.png) | <img src="docs/screenshots/aurora-dark-mobile.png" alt="Aurora on a phone" width="260"> |

### `steampunk`

Light and dark. A brass-and-steam workshop: meshing brass, copper and steel gears turn in the corners, a copper pipe carries a gauge with a twitching needle, and steam puffs drift up and fade. Parchment and ink by day, lamp-lit mahogany by night; copper accent, verdigris green, oxblood red. Respects *reduce motion*.

| Light | Dark | Phone |
|---|---|---|
| ![Steampunk, light, on desktop](docs/screenshots/steampunk-light-desktop.png) | ![Steampunk, dark, on desktop](docs/screenshots/steampunk-dark-desktop.png) | <img src="docs/screenshots/steampunk-light-mobile.png" alt="Steampunk on a phone" width="200"> |

### `solarpunk`

Light and dark. Vines and leaves hang from the top corners and sway, a soft sun glows in one corner, slim white wind turbines turn on green hills at the bottom edges, and pollen drifts past (fireflies by night). Leaf-green accent, sunflower warnings, sky-teal pro. Respects *reduce motion*.

| Light | Dark | Phone |
|---|---|---|
| ![Solarpunk, light, on desktop](docs/screenshots/solarpunk-light-desktop.png) | ![Solarpunk, dark, on desktop](docs/screenshots/solarpunk-dark-desktop.png) | <img src="docs/screenshots/solarpunk-light-mobile.png" alt="Solarpunk on a phone" width="200"> |

### `atomic-age`

Light and dark. A world-of-tomorrow sky in turquoise and cream: an atom turns in one corner, a ringed planet bobs in the other, starbursts twinkle and a finned rocket traces a slow arc overhead, with boomerangs at the bottom corners. Atomic orange accent; mint successes, mustard warnings, turquoise pro. Respects *reduce motion*.

| Light | Dark | Phone |
|---|---|---|
| ![Atomic age, light, on desktop](docs/screenshots/atomic-age-light-desktop.png) | ![Atomic age, dark, on desktop](docs/screenshots/atomic-age-dark-desktop.png) | <img src="docs/screenshots/atomic-age-light-mobile.png" alt="Atomic age on a phone" width="200"> |

### `zen-garden`

Light and dark. Raked sand rings around mossy stones at the corners and long parallel lines elsewhere, with a faint shimmer moving through the rings, while a maple branch lets a few red leaves drift down. Rice paper by day, moonlit stone by night; moss accent, deep red errors. Respects *reduce motion*.

| Light | Dark | Phone |
|---|---|---|
| ![Zen garden, light, on desktop](docs/screenshots/zen-garden-light-desktop.png) | ![Zen garden, dark, on desktop](docs/screenshots/zen-garden-dark-desktop.png) | <img src="docs/screenshots/zen-garden-light-mobile.png" alt="Zen garden on a phone" width="200"> |

### `ascii-tide`

Dark only. Everything is a glyph: a sea of drifting characters rolling toward you in perspective, a shaded ASCII moon with a shimmering path on the water, clouds of `~` and `-` and twinkling `+` and `*` stars. Every so often a star falls into the sea and rings of `o` open where it lands, and a faint scan line sweeps down. Mint accent on ink-blue. Respects *reduce motion*.

| Desktop | Phone |
|---|---|
| ![ASCII tide on desktop](docs/screenshots/ascii-tide-dark-desktop.png) | <img src="docs/screenshots/ascii-tide-dark-mobile.png" alt="ASCII tide on a phone" width="260"> |

### `koi-script`

Light and dark. A koi pond seen from above as a mosaic where every tile carries a glyph: koi of ideogram tiles glide past lily pads and pebble beds, their tails flicking between frames while light ripples across the water. By day the water is sunlit jade, by night moonlit ink-teal with lantern-warm koi; now and then a ring of ripples spreads from a lily pad, or a koi flicks and turns. Respects *reduce motion*.

| Light | Dark | Phone |
|---|---|---|
| ![Koi script, light, on desktop](docs/screenshots/koi-script-light-desktop.png) | ![Koi script, dark, on desktop](docs/screenshots/koi-script-dark-desktop.png) | <img src="docs/screenshots/koi-script-light-mobile.png" alt="Koi script on a phone" width="200"> |

### `abyssal`

Dark only. The deep sea at night, drawn in block elements and box-drawing glyphs: a jellyfish pulses with its tentacles trailing, a siphonophore chain sways, and an anglerfish hovers behind the glow of its lure while motes of light rise over a faint sonar grid. Now and then a ripple of light runs along the chain, a shoal of tiny glyph fish darts past, or the lure blinks. Respects *reduce motion*.

| Desktop | Phone |
|---|---|
| ![Abyssal on desktop](docs/screenshots/abyssal-dark-desktop.png) | <img src="docs/screenshots/abyssal-dark-mobile.png" alt="Abyssal on a phone" width="260"> |

### `mosaic-sky`

Dark only. A night sky set like an old broadcast teletext page: cloud banks of quadrant-block mosaics drift at their own speeds under a cratered mosaic moon, stars blink between two colours and a distant city keeps a few windows lit. Now and then a refresh line wipes down the page, a stepped shooting star crosses, or a cloud edge changes colour. Respects *reduce motion*.

| Desktop | Phone |
|---|---|
| ![Mosaic sky on desktop](docs/screenshots/mosaic-sky-dark-desktop.png) | <img src="docs/screenshots/mosaic-sky-dark-mobile.png" alt="Mosaic sky on a phone" width="260"> |

### `dot-matrix`

Dark only. A motorway information panel at night: a black field of faint amber LED dots, lit only in the top and bottom bands with a red ring, chevrons that light in sequence, a hazard triangle with alternating lanterns, lane signals and a slow ticker of abstract signs, the middle left dark for the words. Now and then a scan row refreshes the panel, a chevron train runs across, or a cluster of dots pulses. Respects *reduce motion*.

| Desktop | Phone |
|---|---|
| ![Dot matrix on desktop](docs/screenshots/dot-matrix-dark-desktop.png) | <img src="docs/screenshots/dot-matrix-dark-mobile.png" alt="Dot matrix on a phone" width="260"> |

### `kawaii`

Light and dark. A strawberry-milk sky with a smiling sun by day, a lavender-indigo night with a sleeping crescent moon after dark: puffy clouds wear tiny kaomoji faces and blink now and then, glyph stars twinkle, and a mochi bunny on a mint hill sends up little hearts. Once in a while a ✧ shoots across the sky, a cloud squishes or the bunny hops. Respects *reduce motion*.

| Light | Dark | Phone |
|---|---|---|
| ![Kawaii, light, on desktop](docs/screenshots/kawaii-light-desktop.png) | ![Kawaii, dark, on desktop](docs/screenshots/kawaii-dark-desktop.png) | <img src="docs/screenshots/kawaii-light-mobile.png" alt="Kawaii on a phone" width="200"> |

*The screenshots are mock-ups drawn by `tools/preview.mjs`: the look's real colors and scene,
with an invented conversation.*

## Make a look

1. Make `hooks/looks/<name>/` with:
   - `palette.js`: colors through `makeColors` from `hooks/make-colors.js` (surface and text
     anchors per mode, plus `accent`, `danger`, `success`, `warning`, `pro`). No line of its
     `problems` may start with "Desktop won't paint", or the app ignores the whole look.
   - `scene.js` (optional): an SVG string with a `viewBox` and
     `preserveAspectRatio="xMidYMid slice"`, animated by CSS in its own `<style>` only, under
     131,072 characters, with nothing important in the middle (the words) or at the foot (the
     prompt box).
     The scenes here are generated by the scripts in `tools/scenes/` (seeded, so a run without
     changes writes the same file): edit the script, run it with `node`, never the `scene.js`.
   - `index.js`: a default export shaped like `Look` in `hooks/looks/types.d.ts`.
2. Add it to `LOOKS` in `hooks/looks/index.js`.
3. Check it (and see [AGENTS.md](AGENTS.md) for the gitleaks checks before a commit):
   ```bash
   claude plugin validate .claude-plugin/plugin.json
   ```
   ```bash
   claude plugin test .
   ```
4. Screenshot it for this README (needs Google Chrome; set `CHROME` to use another path):
   ```bash
   node tools/preview.mjs <name>
   ```
5. Try it live: add this folder as a marketplace, so edits need only `/reload-plugins`.
   ```bash
   claude plugin marketplace add .
   ```
   ```bash
   claude plugin install looks@claude-looks
   ```

`hooks/make-colors.js` and `.d.ts` come from Claude Code's plugin-authoring skill. Copy them
again when Claude Code updates: an old copy falls behind the design system.

Ideas for looks are welcome as issues; looks themselves as pull requests. Keep them your own
art: the spirit of a place or an era, never someone else's logo, artwork or font.

## License

[MIT](LICENSE).
