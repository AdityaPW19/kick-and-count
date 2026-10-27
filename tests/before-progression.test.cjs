'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const P = require('../game/progression/before-engine.js');
const Next = require('../game/progression/next-engine.js');
const Counting = require('../game/progression/engine.js');

// Independent literal expectations from the approved predecessor brief.
const EXPECTED_STARTERS = [
  [2, 3, 4, 5, 6], [4, 7, 5, 8, 9], [6, 8, 9, 10, 3], [10, 5, 7, 9, 10],
  [11, 12, 13, 14, 15], [16, 17, 18, 19, 20], [10, 20, 11, 15, 19], [13, 17, 20, 8, 16],
  [21, 22, 25, 28, 30], [23, 26, 29, 30, 31], [32, 35, 38, 40, 41], [43, 46, 49, 50, 36],
  [41, 50, 51, 55, 60], [52, 57, 60, 61, 65], [66, 68, 70, 71, 73], [59, 64, 69, 75, 60],
  [76, 79, 80, 81, 85], [86, 88, 90, 91, 95], [96, 97, 98, 99, 90], [10, 20, 50, 80, 99]
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
  assert.equal(engine.currentQuestion().questionId, `before_${String(id).padStart(3, '0')}`);
  return engine;
}
function reachInfinite(engine) {
  reachQuestion(engine, 100);
  solve(engine);
  assert.equal(engine.state.status, 'interaction');
  assert.equal(engine.state.mode, 'fixed');
  assert.equal(engine.completeInteraction('before_fixed_phase_20'), true);
  assert.equal(engine.state.mode, 'infinite');
  return engine;
}
function validate(q) {
  assert.ok(q);
  assert.equal(q.modeId, 'what_came_before');
  assert.ok(Number.isInteger(q.displayedNumber) && q.displayedNumber >= 2 && q.displayedNumber <= 99);
  assert.equal(q.correctAnswer, q.displayedNumber - 1);
  assert.ok(q.correctAnswer >= 1 && q.correctAnswer <= 98);
  assert.ok(Number.isInteger(q.optionCount) && q.optionCount >= 3 && q.optionCount <= 6);
  assert.equal(q.options.length, q.optionCount);
  assert.equal(new Set(q.options).size, q.optionCount);
  assert.ok(q.options.every(value => Number.isInteger(value) && value >= 1 && value <= 99));
  assert.equal(q.options.filter(value => value === q.correctAnswer).length, 1);
  assert.equal(q.options[q.correctOptionIndex], q.correctAnswer);
  assert.ok(Number.isInteger(q.difficulty) && q.difficulty >= 1 && q.difficulty <= 4);
}
function deepClone(value) { return JSON.parse(JSON.stringify(value)); }

test('exact 100 predecessors, 20 phases, five each, exact variable counts and shared checkpoint contract', () => {
  assert.equal(P.MODE_ID, 'what_came_before');
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
    assert.equal(phase.difficulty, ['very_easy', 'easy', 'medium', 'hard'][phase.difficultyLevel - 1]);
    for (let offset = 0; offset < 5; offset += 1) {
      const id = index * 5 + offset + 1;
      const q = P.fixedQuestions[id - 1];
      validate(q);
      assert.equal(q.phaseId, index + 1);
      assert.equal(q.questionId, `before_${String(id).padStart(3, '0')}`);
      assert.equal(q.difficulty, phase.difficultyLevel);
      assert.notEqual(q.isTutorial, true);
    }
  }
  assert.equal(P.fixedQuestions[0].correctAnswer, 1);
  assert.equal(P.fixedQuestions[93].displayedNumber, 99);
  assert.equal(P.fixedQuestions[93].correctAnswer, 98);
});

test('successor-compatible export/engine/state schemas; only mode data, identities and rule differ', () => {
  assert.deepEqual(Object.keys(P).sort(), Object.keys(Next).sort());
  const engine = create();
  const next = Next.createEngine({ storage: null });
  assert.deepEqual(Object.keys(engine).sort(), Object.keys(next).sort());
  assert.deepEqual(Object.keys(engine.state).sort(), Object.keys(next.state).sort());
  assert.deepEqual(Object.keys(P.phases[0]).sort(), Object.keys(Next.phases[0]).sort());
  assert.deepEqual(Object.keys(engine.currentQuestion()).sort(), Object.keys(next.currentQuestion()).sort());
  assert.equal(P.EVENTS.INTERACTION_START, Next.EVENTS.INTERACTION_START);
  assert.equal(P.EVENTS.INTERACTION_COMPLETE, Next.EVENTS.INTERACTION_COMPLETE);
  assert.equal(P.EVENTS.INFINITE_START, 'BEFORE_INFINITE_MODE_START');
  assert.equal(P.STORAGE_KEY, 'sparky-before-progression:v1');
  assert.deepEqual(P.phases.map(p => p.difficultyLevel), Next.phases.map(p => p.difficultyLevel));
  assert.deepEqual(P.phases.map(p => p.optionCounts), Next.phases.map(p => p.optionCounts));
});

test('seeded fixed reproducibility, position variety, near/far balance, immutable snapshots', () => {
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
  for (const [count, positions] of byCount) assert.ok(positions.size >= Math.min(3, count));
  assert.ok(P.fixedQuestions.some(q => q.correctAnswer !== Math.min(...q.options) && q.correctAnswer !== Math.max(...q.options)));
  const original = engineSnapshot();
  function engineSnapshot() { return create().state; }
  assert.throws(() => { original.currentQuestion.options.push(22); }, TypeError);
});

test('standalone browser global needs no DOM, other mode, tutorial, physics or scheduler', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../game/progression/before-engine.js'), 'utf8'), context);
  assert.equal(typeof context.SparkyBeforeProgression.createEngine, 'function');
  for (const name of ['SparkyProgression', 'SparkyNextProgression', 'SparkyBeforeTutorial', 'SparkyMasterProgression']) {
    assert.equal(context[name], undefined);
  }
  const engine = context.SparkyBeforeProgression.createEngine();
  assert.equal(engine.currentQuestion().questionId, 'before_001');
  assert.equal(engine.attempt(1).correct, true);
  assert.equal(engine.state.completedFixedQuestions, 0);
  engine.finishFeedback();
  assert.equal(engine.state.completedFixedQuestions, 1);
  assert.equal(engine.completeCelebration, undefined);
  assert.equal(engine.state.celebrationPending, undefined);
});

test('wrong and invalid answers cannot advance; accepted answer locks until feedback completion', () => {
  const engine = create();
  const before = engine.state;
  assert.equal(engine.finishFeedback(), false);
  for (const value of [0, 100, '1', null, undefined, NaN, 1.5]) {
    assert.deepEqual(engine.attempt(value), { accepted: false, correct: false, reason: 'invalid_option' });
  }
  assert.equal(engine.state.questionAttempts, 0);
  for (let i = 0; i < 3; i += 1) {
    assert.equal(engine.attempt(wrong(engine)).correct, false);
    assert.equal(engine.finishFeedback(), false);
    assert.equal(engine.state.completedFixedQuestions, 0);
    assert.deepEqual(engine.currentQuestion(), before.currentQuestion);
  }
  assert.deepEqual(engine.attempt(1), { accepted: true, correct: true, questionId: 'before_001', attempts: 4 });
  assert.equal(engine.state.status, 'feedback');
  assert.equal(engine.state.completedFixedQuestions, 0);
  assert.equal(engine.attempt(1).reason, 'not_answering');
  assert.equal(engine.completeInteraction(), false);
  assert.equal(engine.finishFeedback(), true);
  assert.equal(engine.finishFeedback(), false);
  assert.equal(engine.state.completedFixedQuestions, 1);
  assert.deepEqual(engine.state.recentPerformance, [false]);
  assert.equal(before.questionAttempts, 0);
});

test('all 20 fixed breaks are external, feedback-gated and durable; final ack alone starts phase21', () => {
  const storage = memoryStorage();
  let engine = create({ storage });
  const events = [];
  for (let id = 1; id <= 100; id += 1) {
    const unsubscribe = engine.subscribe(event => events.push(event), { replay: false });
    assert.deepEqual(engine.currentQuestion(), P.fixedQuestions[id - 1]);
    const oldEvents = events.length;
    engine.attempt(wrong(engine));
    const retry = engine.state;
    unsubscribe();
    engine = create({ storage, random: () => { throw Error('fixed restore must not reroll'); } });
    assert.deepEqual(engine.state, retry);
    const off = engine.subscribe(event => events.push(event), { replay: false });
    engine.attempt(engine.currentQuestion().correctAnswer);
    assert.equal(engine.state.completedFixedQuestions, id - 1);
    assert.equal(events.length, oldEvents);
    engine.finishFeedback();
    assert.equal(engine.state.completedFixedQuestions, id);
    if (id % 5 !== 0) { off(); continue; }
    const checkpointId = `before_fixed_phase_${id / 5}`;
    const pending = engine.state;
    assert.equal(pending.status, 'interaction');
    assert.equal(pending.mode, 'fixed');
    assert.deepEqual(pending.pendingInteraction, {
      checkpointId, modeId: P.MODE_ID, mode: 'fixed', phaseId: id / 5, resumePhase: id / 5 + 1
    });
    assert.equal(engine.currentQuestion(), null);
    assert.equal(engine.attempt(1).accepted, false);
    assert.equal(engine.finishFeedback(), false);
    assert.equal(engine.completeInteraction('wrong_checkpoint'), false);
    assert.deepEqual(engine.state, pending);
    assert.equal(events.length, oldEvents + 1);
    off();
    engine = create({ storage, random: () => { throw Error('pending break cannot generate'); } });
    assert.deepEqual(engine.state, pending);
    const replay = [];
    engine.subscribe(event => replay.push(event))();
    assert.equal(replay.length, 1);
    assert.equal(replay[0].replayed, true);
    assert.equal(replay[0].interaction.checkpointId, checkpointId);
    let quiet = 0;
    engine.subscribe(() => { quiet += 1; }, { replay: false })();
    assert.equal(quiet, 0);
    engine = create({ storage });
    engine.subscribe(event => events.push(event), { replay: false })(); // Unsubscription is effective.
    const ackOff = engine.subscribe(event => events.push(event), { replay: false });
    assert.equal(engine.completeInteraction(checkpointId), true);
    assert.equal(engine.completeInteraction(checkpointId), false);
    assert.equal(engine.state.lastCompletedInteractionCheckpoint, checkpointId);
    assert.equal(engine.state.phaseId, id / 5 + 1);
    ackOff();
  }
  assert.equal(events.filter(e => e.type === P.EVENTS.INTERACTION_START).length, 20);
  assert.equal(events.filter(e => e.type === P.EVENTS.INTERACTION_COMPLETE).length, 20);
  assert.equal(new Set(events.filter(e => e.type === P.EVENTS.INTERACTION_START).map(e => e.interaction.checkpointId)).size, 20);
  assert.equal(events.filter(e => e.type === P.EVENTS.INFINITE_START).length, 1);
  assert.ok(events.every(e => e.modeId === P.MODE_ID));
  assert.equal(engine.currentQuestion().questionId, 'before_infinite_1');
  assert.equal(engine.state.completedInfiniteQuestions, 0);
  assert.deepEqual(engine.state.recentPerformance, []);
});

test('accepted fixed feedback recovers once at ordinary questions and every boundary including question100', () => {
  for (const id of [1, 3, ...Array.from({ length: 20 }, (_, i) => (i + 1) * 5)]) {
    const storage = memoryStorage();
    let engine = reachQuestion(create({ storage }), id);
    engine.attempt(wrong(engine));
    engine.attempt(engine.currentQuestion().correctAnswer);
    assert.equal(JSON.parse(storage.getItem(P.STORAGE_KEY)).completedFixedQuestions, id - 1);
    engine = create({ storage, random: () => { throw Error('fixed recovery uses no RNG'); } });
    assert.equal(engine.state.completedFixedQuestions, id);
    assert.equal(engine.finishFeedback(), false);
    assert.equal(engine.state.recentPerformance.at(-1), false);
    assert.equal(engine.state.status, id % 5 === 0 ? 'interaction' : 'question');
    const saved = engine.state;
    engine = create({ storage });
    assert.deepEqual(engine.state, saved);
    if (id === 100) {
      assert.equal(engine.state.mode, 'fixed');
      assert.equal(engine.state.pendingInteraction.checkpointId, 'before_fixed_phase_20');
    }
  }
});

test('own save never reads/mutates next, counting, master or tutorial keys; independent saves resume', () => {
  const storage = memoryStorage();
  const next = Next.createEngine({ storage });
  next.attempt(next.currentQuestion().correctAnswer);
  next.finishFeedback();
  const counting = Counting.createEngine({ storage });
  counting.attempt(counting.currentQuestion().correctAnswer);
  counting.finishFeedback();
  const keys = [Next.STORAGE_KEY, Counting.STORAGE_KEY, 'sparky-master-progression:v1',
    'sparky.tutorial.what-came-before.completed.v1', 'sparky.tutorial.what-comes-next.completed.v1'];
  for (const key of keys.slice(2)) storage.setItem(key, 'untouched');
  const original = keys.map(key => storage.getItem(key));
  const accessed = [];
  const ownStorage = {
    getItem(key) { accessed.push(key); return storage.getItem(key); },
    setItem(key, value) { accessed.push(key); storage.setItem(key, value); }
  };
  let engine = reachInfinite(create({ storage: ownStorage }));
  for (let i = 0; i < 7; i += 1) {
    if (engine.state.status === 'interaction') engine.completeInteraction();
    solve(engine);
  }
  const saved = engine.state;
  engine = create({ storage: ownStorage, random: () => { throw Error('must not reroll'); } });
  assert.deepEqual(engine.state, saved);
  assert.deepEqual(keys.map(key => storage.getItem(key)), original);
  assert.deepEqual(new Set(accessed), new Set([P.STORAGE_KEY]));
  assert.deepEqual(Next.createEngine({ storage }).state, next.state);
  assert.deepEqual(Counting.createEngine({ storage }).state, counting.state);
});

test('infinite wrong retries, accepted feedback, histories, adaptation and pending checkpoints survive reload', () => {
  const storage = memoryStorage();
  let engine = reachInfinite(create({ storage }));
  for (let sequence = 1; sequence <= 100; sequence += 1) {
    const q = engine.currentQuestion();
    validate(q);
    if (sequence % 2 === 0) engine.attempt(wrong(engine));
    let saved = engine.state;
    engine = create({ storage, random: () => { throw Error('do not reroll'); } });
    assert.deepEqual(engine.state, saved);
    engine.attempt(q.correctAnswer);
    engine = create({ storage });
    assert.equal(engine.state.completedInfiniteQuestions, sequence);
    assert.equal(engine.finishFeedback(), false);
    saved = engine.state;
    engine = create({ storage, random: () => { throw Error('restored question/break is exact'); } });
    assert.deepEqual(engine.state, saved);
    if (sequence % 5 === 0) {
      assert.equal(engine.state.status, 'interaction');
      assert.equal(engine.state.infiniteCompletedSinceInteraction, 5);
      assert.equal(engine.state.pendingInteraction.checkpointId, `before_infinite_${sequence}`);
      assert.equal(engine.completeInteraction(`before_infinite_${sequence - 5}`), false);
      engine = create({ storage });
      assert.equal(engine.completeInteraction(`before_infinite_${sequence}`), true);
      assert.equal(engine.state.infiniteCompletedSinceInteraction, 0);
    }
  }
});

test('five-question first-attempt adaptation gradually increases, holds, decreases and clamps', () => {
  for (const [level, performance, expected] of [
    [2, [true, true, true, true], 2], [2, [true, true, true, true, true], 3],
    [2, [false, true, true, true, true], 2], [2, [false, false, true, true, true], 2],
    [2, [false, false, false, true, true], 1], [4, [true, true, true, true, true], 4],
    [1, [false, false, false, false, false], 1]
  ]) assert.equal(P.adaptDifficulty(level, performance), expected);
  const engine = reachInfinite(create());
  for (const [group, expected] of [2, 3, 4, 4, 3, 2, 1, 1].entries()) {
    const before = engine.state.infiniteDifficulty;
    for (let offset = 0; offset < 5; offset += 1) {
      if ((group === 3 && offset === 0) || group >= 4) engine.attempt(wrong(engine));
      solve(engine);
      if (offset < 4) assert.equal(engine.state.infiniteDifficulty, before);
    }
    assert.equal(engine.state.infiniteDifficulty, expected);
    engine.completeInteraction();
    assert.equal(engine.currentQuestion().optionCount, expected + 2);
  }
});

test('10,000 infinite engine questions cover 2..99, answers1..98, all levels/positions and 2,000 breaks', () => {
  const engine = reachInfinite(create());
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
  const answers = new Set();
  const difficulties = new Set();
  const positions = new Map();
  let previous;
  for (let sequence = 1; sequence <= 10000; sequence += 1) {
    const q = engine.currentQuestion();
    validate(q);
    assert.equal(q.phaseId, 21);
    assert.equal(q.questionId, `before_infinite_${sequence}`);
    assert.equal(q.optionCount, q.difficulty + 2);
    assert.notEqual(q.displayedNumber, previous);
    previous = q.displayedNumber;
    const key = P.configurationKey(q);
    assert.ok(!recent.includes(key), `recent configuration repeated at ${sequence}`);
    recent.push(key);
    if (recent.length > P.HISTORY_LIMIT) recent.shift();
    displayed.add(q.displayedNumber);
    answers.add(q.correctAnswer);
    difficulties.add(q.difficulty);
    if (!positions.has(q.optionCount)) positions.set(q.optionCount, new Set());
    positions.get(q.optionCount).add(q.correctOptionIndex);
    if (Math.floor((sequence - 1) / 25) % 2 === 1) {
      engine.attempt(wrong(engine));
      engine.attempt(wrong(engine));
      assert.equal(engine.finishFeedback(), false);
    }
    engine.attempt(q.correctAnswer);
    assert.equal(engine.state.completedInfiniteQuestions, sequence - 1);
    engine.finishFeedback();
    const state = engine.state;
    assert.equal(state.completedInfiniteQuestions, sequence);
    assert.equal(state.completedFixedQuestions, 100);
    assert.ok(state.recentPerformance.length <= 5);
    assert.ok(state.recentGeneratedQuestions.length <= P.HISTORY_LIMIT);
    if (sequence % 5 === 0) {
      assert.equal(state.status, 'interaction');
      assert.equal(state.pendingInteraction.checkpointId, `before_infinite_${sequence}`);
      assert.equal(state.pendingInteraction.resumePhase, 21);
      assert.equal(state.infiniteCompletedSinceInteraction, 5);
      assert.equal(engine.currentQuestion(), null);
      engine.completeInteraction(state.pendingInteraction.checkpointId);
      assert.equal(engine.state.infiniteCompletedSinceInteraction, 0);
    } else {
      assert.equal(state.status, 'question');
      assert.equal(state.infiniteCompletedSinceInteraction, sequence % 5);
    }
  }
  assert.equal(displayed.size, 98);
  assert.ok(displayed.has(2) && displayed.has(99));
  assert.equal(answers.size, 98);
  assert.ok(answers.has(1) && answers.has(98));
  assert.equal(difficulties.size, 4);
  assert.equal(starts.size, 2000);
  assert.deepEqual(completions, starts);
  for (const [count, indexes] of positions) assert.equal(indexes.size, count);
});

test('constant RNG fallback is bounded, avoids consecutive starters and recent unordered configurations', () => {
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
        assert.ok(calls - before <= 100);
        assert.notEqual(q.displayedNumber, recent.at(-1)?.displayedNumber);
        const key = P.configurationKey(q);
        assert.equal(key, P.configurationKey({ ...q, options: q.options.slice().reverse() }));
        assert.ok(!recent.some(old => P.configurationKey(old) === key));
        configs.add(key);
        recent.push(q);
        if (recent.length > P.HISTORY_LIMIT) recent.shift();
      }
      assert.ok(configs.size >= 22);
    }
  }
});

test('configurable weighted displayed ranges, deterministic samples and difficulty biases', () => {
  assert.deepEqual(P.DEFAULT_RANGE_WEIGHTS, [20, 20, 25, 20, 15]);
  function sample(difficulty) {
    const random = P.seededRandom(887766);
    const recent = [];
    const questions = [];
    let sum = 0;
    let distances = 0;
    let distractors = 0;
    const seen = new Set();
    for (let sequence = 1; sequence <= 2500; sequence += 1) {
      const q = P.generateInfiniteQuestion({ sequence, difficulty, random, recentQuestions: recent });
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
  const ranges = [[2, 10], [11, 20], [21, 50], [51, 75], [76, 99]];
  for (const [index, range] of ranges.entries()) {
    const weights = Array(5).fill(0);
    weights[index] = 1;
    for (let difficulty = 1; difficulty <= 4; difficulty += 1) {
      for (const constant of [0, 0.999999]) {
        const q = P.generateInfiniteQuestion({ sequence: 1, difficulty, rangeWeights: weights, random: () => constant });
        assert.equal(q.displayedNumber, constant === 0 ? range[0] : range[1]);
        validate(q);
      }
    }
    assert.deepEqual(P.adaptedRangeWeights(4, weights).map(w => w > 0), weights.map(Boolean));
  }
  const weights = [0, 0, 0, 0, 100];
  const engine = create({ rangeWeights: weights });
  weights[4] = 0;
  reachInfinite(engine);
  assert.ok(engine.currentQuestion().displayedNumber >= 76);
});

test('all answers including1, counts and levels: unique bounded options, deterministic variety, nonconsecutive sets', () => {
  const positions = new Map();
  const numerals = new Set();
  for (let answer = 1; answer <= 98; answer += 1) {
    for (let count = 3; count <= 6; count += 1) {
      for (let difficulty = 1; difficulty <= 4; difficulty += 1) {
        const seed = answer * 491 + count * 37 + difficulty;
        const options = P.generateOptions(answer, count, difficulty, P.seededRandom(seed));
        assert.deepEqual(options, P.generateOptions(answer, count, difficulty, P.seededRandom(seed)));
        validate({ displayedNumber: answer + 1, correctAnswer: answer, modeId: P.MODE_ID,
          optionCount: count, options, correctOptionIndex: options.indexOf(answer), difficulty });
        assert.ok(options.some(value => Math.abs(value - answer) >= Math.max(4, count)));
        if (difficulty >= 2) assert.ok(options.some(value => value !== answer && Math.abs(value - answer) <= 3));
        if (!positions.has(count)) positions.set(count, new Set());
        positions.get(count).add(options.indexOf(answer));
        options.forEach(value => numerals.add(value));
      }
    }
  }
  assert.equal(numerals.size, 99);
  for (const [count, indexes] of positions) assert.equal(indexes.size, count);
});

test('semantic save validation rejects forged progress, successor rules, checkpoints, domains and histories', () => {
  const storage = memoryStorage();
  const initial = create().state;
  function reject(base, mutate) {
    const bad = deepClone(base);
    mutate(bad);
    storage.setItem(P.STORAGE_KEY, JSON.stringify(bad));
    assert.deepEqual(create({ storage }).state, initial);
  }
  for (const mutate of [
    s => { s.modeId = Next.MODE_ID; }, s => { s.total100 = 84; }, s => { s.status = 'champion'; },
    s => { s.status = 'feedback'; }, s => { s.completedFixedQuestions = 1; }, s => { s.phaseId = 2; },
    s => { s.currentFixedQuestionId = 'before_002'; }, s => { s.questionAttempts = -1; },
    s => { s.infiniteDifficulty = 2; }, s => { s.currentQuestion.displayedNumber = 1; },
    s => { s.currentQuestion.correctAnswer = 3; }, s => { s.currentQuestion.options.reverse(); },
    s => { s.recentPerformance = [true]; }, s => { s.lastCompletedInteractionCheckpoint = 'before_fixed_phase_1'; },
    s => { s.pendingInteraction = { checkpointId: 'before_fixed_phase_1' }; }
  ]) reject(initial, mutate);
  const boundary = reachQuestion(create(), 5);
  solve(boundary);
  for (const mutate of [
    s => { s.pendingInteraction.modeId = 'other'; }, s => { s.pendingInteraction.resumePhase = 3; },
    s => { s.pendingInteraction.checkpointId = 'next_fixed_phase_1'; }, s => { s.phaseId = 2; },
    s => { s.questionAttempts = 0; }, s => { s.currentQuestion = P.fixedQuestions[5]; },
    s => { s.recentPerformance[4] = false; }, s => { s.lastCompletedInteractionCheckpoint = 'before_fixed_phase_1'; }
  ]) reject(boundary.state, mutate);
  const infinite = reachInfinite(create());
  for (let i = 0; i < 28; i += 1) {
    if (infinite.state.status === 'interaction') infinite.completeInteraction();
    solve(infinite);
  }
  for (const mutate of [
    s => { s.completedFixedQuestions = 99; }, s => { s.phaseId = 20; },
    s => { s.infiniteCompletedSinceInteraction = 4; }, s => { s.adaptiveEvaluationCount = 0; },
    s => { s.recentGeneratedQuestions.pop(); }, s => { s.recentGeneratedQuestions[0].questionId = 'before_infinite_999'; },
    s => { s.recentGeneratedQuestions[0].correctAnswer += 2; },
    s => { s.recentGeneratedQuestions[1] = deepClone(s.recentGeneratedQuestions[0]); },
    s => { s.currentQuestion.options.reverse(); }, s => { s.infiniteDifficulty = 1; },
    s => { s.lastCompletedInteractionCheckpoint = 'before_infinite_30'; }, s => { s.recentPerformance = []; },
    s => { s.currentQuestion.displayedNumber = 1; }, s => { s.recentGeneratedQuestions[0].options[0] = 0; },
    s => { s.currentQuestion.modeId = Next.MODE_ID; }
  ]) reject(infinite.state, mutate);
  for (const raw of ['bad json', 'null', '{}', '[]', '{"version":999}']) {
    storage.setItem(P.STORAGE_KEY, raw);
    assert.deepEqual(create({ storage }).state, initial);
  }
  storage.setItem(P.STORAGE_KEY, JSON.stringify(Next.createEngine({ storage: null }).state));
  assert.deepEqual(create({ storage }).state, initial);
});

test('events persist before delivery, are immutable and allow ordered reentrant acknowledgments', () => {
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
  assert.equal(engine.currentQuestion().questionId, 'before_006');
});

test('listener errors cannot undo commits, starve subscribers or drop the queued infinite-start event', () => {
  const engine = reachQuestion(create(), 5);
  let received = 0;
  const off = engine.subscribe(() => { throw Error('integration failed'); });
  engine.subscribe(() => { received += 1; });
  engine.attempt(engine.currentQuestion().correctAnswer);
  assert.throws(() => engine.finishFeedback(), /integration failed/);
  assert.equal(received, 1);
  assert.equal(engine.state.completedFixedQuestions, 5);
  assert.equal(engine.finishFeedback(), false);
  off();
  assert.equal(engine.completeInteraction(), true);
  const final = reachQuestion(create(), 100);
  solve(final);
  const events = [];
  final.subscribe(event => {
    if (event.type === P.EVENTS.INTERACTION_COMPLETE) {
      for (let i = 0; i < 5; i += 1) solve(final);
      throw Error('final ack listener');
    }
  }, { replay: false });
  final.subscribe(event => events.push(event), { replay: false });
  assert.throws(() => final.completeInteraction('before_fixed_phase_20'), /final ack listener/);
  assert.deepEqual(events.map(e => e.type), [P.EVENTS.INTERACTION_COMPLETE, P.EVENTS.INFINITE_START, P.EVENTS.INTERACTION_START]);
  assert.equal(events[1].state.completedInfiniteQuestions, 0);
  assert.equal(events[1].state.status, 'question');
  assert.equal(events[2].state.completedInfiniteQuestions, 5);
  assert.equal(final.state.pendingInteraction.checkpointId, 'before_infinite_5');
});

test('storage/RNG failures roll back answers, feedback, acknowledgments and interrupted feedback recovery', () => {
  const storage = memoryStorage();
  const realSet = storage.setItem;
  let failWrites = false;
  storage.setItem = (key, value) => { if (failWrites) throw Error('quota'); realSet(key, value); };
  const engine = create({ storage });
  for (const action of [() => engine.attempt(wrong(engine)), () => engine.attempt(engine.currentQuestion().correctAnswer)]) {
    const before = engine.state;
    failWrites = true;
    assert.throws(action, /quota/);
    assert.deepEqual(engine.state, before);
    assert.deepEqual(JSON.parse(storage.getItem(P.STORAGE_KEY)), before);
    failWrites = false;
  }
  engine.attempt(engine.currentQuestion().correctAnswer);
  let before = engine.state;
  failWrites = true;
  assert.throws(() => engine.finishFeedback(), /quota/);
  assert.throws(() => create({ storage }), /quota/);
  assert.deepEqual(engine.state, before);
  assert.deepEqual(JSON.parse(storage.getItem(P.STORAGE_KEY)), before);
  failWrites = false;
  engine.finishFeedback();
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
  retryable.attempt(retryable.currentQuestion().correctAnswer);
  before = retryable.state;
  badRandom = true;
  assert.throws(() => retryable.finishFeedback(), /random failed/);
  assert.deepEqual(retryable.state, before);
  assert.throws(() => create({ storage, random: () => { throw Error('recovery RNG'); } }), /recovery RNG/);
  assert.deepEqual(JSON.parse(storage.getItem(P.STORAGE_KEY)), before);
  badRandom = false;
  const recovered = create({ storage });
  assert.equal(recovered.state.completedInfiniteQuestions, 1);
  assert.equal(create({ storage }).state.completedInfiniteQuestions, 1);
});

test('invalid inputs and inaccessible storage fail explicitly without touching other mode saves', () => {
  assert.notEqual(P.STORAGE_KEY, Next.STORAGE_KEY);
  assert.notEqual(P.STORAGE_KEY, Counting.STORAGE_KEY);
  assert.throws(() => create({ storage: {} }), /getItem\/setItem/);
  assert.throws(() => create({ random: 7 }), /random must/);
  assert.throws(() => create().subscribe(null), /listener must/);
  assert.throws(() => create({ storage: { getItem() { throw Error('denied'); }, setItem() {} } }), /denied/);
  assert.throws(() => create({ storage: { getItem() { return null; }, setItem() { throw Error('quota'); } } }), /quota/);
  for (const args of [[0, 3, 1], [99, 3, 1], [100, 3, 1], [1, 2, 1], [1, 7, 1], [1, 3, 5]]) {
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
  assert.throws(() => P.adaptedRangeWeights(0), RangeError);
});