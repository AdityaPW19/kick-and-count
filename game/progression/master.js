(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SparkyMasterProgression = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'sparky-master-progression:v1';
  const STATES = Object.freeze(['TUTORIAL', 'PLAYING_QUESTION', 'GOAL_FEEDBACK',
    'SPARKY_INTERACTION', 'MODE_TRANSITION', 'INFINITE_PLAY']);
  const COUNTING = 'kick_and_count';
  const NEXT = 'what_comes_next';
  // Future adapters belong here when implemented, not in the routing algorithm.
  // No questions, tutorial implementations, or copies of engine saves live here.
  const registry = freeze([
    { id: COUNTING, playable: true }, { id: NEXT, playable: true },
    { id: 'what_came_before', playable: false }, { id: 'color_match', playable: false },
    { id: 'find_missing_number', playable: false }, { id: 'reach_target_score', playable: false }
  ]);
  const playableIds = registry.filter(mode => mode.playable).map(mode => mode.id);
  const ACTIONS = ['continue_mode', 'switch_mode', 'start_tutorial'];

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  function snapshot(value) { return freeze(clone(value)); }
  function playable(id) { return playableIds.includes(id); }
  function integer(value, min, max) { return Number.isSafeInteger(value) && value >= min && value <= max; }
  function text(value) { return typeof value === 'string' && value.length > 0 && value.length <= 256; }
  function keys(value, expected) {
    return !!value && typeof value === 'object' && !Array.isArray(value)
      && Object.keys(value).length === expected.length
      && expected.every(key => Object.prototype.hasOwnProperty.call(value, key));
  }
  function modeMap(value, predicate) {
    return keys(value, playableIds) && playableIds.every(id => predicate(value[id]));
  }
  function idFor(modeId, checkpointId) { return JSON.stringify([modeId, checkpointId]); }
  function initialState() {
    return {
      version: 1, activeModeId: COUNTING, masterState: 'TUTORIAL', stage: 'onboarding',
      availableOnboardingComplete: false, onboardingComplete: false, onboardingDeferred: false,
      tutorials: Object.fromEntries(playableIds.map(id => [id, false])),
      introductoryPhasesComplete: Object.fromEntries(playableIds.map(id => [id, false])),
      run: { phaseQuota: 2, completedPhases: 0 }, bag: [],
      pendingBreak: null, lastCompletedBreakId: null,
      lastCompletedCheckpoints: Object.fromEntries(playableIds.map(id => [id, null]))
    };
  }
  const ROUTE_KEYS = ['activeModeId', 'stage', 'availableOnboardingComplete',
    'onboardingComplete', 'onboardingDeferred', 'introductoryPhasesComplete', 'run', 'bag'];
  function validRoute(route) {
    if (!route || !playable(route.activeModeId)
      || !['onboarding', 'available_rotation'].includes(route.stage)
      || !modeMap(route.introductoryPhasesComplete, value => typeof value === 'boolean')
      || !keys(route.run, ['phaseQuota', 'completedPhases'])
      || !integer(route.run.phaseQuota, 1, 2)
      || !integer(route.run.completedPhases, 0, route.run.phaseQuota - 1)
      || !Array.isArray(route.bag) || !route.bag.every(playable)
      || new Set(route.bag).size !== route.bag.length) return false;
    const available = playableIds.every(id => route.introductoryPhasesComplete[id]);
    // Six-mode completion is deliberately distinct from the playable subset.
    const full = available && registry.every(mode => mode.playable);
    if (route.availableOnboardingComplete !== available || route.onboardingComplete !== full
      || route.onboardingDeferred !== (available && !full)
      || (route.stage === 'available_rotation') !== available) return false;
    if (!available) {
      const expected = playableIds.find(id => !route.introductoryPhasesComplete[id]);
      if (route.activeModeId !== expected || route.run.phaseQuota !== 2
        || route.run.completedPhases !== 0 || route.bag.length !== 0) return false;
    }
    return true;
  }
  function validState(state) {
    if (!keys(state, Object.keys(initialState())) || state.version !== 1
      || !STATES.includes(state.masterState) || !validRoute(state)
      || !modeMap(state.tutorials, value => typeof value === 'boolean')
      || !modeMap(state.lastCompletedCheckpoints, value => value === null || text(value))
      || !(state.lastCompletedBreakId === null || typeof state.lastCompletedBreakId === 'string')) return false;
    const pending = state.pendingBreak;
    if (pending === null) return true;
    return keys(pending, ['id', 'modeId', 'checkpointId', 'phaseId', 'nextModeId', 'nextAction', 'commit'])
      && pending.modeId === state.activeModeId && text(pending.checkpointId)
      && pending.id === idFor(pending.modeId, pending.checkpointId)
      && pending.id !== state.lastCompletedBreakId
      && state.lastCompletedCheckpoints[pending.modeId] !== pending.checkpointId
      && integer(pending.phaseId, 1, Number.MAX_SAFE_INTEGER)
      && playable(pending.nextModeId) && ACTIONS.includes(pending.nextAction)
      && keys(pending.commit, ROUTE_KEYS) && validRoute(pending.commit)
      && pending.commit.activeModeId === pending.nextModeId
      && (pending.nextAction === 'continue_mode') === (pending.modeId === pending.nextModeId)
      && state.masterState === 'SPARKY_INTERACTION';
  }
  function defaultStorage() {
    try { return typeof localStorage !== 'undefined' ? localStorage : null; }
    catch (_) { return null; }
  }

  /**
   * Pure routing controller; storage is a localStorage-shaped getItem/setItem pair
   * or null. Only STORAGE_KEY is touched. Storage failures propagate; failed
   * writes do not change this controller's in-memory state. Use one writer.
   * twoPhaseProbability defaults to .65 (otherwise one phase per mixed run).
   * State snapshots are deeply immutable. Engine snapshots are read-only inputs.
   */
  function createController({ storage = defaultStorage(), random = Math.random,
    twoPhaseProbability = 0.65 } = {}) {
    if (typeof random !== 'function') throw new TypeError('random must be a function.');
    if (!Number.isFinite(twoPhaseProbability) || twoPhaseProbability < 0 || twoPhaseProbability > 1) {
      throw new RangeError('twoPhaseProbability must be in [0, 1].');
    }
    if (storage !== null && (!storage || typeof storage.getItem !== 'function'
      || typeof storage.setItem !== 'function')) throw new TypeError('Invalid storage.');
    let state = initialState();
    if (storage) {
      const saved = storage.getItem(STORAGE_KEY);
      try {
        const parsed = JSON.parse(saved);
        if (validState(parsed)) state = parsed;
      } catch (_) { /* Missing, malformed, or incompatible save: reconcile from engine saves. */ }
    }
    function save(candidate) {
      if (storage) storage.setItem(STORAGE_KEY, JSON.stringify(candidate));
      state = candidate;
    }
    function update(candidate) {
      if (JSON.stringify(candidate) !== JSON.stringify(state)) save(candidate);
    }
    function unit() {
      const value = random();
      if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('Invalid random() result.');
      return value;
    }
    function quota() { return unit() < twoPhaseProbability ? 2 : 1; }
    function selectMode(candidate) {
      // A bag covers every playable mode before refill. At refill, swap a repeat
      // away from the head; do not discard it (which would bias larger registries).
      if (!candidate.bag.length) {
        candidate.bag = playableIds.slice();
        for (let i = candidate.bag.length - 1; i > 0; i -= 1) {
          const other = Math.floor(unit() * (i + 1));
          [candidate.bag[i], candidate.bag[other]] = [candidate.bag[other], candidate.bag[i]];
        }
      }
      const index = candidate.bag.findIndex(id => id !== candidate.activeModeId);
      if (index > 0) [candidate.bag[0], candidate.bag[index]] = [candidate.bag[index], candidate.bag[0]];
      candidate.activeModeId = candidate.bag.shift();
      candidate.run = { phaseQuota: quota(), completedPhases: 0 };
    }
    function finishAvailableOnboarding(candidate) {
      candidate.availableOnboardingComplete = true;
      candidate.onboardingComplete = registry.every(mode => mode.playable);
      candidate.onboardingDeferred = !candidate.onboardingComplete;
      candidate.stage = 'available_rotation';
      // Seed the bag with the other modes: the final onboarding run is already
      // the first visit of this coverage cycle.
      candidate.bag = playableIds.filter(id => id !== candidate.activeModeId);
      selectMode(candidate);
    }
    function routeFields(candidate) {
      return Object.fromEntries(ROUTE_KEYS.map(key => [key, clone(candidate[key])]));
    }
    function pendingPhaseTwo(engine, modeId) {
      const checkpoint = modeId === COUNTING ? 'fixed_phase_2' : 'next_fixed_phase_2';
      return !!engine && (engine.pendingInteraction?.checkpointId === checkpoint
        || (engine.phaseId === 2 && engine.status === 'interaction'));
    }
    function diagnostic(candidate, engine) {
      if (candidate.pendingBreak) return 'SPARKY_INTERACTION';
      if (engine?.status === 'interaction' || engine?.status === 'celebration') return 'SPARKY_INTERACTION';
      if (!candidate.tutorials[candidate.activeModeId]) return 'TUTORIAL';
      if (engine?.status === 'feedback') return 'GOAL_FEEDBACK';
      return engine?.mode === 'infinite' ? 'INFINITE_PLAY' : 'PLAYING_QUESTION';
    }
    save(state);
    return Object.freeze({
      get state() { return snapshot(state); },
      /**
       * Call at the game-loop boundary, passing counting.state and next.state
       * plus the real tutorial completion flags. True flags are sticky.
       * Returns {modeId, tutorialNeeded, masterState, stage, pendingBreak}.
       * Legacy >=9/10 saves migrate ONLY after their phase-2 interaction ack.
       * Pending master plans always win, even if the engine ack already saved.
       * This method NEVER implicitly commits a break or acknowledges an engine.
       */
      reconcile({ counting, next, countingTutorialCompleted, nextTutorialCompleted } = {}) {
        const candidate = clone(state);
        if (countingTutorialCompleted === true) candidate.tutorials[COUNTING] = true;
        if (nextTutorialCompleted === true) candidate.tutorials[NEXT] = true;
        if (!candidate.pendingBreak && candidate.stage === 'onboarding') {
          if (candidate.activeModeId === COUNTING && counting?.completedFixedQuestions >= 9
            && !pendingPhaseTwo(counting, COUNTING)) {
            candidate.introductoryPhasesComplete[COUNTING] = true;
            candidate.activeModeId = NEXT;
          }
          if (candidate.activeModeId === NEXT && next?.completedFixedQuestions >= 10
            && !pendingPhaseTwo(next, NEXT)) {
            candidate.introductoryPhasesComplete[NEXT] = true;
            finishAvailableOnboarding(candidate);
          }
        }
        const engine = candidate.activeModeId === COUNTING ? counting : next;
        candidate.masterState = diagnostic(candidate, engine);
        update(candidate);
        return snapshot({ modeId: state.activeModeId,
          tutorialNeeded: !state.pendingBreak && !state.tutorials[state.activeModeId]
            && state.masterState !== 'SPARKY_INTERACTION',
          masterState: state.masterState, stage: state.stage, pendingBreak: state.pendingBreak });
      },
      /**
       * Call ONLY for a real engine checkpoint AFTER successful goal feedback.
       * Persists an immutable plan BEFORE the director starts. Retry of the same
       * checkpoint returns the identical plan, including random choices/quota.
       * A different outstanding break is an integration error. The most recently
       * committed checkpoint per mode returns null (already handled).
       * phaseId alone cannot finish onboarding: the exact fixed-phase-2 engine
       * checkpoint must match. Champion: use counting checkpoint fixed_phase_17,
       * phaseId 17; main acknowledges it with engine.completeCelebration().
       */
      planBreak({ modeId, checkpointId, phaseId } = {}) {
        if (!playable(modeId) || !text(checkpointId) || !integer(phaseId, 1, Number.MAX_SAFE_INTEGER)) {
          throw new TypeError('Invalid playable mode/checkpoint/phase.');
        }
        const id = idFor(modeId, checkpointId);
        if (state.pendingBreak) {
          if (state.pendingBreak.id === id && state.pendingBreak.phaseId === phaseId) return snapshot(state.pendingBreak);
          throw new Error('Complete the pending break before planning another.');
        }
        if (state.lastCompletedCheckpoints[modeId] === checkpointId) return null;
        if (modeId !== state.activeModeId) throw new Error('Cannot plan a break for an inactive mode.');
        const route = clone(state);
        if (route.stage === 'onboarding') {
          const expected = modeId === COUNTING ? 'fixed_phase_2' : 'next_fixed_phase_2';
          if (phaseId === 2 && checkpointId === expected) {
            route.introductoryPhasesComplete[modeId] = true;
            const upcoming = playableIds.find(mode => !route.introductoryPhasesComplete[mode]);
            if (upcoming) route.activeModeId = upcoming;
            else finishAvailableOnboarding(route);
          }
        } else {
          // Count committed phase completions in this run, never absolute phase
          // numbers (infinite phases reuse phaseId; resumed fixed phases may be 17).
          route.run.completedPhases += 1;
          if (route.run.completedPhases >= route.run.phaseQuota) selectMode(route);
        }
        const nextModeId = route.activeModeId;
        const nextAction = nextModeId === modeId ? 'continue_mode'
          : state.tutorials[nextModeId] ? 'switch_mode' : 'start_tutorial';
        const candidate = clone(state);
        candidate.pendingBreak = { id, modeId, checkpointId, phaseId, nextModeId, nextAction,
          commit: routeFields(route) };
        candidate.masterState = 'SPARKY_INTERACTION';
        save(candidate);
        return snapshot(state.pendingBreak);
      },
      /**
       * AFTER presentation, main saves engine.completeInteraction(checkpointId),
       * then calls completeBreak(id). True means newly committed; stale/duplicate
       * callbacks return false without changing routing or consuming a quota.
       * Recovery: if engine.lastCompletedInteractionCheckpoint ===
       * state.pendingBreak.checkpointId, call this directly (do not replay director).
       * Counting champion has no engine ack marker: main may also recognize
       * checkpoint fixed_phase_17 + engine.mode === 'infinite'.
       */
      completeBreak(id) {
        if (!state.pendingBreak || state.pendingBreak.id !== id) return false;
        const candidate = clone(state);
        const pending = candidate.pendingBreak;
        Object.assign(candidate, pending.commit);
        candidate.pendingBreak = null;
        candidate.lastCompletedBreakId = pending.id;
        candidate.lastCompletedCheckpoints[pending.modeId] = pending.checkpointId;
        candidate.masterState = pending.nextModeId !== pending.modeId ? 'MODE_TRANSITION'
          : candidate.tutorials[candidate.activeModeId] ? 'PLAYING_QUESTION' : 'TUTORIAL';
        save(candidate);
        return true;
      },
      // Optional persisted presentation diagnostic; reconcile derives the next
      // loop's state from the active engine. Never unlocks an outstanding break.
      setState(masterState) {
        if (!STATES.includes(masterState)) throw new TypeError('Invalid master state.');
        if (state.pendingBreak && masterState !== 'SPARKY_INTERACTION') {
          throw new Error('Cannot leave an uncommitted interaction.');
        }
        const candidate = clone(state);
        candidate.masterState = masterState;
        update(candidate);
        return snapshot(state);
      }
    });
  }

  return freeze({ createController, registry, STATES, STORAGE_KEY });
});