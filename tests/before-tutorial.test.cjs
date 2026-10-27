'use strict';

// Runtime contract tests, NOT visual QA: no browser layout, media decoding,
// animation aesthetics, or real pointer/keyboard interaction is claimed here.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { registry } = require('../game/progression/master.js');

const directory = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(directory, 'tutorial-before.js'), 'utf8');
const hostSource = fs.readFileSync(path.join(directory, 'tutorial.js'), 'utf8');
const script = new vm.Script(source, { filename: 'tutorial-before.js' });
const hostScript = new vm.Script(hostSource, { filename: 'tutorial.js' });
const plain = value => JSON.parse(JSON.stringify(value));
const expectedLines = [
  'bore-ho-gaye-kya-aage-badhte-badhte', 'to-chalo-ek-step-piche-chala-jae',
  'number-laao', 'ab-balls-laao', 'normal',
  'ab-dekho-upar-vo-nine-dikh-raha-hai', 'nice',
  'ab-niche-dekho-vo-10-dikh-raha-hai', 'hehe-dikh-raha-hai-na',
  'ab-usse-hame-kick-nahi-karna', 'usse-hame-krna-hai-IGNORE',
  'jaise-ham-sunday-ko-homework-ko-karte-hain',
  'yaad-hai-start-me-kya-kaha-tha-maine', 'ek-step-piche-chala-jaae',
  'iss-exercise-me-kick-krna-hai-previous-number-wali-balls',
  'to-batao-nine-ke-pehle-kya-aata-hai',
  'badhiya-ab-aese-hi-previous-numbers-wale-balls-tumhe-kick-krne-hain',
  'ronaldo', 'its-done-bro', 'are-vo-nahi-aa-raha-aaj-phir-bhi-done-kr-do'
].map(name => name === 'normal' ? name : `before-${name}`);

// A deliberately small element tree. Unsupported selectors fail loudly instead
// of silently allowing a broken story to pass. Markup parsing is unnecessary:
// only the known answer child is queried inside lesson-owned HTML.
class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase(); this.children = []; this.parentNode = null;
    this.attributes = new Map(); this.dataset = {}; this.hidden = false;
    this.style = { setProperty(name, value) { this[name] = String(value); } };
    const classes = new Set();
    this.classList = {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      contains: name => classes.has(name),
      toggle(name, force = !classes.has(name)) {
        if (force) classes.add(name); else classes.delete(name);
        return force;
      }
    };
    Object.defineProperty(this, 'className', {
      get: () => [...classes].join(' '),
      set: value => { classes.clear(); String(value).split(/\s+/).filter(Boolean).forEach(name => classes.add(name)); }
    });
  }
  get nextSibling() {
    return this.parentNode?.children[this.parentNode.children.indexOf(this) + 1] || null;
  }
  append(...nodes) {
    for (const node of nodes) { node.remove(); node.parentNode = this; this.children.push(node); }
  }
  insertBefore(node, next) {
    assert.equal(next.parentNode, this); node.remove();
    this.children.splice(this.children.indexOf(next), 0, node); node.parentNode = this;
  }
  remove() {
    if (this.parentNode) this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1);
    this.parentNode = null;
  }
  replaceChildren(...nodes) { for (const child of [...this.children]) child.remove(); this.append(...nodes); }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'style') {
      for (const key of Object.keys(this.style)) if (key !== 'setProperty') delete this.style[key];
      for (const part of String(value).split(';')) {
        const colon = part.indexOf(':');
        if (colon > 0) this.style[part.slice(0, colon).trim()] = part.slice(colon + 1).trim();
      }
    }
  }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === 'style') for (const key of Object.keys(this.style)) if (key !== 'setProperty') delete this.style[key];
  }
  set innerHTML(value) {
    this.markup = String(value); this.replaceChildren();
    if (/class="before-answer"/.test(this.markup)) {
      const answer = new Element('b'); answer.className = 'before-answer'; answer.textContent = '8'; this.append(answer);
    }
  }
  get innerHTML() { return this.markup || ''; }
  querySelectorAll(selector) {
    const match = /^\.([\w-]+)(?:\[data-number="(\d+)"\])?$/.exec(selector);
    assert.ok(match, `unimplemented fake selector: ${selector}`);
    const result = [];
    const visit = node => {
      for (const child of node.children) {
        if (child.classList.contains(match[1]) && (!match[2] || child.dataset.number === match[2])) result.push(child);
        visit(child);
      }
    };
    visit(this); return result;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

function loadLesson(document, extras = {}) {
  const context = vm.createContext({ window: {}, document, ...extras });
  script.runInContext(context);
  return { lesson: context.window.SparkyBeforeLesson, context };
}

function harness({ cancelAt = 0, cancellation = 'reject', zoneLabel = 'Original choices', cinematic = false,
  savedStyle = 'transform:translateX(17px);opacity:.7', savedMovie = 'previous-movie',
  duration = 2000 } = {}) {
  const created = [], events = [], checkpoints = [], handles = [], pending = new Set();
  const document = { createElement(tag) { const node = new Element(tag); created.push(node); return node; } };
  const forbidden = new Proxy({}, { get(_target, key) { throw new Error(`lesson must not access persistence/routing: ${String(key)}`); } });
  const { lesson } = loadLesson(document, { localStorage: forbidden, sessionStorage: forbidden });
  const root = new Element(), camera = new Element(), actor = new Element(), sibling = new Element();
  const board = new Element(), zone = new Element(), ui = new Element(), stage = new Element(), cinema = new Element();
  const cta = new Element('button'), confetti = new Element();
  cta.className = 'tutorial-lets-go'; confetti.className = 'tutorial-confetti';
  root.append(camera, board, zone, cinema, ui); camera.append(actor, sibling); ui.append(stage, cta, confetti);
  if (savedStyle !== null) actor.setAttribute('style', savedStyle);
  cinema.setAttribute('style', 'opacity:.25');
  if (zoneLabel !== null) zone.setAttribute('aria-label', zoneLabel);
  root.classList.toggle('tutorial-cinematic', cinematic);
  const state = { actor, ui, stage, cinema, stopped: false, montageMovie: savedMovie,
    nextVideos: new Map(['comic-multi-shapes-bg', 'comic-book-speed-line-blue', 'comic-intro-bg'].map(name => [name, {}])) };
  let currentState = state, alongside = 0, currentLine = null, beat = null, music = null;
  let display = null, spawnCount = 0, cancelled = false, interrupted = false;
  const abort = () => Object.assign(new Error('Tutorial stopped'), { name: 'AbortError' });
  function record(type, details = {}) {
    const event = { type, line: currentLine, beat, music, ...details }; events.push(event); return event;
  }
  function assertActive(expected = state) {
    if (expected !== currentState || expected.stopped || cancelled) throw abort();
  }
  // Every host suspension outside alongside dialogue edits is cancellable,
  // including both branches of the parallel silence animation/wait.
  async function boundary(name) {
    assertActive();
    // A parallel peer must reject too, but the live run remains available to
    // finally's synchronous restore/sync/stopMusic calls on a host failure.
    if (interrupted) throw abort();
    if (alongside) return;
    checkpoints.push(name);
    if (checkpoints.length !== cancelAt) return;
    interrupted = true;
    if (cancellation !== 'reject') {
      cancelled = true;
      state.stopped = true;
      actor.remove(); ui.remove(); cinema.remove(); zone.replaceChildren();
      for (const handle of handles) handle.stop();
      music = null;
      if (cancellation === 'replace') {
        currentState = { stopped: false };
        root.className = 'replacement-root'; zone.setAttribute('aria-label', 'replacement choices');
      }
    }
    throw abort();
  }
  function track(promise) {
    pending.add(promise); promise.then(() => pending.delete(promise), () => pending.delete(promise)); return promise;
  }
  const scene = {
    async setShot(name) { record('shot', { name }); await boundary(`shot:${name}`); },
    setDisplay(value) { assertActive(); display = plain(value); record('display', { value: display }); },
    spawnBalls(count, { onBounce }) {
      assertActive(); spawnCount++;
      for (let i = 0; i < count; i++) {
        const ball = new Element(), body = new Element(), image = new Element('img');
        ball.className = 'choice-ball'; body.className = 'choice-ball-body';
        image.setAttribute('src', 'assets/objects/football.png'); body.append(image); ball.append(body); zone.append(ball);
      }
      // Shared host's synchronous creation before awaiting entrance is required.
      for (let bounce = 0; bounce < 5; bounce++) onBounce({ bounce });
      record('spawn', { balls: [...zone.children] }); return Promise.resolve();
    }
  };
  const api = {
    get state() { return currentState; }, root, camera, board, zone, scene, assertActive,
    duration(key) { record('duration', { key }); return duration; },
    pose(name) { assertActive(); actor.dataset.pose = name; record('pose', { name }); },
    beat(name) { assertActive(); beat = name; record('beat', { name }); },
    say(key, text, edits) {
      return track((async () => {
        assertActive(); currentLine = key;
        record('say', { key, text, pose: actor.dataset.pose, balls: [...zone.children],
          display: plain(display), actorParent: actor.parentNode, ctaHidden: cta.hidden });
        await boundary(`say:${key}`);
        alongside++;
        try { await edits?.(); } finally { alongside--; }
        assertActive(); record('say-end', { key }); currentLine = null;
      })());
    },
    wait(ms) {
      return track((async () => {
        record('wait', { ms });
        await boundary(`wait:${ms}`);
      })());
    },
    animate(node, frames, ms, options) {
      return track((async () => {
        assert.ok(node instanceof Element, 'animation target exists');
        record('animate', { node, frames: plain(frames), ms, options });
        await boundary(`animate:${node === actor ? 'actor' : node === cinema ? 'cinema' : node.className}`);
        assertActive();
        for (const key of ['transform', 'opacity']) if (key in frames.at(-1)) node.style[key] = String(frames.at(-1)[key]);
      })());
    },
    async cinema(name) {
      record('cinema', { name, parent: actor.parentNode }); await boundary(`cinema:${name}`);
      root.classList.add('tutorial-cinematic'); cinema.style.opacity = '1';
    },
    async comic(html) { record('comic', { html }); await boundary('comic'); },
    async hideComic() { record('hideComic'); await boundary('hideComic'); },
    confetti() { assertActive(); confetti.append(new Element('i')); record('confetti'); },
    async choose() {
      record('choose', { numbers: zone.children.map(node => node.dataset.number), balls: [...zone.children],
        label: zone.getAttribute('aria-label'), display: plain(display), ctaHidden: cta.hidden });
      await boundary('choose'); state.selected = zone.querySelector('.choice-ball[data-number="8"]');
    },
    async goal(options) {
      record('goal', { options: plain(options), selected: state.selected }); await boundary('goal');
      // Host owns the goal presentation; do not invent its dialogue in story.
      scene.setDisplay({ variant: 'number', number: options.boardAnswer });
    },
    async finale(options) {
      record('finale', { options: plain(options), parent: actor.parentNode, style: actor.getAttribute('style') });
      await boundary('finale'); return 'host-finale-result';
    },
    sound(key, options) {
      assertActive(); const handle = { key, stopped: false, stop() { this.stopped = true; record('stop-effect', { key }); } };
      handles.push(handle); record('sound', { key, options: plain(options) }); return handle;
    },
    startMusic(key) { assertActive(); music = key; record('music', { key }); },
    stopMusic() { assertActive(); music = null; record('music', { key: null }); },
    sync() { assertActive(); record('sync', { parent: actor.parentNode, movie: state.montageMovie,
      cinematic: root.classList.contains('tutorial-cinematic'), style: actor.getAttribute('style'),
      cinemaStyle: cinema.getAttribute('style') }); }
  };
  return { lesson, api, state, root, camera, actor, sibling, board, zone, ui, stage, cinema, cta, confetti,
    created, events, checkpoints, handles, get spawnCount() { return spawnCount; },
    async run() {
      try { return await lesson.story(api); }
      finally { while (pending.size) await Promise.allSettled([...pending]); }
    }
  };
}

function assertOwnedCleanup(h) {
  for (const node of h.created) assert.equal(node.parentNode, null, `owned ${node.className} leaked`);
  assert.ok(h.handles.every(handle => handle.stopped), 'every owned sound handle stopped');
  assert.equal(h.actor.classList.contains('before-offscreen-look'), false);
}

test('contract, not visual QA: frozen descriptors have real game-document-relative assets', () => {
  const { lesson } = loadLesson({ createElement() { assert.fail('descriptor evaluation must not build UI'); } });
  assert.deepEqual(Object.keys(lesson).sort(), ['clips', 'poses', 'story']);
  for (const value of [lesson, lesson.poses, lesson.clips]) assert.equal(Object.isFrozen(value), true);
  assert.equal(typeof lesson.story, 'function');
  assert.equal(Object.keys(lesson.poses).length, 6);
  assert.equal(lesson.poses.beforeYawn, 'assets/animations/sparky-sprites/emotes/sparky_yawning.png');
  assert.equal(Object.keys(lesson.clips).length, 24);
  assert.equal(Object.keys(lesson.clips).filter(key => key.startsWith('before-')).length, 20);
  const documentURL = new URL('https://example.invalid/subdirectory/kick-and-count/index.html');
  for (const [kind, entries] of [['poses', lesson.poses], ['clips', lesson.clips]]) {
    for (const [key, asset] of Object.entries(entries)) {
      assert.ok(asset.startsWith(kind === 'poses' ? 'assets/animations/sparky-sprites/' : 'assets/audio/'), `${key}: full document-relative path`);
      const url = new URL(asset, documentURL);
      assert.equal(url.pathname, `/subdirectory/kick-and-count/${asset}`);
      const file = path.resolve(directory, asset);
      assert.ok(file.startsWith(directory + path.sep));
      assert.ok(fs.statSync(file).isFile(), `${key}: ${asset}`);
      assert.ok(fs.statSync(file).size > 0, `${key}: nonempty asset`);
    }
  }
  assert.equal(lesson.clips.error, 'assets/audio/sfx/error.mp3');
  assert.equal(lesson.clips.crickets, 'assets/audio/sfx/crickets.mp3');
  assert.equal(lesson.clips.introMusic, 'assets/audio/music/intro.mp3');
  assert.equal(lesson.clips.lava, 'assets/audio/music/lava-chicken.mp3');
});

test('integration contract: deferred lesson loads before host, predecessor is playable and three future modes remain unavailable', () => {
  const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)\bsrc="([^"]+)"([^>]*)>/g)];
  const lessonIndex = scripts.findIndex(match => match[2] === 'tutorial-before.js');
  const hostIndex = scripts.findIndex(match => match[2] === 'tutorial.js');
  assert.ok(lessonIndex >= 0 && hostIndex > lessonIndex);
  assert.match(scripts[lessonIndex][0], /\bdefer\b/); assert.match(scripts[hostIndex][0], /\bdefer\b/);
  assert.match(html, /<link\b[^>]*href="tutorial-before\.css"/);
  assert.equal(registry.find(mode => mode.id === 'what_came_before').playable, true);
  assert.deepEqual(registry.filter(mode => mode.playable).map(mode => mode.id),
    ['kick_and_count', 'what_comes_next', 'what_came_before']);
  assert.deepEqual(registry.filter(mode => !mode.playable).map(mode => mode.id),
    ['color_match', 'find_missing_number', 'reach_target_score']);
  for (const id of ['color_match', 'find_missing_number', 'reach_target_score']) {
    assert.equal(registry.find(mode => mode.id === id).playable, false);
  }
});

test('host contract: actual tutorial host publishes the 9-before answer/choices and compiles without browser dependencies', () => {
  const elements = new Map();
  const context = vm.createContext({
    window: { addEventListener() {} },
    document: { getElementById(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); }, addEventListener() {} },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    URLSearchParams, location: { search: '' }
  });
  hostScript.runInContext(context);
  const host = context.window.SparkyBeforeTutorial;
  assert.equal(Object.isFrozen(host), true);
  for (const name of ['preload', 'unlock', 'sync', 'startTutorial', 'stop', 'completeTutorial', 'hasCompletedTutorial']) assert.equal(typeof host[name], 'function');
  assert.deepEqual(plain(host.state), { active: false, beat: 'idle', paused: false, musicTrack: null, history: [], answer: 8, choices: [8, 10, 11] });
  assert.equal(host.completeTutorial(), false, 'no host run means no completion');
});

test('runtime contract: exact 20 ordered story lines, shared normal-haan and host-owned goal/finale', async () => {
  const h = harness(); assert.equal(await h.run(), 'host-finale-result');
  const lines = h.events.filter(event => event.type === 'say');
  assert.deepEqual(lines.map(event => event.key), expectedLines);
  assert.equal(lines.find(event => event.key === 'normal').text, 'Normal… haan!');
  assert.equal(h.lesson.clips.normal, undefined, 'normal voice must be supplied by the shared host');
  for (const line of lines) if (line.key !== 'normal') assert.ok(h.lesson.clips[line.key], line.key);
  const goal = h.events.find(event => event.type === 'goal');
  assert.deepEqual(goal.options, { myKick: 'before-pehla-goal-sparky-bhai-ke-naam', answer: 8, boardAnswer: 8, goalLabel: '9 → 8' });
  assert.equal(goal.selected.dataset.number, '8');
  assert.ok(h.lesson.clips[goal.options.myKick]);
  assert.deepEqual(h.events.filter(event => event.type === 'finale').map(event => event.options), [{ label: 'Done!' }]);
  assert.ok(lines.every(event => event.ctaHidden), 'story never exposes a premature CTA');
  assert.equal(h.cta.hidden, true, 'only the real host finale may expose Done');
  assertOwnedCleanup(h);
});

test('runtime contract: board 9 and original three football bodies survive cutaways; guide and goal use 8', async () => {
  const h = harness(); await h.run();
  assert.equal(h.spawnCount, 1);
  const spawned = h.events.find(event => event.type === 'spawn').balls;
  const choice = h.events.find(event => event.type === 'choose');
  assert.deepEqual(choice.numbers, ['8', '10', '11']);
  assert.deepEqual(choice.balls, spawned, 'no replacement question/football nodes');
  assert.deepEqual(choice.display, { variant: 'number', number: 9, width: 420 });
  assert.equal(choice.label, 'What comes before 9? Choose 8.');
  assert.equal(choice.ctaHidden, true);
  for (const [index, ball] of spawned.entries()) {
    assert.equal(ball.getAttribute('aria-label'), `Football number ${[8, 10, 11][index]}`);
    const body = ball.querySelector('.choice-ball-body');
    assert.equal(body.children.length, 1, 'temporary labels removed, original image retained');
    assert.equal(body.children[0].getAttribute('src'), 'assets/objects/football.png');
  }
  const labels = h.created.filter(node => node.className === 'tutorial-ball-number');
  assert.deepEqual(labels.map(node => node.textContent), ['8', '10', '11']);
  assert.deepEqual(labels.map(node => node.style['--number-color']), ['#1554ed', '#ef2446', '#079c36']);
  assert.deepEqual(h.events.filter(event => event.type === 'display').map(event => event.value.number), [null, 9, 8]);
  assert.ok(h.created.find(node => node.className === 'before-previous-panel').innerHTML.includes('Previous number!'));
  assert.equal(h.created.find(node => node.className === 'before-field-hint').innerHTML, 'Look · Before · Kick');
});

test('runtime contract: error cross, spoken IGNORE word, original notebook, and line-specific creative poses', async () => {
  const h = harness(); await h.run();
  const cross = h.created.find(node => node.className === 'before-ball-cross');
  assert.match(cross.innerHTML, /<svg\b/); assert.match(cross.innerHTML, /before-cross/);
  const pop = h.events.find(event => event.type === 'animate' && event.node === cross);
  assert.equal(pop.line, 'before-ab-usse-hame-kick-nahi-karna');
  const error = h.events.find(event => event.type === 'sound' && event.key === 'error');
  assert.equal(error.line, pop.line); assert.deepEqual(error.options, { volume: .3 });
  const errorWait = h.events.find(event => event.type === 'wait' && event.ms === 280 && event.line === pop.line);
  assert.equal(errorWait.line, pop.line);
  assert.ok(h.events.indexOf(errorWait) < h.events.findIndex(event => event.type === 'stop-effect' && event.key === 'error'));
  const ignore = h.events.find(event => event.type === 'comic' && event.line === 'before-usse-hame-krna-hai-IGNORE');
  assert.match(ignore.html, />IGNORE!<\/span>/);
  const notebook = h.created.find(node => node.className === 'before-homework-panel');
  assert.match(notebook.innerHTML, /<svg\b/); assert.match(notebook.innerHTML, /SUNDAY/);
  assert.match(notebook.innerHTML, /HOMEWORK/); assert.match(notebook.innerHTML, /role="img"/);
  assert.doesNotMatch(notebook.innerHTML, /<img\b/);
  const posesFor = suffix => h.events.filter(event => event.type === 'pose' && event.line === `before-${suffix}`).map(event => event.name);
  assert.deepEqual(posesFor('usse-hame-krna-hai-IGNORE'), ['beforeNo', 'beforeLaugh']);
  assert.deepEqual(posesFor('jaise-ham-sunday-ko-homework-ko-karte-hain'), ['beforeCocky', 'beforeNo', 'down']);
  assert.deepEqual(posesFor('iss-exercise-me-kick-krna-hai-previous-number-wali-balls'), ['up', 'down', 'fist']);
  const opening = h.events.filter(event => event.type === 'say');
  assert.equal(opening.find(event => event.key === 'before-ab-usse-hame-kick-nahi-karna').pose, 'beforeNo');
  assert.equal(opening.find(event => event.key === 'before-usse-hame-krna-hai-IGNORE').pose, 'beforeCocky');
  assert.equal(opening.find(event => event.key === 'before-its-done-bro').pose, 'beforeCocky');
  assert.equal(opening.at(-1).pose, 'shy');
});

test('runtime contract: decoded-duration edits use host active waits, including missing-duration fallback', async () => {
  for (const duration of [2000, 0, NaN]) {
    const h = harness({ duration }); await h.run();
    const waits = h.events.filter(event => event.type === 'wait' && event.line === 'before-usse-hame-krna-hai-IGNORE');
    assert.deepEqual(waits.map(event => event.ms), Number.isFinite(duration) ? [0, duration * .3, duration * .7] : [0, 0, 0]);
    const push = h.events.find(event => event.type === 'animate' && event.line === 'before-usse-hame-krna-hai-IGNORE' && event.node === h.actor);
    assert.equal(push.ms, (Number.isFinite(duration) ? duration : 0) * .9);
    assertOwnedCleanup(h);
  }
});

test('runtime contract: intro -> lava -> real null silence -> lava -> null cleanup, bounded nonlooping crickets', async () => {
  const h = harness(); await h.run();
  assert.deepEqual(h.events.filter(event => event.type === 'music').map(event => event.key), ['introMusic', 'lava', null, 'lava', null]);
  const silenceIndex = h.events.findIndex(event => event.type === 'beat' && event.name === 'before-silence');
  const deadpanIndex = h.events.findIndex(event => event.type === 'beat' && event.name === 'before-deadpan');
  const silence = h.events.slice(silenceIndex, deadpanIndex);
  assert.ok(silence.every(event => event.music === null));
  assert.ok(silence.some(event => event.type === 'wait' && event.ms === 1400));
  assert.ok(silence.some(event => event.type === 'animate' && event.node === h.actor));
  assert.equal(silence.some(event => ['sound', 'say', 'comic'].includes(event.type)), false);
  assert.equal(h.confetti.children.length, 0);
  const boastCricket = h.events.find(event => event.type === 'sound' && event.key === 'crickets');
  assert.equal(boastCricket.music, 'lava');
  assert.deepEqual(boastCricket.options, { volume: .16, loop: false });
  const cricket = h.events.filter(event => event.type === 'sound' && event.key === 'crickets').at(-1);
  assert.equal(cricket.beat, 'before-deadpan'); assert.equal(cricket.music, null);
  assert.deepEqual(cricket.options, { volume: .12, loop: false });
  const cricketIndex = h.events.indexOf(cricket);
  const resumeIndex = h.events.findIndex((event, index) => index > cricketIndex && event.type === 'music' && event.key === 'lava');
  const gap = h.events.slice(cricketIndex, resumeIndex);
  assert.ok(gap.some(event => event.type === 'wait' && event.ms === 380));
  assert.ok(gap.some(event => event.type === 'stop-effect' && event.key === 'crickets'));
});

test('runtime contract: cutaways restore original parent/sibling, style, movie, cinema and accessibility label', async () => {
  for (const options of [{}, { cinematic: true, savedStyle: null, zoneLabel: null, savedMovie: null }]) {
    const h = harness(options); await h.run();
    assert.deepEqual(h.events.filter(event => event.type === 'cinema').map(event => event.name),
      ['comic-multi-shapes-bg', 'comic-book-speed-line-blue', 'reveal', 'comic-intro-bg']);
    assert.ok(h.events.filter(event => event.type === 'cinema').every(event => event.parent === h.stage));
    const restored = h.events.filter(event => event.type === 'sync' && event.parent === h.camera);
    assert.ok(restored.length >= 3);
    for (const event of restored) {
      assert.equal(event.movie, options.savedMovie === null ? null : 'previous-movie');
      assert.equal(event.cinematic, Boolean(options.cinematic));
      assert.equal(event.style, options.savedStyle === null ? null : 'transform:translateX(17px);opacity:.7');
      assert.equal(event.cinemaStyle, 'opacity:.25');
    }
    assert.equal(h.actor.parentNode, h.camera); assert.equal(h.actor.nextSibling, h.sibling);
    assert.equal(h.zone.getAttribute('aria-label'), options.zoneLabel === null ? null : 'Original choices');
    assert.equal(h.ui.classList.contains('before-lesson'), false);
    assert.equal(h.ui.classList.contains('before-cutaway'), false);
    assert.equal(h.board.classList.contains('before-board-flash'), false);
    assert.ok(h.zone.children.every(node => !node.classList.contains('before-ball-flash')));
    assertOwnedCleanup(h);
  }
});

test('runtime contract: all sequential cancellation points release ownership without persistence or replacement-run mutation', async () => {
  const baseline = harness(); await baseline.run();
  assert.equal(baseline.checkpoints.length, 40, 'redundant post-cutaway camera shots removed');
  for (const cancellation of ['reject', 'stop', 'replace']) {
    for (let cancelAt = 1; cancelAt <= baseline.checkpoints.length; cancelAt++) {
      const h = harness({ cancelAt, cancellation });
      await assert.rejects(h.run(), { name: 'AbortError' }, `${cancellation} at ${cancelAt}: ${baseline.checkpoints[cancelAt - 1]}`);
      assert.equal(h.checkpoints.length, cancelAt, 'must not advance to another sequential boundary');
      assertOwnedCleanup(h);
      if (cancellation === 'reject') {
        assert.equal(h.actor.parentNode, h.camera); assert.equal(h.actor.nextSibling, h.sibling);
        assert.equal(h.zone.getAttribute('aria-label'), 'Original choices');
        assert.equal(h.ui.classList.contains('before-lesson'), false);
        assert.equal(h.ui.classList.contains('before-cutaway'), false);
        assert.equal(h.events.at(-1).type, 'music'); assert.equal(h.events.at(-1).key, null);
      } else {
        assert.equal(h.actor.parentNode, null, 'never reattach a host-disposed actor');
        assert.equal(h.ui.parentNode, null);
        if (cancellation === 'replace') {
          assert.equal(h.root.className, 'replacement-root');
          assert.equal(h.zone.getAttribute('aria-label'), 'replacement choices');
        }
      }
    }
  }
});