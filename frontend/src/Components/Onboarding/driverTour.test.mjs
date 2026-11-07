import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROLE_STEPS } from './onboardingData.js';

test('tour anchors every role task to its real navigation target, without navigation', () => {
  for (const [role, steps] of Object.entries(ROLE_STEPS)) {
    assert.equal(steps[0].element, '[data-tour="content"]', role);
    assert.equal(steps.at(-1).element, '[data-tour="profile"]', role);
    for (const step of steps) {
      assert.ok(step.element, role);
      assert.ok(step.title);
      assert.ok(step.description);
      assert.equal(step.to, undefined);
    }
  }
});

test('replacement uses effect-owned Driver lifecycle and version two identity', () => {
  const source = readFileSync(new URL('./Onboarding.jsx', import.meta.url), 'utf8');
  assert.match(source, /useEffect/);
  assert.match(source, /startTour/);
  assert.doesNotMatch(source, /ModalContainer/);
  const identity = readFileSync(new URL('../../utils/onboarding.js', import.meta.url), 'utf8');
  assert.match(identity, /ONBOARDING_VERSION = 2/);
});
