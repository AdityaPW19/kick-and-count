# TASK: Implement Master Series Mode Controller for Football Game

## Context

We are building a preschool educational football game featuring Sparky.

The core gameplay, football kicking mechanics, shooting animations, goal feedback, mascot assets and the Kick & Count tutorial already exist.

The implemented **Master Series Mode Controller** manages counting, successor and
approved predecessor gameplay within the same continuous game experience. This
document records the current contract and the explicitly deferred six-mode target.

Do not rebuild existing gameplay systems. Reuse them.

The shared game loop, director fun interactions and Sparky feedback already exist.
Keep integration points flexible for later approved behaviors and the three deferred modes.

## 1. Supported Series Modes

The game will contain six series modes:

1. `kick_and_count` — Count footballs and kick the matching numeral.
2. `what_comes_next` — Identify the successor of a displayed number.
3. `what_came_before` — Identify the predecessor of a displayed number.
4. `color_match` — Match the requested color.
5. `find_missing_number` — Identify a missing number in a sequence.
6. `reach_target_score` — Reach a given target score using the mode's own mechanics.

Each mode will have its own tutorial, predefined phases, question generator and difficulty progression.

Currently integrate Kick & Count, What Comes Next and the user-approved What Came
Before gameplay. Register Color Match, Find Missing Number and Reach the Target
Score as deferred, nonplayable future modes; do not invent their mechanics or data.

### Current three-mode implementation

All three implemented modes share the same pitch, physics, kick/feedback loop and director breaks.
After counting's opening two phases/breaks, play the approved successor tutorial
once and its opening two phases/breaks, then the existing approved predecessor9->8
tutorial and its opening two phases/breaks. Real predecessor Done starts `before_001`,
not an old counting/successor route. Its gameplay uses the successor template with
descending sequences (5,4,3…); it does not replace or rewrite that polished lesson.
While the other three modes are unavailable, rotate only these three playable
adapters using the 65% two-phase / 35% one-phase schedule below, preserving all
three mode saves. This state is recorded as
`available_rotation`, **not** six-mode onboarding completion: `onboardingComplete`
remains false; after the three opening journeys `availableOnboardingComplete:true`
and `onboardingDeferred:true`. No future mode, tutorial, or question is fabricated;
Color Match has no implementation. The registry keeps all three future modes nonplayable.

The master save owns routing/quota/shuffle-bag and a durable pending break plan;
per-mode saves own their questions. Persist the plan before presentation, acknowledge
the mode checkpoint after presentation, then commit the planned route. On reload,
an already-acknowledged engine checkpoint commits its pending route without replaying
that break. Counting's existing phase-17 champion substitutes for its final checkpoint.

### Save version and legacy migration

[../game/progression/master.js](../game/progression/master.js) uses schema **version2**
under the SAME `sparky-master-progression:v1` storage key. Do not rename the key or
interpret its suffix as the current schema version. Validate the original two-mode
v1 schema first, then extend tutorial/intro/checkpoint maps with predecessor entries
and route fields with `deferredModeId`/`legacyIntroductionPending`.

Preserve the old active route, quota, bag, completed-break history and any durable
pending plan, including its commit route/action. Never reroll or replace that plan.
Migration writes only the master key; engine saves and tutorial flags stay untouched.
Malformed original v1 data must be rejected before augmentation.

Old available rotation carries `legacyIntroductionPending:true`. Pending feedback,
interaction/champion and saved plans win: finish/acknowledge the interaction, commit
its original selected route, then introduce predecessor only at a safe question
boundary (no pending master plan and an actual active-engine `status:'question'`
snapshot). Missing snapshots are not safe-boundary proof. Park the old question
unchanged and begin predecessor's two-phase onboarding run. A saved predecessor
lesson completion flag is reused; completed older lessons never replay. Reload must
preserve the bridge and engine-ack/master-pending recovery without duplicate breaks.

## 2. First-Time Onboarding Progression

The complete future target introduces all six modes sequentially. The current
playable subset introduces the first three in that same order, then enters
`available_rotation` while the final three remain deferred.

The initial order must be:

1. Kick & Count
2. What Comes Next
3. What Came Before
4. Color Match
5. Find Missing Number
6. Reach the Target Score

For each mode:

- Play its tutorial once.
- After tutorial completion, play two predefined phases.
- Each phase contains 4–5 completed questions.
- After each phase, trigger one Sparky fun interaction.
- After the second Sparky interaction finishes, switch to the next mode.
- Start the next mode's tutorial.

Example:

```text
Kick & Count tutorial (already implemented)
  → Phase 1 (4 questions)
  → Sparky interaction
  → Phase 2 (5 questions)
  → Sparky interaction
  → What Comes Next tutorial
  → Phase 1 (5 questions)
  → Sparky interaction
  → Phase 2 (5 questions)
  → Sparky interaction
  → What Came Before tutorial
  → Phase 1 (5 questions)
  → Sparky interaction
  → Phase 2 (5 questions)
  → Sparky interaction
  → Available rotation: counting / next / before
  (Color Match and the remaining two introductions are deferred)
```

**Important:** Full six-mode mixed onboarding requires all six tutorials and opening
phases. Current three-mode `available_rotation` is deliberately not that completion;
`onboardingComplete` stays false until the deferred modes are implemented and introduced.

The tutorial for Kick & Count is already implemented. Preserve it, including any existing completion state.

For new modes, follow the same tutorial lifecycle and interaction pattern as Kick & Count, adapting the question and instruction to the relevant mode.

Do not duplicate the Kick & Count tutorial's specific counting instructions.

## 3. Tutorial System

Every series mode must expose:

- `startTutorial()`
- `completeTutorial()`
- `hasCompletedTutorial()`

Tutorials must:

- Explain the mode with a very basic question.
- Use existing Sparky emotes and dialogue/audio assets where appropriate.
- Follow the interaction and guidance style of the Kick & Count tutorial.
- Reuse existing shooting, feedback and goal animation systems.
- Be completed only when the child successfully performs the intended interaction.

Tutorial questions are separate from the predefined level sequence and must not consume a phase question.

Use the provided assets and existing script references. Do not invent or replace Sparky dialogues when existing dialogue assets are available.

Store tutorial completion separately for every mode.

After a mode's tutorial is completed, never automatically replay it during normal gameplay, including after restarting the application.

Provide an explicit reset/replay option through developer controls for testing.

Current Pause Practice selects the active counting/next/before lesson and restores
the exact saved question/options without consuming or rerolling it. Hidden tutorial
previews do the same. Direct `?scene=before-tutorial` is non-persisting and returns
to menu after Done/wipe; only real before onboarding starts predecessor gameplay.
Preserve the approved9->8 lesson's assets, audio, seamless camera/actor transitions,
silence/cricket timing, goal and Done/pass/wipe contracts; gameplay approval is not
permission to simplify the tutorial.

## 4. Sparky Fun Interaction Checkpoints

After every completed phase, trigger a Sparky fun interaction.

Use a common interface:

```ts
startSparkyInteraction(context)

onSparkyInteractionComplete(context)
```

Example context:

```json
{
  "modeId": "what_comes_next",
  "phaseId": 2,
  "globalBreakIndex": 4,
  "nextAction": "switch_mode"
}
```

The existing director supplies the shared Wizzle/Messi/Let's Go interactions and
counting champion. The interface above is conceptual; current main integration
uses durable `planBreak()`/engine acknowledgment/`completeBreak()` around director
presentation, with checkpoint events, pause/resume and safe callback handling.

Rules:

- A break begins only after the last question's successful goal and feedback animation finishes.
- One break per phase.
- Incorrect attempts do not count as completed questions.
- Do not display the next question while the interaction is active.
- Do not switch series modes before the interaction completes.
- Preserve the current phase and next action if the app is closed during the break.
- Avoid duplicate interactions after reopening the application.
- A completed Sparky break should automatically resume the master progression.

Keep the break system separate from the individual series modes.

## 5. Mixed Series Progression

The full target transitions into mixed-mode gameplay after all six introductory
tutorials and their initial two phases. The implemented provisional scheduler uses
the same rules for its three available modes after their introductions; it does
not claim all-six completion.

From this point onward:

- Do not replay tutorials.
- Switch seamlessly between modes after Sparky interactions.
- Normally play two phases of a selected mode before switching.
- Sometimes switch after just one phase for variety.
- Preserve each mode's individual phase progress.
- Resume each mode from its next uncompleted predefined phase.
- Avoid selecting the same mode twice consecutively when another playable mode is available.
- Randomize the order while maintaining reasonable variety.

Recommended scheduling:

- 65% probability: Play 2 phases before switching.
- 35% probability: Play 1 phase before switching.

These probabilities are configurable.

A Sparky interaction still occurs after each phase, including when the next phase belongs to the same mode.

Use a fair shuffle-bag or similar scheduler so all available modes appear regularly.

The implemented bag persists `deferredModeId`: if the only remaining token equals
the current mode, defer that token, borrow a different mode from the next full bag,
then serve the deferred token on the following run without consuming another bag
token. Persist this in pending commit routes too. Never discard the singleton or
starve a mode to avoid an adjacent repeat; bounded fairness survives reloads.

Avoid pure random mode selection that could accidentally ignore some modes for long periods.

The first cycle after onboarding should preferably cover every available mode before repeating one.

## 6. Per-Mode Predefined Progression

Each mode owns its own predefined question and phase sequence.

For example:

- Kick & Count has 84 predefined questions across 17 phases.
- What Comes Next has100 predefined questions across20 five-question phases, then
  independent adaptive infinite phase21.
- What Came Before has100 predefined questions across20 five-question phases, then
  independent adaptive infinite phase21 after its phase20 shared break acknowledgment.
  Its pure per-mode module uses the same successor progression template/API; the
  shared presentation/physics/controller loop is not duplicated.
- The three deferred modes will provide their configurations separately.

When a mode is selected, continue from its saved phase and question position.

Do not reset its progression when switching to another mode.

When its predefined content finishes, mark that specific mode as having entered infinite mode.

Other modes must continue with their own remaining predefined questions until completed.

## 7. Infinite Mixed Gameplay

The conceptual future integration interface is:

```ts
getNextQuestion()
hasPredefinedQuestionsRemaining()
generateInfiniteQuestion()
getDifficultyState()
```

Current pure counting/next/before engines expose `state`, `currentQuestion()`,
`attempt()`, `finishFeedback()`, `completeInteraction()` and `subscribe()`;
counting also exposes `completeCelebration()`. Generator functions/data are module
exports. Do not invent extra runtime methods or duplicate generator logic in master.

When a mode exhausts its predefined questions:

- Continue that mode using its procedural generator.
- Do not prevent that mode from appearing in mixed-mode rotation.
- Maintain its normal phase structure of 4–5 questions.
- Continue triggering Sparky breaks after phases.

Eventually all six modes will be operating procedurally.

At that point, the master controller should continue rotating them indefinitely.

There is no fixed final level or permanent game-complete screen.

## 8. Required Master States

Implement a clear state machine such as:

```text
TUTORIAL
PLAYING_QUESTION
GOAL_FEEDBACK
SPARKY_INTERACTION
MODE_TRANSITION
INFINITE_PLAY
```

Use onboarding and mixed-play status as separate progression properties, rather than making these states conflict.

Important transitions:

- Tutorial complete → First predefined question
- Question complete → Next question or phase completion
- Phase complete → Sparky interaction
- Sparky interaction complete → Next phase or mode transition
- Two onboarding phases complete → Next mode tutorial
- All onboarding tutorials and opening phases complete → Mixed-mode progression
- Mode predefined content exhausted → Infinite generator for that mode

## 9. Mode Registration Interface

Create a modular mode registry.

Suggested conceptual structure:

```ts
interface SeriesMode {
  id: string;
  tutorial: TutorialController;
  phases: PhaseConfig[];
  getNextQuestion(): Question;
  generateInfiniteQuestion(): Question;
  getProgress(): ModeProgress;
  getDifficultyState(): DifficultyState;
}
```

The master controller must not know how to generate a counting, successor,
predecessor, color or arithmetic question.

It should only determine:

- Which mode plays next
- Whether a tutorial is needed
- Which phase is active
- Whether a break is due
- Whether a transition is due
- Whether that mode is in predefined or infinite progression

## 10. Progress Persistence

Persist at minimum:

```json
{
  "onboardingComplete": false,
  "activeModeId": "kick_and_count",
  "masterState": "PLAYING_QUESTION",
  "modeProgress": {
    "kick_and_count": {
      "tutorialCompleted": true,
      "nextQuestionId": 1,
      "nextPhaseId": 1,
      "predefinedCompleted": false
    },
    "what_comes_next": {
      "tutorialCompleted": false,
      "nextQuestionId": 1,
      "nextPhaseId": 1,
      "predefinedCompleted": false
    },
    "what_came_before": {
      "tutorialCompleted": false,
      "nextQuestionId": 1,
      "nextPhaseId": 1,
      "predefinedCompleted": false
    }
  },
  "pendingSparkyInteraction": null,
  "lastCompletedBreakId": null
}
```

The JSON above is a conceptual future-facing sketch, not the current serialized
schema. Actual v2 master state owns `activeModeId`, `stage`, tutorial/intro maps,
`run`, `bag`, `deferredModeId`, `legacyIntroductionPending`, `pendingBreak`,
`lastCompletedBreakId` and per-mode `lastCompletedCheckpoints`; it never duplicates
engine question progress. It must include enough information to resume safely.

Current storage keys:

- Master: `sparky-master-progression:v1` (schema2).
- Counting: `sparky-counting-progression:v1`.
- Successor: `sparky-next-progression:v1`.
- Predecessor: `sparky-before-progression:v1`.
- Welcome film: `sparky.intro.completed.v1`.
- Counting lesson: `sparky.tutorial.completed.v1`.
- Successor lesson: `sparky.tutorial.what-comes-next.completed.v1`.
- Predecessor lesson: `sparky.tutorial.what-came-before.completed.v1`.

Normal returning entry and `?scene=game` use the reconciled master/current-mode
route, not forced counting. Fresh onboarding parks count010 while next plays,
then next011 while before plays; before011 parks after its second break. Switching
or replaying Practice never rewinds these independent saves.

Never accidentally restart the child from the first tutorial or first phase after switching modes or reopening the game.

Persist mode selection state so a saved session resumes consistently.

## 11. Future Game Loop Integration

Reuse the implemented shared loop, director interactions, feedback and three mode
adapters. Only additional approved behaviors and the deferred modes' mechanics
belong to future prompts; no Color Match implementation is implied.

Do not assume or implement features that have not yet been specified.

Provide clean integration points for future instructions.

The controller should be reusable without requiring major changes when the remaining modes are implemented.

## 12. Validation

Current automated suite: **178 passing tests**, including predecessor's10,000
generated questions, all284 combined fixed questions and260 shared phases across
three real engines, independent infinite streams, dual-store interruptions,
validated original two-mode v1 migration/preserved pending plans and lossless
deferred-token fairness through reloads. Preserve existing visual/audio, landscape,
pause/cancellation and tutorial-polish requirements; unit tests do not establish
presentation quality by themselves.

Test:

- Each tutorial plays once.
- The existing Kick & Count tutorial remains functional.
- The first-time mode order is correct.
- Each mode plays two phases before the next tutorial.
- Sparky breaks occur after every phase.
- Mode transitions occur only after the relevant break completes.
- Tutorials never repeat during mixed-mode gameplay.
- A selected mode resumes its saved predefined progression.
- Mode selection remains varied and fair.
- Some mixed-mode rotations contain one phase; others contain two.
- Infinite generation begins independently for each mode.
- No duplicate questions or breaks appear due to state restoration.
- Unimplemented modes are not selected until registered as playable.
- Restarting the app preserves the exact progression checkpoint.

### Final Instruction

**Treat the game as one seamless football experience controlled by a master state machine.**

Do not build six separate disconnected games.

Reuse existing gameplay, animations, Sparky assets and tutorial infrastructure.

Implement the controller in a modular, data-driven way so the remaining mode specifications can be added individually in future prompts.
