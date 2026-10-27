# Kick & Count: continuation notes

Read this before continuing in a new chat. Detailed architecture and lifecycle
contracts are in [SCENE-SYSTEMS.md](SCENE-SYSTEMS.md). These notes describe verified
current behavior, not a request to rebuild the game.

## Project and verification

- Dependency-free HTML/CSS/JavaScript; centered contain-scaled 1365×768 landscape
  design space. Windows PowerShell: chain commands with `;`, not `&&`.
- From workspace root: `node ./kick-and-count/preview-server.cjs` serves
  http://127.0.0.1:4173/. Reuse a running server rather than starting duplicates.
- Run `node --test ./kick-and-count/tests/*.test.cjs` (178 passing tests: counting,
  successor, predecessor, master routing/migration, real-engine integration, tutorial
  contracts/startup, physics and Wizzle story). Syntax-check changed JS with `node --check`.
- Preview routes: `?scene=game` saved current-mode/master route (not forced counting), `?scene=lab` scene primitives,
  `?scene=intro` onboarding, `?scene=tutorial` practice, `?scene=before-tutorial`
  isolated non-persisting predecessor practice (`tutorialSpeed=1..8` for QA).
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
  returning users with both completion flags enter the saved current-mode/master route.
- `game/progression/engine.js`: immutable exact 84 questions/17 phases, then phase18
  adaptive infinite (1–20 count, 3–6 choices). Wrong answers never advance;
  `finishFeedback()` commits accepted success after presentation. Pending breaks
  and champion persist until acknowledged. Save `sparky-counting-progression:v1`.
- `game/main.js/css`: mode adapter, presentation ownership/generation cancellation,
  help/debug, answer flight and engine bridge. Counting, successor and predecessor
  adapters share physics, input, director and feedback; future modes can reuse them.
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
  Count & Kick / What Comes Next? / What Came Before?. Field instructions are
  Count. Choose. Kick! / Look. Next. Kick! / Look. Before. Kick! Pause Practice
  replays the active lesson without consuming progress.
- Direct non-persisting preview: `?scene=next-tutorial` (`tutorialSpeed=1..8` for QA).
  Hidden developer controls also offer **Tutorial: What Comes Next?**, returning to
  the same saved question. Wrong-answer hint cancellation is handled so
  stop/replay does not leave an unhandled rejected animation.
- Historical successor-tutorial browser QA: normal-speed montage (all 11 ready poses/numerals), desktop
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
- [game/progression/before-engine.js](game/progression/before-engine.js): pure browser/CommonJS
  `SparkyBeforeProgression`, using the same progression template/API as successor.
  Exact100 questions/20 five-question phases, then independent adaptive infinite
  phase21 only after the phase20 break acknowledgment. Save `sparky-before-progression:v1`.
  Starters2–99, answers1–98, unique choices1–99/3–6 footballs; fixed seeded data,
  retry/feedback/checkpoint recovery and last-five first-attempt adaptation match
  successor. Infinite default range weights20/20/25/20/15 cover2–10/11–20/21–50/
  51–75/76–99, with recent-configuration exclusion and bounded constant-RNG fallback.
- [game/progression/master.js](game/progression/master.js): six-mode registry,
  counting/successor/predecessor playable; Color Match, Find Missing Number and
  Reach the Target Score remain deferred with no implementation. Save key stays
  `sparky-master-progression:v1`, but stored schema is **version2**. New-player order:
  counting tutorial + two opening phases/breaks (4+5 questions) -> successor tutorial
  + two phases/breaks (5+5) -> predecessor tutorial + two phases/breaks (5+5) ->
  `available_rotation`. One/two phases per run35%/65%, configurable fair bag, all
  three engines resume independently. `deferredModeId` preserves a singleton-current
  bag token: borrow a different mode from the next bag, then serve the deferred
  token next, without loss, starvation or adjacent repeated runs.
  Unimplemented modes remain deferred, not falsely marked complete:
  `availableOnboardingComplete:true`, `onboardingDeferred:true`, `onboardingComplete:false`.
- Master validates the original two-mode v1 schema BEFORE in-place migration under
  that same key. Add predecessor tutorial/intro/checkpoint map entries and bridge
  fields without rewriting any engine save or tutorial flag. Preserve the old
  route, quota, bag, history and pending plan/commit decision; never reroll it.
  `legacyIntroductionPending` bridges old available rotation. Honor pending feedback,
  breaks/champion and their saved route first; only with no pending plan and an actual
  active-engine `status:'question'` snapshot introduce predecessor onboarding.
  Missing snapshots are not safe-boundary proof. Park the old question unchanged;
  then start predecessor's two-phase onboarding run, reusing its completion flag if set.
- Master persists a break plan BEFORE director presentation, acknowledges the engine
  afterward, then commits the planned route. Reload recognizes an engine ack already
  saved and commits without replaying that break. Failure/cancellation keeps checkpoint
  pending. Counting retains phase17 champion. Never duplicate engine progress in master.
  All three engine keys are separate: `sparky-counting-progression:v1`,
  `sparky-next-progression:v1`, `sparky-before-progression:v1`. Onboarding key is
  `sparky.intro.completed.v1`; counting/next/before lesson keys are
  `sparky.tutorial.completed.v1`, `sparky.tutorial.what-comes-next.completed.v1`,
  `sparky.tutorial.what-came-before.completed.v1`. Current mode comes from master's
  `activeModeId`/reconciled route, not a separate forced-counting entry path.
- Successor board shows up to two previous positive integers plus starter/ellipsis:
  1…, 1,2…, 1,2,3…, 10,11,12…, 96,97,98…. At goal contact,130ms content fade +180ms
  answer reveal runs asynchronously beside existing goal/feedback; answer holds until
  next-question/phase-exit. Wrong kicks keep sequence. All other mechanics unchanged.
  Sequence uses one centered SVG text run with colored tspans and10px before dots,
  not board-wide columns. This keeps1… compact and gives all lengths even padding.
- Predecessor uses that SAME sequence template with `direction:'before'`: starter
  `n` displays `[n+2,n+1,n]` descending, truncated at99 (never100/101). Examples:
  `5,4,3…` for3; first starter2 shows `4,3,2…` and accepts1; starter98 shows
  `99,98…`, starter99 shows `99…` and accepts98. The last numeral is the starter,
  not the answer. Its adapter reuses counting entrance/restore infrastructure and
  `goal: modes.what_comes_next.goal`: same130ms fade/180ms answer reveal at goal
  contact, same answer hold, wrong retry, flight and feedback; no separate physics.
- Successor infinite choices3–6; configurable base range weights20/20/25/20/15 across
  1–10/11–20/21–50/51–75/76–98, adapted by last5 first-attempt results. No consecutive
  starter or recent exact configuration, including bounded constant-RNG fallback.
- `SparkyGame.state` exposes modeId/master/modeProgress and active progression.
  Hidden debug lists all three predefined journeys and non-destructive tutorial previews.
- Current browser QA: approved lesson Done->before001 with0 phase questions consumed;
  pause Practice restores identicalbefore001/options. Wrong79 on first question
  keeps4,3,2… and increments attempts; correct1 reveals only1 during feedback, then
  before002 shows5,4,3…. Before phase1 realbreak->before006; phase2 realbreak->count010,
  before011 parked. Phase20 question99/sixchoices fits844×390, goal reveals98;
  portrait freezesfeedbackclock, then realbreak enters independentbeforeinfinite21.
  Resumed/scored infinite1->infinite2 with descendingcontext; no page/controller
  errors or tutorial leftovers. Exact pre-test localStorage restored.
- Current automated QA:178 tests pass, including10,000 generated predecessor
  questions (plus successor/counting generator coverage), all284 combined fixed
  questions across three engines,260 shared phases, independent infinite streams,
  cross-save interruptions, v1→v2 migration/pending-plan preservation and fair-bag
  reload/deferred-token coverage. Unit tests do not replace visual/audio QA.
- Historical two-mode browser QA:wrong retry unchanged; goal-contact sequence->answer; paused/portrait
  feedback frozen; mobile844×390 for12->13 and98->99/six choices; successor phase1
  break->next006, phase2 break->count010 withnext011 parked; phase20 real break->
  successor infinite, later resumed and scored an infinite question independently.
  Engine-ack/master-pending reload committed route without replaying break. Approved
  real tutorial ends atnext001, no phase consumed; pause Practice restores sameq.
  No controller/page errors. Exact pre-QA localStorage restored; no forced flags remain.

## What Came Before approved tutorial and gameplay

- User approval now includes predecessor gameplay using the successor template
  with descending sequences; the existing approved9->8 lesson below stays intact.

- Implemented in `tutorial-before.js/css`, with descriptor/story export
  `SparkyBeforeLesson`. `tutorial.js` supplies the existing decoded sprite/audio
  cache, active clock, pause/cancellation, guided selection, shared super kick,
  comics and football-to-screen finale. `SparkyBeforeTutorial` exposes preload,
  startTutorial, completeTutorial, hasCompletedTutorial, stop, sync and state.
- Approved example replaces the old document's3->2 placeholder: board9, options
  8/10/11, only8 correct. Nine and10 get contextual highlights; saying-no pose and
  original SVG cartoon cross reject10 with error SFX. Guide/finger belongs onlyto8.
  After accepting8, the shared goal helper rolls that retained ball into the centre
  slot while wrong choices leave, before the coach advances to his kick position.
  Roll rotation belongs to the centred football image, NOT the bottom-origin body
  (body rotation swings the ball below the pitch and clips it).
  Comic hero/close frames are640/660 squares at top85 (medium540/top120), leaving
  headroom for dialogue bob, scripted push-ins and the deadpan zoom-out.
  Successful kick changes board9->8; wrong taps serialize existing hints and do not
  mark completion or touch any of the three gameplay engines.
- All20 supplied `previous-number-tutorial/` lines play in requested order. Reuse
  counting normal-haan/super/goal/lets-go. Intro music switches (not layers) to
  Lava at hehe; dialogue ducks the shared bus. IGNORE accents into supplied comic
  movie/splash, then a custom lined-notebook SVG and No homework on Sunday! gag.
  Retained coach reparented to stage with exact parent/style restoration; long
  lines contain timed pose edits and push-ins, never mid-pose URL swaps.
- One-step-back speedline panel shows8 ←9 (8 to the left), then returns to field9
  and the same choices. Final goal praise -> dramatic RONALDO!/IT'S DONE BRO!
  splashes -> medium waiting pose. Music owner really stops for1400ms silence;
  short nonlooping cricket follows, then shy embarrassment/restored Lava and Done!
  football. Player pass -> Sparky kick -> same screen-filling ball/comic wipe.
  No Messi/Ronaldo character art; no warm-up-complete card.
- Transition polish: host `transitionCoach()` captures the coach's viewport rect,
  reparents and animates from that exact visible position while field/comic fades
  run together. Destination close/wide camera is prepared under the opaque comic;
  no reveal-wide-then-zoom-close or close-then-wide bounce. Comic-to-comic swaps keep
  an opaque background. Finale hides all pitch props BEFORE restoring the actor,
  preventing a goalpost flash before Done. Stop clears temporary fade opacity.
  A bounded nonlooping cricket cue also accompanies It's Done Bro, in addition to
  the later deadpan cue; the intervening1400ms silence remains genuinely silent.
- Own key `sparky.tutorial.what-came-before.completed.v1` saves only after accepted8
  and Done/wipe completion. Previews/cancellation do not save. On new-player
  onboarding, master routes here after successor>=10 completed questions AND its
  phase2 break acknowledged/committed; pending feedback/break cannot trigger it
  early. Legacy rotation uses the safe-boundary migration above. Interrupted lesson
  replays, acknowledged break does not; a previously saved completion flag skips
  the lesson. Real Done now starts `before_001` (or its saved unconsumed predecessor
  question), never an automatic return to counting. Tutorial consumes no phase question;
  count010/next011 remain parked on the fresh onboarding path. After predecessor's
  second acknowledged break, before011 parks and three-mode rotation begins.
- Direct preview returns to menu after successful wipe without starting gameplay;
  explicit stop stays put. Hidden debug includes Tutorial: What Came Before?, which
  restores the exact active question. Active-mode Practice replays its own
  counting/successor/predecessor lesson as a non-persisting preview, including
  predecessor Done returning to the exact saved predecessor question/options.
  Game stop calls the actual owning tutorial controller.
- Historical tutorial-only QA (103 tests at that stage), retained as lesson-polish
  evidence, not the current gameplay route:10 descriptor/runtime contracts (20 voice lines, media
  order, goal/Done, cleanup and120 rejection/stop/replacement cases across40 await
  points) plus3 real-host startup cancellation tests. Host generation tokens guard
  preload/camera waits; cancelled warming cannot mount over a replacement; audio
  gate waits are released on stop. Browser preview/real phase2 break handoff, wrong10/11, keyboard8/Done,
  pause in comic/at guide, actual suspended audio/video, portrait inert, reduced
  motion static fallback, developer replay and cancellation/restart preserve saves.
  Desktop1365×768, landscape844×390/667×375/932×430 and2560×1080 guide/board fit.
  Comic/homework/speedline/Done shots visually inspected; real lesson leaves count010,
  next011, master route/quota and mode saves byte-identical. Completion persists
  across restart; developer preview does not advance. Counting's original Messi
  finale and successor's11/superkick/football preview both pass again, returning
  the same count010. Exact pre-QA localStorage was restored; no forced flags remain.

## Next iterations

Counting, successor and approved predecessor gameplay are implemented with three-mode
routing and same-key master v2 migration. Color Match and the other two future modes
are not implemented; full six-mode onboarding remains false. Continue iteratively
from the user's next feedback; do not implement remaining modes without approval. Inspect
relevant current code, and update these notes when behavior/contracts change.
Repository-scoped Copilot memory also contains
implementation/QA notes, but this repository document is the portable handoff.