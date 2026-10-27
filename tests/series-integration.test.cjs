'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../game/progression/engine.js');
const N = require('../game/progression/next-engine.js');
const B = require('../game/progression/before-engine.js');
const M = require('../game/progression/master.js');

const COUNT = 'kick_and_count';
const NEXT = 'what_comes_next';
const BEFORE = 'what_came_before';
const IDS = [COUNT, NEXT, BEFORE];
const PREFIX = { [COUNT]: 'count', [NEXT]: 'next', [BEFORE]: 'before' };
const FLAGS = {
  [COUNT]: 'sparky.tutorial.completed.v1',
  [NEXT]: 'sparky.tutorial.what-comes-next.completed.v1',
  [BEFORE]: 'sparky.tutorial.what-came-before.completed.v1'
};

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.get(key) ?? null; },
    setItem(key, value) { data.set(key, String(value)); }
  };
}

// Every engine checkpoint comes from actual answers and feedback commits. Only
// tutorial presentation is represented by a flag. Explicit v1 fixtures below
// exercise the original stored master schema, not a downgraded v2 controller.
function harness(storage = memoryStorage(), log = { questions: [], breaks: [], tutorials: [] }, options = {}) {
  const engines = {
    [COUNT]: C.createEngine({ storage, random: C.seededRandom(123) }),
    [NEXT]: N.createEngine({ storage, random: N.seededRandom(456) }),
    [BEFORE]: B.createEngine({ storage, random: B.seededRandom(654) })
  };
  const master = M.createController({ storage, random: C.seededRandom(789), ...options });
  let selected;
  let engine;

  function selectEngine(modeId) {
    selected = modeId;
    engine = engines[modeId];
    assert.ok(engine, `unimplemented mode selected: ${modeId}`);
  }
  function route() {
    // Same two-store recovery and ordering as game/main.js route(): an engine
    // ack is durable before master.completeBreak; never show that break twice.
    const pending = master.state.pendingBreak;
    if (pending) {
      const saved = engines[pending.modeId].state;
      if (saved.lastCompletedInteractionCheckpoint === pending.checkpointId ||
          (pending.checkpointId === 'fixed_phase_17' && saved.mode === 'infinite')) {
        master.completeBreak(pending.id);
      }
    }
    const result = master.reconcile({ counting: engines[COUNT].state, next: engines[NEXT].state,
      before: engines[BEFORE].state,
      countingTutorialCompleted: storage.getItem(FLAGS[COUNT]) === 'true',
      nextTutorialCompleted: storage.getItem(FLAGS[NEXT]) === 'true',
      beforeTutorialCompleted: storage.getItem(FLAGS[BEFORE]) === 'true' });
    selectEngine(result.modeId);
    return result;
  }
  function completeTutorial() {
    const result = route();
    assert.equal(result.tutorialNeeded, true);
    const before = IDS.map(id => engines[id].state);
    log.tutorials.push(selected);
    storage.setItem(FLAGS[selected], 'true');
    assert.equal(route().tutorialNeeded, false);
    assert.deepEqual(IDS.map(id => engines[id].state), before, 'tutorial must not consume any question');
  }
  function answer({ finish = true, wrong = false } = {}) {
    assert.equal(route().tutorialNeeded, false, 'series must wait for its real tutorial flag');
    const q = engine.currentQuestion();
    assert.ok(q, 'a checkpoint must be acknowledged before answering');
    const parked = IDS.filter(id => id !== selected);
    const before = parked.map(id => engines[id].state);
    if (wrong) {
      const countBefore = engine.state.completedFixedQuestions + engine.state.completedInfiniteQuestions;
      const result = engine.attempt(q.options.find(value => value !== q.correctAnswer));
      assert.equal(result.accepted, true);
      assert.equal(result.correct, false);
      assert.equal(engine.finishFeedback(), false);
      assert.equal(engine.state.completedFixedQuestions + engine.state.completedInfiniteQuestions, countBefore);
      assert.deepEqual(engine.currentQuestion(), q);
    }
    assert.equal(engine.attempt(q.correctAnswer).correct, true);
    assert.equal(route().masterState, 'GOAL_FEEDBACK');
    assert.equal(engine.attempt(q.correctAnswer).accepted, false, 'accepted feedback is locked');
    log.questions.push({ modeId: selected, question: q });
    if (finish) {
      assert.equal(engine.finishFeedback(), true);
      assert.equal(engine.finishFeedback(), false);
    }
    assert.deepEqual(parked.map(id => engines[id].state), before, 'answer mutated a parked engine');
    return q;
  }
  function reachBreak() {
    let goals = 0;
    while (route() && engine.state.status === 'question') {
      answer();
      goals += 1;
      assert.ok(goals <= 5, 'no checkpoint within one phase');
    }
    assert.ok(['interaction', 'celebration'].includes(engine.state.status));
    return goals;
  }
  function planBreak() {
    route();
    const state = engine.state;
    assert.ok(['interaction', 'celebration'].includes(state.status));
    const interaction = state.status === 'celebration'
      ? { checkpointId: 'fixed_phase_17', phaseId: 17 } : state.pendingInteraction;
    const plan = master.planBreak({ modeId: selected, ...interaction });
    assert.ok(plan);
    assert.deepEqual(master.planBreak({ modeId: selected, ...interaction }), plan);
    assert.equal(route().masterState, 'SPARKY_INTERACTION');
    assert.equal(route().tutorialNeeded, false);
    return plan;
  }
  function acknowledge(plan) {
    const owner = engines[plan.modeId];
    log.breaks.push(plan.id); // Represents completed director presentation.
    assert.equal(plan.checkpointId === 'fixed_phase_17'
      ? owner.completeCelebration() : owner.completeInteraction(plan.checkpointId), true);
  }
  function finishBreak() {
    const plan = planBreak();
    acknowledge(plan);
    assert.equal(master.completeBreak(plan.id), true);
    const after = master.state;
    assert.equal(master.completeBreak(plan.id), false);
    assert.deepEqual(master.state, after, 'duplicate callback consumed a quota');
    route();
    return plan;
  }
  return { storage, log, engines, master, route, completeTutorial, answer, reachBreak,
    planBreak, acknowledge, finishBreak,
    get engine() { return engine; }, get modeId() { return selected; },
    reload(extra = {}) { return harness(storage, log, { ...options, ...extra }); } };
}

function onboard(h) {
  for (const modeId of IDS) {
    assert.equal(h.route().modeId, modeId);
    if (h.route().tutorialNeeded) h.completeTutorial();
    for (let phase = 0; phase < 2; phase += 1) {
      h.reachBreak();
      h.finishBreak();
    }
  }
  assert.equal(h.route().stage, 'available_rotation');
}

function solveLegacyTo(storage, completed, acknowledgeLast = false) {
  const engine = C.createEngine({ storage, random: C.seededRandom(33) });
  while (engine.state.completedFixedQuestions < completed) {
    if (engine.state.status === 'interaction') assert.equal(engine.completeInteraction(), true);
    assert.equal(engine.attempt(engine.currentQuestion().correctAnswer).correct, true);
    assert.equal(engine.finishFeedback(), true);
  }
  if (acknowledgeLast && engine.state.status === 'interaction') engine.completeInteraction();
  return engine.state;
}

test('real new-player series: three tutorial gates, two acknowledged breaks each, exact question parking', () => {
  let h = harness();
  assert.equal(h.route().modeId, COUNT);
  assert.equal(h.route().tutorialNeeded, true);
  h.completeTutorial();
  assert.equal(h.reachBreak(), 4);
  assert.equal(h.engine.state.completedFixedQuestions, 4);
  assert.equal(h.finishBreak().nextAction, 'continue_mode');
  assert.equal(h.engine.currentQuestion().questionId, 'count_005');
  assert.equal(h.reachBreak(), 5);
  assert.equal(h.engine.state.completedFixedQuestions, 9);
  const plan = h.planBreak();
  assert.equal(plan.nextAction, 'start_tutorial');
  assert.equal(plan.nextModeId, NEXT);
  h.acknowledge(plan);
  assert.equal(h.master.completeBreak(plan.id), true);
  assert.equal(h.route().tutorialNeeded, true);
  const countingParked = h.engines[COUNT].state;
  const nextParked = h.engines[NEXT].state;
  const run = h.master.state.run;
  // Skipping/returning without the successor's completion flag is not completion.
  h = h.reload();
  for (let skip = 0; skip < 3; skip += 1) {
    assert.equal(h.route().tutorialNeeded, true);
    assert.equal(h.route().modeId, NEXT);
    assert.deepEqual(h.engines[NEXT].state, nextParked);
    assert.deepEqual(h.master.state.run, run);
  }
  assert.equal(h.storage.getItem(FLAGS[NEXT]), null);
  assert.equal(h.engines[COUNT].currentQuestion().questionId, 'count_010');
  h.completeTutorial();
  assert.equal(h.reachBreak(), 5);
  assert.equal(h.finishBreak().nextAction, 'continue_mode');
  assert.equal(h.reachBreak(), 5);
  const beforePlan = h.planBreak();
  assert.equal(beforePlan.nextModeId, BEFORE);
  assert.equal(beforePlan.nextAction, 'start_tutorial');
  assert.equal(h.route().tutorialNeeded, false, 'pending successor break blocks predecessor tutorial');
  h.acknowledge(beforePlan);
  // The actual host must commit the durable break before routing the tutorial.
  assert.equal(h.master.state.activeModeId, NEXT);
  assert.deepEqual(h.master.state.pendingBreak, beforePlan);
  assert.equal(h.master.completeBreak(beforePlan.id), true);
  assert.equal(h.route().modeId, BEFORE);
  assert.equal(h.route().stage, 'onboarding');
  assert.equal(h.master.state.availableOnboardingComplete, false);
  const parked = IDS.map(id => h.engines[id].state);
  const beforeRun = h.master.state.run;
  for (let skip = 0; skip < 3; skip += 1) {
    h = h.reload();
    assert.equal(h.route().tutorialNeeded, true);
    assert.equal(h.modeId, BEFORE);
    assert.deepEqual(IDS.map(id => h.engines[id].state), parked);
    assert.deepEqual(h.master.state.run, beforeRun);
  }
  assert.equal(h.storage.getItem(FLAGS[BEFORE]), null);
  h.completeTutorial();
  assert.equal(h.reachBreak(), 5);
  assert.equal(h.finishBreak().nextAction, 'continue_mode');
  assert.equal(h.engine.currentQuestion().questionId, 'before_006');
  assert.equal(h.reachBreak(), 5);
  assert.equal(h.finishBreak().nextModeId, COUNT);
  assert.equal(h.route().stage, 'available_rotation');
  assert.equal(h.master.state.availableOnboardingComplete, true);
  assert.equal(h.master.state.onboardingComplete, false);
  assert.equal(h.master.state.onboardingDeferred, true);
  assert.deepEqual(h.engines[COUNT].state, countingParked);
  assert.deepEqual(h.engines[NEXT].state, parked[1]);
  assert.equal(h.engines[NEXT].currentQuestion().questionId, 'next_011');
  assert.equal(h.engines[BEFORE].currentQuestion().questionId, 'before_011');
  assert.deepEqual(h.log.tutorials, IDS);
});

test('all 284 fixed questions, every break/counting champion, then all three independent infinite streams', () => {
  let h = harness();
  onboard(h);
  let switches = 0;
  let phases = 6;
  const reached100 = new Set();
  while (phases < 260 || reached100.size < 3) {
    assert.ok(phases < 320, 'rotation starved a playable mode');
    const modeId = h.route().modeId;
    assert.equal(h.route().tutorialNeeded, false);
    const parkedIds = IDS.filter(id => id !== modeId);
    const parked = parkedIds.map(id => h.engines[id].state);
    h.answer({ wrong: phases % 7 === 0 });
    h.reachBreak();
    const before = h.engine.state;
    if (before.completedInfiniteQuestions === 100) reached100.add(modeId);
    const pending = h.planBreak();
    const routeBefore = h.master.state;
    if (routeBefore.run.completedPhases + 1 < routeBefore.run.phaseQuota) {
      assert.equal(pending.nextModeId, modeId, 'run switched before its quota');
    } else {
      assert.notEqual(pending.nextModeId, modeId, 'run failed to switch at its quota');
    }
    h.finishBreak();
    assert.deepEqual(parkedIds.map(id => h.engines[id].state), parked, 'break changed another mode save');
    if (pending.nextModeId !== modeId) switches += 1;
    phases += 1;
    const snapshots = IDS.map(id => h.engines[id].state);
    const masterSave = h.master.state;
    h = h.reload();
    assert.deepEqual(h.master.state, masterSave);
    assert.deepEqual(IDS.map(id => h.engines[id].state), snapshots);
    assert.equal(h.route().tutorialNeeded, false);
  }
  assert.ok(switches > 100);
  assert.deepEqual([...reached100].sort(), IDS.slice().sort());
  let combinedFixed = 0;
  for (const [id, module, prefix, fixedTotal] of [[COUNT, C, 'infinite_', 84],
    [NEXT, N, 'next_infinite_', 100], [BEFORE, B, 'before_infinite_', 100]]) {
    const questions = h.log.questions.filter(item => item.modeId === id).map(item => item.question);
    const fixed = questions.filter(q => !q.questionId.startsWith(prefix));
    assert.equal(fixed.length, fixedTotal);
    combinedFixed += fixed.length;
    assert.deepEqual(fixed, module.fixedQuestions, 'fixed question skipped, duplicated or rerolled');
    const infinite = questions.filter(q => q.questionId.startsWith(prefix));
    assert.ok(infinite.length >= 100);
    assert.deepEqual(infinite.map(q => q.questionId), infinite.map((_, i) => `${prefix}${i + 1}`));
    const saved = h.engines[id].state;
    assert.equal(saved.mode, 'infinite');
    assert.equal(saved.completedFixedQuestions, fixedTotal);
    assert.equal(saved.completedInfiniteQuestions, infinite.length);
    assert.equal(saved.currentQuestion.questionId, `${prefix}${infinite.length + 1}`);
    const checkpoints = h.log.breaks.map(value => JSON.parse(value)).filter(([mode]) => mode === id)
      .map(([, checkpoint]) => checkpoint);
    const checkpointPrefix = id === COUNT ? '' : `${PREFIX[id]}_`;
    const expectedFixed = module.phases.map(p => `${checkpointPrefix}fixed_phase_${p.phaseId}`);
    assert.deepEqual(checkpoints, [...expectedFixed, ...Array.from({ length: infinite.length / 5 },
      (_, i) => `${checkpointPrefix}infinite_${(i + 1) * 5}`)]);
  }
  assert.equal(combinedFixed, 284);
  assert.equal(h.log.breaks.filter(id => id === JSON.stringify([COUNT, 'fixed_phase_17'])).length, 1);
  assert.equal(new Set(h.log.breaks).size, h.log.breaks.length);
  assert.deepEqual(h.log.tutorials, IDS, 'completed tutorials replayed in rotation');
});

for (const point of ['count-first', 'count-switch', 'next-switch', 'before-first', 'before-switch', 'mixed', 'champion']) {
  for (const afterAck of [false, true]) {
    test(`dual-store reload ${point}, ${afterAck ? 'after' : 'before'} engine ack preserves exact plan and quota`, () => {
      let h = harness();
      if (point === 'champion') {
        solveLegacyTo(h.storage, 84);
        h = h.reload();
        h.completeTutorial(); // Migration parks champion until successor introduction ends.
        for (let i = 0; i < 2; i += 1) { h.reachBreak(); h.finishBreak(); }
        h.completeTutorial();
        for (let i = 0; i < 2; i += 1) { h.reachBreak(); h.finishBreak(); }
        assert.equal(h.route().modeId, COUNT);
        assert.equal(h.engine.state.status, 'celebration');
      } else if (point === 'mixed') {
        onboard(h);
        h.reachBreak();
      } else {
        h.completeTutorial();
        h.reachBreak();
        if (point !== 'count-first') {
          h.finishBreak(); h.reachBreak();
        }
        if (['next-switch', 'before-first', 'before-switch'].includes(point)) {
          h.finishBreak(); h.completeTutorial();
          h.reachBreak(); h.finishBreak(); h.reachBreak();
        }
        if (['before-first', 'before-switch'].includes(point)) {
          h.finishBreak(); h.completeTutorial(); h.reachBreak();
          if (point === 'before-switch') { h.finishBreak(); h.reachBreak(); }
        }
      }
      const pending = h.planBreak();
      if (point === 'champion') {
        assert.equal(pending.modeId, COUNT);
        assert.equal(pending.phaseId, 17);
        assert.equal(pending.checkpointId, 'fixed_phase_17');
      }
      const oldRun = h.master.state.run;
      if (afterAck) h.acknowledge(pending);
      const ownerSave = h.engines[pending.modeId].state;
      // A saved plan must not draw any new routing randomness after reopening.
      h = h.reload({ random() { throw new Error('pending plan rerolled'); } });
      assert.deepEqual(h.master.state.pendingBreak, pending);
      assert.deepEqual(h.engines[pending.modeId].state, ownerSave);
      const result = h.route();
      if (!afterAck) {
        assert.equal(result.modeId, pending.modeId);
        assert.deepEqual(h.master.state.run, oldRun);
        assert.deepEqual(h.planBreak(), pending);
        assert.equal(h.log.breaks.includes(pending.id), false);
        h.acknowledge(pending);
        h.route();
      }
      assert.equal(h.master.state.pendingBreak, null);
      assert.equal(h.master.state.activeModeId, pending.commit.activeModeId);
      assert.deepEqual(h.master.state.run, pending.commit.run);
      assert.deepEqual(h.master.state.bag, pending.commit.bag);
      assert.equal(h.log.breaks.filter(id => id === pending.id).length, 1);
      assert.equal(h.master.completeBreak(pending.id), false);
      assert.equal(h.master.planBreak({ modeId: pending.modeId, checkpointId: pending.checkpointId,
        phaseId: pending.phaseId }), null);
      const acked = h.engines[pending.modeId].state;
      const expectedQuestion = pending.checkpointId === 'fixed_phase_17' ? 'infinite_1'
        : `${PREFIX[pending.modeId]}_${String(acked.completedFixedQuestions + 1).padStart(3, '0')}`;
      assert.equal(acked.currentQuestion.questionId, expectedQuestion, 'ack skipped the next count');
      const committed = h.master.state;
      h = h.reload();
      h.route();
      assert.equal(h.master.state.activeModeId, pending.nextModeId);
      assert.deepEqual(h.master.state.run, committed.run);
      assert.deepEqual(h.engines[pending.modeId].state, acked);
      assert.equal(h.log.breaks.filter(id => id === pending.id).length, 1);
    });
  }
}

for (const modeId of IDS) {
  test(`restored accepted phase-end feedback commits once and presents one correct ${modeId} break`, () => {
    let h = harness();
    h.completeTutorial();
    for (const prior of IDS.slice(0, IDS.indexOf(modeId))) {
      assert.equal(h.modeId, prior);
      for (let phase = 0; phase < 2; phase += 1) { h.reachBreak(); h.finishBreak(); }
      h.completeTutorial();
    }
    const phaseLength = modeId === COUNT ? 4 : 5;
    for (let i = 1; i < phaseLength; i += 1) h.answer();
    const accepted = h.answer({ finish: false });
    assert.equal(h.engine.state.status, 'feedback');
    assert.equal(h.engine.state.completedFixedQuestions, phaseLength - 1);
    h = h.reload();
    assert.equal(h.route().modeId, modeId);
    assert.equal(h.engine.state.status, 'interaction');
    assert.equal(h.engine.state.completedFixedQuestions, phaseLength);
    const checkpoint = `${modeId === COUNT ? '' : `${PREFIX[modeId]}_`}fixed_phase_1`;
    assert.equal(h.engine.state.pendingInteraction.checkpointId, checkpoint);
    const plan = h.planBreak();
    h = h.reload();
    assert.deepEqual(h.planBreak(), plan);
    assert.equal(h.engine.finishFeedback(), false);
    h.finishBreak();
    assert.equal(h.log.breaks.filter(id => id === plan.id).length, 1);
    assert.equal(h.engine.state.completedFixedQuestions, phaseLength);
    assert.notEqual(h.engine.currentQuestion().questionId, accepted.questionId);
    const next = h.engine.currentQuestion();
    h = h.reload(); h.route();
    assert.deepEqual(h.engine.currentQuestion(), next);
    assert.equal(h.master.state.pendingBreak, null);
  });
}

for (const completed of [9, 14, 84]) {
  test(`legacy counting ${completed}/84 migration preserves unacknowledged interaction/champion until return`, () => {
    const storage = memoryStorage();
    storage.setItem(FLAGS[COUNT], 'true');
    const legacy = solveLegacyTo(storage, completed);
    let h = harness(storage);
    const first = h.route();
    if (completed === 9) {
      assert.equal(first.modeId, COUNT, 'phase-2 pending must block migration');
      assert.equal(first.tutorialNeeded, false);
      assert.deepEqual(h.engine.state, legacy);
      h.finishBreak();
    } else {
      // Later legacy checkpoints may be parked while successor onboarding runs;
      // they must not be acknowledged or discarded by >=9 migration.
      assert.equal(first.modeId, NEXT);
      assert.deepEqual(h.engines[COUNT].state, legacy);
    }
    assert.equal(h.route().tutorialNeeded, true);
    h = h.reload();
    assert.equal(h.route().modeId, NEXT);
    const parked = h.engines[COUNT].state;
    h.completeTutorial();
    for (let i = 0; i < 2; i += 1) {
      h.reachBreak();
      assert.deepEqual(h.engines[COUNT].state, parked);
      h.finishBreak();
    }
    assert.equal(h.route().modeId, BEFORE);
    assert.equal(h.route().tutorialNeeded, true);
    h.completeTutorial();
    for (let i = 0; i < 2; i += 1) {
      h.reachBreak();
      assert.deepEqual(h.engines[COUNT].state, parked);
      h.finishBreak();
    }
    assert.equal(h.route().modeId, COUNT);
    assert.deepEqual(h.engine.state, parked);
    assert.equal(h.route().tutorialNeeded, false, 'completed counting tutorial replayed');
    if (completed !== 9) {
      assert.equal(h.route().masterState, 'SPARKY_INTERACTION');
      const plan = h.finishBreak();
      assert.equal(plan.checkpointId, completed === 84 ? 'fixed_phase_17' : 'fixed_phase_3');
      assert.equal(h.log.breaks.filter(id => id === plan.id).length, 1);
      assert.equal(h.engines[COUNT].currentQuestion().questionId, completed === 84 ? 'infinite_1' : 'count_015');
    } else {
      assert.equal(h.engine.currentQuestion().questionId, 'count_010');
    }
    assert.deepEqual(h.log.tutorials, [NEXT, BEFORE]);
  });
}

test('legacy acknowledged 9/84 enters successor tutorial without consuming count_010; completed flags never replay', () => {
  const storage = memoryStorage();
  storage.setItem(FLAGS[COUNT], 'true');
  const legacy = solveLegacyTo(storage, 9, true);
  let h = harness(storage);
  assert.equal(h.route().modeId, NEXT);
  assert.equal(h.route().tutorialNeeded, true);
  assert.deepEqual(h.engines[COUNT].state, legacy);
  h.completeTutorial();
  for (let phase = 0; phase < 2; phase += 1) { h.reachBreak(); h.finishBreak(); }
  assert.equal(h.route().modeId, BEFORE);
  assert.deepEqual(h.engines[COUNT].state, legacy);
  h.completeTutorial();
  for (let phase = 0; phase < 2; phase += 1) { h.reachBreak(); h.finishBreak(); }
  for (let phase = 0; phase < 12; phase += 1) {
    h = h.reload();
    assert.equal(h.route().tutorialNeeded, false);
    h.reachBreak(); h.finishBreak();
  }
  assert.deepEqual(h.log.tutorials, [NEXT, BEFORE]);
  assert.equal(storage.getItem(FLAGS[COUNT]), 'true');
  assert.equal(storage.getItem(FLAGS[NEXT]), 'true');
  assert.equal(storage.getItem(FLAGS[BEFORE]), 'true');
});

for (const quota of [1, 2]) {
  test(`real three-engine rotation: deterministic ${quota}-phase runs, bounded fair coverage, no future mode`, () => {
    const random = C.seededRandom(90210);
    let h = harness(undefined, undefined, { random, twoPhaseProbability: quota === 2 ? 1 : 0 });
    onboard(h);
    const visits = Object.fromEntries(IDS.map(id => [id, 0]));
    let previous = null;
    for (let run = 0; run < 90; run += 1) {
      const active = h.route().modeId;
      assert.ok(IDS.includes(active), 'unavailable future mode selected');
      assert.equal(M.registry.find(mode => mode.id === active).playable, true);
      assert.notEqual(active, previous, 'adjacent runs repeated a mode');
      visits[active] += 1;
      assert.ok(Math.max(...Object.values(visits)) - Math.min(...Object.values(visits)) <= 2,
        'fair-bag coverage drifted');
      assert.equal(h.master.state.run.phaseQuota, quota);
      for (let phase = 0; phase < quota; phase += 1) {
        assert.equal(h.route().modeId, active);
        assert.equal(h.route().tutorialNeeded, false);
        assert.equal(h.master.state.run.completedPhases, phase);
        h.reachBreak();
        const pending = h.planBreak();
        assert.equal(pending.nextAction, phase + 1 === quota ? 'switch_mode' : 'continue_mode');
        const saved = h.master.state;
        const engines = IDS.map(id => h.engines[id].state);
        h = h.reload();
        assert.deepEqual(h.master.state, saved);
        assert.deepEqual(IDS.map(id => h.engines[id].state), engines);
        assert.deepEqual(h.planBreak(), pending);
        h.finishBreak();
      }
      assert.notEqual(h.route().modeId, active);
      assert.equal(h.master.state.availableOnboardingComplete, true);
      assert.equal(h.master.state.onboardingComplete, false);
      assert.equal(h.master.state.onboardingDeferred, true);
      previous = active;
    }
    assert.ok(Object.values(visits).every(count => count >= 29));
    assert.deepEqual(h.log.tutorials, IDS);
  });
}

// Original persisted two-mode v1 shape, deliberately independent of v2 output.
// The successor phase-2 commit used to finish available onboarding; v2 must
// preserve that exact decision, then introduce before only at a safe boundary.
function storedTwoModeV1(kind) {
  const nextOpening = kind === 'next-opening';
  const modeId = nextOpening ? NEXT : COUNT;
  const checkpointId = nextOpening ? 'next_fixed_phase_2'
    : kind === 'champion' ? 'fixed_phase_17' : 'fixed_phase_3';
  const phaseId = nextOpening ? 2 : kind === 'champion' ? 17 : 3;
  const previousCountCheckpoint = kind === 'champion' ? 'fixed_phase_16' : 'fixed_phase_2';
  const commit = {
    activeModeId: nextOpening ? COUNT : NEXT, stage: 'available_rotation',
    availableOnboardingComplete: true, onboardingComplete: false, onboardingDeferred: true,
    introductoryPhasesComplete: { [COUNT]: true, [NEXT]: true },
    run: { phaseQuota: 1, completedPhases: 0 }, bag: [modeId]
  };
  return {
    version: 1, activeModeId: modeId, masterState: 'SPARKY_INTERACTION',
    stage: nextOpening ? 'onboarding' : 'available_rotation',
    availableOnboardingComplete: !nextOpening, onboardingComplete: false, onboardingDeferred: !nextOpening,
    tutorials: { [COUNT]: true, [NEXT]: true },
    introductoryPhasesComplete: { [COUNT]: true, [NEXT]: !nextOpening },
    run: { phaseQuota: 2, completedPhases: nextOpening ? 0 : 1 }, bag: nextOpening ? [] : [NEXT],
    pendingBreak: { id: JSON.stringify([modeId, checkpointId]), modeId, checkpointId, phaseId,
      nextModeId: commit.activeModeId, nextAction: 'switch_mode', commit },
    lastCompletedBreakId: JSON.stringify(nextOpening
      ? [NEXT, 'next_fixed_phase_1'] : [COUNT, previousCountCheckpoint]),
    lastCompletedCheckpoints: { [COUNT]: previousCountCheckpoint,
      [NEXT]: nextOpening ? 'next_fixed_phase_1' : 'next_fixed_phase_2' }
  };
}

function legacyStorage(kind) {
  const storage = memoryStorage();
  solveLegacyTo(storage, kind === 'champion' ? 84 : kind === 'next-opening' ? 9 : 14,
    kind === 'next-opening');
  const next = N.createEngine({ storage, random: N.seededRandom(22) });
  while (next.state.completedFixedQuestions < 10) {
    if (next.state.status === 'interaction') assert.equal(next.completeInteraction(), true);
    assert.equal(next.attempt(next.currentQuestion().correctAnswer).correct, true);
    assert.equal(next.finishFeedback(), true);
  }
  if (kind !== 'next-opening') assert.equal(next.completeInteraction(), true);
  B.createEngine({ storage, random: B.seededRandom(44) });
  for (const id of [COUNT, NEXT]) storage.setItem(FLAGS[id], 'true');
  storage.setItem(M.STORAGE_KEY, JSON.stringify(storedTwoModeV1(kind)));
  return storage;
}

function originalRoute(route) {
  const { activeModeId, stage, availableOnboardingComplete, onboardingComplete,
    onboardingDeferred, introductoryPhasesComplete, run, bag } = route;
  return { activeModeId, stage, availableOnboardingComplete, onboardingComplete,
    onboardingDeferred, introductoryPhasesComplete: {
      [COUNT]: introductoryPhasesComplete[COUNT], [NEXT]: introductoryPhasesComplete[NEXT]
    }, run, bag };
}

for (const kind of ['mixed', 'next-opening', 'champion']) {
  for (const afterAck of [false, true]) {
    test(`stored two-mode v1 ${kind}, ${afterAck ? 'after' : 'before'} engine ack: exact migration and safe before introduction`, () => {
      const storage = legacyStorage(kind);
      const original = storedTwoModeV1(kind);
      const keys = [C.STORAGE_KEY, N.STORAGE_KEY, B.STORAGE_KEY, ...Object.values(FLAGS)];
      const bytes = keys.map(key => storage.getItem(key));
      let h = harness(storage, undefined, { random() { throw Error('legacy plan must not reroll'); } });
      assert.equal(h.master.state.version, 2);
      assert.deepEqual(originalRoute(h.master.state), originalRoute(original));
      assert.deepEqual(h.master.state.tutorials, { ...original.tutorials, [BEFORE]: false });
      assert.deepEqual(h.master.state.lastCompletedCheckpoints,
        { ...original.lastCompletedCheckpoints, [BEFORE]: null });
      assert.equal(h.master.state.lastCompletedBreakId, original.lastCompletedBreakId);
      assert.deepEqual(keys.map(key => storage.getItem(key)), bytes, 'migration modified engine/flag bytes');
      const pending = h.master.state.pendingBreak;
      assert.deepEqual({ ...pending, commit: originalRoute(pending.commit) }, original.pendingBreak);
      assert.equal(pending.commit.legacyIntroductionPending, true);
      assert.equal(pending.commit.introductoryPhasesComplete[BEFORE], false);
      if (afterAck) h.acknowledge(pending);
      const snapshots = IDS.map(id => h.engines[id].state);
      h = h.reload();
      assert.deepEqual(h.master.state.pendingBreak, pending);
      assert.deepEqual(IDS.map(id => h.engines[id].state), snapshots);
      if (!afterAck) {
        assert.equal(h.route().modeId, pending.modeId);
        assert.equal(h.route().tutorialNeeded, false);
        assert.deepEqual(h.planBreak(), pending);
        h.acknowledge(pending);
        assert.equal(h.master.completeBreak(pending.id), true);
        assert.deepEqual(originalRoute(h.master.state), original.pendingBreak.commit,
          'commit must honor old chosen route before safe reconcile');
        assert.equal(h.master.state.activeModeId, pending.nextModeId);
      }
      const acked = IDS.map(id => h.engines[id].state);
      const result = h.route(); // post-ack recovery may immediately introduce before
      assert.equal(result.modeId, BEFORE);
      assert.equal(result.tutorialNeeded, true);
      assert.equal(result.stage, 'onboarding');
      assert.equal(h.master.state.pendingBreak, null);
      assert.equal(h.master.state.legacyIntroductionPending, false);
      assert.deepEqual(h.master.state.run, { phaseQuota: 2, completedPhases: 0 });
      assert.equal(h.master.state.lastCompletedBreakId, pending.id);
      assert.equal(h.master.state.lastCompletedCheckpoints[pending.modeId], pending.checkpointId);
      assert.equal(h.master.completeBreak(pending.id), false);
      assert.equal(h.master.planBreak(pending), null);
      assert.equal(h.log.breaks.filter(id => id === pending.id).length, 1);
      assert.deepEqual(IDS.map(id => h.engines[id].state), acked, 'introduction consumed a parked question');
      assert.equal(h.engines[COUNT].currentQuestion().questionId,
        kind === 'champion' ? 'infinite_1' : kind === 'next-opening' ? 'count_010' : 'count_015');
      assert.equal(h.engines[NEXT].currentQuestion().questionId, 'next_011');
      assert.equal(h.engines[BEFORE].currentQuestion().questionId, 'before_001');
      h = h.reload();
      assert.equal(h.route().modeId, BEFORE);
      h.completeTutorial();
      assert.deepEqual(h.log.tutorials, [BEFORE], 'old completed tutorials must not replay');
      assert.deepEqual(IDS.map(id => h.engines[id].state), acked);
    });
  }
}

test('stored two-mode v1 schema is validated before migration; invalid routes/plans cannot erase engine data', () => {
  for (const mutate of [
    state => { state.tutorials[BEFORE] = false; },
    state => { state.bag = [BEFORE]; },
    state => { state.run.completedPhases = state.run.phaseQuota; },
    state => { state.pendingBreak.id = 'forged-checkpoint'; },
    state => { state.pendingBreak.commit.introductoryPhasesComplete[BEFORE] = false; },
    state => { state.pendingBreak.nextModeId = 'color_match'; }
  ]) {
    const storage = legacyStorage('mixed');
    const bad = storedTwoModeV1('mixed'); mutate(bad);
    storage.setItem(M.STORAGE_KEY, JSON.stringify(bad));
    const keys = [C.STORAGE_KEY, N.STORAGE_KEY, B.STORAGE_KEY, ...Object.values(FLAGS)];
    const before = keys.map(key => storage.getItem(key));
    const h = harness(storage);
    assert.deepEqual(h.master.state, M.createController({ storage: null }).state,
      'invalid original v1 schema must reset instead of being augmented');
    assert.deepEqual(keys.map(key => storage.getItem(key)), before);
  }
});