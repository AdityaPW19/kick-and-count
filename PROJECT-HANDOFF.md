# Kick & Count: continuation notes

Read this before continuing in a new chat. Detailed architecture and lifecycle
contracts are in [SCENE-SYSTEMS.md](SCENE-SYSTEMS.md). These notes describe verified
current behavior, not a request to rebuild the game.

## Project and verification

- Dependency-free HTML/CSS/JavaScript; centered contain-scaled 1365×768 landscape
  design space. Windows PowerShell: chain commands with `;`, not `&&`.
- From workspace root: `node ./kick-and-count/preview-server.cjs` serves
  http://127.0.0.1:4173/. Reuse a running server rather than starting duplicates.
- Run `node --test ./kick-and-count/tests/*.test.cjs` (90 tests: counting, successor,
  master routing, real-engine integration, physics, Wizzle story). Syntax-check changed JS with `node --check`.
- Preview routes: `?scene=game` saved counting, `?scene=lab` scene primitives,
  `?scene=intro` onboarding, `?scene=tutorial` practice.
- Type **debug** to reveal developer previews/state. Hidden by default. Do not
  expose scores, phase numbers or development controls in child-facing gameplay.
- No assumption that local edits are committed or pushed. Check repository status.

## Quality requirements / do not regress

- Reuse supplied images, sprites, sounds, and polished intro/tutorial choreography.
  Avoid emoji stand-ins, abrupt spawns, guessed filenames, generic pose selection,
  static-looking cutscenes, or claiming visual quality based only on unit tests.
- Keep decoded sprite nodes mounted and toggle visibility; do not swap image URLs
  mid-pose. Sheets use inner-image translation. All gameplay pose layers breathe
  with a 3s scale(1) to scale(1.015,1.020), sleep retains 1.025 vertically,
  origin 50% 96%; the actor
  owns entrance/recoil transforms separately. Respect reduced motion.
- Pause, hidden tabs, portrait and audio gates must freeze animations/audio/video,
  active-time waits and inputs. Stop/help replay must cancel old continuations,
  clean temporary DOM/media, and preserve accepted feedback/checkpoints.
- Validate desktop and landscape mobile (e.g. 844×390), actual sound routing,
  camera transitions, pause and cleanup. Wait for resize sync + rendering frames
  before measuring. Integrated browser pages becoming hidden legitimately pause.
- Preserve player progress during QA: back up and restore exact storage; do not
  reset localStorage globally or leave forced story unlocks behind.

## Architecture

- `scene.js/css`: pitch/camera, board, rolling/bouncing choice entrance; wide,
  close and dramatic shots smoothly continue from visible camera transform.
- `intro.js/css`: first-visit onboarding film. `tutorial.js/css`: fixed practice
  count2/options1,2,3. Normal first visit onboarding → practice → counting;
  returning users with both completion flags enter saved counting.
- `game/progression/engine.js`: immutable exact 84 questions/17 phases, then phase18
  adaptive infinite (1–20 count, 3–6 choices). Wrong answers never advance;
  `finishFeedback()` commits accepted success after presentation. Pending breaks
  and champion persist until acknowledged. Save `sparky-counting-progression:v1`.
- `game/main.js/css`: mode adapter, presentation ownership/generation cancellation,
  help/debug, answer flight and engine bridge. Other modes can reuse primitives.
- `game/director.js/css`: retained coach, audio, active clock, intro/feedback/break
  scripts and effects; global `SparkyDirector`. See `.state` for diagnostics.
- `game/ball-physics.js`: pure ground travel/ballistic height/depth/squash/spin/
  shadow tracks. Wrong cycle wide miss/post/right-turf/coach. Both post and wide
  independently alternate sides. Upright inner faces measured at .084/.916 of
  contained goal PNG; do not aim at outer element corner or toward Sparky.
  Diminishing rebounds settle to exact answer slot. Successful goal path retained.
- `game/wizzle-story.js`: pure completed-encounter variant gating.

## Current presentation

- Intro peek matches onboarding: left calc(-90px - gutter), top185, 580-square.
  Duty line uses visible salute. Sleep has supplied pointer poke vs ball hit:
  poke uses normal apology/Ronaldo lines; apology holds flustered-shy-smile.
  Ball contact alone uses yar-bol..., mujhe-kyu-toda, or aliens-ki... reactions.
- Ronaldo superstar phone greeting ends excited; rest/coaching anecdote addresses
  player without phone poses, retaining laughing punchline. Contextual thought,
  confused, annoyed, pointing, cocky and salute sprites are mapped.
- Regular intros use intro music + optional muted looping animated2 field movie
  under pitch camera, static pitch fallback. Smooth camera pullback then board's
  tutorial-style 750ms drop/overshoot, summon and choice entrance.
- Gameplay music: all four main-game tracks, nonlooping shuffled bags with no
  adjacent repeats. Actual source completion advances; temporary intro/Wizzle
  tracks restore queue. Dialogue ducks music. Bonk plays on answer/bonus kicks.
- Each question reveal launches a shuffled `start/` voice asynchronously via
  `questionStart()`, without claiming script/busy ownership or delaying choices.
  Voice leaves pointing/summon poses under controller ownership. Cook/goalmaxxing/
  aura/rizz lines show compact right-side splashes, away from board and choices;
  `interruptVoice()` removes them on kick/preview/stop and stops the voice.
- Welcome selection includes `aagaya-mera-ceo-of-football`. Phase voice pool also
  includes both aura-farming lines, mog and sixseven; matching splashes show
  AURA FARMER!, MOGGER!, SIX SEVEN!, and RESPECT++ for the alag-level praise.
  Trophy remains reserved for champion; Messi-specific clip is not generic praise.
- Every goal: praise splash, colored sparks/stars, positive voice and random new
  goal SFX. Phase: confetti+phase fanfare. Grand at ordinals3,7,10,14,17 (3/4 gaps).
  Infinite fifth-success checkpoints also count as phases. Some phase completions
  (35%, not adjacent in a run) briefly reparent retained actor into comic movie/JPG
  cutaway for one jump/cheer/victory line, restoring exact world parent afterward.
  Cutaway splash holds until actual dialogue, fanfare and confetti finish, then
  fades before the background exits; ordinary goal splashes keep short timing.
- End of phase: board lifts away and remaining choices leave in staggered arcs.
  Break CTA footballs bounce in, then kick flight inherits visible image position.
- New regular intro `funFact` plays the supplied Ronaldo-Suiii coaching boast
  with idea/talk/self-point/cocky poses. After Let’s Go's kick/crack/wipe clears,
  75% chance of a shuffled follow-up: Ronaldo/Messi/Mbappe/aliens phone stories,
  coach-ko-mat-sikha (no phone poses), football-good-night, or this fun fact.
  Welcome greetings and sleep scenes remain intro-only. Shared `anecdote()`
  runs inside the existing script owner (never call `intro()` from a break),
  keeps gameplay music, respects pause/cancellation, then smoothly returns wide.
  Diagnostic `state.letsGoFollowup` is null for a skipped extension.
- Wizzle is world/camera-attached, off-frame during Sparky dramatic close-up.
  Persistent story key `sparky-director:v1:wizzle-story`: complete both originals,
  then at phase>=3 introduce surprised dodge then annoyed dodge. First committed
  shot misses, surprise gasp + dodge line OR annoyed ek-jagah... line, another
  bonus ball/player kick hits. After introductions, normal scenes separate dodge
  reprises. Only completed real scenes unlock; previews/cancellation do not.
- Pause: Continue, Practice, Exit; **i** is top-left inside pause only and replays
  onboarding. Help returns to the same saved question, not a new progression.

## What Comes Next tutorial and series gameplay

- Counting Phase 1 remains 4 questions and Phase 2 remains 5. Only after Phase 2's
  Sparky interaction is acknowledged does `game/main.js` hand off to
  `SparkyNextTutorial`. Counting question 10 is preserved, not consumed by practice.
  Existing saves beyond that checkpoint also receive this tutorial once if unseen.
- `tutorial.js/css` reuse the retained coach, numbered balls, rolling entrance,
  guided finger/glow, wrong-answer feedback, super kick, goal and comic finale.
  Empty display/close-up leads to numeral 10 and choices 9/11/13; only 11 succeeds.
- The 1–11 montage uses all four supplied cool poses plus existing poses, alternating
  oversized coach/numeral entrances and three retained comic movies, with actual
  counting audio and no inter-number dialogue gaps. Reduced motion uses static art.
- Tutorial opening music is replaced (not layered) by looping Lava Chicken at the
  missing-10 confusion line. Lava stays through montage, choice, kick, final lesson,
  Let's Go football/pass/screen kick, fading at the wipe and stopping on cleanup/cancellation. Both tracks use the
  tutorial's pause-aware, dialogue-ducked music bus; director music is disposed during
  the tutorial and restored only on return. `SparkyNextTutorial.state.musicTrack`
  exposes `music`, `lava`, or null for diagnostics.
- Successful real practice saves `sparky.tutorial.what-comes-next.completed.v1`.
  Previews never mark completion. No warm-up-complete card: the regular Let's Go
  football waits for a player kick, arcs directly to Sparky (no Messi), then he
  kicks it screen-filling into the same comic wipe as counting practice. Shared
  `kickToGame()` keeps counting's original Messi lead-in unchanged. Only after this
  transition does real practice save completion/start successor phase1; previews
  restore the active question. Main HUD shows only the variant:
  Count & Kick / What Comes Next?. Field instructions are Count. Choose. Kick! /
  Look. Next. Kick! Pause Practice replays the active lesson without consuming progress.
- Direct non-persisting preview: `?scene=next-tutorial` (`tutorialSpeed=1..8` for QA).
  Hidden developer controls also offer **Tutorial: What Comes Next?**, returning to
  the same saved question. Wrong-answer hint cancellation is handled so
  stop/replay does not leave an unhandled rejected animation.
- Verified in browser: normal-speed montage (all 11 ready poses/numerals), desktop
  and 844×390 landscape, frozen soundtrack/video during pause and portrait,
  reduced-motion fallback, wrong answer/keyboard 11, cancellation during a hint,
  full super-kick/completion/cleanup, hidden debug replay and exact question restore.
  A restored Phase 2 checkpoint completed its real break before tutorial entry;
  successful tutorial + restart preserved question 10 without replaying the break
  or tutorial. Original counting practice still completes its Messi/Let's Go finale.
  Audio-source tracing confirmed one looping soundtrack and its final stop. All
  24 existing tests and JS syntax/whitespace checks passed. QA local storage was
  backed up and restored exactly; no forced checkpoint/completion flags remain.

- `game/progression/next-engine.js`: exact100 questions/20 five-question phases;
  phase20 also ends in a shared break, then independent adaptive infinite phase21.
  Save `sparky-next-progression:v1`. All options unique1–99; starters1–98,
  answers2–99, seeded distractors and variable choice counts per specification.
- `game/progression/master.js`: six-mode registry, only counting/successor playable;
  save `sparky-master-progression:v1`. Counting's opening two phases/breaks ->
  successor tutorial -> its opening two phases/breaks -> available-mode rotation.
  One/two phases per run35%/65%, fair bag, both engines resume independently.
  Unimplemented modes remain deferred, not falsely marked complete:
  `availableOnboardingComplete:true`, `onboardingDeferred:true`, `onboardingComplete:false`.
- Master persists a break plan BEFORE director presentation, acknowledges the engine
  afterward, then commits the planned route. Reload recognizes an engine ack already
  saved and commits without replaying that break. Failure/cancellation keeps checkpoint
  pending. Counting retains phase17 champion. Never duplicate engine progress in master.
- Successor board shows up to two previous positive integers plus starter/ellipsis:
  1…, 1,2…, 1,2,3…, 10,11,12…, 96,97,98…. At goal contact,130ms content fade +180ms
  answer reveal runs asynchronously beside existing goal/feedback; answer holds until
  next-question/phase-exit. Wrong kicks keep sequence. All other mechanics unchanged.
  Sequence uses one centered SVG text run with colored tspans and10px before dots,
  not board-wide columns. This keeps1… compact and gives all lengths even padding.
- Infinite choices3–6; configurable base range weights20/20/25/20/15 across
  1–10/11–20/21–50/51–75/76–98, adapted by last5 first-attempt results. No consecutive
  starter or recent exact configuration, including bounded constant-RNG fallback.
- `SparkyGame.state` exposes modeId/master/modeProgress and active progression.
  Hidden debug lists both predefined journeys and non-destructive tutorial previews.
- Series QA:90 automated tests pass (including10,000 generated successor questions,
  all184 combined fixed questions,260 shared phases and cross-save interruptions).
  Browser:wrong retry unchanged; goal-contact sequence->answer; paused/portrait
  feedback frozen; mobile844×390 for12->13 and98->99/six choices; successor phase1
  break->next006, phase2 break->count010 withnext011 parked; phase20 real break->
  successor infinite, later resumed and scored an infinite question independently.
  Engine-ack/master-pending reload committed route without replaying break. Approved
  real tutorial ends atnext001, no phase consumed; pause Practice restores sameq.
  No controller/page errors. Exact pre-QA localStorage restored; no forced flags remain.

## Next iterations

Successor gameplay and two-playable-mode routing are implemented. Continue
iteratively from the user's next feedback; do not implement remaining modes without
approval. Inspect
relevant current code, and update these notes when behavior/contracts change.
Repository-scoped Copilot memory also contains
implementation/QA notes, but this repository document is the portable handoff.