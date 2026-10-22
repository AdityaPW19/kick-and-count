/* Design-space shot choreography. Ground position, height and spin stay separate. */
((root, factory) => {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SparkyBallPhysics = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const px = n => Number(n.toFixed(6));
  const depth = ground => clamp(.5 + (ground - 550) / 168 * .5, .42, 1.12);
  const point = (x, ground, height = 0, scale = depth(ground)) => ({ x, ground, height, scale });

  function goalGeometry({ x, y, width, height, naturalWidth, naturalHeight }) {
    // object-fit:contain can letterbox the PNG within the goal element.
    const fit = Math.min(width / naturalWidth, height / naturalHeight);
    const w = naturalWidth * fit, h = naturalHeight * fit;
    const left = x + (width - w) / 2, top = y + (height - h) / 2;
    // Measured front upright centers/inside edges in the supplied goalpost PNG.
    return { left, top, width: w, height: h,
      leftPost: left + w * .049, rightPost: left + w * .951,
      leftInside: left + w * .084, rightInside: left + w * .916,
      ground: top + h * .985, impactY: top + h * .62 };
  }

  function plan({ kind, side = 1, originX, goal, coach = { x: 270, y: 515 }, gutter = 0 }) {
    side = side < 0 ? -1 : 1;
    const origin = point(originX, 718, 0, 1), segments = [];
    let current = origin;
    const add = (to, duration, arc, contact = null, roll = false) => {
      segments.push({ from: current, to, duration, arc, contact, roll }); current = to;
    };
    if (kind === "post") {
      const scale = depth(goal.ground);
      // At contact the near rim of the ball touches the INNER face of the tube.
      const x = side < 0 ? goal.leftInside + 54 * scale : goal.rightInside - 54 * scale;
      const hit = point(x, goal.ground, goal.ground - goal.impactY - 54 * scale, scale);
      add(hit, 650, 90, "post");
      // Sharp, inward reflection from the upright, followed by a field landing.
      add(point(x - side * 130, 645), 430, 22, "ground");
      add(point(mix(x - side * 130, originX, .6), 704), 440, 40, "ground");
      add(point(mix(x - side * 130, originX, .85), 718), 290, 13, "ground");
    } else if (kind === "ground") {
      // A low, overhit shot into the right-hand turf; depth returns on each bounce.
      add(point(1080, 585), 680, 130, "ground");
      add(point(1170, 655), 500, 70, "ground");
      add(point(mix(1170, originX, .55), 709), 430, 32, "ground");
      add(point(mix(1170, originX, .82), 718), 300, 11, "ground");
    } else if (kind === "coach") {
      const hit = point(coach.x, 710, 710 - coach.y - 54 * .86, .86);
      add(hit, 620, 85, "coach");
      add(point(coach.x + 145, 735), 470, 28, "ground");
      add(point(mix(coach.x + 145, originX, .7), 718), 420, 45, "ground");
      add(point(mix(coach.x + 145, originX, .9), 718), 270, 14, "ground");
    } else {
      // Miss well outside either upright, not a sideways balloon at constant depth.
      const edge = side < 0 ? -gutter - 75 : 1440 + gutter;
      add(point(side < 0 ? goal.left - 110 : goal.left + goal.width + 110, 565, 90), 640, 135);
      add(point(edge, 630), 390, 18, "ground");
      // Bounce back into the foreground, then smaller hops bleed off energy.
      const returnX = side < 0 ? 120 : 1245;
      add(point(returnX, 752), 550, 50, "ground");
      add(point(mix(returnX, originX, .65), 724), 440, 25, "ground");
      add(point(mix(returnX, originX, .88), 718), 280, 9, "ground");
    }
    add(origin, 420, 0, null, true);
    return { kind, side, origin, segments };
  }

  function sample(segment, origin, startSpin = 0) {
    const { from, to, duration, arc, roll } = segment;
    const count = Math.max(2, Math.ceil(duration / 16));
    const travel = [], body = [], shadow = [], spin = [];
    // Spin is independent from squash so a landing cannot tilt the ground plane.
    const travelSpin = (to.x - from.x) / Math.max(.5, (from.scale + to.scale) / 2) * 1.05;
    const spinDelta = roll ? Math.round((startSpin + travelSpin) / 360) * 360 - startSpin : travelSpin;
    for (let i = 0; i <= count; i++) {
      const t = i / count, u = roll ? 1 - (1 - t) ** 2 : t;
      const x = mix(from.x, to.x, u), ground = mix(from.ground, to.ground, u);
      const height = Math.max(0, mix(from.height, to.height, t) + 4 * arc * t * (1 - t));
      const scale = mix(from.scale, to.scale, u);
      // The first few frames release the previous landing's squash; the final
      // frames compress at the next contact, with no teleport between segments.
      const startSquash = from !== origin && from.height === 0 ? Math.max(0, 1 - t / .14) * .12 : 0;
      const endSquash = to.height === 0 && !roll ? Math.max(0, (t - .94) / .06) * .12 : 0;
      const squash = Math.max(startSquash, endSquash);
      const offset = t;
      travel.push({ offset, transform: `translate(${px(x - origin.x)}px,${px(ground - origin.ground)}px)` });
      body.push({ offset, transform: `translateY(${px(-height)}px) scale(${px(scale * (1 + squash))},${px(scale * (1 - squash))})` });
      const proximity = 1 - clamp(height / 180, 0, 1);
      shadow.push({ offset, opacity: .12 + proximity * .6,
        transform: `scale(${px(scale * (.55 + proximity * .45))})` });
      spin.push({ offset, transform: `rotate(${px(startSpin + spinDelta * u)}deg)` });
    }
    return { travel, body, shadow, spin, endSpin: startSpin + spinDelta };
  }
  return Object.freeze({ goalGeometry, plan, sample });
});