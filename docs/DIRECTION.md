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
2. **One subject, in the open field.** Each look has one subject, plus at most one or two quiet
   companions, placed on the grid below (Layout): in the band beside the conversation that no panel of
   the app covers, never under the sidebar or the right panel, never across the conversation or the
   prompt box.
3. **Slow.** Ambient cycles last 20 s or more; a crossing takes minutes; a subject's own motion (a wing,
   a flame, a wave) takes 8 to 20 s per cycle. Frames switch like the pages of a flipbook, a
   few seconds apart (rule 9 says why they do not fade). If you notice it move from the corner of your eye while reading, it is too fast.
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
9. **Budget.** A scene under 131,072 characters (aim for half); a poster (below) under 12,000. What
   matters more is the cost of drawing one frame. The desktop app plays a scene as an image and times
   each frame; when the mean over 3 s passes 5.56 ms it stops the scene for good on a still copy (the
   "runs 3 seconds, then snaps to its first frame"). `node tools/qa/scenes.mjs` times it the same way:
   aim under 2.5 ms, and `tools/release.sh` refuses anything over 4.5. What makes a frame cheap, measured
   (2026-11-17, on this bench):
   - **Switch, don't fade.** A flipbook of frames shown one at a time with `visibility` (or a strip of
     frames moved by `translate`), timed with `steps()`, costs a sixth of the same frames cross-faded
     with `opacity`: a group at `opacity:0` under a running fade is still drawn every frame.
   - **`steps()` on every animation**, the slower the better: smooth timing redraws every frame.
   - **One `<text>` per row**, never one per glyph; **flat fills** on moving type, not gradients; **no
     masks** on moving parts; **few moving elements**.
   - **Never flash.** No large, fast changes of brightness or of red: the app stops those too.
   - **Write copies out.** The app draws `<use>`, but a copy written out is cheaper to draw (abyssal:
     3.3 ms against 4.9). Generators pass their output through `tools/scenes/inline-uses.mjs`; a copy
     has no id, so style it by class, never by `#id`.
10. **Valid, or nothing.** The app throws away a scene that is not well-formed XML (one duplicate
   attribute is enough) or that fails its validator: only `href="#id"` and `url(#id)`, no `data:`, no
   backslash, no `<image>` or `<foreignObject>`, listed CSS functions and at-rules only. The still copy
   it falls back on has every animation removed, so the base state must be the finished picture: nothing
   at `opacity:0` waiting for a keyframe to fade it in.

## Layout: the app's grid

The scene fills the whole window, under everything. Measured in the desktop app (2026-11-17, in CSS
pixels; `APP` in `tools/qa/layout.mjs` holds them, change them there when the app changes):

| Part | Size | What it does to the scene |
|---|---|---|
| title bar | 40 px at the top | drawn over the scene |
| sidebar | 236 px from the left, when open | opaque: hides what is under it |
| right panel | 296 px from the right, when open | opaque: hides what is under it |
| conversation column | 680 px, centred between the open panels | glass behind it (the look's blur and tint), fading out 48 px past each side |
| prompt box | 712 × 42 px, 40 px from the foot, centred like the column | opaque |

Panels are px, the scene scales with the window (`slice`: by the larger of width/1600 and height/1000),
so the same viewBox point lands in a different place on each screen. Worked out for a 1600 × 1000
viewBox at the usual windows (1280 × 800 to 3440 × 1440), with the panels open and closed:

- **The open field is the left band, 270 to 550 units from the left edge, with `xMin…` anchoring.**
  From 1440 px up it is clear with the sidebar open or closed, and the right panel never reaches it;
  with both panels open, or on a 1280 px window, part of it slides under the column's glass, where a
  subject still shows, softened. Put the subject here: its middle near 400, nothing that must be read
  past 550.
- **0 to 270 from the left is the sidebar band**: gone whenever the sidebar is open. Only what may
  vanish goes there: an edge, a frame, a haze.
- **The right band (0 to 290 units from the right, `xMax…`)** is clear only while the right panel is
  closed, and wholly covered when it opens. A subject there disappears with the panel: use it only for a
  companion, never for the subject.
- **Height:** wide windows crop the top (16:9 by 100 units, 21:9 by 330), so anchor at the foot
  (`…YMax`) and keep what matters between 340 and 960.
- **The middle** (the column) is under glass and text: only ground, light and haze, nothing with edges.
- **Phone:** the conversation covers the whole width; the scene is a soft field behind glass. The
  subject's colours and light must still read there, its shapes need not.

## Colours: the whole interface

A look dresses the app, not only the backdrop. `makeColors` (hooks/make-colors.js) takes:

- the gray ramp, anchored at `surface-0` to `surface-3` (page, sidebar and panels, cards, raised parts)
  and `text-primary`, `text-secondary`, `text-muted`: **set all seven**. Every border, ring, divider,
  field and the prompt box's outline is derived from this ramp (an alpha of the text over the surface),
  so it is set here or nowhere; there is no per-token override, and type faces cannot be changed.
- the five roles, `accent`, `danger`, `success`, `warning`, `pro`: **set all five**, from the look's own
  world (the machine's palette, the sunset's neon), lifted until they read on `surface-3`.
- `git`: added, removed, modified, merged, from the same roles.

`surface-0` is the colour of the scene's ground under the column, so page and scene meet without a seam,
and the glass `tint` is the same colour. Surfaces stay within a few steps of each other (the sidebar and
panels are big flat areas: a bright one shouts). The `problems` list notes every pair under its contrast
target: keep it no longer than the published looks' (6 to 13 lines), and never let a line start with
"Desktop won't paint".

## Check it by eye, always

Numbers pass scenes that look wrong. Before a look ships, and after every change to its scene, palette
or glass, look at it in the app's frame:

```bash
node tools/qa/layout.mjs <look> --guides
```

It draws the look (each dress) behind a stand-in of the desktop app in the look's own colours: four
window sizes, each with the sidebar and the right panel open and closed, and a phone. With `--guides`
the open field is outlined in green, the column and the prompt box in red, the panels hatched. Open every
sheet and check: the subject is in the green field with the sidebar open; nothing is lost under a panel
that matters; the column's text reads over the scene; the sidebar, panels, prompt box and roles look like
one world with the scene. Then look at it in the app itself.

## Making one

- Scenes come from `tools/scenes/*.mjs`, seeded, never edited by hand.
- Each look also exports a `poster`: a still, small SVG (`<svg viewBox=... width="320" height="180">`)
  of the scene's composition, drawn by `/look preview`. The preview never embeds a whole scene: sixteen
  animated scenes in one message is more than the app will draw.
- A look may carry a second dress for daylight (`day` in its `index.js`: its own palette and scene, from
  the same generator and within the same budget), worn by the local hour, read when the look is put on. No timers that
  redraw the backdrop: each change to its tree replaces the scene and restarts its animations.
- Check a scene in motion, not only in stills: render frames at 30 fps over 10 s and watch them.
- Check it in the app's frame with `node tools/qa/layout.mjs <id> --guides` (Check it by eye, above), and
  shoot the README pictures with `node tools/preview.mjs <id>`.

## Register

Only reworked looks are published. The others wait in `drafts/` (ignored by git, local only)
until they meet this standard.

| Look | Rework | Subject |
|---|---|---|
| `abyssal` | **done** (2026-11-16) | a raymarched ASCII manta gliding low in the open field on the left; jellies far off on the right; a rare turtle |
| `synthwave-sunset` | **done** (2026-11-17, calmer rework) | a banded sun of type on the horizon in the open field on the left, low glyph ridges, a field of grid dots drifting toward you; rare horizon light and falling star |
| `ascii-tide` | **done** (2026-11-16) | a moon ray-cast into glyphs high in the open field on the left; a perspective sea of type with its light on the water; rare falling stars |
| `koi-script` | **done** (2026-11-16) | three raymarched ASCII koi in three coats, sized and placed by the golden ratio, circling low in the open field on the left; rings of dots in the near one's wake; a rare petal; night water, and jade water with caustics by day |
| `mosaic-sky` | withdrawn to `drafts/` | |
| `dot-matrix` | withdrawn to `drafts/` | |
| `digital-rain` | **done** (2026-11-16) | a slow curtain of glyph rain hanging from the sidebar's edge, three depths; a rare lone column in the empty field |
| `home-computer` | **done** (2026-11-17, C64 rework) | an 8-bit machine's screen: its log at the top of the open field, below it a frameless block-mosaic moon (the sun by day) dissolving into the blue loading from tape in the bottom-left, raster stripes in the light-blue border; a rare sprite ship |
| `neon-punk` | withdrawn to `drafts/` (its wall is a generated image) | |
| `cyberpunk` | withdrawn to `drafts/` | |
| `aurora` | withdrawn to `drafts/` | |
| `steampunk` | withdrawn to `drafts/` | |
| `solarpunk` | withdrawn to `drafts/` | |
| `atomic-age` | withdrawn to `drafts/` | |
| `zen-garden` | withdrawn to `drafts/` | |
| `kawaii` | withdrawn to `drafts/` | |
