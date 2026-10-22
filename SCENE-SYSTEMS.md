# Question-start dialogue and phrase splashes

## Let’s Go follow-up stories

After the kick, screen crack and comic wipe finish, Let’s Go has a 75% chance
of extending into one shuffled anecdote: any of the four phone scenes, the
coach-ko-mat-sikha story, football-good-night, or the Ronaldo-Suiii fun fact.
No greetings or sleep/wake scenes enter this pool. The fun fact is also a fifth
regular intro type (`funFact`). Shared `anecdote()` choreography runs under the
existing script owner, preserving cancellation/pause and avoiding nested-script
deadlock. Follow-ups keep gameplay music and finish with smooth wide recovery.

The counting adapter launches `SparkyDirector.questionStart()` at board reveal,
without awaiting it. All nine supplied start clips use a nonrepeating shuffle
bag and are predecoded. This incidental voice ducks music but never acquires
director script ownership or changes the controller's up/summon/proud gestures.
Cook, goalmaxxing, aura and rizz phrases have compact right-side comic splashes.
Answer/preview/stop interrupts the voice and removes its splash; pause uses the
same active-time clock and audio suspension as other dialogue.

The welcome bag includes the CEO-of-football greeting. Phase praise includes
the additional aura-farming, mog and sixseven clips, with phrase-specific comic
titles (including RESPECT++ for the existing alag-level line); phase/grand SFX,
confetti and occasional cutaways are unchanged. Champion trophy audio remains
separate from the ordinary phase bag.

# Kick & Count scene systems

The menu leads into the welcome film and guided tutorial on first visits, then
the playable counting journey. Returning players with both completion flags start
their saved counting question after a short randomized session intro. The old
coming-soon ending has been removed.

## Main counting mode

- `game/progression/engine.js` owns the 84-question, 17-phase fixed journey,
    checkpoint persistence and phase 18 adaptive infinite play. See
    `game/progression/README.md` for exact data and the presentation-independent API.
- `game/director.js` / `.css` own retained coach poses, dialogue, pause-aware
    clock/audio/animation, four session intros, contextual feedback, idle jokes,
    Wizzle/Messi/Let’s Go breaks and the champion celebration.
- Welcome peeks use the original onboarding's gutter-aware viewport-edge placement;
    the duty greeting is spoken by the visible salute pose. Sleep offers a gentle
    poke (supplied pointer art; sorry/Ronaldo dialogue) or an animated football hit
    (only the three hurt/annoyed wake reactions). Sleep marks track the actor.
- Intro shots pull back with the shared camera tween before the board drops in
    using the tutorial's 750ms overshoot and display sound; the summon/ball entrance
    follows. Old choices stay hidden during the new board reveal.
- Regular session intros use the onboarding intro music and optional muted,
    looping `assets/bg/game-bg-animated2.mp4` under the pitch camera. The static
    field stays behind it; stalled/failed video falls back without blocking play.
    Pause/portrait/hidden tabs suspend video with audio; reduced motion keeps the
    static pitch. The movie is removed after the smooth wide-shot handoff.
- `SparkyDirector.startMusic("game")` plays `main-game.mp3` and its three numbered
    companions in shuffled bags, with no consecutive repeat at a bag boundary.
    Tracks are not looped: actual source completion advances the queue. Intros
    and Wizzle temporarily replace the soundtrack; gameplay restores the queue,
    while stop/help replay invalidates old queue continuations. All five regular
    music tracks are predecoded, and dialogue ducks the active soundtrack.
- The sleep apology holds the supplied flustered/shy smile. The Ronaldo phone
    greeting ends on the excited phone pose; the rest/coaching anecdote addresses
    the player without phone poses and preserves its laughing punchline.
- Phase endings send the remaining numbered footballs offscreen in staggered
    spinning arcs while the board lifts away, before starting a break/finale.
    Break football prompts bounce into place and hand their visible screen position
    to the kick flight. Wizzle lives under the pitch camera, outside Sparky's
    dramatic close-up; his bonus-ball prompt includes varied “maaro” encouragement.
    Comic splashes are 20% larger, still contained on landscape mobile screens.
- `game/main.js` / `.css` connect counting to the scene. `window.SparkyModes.counting`
    is the mode adapter; other series can reuse scene/director infrastructure.
- Choices support 3–6 distinct numbers; the board supports 1–20 footballs. Wrong
    choices cycle through wide miss/post/right-turf/coach rebounds and return
    without advancing. `game/ball-physics.js` separates pitch travel, ballistic
    height, perspective scale, squash, image spin and contact shadows. Upright
    collisions alternate sides and use measured inner faces of the contained PNG,
    with post audio/rattle at contact. Returns use diminishing hops then a settling
    roll; the existing successful goal shot is unchanged. Bonk is predecoded and
    plays at every answer kick. All tracks share the director's pause/cancel owner.
- Success is committed only after goal feedback. Reloading accepted feedback
    recovers it once; pending checkpoints remain saved until their interaction ends.
    Break types do not repeat consecutively. Infinite play breaks every five goals.
- Wizzle's persistent encounter story (`sparky-director:v1:wizzle-story`) records
    completed real scenes only. The first and returning originals must both finish;
    from completed phase 3 onward the next two Wizzle scenes introduce surprised
    dodge, then annoyed dodge. The committed first ball misses his last position;
    after the reaction/second bonus prompt, the second player kick always hits.
    Once introduced, normal encounters separate later dodge reprises. Debug previews
    and interrupted scenes do not unlock variants; old start-count data is not
    treated as completion proof. Pure gating tests live in `tests/wizzle-story.test.cjs`.
- Every goal gets a varied praise splash, colored sparkle burst, positive voice
    and a shuffled clip from `assets/audio/positive-sfx/goal/`. Every completed
    phase adds falling confetti and a phase fanfare; grand fanfares occur at phase
    ordinals 3, 7, 10, 14, 17, etc. (alternating 3/4 gaps, including infinite blocks).
    These nine positive SFX are predecoded and finish before progression commits.
- Roughly 35% of phase completions use a brief comic-reveal movie/JPG cutaway;
    adjacent phase cutaways are suppressed. The same retained actor temporarily
    moves into screen space for one jump/cheer/victory completion line, then returns
    to its exact world parent. Particles, confetti and movie share pause/cancellation
    ownership, remain noninteractive, respect reduced motion, and clean up on exit.
- Save key: `sparky-counting-progression:v1`. Restricted storage falls back to
    page-session memory; child-facing UI never shows phase/score/debug data.
- Pause offers Continue, current-mode Tutorial, and Exit. Its top-left **i** button
    replays only onboarding and is absent during play. Either help route resumes
    the same saved question.
- Type **debug** to toggle developer controls (off by default): four intros,
    three breaks, champion, correct/wrong submissions and full phase/question/state
    data. Previews restore the existing question without changing progression.
- Runtime API: `SparkyGame.preload/start/stop/sync/replayHelp`, `.state` and `.debug`.
    `sparky:question-ready`, `sparky:game-start` and `sparky:game-stop` expose lifecycle;
    engine checkpoint/journey/infinite events are forwarded as window CustomEvents.
- Run `node --test kick-and-count/tests/progression.test.cjs` from workspace root.
    The 18 tests include all fixed phases, reload recovery and 10,000 infinite goals.
- `node --test kick-and-count/tests/*.test.cjs` also runs the pure football tests
    for both post contact rims, depth/shadows, exact returns and track continuity.

Intro/tutorial sound-toggle markup and handlers are commented out for the demo.
Audio-start gates remain for browser autoplay restrictions. Skip Intro uses the
warm-up panel styling and appears only for replays/previously completed intros;
first-time viewers see no skip CTA. `SparkyIntro.play({ replay: true })` explicitly
enables it for the full-adventure replay without changing first-visit storage.

## Preview

- Play from the existing menu to enter the first-visit introduction after its exit transition.
- `?scene=game` opens saved counting directly with a short session intro.
- `?scene=lab` opens the original field/camera/ball development lab.
- `?scene=intro` forces the welcome film without changing first-visit storage.
- `?scene=intro&introSpeed=8` is an accelerated development check, not player-facing timing.
- `?scene=tutorial` opens the guided practice directly; optional `tutorialSpeed=4`
    accelerates its dialogue/tweens for development only.
- In lab, open **Scene lab** at bottom-right to try three camera shots, quantities 1–20,
  display widths 300–620, three display designs and scene-area guides.
- The pause CTA and Escape pause/resume. The modal traps keyboard focus.
- Portrait and hidden tabs suspend scene animations independently of user pause.

## Scene areas

All world coordinates use a centered, contain-scaled **1365 × 768** design space.
The background, goal, coach and quantity display share one camera transform.

| Area | Bounds / anchor | Purpose |
| --- | --- | --- |
| Field | 0, 0 → 1365, 768 | Supplied static game background |
| Goal | x 392, y 236, w 580, h 326 | Centered goal; lifted to clear the football row |
| Coach | x 100, y 355, w 340, h 350 | Foreground-left placeholder Sparky |
| Quantity display | center x 682.5, bottom y 234 | Native SVG geometry grows upward; connector rods meet the goal crossbar |
| Football choices | x 410, y 610, w 830, h 118 | Three to six numbered answer footballs |
| Pause | Screen top-right, safe-area aware | Screen-space; unaffected by camera |
| Director’s desk | Screen bottom-right | Temporary scene testing controls |

## Camera

`window.SparkyScene.setShot(name, { instant: false })` returns a completion promise.
Names: `wide`, `close`, `dramatic`. A new shot interrupts smoothly from the visible
camera position. No cumulative zoom drift when switching repeatedly.

The coach's face is the close-up focal region. The entire scene moves together;
the HUD never zooms. Shot anchor coordinates live in `scene.js` and are separate
from the placeholder sprite asset, so later sprite poses can share the camera.

## Display

`window.SparkyScene.setDisplay({ count, width, variant })` returns its dimensions.
Variants: `count`, `message`, `celebrate`. The SVG viewBox matches the generated
dimensions exactly: corners, frame trim and typography are not stretched. Quantity
icons wrap to rows; larger quantities use a compact layout to remain above the goal
without leaving the wide-shot screen. Message/celebration content is test copy only.

## Lifecycle API / events

- `SparkyScene.enter()` and `.preload()` are idempotent entry/preparation hooks.
- `SparkyScene.setPaused(boolean)` controls explicit player pause.
- `SparkyScene.startMainGame()` restores a clean wide-shot pitch and sets
    `state.phase` to `main-game`; `sparky:main-game-ready` signals that staging target.
    The main controller reveals the real board/choices when its question is ready.
- `SparkyScene.state` returns a snapshot of active shot, pause and display state.
- Menu `sparky:play` begins asset decoding in parallel with the menu exit.
- Menu `sparky:transition-complete` fires only after both exit choreography and
    required next-scene assets finish loading, then enters with a crossfade.
- The football loader remains visible while loading. A failed request keeps the
    menu in place with **Retry loading**; the game does not proceed with missing assets.
- `sparky:scene-ready` signals completed field entrance.
- `sparky:shot-change` includes `detail.shot` after a completed camera move.
- `sparky:display-change` includes count, width, height and variant.

Supplied PNG assets are used for the goal, pause CTA and placeholder coach; the
display is generated vector art. Audio and comic choreography belong to the
separate intro layer, not the camera, quantity board or ball entrance primitives.

## First-visit welcome film

`intro.js` owns the cutscene DOM, decoded Web Audio sources, voice-ended dialogue,
sprite poses, two-frame Sparky greeting and Messi wave/noticing sheets, alternating
Messi angry poses, comic video backgrounds and interactive Ready
football. `intro.css` uses Bangers for comic emphasis; normal UI remains Fredoka.
All assets and fonts are local. Before a first-visit handoff, all intro poses,
audio buffers, splash/fallback artwork and Bangers are loaded; all six comic
videos are fully fetched into retained blob URLs and their first frames validated.
Later video scene changes use those downloaded URLs, not fresh network requests.
Returning players with completed onboarding and practice skip directly to counting.
Missing audio in browsers without Web Audio uses pause-aware timed captions;
blocked autoplay displays an explicit sound-start/silent-watch gate.

## Menu audio

The menu preloads/decodes `main-menu.mp3` and `crowd-cheering.mp3` alongside its
artwork. Music loops at a quiet level, and crowd cheering starts at the open-arm
Suiii pose (also in reduced motion). Both pause when hidden or in portrait and
stop before the intro begins. Autoplay policy may require the first pointer or
keyboard interaction; activation retries audio without blocking the animation.
Direct development scene URLs do not start menu music.
The predecoded `sfx/magic-spell.mp3` plays at the initial Sparky kick/particle
contact, not the later title-impact burst, using the same pausable menu context.

- `SparkyIntro.preload()`, `.unlock()`, `.play()`, `.sync()` expose the intro lifecycle.
- `SparkyIntro.seen` reads completion; `.state` includes beat history and asset failures.
- The local key `sparky.intro.completed.v1` is written only after the full film and
    Ready interaction finish. Skip does not count as viewing. Restricted storage
    falls back to completion for the current page session.
- `sparky:intro-beat` provides `detail.beat`; `sparky:intro-complete` provides
    `detail.completed` and `detail.skipped`.
- User pause, hidden tabs and portrait suspend audio, video, CSS and tracked
    animations together. Skip stops active sources, including the Messi loop.
- The Messi reaction loop is stopped after his exit, not before it.
- Messi keeps waving through the boast, then uses the noticing sheet through the
    following line. Sparky's push dialogue accompanies the exit; the Chotu aside
    precedes the cough. Only `?!` appears over Messi, not an OOPS caption.
- Soccer and Sparky have separate animated splashes, switching one second into
    their shared recording. GOAT is a smaller, top-centered splash between actors.
- `sparky:tutorial-ready` fires after completion/skip, or immediately after field
    entry for returning viewers. Normal entry then starts `SparkyTutorial.play()`.
    The forced `?scene=intro` preview deliberately stops at staging for intro QA.
- The pause overlay's **i** button uses the intro replay API without replaying practice.

## Football entrance preview

In the direct `?scene=lab` preview, three plain footballs roll in from offscreen right.
Each has separate travel, rolling rotation, squash-and-stretch bounces and ground
shadow tracks. Delayed balls remain offscreen until their turn. Pause and portrait
freeze every track; reduced motion places the balls immediately.

`SparkyScene.spawnBalls(count)` supports 3–6 test balls and returns a promise.
Concurrent replay calls share the current entrance rather than stacking it.
Three are centered under the goal; the first four slots are centered for counts
4–6, with slots five and six extending right. Ball diameter is 108, slot pitch 140.
Scene lab exposes the test count slider and **Replay ball entrance** button.
`sparky:balls-ready` fires with `detail.count` after settlement. The tutorial reuses
this primitive at its summoning beat and adds labels/selection without changing
the development preview.

## Guided tutorial

`tutorial.js` / `tutorial.css` own the guided sequence separately from intro and
field primitives. All tutorial voices, sprite images, music and two comic videos
are included in the real menu loading gate. Decoded pose nodes stay mounted to
avoid blank frames; pause/portrait/tab visibility freeze its clock and media.

- Fixed example: **two display footballs**, three choices **1, 2, 3**, answer **2**.
- Display drops in during the pointing-up line; its two icons pop in individually
    during counting. Choices enter only after the confused/summoning dialogue using
    the established rolling/bouncing entrance.
- After `normal-haan`, `chalo-mere-sath-count-karo` introduces counting the three
    numbered choices below. `one`, `two`, `three` voices use their corresponding
    retained counting sprites and briefly bounce/highlight the matching choice.
    `nice` follows with thumbs-up, then the original choose-and-kick instruction.
    The quantity question remains two footballs, so only choice 2 is correct.
- The glowing 2 waits for an actual click, tap, Enter or Space. Wrong choices
    alternate `wo-wala-nahi` / `wo-bhi-nahi` voice reactions with a gentle shake/text
    hint and never advance. Reaction playback is serialized to prevent overlapping
    voices from repeated taps. Correct choice locks input,
    shows thumbs-up/Badhiya, and Sparky performs the wind-up/contact kick.
- Anime video, goal impact, comic GOAL splash and confetti lead into the requested
    final dialogue and GOAT splash. Sparky uses the second cocky-hand pose for
    “Messi, it’s done, bro!” while confused Messi peeks from the right screen edge.
- A keyboard/touch-accessible football **Let’s Go!** CTA launches into Messi. He
    briefly switches to the pre-mounted angry pose, recoils and exits; the ball
    bounces back to Sparky for a final kick and `lets-go` voice. The football zooms
    toward the camera, then a comic wipe reveals the main-game staging pitch.
    There is no practice/replay completion screen; the counting controller starts next.
- Dialogue and accompanying actions finish before a pause-aware 500ms breathing gap.
- API: `SparkyTutorial.preload()`, `.play()`, `.unlock()`, `.sync()`, `.state`.
- `sparky:tutorial-beat` has `detail.beat`; `sparky:tutorial-complete` has
    `{ answer: 2, choices: [1, 2, 3] }` after the main-game reveal and tutorial cleanup.
- Completed normal practice records `sparky.tutorial.completed.v1`; returning players
    with both completion flags skip onboarding/practice. Direct preview does not write completion.

### What Comes Next practice

- `SparkyNextTutorial` shares tutorial media/clock/selection/kick primitives but has
    separate preload and completion APIs: `preload()`, `startTutorial({preview})`,
    `completeTutorial()`, `hasCompletedTutorial()`, `stop()`, `sync()`, and `state`.
    Completion key: `sparky.tutorial.what-comes-next.completed.v1`; previews do not save.
- The counting loop invokes it only in question state with at least 9 fixed goals,
    after the Phase 2 interaction has completed. The director is disposed while it
    runs; counting progression remains untouched. Exit remounts the director;
    a real lesson starts successor phase1, while preview restores the active question.
- Fixed example: numeral 10 (initially blank display), balls 9/11/13, answer 11.
    The fast 1–11 comic montage uses supplied cool/emote sprites and three retained
    muted videos (`comic-multi-shapes-bg`, `comic-book-speed-line-blue`, `comic-intro-bg`),
    loaded on demand by the separate next-tutorial preload, plus static comic fallback.
- A single tutorial soundtrack handle replaces opening music with Lava Chicken at
    the missing-10 line. It loops on the shared music gain (dialogue ducking applies)
    through the Let's Go football/pass/screen kick, then fades at the wipe; cleanup
    stops it along with all remaining sources.
    AudioContext suspension, active-time waits, WAAPI, videos and inputs follow pause,
    portrait and hidden-tab gates. Wrong-hint callbacks consume cancellation rejections.
- Successful interaction and final lesson lead to the regular football Let's Go CTA,
    not a completion card. Player passes straight to Sparky; no Messi choreography.
    Shared `kickToGame()` performs his screen-filling kick/comic wipe, retaining the
    counting tutorial's original Messi lead-in. `sparky:next-tutorial-complete` fires
    after wipe/cleanup, with `{answer:11, choices:[9,11,13]}`. Real completion saves only
    after this transition; preview completion never saves.
- Preview via `?scene=next-tutorial&tutorialSpeed=4` or hidden developer controls.
    `state.musicTrack` and `sparky:tutorial-beat` expose soundtrack/sequence diagnostics.

### Shared series gameplay

`game/main.js` keeps one presentation/input/physics/director loop and selects a
registry adapter from the master route. `modes.counting` retains its render/restore;
`modes.what_comes_next` reuses that entrance and restores the sequence board.
Optional adapter `goal(question, context)` animates sequence content into the answer
at contact without delaying feedback start. `scene.setDisplay({variant:'sequence',
number:12,width:540})` shows10,11,12…; number variant shows the single accepted answer.
Sequence content is a naturally measured centered text run with colored tspans,
comma-space separators and10px before the ellipsis; no widely spaced fixed columns.

The master and engines have independent save keys. At phase end, main persists
`master.planBreak()` before retiring board/balls, presents the existing director
interaction, acknowledges the engine checkpoint, then calls `master.completeBreak()`.
Stop/error leaves that plan/checkpoint pending. Startup finalizes an already-saved
engine acknowledgment without replay. Counting phase17 retains its champion;
all successor phases, including20, use the shared break.

Each mode completes two opening phases before available-mode rotation. Remaining
four registered modes are unplayable; six-mode onboarding is explicitly deferred.
Current rotation uses a fair bag and configurable65% two-phase/35% one-phase quota.
Engines own exact questions and independent infinite difficulty; master only owns
routing/checkpoint plans. Active Practice uses its approved tutorial without
consuming/rerolling the saved question. Hidden debug includes both journeys and saves.