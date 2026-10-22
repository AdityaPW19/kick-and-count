'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const M = require('../game/progression/master.js');
const C = require('../game/progression/engine.js');
const N = require('../game/progression/next-engine.js');
const COUNT = 'kick_and_count';
const NEXT = 'what_comes_next';

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.get(key) ?? null; },
    setItem(key, value) { data.set(key, String(value)); }
  };
}
function create(options = {}) { return M.createController({ storage: null, random: () => 0.2, ...options }); }
function input(counting, next, flags = {}) {
  return { counting: counting?.state, next: next?.state,
    countingTutorialCompleted: true, nextTutorialCompleted: true, ...flags };
}
function solve(engine) {
  assert.equal(engine.attempt(engine.currentQuestion().correctAnswer).correct, true);
  assert.equal(engine.finishFeedback(), true);
}
function phase(engine) {
  while (engine.state.status === 'question') solve(engine);
  assert.ok(['interaction', 'celebration'].includes(engine.state.status));
}
function plan(controller, engine, modeId) {
  const state = engine.state;
  return controller.planBreak({ modeId, checkpointId: state.pendingInteraction?.checkpointId ?? 'fixed_phase_17',
    phaseId: state.phaseId });
}
function ack(engine, pending) {
  return pending.checkpointId === 'fixed_phase_17' && pending.modeId === COUNT
    ? engine.completeCelebration() : engine.completeInteraction(pending.checkpointId);
}
function finish(controller, engine, modeId) {
  const pending = plan(controller, engine, modeId);
  assert.ok(pending);
  assert.equal(ack(engine, pending), true);
  assert.equal(controller.completeBreak(pending.id), true);
  return pending;
}
function onboarding(controller, counting, next) {
  controller.reconcile(input(counting, next));
  for (let i = 0; i < 2; i += 1) { phase(counting); finish(controller, counting, COUNT); }
  controller.reconcile(input(counting, next));
  for (let i = 0; i < 2; i += 1) { phase(next); finish(controller, next, NEXT); }
  controller.reconcile(input(counting, next));
}
function engines(storage = null) {
  return [C.createEngine({ storage, random: C.seededRandom(34) }),
    N.createEngine({ storage, random: N.seededRandom(45) })];
}
function mixed(options = {}) {
  const controller = create(options);
  const [counting, next] = engines();
  onboarding(controller, counting, next);
  return { controller, counting, next };
}

test('browser/CommonJS standalone registry contains exactly six modes, only two playable', () => {
  assert.deepEqual(M.registry.map(mode => mode.id), [COUNT, NEXT, 'what_came_before',
    'color_match', 'find_missing_number', 'reach_target_score']);
  assert.deepEqual(M.registry.filter(mode => mode.playable).map(mode => mode.id), [COUNT, NEXT]);
  assert.throws(() => { M.registry[2].playable = true; }, TypeError);
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../game/progression/master.js'), 'utf8'), context);
  assert.equal(typeof context.SparkyMasterProgression.createController, 'function');
  assert.equal(context.SparkyProgression, undefined);
  assert.equal(context.SparkyNextProgression, undefined);
  assert.equal(context.SparkyMasterProgression.createController().state.activeModeId, COUNT);
});

test('first visit: counting tutorial, two phases/breaks, next tutorial once, then available rotation', () => {
  const storage = memoryStorage();
  const [counting, next] = engines(storage);
  let controller = create({ storage });
  assert.equal(controller.reconcile().tutorialNeeded, true);
  assert.equal(controller.state.activeModeId, COUNT);
  assert.equal(controller.reconcile(input(counting, next, { nextTutorialCompleted: false })).tutorialNeeded, false);
  phase(counting);
  assert.equal(counting.state.completedFixedQuestions, 4);
  assert.equal(finish(controller, counting, COUNT).nextAction, 'continue_mode');
  phase(counting);
  assert.equal(counting.state.completedFixedQuestions, 9);
  assert.equal(controller.reconcile(input(counting, next, { nextTutorialCompleted: false })).modeId, COUNT);
  assert.equal(controller.state.masterState, 'SPARKY_INTERACTION');
  const pending = plan(controller, counting, COUNT);
  assert.equal(pending.nextModeId, NEXT);
  assert.equal(pending.nextAction, 'start_tutorial');
  assert.equal(controller.reconcile(input(counting, next)).tutorialNeeded, false);
  ack(counting, pending);
  controller.completeBreak(pending.id);
  // The true next flag above arrived during the pending break and is sticky.
  assert.equal(controller.reconcile(input(counting, next, { nextTutorialCompleted: false })).tutorialNeeded, false);
  controller = create({ storage });
  assert.equal(controller.reconcile().tutorialNeeded, false);
  assert.equal(controller.state.activeModeId, NEXT);
  for (let i = 0; i < 2; i += 1) { phase(next); finish(controller, next, NEXT); }
  assert.equal(controller.state.stage, 'available_rotation');
  assert.equal(controller.state.activeModeId, COUNT);
  assert.equal(controller.state.availableOnboardingComplete, true);
  assert.equal(controller.state.onboardingComplete, false);
  assert.equal(controller.state.onboardingDeferred, true);
});

test('next tutorial is requested after (never before) counting phase-2 commit, and not replayed', () => {
  const storage = memoryStorage();
  const controller = create({ storage });
  const [counting, next] = engines();
  controller.reconcile(input(counting, next, { nextTutorialCompleted: false }));
  phase(counting); finish(controller, counting, COUNT);
  phase(counting);
  const pending = plan(controller, counting, COUNT);
  assert.equal(controller.reconcile(input(counting, next, { nextTutorialCompleted: false })).tutorialNeeded, false);
  ack(counting, pending);
  assert.equal(controller.reconcile(input(counting, next, { nextTutorialCompleted: false })).modeId, COUNT);
  controller.completeBreak(pending.id);
  assert.equal(controller.reconcile(input(counting, next, { nextTutorialCompleted: false })).tutorialNeeded, true);
  controller.reconcile(input(counting, next));
  assert.equal(create({ storage }).reconcile({ nextTutorialCompleted: false }).tutorialNeeded, false);
});

test('legacy counting >=9 routes directly to successor without touching later counting position', () => {
  const [counting, next] = engines();
  for (let i = 0; i < 4; i += 1) { phase(counting); counting.completeInteraction(); }
  solve(counting);
  const before = counting.state;
  const controller = create();
  const result = controller.reconcile(input(counting, next, { nextTutorialCompleted: false }));
  assert.equal(result.modeId, NEXT);
  assert.equal(result.tutorialNeeded, true);
  assert.deepEqual(counting.state, before);
  const returning = create();
  assert.equal(returning.reconcile(input(counting, next)).tutorialNeeded, false);
  assert.equal(returning.state.activeModeId, NEXT);
});

test('legacy engine phase-2 pending prevents premature counting tutorial switch or successor mixed routing', () => {
  const [counting, next] = engines();
  phase(counting); counting.completeInteraction(); phase(counting);
  const controller = create();
  assert.equal(controller.reconcile(input(counting, next)).modeId, COUNT);
  assert.equal(controller.state.stage, 'onboarding');
  counting.completeInteraction();
  assert.equal(controller.reconcile(input(counting, next)).modeId, NEXT);
  phase(next); next.completeInteraction(); phase(next);
  assert.equal(next.state.completedFixedQuestions, 10);
  assert.equal(controller.reconcile(input(counting, next)).modeId, NEXT);
  assert.equal(controller.state.stage, 'onboarding');
  const pending = plan(controller, next, NEXT);
  ack(next, pending);
  assert.equal(controller.reconcile(input(counting, next)).stage, 'onboarding');
  assert.equal(controller.state.activeModeId, NEXT);
  controller.completeBreak(pending.id);
  assert.equal(controller.state.stage, 'available_rotation');
});

test('both legacy modes already past opening phases migrate to available, never six-mode completion', () => {
  const [counting, next] = engines();
  for (const engine of [counting, next]) {
    for (let i = 0; i < 3; i += 1) { phase(engine); engine.completeInteraction(); }
  }
  const before = [counting.state, next.state];
  const controller = create();
  const result = controller.reconcile(input(counting, next));
  assert.equal(result.stage, 'available_rotation');
  assert.equal(result.tutorialNeeded, false);
  assert.equal(controller.state.onboardingComplete, false);
  assert.deepEqual([counting.state, next.state], before);
});

test('engine interaction takes priority even when tutorial flags are temporarily unavailable', () => {
  const [counting, next] = engines();
  phase(counting); counting.completeInteraction(); phase(counting);
  const controller = create();
  const result = controller.reconcile({ counting: counting.state, next: next.state });
  assert.equal(result.modeId, COUNT);
  assert.equal(result.masterState, 'SPARKY_INTERACTION');
  assert.equal(result.tutorialNeeded, false);
});

test('the final phase-2 question and feedback never route early; commit follows the acknowledged break', () => {
  const [counting, next] = engines();
  const controller = create();
  controller.reconcile(input(counting, next));
  phase(counting); finish(controller, counting, COUNT);
  while (counting.state.completedFixedQuestions < 8) solve(counting);
  counting.attempt(counting.currentQuestion().correctAnswer);
  assert.equal(controller.reconcile(input(counting, next)).modeId, COUNT);
  assert.equal(controller.state.masterState, 'GOAL_FEEDBACK');
  counting.finishFeedback();
  assert.equal(controller.reconcile(input(counting, next)).modeId, COUNT);
  const pending = plan(controller, counting, COUNT);
  assert.equal(controller.state.activeModeId, COUNT);
  ack(counting, pending);
  assert.equal(controller.reconcile(input(counting, next)).modeId, COUNT);
  controller.completeBreak(pending.id);
  assert.equal(controller.reconcile(input(counting, next)).modeId, NEXT);
  phase(next); finish(controller, next, NEXT);
  while (next.state.completedFixedQuestions < 9) solve(next);
  next.attempt(next.currentQuestion().correctAnswer);
  assert.equal(controller.reconcile(input(counting, next)).stage, 'onboarding');
  next.finishFeedback();
  assert.equal(controller.reconcile(input(counting, next)).stage, 'onboarding');
  const nextPending = plan(controller, next, NEXT);
  ack(next, nextPending);
  assert.equal(controller.reconcile(input(counting, next)).stage, 'onboarding');
  controller.completeBreak(nextPending.id);
  assert.equal(controller.state.stage, 'available_rotation');
});

test('onboarding routing uses exact fixed checkpoint AND phase, not absolute or infinite phase IDs', () => {
  const controller = create();
  controller.reconcile({ countingTutorialCompleted: true });
  for (const context of [
    { checkpointId: 'infinite_10', phaseId: 2 },
    { checkpointId: 'fixed_phase_2', phaseId: 3 },
    { checkpointId: 'fixed_phase_17', phaseId: 17 }
  ]) {
    const pending = controller.planBreak({ modeId: COUNT, ...context });
    assert.equal(pending.nextModeId, COUNT);
    controller.completeBreak(pending.id);
    assert.equal(controller.state.introductoryPhasesComplete[COUNT], false);
  }
  const pending = controller.planBreak({ modeId: COUNT, checkpointId: 'fixed_phase_2', phaseId: 2 });
  assert.equal(pending.nextModeId, NEXT);
  assert.equal(controller.state.activeModeId, COUNT);
  controller.completeBreak(pending.id);
  assert.equal(controller.state.activeModeId, NEXT);
});

test('reload before director or before engine ack restores identical pending plan without randomness', () => {
  const storage = memoryStorage();
  const [counting, next] = engines(storage);
  let controller = create({ storage });
  onboarding(controller, counting, next);
  phase(counting);
  const pending = plan(controller, counting, COUNT);
  const savedState = controller.state;
  controller = create({ storage, random: () => { throw Error('must not reroll'); } });
  const reloadedCounting = C.createEngine({ storage });
  const reloadedNext = N.createEngine({ storage });
  assert.deepEqual(controller.state, savedState);
  assert.deepEqual(controller.reconcile(input(reloadedCounting, reloadedNext)).pendingBreak, pending);
  assert.deepEqual(plan(controller, reloadedCounting, COUNT), pending);
  assert.equal(reloadedCounting.state.lastCompletedInteractionCheckpoint === pending.checkpointId, false);
  assert.equal(ack(reloadedCounting, pending), true);
  assert.equal(controller.completeBreak(pending.id), true);
  assert.equal(controller.completeBreak(pending.id), false);
});

test('two-store interruption: engine ack saved, master pending stays until explicit recovery commit', () => {
  const masterStorage = memoryStorage();
  const engineStorage = memoryStorage();
  let [counting, next] = engines(engineStorage);
  let controller = create({ storage: masterStorage });
  controller.reconcile(input(counting, next));
  phase(counting); finish(controller, counting, COUNT); phase(counting);
  const pending = plan(controller, counting, COUNT);
  assert.equal(ack(counting, pending), true);
  [counting, next] = engines(engineStorage);
  controller = create({ storage: masterStorage });
  assert.equal(counting.state.lastCompletedInteractionCheckpoint, pending.checkpointId);
  const result = controller.reconcile(input(counting, next));
  assert.equal(result.modeId, COUNT);
  assert.equal(result.tutorialNeeded, false);
  assert.deepEqual(result.pendingBreak, pending);
  assert.equal(controller.completeBreak(pending.id), true);
  assert.equal(controller.state.activeModeId, NEXT);
  const snapshot = controller.state;
  assert.equal(controller.completeBreak(pending.id), false);
  assert.deepEqual(controller.state, snapshot);
});

test('persisted mixed plan fixes quota, next action, and bag before director and across changed random/config', () => {
  const storage = memoryStorage();
  const { controller, counting, next } = mixed({ storage, twoPhaseProbability: 0 });
  assert.equal(controller.state.run.phaseQuota, 1);
  phase(counting);
  const pending = plan(controller, counting, COUNT);
  assert.equal(pending.nextModeId, NEXT);
  assert.equal(pending.nextAction, 'switch_mode');
  const restored = create({ storage, twoPhaseProbability: 1, random: () => { throw Error('reroll'); } });
  ack(counting, pending);
  restored.reconcile(input(counting, next));
  assert.equal(restored.state.activeModeId, COUNT);
  assert.equal(restored.completeBreak(pending.id), true);
  assert.equal(restored.state.run.phaseQuota, 1);
  assert.deepEqual(restored.state.bag, pending.commit.bag);
});

test('reload between phases resumes the same saved mode and remaining quota, without copying engine position', () => {
  const storage = memoryStorage();
  const { controller, counting, next } = mixed({ storage, twoPhaseProbability: 1 });
  phase(counting); finish(controller, counting, COUNT);
  solve(counting);
  assert.deepEqual(controller.state.run, { phaseQuota: 2, completedPhases: 1 });
  const restored = create({ storage, random: () => { throw Error('unexpected selection'); } });
  assert.equal(restored.reconcile(input(counting, next)).modeId, COUNT);
  assert.equal(counting.currentQuestion().questionId, 'count_016');
  assert.deepEqual(restored.state.run, { phaseQuota: 2, completedPhases: 1 });
  assert.equal(next.currentQuestion().questionId, 'next_011');
});

test('mixed engine-ack interruption does not consume quota until explicit commit; older callbacks are harmless', () => {
  const storage = memoryStorage();
  const { controller, counting, next } = mixed({ storage, twoPhaseProbability: 1 });
  phase(counting);
  const first = plan(controller, counting, COUNT);
  ack(counting, first);
  const restored = create({ storage });
  restored.reconcile(input(counting, next));
  assert.deepEqual(restored.state.run, { phaseQuota: 2, completedPhases: 0 });
  assert.equal(counting.state.lastCompletedInteractionCheckpoint, first.checkpointId);
  restored.completeBreak(first.id);
  assert.deepEqual(restored.state.run, { phaseQuota: 2, completedPhases: 1 });
  phase(counting);
  const second = plan(restored, counting, COUNT);
  assert.equal(restored.completeBreak(first.id), false);
  assert.equal(restored.state.pendingBreak.id, second.id);
  ack(counting, second);
  restored.completeBreak(second.id);
  const before = restored.state;
  assert.equal(restored.completeBreak(first.id), false);
  assert.deepEqual(restored.state, before);
});

for (const quota of [1, 2]) {
  test(`mixed runs last exactly ${quota} actual phases, independent of absolute phase IDs`, () => {
    const { controller, counting, next } = mixed({ twoPhaseProbability: quota === 2 ? 1 : 0 });
    for (let run = 0; run < 12; run += 1) {
      const modeId = controller.state.activeModeId;
      const engine = modeId === COUNT ? counting : next;
      assert.equal(controller.state.run.phaseQuota, quota);
      for (let i = 0; i < quota; i += 1) {
        phase(engine);
        const pending = plan(controller, engine, modeId);
        assert.equal(controller.state.run.completedPhases, i);
        assert.equal(pending.nextAction, i < quota - 1 ? 'continue_mode' : 'switch_mode');
        ack(engine, pending);
        controller.completeBreak(pending.id);
        assert.equal(controller.state.activeModeId, i < quota - 1 ? modeId : modeId === COUNT ? NEXT : COUNT);
      }
      controller.reconcile(input(counting, next));
    }
  });
}

test('default quota threshold is 65% two / 35% one, configurable and validated', () => {
  for (const [value, expected] of [[0, 2], [0.649999, 2], [0.65, 1], [0.999999, 1]]) {
    const { controller } = mixed({ random: () => value });
    assert.equal(controller.state.run.phaseQuota, expected);
  }
  for (const value of [-1, 1.1, NaN, Infinity, '0.65', null]) {
    assert.throws(() => create({ twoPhaseProbability: value }), RangeError);
  }
});

test('fair rotation alternates two modes, supports both durations, never selects future modes or repeats tutorials', () => {
  const { controller, counting, next } = mixed({ random: C.seededRandom(7890) });
  let previous = null;
  const visits = { [COUNT]: 0, [NEXT]: 0 };
  const quotas = new Set();
  for (let run = 0; run < 120; run += 1) {
    const modeId = controller.state.activeModeId;
    const engine = modeId === COUNT ? counting : next;
    assert.notEqual(modeId, previous);
    assert.ok(M.registry.find(mode => mode.id === modeId).playable);
    visits[modeId] += 1;
    const quota = controller.state.run.phaseQuota;
    quotas.add(quota);
    for (let i = 0; i < quota; i += 1) { phase(engine); finish(controller, engine, modeId); }
    assert.equal(controller.reconcile(input(counting, next)).tutorialNeeded, false);
    assert.equal(controller.state.availableOnboardingComplete, true);
    assert.equal(controller.state.onboardingComplete, false);
    assert.equal(controller.state.onboardingDeferred, true);
    previous = modeId;
  }
  assert.equal(visits[COUNT], visits[NEXT]);
  assert.deepEqual([...quotas].sort(), [1, 2]);
});

test('infinite and champion progression are independently engine-owned; reused phaseId still counts phases', () => {
  const { controller, counting, next } = mixed({ twoPhaseProbability: 1 });
  // Fast-forward engines independently; master never copies/reset their content.
  while (counting.state.mode !== 'infinite') {
    phase(counting);
    if (counting.state.status === 'celebration') break;
    counting.completeInteraction();
  }
  assert.equal(counting.state.status, 'celebration');
  assert.equal(next.state.mode, 'fixed');
  const champion = plan(controller, counting, COUNT);
  assert.equal(champion.checkpointId, 'fixed_phase_17');
  assert.equal(champion.nextAction, 'continue_mode');
  assert.equal(ack(counting, champion), true);
  assert.equal(counting.state.mode, 'infinite');
  controller.completeBreak(champion.id);
  assert.equal(controller.reconcile(input(counting, next)).masterState, 'INFINITE_PLAY');
  phase(counting);
  const pending = finish(controller, counting, COUNT);
  assert.equal(pending.phaseId, 18);
  assert.equal(pending.nextAction, 'switch_mode');
  assert.equal(next.state.currentFixedQuestionId, 'next_011');
  assert.equal(next.state.mode, 'fixed');
  assert.equal(counting.state.completedInfiniteQuestions, 5);
});

test('independent save keys and engine snapshots are untouched; selected saved active mode resumes exactly', () => {
  const storage = memoryStorage();
  const [counting, next] = engines(storage);
  const controller = create({ storage });
  onboarding(controller, counting, next);
  phase(counting); finish(controller, counting, COUNT);
  const before = [storage.getItem(C.STORAGE_KEY), storage.getItem(N.STORAGE_KEY)];
  const masterBefore = controller.state;
  const reloaded = create({ storage });
  reloaded.reconcile(input(counting, next));
  assert.equal(reloaded.state.activeModeId, masterBefore.activeModeId);
  assert.deepEqual(reloaded.state.run, masterBefore.run);
  assert.deepEqual([storage.getItem(C.STORAGE_KEY), storage.getItem(N.STORAGE_KEY)], before);
  assert.equal('currentQuestion' in reloaded.state, false);
  assert.equal('modeProgress' in reloaded.state, false);
  const other = create({ storage: memoryStorage() });
  assert.equal(other.state.activeModeId, COUNT);
  assert.equal(other.state.tutorials[COUNT], false);
});

test('duplicate/stale callbacks, wrong IDs and conflicting plans do not consume phases or change route', () => {
  const { controller, counting } = mixed();
  phase(counting);
  const pending = plan(controller, counting, COUNT);
  const before = controller.state;
  assert.deepEqual(plan(controller, counting, COUNT), pending);
  assert.equal(controller.completeBreak('wrong'), false);
  assert.throws(() => controller.planBreak({ modeId: NEXT, checkpointId: 'next_fixed_phase_3', phaseId: 3 }));
  assert.throws(() => controller.planBreak({ modeId: COUNT, checkpointId: pending.checkpointId, phaseId: 999 }));
  assert.deepEqual(controller.state, before);
  ack(counting, pending);
  controller.completeBreak(pending.id);
  const after = controller.state;
  assert.equal(controller.completeBreak(pending.id), false);
  assert.equal(controller.planBreak({ modeId: COUNT, checkpointId: pending.checkpointId, phaseId: pending.phaseId }), null);
  assert.deepEqual(controller.state, after);
});

test('lifecycle states persist as diagnostics; pending break cannot be bypassed by setState', () => {
  const storage = memoryStorage();
  const controller = create({ storage });
  for (const state of M.STATES) {
    controller.setState(state);
    assert.equal(create({ storage }).state.masterState, state);
  }
  assert.throws(() => controller.setState('UNKNOWN'), TypeError);
  const pending = controller.planBreak({ modeId: COUNT, checkpointId: 'fixed_phase_1', phaseId: 1 });
  assert.throws(() => controller.setState('PLAYING_QUESTION'));
  controller.setState('SPARKY_INTERACTION');
  assert.equal(controller.state.pendingBreak.id, pending.id);
  assert.equal(controller.reconcile({ countingTutorialCompleted: true }).masterState, 'SPARKY_INTERACTION');
});

test('reconcile reports engine feedback and infinite states without owning animation or question logic', () => {
  const [counting, next] = engines();
  const controller = create();
  counting.attempt(counting.currentQuestion().correctAnswer);
  assert.equal(controller.reconcile(input(counting, next)).masterState, 'GOAL_FEEDBACK');
  assert.equal(counting.state.completedFixedQuestions, 0);
  counting.finishFeedback();
  assert.equal(controller.reconcile(input(counting, next)).masterState, 'PLAYING_QUESTION');
  assert.equal(counting.state.completedFixedQuestions, 1);
});

test('malformed/incompatible storage resets safely, never selects future modes, then migrates engine saves', () => {
  const corruptions = ['{', 'null', '[]', '42', JSON.stringify({ version: 999 })];
  const base = create().state;
  for (const edit of [
    s => { s.activeModeId = 'color_match'; },
    s => { s.onboardingComplete = true; },
    s => { s.availableOnboardingComplete = true; },
    s => { s.run.phaseQuota = 0; },
    s => { s.run.completedPhases = 2; },
    s => { s.bag = ['color_match']; },
    s => { s.tutorials = null; },
    s => { s.pendingBreak = { id: 'bad' }; },
    s => { s.stage = 'available_rotation'; },
    s => { s.currentQuestion = { options: [] }; }
  ]) {
    const value = JSON.parse(JSON.stringify(base)); edit(value); corruptions.push(JSON.stringify(value));
  }
  for (const bad of corruptions) {
    const storage = memoryStorage(); storage.setItem(M.STORAGE_KEY, bad);
    const controller = create({ storage });
    assert.deepEqual(controller.state, base);
    const result = controller.reconcile({ counting: { completedFixedQuestions: 14 },
      countingTutorialCompleted: true, nextTutorialCompleted: true });
    assert.equal(result.modeId, NEXT);
    assert.equal(result.tutorialNeeded, false);
  }
});

test('corrupt pending commit/route is rejected, intact pending survives repeated reloads', () => {
  const storage = memoryStorage();
  const { controller, counting } = mixed({ storage });
  phase(counting); plan(controller, counting, COUNT);
  const good = storage.getItem(M.STORAGE_KEY);
  assert.deepEqual(create({ storage }).state, controller.state);
  for (const edit of [
    s => { s.pendingBreak.commit.activeModeId = 'what_came_before'; },
    s => { s.pendingBreak.nextModeId = 'color_match'; },
    s => { s.pendingBreak.nextAction = 'invented'; },
    s => { s.pendingBreak.commit.onboardingComplete = true; },
    s => { s.pendingBreak.id = 'forged'; },
    s => { s.masterState = 'PLAYING_QUESTION'; }
  ]) {
    const bad = JSON.parse(good); edit(bad); storage.setItem(M.STORAGE_KEY, JSON.stringify(bad));
    assert.deepEqual(create({ storage }).state, create().state);
  }
});

test('storage read/write failures propagate; failed plan/commit leaves retryable in-memory state', () => {
  assert.throws(() => create({ storage: { getItem() { throw Error('read'); }, setItem() {} } }), /read/);
  const backing = memoryStorage();
  let fail = false;
  const storage = { getItem: key => backing.getItem(key), setItem(key, value) {
    if (fail) throw Error('write'); backing.setItem(key, value);
  } };
  const controller = create({ storage });
  const before = controller.state;
  fail = true;
  assert.throws(() => controller.planBreak({ modeId: COUNT, checkpointId: 'fixed_phase_2', phaseId: 2 }), /write/);
  assert.deepEqual(controller.state, before);
  fail = false;
  const pending = controller.planBreak({ modeId: COUNT, checkpointId: 'fixed_phase_2', phaseId: 2 });
  const prepared = controller.state;
  fail = true;
  assert.throws(() => controller.completeBreak(pending.id), /write/);
  assert.deepEqual(controller.state, prepared);
  assert.deepEqual(create({ storage: backing }).state.pendingBreak, pending);
  fail = false;
  assert.equal(controller.completeBreak(pending.id), true);
});

test('input validation rejects unavailable modes, invalid checkpoints, phases, storage, and randomness', () => {
  const controller = create();
  for (const modeId of ['color_match', 'missing', '__proto__', null]) {
    assert.throws(() => controller.planBreak({ modeId, checkpointId: 'x', phaseId: 1 }), TypeError);
  }
  for (const checkpointId of ['', null, 4, 'x'.repeat(257)]) {
    assert.throws(() => controller.planBreak({ modeId: COUNT, checkpointId, phaseId: 1 }), TypeError);
  }
  for (const phaseId of [0, -1, NaN, 1.5, '2']) {
    assert.throws(() => controller.planBreak({ modeId: COUNT, checkpointId: 'x', phaseId }), TypeError);
  }
  assert.throws(() => controller.planBreak({ modeId: NEXT, checkpointId: 'x', phaseId: 1 }));
  assert.throws(() => create({ random: 1 }), TypeError);
  assert.throws(() => create({ storage: {} }), TypeError);
  for (const value of [NaN, -1, 1, Infinity]) {
    const invalid = create({ random: () => value });
    const p = invalid.planBreak({ modeId: COUNT, checkpointId: 'fixed_phase_2', phaseId: 2 });
    invalid.completeBreak(p.id);
    const before = invalid.state;
    assert.throws(() => invalid.planBreak({ modeId: NEXT, checkpointId: 'next_fixed_phase_2', phaseId: 2 }), RangeError);
    assert.deepEqual(invalid.state, before);
  }
});

test('snapshots and plans are deeply immutable and do not expose mutable internal state', () => {
  const controller = create();
  assert.throws(() => { controller.state.tutorials[COUNT] = true; }, TypeError);
  const pending = controller.planBreak({ modeId: COUNT, checkpointId: 'fixed_phase_2', phaseId: 2 });
  assert.throws(() => { pending.commit.run.phaseQuota = 1; }, TypeError);
  assert.throws(() => { controller.state.pendingBreak.nextModeId = COUNT; }, TypeError);
  assert.throws(() => { controller.reconcile().pendingBreak.commit.bag.push(NEXT); }, TypeError);
  assert.equal(controller.state.pendingBreak.nextModeId, NEXT);
});