# Glowfathom

A browser game set in the deep sea. You start as a tiny glowing tank made of
bubbles. Pop the creatures around you, collect the bubbles they drop, and
grow into one of ten forms across three branches. Get hit and bubbles are
knocked out of you; lose enough and you shrink back. Explore a 7×7 grid of
arenas that gets harder toward the edges, and find the two guardians in the
corners.

No install, no build step, no dependencies: plain JavaScript and the HTML
canvas.

## Run it

Browsers only load JavaScript modules over HTTP, so serve the repository
with any static web server. From the repository root, with Python:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/tools/glowfathom/> (or
<http://localhost:8000> for the landing page that links to it).

Unlike a single-file tool, the game is several files, so it can't be opened
by double-clicking `index.html`. To publish it on its own, upload this
folder to any static host; only `index.html`, `css/` and `js/` are needed.

## Controls

| Input | Action |
|---|---|
| WASD | Move |
| Mouse | Aim |
| Left click | Fire |
| Right click | Ability (final forms only) |
| Hold a movement key into an edge | Cross into the next arena |
| Esc, or the pause button | Pause |
| 1, 2, 3 | Pick a form when evolving |
| T / O / R (paused) | Class tree / settings / restart |

Your run saves itself every time you change arena or pause; the title
screen offers Continue.

## Debug tools

Add `?debug` to the address (<http://localhost:8000/tools/glowfathom/?debug>), then press F3
for the overlay. With the overlay open:

| Key | Action |
|---|---|
| = / - | Add or remove 50 bubbles |
| B | Spawn menu: any enemy or boss |
| P | Add 300 enemies (stress test) |

`?seed=123` makes a run repeatable (combine flags with `&`, for example
`?debug&seed=123`). `?test` exposes the game to automated
browser checks.

## Changing the balance

Every number lives in `js/data/`:

| File | What it holds |
|---|---|
| `tuning.js` | Evolution thresholds, movement, camera, pickups, arena size, effects |
| `classes.js` | The ten forms: speed, pickup radius, weapon, ability, body shape |
| `weapons.js` | Every weapon: fire rate, damage, speed, spread, special behaviour |
| `enemies.js` | Every enemy and boss, their attacks, and the arena rosters |

After a change, run the balance report (from this folder):

```bash
npm run balance
```

It prints how long each form takes to kill each enemy, then plays the real
game in Node with a scripted player once per final form and reports when it
reached tier 2, tier 3 and each boss, against the pacing targets (3, 10 and
20 minutes). It takes about half a minute. The scripted player never
dodges, so treat its times as a rough guide, not a promise.

## Tests

From this folder:

```bash
npm test
```

Runs the unit and game-rule tests with Node's built-in test runner (Node 18
or later). Game rules are kept free of browser code so they can be tested
this way.

## Layout

```
index.html, css/style.css
js/main.js          browser wiring: canvas, input, screens, saving, loop
js/game.js          world state and the fixed-step update
js/screens.js       which screen moves are allowed
js/save.js          save format and validation
js/world.js         the arena grid
js/audio.js         synthesised sound
js/data/            every tunable number
js/entities/        player and enemies
js/systems/         game rules: movement, weapons, attacks, evolution, ...
js/render/          drawing
js/ui/              HUD, minimap, menus
scripts/            balance report and its scripted player
tests/              Node tests
BUILD_CHECKLIST.md  the build plan, with a log of every session
```
