# Field scene systems preview

The field primitives remain a staging/camera/UI test, not a playable counting round.
An isolated, audio-led welcome film now precedes tutorial staging on first visits.
The actual tutorial is still pending; the intro never starts ball-test gameplay.

## Preview

- Play from the existing menu to enter the first-visit introduction after its exit transition.
- `?scene=game` opens the field directly for development.
- `?scene=intro` forces the welcome film without changing first-visit storage.
- `?scene=intro&introSpeed=8` is an accelerated development check, not player-facing timing.
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
Returning viewers load only the assets needed for tutorial staging.
Missing audio in browsers without Web Audio uses pause-aware timed captions;
blocked autoplay displays an explicit sound-start/silent-watch gate.

## Menu audio

The menu preloads/decodes `main-menu.mp3` and `crowd-cheering.mp3` alongside its
artwork. Music loops at a quiet level, and crowd cheering starts at the open-arm
Suiii pose (also in reduced motion). Both pause when hidden or in portrait and
stop before the intro begins. Autoplay policy may require the first pointer or
keyboard interaction; activation retries audio without blocking the animation.
Direct development scene URLs do not start menu music.

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
    entry for returning viewers. `SparkyScene.state.tutorialPending` becomes true.
    No tutorial is fabricated and no test balls are spawned on this route.
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
`sparky:balls-ready` fires with `detail.count` after settlement. A later tutorial
can call the same primitive at its intended story beat; no tutorial runs yet.