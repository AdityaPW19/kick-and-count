'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const P = require('../game/progression/engine.js');

const EXPECTED_TARGETS = [
  [1, 2, 3, 2], [1, 3, 2, 3, 1], [4, 2, 5, 3, 4], [5, 1, 3, 2, 5],
  [4, 3, 2, 1, 5], [6, 7, 8, 9, 10], [4, 6, 3, 8, 5], [9, 7, 10, 2, 6],
  [1, 8, 10, 9, 7], [11, 12, 13, 14, 15], [8, 9, 10, 11, 12],
  [13, 14, 15, 6, 7], [11, 13, 15, 12, 14], [16, 17, 18, 19, 20],
  [11, 12, 13, 14, 15], [16, 18, 20, 17, 19], [8, 10, 15, 20, 18]
];

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); }
  };
}
function create(options = {}) {
  return P.createEngine({ storage: null, random: P.seededRandom(12345), ...options });
}
function wrongAnswer(engine) {
  const question = engine.currentQuestion();
  return question.options.find(value => value !== question.correctAnswer);
}
function solve(engine) {
  assert.equal(engine.attempt(engine.currentQuestion().correctAnswer).correct, true);
  assert.equal(engine.finishFeedback(), true);
}
function reachQuestion(engine, id) {
  while (engine.state.completedFixedQuestions < id - 1) {
    if (engine.state.status === 'interaction') engine.completeInteraction();
    solve(engine);
  }
  if (engine.state.status === 'interaction') engine.completeInteraction();
  assert.equal(engine.currentQuestion().questionId, `count_${String(id).padStart(3, '0')}`);
}
function reachInfinite(engine) {
  reachQuestion(engine, 84);
  solve(engine);
  assert.equal(engine.state.status, 'celebration');
  engine.completeCelebration();
  return engine;
}
function validateQuestion(question) {
  assert.ok(question);
  assert.ok(Number.isInteger(question.targetCount));
  assert.ok(question.targetCount >= 1 && question.targetCount <= 20);
  assert.equal(question.displayBallCount, question.targetCount);
  assert.equal(question.correctAnswer, question.targetCount);
  assert.ok(question.options.length >= 3 && question.options.length <= 6);
  assert.equal(new Set(question.options).size, question.options.length);
  assert.ok(question.options.every(value => Number.isInteger(value) && value >= 1 && value <= 20));
  assert.equal(question.options.filter(value => value === question.correctAnswer).length, 1);
  assert.equal(question.options[question.correctOptionIndex], question.correctAnswer);
}

test('84 exact targets, 17 data-driven phases, option counts, and 16 normal checkpoints', () => {
  assert.equal(P.phases.length, 17);
  assert.equal(P.fixedQuestions.length, 84);
  assert.deepEqual(P.fixedQuestions.map(question => question.targetCount), EXPECTED_TARGETS.flat());
  let cursor = 1;
  for (const [index, phase] of P.phases.entries()) {
    assert.equal(phase.phaseId, index + 1);
    assert.equal(phase.mode, 'counting');
    assert.equal(phase.startQuestion, cursor);
    assert.equal(phase.endQuestion - phase.startQuestion + 1, index === 0 ? 4 : 5);
    assert.deepEqual(phase.targetNumbers, EXPECTED_TARGETS[index]);
    assert.equal(phase.onComplete.resumePhase, phase.phaseId + 1);
    assert.equal(phase.onComplete.event, index === 16
      ? 'COUNTING_JOURNEY_COMPLETE' : 'SPARKY_INTERACTION_START');
    for (const [offset, count] of phase.optionCounts.entries()) {
      const id = cursor + offset;
      assert.equal(count, id <= 17 ? 3 : id <= 49 ? 4 : id <= 74 ? 5 : 6);
    }
    cursor = phase.endQuestion + 1;
  }
  assert.equal(cursor, 85);
  assert.equal(P.phases.filter(phase => phase.onComplete.event === P.EVENTS.INTERACTION_START).length, 16);
  P.fixedQuestions.forEach((question, index) => {
    validateQuestion(question);
    assert.equal(question.questionId, `count_${String(index + 1).padStart(3, '0')}`);
    const phase = P.phases.find(value => index + 1 <= value.endQuestion);
    assert.equal(question.phaseId, phase.phaseId);
    assert.equal(question.options.length, phase.optionCounts[index + 1 - phase.startQuestion]);
  });
});

test('fixed questions are deterministic, immutable, and independent of runtime RNG', () => {
  assert.deepEqual(P.generateFixedQuestions(), P.fixedQuestions);
  assert.deepEqual(create({ random: () => 0 }).currentQuestion(), create({ random: () => 0.999 }).currentQuestion());
  assert.throws(() => { P.fixedQuestions[0].options[0] = 21; }, TypeError);
  assert.throws(() => { P.phases[0].targetNumbers.push(4); }, TypeError);
  assert.ok(P.fixedQuestions.slice(0, 9).some(question => question.options.some(value => value > 3)),
    'early distractors are not restricted to the phase target range');
});

test('single script exposes browser global without CommonJS, DOM, timers, or other modules', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../game/progression/engine.js'), 'utf8'), context);
  assert.equal(typeof context.SparkyProgression.createEngine, 'function');
  const engine = context.SparkyProgression.createEngine({ storage: null });
  assert.equal(engine.currentQuestion().questionId, 'count_001');
  assert.equal(engine.attempt(1).correct, true);
  assert.equal(engine.state.completedFixedQuestions, 0);
  assert.equal(engine.finishFeedback(), true);
  assert.equal(engine.state.completedFixedQuestions, 1);
});

test('attempts never advance; invalid options, retries, feedback gating, and snapshots', () => {
  const engine = create();
  const events = [];
  engine.subscribe(event => events.push(event));
  const initial = engine.state;
  const question = engine.currentQuestion();
  for (const value of [0, 21, '1', NaN, undefined]) {
    assert.deepEqual(engine.attempt(value), { accepted: false, correct: false, reason: 'invalid_option' });
  }
  assert.equal(engine.state.questionAttempts, 0);
  assert.equal(engine.finishFeedback(), false);
  for (let index = 0; index < 3; index += 1) {
    assert.equal(engine.attempt(wrongAnswer(engine)).correct, false);
    assert.equal(engine.state.completedFixedQuestions, 0);
    assert.deepEqual(engine.currentQuestion(), question);
  }
  assert.equal(engine.attempt(question.correctAnswer).correct, true);
  assert.equal(engine.state.status, 'feedback');
  assert.equal(engine.state.completedFixedQuestions, 0);
  assert.equal(engine.state.questionAttempts, 4);
  assert.equal(engine.attempt(question.correctAnswer).accepted, false);
  assert.equal(engine.completeInteraction(), false);
  assert.equal(engine.completeCelebration(), false);
  assert.equal(engine.finishFeedback(), true);
  assert.equal(engine.finishFeedback(), false);
  assert.equal(engine.state.completedFixedQuestions, 1);
  assert.deepEqual(engine.state.recentPerformance, [false]);
  assert.equal(initial.completedFixedQuestions, 0);
  assert.equal(initial.questionAttempts, 0);
  assert.throws(() => { initial.currentQuestion.options.push(9); }, TypeError);
  assert.equal(events.length, 0);
});

test('all 16 breaks fire only after feedback; q84 celebrates instead of a normal break', () => {
  const engine = create();
  const events = [];
  engine.subscribe(event => events.push(event));
  for (let id = 1; id <= 84; id += 1) {
    const question = engine.currentQuestion();
    assert.equal(question.questionId, P.fixedQuestions[id - 1].questionId);
    const before = events.length;
    engine.attempt(wrongAnswer(engine));
    assert.equal(engine.state.completedFixedQuestions, id - 1);
    assert.equal(engine.finishFeedback(), false);
    engine.attempt(question.correctAnswer);
    assert.equal(engine.state.completedFixedQuestions, id - 1);
    assert.equal(events.length, before, 'no event during goal animation');
    engine.finishFeedback();
    assert.equal(engine.state.completedFixedQuestions, id);
    const phase = P.phases[question.phaseId - 1];
    if (id === 84) {
      assert.equal(events.at(-1).type, P.EVENTS.JOURNEY_COMPLETE);
      assert.equal(engine.state.status, 'celebration');
      assert.equal(engine.state.journeyComplete, true);
      assert.equal(engine.state.celebrationPending, true);
      assert.equal(engine.currentQuestion(), null);
      assert.equal(engine.completeInteraction(), false);
      assert.equal(engine.attempt(18).accepted, false);
      assert.equal(engine.finishFeedback(), false);
      assert.equal(events.length, before + 1);
    } else if (id === phase.endQuestion) {
      const checkpoint = `fixed_phase_${phase.phaseId}`;
      assert.equal(events.at(-1).type, P.EVENTS.INTERACTION_START);
      assert.equal(events.at(-1).interaction.checkpointId, checkpoint);
      assert.equal(events.at(-1).state.status, 'interaction');
      assert.equal(engine.currentQuestion(), null);
      assert.equal(engine.attempt(question.correctAnswer).accepted, false);
      assert.equal(engine.finishFeedback(), false);
      assert.equal(engine.completeInteraction('stale-checkpoint'), false);
      assert.equal(engine.completeInteraction(checkpoint), true);
      assert.equal(engine.completeInteraction(checkpoint), false);
      assert.equal(engine.state.lastCompletedInteractionCheckpoint, checkpoint);
      assert.equal(engine.state.phaseId, phase.phaseId + 1);
      assert.equal(events.at(-1).type, P.EVENTS.INTERACTION_COMPLETE);
      assert.equal(engine.state.completedFixedQuestions, id);
      assert.equal(events.length, before + 2);
    } else assert.equal(events.length, before);
  }
  assert.equal(events.filter(event => event.type === P.EVENTS.INTERACTION_START).length, 16);
  assert.equal(events.filter(event => event.type === P.EVENTS.INTERACTION_COMPLETE).length, 16);
  assert.equal(events.filter(event => event.type === P.EVENTS.JOURNEY_COMPLETE).length, 1);
  assert.equal(events.filter(event => event.type === P.EVENTS.INFINITE_START).length, 0);
  assert.equal(engine.completeCelebration(), true);
  assert.equal(engine.completeCelebration(), false);
  assert.equal(events.at(-1).type, P.EVENTS.INFINITE_START);
  assert.equal(engine.state.phaseId, 18);
  assert.equal(engine.state.infiniteCompletedSinceInteraction, 0);
  assert.equal(engine.state.completedInfiniteQuestions, 0);
  assert.equal(engine.currentQuestion().questionId, 'infinite_1');
});

test('pending fixed break persists, replay can be opted out, and stale completions cannot skip breaks', () => {
  const storage = memoryStorage();
  let engine = create({ storage });
  reachQuestion(engine, 4);
  solve(engine);
  const pending = engine.state;
  engine = create({ storage, random: () => { throw new Error('must not generate'); } });
  assert.deepEqual(engine.state, pending);
  assert.equal(engine.currentQuestion(), null);
  let replay;
  const unsubscribe = engine.subscribe(event => { replay = event; });
  assert.equal(replay.type, P.EVENTS.INTERACTION_START);
  assert.equal(replay.replayed, true);
  assert.equal(replay.interaction.checkpointId, 'fixed_phase_1');
  unsubscribe();
  let count = 0;
  engine.subscribe(() => { count += 1; }, { replay: false });
  assert.equal(count, 0);
  assert.equal(engine.completeInteraction('fixed_phase_1'), true);
  assert.equal(count, 1);
  assert.equal(engine.currentQuestion().questionId, 'count_005');
  engine = create({ storage });
  assert.equal(engine.currentQuestion().questionId, 'count_005');
  assert.equal(engine.completeInteraction(), false);
  reachQuestion(engine, 9);
  solve(engine);
  assert.equal(engine.completeInteraction('fixed_phase_1'), false);
  assert.equal(engine.completeInteraction('fixed_phase_2'), true);
});

test('pending celebration restores until explicitly completed; later sessions stay infinite', () => {
  const storage = memoryStorage();
  let engine = create({ storage });
  reachQuestion(engine, 84);
  solve(engine);
  engine = create({ storage, random: () => { throw new Error('celebration must not generate'); } });
  assert.equal(engine.state.status, 'celebration');
  const events = [];
  engine.subscribe(event => events.push(event));
  assert.equal(events[0].type, P.EVENTS.JOURNEY_COMPLETE);
  assert.equal(events[0].replayed, true);
  // Reopen with an available RNG for the actual mode transition.
  engine = create({ storage });
  engine.subscribe(event => events.push(event), { replay: false });
  assert.equal(engine.completeCelebration(), true);
  assert.equal(events.at(-1).type, P.EVENTS.INFINITE_START);
  const saved = engine.state;
  engine = create({ storage, random: () => { throw new Error('active question must not reroll'); } });
  assert.deepEqual(engine.state, saved);
  let replays = 0;
  engine.subscribe(() => { replays += 1; });
  assert.equal(replays, 0);
  assert.equal(engine.completeCelebration(), false);
});

test('fixed and infinite wrong attempts survive reload without reroll or counter changes', () => {
  const storage = memoryStorage();
  let engine = create({ storage });
  engine.attempt(wrongAnswer(engine));
  engine.attempt(wrongAnswer(engine));
  let saved = engine.state;
  engine = create({ storage });
  assert.deepEqual(engine.state, saved);
  solve(engine);
  assert.deepEqual(engine.state.recentPerformance, [false]);
  reachInfinite(engine);
  for (let index = 0; index < 3; index += 1) solve(engine);
  engine.attempt(wrongAnswer(engine));
  saved = engine.state;
  engine = create({ storage, random: () => { throw new Error('unexpected reroll'); } });
  assert.deepEqual(engine.state, saved);
  assert.equal(engine.state.completedInfiniteQuestions, 3);
  assert.equal(engine.state.infiniteCompletedSinceInteraction, 3);
  assert.equal(engine.state.questionAttempts, 1);
  assert.equal(engine.currentQuestion().questionId, 'infinite_4');
});

test('interrupted fixed feedback commits once on reopen, including phase end and q84', () => {
  for (const id of [1, 4, 9, 79, 84]) {
    const storage = memoryStorage();
    let engine = create({ storage });
    reachQuestion(engine, id);
    engine.attempt(wrongAnswer(engine));
    engine.attempt(engine.currentQuestion().correctAnswer);
    assert.equal(engine.state.status, 'feedback');
    assert.equal(engine.state.completedFixedQuestions, id - 1);
    engine = create({ storage });
    assert.equal(engine.state.completedFixedQuestions, id);
    assert.equal(engine.state.recentPerformance.at(-1), false);
    assert.equal(engine.finishFeedback(), false);
    const saved = engine.state;
    engine = create({ storage });
    assert.deepEqual(engine.state, saved);
    if (id === 84) assert.equal(engine.state.status, 'celebration');
    else if (id !== 1) assert.equal(engine.state.status, 'interaction');
    else assert.equal(engine.currentQuestion().questionId, 'count_002');
  }
});

test('interrupted infinite feedback and its fifth-success break restore exactly once', () => {
  const storage = memoryStorage();
  let engine = reachInfinite(create({ storage }));
  engine.attempt(engine.currentQuestion().correctAnswer);
  engine = create({ storage });
  assert.equal(engine.state.completedInfiniteQuestions, 1);
  assert.equal(engine.currentQuestion().questionId, 'infinite_2');
  for (let index = 0; index < 3; index += 1) solve(engine);
  engine.attempt(engine.currentQuestion().correctAnswer);
  engine = create({ storage, random: () => { throw new Error('break must not generate'); } });
  assert.equal(engine.state.completedInfiniteQuestions, 5);
  assert.equal(engine.state.infiniteCompletedSinceInteraction, 5);
  assert.equal(engine.state.infiniteDifficulty, 2);
  assert.equal(engine.state.status, 'interaction');
  assert.equal(engine.currentQuestion(), null);
  const saved = engine.state;
  engine = create({ storage });
  assert.deepEqual(engine.state, saved);
  assert.equal(engine.attempt(1).accepted, false);
  assert.equal(engine.finishFeedback(), false);
  assert.equal(engine.state.infiniteCompletedSinceInteraction, 5);
  const events = [];
  engine.subscribe(event => events.push(event));
  assert.equal(events[0].interaction.checkpointId, 'infinite_5');
  assert.equal(engine.completeInteraction('infinite_5'), true);
  assert.equal(engine.state.infiniteCompletedSinceInteraction, 0);
  assert.equal(engine.state.completedInfiniteQuestions, 5);
  assert.equal(engine.currentQuestion().questionId, 'infinite_6');
  assert.equal(engine.completeInteraction('infinite_5'), false);
  engine = create({ storage });
  assert.equal(engine.state.infiniteCompletedSinceInteraction, 0);
  assert.equal(engine.state.lastCompletedInteractionCheckpoint, 'infinite_5');
});

test('adaptive controller uses first-attempt window5, gradual changes, holds mostly-correct', () => {
  assert.equal(P.adaptDifficulty(2, [true, true, true, true]), 2);
  assert.equal(P.adaptDifficulty(2, [true, true, true, true, true]), 3);
  assert.equal(P.adaptDifficulty(2, [false, true, true, true, true]), 2);
  assert.equal(P.adaptDifficulty(2, [false, false, true, true, true]), 2);
  assert.equal(P.adaptDifficulty(2, [false, false, false, true, true]), 1);
  assert.equal(P.adaptDifficulty(4, [true, true, true, true, true]), 4);
  assert.equal(P.adaptDifficulty(1, [false, false, false, false, false]), 1);
  const engine = reachInfinite(create());
  for (let group = 0; group < 5; group += 1) {
    const before = engine.state.infiniteDifficulty;
    for (let index = 0; index < 5; index += 1) {
      if (group === 2 && index === 0) engine.attempt(wrongAnswer(engine));
      if (group >= 3) engine.attempt(wrongAnswer(engine));
      solve(engine);
      if (index < 4) assert.equal(engine.state.infiniteDifficulty, before);
    }
    const expected = [2, 3, 3, 2, 1][group];
    assert.equal(engine.state.infiniteDifficulty, expected);
    assert.equal(engine.state.recentPerformance.length, 5);
    engine.completeInteraction();
    assert.equal(engine.currentQuestion().options.length, expected + 2);
  }
});

test('10,000 infinite engine questions: valid, adaptive, no adjacency/recent duplicates, 2,000 breaks', () => {
  const engine = reachInfinite(create());
  const events = [];
  engine.subscribe(event => events.push(event));
  const recent = [];
  const seenTargets = new Set();
  const seenDifficulties = new Set();
  let previousTarget;
  for (let index = 1; index <= 10000; index += 1) {
    const question = engine.currentQuestion();
    validateQuestion(question);
    assert.equal(question.questionId, `infinite_${index}`);
    assert.equal(question.phaseId, 18);
    assert.notEqual(question.targetCount, previousTarget);
    const key = P.configurationKey(question);
    assert.ok(!recent.includes(key), `recent configuration repeated at ${index}`);
    recent.push(key);
    if (recent.length > P.HISTORY_LIMIT) recent.shift();
    previousTarget = question.targetCount;
    seenTargets.add(question.targetCount);
    seenDifficulties.add(question.difficulty);
    const before = engine.state.infiniteCompletedSinceInteraction;
    // Alternate sustained success/error blocks to exercise all four levels.
    if (Math.floor((index - 1) / 25) % 2 === 1) {
      engine.attempt(wrongAnswer(engine));
      engine.attempt(wrongAnswer(engine));
      assert.equal(engine.state.infiniteCompletedSinceInteraction, before);
      assert.equal(engine.state.completedInfiniteQuestions, index - 1);
      assert.equal(engine.finishFeedback(), false);
    }
    engine.attempt(question.correctAnswer);
    assert.equal(engine.state.completedInfiniteQuestions, index - 1);
    assert.equal(engine.state.infiniteCompletedSinceInteraction, before);
    const eventCount = events.length;
    engine.finishFeedback();
    assert.equal(engine.state.completedInfiniteQuestions, index);
    if (index % 5 === 0) {
      assert.equal(engine.state.status, 'interaction');
      assert.equal(engine.state.infiniteCompletedSinceInteraction, 5);
      assert.equal(engine.currentQuestion(), null);
      assert.equal(events.length, eventCount + 1);
      assert.equal(events.at(-1).type, P.EVENTS.INTERACTION_START);
      engine.completeInteraction();
      assert.equal(events.at(-1).type, P.EVENTS.INTERACTION_COMPLETE);
      assert.equal(engine.state.infiniteCompletedSinceInteraction, 0);
    } else {
      assert.equal(engine.state.status, 'question');
      assert.equal(engine.state.infiniteCompletedSinceInteraction, index % 5);
      assert.equal(events.length, eventCount);
    }
    assert.ok(engine.state.recentPerformance.length <= 5);
    assert.ok(engine.state.recentGeneratedQuestions.length <= P.HISTORY_LIMIT);
  }
  assert.equal(seenTargets.size, 20);
  assert.equal(seenDifficulties.size, 4);
  assert.equal(events.filter(event => event.type === P.EVENTS.INTERACTION_START).length, 2000);
  assert.equal(events.filter(event => event.type === P.EVENTS.INTERACTION_COMPLETE).length, 2000);
  assert.equal(engine.state.completedFixedQuestions, 84);
});

test('constant RNG still guarantees no adjacent target or recent exact configuration', () => {
  for (const constant of [0, 0.5, 0.999999]) {
    const recent = [];
    for (let sequence = 1; sequence <= 300; sequence += 1) {
      const question = P.generateInfiniteQuestion({
        sequence, difficulty: 1, recentQuestions: recent, random: () => constant
      });
      validateQuestion(question);
      assert.notEqual(question.targetCount, recent.at(-1)?.targetCount);
      assert.ok(!recent.some(previous => P.configurationKey(previous) === P.configurationKey(question)));
      recent.push(question);
      if (recent.length > P.HISTORY_LIMIT) recent.shift();
    }
  }
});

test('difficulty weights target selection and distractor similarity, with full 1..20 domain', () => {
  const averages = [];
  for (const difficulty of [1, 4]) {
    const random = P.seededRandom(4477);
    let targetSum = 0;
    let distanceSum = 0;
    let distractorCount = 0;
    const targets = new Set();
    let recent = [];
    for (let sequence = 1; sequence <= 3000; sequence += 1) {
      const question = P.generateInfiniteQuestion({ sequence, difficulty, recentQuestions: recent, random });
      targetSum += question.targetCount;
      targets.add(question.targetCount);
      for (const value of question.options.filter(value => value !== question.targetCount)) {
        distanceSum += Math.abs(value - question.targetCount);
        distractorCount += 1;
      }
      recent = [...recent, question].slice(-20);
    }
    assert.equal(targets.size, 20);
    averages.push({ target: targetSum / 3000, distance: distanceSum / distractorCount });
  }
  assert.ok(averages[1].target > averages[0].target + 2);
  assert.ok(averages[0].distance > averages[1].distance + 3);
});

test('recent infinite history, adaptation counters, and active configuration survive repeated reopenings', () => {
  const storage = memoryStorage();
  let engine = reachInfinite(create({ storage }));
  let previousTarget;
  const recent = [];
  for (let index = 1; index <= 100; index += 1) {
    const question = engine.currentQuestion();
    assert.notEqual(question.targetCount, previousTarget);
    const key = P.configurationKey(question);
    assert.ok(!recent.includes(key));
    previousTarget = question.targetCount;
    recent.push(key);
    if (recent.length > 20) recent.shift();
    engine.attempt(wrongAnswer(engine));
    const saved = engine.state;
    engine = create({ storage });
    assert.deepEqual(engine.state, saved);
    solve(engine);
    if (engine.state.status === 'interaction') {
      const pending = engine.state;
      engine = create({ storage });
      assert.deepEqual(engine.state, pending);
      engine.completeInteraction();
    }
    const savedAfter = engine.state;
    engine = create({ storage });
    assert.deepEqual(engine.state, savedAfter);
  }
});

test('events persist before delivery, unsubscribe, immutable payloads, and reentrant completion', () => {
  const storage = memoryStorage();
  const engine = create({ storage });
  reachQuestion(engine, 4);
  const events = [];
  const unsubscribe = engine.subscribe(() => { throw new Error('unsubscribed'); });
  unsubscribe();
  engine.subscribe(event => {
    events.push(event);
    assert.equal(JSON.parse(storage.getItem(P.STORAGE_KEY)).status, event.state.status);
    assert.throws(() => { event.type = 'OTHER'; }, TypeError);
    if (event.type === P.EVENTS.INTERACTION_START) engine.completeInteraction(event.interaction.checkpointId);
  });
  const secondListener = [];
  engine.subscribe(event => secondListener.push(event.type));
  solve(engine);
  assert.deepEqual(events.map(event => event.type), [P.EVENTS.INTERACTION_START, P.EVENTS.INTERACTION_COMPLETE]);
  assert.deepEqual(secondListener, [P.EVENTS.INTERACTION_START, P.EVENTS.INTERACTION_COMPLETE]);
  assert.equal(engine.currentQuestion().questionId, 'count_005');
});

test('listener errors do not strand progress or prevent other listeners from receiving checkpoints', () => {
  const engine = create();
  reachQuestion(engine, 4);
  const unsubscribe = engine.subscribe(() => { throw new Error('integration failed'); });
  let received = 0;
  engine.subscribe(() => { received += 1; });
  engine.attempt(engine.currentQuestion().correctAnswer);
  assert.throws(() => engine.finishFeedback(), /integration failed/);
  assert.equal(received, 1);
  assert.equal(engine.state.completedFixedQuestions, 4);
  assert.equal(engine.state.status, 'interaction');
  assert.equal(engine.finishFeedback(), false);
  unsubscribe();
  assert.equal(engine.completeInteraction(), true);
  assert.equal(engine.currentQuestion().questionId, 'count_005');
});

test('malformed/incompatible saves reset safely; storage failures and invalid inputs are explicit', () => {
  const storage = memoryStorage();
  for (const raw of ['not-json', 'null', '{}', '{"version":999}', JSON.stringify({ ...create().state, questionAttempts: -1 })]) {
    storage.setItem(P.STORAGE_KEY, raw);
    assert.equal(create({ storage }).currentQuestion().questionId, 'count_001');
  }
  assert.throws(() => create({ storage: {} }), /getItem\/setItem/);
  assert.throws(() => create({ random: 7 }), /random must/);
  assert.throws(() => create().subscribe(null), /listener must/);
  assert.throws(() => create({ storage: {
    getItem() { return null; }, setItem() { throw new Error('quota'); }
  } }), /quota/);
  assert.throws(() => P.generateOptions(21, 3, 1, Math.random), RangeError);
  assert.throws(() => P.generateOptions(1, 7, 1, Math.random), RangeError);
  assert.throws(() => P.generateInfiniteQuestion({ sequence: 1, difficulty: 5 }), RangeError);
  for (const value of [-1, 1, NaN, Infinity]) {
    assert.throws(() => P.generateInfiniteQuestion({ sequence: 1, difficulty: 1, random: () => value }), RangeError);
  }
});