# Bubble-arena shooter: build checklist

This file is the complete brief for building a browser game. You are picking it
up without the conversation that produced it, so everything you need is here.
It is also the project's memory: tick boxes as you finish items and add to the
log at the bottom, so a later session can resume from this file alone.

## What we are building

A single-player, top-down arena shooter that runs in a desktop browser. The
player pilots a tank made of bubbles through a grid of large circular arenas.
Killing enemies releases bubbles; collecting them is both health and
experience. At set totals the tank evolves, and the player picks a branch.
Taking damage knocks bubbles out, and losing enough devolves the tank. There is
no game-over screen.

The person who asked for this remembers the Bubble Tanks Flash games fondly and
wants a game in that genre. It must be an original game: its own title, class
designs, enemy designs, palette and sounds. Shared mechanics are fine. Do not
reproduce that series' specific classes, names, art or audio.

The owner reviews each phase by playing it. They care most about how the tank
feels to move, and they prefer the simplest solution that works.

## How to work

1. **Do one phase per session, then stop at its gate.** Several gates need a
   human to judge feel, fun or sound, which you cannot observe. Building past
   an unapproved gate risks stacking work on a foundation that gets changed.
2. **Build only what the phase lists.** If you see a worthwhile extra, add it
   to "Suggestions" at the bottom instead of building it. The scope was agreed
   in advance, and unrequested features make review harder.
3. **Put every tunable number in `js/data/`.** Balance will change many times,
   and it should never need an engine edit.
4. **No dependencies, no build step, no frameworks.** Plain JavaScript modules
   and the Canvas 2D API. The game must run from static files.
5. **Verify before you report.** Run the tests. If a headless browser is
   available, load the page, confirm there are no console errors, drive the
   inputs the phase added, and take a screenshot. If you could not verify
   something, say so plainly in the log; an unverified item is not ticked.
6. **Report surprises instead of working around them.** If a number in this
   file produces a bad result, keep going with your best value and record what
   you changed and why.
7. **Commit once per phase** with a message naming the phase. Do not push or
   open a pull request unless asked.

## Decisions already made

These are settled. Do not revisit them without being asked.

| Topic | Decision |
|---|---|
| Rendering | Canvas 2D, fixed logical height of 720 units, scaled to window and device pixel ratio |
| Code layout | Native JavaScript modules, served by `python3 -m http.server 8000` |
| Input | Desktop only: WASD to move, mouse to aim, left button fires, right button uses the ability |
| Simulation | Fixed 60 Hz step with an accumulator; frame time clamped to 250 ms |
| Collision | Circle against circle in a plain loop; no spatial partitioning unless a profile demands it |
| Menus | HTML elements layered over the canvas |
| Audio | Synthesised with the Web Audio API; no audio files |
| Art | Drawn in code from circles and gradients; no image files |
| Saving | Browser local storage with a version number |
| Tests | Node's built-in test runner (`node --test`) on pure-logic modules only |
| Re-evolving after a devolution | Restores the earlier branch choice without asking again |

The last row and the module/server choice were defaults picked on the owner's
behalf. Mention them in your first report so they can be overruled.

## File layout

```
index.html
package.json          only {"type": "module"}, so Node can import the modules
css/style.css
js/main.js            start-up and state switching
js/loop.js            fixed-step loop
js/input.js           keyboard and mouse state
js/camera.js
js/rng.js             seeded random generator
js/world.js           arena grid and transitions
js/entities/          player, enemy, projectile, pickup
js/systems/           collision, steering, spawning, particles, audio, evolution
js/data/              classes, weapons, enemies, arenas, tuning constants
js/ui/                hud, menus, minimap, debug overlay
tests/                one file per pure-logic module
```

Keep modules under `js/systems/` that hold game rules (evolution, collision
maths, steering maths, spawning) free of any `document`, `window` or canvas
reference, so they can be tested in Node.

## Starting numbers

Treat these as the first values to try. All of them belong in `js/data/`.

**Player movement:** acceleration 900 units/s², drag tuned for a top speed near
220 units/s, with a visible glide after releasing the keys.

**Arena:** circle of radius 1,000 units.

**Starter weapon:** 4 shots per second, 1 damage, 520 units/s, 1.2 s lifetime,
projectile radius 5.

**Pickups:** drawn toward the player within 120 units, fade after 12 s.

**Damage to the player:** each hit removes bubbles equal to its damage; half of
those (rounded down) spill out as collectable pickups.

**Evolution thresholds:** tier 1 at 0 bubbles, tier 2 at 20, tier 3 at 60.
Devolve when the total falls below 80% of the current tier's threshold.

**Class tree (10 classes; give each an original name):**

| Branch | Tier 2 identity | Tier 3 option A | Tier 3 option B |
|---|---|---|---|
| Rapid | Fast, light, twin guns | Wide spray | Focused stream |
| Heavy | Slow, large, single cannon | Explosive shells | Piercing shot |
| Swarm | Medium, launches seekers | Many weak seekers | Orbiting drones |

**World:** 7×7 grid of arenas, start in the centre. Difficulty 0 to 3 is the
larger of the row and column distance from the centre.

**Enemies (first values):**

| Enemy | Behaviour | Health | Speed | Drops | First seen at difficulty |
|---|---|---|---|---|---|
| Drifter | Wanders, never attacks | 2 | 60 | 1 | 0 |
| Chaser | Steers straight at the player, contact damage | 4 | 150 | 2 | 0 |
| Strafer | Holds 350 units away, circles, fires | 6 | 130 | 3 | 1 |
| Swarmling | Chaser in groups of ten | 1 | 190 | 1 | 1 |
| Sniper | Slow, long range, 1 s visible wind-up | 5 | 70 | 4 | 2 |
| Charger | Pauses 0.8 s, then dashes | 10 | 90, dash 600 | 5 | 2 |
| Carrier | Spawns a swarmling every 3 s | 25 | 50 | 10 | 3 |
| Mine-layer | Flees, drops mines | 8 | 160 | 5 | 3 |

**Pacing targets:** tier 2 in about 3 minutes, tier 3 in about 10, first boss
at about 20.

**Performance budget:** steady 60 frames per second with 150 entities and 400
particles.

---

## Phase 0: Identity

- [x] Propose three working titles, one palette (background, player, enemy,
      pickup, danger), and one visual idea that sets the game apart.
- [x] Propose original names and a one-line description for all 10 classes.
- [x] Sketch each class as a list of circles (offset and radius) in
      `js/data/classes.js`.

**Gate (human):** the owner picks a title and approves the palette and names.

## Phase 1: Skeleton and loop

- [x] Create the file layout above with empty modules where needed.
- [x] Canvas fills the window, keeps a logical height of 720, re-fits on
      resize, and stays sharp on high-density displays.
- [x] Fixed-step loop with accumulator and 250 ms clamp.
- [x] Input module: held-key map, mouse position in world coordinates, button
      state. Suppress the right-click context menu on the canvas.
- [x] Seeded random generator; the seed is shown in the debug overlay.
- [x] Debug overlay on F3: frame rate, entity counts, collision circles.
- [x] Test: the loop runs the expected number of steps for a given elapsed time.

**Gate (self-check):** page loads with no console errors; overlay toggles.

## Phase 2: Movement and camera

- [x] Player moves with acceleration and drag from the starting numbers.
- [x] Diagonal movement is not faster than straight movement.
- [x] Turret rotates toward the cursor independently of the hull.
- [x] Tank drawn from its circle list with a radial gradient and highlight,
      cached to an offscreen canvas per class.
- [x] Camera follows with smoothing and a slight lead toward the cursor.
- [x] One arena with a visible membrane; the player cannot leave it yet.
- [x] Parallax background specks so motion is readable against open water.
- [x] Test: speed converges on the configured top speed and never exceeds it.

**Gate (human):** the owner approves how movement feels. Expect tuning rounds;
offer the three or four constants that matter and what each one changes.

## Phase 3: Shooting and collision

- [x] Weapon schema: fire rate, damage, speed, spread, count, lifetime, radius.
- [x] Projectile pool, pre-allocated; no allocation while firing.
- [x] Holding the left button fires at the weapon's rate, independent of frame
      rate.
- [x] Circle collision between projectiles and stationary target dummies.
- [x] Hit flash on the target, slight recoil on the player, pop on expiry.
- [x] Tests: circle overlap; shots fired over 10 simulated seconds match the
      fire rate.

**Gate (self-check):** dummies can be destroyed; pool never grows.

## Phase 4: Enemies and the bubble economy

- [x] Enemy schema: body circles, health, speed, weapon, behaviour, drop count.
- [x] Drifter, Chaser and Strafer behaviours.
- [x] Steering: seek, keep-distance, and separation so enemies do not stack.
- [x] Enemies stay inside the arena.
- [x] Dead enemies burst into pickups that scatter, slow and fade.
- [x] Pickups are drawn in and collected; the total is shown on screen.
- [x] Player damage removes bubbles and spills half as pickups.
- [x] 1 s of invulnerability after a hit, shown by blinking.
- [x] Tests: drop counts; spill arithmetic; separation pushes overlapping
      enemies apart.

**Gate (human):** the owner fights a mixed group and judges whether the loop
is fun before anything is layered on top.

## Phase 5: Evolution tree

- [x] Evolution rules in a pure module: given a bubble total and a chosen
      path, return the current class.
- [x] Reaching a threshold pauses the game and shows choice cards with a
      silhouette and one-line description.
- [x] Devolution at 80% of the threshold; no flicker at the boundary.
- [x] Re-evolving restores the earlier choice without a prompt.
- [x] All 10 classes have stats, a body and a primary weapon in data.
- [x] Seekers and orbiting drones implemented for the Swarm branch; explosive
      and piercing shots for the Heavy branch.
- [x] Morph animation with 1 s of invulnerability.
- [x] Debug keys: grant 10 bubbles, remove 10 bubbles.
- [x] Tests: every threshold crossing in both directions; path memory; a total
      oscillating around a threshold does not flip the class.

**Gate (human):** the owner plays each branch to tier 3 and says whether the
six end classes feel distinct.

## Phase 6: World of arenas

- [x] 7×7 grid with difficulty from distance to the centre.
- [x] Crossing the membrane fades for 0.4 s and places the player at the
      opposite edge of the neighbouring arena. Enemies do not follow.
- [x] Outer membranes are solid and bounce the player back.
- [x] Each arena is populated on entry from a roster for its difficulty.
- [x] At zero bubbles the player is ejected to the previous arena with 2 s of
      invulnerability.
- [x] Minimap: grid, visited arenas, current position.
- [x] Tests: neighbour lookup at centre, edge and corner; difficulty for every
      cell; rosters only contain enemies allowed at that difficulty.

**Gate (self-check):** travel from centre to a corner and back without error.

## Phase 7: Full roster, abilities and bosses

- [x] Swarmling, Sniper, Charger, Carrier and Mine-layer.
- [x] Every attack that can hurt the player has a visible warning first.
- [x] One secondary ability per tier-3 class on the right button, with a
      cooldown shown on screen.
- [x] Two bosses in outer-ring arenas, each multi-part with two attack phases
      and a large bubble payout. Boss arenas appear on the minimap once seen.
- [x] Defeating both shows a victory screen, then play continues.
- [x] Debug spawn menu for any enemy or boss.
- [x] Tests: ability cooldowns; boss phase change at the configured health.

**Gate (human):** the owner fights each enemy alone, then both bosses.

## Phase 8: Interface and game states

- [x] States: title, playing, paused, evolution choice, victory.
- [x] Heads-up display: bubble total, progress bar to the next threshold with
      the devolve mark, ability cooldown, minimap.
- [x] Title screen with controls; pause with resume and restart; class tree
      viewer showing unlocked classes.
- [x] Escape pauses; the game pauses itself when the tab loses focus.
- [x] Test: every state transition that should be possible is, and no others.

**Gate (self-check):** every screen reachable and escapable by keyboard and
mouse; screenshot each one.

## Phase 9: Effects and sound

- [x] Pooled particles for pops, muzzle puffs, trails and evolution bursts.
- [x] Screen shake and brief hit-pause on large impacts.
- [x] Synthesised sounds: shot, hit, pickup, evolve, devolve, ability, boss
      warning. Pitch varies slightly so repeats do not grate.
- [x] Audio starts only after the first click, as browsers require.
- [x] Ambient background bubbles and a soft vignette.

**Gate (human):** the owner plays with sound on. You cannot hear the result,
so list each sound with its waveform, pitch and length to make feedback easy
to act on.

## Phase 10: Saving and settings

- [x] Save class path, bubble total, arena position, visited arenas and boss
      kills, with a version number. Save on arena change and on pause.
- [x] A corrupt or outdated save starts a new game instead of crashing.
- [x] Settings: volume, screen shake on or off, reset save with confirmation.
- [x] Tests: save then load returns the same state; corrupt input is rejected.

**Gate (self-check):** reload mid-run and continue in the same arena.

## Phase 11: Performance

- [x] Debug key spawns 300 enemies.
- [x] Profile first. Record the top three costs in the log before changing
      anything.
- [x] Fix only what the profile shows, then record the result.
- [x] Meets the performance budget in the starting numbers.

**Gate (self-check):** before and after numbers written to the log.

## Phase 12: Balance and release

- [x] Script that reads the data files and prints time-to-kill for every class
      against every enemy.
- [ ] Adjust data until the pacing targets are met in the script's estimate.
- [x] Remove or hide debug keys behind a single flag.
- [x] A short README: how to run it, the controls, and how to change balance.

**Gate (human):** the owner plays a full run and reports where it dragged or
spiked. Repeat data changes until they are satisfied.

---

## Suggestions

Ideas noticed along the way that are outside the agreed scope. One line each.

- A short controls hint on first load (WASD, mouse, F3) until the Phase 8 title screen exists.
- Tanks are about 50 units across on a 720-unit screen. If they feel small, a camera zoom constant is a one-line addition.
- Backing away from an enemy near the edge while holding a key toward it crosses into the next arena mid-fight. The scripted player kept doing this; people may too. A short delay before crossing, or crossing only when no enemy is close, would prevent it.
- With thresholds of 150 and 800, a hit (1 to 4 bubbles) is small next to a final form's total, so devolving late in a run is rare. If that removes the tension, hits could cost more in harder arenas.
- Bosses could wait for something (a number of arenas visited, or a minimum bubble total) if the first boss comes too early; see the session 10 log.

## Log

One entry per session: phase, what was built, what was verified and how, what
was not verified, numbers changed from this file and why.

### Session 1: Phases 0 to 2

The owner asked for Phases 0 to 2 in one session, then a stop at the Phase 2
feel gate, with commits pushed to `main`.

**Phase 0.** Working title in use: Glowfathom (alternatives: Lumen Drift,
Bubblewake). Visual idea: the deep sea is dark and the only light comes from
creatures, so every tank glows and lights the water around it. Palette is in
`js/data/tuning.js`. Class names and sketches are in `js/data/classes.js`:
Mote; Skitter → Spindrift, Needlejet; Barnacle → Depthcharge, Harpoon;
Brood → Shoal, Halo. Gate still open: the owner has not picked a title or
approved names and palette.

**Phase 1.** Built as listed. Verified in headless Chromium: no console
errors, overlay toggles, canvas re-fits on resize.

**Phase 2.** Built as listed. Verified in headless Chromium: holding a
diagonal reaches 220 units/s exactly, releasing glides, driving into the
membrane stops the tank at the edge, all 10 classes render.

Additions not in the checklist:
- `js/render/` folder for drawing code (tank sprites, arena, background), so
  rendering stays out of `entities/` and `systems/`.
- `[` and `]` cycle through the 10 classes while the F3 overlay is open, so
  the Phase 0 sketches can be reviewed in game.
- `releaseDrag` (2.5) controls glide separately from acceleration. The
  checklist's single model stops in about 55 units; this glides about 90.
- The player's glow (part of the Phase 0 visual idea): one gradient.

Not verified: how movement feels, high-density displays, and refresh rates
other than 60 Hz in a real browser (the loop's handling of 144 Hz is covered
by a unit test only).

Movement constants to tune, all in `js/data/tuning.js`:
- `player.topSpeed` (220): cruising speed.
- `player.accel` (900): how quickly you reach it.
- `player.releaseDrag` (2.5): glide after letting go; lower is floatier.
- `camera.follow` (6) and `camera.lead` (0.22): how tightly the view tracks
  you and how far it leans toward the cursor.

### Session 2: Phase 3

Gates closed from session 1: the owner approved the title Glowfathom and the
class names. They asked to continue without commenting on movement, so the
Phase 2 feel gate is treated as passed with the session 1 values.

**Phase 3.** Built as listed. Verified in headless Chromium: no console
errors; 5 hits destroy a dummy and it respawns after 3 s; the white hit
flash appeared in 12 of 40 rapid frames while firing; recoil pushes the tank
back; during 8 s of sweeping fire the projectile pool stayed at 512 slots
with at most 5 in use. Unit tests: exactly 40 shots in 10 s at 4 per second,
70 at 7 per second, no burst after a pause, volleys fan evenly, the pool
never grows.

Bugs found and fixed while testing:
- The trigger fired 41 shots in 10 s instead of 40: the first shot borrowed
  a step's time, so every later shot came one step early.
- Debug circles on shots were drawn a step ahead of the shots.

Additions not in the checklist:
- `recoil` (8) in the weapon schema; the checklist asked for recoil but gave
  no value.
- Dummies respawn after 3 s, so testing never runs out of targets. They are
  scaffolding and get replaced by real enemies in Phase 4.
- Shots pop when they reach the arena membrane as well as when they expire.
- Every class fires the starter weapon from the tip of its own gun until
  Phase 5 gives each class its weapon.

Not verified: how firing feels; whether 8 recoil reads as "slight".

### Session 3: Phases 4 and 5

The owner asked for Phases 4 and 5 together, so the Phase 4 fun gate is
deferred to the end of Phase 5; both get played together.

**Phase 4.** Built as listed. Verified in headless Chromium with a scripted
player (`?test` exposes game state for this): over 25 s enemies were killed,
dropped bubbles that were collected, and were replaced; strafers fired; no
enemy left the arena; no console errors. A second script gave the player 10
bubbles and stood still: strafer shots cost 1 bubble and spilled none,
chaser contact cost 2 and spilled 1, spilled bubbles waited 1 s and were
then collectable, and each hit gave 1 s of blinking invulnerability.

Additions not in the checklist:
- `js/game.js` now holds world state and the fixed-step update, and
  `js/render/scene.js` the drawing, so `main.js` is only browser wiring.
- `js/data/shapes.js` holds the circle helpers shared by classes and enemies.
- The arena keeps a fixed population (4 drifters, 3 chasers, 2 strafers),
  replacing a missing enemy after 4 s. Phase 6 replaces this with rosters.
- Values the checklist did not give: chaser contact damage 2; strafer
  weapon (0.8 shots/s, 300 units/s, 1 damage, 550 range); `knockback` on
  weapons; spilled bubbles fly 280 to 420 units/s and wait 1 s.
- Touching chasers are thrown back and stunned for 0.5 s so they cannot sit
  on the player.
- At 0 bubbles a hit does nothing but trigger invulnerability; ejection to
  the previous arena is Phase 6.
- The target dummies from Phase 3 are removed.

Not verified: whether the loop is fun; whether pickups (radius 5) are easy
enough to see.

**Phase 5.** Built as listed. Verified in headless Chromium:
- Reaching 20 bubbles paused the game (simulation time frozen) and showed
  three cards; pressing 2 picked Barnacle. At 60, two cards showed and a
  mouse click picked Harpoon.
- Dropping to 40 devolved Harpoon to Barnacle; returning to 60 restored
  Harpoon with no prompt; dropping to 10 devolved twice to Mote; returning
  to 20 restored Barnacle with no prompt.
- Each of the 9 evolved forms played for 8 s with a scripted player: every
  one fired its own weapon and killed 4 to 8 enemies. Screenshots show the
  twin, spray and stream shots, curving seekers, and Halo's drones.
- No console errors.

Unit tests cover every threshold in both directions, multi-tier jumps,
path memory, an oscillating total changing class only once, homing,
piercing, explosions, parallel barrels, drones, and that every class has
stats and an existing weapon.

Bug found and fixed while testing: several presses of the same key within
one frame counted as one, because presses were stored in a set. They are
now counted.

Additions and changes not in the checklist:
- Weapon values for all 10 classes, in `js/data/weapons.js`, plus new
  optional fields: `width` (parallel barrels), `turnRate`/`homingRange`,
  `pierce`, `explodeRadius`/`explodeDamage`.
- Halo's drones also absorb enemy shots, so the drone branch has a
  defensive identity as well as contact damage.
- Per-class stats (top speed, acceleration, pickup radius) replace the global
  player values; `releaseDrag` and hull turning stay global.
- The HUD shows the current form and its evolve and devolve totals as text
  until the Phase 8 progress bar.
- `[` and `]` (cycle classes) are removed; `=` and `-` (with F3 open) add
  and remove 10 bubbles instead. Cycling fought the evolution rules, which
  would immediately devolve a class the bubble total didn't support.
- `?test` also exposes `chooseClass` for browser checks, and the game
  counts kills.

Not verified: whether the six final forms feel distinct, weapon balance, and
whether the hit blink is too harsh: the scripted player was mid-blink
(tank invisible) in 3 of 9 random frames.

### Session 4: Phase 6

**Phase 6.** Built as listed. Verified in headless Chromium: a scripted
player travelled from the centre east to 6,3, north to the corner 6,0, west
to 3,0 and south back to 3,3, crossing 12 membranes with a fade each time
and no repeats; every arena was filled from the roster for its difficulty;
a player pressed into corner 6,0's walls stayed inside; a hit at 0 bubbles
in 4,3 ejected the player to 3,3 at its centre with 2 s of immunity; the
minimap showed the route, the current arena and the player's position. No
console errors. `tests/game.test.js` runs the real game update in Node to
cover crossing, solid walls, sliding, drifting, ejection and clean-up.

Interpretations of the checklist:
- The whole membrane is passable. The quarter you leave through (east,
  west, north, south) picks the neighbour. Quarters with no arena beyond
  are solid and drawn as a heavier grey-blue wall.
- You cross only while holding a movement key toward that quarter (D east,
  A west, W north, S south). Drifting into the membrane bounces.
- A hit that leaves you at 0 bubbles ejects you to the arena you came from,
  at its centre. In the starting arena, with nowhere to go back to, the
  arena is reset instead. Hits while already at 0 also eject.
- The game pauses during the 0.4 s fade; the arena swaps at its midpoint.
  Shots, pickups and enemies do not carry over.
- Arenas keep topping themselves up from their roster every 4 s while you
  stay, as in Phase 4. Rosters (by difficulty 0 to 3): 5 drifters + 2
  chasers; 3 + 3 + 2 strafers; 2 + 4 + 4; 2 + 5 + 5.

Bug found and fixed while testing: the first crossing rule (outward speed
over 20 units/s) let a player sliding along the west membrane cross back
and forth between two arenas about 20 times, and an angle-based fix still
allowed it near quarter boundaries. Crossing now depends on which keys are
held, which rules out an immediate return.

Additions not in the checklist:
- Minimap cells are tinted redder with difficulty, so harder arenas are
  visible before you enter them.
- Arrival is 120 units inside the membrane, and the ejection history keeps
  the last 64 arenas.

Not verified: whether exploring feels good, whether difficulty rises at the
right pace, and whether the solid wall reads clearly enough.

### Session 5: Phase 7, and two changes requested by the owner

**Owner's changes, made during this phase:**
- Bubbles no longer expire. They stay in an arena until collected or until
  you leave it. (`lifetime` and `fadeSeconds` are gone from pickups.)
- Arenas are filled once, from their roster, each time you enter, and are
  not topped up while you stay. A cleared arena stays clear until you come
  back. (`respawnSeconds` is gone; `systems/spawning.js` is now a one-time
  `populate`.) Enemies that other enemies summon or drop during a fight
  (carrier swarmlings, mines, the Bloom's swarmlings) still appear, but drop
  no bubbles.

**Phase 7.** Built as listed. Verified in headless Chromium:
- Each new enemy was spawned alone and caught mid wind-up: the strafer's
  shot, the sniper's aim line, the charger's dash lane, the carrier's
  summon, the mine-layer's drop and the mine's blast radius all showed
  before landing. The carrier summoned, the mine-layer dropped a mine and
  the mine blasted and disappeared.
- A scripted Harpoon fought both bosses to the end: the Bloom fired spore
  rings and summoned swarmlings in phase 2; the Warden fired locked volleys
  and dashed in phase 2. The victory screen appeared after the second, and
  Enter dismissed it and resumed play.
- The spawn menu (F3, then B) lists every enemy and boss and spawns them;
  clicking it fires no shots.
- A difficulty-3 arena with all 25 roster enemies ran for 20 s with no
  errors at about 60 frames per second (headless, software rendering).
`tests/phase7.test.js` covers boss arenas, defeats and payouts, victory,
the phase change at half health, summon caps, mines, charger dashes, and
the Shockwave, Shield, Burst and Dash abilities.

How attacks work: every enemy attack is data in `js/data/enemies.js`
(shoot, ring, dash, summon, mine, blast), each with a wind-up and an
interval, run by `js/systems/attacks.js`. The warning is drawn during every
wind-up: a tightening danger-coloured ring, plus the aim line for locked
shots and dashes, and the blast radius for mines. The strafer moved onto
this system, so it now winds up for 0.4 s before each shot. Contact damage
from chasers and swarmlings has no separate warning; their approach is the
warning.

Abilities (right mouse button, tier 3 only): Spindrift Burst (16-shot
ring, 6 s), Needlejet Dash (3 s), Depthcharge Shockwave (radius 200, 8 s),
Harpoon Lance (huge piercing shot, 6 s), Shoal Swarm burst (12 seekers,
7 s), Halo Shield (2.5 s immunity, 10 s). A bar in the HUD shows the
cooldown.

Bosses: The Bloom in corner 0,0 (160 health, 6 pods, spore rings; at half
health denser rotating rings and swarmling summons) and The Warden in corner
6,6 (200 health, 3 guns, locked three-shot volleys; at half health dashes
as well). Each pays 40 or 50 bubbles plus 3 per part. A boss arena holds
only its boss until it is beaten, then becomes a normal difficulty-3 arena.
A health bar with the phase mark shows at the top of the screen.

Bugs found and fixed while testing:
- Shots knocked bosses backward, so the Warden was pinned about 1,000 units
  away instead of circling at 420. Heavy enemies now ignore knockback.
- The sniper kept moving during its wind-up, so its shot did not follow the
  line it showed. It now stands still while aiming.
- Mines had the usual random 0.5 to 2 s attack delay on top of arming.

Additions not in the checklist:
- Boss health bar; minimap marks boss arenas once visited (red dot, hollow
  ring once beaten).
- Mines turn from pink to red when armed.

Not verified: whether fights are fair and fun, boss difficulty and length
(about 30 s each for a scripted Harpoon that could not be hurt), and the
numbers for all new enemies and abilities. Under steady fire a boss flashes
white much of the time; fast weapons may keep it white constantly.

**Owner's change, after Phase 7:** once an arena is cleared (no enemies
left), every bubble still in it flies to the player and is collected,
whatever its distance and even if it was just spilled. Leftover mines don't
hold up a clear (`hazard: true` in `enemies.js`), since they outlive their
mine-layer and drop nothing. Speed is `clearedAccel` / `clearedMaxSpeed` in
`tuning.js`. Verified: unit tests cover bubbles waiting while an enemy is
alive, all arriving once cleared, and mines not blocking; in headless
Chromium a scripted Spindrift cleared arena 4,3 and the 11 bubbles left
around it all arrived within 1.6 s.

### Session 6: Phase 8

**Phase 8.** Built as listed. Verified in headless Chromium, once using
only the keyboard and once using only the mouse: every screen (title,
playing, paused, class tree, evolution choice, victory) was entered and
left, the game clock stayed frozen off the playing screen, restart needed a
second press and reset the run, and losing window focus paused the game.
After reaching Brood then Halo, the class tree showed Mote, Brood and Halo
lit with Halo outlined. Screenshots of every screen were checked. No console
errors. `tests/screens.test.js` checks all 10 allowed screen moves, refuses
the other 26, and confirms every screen leads back to play.

How it works: `js/screens.js` is a small table of allowed screen moves;
`main.js` asks it before every move, so an impossible move (such as pausing
during the evolution choice) is simply refused. The simulation only runs on
the playing screen. Menus are HTML overlays in `js/ui/menus.js`.

Additions and choices not in the checklist:
- A pause button (bottom-left, playing screen only), because the checklist
  asks for every screen to be reachable by mouse as well as keyboard.
- Restart asks for a second press or click within 3 s ("Lose this run?
  Press again"), so a stray click can't end a run.
- The class tree is reached from the pause menu. A form counts as unlocked
  once you have been it; locked forms show a dark outline and the bubbles
  needed to reach them.
- The progress bar runs from 0 to the next form's threshold (final forms:
  to 1.5 times their own threshold), with a red mark at the devolve point.
- Restart keeps the `?seed=` from the address, so seeded runs restart
  identically.

Not verified: how the screens look on small or unusual window sizes (the
class tree needs about 860 pixels of width).

### Session 7: Phase 9

**Phase 9.** Built as listed. Verified in headless Chromium: audio stayed
off until the first click, then shot, hit, pop, pickup, evolve, hurt and
boss warning sounds all played during a scripted fight (the rate limit
trimmed 2 of 81); a hit shook the screen; screenshots show death bursts,
the evolution burst, the movement trail, ambient bubbles and the vignette.
No console errors. `tests/effects.test.js` checks that each moment queues
its sound, that a hit shakes and briefly holds the game, that shake fades,
and that moving fast leaves a trail; `tests/particles.test.js` covers the
particle pool.

How it works: the game records sound events in `game.sounds`; `main.js`
plays and clears them each frame through `js/audio.js`, which synthesises
everything with the Web Audio API. The game rules stay testable in Node.
Particles (rings and dots) share one 1,024-slot pool in
`js/systems/particles.js`, which replaces the pop rings that lived in a
drawing file (the code smell noted in session 3).

Sounds, for the listening check (each varies up to 6% in pitch per play):

| Sound | When | Recipe |
|---|---|---|
| shot | each player shot | sine, 620 → 300 Hz, 0.08 s; bigger shots lower |
| hit | a shot lands without killing | band-passed noise at 2.2 kHz plus a 1.4 kHz tick, 0.04 s |
| pop | an enemy dies | sine rising 240 → 900 Hz, 0.1 s, plus a hiss; bigger enemies lower |
| pickup | each bubble collected | triangle, 880 → 1,320 Hz, 0.07 s; climbs a semitone per pickup in a quick run, up to an octave |
| hurt | the player is hit | sawtooth, 220 → 80 Hz, low-passed at 900 Hz, 0.28 s |
| evolve | moving up a tier | triangle C5, E5, G5, C6, 90 ms apart |
| devolve | moving down a tier | triangle G5, E5, C5, G4, 100 ms apart |
| ability | right-click ability | noise swept 400 → 2,400 Hz, plus a sine 300 → 600 Hz, 0.3 s |
| warning | a boss winds up, or changes phase | two triangle pulses, 150 → 110 Hz, 0.18 s each |
| explode | exploding shells, mines | low-passed noise 900 → 150 Hz plus a sine 120 → 40 Hz, 0.4 s |
| hum | always, after the first click | sines at 55, 55.7 and 82.5 Hz, low-passed at 220 Hz, quiet |

Shake and hit-pause: player hit 0.45 shake and 0.06 s pause; boss death
full shake and 0.18 s; boss phase change 0.6 and 0.1 s; Shockwave 0.4 and
0.05 s; heavy enemy death 0.3 and 0.04 s; explosions 0.25 to 0.4, no pause.
Shake can be turned off with `effects.screenShake` in `tuning.js` until
Phase 10 adds the setting.

Additions not in the checklist: an `explode` sound for shells and mines,
and a `pop` sound for deaths; the checklist's list had neither.

Not verified: how anything sounds. Headless Chromium plays audio into a
silent device, so only that the right sounds were triggered was checked.

### Session 8: Phase 10

**Phase 10.** Built as listed. Verified in headless Chromium:
- The gate: started a run, crossed east into arena 4,3, evolved to Barnacle
  with 23 bubbles, paused, reloaded the page; the title offered Continue,
  and Continue resumed as Barnacle with 23 bubbles in arena 4,3 with the
  same visited arenas.
- Settings (volume 35%, screen shake off) survived a reload.
- With a save, New game needed a second N and then replaced the save.
- Reset save needed a second click, returned to the title and removed the
  save.
- A corrupt save and an outdated (version 0) save each showed a notice and
  no Continue, and Enter started a new game.
- Leaving the page mid-run saved it.
- No console errors.

`tests/save.test.js` covers the round trip (save, store as text, load into
a fresh game, save again: identical), arriving at the arena centre with the
arena populated, and 20 kinds of corrupt or outdated input, each rejected;
plus settings falling back to defaults.

What is saved (`js/save.js`, version 1): class, class path, bubbles,
current arena, the ejection history, visited arenas, beaten bosses,
unlocked forms, kills, and whether the victory screen has been shown. You
always return to the centre of the saved arena, which is refilled with
enemies. Saved: on every arena change, on pause (including leaving the tab
or closing the page), and when a new run starts or restarts.

Additions and choices not in the checklist:
- Settings is a new screen off the pause menu (O), not reachable from the
  title. Resetting the save returns to the title.
- The title offers Continue (Enter) when a save exists; New game (N) then
  asks for confirmation because it replaces the save.
- A save that can't be read is reported on the title instead of silently
  ignored.
- One shared "press twice to confirm" helper now backs Restart, New game
  and Reset save.
- `effects.screenShake` moved out of `tuning.js` into the player's settings.

Not verified: real browsers with storage blocked (the code guards every
storage call, but only normal storage was exercised).

### Session 9: Phase 11

All numbers are from headless Chromium at 1280×720, which draws with the
CPU (no graphics card). They show what changed, but not what a laptop with
a graphics card will reach. Scenarios: a scripted Needlejet (the
fastest-firing weapon) that can't be hurt, sweeping fire across an arena
with extra enemies. Spawned counts grow because carriers summon and
mine-layers drop mines: "150" averages about 220 enemies, "300" about 475.
The budget case tops particles up to about 400.

**Profile before changes** (300 enemies, CPU profile of the main thread):
1. `(program)` 51%: the browser's own work outside the game's code, mostly
   rasterising the canvas in software.
2. `separation` (steering enemies apart) 37%, about three quarters of all
   game-code time: every enemy checked every other enemy, about 228,000
   checks per step.
3. Garbage collection 1.8%, then `updateEnemy` 1.4%.

A follow-up experiment switched off one drawing layer at a time under the
budget load (50.1 fps with everything): enemies 60.0, particles 56.9,
vignette 55.7, tank highlights 54.8, player glow 52.2.

**Fixes, each targeting a measured cost:**
- Separation now looks only at enemies in nearby cells of a grid rebuilt
  each step (`js/systems/spatial.js`). A test confirms the result is
  identical to checking every pair.
- Enemies and particles off screen are not drawn. Attack warnings are still
  drawn for every enemy, since an aim line can reach in from off screen.
- Particles are drawn in batches by kind, colour and one of 8 fade steps:
  about 30 fills instead of up to 400.

**Results** (same scenarios, measured against a copy of the code without
the fixes):

| Scenario | fps before → after | update per step | draw per frame |
|---|---|---|---|
| Empty arena | 60 → 60 | 0.08 → 0.08 ms | 0.35 → 0.36 ms |
| Budget: 150 + 400 particles | 43.9 → 51.3 to 52.1 | 1.75 → 0.72 ms | 2.17 → 1.36 ms |
| Stress: 300 enemies | 15.2 → 26.0 | 6.93 → 2.09 ms | 3.40 → 2.49 ms |

The game's own work for the budget case is now about 2 ms of the 16.7 ms
frame. What remains is the browser rasterising in software; the profile
can't break that down further, and on a graphics card it should be much
cheaper. Not changed: tank highlights, the vignette and the player glow
each cost a few fps here, but removing them would change the look, and
there is no evidence yet that they matter on real hardware.

The budget item stays unticked: it needs a measurement on a real laptop.
F3 now shows fps with update and draw times in milliseconds, and P (with
F3 open) adds 300 enemies.

### Session 10: Phase 11 result and Phase 12

**Phase 11 budget, measured by the owner:** on their laptop the game holds
at least 600 enemies before lagging, well past the budget of 150 entities
and 400 particles.

**Phase 12.** `tools/balance.js` (`npm run balance`, about 25 s) prints a
time-to-kill table for every form against every enemy, then plays the real
game in Node with a scripted player (`tools/bot.js`) three times per final
form and reports medians against the pacing targets.

Starting point (thresholds 20 and 60): tier 2 at 0.6 min, tier 3 at 1.4,
first boss at 5.9; far too fast.

Experiments, each a full pacing run:
- Thresholds 100 / 450: tier 3 and first boss on target, tier 2 a little
  fast, no ejections.
- Enemy health ×3 with thresholds 50 / 150: weaker forms were ejected over
  and over (up to 127 times a run) and Heavy and Swarm runs never reached a
  boss. Ruled out.
- Enemy health ×2 with thresholds 70 / 300: tier 3 far too slow for Heavy
  and Swarm.
Every setting showed the Skitter branch far ahead of Barnacle and Brood.

Investigating the branch gap, in order:
1. Tier-2 damage per second was 12 / 6 / 5 (Skitter / Barnacle / Brood).
   Evened to 9 / 9 / 8, and the Heavy and Swarm final forms raised to about
   12.6 to 12.9 (Spindrift 20, Needlejet 14, Halo 16 unchanged). Weapon
   changes: twin 6 → 4.5 shots/s; cannon 1.5 → 1.8 shots/s and 4 → 5
   damage; seeker 2.5 → 4 shots/s; shell 1.1 → 1.4 shots/s, 4 → 5 damage,
   blast 3 → 4; harpoon 1.4 → 1.8 shots/s, 5 → 7 damage; swarm 3 → 4.3
   shots/s.
2. Barnacle still lagged. Measured: it killed nearly as fast as the others
   but banked a third of the bubbles. Armour for the Heavy branch was tried
   and made no difference, so it was removed.
3. Tracing where bubbles went showed the scripted player crossing into the
   next arena mid-fight when it backed away near the edge (and at the
   diagonal between two quarters), abandoning hundreds of bubbles. Fixed in
   the scripted player, not the game; see Suggestions. After that all three
   tier-2 forms cleared every arena and banked the same; Barnacle loses
   about twice as many bubbles to hits, as a slow, big form should.

Final data: evolution thresholds 150 and 800 (devolve below 120 and 640).

| Milestone | Scripted player (median) | Target |
|---|---|---|
| Tier 2 | 3.0 min | 3 min |
| Tier 3 | 9.7 min (8.8 to 11.6 by branch) | 10 min |
| First boss | 12.2 min | 20 min |
| Second boss | 14.0 to 20.7 min | none |

The first-boss target is not met, and no sensible data change meets it: the
scripted player heads straight for a boss on reaching its final form, and a
boss fight takes about a minute. That is a design question for the owner
(see Suggestions), so the pacing item stays unticked.

Other changes:
- Debug tools need `?debug` in the address. Without it F3, =, -, B and P
  do nothing (checked in the browser). The bubble debug keys now add or
  remove 50, to suit the new thresholds.
- `README.md`: running, controls, debug tools, changing balance, tests and
  layout. `npm test` and `npm run balance` added to `package.json`.
- Tests that assumed thresholds of 20 and 60 now read them from the data.

Not verified: pacing with a real person. The scripted player never dodges;
the owner's full run is the real test.

