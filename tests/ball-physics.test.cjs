const test = require('node:test');
const assert = require('node:assert/strict');
const physics = require('../game/ball-physics.js');
const goal = physics.goalGeometry({ x: 392, y: 236, width: 580, height: 326,
  naturalWidth: 1369, naturalHeight: 768 });

test('post geometry respects contained artwork and both inner upright faces', () => {
  assert.ok(goal.leftPost > 419 && goal.leftPost < 422);
  assert.ok(goal.rightPost > 942 && goal.rightPost < 945);
  for (const side of [-1, 1]) {
    const p = physics.plan({ kind: 'post', side, originX: 682.5, goal });
    const hit = p.segments[0].to;
    const rim = hit.x + side * 54 * hit.scale;
    assert.ok(Math.abs(rim - (side < 0 ? goal.leftInside : goal.rightInside)) < .001);
    assert.ok(Math.abs(hit.ground - hit.height - 54 * hit.scale - goal.impactY) < .001);
    assert.equal(p.segments[0].contact, 'post');
    assert.ok((p.segments[1].to.x - hit.x) * side < 0, 'reflect inward from contacted post');
  }
});

test('all wrong shots land, lose bounce height and return to the exact offered slot', () => {
  for (const kind of ['post', 'miss', 'ground', 'coach']) {
    for (const side of [-1, 1]) for (const originX of [472.5, 682.5, 1172.5]) {
      const p = physics.plan({ kind, side, originX, goal, gutter: 320 });
      const end = p.segments.at(-1);
      assert.deepEqual(end.to, p.origin);
      assert.equal(end.roll, true);
      assert.ok(p.segments.filter(s => s.contact === 'ground').length >= 3);
      assert.ok(p.segments.reduce((ms, s) => ms + s.duration, 0) >= 2000);
      for (let i = 0; i < p.segments.length - 1; i++) {
        const s = p.segments[i], next = p.segments[i + 1];
        if (s.contact !== 'ground') continue;
        const impactSpeed = (s.from.height - s.to.height + 4 * s.arc) / s.duration;
        const reboundSpeed = (next.to.height - next.from.height + 4 * next.arc) / next.duration;
        assert.ok(reboundSpeed <= impactSpeed, `${kind} must lose vertical energy at field contact`);
      }
      let spin = 0, previous;
      for (const s of p.segments) {
        const tracks = physics.sample(s, p.origin, spin); spin = tracks.endSpin;
        for (const name of ['travel', 'body', 'shadow', 'spin']) {
          const frames = tracks[name];
          assert.equal(frames[0].offset, 0); assert.equal(frames.at(-1).offset, 1);
          assert.ok(frames.every(f => !JSON.stringify(f).match(/NaN|Infinity/)));
          if (previous) assert.equal(frames[0].transform, previous[name].at(-1).transform, `${kind} ${name} continuous at contact`);
        }
        previous = tracks;
      }
      assert.equal(previous.travel.at(-1).transform, 'translate(0px,0px)');
      assert.equal(previous.body.at(-1).transform, 'translateY(0px) scale(1,1)');
    }
  }
});

test('right turf shot shrinks at depth and shadows strengthen on landing', () => {
  const p = physics.plan({ kind: 'ground', originX: 682.5, goal });
  assert.ok(p.segments[0].to.x > goal.rightPost);
  assert.ok(p.segments[0].to.scale < .65);
  const s = p.segments[1], tracks = physics.sample(s, p.origin);
  const middle = tracks.shadow[Math.floor(tracks.shadow.length / 2)];
  assert.ok(middle.opacity < tracks.shadow.at(-1).opacity);
  assert.ok(tracks.body.some(f => /translateY\(-[1-9]/.test(f.transform)));
});