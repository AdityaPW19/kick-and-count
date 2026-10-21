# TASK: Implement Find Missing Number Series Mode

## Context

Implement the **Find Missing Number** series mode within the existing preschool educational football game featuring Sparky.

This is the fifth series mode registered with the Master Series Mode Controller.

Follow the attached visual reference.

Reuse the existing:

- Football field and goal
- Main scoreboard
- Sparky mascot and emote assets
- Football shooting mechanics
- Goal animations
- Success and retry feedback
- Tutorial architecture
- Master Series Mode Controller
- Phase-break and Sparky interaction system

Do not rebuild or duplicate these systems.

This mode teaches children to identify a missing number in a sequence of consecutive numbers.

## 1. Core Gameplay

Display a numerical sequence on the scoreboard, with one number replaced by a question mark.

Example:

```text
Scoreboard:
21, 22, ?, 24

Sparky:
"Which number is missing?"

Football choices:
20    23    25

Correct answer: 23
```

The child must kick the football containing the missing number.

After a correct kick:

1. Play the existing successful goal animation.
2. Replace the question mark with the correct number.
3. Briefly display the completed sequence.
4. Play the appropriate existing Sparky feedback.
5. Advance only after the feedback sequence finishes.

For incorrect kicks, use the existing retry behavior.

Do not advance until the correct answer is selected.

## 2. Sequence Rules

For this mode, use **ascending sequences of four consecutive integers**.

Examples:

```text
1, 2, ?, 4
8, 9, ?, 11
21, 22, ?, 24
47, ?, 49, 50
?, 68, 69, 70
```

All numbers must stay within 1–99.

Rules:

- Sequence length: exactly 4
- Step size: always +1
- Sequence direction: ascending
- Number range: 1–99
- Missing positions: index 0, 1, 2, or 3
- Exactly one missing number
- The correct football must contain that missing number
- Display 3–6 answer footballs

Do not introduce skip counting, descending sequences, multiple missing values, or arithmetic patterns.

Those would be separate learning objectives and are not part of this mode.

For valid sequence generation, the starting number must be between 1 and 96.

## 3. Tutorial

Follow the same tutorial lifecycle and interaction pattern as Kick & Count.

Use an extremely simple missing-number sequence.

Tutorial question:

```json
{
  "modeId": "find_missing_number",
  "isTutorial": true,
  "sequence": [1, 2, null, 4],
  "missingIndex": 2,
  "correctAnswer": 3,
  "options": [2, 3, 5],
  "correctOptionIndex": 1
}
```

### Tutorial Flow

1. Introduce the activity using the existing Sparky tutorial system.
2. Display `1, 2, ?, 4` on the scoreboard.
3. Ask the child which number is missing.
4. Display three footballs containing 2, 3, and 5.
5. Follow the existing tutorial guidance pattern to help the child understand that 3 comes between 2 and 4.
6. Allow the child to kick the football containing 3.
7. Play the existing goal animation.
8. Replace the question mark with 3.
9. Show the completed sequence `1, 2, 3, 4`.
10. Play the appropriate tutorial-completion feedback.
11. Mark the tutorial as completed.
12. Notify the Master Series Mode Controller to begin Phase 1.

Use supplied Sparky dialogue/audio and emote assets.

Do not invent dialogue or use text-to-speech when matching assets already exist.

The tutorial question does not count toward predefined progression.

Do not replay the tutorial after completion during regular mixed-mode gameplay.

## 4. Predefined Progression

Create exactly **100 predefined questions arranged into 20 phases**.

Each phase contains 5 questions.

Difficulty should increase through:

1. Larger numbers.
2. More answer choices.
3. Closer distractors.
4. Different missing-number positions.
5. Sequences crossing tens boundaries.
6. Mixed revision of previously learned numbers.

Use the following predefined data.

In the table, `?` marks the missing value.

| Phase | Five predefined sequences | Choices |
|---|---|---|
| 1 | 1,2,?,4 / 2,3,?,5 / 3,4,?,6 / 4,5,?,7 / 5,6,?,8 | 3 |
| 2 | 1,?,3,4 / 2,?,4,5 / 3,?,5,6 / 4,?,6,7 / 5,?,7,8 | 3 |
| 3 | 6,7,?,9 / 7,8,?,10 / 8,9,?,11 / 9,10,?,12 / 10,11,?,13 | 3 |
| 4 | 6,?,8,9 / 7,?,9,10 / 8,?,10,11 / 9,?,11,12 / 10,?,12,13 | 3–4 |
| 5 | 11,12,?,14 / 12,13,?,15 / 13,14,?,16 / 14,15,?,17 / 15,16,?,18 | 4 |
| 6 | 16,?,18,19 / 17,?,19,20 / 18,?,20,21 / 19,?,21,22 / 20,?,22,23 | 4 |
| 7 | 7,8,9,? / 9,10,11,? / 12,13,14,? / 16,17,18,? / 19,20,21,? | 4 |
| 8 | ?,8,9,10 / ?,12,13,14 / ?,15,16,17 / ?,18,19,20 / ?,20,21,22 | 4 |
| 9 | 21,22,?,24 / 23,24,?,26 / 26,27,?,29 / 28,29,?,31 / 30,31,?,33 | 4 |
| 10 | 22,?,24,25 / 25,?,27,28 / 28,?,30,31 / 29,30,31,? / ?,33,34,35 | 4–5 |
| 11 | 31,32,?,34 / 34,?,36,37 / ?,38,39,40 / 38,39,40,? / 40,41,?,43 | 5 |
| 12 | 42,43,?,45 / 45,?,47,48 / ?,47,48,49 / 48,49,50,? / 49,50,?,52 | 5 |
| 13 | 51,52,?,54 / 54,?,56,57 / ?,58,59,60 / 58,59,60,? / 59,60,?,62 | 5 |
| 14 | 61,62,?,64 / 64,?,66,67 / ?,68,69,70 / 68,69,70,? / 69,70,?,72 | 5 |
| 15 | 70,71,?,73 / 73,?,75,76 / ?,77,78,79 / 78,79,80,? / 79,80,?,82 | 5 |
| 16 | 80,81,?,83 / 83,?,85,86 / ?,87,88,89 / 88,89,90,? / 89,90,?,92 | 5 |
| 17 | 90,91,?,93 / 92,?,94,95 / ?,94,95,96 / 94,95,96,? / 96,97,?,99 | 5 |
| 18 | ?,91,92,93 / 91,?,93,94 / 92,93,?,95 / 93,94,95,? / 95,96,?,98 | 5–6 |
| 19 | 8,9,?,11 / 19,?,21,22 / ?,39,40,41 / 59,60,61,? / 89,90,?,92 | 6 |
| 20 | ?,17,18,19 / 28,29,?,31 / 49,?,51,52 / 69,70,71,? / 96,97,?,99 | 6 |

### Phase Groups

**Phases 1–4: Foundations**

- Small numbers.
- Missing values in the middle.
- Introduce missing index 1.
- Use 3–4 choices.

**Phases 5–8: Building Sequence Understanding**

- Numbers approximately 10–22.
- Introduce missing numbers at the beginning and end.
- Practice crossing 9 → 10 and 19 → 20.
- Use 4 choices.

**Phases 9–12: Two-Digit Sequences**

- Numbers approximately 20–52.
- Mix missing positions.
- Include tens-boundary transitions.
- Use 4–5 choices.

**Phases 13–16: Larger Numbers**

- Numbers approximately 50–92.
- Use missing positions 0–3.
- Increase distractor similarity.
- Use 5 choices.

**Phases 17–20: Number Champion**

- Numbers up to 99.
- Mix missing positions and number ranges.
- Include multiple tens-boundary transitions.
- Use 5–6 choices.
- Finish with mixed revision questions.

### Variable Answer Counts

- Phase 4: [3, 3, 3, 4, 4]
- Phase 10: [4, 4, 4, 5, 5]
- Phase 18: [5, 5, 5, 6, 6]

All other phases use a fixed option count as specified.

## 5. Missing Number Positions

The position of the question mark is a separate difficulty dimension.

Use zero-based indexing.

```text
Index 0: ?, 12, 13, 14
Index 1: 11, ?, 13, 14
Index 2: 11, 12, ?, 14
Index 3: 11, 12, 13, ?
```

For predefined questions, use the exact missing positions given in the phase table.

Do not randomly relocate the missing number in predefined questions.

In infinite mode, vary the missing position based on the child's difficulty.

Suggested default distribution:

| Difficulty | Index 0 | Index 1 | Index 2 | Index 3 |
|---|---|---|---|---|
| Easy | 5% | 20% | 70% | 5% |
| Medium | 15% | 35% | 35% | 15% |
| Hard | 25% | 25% | 25% | 25% |

These distributions are configurable.

## 6. Distractor Generation

Generate distractors based on the missing value and difficulty.

### Easy

```text
Sequence: 2, 3, ?, 5
Options: 1, 4, 8
Correct: 4
```

Use fairly distinct distractors.

### Medium

```text
Sequence: 21, 22, ?, 24
Options: 20, 23, 25, 27
Correct: 23
```

Introduce nearby numbers.

### Hard

```text
Sequence: 76, 77, ?, 79
Options: 74, 75, 76, 78, 79, 80
Correct: 78
```

Hard questions may include numbers that already appear in the sequence as distractors, but the correct number must appear exactly once.

### Rules

- 3–6 unique football numerals.
- All option values from 1–99.
- Exactly one correct answer.
- Correct position varies.
- Avoid predictable correct-answer placement.
- Do not always make the correct answer numerically centered.
- Prefer nearby distractors in harder phases.
- Do not use identical distractor sets repeatedly.
- Use deterministic seeded generation for predefined questions.

## 7. Phase Breaks and Master Controller

After every 5 completed questions, trigger the shared Sparky fun interaction.

Example:

```text
Find Missing Number tutorial
  → Phase 1: 5 questions
  → Sparky interaction
  → Phase 2: 5 questions
  → Sparky interaction
  → Return control to Master Controller
```

During onboarding, the next mode will be Reach the Target Score.

When Find Missing Number appears again during mixed gameplay, resume from Phase 3.

The Master Controller must manage:

- Phase completion
- Sparky interaction triggering
- Mode transitions
- Return to saved phase
- Infinite-mode scheduling

Do not implement a separate scheduling system.

## 8. Data Model

Use JSON-compatible predefined sequence data.

Represent the missing value with `null` internally.

Example:

```json
{
  "modeId": "find_missing_number",
  "maxNumber": 99,
  "sequenceLength": 4,
  "sequenceStep": 1,
  "totalPredefinedQuestions": 100,
  "questionsPerPhase": 5,
  "totalPhases": 20,
  "phases": [
    {
      "phaseId": 1,
      "difficulty": "very_easy",
      "sequences": [
        [1, 2, null, 4],
        [2, 3, null, 5],
        [3, 4, null, 6],
        [4, 5, null, 7],
        [5, 6, null, 8]
      ],
      "optionCounts": [3, 3, 3, 3, 3]
    }
  ]
}
```

Implement all 20 phases from the provided table.

Resolved question format:

```json
{
  "questionId": "missing_001",
  "modeId": "find_missing_number",
  "phaseId": 1,
  "sequence": [1, 2, null, 4],
  "missingIndex": 2,
  "correctAnswer": 3,
  "optionCount": 3,
  "options": [2, 3, 6],
  "correctOptionIndex": 1,
  "difficulty": "very_easy"
}
```

On successful completion, create the completed sequence by replacing `null` with the correct number.

Example:

```json
{
  "completedSequence": [1, 2, 3, 4]
}
```

## 9. Infinite Procedural Generation

After completing all 100 predefined questions, switch this mode to infinite procedural gameplay.

Do not restart the predefined questions.

Generate sequences of four consecutive ascending numbers.

Rules:

- Starting number: 1–96
- Sequence length: 4
- Step: +1
- Missing position: 0–3
- Answer choices: 3–6
- All sequence and option values: 1–99
- Exactly one missing value
- Exactly one correct football
- No duplicate answer options
- Avoid repeating recent exact sequence configurations

### Difficulty Settings

**Easy**

- Prioritize lower number ranges.
- Favor missing positions 1 and 2.
- Use 3 answer choices.
- Use mostly distinct distractors.

**Medium**

- Include numbers up to approximately 60.
- Use all four missing positions.
- Use 4–5 answer choices.
- Introduce nearby distractors.

**Hard**

- Include numbers up to 99.
- Use all four missing positions.
- Use 5–6 answer choices.
- Use closer distractors and mixed number ranges.

Adapt difficulty from the child's recent first-attempt accuracy.

Keep difficulty changes gradual.

Every time the Master Controller requests a new phase, generate 5 procedural questions.

Continue indefinitely.

## 10. Progress Persistence

Save:

- Tutorial completion
- Current predefined phase
- Next predefined question
- Whether predefined progression is complete
- Current infinite difficulty
- Recent sequences
- Recent first-attempt accuracy

Do not reset progression when switching modes.

Restore the current question correctly after reopening the app.

## 11. Scoreboard UI

Reuse the existing scoreboard, but display the four-number sequence instead of a single number.

Requirements:

- Four values must fit inside the scoreboard.
- Use readable spacing between numbers.
- The missing position must display `?`.
- Correctly align one-digit and two-digit numbers.
- Keep the question mark visually distinct.
- Do not let the sequence overflow the scoreboard.
- Do not modify the surrounding game layout.
- Do not introduce additional panels or UI elements.

On correct completion:

1. Replace `?` with the correct number.
2. Keep the completed sequence visible briefly.
3. Play existing success feedback.
4. Continue to the next question or phase completion event.

## 12. Validation

Verify:

- Exactly 100 predefined questions exist.
- Exactly 20 predefined phases.
- Exactly 5 questions per phase.
- Every predefined sequence matches the provided table.
- Every sequence contains exactly 4 positions.
- Every sequence contains exactly one missing value.
- Every completed sequence has consecutive ascending integers.
- All sequence numbers are within 1–99.
- All answer numerals are within 1–99.
- Every question has 3–6 unique options.
- Exactly one football contains the correct missing value.
- Missing positions match predefined data.
- Correct answer positions vary.
- Tutorial is separate from predefined progression.
- Tutorial is completed once.
- Sparky breaks use the shared controller.
- Infinite mode begins after question 100.
- Procedural generation adapts to difficulty.
- At least 10,000 generated infinite questions pass automated validation.
- Saved progress resumes correctly after switching modes or reopening the game.

## 13. Final Constraints

**Keep this mode focused only on finding a missing number in four consecutive ascending numbers.**

Do not add skip counting, reverse counting, arithmetic sequences, or multiple missing numbers.

Do not create a new gameplay engine.

Reuse the existing football UI, shooting controls, animations, Sparky assets, tutorial architecture, and Master Series Mode Controller.

Implement only:

- Tutorial integration
- Predefined question data
- Phase progression
- Missing-number logic
- Distractor generation
- Correct-answer scoreboard update
- Infinite procedural generation
- Progress persistence
- Shared controller integration

Additional game-loop logic, fun interactions, feedback, and mascot behavior will be supplied separately.
