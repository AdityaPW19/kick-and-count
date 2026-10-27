'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../game/progression/master.js');
const C = require('../game/progression/engine.js');
const N = require('../game/progression/next-engine.js');
const B = require('../game/progression/before-engine.js');
const COUNT = 'kick_and_count';
const NEXT = 'what_comes_next';
const BEFORE = 'what_came_before';
const IDS = [COUNT, NEXT, BEFORE];
const copy = value => JSON.parse(JSON.stringify(value));
const map = (ids, value) => Object.fromEntries(ids.map(id => [id, value]));
const ROUTE_KEYS = ['activeModeId', 'stage', 'availableOnboardingComplete', 'onboardingComplete',
  'onboardingDeferred', 'introductoryPhasesComplete', 'run', 'bag'];

function storageFor(saved) {
  const data = new Map(saved ? [[M.STORAGE_KEY, JSON.stringify(saved)]] : []);
  const writes = [];
  return { data, writes, getItem: key => data.get(key) ?? null,
    setItem(key, value) { writes.push(key); data.set(key, String(value)); } };
}
function controller(storage, options = {}) {
  return M.createController({ storage, random() { throw Error('migration must not reroll'); }, ...options });
}
// Original v1 shapes: intentionally NOT derived from the new controller. These
// fixtures lock the two-mode maps and exact old pending-commit schema in place.
function legacy({ active = COUNT, rotation = false, completed = 0, quota = 2 } = {}) {
  const intro = map([COUNT, NEXT], rotation);
  if (active === NEXT) intro[COUNT] = true;
  return { version: 1, activeModeId: active, masterState: 'PLAYING_QUESTION',
    stage: rotation ? 'available_rotation' : 'onboarding',
    availableOnboardingComplete: rotation, onboardingComplete: false, onboardingDeferred: rotation,
    tutorials: map([COUNT, NEXT], true), introductoryPhasesComplete: intro,
    run: { phaseQuota: quota, completedPhases: completed }, bag: rotation ? [active === COUNT ? NEXT : COUNT] : [],
    pendingBreak: null, lastCompletedBreakId: JSON.stringify([NEXT, 'next_fixed_phase_3']),
    lastCompletedCheckpoints: { [COUNT]: 'fixed_phase_3', [NEXT]: 'next_fixed_phase_3' } };
}
function withPlan(saved, { checkpoint = 'fixed_phase_4', phaseId = 4, target = NEXT,
  commit = null } = {}) {
  const result = copy(saved);
  const route = commit ?? Object.fromEntries(ROUTE_KEYS.map(key => [key, copy(result[key])]));
  if (!commit) {
    route.activeModeId = target;
    route.run = { phaseQuota: 1, completedPhases: 0 };
    route.bag = [saved.activeModeId];
  }
  result.masterState = 'SPARKY_INTERACTION';
  result.pendingBreak = { id: JSON.stringify([saved.activeModeId, checkpoint]), modeId: saved.activeModeId,
    checkpointId: checkpoint, phaseId, nextModeId: route.activeModeId,
    nextAction: route.activeModeId === saved.activeModeId ? 'continue_mode' : 'switch_mode', commit: route };
  return result;
}
function inputs(active, engine, extra = {}) {
  return { [active === COUNT ? 'counting' : 'next']: engine,
    countingTutorialCompleted: true, nextTutorialCompleted: true, beforeTutorialCompleted: false, ...extra };
}
function originalRoute(route) {
  const result = Object.fromEntries(ROUTE_KEYS.map(key => [key, copy(route[key])]));
  delete result.introductoryPhasesComplete[BEFORE];
  return result;
}
function assertAddedMaps(state) {
  assert.equal(state.version, 2);
  assert.deepEqual(Object.keys(state.tutorials), IDS);
  assert.equal(state.tutorials[BEFORE], false);
  assert.equal(state.introductoryPhasesComplete[BEFORE], false);
  assert.equal(state.lastCompletedCheckpoints[BEFORE], null);
  assert.equal(state.onboardingComplete, false);
}

for (const active of [COUNT, NEXT]) {
  for (const rotation of [false, true]) {
    test(`v1 ${active} ${rotation ? 'rotation' : 'onboarding'} migrates in place without losing route/quota/history`, () => {
      const old = legacy({ active, rotation, completed: rotation ? 1 : 0 });
      const storage = storageFor(old);
      storage.data.set(C.STORAGE_KEY, 'count-engine-bytes');
      storage.data.set(N.STORAGE_KEY, 'next-engine-bytes');
      storage.data.set(B.STORAGE_KEY, 'before-engine-bytes');
      const master = controller(storage);
      assert.equal(M.STORAGE_KEY, 'sparky-master-progression:v1');
      assertAddedMaps(master.state);
      assert.deepEqual(originalRoute(master.state), originalRoute(old));
      assert.deepEqual(master.state.tutorials, { ...old.tutorials, [BEFORE]: false });
      assert.equal(master.state.lastCompletedBreakId, old.lastCompletedBreakId);
      assert.deepEqual(master.state.lastCompletedCheckpoints, { ...old.lastCompletedCheckpoints, [BEFORE]: null });
      assert.equal(master.state.legacyIntroductionPending, rotation);
      assert.deepEqual(controller(storage).state, master.state, 'v2 bridge must survive reload');
      assert.deepEqual([...new Set(storage.writes)], [M.STORAGE_KEY]);
      assert.equal(storage.getItem(C.STORAGE_KEY), 'count-engine-bytes');
      assert.equal(storage.getItem(N.STORAGE_KEY), 'next-engine-bytes');
      assert.equal(storage.getItem(B.STORAGE_KEY), 'before-engine-bytes');
    });
  }

  test(`v1 ${active} at a safe question parks exactly that question and introduces before without replaying tutorials`, () => {
    const storage = storageFor(legacy({ active, rotation: true, completed: 1 }));
    const master = controller(storage);
    const question = { status: 'question', completedFixedQuestions: 25,
      currentQuestion: { questionId: 'park-me', options: [3, 5, 6] } };
    const savedEngine = copy(question);
    assert.equal(master.reconcile().modeId, active, 'missing engine must not trigger introduction');
    const route = master.reconcile(inputs(active, question));
    assert.equal(route.modeId, BEFORE);
    assert.equal(route.stage, 'onboarding');
    assert.equal(route.tutorialNeeded, true);
    assert.equal(master.state.legacyIntroductionPending, false);
    assert.deepEqual(master.state.run, { phaseQuota: 2, completedPhases: 0 });
    assert.deepEqual(master.state.bag, []);
    assert.deepEqual(question, savedEngine);
    assert.equal(master.state.tutorials[COUNT], true);
    assert.equal(master.state.tutorials[NEXT], true);
    assert.deepEqual(controller(storage).state, master.state);
    assert.equal(master.reconcile({ beforeTutorialCompleted: true }).tutorialNeeded, false);
    assert.equal(controller(storage).reconcile({ beforeTutorialCompleted: false }).tutorialNeeded, false);
  });

  for (const status of ['feedback', 'interaction', 'celebration']) {
    test(`v1 ${active} ${status} waits for a safe boundary instead of interrupting presentation`, () => {
      const master = controller(storageFor(legacy({ active, rotation: true })));
      const engine = { status, phaseId: 7, completedFixedQuestions: 34 };
      assert.equal(master.reconcile(inputs(active, engine)).modeId, active);
      assert.equal(master.state.legacyIntroductionPending, true);
      assert.equal(master.reconcile(inputs(active, { ...engine, status: 'question' })).modeId, BEFORE);
    });
  }
}

for (const active of [COUNT, NEXT]) {
  for (const afterAck of [false, true]) {
    for (const champion of active === COUNT ? [false, true] : [false]) {
      test(`legacy pending ${active} ${champion ? 'champion' : 'phase'} ${afterAck ? 'post' : 'pre'} engine ack retains immutable chosen route`, () => {
        const target = active === COUNT ? NEXT : COUNT;
        const old = withPlan(legacy({ active, rotation: true, completed: 1 }), {
          checkpoint: champion ? 'fixed_phase_17' : active === COUNT ? 'fixed_phase_4' : 'next_fixed_phase_4',
          phaseId: champion ? 17 : 4, target });
        const storage = storageFor(old);
        let master = controller(storage);
        const pending = master.state.pendingBreak;
        const oldPending = copy(old.pendingBreak);
        const stripped = copy(pending);
        stripped.commit = originalRoute(stripped.commit);
        assert.deepEqual(stripped, oldPending);
        assert.equal(pending.commit.legacyIntroductionPending, true);
        const engine = { status: afterAck ? 'question' : champion ? 'celebration' : 'interaction',
          mode: afterAck && champion ? 'infinite' : 'fixed',
          lastCompletedInteractionCheckpoint: afterAck && !champion ? pending.checkpointId : null };
        const engineBefore = copy(engine);
        master = controller(storage);
        assert.deepEqual(master.reconcile(inputs(active, engine)).pendingBreak, pending);
        assert.equal(master.state.activeModeId, active);
        assert.deepEqual(master.planBreak(pending), pending);
        assert.equal(master.reconcile(inputs(active, engine)).tutorialNeeded, false);
        assert.deepEqual(engine, engineBefore);
        assert.equal(master.completeBreak(pending.id), true);
        assert.equal(master.state.activeModeId, target, 'commit route must be honored before reconcile');
        assert.deepEqual(originalRoute(master.state), oldPending.commit);
        assert.equal(master.state.lastCompletedCheckpoints[active], pending.checkpointId);
        const committed = master.state;
        assert.equal(master.completeBreak(pending.id), false);
        assert.deepEqual(master.state, committed);
        master = controller(storage);
        assert.equal(master.state.activeModeId, target);
        assert.equal(master.reconcile(inputs(target, { status: 'question' })).modeId, BEFORE);
        assert.equal(master.state.pendingBreak, null);
        assert.equal(master.planBreak(pending), null, 'acknowledged break must not replay');
      });
    }
  }
}

test('legacy onboarding next phase-2 pending commits its old available/count route before before introduction', () => {
  const old = legacy({ active: NEXT });
  const commit = Object.fromEntries(ROUTE_KEYS.map(key => [key, copy(legacy({ rotation: true })[key])]));
  commit.run.phaseQuota = 1;
  const saved = withPlan(old, { checkpoint: 'next_fixed_phase_2', phaseId: 2, commit });
  const storage = storageFor(saved);
  const master = controller(storage);
  assert.equal(master.state.legacyIntroductionPending, false);
  assert.equal(master.state.pendingBreak.commit.legacyIntroductionPending, true);
  assert.equal(master.reconcile(inputs(NEXT, { status: 'question', completedFixedQuestions: 10 })).modeId, NEXT);
  const pending = master.state.pendingBreak;
  assert.equal(master.completeBreak(pending.id), true);
  assert.deepEqual(originalRoute(master.state), commit);
  assert.deepEqual(controller(storage).state, master.state);
  assert.equal(master.reconcile({ counting: { status: 'question', completedFixedQuestions: 9 } }).modeId, BEFORE);
  assert.equal(master.state.introductoryPhasesComplete[BEFORE], false);
});

test('legacy feedback finishes its phase and planned break before introducing before', () => {
  const master = controller(storageFor(legacy({ rotation: true })), { random: () => 0.1 });
  assert.equal(master.reconcile(inputs(COUNT, { status: 'feedback' })).modeId, COUNT);
  assert.equal(master.reconcile(inputs(COUNT, { status: 'interaction' })).modeId, COUNT);
  const pending = master.planBreak({ modeId: COUNT, checkpointId: 'fixed_phase_4', phaseId: 4 });
  assert.equal(pending.nextModeId, COUNT); // The saved two-phase quota still applies.
  assert.equal(pending.commit.run.completedPhases, 1);
  assert.equal(master.reconcile(inputs(COUNT, { status: 'question' })).modeId, COUNT);
  master.completeBreak(pending.id);
  assert.equal(master.state.activeModeId, COUNT);
  assert.equal(master.reconcile(inputs(COUNT, { status: 'question' })).modeId, BEFORE);
});

test('invalid v1 saves are rejected BEFORE adding the before maps or bridge flags', () => {
  const base = legacy({ rotation: true });
  const mutations = [
    s => { s.version = 0; },
    s => { s.activeModeId = BEFORE; },
    s => { s.tutorials[BEFORE] = true; },
    s => { s.introductoryPhasesComplete[BEFORE] = false; },
    s => { delete s.lastCompletedCheckpoints[NEXT]; },
    s => { s.bag = [BEFORE]; },
    s => { s.bag = [NEXT, NEXT]; },
    s => { s.run.completedPhases = 2; },
    s => { s.onboardingComplete = true; },
    s => { s.availableOnboardingComplete = false; },
    s => { s.onboardingDeferred = false; },
    s => { s.legacyIntroductionPending = true; },
    s => { s.extra = 'not-an-original-field'; }
  ];
  for (const mutate of mutations) {
    const bad = copy(base); mutate(bad);
    assert.deepEqual(controller(storageFor(bad)).state, controller(null).state);
  }
  const planned = withPlan(base);
  for (const mutate of [
    s => { s.pendingBreak.id = 'forged'; },
    s => { s.pendingBreak.commit.bag = [BEFORE]; },
    s => { s.pendingBreak.commit.introductoryPhasesComplete[BEFORE] = false; },
    s => { s.pendingBreak.commit.activeModeId = COUNT; },
    s => { s.pendingBreak.nextAction = 'continue_mode'; },
    s => { s.masterState = 'PLAYING_QUESTION'; }
  ]) {
    const bad = copy(planned); mutate(bad);
    assert.deepEqual(controller(storageFor(bad)).state, controller(null).state);
  }
});

test('v2 bridge/deferred fields are validated, migration write failures propagate without touching engine saves', () => {
  const base = controller(storageFor(legacy({ rotation: true }))).state;
  for (const mutate of [
    s => { s.legacyIntroductionPending = 'true'; },
    s => { s.legacyIntroductionPending = false; },
    s => { s.introductoryPhasesComplete[BEFORE] = true; },
    s => { s.deferredModeId = 'color_match'; },
    s => { s.deferredModeId = s.activeModeId; },
    s => { s.activeModeId = BEFORE; }
  ]) {
    const bad = copy(base); mutate(bad);
    assert.deepEqual(controller(storageFor(bad)).state, controller(null).state);
  }
  const storage = storageFor(legacy({ rotation: true }));
  const original = storage.getItem(M.STORAGE_KEY);
  storage.setItem = () => { throw Error('migration-write'); };
  assert.throws(() => controller(storage), /migration-write/);
  assert.equal(storage.getItem(M.STORAGE_KEY), original);
});

function readyState() {
  const master = controller(null, { random: () => 0.2 });
  master.reconcile({ countingTutorialCompleted: true, nextTutorialCompleted: true, beforeTutorialCompleted: true });
  for (const modeId of IDS) {
    const pending = master.planBreak({ modeId, phaseId: 2,
      checkpointId: `${modeId === COUNT ? '' : modeId === NEXT ? 'next_' : 'before_'}fixed_phase_2` });
    master.completeBreak(pending.id);
  }
  return copy(master.state);
}

test('singleton-current fair-bag token is deferred losslessly, persists through reload and is served next', () => {
  const state = readyState();
  state.activeModeId = COUNT;
  state.bag = [COUNT];
  state.run = { phaseQuota: 1, completedPhases: 0 };
  const storage = storageFor(state);
  const master = controller(storage, { random: () => 0.2, twoPhaseProbability: 0 });
  const pending = master.planBreak({ modeId: COUNT, checkpointId: 'infinite_5', phaseId: 18 });
  assert.notEqual(pending.nextModeId, COUNT);
  assert.equal(pending.commit.deferredModeId, COUNT);
  assert.equal(pending.commit.bag.length, 2);
  assert.deepEqual([...pending.commit.bag, pending.nextModeId].sort(), IDS.slice().sort(), 'new bag lost a token');
  const restored = controller(storage);
  assert.deepEqual(restored.state.pendingBreak, pending);
  restored.completeBreak(pending.id);
  const after = controller(storage, { random: () => 0.2, twoPhaseProbability: 0 });
  const next = after.planBreak({ modeId: after.state.activeModeId, checkpointId: 'other_infinite_5', phaseId: 21 });
  assert.equal(next.nextModeId, COUNT, 'deferred token must be served immediately, not starved');
  assert.equal(next.commit.deferredModeId, null);
  assert.deepEqual(next.commit.bag, pending.commit.bag, 'serving deferred token consumed next-cycle token');
  after.completeBreak(next.id);
  assert.deepEqual(controller(storage).state, after.state);
});

test('three-mode shuffle is bounded-fair over 3000 runs, no adjacent repeats, even with reloads and adversarial random', () => {
  for (const random of [() => 0, () => 0.999999, C.seededRandom(83791)]) {
    const initial = readyState();
    initial.run = { phaseQuota: 1, completedPhases: 0 };
    const storage = storageFor(initial);
    let master = controller(storage, { random, twoPhaseProbability: 0 });
    const visits = map(IDS, 0);
    let previous = null;
    for (let i = 0; i < 3000; i += 1) {
      const active = master.state.activeModeId;
      assert.notEqual(active, previous);
      visits[active] += 1;
      assert.ok(Math.max(...Object.values(visits)) - Math.min(...Object.values(visits)) <= 2);
      const pending = master.planBreak({ modeId: active, checkpointId: `generated_${i}`, phaseId: 21 });
      if (i % 7 === 0) {
        const saved = master.state;
        master = controller(storage, { random, twoPhaseProbability: 0 });
        assert.deepEqual(master.state, saved);
        assert.deepEqual(master.planBreak({ modeId: active, checkpointId: `generated_${i}`, phaseId: 21 }), pending);
      }
      master.completeBreak(pending.id);
      previous = active;
    }
    assert.ok(Object.values(visits).every(count => count >= 999));
  }
});

test('before exact phase-2 checkpoint and acknowledgement gate rotation, including question/feedback and reload', () => {
  const storage = storageFor();
  const master = controller(storage, { random: () => 0.2 });
  const count = C.createEngine({ storage });
  const next = N.createEngine({ storage });
  const before = B.createEngine({ storage });
  function solve(engine) {
    engine.attempt(engine.currentQuestion().correctAnswer);
    engine.finishFeedback();
  }
  function opening(engine, modeId) {
    for (let phase = 0; phase < 2; phase += 1) {
      while (engine.state.status === 'question') solve(engine);
      const pending = master.planBreak({ modeId, ...engine.state.pendingInteraction });
      engine.completeInteraction(pending.checkpointId);
      master.completeBreak(pending.id);
    }
  }
  master.reconcile({ countingTutorialCompleted: true, nextTutorialCompleted: true });
  opening(count, COUNT); opening(next, NEXT);
  assert.equal(master.reconcile({ before: before.state }).tutorialNeeded, true);
  master.reconcile({ beforeTutorialCompleted: true });
  while (before.state.status === 'question') solve(before);
  let pending = master.planBreak({ modeId: BEFORE, ...before.state.pendingInteraction });
  assert.equal(pending.nextAction, 'continue_mode');
  before.completeInteraction(pending.checkpointId); master.completeBreak(pending.id);
  while (before.state.completedFixedQuestions < 9) solve(before);
  const parked = [storage.getItem(C.STORAGE_KEY), storage.getItem(N.STORAGE_KEY)];
  const read = () => master.reconcile({ before: before.state });
  assert.equal(read().modeId, BEFORE);
  before.attempt(before.currentQuestion().correctAnswer);
  assert.equal(read().masterState, 'GOAL_FEEDBACK');
  before.finishFeedback();
  assert.equal(read().modeId, BEFORE);
  pending = master.planBreak({ modeId: BEFORE, ...before.state.pendingInteraction });
  assert.equal(pending.checkpointId, 'before_fixed_phase_2');
  assert.equal(pending.commit.stage, 'available_rotation');
  assert.equal(pending.commit.introductoryPhasesComplete[BEFORE], true);
  before.completeInteraction(pending.checkpointId);
  assert.equal(read().modeId, BEFORE);
  const restored = controller(storage);
  assert.equal(restored.reconcile({ before: before.state }).modeId, BEFORE);
  restored.completeBreak(pending.id);
  assert.equal(restored.state.stage, 'available_rotation');
  assert.equal(restored.state.onboardingComplete, false);
  assert.equal(restored.state.onboardingDeferred, true);
  assert.equal(before.currentQuestion().questionId, 'before_011');
  assert.deepEqual([storage.getItem(C.STORAGE_KEY), storage.getItem(N.STORAGE_KEY)], parked);
});

test('legacy both-completed engine snapshots without master save still introduce before, not old tutorials', () => {
  const master = controller(null);
  const counting = { status: 'question', completedFixedQuestions: 24 };
  const next = { status: 'question', completedFixedQuestions: 30 };
  assert.equal(master.reconcile({ counting, next, countingTutorialCompleted: true,
    nextTutorialCompleted: true }).modeId, BEFORE);
  assert.equal(master.state.tutorials[COUNT], true);
  assert.equal(master.state.tutorials[NEXT], true);
  assert.equal(master.reconcile({ counting, next }).tutorialNeeded, true);
});

test('before onboarding ignores wrong checkpoint/phase pairs and waits for exact phase-2 engine ack', () => {
  const master = controller(null, { random: () => 0.2 });
  master.reconcile({ counting: { completedFixedQuestions: 9 }, next: { completedFixedQuestions: 10 } });
  for (const context of [
    { checkpointId: 'next_fixed_phase_2', phaseId: 2 },
    { checkpointId: 'before_infinite_10', phaseId: 2 },
    { checkpointId: 'before_fixed_phase_2', phaseId: 3 }
  ]) {
    const pending = master.planBreak({ modeId: BEFORE, ...context });
    assert.equal(pending.nextModeId, BEFORE);
    master.completeBreak(pending.id);
    assert.equal(master.state.introductoryPhasesComplete[BEFORE], false);
  }
  assert.equal(master.reconcile({ before: { completedFixedQuestions: 10, phaseId: 2,
    status: 'interaction', pendingInteraction: { checkpointId: 'before_fixed_phase_2' } } }).modeId, BEFORE);
  assert.equal(master.state.stage, 'onboarding');
  // The fake wrong-phase checkpoint above is deliberately the most recently
  // completed id; use engine-save recovery to prove exact ack-driven migration.
  const result = master.reconcile({ before: { completedFixedQuestions: 10, phaseId: 3,
    status: 'question', lastCompletedInteractionCheckpoint: 'before_fixed_phase_2' } });
  assert.equal(result.stage, 'available_rotation');
});

test('before infinite engine stays independent, reused phaseId counts actual phases and all three saves stay byte-identical', () => {
  const storage = storageFor();
  const count = C.createEngine({ storage });
  const next = N.createEngine({ storage });
  const before = B.createEngine({ storage, random: B.seededRandom(567) });
  while (before.state.mode !== 'infinite') {
    if (before.state.status === 'interaction') before.completeInteraction();
    else {
      before.attempt(before.currentQuestion().correctAnswer);
      before.finishFeedback();
    }
  }
  const state = readyState();
  state.activeModeId = BEFORE;
  state.bag = [COUNT, NEXT];
  state.run = { phaseQuota: 2, completedPhases: 0 };
  storage.setItem(M.STORAGE_KEY, JSON.stringify(state));
  let master = controller(storage, { random: () => 0.2 });
  const parked = [storage.getItem(C.STORAGE_KEY), storage.getItem(N.STORAGE_KEY)];
  for (let phase = 0; phase < 2; phase += 1) {
    while (before.state.status === 'question') {
      before.attempt(before.currentQuestion().correctAnswer);
      before.finishFeedback();
    }
    const pending = master.planBreak({ modeId: BEFORE, ...before.state.pendingInteraction });
    assert.equal(pending.phaseId, 21);
    assert.equal(pending.checkpointId, `before_infinite_${(phase + 1) * 5}`);
    assert.equal(pending.nextAction, phase === 0 ? 'continue_mode' : 'switch_mode');
    before.completeInteraction(pending.checkpointId);
    const saved = [storage.getItem(C.STORAGE_KEY), storage.getItem(N.STORAGE_KEY), storage.getItem(B.STORAGE_KEY)];
    master = controller(storage);
    assert.deepEqual(master.state.pendingBreak, pending);
    assert.equal(master.reconcile({ counting: count.state, next: next.state, before: before.state }).modeId, BEFORE);
    master.completeBreak(pending.id);
    assert.deepEqual([storage.getItem(C.STORAGE_KEY), storage.getItem(N.STORAGE_KEY), storage.getItem(B.STORAGE_KEY)], saved);
    if (phase === 0) {
      assert.equal(master.reconcile({ before: before.state }).masterState, 'INFINITE_PLAY');
      master = controller(storage, { random: () => 0.2 });
    }
  }
  assert.deepEqual([storage.getItem(C.STORAGE_KEY), storage.getItem(N.STORAGE_KEY)], parked);
  assert.equal(before.state.completedInfiniteQuestions, 10);
  assert.equal(count.state.mode, 'fixed');
  assert.equal(next.state.mode, 'fixed');
});