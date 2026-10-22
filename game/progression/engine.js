(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SparkyProgression = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'sparky-counting-progression:v1';
  const EVENTS = Object.freeze({
    INTERACTION_START: 'SPARKY_INTERACTION_START',
    INTERACTION_COMPLETE: 'SPARKY_INTERACTION_COMPLETE',
    JOURNEY_COMPLETE: 'COUNTING_JOURNEY_COMPLETE',
    INFINITE_START: 'COUNTING_INFINITE_MODE_START'
  });
  const HISTORY_LIMIT = 20;
  const DIFFICULTIES = ['very_easy', 'easy', 'medium', 'hard'];
  const TARGETS = [
    [1, 2, 3, 2], [1, 3, 2, 3, 1], [4, 2, 5, 3, 4],
    [5, 1, 3, 2, 5], [4, 3, 2, 1, 5], [6, 7, 8, 9, 10],
    [4, 6, 3, 8, 5], [9, 7, 10, 2, 6], [1, 8, 10, 9, 7],
    [11, 12, 13, 14, 15], [8, 9, 10, 11, 12], [13, 14, 15, 6, 7],
    [11, 13, 15, 12, 14], [16, 17, 18, 19, 20],
    [11, 12, 13, 14, 15], [16, 18, 20, 17, 19], [8, 10, 15, 20, 18]
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
  function integer(value, min, max) {
    return Number.isInteger(value) && value >= min && value <= max;
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
    let remaining = unit(random) * weights.reduce((sum, weight) => sum + weight, 0);
    for (let index = 0; index < weights.length; index += 1) {
      remaining -= weights[index];
      if (remaining < 0) return index;
    }
    return weights.length - 1;
  }
  function shuffle(values, random) {
    const result = values.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
      const other = Math.floor(unit(random) * (index + 1));
      [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
  }

  // Distractors always draw from the complete numeral domain, not the phase range.
  function generateOptions(target, count, difficulty, random) {
    if (!integer(target, 1, 20) || !integer(count, 3, 6) || !integer(difficulty, 1, 4)) {
      throw new RangeError('Invalid target, option count, or difficulty.');
    }
    const candidates = Array.from({ length: 20 }, (_, index) => index + 1)
      .filter(value => value !== target);
    const options = [target];
    const power = [1.5, 0.5, -1, -2][difficulty - 1];
    while (options.length < count) {
      const weights = candidates.map(value => Math.pow(Math.abs(value - target), power));
      options.push(candidates.splice(weightedIndex(weights, random), 1)[0]);
    }
    return shuffle(options, random);
  }

  let nextId = 1;
  const phases = freeze(TARGETS.map((targets, index) => {
    const phaseId = index + 1;
    const startQuestion = nextId;
    nextId += targets.length;
    const difficultyLevel = phaseId <= 2 ? 1 : phaseId <= 9 ? 2 : phaseId <= 15 ? 3 : 4;
    return {
      phaseId, mode: 'counting', startQuestion, endQuestion: nextId - 1,
      targetNumbers: targets.slice(),
      optionCounts: targets.map((_, offset) => {
        const id = startQuestion + offset;
        return id <= 17 ? 3 : id <= 49 ? 4 : id <= 74 ? 5 : 6;
      }),
      difficulty: DIFFICULTIES[difficultyLevel - 1], difficultyLevel,
      onComplete: phaseId === 17
        ? { event: EVENTS.JOURNEY_COMPLETE, resumePhase: 18 }
        : { event: EVENTS.INTERACTION_START, resumePhase: phaseId + 1 }
    };
  }));

  function resolveQuestion(questionId, phaseId, targetCount, options, difficulty) {
    return {
      questionId, phaseId, targetCount, displayBallCount: targetCount, options,
      correctAnswer: targetCount, correctOptionIndex: options.indexOf(targetCount), difficulty
    };
  }
  function generateFixedQuestions() {
    return freeze(phases.flatMap(phase => phase.targetNumbers.map((target, offset) => {
      const id = phase.startQuestion + offset;
      return resolveQuestion(`count_${String(id).padStart(3, '0')}`, phase.phaseId, target,
        generateOptions(target, phase.optionCounts[offset], phase.difficultyLevel,
          seededRandom(0x53504152 + id * 7919)), phase.difficultyLevel);
    })));
  }
  const fixedQuestions = generateFixedQuestions();
  function configurationKey(question) {
    return `${question.targetCount}:${question.options.slice().sort((a, b) => a - b).join(',')}`;
  }

  // Guaranteed bounded fallback even for a constant injected RNG: more possible
  // combinations for any target than the entire recent-configuration window.
  function unusedOptions(target, count, recentKeys, seed) {
    const values = Array.from({ length: 20 }, (_, index) => index + 1)
      .filter(value => value !== target);
    const indexes = Array.from({ length: count - 1 }, (_, index) => index);
    for (;;) {
      const options = [target, ...indexes.map(index => values[index])];
      if (!recentKeys.has(configurationKey({ targetCount: target, options }))) {
        return shuffle(options, seededRandom(seed));
      }
      let index = indexes.length - 1;
      while (indexes[index] === values.length - indexes.length + index) index -= 1;
      indexes[index] += 1;
      for (let next = index + 1; next < indexes.length; next += 1) {
        indexes[next] = indexes[next - 1] + 1;
      }
    }
  }
  function generateInfiniteQuestion({ sequence, difficulty, recentQuestions = [], random = Math.random }) {
    if (!integer(sequence, 1, Number.MAX_SAFE_INTEGER) || !integer(difficulty, 1, 4)) {
      throw new RangeError('Invalid infinite sequence or difficulty.');
    }
    const recent = recentQuestions.slice(-HISTORY_LIMIT);
    const lastTarget = recent.length ? recent[recent.length - 1].targetCount : null;
    const targets = Array.from({ length: 20 }, (_, index) => index + 1)
      .filter(target => target !== lastTarget);
    const preferred = [4, 8, 13, 17][difficulty - 1];
    const weights = targets.map(target => 1 + 5 / (1 + Math.abs(target - preferred)));
    const target = targets[weightedIndex(weights, random)];
    const count = difficulty + 2;
    const recentKeys = new Set(recent.map(configurationKey));
    let options;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      options = generateOptions(target, count, difficulty, random);
      if (!recentKeys.has(configurationKey({ targetCount: target, options }))) break;
    }
    if (recentKeys.has(configurationKey({ targetCount: target, options }))) {
      options = unusedOptions(target, count, recentKeys, sequence);
    }
    return freeze(resolveQuestion(`infinite_${sequence}`, 18, target, options, difficulty));
  }

  function adaptDifficulty(difficulty, recentPerformance) {
    if (recentPerformance.length < 5) return difficulty;
    const successes = recentPerformance.slice(-5).filter(Boolean).length;
    if (successes === 5) return Math.min(4, difficulty + 1);
    if (successes <= 2) return Math.max(1, difficulty - 1);
    return difficulty;
  }

  function initialState() {
    return {
      version: 1, mode: 'fixed', status: 'question', phaseId: 1,
      currentFixedQuestionId: 'count_001', completedFixedQuestions: 0,
      journeyComplete: false, pendingInteraction: null,
      lastCompletedInteractionCheckpoint: null, celebrationPending: false,
      infiniteDifficulty: 1, infiniteCompletedSinceInteraction: 0,
      completedInfiniteQuestions: 0, recentPerformance: [], recentGeneratedQuestions: [],
      adaptiveEvaluationCount: 0, questionAttempts: 0,
      currentQuestion: clone(fixedQuestions[0])
    };
  }
  function validQuestion(question) {
    return question && typeof question.questionId === 'string'
      && integer(question.targetCount, 1, 20)
      && question.displayBallCount === question.targetCount
      && question.correctAnswer === question.targetCount
      && Array.isArray(question.options) && integer(question.options.length, 3, 6)
      && question.options.every(value => integer(value, 1, 20))
      && new Set(question.options).size === question.options.length
      && question.options[question.correctOptionIndex] === question.correctAnswer;
  }
  // Invalid or incompatible saves restart safely; valid saves are never rerolled.
  function validState(state) {
    if (!state || state.version !== 1 || !['fixed', 'infinite'].includes(state.mode)
      || !['question', 'feedback', 'interaction', 'celebration'].includes(state.status)
      || !integer(state.completedFixedQuestions, 0, 84)
      || !integer(state.completedInfiniteQuestions, 0, Number.MAX_SAFE_INTEGER)
      || !integer(state.questionAttempts, 0, Number.MAX_SAFE_INTEGER)
      || !integer(state.infiniteDifficulty, 1, 4)
      || !integer(state.infiniteCompletedSinceInteraction, 0, 5)
      || !integer(state.adaptiveEvaluationCount, 0, 4)
      || !Array.isArray(state.recentPerformance) || state.recentPerformance.length > 5
      || !state.recentPerformance.every(value => typeof value === 'boolean')
      || !Array.isArray(state.recentGeneratedQuestions) || state.recentGeneratedQuestions.length > HISTORY_LIMIT
      || !state.recentGeneratedQuestions.every(validQuestion)
      || state.journeyComplete !== (state.completedFixedQuestions === 84)
      || typeof state.celebrationPending !== 'boolean'
      || !(state.lastCompletedInteractionCheckpoint === null
        || typeof state.lastCompletedInteractionCheckpoint === 'string')) return false;
    if (state.mode === 'infinite' && (!state.journeyComplete || state.phaseId !== 18
      || state.currentFixedQuestionId !== null || state.celebrationPending)) return false;
    if (state.status === 'interaction') {
      const pending = state.pendingInteraction;
      if (state.currentQuestion !== null || !pending || pending.mode !== state.mode) return false;
      if (state.mode === 'fixed') {
        const phase = phases[state.phaseId - 1];
        return phase && phase.phaseId < 17 && state.completedFixedQuestions === phase.endQuestion
          && pending.checkpointId === `fixed_phase_${phase.phaseId}`
          && pending.resumePhase === phase.phaseId + 1 && !state.celebrationPending;
      }
      return state.infiniteCompletedSinceInteraction === 5
        && state.completedInfiniteQuestions > 0 && state.completedInfiniteQuestions % 5 === 0
        && pending.checkpointId === `infinite_${state.completedInfiniteQuestions}`;
    }
    if (state.pendingInteraction !== null) return false;
    if (state.status === 'celebration') {
      return state.mode === 'fixed' && state.journeyComplete && state.phaseId === 17
        && state.celebrationPending && state.currentQuestion === null;
    }
    if (state.celebrationPending || !validQuestion(state.currentQuestion)
      || (state.status === 'feedback' && state.questionAttempts < 1)) return false;
    if (state.mode === 'fixed') {
      const expected = fixedQuestions[state.completedFixedQuestions];
      return !!expected && state.phaseId === expected.phaseId
        && state.currentFixedQuestionId === expected.questionId
        && JSON.stringify(state.currentQuestion) === JSON.stringify(expected);
    }
    const last = state.recentGeneratedQuestions[state.recentGeneratedQuestions.length - 1];
    return state.infiniteCompletedSinceInteraction < 5 && state.currentQuestion.phaseId === 18
      && state.currentQuestion.questionId === `infinite_${state.completedInfiniteQuestions + 1}`
      && !!last && JSON.stringify(last) === JSON.stringify(state.currentQuestion);
  }
  function defaultStorage() {
    try { return typeof localStorage !== 'undefined' ? localStorage : null; }
    catch (_) { return null; }
  }
  function createEngine({ storage = defaultStorage(), random = Math.random } = {}) {
    if (typeof random !== 'function') throw new TypeError('random must be a function.');
    if (storage !== null && (typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function')) {
      throw new TypeError('storage must implement getItem/setItem, or be null.');
    }
    let state = initialState();
    if (storage) {
      // Storage access errors propagate instead of silently losing progress.
      const saved = storage.getItem(STORAGE_KEY);
      try {
        const parsed = JSON.parse(saved);
        if (validState(parsed)) state = parsed;
      } catch (_) { /* Missing, malformed, or incompatible save: clean journey. */ }
    }
    const listeners = new Set();
    const eventQueue = [];
    let dispatching = false;
    function persist() {
      if (storage) storage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    function eventFor(type, detail = {}, replayed = false) {
      return snapshot({ type, ...detail, replayed, state });
    }
    function emit(type, detail) {
      eventQueue.push(eventFor(type, detail));
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
      // A failing integration cannot prevent other listeners or persist/advance.
      if (firstError) throw firstError;
    }
    function spawnFixed() {
      state.currentQuestion = clone(fixedQuestions[state.completedFixedQuestions]);
      state.currentFixedQuestionId = state.currentQuestion.questionId;
      state.phaseId = state.currentQuestion.phaseId;
      state.questionAttempts = 0;
      state.status = 'question';
    }
    function spawnInfinite() {
      const question = generateInfiniteQuestion({
        sequence: state.completedInfiniteQuestions + 1, difficulty: state.infiniteDifficulty,
        recentQuestions: state.recentGeneratedQuestions, random
      });
      state.currentQuestion = clone(question);
      state.recentGeneratedQuestions = [...state.recentGeneratedQuestions, clone(question)].slice(-HISTORY_LIMIT);
      state.questionAttempts = 0;
      state.status = 'question';
    }
    function beginInteraction(phase) {
      state.status = 'interaction';
      state.currentQuestion = null;
      state.pendingInteraction = phase ? {
        checkpointId: `fixed_phase_${phase.phaseId}`, mode: 'fixed',
        phaseId: phase.phaseId, resumePhase: phase.onComplete.resumePhase
      } : {
        checkpointId: `infinite_${state.completedInfiniteQuestions}`, mode: 'infinite',
        phaseId: 18, resumePhase: 18
      };
    }
    function finishFeedback() {
      if (state.status !== 'feedback') return false;
      const firstAttempt = state.questionAttempts === 1;
      state.recentPerformance = [...state.recentPerformance, firstAttempt].slice(-5);
      let eventType = null;
      if (state.mode === 'fixed') {
        const phase = phases[state.phaseId - 1];
        state.completedFixedQuestions += 1;
        if (state.completedFixedQuestions === phase.endQuestion) {
          if (phase.onComplete.event === EVENTS.JOURNEY_COMPLETE) {
            state.journeyComplete = true;
            state.celebrationPending = true;
            state.currentFixedQuestionId = null;
            state.currentQuestion = null;
            state.status = 'celebration';
            eventType = EVENTS.JOURNEY_COMPLETE;
          } else {
            beginInteraction(phase);
            eventType = phase.onComplete.event;
          }
        } else spawnFixed();
      } else {
        state.completedInfiniteQuestions += 1;
        state.infiniteCompletedSinceInteraction += 1;
        state.adaptiveEvaluationCount += 1;
        if (state.adaptiveEvaluationCount === 5) {
          state.infiniteDifficulty = adaptDifficulty(state.infiniteDifficulty, state.recentPerformance);
          state.adaptiveEvaluationCount = 0;
        }
        if (state.infiniteCompletedSinceInteraction === 5) {
          beginInteraction(null);
          eventType = EVENTS.INTERACTION_START;
        } else spawnInfinite();
      }
      persist();
      if (eventType) emit(eventType, state.pendingInteraction ? { interaction: state.pendingInteraction } : {});
      return true;
    }
    const engine = {
      get state() { return snapshot(state); },
      currentQuestion() { return state.currentQuestion ? snapshot(state.currentQuestion) : null; },
      attempt(value) {
        if (state.status !== 'question') {
          return freeze({ accepted: false, correct: false, reason: 'not_answering' });
        }
        if (!Number.isInteger(value) || !state.currentQuestion.options.includes(value)) {
          return freeze({ accepted: false, correct: false, reason: 'invalid_option' });
        }
        state.questionAttempts += 1;
        const correct = value === state.currentQuestion.correctAnswer;
        if (correct) state.status = 'feedback';
        persist();
        return freeze({ accepted: true, correct, questionId: state.currentQuestion.questionId,
          attempts: state.questionAttempts });
      },
      finishFeedback,
      completeInteraction(checkpointId) {
        if (state.status !== 'interaction'
          || (checkpointId !== undefined && checkpointId !== state.pendingInteraction.checkpointId)) return false;
        const interaction = clone(state.pendingInteraction);
        state.lastCompletedInteractionCheckpoint = interaction.checkpointId;
        state.pendingInteraction = null;
        if (state.mode === 'infinite') {
          state.infiniteCompletedSinceInteraction = 0;
          spawnInfinite();
        } else spawnFixed();
        persist();
        emit(EVENTS.INTERACTION_COMPLETE, { interaction });
        return true;
      },
      completeCelebration() {
        if (state.status !== 'celebration') return false;
        state.celebrationPending = false;
        state.mode = 'infinite';
        state.phaseId = 18;
        state.infiniteCompletedSinceInteraction = 0;
        state.recentPerformance = [];
        state.adaptiveEvaluationCount = 0;
        spawnInfinite();
        persist();
        emit(EVENTS.INFINITE_START);
        return true;
      },
      subscribe(listener, { replay = true } = {}) {
        if (typeof listener !== 'function') throw new TypeError('listener must be a function.');
        listeners.add(listener);
        if (replay && state.status === 'interaction') {
          listener(eventFor(EVENTS.INTERACTION_START, { interaction: state.pendingInteraction }, true));
        } else if (replay && state.status === 'celebration') {
          listener(eventFor(EVENTS.JOURNEY_COMPLETE, {}, true));
        }
        return () => listeners.delete(listener);
      }
    };
    // Reopening means the old animation no longer exists. Commit its accepted
    // success exactly once; subscribe() replays any resulting pending checkpoint.
    if (state.status === 'feedback') finishFeedback();
    else persist();
    return Object.freeze(engine);
  }

  return freeze({
    createEngine, phases, fixedQuestions, generateFixedQuestions,
    generateInfiniteQuestion, generateOptions, adaptDifficulty, seededRandom,
    configurationKey, EVENTS, STORAGE_KEY, HISTORY_LIMIT
  });
});