'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = new vm.Script(
  fs.readFileSync(path.join(__dirname, '..', 'scene.js'), 'utf8'),
  { filename: 'scene.js' }
);

// Fake-DOM contract tests, NOT visual QA. Run the unmodified scene IIFE and its
// public setDisplay; retain its actual SVG string for regex assertions. This
// fixture supports only startup/board nodes, styles, classes, attributes, control
// values, listener registration and display events. It does not parse a DOM,
// measure text/fonts, render SVG, simulate layout, animate or decode media.
// Unknown nodes/selectors fail loudly. Empty location.search avoids enter();
// no Image, canvas, timers or game/tutorial implementations should be needed.
function withStubDOM() {
  function node(dataset = {}) {
    const attributes = new Map(), classes = new Set();
    return {
      dataset, innerHTML: '', value: '', events: [],
      style: { setProperty(name, value) { this[name] = String(value); } },
      classList: {
        add(...names) { names.forEach(name => classes.add(name)); },
        remove(...names) { names.forEach(name => classes.delete(name)); },
        contains(name) { return classes.has(name); },
        toggle(name, force = !classes.has(name)) {
          if (force) classes.add(name); else classes.delete(name);
          return force;
        }
      },
      setAttribute(name, value) { attributes.set(name, String(value)); },
      getAttribute(name) { return attributes.get(name) ?? null; },
      addEventListener() {},
      dispatchEvent(event) { this.events.push(event); return true; },
      querySelector(selector) {
        assert.equal(selector, '.demo-ending', 'supported element selector');
        return null;
      }
    };
  }
  const ids = [
    'game-scene', 'scene-frame', 'scene-camera', 'quantity-display', 'scene-hud',
    'scene-pause-overlay', 'scene-pause', 'scene-resume', 'scene-status',
    'ball-choice-zone', 'replay-ball-entry', 'game-info', 'game-tutorial',
    'game-exit', 'scene-wide', 'lab-toggle', 'display-count', 'count-output',
    'display-width', 'width-output', 'show-zones', 'test-ball-count'
  ];
  const nodes = new Map(ids.map(id => [id, node()]));
  const menu = node();
  const buttons = ['count', 'message', 'celebrate', 'number', 'sequence']
    .map(display => node({ display }));
  const document = {
    hidden: false,
    documentElement: { clientWidth: 1365, clientHeight: 768 },
    getElementById(id) {
      assert.ok(nodes.has(id), `unsupported fake DOM id: ${id}`);
      return nodes.get(id);
    },
    querySelector(selector) {
      assert.equal(selector, '.menu', 'supported document selector');
      return menu;
    },
    querySelectorAll(selector) {
      if (selector === '[data-display]') return buttons;
      assert.equal(selector, '[data-shot]', 'supported control selector');
      return [];
    },
    addEventListener() {}
  };
  const window = { addEventListener() {} };
  const context = vm.createContext({
    window, document, location: { search: '' }, URLSearchParams,
    matchMedia(query) {
      assert.ok(['(prefers-reduced-motion: reduce)', '(orientation: landscape)'].includes(query));
      return { matches: query === '(orientation: landscape)', addEventListener() {} };
    },
    CustomEvent: class CustomEvent {
      constructor(type, options) { this.type = type; Object.assign(this, options); }
    }
  });
  script.runInContext(context);
  assert.equal(window.SparkyScene.state.active, false, 'startup must not enter the scene');
  return {
    scene: window.SparkyScene,
    panel: nodes.get('quantity-display'),
    root: nodes.get('game-scene')
  };
}

function attribute(markup, name) {
  const match = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(markup);
  assert.ok(match, `missing ${name} in ${markup}`);
  return match[1];
}

function contentText(panel) {
  const content = /<g class="panel-content">([\s\S]*?)<\/g>/.exec(panel.innerHTML);
  assert.ok(content, 'actual scene SVG contains panel-content');
  const texts = [...content[1].matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)];
  assert.equal(texts.length, 1, 'one centered text run, not separately positioned numbers');
  assert.equal(attribute(texts[0][1], 'x'), '270');
  assert.match(panel.innerHTML, /<g text-anchor="middle"/);
  return texts[0];
}

function assertSequence(panel, direction, expected) {
  assert.doesNotMatch(panel.innerHTML, /<(?:image|img)\b|panel-ball|football/i,
    'sequence markup must not contain football icons');
  const text = contentText(panel);
  const spans = [...text[2].matchAll(/<tspan\b([^>]*)>([^<]*)<\/tspan>/g)];
  assert.equal(spans.length, expected.length + 1);
  assert.equal(spans.map(span => span[2]).join(''), `${expected.join(', ')}…`);
  const numbers = spans.slice(0, -1);
  assert.deepEqual(numbers.map(span => Number(span[2].replace(/, $/, ''))), expected);
  numbers.forEach((span, index) => {
    assert.equal(attribute(span[1], 'fill'), index === numbers.length - 1 ? '#fff2ab' : '#c5d9ef',
      'final starter yellow; earlier context pale');
    assert.ok(expected[index] >= 1 && expected[index] <= 99, 'no 0, 100 or 101');
  });
  const ellipsis = spans.at(-1);
  assert.equal(ellipsis[2], '…');
  assert.equal(attribute(ellipsis[1], 'fill'), '#fff2ab');
  assert.equal(attribute(ellipsis[1], 'dx'), '10');
  assert.equal(panel.getAttribute('aria-label'),
    `${expected.join(', ')}, what ${direction === 'before' ? 'came before' : 'comes next'}?`);
}

for (const [direction, cases] of [
  ['next', [[1, [1]], [2, [1, 2]], [3, [1, 2, 3]], [12, [10, 11, 12]], [98, [96, 97, 98]]]],
  ['before', [[2, [4, 3, 2]], [3, [5, 4, 3]], [12, [14, 13, 12]],
    [97, [99, 98, 97]], [98, [99, 98]], [99, [99]]]]
]) {
  for (const [number, expected] of cases) {
    test(`${direction} ${number}: centered ${expected.join(', ')}… with colors and accessible prompt`, () => {
      const { scene, panel } = withStubDOM();
      const result = scene.setDisplay({ variant: 'sequence', direction, number, width: 540 });
      assert.equal(result.variant, 'sequence');
      assert.equal(result.direction, direction);
      assert.equal(result.number, number);
      assertSequence(panel, direction, expected);
    });
  }
}

for (const [direction, starter, answer] of [['before', 2, 1], ['next', 97, 98]]) {
  test(`${direction} sequence reveals correct answer ${answer} using number variant`, () => {
    const { scene, panel, root } = withStubDOM();
    scene.setDisplay({ variant: 'sequence', direction, number: starter, width: 540 });
    const result = scene.setDisplay({ variant: 'number', number: answer });
    assert.equal(result.variant, 'number');
    assert.equal(result.number, answer);
    const text = contentText(panel);
    assert.equal(text[2], String(answer));
    assert.equal(attribute(text[1], 'fill'), '#fff2ab');
    assert.doesNotMatch(panel.innerHTML, /<tspan\b|…|<(?:image|img)\b|football/i);
    assert.equal(panel.getAttribute('aria-label'), `Number ${answer}`);
    const event = root.events.at(-1);
    assert.equal(event.type, 'sparky:display-change');
    assert.equal(event.detail.variant, 'number');
    assert.equal(event.detail.number, answer);
  });
}

test('explicit direction options reset before/next context on the same scene', () => {
  const { scene, panel } = withStubDOM();
  for (const [direction, expected] of [
    ['before', [14, 13, 12]], ['next', [10, 11, 12]], ['before', [14, 13, 12]],
    ['next', [10, 11, 12]]
  ]) {
    scene.setDisplay({ variant: 'sequence', direction, number: 12, width: 540 });
    assert.equal(scene.state.display.direction, direction);
    assertSequence(panel, direction, expected);
  }
});