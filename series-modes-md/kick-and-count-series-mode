# Task: Implement Revised Counting Progression for Football: Count & Kick

The game mechanics, UI, shooting system and mascot already exist.

Implement a data-driven counting journey consisting of **84 predefined questions**, subdivided into **17 phases**, followed by an **18th infinite gameplay phase**.

The important addition is a **Sparky Fun Interaction** after every phase (approximately every 4–5 completed questions).

I will separately explain and provide the Sparky interaction mechanics. For now, implement only the integration points, triggering logic and progression handling.

## 1. Predefined Journey

Create 84 questions in the following order.

Each phase contains 4 or 5 questions.

| Phase | Global question IDs | Target numbers | Choices |
|---|---|---|---|
| 1 | 1–4 | 1, 2, 3, 2 | 3 |
| 2 | 5–9 | 1, 3, 2, 3, 1 | 3 |
| 3 | 10–14 | 4, 2, 5, 3, 4 | 3 |
| 4 | 15–19 | 5, 1, 3, 2, 5 | 3 for Q15–17, 4 for Q18–19 |
| 5 | 20–24 | 4, 3, 2, 1, 5 | 4 |
| 6 | 25–29 | 6, 7, 8, 9, 10 | 4 |
| 7 | 30–34 | 4, 6, 3, 8, 5 | 4 |
| 8 | 35–39 | 9, 7, 10, 2, 6 | 4 |
| 9 | 40–44 | 1, 8, 10, 9, 7 | 4 |
| 10 | 45–49 | 11, 12, 13, 14, 15 | 4 |
| 11 | 50–54 | 8, 9, 10, 11, 12 | 5 |
| 12 | 55–59 | 13, 14, 15, 6, 7 | 5 |
| 13 | 60–64 | 11, 13, 15, 12, 14 | 5 |
| 14 | 65–69 | 16, 17, 18, 19, 20 | 5 |
| 15 | 70–74 | 11, 12, 13, 14, 15 | 5 |
| 16 | 75–79 | 16, 18, 20, 17, 19 | 6 |
| 17 | 80–84 | 8, 10, 15, 20, 18 | 6 |

Each question must include exactly one correct number. The display must show exactly the target quantity of footballs.

The answer numerals must all be unique integers between 1 and 20.

Generate distractors according to the corresponding difficulty, with easier phases favoring more distinct numbers and harder phases introducing more similar numbers.

Do not restrict distractor numerals to the target quantity range of the current phase.

Use deterministic generation for all predefined questions, so restarting or resuming does not change their answers.

## 2. Sparky Fun Interaction System

After completing the final question of each phase, pause normal counting gameplay and trigger a Sparky interaction.

Implement the following flow:

1. Child successfully completes the last counting question in the phase.
2. Allow the current goal animation and feedback to finish.
3. Trigger `SPARKY_INTERACTION_START`.
4. Pause question spawning, shooting controls and counting progress.
5. Launch the separate Sparky interaction experience when integrated.
6. Wait for `SPARKY_INTERACTION_COMPLETE`.
7. Resume counting gameplay with the next question.

Do not build the actual Sparky interaction at this stage. It will be explained separately.

Create a placeholder integration interface for it.

### Important rules

- The break must only activate once per phase.
- Never trigger it before the previous goal animation finishes.
- Incorrect attempts do not count toward completing a phase.
- Do not reset counting progress after the break.
- Do not generate the next question while Sparky's interaction is active.
- If the application closes during the break, restore the correct pending-break state when reopened.
- Do not show two break interactions consecutively.
- Never allow a failed or interrupted animation to permanently block progression.

## 3. Journey Completion

After question 84, trigger a special event:

`COUNTING_JOURNEY_COMPLETE`

This event can be used for a Football Champion celebration.

Wait for the celebration to complete, then activate:

`COUNTING_INFINITE_MODE_START`

Do not replay the predefined 84 questions automatically.

Persist journey completion so future game sessions can start directly in infinite mode.

## 4. Infinite Counting Mode

After the structured journey, generate questions procedurally.

Rules:

- Target quantity: 1–20
- Available answer choices: 3–6
- Exactly one correct answer
- No duplicate numerals
- Difficulty adapts to the child's recent performance
- Avoid consecutive identical target numbers
- Avoid recently repeated exact question configurations
- Use weighted target selection to balance easy and difficult counting tasks

Infinite mode has no fixed endpoint.

### Sparky interactions in infinite mode

Trigger a fun interaction after every **5 completed counting questions**.

Use the same event system:

`SPARKY_INTERACTION_START`

`SPARKY_INTERACTION_COMPLETE`

The infinite-mode interaction counter must begin at zero when infinite mode starts.

The counter must reset only after the corresponding interaction completes.

A retry or incorrect kick must not increase the counter.

## 5. Data Model

Use a data-driven configuration rather than hardcoded gameplay conditions.

Each phase should support:

```json
{
  "phaseId": 1,
  "mode": "counting",
  "startQuestion": 1,
  "endQuestion": 4,
  "targetNumbers": [1, 2, 3, 2],
  "optionCounts": [3, 3, 3, 3],
  "difficulty": "very_easy",
  "onComplete": {
    "event": "SPARKY_INTERACTION_START",
    "resumePhase": 2
  }
}
```

Generate a resolved question object such as:

```json
{
  "questionId": "count_001",
  "phaseId": 1,
  "targetCount": 1,
  "displayBallCount": 1,
  "options": [1, 4, 7],
  "correctAnswer": 1,
  "correctOptionIndex": 0
}
```

Keep phase progression independent of visual presentation.

## 6. Progress Persistence

Persist:

- Current fixed question ID
- Current phase
- Completed fixed question count
- Whether the predefined journey is complete
- Whether a Sparky interaction is pending or active
- Last completed Sparky interaction checkpoint
- Current infinite-mode difficulty
- Infinite-mode questions completed since last interaction
- Recent counting performance
- Recent generated questions

Ensure game progress is recoverable after closing and reopening the app.

## 7. Adaptive Difficulty

Use a rolling window of the last five completed questions.

Evaluate first-attempt correctness.

Increase difficulty gradually after sustained success.

Maintain difficulty after mostly successful performance.

Decrease difficulty after repeated errors.

In infinite mode, difficulty should control target quantity selection, distractor similarity and number of choices.

Avoid sudden difficulty spikes.

For incorrect answers, keep the current question active and use the existing retry behavior.

## 8. Required Validation

Write automated tests verifying:

- Exactly 84 predefined questions.
- Exactly 17 predefined phases.
- Phase 1 has 4 questions; all other predefined phases have 5 questions.
- Exactly 16 normal Sparky break checkpoints occur before the final fixed question.
- Question 84 triggers journey completion instead of a normal break.
- Every fixed target matches the specified sequence.
- Every question has exactly one correct answer.
- All numerals are within 1–20.
- Each question has 3–6 answer choices.
- No duplicate answer choices.
- The display never exceeds 20 footballs.
- Incorrect attempts do not increase progression counters.
- No premature or duplicate Sparky interactions.
- Pending breaks are correctly restored after reopening the app.
- Infinite mode starts after the champion celebration.
- Infinite mode triggers a Sparky interaction every 5 completed questions.
- At least 10,000 procedurally generated questions pass validation.

## 9. Architecture

Keep the following systems separate:

1. Fixed counting journey configuration
2. Fixed question generator
3. Procedural question generator
4. Distractor generator
5. Adaptive difficulty controller
6. Sparky interaction event manager
7. Progress persistence

The Sparky interaction implementation must remain replaceable without affecting counting questions.

### Final Constraint

**Do not modify the existing UI, football shooting system, goal animations, mascot design or core gameplay mechanics.**

Only implement the revised progression system, phase data, Sparky interaction checkpoints, infinite question generation and associated persistence.
