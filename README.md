# MMM-DisplayRuler

A [MagicMirror²](https://magicmirror.builders/) module that overlays two
elementary-school-style rulers — one across the top measuring **width**,
one down the left measuring **height** — accurately marked in the actual
pixels of whatever display it's running on. The two rulers overlap in the
top-left corner, just like laying two real rulers across a desk to measure
something's width and height at once.

It's built for one job: letting you eyeball exact pixel positions and
distances on your mirror's screen (handy when you're laying out other
modules, debugging CSS, or just curious). It automatically re-measures
itself if the browser window or display resolution changes — no need to
hardcode `1920x1080` anywhere.

## Features

- Draws real pixel rulers sized to the **actual detected viewport**, not a
  hardcoded resolution — works the same on a 1080p display, a phone-sized
  MagicMirror kiosk, or a 4K TV.
- Accounts for `devicePixelRatio` so tick lines stay crisp on HiDPI screens.
- Long/medium/short tick marks (every 100px / 50px / 10px by default),
  all configurable.
- A small badge in the bottom-right corner spelling out the exact
  `width × height` and device pixel ratio it measured, so you don't have
  to count ticks to confirm the total.
- Wood-toned, hand-drawn-ruler look with a highlighted "0" origin square
  where the two rulers cross.
- Redraws automatically on resize/rotation, debounced so it doesn't
  hammer the canvas.
- No `node_helper.js`, no external dependencies, no backend calls —
  everything happens client-side in the browser window MagicMirror
  already opens.

## Installation

SSH into your Pi (or wherever MagicMirror runs) and clone the module into
your `modules` folder:

```bash
cd ~/MagicMirror/modules
git clone https://github.com/mrjrask/MMM-DisplayRuler.git
cd MMM-DisplayRuler
npm install
```

`npm install` won't actually install anything (there are no runtime
dependencies) — it's just there so the folder behaves like a normal npm
package if you ever add something later.

Then restart MagicMirror (e.g. `pm2 restart mm`, or whatever your PM2
process is named) after adding the config below.

## Configuration

Add it to the `modules` array in `config/config.js`. Because it's meant
to cover the whole screen, give it a `fullscreen` position rather than
one of the normal regions:

```javascript
{
    module: "MMM-DisplayRuler",
    position: "fullscreen_above", // draws on top of every other module
    config: {
        rulerThickness: 70,
        minorTick: 10,
        mediumTick: 50,
        majorTick: 100,
        showDimensionsLabel: true
    }
}
```

Use `position: "fullscreen_below"` instead if you'd rather have your
other modules render on top of the rulers.

### Options

| Option                | Type      | Default                          | Description |
|------------------------|-----------|-----------------------------------|--------------|
| `rulerThickness`       | `number`  | `70`                              | Width/height of each ruler bar, in pixels. |
| `minorTick`            | `number`  | `10`                              | Spacing (px) between the shortest, unlabeled tick marks. Must be a positive number — an invalid value falls back to the default and logs a warning. |
| `mediumTick`           | `number`  | `50`                              | Spacing (px) between medium-length, unlabeled tick marks. |
| `majorTick`            | `number`  | `100`                             | Spacing (px) between long tick marks that get a pixel-value label. |
| `colorBody`            | `string`  | `"#e8d3a2"`                       | Base wood-tone color of the ruler bars. |
| `colorBodyAlt`         | `string`  | `"#d9bd82"`                       | Secondary color used for the faint wood-grain lines. |
| `colorTicks`           | `string`  | `"#241c11"`                       | Color of the tick marks. |
| `colorText`            | `string`  | `"#241c11"`                       | Color of the tick numbers. |
| `colorAccent`          | `string`  | `"#c23b2c"`                       | Color of the ruler edge line, the corner "0" square, and the dimension badge border. |
| `fontFamily`           | `string`  | `"'Courier New', Courier, monospace"` | Font used for all ruler labels. |
| `showDimensionsLabel`  | `boolean` | `true`                            | Show/hide the `width × height` badge in the bottom-right corner. |
| `updateOnResize`       | `boolean` | `true`                            | Automatically redraw when the window/display size changes. |

## How the pixel measurements work

On `getDom()` and on every (debounced) `resize` event, the module reads
`window.innerWidth`, `window.innerHeight`, and `window.devicePixelRatio`,
then:

1. Sets the `<canvas>` element's backing store to
   `innerWidth * dpr` × `innerHeight * dpr` so lines are sharp on HiDPI
   screens, while its CSS size stays `innerWidth`×`innerHeight`.
2. Scales the drawing context by `dpr` so all the drawing code below can
   just work in plain CSS pixels.
3. Draws tick marks at `minorTick`/`mediumTick`/`majorTick` intervals
   from `0` up to the full width and height.

That means the ruler is always measuring the real, current viewport of
the Electron/browser window MagicMirror is running in — resize the
window, rotate a display, or move the config to a different Pi with a
different monitor, and the ruler re-measures itself instead of assuming
1920×1080.

## File structure

```
MMM-DisplayRuler/
├── MMM-DisplayRuler.js   # module definition + all drawing logic
├── MMM-DisplayRuler.css  # fullscreen overlay + canvas styling
├── package.json
├── README.md
└── .gitignore
```

There's no `node_helper.js` — this module doesn't need anything from
Node.js or the filesystem, so it's purely front-end.

## License

MIT
