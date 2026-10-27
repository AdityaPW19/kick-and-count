(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SparkyBeforeProgression = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Per-mode progression only: the shared gameplay owns physics, presentation,
  // feedback timing and scheduling, just as it does for next-engine.js.
  const MODE_ID = 'what_came_before';
  const STORAGE_KEY = 'sparky-before-progression:v1';
  const HISTORY_LIMIT = 20;
  const TOTAL_FIXED_QUESTIONS = 100;
  const DIFFICULTIES = ['very_easy', 'easy', 'medium', 'hard'];
  const EVENTS = Object.freeze({
    INTERACTION_START: 'SPARKY_INTERACTION_START',
    INTERACTION_COMPLETE: 'SPARKY_INTERACTION_COMPLETE',
    INFINITE_START: 'BEFORE_INFINITE_MODE_START'
  });
  const STARTERS = [
    [2, 3, 4, 5, 6], [4, 7, 5, 8, 9], [6, 8, 9, 10, 3], [10, 5, 7, 9, 10],
    [11, 12, 13, 14, 15], [16, 17, 18, 19, 20], [10, 20, 11, 15, 19], [13, 17, 20, 8, 16],
    [21, 22, 25, 28, 30], [23, 26, 29, 30, 31], [32, 35, 38, 40, 41], [43, 46, 49, 50, 36],
    [41, 50, 51, 55, 60], [52, 57, 60, 61, 65], [66, 68, 70, 71, 73], [59, 64, 69, 75, 60],
    [76, 79, 80, 81, 85], [86, 88, 90, 91, 95], [96, 97, 98, 99, 90], [10, 20, 50, 80, 99]
  ];
  const NUMBER_RANGES = [[2, 10], [11, 20], [21, 50], [51, 75], [76, 99]];
  const DEFAULT_RANGE_WEIGHTS = Object.freeze([20, 20, 25, 20, 15]);
  const RANGE_BIASES = [
    [1.8, 1.4, 1, 0.55, 0.3], [1.3, 1.2, 1, 0.85, 0.65],
    [0.8, 0.9, 1.2, 1.2, 1.15], [0.5, 0.65, 1, 1.5, 1.8]
  ];

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  function snapshot(value) { return freeze(clone(value)); }
  function integer(value, min, max) { return Number.isInteger(value) && value >= min && value <= max; }
  function same(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length
      && keys.every(key => Object.prototype.hasOwnProperty.call(b, key) && same(a[key], b[key]));
  }
  function seededRandom(seed) {
    let state = seed >>> 0;
    return function () {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }
  function unit(random) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError('random() must return a finite number in [0, 1).');
    }
    return value;
  }
  function weightedIndex(weights, random) {
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let remaining = unit(random) * total;
    let lastPositive = 0;
    for (let index = 0; index < weights.length; index += 1) {
      if (weights[index] > 0) lastPositive = index;
      remaining -= weights[index];
      if (remaining < 0) return index;
    }
    return lastPositive;
  }
  function shuffle(values, random) {
    const result = values.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
      const other = Math.floor(unit(random) * (index + 1));
      [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
  }
  function validateWeights(weights) {
    if (!Array.isArray(weights) || weights.length !== 5
      || !weights.every(weight => Number.isFinite(weight) && weight >= 0)
      || !Number.isFinite(weights.reduce((sum, weight) => sum + weight, 0))
      || !weights.some(weight => weight > 0)) throw new RangeError('Invalid rangeWeights.');
    return weights.slice();
  }
  function adaptedRangeWeights(difficulty, rangeWeights = DEFAULT_RANGE_WEIGHTS) {
    if (!integer(difficulty, 1, 4)) throw new RangeError('Invalid difficulty.');
    const weights = validateWeights(rangeWeights);
    // Normalize first to avoid overflow for large but valid caller-supplied weights.
    const max = Math.max(...weights);
    return weights.map((weight, index) => weight / max * RANGE_BIASES[difficulty - 1][index]);
  }

  // The first argument is the ANSWER, like counting's generateOptions(target, ...).
  // Accept 1 (2 -> 1); a far distractor prevents all-consecutive hard sets.
  function generateOptions(answer, count, difficulty, random = Math.random) {
    if (!integer(answer, 1, 98) || !integer(count, 3, 6) || !integer(difficulty, 1, 4)) {
      throw new RangeError('Invalid answer, option count, or difficulty.');
    }
    const candidates = Array.from({ length: 99 }, (_, index) => index + 1).filter(value => value !== answer);
    const options = [answer];
    function take(pool) {
      const power = [0.6, 0.1, -1, -2][difficulty - 1];
      const weights = pool.map(value => Math.pow(Math.abs(value - answer), power));
      const value = pool[weightedIndex(weights, random)];
      options.push(value);
      candidates.splice(candidates.indexOf(value), 1);
    }
    take(candidates.filter(value => Math.abs(value - answer) >= Math.max(4, count)));
    if (difficulty >= 2) take(candidates.filter(value => Math.abs(value - answer) <= 3));
    while (options.length < count) take(candidates);
    return shuffle(options, random);
  }

  const phases = freeze(STARTERS.map((startingNumbers, index) => {
    const phaseId = index + 1;
    const baseCount = phaseId <= 4 ? 3 : phaseId <= 10 ? 4 : phaseId <= 18 ? 5 : 6;
    const difficultyLevel = phaseId === 1 ? 1 : phaseId <= 8 ? 2 : phaseId <= 16 ? 3 : 4;
    return {
      modeId: MODE_ID, phaseId, startQuestion: index * 5 + 1, endQuestion: index * 5 + 5,
      startingNumbers: startingNumbers.slice(),
      optionCounts: startingNumbers.map((_, offset) => baseCount
        + ([4, 10, 18].includes(phaseId) && offset >= 3 ? 1 : 0)),
      difficulty: DIFFICULTIES[difficultyLevel - 1], difficultyLevel,
      onComplete: { event: EVENTS.INTERACTION_START, resumePhase: phaseId + 1 }
    };
  }));
  function resolveQuestion(questionId, phaseId, displayedNumber, options, difficulty) {
    const correctAnswer = displayedNumber - 1;
    return { questionId, modeId: MODE_ID, phaseId, displayedNumber, correctAnswer,
      optionCount: options.length, options, correctOptionIndex: options.indexOf(correctAnswer), difficulty };
  }
  function generateFixedQuestions() {
    return freeze(phases.flatMap(phase => phase.startingNumbers.map((number, offset) => {
      const id = phase.startQuestion + offset;
      return resolveQuestion(`before_${String(id).padStart(3, '0')}`, phase.phaseId, number,
        generateOptions(number - 1, phase.optionCounts[offset], phase.difficultyLevel,
          seededRandom(0x4245464f + id * 7919)), phase.difficultyLevel);
    })));
  }
  const fixedQuestions = generateFixedQuestions();
  function configurationKey(question) {
    // Reordering footballs is not considered a fresh question configuration.
    return `${question.displayedNumber}:${question.options.slice().sort((a, b) => a - b).join(',')}`;
  }
  function validQuestion(question) {
    return !!question && question.modeId === MODE_ID && typeof question.questionId === 'string'
      && integer(question.phaseId, 1, 21) && integer(question.displayedNumber, 2, 99)
      && question.correctAnswer === question.displayedNumber - 1
      && integer(question.difficulty, 1, 4) && Array.isArray(question.options)
      && integer(question.optionCount, 3, 6) && question.optionCount === question.options.length
      && question.options.every(value => integer(value, 1, 99))
      && new Set(question.options).size === question.optionCount
      && integer(question.correctOptionIndex, 0, question.optionCount - 1)
      && question.options[question.correctOptionIndex] === question.correctAnswer;
  }
  function unusedOptions(answer, count, recentKeys, seed) {
    const far = answer <= 50 ? 99 : 1;
    const values = Array.from({ length: 99 }, (_, index) => index + 1)
      .filter(value => value !== answer && value !== far);
    const indexes = Array.from({ length: count - 2 }, (_, index) => index);
    // Each candidate is distinct; H+1 candidates cannot all occur in a window of H.
    for (let attempt = 0; attempt <= recentKeys.size; attempt += 1) {
      const options = [answer, far, ...indexes.map(index => values[index])];
      if (!recentKeys.has(configurationKey({ displayedNumber: answer + 1, options }))) {
        return shuffle(options, seededRandom(seed));
      }
      let index = indexes.length - 1;
      while (index >= 0 && indexes[index] === values.length - indexes.length + index) index -= 1;
      if (index < 0) break;
      indexes[index] += 1;
      for (let next = index + 1; next < indexes.length; next += 1) indexes[next] = indexes[next - 1] + 1;
    }
    throw new Error('Recent configuration window exhausted.');
  }
  function generateInfiniteQuestion({ sequence, difficulty, recentQuestions = [], random = Math.random,
    rangeWeights = DEFAULT_RANGE_WEIGHTS }) {
    if (!integer(sequence, 1, Number.MAX_SAFE_INTEGER) || !integer(difficulty, 1, 4)
      || !Array.isArray(recentQuestions) || !recentQuestions.every(validQuestion)) {
      throw new RangeError('Invalid infinite sequence, difficulty, or history.');
    }
    const recent = recentQuestions.slice(-HISTORY_LIMIT);
    const last = recent.length ? recent[recent.length - 1].displayedNumber : null;
    const weights = adaptedRangeWeights(difficulty, rangeWeights);
    const range = NUMBER_RANGES[weightedIndex(weights, random)];
    const numbers = Array.from({ length: range[1] - range[0] + 1 }, (_, index) => range[0] + index)
      .filter(number => number !== last);
    const number = numbers[Math.floor(unit(random) * numbers.length)];
    const count = difficulty + 2;
    const recentKeys = new Set(recent.map(configurationKey));
    let options;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      options = generateOptions(number - 1, count, difficulty, random);
      if (!recentKeys.has(configurationKey({ displayedNumber: number, options }))) break;
    }
    if (recentKeys.has(configurationKey({ displayedNumber: number, options }))) {
      options = unusedOptions(number - 1, count, recentKeys, sequence);
    }
    return freeze(resolveQuestion(`before_infinite_${sequence}`, 21, number, options, difficulty));
  }
  function adaptDifficulty(difficulty, recentPerformance) {
    if (!integer(difficulty, 1, 4) || !Array.isArray(recentPerformance)
      || !recentPerformance.every(value => typeof value === 'boolean')) throw new RangeError('Invalid performance.');
    if (recentPerformance.length < 5) return difficulty;
    const successes = recentPerformance.slice(-5).filter(Boolean).length;
    if (successes === 5) return Math.min(4, difficulty + 1);
    if (successes <= 2) return Math.max(1, difficulty - 1);
    return difficulty;
  }

  function initialState() {
    return {
      version: 1, modeId: MODE_ID, mode: 'fixed', status: 'question', phaseId: 1,
      total100: TOTAL_FIXED_QUESTIONS, completedFixedQuestions: 0,
      currentFixedQuestionId: 'before_001', completedInfiniteQuestions: 0,
      infiniteCompletedSinceInteraction: 0, infiniteDifficulty: 1, adaptiveEvaluationCount: 0,
      recentPerformance: [], recentGeneratedQuestions: [], questionAttempts: 0,
      currentQuestion: clone(fixedQuestions[0]), pendingInteraction: null,
      lastCompletedInteractionCheckpoint: null
    };
  }
  function checkpoint(mode, count) {
    return mode === 'fixed' ? `before_fixed_phase_${count / 5}` : `before_infinite_${count}`;
  }
  function interactionFor(mode, count) {
    const phaseId = mode === 'fixed' ? count / 5 : 21;
    return { checkpointId: checkpoint(mode, count), modeId: MODE_ID, mode, phaseId,
      resumePhase: mode === 'fixed' ? phaseId + 1 : 21 };
  }
  // Validate relationships as well as field types: saves cannot skip a checkpoint,
  // substitute a fixed question, forge a predecessor, or replay an infinite sequence.
  function validState(state) {
    if (!state || state.version !== 1 || state.modeId !== MODE_ID || state.total100 !== 100
      || !['fixed', 'infinite'].includes(state.mode) || !['question', 'feedback', 'interaction'].includes(state.status)
      || !integer(state.completedFixedQuestions, 0, 100)
      || !integer(state.completedInfiniteQuestions, 0, Number.MAX_SAFE_INTEGER - 1)
      || !integer(state.questionAttempts, 0, Number.MAX_SAFE_INTEGER - 1)
      || !integer(state.infiniteDifficulty, 1, 4) || !integer(state.adaptiveEvaluationCount, 0, 4)
      || !integer(state.infiniteCompletedSinceInteraction, 0, 5)
      || !Array.isArray(state.recentPerformance) || state.recentPerformance.length > 5
      || !state.recentPerformance.every(value => typeof value === 'boolean')
      || !Array.isArray(state.recentGeneratedQuestions) || state.recentGeneratedQuestions.length > HISTORY_LIMIT
      || !state.recentGeneratedQuestions.every(validQuestion)) return false;
    const interaction = state.status === 'interaction';
    const completed = state.mode === 'fixed' ? state.completedFixedQuestions : state.completedInfiniteQuestions;
    const lastAcknowledged = Math.floor(completed / 5) * 5 - (interaction ? 5 : 0);
    const expectedLast = lastAcknowledged > 0 ? checkpoint(state.mode, lastAcknowledged)
      : state.mode === 'infinite' ? 'before_fixed_phase_20' : null;
    if (state.lastCompletedInteractionCheckpoint !== expectedLast) return false;
    if (state.recentPerformance.length !== Math.min(completed, 5)) return false;
    if (interaction) {
      if (completed === 0 || completed % 5 !== 0 || state.currentQuestion !== null
        || state.questionAttempts < 1 || state.recentPerformance[state.recentPerformance.length - 1] !== (state.questionAttempts === 1)
        || !same(state.pendingInteraction, interactionFor(state.mode, completed))) return false;
    } else if (state.pendingInteraction !== null || !validQuestion(state.currentQuestion)
      || (state.status === 'feedback' && state.questionAttempts < 1)) return false;
    if (state.mode === 'fixed') {
      if (state.completedInfiniteQuestions !== 0 || state.infiniteCompletedSinceInteraction !== 0
        || state.infiniteDifficulty !== 1 || state.adaptiveEvaluationCount !== 0
        || state.recentGeneratedQuestions.length !== 0) return false;
      if (interaction) return state.phaseId === completed / 5 && state.currentFixedQuestionId === null;
      const expected = fixedQuestions[completed];
      return !!expected && state.phaseId === expected.phaseId && state.currentFixedQuestionId === expected.questionId
        && same(state.currentQuestion, expected);
    }
    if (state.completedFixedQuestions !== 100 || state.phaseId !== 21 || state.currentFixedQuestionId !== null
      || state.adaptiveEvaluationCount !== completed % 5
      || state.infiniteCompletedSinceInteraction !== (interaction ? 5 : completed % 5)) return false;
    const generated = completed + (interaction ? 0 : 1);
    const history = state.recentGeneratedQuestions;
    if (history.length !== Math.min(generated, HISTORY_LIMIT)) return false;
    const keys = new Set();
    for (let index = 0; index < history.length; index += 1) {
      const question = history[index];
      const key = configurationKey(question);
      if (question.phaseId !== 21 || question.questionId !== `before_infinite_${generated - history.length + index + 1}`
        || question.optionCount !== question.difficulty + 2 || keys.has(key)
        || (index > 0 && history[index - 1].displayedNumber === question.displayedNumber)) return false;
      keys.add(key);
    }
    return interaction || (same(state.currentQuestion, history[history.length - 1])
      && state.currentQuestion.difficulty === state.infiniteDifficulty);
  }
  function defaultStorage() {
    try { return typeof localStorage !== 'undefined' ? localStorage : null; }
    catch (_) { return null; }
  }
  function createEngine({ storage = defaultStorage(), random = Math.random,
    rangeWeights = DEFAULT_RANGE_WEIGHTS } = {}) {
    if (typeof random !== 'function') throw new TypeError('random must be a function.');
    if (storage !== null && (typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function')) {
      throw new TypeError('storage must implement getItem/setItem, or be null.');
    }
    const weights = validateWeights(rangeWeights);
    let state = initialState();
    if (storage) {
      const saved = storage.getItem(STORAGE_KEY); // Access failures never silently overwrite progress.
      try {
        const parsed = JSON.parse(saved);
        if (validState(parsed)) state = parsed;
      } catch (_) { /* Missing/malformed/incompatible saves start safely. */ }
    }
    const listeners = new Set();
    const eventQueue = [];
    let dispatching = false;
    function persist() { if (storage) storage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    function transaction(change) {
      const previous = clone(state);
      try { change(); persist(); }
      catch (error) { state = previous; throw error; }
    }
    function eventFor(type, detail = {}, replayed = false) { return snapshot({ type, modeId: MODE_ID, ...detail, replayed, state }); }
    function emit(type, detail, followingType) {
      eventQueue.push(eventFor(type, detail));
      // Queue both final-transition snapshots before invoking integrations. A
      // reentrant listener or a listener error must not lose INFINITE_START.
      if (followingType) eventQueue.push(eventFor(followingType));
      if (dispatching) return;
      dispatching = true;
      let firstError;
      try {
        while (eventQueue.length) {
          const event = eventQueue.shift();
          for (const listener of Array.from(listeners)) {
            try { listener(event); } catch (error) { firstError = firstError || error; }
          }
        }
      } finally { dispatching = false; }
      if (firstError) throw firstError;
    }
    function spawn() {
      if (state.mode === 'fixed') {
        state.currentQuestion = clone(fixedQuestions[state.completedFixedQuestions]);
        state.currentFixedQuestionId = state.currentQuestion.questionId;
        state.phaseId = state.currentQuestion.phaseId;
      } else {
        const question = generateInfiniteQuestion({ sequence: state.completedInfiniteQuestions + 1,
          difficulty: state.infiniteDifficulty, recentQuestions: state.recentGeneratedQuestions, random,
          rangeWeights: weights });
        state.currentQuestion = clone(question);
        state.recentGeneratedQuestions = [...state.recentGeneratedQuestions, clone(question)].slice(-HISTORY_LIMIT);
      }
      state.questionAttempts = 0;
      state.status = 'question';
    }
    function finishFeedback() {
      if (state.status !== 'feedback') return false;
      let startsInteraction = false;
      transaction(() => {
        state.recentPerformance = [...state.recentPerformance, state.questionAttempts === 1].slice(-5);
        if (state.mode === 'fixed') state.completedFixedQuestions += 1;
        else {
          state.completedInfiniteQuestions += 1;
          state.infiniteCompletedSinceInteraction += 1;
          state.adaptiveEvaluationCount = state.completedInfiniteQuestions % 5;
          if (state.adaptiveEvaluationCount === 0) {
            state.infiniteDifficulty = adaptDifficulty(state.infiniteDifficulty, state.recentPerformance);
          }
        }
        const completed = state.mode === 'fixed' ? state.completedFixedQuestions : state.completedInfiniteQuestions;
        if (completed % 5 === 0) {
          state.status = 'interaction';
          state.currentQuestion = null;
          state.currentFixedQuestionId = null;
          state.pendingInteraction = interactionFor(state.mode, completed);
          startsInteraction = true;
        } else spawn();
      });
      if (startsInteraction) emit(EVENTS.INTERACTION_START, { interaction: state.pendingInteraction });
      return true;
    }
    const engine = {
      get state() { return snapshot(state); },
      currentQuestion() { return state.currentQuestion ? snapshot(state.currentQuestion) : null; },
      attempt(value) {
        if (state.status !== 'question') return freeze({ accepted: false, correct: false, reason: 'not_answering' });
        if (!Number.isInteger(value) || !state.currentQuestion.options.includes(value)) {
          return freeze({ accepted: false, correct: false, reason: 'invalid_option' });
        }
        const correct = value === state.currentQuestion.correctAnswer;
        transaction(() => { state.questionAttempts += 1; if (correct) state.status = 'feedback'; });
        return freeze({ accepted: true, correct, questionId: state.currentQuestion.questionId, attempts: state.questionAttempts });
      },
      finishFeedback,
      completeInteraction(checkpointId) {
        if (state.status !== 'interaction'
          || (checkpointId !== undefined && checkpointId !== state.pendingInteraction.checkpointId)) return false;
        const interaction = clone(state.pendingInteraction);
        const startsInfinite = state.mode === 'fixed' && state.completedFixedQuestions === 100;
        transaction(() => {
          state.lastCompletedInteractionCheckpoint = interaction.checkpointId;
          state.pendingInteraction = null;
          if (startsInfinite) {
            state.mode = 'infinite';
            state.phaseId = 21;
            state.recentPerformance = [];
          }
          if (state.mode === 'infinite') state.infiniteCompletedSinceInteraction = 0;
          spawn();
        });
        emit(EVENTS.INTERACTION_COMPLETE, { interaction }, startsInfinite ? EVENTS.INFINITE_START : null);
        return true;
      },
      subscribe(listener, { replay = true } = {}) {
        if (typeof listener !== 'function') throw new TypeError('listener must be a function.');
        listeners.add(listener);
        if (replay && state.status === 'interaction') {
          try { listener(eventFor(EVENTS.INTERACTION_START, { interaction: state.pendingInteraction }, true)); }
          catch (error) { listeners.delete(listener); throw error; }
        }
        return () => listeners.delete(listener);
      }
    };
    // The old presentation cannot survive reopening: commit its accepted success once.
    if (state.status === 'feedback') finishFeedback();
    else persist();
    return Object.freeze(engine);
  }

  return freeze({ createEngine, phases, fixedQuestions, generateFixedQuestions, generateInfiniteQuestion,
    generateOptions, adaptDifficulty, adaptedRangeWeights, seededRandom, configurationKey,
    MODE_ID, EVENTS, STORAGE_KEY, HISTORY_LIMIT, TOTAL_FIXED_QUESTIONS, DEFAULT_RANGE_WEIGHTS });
});