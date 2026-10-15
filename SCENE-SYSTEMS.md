# Field scene systems preview

The field primitives remain a staging/camera/UI test, not a playable counting round.
An isolated, audio-led welcome film now precedes tutorial staging on first visits.
The welcome film now hands off to an isolated guided tutorial, not ball-test gameplay.
Main game rounds are still pending.

## Temporary demo ending

After `sparky:tutorial-complete`, a coming-soon overlay covers the main-game staging
pitch. **Replay intro** runs the introduction and then tutorial; **Replay tutorial**
runs only the tutorial. Replay routing lives locally in `scene.js` and can be removed
with the overlay when main rounds ship. Underlying HUD/world are inert while it is
open, and keyboard focus stays on the two replay choices.

Intro/tutorial sound-toggle markup and handlers are commented out for the demo.
Audio-start gates remain for browser autoplay restrictions. Skip Intro uses the
warm-up panel styling and appears only for replays/previously completed intros;
first-time viewers see no skip CTA. `SparkyIntro.play({ replay: true })` explicitly
enables it for the full-adventure replay without changing first-visit storage.

## Preview

- Play from the existing menu to enter the first-visit introduction after its exit transition.
- `?scene=game` opens the field directly for development.
- `?scene=intro` forces the welcome film without changing first-visit storage.
- `?scene=intro&introSpeed=8` is an accelerated development check, not player-facing timing.
- `?scene=tutorial` opens the guided practice directly; optional `tutorialSpeed=4`
    accelerates its dialogue/tweens for development only.
- Open **Scene lab** at bottom-right to try three camera shots, quantities 1–20,
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
| Football choices | x 410, y 610, w 830, h 118 | Three test balls by default; supports up to six, no answer rules yet |
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
    The board/choices stay hidden until main-round rules are implemented.
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
Returning viewers skip the film and load the field plus tutorial assets.
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
- A future tutorial replay CTA can use the intro API; no player-facing replay
    control is added yet.

## Football entrance preview

In the direct `?scene=game` preview, three plain footballs roll in from offscreen right.
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
    There is no practice/replay completion screen. Main counting rounds remain pending.
- Dialogue and accompanying actions finish before a pause-aware 500ms breathing gap.
- API: `SparkyTutorial.preload()`, `.play()`, `.unlock()`, `.sync()`, `.state`.
- `sparky:tutorial-beat` has `detail.beat`; `sparky:tutorial-complete` has
    `{ answer: 2, choices: [1, 2, 3] }` after the main-game reveal and tutorial cleanup.
- Completed normal practice records `sparky.tutorial.completed.v1`; this is not
    used to skip the tutorial yet. Direct preview does not write completion.