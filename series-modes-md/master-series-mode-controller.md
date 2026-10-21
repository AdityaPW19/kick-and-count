# TASK: Implement Master Series Mode Controller for Football Game

## Context

We are building a preschool educational football game featuring Sparky.

The core gameplay, football kicking mechanics, shooting animations, goal feedback, mascot assets and the Kick & Count tutorial already exist.

We now need a **Master Series Mode Controller** to manage multiple educational modes within the same continuous game experience.

Do not rebuild existing gameplay systems. Reuse them.

The complete game loop, fun interactions, Sparky feedback and additional behaviors will be provided separately in chat prompts. Keep integration points flexible for those implementations.

## 1. Supported Series Modes

The game will contain six series modes:

1. `kick_and_count` — Count footballs and kick the matching numeral.
2. `what_comes_next` — Identify the successor of a displayed number.
3. `what_came_before` — Identify the predecessor of a displayed number.
4. `color_match` — Match the requested color.
5. `find_missing_number` — Identify a missing number in a sequence.
6. `reach_target_score` — Reach a given target score using the mode's own mechanics.

Each mode will have its own tutorial, predefined phases, question generator and difficulty progression.

For now, only integrate the existing Kick & Count mode and the new What Comes Next mode. Register the remaining four as future modes with integration interfaces, but do not invent their mechanics or data.

## 2. First-Time Onboarding Progression

When a child plays for the first time, introduce the six modes sequentially.

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
  → ...
```

**Important:** All six tutorials must be completed before entering mixed-mode progression.

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

The Sparky interaction system will be explained separately.

For now, implement the checkpoint events, pause/resume behavior and safe callback handling.

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

Once all six introductory tutorials and their initial two phases have been completed, transition into mixed-mode gameplay.

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

Avoid pure random mode selection that could accidentally ignore some modes for long periods.

The first cycle after onboarding should preferably cover every available mode before repeating one.

## 6. Per-Mode Predefined Progression

Each mode owns its own predefined question and phase sequence.

For example:

- Kick & Count has 84 predefined questions across 17 phases.
- What Comes Next will have its own predefined question journey.
- The remaining modes will provide their configurations separately.

When a mode is selected, continue from its saved phase and question position.

Do not reset its progression when switching to another mode.

When its predefined content finishes, mark that specific mode as having entered infinite mode.

Other modes must continue with their own remaining predefined questions until completed.

## 7. Infinite Mixed Gameplay

Each mode must expose:

```ts
getNextQuestion()
hasPredefinedQuestionsRemaining()
generateInfiniteQuestion()
getDifficultyState()
```

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

The master controller must not know how to generate a counting, successor, color or arithmetic question.

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
    }
  },
  "pendingSparkyInteraction": null,
  "lastCompletedBreakId": null
}
```

The actual stored schema may differ, but it must include enough information to resume safely.

Never accidentally restart the child from the first tutorial or first phase after switching modes or reopening the game.

Persist mode selection state so a saved session resumes consistently.

## 11. Future Game Loop Integration

The complete game loop, Sparky fun interactions, feedback behavior and mode-specific mechanics will be provided in later prompts.

Do not assume or implement features that have not yet been specified.

Provide clean integration points for future instructions.

The controller should be reusable without requiring major changes when the remaining modes are implemented.

## 12. Validation

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
