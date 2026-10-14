# Field scene systems preview

This phase is a staging/camera/UI test, not a tutorial or playable counting round.
Music, dialogue, sprite direction and story timing are intentionally deferred.

## Preview

- Play from the existing menu to enter the field after its exit transition.
- `?scene=game` opens the field directly for development.
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
- Menu `sparky:transition-complete` enters the prepared field with a crossfade.
- `sparky:scene-ready` signals completed field entrance.
- `sparky:shot-change` includes `detail.shot` after a completed camera move.
- `sparky:display-change` includes count, width, height and variant.

The scene adds no audio playback or voice cues yet. Supplied PNG assets are used
for the goal, pause CTA and placeholder coach; the display is generated vector art.

## Football entrance preview

After the field entrance, three plain footballs roll in from offscreen right.
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