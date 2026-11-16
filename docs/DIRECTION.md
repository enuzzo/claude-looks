# Direction

How a look in this collection is made, and where each one stands. Read it before touching a scene.

## The idea

A look sits behind hours of work. It should feel like a window left open on something quiet and
strange, never like a screensaver competing with the words. Calm, slow, a little mysterious; the
longer you look, the more you notice.

The model is the set of backdrops shown when themes came to Claude Code: a soft field of colour, mostly
empty, and one small subject held at an edge or in a corner (a mosaic turtle, a halftone sun, a stand of
ASCII pines). The middle, where the conversation sits, stays clear.

## Rules

1. **Code is the material.** Glyphs, block mosaics, halftone dots, dot matrices, type set on a grid,
   and solids raymarched into ASCII at build time (`tools/scenes/ascii3d.mjs`). No photographs, no
   painted or generated images, no cartoon vector drawings (outlined shapes filled with flat colour).
   Gradients are for light and atmosphere only: a sky, a glow, a haze.
2. **One subject, at an edge.** Each look has one subject, anchored to a corner or edge with
   `preserveAspectRatio` (`xMaxYMax slice` keeps the bottom-right in view on every screen), plus at
   most one or two quiet companions. Nothing important crosses the middle third or the foot, where the
   prompt box is.
3. **Slow.** Ambient cycles last 20 s or more; a crossing takes minutes; a subject's own motion (a wing,
   a flame, a wave) takes 8 to 20 s per cycle. Frames dissolve into one another (crossfaded flipbooks),
   they do not step. If you notice it move from the corner of your eye while reading, it is too fast.
4. **Rare events, never in sync.** A surprise (a visitor, a falling star, a light passing) comes on a
   long cycle, minutes apart, with durations that share no factor (co-prime: 151 s, 487 s, 613 s), so
   the scene never visibly loops.
5. **Depth.** Two or three layers at different sizes, brightness and speeds. Far is smaller, dimmer,
   closer to the ground colour and slower.
6. **Nothing arbitrary.** Every element has a reason, a place and a pace chosen by hand. Seeded
   randomness is for texture (the scatter of plankton, the grain of a halftone), never for composition:
   the subject, its path and its timing are designed. A scene generator run twice writes the same file.
7. **Dark and low.** Contrast lives in the subject; the ground stays close to `surface-0`. The glass
   over the scene is light (blur 3 to 8, opacity 0.3 to 0.55) so the type of a glyph scene still reads.
8. **Still is composed.** Under *reduce motion* every animation stops, and the frame left must be a
   finished picture: subject in place, no half-faded frames, no event caught mid-way.
9. **Budget.** A scene under 131,072 characters (aim for half); a poster (below) under 12,000. And a
   drawing budget, which matters more: the desktop app lets a scene run for a few seconds and then
   stops it on its first frame when it animates too much type (found 2026-11-16 by taking abyssal
   apart: at 9,500 glyphs and 50k characters with every `<use>` expanded it ran, at 12,900 glyphs and
   61k it stopped). Keep a scene, `<use>` expanded (`tools/scenes/inline-uses.mjs`), under about
   7,000 glyphs and 50k characters: fewer flipbook frames, fewer copies, a still frame for a far subject.
10. **No `<use>`.** The desktop app draws nothing a `<use>` points at. Generators write the scene out
   in full with `tools/scenes/inline-uses.mjs`; a copy has no id, so style by class, never by `#id`.

## Making one

- Scenes come from `tools/scenes/*.mjs`, seeded, never edited by hand.
- Each look also exports a `poster`: a still, small SVG (`<svg viewBox=... width="320" height="180">`)
  of the scene's composition, drawn by `/look preview`. The preview never embeds a whole scene: sixteen
  animated scenes in one message is more than the app will draw.
- A look may carry a second dress for daylight (`day` in its `index.js`: its own palette and scene, from
  the same generator and within the same budget), worn by the local hour, read when the look is put on. No timers:
  with a plugin timer (`$.clock.every`) running, every backdrop in the desktop app stopped a few seconds in.
- Check a scene in motion, not only in stills: render frames at 30 fps over 10 s and watch them.
- Check it behind the app's glass with `node tools/preview.mjs <id>`, desktop and phone.

## Register

Only reworked looks are published. The others wait in `drafts/` (ignored by git, local only)
until they meet this standard.

| Look | Rework | Subject |
|---|---|---|
| `abyssal` | **done** (2026-11-16) | a raymarched ASCII manta gliding in the bottom-right corner; jellies at the edge; a rare turtle |
| `synthwave-sunset` | **done** (2026-11-16) | a sun made of type, a glyph ridge, a slow neon grid; rare sparks |
| `ascii-tide` | **done** (2026-11-16) | a moon ray-cast into glyphs in the top-right; a perspective sea of type with its light on the water; rare falling stars |
| `koi-script` | **done** (2026-11-16) | three raymarched ASCII koi in three coats, sized and placed by the golden ratio, circling in the bottom-right corner; rings of dots in the near one's wake; a rare petal; night water, and jade water with caustics by day |
| `mosaic-sky` | withdrawn to `drafts/` | |
| `dot-matrix` | withdrawn to `drafts/` | |
| `digital-rain` | **done** (2026-11-16) | a slow curtain of glyph rain at the right edge, three depths; a rare lone column in the empty field |
| `home-computer` | **done** (2026-11-16) | a block-mosaic moon loading from tape in the bottom-left; raster stripes at the left edge |
| `neon-punk` | withdrawn to `drafts/` (its wall is a generated image) | |
| `cyberpunk` | withdrawn to `drafts/` | |
| `aurora` | withdrawn to `drafts/` | |
| `steampunk` | withdrawn to `drafts/` | |
| `solarpunk` | withdrawn to `drafts/` | |
| `atomic-age` | withdrawn to `drafts/` | |
| `zen-garden` | withdrawn to `drafts/` | |
| `kawaii` | withdrawn to `drafts/` | |
