'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const P = require('../game/progression/next-engine.js');

const EXPECTED_STARTERS = [
  [1, 2, 3, 4, 5], [3, 6, 4, 7, 8], [5, 7, 8, 9, 2], [9, 4, 6, 8, 9],
  [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [9, 19, 10, 14, 18], [12, 16, 19, 7, 15],
  [20, 21, 24, 27, 29], [22, 25, 28, 29, 30], [31, 34, 37, 39, 40], [42, 45, 48, 49, 35],
  [40, 49, 50, 54, 59], [51, 56, 59, 60, 64], [65, 67, 69, 70, 72], [58, 63, 68, 74, 59],
  [75, 78, 79, 80, 84], [85, 87, 89, 90, 94], [95, 96, 97, 98, 89], [9, 19, 49, 79, 98]
];
const EXPECTED_COUNTS = [
  [3, 3, 3, 3, 3], [3, 3, 3, 3, 3], [3, 3, 3, 3, 3], [3, 3, 3, 4, 4],
  [4, 4, 4, 4, 4], [4, 4, 4, 4, 4], [4, 4, 4, 4, 4], [4, 4, 4, 4, 4],
  [4, 4, 4, 4, 4], [4, 4, 4, 5, 5], [5, 5, 5, 5, 5], [5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5], [5, 5, 5, 5, 5], [5, 5, 5, 5, 5], [5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5], [5, 5, 5, 6, 6], [6, 6, 6, 6, 6], [6, 6, 6, 6, 6]
];
function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); }
  };
}
function create(options = {}) { return P.createEngine({ storage: null, random: P.seededRandom(12345), ...options }); }
function wrong(engine) { const q = engine.currentQuestion(); return q.options.find(value => value !== q.correctAnswer); }
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
  assert.equal(engine.currentQuestion().questionId, `next_${String(id).padStart(3, '0')}`);
  return engine;
}
function reachInfinite(engine) {
  reachQuestion(engine, 100);
  solve(engine);
  assert.equal(engine.state.status, 'interaction');
  assert.equal(engine.state.mode, 'fixed');
  assert.equal(engine.completeInteraction('next_fixed_phase_20'), true);
  assert.equal(engine.state.mode, 'infinite');
  return engine;
}
function validate(question) {
  assert.ok(question);
  assert.equal(question.modeId, 'what_comes_next');
  assert.ok(Number.isInteger(question.displayedNumber) && question.displayedNumber >= 1 && question.displayedNumber <= 98);
  assert.equal(question.correctAnswer, question.displayedNumber + 1);
  assert.ok(question.optionCount >= 3 && question.optionCount <= 6);
  assert.equal(question.options.length, question.optionCount);
  assert.equal(new Set(question.options).size, question.optionCount);
  assert.ok(question.options.every(value => Number.isInteger(value) && value >= 1 && value <= 99));
  assert.equal(question.options.filter(value => value === question.correctAnswer).length, 1);
  assert.equal(question.options[question.correctOptionIndex], question.correctAnswer);
  assert.ok(Number.isInteger(question.difficulty) && question.difficulty >= 1 && question.difficulty <= 4);
}
function deepClone(value) { return JSON.parse(JSON.stringify(value)); }

test('exact 100 successors, 20 five-question phases, variable choice counts, and shared checkpoints', () => {
  assert.equal(P.MODE_ID, 'what_comes_next');
  assert.equal(P.TOTAL_FIXED_QUESTIONS, 100);
  assert.equal(P.phases.length, 20);
  assert.equal(P.fixedQuestions.length, 100);
  assert.deepEqual(P.fixedQuestions.map(q => q.displayedNumber), EXPECTED_STARTERS.flat());
  assert.deepEqual(P.fixedQuestions.map(q => q.optionCount), EXPECTED_COUNTS.flat());
  for (const [index, phase] of P.phases.entries()) {
    assert.equal(phase.modeId, P.MODE_ID);
    assert.equal(phase.phaseId, index + 1);
    assert.equal(phase.startQuestion, index * 5 + 1);
    assert.equal(phase.endQuestion, index * 5 + 5);
    assert.deepEqual(phase.startingNumbers, EXPECTED_STARTERS[index]);
    assert.deepEqual(phase.optionCounts, EXPECTED_COUNTS[index]);
    assert.deepEqual(phase.onComplete, { event: P.EVENTS.INTERACTION_START, resumePhase: index + 2 });
    assert.equal(typeof phase.difficulty, 'string');
    for (let offset = 0; offset < 5; offset += 1) {
      const id = index * 5 + offset + 1;
      const q = P.fixedQuestions[id - 1];
      validate(q);
      assert.equal(q.phaseId, index + 1);
      assert.equal(q.questionId, `next_${String(id).padStart(3, '0')}`);
      assert.equal(q.difficulty, phase.difficultyLevel);
      assert.notEqual(q.isTutorial, true);
    }
  }
});

test('fixed configuration reproducibility, position variety, near/far balance, and immutability', () => {
  assert.deepEqual(P.generateFixedQuestions(), P.fixedQuestions);
  assert.deepEqual(create({ random: () => 0 }).state, create({ random: () => { throw Error('unused'); } }).state);
  assert.throws(() => { P.fixedQuestions[0].options[0] = 100; }, TypeError);
  assert.throws(() => { P.phases[0].startingNumbers.push(99); }, TypeError);
  const byCount = new Map();
  for (const q of P.fixedQuestions) {
    if (!byCount.has(q.optionCount)) byCount.set(q.optionCount, new Set());
    byCount.get(q.optionCount).add(q.correctOptionIndex);
    assert.ok(q.options.some(value => Math.abs(value - q.correctAnswer) >= Math.max(4, q.optionCount)));
    if (q.difficulty >= 2) assert.ok(q.options.some(value => value !== q.correctAnswer && Math.abs(value - q.correctAnswer) <= 3));
  }
  for (const [count, positions] of byCount) {
    assert.ok(positions.size >= Math.min(3, count), `too few answer positions with ${count} choices`);
  }
  assert.ok(P.fixedQuestions.some(q => q.correctAnswer !== Math.min(...q.options) && q.correctAnswer !== Math.max(...q.options)));
});

test('standalone browser global has no DOM, counting, tutorial, storage, or scheduler dependency', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../game/progression/next-engine.js'), 'utf8'), context);
  assert.equal(typeof context.SparkyNextProgression.createEngine, 'function');
  assert.equal(context.SparkyProgression, undefined);
  assert.equal(context.SparkyNextTutorial, undefined);
  const engine = context.SparkyNextProgression.createEngine();
  assert.equal(engine.currentQuestion().questionId, 'next_001');
  assert.equal(engine.attempt(2).correct, true);
  assert.equal(engine.state.completedFixedQuestions, 0);
  engine.finishFeedback();
  assert.equal(engine.state.completedFixedQuestions, 1);
  assert.equal(engine.completeCelebration, undefined);
  assert.equal(engine.state.celebrationPending, undefined);
});

test('wrong answers/invalid values never advance; correct answers lock until feedback presentation ends', () => {
  const engine = create();
  const before = engine.state;
  assert.equal(before.total100, 100);
  assert.equal(engine.finishFeedback(), false);
  for (const value of [0, 100, '2', null, undefined, NaN, 2.5]) {
    assert.deepEqual(engine.attempt(value), { accepted: false, correct: false, reason: 'invalid_option' });
  }
  assert.equal(engine.state.questionAttempts, 0);
  for (let i = 0; i < 3; i += 1) {
    assert.equal(engine.attempt(wrong(engine)).correct, false);
    assert.equal(engine.finishFeedback(), false);
    assert.equal(engine.state.completedFixedQuestions, 0);
    assert.deepEqual(engine.currentQuestion(), before.currentQuestion);
  }
  const success = engine.attempt(engine.currentQuestion().correctAnswer);
  assert.equal(success.accepted, true);
  assert.equal(success.correct, true);
  assert.equal(success.attempts, 4);
  assert.equal(engine.state.status, 'feedback');
  assert.equal(engine.state.completedFixedQuestions, 0);
  assert.equal(engine.attempt(2).reason, 'not_answering');
  assert.equal(engine.completeInteraction(), false);
  assert.equal(engine.finishFeedback(), true);
  assert.equal(engine.finishFeedback(), false);
  assert.equal(engine.state.completedFixedQuestions, 1);
  assert.deepEqual(engine.state.recentPerformance, [false]);
  assert.equal(before.questionAttempts, 0);
  assert.throws(() => { before.currentQuestion.options.push(22); }, TypeError);
});

test('all 20 fixed breaks including phase20 are external, gated, unique and mode-tagged', () => {
  const engine = create();
  const events = [];
  engine.subscribe(event => events.push(event));
  const checkpoints = new Set();
  for (let id = 1; id <= 100; id += 1) {
    assert.deepEqual(engine.currentQuestion(), P.fixedQuestions[id - 1]);
    const oldEvents = events.length;
    engine.attempt(wrong(engine));
    assert.equal(engine.finishFeedback(), false);
    engine.attempt(engine.currentQuestion().correctAnswer);
    assert.equal(events.length, oldEvents);
    assert.equal(engine.state.completedFixedQuestions, id - 1);
    assert.equal(engine.state.status, 'feedback');
    engine.finishFeedback();
    assert.equal(engine.state.completedFixedQuestions, id);
    if (id % 5 !== 0) {
      assert.equal(events.length, oldEvents);
      continue;
    }
    const checkpointId = `next_fixed_phase_${id / 5}`;
    checkpoints.add(checkpointId);
    const pending = engine.state;
    assert.equal(pending.status, 'interaction');
    assert.equal(pending.mode, 'fixed');
    assert.equal(pending.phaseId, id / 5);
    assert.equal(pending.pendingInteraction.checkpointId, checkpointId);
    assert.equal(pending.pendingInteraction.modeId, P.MODE_ID);
    assert.equal(pending.pendingInteraction.resumePhase, id / 5 + 1);
    assert.equal(engine.currentQuestion(), null);
    assert.equal(engine.attempt(2).accepted, false);
    assert.equal(engine.finishFeedback(), false);
    assert.equal(engine.completeInteraction('wrong_checkpoint'), false);
    assert.deepEqual(engine.state, pending);
    assert.equal(events.length, oldEvents + 1);
    assert.equal(events.at(-1).type, P.EVENTS.INTERACTION_START);
    assert.equal(events.at(-1).modeId, P.MODE_ID);
    assert.equal(engine.completeInteraction(checkpointId), true);
    assert.equal(engine.completeInteraction(checkpointId), false);
    assert.equal(engine.state.lastCompletedInteractionCheckpoint, checkpointId);
    assert.equal(engine.state.phaseId, id / 5 + 1);
  }
  assert.equal(checkpoints.size, 20);
  assert.equal(events.filter(e => e.type === P.EVENTS.INTERACTION_START).length, 20);
  assert.equal(events.filter(e => e.type === P.EVENTS.INTERACTION_COMPLETE).length, 20);
  assert.equal(events.filter(e => e.type === P.EVENTS.INFINITE_START).length, 1);
  assert.equal(engine.state.mode, 'infinite');
  assert.equal(engine.state.completedInfiniteQuestions, 0);
  assert.equal(engine.currentQuestion().questionId, 'next_infinite_1');
  assert.deepEqual(engine.state.recentPerformance, []);
});

test('fixed exact questions, wrong retries, mode-switch pauses, and checkpoints survive repeated restarts', () => {
  const storage = memoryStorage();
  let engine = create({ storage });
  for (let id = 1; id <= 100; id += 1) {
    engine.attempt(wrong(engine));
    let saved = engine.state;
    engine = create({ storage, random: () => { throw Error('no reroll'); } });
    assert.deepEqual(engine.state, saved);
    assert.deepEqual(engine.currentQuestion(), P.fixedQuestions[id - 1]);
    solve(engine);
    saved = engine.state;
    engine = create({ storage, random: () => { throw Error('no generation at break'); } });
    assert.deepEqual(engine.state, saved);
    if (id % 5 === 0) {
      const replays = [];
      const unsubscribe = engine.subscribe(event => replays.push(event));
      assert.equal(replays.length, 1);
      assert.equal(replays[0].replayed, true);
      assert.equal(replays[0].interaction.checkpointId, `next_fixed_phase_${id / 5}`);
      unsubscribe();
      let quiet = 0;
      engine.subscribe(() => { quiet += 1; }, { replay: false })();
      assert.equal(quiet, 0);
      if (id === 100) break;
      assert.equal(engine.completeInteraction(), true);
    }
  }
  assert.equal(engine.state.mode, 'fixed');
  assert.equal(engine.state.phaseId, 20);
});

test('accepted fixed feedback commits exactly once on reload, including every phase boundary and final break', () => {
  for (const id of [1, 3, ...Array.from({ length: 20 }, (_, i) => (i + 1) * 5)]) {
    const storage = memoryStorage();
    let engine = reachQuestion(create({ storage }), id);
    engine.attempt(wrong(engine));
    engine.attempt(engine.currentQuestion().correctAnswer);
    assert.equal(JSON.parse(storage.getItem(P.STORAGE_KEY)).completedFixedQuestions, id - 1);
    engine = create({ storage, random: () => { throw Error('fixed restore never uses RNG'); } });
    assert.equal(engine.state.completedFixedQuestions, id);
    assert.equal(engine.finishFeedback(), false);
    assert.equal(engine.state.recentPerformance.at(-1), false);
    assert.equal(engine.state.status, id % 5 === 0 ? 'interaction' : 'question');
    const saved = engine.state;
    engine = create({ storage });
    assert.deepEqual(engine.state, saved);
    if (id === 100) {
      assert.equal(engine.state.mode, 'fixed');
      assert.equal(engine.state.pendingInteraction.checkpointId, 'next_fixed_phase_20');
    }
  }
});

test('final transition is independent of counting, tutorial flags, champion or scheduler', () => {
  const storage = memoryStorage();
  const countingKey = require('../game/progression/engine.js').STORAGE_KEY;
  storage.setItem(countingKey, 'counting untouched');
  storage.setItem('sparky.tutorial.what-comes-next.completed.v1', 'true');
  let engine = reachQuestion(create({ storage }), 100);
  solve(engine);
  for (let reopen = 0; reopen < 3; reopen += 1) {
    engine = create({ storage, random: () => { throw Error('final break cannot generate'); } });
    assert.equal(engine.state.status, 'interaction');
    assert.equal(engine.state.phaseId, 20);
    assert.equal(engine.state.mode, 'fixed');
  }
  engine = create({ storage });
  const events = [];
  engine.subscribe(e => events.push(e), { replay: false });
  assert.equal(engine.completeInteraction('next_fixed_phase_20'), true);
  assert.deepEqual(events.map(e => e.type), [P.EVENTS.INTERACTION_COMPLETE, P.EVENTS.INFINITE_START]);
  const saved = engine.state;
  engine = create({ storage, random: () => { throw Error('active infinite question must not reroll'); } });
  assert.deepEqual(engine.state, saved);
  assert.equal(engine.state.phaseId, 21);
  assert.equal(engine.state.currentFixedQuestionId, null);
  assert.equal(storage.getItem(countingKey), 'counting untouched');
  assert.equal(storage.getItem('sparky.tutorial.what-comes-next.completed.v1'), 'true');
  assert.equal(engine.completeInteraction('next_fixed_phase_20'), false);
});

test('infinite retry, accepted feedback, adaptation, pending checkpoint and exact config survive reopening', () => {
  const storage = memoryStorage();
  let engine = reachInfinite(create({ storage }));
  const recentKeys = [];
  let previous;
  for (let sequence = 1; sequence <= 100; sequence += 1) {
    const question = engine.currentQuestion();
    validate(question);
    assert.notEqual(question.displayedNumber, previous);
    previous = question.displayedNumber;
    const key = P.configurationKey(question);
    assert.ok(!recentKeys.includes(key));
    recentKeys.push(key);
    if (recentKeys.length > P.HISTORY_LIMIT) recentKeys.shift();
    if (sequence % 2 === 0) engine.attempt(wrong(engine));
    let saved = engine.state;
    engine = create({ storage, random: () => { throw Error('do not reroll'); } });
    assert.deepEqual(engine.state, saved);
    engine.attempt(question.correctAnswer);
    engine = create({ storage }); // Commit interrupted successful presentation.
    assert.equal(engine.state.completedInfiniteQuestions, sequence);
    assert.equal(engine.finishFeedback(), false);
    saved = engine.state;
    engine = create({ storage });
    assert.deepEqual(engine.state, saved);
    if (sequence % 5 === 0) {
      assert.equal(engine.state.status, 'interaction');
      assert.equal(engine.state.infiniteCompletedSinceInteraction, 5);
      assert.equal(engine.state.pendingInteraction.checkpointId, `next_infinite_${sequence}`);
      assert.equal(engine.completeInteraction(`next_infinite_${sequence - 5}`), false);
      assert.equal(engine.completeInteraction(`next_infinite_${sequence}`), true);
      assert.equal(engine.state.infiniteCompletedSinceInteraction, 0);
    }
  }
});

test('adaptive difficulty uses first-attempt window five, gradual increases/decreases, clamps and holds', () => {
  assert.equal(P.adaptDifficulty(2, [true, true, true, true]), 2);
  assert.equal(P.adaptDifficulty(2, [true, true, true, true, true]), 3);
  assert.equal(P.adaptDifficulty(2, [false, true, true, true, true]), 2);
  assert.equal(P.adaptDifficulty(2, [false, false, true, true, true]), 2);
  assert.equal(P.adaptDifficulty(2, [false, false, false, true, true]), 1);
  assert.equal(P.adaptDifficulty(4, [true, true, true, true, true]), 4);
  assert.equal(P.adaptDifficulty(1, [false, false, false, false, false]), 1);
  const engine = reachInfinite(create());
  for (const [group, expected] of [2, 3, 4, 4, 3, 2, 1, 1].entries()) {
    const before = engine.state.infiniteDifficulty;
    for (let offset = 0; offset < 5; offset += 1) {
      if (group === 3 && offset === 0) engine.attempt(wrong(engine)); // Four successes: hold.
      if (group >= 4) engine.attempt(wrong(engine));
      solve(engine);
      if (offset < 4) assert.equal(engine.state.infiniteDifficulty, before);
    }
    assert.equal(engine.state.infiniteDifficulty, expected);
    engine.completeInteraction();
    assert.equal(engine.currentQuestion().optionCount, expected + 2);
  }
});

test('10,000 infinite engine questions: full domain, all difficulties, valid variety, 2,000 external checkpoints', () => {
  const engine = reachInfinite(create());
  const counts = new Map();
  const starts = new Set();
  const completions = new Set();
  engine.subscribe(event => {
    assert.equal(event.modeId, P.MODE_ID);
    if (event.type === P.EVENTS.INTERACTION_START) {
      assert.ok(!starts.has(event.interaction.checkpointId));
      starts.add(event.interaction.checkpointId);
    } else if (event.type === P.EVENTS.INTERACTION_COMPLETE) completions.add(event.interaction.checkpointId);
  });
  const recent = [];
  const displayed = new Set();
  const difficulties = new Set();
  let previous;
  for (let sequence = 1; sequence <= 10000; sequence += 1) {
    const question = engine.currentQuestion();
    validate(question);
    assert.equal(question.phaseId, 21);
    assert.equal(question.questionId, `next_infinite_${sequence}`);
    assert.equal(question.optionCount, question.difficulty + 2);
    assert.notEqual(question.displayedNumber, previous);
    previous = question.displayedNumber;
    const key = P.configurationKey(question);
    assert.ok(!recent.includes(key), `repeated recent configuration at ${sequence}`);
    recent.push(key);
    if (recent.length > P.HISTORY_LIMIT) recent.shift();
    displayed.add(question.displayedNumber);
    difficulties.add(question.difficulty);
    if (!counts.has(question.optionCount)) counts.set(question.optionCount, new Set());
    counts.get(question.optionCount).add(question.correctOptionIndex);
    if (Math.floor((sequence - 1) / 25) % 2 === 1) {
      engine.attempt(wrong(engine));
      engine.attempt(wrong(engine));
      assert.equal(engine.finishFeedback(), false);
    }
    engine.attempt(question.correctAnswer);
    assert.equal(engine.state.completedInfiniteQuestions, sequence - 1);
    engine.finishFeedback();
    const state = engine.state;
    assert.equal(state.completedInfiniteQuestions, sequence);
    assert.equal(state.completedFixedQuestions, 100);
    assert.ok(state.recentPerformance.length <= 5);
    assert.ok(state.recentGeneratedQuestions.length <= P.HISTORY_LIMIT);
    if (sequence % 5 === 0) {
      assert.equal(state.status, 'interaction');
      assert.equal(state.infiniteCompletedSinceInteraction, 5);
      assert.equal(state.pendingInteraction.checkpointId, `next_infinite_${sequence}`);
      assert.equal(state.pendingInteraction.modeId, P.MODE_ID);
      assert.equal(engine.currentQuestion(), null);
      engine.completeInteraction(state.pendingInteraction.checkpointId);
      assert.equal(engine.state.infiniteCompletedSinceInteraction, 0);
    } else {
      assert.equal(state.status, 'question');
      assert.equal(state.infiniteCompletedSinceInteraction, sequence % 5);
    }
  }
  assert.equal(displayed.size, 98);
  assert.equal(difficulties.size, 4);
  assert.equal(starts.size, 2000);
  assert.deepEqual(completions, starts);
  for (const [count, positions] of counts) assert.equal(positions.size, count);
});

test('constant RNG fallback is bounded, no repeated displayed number or recent exact config at every level', () => {
  for (const constant of [0, 0.5, 0.999999]) {
    for (let difficulty = 1; difficulty <= 4; difficulty += 1) {
      let calls = 0;
      const random = () => { calls += 1; return constant; };
      const recent = [];
      const configs = new Set();
      for (let sequence = 1; sequence <= 300; sequence += 1) {
        const before = calls;
        const q = P.generateInfiniteQuestion({ sequence, difficulty, recentQuestions: recent, random });
        validate(q);
        assert.ok(calls - before <= 100, 'fallback consumed unbounded RNG calls');
        assert.equal(q.optionCount, difficulty + 2);
        assert.notEqual(q.displayedNumber, recent.at(-1)?.displayedNumber);
        const key = P.configurationKey(q);
        assert.ok(!recent.some(previous => P.configurationKey(previous) === key));
        configs.add(key);
        recent.push(q);
        if (recent.length > P.HISTORY_LIMIT) recent.shift();
      }
      assert.ok(configs.size >= 22, 'constant RNG still supplies fresh combinations');
    }
  }
});

test('seeded generator reproducibility and range weights are configurable and difficulty-adapted', () => {
  assert.deepEqual(P.DEFAULT_RANGE_WEIGHTS, [20, 20, 25, 20, 15]);
  function sample(difficulty, rangeWeights) {
    const random = P.seededRandom(887766);
    const recent = [];
    const questions = [];
    let sum = 0;
    let distances = 0;
    let distractors = 0;
    const seen = new Set();
    for (let sequence = 1; sequence <= 2500; sequence += 1) {
      const q = P.generateInfiniteQuestion({ sequence, difficulty, random, recentQuestions: recent, rangeWeights });
      validate(q);
      sum += q.displayedNumber;
      seen.add(q.displayedNumber);
      for (const option of q.options) if (option !== q.correctAnswer) {
        distances += Math.abs(option - q.correctAnswer);
        distractors += 1;
      }
      questions.push(q);
      recent.push(q);
      if (recent.length > P.HISTORY_LIMIT) recent.shift();
    }
    return { average: sum / 2500, distance: distances / distractors, seen, questions };
  }
  const easy = sample(1);
  const hard = sample(4);
  assert.deepEqual(sample(1).questions, easy.questions);
  assert.equal(easy.seen.size, 98);
  assert.equal(hard.seen.size, 98);
  assert.ok(hard.average > easy.average + 15);
  assert.ok(easy.distance > hard.distance + 5);
  for (let index = 0; index < 5; index += 1) {
    const weights = Array(5).fill(0);
    weights[index] = 1;
    const ranges = [[1, 10], [11, 20], [21, 50], [51, 75], [76, 98]];
    for (const difficulty of [1, 4]) {
      const q = P.generateInfiniteQuestion({ sequence: 1, difficulty, rangeWeights: weights, random: () => 0.999 });
      assert.ok(q.displayedNumber >= ranges[index][0] && q.displayedNumber <= ranges[index][1]);
    }
  }
  const weights = [0, 0, 0, 0, 100];
  const engine = create({ rangeWeights: weights });
  weights[4] = 0; // The engine owns a defensive copy of its config.
  reachInfinite(engine);
  assert.ok(engine.currentQuestion().displayedNumber >= 76);
});

test('options cover all answers/counts/difficulties, correct positions and nonconsecutive hard sets', () => {
  const positions = new Map();
  for (let answer = 2; answer <= 99; answer += 1) {
    for (let count = 3; count <= 6; count += 1) {
      for (let difficulty = 1; difficulty <= 4; difficulty += 1) {
        const seed = answer * 491 + count * 37 + difficulty;
        const options = P.generateOptions(answer, count, difficulty, P.seededRandom(seed));
        assert.deepEqual(options, P.generateOptions(answer, count, difficulty, P.seededRandom(seed)));
        validate({ questionId: 'test', modeId: P.MODE_ID, phaseId: 21, displayedNumber: answer - 1,
          correctAnswer: answer, optionCount: count, options, correctOptionIndex: options.indexOf(answer), difficulty });
        assert.ok(options.some(value => Math.abs(value - answer) >= Math.max(4, count)));
        if (difficulty >= 2) assert.ok(options.some(value => value !== answer && Math.abs(value - answer) <= 3));
        if (!positions.has(count)) positions.set(count, new Set());
        positions.get(count).add(options.indexOf(answer));
      }
    }
  }
  for (const [count, indexes] of positions) assert.equal(indexes.size, count);
});

test('semantic save validation rejects inconsistent progress, question data, checkpoint identities, and histories', () => {
  const storage = memoryStorage();
  const initial = create().state;
  const mutations = [
    s => { s.modeId = 'counting'; }, s => { s.total100 = 84; }, s => { s.status = 'champion'; },
    s => { s.status = 'feedback'; }, s => { s.completedFixedQuestions = 1; },
    s => { s.phaseId = 2; }, s => { s.currentFixedQuestionId = 'next_002'; },
    s => { s.questionAttempts = -1; }, s => { s.infiniteDifficulty = 2; },
    s => { s.currentQuestion.displayedNumber = 99; }, s => { s.currentQuestion.correctAnswer = 3; },
    s => { s.currentQuestion.options.reverse(); }, s => { s.recentPerformance = [true]; },
    s => { s.lastCompletedInteractionCheckpoint = 'next_fixed_phase_1'; },
    s => { s.pendingInteraction = { checkpointId: 'next_fixed_phase_1' }; }
  ];
  function reject(base, mutate) {
    const bad = deepClone(base);
    mutate(bad);
    storage.setItem(P.STORAGE_KEY, JSON.stringify(bad));
    assert.deepEqual(create({ storage }).state, initial);
  }
  for (const mutate of mutations) reject(initial, mutate);
  const boundary = create();
  reachQuestion(boundary, 5);
  solve(boundary);
  for (const mutate of [
    s => { s.pendingInteraction.modeId = 'other'; }, s => { s.pendingInteraction.resumePhase = 3; },
    s => { s.pendingInteraction.checkpointId = 'fixed_phase_1'; }, s => { s.phaseId = 2; },
    s => { s.questionAttempts = 0; }, s => { s.currentQuestion = P.fixedQuestions[5]; },
    s => { s.recentPerformance[4] = false; },
    s => { s.lastCompletedInteractionCheckpoint = 'next_fixed_phase_1'; }
  ]) reject(boundary.state, mutate);
  const infinite = reachInfinite(create());
  for (let i = 0; i < 8; i += 1) {
    if (infinite.state.status === 'interaction') infinite.completeInteraction();
    solve(infinite);
  }
  for (const mutate of [
    s => { s.completedFixedQuestions = 99; }, s => { s.phaseId = 20; },
    s => { s.infiniteCompletedSinceInteraction = 4; }, s => { s.adaptiveEvaluationCount = 0; },
    s => { s.recentGeneratedQuestions.pop(); }, s => { s.recentGeneratedQuestions[0].questionId = 'next_infinite_999'; },
    s => { s.recentGeneratedQuestions[0].correctAnswer = 100; },
    s => { s.recentGeneratedQuestions[1] = deepClone(s.recentGeneratedQuestions[0]); },
    s => { s.currentQuestion.options.reverse(); }, s => { s.infiniteDifficulty = 4; },
    s => { s.lastCompletedInteractionCheckpoint = 'next_infinite_10'; },
    s => { s.recentPerformance = []; }
  ]) reject(infinite.state, mutate);
  for (const raw of ['bad json', 'null', '{}', '[]', '{"version":999}']) {
    storage.setItem(P.STORAGE_KEY, raw);
    assert.deepEqual(create({ storage }).state, initial);
  }
});

test('event snapshots persist before delivery; unsubscribe, replay and reentrant completion are ordered', () => {
  const storage = memoryStorage();
  const engine = reachQuestion(create({ storage }), 5);
  engine.subscribe(() => { throw Error('unsubscribed'); })();
  const first = [];
  const second = [];
  engine.subscribe(event => {
    first.push(event.type);
    assert.equal(JSON.parse(storage.getItem(P.STORAGE_KEY)).status, event.state.status);
    assert.throws(() => { event.state.phaseId = 99; }, TypeError);
    if (event.type === P.EVENTS.INTERACTION_START) engine.completeInteraction(event.interaction.checkpointId);
  });
  engine.subscribe(event => second.push(event.type));
  solve(engine);
  assert.deepEqual(first, [P.EVENTS.INTERACTION_START, P.EVENTS.INTERACTION_COMPLETE]);
  assert.deepEqual(second, first);
  assert.equal(engine.currentQuestion().questionId, 'next_006');
});

test('listener failures cannot prevent persisted advancement or other checkpoint subscribers', () => {
  const engine = reachQuestion(create(), 5);
  let received = 0;
  const unsubscribe = engine.subscribe(() => { throw Error('integration failed'); });
  engine.subscribe(() => { received += 1; });
  engine.attempt(engine.currentQuestion().correctAnswer);
  assert.throws(() => engine.finishFeedback(), /integration failed/);
  assert.equal(received, 1);
  assert.equal(engine.state.status, 'interaction');
  assert.equal(engine.state.completedFixedQuestions, 5);
  assert.equal(engine.finishFeedback(), false);
  unsubscribe();
  assert.equal(engine.completeInteraction(), true);
});

test('final transition queues both events before listeners run, even with reentrancy and listener errors', () => {
  const engine = reachQuestion(create(), 100);
  solve(engine);
  const events = [];
  engine.subscribe(event => {
    if (event.type === P.EVENTS.INTERACTION_COMPLETE) {
      // Force another checkpoint synchronously from inside the final ack callback.
      for (let index = 0; index < 5; index += 1) solve(engine);
      throw Error('integration failed after final ack');
    }
  }, { replay: false });
  engine.subscribe(event => events.push(event), { replay: false });
  assert.throws(() => engine.completeInteraction('next_fixed_phase_20'), /integration failed after final ack/);
  assert.deepEqual(events.map(e => e.type), [
    P.EVENTS.INTERACTION_COMPLETE, P.EVENTS.INFINITE_START, P.EVENTS.INTERACTION_START
  ]);
  assert.equal(events[1].state.status, 'question');
  assert.equal(events[1].state.completedInfiniteQuestions, 0);
  assert.equal(events[2].state.completedInfiniteQuestions, 5);
  assert.equal(engine.state.pendingInteraction.checkpointId, 'next_infinite_5');
});

test('storage/RNG failures roll back mutations and failed acknowledgments without lost or doubled progress', () => {
  const storage = memoryStorage();
  let failWrites = false;
  const realSet = storage.setItem;
  storage.setItem = (key, value) => { if (failWrites) throw Error('quota'); realSet(key, value); };
  const engine = create({ storage });
  let before = engine.state;
  failWrites = true;
  assert.throws(() => engine.attempt(engine.currentQuestion().correctAnswer), /quota/);
  assert.deepEqual(engine.state, before);
  failWrites = false;
  engine.attempt(engine.currentQuestion().correctAnswer);
  before = engine.state;
  failWrites = true;
  assert.throws(() => engine.finishFeedback(), /quota/);
  assert.deepEqual(engine.state, before);
  failWrites = false;
  assert.equal(engine.finishFeedback(), true);
  assert.equal(create({ storage }).state.completedFixedQuestions, 1);
  reachQuestion(engine, 5);
  solve(engine);
  before = engine.state;
  failWrites = true;
  assert.throws(() => engine.completeInteraction(), /quota/);
  assert.deepEqual(engine.state, before);
  failWrites = false;
  assert.equal(engine.completeInteraction(), true);
  const final = reachQuestion(create(), 100);
  solve(final);
  storage.setItem(P.STORAGE_KEY, JSON.stringify(final.state));
  let badRandom = true;
  const retryable = create({ storage, random: () => { if (badRandom) throw Error('random failed'); return 0.5; } });
  before = retryable.state;
  assert.throws(() => retryable.completeInteraction(), /random failed/);
  assert.deepEqual(retryable.state, before);
  assert.deepEqual(JSON.parse(storage.getItem(P.STORAGE_KEY)), before);
  badRandom = false;
  assert.equal(retryable.completeInteraction(), true);
  assert.equal(retryable.state.mode, 'infinite');
});

test('invalid inputs and inaccessible storage fail explicitly; saves use a mode-specific key', () => {
  assert.notEqual(P.STORAGE_KEY, require('../game/progression/engine.js').STORAGE_KEY);
  assert.throws(() => create({ storage: {} }), /getItem\/setItem/);
  assert.throws(() => create({ random: 7 }), /random must/);
  assert.throws(() => create().subscribe(null), /listener must/);
  assert.throws(() => create({ storage: { getItem() { throw Error('denied'); }, setItem() {} } }), /denied/);
  assert.throws(() => create({ storage: { getItem() { return null; }, setItem() { throw Error('quota'); } } }), /quota/);
  for (const args of [[1, 3, 1], [100, 3, 1], [2, 2, 1], [2, 7, 1], [2, 3, 5]]) {
    assert.throws(() => P.generateOptions(...args), RangeError);
  }
  for (const value of [-1, 1, NaN, Infinity]) {
    assert.throws(() => P.generateInfiniteQuestion({ sequence: 1, difficulty: 1, random: () => value }), RangeError);
  }
  for (const weights of [[], [0, 0, 0, 0, 0], [-1, 2, 3, 4, 5], [1, 2, 3, 4, NaN], [1, 2, 3, 4, Infinity]]) {
    assert.throws(() => create({ rangeWeights: weights }), /rangeWeights/);
    assert.throws(() => P.generateInfiniteQuestion({ sequence: 1, difficulty: 1, rangeWeights: weights }), /rangeWeights/);
  }
  assert.throws(() => P.generateInfiniteQuestion({ sequence: 0, difficulty: 1 }), RangeError);
  assert.throws(() => P.generateInfiniteQuestion({ sequence: 1, difficulty: 5 }), RangeError);
  assert.throws(() => P.generateInfiniteQuestion({ sequence: 1, difficulty: 1, recentQuestions: [{}] }), RangeError);
  assert.throws(() => P.adaptDifficulty(2, [1, 0]), RangeError);
});