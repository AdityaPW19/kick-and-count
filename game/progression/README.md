# Counting progression

Standalone, presentation-independent counting journey. No dependencies, UI changes,
DOM access, shooting logic, timers, or animation implementation.

## Loading

Load [engine.js](engine.js) as one ordinary browser script before the integration
script. It exposes `globalThis.SparkyProgression`. Node can use
`require('./game/progression/engine.js')` from the counting project directory.

Create an instance with `SparkyProgression.createEngine({ storage, random })`.

- `storage`: synchronous localStorage-compatible `getItem(key)` / `setItem(key, string)`.
  Defaults to browser `localStorage` when accessible; otherwise no persistence.
  Pass `null` for an in-memory session. The exported `STORAGE_KEY` is
  `sparky-counting-progression:v1`. One live engine should own each storage key.
- `random`: function returning a finite number in `[0, 1)`, default `Math.random`.
  Only infinite generation uses this injection. `seededRandom(seed)` is exported
  for deterministic tests. The current question is persisted, not regenerated;
  a caller's RNG internal state is not serialized.

## Engine API

| Member | Contract |
| --- | --- |
| `engine.state` | Detached, recursively frozen snapshot of all progression state. |
| `currentQuestion()` | Detached frozen question, or `null` during interaction/celebration. During feedback it returns the accepted question, **not** a new question. |
| `attempt(value)` | Numeral, not option index. Returns `{accepted, correct, questionId, attempts}` for an offered integer option. Wrong answers persist attempts and keep the question. Correct answers enter `feedback`, without incrementing completion counters or emitting a checkpoint. |
| `finishFeedback()` | Call after the accepted goal animation and feedback finish. Commits the success once and advances or emits the phase checkpoint. Returns `true` if committed, otherwise `false`. |
| `completeInteraction(checkpointId?)` | Acknowledges the active placeholder interaction, persists its completion, resets the infinite break counter if appropriate, spawns the next question, and emits completion. Optional checkpoint ID rejects stale callbacks. Returns `false` outside an interaction or for a mismatched ID. |
| `completeCelebration()` | Acknowledges the pending champion celebration, persists infinite mode, spawns its first question, emits infinite-start. Otherwise returns `false`. |
| `subscribe(listener, {replay = true} = {})` | Synchronous event subscription; returns an unsubscribe function. Replays a currently pending interaction-start or journey-complete immediately to this subscriber. Use `{replay:false}` for logging without replay. |

Rejected attempts return `{accepted:false, correct:false, reason}` where `reason`
is `invalid_option` or `not_answering`. They never change attempts or counters.
Once correct, all further attempts are rejected until the next question.

### Animation handoff and recovery

The integration owns the animation clock: after a correct attempt, await its
goal/feedback animation and invoke `finishFeedback()` in a **finally** path, including
cancelled/failed animations. There is deliberately no timeout that could fire a
checkpoint before an animation finishes. Calling it repeatedly is harmless while
not in feedback. Do not carry old animation callbacks into later questions.

If the app closes during accepted feedback, construction on reopening commits that
success exactly once, since the old animation no longer exists. If that commit
lands on a checkpoint, `subscribe()` replays the pending event. Closing during
an interaction or celebration restores that exact pending state; it never silently
skips the experience. No next question is generated while either is active.

There is no separate pending-to-active acknowledgement: `status:'interaction'`
means the checkpoint is pending **or** its external presentation is active. A
restored subscription launches/resumes that same checkpoint, not a new one. Use
`interaction.checkpointId` to deduplicate presentation work. Attach a single owner
for the interaction presentation; any number of telemetry subscribers can opt out
of replay. No actual mascot interaction is implemented here.

### Events

Events are frozen objects `{type, replayed, state, interaction?}`. Changes are
persisted **before** normal event delivery. `state` is the snapshot at the event's
transition. Reentrant events are queued in order so all subscribers receive start
before complete. Listener exceptions are rethrown after other listeners receive
queued events; they do not undo persisted transitions.

| Exact event type | When |
| --- | --- |
| `SPARKY_INTERACTION_START` | After feedback at the ends of fixed phases 1–16, or every five completed infinite questions. Includes `interaction`. |
| `SPARKY_INTERACTION_COMPLETE` | On explicit interaction acknowledgement, after the next question is ready. Includes the completed `interaction`. |
| `COUNTING_JOURNEY_COMPLETE` | After question 84 feedback, instead of a normal interaction. Waits for champion celebration acknowledgement. |
| `COUNTING_INFINITE_MODE_START` | Only when `completeCelebration()` transitions to infinite mode. Not replayed on future infinite sessions. |

`interaction` contains `checkpointId`, `mode`, `phaseId`, `resumePhase`.
Checkpoint IDs are `fixed_phase_1` through `fixed_phase_16`, and `infinite_5`,
`infinite_10`, etc. A replay has `replayed:true`; it is notification of the same
saved checkpoint, not a second progression trigger.

## State and persistence

`status` is `question`, `feedback`, `interaction`, or `celebration`. `mode` is
`fixed` or `infinite`; `phaseId` is 1–17 for fixed and 18 for infinite.

The versioned save contains:

- `currentFixedQuestionId`, `completedFixedQuestions`, `journeyComplete`.
- `currentQuestion` (including option order), `questionAttempts`.
- `pendingInteraction`, `lastCompletedInteractionCheckpoint`, `celebrationPending`.
- `infiniteDifficulty` (1–4), `completedInfiniteQuestions`,
  `infiniteCompletedSinceInteraction` (0–5).
- `recentPerformance` (last five first-attempt correctness booleans),
  `adaptiveEvaluationCount` (0–4), `recentGeneratedQuestions` (last 20, including active).

Counters commit only at feedback completion. The infinite counter remains **5**
through the interaction and resets **only** when that interaction completes.
Infinite mode begins at zero. A wrong kick never increments completion counters.
`currentFixedQuestionId` retains the last fixed ID during a break, is the active
ID during answering/feedback, and becomes `null` at journey completion.

Malformed, incompatible, or structurally invalid saves reset to question 1.
Storage access/write failures propagate rather than falsely reporting durability;
the caller should stop input and address storage failure before continuing. Writes
are synchronous, one full JSON value per transition/attempt. No cross-tab locking
or legacy save migration is provided.

## Generation and adaptation

- `phases` and `fixedQuestions` are immutable exported data: exactly 17 phases and
  84 questions with the specified targets/counts. `generateFixedQuestions()` uses
  a stable per-ID seed. All answers draw from 1–20, never from a phase-local range.
- `generateOptions(target, count, difficulty, random)` performs weighted sampling
  without replacement; easy distractors favor distinct values, hard ones nearby.
- `generateInfiniteQuestion({sequence, difficulty, recentQuestions, random})`
  generates without mutating history. Choices are respectively 3, 4, 5, 6 across
  levels. Targets always have positive weight across 1–20 (except the previous
  target); preferred quantities are 4, 8, 13, 17 as difficulty increases.
- Recent configurations compare target plus **sorted** options, so reordering
  cannot disguise a repeat. The last 20 are excluded. A bounded deterministic
  fallback guarantees progress even for a constant injected RNG.
- `adaptDifficulty(level, recentPerformance)` uses the last five results: 5/5
  increases one level, 3–4/5 holds, 0–2/5 decreases one level, clamped to 1–4.
  The engine evaluates after every five infinite completions, preventing rapid
  overlapping-window jumps. History remains rolling and persisted between these
  evaluations. Infinite mode starts fresh at level 1, independent of fixed retries.

All questions contain `questionId`, `phaseId`, `targetCount`, `displayBallCount`,
`options`, `correctAnswer`, `correctOptionIndex`, and numeric `difficulty`.
The display integration should render exactly `displayBallCount` footballs and
disable counting input except while `status === 'question'`.

## Automated validation

From the workspace root, run `node --test kick-and-count/tests/progression.test.cjs`.
Uses only built-in Node modules. Tests cover exact fixed data, all checkpoints,
animation gating, retries, interrupted feedback, persisted breaks/celebration,
active infinite question restoration, adaptive behavior, browser script loading,
event semantics, and 10,000 successive infinite engine questions, plus generator
stress tests for constant RNG and weighted difficulty.