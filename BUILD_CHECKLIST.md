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

- [ ] Create the file layout above with empty modules where needed.
- [ ] Canvas fills the window, keeps a logical height of 720, re-fits on
      resize, and stays sharp on high-density displays.
- [ ] Fixed-step loop with accumulator and 250 ms clamp.
- [ ] Input module: held-key map, mouse position in world coordinates, button
      state. Suppress the right-click context menu on the canvas.
- [ ] Seeded random generator; the seed is shown in the debug overlay.
- [ ] Debug overlay on F3: frame rate, entity counts, collision circles.
- [ ] Test: the loop runs the expected number of steps for a given elapsed time.

**Gate (self-check):** page loads with no console errors; overlay toggles.

## Phase 2: Movement and camera

- [ ] Player moves with acceleration and drag from the starting numbers.
- [ ] Diagonal movement is not faster than straight movement.
- [ ] Turret rotates toward the cursor independently of the hull.
- [ ] Tank drawn from its circle list with a radial gradient and highlight,
      cached to an offscreen canvas per class.
- [ ] Camera follows with smoothing and a slight lead toward the cursor.
- [ ] One arena with a visible membrane; the player cannot leave it yet.
- [ ] Parallax background specks so motion is readable against open water.
- [ ] Test: speed converges on the configured top speed and never exceeds it.

**Gate (human):** the owner approves how movement feels. Expect tuning rounds;
offer the three or four constants that matter and what each one changes.

## Phase 3: Shooting and collision

- [ ] Weapon schema: fire rate, damage, speed, spread, count, lifetime, radius.
- [ ] Projectile pool, pre-allocated; no allocation while firing.
- [ ] Holding the left button fires at the weapon's rate, independent of frame
      rate.
- [ ] Circle collision between projectiles and stationary target dummies.
- [ ] Hit flash on the target, slight recoil on the player, pop on expiry.
- [ ] Tests: circle overlap; shots fired over 10 simulated seconds match the
      fire rate.

**Gate (self-check):** dummies can be destroyed; pool never grows.

## Phase 4: Enemies and the bubble economy

- [ ] Enemy schema: body circles, health, speed, weapon, behaviour, drop count.
- [ ] Drifter, Chaser and Strafer behaviours.
- [ ] Steering: seek, keep-distance, and separation so enemies do not stack.
- [ ] Enemies stay inside the arena.
- [ ] Dead enemies burst into pickups that scatter, slow and fade.
- [ ] Pickups are drawn in and collected; the total is shown on screen.
- [ ] Player damage removes bubbles and spills half as pickups.
- [ ] 1 s of invulnerability after a hit, shown by blinking.
- [ ] Tests: drop counts; spill arithmetic; separation pushes overlapping
      enemies apart.

**Gate (human):** the owner fights a mixed group and judges whether the loop
is fun before anything is layered on top.

## Phase 5: Evolution tree

- [ ] Evolution rules in a pure module: given a bubble total and a chosen
      path, return the current class.
- [ ] Reaching a threshold pauses the game and shows choice cards with a
      silhouette and one-line description.
- [ ] Devolution at 80% of the threshold; no flicker at the boundary.
- [ ] Re-evolving restores the earlier choice without a prompt.
- [ ] All 10 classes have stats, a body and a primary weapon in data.
- [ ] Seekers and orbiting drones implemented for the Swarm branch; explosive
      and piercing shots for the Heavy branch.
- [ ] Morph animation with 1 s of invulnerability.
- [ ] Debug keys: grant 10 bubbles, remove 10 bubbles.
- [ ] Tests: every threshold crossing in both directions; path memory; a total
      oscillating around a threshold does not flip the class.

**Gate (human):** the owner plays each branch to tier 3 and says whether the
six end classes feel distinct.

## Phase 6: World of arenas

- [ ] 7×7 grid with difficulty from distance to the centre.
- [ ] Crossing the membrane fades for 0.4 s and places the player at the
      opposite edge of the neighbouring arena. Enemies do not follow.
- [ ] Outer membranes are solid and bounce the player back.
- [ ] Each arena is populated on entry from a roster for its difficulty.
- [ ] At zero bubbles the player is ejected to the previous arena with 2 s of
      invulnerability.
- [ ] Minimap: grid, visited arenas, current position.
- [ ] Tests: neighbour lookup at centre, edge and corner; difficulty for every
      cell; rosters only contain enemies allowed at that difficulty.

**Gate (self-check):** travel from centre to a corner and back without error.

## Phase 7: Full roster, abilities and bosses

- [ ] Swarmling, Sniper, Charger, Carrier and Mine-layer.
- [ ] Every attack that can hurt the player has a visible warning first.
- [ ] One secondary ability per tier-3 class on the right button, with a
      cooldown shown on screen.
- [ ] Two bosses in outer-ring arenas, each multi-part with two attack phases
      and a large bubble payout. Boss arenas appear on the minimap once seen.
- [ ] Defeating both shows a victory screen, then play continues.
- [ ] Debug spawn menu for any enemy or boss.
- [ ] Tests: ability cooldowns; boss phase change at the configured health.

**Gate (human):** the owner fights each enemy alone, then both bosses.

## Phase 8: Interface and game states

- [ ] States: title, playing, paused, evolution choice, victory.
- [ ] Heads-up display: bubble total, progress bar to the next threshold with
      the devolve mark, ability cooldown, minimap.
- [ ] Title screen with controls; pause with resume and restart; class tree
      viewer showing unlocked classes.
- [ ] Escape pauses; the game pauses itself when the tab loses focus.
- [ ] Test: every state transition that should be possible is, and no others.

**Gate (self-check):** every screen reachable and escapable by keyboard and
mouse; screenshot each one.

## Phase 9: Effects and sound

- [ ] Pooled particles for pops, muzzle puffs, trails and evolution bursts.
- [ ] Screen shake and brief hit-pause on large impacts.
- [ ] Synthesised sounds: shot, hit, pickup, evolve, devolve, ability, boss
      warning. Pitch varies slightly so repeats do not grate.
- [ ] Audio starts only after the first click, as browsers require.
- [ ] Ambient background bubbles and a soft vignette.

**Gate (human):** the owner plays with sound on. You cannot hear the result,
so list each sound with its waveform, pitch and length to make feedback easy
to act on.

## Phase 10: Saving and settings

- [ ] Save class path, bubble total, arena position, visited arenas and boss
      kills, with a version number. Save on arena change and on pause.
- [ ] A corrupt or outdated save starts a new game instead of crashing.
- [ ] Settings: volume, screen shake on or off, reset save with confirmation.
- [ ] Tests: save then load returns the same state; corrupt input is rejected.

**Gate (self-check):** reload mid-run and continue in the same arena.

## Phase 11: Performance

- [ ] Debug key spawns 300 enemies.
- [ ] Profile first. Record the top three costs in the log before changing
      anything.
- [ ] Fix only what the profile shows, then record the result.
- [ ] Meets the performance budget in the starting numbers.

**Gate (self-check):** before and after numbers written to the log.

## Phase 12: Balance and release

- [ ] Script that reads the data files and prints time-to-kill for every class
      against every enemy.
- [ ] Adjust data until the pacing targets are met in the script's estimate.
- [ ] Remove or hide debug keys behind a single flag.
- [ ] A short README: how to run it, the controls, and how to change balance.

**Gate (human):** the owner plays a full run and reports where it dragged or
spiked. Repeat data changes until they are satisfied.

---

## Suggestions

Ideas noticed along the way that are outside the agreed scope. One line each.

## Log

One entry per session: phase, what was built, what was verified and how, what
was not verified, numbers changed from this file and why.
