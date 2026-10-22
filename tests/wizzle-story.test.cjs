const test = require('node:test');
const assert = require('node:assert/strict');
const story = require('../game/wizzle-story.js');

test('both completed original encounters and three phases gate the first dodge', () => {
  let state = {};
  assert.deepEqual(story.choices(state, 18), ['first']);
  state = story.complete(state, 'first');
  assert.deepEqual(story.choices(state, 18), ['returning']);
  state = story.complete(state, 'returning');
  assert.deepEqual(story.choices(state, 2), ['first']);
  assert.deepEqual(story.choices(state, 3), ['dodgeSurprised']);
  assert.deepEqual(story.choices(JSON.parse(JSON.stringify(state)), 18), ['dodgeSurprised']);
});

test('surprised then annoyed dodge unlock once and later mix with originals', () => {
  let state = story.complete(story.complete({}, 'first'), 'returning');
  state = story.complete(state, 'dodgeSurprised');
  assert.deepEqual(story.choices(state, 9), ['dodgeAnnoyed']);
  state = story.complete(state, 'dodgeAnnoyed');
  assert.deepEqual(story.choices(state, 12), ['first', 'returning']);
  state = story.complete(state, 'first');
  assert.deepEqual(story.choices(state, 12), ['returning', 'dodgeSurprised', 'dodgeAnnoyed']);
  for (let i = 0; i < 100; i++) {
    const choices = story.choices(state, 18), next = choices[i % choices.length];
    assert.notEqual(next, state.last);
    assert.ok(!(next.startsWith('dodge') && state.last.startsWith('dodge')));
    state = story.complete(state, next);
  }
});

test('selection is immutable and malformed story saves cannot skip prerequisites', () => {
  const state = { completed: ['first'], last: 'first' };
  const before = JSON.stringify(state);
  story.choices(state, 10); story.complete(state, 'returning');
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(story.choices(null, 10), ['first']);
  assert.deepEqual(story.choices({ completed: ['bogus', 'dodgeAnnoyed'], last: 'bogus' }, 10), ['first']);
});