# TASK: Implement Color Match Series Mode

## Context

Implement the **Color Match** series mode within the existing preschool educational football game featuring Sparky.

This is the fourth mode registered with the Master Series Mode Controller.

Follow the attached reference image.

Reuse the existing football field, goal, scoreboard, mascot, shooting animations, sound systems, tutorial architecture, phase-break system, and Master Series Mode Controller.

Do not build a separate gameplay engine.

## 1. Core Gameplay

The scoreboard displays a target color.

The child must kick the football whose surface matches that color.

Example:

```text
Scoreboard:
BLUE

Sparky:
"Kick the blue ball!"

Football choices:
Blue | Red | Purple | White

Correct answer: Blue
```

Unlike the counting and number sequence modes, the answer footballs must be colored soccer balls, not regular footballs displaying numerical answers.

When the child kicks the correct colored football:

1. Play the existing successful shooting animation.
2. Play the normal goal celebration.
3. Use the available Sparky success feedback.
4. Advance when the feedback finishes.

For incorrect choices, use the existing unsuccessful kick and retry behavior.

Do not advance until the child selects the correct colored football.

## 2. Supported Colors

Use **only the following 11 colors**.

```json
{
  "supportedColors": [
    { "id": "orange", "name": "Orange", "hex": "#F97316" },
    { "id": "yellow", "name": "Yellow", "hex": "#FACC15" },
    { "id": "green", "name": "Green", "hex": "#22C55E" },
    { "id": "blue", "name": "Blue", "hex": "#2563EB" },
    { "id": "purple", "name": "Purple", "hex": "#9333EA" },
    { "id": "pink", "name": "Pink", "hex": "#EC4899" },
    { "id": "brown", "name": "Brown", "hex": "#92400E" },
    { "id": "red", "name": "Red", "hex": "#EF4444" },
    { "id": "black", "name": "Black", "hex": "#171717" },
    { "id": "gray", "name": "Gray", "hex": "#9CA3AF" },
    { "id": "white", "name": "White", "hex": "#FFFFFF" }
  ]
}
```

Do not introduce any other named colors.

Do not introduce shades such as light blue, dark green, lime, cyan, gold, beige, or maroon.

Use the specified color IDs for game logic.

Actual rendered ball materials may use highlights and shadows, but their underlying colors must remain recognizable and consistent.

## 3. Scoreboard Behavior

The main scoreboard must display the target color's name in large, readable text.

Example:

`BLUE`

The color name should also be rendered in its corresponding color where legibility permits.

For difficult-to-read colors such as Yellow, White, Gray, and Black, apply appropriate contrasting outlines or text treatments so the word remains legible against the scoreboard background.

Do not allow decorative effects to change the perceived color.

The color name must fit inside the existing scoreboard.

Do not resize or redesign the overall scoreboard structure.

## 4. Colored Footballs

Each answer football must be rendered using the corresponding color asset or material.

Requirements:

- All balls should preserve the existing football size and interaction hitbox.
- Use consistent lighting and shading.
- The balls must remain clearly distinguishable.
- The colors should not be washed out by highlights.
- White and Gray must remain visually distinct.
- Black must remain visible against the field.
- Brown and Orange must remain distinguishable.
- Blue and Purple must remain distinguishable.
- Red and Pink must remain distinguishable.

Use existing color ball assets if available.

If the assets are not available, implement a reusable color-material or tint system on the existing football asset, preserving its recognizable soccer-ball appearance.

Do not invent additional visual objects or change the gameplay layout.

## 5. Tutorial

Follow the existing Kick & Count tutorial lifecycle and presentation pattern.

Use a very easy color recognition question.

Tutorial configuration:

```json
{
  "modeId": "color_match",
  "isTutorial": true,
  "targetColor": "red",
  "optionCount": 3,
  "options": ["blue", "red", "yellow"],
  "correctAnswer": "red",
  "correctOptionIndex": 1
}
```

### Tutorial Flow

1. Introduce the new color-matching activity using Sparky.
2. Display RED on the scoreboard using its corresponding color styling.
3. Ask the child to find the red football using the provided dialogue assets.
4. Show Blue, Red, and Yellow footballs.
5. Follow the existing tutorial guidance pattern to highlight the red football.
6. Allow the child to kick the red football.
7. Play the normal goal and success animations.
8. Mark the tutorial as completed.
9. Notify the Master Series Mode Controller to begin Phase 1.

Use supplied Sparky audio/dialogue and available emotes.

Do not invent new voice lines when appropriate assets already exist.

Do not count the tutorial as one of the predefined questions.

The tutorial must play only once during first-time onboarding.

## 6. Predefined Progression

Create **60 predefined questions across 12 phases**.

Each phase contains exactly 5 questions.

All 11 colors must appear repeatedly across the predefined journey.

Use the following sequence.

| Phase | Target color sequence | Choices |
|---|---|---|
| 1 | Red, Blue, Yellow, Green, Red | 3 |
| 2 | Green, Yellow, Blue, Red, Yellow | 3 |
| 3 | Orange, Purple, Pink, Red, Blue | 3 |
| 4 | Brown, Orange, Purple, Pink, Green | 3–4 |
| 5 | Black, White, Gray, Blue, Red | 4 |
| 6 | White, Black, Gray, Brown, Yellow | 4 |
| 7 | Purple, Orange, Pink, Brown, Green | 4 |
| 8 | Black, White, Gray, Purple, Pink | 4–5 |
| 9 | Red, Pink, Blue, Purple, Orange | 5 |
| 10 | Yellow, Orange, Brown, Gray, White | 5 |
| 11 | Green, Blue, Black, Purple, Red | 5–6 |
| 12 | Brown, Pink, Yellow, White, Gray | 6 |

### Difficulty Progression

**Phases 1–2: First Colors**

- Focus on Red, Blue, Yellow, and Green.
- Use 3 answer footballs.
- Prefer strongly contrasting distractors.
- Avoid unnecessary visual difficulty.

**Phases 3–4: More Colors**

- Introduce Orange, Purple, Pink, and Brown.
- Begin with 3 choices.
- Gradually introduce 4 choices.

**Phases 5–6: Black, Gray, and White**

- Introduce the three neutral colors.
- Ensure strong visual clarity and contrast.
- Use 4 answer footballs.

**Phases 7–8: All Colors**

- Mix previously introduced colors.
- Use 4–5 answer footballs.
- Begin introducing moderately similar distractors.

**Phases 9–10: Color Recognition Challenge**

- Include visually similar color combinations.
- Use 5 answer footballs.
- Make the child identify the actual target rather than relying on elimination of very different colors.

**Phases 11–12: Color Champion**

- Use all 11 colors.
- Use 5–6 answer footballs.
- Mix easy and challenging combinations.
- Reinforce recognition without introducing additional shades.

### Variable Answer Counts

- Phase 4: [3, 3, 3, 4, 4]
- Phase 8: [4, 4, 4, 5, 5]
- Phase 11: [5, 5, 5, 6, 6]

All other phases use the fixed answer count in the table.

## 7. Distractor Generation

Generate incorrect color footballs from the supported 11-color palette.

### Easy

Target: Red

Options: Red, Blue, Yellow

Choose strongly different colors.

### Medium

Target: Blue

Options: Blue, Purple, Green, Red

Introduce moderately similar colors.

### Hard

Target: Orange

Options: Orange, Yellow, Red, Brown, Pink, Green

Introduce more perceptually similar choices.

### Important Rules

- Every question must have exactly one correct color.
- All answer footballs must have unique color IDs.
- Only the 11 supported colors may appear.
- The correct answer position must vary.
- Do not consistently put the correct ball in the center.
- Avoid repeating the same distractor set.
- Prefer high visual contrast in early phases.
- Introduce similar colors in later phases.
- Use deterministic seeded answer generation for predefined questions.

Do not rely on the color name's numeric position in the supported color array to determine difficulty.

Use an explicit configurable similarity map if needed.

## 8. Phase Breaks

Every phase contains 5 completed questions.

After the fifth completed question, trigger the existing Sparky fun interaction through the Master Series Mode Controller.

During onboarding:

```text
Color Match tutorial
→ Phase 1: 5 questions
→ Sparky interaction
→ Phase 2: 5 questions
→ Sparky interaction
→ Master Controller switches to next mode
```

The next onboarding mode is Find Missing Number.

When Color Match appears again, resume from Phase 3.

Do not implement an independent break scheduler.

Incorrect kicks do not count as completed questions.

## 9. Data Structure

Use JSON-compatible phase data.

Example:

```json
{
  "modeId": "color_match",
  "supportedColorIds": [
    "orange",
    "yellow",
    "green",
    "blue",
    "purple",
    "pink",
    "brown",
    "red",
    "black",
    "gray",
    "white"
  ],
  "totalPredefinedQuestions": 60,
  "totalPhases": 12,
  "questionsPerPhase": 5,
  "phases": [
    {
      "phaseId": 1,
      "difficulty": "very_easy",
      "targetColors": [
        "red",
        "blue",
        "yellow",
        "green",
        "red"
      ],
      "optionCounts": [3, 3, 3, 3, 3]
    }
  ]
}
```

Implement all 12 phases from the predefined table.

Resolved question format:

```json
{
  "questionId": "color_001",
  "modeId": "color_match",
  "phaseId": 1,
  "targetColor": "red",
  "optionCount": 3,
  "options": ["blue", "red", "yellow"],
  "correctAnswer": "red",
  "correctOptionIndex": 1,
  "difficulty": "very_easy"
}
```

## 10. Infinite Procedural Mode

After completing all 60 predefined questions, enter infinite procedural Color Match gameplay.

Do not restart the predefined phase sequence.

Continue generating phases of 5 questions.

Use only the 11 supported colors.

### Infinite Generation Rules

- Each question selects one of the 11 colors as its target.
- Generate 3–6 unique colored answer footballs.
- Exactly one ball must match the target.
- Randomize answer positions.
- Avoid the same target color in consecutive questions.
- Avoid repeating recent exact option configurations.
- Maintain balanced exposure to all 11 colors over time.
- Gradually adapt difficulty according to the child's performance.

### Difficulty Profiles

**Easy**

- Three answer footballs.
- Strongly contrasting color choices.
- Emphasize familiar colors.

**Medium**

- Four or five answer footballs.
- Mix all 11 colors.
- Include occasional visually similar distractors.

**Hard**

- Five or six answer footballs.
- Include multiple perceptually similar colors.
- Balance difficult questions with occasional easier ones.

### Balanced Repetition

Use a shuffle-bag system for target color selection.

Each full bag should contain all 11 colors exactly once.

Shuffle the bag, then consume colors one by one.

When the bag is empty, generate a new shuffled bag.

Avoid repeating the same color across the boundary between two bags.

This ensures that every color is encountered regularly without making the order predictable.

The game must not use a permanently fixed repeating sequence.

Difficulty should primarily affect distractor selection and answer count, not remove supported colors from the experience indefinitely.

## 11. Color Recognition and Accessibility

Because the game is intended for preschool children:

- Keep colors clear and recognizable.
- Avoid subtle shades.
- Avoid visually confusing lighting.
- Maintain strong separation between footballs.
- Keep colored balls consistent in size.
- Preserve accurate color naming.
- Do not introduce patterns that could obscure the underlying color.
- Do not make the player rely only on reading color names.

The scoreboard should provide a visual color cue as well as the written name, and the existing relevant Sparky audio should reinforce the target.

Do not require preschool children to read the word to understand which color they need.

## 12. Progress Persistence

Store:

- Tutorial completion.
- Current predefined phase.
- Next predefined question.
- Predefined completion status.
- Infinite difficulty state.
- Recent color history.
- Current shuffle-bag progress.
- Recent first-attempt accuracy.

When switching modes, save progress.

When returning, resume the appropriate phase or infinite gameplay position.

Do not replay the tutorial.

## 13. Validation

Automated tests must verify:

- Exactly 60 predefined questions.
- Exactly 12 predefined phases.
- Exactly five questions per phase.
- All 11 supported colors appear in the predefined progression.
- Only valid color IDs are used.
- All answer choices are unique.
- Every question includes the correct target color exactly once.
- Every question contains 3–6 footballs.
- Correct answer position varies.
- Predefined questions are deterministic.
- Tutorial is separate from predefined progression.
- Tutorial plays once.
- Phase breaks are triggered through the Master Controller.
- Infinite generation starts after question 60.
- Infinite mode repeatedly covers all 11 colors.
- No immediate consecutive identical target colors.
- Progress restoration works.
- At least 10,000 procedural questions pass validation.

## 14. Final Constraints

This mode must remain a simple color recognition and matching game.

**Do not introduce color mixing, gradients, shade matching, color spelling, or additional color names.**

Use only:

Orange, Yellow, Green, Blue, Purple, Pink, Brown, Red, Black, Gray, White.

Do not rebuild the existing football UI or game mechanics.

Implement only the Color Match tutorial, predefined color phases, color-ball rendering, distractor generation, infinite procedural repetition, progress persistence and Master Series Mode Controller integration.

The full game loop, Sparky fun interactions and additional feedback behavior will be provided separately.
