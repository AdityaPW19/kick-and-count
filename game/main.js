/* Load after scene, tutorial, progression/engine and director. No automatic entry. */
(() => {
  "use strict";

  const CANCELLED = Symbol("counting controller stopped");
  const COLORS = ["#1554ed", "#ef2446", "#079c36", "#9235e8", "#e85b08", "#007fac"];
  const memory = new Map();
  const events = [];
  const errors = [];
  let generation = 0, run = null, engine = null, engines = null, master = null, helpPlaying = false, helpJob = null;
  let debugEnabled = false, persistence = "localStorage";
  const D = () => window.SparkyDirector;
  const scene = () => window.SparkyScene;
  const modes = window.SparkyModes || (window.SparkyModes = Object.create(null));

  function dispatch(type, detail) {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  }
  function report(error, context) {
    if (error === CANCELLED) return;
    const entry = { context, message: String(error?.message || error), at: Date.now() };
    errors.push(entry); if (errors.length > 30) errors.shift();
    console.warn("[SparkyGame]", context, error);
    dispatch("sparky:game-error", entry);
    updateDebug();
  }
  // Mirror every read/write, then permanently fail over for this page session.
  // The engine never receives a throwing storage adapter or loses an accepted kick.
  const storage = {
    getItem(key) {
      if (persistence === "localStorage") {
        try {
          const value = window.localStorage.getItem(key);
          if (value !== null) memory.set(key, value);
          return value;
        } catch (error) { storageFailure(error); }
      }
      return memory.get(key) ?? null;
    },
    setItem(key, value) {
      memory.set(key, String(value));
      if (persistence === "localStorage") {
        try { window.localStorage.setItem(key, String(value)); }
        catch (error) { storageFailure(error); }
      }
    }
  };
  function storageFailure(error) {
    persistence = "memory";
    report(error, "Progress is session-only: browser storage is unavailable");
    dispatch("sparky:storage-fallback", { persistence, durable: false });
  }
  function live(r) { return run === r && r.id === generation && !r.stopped; }
  function assert(r) { if (!live(r)) throw CANCELLED; }
  async function owned(r, promise) {
    const value = await Promise.race([promise, r.cancelled.then(() => { throw CANCELLED; })]);
    assert(r); return value;
  }
  function listen(r, target, type, callback) {
    target.addEventListener(type, callback);
    r.cleanups.push(() => target.removeEventListener(type, callback));
  }
  function snapshot() {
    return {
      running: Boolean(run && !run.stopped), helpPlaying,
      answering: Boolean(run?.answering && !run.busy && !run.preview && !D()?.state.paused),
      busy: Boolean(run?.busy), preview: run?.preview || null,
      question: run?.question || engine?.currentQuestion() || null,
      progression: engine?.state || null, streak: run?.streak || 0,
      modeId: run?.modeId || master?.state.activeModeId || "kick_and_count",
      master: master?.state || null,
      modeProgress: engines ? Object.fromEntries(Object.entries(engines).map(([id, item]) => [id, item.state])) : null,
      persistence, durable: persistence === "localStorage", debugEnabled,
      director: D()?.state || null, events: events.slice(), errors: errors.slice()
    };
  }
  function controls(r) {
    if (!live(r)) return;
    if (r.tutorialActive) return; // Guided tutorial owns its ball input/visibility.
    const enabled = r.answering && !r.busy && !r.preview && !D().state.paused;
    r.zone.inert = !enabled;
    r.zone.setAttribute("aria-busy", String(r.busy));
    r.root.classList.toggle("main-game-answering", enabled);
    r.root.classList.toggle("main-game-busy", r.busy);
    for (const ball of r.zone.children) {
      ball.tabIndex = enabled ? 0 : -1;
      ball.setAttribute("aria-disabled", String(!enabled));
    }
    if (r.hint) r.hint.hidden = !enabled;
    updateDebug();
  }
  function sync() { D()?.sync(); if (run) controls(run); }
  function resetIdle(r) {
    r.idleAt = D().state.time + 12000 + Math.random() * 8000;
  }
  async function quiet(r) {
    resetIdle(r); D().interruptVoice();
    if (r.idleVoice) await owned(r, r.idleVoice);
    assert(r);
  }
  async function idleLoop(r) {
    const token = r.idleGeneration = (r.idleGeneration || 0) + 1;
    while (live(r) && token === r.idleGeneration) {
      if (!await owned(r, D().wait(500))) return;
      if (token !== r.idleGeneration) return;
      controls(r);
      if (!r.answering || r.busy || r.preview || D().state.paused || D().state.time < r.idleAt) continue;
      const voice = D().idle();
      r.idleVoice = voice;
      try { await owned(r, voice); }
      catch (error) { if (error !== CANCELLED) report(error, "Idle voice"); else return; }
      finally { if (r.idleVoice === voice) r.idleVoice = null; }
      if (live(r)) resetIdle(r);
    }
  }
  function resetBall(ball) {
    for (const node of [ball, ball.querySelector(".choice-ball-body"),
      ball.querySelector(".choice-ball-shadow"), ball.querySelector("img")]) {
      if (!node) continue;
      for (const key of ["transform", "opacity", "visibility", "z-index"]) node.style.removeProperty(key);
    }
    ball.classList.remove("main-ball-selected");
    delete ball.dataset.shotKind; delete ball.dataset.shotSide;
  }
  function decorate(r, q) {
    const colors = COLORS.slice();
    for (const [index, ball] of [...r.zone.children].entries()) {
      const value = q.options[index];
      if (value === undefined) continue;
      ball.dataset.number = String(value);
      ball.setAttribute("role", "button");
      ball.setAttribute("aria-label", `Kick ${value}`);
      ball.tabIndex = -1;
      ball.setAttribute("aria-disabled", "true");
      let sticker = ball.querySelector(".tutorial-ball-number");
      if (!sticker) {
        sticker = document.createElement("span");
        sticker.className = "tutorial-ball-number";
        sticker.setAttribute("aria-hidden", "true");
        sticker.style.setProperty("--number-color", colors.splice(Math.floor(Math.random() * colors.length), 1)[0]);
        ball.querySelector(".choice-ball-body").append(sticker);
      } else {
        const color = sticker.style.getPropertyValue("--number-color");
        const indexOf = colors.indexOf(color); if (indexOf >= 0) colors.splice(indexOf, 1);
      }
      sticker.textContent = String(value);
    }
  }
  // Registry contract: render(question, context) and restore(question, context).
  // Other modes can reuse the scene primitives without coupling to engine internals.
  async function revealBoard(r) {
    const board = document.getElementById("quantity-display");
    board.style.opacity = "0";
    r.root.classList.add("main-question-visible");
    D().pose("up");
    void D().questionStart().catch(error => { if (live(r)) report(error, "Question-start dialogue"); });
    D().sound("assets/audio/sfx/ui-display.mp3", { volume: .5 });
    await owned(r, D().animate(board, [
      { opacity: 0, transform: "translateY(-170px) scale(.85)" },
      { opacity: 1, transform: "translateY(12px) scale(1.02)", offset: .8 },
      { opacity: 1, transform: "translateY(0) scale(1)" }
    ], 750));
  }
  modes.counting = Object.freeze({
    name: "Count & Kick", instruction: "Count. Choose. Kick!", choiceLabel: "Choose the number matching the footballs above",
    async render(q, r) {
      if (!Number.isInteger(q.displayBallCount) || q.displayBallCount < 1 || q.displayBallCount > 20 ||
          q.options.length < 3 || q.options.length > 6 || new Set(q.options).size !== q.options.length) {
        throw new RangeError("Invalid counting presentation");
      }
      r.root.classList.remove("main-question-visible", "main-options-visible");
      if (scene().state.shot !== "wide") await owned(r, scene().setShot("wide"));
      assert(r);
      this.restore(q, r);
      await revealBoard(r);
      await owned(r, D().wait(180)); D().pose("summon");
      r.root.classList.add("main-options-visible");
      const arrival = scene().spawnBalls(q.options.length, { onBounce: ({ bounce }) => {
        if (live(r)) D().sound("assets/audio/sfx/toing.mp3", { volume: [.22, .15, .1, .06][bounce] || .06 });
      } });
      decorate(r, q); // spawnBalls builds synchronously when the camera is wide.
      await owned(r, arrival);
      decorate(r, q);
      if (r.zone.children.length !== q.options.length) throw new Error("Football entrance did not create the offered choices");
      for (const ball of r.zone.children) resetBall(ball);
      D().pose("proud");
    },
    restore(q) {
      scene().setDisplay({ count: q.displayBallCount, width: q.displayBallCount > 10 ? 540 : 420, variant: "count" });
    }
  });

  modes.what_comes_next = Object.freeze({
    name: "What Comes Next?", instruction: "Look. Next. Kick!", choiceLabel: "Choose the number that comes next",
    async render(q, r) {
      if (!Number.isInteger(q.displayedNumber) || q.displayedNumber < 1 || q.displayedNumber > 98 || q.correctAnswer !== q.displayedNumber + 1) throw new RangeError("Invalid successor presentation");
      // Entrance, retained coach, physics, input and feedback stay shared.
      await modes.counting.render.call(this, { ...q, displayBallCount: 1 }, r);
    },
    restore(q) {
      scene().setDisplay({ variant: "sequence", number: q.displayedNumber, width: 540, direction: "next" });
    },
    async goal(q, r) {
      const board = document.getElementById("quantity-display");
      const content = board.querySelector(".panel-content");
      await owned(r, D().animate(content, [{ opacity: 1 }, { opacity: 0 }], 130));
      scene().setDisplay({ variant: "number", number: q.correctAnswer, width: 540 });
      await owned(r, D().animate(board.querySelector(".panel-content"), [
        { opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }
      ], 180));
    }
  });
  modes.what_came_before = Object.freeze({
    name: "What Came Before?", instruction: "Look. Before. Kick!", choiceLabel: "Choose the number that came before",
    async render(q, r) {
      if (!Number.isInteger(q.displayedNumber) || q.displayedNumber < 2 || q.displayedNumber > 99 || q.correctAnswer !== q.displayedNumber - 1) throw new RangeError("Invalid predecessor presentation");
      await modes.counting.render.call(this, { ...q, displayBallCount: 1 }, r);
    },
    restore(q) {
      scene().setDisplay({ variant: "sequence", number: q.displayedNumber, width: 540, direction: "before" });
    },
    goal: modes.what_comes_next.goal
  });
  function progression() {
    return { kick_and_count: window.SparkyProgression, what_comes_next: window.SparkyNextProgression,
      what_came_before: window.SparkyBeforeProgression }[run?.modeId || "kick_and_count"];
  }
  function phaseFor(q) { return progression().phases.find(phase => phase.phaseId === q.phaseId) || null; }
  function phaseEnd(q) {
    if (engine.state.mode !== "fixed") return (engine.state.infiniteCompletedSinceInteraction + 1) % 5 === 0;
    const phase = phaseFor(q);
    return Boolean(phase && progression().fixedQuestions[phase.endQuestion - 1]?.questionId === q.questionId);
  }
  function phaseNumber(q) {
    return engine.state.mode === "fixed" ? q.phaseId : progression().phases.length + 1 + Math.floor(engine.state.completedInfiniteQuestions / 5);
  }
  async function reboundFlight(r, ball, kind) {
    const physics = window.SparkyBallPhysics;
    const body = ball.querySelector(".choice-ball-body"), image = body.querySelector("img");
    const shadow = ball.querySelector(".choice-ball-shadow"), goalImage = r.goal.querySelector("img");
    const goal = physics.goalGeometry({ x: r.goal.offsetLeft, y: r.goal.offsetTop,
      width: r.goal.offsetWidth, height: r.goal.offsetHeight,
      naturalWidth: goalImage.naturalWidth, naturalHeight: goalImage.naturalHeight });
    // Coordinates are camera-local, not viewport pixels (responsive scaling stays exact).
    const actor = D().actor;
    const coach = { x: actor.offsetLeft + actor.offsetWidth * .53,
      y: actor.offsetTop + actor.offsetHeight * .48 };
    const sideKey = kind === "post" ? "postAttempts" : "wideAttempts";
    const side = ((r[sideKey] = (r[sideKey] || 0) + 1) % 2) ? -1 : 1;
    const scale = Math.min(innerWidth / 1365, innerHeight / 768);
    const plan = physics.plan({ kind, side, originX: r.zone.offsetLeft + ball.offsetLeft + 54,
      goal, coach, gutter: Math.max(0, (innerWidth / scale - 1365) / 2) });
    ball.dataset.shotKind = kind; ball.dataset.shotSide = side < 0 ? "left" : "right";
    let spin = 0, bounces = 0;
    for (const segment of plan.segments) {
      const tracks = physics.sample(segment, plan.origin, spin); spin = tracks.endSpin;
      await owned(r, Promise.all([
        D().animate(ball, tracks.travel, segment.duration, { easing: "linear" }),
        D().animate(body, tracks.body, segment.duration, { easing: "linear" }),
        D().animate(shadow, tracks.shadow, segment.duration, { easing: "linear" }),
        D().animate(image, tracks.spin, segment.duration, { easing: "linear" })
      ]));
      if (segment.contact === "post") {
        D().sound("assets/audio/goalhit/goal-hit.mp3", { volume: .5 });
        // Rattle only at the actual upright contact; the ball immediately reflects.
        void D().animate(r.goal, [
          { transform: "translateX(0)" }, { transform: `translateX(${side * 3}px)`, offset: .25 },
          { transform: `translateX(${-side * 2}px)`, offset: .6 }, { transform: "translateX(0)" }
        ], 200);
      } else if (segment.contact === "coach") {
        D().pose("goofy"); D().sound("assets/audio/sfx/toing.mp3", { volume: .4 });
        r.contactFeedback = D().feedback({ correct: false, kind: "coach" });
        void D().animate(actor, [
          { transform: "rotate(0)" }, { transform: "translate(-22px,8px) rotate(-12deg)", offset: .4 },
          { transform: "rotate(0)" }
        ], 450);
      } else if (segment.contact === "ground") {
        D().sound("assets/audio/sfx/toing.mp3", { volume: [.22, .15, .09, .055][bounces++] || .04 });
      }
    }
    resetBall(ball);
  }
  async function flight(r, ball, correct, kind) {
    ball.classList.add("main-ball-selected");
    D().sound("assets/audio/sfx/bonk.mp3", { volume: .5 });
    if (!correct) return reboundFlight(r, ball, kind);
    const body = ball.querySelector(".choice-ball-body");
    const shadow = ball.querySelector(".choice-ball-shadow");
    const x = 410 + Number.parseFloat(ball.style.left) + 54;
    const dx = 682.5 - x;
    const move = frames => D().animate(body, frames, 780, { easing: "ease-in-out" });
    const from = { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 };
    const frame = (tx, ty, scale, rotation, offset, opacity = 1) => ({
      transform: `translate(${tx}px,${ty}px) scale(${scale}) rotate(${rotation}deg)`, offset, opacity
    });
    const path = [from, frame(dx * .55, -230, .78, -250, .55), frame(dx, -298, .28, -570, 1, .2)];
    await owned(r, Promise.all([
      move(path),
      D().animate(shadow, [{ opacity: .8, transform: "scale(1)" }, { opacity: 0, transform: "scale(.2)" }], 650)
    ]));
    D().sound("assets/audio/goalhit/goal-hit.mp3", { volume: .55 });
    // Start the sequence-to-answer reveal at contact, independently of the
    // goal rattle/celebration. Keep that answer until the next question reveal.
    r.boardFeedback = r.adapter.goal?.(r.question, r);
    if (r.boardFeedback) void r.boardFeedback.catch(error => { if (live(r)) report(error, "Answer board"); });
    await owned(r, D().animate(r.goal, [
      { transform: "scale(1)" }, { transform: "scale(1.055,.95)", offset: .3 }, { transform: "scale(1)" }
    ], 380));
    ball.style.opacity = "0";
  }
  async function answer(r, ball) {
    if (!live(r) || !r.answering || r.busy || r.preview || D().state.paused) return false;
    const value = Number(ball.dataset.number), q = r.question;
    r.answering = false; r.busy = true; controls(r);
    let result;
    try {
      await quiet(r);
      result = engine.attempt(value);
      if (result.accepted && result.correct) master.setState("GOAL_FEEDBACK");
      updateDebug();
      if (!result.accepted) return false;
      const kind = result.correct ? "goal" : ["miss", "post", "ground", "coach"][r.misses++ % 4];
      if (result.correct) r.streak++; else r.streak = 0;
      await flight(r, ball, result.correct, kind);
      await owned(r, Promise.all([r.boardFeedback, r.contactFeedback || D().feedback({ correct: result.correct, streak: r.streak,
        phaseEnd: result.correct && phaseEnd(q), phaseNumber: phaseNumber(q), kind })]));
      r.contactFeedback = null;
      return result.correct;
    } catch (error) { if (error !== CANCELLED) report(error, "Kick / feedback"); return false; }
    finally {
      r.boardFeedback = null;
      r.contactFeedback = null;
      // A stopped generation must leave accepted feedback persisted, not advance.
      // createEngine recovers that success exactly once when this game is resumed.
      if (live(r)) {
        if (result?.accepted && result.correct) {
          try { engine.finishFeedback(); } catch (error) { report(error, "Commit feedback"); }
          r.resolveChoice?.(); r.resolveChoice = null;
        } else {
          resetBall(ball); D().pose("proud");
          r.answering = true; r.busy = false; resetIdle(r); controls(r);
        }
        updateDebug();
      }
    }
  }
  async function retireQuestion(r) {
    // Keep the completed pitch visible while the remaining choices clear out.
    const balls = [...r.zone.children].filter(ball => ball.style.opacity !== "0");
    const scale = Math.min(innerWidth / 1365, innerHeight / 768);
    const gutter = Math.max(0, (innerWidth / scale - 1365) / 2);
    await owned(r, Promise.all([
      ...balls.map(async (ball, index) => {
        await owned(r, D().wait(index * 70));
        const x = 410 + Number.parseFloat(ball.style.left) + 54;
        const direction = x < 825 ? -1 : 1;
        const dx = direction < 0 ? -gutter - x - 160 : 1525 + gutter - x;
        await owned(r, Promise.all([
          D().animate(ball, [
            { transform: "translate(0,0) rotate(0)", opacity: 1 },
            { transform: `translate(${dx * .35}px,-95px) rotate(${direction * 150}deg)`, opacity: 1, offset: .45 },
            { transform: `translate(${dx}px,150px) rotate(${direction * 620}deg)`, opacity: 0 }
          ], 650, { easing: "cubic-bezier(.45,0,.8,.5)" }),
          D().animate(ball.querySelector(".choice-ball-shadow"), [{ opacity: .8 }, { opacity: 0 }], 250)
        ]));
      }),
      D().animate(document.getElementById("quantity-display"), [
        { opacity: 1, transform: "translateY(0) scale(1)" },
        { opacity: 0, transform: "translateY(-150px) scale(.9)" }
      ], 520)
    ]));
    r.root.classList.remove("main-question-visible", "main-options-visible");
    r.zone.replaceChildren(); r.question = null;
  }
  function route(r) {
    // Complete the second half of a two-store checkpoint commit after a crash.
    const pending = master.state.pendingBreak;
    if (pending) {
      const saved = engines[pending.modeId].state;
      if (saved.lastCompletedInteractionCheckpoint === pending.checkpointId ||
          (pending.checkpointId === "fixed_phase_17" && saved.mode === "infinite")) master.completeBreak(pending.id);
    }
    const next = master.reconcile({ counting: engines.kick_and_count.state, next: engines.what_comes_next.state, before: engines.what_came_before.state,
      // Main is reached after counting practice, or through explicit developer entry.
      countingTutorialCompleted: true, nextTutorialCompleted: window.SparkyNextTutorial.hasCompletedTutorial(),
      beforeTutorialCompleted: window.SparkyBeforeTutorial.hasCompletedTutorial() });
    r.modeId = next.modeId;
    engine = engines[r.modeId];
    r.adapter = r.modeId === "kick_and_count" ? modes.counting : modes[r.modeId];
    if (r.label) r.label.querySelector("b").textContent = r.adapter.name;
    if (r.hint) r.hint.textContent = r.adapter.instruction;
    r.zone.setAttribute("aria-label", r.adapter.choiceLabel);
    return next;
  }
  async function checkpoint(r, champion = false) {
    const state = engine.state;
    const interaction = champion ? { checkpointId: "fixed_phase_17", phaseId: 17 } : state.pendingInteraction;
    const plan = master.planBreak({ modeId: r.modeId, checkpointId: interaction.checkpointId, phaseId: interaction.phaseId });
    await retireQuestion(r);
    // Never acknowledge cancelled/failed presentation. The durable plan resumes
    // at the same checkpoint instead of silently skipping its interaction.
    if (champion) await owned(r, D().champion());
    else {
      dispatch("sparky:interaction-start", { ...plan, globalBreakIndex: events.filter(e => e.type === "SPARKY_INTERACTION_COMPLETE").length + 1 });
      await owned(r, D().breakInteraction(undefined, { phaseNumber: interaction.phaseId }));
    }
    assert(r);
    if (champion) engine.completeCelebration(); else engine.completeInteraction(interaction.checkpointId);
    if (plan) master.completeBreak(plan.id);
    dispatch("sparky:interaction-complete", { modeId: r.modeId, checkpointId: interaction.checkpointId, nextAction: plan?.nextAction });
  }
  async function loop(r) {
    while (live(r)) {
      r.answering = false; r.busy = true; controls(r);
      const next = route(r);
      const state = engine.state;
      if (next.tutorialNeeded && r.modeId !== "kick_and_count") {
        await nextTutorial(r, false, r.modeId === "what_came_before" ? "before" : "next");
        continue;
      }
      if (state.status === "interaction") {
        await checkpoint(r);
      } else if (state.status === "celebration") {
        await checkpoint(r, true);
      } else if (state.status === "feedback") {
        // Defensive same-session recovery; no interaction can overlap this owner.
        try { await owned(r, D().feedback({ correct: true, phaseEnd: phaseEnd(engine.currentQuestion()), phaseNumber: phaseNumber(engine.currentQuestion()) })); }
        finally { if (live(r)) engine.finishFeedback(); }
      } else {
        const q = engine.currentQuestion(); r.question = q;
        await owned(r, r.adapter.render(q, r));
        r.root.classList.add("main-question-visible");
        const selected = new Promise(resolve => { r.resolveChoice = resolve; });
        r.busy = false; r.answering = true; resetIdle(r); controls(r);
        r.zone.children[0]?.focus({ preventScroll: true });
        dispatch("sparky:question-ready", { question: q, progression: engine.state });
        await owned(r, selected);
      }
    }
  }

  async function nextTutorial(r, preview = false, variant = "next") {
    const tutorial = variant === "before" ? window.SparkyBeforeTutorial : window.SparkyNextTutorial;
    r.answering = false; r.busy = true; controls(r);
    await quiet(r);
    await owned(r, tutorial.preload());
    assert(r); r.tutorialActive = tutorial;
    D().dispose();
    r.root.classList.remove("main-game-running", "main-game-busy", "main-game-answering", "main-presentation", "main-question-visible", "main-options-visible");
    r.label.hidden = true; r.panel && (r.panel.hidden = true);
    document.getElementById("game-info").hidden = true;
    document.getElementById("game-tutorial").hidden = true;
    try {
      await owned(r, tutorial.startTutorial({ preview }));
    } finally {
      if (live(r)) {
        r.tutorialActive = null;
        await owned(r, scene().startMainGame());
        await owned(r, D().mount());
        r.root.classList.add("main-game-running"); r.label.hidden = false;
        r.zone.setAttribute("aria-label", r.adapter.choiceLabel);
        await owned(r, D().unlock());
        r.panel && (r.panel.hidden = false);
        D().stage.append(r.hint); r.hint.hidden = true;
        D().startMusic("game");
        document.getElementById("game-info").hidden = false;
        document.getElementById("game-tutorial").hidden = false;
        void idleLoop(r).catch(error => { if (live(r)) report(error, "Idle scheduler"); });
      }
    }
  }

  async function preload() {
    if (!scene() || !D() || !window.SparkyProgression || !window.SparkyNextProgression || !window.SparkyBeforeProgression || !window.SparkyMasterProgression) throw new Error("Load scene, mode progression, master controller and director before SparkyGame");
    await Promise.all([scene().preload(), D().preload()]);
  }
  function start({ quickIntro = true } = {}) {
    if (helpPlaying) return Promise.resolve(false);
    if (run && !run.stopped) return run.ready;
    const root = document.getElementById("game-scene");
    const zone = document.getElementById("ball-choice-zone");
    const goal = root?.querySelector(".goal-zone");
    if (!root || !zone || !goal) {
      report(new Error("Counting requires the mounted scene world"), "Start");
      return Promise.resolve(false);
    }
    let cancel;
    const r = run = { id: ++generation, root, zone, goal, stopped: false,
      cancelled: new Promise(resolve => { cancel = resolve; }), cancel: () => cancel(),
      cleanups: [], busy: true, answering: false, preview: null, question: null,
      streak: 0, misses: 0, idleVoice: null, idleAt: Infinity, resolveChoice: null, panel: null };
    r.ready = (async () => {
      try {
        await owned(r, preload());
        // Construct every run: resumes interrupted accepted feedback through the
        // engine's documented recovery rather than committing it in stop().
        engines = { kick_and_count: window.SparkyProgression.createEngine({ storage }),
          what_comes_next: window.SparkyNextProgression.createEngine({ storage }),
          what_came_before: window.SparkyBeforeProgression.createEngine({ storage }) };
        master = window.SparkyMasterProgression.createController({ storage });
        for (const [modeId, item] of Object.entries(engines)) {
          r.cleanups.push(item.subscribe(event => {
            if (!live(r)) return;
            const detail = { ...event, modeId };
            events.push(detail); if (events.length > 40) events.shift();
            console.info("[SparkyGame]", event.type, detail);
            dispatch(event.type, detail); updateDebug();
          }));
        }
        route(r);
        await owned(r, D().mount());
        await owned(r, scene().setShot("wide", { instant: true }));
        root.classList.add("main-game-running");
        root.classList.remove("main-game-answering", "show-zones", "tutorial-pending", "intro-running");
        zone.setAttribute("aria-label", r.adapter.choiceLabel);
        for (const node of [goal, document.getElementById("quantity-display")]) {
          node.style.opacity = "1"; node.style.transform = "none";
        }
        r.hint = document.createElement("p"); r.hint.className = "main-game-hint";
        r.hint.textContent = r.adapter.instruction; r.hint.hidden = true;
        D().stage.append(r.hint);
        r.label = document.createElement("div"); r.label.className = "tutorial-progress main-mode-label";
        r.label.innerHTML = "<b></b>"; r.label.firstElementChild.textContent = r.adapter.name; root.append(r.label);
        listen(r, zone, "click", event => {
          const ball = event.target.closest(".choice-ball");
          if (ball?.parentNode === zone) void answer(r, ball);
        });
        listen(r, zone, "keydown", event => {
          if (event.key !== "Enter" && event.key !== " ") return;
          const ball = event.target.closest(".choice-ball");
          if (ball?.parentNode !== zone) return;
          event.preventDefault(); if (!event.repeat) void answer(r, ball);
        });
        listen(r, document, "keydown", event => debugKeys(r, event));
        for (const [target, type] of [[document, "visibilitychange"], [window, "resize"], [window, "orientationchange"]]) {
          listen(r, target, type, sync);
        }
        if (debugEnabled) buildDebug(r);
        // The director owns the sleep wake target; never auto-acknowledge it.
        if (quickIntro) await owned(r, D().intro());
        assert(r);
        D().startMusic("game");
        void idleLoop(r).catch(error => { if (live(r)) report(error, "Idle scheduler"); });
        r.loop = loop(r).catch(error => {
          if (!live(r)) return;
          report(error, "Counting loop"); stop();
        });
        dispatch("sparky:game-start", { progression: engine.state });
        return true;
      } catch (error) {
        if (live(r)) { report(error, "Start"); stop(); }
        return false;
      }
    })();
    return r.ready;
  }
  function stop() {
    const r = run;
    ++generation; // Also invalidate a help replay's continuation while unmounted.
    if (!r) return;
    r.stopped = true; r.cancel();
    r.answering = false; r.busy = false; r.resolveChoice?.(); r.resolveChoice = null;
    for (const cleanup of r.cleanups.splice(0)) cleanup();
    r.tutorialActive?.stop();
    r.panel?.remove(); r.hint?.remove(); r.label?.remove();
    r.root.classList.remove("main-game-running", "main-game-answering", "main-game-busy", "main-question-visible", "main-options-visible", "main-presentation");
    r.zone.inert = false; r.zone.removeAttribute("aria-busy");
    for (const ball of r.zone.children) { resetBall(ball); ball.tabIndex = -1; ball.setAttribute("aria-disabled", "true"); }
    r.goal.style.removeProperty("transform");
    D()?.interruptVoice(); D()?.dispose();
    run = null;
    dispatch("sparky:game-stop", { progression: engine?.state || null });
  }
  function replayHelp(kind) {
    if (helpJob) return helpJob;
    if (!["onboarding", "tutorial", "counting"].includes(kind)) return Promise.resolve(false);
    const activeTutorial = kind === "counting" ? null : run?.modeId === "what_came_before" ? window.SparkyBeforeTutorial : run?.modeId === "what_comes_next" ? window.SparkyNextTutorial : null;
    helpPlaying = true;
    stop();
    const root = document.getElementById("game-scene");
    root.classList.remove("main-game-ready", "tutorial-pending");
    document.getElementById("ball-choice-zone").replaceChildren();
    const token = generation;
    helpJob = (async () => {
      try {
        scene()?.setPaused(false);
        if (kind === "onboarding") await window.SparkyIntro.play({ replay: true });
        else if (activeTutorial) {
          await activeTutorial.startTutorial({ preview: true });
          await scene().startMainGame();
        } else await window.SparkyTutorial.play();
        if (generation !== token) return false;
        helpPlaying = false;
        return await start({ quickIntro: false });
      } catch (error) { report(error, "Replay help"); return false; }
      finally { helpPlaying = false; helpJob = null; }
    })();
    return helpJob;
  }

  async function preview(category, type) {
    const r = run;
    if (!debugEnabled || !r || !r.answering || r.busy || r.preview || D().state.paused) return false;
    const allowed = { intro: ["welcome", "phone", "messing", "sleep", "funFact"], break: ["wizzle", "messi", "letsGo"], champion: ["champion"], tutorial: ["next", "before"] };
    if (!allowed[category]?.includes(type)) return false;
    r.preview = `${category}:${type}`; r.busy = true; r.answering = false; controls(r);
    r.root.classList.add("main-presentation");
    try {
      await quiet(r);
      if (category === "intro") await owned(r, D().intro(type));
      else if (category === "break") await owned(r, D().breakInteraction(type, { phaseNumber: phaseNumber(r.question), preview: true }));
      else if (category === "tutorial") { await nextTutorial(r, true, type); await owned(r, r.adapter.render(r.question, r)); }
      else await owned(r, D().champion());
      return true;
    } catch (error) { if (error !== CANCELLED) report(error, "Debug preview"); return false; }
    finally {
      if (live(r)) {
        // No engine mutation, answer submission, option reroll or re-spawn.
        r.root.classList.remove("main-presentation");
        try {
          r.adapter.restore(r.question, r);
          if (category === "intro") await revealBoard(r);
        }
        catch (error) { report(error, "Restore debug question"); }
        D().pose("proud"); r.preview = null; r.busy = false; r.answering = true;
        resetIdle(r); controls(r);
      }
    }
  }
  function solve(correct = true) {
    if (!debugEnabled || !run || !snapshot().answering) return Promise.resolve(false);
    const q = run.question;
    const value = correct ? q.correctAnswer : q.options.find(option => option !== q.correctAnswer);
    const ball = [...run.zone.children].find(item => Number(item.dataset.number) === value);
    return ball ? answer(run, ball) : Promise.resolve(false);
  }
  function debugKeys(r, event) {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.target.closest?.("input,textarea,select,[contenteditable=true]")) return;
    if (event.key.length !== 1 || !/^[a-z]$/i.test(event.key)) { r.typed = ""; return; }
    r.typed = ((r.typed || "") + event.key.toLowerCase()).slice(-5);
    if (r.typed !== "debug") return;
    r.typed = ""; debugEnabled = !debugEnabled;
    if (debugEnabled) buildDebug(r);
    else { r.panel?.remove(); r.panel = null; }
  }
  function buildDebug(r) {
    if (r.panel) return;
    const panel = r.panel = document.createElement("section");
    panel.className = "main-game-debug"; panel.setAttribute("aria-label", "Developer series tools");
    const title = document.createElement("strong"); title.textContent = "Developer tools (type debug to hide)"; panel.append(title);
    const actions = document.createElement("div"); actions.className = "main-debug-actions"; panel.append(actions);
    const button = (label, action) => {
      const el = document.createElement("button"); el.type = "button"; el.textContent = label;
      el.onclick = () => { void Promise.resolve().then(action).catch(error => report(error, "Debug action")); };
      actions.append(el);
    };
    for (const type of ["welcome", "phone", "messing", "sleep", "funFact"]) button(`Intro: ${type}`, () => preview("intro", type));
    for (const type of ["wizzle", "messi", "letsGo"]) button(`Break: ${type}`, () => preview("break", type));
    button("Champion preview", () => preview("champion", "champion"));
    button("Onboarding intro", () => replayHelp("onboarding"));
    button("Tutorial: Count & Kick", () => replayHelp("counting"));
    button("Tutorial: What Comes Next?", () => preview("tutorial", "next"));
    button("Tutorial: What Came Before?", () => preview("tutorial", "before"));
    button("Give correct", () => solve(true)); button("Give wrong", () => solve(false));
    const details = (label, value) => {
      const element = document.createElement("details"), summary = document.createElement("summary"), pre = document.createElement("pre");
      summary.textContent = label; pre.textContent = JSON.stringify(value, null, 2);
      element.append(summary, pre); panel.append(element); return pre;
    };
    r.debugState = details("Current progress / controller / engine data", snapshot());
    details("All 17 fixed phases", window.SparkyProgression.phases);
    details("All 84 fixed questions", window.SparkyProgression.fixedQuestions);
    details("All 20 successor phases", window.SparkyNextProgression.phases);
    details("All 100 successor questions", window.SparkyNextProgression.fixedQuestions);
    details("All 20 predecessor phases", window.SparkyBeforeProgression.phases);
    details("All 100 predecessor questions", window.SparkyBeforeProgression.fixedQuestions);
    r.root.append(panel); updateDebug();
  }
  function updateDebug() {
    if (!run?.panel || !debugEnabled) return;
    run.debugState.textContent = JSON.stringify(snapshot(), null, 2);
    const disabled = !run.answering || run.busy || Boolean(run.preview) || D().state.paused;
    for (const button of run.panel.querySelectorAll("button")) button.disabled = disabled;
  }
  const debug = Object.freeze({
    runIntro: type => preview("intro", type),
    runBreak: type => preview("break", type),
    champion: () => preview("champion", "champion"), solve,
    get state() { return debugEnabled ? snapshot() : null; },
    get phases() { return debugEnabled ? window.SparkyProgression.phases : null; },
    get fixedQuestions() { return debugEnabled ? window.SparkyProgression.fixedQuestions : null; }
  });
  window.SparkyGame = Object.freeze({ preload, start, stop, sync, replayHelp, debug, get state() { return snapshot(); } });
})();