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
  const BEFORE = 'what_came_before';
  const VERSION = 2;
  const legacyIds = [COUNTING, NEXT];
  // Future adapters belong here when implemented, not in the routing algorithm.
  // No questions, tutorial implementations, or copies of engine saves live here.
  const registry = freeze([
    { id: COUNTING, playable: true }, { id: NEXT, playable: true },
    { id: BEFORE, playable: true }, { id: 'color_match', playable: false },
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
  function modeMap(value, predicate, ids = playableIds) {
    return keys(value, ids) && ids.every(id => predicate(value[id]));
  }
  function idFor(modeId, checkpointId) { return JSON.stringify([modeId, checkpointId]); }
  function initialState() {
    return {
      version: VERSION, activeModeId: COUNTING, masterState: 'TUTORIAL', stage: 'onboarding',
      availableOnboardingComplete: false, onboardingComplete: false, onboardingDeferred: false,
      tutorials: Object.fromEntries(playableIds.map(id => [id, false])),
      introductoryPhasesComplete: Object.fromEntries(playableIds.map(id => [id, false])),
      run: { phaseQuota: 2, completedPhases: 0 }, bag: [], deferredModeId: null,
      legacyIntroductionPending: false,
      pendingBreak: null, lastCompletedBreakId: null,
      lastCompletedCheckpoints: Object.fromEntries(playableIds.map(id => [id, null]))
    };
  }
  const LEGACY_ROUTE_KEYS = ['activeModeId', 'stage', 'availableOnboardingComplete',
    'onboardingComplete', 'onboardingDeferred', 'introductoryPhasesComplete', 'run', 'bag'];
  const ROUTE_KEYS = [...LEGACY_ROUTE_KEYS, 'deferredModeId', 'legacyIntroductionPending'];
  function validRoute(route, legacy = false) {
    const ids = legacy ? legacyIds : playableIds;
    const bridge = !legacy && route?.legacyIntroductionPending === true;
    const eligible = bridge ? legacyIds : ids;
    if (!route || !eligible.includes(route.activeModeId)
      || !['onboarding', 'available_rotation'].includes(route.stage)
      || !modeMap(route.introductoryPhasesComplete, value => typeof value === 'boolean', ids)
      || !keys(route.run, ['phaseQuota', 'completedPhases'])
      || !integer(route.run.phaseQuota, 1, 2)
      || !integer(route.run.completedPhases, 0, route.run.phaseQuota - 1)
      || !Array.isArray(route.bag) || !route.bag.every(id => eligible.includes(id))
      || new Set(route.bag).size !== route.bag.length) return false;
    if (!legacy && (typeof route.legacyIntroductionPending !== 'boolean'
      || !(route.deferredModeId === null || (eligible.includes(route.deferredModeId)
        && route.deferredModeId !== route.activeModeId))
      || (bridge && (route.stage !== 'available_rotation'
        || route.introductoryPhasesComplete[BEFORE] !== false)))) return false;
    const available = eligible.every(id => route.introductoryPhasesComplete[id]);
    // Six-mode completion is deliberately distinct from the playable subset.
    const full = false; // Three future adapters remain unavailable (also true for v1).
    if (route.availableOnboardingComplete !== available || route.onboardingComplete !== full
      || route.onboardingDeferred !== (available && !full)
      || (route.stage === 'available_rotation') !== available) return false;
    if (!available) {
      const expected = ids.find(id => !route.introductoryPhasesComplete[id]);
      if (route.activeModeId !== expected || route.run.phaseQuota !== 2
        || route.run.completedPhases !== 0 || route.bag.length !== 0
        || (!legacy && route.deferredModeId !== null)) return false;
    }
    return true;
  }
  function validState(state, legacy = false) {
    const ids = legacy ? legacyIds : playableIds;
    const stateKeys = Object.keys(initialState()).filter(key => !legacy
      || !['deferredModeId', 'legacyIntroductionPending'].includes(key));
    if (!keys(state, stateKeys) || state.version !== (legacy ? 1 : VERSION)
      || !STATES.includes(state.masterState) || !validRoute(state, legacy)
      || !modeMap(state.tutorials, value => typeof value === 'boolean', ids)
      || !modeMap(state.lastCompletedCheckpoints, value => value === null || text(value), ids)
      || !(state.lastCompletedBreakId === null || typeof state.lastCompletedBreakId === 'string')) return false;
    const pending = state.pendingBreak;
    if (pending === null) return true;
    return keys(pending, ['id', 'modeId', 'checkpointId', 'phaseId', 'nextModeId', 'nextAction', 'commit'])
      && pending.modeId === state.activeModeId && text(pending.checkpointId)
      && pending.id === idFor(pending.modeId, pending.checkpointId)
      && pending.id !== state.lastCompletedBreakId
      && state.lastCompletedCheckpoints[pending.modeId] !== pending.checkpointId
      && integer(pending.phaseId, 1, Number.MAX_SAFE_INTEGER)
      && ids.includes(pending.nextModeId) && ACTIONS.includes(pending.nextAction)
      && keys(pending.commit, legacy ? LEGACY_ROUTE_KEYS : ROUTE_KEYS) && validRoute(pending.commit, legacy)
      && pending.commit.activeModeId === pending.nextModeId
      && (pending.nextAction === 'continue_mode') === (pending.modeId === pending.nextModeId)
      && state.masterState === 'SPARKY_INTERACTION';
  }
  function migrateLegacy(saved) {
    // Validate the ORIGINAL two-mode schema before adding any keys. A pending
    // plan is augmented, never recomputed: its route, quota and action are final.
    const candidate = clone(saved);
    function extendRoute(route) {
      route.introductoryPhasesComplete[BEFORE] = false;
      route.deferredModeId = null;
      route.legacyIntroductionPending = route.stage === 'available_rotation';
    }
    extendRoute(candidate);
    if (candidate.pendingBreak) extendRoute(candidate.pendingBreak.commit);
    candidate.version = VERSION;
    candidate.tutorials[BEFORE] = false;
    candidate.lastCompletedCheckpoints[BEFORE] = null;
    return candidate;
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
        else if (validState(parsed, true)) state = migrateLegacy(parsed);
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
      const ids = candidate.legacyIntroductionPending ? legacyIds : playableIds;
      // Service the previous cycle's deferred token first. Every shuffled token
      // is consumed exactly once, including a singleton equal to the current
      // mode. That singleton borrows a different token from the next full bag;
      // its own token is persisted separately and served on the following run.
      if (candidate.deferredModeId !== null) {
        candidate.activeModeId = candidate.deferredModeId;
        candidate.deferredModeId = null;
        candidate.run = { phaseQuota: quota(), completedPhases: 0 };
        return;
      }
      if (candidate.bag.length === 1 && candidate.bag[0] === candidate.activeModeId && ids.length > 1) {
        candidate.deferredModeId = candidate.bag.shift();
      }
      if (!candidate.bag.length) {
        candidate.bag = ids.slice();
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
      const checkpoint = phaseTwoCheckpoint(modeId);
      return !!engine && (engine.pendingInteraction?.checkpointId === checkpoint
        || (engine.phaseId === 2 && engine.status === 'interaction'));
    }
    function phaseTwoCheckpoint(modeId) {
      return modeId === COUNTING ? 'fixed_phase_2'
        : modeId === NEXT ? 'next_fixed_phase_2' : 'before_fixed_phase_2';
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
        * Call at the game-loop boundary, passing counting/next/before.state
       * plus the real tutorial completion flags. True flags are sticky.
       * Returns {modeId, tutorialNeeded, masterState, stage, pendingBreak}.
       * Legacy >=9/10 saves migrate ONLY after their phase-2 interaction ack.
       * Pending master plans always win, even if the engine ack already saved.
       * This method NEVER implicitly commits a break or acknowledges an engine.
       */
      reconcile({ counting, next, before, countingTutorialCompleted, nextTutorialCompleted,
        beforeTutorialCompleted } = {}) {
        const candidate = clone(state);
        const engines = { [COUNTING]: counting, [NEXT]: next, [BEFORE]: before };
        if (countingTutorialCompleted === true) candidate.tutorials[COUNTING] = true;
        if (nextTutorialCompleted === true) candidate.tutorials[NEXT] = true;
        if (beforeTutorialCompleted === true) candidate.tutorials[BEFORE] = true;
        // A v1 rotation is a temporary bridge, not three-mode completion. Keep
        // feedback, interaction/champion and any saved plan parked until ack.
        // At the next safe question boundary introduce before, parking (never
        // copying or consuming) the chosen legacy question. Missing snapshots
        // are NOT evidence of a safe boundary. completeBreak itself never reroutes.
        if (!candidate.pendingBreak && candidate.legacyIntroductionPending
          && engines[candidate.activeModeId]?.status === 'question') {
          candidate.legacyIntroductionPending = false;
          candidate.activeModeId = BEFORE;
          candidate.stage = 'onboarding';
          candidate.availableOnboardingComplete = false;
          candidate.onboardingComplete = false;
          candidate.onboardingDeferred = false;
          candidate.run = { phaseQuota: 2, completedPhases: 0 };
          candidate.bag = [];
          candidate.deferredModeId = null;
        }
        if (!candidate.pendingBreak && candidate.stage === 'onboarding') {
          for (const id of playableIds) {
            if (candidate.activeModeId === id && engines[id]?.completedFixedQuestions >= (id === COUNTING ? 9 : 10)
              && !pendingPhaseTwo(engines[id], id)) {
              candidate.introductoryPhasesComplete[id] = true;
              const upcoming = playableIds.find(mode => !candidate.introductoryPhasesComplete[mode]);
              if (upcoming) candidate.activeModeId = upcoming;
              else finishAvailableOnboarding(candidate);
            }
          }
        }
        const engine = engines[candidate.activeModeId];
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
          const expected = phaseTwoCheckpoint(modeId);
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

  return freeze({ createController, registry, STATES, STORAGE_KEY, VERSION });
});