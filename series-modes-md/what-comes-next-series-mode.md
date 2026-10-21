# TASK: Implement What Comes Next (Successor) Series Mode

## Context

Implement the **What Comes Next** educational series mode within the existing Football: Count & Kick game.

This mode will be controlled by the Master Series Mode Controller described in Task 1.

Use the attached visual reference for the intended gameplay.

The football field, goal, scoreboard, Sparky mascot, shooting mechanics, animations, sound systems and core UI already exist.

Do not rebuild them.

The only gameplay difference is the question logic.

## 1. Core Gameplay

A number appears on the scoreboard above the goal.

The player must identify the number that comes immediately after it.

Example:

```text
Scoreboard: 12

Sparky:
"What comes after 12?"

Football choices:
11    13    15

Correct answer: 13
```

When the child kicks the correct football, play the existing successful goal animation and feedback.

Then update the scoreboard to show the correct successor, matching the reference concept, before transitioning to the next question.

For an incorrect football, use the existing unsuccessful kick and retry behavior.

Do not advance until the question is successfully completed.

## 2. Number Range

All displayed questions and answer choices must use integers from 1 to 99.

The mathematical rule is:

`correctAnswer = displayedNumber + 1`

Since the maximum answer is 99, the maximum displayed number is 98.

Therefore:

- Displayed number range: 1–98
- Correct answer range: 2–99
- Answer choices: 3–6 footballs
- All answer choices are unique
- Exactly one answer must be correct

Do not show 99 as the starting number because the successor would be 100, outside the supported range.

## 3. Tutorial

Follow the existing Kick & Count tutorial implementation pattern and flow.

This mode's tutorial should be short, visual, interactive and extremely easy.

Use a simple starting question:

```json
{
  "modeId": "what_comes_next",
  "isTutorial": true,
  "displayedNumber": 2,
  "correctAnswer": 3,
  "options": [1, 3, 5],
  "correctOptionIndex": 1
}
```

Tutorial steps:

1. Show the scoreboard and introduce the new activity with Sparky.
2. Display the number 2.
3. Ask the child to find the next number.
4. Display three footballs containing 1, 3 and 5.
5. Use the existing tutorial guidance pattern to help the child identify 3.
6. Allow the child to kick the football containing 3.
7. Play the existing goal celebration and appropriate Sparky feedback.
8. Mark the tutorial as completed.
9. Notify the Master Series Mode Controller to begin the mode's first phase.

Use the supplied Sparky dialogue/audio assets and existing mascot emotes wherever appropriate.

Do not invent new dialogue lines or use text-to-speech if suitable assets are already provided.

The tutorial question must not count toward the predefined progression.

Once completed, the tutorial must not replay during regular mixed-mode gameplay.

## 4. Predefined Progression

Create exactly **100 predefined questions arranged into 20 phases**.

Each phase contains 5 questions.

Use the following fixed starting-number sequence. The correct answer for every entry is its successor.

| phase | Starting numbers | Answer choices |
|---|---|---|
| 1 | 1, 2, 3, 4, 5 | 3 |
| 2 | 3, 6, 4, 7, 8 | 3 |
| 3 | 5, 7, 8, 9, 2 | 3 |
| 4 | 9, 4, 6, 8, 9 | 3–4 |
| 5 | 10, 11, 12, 13, 14 | 4 |
| 6 | 15, 16, 17, 18, 19 | 4 |
| 7 | 9, 19, 10, 14, 18 | 4 |
| 8 | 12, 16, 19, 7, 15 | 4 |
| 9 | 20, 21, 24, 27, 29 | 4 |
| 10 | 22, 25, 28, 29, 30 | 4–5 |
| 11 | 31, 34, 37, 39, 40 | 5 |
| 12 | 42, 45, 48, 49, 35 | 5 |
| 13 | 40, 49, 50, 54, 59 | 5 |
| 14 | 51, 56, 59, 60, 64 | 5 |
| 15 | 65, 67, 69, 70, 72 | 5 |
| 16 | 58, 63, 68, 74, 59 | 5 |
| 17 | 75, 78, 79, 80, 84 | 5 |
| 18 | 85, 87, 89, 90, 94 | 5–6 |
| 19 | 95, 96, 97, 98, 89 | 6 |
| 20 | 9, 19, 49, 79, 98 | 6 |

In phases containing a variable answer-choice count, introduce the larger count toward the end of the phase.

The progression should gradually introduce:

- Small numbers
- Teen numbers
- Two-digit numbers
- Crossing multiples of ten
- Larger two-digit numbers
- Similar-looking distractors
- Mixed revision questions

Do not alter this predefined sequence unless explicitly instructed.

## 5. Difficulty and Distractor Generation

Generate the incorrect football numerals programmatically.

### Easy

Use 3 answer choices.

Example:

```text
Scoreboard: 4
Options: 2, 5, 8
Correct: 5
```

Avoid making all distractors numerically adjacent to the answer.

### Medium

Use 4–5 answer choices.

Example:

```text
Scoreboard: 23
Options: 21, 24, 26, 29
Correct: 24
```

Introduce closer numerical choices.

### Hard

Use 5–6 answer choices.

Example:

```text
Scoreboard: 78
Options: 76, 77, 79, 80, 81, 83
Correct: 79
```

Hard questions may use adjacent numbers to test stronger successor understanding.

However, not every hard question must have consecutive distractors.

### Important distractor rules

- All options must be unique.
- All values must be between 1 and 99.
- Exactly one option must equal the successor.
- The correct answer position must vary.
- Do not consistently put the correct answer in the center.
- Avoid patterns where the largest or smallest answer is always correct.
- Ensure options stay readable, especially when displaying six two-digit numbers.

For the 100 predefined questions, use deterministic seeded distractor generation so revisiting a question gives the same answer configuration.

## 6. phase Breaks

After every 5 completed questions, trigger the shared Sparky fun interaction.

Example:

```text
What Comes Next
  → Phase 1: 5 questions
  → Sparky Fun Interaction
  → Phase 2: 5 questions
  → Sparky Fun Interaction
  → Return control to Master Controller
```

During first-time onboarding, the Master Controller will switch to the next new series mode after these initial two phases.

When What Comes Next appears again later, resume from Phase 3.

Continue this progression until all 20 predefined phases are completed.

Do not implement an independent scheduling system inside this mode.

The Master Controller is responsible for deciding when the mode is selected.

## 7. Phase Data Format

Use a JSON-compatible data model.

Example:

```json
{
  "modeId": "what_comes_next",
  "maxNumber": 99,
  "totalPredefinedQuestions": 100,
  "questionsPerPhase": 5,
  "totalPhases": 20,
  "tutorialRequired": true,
  "phases": [
    {
      "phaseId": 1,
      "difficulty": "very_easy",
      "startingNumbers": [1, 2, 3, 4, 5],
      "optionCounts": [3, 3, 3, 3, 3]
    },
    {
      "phaseId": 2,
      "difficulty": "easy",
      "startingNumbers": [3, 6, 4, 7, 8],
      "optionCounts": [3, 3, 3, 3, 3]
    }
  ]
}
```

Implement all 20 phases from the provided table, not just the two examples in this JSON.

Each resolved question should look like:

```json
{
  "questionId": "next_001",
  "modeId": "what_comes_next",
  "phaseId": 1,
  "displayedNumber": 1,
  "correctAnswer": 2,
  "optionCount": 3,
  "options": [4, 2, 7],
  "correctOptionIndex": 1,
  "difficulty": "very_easy"
}
```

## 8. Infinite Procedural Mode

After completing all 100 predefined questions, switch this mode to infinite procedural generation.

Do not restart its predefined phases.

Generate fresh successor questions indefinitely.

Rules:

- Starting number: 1–98
- Correct answer: starting number + 1
- Number of choices: 3–6
- Exactly one correct answer
- No duplicate football numerals
- Avoid repeating the same starting number consecutively
- Avoid repeating recent exact question configurations
- Maintain a mix of easier, medium and harder questions

Use a configurable weighted number distribution.

Suggested initial weights:

- 1–10: 20%
- 11–20: 20%
- 21–50: 25%
- 51–75: 20%
- 76–98: 15%

These are default weights, not rigid requirements for every child. Adapt them based on recent gameplay performance.

Increase difficulty after sustained first-attempt success.

Decrease difficulty after repeated incorrect attempts.

Do not penalize the child for mistakes.

The infinite generator must integrate with the Master Series Mode Controller and return a phase of 5 questions whenever requested.

The Master Controller remains responsible for Sparky breaks and mode transitions.

## 9. Progress and Resume

Save:

- Tutorial completion
- Current predefined phase
- Next predefined question
- Whether predefined progression is complete
- Current infinite difficulty
- Recent question history
- Recent first-attempt accuracy

If the player leaves this mode and later returns, resume from the next unfinished question.

Do not restart the tutorial.

Do not reset predefined progress when switching to another series mode.

## 10. UI and Animation Requirements

Reuse the existing football game scene.

For this mode:

- Display a single number on the main goal scoreboard.
- Do not display a collection of football icons on the scoreboard as Kick & Count does.
- Show 3–6 footballs containing numeric choices.
- Keep two-digit numerals legible and centered.
- Reuse existing goal shooting and feedback animations.
- On a correct kick, update the scoreboard to the successor as part of the success feedback sequence, as shown in the reference.
- After feedback finishes, let the Master Controller advance progression.

Do not change Sparky's visual design or create new game assets unless requested.

## 11. Validation

Test the following:

- Exactly 100 predefined questions exist.
- Exactly 20 predefined phases exist.
- Every phase contains exactly 5 questions.
- The predefined starting-number sequence matches the supplied table.
- Every correct answer equals displayedNumber + 1.
- Every displayed number is between 1 and 98.
- Every answer option is between 1 and 99.
- Every question contains 3–6 options.
- Every question has exactly one correct option.
- No duplicate option values.
- The tutorial question is separate from the 100 predefined questions.
- The tutorial is marked completed correctly.
- The mode resumes correctly after Master Controller transitions.
- Sparky interactions are triggered through the common checkpoint system.
- After question 100, the mode uses procedural generation.
- Run automated validation on at least 10,000 generated infinite questions.

## 12. Final Constraints

Do not create a separate game screen or duplicate the football gameplay engine.

Do not implement your own mode rotation or Sparky interaction scheduler.

Use the existing game systems and the Master Series Mode Controller.

Only implement:

- What Comes Next tutorial integration
- Predefined successor question data
- Difficulty-based distractors
- phase progression
- Infinite question generation
- Mode-specific progress persistence
- Correct-answer scoreboard update

Any additional game-loop rules, mascot interactions, feedback or animations will be provided separately in future chat prompts.
