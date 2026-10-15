(() => {
  "use strict";
  const root = document.getElementById("game-scene");
  const camera = document.getElementById("scene-camera");
  const board = document.getElementById("quantity-display");
  const zone = document.getElementById("ball-choice-zone");
  const base = "assets/animations/sparky-sprites/";
  const poses = {
    spin: base + "action-emotes/spinning-ball-on-finger.png",
    up: base + "action-emotes/sparky-pointing-up.png",
    down: base + "action-emotes/Sparky-Pointing-down-2-sprites.png",
    confused: base + "emotes/sparky-confused.png",
    thinking: base + "emotes/sparky_thinking.png",
    summon: base + "emotes/sparky_proud_cocky_hand_gesture2.png",
    proud: base + "emotes/sparky_proud_cocky_hand_gesture.png",
    thumbs: base + "emotes/sparky-thumbs-up.png",
    self: base + "emotes/sparky-pointing-himself.png",
    kick: base + "action-emotes/sparky-kicking.png",
    victory: base + "emotes/sparky-victory-proud-pose.png",
    cheer: base + "action-emotes/sparky-cheer.png",
    one: base + "counting/one.png",
    two: base + "counting/two.png",
    three: base + "counting/three.png",
    messi: "assets/messi/messi-looking-left-confused.png",
    messiAngry: "assets/messi/messi-angry.png"
  };
  const names = {
    start: "chalo-bro-start-krte", display: "goal-post-ke-upar-vo-display",
    count: "usme-jistne-balls-hain-count", down: "ab-niche-dekho", confused: "ek-sec",
    summon: "balls-prakat-ki-jaen", normal: "normal-haan",
    displayQuestion: "display-me-kitne-dikh-rahe-hain",
    choose: "jiss-ball-pe-sahi-number-hai-usse-goal-me-kick", good: "badhiya",
    myKick: "ye-wala-main-kick-krta", super: "suppeer-kickk", goal: "goalll-are-wah",
    allGoals: "ab-aese-hi-sare-goals-tumhe-bhi", become: "phir-tum-bhi-ban-jaoge",
    goat: "the-goat", done: "messi-its-done-bro",
    wrong: "wo-wala-nahi", wrongAgain: "wo-bhi-nahi", letsGo: "lets-go"
  };
  const clips = Object.fromEntries(Object.entries(names).map(([key, name]) => [key, `assets/audio/tutorial/${name}.mp3`]));
  Object.assign(clips, Object.fromEntries([
    ["countTogether", "chalo-mere-sath-count-karo"], ["one", "one"],
    ["two", "two"], ["three", "three"], ["nice", "nice"]
  ].map(([key, name]) => [key, `assets/audio/counting/${name}.mp3`])));
  Object.assign(clips, { music: "assets/audio/music/main-game.mp3", hit: "assets/audio/goalhit/goal-hit.mp3", cheers: "assets/audio/sfx/kids-cheering.mp3", horn: "assets/audio/sfx/dj-airhorn-sound-effect.mp3" });
  Object.assign(clips, { displayPop: "assets/audio/sfx/ui-display.mp3", bounce: "assets/audio/sfx/toing.mp3" });
  const movies = { speed: "assets/comic-effect-bg/anime-speedline-front.mp4", reveal: "assets/comic-effect-bg/comic-reveal-effect.mp4" };
  const sheets = new Set(["spin", "up", "down", "kick", "cheer"]);
  const images = new Map(), buffers = new Map(), videos = new Map(), sources = new Set();
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const landscape = matchMedia("(orientation: landscape)");
  const query = new URLSearchParams(location.search);
  const speed = query.get("scene") === "tutorial" ? Math.max(1, Math.min(8, Number(query.get("tutorialSpeed")) || 1)) : 1;
  let context, master, musicGain, prepared, run, playing;

  function engine() {
    const Constructor = window.AudioContext || window.webkitAudioContext;
    if (!context && Constructor) {
      context = new Constructor(); master = context.createGain(); master.connect(context.destination);
      musicGain = context.createGain(); musicGain.gain.value = .09; musicGain.connect(master);
    }
    return context;
  }
  function unlock() { return engine()?.resume().catch(() => {}); }
  function preload() {
    if (!prepared) prepared = (async () => {
      engine();
      await Promise.all([
        ...Object.entries(poses).map(async ([key, path]) => {
          if (images.has(key)) return;
          const image = new Image(); image.src = path; await image.decode(); images.set(key, image);
        }),
        ...Object.entries(clips).map(async ([key, path]) => {
          if (!context || buffers.has(key)) return;
          const response = await fetch(path); if (!response.ok) throw new Error(`Tutorial audio: ${path}`);
          buffers.set(key, await context.decodeAudioData(await response.arrayBuffer()));
        }),
        ...Object.entries(movies).map(async ([key, path]) => {
          if (videos.has(key)) return;
          const response = await fetch(path); if (!response.ok) throw new Error(`Tutorial video: ${path}`);
          const url = URL.createObjectURL(await response.blob());
          const probe = document.createElement("video"); probe.muted = true; probe.preload = "auto";
          try {
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error(`Tutorial video timed out: ${path}`)), 30000);
              probe.onloadeddata = () => { clearTimeout(timeout); resolve(); };
              probe.onerror = () => { clearTimeout(timeout); reject(new Error(`Tutorial video cannot decode: ${path}`)); };
              probe.src = url; probe.load();
            });
            videos.set(key, url);
          } catch (error) { URL.revokeObjectURL(url); throw error; }
          finally { probe.removeAttribute("src"); probe.load(); }
        }),
        ...["assets/splash/comic-boom.png", "assets/ui/finger-pointer.png", "assets/objects/football.png"].map(async path => {
          const image = new Image(); image.src = path; await image.decode();
        }),
        document.fonts.load('48px "Bangers"')
      ]);
    })().catch(error => { prepared = undefined; throw error; });
    return prepared;
  }
  function sound(key, { volume = .95, loop = false, music = false } = {}) {
    if (!context || !buffers.has(key)) return { done: null, stop() {} };
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = buffers.get(key); source.playbackRate.value = speed; source.loop = loop;
    gain.gain.value = volume; source.connect(gain); gain.connect(music ? musicGain : master);
    sources.add(source);
    const done = new Promise(resolve => { source.onended = () => { sources.delete(source); source.disconnect(); gain.disconnect(); resolve(); }; });
    source.start();
    return { done, stop() { try { source.stop(); } catch { /* Ended. */ } } };
  }
  function assertActive() { if (!run || run.stopped) throw new DOMException("Tutorial stopped", "AbortError"); }
  async function wait(ms) {
    assertActive(); await new Promise(resolve => run.waits.add({ until: run.time + ms, resolve })); assertActive();
  }
  async function animate(element, frames, duration = 600, extra = {}) {
    assertActive();
    const state = run;
    const animation = element.animate(frames, { duration: motion.matches ? 0 : duration / speed, fill: "both", easing: "cubic-bezier(.2,.8,.25,1)", ...extra });
    state.animations.add(animation); if (state.paused) animation.pause();
    try {
      await animation.finished;
      const last = frames[frames.length - 1];
      for (const key of ["transform", "opacity"]) if (key in last) element.style[key] = last[key];
    } finally { state.animations.delete(animation); animation.cancel(); }
    assertActive();
  }
  function beat(name) {
    run.beat = name; run.history.push(name); root.dataset.tutorialBeat = name;
    root.dispatchEvent(new CustomEvent("sparky:tutorial-beat", { bubbles: true, detail: { beat: name } }));
  }
  function pose(name) {
    run.actor.dataset.pose = name;
    for (const image of run.actor.querySelectorAll(".tutorial-pose")) image.classList.toggle("is-current", image.dataset.pose === name);
  }
  async function say(key, text, alongside) {
    beat(key); run.caption.textContent = text; run.actor.classList.add("is-speaking");
    if (musicGain) musicGain.gain.setTargetAtTime(.055, context.currentTime, .1);
    const voice = sound(key);
    try {
      await Promise.all([voice.done || wait(2600), alongside?.()]);
      // Let the completed gesture and instruction land before the next beat.
      run.actor.classList.remove("is-speaking");
      await wait(500);
    }
    finally {
      run.actor.classList.remove("is-speaking");
      if (musicGain) musicGain.gain.setTargetAtTime(.09, context.currentTime, .1);
    }
  }
  function sync() {
    if (!run || run.stopped) return;
    run.paused = document.hidden || !landscape.matches || window.SparkyScene.state.paused || run.gate;
    root.classList.toggle("tutorial-paused", run.paused);
    run.ui.inert = !landscape.matches || window.SparkyScene.state.paused;
    zone.inert = run.paused;
    for (const animation of run.animations) {
      if (run.paused) animation.pause(); else if (animation.playState === "paused") animation.play();
    }
    if (context) {
      if (run.paused) context.suspend().catch(() => {}); else context.resume().catch(() => {});
    }
    if (run.paused || motion.matches) run.video.pause(); else if (run.video.getAttribute("src")) run.video.play().catch(() => {});
    const scale = Math.min(innerWidth / 1365, innerHeight / 768);
    run.gutter = Math.max(0, (innerWidth / scale - 1365) / 2);
    run.stage.style.setProperty("--tutorial-scale", scale);
    run.stage.style.setProperty("--tutorial-gutter", `${run.gutter}px`);
  }
  function build() {
    const actor = document.createElement("div"); actor.className = "tutorial-coach"; actor.setAttribute("role", "img"); actor.setAttribute("aria-label", "Sparky, your coach");
    const art = document.createElement("div"); art.className = "tutorial-coach-art";
    for (const [key, image] of images) {
      if (key.startsWith("messi")) continue;
      image.className = `tutorial-pose${sheets.has(key) ? " is-sheet" : ""}`;
      image.dataset.pose = key; image.alt = ""; image.draggable = false; art.append(image);
    }
    actor.append(art); camera.append(actor);
    const ui = document.createElement("section"); ui.className = "tutorial-ui"; ui.setAttribute("aria-label", "Guided counting tutorial");
    ui.innerHTML = `<div class="tutorial-cinema"><video muted playsinline loop preload="auto"></video></div>
      <div class="tutorial-stage"><div class="tutorial-comic"><div></div></div><div class="tutorial-confetti"></div><div class="tutorial-messi" role="img" aria-label="Messi peeking in"></div>
      <button class="tutorial-lets-go" type="button" hidden><img src="assets/objects/football.png" alt=""><span>Let’s Go!</span></button>
      <div class="tutorial-finale-ball" hidden><img src="assets/objects/football.png" alt=""></div><div class="tutorial-impact" aria-hidden="true">POW!</div></div>
      <div class="tutorial-progress"><span>COACH’S WARM-UP</span><b>Count · Choose · Kick</b></div>
      <!-- Bottom dialogue captions disabled until their proper presentation is ready.
      <div class="tutorial-caption" role="status" aria-live="polite"></div>
      -->
      <!-- <button class="tutorial-mute" type="button" aria-pressed="false">Sound on ♪</button> -->
      <div class="tutorial-sound-gate" hidden><h2>Your first goal awaits!</h2><button type="button">Start warm-up ▶</button></div>`;
    const cinemaLayer = ui.querySelector(".tutorial-cinema");
    root.prepend(cinemaLayer); root.append(ui);
    // Keep caption strings available offscreen without mounting a bottom text panel.
    const state = { actor, ui, cinema: cinemaLayer, stage: ui.querySelector(".tutorial-stage"), caption: document.createElement("div"), video: cinemaLayer.querySelector("video"),
      time: 0, last: 0, waits: new Set(), animations: new Set(), paused: false, stopped: false, gate: false, beat: "preparing", history: [], selected: null, raf: 0 };
    state.video.muted = true;
    /* Sound toggle disabled for the demo.
    let muted = false;
    ui.querySelector(".tutorial-mute").onclick = event => {
      muted = !muted; if (master) master.gain.value = muted ? 0 : 1;
      event.currentTarget.textContent = muted ? "Sound off" : "Sound on ♪"; event.currentTarget.setAttribute("aria-pressed", String(muted));
    };
    */
    const messi = ui.querySelector(".tutorial-messi");
    for (const key of ["messi", "messiAngry"]) {
      const image = images.get(key); image.className = "tutorial-messi-pose";
      image.classList.toggle("is-current", key === "messi"); image.alt = ""; messi.append(image);
    }
    function frame(now) {
      if (!state.last) state.last = now;
      if (!state.paused) state.time += Math.min(100, now - state.last) * speed;
      state.last = now;
      for (const task of state.waits) if (state.time >= task.until) { state.waits.delete(task); task.resolve(); }
      if (!state.stopped) state.raf = requestAnimationFrame(frame);
    }
    state.raf = requestAnimationFrame(frame); return state;
  }
  async function cinema(name) {
    run.video.src = videos.get(name); run.video.load();
    if (!motion.matches && !run.paused) run.video.play().catch(() => {});
    root.classList.add("tutorial-cinematic");
    await animate(run.cinema, [{ opacity: 0 }, { opacity: 1 }], 400);
  }
  async function comic(html) {
    const card = run.ui.querySelector(".tutorial-comic"); card.firstElementChild.innerHTML = html;
    await animate(card, [{ opacity: 0, transform: "scale(.2) rotate(-18deg)" }, { opacity: 1, transform: "scale(1.08) rotate(3deg)", offset: .8 }, { opacity: 1, transform: "scale(1) rotate(-3deg)" }], 500);
  }
  async function hideComic() {
    const card = run.ui.querySelector(".tutorial-comic");
    await animate(card, [{ opacity: 1 }, { opacity: 0 }], 200);
  }
  function confetti() {
    const layer = run.ui.querySelector(".tutorial-confetti");
    for (let i = 0; i < 40; i++) {
      const bit = document.createElement("i"); bit.style.cssText = `--x:${(i * 71) % 1365}px;--delay:${i % 8 * -.17}s;--color:${["#ffdf59", "#70f3fa", "#ff789f", "#fff"][i % 4]};--turn:${i * 43}deg`;
      layer.append(bit);
    }
  }
  async function choose() {
    beat("await-choice"); root.classList.add("tutorial-choosing");
    run.caption.textContent = "Count 2 footballs above. Tap the ball with 2!";
    const balls = [...zone.querySelectorAll(".choice-ball")];
    let reacting = false;
    run.wrongAttempts = 0;
    await new Promise(resolve => {
      for (const [index, ball] of balls.entries()) {
        const value = index + 1;
        ball.setAttribute("role", "button"); ball.tabIndex = 0; ball.setAttribute("aria-label", `Kick ball ${value}`); ball.setAttribute("aria-disabled", "false");
        const select = async () => {
          if (run.paused || run.selected || reacting) return;
          if (value !== 2) {
            reacting = true;
            const key = run.wrongAttempts++ % 2 === 0 ? "wrong" : "wrongAgain";
            const previousPose = run.actor.dataset.pose;
            pose("thinking");
            try {
              await say(key, key === "wrong" ? "Wo wala nahi! Count the two footballs above." : "Wo bhi nahi! Try the ball with 2.", () => Promise.all([
                animate(ball, [{ transform: "translateX(0)" }, { transform: "translateX(-8px)", offset: .25 }, { transform: "translateX(8px)", offset: .6 }, { transform: "translateX(0)" }], 300),
                (async () => { await wait(1000); pose(previousPose); })()
              ]));
              beat("await-choice");
            } finally { reacting = false; }
            return;
          }
          run.selected = ball; root.classList.remove("tutorial-choosing"); ball.classList.add("is-selected");
          for (const item of balls) { item.tabIndex = -1; item.setAttribute("aria-disabled", "true"); item.onclick = null; item.onkeydown = null; }
          resolve();
        };
        ball.onclick = select;
        ball.onkeydown = event => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); select(); } };
      }
      balls[1].focus({ preventScroll: true });
    });
  }
  async function finale() {
    const messi = run.ui.querySelector(".tutorial-messi");
    const cta = run.ui.querySelector(".tutorial-lets-go");
    const ball = run.ui.querySelector(".tutorial-finale-ball");
    const impact = run.ui.querySelector(".tutorial-impact");
    pose("summon");
    await say("done", "Messi, it’s done, bro!", () => Promise.all([
      comic("IT’S<br><em>DONE BRO!</em>"),
      animate(messi, [
        { opacity: 0, transform: "translateX(540px) rotate(18deg)" },
        { opacity: 1, transform: "translateX(0) rotate(-12deg)" }
      ], 850)
    ]));
    beat("await-lets-go"); run.caption.textContent = "Ready? Tap the football — let’s go!";
    cta.hidden = false;
    await animate(cta, [{ opacity: 0, transform: "scale(.2) rotate(-20deg)" }, { opacity: 1, transform: "scale(1.08) rotate(4deg)", offset: .8 }, { opacity: 1, transform: "scale(1) rotate(0deg)" }], 550);
    await new Promise(resolve => {
      cta.onclick = () => {
        if (run.paused || cta.disabled) return;
        cta.disabled = true; cta.onclick = null; resolve();
      };
      cta.focus({ preventScroll: true });
    });
    beat("messi-bonk"); cta.hidden = true; ball.hidden = false;
    const contactX = 395 + run.gutter;
    await animate(ball, [
      { transform: "translate(0,0) rotate(0) scale(1)" },
      { transform: `translate(${contactX - 175}px,-300px) rotate(260deg) scale(.78)`, offset: .65 },
      { transform: `translate(${contactX}px,-280px) rotate(440deg) scale(.7)` }
    ], 650, { easing: "ease-in" });
    for (const image of messi.children) image.classList.toggle("is-current", image === images.get("messiAngry"));
    messi.setAttribute("aria-label", "Messi reacting to the football"); sound("hit", { volume: .32 });
    await Promise.all([
      animate(impact, [{ opacity: 0, transform: "scale(.2) rotate(-15deg)" }, { opacity: 1, transform: "scale(1.15) rotate(8deg)", offset: .25 }, { opacity: 0, transform: "scale(1.4) rotate(12deg)" }], 500),
      (async () => {
        await animate(messi, [{ transform: "translateX(0) rotate(-12deg)" }, { transform: "translateX(35px) rotate(5deg)", offset: .4 }, { transform: "translateX(0) rotate(-8deg)" }], 240);
        await wait(400);
        await animate(messi, [{ opacity: 1, transform: "translateX(0) rotate(-8deg)" }, { opacity: 0, transform: "translateX(650px) rotate(22deg)" }], 600);
        await hideComic();
      })(),
      animate(ball, [
        { transform: `translate(${contactX}px,-280px) rotate(440deg) scale(.7)` },
        { transform: "translate(155px,-410px) rotate(650deg) scale(.8)", offset: .3, easing: "ease-in" },
        { transform: "translate(-90px,45px) rotate(900deg) scale(1.05,.85)", offset: .65, easing: "ease-out" },
        { transform: "translate(-280px,-120px) rotate(1080deg) scale(.95,1.05)", offset: .85, easing: "ease-in" },
        { transform: "translate(-380px,25px) rotate(1190deg) scale(1)" }
      ], 1400, { easing: "ease-out" })
    ]);
    pose("kick"); run.actor.classList.add("is-kicking");
    await say("letsGo", "Let’s go!", async () => {
      await wait(300); run.actor.classList.add("kick-contact"); sound("hit", { volume: .4 });
      await animate(ball, [
        { transform: "translate(-380px,25px) rotate(1190deg) scale(1)" },
        { transform: "translate(-70px,-110px) rotate(1450deg) scale(1.7)", offset: .5 },
        { transform: "translate(-120px,-180px) rotate(1680deg) scale(24)" }
      ], 800, { easing: "ease-in" });
    });
    beat("game-transition");
    const wipe = document.createElement("div"); wipe.className = "tutorial-game-wipe";
    wipe.innerHTML = "<span>LET’S PLAY!</span>"; root.append(wipe); run.wipe = wipe;
    await animate(wipe, [{ opacity: 0 }, { opacity: 1 }], 250);
    await window.SparkyScene.startMainGame();
    run.actor.style.opacity = "0"; run.ui.hidden = true; run.cinema.style.opacity = "0";
    root.classList.remove("tutorial-cinematic", "tutorial-finale", "tutorial-board-visible", "tutorial-balls-visible");
    root.classList.add("tutorial-handoff");
    if (musicGain) musicGain.gain.setTargetAtTime(0, context.currentTime, .15);
    await wait(500);
    await animate(wipe, [{ transform: "translateX(0) skewX(0deg)" }, { transform: "translateX(-120%) skewX(-12deg)" }], 800);
    beat("complete");
    try { if (query.get("scene") !== "tutorial") localStorage.setItem("sparky.tutorial.completed.v1", "true"); } catch { /* Optional persistence. */ }
    cleanup();
    document.getElementById("scene-pause").focus({ preventScroll: true });
    root.dispatchEvent(new CustomEvent("sparky:tutorial-complete", { bubbles: true, detail: { answer: 2, choices: [1, 2, 3] } }));
  }
  async function story() {
    const api = window.SparkyScene;
    pose("spin"); await animate(run.actor, [{ opacity: 0, transform: "translateX(-140px)" }, { opacity: 1, transform: "translateX(0)" }], 650);
    await say("start", "Chalo bro, start karte hain!");
    pose("up");
    await say("display", "Look at the display above the goal!", async () => {
      await wait(450); root.classList.add("tutorial-board-visible");
      sound("displayPop", { volume: .5 });
      await animate(board, [{ opacity: 0, transform: "translateY(-170px) scale(.85)" }, { opacity: 1, transform: "translateY(12px) scale(1.02)", offset: .8 }, { opacity: 1, transform: "translateY(0) scale(1)" }], 750);
    });
    await say("count", "Count the footballs: one… two!", async () => {
      const icons = [...board.querySelectorAll(".panel-ball")];
      for (const icon of icons) { await animate(icon, [{ opacity: 0, transform: "scale(.2)" }, { opacity: 1, transform: "scale(1)" }], 350); await wait(200); }
    });
    pose("down"); await say("down", "Now look down!");
    pose("confused"); await say("confused", "Ek second… where are the balls?");
    pose("summon");
    await say("summon", "Balls, prakat ki jaayen!", async () => {
      await wait(500); root.classList.add("tutorial-balls-visible");
      const arrival = api.spawnBalls(3, { onBounce: ({ bounce }) => {
        if (run && !run.stopped) sound("bounce", { volume: [.34, .25, .17, .1][bounce] });
      } });
      const numberColors = ["#1554ed", "#ef2446", "#079c36", "#9235e8", "#e85b08", "#007fac"];
      for (const [index, ball] of [...zone.children].entries()) {
        ball.dataset.number = index + 1;
        ball.setAttribute("aria-label", `Football number ${index + 1}`);
        const number = document.createElement("span"); number.className = "tutorial-ball-number"; number.textContent = index + 1;
        number.style.setProperty("--number-color", numberColors.splice(Math.floor(Math.random() * numberColors.length), 1)[0]);
        ball.querySelector(".choice-ball-body").append(number);
      }
      await arrival;
      document.getElementById("scene-status").textContent = "Three numbered footballs are ready for practice.";
    });
    pose("proud"); await say("normal", "Haan! That’s more like it.");
    pose("down"); await say("countTogether", "Chalo, mere saath count karo! Let’s count the numbered balls below.");
    for (const [index, number] of ["one", "two", "three"].entries()) {
      pose(number);
      const ball = zone.children[index]; ball.classList.add("is-counting");
      try {
        await say(number, `${index + 1}!`, () => animate(ball, [
          { transform: "translateY(0) scale(1)" },
          { transform: "translateY(-25px) scale(1.12)", offset: .45 },
          { transform: "translateY(0) scale(1)" }
        ], 650));
      } finally { ball.classList.remove("is-counting"); }
    }
    pose("thumbs"); await say("nice", "Nice!");
    pose("up"); await say("displayQuestion", "Display mein kitne dikh rahe hain? Let’s count above!");
    for (const [index, number] of ["one", "two"].entries()) {
      pose(number);
      const icon = board.querySelectorAll(".panel-ball")[index];
      icon.classList.add("is-counting");
      try {
        await say(number, `${index + 1}!`, () => animate(icon, [
          { transform: "scale(1)" },
          { transform: "scale(1.25)", offset: .45 },
          { transform: "scale(1)" }
        ], 650));
      } finally { icon.classList.remove("is-counting"); }
    }
    pose("thumbs"); await say("nice", "Nice! Two footballs on the display.");
    pose("down"); await say("choose", "Choose the number that matches the footballs above.");
    await choose(); pose("thumbs"); await say("good", "Badhiya! 2 is right!");
    pose("self"); await say("myKick", "Ye wala main kick karta hoon!", async () => {
      await Promise.all([...zone.querySelectorAll(".choice-ball")].filter(ball => ball !== run.selected).map((ball, index) =>
        animate(ball, [
          { opacity: 1, transform: "translate(0,0) scale(1)" },
          { opacity: 1, transform: "translate(0,-25px) scale(1.06)", offset: .2 },
          { opacity: 0, transform: `translate(${index === 0 ? -650 : 800}px,100px) rotate(${index === 0 ? -180 : 180}deg) scale(.5)` }
        ], 650).then(() => ball.remove())
      ));
    });
    await animate(run.actor, [{ transform: "translateX(0)" }, { transform: "translateX(300px)" }], 700);
    await cinema("speed"); pose("kick"); run.actor.classList.add("is-kicking");
    await say("super", "Suuuper kick!", async () => {
      await wait((buffers.get("super")?.duration || 1.5) * 450);
      run.actor.classList.add("kick-contact"); sound("hit", { volume: .45 });
      const body = run.selected.querySelector(".choice-ball-body");
      await animate(body, [{ transform: "translate(0,0) rotate(0) scale(1)" }, { transform: "translate(0,-260px) rotate(-430deg) scale(.7)", offset: .65 }, { transform: "translate(0,-295px) rotate(-680deg) scale(.27)", opacity: .2 }], 850, { easing: "ease-in" });
      run.selected.style.opacity = "0";
      await animate(document.querySelector(".goal-zone"), [{ transform: "scale(1)" }, { transform: "scale(1.05,.97)", offset: .3 }, { transform: "scale(1)" }], 400);
    });
    run.actor.classList.remove("is-kicking", "kick-contact"); pose("cheer"); sound("cheers", { volume: .35 }); confetti();
    await Promise.all([say("goal", "GOOOAL! Are wah!"), comic("GOOOAL!<small>2 IS THE WINNER!</small>")]); await hideComic();
    // Both field props leave together before the cinematic finale; a stronger
    // finale rule also overrides the earlier display-visible tutorial state.
    await Promise.all([board, document.querySelector(".goal-zone")].map(element =>
      animate(element, [
        { opacity: 1, transform: "translateY(0) scale(1)" },
        { opacity: 0, transform: "translateY(-650px) scale(.8)" }
      ], 650)
    ));
    root.classList.add("tutorial-finale"); await cinema("reveal");
    await animate(run.actor, [{ transform: "translateX(300px)" }, { transform: "translate(70px,-25px) scale(1.18) rotate(-4deg)" }], 750);
    pose("proud"); await Promise.all([say("allGoals", "Now you’ll kick all the goals just like that!"), comic("COUNT.<br>CHOOSE.<br><em>KICK!</em>")]); await hideComic();
    pose("victory");
    await Promise.all([say("become", "Phir tum bhi ban jaoge…"), animate(run.actor, [{ transform: "translate(70px,-25px) scale(1.18) rotate(-4deg)" }, { transform: "translate(90px,-35px) scale(1.28) rotate(3deg)" }], 900)]);
    sound("horn", { volume: .24 });
    await Promise.all([say("goat", "THE GOAT!"), comic("THE<br><em>GOAT!</em>")]); await hideComic();
    await finale();
  }
  function cleanup() {
    if (!run) return; run.stopped = true; cancelAnimationFrame(run.raf);
    for (const task of run.waits) task.resolve();
    for (const animation of run.animations) animation.cancel();
    for (const source of [...sources]) { try { source.stop(); } catch { /* Ended. */ } }
    run.video.pause(); run.actor.remove(); run.ui.remove(); run.cinema.remove(); run.wipe?.remove(); zone.replaceChildren(); zone.inert = false;
    root.classList.remove("tutorial-running", "tutorial-board-visible", "tutorial-balls-visible", "tutorial-cinematic", "tutorial-finale", "tutorial-choosing", "tutorial-handoff", "tutorial-paused");
    playing = null;
  }
  function play() {
    if (playing) return playing;
    playing = (async () => {
      await preload();
      root.classList.remove("tutorial-pending"); root.classList.add("tutorial-running");
      root.classList.remove("main-game-ready");
      // Restore field props if the tutorial is explicitly started again.
      for (const element of [board, document.querySelector(".goal-zone")]) {
        element.style.opacity = "1"; element.style.transform = "none";
      }
      zone.setAttribute("aria-label", "Choose the football with the matching number");
      window.SparkyScene.setDisplay({ count: 2, width: 420, variant: "count" });
      await window.SparkyScene.setShot("wide", { instant: true });
      run = build(); sync();
      if (context && context.state !== "running") {
        run.gate = true; sync(); const gate = run.ui.querySelector(".tutorial-sound-gate"); gate.hidden = false;
        await new Promise(resolve => { gate.querySelector("button").onclick = async () => { await unlock(); if (context.state === "running") resolve(); }; });
        gate.hidden = true; run.gate = false; sync();
      }
      sound("music", { loop: true, music: true, volume: 1 });
      await story();
    })().catch(error => {
      console.error("Tutorial failed:", error);
      if (run) { cleanup(); }
      document.getElementById("scene-status").textContent = "Tutorial could not load. Reload to retry.";
    });
    return playing;
  }
  window.SparkyTutorial = Object.freeze({ preload, play, unlock, sync,
    get state() { return { active: Boolean(run && !run.stopped && run.beat !== "complete"), completed: run?.beat === "complete", beat: run?.beat || "idle", paused: run?.paused || false, selected: run?.selected ? 2 : null,
      count: 2, choices: [1, 2, 3], answer: 2, history: [...(run?.history || [])] }; } });
  document.addEventListener("sparky:play", () => { unlock(); });
  document.addEventListener("visibilitychange", sync); window.addEventListener("resize", sync); landscape.addEventListener("change", sync);
})();