# TASK: Implement What Came Before (Predecessor) Series Mode

## Context

The user-approved **What Came Before** series mode is implemented within the
existing preschool educational football game featuring Sparky. This document
records its current gameplay contract and exact progression data.

This is the third series mode managed by the Master Series Mode Controller, after Kick & Count and What Comes Next.

The latest approved presentation uses the SAME What Comes Next sequence-board
template, reversed into descending order (for example5,4,3…), not a single-number
question board. The existing approved9->8 tutorial remains unchanged.

The football field, goal, scoreboard, Sparky mascot, shooting mechanics, animations, sound systems, and core UI already exist.

**Do not rebuild any of these systems.**

This mode follows the same structure and flow as What Comes Next, except the child must identify the number immediately before the displayed number rather than the number after it.

The game loop, Sparky fun interactions, feedback systems, and additional behaviors are managed through the existing shared architecture.

## 1. Core Gameplay

A descending sequence appears on the scoreboard above the goal. Its last numeral
is the displayed starting number `n`; the player finds `n - 1`. Use
`[n+2,n+1,n]`, truncated at99 rather than showing100/101.

The player must identify the number that comes immediately before it.

Example:

```text
Scoreboard: 14, 13, 12…

Sparky:
"What comes before 12?"

Football choices:
9    11    13

Correct answer: 11
```

For starter3 show5,4,3…; the first real question `before_001` has starter2,
board4,3,2… and answer1. At the upper boundary, starter98 shows99,98… and
starter99 shows99… with answer98. Keep the naturally measured centered text,
colored tspans, comma-space separators and10px before the ellipsis from successor.

When the child kicks the correct football:

1. Play the existing successful shooting and goal animation.
2. Update the scoreboard to show the correct predecessor.
3. Play the appropriate existing Sparky success feedback.
4. Continue to the next question after the feedback sequence completes.

The adapter uses the existing successor `goal` hook:130ms content fade then180ms
accepted-answer reveal at goal contact, asynchronously beside shared feedback.
The answer holds until next-question/phase-exit clear. Wrong kicks keep the sequence.
HUD title is What Came Before? and field instruction is Look. Before. Kick!

For incorrect answers, use the existing unsuccessful kick and retry behavior.

Do not advance until the child successfully completes the question.

## 2. Number Range

All displayed questions and answer choices must use integers from 1 to 99.

The mathematical rule is:

`correctAnswer = displayedNumber - 1`

Since the minimum supported answer is 1, the minimum displayed number must be 2.

Therefore:

- Displayed number range: 2–99
- Correct answer range: 1–98
- Answer choices: 3–6 footballs
- All answer choices must be unique
- Exactly one answer must be correct

Do not display 1 as the starting number because its predecessor would be 0, outside the supported range.

## 3. Tutorial

### Current approved9->8 lesson (preserved)

The approved chat brief replaces the original3->2 placeholder: display **9**, choices
**8, 10, 11**, answer **8**. Keep the existing guided ball/finger, super kick and
goal treatment. The supplied previous-number dialogue drives the 10-ball rejection,
IGNORE / Sunday-homework comic cutaway, one-step-back explanation and Ronaldo
deadpan finale. The final **Done!** football passes to Sparky, then hits the screen
using the existing wipe. No Ronaldo/Messi character appears in this lesson.

On new-player onboarding this tutorial is introduced only after What Comes Next's
Phase 2 Sparky interaction has finished and its checkpoint is acknowledged/committed.
Legacy two-mode rotation uses the safe-boundary master migration described below.
It stores its own completion key
`sparky.tutorial.what-came-before.completed.v1`, never consumes a phase question,
and never marks completion from developer previews or an interrupted lesson.

**Current implementation:** gameplay is now approved and playable. Real Done/wipe
starts `before_001` (or its saved unconsumed before question), not the old
counting/successor route. A prior completed lesson flag is honored without replay.
Pause Practice in before and hidden developer preview replay the lesson without
consuming/rerolling progress and return to the exact active question/options.
Direct `?scene=before-tutorial&tutorialSpeed=1..8` remains non-persisting and returns
to menu after successful wipe; explicit stop stays put.

Follow the existing Kick & Count tutorial implementation pattern, just as What Comes Next does.

The tutorial must be short, visual, interactive, and easy for preschool children.

The implemented lesson question is:

```json
{
  "modeId": "what_came_before",
  "isTutorial": true,
  "displayedNumber": 9,
  "correctAnswer": 8,
  "options": [8, 10, 11],
  "correctOptionIndex": 0
}
```

### Tutorial steps

1. Introduce the new activity using Sparky and the existing tutorial presentation system.
2. Display the number9 on the scoreboard (the lesson retains its own single-number board).
3. Use the supplied20 previous-number lines, contextual9/10 highlights and saying-no/error/cross rejection of10.
4. Preserve IGNORE/Sunday-homework comic panels and the one-step-back8 ←9 explanation.
5. Display8/10/11 with existing guided finger/glow only on8; serialize wrong-tap hints.
6. Allow the child to kick8; roll the retained ball to centre by rotating its image, not its bottom-origin body.
7. Play the existing successful goal animation and feedback.
8. Update the scoreboard9->8; retain RONALDO!/IT'S DONE BRO! splashes and the deadpan finale.
9. Preserve actual1400ms music silence, bounded nonlooping cricket and shy/restored-Lava beat; wait for Done/pass/screen-kick/wipe.
10. Only after accepted8 and successful Done/wipe save completion; let master begin real predecessor Phase1 without consuming a question.

Retain supplied sprites/audio, shared decoded caches and tutorial host, retained
coach reparenting with exact parent/style restoration, viewport-captured seamless
field/comic transitions and camera preparation under opaque comics. No intermediate
wide/close bounce, goalpost flash or pose URL swaps. Finale hides pitch props before
actor restoration; stop clears temporary opacity. Intro music switches (not layers)
to Lava at hehe, uses shared ducking, stops for real silence, and cleans up on exit.
The additional It's Done Bro cricket stops before the later silent beat. Pause,
portrait, hidden tabs and cancellation freeze/clean audio/video/WAAPI/inputs together;
reduced motion uses static art. Keep these established polish contracts unchanged.

Use the supplied Sparky dialogue/audio assets and existing emotes.

Do not invent new dialogue or use text-to-speech when suitable assets are already provided.

The tutorial question must not count toward the predefined progression.

Once completed, the tutorial must not replay during normal mixed-mode gameplay.

## 4. Predefined Progression

Create exactly **100 predefined questions arranged into 20 phases**.

Each phase contains 5 questions.

The progression starts with small numbers and gradually introduces larger two-digit numbers, decreasing sequences, tens-boundary transitions, and more challenging answer choices.

Use the following predefined sequence.

All numbers below are **displayed numbers**. Their correct answers are calculated by subtracting 1.

| Phase | Displayed numbers | Answer choices |
|---|---|---|
| 1 | 2, 3, 4, 5, 6 | 3 |
| 2 | 4, 7, 5, 8, 9 | 3 |
| 3 | 6, 8, 9, 10, 3 | 3 |
| 4 | 10, 5, 7, 9, 10 | 3–4 |
| 5 | 11, 12, 13, 14, 15 | 4 |
| 6 | 16, 17, 18, 19, 20 | 4 |
| 7 | 10, 20, 11, 15, 19 | 4 |
| 8 | 13, 17, 20, 8, 16 | 4 |
| 9 | 21, 22, 25, 28, 30 | 4 |
| 10 | 23, 26, 29, 30, 31 | 4–5 |
| 11 | 32, 35, 38, 40, 41 | 5 |
| 12 | 43, 46, 49, 50, 36 | 5 |
| 13 | 41, 50, 51, 55, 60 | 5 |
| 14 | 52, 57, 60, 61, 65 | 5 |
| 15 | 66, 68, 70, 71, 73 | 5 |
| 16 | 59, 64, 69, 75, 60 | 5 |
| 17 | 76, 79, 80, 81, 85 | 5 |
| 18 | 86, 88, 90, 91, 95 | 5–6 |
| 19 | 96, 97, 98, 99, 90 | 6 |
| 20 | 10, 20, 50, 80, 99 | 6 |

### Difficulty progression

**Phases 1–4: Foundations**

- Recognize predecessors of small numbers.
- Work mostly with single-digit values.
- Introduce 10 → 9.
- Use 3–4 answer choices.

**Phases 5–8: Teen Numbers**

- Identify predecessors from 11–20.
- Practice familiar number sequences.
- Include 20 → 19.
- Use 4 answer choices.

**Phases 9–12: Building Fluency**

- Introduce numbers from 20–50.
- Practice predecessors of two-digit numbers.
- Include 30 → 29, 40 → 39, and 50 → 49.
- Increase answer choices to 4–5.

**Phases 13–16: Larger Numbers**

- Introduce numbers approximately between 40 and 75.
- Include multiple tens-boundary transitions.
- Mix familiar and unfamiliar numbers.
- Use 5 answer choices.

**Phases 17–20: Number Champion**

- Practice predecessors of numbers up to 99.
- Include transitions such as 80 → 79 and 90 → 89.
- Introduce more similar distractors.
- Use 5–6 answer choices.
- Include mixed revision questions.

Do not change the predefined displayed-number sequence without instruction.

For phases with variable answer-choice counts:

- Phase 4: [3, 3, 3, 4, 4]
- Phase 10: [4, 4, 4, 5, 5]
- Phase 18: [5, 5, 5, 6, 6]

## 5. Difficulty and Distractor Generation

Generate incorrect football numerals programmatically.

### Easy

Use 3 answer choices.

Example:

```text
Scoreboard: 5
Options: 2, 4, 8
Correct: 4
```

Use relatively distinct numbers.

### Medium

Use 4–5 answer choices.

Example:

```text
Scoreboard: 24
Options: 21, 23, 25, 28
Correct: 23
```

Introduce closer numerical distractors.

### Hard

Use 5–6 answer choices.

Example:

```text
Scoreboard: 79
Options: 75, 76, 77, 78, 80, 81
Correct: 78
```

Hard questions may contain nearby numbers, including successors and predecessors of the correct answer.

However, do not use consecutive-number distractors in every hard question.

### Important Rules

- Every option must be a valid integer from 1–99.
- Exactly one option must equal displayedNumber - 1.
- No duplicate answer choices.
- Correct answer position must change across questions.
- Do not consistently place the correct answer in the center.
- Do not always make the correct answer the smallest or largest choice.
- Ensure two-digit numbers remain readable on footballs.
- Use deterministic seeded generation for predefined questions.

## 6. Phase Breaks and Master Controller Integration

Every phase consists of 5 completed questions.

After the fifth correct answer, trigger the shared Sparky fun interaction through the Master Series Mode Controller.

```text
What Came Before tutorial
  → Phase 1 (5 questions)
  → Sparky Fun Interaction
  → Phase 2 (5 questions)
  → Sparky Fun Interaction
  → Master Controller selects next mode
```

The eventual next onboarding mode is Color Match, but it has no implementation
yet. Currently, after before's second acknowledged break, enter three-mode
`available_rotation` (counting/next/before). Color Match, Find Missing Number and
Reach the Target Score remain nonplayable/deferred; `availableOnboardingComplete`
is true, `onboardingDeferred` is true and full-six `onboardingComplete` stays false.

When What Came Before appears again during mixed gameplay, continue from Phase 3.

Important:

- Incorrect attempts do not increase completed-question counts.
- One Sparky interaction is triggered per phase.
- The last goal animation must finish before the interaction begins.
- Do not start the next question during a Sparky interaction.
- Do not implement an independent scheduling system inside this mode.
- The Master Controller owns phase-break triggers and mode transitions.

Fresh onboarding is counting tutorial + two phases/breaks (4+5 goals), successor
tutorial + two phases/breaks (5+5), predecessor tutorial + two phases/breaks (5+5),
then fair rotation. Count010 and next011 remain parked; before011 parks after its
second break. Rotation uses configurable65% two-phase/35% one-phase runs and the
lossless fair bag, including persisted `deferredModeId` for a singleton-current
token borrowed across bag boundaries; never discard it or repeat adjacent runs.

## 7. Data Structure

Use a JSON-compatible phase configuration.

Example:

```json
{
  "modeId": "what_came_before",
  "minNumber": 1,
  "maxNumber": 99,
  "totalPredefinedQuestions": 100,
  "questionsPerPhase": 5,
  "totalPhases": 20,
  "tutorialRequired": true,
  "phases": [
    {
      "phaseId": 1,
      "difficulty": "very_easy",
      "displayedNumbers": [2, 3, 4, 5, 6],
      "optionCounts": [3, 3, 3, 3, 3]
    },
    {
      "phaseId": 2,
      "difficulty": "easy",
      "displayedNumbers": [4, 7, 5, 8, 9],
      "optionCounts": [3, 3, 3, 3, 3]
    }
  ]
}
```

All20 phases from the predefined progression table are implemented in
[../game/progression/before-engine.js](../game/progression/before-engine.js), a pure
browser/CommonJS `SparkyBeforeProgression` module using the successor progression
template/API. Numeric resolved-question `difficulty` is1–4 (phase descriptors also
carry the string label); option order is deterministic per fixed question seed.

Each resolved question should look like:

```json
{
  "questionId": "before_001",
  "modeId": "what_came_before",
  "phaseId": 1,
  "displayedNumber": 2,
  "correctAnswer": 1,
  "optionCount": 3,
  "options": [5, 1, 3],
  "correctOptionIndex": 1,
  "difficulty": 1
}
```

The option list above illustrates the shape, not the exact seeded options for
`before_001`; use the engine's immutable fixed data as the runtime source.

## 8. Infinite Procedural Mode

After completing all 100 predefined questions, switch this series mode to infinite procedural generation.

The phase20 shared break must finish and `before_fixed_phase_20` be acknowledged
before entering adaptive infinite phase21. Infinite IDs are `before_infinite_1`,
`before_infinite_2`, etc.; every five successes has a distinct
`before_infinite_5`, `before_infinite_10`, etc. checkpoint even though phaseId stays21.

Do not restart the predefined phases.

Rules:

- Displayed number: 2–99
- Correct answer: displayedNumber - 1
- Answer choices: 3–6
- Exactly one correct answer
- No duplicate numerals
- Avoid consecutive identical questions
- Avoid repeating recent exact answer configurations
- Maintain easy, medium, and hard variations

Suggested starting-number distribution:

| Displayed number range | Weight |
|---|---|
| 2–10 | 20% |
| 11–20 | 20% |
| 21–50 | 25% |
| 51–75 | 20% |
| 76–99 | 15% |

Use these as configurable default weights.

Adapt difficulty based on the child's recent performance.

Track first-attempt accuracy across the previous five completed questions.

The engine evaluates once per five infinite completions:5/5 raises one difficulty
level,3–4/5 holds,0–2/5 lowers one, clamped1–4. Infinite starts at level1 with fresh
performance history; choices equal difficulty+2. Persist the last20 generated
questions, excluding consecutive starters and recent starter+sorted-options
configurations; a bounded deterministic fallback handles constant RNG without hangs.

Gradually increase difficulty after sustained success.

Reduce difficulty after repeated mistakes.

Continue generating phases of 5 questions indefinitely whenever the Master Controller selects this mode.

## 9. Progress Persistence

Store:

- Tutorial completion
- Current predefined phase
- Next predefined question
- Whether predefined progression is complete
- Current infinite difficulty
- Recent generated questions
- Recent first-attempt performance

Switching modes must not reset progress.

If the child exits during a question or phase, restore their saved position.

Own progression key: `sparky-before-progression:v1`; lesson completion is separately
`sparky.tutorial.what-came-before.completed.v1`. Counting and successor keep
`sparky-counting-progression:v1` / `sparky-next-progression:v1` and
`sparky.tutorial.completed.v1` / `sparky.tutorial.what-comes-next.completed.v1`.
Welcome-film completion remains `sparky.intro.completed.v1`. Before's engine never
reads or writes those other keys, the master key or tutorial flags.

Master schema is version2 under the SAME `sparky-master-progression:v1` key.
Validate original two-mode v1 data before extending its mode maps/route fields;
preserve old route/quota/bag/history and pending break plan/commit without rerolling
or rewriting engine saves/flags. `legacyIntroductionPending` bridges old available
rotation: finish feedback and pending interaction/champion, honor the saved commit
route, then introduce before only with no pending plan and an actual active-engine
`status:'question'` snapshot. Missing snapshots are not safe-boundary proof. Park
the old question unchanged and reuse a prior before completion flag if present.

Persist master break plan BEFORE presentation, acknowledge the engine afterward,
then commit master route. Reload after engine ack but before master commit completes
the saved route without repeating the break. Wrong attempts never advance; accepted
feedback locks input until `finishFeedback()` commits once after presentation.
Interrupted accepted feedback recovers once on engine reconstruction; pending
breaks remain pending. Normal return and `?scene=game` use master's current
`activeModeId`/reconciled route, not forced counting.

## 10. UI and Animation

Reuse the existing football gameplay scene.

For What Came Before:

- Show the successor template's descending sequence ending at the starter, bounded
  to1–99: `[n+2,n+1,n]` truncated at99; first starter2 displays4,3,2… and accepts1.
- Display 3–6 footballs carrying numerical answers.
- Use existing shooting and goal animations.
- Update the scoreboard to the predecessor after a successful kick.
- Use existing Sparky success and retry feedback.
- Keep two-digit numerals centered and legible.
- Wait for the goal animation and feedback to finish before requesting the next question.

Do not modify the visual design or introduce new objects.

## 11. Validation

Current automated suite: **178 passing tests**, including10,000 generated
predecessor questions, exact100/20 predecessor data, all284 combined fixed questions
and260 shared phases across three real engines, independent infinite streams,
cross-save interruptions, original-v1 validation/migration/pending-plan preservation
and lossless fair-bag/deferred-token reload coverage. Preserve existing desktop/
landscape-mobile, actual audio/video, pause, cleanup and tutorial polish requirements;
unit tests alone do not prove presentation quality.

Automated tests must verify:

- Exactly 100 predefined questions.
- Exactly 20 predefined phases.
- Exactly 5 questions per phase.
- Every displayed number matches the predefined sequence.
- Every correct answer equals displayedNumber - 1.
- Displayed numbers are within 2–99.
- Answer options are within 1–99.
- Every question contains 3–6 unique options.
- Exactly one option is correct.
- Correct answer positions vary.
- The tutorial is separate from the predefined questions.
- The tutorial is completed only once.
- Mode progress resumes correctly.
- Sparky interactions trigger through the Master Controller.
- Infinite mode begins after question 100.
- At least 10,000 procedurally generated questions pass validation.

## 12. Final Constraints

**This is the same progression architecture as What Comes Next, with the mathematical rule reversed.**

The pure per-mode progression module owns predecessor data, generator and save,
just like successor. Do not create a separate presentation, physics, input,
feedback, director or scheduling engine. The third adapter in
[../game/main.js](../game/main.js) reuses counting entrance/render infrastructure
and successor's exact goal hook; [../scene.js](../scene.js) owns sequence direction.

Do not change existing football mechanics, UI, animations, mascot assets, or the shared game loop.

Implement only the tutorial integration, question data, distractor generation, phase progression, infinite generation, progress persistence, and scoreboard update specific to What Came Before.
