(() => {
  "use strict";

  const KEY = "sparky.intro.completed.v1";
  const SPRITES = "assets/animations/sparky-sprites/";
  const VOICE = "assets/audio/tutorial-intro/";
  const VIDEOS = "assets/comic-effect-bg/";
  const poses = {
    surprised: `${SPRITES}top-right/sparky_surprised_looking_at_viewer.png`,
    pointViewer: `${SPRITES}top-right/sparky_pointing_to_viewer.png`,
    peek: `${SPRITES}at-screen/leftside-happy.png`,
    hi: `${SPRITES}action-emotes/sparky-hi-wave.png`,
    cheer: `${SPRITES}action-emotes/sparky-cheer.png`,
    talking: `${SPRITES}emotes/sparky-talking.png`,
    proud: `${SPRITES}emotes/sparky_proud_cocky_hand_gesture.png`,
    proud2: `${SPRITES}emotes/sparky_proud_cocky_hand_gesture2.png`,
    idea: `${SPRITES}emotes/sparky_idea.png`,
    cocky: `${SPRITES}emotes/sparky_cocky.png`,
    himself: `${SPRITES}emotes/sparky-pointing-himself.png`,
    victory: `${SPRITES}emotes/sparky-victory-proud-pose.png`,
    worried: `${SPRITES}intro/worried-looking-right.png`,
    caught: `${SPRITES}intro/shy-caught-in-the-act.png`,
    push: `${SPRITES}intro/embarrassed-Hands-raisedr-toward-right.png`,
    flustered: `${SPRITES}intro/flustered-shy-smile.png`,
    messi: "assets/messi/messi-normal-standing-smiling.png",
    wave: "assets/messi/messi-hand-wave.png",
    notices: "assets/messi/messi-notices-wrong.png",
    angry: "assets/messi/messi-angry.png",
    angryLeft: "assets/messi/messi-angry-looking-left.png"
  };
  const clips = {
    arrival1: "assets/audio/woh-aagaya/woh-aagaya.mp3",
    dekho: "assets/audio/woh-aagaya/dekho.mp3",
    arrival2: "assets/audio/woh-aagaya/woh-aagaya2.mp3",
    hello: `${VOICE}hello-champ.mp3`, host: `${VOICE}main-hoon-aapka-dost-aur-coach.mp3`,
    soccer: `${VOICE}s-for-soccer-s-for-sparky.mp3`, guest: `${VOICE}dekho-kon-hai-mere-sath.mp3`,
    goat: `${VOICE}the-goat.mp3`, wave: `${VOICE}messi-bhai-hi-bolo-sbko.mp3`,
    brag: `${VOICE}isko-goals-hit-krna-maine-hi-sikhaya.mp3`,
    little: `${VOICE}aaj-to-ye-chota-hai-par-jb-ye-sahi-me.mp3`,
    push: `${VOICE}haan-haan-baad-me-baat-krte-hain.mp3`,
    chotu: `${VOICE}ye-bhi-na-bechara-chotu.mp3`,
    cough: `${VOICE}coughs-anyway.mp3`, challenge: `${VOICE}mere-best-student-ko-beat-krne-ke-liye.mp3`,
    ready: `${VOICE}are-you-guys-ready.mp3`, letsgo: `${VOICE}sixseven-lets-go.mp3`,
    music: "assets/audio/music/intro.mp3", horn: "assets/audio/sfx/dj-airhorn-sound-effect.mp3",
    boom: "assets/audio/sfx/vine-boom.mp3", cheers: "assets/audio/sfx/kids-cheering.mp3",
    angryLoop: "assets/messi/que-miras-bobo-messi.mp3",
    spiderman: "assets/audio/sfx/spiderman-meme-song.mp3"
  };
  let context, master, musicGain, prepared, run, muted = false;
  const buffers = new Map();
  const failed = new Set();
  const sources = new Set();
  const videoURLs = new Map();
  const videoNames = ["comic-intro-bg", "Abstract_Geometric_intro", "comic-multi-shapes-bg", "anime-speedline-side2", "comic-reveal-effect", "anime-speedline-front"];
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const landscape = matchMedia("(orientation: landscape)");
  const scene = document.getElementById("game-scene");
  const query = new URLSearchParams(location.search);
  const preview = query.get("scene") === "intro";
  // Development-only accelerated playback; normal first visits always run at 1x.
  const playbackSpeed = preview ? Math.max(1, Math.min(8, Number(query.get("introSpeed")) || 1)) : 1;
  let completedInMemory = false;

  function audioContext() {
    if (!context) {
      const Constructor = window.AudioContext || window.webkitAudioContext;
      if (!Constructor) return null;
      context = new Constructor();
      master = context.createGain(); master.gain.value = muted ? 0 : 1; master.connect(context.destination);
      musicGain = context.createGain(); musicGain.gain.value = .13; musicGain.connect(master);
    }
    return context;
  }

  function unlock() {
    const ctx = audioContext();
    return ctx ? ctx.resume().catch(() => {}) : Promise.resolve();
  }

  async function preload() {
    if (!prepared) prepared = (async () => {
      failed.clear();
      await Promise.all([...Object.values(poses), "assets/splash/comic-boom.png", "assets/objects/cartoon-football.svg", `${VIDEOS}comic-bg-image.jpg`].map(async path => {
        const image = new Image(); image.src = path;
        try { await image.decode(); } catch { failed.add(path); }
      }));
      const ctx = audioContext();
      if (ctx) await Promise.all(Object.entries(clips).map(async ([key, path]) => {
        if (buffers.has(key)) return;
        try {
          const response = await fetch(path);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          buffers.set(key, await ctx.decodeAudioData(await response.arrayBuffer()));
        } catch { failed.add(path); }
      }));
      await Promise.all(videoNames.map(async name => {
        if (videoURLs.has(name)) return;
        const path = `${VIDEOS}${name}.mp4`;
        try {
          const response = await fetch(path);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          if (!blob.size) throw new Error("Empty video");
          const url = URL.createObjectURL(blob);
          const probe = document.createElement("video");
          probe.muted = true; probe.playsInline = true; probe.preload = "auto";
          try {
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error("Video decode timed out")), 30000);
              probe.onloadeddata = () => { clearTimeout(timeout); resolve(); };
              probe.onerror = () => { clearTimeout(timeout); reject(new Error("Video cannot decode")); };
              probe.src = url; probe.load();
            });
            videoURLs.set(name, url);
          } catch (error) { URL.revokeObjectURL(url); throw error; }
          finally { probe.removeAttribute("src"); probe.load(); }
        } catch { failed.add(path); }
      }));
      await document.fonts.load('48px "Bangers"');
      if (failed.size) {
        prepared = undefined;
        throw new Error(`Intro assets failed to load: ${[...failed].join(", ")}`);
      }
      return { failed: [...failed] };
    })();
    return prepared;
  }

  function sound(key, { loop = false, volume = 1, music = false, rate = 1 } = {}) {
    if (!context || !buffers.has(key)) return { done: null, stop() {}, pause() {}, resume() {}, fadeOut() { return Promise.resolve(); } };
    const source = context.createBufferSource();
    source.buffer = buffers.get(key); source.loop = loop;
    source.playbackRate.value = playbackSpeed * rate;
    const gain = context.createGain(); gain.gain.value = volume;
    source.connect(gain); gain.connect(music ? musicGain : master);
    sources.add(source);
    const done = new Promise(resolve => {
      source.onended = () => { sources.delete(source); source.disconnect(); gain.disconnect(); resolve(); };
    });
    source.start();
    return {
      done,
      // A zero playback rate holds the looping buffer's playhead in place.
      pause() {
        gain.gain.setValueAtTime(0, context.currentTime);
        source.playbackRate.setValueAtTime(0, context.currentTime);
      },
      resume() {
        source.playbackRate.setValueAtTime(playbackSpeed * rate, context.currentTime);
        gain.gain.setTargetAtTime(volume, context.currentTime, .08);
      },
      stop() { try { source.stop(); } catch { /* Already stopped. */ } },
      async fadeOut(ms = 650) {
        const now = context.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + ms / playbackSpeed / 1000);
        await wait(ms);
        try { source.stop(); } catch { /* Already stopped. */ }
      }
    };
  }

  function build() {
    const element = document.createElement("section");
    element.className = "intro-cutscene";
    element.setAttribute("aria-label", "Sparky’s first introduction");
    element.innerHTML = `<div class="intro-backdrop"><video class="intro-video" muted playsinline loop preload="auto" aria-hidden="true"></video></div>
      <div class="intro-speed-overlay"></div>
      <div class="intro-stage"><div class="intro-composition">
        <div class="intro-actor intro-sparky"><div class="intro-actor-shadow"></div><div class="intro-actor-art" role="img" aria-label="Sparky"></div></div>
        <div class="intro-actor intro-messi"><div class="intro-actor-shadow"></div><div class="intro-actor-art" role="img" aria-label="Messi"></div></div>
        <div class="intro-comic-card" aria-hidden="true"><div class="intro-comic-words"></div></div>
        <div class="intro-sticker" aria-hidden="true"></div><div class="intro-sparkles" aria-hidden="true"></div>
        <button class="intro-ready" type="button" aria-label="Ready! Start the tutorial" hidden disabled><img src="assets/objects/cartoon-football.svg" alt=""><span>READY!</span></button>
        <div class="intro-flying-ball" aria-hidden="true"><img src="assets/objects/cartoon-football.svg" alt=""></div>
      </div></div>
      <div class="intro-curtain intro-curtain-left"></div><div class="intro-curtain intro-curtain-right"></div>
      <div class="intro-controls"><button type="button" class="intro-mute" aria-pressed="false">Sound on</button><button type="button" class="intro-skip">Skip intro</button></div>
      <div class="intro-gate" hidden><h2>Meet your coach!</h2><p>Turn up the fun. Tap below to start Sparky’s introduction.</p><button type="button" class="intro-start">Let’s meet Sparky ▶</button><button type="button" class="intro-silent">Watch without sound</button></div>
      <p class="sr-only intro-caption" role="status" aria-live="polite"></p>`;
    scene.append(element);
    const find = selector => element.querySelector(selector);
    const state = {
      element, find, time: 0, last: 0, raf: 0, animations: new Set(), waits: new Set(),
      paused: false, gate: false, done: false, skipped: false, beat: "loading", readyClick: null, history: []
    };
    find(".intro-mute").addEventListener("click", () => {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 1;
      find(".intro-mute").textContent = muted ? "Sound off" : "Sound on";
      find(".intro-mute").setAttribute("aria-pressed", String(muted));
    });
    find(".intro-skip").addEventListener("click", () => { state.skipped = true; stopRun(state); });
    function frame(now) {
      if (!state.last) state.last = now;
      if (!state.paused && !state.gate) state.time += Math.min(now - state.last, 100) * playbackSpeed;
      state.last = now;
      for (const waiter of state.waits) if (state.time >= waiter.at || state.done) { state.waits.delete(waiter); waiter.resolve(); }
      if (!state.done) state.raf = requestAnimationFrame(frame);
    }
    state.raf = requestAnimationFrame(frame);
    return state;
  }

  function resize() {
    if (run) {
      const scale = Math.min(innerWidth / 1365, innerHeight / 768);
      const stage = run.find(".intro-stage");
      stage.style.setProperty("--intro-scale", scale);
      stage.style.setProperty("--intro-gutter", `${Math.max(0, (innerWidth / scale - 1365) / 2)}px`);
    }
  }

  function sync() {
    if (!run || run.done) return;
    const stopped = document.hidden || !landscape.matches || Boolean(window.SparkyScene?.state.paused) || run.gate;
    run.paused = stopped;
    run.element.classList.toggle("is-paused", stopped);
    run.element.inert = !landscape.matches || Boolean(document.querySelector("#scene-pause-overlay:not([hidden])"));
    for (const animation of run.animations) {
      if (stopped) animation.pause(); else if (animation.playState === "paused") animation.play();
    }
    if (context) {
      if (stopped && context.state === "running") context.suspend().catch(() => {});
      else if (!stopped && context.state === "suspended") context.resume().catch(() => {});
    }
    const video = run.find("video");
    if (stopped || motion.matches) video.pause(); else if (video.src) video.play().catch(() => {});
    resize();
  }

  function assertRunning() { if (!run || run.done) throw new DOMException("Intro stopped", "AbortError"); }
  async function wait(ms) {
    assertRunning();
    await new Promise(resolve => run.waits.add({ at: run.time + ms, resolve }));
    assertRunning();
  }

  async function animate(element, frames, duration = 600, extra = {}) {
    assertRunning();
    const state = run;
    const animation = element.animate(frames, { duration: motion.matches ? 0 : duration / playbackSpeed, easing: "cubic-bezier(.2,.8,.25,1)", fill: "both", ...extra });
    state.animations.add(animation);
    if (state.paused) animation.pause();
    try {
      await animation.finished;
      const final = frames[frames.length - 1];
      for (const key of ["transform", "opacity", "clipPath"]) if (key in final) element.style[key] = final[key];
    } catch (error) { if (!state.done) throw error; }
    finally { state.animations.delete(animation); animation.cancel(); }
    assertRunning();
  }

  function beat(name) {
    run.beat = name;
    run.element.dataset.beat = name;
    run.history.push({ beat: name, time: Math.round(run.time) });
    scene.dispatchEvent(new CustomEvent("sparky:intro-beat", { bubbles: true, detail: { beat: name } }));
  }
  function pose(actor, name, mode = "") {
    actor.classList.remove("is-talking", "is-listening", "is-waving", "is-pushing", "is-angry", "is-peeking", "is-sheet");
    if (mode) actor.classList.add(`is-${mode}`);
    if (["hi", "wave", "notices", "cheer"].includes(name)) actor.classList.add("is-sheet");
    actor.dataset.pose = name;
    actor.style.setProperty("--angry-front", `url("${poses.angry}")`);
    actor.style.setProperty("--angry-left", `url("${poses.angryLeft}")`);
    actor.querySelector(".intro-actor-art").style.backgroundImage = `url("${poses[name]}")`;
  }
  async function say(key, caption, { actor, mid, midAt, onEnd, fallback = 3200 } = {}) {
    beat(key);
    run.find(".intro-caption").textContent = caption;
    if (actor) actor.classList.add("is-talking");
    const duration = (buffers.get(key)?.duration * 1000) || fallback;
    const voice = sound(key, { volume: .92 });
    if (musicGain) musicGain.gain.setTargetAtTime(.085, context.currentTime, .12);
    try {
      const ending = (voice.done || wait(duration)).then(() => { assertRunning(); return onEnd?.(); });
      if (mid) await Promise.all([ending, wait(midAt ?? duration * .48).then(() => mid())]);
      else await ending;
      await wait(100);
    } finally {
      voice.stop();
      actor?.classList.remove("is-talking");
      if (musicGain && context) musicGain.gain.setTargetAtTime(.13, context.currentTime, .2);
    }
  }

  async function background(name, duration = 450) {
    const backdrop = run.find(".intro-backdrop"), video = run.find("video");
    if (!name) { await animate(backdrop, [{ opacity: Number(backdrop.style.opacity) || 0 }, { opacity: 0 }], duration); video.pause(); return; }
    video.src = videoURLs.get(name) || `${VIDEOS}${name}.mp4`; video.load();
    if (!motion.matches && !run.paused) video.play().catch(() => {});
    await animate(backdrop, [{ opacity: Number(backdrop.style.opacity) || 0 }, { opacity: 1 }], duration);
  }
  async function comic(html, kind = "", duration = 650) {
    const card = run.find(".intro-comic-card");
    card.className = `intro-comic-card ${kind}`;
    run.find(".intro-comic-words").innerHTML = html;
    await animate(card, [
      { opacity: 0, transform: "translateY(-380px) rotate(-14deg) scale(.6)" },
      { opacity: 1, transform: "translateY(12px) rotate(3deg) scale(1.04)", offset: .78 },
      { opacity: 1, transform: "translateY(0) rotate(0) scale(1)" }
    ], duration);
  }
  async function hideComic() {
    const card = run.find(".intro-comic-card");
    if (Number(card.style.opacity) > 0) await animate(card, [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.8) translateY(-35px)" }], 220);
  }
  async function sticker(text, className = "") {
    const element = run.find(".intro-sticker"); element.textContent = text; element.className = `intro-sticker ${className}`;
    await animate(element, [{ opacity: 0, transform: "scale(.3) rotate(-15deg)" }, { opacity: 1, transform: "scale(1) rotate(8deg)" }], 260);
  }
  function sparkles() {
    const layer = run.find(".intro-sparkles");
    layer.replaceChildren();
    for (let i = 0; i < 14; i++) {
      const star = document.createElement("span"); star.textContent = "✦";
      star.style.cssText = `left:${5 + i * 7 % 90}%;top:${12 + i * 17 % 70}%;--size:${20 + i % 4 * 9}px;--delay:${-i * .19}s`;
      layer.append(star);
    }
  }

  async function choreography() {
    const sparky = run.find(".intro-sparky"), messi = run.find(".intro-messi");
    const composition = run.find(".intro-composition");
    // Start on the empty field: only ground and goal, no display or choice balls.
    beat("empty-field"); await wait(450);
    pose(sparky, "surprised", "peeking");
    sparky.style.cssText = "left:420px;top:235px;width:690px;height:690px;";
    await animate(sparky, [{ opacity: 1, transform: "translateY(800px) rotate(-4deg)" }, { opacity: 1, transform: "translateY(0) rotate(0)" }], 700);
    await say("arrival1", "Woh aa gaya!", { actor: sparky });
    await animate(sparky, [{ opacity: 1, transform: "translateY(0)" }, { opacity: 1, transform: "translateY(850px)" }], 430);
    pose(sparky, "peek", "peeking"); sparky.style.cssText = "left:calc(-90px - var(--intro-gutter, 0px));top:185px;width:580px;height:580px;";
    await animate(sparky, [{ opacity: 1, transform: "translateX(-650px) rotate(-10deg)" }, { opacity: 1, transform: "translateX(0) rotate(0)" }], 550);
    await say("dekho", "Dekho!", { actor: sparky });
    await say("arrival2", "Woh aa gaya!", { actor: sparky });
    await animate(sparky, [{ opacity: 1, transform: "translateX(0)" }, { opacity: 0, transform: "translateX(-620px)" }], 300);
    pose(sparky, "hi", "waving"); sparky.style.cssText = "left:155px;top:220px;width:500px;height:500px;";
    await animate(sparky, [{ opacity: 0, transform: "translateY(55px) scale(.9)" }, { opacity: 1, transform: "translateY(0) scale(1)" }], 500);
    await say("hello", "Hello, champ!", { actor: sparky });
    pose(sparky, "proud");
    await say("host", "Main hoon aapka dost aur coach, Sparky!", { actor: sparky });
    await background("comic-intro-bg"); pose(sparky, "himself");
    await Promise.all([
      comic("<small>S FOR</small>SOCCER!", "", 320),
      say("soccer", "S for Soccer. S for Sparky!", { actor: sparky, midAt: 1000, mid: async () => {
        await hideComic();
        pose(sparky, "victory", "talking");
        await comic("<small>S FOR</small><em>SPARKY!</em>", "", 320);
      } })
    ]);
    await hideComic();
    pose(sparky, "idea");
    await say("guest", "Isse milo! Dekho kaun hai mere saath!", { actor: sparky });
    await background("Abstract_Geometric_intro");
    // Give the guest a full-body, uncropped introduction on Sparky’s right.
    sound("horn", { volume: .1 }); pose(messi, "messi", "listening");
    await Promise.all([
      animate(sparky, [{ transform: "translateX(0)", opacity: 1 }, { transform: "translateX(-65px)", opacity: 1 }], 550),
      animate(messi, [{ opacity: 1, transform: "translateX(850px) rotate(12deg) scale(.8)" }, { opacity: 1, transform: "translateX(-15px) rotate(-3deg) scale(1.03)", offset: .8 }, { opacity: 1, transform: "translateX(0) rotate(0) scale(1)" }], 850)
    ]);
    await comic("<small>THE ONE. THE ONLY.</small>THE GOAT!", "is-goat"); sparkles();
    await say("goat", "The GOAT!");
    // The splash lingers independently while the next scene and dialogue proceed.
    await Promise.all([
      (async () => {
        await wait(1000);
        await hideComic();
        run.find(".intro-sparkles").replaceChildren();
      })(),
      (async () => {
        await background("comic-multi-shapes-bg");
        pose(sparky, "proud2");
        await say("wave", "Messi bhai, hi bolo sabko!", { actor: sparky, mid: () => pose(messi, "wave", "waving") });
      })()
    ]);
    await wait(800); pose(sparky, "cocky");
    await say("brag", "Isko goals hit karna maine hi sikhaya hai!", {
      actor: sparky,
      midAt: (buffers.get("brag")?.duration || 3.2) * 500,
      mid: () => pose(sparky, "proud", "talking"),
      onEnd: () => {
        sound("boom", { volume: .38 });
        pose(messi, "notices", "waving");
        return sticker("!");
      }
    });
    pose(sparky, "talking");
    await say("little", "Aaj toh ye chhota hai, par jab ye sahi mein…", { actor: sparky });
    pose(messi, "angry", "angry"); pose(sparky, "worried");
    const grumble = sound("angryLoop", { loop: true, volume: .7 });
    run.musicTrack.pause();
    const memeMusic = sound("spiderman", { loop: true, volume: .32, rate: 1.25 });
    beat("messi-reacts"); await background("anime-speedline-side2", 240);
    await Promise.all([
      sticker("?!"),
      animate(composition, [{ transform: "translateX(0)" }, { transform: "translateX(-8px)", offset: .2 }, { transform: "translateX(6px)", offset: .45 }, { transform: "translateX(-3px)", offset: .7 }, { transform: "translateX(0)" }], 330)
    ]);
    await wait(650);
    await wait(Math.max(1000, (buffers.get("angryLoop")?.duration || 2) * 1000 - 650));
    pose(sparky, "caught");
    await wait(850); pose(sparky, "push", "pushing");
    await animate(sparky, [{ opacity: 1, transform: "translateX(-65px)" }, { opacity: 1, transform: "translateX(260px)" }], 650);
    // Reaction marks belong to the stationary reaction, not the empty exit shot.
    run.find(".intro-sticker").style.opacity = "0";
    beat("messi-exits");
    const gutter = Math.max(0, (innerWidth / Number(run.find(".intro-stage").style.getPropertyValue("--intro-scale")) - 1365) / 2);
    const pushDuration = Math.max(1100, (buffers.get("push")?.duration || 1.1) * 1000);
    const fadeMemeOnExit = (async () => {
      await wait(Math.max(0, pushDuration - 650));
      await memeMusic.fadeOut(650);
      run.musicTrack.resume();
    })();
    await Promise.all([
      fadeMemeOnExit,
      say("push", "Haan haan, baad mein baat karte hain!", { actor: sparky }),
      (async () => {
        await Promise.all([
          animate(messi, [{ opacity: 1, transform: "translateX(0) rotate(0)" }, { opacity: 1, transform: `translateX(${1050 + gutter}px) rotate(14deg)` }], pushDuration),
          animate(sparky, [{ opacity: 1, transform: "translateX(260px)" }, { opacity: 1, transform: `translateX(${1050 + gutter}px)` }], pushDuration)
        ]);
        grumble.stop(); messi.style.opacity = "0";
      })()
    ]);
    run.find(".intro-sticker").style.opacity = "0";
    await background("comic-intro-bg");
    pose(sparky, "caught"); sparky.style.cssText = "left:432px;top:210px;width:500px;height:500px;";
    await animate(sparky, [{ opacity: 0, transform: "translateX(340px) rotate(7deg)" }, { opacity: 1, transform: "translateX(0) rotate(0)" }], 600);
    await wait(400);
    await say("chotu", "Ye bhi na, bechara Chotu…", { actor: sparky });
    pose(sparky, "flustered");
    await say("cough", "Ahem… anyway!", { actor: sparky });
    await animate(sparky, [{ opacity: 1, transform: "translateX(0)" }, { opacity: 1, transform: "translateX(-260px)" }], 550);
    pose(sparky, "himself");
    await say("challenge", "Mere best student ko beat karne ke liye…", { actor: sparky, mid: () => pose(sparky, "proud", "talking") });
    pose(sparky, "victory"); await background("comic-reveal-effect");
    await comic("ARE YOU<br><em>READY?</em>"); sparkles();
    sound("horn", { volume: .16 });
    await say("ready", "Are you guys ready?", { actor: sparky });
    beat("ready-choice");
    const button = run.find(".intro-ready"); button.hidden = false;
    await animate(button, [{ opacity: 0, transform: "translateY(80px) scale(.4) rotate(-20deg)" }, { opacity: 1, transform: "translateY(0) scale(1) rotate(0)" }], 600);
    button.disabled = false; button.focus({ preventScroll: true });
    await new Promise(resolve => { run.readyClick = resolve; button.addEventListener("click", resolve, { once: true }); });
    assertRunning(); button.disabled = true; button.hidden = true; run.readyClick = null;
    sound("cheers", { volume: .3 });
    const flying = run.find(".intro-flying-ball"); beat("ready-dodge");
    const flyingAcross = (async () => {
      await animate(flying, [{ opacity: 1, transform: "translate(0,0) rotate(0) scale(1)" }, { opacity: 1, transform: "translate(-690px,-100px) rotate(-520deg) scale(.85)" }], 700, { easing: "ease-in" });
      await animate(flying, [{ opacity: 1, transform: "translate(-690px,-100px) rotate(-520deg) scale(.85)" }, { opacity: 0, transform: "translate(-1700px,-200px) rotate(-800deg) scale(.65)" }], 350, { easing: "linear" });
    })();
    await Promise.all([
      flyingAcross,
      animate(sparky, [{ opacity: 1, transform: "translateX(-260px) rotate(0)", offset: 0 }, { opacity: 1, transform: "translateX(-260px) rotate(0)", offset: .3 }, { opacity: 1, transform: "translate(-365px,90px) rotate(-24deg) scale(1.05,.8)", offset: .75 }, { opacity: 1, transform: "translate(-260px,0) rotate(0) scale(1)" }], 1050)
    ]);
    flying.style.opacity = "0";
    pose(sparky, "victory"); await background("anime-speedline-front");
    await comic("SIX SEVEN!<small><em>LET’S GO!</em></small>");
    pose(sparky, "cheer", "waving");
    await say("letsgo", "Six Seven! Let’s go!", { actor: sparky });
    beat("curtain-out");
    const left = run.find(".intro-curtain-left"), right = run.find(".intro-curtain-right");
    await Promise.all([
      animate(left, [{ transform: "translateX(-110%)" }, { transform: "translateX(0)" }], 500),
      animate(right, [{ transform: "translateX(110%)" }, { transform: "translateX(0)" }], 500)
    ]);
    // Under the closed curtain restore only the tutorial's field setup, never ball-test gameplay.
    run.find(".intro-backdrop").style.opacity = "0";
    composition.style.opacity = "0";
    scene.classList.remove("intro-running"); scene.classList.add("tutorial-pending");
    await wait(150);
    await Promise.all([
      animate(left, [{ transform: "translateX(0)" }, { transform: "translateX(-110%)" }], 650),
      animate(right, [{ transform: "translateX(0)" }, { transform: "translateX(110%)" }], 650)
    ]);
  }

  function stopRun(state) {
    state.done = true;
    cancelAnimationFrame(state.raf);
    for (const waiter of state.waits) waiter.resolve(); state.waits.clear();
    state.readyClick?.();
    state.find(".intro-gate").dispatchEvent(new Event("intro:cancel"));
    for (const animation of state.animations) animation.cancel();
    for (const source of [...sources]) { try { source.stop(); } catch { /* Already stopped. */ } }
    state.find("video").pause();
  }

  async function audioGate() {
    if (!context || context.state === "running" || muted) return;
    run.gate = true; sync();
    const gate = run.find(".intro-gate"); gate.hidden = false;
    await new Promise(resolve => {
      run.find(".intro-start").onclick = async () => { await unlock(); if (context.state === "running") resolve(); };
      run.find(".intro-silent").onclick = () => { muted = true; master.gain.value = 0; run.find(".intro-mute").textContent = "Sound off"; resolve(); };
      gate.addEventListener("intro:cancel", resolve, { once: true });
    });
    assertRunning(); gate.hidden = true; run.gate = false; sync();
  }

  async function play() {
    if (run && !run.done) return false;
    await preload();
    run = build(); scene.classList.add("intro-running"); resize(); sync();
    let completed = false;
    try {
      await audioGate();
      if (failed.size) console.warn("Intro assets unavailable; using visual/caption fallback:", [...failed]);
      run.musicTrack = sound("music", { loop: true, music: true });
      await choreography(); completed = true;
      if (!preview) {
        completedInMemory = true;
        try { localStorage.setItem(KEY, "true"); } catch { /* Session fallback if persistent storage is unavailable. */ }
      }
    } catch (error) {
      if (error.name !== "AbortError") console.error("Intro playback failed:", error);
    } finally {
      stopRun(run); run.element.remove(); scene.classList.remove("intro-running");
      scene.dispatchEvent(new CustomEvent("sparky:intro-complete", { bubbles: true, detail: { completed, skipped: run.skipped } }));
    }
    return completed;
  }

  const api = {
    preload, play, unlock, sync,
    get seen() { try { return completedInMemory || localStorage.getItem(KEY) === "true"; } catch { return completedInMemory; } },
    get state() { return { active: Boolean(run && !run.done), beat: run?.beat || "idle", paused: run?.paused || false, failedAssets: [...failed],
      speed: playbackSpeed, history: run?.history.map(item => ({ ...item })) || [],
      durations: Object.fromEntries([...buffers].map(([name, buffer]) => [name, buffer.duration])) }; }
  };
  window.SparkyIntro = Object.freeze(api);
  document.addEventListener("sparky:play", () => { unlock(); preload().catch(console.error); });
  document.addEventListener("sparky:scene-pause-change", sync);
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("resize", () => { resize(); sync(); });
  landscape.addEventListener("change", sync);
})();