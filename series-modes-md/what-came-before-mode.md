# TASK: Implement What Came Before (Predecessor) Series Mode

## Context

Implement the **What Came Before** series mode within the existing preschool educational football game featuring Sparky.

This is the third series mode managed by the Master Series Mode Controller, after Kick & Count and What Comes Next.

Use the attached visual reference for the intended gameplay.

The football field, goal, scoreboard, Sparky mascot, shooting mechanics, animations, sound systems, and core UI already exist.

**Do not rebuild any of these systems.**

This mode follows the same structure and flow as What Comes Next, except the child must identify the number immediately before the displayed number rather than the number after it.

The game loop, Sparky fun interactions, feedback systems, and additional behaviors are managed through the existing shared architecture.

## 1. Core Gameplay

A number appears on the scoreboard above the goal.

The player must identify the number that comes immediately before it.

Example:

```text
Scoreboard: 12

Sparky:
"What comes before 12?"

Football choices:
9    11    13

Correct answer: 11
```

When the child kicks the correct football:

1. Play the existing successful shooting and goal animation.
2. Update the scoreboard to show the correct predecessor.
3. Play the appropriate existing Sparky success feedback.
4. Continue to the next question after the feedback sequence completes.

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

Follow the existing Kick & Count tutorial implementation pattern, just as What Comes Next does.

The tutorial must be short, visual, interactive, and easy for preschool children.

Use a simple tutorial question:

```json
{
  "modeId": "what_came_before",
  "isTutorial": true,
  "displayedNumber": 3,
  "correctAnswer": 2,
  "options": [1, 2, 5],
  "correctOptionIndex": 1
}
```

### Tutorial steps

1. Introduce the new activity using Sparky and the existing tutorial presentation system.
2. Display the number 3 on the scoreboard.
3. Ask the child to find the number immediately before 3.
4. Display three footballs containing 1, 2, and 5.
5. Follow the existing tutorial guidance pattern to help the child identify 2.
6. Allow the child to kick the football containing 2.
7. Play the existing successful goal animation and feedback.
8. Update the scoreboard from 3 to 2.
9. Mark the tutorial as completed.
10. Notify the Master Series Mode Controller to begin Phase 1.

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

During onboarding, the next mode will be Color Match.

When What Came Before appears again during mixed gameplay, continue from Phase 3.

Important:

- Incorrect attempts do not increase completed-question counts.
- One Sparky interaction is triggered per phase.
- The last goal animation must finish before the interaction begins.
- Do not start the next question during a Sparky interaction.
- Do not implement an independent scheduling system inside this mode.
- The Master Controller owns phase-break triggers and mode transitions.

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

Implement all 20 phases from the predefined progression table.

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
  "difficulty": "very_easy"
}
```

## 8. Infinite Procedural Mode

After completing all 100 predefined questions, switch this series mode to infinite procedural generation.

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

## 10. UI and Animation

Reuse the existing football gameplay scene.

For What Came Before:

- Show a single number on the scoreboard.
- Display 3–6 footballs carrying numerical answers.
- Use existing shooting and goal animations.
- Update the scoreboard to the predecessor after a successful kick.
- Use existing Sparky success and retry feedback.
- Keep two-digit numerals centered and legible.
- Wait for the goal animation and feedback to finish before requesting the next question.

Do not modify the visual design or introduce new objects.

## 11. Validation

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

Do not create a separate gameplay engine.

Do not change existing football mechanics, UI, animations, mascot assets, or the shared game loop.

Implement only the tutorial integration, question data, distractor generation, phase progression, infinite generation, progress persistence, and scoreboard update specific to What Came Before.
