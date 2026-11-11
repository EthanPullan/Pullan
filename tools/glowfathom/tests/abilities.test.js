import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityState, updateAbility, abilityReadiness } from '../js/systems/abilities.js';
import { CLASS_LIST } from '../js/data/classes.js';

const DT = 1 / 60;
const ability = { name: 'Test', cooldown: 4 };

function uses(seconds, held = () => true) {
  const state = createAbilityState();
  let n = 0;
  for (let i = 0; i < Math.round(seconds / DT); i++) if (updateAbility(state, ability, held(i), DT)) n++;
  return n;
}

test('holding the button uses the ability once per cooldown', () => {
  assert.equal(uses(10), 3); // at 0, 4 and 8 s
});

test('not holding the button never uses it, and it waits ready', () => {
  assert.equal(uses(10, () => false), 0);
  const state = createAbilityState();
  for (let i = 0; i < 600; i++) updateAbility(state, ability, false, DT);
  assert.equal(abilityReadiness(state, ability), 1);
  assert.equal(updateAbility(state, ability, true, DT), true);
});

test('the cooldown blocks a second use until it runs out', () => {
  const state = createAbilityState();
  assert.equal(updateAbility(state, ability, true, DT), true);
  assert.ok(abilityReadiness(state, ability) < 0.01);
  let t = 0;
  while (!updateAbility(state, ability, true, DT)) t += DT;
  assert.ok(Math.abs(t - ability.cooldown) < 0.05, `ready after ${t}`);
});

test('a class without an ability never fires one', () => {
  const state = createAbilityState();
  assert.equal(updateAbility(state, undefined, true, DT), false);
});

test('every tier-3 class has an ability; tiers 1 and 2 have none', () => {
  for (const cls of CLASS_LIST) {
    if (cls.tier === 3) assert.ok(cls.ability && cls.ability.cooldown > 0 && cls.ability.name, cls.id);
    else assert.equal(cls.ability, undefined, cls.id);
  }
});
