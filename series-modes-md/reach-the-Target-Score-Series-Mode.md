# TASK 5: Implement Reach the Target Score Series Mode

## Context

Implement the **Reach the Target Score** series mode within the existing preschool educational football game featuring Sparky.

This is the sixth series mode controlled by the existing Master Series Mode Controller.

Follow the attached reference image for the intended gameplay and scoreboard layout.

Reuse all existing football gameplay mechanics, shooting animations, goal feedback, mascot assets, tutorial infrastructure and phase-break integrations.

Do not create a separate gameplay engine.

The complete game loop, Sparky interactions and feedback behavior are managed by the shared systems and will be described separately.

## 1. Core Gameplay

The child must identify how many additional goals are required to reach a target score.

The scoreboard is divided into two sections.

### Left section: Current Score

- Occupies approximately 65% of the scoreboard width.
- Displays the number of goals already scored using small football icons.
- Does not display the current score as a large numeral.
- The number of icons must equal the current score.

### Right section: Target Score

- Occupies approximately 35% of the scoreboard width.
- Displays the target as a large, clearly readable numeral.
- Includes the label "Target".

Example:

```text
CURRENT                  TARGET
⚽ ⚽ ⚽                      5

Sparky:
"We have three goals.
We need five!
How many more?"

Answer footballs:
3     2     4

Correct answer: 2
```

The mathematical rule is:

`correctAnswer = targetScore - currentScore`

When the child kicks the correct football:

1. Play the existing successful goal animation.
2. Add the corresponding number of football icons to the current-score display.
3. Animate the score increasing from the current value to the target.
4. Stop precisely when the current score reaches the target.
5. Play the existing Sparky success feedback.
6. Wait for the animation to complete before advancing.

For example:

Current = 3, Target = 5.

The child kicks football 2.

The display updates from 3 football icons to 5 football icons.

The target is reached, so the question is complete.

**The numbered football represents how many goals to add, not a new total score.**

Do not require two separate kicks when the correct answer is 2. One correct kick adds two goals.

## 2. Number Limits and Rules

- Minimum target score: 2
- Maximum target score: 15
- Minimum current score: 1
- Maximum current score: 14
- Current score must always be smaller than target score.
- Minimum correct answer: 1
- Maximum correct answer: 14
- Every question must have exactly one correct answer.
- Display 3–6 answer footballs.
- Answer choices must be positive whole numbers.
- No duplicate answer choices.

For answer choices, use values from 1–15, excluding invalid answers for the current question.

All distractors must be unique and must not cause the total score to exceed 15.

For the easiest phases, use small current scores, small targets, and small missing quantities.

Never generate a question where current score already equals the target.

Never generate a question requiring the child to subtract goals.

## 3. Tutorial

Follow the existing Kick & Count tutorial implementation pattern.

Use a simple addition problem.

Tutorial configuration:

```json
{
  "modeId": "reach_target_score",
  "isTutorial": true,
  "currentScore": 1,
  "targetScore": 3,
  "correctAnswer": 2,
  "options": [1, 2, 3],
  "correctOptionIndex": 1
}
```

### Tutorial Flow

1. Introduce the game through the existing Sparky tutorial system.
2. Display one football icon under Current.
3. Display target 3 on the right side.
4. Ask the child how many more goals are needed.
5. Display answer footballs 1, 2, and 3.
6. Use the existing tutorial guidance system to highlight the correct answer.
7. Allow the child to kick football 2.
8. Play the existing shooting and goal animation.
9. Add two football icons to Current.
10. Current now displays three football icons.
11. Play the existing Sparky success feedback.
12. Mark the tutorial as completed.
13. Notify the Master Series Mode Controller to begin Phase 1.

Use the supplied audio/dialogue assets and available Sparky emotes.

Do not generate new dialogue or change the mascot design.

The tutorial question must not count toward predefined progression.

## 4. Predefined Progression

Create **100 predefined questions across 20 phases**.

Each phase contains exactly 5 questions.

Use the following progression.

The notation `3→5` means Current Score = 3, Target Score = 5.

The correct answer is the difference between the two values.

| Phase | Current → Target pairs | Choices |
|---|---|---|
| 1 | 1→2, 1→3, 2→3, 2→4, 3→4 | 3 |
| 2 | 1→4, 2→5, 3→5, 1→3, 4→5 | 3 |
| 3 | 1→5, 2→4, 3→6, 4→6, 2→5 | 3 |
| 4 | 1→6, 2→6, 3→5, 4→7, 5→7 | 3–4 |
| 5 | 2→7, 3→7, 4→8, 5→8, 6→8 | 4 |
| 6 | 1→7, 2→8, 3→8, 4→9, 6→9 | 4 |
| 7 | 5→9, 7→9, 3→9, 6→8, 4→7 | 4 |
| 8 | 2→9, 3→10, 5→10, 7→10, 8→10 | 4 |
| 9 | 1→8, 4→10, 6→10, 8→9, 7→10 | 4 |
| 10 | 2→10, 3→9, 5→9, 6→10, 9→10 | 4–5 |
| 11 | 3→11, 5→11, 7→11, 9→11, 10→11 | 5 |
| 12 | 2→12, 4→12, 6→12, 8→12, 11→12 | 5 |
| 13 | 3→13, 5→13, 7→13, 10→13, 12→13 | 5 |
| 14 | 4→14, 6→14, 8→14, 11→14, 13→14 | 5 |
| 15 | 5→15, 7→15, 9→15, 12→15, 14→15 | 5 |
| 16 | 1→11, 3→12, 5→13, 7→14, 9→15 | 5 |
| 17 | 10→12, 11→14, 12→15, 8→13, 9→14 | 5 |
| 18 | 2→15, 4→13, 6→14, 8→15, 10→15 | 5–6 |
| 19 | 11→15, 12→14, 13→15, 9→12, 7→11 | 6 |
| 20 | 1→15, 5→12, 10→15, 12→13, 8→14 | 6 |

### Difficulty Progression

**Phases 1–4: First Goals**

- Target scores from 2–7.
- Mostly small differences.
- Three answer footballs initially.
- Introduce four choices toward Phase 4.

**Phases 5–8: Goal Builder**

- Targets increase to 10.
- Introduce larger missing quantities.
- Encourage counting on from the current score.
- Four answer choices.

**Phases 9–12: Score Master**

- Targets increase to 12.
- Mix small and larger differences.
- Introduce more similar answer choices.
- Four to five answer footballs.

**Phases 13–16: Super Scorer**

- Targets increase to 15.
- Practice calculating missing amounts from different starting scores.
- Five answer choices.

**Phases 17–20: Target Champion**

- All valid targets up to 15.
- Mix small and large differences.
- Use nearby distractors.
- Five to six answer choices.
- Include mixed revision.

### Variable Answer Counts

- Phase 4: [3, 3, 3, 4, 4]
- Phase 10: [4, 4, 4, 5, 5]
- Phase 18: [5, 5, 5, 6, 6]

Do not modify the predefined current/target sequence.

## 5. Distractor Generation

Generate incorrect answer footballs programmatically.

### Easy

Example:

Current = 2, Target = 4

Correct answer = 2

Options: 1, 2, 4

### Medium

Current = 4, Target = 9

Correct answer = 5

Options: 3, 5, 6, 7

### Hard

Current = 8, Target = 15

Correct answer = 7

Options: 4, 5, 6, 7, 8, 9

### Rules

- Exactly one option must equal targetScore - currentScore.
- All answer values must be unique.
- Keep answer values between 1 and 15.
- Avoid invalid options where currentScore + option > 15.
- Use closer distractors in harder phases.
- Vary the correct answer's position.
- Never consistently place the correct answer in the center.
- Use deterministic seeded generation for predefined questions.

## 6. Scoreboard Update Behavior

The left section must display one football icon per existing goal.

Examples:

```text
Current = 2
⚽ ⚽

Current = 5
⚽ ⚽ ⚽ ⚽ ⚽

Current = 10
⚽ ⚽ ⚽ ⚽ ⚽
⚽ ⚽ ⚽ ⚽ ⚽
```

Arrange icons in compact, readable rows.

Do not display more than 15 current-score football icons.

When the player kicks the correct answer:

- Keep the target numeral unchanged.
- Add the missing number of football icons.
- Animate the icons appearing in sequence.
- Ensure the final icon count exactly matches the target.
- Keep the completed state visible during success feedback.

If the player kicks a wrong answer, do not change the Current score.

## 7. Phase Breaks

Every phase contains 5 completed questions.

After the fifth completed question, use the shared Sparky interaction system.

```text
Reach the Target Score tutorial
→ Phase 1: 5 questions
→ Sparky interaction
→ Phase 2: 5 questions
→ Sparky interaction
→ Master Controller continues
```

During first-time onboarding, the first two phases are played before returning to the Master Series Mode Controller.

When this mode appears again, continue from the next incomplete phase.

Do not implement a separate phase-break scheduler inside the mode.

## 8. Data Structure

Example configuration:

```json
{
  "modeId": "reach_target_score",
  "minTarget": 2,
  "maxTarget": 15,
  "totalPredefinedQuestions": 100,
  "questionsPerPhase": 5,
  "totalPhases": 20,
  "scoreboard": {
    "currentWidthPercent": 65,
    "targetWidthPercent": 35,
    "currentDisplay": "football_icons",
    "targetDisplay": "numeral"
  },
  "phases": [
    {
      "phaseId": 1,
      "difficulty": "very_easy",
      "scorePairs": [
        [1, 2],
        [1, 3],
        [2, 3],
        [2, 4],
        [3, 4]
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
  "questionId": "target_001",
  "modeId": "reach_target_score",
  "phaseId": 1,
  "currentScore": 1,
  "targetScore": 2,
  "correctAnswer": 1,
  "optionCount": 3,
  "options": [3, 1, 2],
  "correctOptionIndex": 1
}
```

## 9. Infinite Procedural Generation

After all 100 predefined questions are completed, switch this mode to infinite generation.

Rules:

- Target score: 2–15.
- Current score: 1 to targetScore - 1.
- Correct answer: targetScore - currentScore.
- Answer choices: 3–6.
- Exactly one correct answer.
- No duplicate options.
- Avoid repeated exact current/target configurations.
- Adapt difficulty using first-attempt accuracy.
- Continue producing phases of five questions indefinitely.

Suggested difficulty profiles:

**Easy**

- Target range 2–6.
- Prefer differences from 1–3.
- Three choices.

**Medium**

- Target range 5–10.
- Differences from 1–7.
- Four or five choices.

**Hard**

- Target range 8–15.
- Any valid positive difference.
- Five or six choices.
- More similar distractors.

For infinite mode, ensure the selected question permits enough valid unique distractors under the configured rules.

If a difficulty profile cannot produce the required answer count, reduce the option count rather than producing invalid data.

## 10. Progress Persistence

Save:

- Tutorial completion.
- Current predefined phase.
- Next predefined question.
- Predefined completion state.
- Infinite difficulty state.
- Recent generated questions.
- Recent first-attempt accuracy.

Do not reset progress when switching modes.

## 11. Validation

Test:

- Exactly 100 predefined questions.
- Exactly 20 phases.
- Exactly five questions per phase.
- All score pairs match the predefined data.
- Every target is between 2 and 15.
- Current score is always smaller than target.
- Correct answer always equals target - current.
- No answer football contains 0 or a negative number.
- All answer choices are unique.
- Every question has 3–6 choices.
- Exactly one correct choice.
- Current scoreboard never displays more than 15 icons.
- Correct kicks update Current to exactly Target.
- Incorrect kicks leave Current unchanged.
- Tutorial is separate from predefined progression.
- Phase breaks use the shared controller.
- Infinite generation starts after question 100.
- At least 10,000 generated infinite questions pass validation.

## 12. Final Constraints

Do not introduce multi-kick addition, subtraction, negative scores, or targets above 15.

**One correct kick must complete the missing-score calculation.**

Preserve the existing football game UI and mechanics.

Only implement the Reach the Target Score tutorial, two-part scoreboard, predefined phases, distractor generation, score-update animation, infinite generator, progress persistence, and integration with the shared Master Series Mode Controller.
