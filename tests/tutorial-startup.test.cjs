'use strict';

// Startup contracts only: real lesson/host manifests and preload code, no
// rendering, browser media decoding, or tutorial choreography is simulated.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scripts = ['tutorial-before.js', 'tutorial.js'].map(filename => new vm.Script(
  fs.readFileSync(path.resolve(__dirname, '..', filename), 'utf8'), { filename }
));

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function harness(t, { holdShot = false } = {}) {
  const assets = deferred(), shot = deferred(), shotEntered = deferred();
  const calls = { decodes: [], videos: 0, builds: [], mounted: 0, shots: [], displays: [] };
  function node() {
    const classes = new Set();
    return {
      children: [], style: {}, attributes: new Map(),
      classList: {
        add(...names) { names.forEach(name => classes.add(name)); },
        remove(...names) { names.forEach(name => classes.delete(name)); },
        contains(name) { return classes.has(name); },
        toggle(name, force = !classes.has(name)) {
          if (force) classes.add(name); else classes.delete(name);
          return force;
        }
      },
      setAttribute(name, value) { this.attributes.set(name, String(value)); },
      append(...children) { calls.mounted += children.length; this.children.push(...children); },
      prepend(...children) { calls.mounted += children.length; this.children.unshift(...children); }
    };
  }
  const nodes = new Map(['game-scene', 'scene-camera', 'quantity-display',
    'ball-choice-zone', 'scene-status'].map(id => [id, node()]));
  const goal = node();
  const document = {
    hidden: false,
    getElementById(id) {
      assert.ok(nodes.has(id), `unexpected document node: ${id}`);
      return nodes.get(id);
    },
    querySelector(selector) {
      assert.equal(selector, '.goal-zone');
      return goal;
    },
    addEventListener() {},
    fonts: { load: async () => [] },
    createElement(tag) {
      if (tag !== 'video') {
        calls.builds.push(tag);
        throw new Error(`Startup must not build tutorial DOM: ${tag}`);
      }
      calls.videos++;
      return {
        src: '',
        load() { if (this.src) this.onloadeddata(); },
        removeAttribute(name) { assert.equal(name, 'src'); this.src = ''; }
      };
    }
  };
  const scene = {
    state: { paused: false },
    setDisplay(value) { calls.displays.push(value); },
    async setShot(...args) {
      calls.shots.push(args);
      shotEntered.resolve();
      if (holdShot) await shot.promise;
    }
  };
  let blobId = 0;
  const window = { SparkyScene: scene, addEventListener() {} };
  const context = vm.createContext({
    window, document, console, DOMException, URLSearchParams,
    location: { search: '' },
    matchMedia: () => ({ matches: true, addEventListener() {} }),
    Image: class {
      decode() { calls.decodes.push(this.src); return assets.promise; }
    },
    fetch: async () => ({
      ok: true,
      blob: async () => new Blob(),
      arrayBuffer: async () => new ArrayBuffer(0)
    }),
    URL: { createObjectURL: () => `blob:startup-test-${++blobId}`, revokeObjectURL() {} },
    setTimeout, clearTimeout
    // No AudioContext: the real host intentionally skips audio preloading.
  });
  for (const script of scripts) script.runInContext(context);
  const tutorial = window.SparkyBeforeTutorial;
  t.after(() => { tutorial.stop(); assets.resolve(); shot.resolve(); });
  return { tutorial, calls, nodes, assets, shot, shotEntered };
}

function assertUnmounted(h) {
  assert.deepEqual(h.calls.builds, [], 'build() must never be entered');
  assert.equal(h.calls.mounted, 0, 'no tutorial nodes mounted');
  assert.equal(h.nodes.get('scene-camera').children.length, 0);
  assert.equal(h.nodes.get('game-scene').children.length, 0);
  assert.equal(h.tutorial.state.active, false);
}

test('stop before the first asset decode prevents a stale startup from mounting', { timeout: 5000 }, async t => {
  const h = harness(t);
  const start = h.tutorial.startTutorial();
  assert.ok(h.calls.decodes.length > 0, 'real host preload has started');
  h.tutorial.stop();
  assertUnmounted(h);
  h.assets.resolve();
  assert.equal(await start, false);
  assert.ok(h.calls.decodes.includes('assets/animations/sparky-sprites/emotes/sparky-saying-no.png'),
    'the real before lesson manifest also warms after cancellation');
  assert.equal(h.calls.videos, 2, 'real base movie probes completed');
  assert.equal(h.calls.shots.length, 0, 'stale preload cannot change the camera');
  assert.equal(h.calls.displays.length, 0);
  assertUnmounted(h);
});

test('concurrent startup calls share the same promise and stop cancels both', { timeout: 5000 }, async t => {
  const h = harness(t);
  const first = h.tutorial.startTutorial();
  const decodeCount = h.calls.decodes.length;
  const duplicate = h.tutorial.startTutorial();
  assert.strictEqual(duplicate, first);
  assert.equal(h.calls.decodes.length, decodeCount, 'duplicate start does not restart preload');
  h.tutorial.stop();
  h.assets.resolve();
  assert.deepEqual(await Promise.all([first, duplicate]), [false, false]);
  assert.equal(h.calls.shots.length, 0);
  assertUnmounted(h);
});

test('stale startup catch cannot clear a replacement awaiting its pre-mount shot', { timeout: 5000 }, async t => {
  const h = harness(t, { holdShot: true });
  const old = h.tutorial.startTutorial();
  h.tutorial.stop();
  const replacement = h.tutorial.startTutorial();
  assert.notStrictEqual(replacement, old);
  assert.strictEqual(h.tutorial.startTutorial(), replacement);
  // Both starts warm the same asset cache. Hold the replacement's next await
  // so the stale catch settles without allowing a legitimate replacement build.
  h.assets.resolve();
  assert.equal(await old, false);
  await h.shotEntered.promise;
  assert.strictEqual(h.tutorial.startTutorial(), replacement,
    'settled old catch must not null the newer playing promise');
  assert.equal(h.calls.shots.length, 1, 'only replacement reaches the camera');
  assert.equal(h.calls.shots[0][0], 'wide');
  assert.equal(h.calls.shots[0][1].instant, true);
  assert.equal(h.calls.displays.length, 1);
  assertUnmounted(h);
  h.tutorial.stop();
  h.shot.resolve();
  assert.deepEqual(await Promise.all([old, replacement]), [false, false]);
  assert.equal(h.calls.shots.length, 1);
  assertUnmounted(h);
});