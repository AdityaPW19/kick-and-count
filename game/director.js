/* Shared browser runtime. Load game/director.css separately; no controller side effects. */
(() => {
  "use strict";
  const BASE = "assets/animations/sparky-sprites/";
  const AUDIO = "assets/audio/";
  const posePaths = {
    talk: "emotes/sparky-talking.png", proud: "emotes/sparky_proud_cocky_hand_gesture.png",
    summon: "emotes/sparky_proud_cocky_hand_gesture2.png", laugh: "emotes/sparky-laughing.png",
    thumbs: "emotes/sparky-thumbs-up.png", victory: "emotes/sparky-victory-proud-pose.png",
    thinking: "emotes/sparky_thinking.png", confused: "emotes/sparky-confused.png",
    deepThought: "emotes/deep-thought.png", confused2: "emotes/sparky-confused2.png",
    annoyed: "emotes/sparky-annoyed.png", cocky: "emotes/sparky_cocky.png",
    himself: "emotes/sparky-pointing-himself.png", encourage: "action-emotes/sparky-encourage.png",
    up: "action-emotes/sparky-pointing-up.png", down: "action-emotes/Sparky-Pointing-down-single.png",
    goofy: "emotes/sparky_goofy_shaken.png", angry: "emotes/sparky_angry.png",
    sleep: "emotes/sparky_standing_sleeping.png", yawn: "emotes/sparky_yawning.png",
    shy: "intro/flustered-shy-smile.png",
    salute: "emotes/sparky-salute.png", idea: "emotes/sparky_idea.png",
    peek: "at-screen/leftside-happy.png", hi: "action-emotes/sparky-hi-wave.png",
    cheer: "action-emotes/sparky-cheer.png", jump: "action-emotes/cheer-jump.png",
    kick: "action-emotes/sparky-kicking.png", spin: "action-emotes/spinning-ball-on-finger.png",
    phone: "talking-on-phone/sparky_phone_talk_eyes_open.png",
    phoneSmirk: "talking-on-phone/sparky_phone_talk_smirk.png",
    phoneExcited: "talking-on-phone/sparky_phone_talk_excited.png",
    phoneNeutral: "talking-on-phone/sparky_phone_talk_neutral_uninterested.png",
    phoneListen: "talking-on-phone/sparky_phone_talk_mouth_close_looking_straight.png",
    surprised: "top-right/sparky_surprised_looking_at_top_right.png",
    point: "top-right/sparky_pointing_to_top_right_angry.png"
  };
  const artPaths = {
    wizzle: "assets/animations/Wizzle-flying.png", messi: "assets/messi/messi-looking-left-confused.png",
    messiAngry: "assets/messi/messi-angry.png", ball: "assets/objects/football.png",
    crack: "assets/graphics/screen-glass-shatter.png", speed: "assets/graphics/speed-lines-zoom.png",
    boom: "assets/splash/comic-boom.png", pointer: "assets/ui/finger-pointer.png"
  };
  // Exact disk inventory, not guessed filenames or a directory-listing request.
  const group = (folder, names) => names.map(name => `${AUDIO}${folder}/${name}.mp3`);
  const catalog = Object.freeze({
    start: group("start", ["chalo-bro-start-krte", "chalo-dekho-aur-kick-karo", "chalo-football-ko-rizz-kar-do", "chalo-game-shuru", "chalo-goalmaxxing-shuru-karen", "chalo-lets-farm-some-aura", "dikha-do-dost", "let-him-cook", "lets-cook-my-friend"]),
    goalScored: group("goalScored", ["aahaa-positive", "aang-laga-di", "are-wah-big-w-in-the-chat", "bohot-sahi", "boom-goal", "ek-number", "full-power", "goal-haha", "kya-shot-hai", "maza-aa-gaya", "siuuuuu"]),
    double: group("goalScored", ["two-goals-in-a-row"]),
    hatrick: group("goalScored", ["hatrick"]),
    record: group("goalScored", ["aaj-to-record-tutne-wala-hai", "tum-toh-unstoppable-ho"]),
    // The repository has encouraging/, not goalMissed/.
    goalMissed: group("encouraging", ["ahaan-negative", "are-koi-nahi-dobara-try-krte-hain", "are-thoda-sa-miss-dobara-try-krte-hain", "chalo-wapas-try", "dhayan-se-dekho", "hehe-ball-to-ghumne-chali-gai", "oh-phir-se", "oho-lagta-hai-ball-ko-goal-ka-address-nhi-pata", "oopsie-koi-nahi-phir-try-karo", "phir-try-kro"]),
    levelComplete: group("level-complete", ["goal-level-complete-mere-champion-ne-kar-dikhaya", "jhakaas-level-complete", "matlab-vo-alag-hi-level-ka-banda-tha", "chuckles-aurafarming-karte-thakte-nahi-ho", "sixseven-lets-go", "tum-to-aura-farmer-ho", "tumne-to-goalpost-ko-mog-kar-diya"]),
    positiveGoal: group("positive-sfx/goal", ["goal", "goal2", "goal3", "goal4"]),
    positivePhase: group("positive-sfx/phase", ["phaseComplete", "phaseComplete2", "phaseComplete3", "phaseComplete4"]),
    positiveGrand: group("positive-sfx/phase", ["GrandphaseComplete"]),
    wizzleDodge: group("interactions/keeda-dodge", ["ek-jagah-shanti-se-udte-reh", "maaro-isko", "surprised-are-ye-to-dodge-kr-raha-hai", "ye-lo-phir-se-bonus-ball"]),
    hit: group("sparky-gets-hit", ["aliens-ki-koi-ijjat-hi-nahi-hai", "are-dekh-ke-bhai(hurt)", "dekh-ke-bhai(annoyed)", "mujhe-kyu-toda", "ye-ball-to-mere-piche-hi-pad-gai"]),
    music: group("music", ["main-game", "main-game2", "main-game3", "main-game4"]),
    sfx: group("sfx", ["gasp", "toing", "bonk", "vine-boom", "kids-cheering"])
  });
  const clip = path => AUDIO + path + ".mp3";
  // Impact/streak feedback must already be decoded when the controller calls it.
  const common = [...catalog.sfx, ...catalog.hit, ...catalog.double, ...catalog.hatrick,
    ...catalog.record, ...catalog.start, ...catalog.levelComplete, clip("intro/aagaya-mera-ceo-of-football"),
    clip("intro/fun-fact-ronaldo-ko-suuuuuuu-karna-maine-hi-sikhaya-tha"), clip("goalhit/goal-hit"), clip("counting-tutorial/lets-go"),
    clip("sleep/yar-bol-ke-bhi-to-utha-skte-the"), clip("sfx/ui-display"),
    clip("music/intro"), ...catalog.music, ...catalog.positiveGoal, ...catalog.positivePhase, ...catalog.positiveGrand, ...catalog.wizzleDodge];
  const images = new Map(), buffers = new Map(), loads = new Map();
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const landscape = matchMedia("(orientation: landscape)");
  const storageKey = "sparky-director:v1:";
  const memory = new Map();
  const cancelled = Symbol("director cancelled");
  let context, prepared, mounting, run, serial = 0, voiceSerial = 0, dialogue, currentMusic;
  let fieldVideo;
  function prepareFieldVideo() {
    if (fieldVideo) return fieldVideo;
    fieldVideo = document.createElement("video");
    fieldVideo.className = "game-intro-field-video";
    fieldVideo.muted = true; fieldVideo.playsInline = true; fieldVideo.loop = true;
    fieldVideo.preload = "auto"; fieldVideo.setAttribute("aria-hidden", "true");
    fieldVideo.src = "assets/bg/game-bg-animated2.mp4";
    fieldVideo.load(); // Optional: a missing/stalled movie must never block the pitch.
    return fieldVideo;
  }

  function read(store, key, fallback) {
    try { return JSON.parse(window[store].getItem(storageKey + key)) ?? fallback; }
    catch { return memory.get(store + key) ?? fallback; }
  }
  function save(store, key, value) {
    memory.set(store + key, value);
    try { window[store].setItem(storageKey + key, JSON.stringify(value)); } catch { /* Private browsing. */ }
  }
  function pick(key, values, store = "sessionStorage") {
    let bag = read(store, key, {});
    let remaining = Array.isArray(bag.remaining) ? bag.remaining.filter(value => values.includes(value)) : [];
    if (!remaining.length) {
      remaining = [...values];
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
    }
    if (remaining.length > 1 && remaining[0] === bag.last) [remaining[0], remaining[1]] = [remaining[1], remaining[0]];
    // A new session bag must also respect the persistent last intro/break.
    const previous = read("localStorage", "last-" + key, null);
    if (remaining.length > 1 && remaining[0] === previous) [remaining[0], remaining[1]] = [remaining[1], remaining[0]];
    if (remaining.length === 1 && remaining[0] === previous && values.length > 1 && store === "localStorage") {
      remaining = values.filter(value => value !== previous);
    }
    const value = remaining.shift();
    save(store, key, { remaining, last: value });
    return value;
  }
  function engine() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!context && Audio) {
      try {
        context = new Audio();
        context.addEventListener("statechange", sync);
      } catch { /* Audio unavailable: short, pause-aware silent fallback. */ }
    }
    return context;
  }
  function loadImage(key, path) {
    if (images.has(key)) return Promise.resolve(images.get(key));
    const image = new Image(); image.alt = ""; image.draggable = false;
    image.src = path;
    return image.decode().then(() => { images.set(key, image); return image; });
  }
  function decode(path) {
    if (buffers.has(path)) return Promise.resolve(buffers.get(path));
    if (loads.has(path)) return loads.get(path);
    const audio = engine();
    if (!audio) return Promise.resolve(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const promise = (async () => {
      try {
        const response = await fetch(path, { signal: controller.signal });
        if (!response.ok) throw new Error(`Audio ${response.status}: ${path}`);
        const buffer = await audio.decodeAudioData(await response.arrayBuffer());
        buffers.set(path, buffer);
        // Keep decoded optional audio bounded on long sessions (common clips stay hot).
        if (buffers.size > 36) {
          const oldest = [...buffers.keys()].find(key => !common.includes(key) && key !== path);
          if (oldest) buffers.delete(oldest);
        }
        return buffer;
      } catch { return null; }
      finally { clearTimeout(timeout); loads.delete(path); }
    })();
    loads.set(path, promise);
    return promise;
  }
  async function preload() {
    prepareFieldVideo();
    if (!prepared) prepared = Promise.all([
      ...Object.entries(posePaths).map(([key, path]) => loadImage(key, BASE + path)),
      ...Object.entries(artPaths).map(([key, path]) => loadImage(key, path)),
      ...common.map(decode)
    ]).then(() => undefined).catch(error => { prepared = undefined; throw error; });
    return prepared;
  }
  function environmentPaused() {
    return document.hidden || !landscape.matches || Boolean(window.SparkyScene?.state?.paused);
  }
  async function unlock() {
    const audio = engine();
    if (audio && !environmentPaused()) {
      try { await audio.resume(); } catch { /* Gate remains available. */ }
    }
    if (run) { run.gate = Boolean(audio && audio.state !== "running" && !environmentPaused()); sync(); }
    return !audio || audio.state === "running";
  }
  function sync() {
    const r = run;
    if (!r || r.stopped) return;
    const external = environmentPaused();
    if (context?.state === "running") r.gate = false;
    r.paused = external || r.gate;
    r.ui.classList.toggle("game-director-paused", r.paused);
    r.actor.classList.toggle("game-director-paused", r.paused);
    r.stage.inert = external;
    for (const video of r.effectVideos || []) {
      if (r.paused || motion.matches) video.pause();
      else if (video.paused && !video.dataset.starting && !video.error) {
        video.dataset.starting = "true";
        video.play().catch(() => {}).finally(() => { delete video.dataset.starting; });
      }
    }
    if (r.fieldVideo) {
      const video = r.fieldVideo;
      if (r.paused || motion.matches || !r.introBackdrop) {
        video.pause();
        if (motion.matches || !r.introBackdrop) video.classList.remove("is-playing");
      } else if (video.paused && !r.videoStarting && !r.videoFailed) {
        r.videoStarting = true;
        video.play().catch(error => {
          if (error.name !== "AbortError") r.videoFailed = true;
          video.classList.remove("is-playing");
        }).finally(() => { r.videoStarting = false; });
      }
    }
    r.gateButton.hidden = !r.gate || external;
    r.gateButton.disabled = external;
    for (const animation of r.animations) {
      if (r.paused) animation.pause();
      else if (animation.playState === "paused") animation.play();
    }
    if (context && context.state !== "closed") {
      if (external && context.state === "running") { r.suspended = true; context.suspend().catch(() => {}); }
      else if (!external && r.suspended) {
        r.suspended = false;
        context.resume().then(() => {
          if (run === r && context.state !== "running") { r.gate = true; sync(); }
        }).catch(() => { if (run === r) { r.gate = true; sync(); } });
      }
    }
    const scale = Math.min(innerWidth / 1365, innerHeight / 768);
    r.stage.style.setProperty("--game-director-scale", scale);
    r.stage.style.setProperty("--game-director-gutter", `${Math.max(0, (document.documentElement.clientWidth / scale - 1365) / 2)}px`);
  }
  function assert(r) { if (!r || r !== run || r.stopped) throw cancelled; }
  function timer(ms, r = run) {
    let task;
    const done = new Promise(resolve => {
      if (!r || r.stopped) { resolve(false); return; }
      task = { at: r.time + Math.max(0, Number(ms) || 0), resolve };
      r.waits.add(task);
    });
    return { done, stop() { if (task && r.waits.delete(task)) task.resolve(false); } };
  }
  function wait(ms) { return timer(ms).done; }
  async function animate(el, frames, ms = 600, options = {}) {
    const r = run;
    if (!r || r.stopped || !el) return false;
    const final = Array.isArray(frames) ? frames[frames.length - 1] : Object.fromEntries(
      Object.entries(frames).map(([key, value]) => [key, Array.isArray(value) ? value[value.length - 1] : value]));
    const apply = () => {
      for (const [key, value] of Object.entries(final)) {
        if (!["offset", "easing", "composite"].includes(key)) el.style[key] = value;
      }
    };
    if (!el.animate || motion.matches) { apply(); return true; }
    let animation;
    try {
      animation = el.animate(frames, { duration: ms, fill: "both", easing: "cubic-bezier(.2,.8,.25,1)", ...options });
      r.animations.add(animation); if (r.paused) animation.pause();
      await animation.finished;
      if (run !== r || r.stopped) return false;
      apply(); return true;
    } catch { return false; }
    finally { if (animation) { r.animations.delete(animation); animation.cancel(); } }
  }
  function pose(key = "proud") {
    if (!run || !posePaths[key]) return false;
    if (key !== "kick") run.kickFrame = null;
    run.actor.dataset.pose = key;
    for (const layer of run.actor.children) layer.classList.toggle("game-pose-current", layer.dataset.pose === key);
    return true;
  }
  function sound(path, { volume = .5, loop = false, music = false } = {}) {
    const r = run;
    let source, gain, fallback, stopped = false, finished = false, resolveDone, resolveReady;
    const done = new Promise(resolve => { resolveDone = resolve; });
    const ready = new Promise(resolve => { resolveReady = resolve; });
    const handle = { done, ready, duration: 0, startedAt: null, music, path,
      options: { volume, loop, music },
      volume: Math.max(0, Math.min(1, Number(volume) || 0)),
      get gain() { return gain || null; },
      setVolume(value) {
        handle.volume = Math.max(0, Math.min(1, Number(value) || 0));
        handle.options.volume = handle.volume; updateGain();
      },
      refreshGain: updateGain,
      stop() {
        if (finished) return;
        stopped = true;
        try { source?.stop(); } catch { /* Already ended. */ }
        fallback?.stop(); finish();
      }
    };
    function updateGain() {
      if (!gain || !context) return;
      const target = handle.volume * (music && r?.voiceDucked ? .48 : 1);
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setTargetAtTime(target, context.currentTime, .075);
    }
    function finish() {
      if (finished) return;
      finished = true; r?.sounds.delete(handle);
      source?.disconnect(); gain?.disconnect();
      resolveReady(handle); resolveDone(!stopped);
    }
    r?.sounds.add(handle);
    if (!r || r.stopped) { handle.stop(); return handle; }
    if (music) { currentMusic?.stop(); currentMusic = handle; }
    (async () => {
      const buffer = await decode(path);
      if (stopped || r !== run || r.stopped) { handle.stop(); return; }
      if (!buffer || !context) {
        handle.duration = .45; resolveReady(handle);
        fallback = timer(450, r); await fallback.done; finish(); return;
      }
      try {
        source = context.createBufferSource(); gain = context.createGain();
        source.buffer = buffer; source.loop = Boolean(loop);
        gain.gain.value = handle.volume * (music && r.voiceDucked ? .48 : 1);
        source.connect(gain); gain.connect(context.destination); source.onended = finish;
        handle.duration = buffer.duration; handle.startedAt = context.currentTime;
        source.start(); resolveReady(handle);
        // No source-ended timeout: suspension must preserve its actual duration.
        if (!environmentPaused() && context.state !== "running") { r.gate = true; sync(); }
      } catch { handle.stop(); }
    })().catch(() => handle.stop());
    return handle;
  }
  function startMusic(mode = "game") {
    const r = run;
    if (!r || r.stopped) return;
    const token = r.musicToken = (r.musicToken || 0) + 1;
    r.musicMode = mode;
    currentMusic?.stop();
    if (mode === "intro") {
      sound(clip("music/intro"), { volume: .13, loop: true, music: true });
      return;
    }
    if (mode !== "game") { currentMusic = null; return; }
    const active = () => run === r && !r.stopped && r.musicToken === token;
    r.musicJob = (async () => {
      while (active()) {
        // Shuffle bags cover all four tracks before refilling, including the
        // original; the boundary cannot repeat the song that just finished.
        const path = pick("game-music", catalog.music);
        const handle = sound(path, { volume: .08, music: true });
        await handle.ready;
        if (!active()) return;
        const completed = await handle.done;
        if (!active() || !completed) return;
        // Failed decoding uses a short silent handle. Avoid a retry/network spin.
        if (handle.startedAt === null) await timer(3000, r).done;
      }
    })();
  }
  function interruptVoice() {
    voiceSerial++;
    dialogue?.stop(); dialogue = null;
    if (run) {
      run.questionSplash?.remove(); run.questionSplash = null;
      run.voiceDucked = false; currentMusic?.refreshGain();
      run.voiceTick = null; run.actor.classList.remove("game-speaking");
      for (const task of [...run.voiceWaits]) task.stop();
      run.voiceWaits.clear();
    }
  }
  async function say(path, key = "talk", { poses = [], gap = 350, animatePose = true } = {}) {
    const r = run;
    if (!r || r.stopped) return false;
    interruptVoice(); const token = voiceSerial;
    r.voiceDucked = true; currentMusic?.refreshGain();
    // Two alternates follow key; a full three-pose list explicitly owns all thirds.
    const sequence = (poses.length >= 3 ? poses.slice(0, 3) : [key, ...poses]).filter(name => posePaths[name]);
    if (animatePose) pose(sequence[0] || "talk");
    r.actor.classList.add("game-speaking");
    const voice = sound(path, { volume: .85 }); dialogue = voice;
    await voice.ready;
    if (token !== voiceSerial || run !== r) return false;
    // Read AudioContext time, not fetch time or a guessed voice length.
    let index = 0;
    r.voiceTick = () => {
      const elapsed = voice.startedAt === null ? 0 : context.currentTime - voice.startedAt;
      const third = Math.min(2, Math.floor(elapsed / Math.max(.001, voice.duration) * 3));
      if (third !== index) { index = third; if (animatePose) pose(sequence[Math.min(third, sequence.length - 1)] || key); }
    };
    const completed = await voice.done;
    if (token !== voiceSerial || run !== r || r.stopped) return false;
    r.voiceDucked = false; currentMusic?.refreshGain();
    r.voiceTick = null; dialogue = null; r.actor.classList.remove("game-speaking");
    const pause = timer(gap, r); r.voiceWaits.add(pause);
    await pause.done; r.voiceWaits.delete(pause);
    return completed && token === voiceSerial && run === r && !r.stopped;
  }
  function node(className, parent, tag = "div") {
    const el = document.createElement(tag); el.className = className; parent.append(el); return el;
  }
  function retained(key, parent) {
    const image = images.get(key);
    if (image) parent.append(image); // Move the decoded node; never swap src mid-pose.
  }
  function mount() {
    if (run && !run.stopped) return mounting || Promise.resolve(api);
    const camera = document.getElementById("scene-camera");
    const root = document.getElementById("game-scene");
    if (!camera || !root) return Promise.reject(new Error("SparkyDirector requires #game-scene and #scene-camera"));
    const actor = node("game-coach", camera);
    actor.setAttribute("role", "img"); actor.setAttribute("aria-label", "Sparky, your coach");
    const ui = node("game-director-ui", root), stage = node("game-director-stage", ui);
    const gateButton = node("game-audio-start", ui, "button");
    gateButton.type = "button"; gateButton.textContent = "Start ▶"; gateButton.hidden = true;
    gateButton.setAttribute("aria-label", "Start game audio"); gateButton.onclick = unlock;
    let resolveDisposed;
    const disposed = new Promise(resolve => { resolveDisposed = resolve; });
    const r = run = { id: ++serial, actor, ui, stage, gateButton, stopped: false, paused: false,
      disposed, resolveDisposed,
      gate: false, suspended: false, time: 0, last: performance.now(), waits: new Set(), voiceWaits: new Set(),
      animations: new Set(), sounds: new Set(), inputs: new Set(), voiceTick: null, busy: null, idle: null, raf: 0 };
    const gesture = () => {
      r.videoFailed = false;
      if (context?.state !== "running") void unlock();
    };
    const resize = () => sync();
    document.addEventListener("pointerdown", gesture);
    document.addEventListener("keydown", gesture);
    document.addEventListener("visibilitychange", resize);
    window.addEventListener("resize", resize);
    r.cleanup = () => {
      document.removeEventListener("pointerdown", gesture); document.removeEventListener("keydown", gesture);
      document.removeEventListener("visibilitychange", resize); window.removeEventListener("resize", resize);
    };
    function frame(now) {
      if (r.stopped) return;
      sync();
      if (!r.paused) {
        r.time += Math.min(100, now - r.last);
        for (const task of [...r.waits]) if (r.time >= task.at) { r.waits.delete(task); task.resolve(true); }
        r.voiceTick?.();
        const second = actor.dataset.pose === "kick" && r.kickFrame != null
          ? r.kickFrame : !motion.matches && Math.floor(r.time / 230) % 2;
        actor.style.setProperty("--game-pose-frame", second ? "-50%" : "0%");
        if (r.wizzle) {
          const index = motion.matches ? 0 : Math.floor(r.time / 95) % 4;
          r.wizzle.style.backgroundPosition = `${index % 2 * 100}% ${Math.floor(index / 2) * 100}%`;
        }
      }
      r.last = now; r.raf = requestAnimationFrame(frame);
    }
    r.raf = requestAnimationFrame(frame); sync();
    mounting = Promise.race([preload(), r.disposed]).then(() => {
      assert(r);
      for (const key of Object.keys(posePaths)) {
        const image = images.get(key), layer = node("game-pose", actor);
        layer.dataset.pose = key;
        if (image.naturalWidth / image.naturalHeight > 1.8) layer.classList.add("game-pose-sheet");
        retained(key, layer);
      }
      pose("proud"); return api;
    }).catch(error => { if (run === r) dispose(); if (error !== cancelled) throw error; return api; });
    return mounting;
  }
  function shot(name, r = run, options = {}) {
    try {
      const result = Promise.resolve(window.SparkyScene?.setShot?.(name, options)).catch(() => false);
      return r ? Promise.race([result, r.disposed]) : result;
    }
    catch { return Promise.resolve(); }
  }
  function restoreWide({ instant = false } = {}) {
    if (!instant && window.SparkyScene?.state.shot === "wide") return Promise.resolve(true);
    return shot("wide", run, { instant });
  }
  function dispose() {
    const r = run;
    if (!r) return;
    r.stopped = true; r.resolveDisposed(false); interruptVoice(); cancelAnimationFrame(r.raf); r.cleanup();
    for (const video of r.effectVideos || []) { video.pause(); video.removeAttribute("src"); video.load(); }
    if (r.fieldVideo) {
      r.introBackdrop = false; r.fieldVideo.pause();
      r.fieldVideo.classList.remove("is-playing"); r.fieldVideo.remove();
      r.fieldVideo.onplaying = r.fieldVideo.onwaiting = r.fieldVideo.onerror = r.fieldVideo.onstalled = null;
    }
    for (const handle of [...r.sounds]) handle.stop();
    for (const animation of r.animations) animation.cancel();
    for (const task of r.waits) task.resolve(false);
    for (const cancel of [...r.inputs]) cancel();
    r.waits.clear(); r.actor.remove(); r.ui.remove();
    if (context?.state === "running") context.suspend().catch(() => {});
    currentMusic = null; mounting = null; run = null; void restoreWide({ instant: true });
  }
  async function line(r, path, key = "talk", poses = []) {
    assert(r); const completed = await say(clip(path), key, { poses }); assert(r); return completed;
  }
  function script(action) {
    // Mount synchronously before returning a promise, so concurrent calls share one run.
    const ready = mount(); const r = run;
    if (!r) return ready;
    if (r.busy) return r.busy;
    interruptVoice();
    const job = (async () => {
      try { await ready; assert(r); return await action(r); }
      catch (error) { if (error !== cancelled) throw error; return false; }
      finally {
        if (run === r) { await restoreWide(); if (!r.stopped) pose("proud"); r.busy = null; }
      }
    })();
    r.busy = job; return job;
  }
  async function tap(r, label, { text = "LET’S GO!", cue = null } = {}) {
    assert(r);
    const button = node("game-bonus-cta", r.stage, "button");
    button.type = "button"; button.setAttribute("aria-label", label); button.disabled = true;
    button.style.animation = "none";
    {
      // Dedicated retained football image, never a generic dialogue panel.
      const image = images.get("ball").cloneNode(); image.alt = ""; button.append(image);
      const caption = node("game-cta-label", button, "span"); caption.textContent = text;
      caption.setAttribute("aria-hidden", "true");
    }
    const previous = document.activeElement;
    let cueJob, cancel;
    try {
      const selected = new Promise(resolve => {
        let finished = false;
        const finish = value => {
          if (finished) return;
          finished = true; button.onclick = null; r.inputs.delete(cancel); resolve(value);
        };
        cancel = () => finish(false); r.inputs.add(cancel);
        button.onclick = () => {
          if (r.paused || r.stopped || button.disabled) return;
          const rect = button.querySelector("img").getBoundingClientRect();
          const stage = r.stage.getBoundingClientRect(), scale = stage.width / 1365;
          interruptVoice(); void unlock(); button.disabled = true;
          finish({ left: (rect.left - stage.left) / scale, top: (rect.top - stage.top) / scale,
            width: rect.width / scale, height: rect.height / scale });
        };
      });
      sound(clip("sfx/toing"), { volume: .25 });
      await animate(button, [
        { opacity: 0, transform: "translateY(-190px) scale(.35) rotate(-24deg)" },
        { opacity: 1, transform: "translateY(12px) scale(1.08,.92) rotate(4deg)", offset: .72 },
        { opacity: 1, transform: "translateY(0) scale(1) rotate(0)" }
      ], 620);
      assert(r); button.style.removeProperty("transform"); button.style.removeProperty("animation");
      button.disabled = false; button.focus({ preventScroll: true });
      // Input may interrupt the cue, but never overlap it with the impact line.
      if (cue) cueJob = line(r, cue, "point", ["point", "encourage", "point"]);
      const origin = await selected;
      if (cueJob) await cueJob;
      assert(r); return origin;
    } finally {
      if (cancel) r.inputs.delete(cancel);
      button.remove();
      if (previous?.isConnected && document.activeElement === document.body) previous.focus({ preventScroll: true });
    }
  }
  async function wakeChoice(r, onWake, onHit) {
    assert(r);
    // The sleep marks and pointer follow Sparky's face, not the screen corner.
    const marks = node("game-sleep-marks", r.actor);
    marks.setAttribute("aria-hidden", "true");
    for (const letter of ["z", "z", "Z"]) node("", marks, "span").textContent = letter;
    const poke = node("game-wake-target", r.actor, "button");
    poke.type = "button"; poke.setAttribute("aria-label", "Poke Sparky gently to wake him");
    poke.append(images.get("pointer").cloneNode());
    const kick = node("game-bonus-cta game-wake-ball", r.stage, "button");
    kick.type = "button"; kick.setAttribute("aria-label", "Kick a football to wake Sparky");
    kick.append(images.get("ball").cloneNode());
    const caption = node("game-cta-label", kick, "span"); caption.textContent = "KICK!";
    const previous = document.activeElement;
    try {
      const choice = await new Promise(resolve => {
        let finished = false;
        const finish = value => {
          if (finished) return;
          finished = true; poke.onclick = kick.onclick = null;
          poke.disabled = kick.disabled = true; r.inputs.delete(cancel); resolve(value);
        };
        const cancel = () => finish(false); r.inputs.add(cancel);
        for (const [button, value] of [[poke, "poke"], [kick, "ball"]]) button.onclick = () => {
          if (r.paused || r.stopped) return;
          void unlock(); finish(value);
        };
        poke.focus({ preventScroll: true });
      });
      assert(r); r.wakeMethod = choice; onWake?.();
      marks.remove(); poke.remove();
      if (choice === "ball") {
        // Convert actual on-screen centers into the shared screen-space stage.
        const stage = r.stage.getBoundingClientRect(), actor = r.actor.getBoundingClientRect();
        const ball = kick.getBoundingClientRect(), scale = stage.width / 1365;
        const dx = (actor.left + actor.width * .55 - (ball.left + ball.width / 2)) / scale;
        const dy = (actor.top + actor.height * .46 - (ball.top + 73 * scale)) / scale;
        caption.hidden = true; kick.style.animation = "none";
        await animate(kick, [{ transform: "translate(0,0) scale(1)" },
          { transform: `translate(${dx}px,${dy}px) scale(.5) rotate(-520deg)` }], 540);
        assert(r); pose("goofy"); sound(clip("sfx/toing"), { volume: .45 });
        await Promise.all([
          onHit?.(),
          animate(r.actor, [{ transform: "rotate(0)" }, { transform: "translate(-20px,8px) rotate(-10deg)", offset: .35 }, { transform: "rotate(0)" }], 460),
          animate(kick, [{ transform: `translate(${dx}px,${dy}px) scale(.5) rotate(-520deg)`, opacity: 1 },
            { transform: `translate(${dx + 480}px,820px) scale(.7) rotate(-900deg)`, opacity: 0 }], 650)
        ]);
      } else {
        kick.remove();
        await animate(r.actor, [{ transform: "rotate(0)" }, { transform: "rotate(3deg)", offset: .4 }, { transform: "rotate(0)" }], 280);
      }
      assert(r); return choice;
    } finally {
      marks.remove(); poke.remove(); kick.remove();
      if (previous?.isConnected && document.activeElement === document.body) previous.focus({ preventScroll: true });
    }
  }
  async function comic(html, ms = 900, { side = false, question = false, until = null } = {}) {
    const r = run; if (!r || r.stopped) return false;
    const splash = node("game-comic", r.stage); splash.innerHTML = html;
    if (side) splash.classList.add("game-comic-side");
    if (question) r.questionSplash = splash;
    try {
      await animate(splash, [{ opacity: 0, transform: "scale(.2) rotate(-12deg)" }, { opacity: 1, transform: "scale(1.08) rotate(3deg)", offset: .7 }, { opacity: 1, transform: "scale(1) rotate(-3deg)" }], 200);
      if (run !== r || r.stopped) return false;
      await wait(Math.max(0, ms - 350));
      // Cutaway titles stay on screen for the actual dialogue/fanfare, not a
      // guessed clip duration. Disposal still releases this pending effect.
      if (until) await Promise.race([until, r.disposed]);
      if (run !== r || r.stopped) return false;
      return await animate(splash, [{ opacity: 1 }, { opacity: 0 }], 150);
    } finally { splash.remove(); if (r.questionSplash === splash) r.questionSplash = null; }
  }
  function dialogueSplash(path) {
    const name = path.split("/").pop().replace(/\.mp3$/, "");
    return {
      "let-him-cook": "LET HIM COOK!", "lets-cook-my-friend": "LET’S COOK!",
      "chalo-goalmaxxing-shuru-karen": "GOALMAXXING!", "chalo-lets-farm-some-aura": "AURA FARMING!",
      "chalo-football-ko-rizz-kar-do": "RIZZ IT UP!",
      "chuckles-aurafarming-karte-thakte-nahi-ho": "AURA FARMER!", "tum-to-aura-farmer-ho": "AURA FARMER!",
      "matlab-vo-alag-hi-level-ka-banda-tha": "RESPECT++", "tumne-to-goalpost-ko-mog-kar-diya": "MOGGER!",
      "sixseven-lets-go": "SIX SEVEN!"
    }[name] || null;
  }
  // Incidental dialogue never acquires script/busy ownership or delays choices.
  // Keep the board-point/summon choreography; a kick interrupts voice + splash.
  async function questionStart() {
    const r = run;
    if (!r || r.stopped || r.busy) return false;
    const path = pick("question-start", catalog.start), title = dialogueSplash(path);
    r.questionStart = path;
    const voice = say(path, "up", { gap: 0, animatePose: false });
    await Promise.all([voice, title ? comic(title, 2100, { side: true, question: true }) : Promise.resolve()]);
    return run === r && !r.stopped;
  }
  const welcomes = {
    ceo: ["intro/aagaya-mera-ceo-of-football"],
    pro: ["intro/are-wah-mera-pro-player/are-wah-mera-pro-player-aagaya", "intro/are-wah-mera-pro-player/baki-sb-side-ho-jao"],
    worldCup: ["intro/aree-tum-aa-gaye-chalo-jaldi-world-cup-is-waiting"],
    duty: ["intro/reporting-for-duty/coach-sparky-reporting-for-duty", "intro/reporting-for-duty/aur-mera-best-player-bhi-aagaya"],
    goals: ["intro/oye-hoye-pro-player/oye-hoye-pro-player-aagaya", "intro/oye-hoye-pro-player/ab-to-goals-ki-barish-hogi"]
  };
  const phoneCalls = {
    ronaldo: ["phone-intro/ronaldo-bhai-kya-meri-coaching-chahiye-aaj-nahi-mera-superstar-aagaya", "phone-intro/chalo-champion-ronaldo-ko-bad-me-sikhaenge"],
    messi: ["phone-intro/haan-messi-kl"],
    mbappe: ["phone-intro/vo-balak-kylian-mbappe-keh-raha-coaching-diwade-maine-kaha-chal-hatt"],
    aliens: ["phone-intro/dharti-pe-aliens/kya-kaha-dharti-pe-aliens-aagaye", "phone-intro/dharti-pe-aliens/hehe-are-vo-to-main-hi-hoon"],
    coach: ["intro/coach-ko-mat-sikha/kal-ronaldo-keh-raha-tha-sparky-thoda-aaram-kar-le", "intro/coach-ko-mat-sikha/maine-kaha-apne-coach-ko-mat-sikha-laughs"]
  };
  // Shared story beats, not nested scripts: a break already owns script().
  async function anecdote(r, kind, phoneKind) {
    assert(r);
    if (kind === "phone") {
      const lines = phoneCalls[phoneKind || pick("phone-dialogue", Object.keys(phoneCalls))];
      const aliens = lines === phoneCalls.aliens, coach = lines === phoneCalls.coach;
      const ronaldo = lines === phoneCalls.ronaldo;
      pose(coach ? "talk" : "phone"); await shot("close", r);
      await line(r, lines[0], aliens ? "phoneListen" : coach ? "talk" : "phone",
        coach ? ["talk", "thinking", "cocky"] : aliens ? ["phoneListen", "phoneExcited"]
          : ronaldo ? ["phone", "phoneSmirk", "phoneExcited"] : ["phone", "phoneSmirk"]);
      if (lines[1]) await line(r, lines[1], coach ? "cocky" : aliens ? "himself" : "phoneSmirk", [aliens ? "himself" : "talk", "laugh"]);
    } else if (kind === "messing") {
      pose("deepThought"); await shot("close", r);
      await line(r, "idle/football-good-night/maine-kal-football-ko-goodnight-bola", "deepThought", ["deepThought", "confused2"]);
      await line(r, "intro/football-good-night/usne-reply-hi-nhi-diya", "confused2", ["confused", "annoyed"]);
      await wait(350); pose("laugh"); await wait(450);
    } else if (kind === "funFact") {
      pose("idea"); await shot("close", r);
      await line(r, "intro/fun-fact-ronaldo-ko-suuuuuuu-karna-maine-hi-sikhaya-tha", "idea", ["talk", "himself", "cocky"]);
      pose("victory"); await wait(400);
    }
    assert(r);
  }
  const letsGoFollowups = Object.freeze(["ronaldo", "messi", "mbappe", "aliens", "coach", "funFact", "messing"]);
  function intro(type) {
    return script(async r => {
      const previousMode = r.musicMode;
      startMusic("intro");
      r.fieldVideo = prepareFieldVideo(); r.introBackdrop = true; r.videoFailed = false;
      document.querySelector(".field-world").append(r.fieldVideo);
      r.fieldVideo.onplaying = () => {
        if (run === r && r.introBackdrop && !r.paused && !motion.matches) r.fieldVideo.classList.add("is-playing");
      };
      for (const event of ["waiting", "stalled", "error"]) r.fieldVideo[`on${event}`] = () => r.fieldVideo.classList.remove("is-playing");
      sync();
      try {
      const types = ["welcome", "phone", "messing", "sleep", "funFact"];
      if (!types.includes(type)) {
        const last = read("localStorage", "last-intro", null);
        type = pick("intro", types.filter(value => value !== last));
      }
      save("localStorage", "last-intro", type); r.intro = type;
      if (type === "welcome") {
        const lines = welcomes[pick("welcome-dialogue", Object.keys(welcomes))];
        const peek = node("game-screen-peek", r.stage);
        // Keep the actor's decoded peek node intact for later pose calls.
        const image = images.get("peek").cloneNode();
        await image.decode(); peek.append(image);
        r.actor.style.opacity = "0";
        try {
          await animate(peek, [{ transform: "translateX(-650px) rotate(-10deg)" }, { transform: "translateX(0) rotate(0)" }], 550);
          if (lines !== welcomes.duty) await line(r, lines[0]);
          else await wait(450);
          await animate(peek, [{ opacity: 1 }, { opacity: 0, transform: "translateX(-620px)" }], 300);
        } finally { peek.remove(); r.actor.style.opacity = "1"; }
        pose(lines === welcomes.duty ? "salute" : "hi");
        await Promise.all([shot("close", r), animate(r.actor,
          [{ opacity: 0, transform: "translateY(55px) scale(.9)" }, { opacity: 1, transform: "translateY(0) scale(1)" }], 500)]);
        if (lines === welcomes.duty) await line(r, lines[0], "salute");
        if (lines[1]) await line(r, lines[1], "proud", ["hi", "victory"]);
      } else if (["phone", "messing", "funFact"].includes(type)) {
        await anecdote(r, type);
      } else {
        pose("sleep"); r.wakeMethod = null;
        const snore = sound(clip("sleep/snoring"), { loop: true, volume: .28 });
        let method;
        const reactToHit = () => {
          const reaction = pick("wake-hit", ["sleep/yar-bol-ke-bhi-to-utha-skte-the",
            "sparky-gets-hit/mujhe-kyu-toda", "sparky-gets-hit/aliens-ki-koi-ijjat-hi-nahi-hai"]);
          return line(r, reaction, "goofy", ["annoyed", "annoyed"]);
        };
        try { await shot("close", r); method = await wakeChoice(r, () => snore.stop(), reactToHit); } finally { snore.stop(); }
        if (method === "ball") {
          // Its reaction already started at contact, alongside the recoil.
        } else if (pick("wake", ["sorry", "ronaldo"]) === "sorry") {
          await line(r, "sleep/aakh-lag-gai/yawns", "yawn");
          await line(r, "sleep/aakh-lag-gai/are-sorry-thodi-si-aakh-lag-gai-thi", "shy", ["shy", "shy", "shy"]);
        } else {
          await line(r, "sleep/ronaldo-aa-gaya-kya/ronaldo-aa-gaya-kya", "surprised");
          await line(r, "sleep/ronaldo-aa-gaya-kya/acha-tum-hi-ho", "talk", ["laugh", "hi"]);
        }
      }
      assert(r); return type;
      } finally {
        if (run === r && !r.stopped) {
          await restoreWide();
          if (run === r && !r.stopped) {
            r.introBackdrop = false; r.fieldVideo.pause();
            r.fieldVideo.classList.remove("is-playing"); r.fieldVideo.remove();
            startMusic(previousMode === "game" ? "game" : "none");
          }
        }
      }
    });
  }
  async function goalParticles(r, phase = false, grand = false) {
    const layer = node("game-goal-particles", r.stage);
    const count = motion.matches ? 8 : grand ? 44 : phase ? 32 : 22;
    try {
      await Promise.all(Array.from({ length: count }, (_, i) => {
        const spark = node("game-goal-spark", layer);
        spark.classList.toggle("game-goal-star", i % 3 === 0);
        spark.style.background = ["#ffe66b", "#7ff5ff", "#ff83be", "#b8ff79"][i % 4];
        const angle = i / count * Math.PI * 2, reach = 100 + Math.random() * (phase ? 300 : 185);
        const x = Math.cos(angle) * reach, y = Math.sin(angle) * reach;
        return animate(spark, [
          { opacity: 0, transform: "translate(0,0) scale(.2)" },
          { opacity: 1, transform: `translate(${x * .55}px,${y * .55 - 45}px) scale(1.15) rotate(90deg)`, offset: .35 },
          { opacity: 0, transform: `translate(${x}px,${y + 110}px) scale(.15) rotate(260deg)` }
        ], phase ? 1150 : 850, { easing: "linear" });
      }));
    } finally { layer.remove(); }
  }
  async function phaseConfetti(r, grand = false) {
    const layer = node("game-phase-confetti", r.stage);
    const count = motion.matches ? 10 : grand ? 64 : 40;
    try {
      await Promise.all(Array.from({ length: count }, (_, i) => {
        const piece = node("game-phase-confetti-piece", layer);
        piece.style.left = `${(i + .5) / count * 100}%`;
        piece.style.background = ["#ffe66b", "#7ff5ff", "#ff83be", "#b8ff79"][i % 4];
        return animate(piece, [
          { opacity: 0, transform: `translate(0,${-80 - i % 5 * 40}px) rotate(0)` },
          { opacity: 1, offset: .12 },
          { opacity: 1, offset: .8 },
          { opacity: 0, transform: `translate(${Math.sin(i * 2.4) * 150}px,850px) rotate(${i % 2 ? 720 : -650}deg)` }
        ], 1350 + i % 5 * 90, { easing: "linear" });
      }));
    } finally { layer.remove(); }
  }
  async function phaseCutaway(r, action) {
    const backdrop = node("game-phase-cinema", r.stage);
    const video = node("", backdrop, "video");
    video.muted = true; video.playsInline = true; video.loop = true;
    video.setAttribute("aria-hidden", "true");
    video.src = "assets/comic-effect-bg/comic-reveal-effect.mp4";
    r.effectVideos ||= new Set(); r.effectVideos.add(video);
    video.onplaying = () => { if (!r.paused && !motion.matches) video.classList.add("is-playing"); };
    video.onwaiting = video.onerror = () => video.classList.remove("is-playing");
    const parent = r.actor.parentNode, sibling = r.actor.nextSibling;
    r.stage.append(r.actor); r.actor.classList.add("game-coach-cutaway");
    r.stage.classList.add("game-phase-cutaway"); sync();
    try {
      await Promise.all([
        animate(backdrop, [{ opacity: 0, transform: "scale(1.08)" }, { opacity: 1, transform: "scale(1)" }], 180),
        animate(r.actor, [{ opacity: 0, transform: "translateY(55px) scale(.85)" }, { opacity: 1, transform: "translateY(0) scale(1)" }], 220)
      ]);
      assert(r); await action(); assert(r);
      await Promise.all([
        animate(backdrop, [{ opacity: 1 }, { opacity: 0 }], 180),
        animate(r.actor, [{ opacity: 1 }, { opacity: 0 }], 180)
      ]);
    } finally {
      video.pause(); r.effectVideos.delete(video); video.removeAttribute("src"); video.load(); backdrop.remove();
      r.stage.classList.remove("game-phase-cutaway");
      r.actor.classList.remove("game-coach-cutaway");
      if (run === r && !r.stopped) {
        parent.insertBefore(r.actor, sibling?.parentNode === parent ? sibling : null);
        r.actor.style.removeProperty("opacity"); r.actor.style.removeProperty("transform");
      }
    }
  }
  function feedback({ correct = false, streak = 0, phaseEnd = false, phaseNumber = 0, kind = "" } = {}) {
    const hit = /hit|goofy|coach/i.test(kind);
    // The controller can call at contact while its recoil animation is still running.
    if (hit) pose("goofy");
    return script(async r => {
      let category = hit ? "hit" : correct ? (phaseEnd ? "levelComplete" : "goalScored") : "goalMissed";
      if (correct && !hit && !phaseEnd) {
        if (streak === 2) category = "double";
        else if (streak === 3) category = "hatrick";
        else if (streak >= 4 && r.time - (r.lastRecord ?? -Infinity) >= 22000) {
          category = "record"; r.lastRecord = r.time;
        }
      }
      const key = hit ? "goofy" : correct ? (streak >= 3 ? "victory" : "thumbs") : "confused";
      const path = pick(category, catalog[category]);
      // Grand fanfares every 3, then 4 phases; fixed/infinite phase ordinals make
      // this stable across reloads rather than restarting a session-only counter.
      const grand = correct && phaseEnd && phaseNumber > 0 && [0, 3].includes(phaseNumber % 7);
      const cutaway = correct && phaseEnd && phaseNumber !== r.lastComicPhase
        && phaseNumber !== (r.lastComicPhase || -2) + 1 && Math.random() < .35;
      if (cutaway) r.lastComicPhase = phaseNumber;
      const title = phaseEnd ? dialogueSplash(path) || (grand ? "SUPERSTAR!" : "AWESOME!") :
        ({ double: "DOUBLE!", hatrick: "HAT-TRICK!", record: "ON FIRE!" }[category]
          || pick("goal-splash", ["GOAL!", "GREAT SHOT!", "BOOM!", "NAILED IT!", "BRILLIANT!"]));
      const present = async () => {
        const fanfare = correct ? sound(pick(grand ? "positiveGrand" : phaseEnd ? "positivePhase" : "positiveGoal",
          grand ? catalog.positiveGrand : phaseEnd ? catalog.positivePhase : catalog.positiveGoal), { volume: grand ? .48 : .38 }) : null;
        const beats = Promise.all([
          say(path, key, { poses: hit ? ["goofy", "annoyed", "confused2"] : correct ? phaseEnd ? ["jump", "cheer", "victory"] : ["cheer", "victory"] : ["talk", "encourage"] }),
          correct ? goalParticles(r, phaseEnd, grand) : Promise.resolve(),
          correct && phaseEnd ? phaseConfetti(r, grand) : Promise.resolve(),
          fanfare?.done
        ]);
        await Promise.all([
          beats,
          correct ? comic(title, phaseEnd ? 1200 : 850, { until: cutaway ? beats : null }) : Promise.resolve()
        ]);
      };
      r.celebration = correct ? { phaseEnd, phaseNumber, grand, cutaway } : null;
      if (cutaway) await phaseCutaway(r, present);
      else await present();
      assert(r); return path;
    });
  }
  const idlePairs = {
    goals: ["idle/100-goals/pata-hai-main-kal-100-goals-marne-wala-tha", "idle/100-goals/phir-alarm-baj-gaya"],
    ready: ["idle/ball-ready-goal-ready/ball-ready", "idle/ball-ready-goal-ready/goal-ready", "idle/ball-ready-goal-ready/player-kaha-hai"],
    goodnight: ["idle/football-good-night/maine-kal-football-ko-goodnight-bola", "idle/football-good-night/usne-reply-hi-nhi-diya"],
    pizza: ["idle/kuch-soch-rahe-ho/kuch-soch-rahe-ho", "idle/kuch-soch-rahe-ho/main-bhi-soch-raha-hoon", "idle/kuch-soch-rahe-ho/aaj-pizza-khane-ka-mood-hai"],
    boss: ["idle/are-boss-so-gaye-kya"],
    football: ["idle/yar-ye-football-gol-kyun-hai"],
    noRush: ["idle/yawning-koi-jaldi-nahi-hai"]
  };
  async function idle() {
    await mount(); const r = run;
    if (!r || r.busy || r.idle) return false;
    const job = (async () => {
      const kind = pick("idle", Object.keys(idlePairs)), pair = idlePairs[kind];
      for (let index = 0; index < pair.length; index++) {
        const poses = kind === "goodnight" ? (index ? ["confused2", "confused", "annoyed"] : ["deepThought", "deepThought", "confused2"])
          : kind === "pizza" || kind === "football" ? ["deepThought", "thinking", index ? "idea" : "confused2"]
          : kind === "noRush" ? ["yawn", "talk", "encourage"] : [index ? "laugh" : "thinking", "talk", index ? "laugh" : "thinking"];
        if (!await say(clip(pair[index]), poses[0], { poses })) return false;
        if (run !== r || r.busy || r.stopped) return false;
      }
      pose("proud"); return true;
    })();
    r.idle = job;
    try { return await job; } finally { if (run === r) r.idle = null; }
  }
  function screenBall(r, origin) {
    const el = node("game-flying-ball", r.stage); retained("ball", el);
    if (origin) for (const key of ["left", "top", "width", "height"]) el.style[key] = `${origin[key]}px`;
    return el;
  }
  function aimAt(r, target, ball, x = .5, y = .5) {
    const stage = r.stage.getBoundingClientRect(), rect = target.getBoundingClientRect();
    const origin = ball.getBoundingClientRect(), scale = stage.width / 1365;
    return `translate(${(rect.left + rect.width * x - origin.left - origin.width / 2) / scale}px,${(rect.top + rect.height * y - origin.top - origin.height / 2) / scale}px)`;
  }
  async function wizzleBreak(r, { phaseNumber = 0, preview = false } = {}) {
    const story = window.SparkyWizzleStory;
    const saved = read("localStorage", "wizzle-story", {});
    const variant = pick("wizzle-variant", story.choices(saved, phaseNumber));
    const dramatic = variant === "first", dodge = variant.startsWith("dodge");
    r.wizzleVariant = variant; r.wizzleBeat = "enter";
    // A pitch resident, not a HUD sticker: camera push-ins carry him off-screen.
    const wizzle = node("game-wizzle", r.actor.parentNode); r.wizzle = wizzle;
    wizzle.style.backgroundImage = `url("${artPaths.wizzle}")`;
    wizzle.setAttribute("role", "img"); wizzle.setAttribute("aria-label", "Wizzle flying over the pitch");
    const music = sound(clip("music/dramatic-funny-music"), { volume: .15, loop: true, music: true });
    let flight, speed, ball;
    function freezeFlight() {
      // Capture the presentation transform BEFORE cancel; otherwise WAAPI snaps
      // back to the entry pose and both the hit target and exit start are wrong.
      const transform = getComputedStyle(wizzle).transform;
      if (flight) { flight.cancel(); r.animations.delete(flight); flight = null; }
      wizzle.style.transform = transform;
      return transform === "none" ? "translate(0,0)" : transform;
    }
    try {
      await animate(wizzle, [{ transform: "translate(550px,-60px) rotate(15deg)" }, { transform: "translate(0,0) rotate(-8deg)" }], 650);
      assert(r);
      sound(clip(`flying-wizzle/${pick("wizzle-noise", ["noise1", "noise2", "noise3"])}`), { volume: .3 });
      if (dramatic) {
        speed = node("game-speedlines", r.stage); retained("speed", speed);
        sound(clip("sfx/vine-boom"), { volume: .3 });
        // Brief character punch-in while the pitch camera is still wide.
        await animate(wizzle, [{ transform: "translate(0,0) rotate(-8deg) scale(1)" },
          { transform: "translate(-395px,10px) rotate(5deg) scale(2.35)" }], 340);
        await wait(230); assert(r);
        await animate(wizzle, [{ transform: "translate(-395px,10px) rotate(5deg) scale(2.35)" },
          { transform: "translate(0,0) rotate(-8deg) scale(1)" }], 250);
        speed.remove();
      }
      if (!motion.matches && wizzle.animate) {
        flight = wizzle.animate([{ transform: "translate(0,0) rotate(-8deg)" }, { transform: "translate(-180px,65px) rotate(7deg)" }, { transform: "translate(30px,-45px) rotate(-6deg)" }, { transform: "translate(0,0) rotate(-8deg)" }], { duration: 3300, iterations: Infinity });
        r.animations.add(flight); sync();
      }
      if (dramatic) {
        pose("surprised");
        sound(clip("sfx/gasp"), { volume: .55 });
        await shot("dramatic", r);
        await line(r, "interactions/keeda1/ek-sec-rukna", "surprised", ["surprised", "point"]);
        await line(r, "interactions/keeda1/ja-yaha-se-shu-shu", "point");
        await restoreWide();
        await line(r, "interactions/keeda1/ye-lo-bro-bonus-ball", "summon", ["talk", "point"]);
      } else {
        await line(r, "interactions/keeda2/tu-phir-aagaya", variant === "dodgeAnnoyed" ? "annoyed" : "surprised", ["angry", "point"]);
        await line(r, "interactions/keeda2/ye-raha-bolnus-ball-excited", "summon");
      }
      r.wizzleBeat = "first-ball";
      let origin = await tap(r, "Kick the bonus football to hit Wizzle", { text: "BONUS!",
        cue: pick("wizzle-kick-cue", ["interactions/keeda1/maaro-isko-excited",
          "interactions/keeda2/maaro-isse-keede-ko", "interactions/keeda2/maaro-iss-keede-ko",
          "interactions/keeda2/bro-maro-isko-hurry", "interactions/keeda2/bro-maro-isko-angry",
          "interactions/keeda2/bro-maro-isko-aggressive"]) }); assert(r);
      let contact = freezeFlight();
      ball = screenBall(r, origin);
      let target = aimAt(r, wizzle, ball);
      sound(clip("sfx/bonk"), { volume: .45 });
      if (dodge) {
        // Aim at his OLD position. He waits for the committed shot, then darts
        // clear while the ball continues through that space and off the pitch.
        r.wizzleBeat = "dodge";
        const dodgeTransform = `${contact} translate(-185px,-125px) rotate(-22deg)`;
        await Promise.all([
          animate(ball, [{ transform: "translate(0,0) scale(1)" },
            { transform: `${target} scale(.7) rotate(-260deg)`, offset: .65 },
            { transform: `${target} translate(460px,-200px) scale(.3) rotate(-600deg)`, opacity: 0 }
          ], 700, { easing: "linear" }),
          (async () => {
            await wait(170); assert(r);
            await animate(wizzle, [{ transform: contact }, { transform: dodgeTransform }], 240);
          })()
        ]);
        assert(r); ball.remove(); ball = null; r.wizzleBeat = "reaction";
        if (variant === "dodgeSurprised") {
          pose("surprised"); sound(clip("sfx/gasp"), { volume: .55 });
          await shot("dramatic", r);
          await line(r, "interactions/keeda-dodge/surprised-are-ye-to-dodge-kr-raha-hai", "surprised", ["surprised", "confused2", "surprised"]);
        } else {
          pose("annoyed"); await shot("close", r);
          await line(r, "interactions/keeda-dodge/ek-jagah-shanti-se-udte-reh", "annoyed", ["annoyed", "angry", "point"]);
        }
        await restoreWide();
        await animate(wizzle, [{ transform: dodgeTransform }, { transform: "translate(-70px,10px) rotate(-6deg)" }], 380);
        await line(r, "interactions/keeda-dodge/ye-lo-phir-se-bonus-ball", "summon", ["summon", "encourage", "point"]);
        r.wizzleBeat = "second-ball";
        origin = await tap(r, "Kick the second bonus football to hit Wizzle", { text: "AGAIN!", cue: "interactions/keeda-dodge/maaro-isko" });
        assert(r); contact = freezeFlight();
        ball = screenBall(r, origin); target = aimAt(r, wizzle, ball);
        sound(clip("sfx/bonk"), { volume: .45 });
      }
      r.wizzleBeat = "hit";
      await animate(ball, [{ transform: "translate(0,0) scale(1)" }, { transform: `${target} scale(.7)` }], 400);
      assert(r);
      sound(clip("flying-wizzle/gets-hit1"), { volume: .65 });
      await Promise.all([
        comic("BONK!", 600),
        animate(ball, [{ transform: `${target} scale(.7)`, opacity: 1 },
          { transform: `${target} translate(-170px,260px) scale(.4) rotate(-240deg)`, opacity: 0 }], 480),
        animate(wizzle, [{ transform: contact, opacity: 1 },
          { transform: `${contact} translate(620px,500px) rotate(440deg)`, opacity: 0 }], 650)
      ]);
      assert(r); await line(r, "goalScored/maza-aa-gaya", "laugh", ["cheer", "thumbs"]);
      assert(r); r.wizzleBeat = "complete";
      if (!preview) save("localStorage", "wizzle-story", story.complete(saved, variant));
    } finally {
      if (flight) { flight.cancel(); r.animations.delete(flight); }
      music.stop(); speed?.remove(); ball?.remove(); wizzle.remove(); r.wizzle = null;
    }
  }
  async function messiBreak(r) {
    const messi = node("game-messi", r.stage), normal = node("game-messi-art", messi), angry = node("game-messi-art", messi);
    retained("messi", normal); retained("messiAngry", angry); angry.hidden = true;
    let ball;
    try {
      await animate(messi, [{ transform: "translateX(450px) rotate(-15deg)" }, { transform: "translateX(0) rotate(-12deg)" }], 650);
      await line(r, "level-complete/messi-bhai-ko-done-kr-do", "surprised", ["talk", "point"]);
      const origin = await tap(r, "Kick the football towards Messi — it’s done, bro", { text: "DONE!" }); assert(r);
      ball = screenBall(r, origin);
      const target = aimAt(r, messi, ball, .45, .42);
      await animate(ball, [{ transform: "translate(0,0)" }, { transform: `${target} scale(.75)` }], 450);
      assert(r); ball.remove(); normal.hidden = true; angry.hidden = false;
      sound(clip("goalhit/goal-hit"), { volume: .5 });
      const grumble = sound("assets/messi/que-miras-bobo-messi.mp3", { volume: .3 });
      try {
        await Promise.all([
          line(r, "counting-tutorial/messi-its-done-bro", "laugh", ["talk", "victory"]), comic("It’s Done Bro!", 1100),
          animate(messi, [{ transform: "translateX(0) rotate(-12deg)" }, { transform: "translateX(650px) rotate(30deg)", opacity: 0 }], 750)
        ]);
      } finally { grumble.stop(); }
    } finally { messi.remove(); ball?.remove(); }
  }
  async function letsGoBreak(r) {
    r.letsGoFollowup = null;
    await line(r, "counting-tutorial/lets-go", "cheer", ["talk", "summon"]);
    const origin = await tap(r, "Kick the football to start the next round", { text: "LET’S GO!" }); assert(r);
    const ball = screenBall(r, origin); let crack, wipe;
    try {
      sound(clip("sfx/toing"), { volume: .4 });
      r.kickFrame = 0; pose("kick");
      r.actor.style.setProperty("--game-pose-frame", "0%");
      await animate(ball, [
        { transform: "translate(0,0) scale(1)" }, { transform: "translate(-210px,-180px) scale(.9)", offset: .4 },
        { transform: "translate(-390px,-35px) scale(.85)", offset: .75 }, { transform: "translate(-440px,0) scale(.8)" }
      ], 900);
      assert(r); r.kickFrame = 1;
      r.actor.style.setProperty("--game-pose-frame", "-50%");
      sound(clip("goalhit/goal-hit"), { volume: .55 });
      // Actor is in world space; the football and glass remain in screen space.
      await animate(ball, [{ transform: "translate(-440px,0) scale(.8)" }, { transform: "translate(0,-240px) scale(10) rotate(210deg)" }], 600);
      assert(r); ball.remove();
      crack = node("game-screen-crack", r.stage); retained("crack", crack);
      sound(clip("sfx/vine-boom"), { volume: .45 }); await wait(400); assert(r);
      wipe = node("game-comic-wipe", r.stage);
      await animate(wipe, [{ transform: "translateX(-150%) skewX(-14deg)" }, { transform: "translateX(0) skewX(-14deg)" }], 350);
      assert(r); crack.remove();
      await animate(wipe, [{ transform: "translateX(0) skewX(-14deg)" }, { transform: "translateX(150%) skewX(-14deg)" }], 350);
    } finally { r.kickFrame = null; ball.remove(); crack?.remove(); wipe?.remove(); }
    assert(r); pose("proud");
    // High chance, not guaranteed. Only these stories fit mid-game; greetings
    // and wake-up scenes remain session-intro-only. Shuffle avoids repetition.
    if (Math.random() < .75) {
      const kind = pick("lets-go-followup", letsGoFollowups);
      r.letsGoFollowup = kind;
      await wait(250); assert(r);
      await anecdote(r, kind === "funFact" || kind === "messing" ? kind : "phone", kind);
    }
  }
  function breakInteraction(type, options = {}) {
    return script(async r => {
      const types = ["wizzle", "messi", "letsGo"];
      if (!types.includes(type)) {
        const last = read("localStorage", "last-break", null);
        type = pick("break", types.filter(value => value !== last), "localStorage");
      }
      save("localStorage", "last-break", type); r.interaction = type;
      const previousMusic = currentMusic;
      const previousMode = r.musicMode;
      const action = { wizzle: wizzleBreak, messi: messiBreak, letsGo: letsGoBreak }[type];
      // Restore an optional director-owned soundtrack after temporary funny music.
      try { await restoreWide(); assert(r); await action(r, options); assert(r); return type; }
      finally {
        if (run === r && !r.stopped && previousMusic && previousMusic !== currentMusic) {
          if (previousMode === "game") startMusic("game");
          else sound(previousMusic.path, previousMusic.options);
        }
      }
    });
  }
  function champion() {
    return script(async r => {
      pose("jump"); sound(clip("sfx/kids-cheering"), { volume: .45 });
      const confetti = node("game-champion-confetti", r.stage);
      for (let i = 0; i < 22; i++) {
        const piece = node("game-confetti-piece", confetti);
        piece.style.setProperty("--game-confetti-x", `${i * 4.7}%`);
        piece.style.setProperty("--game-confetti-color", ["#ffdc4a", "#62efff", "#ff67ba", "#b8ff6a"][i % 4]);
        if (!motion.matches) void animate(piece, [{ transform: "translateY(-80px) rotate(0deg)" }, { transform: `translateY(850px) rotate(${i % 2 ? 600 : -600}deg)` }], 2600 + i * 35);
      }
      try {
        await Promise.all([comic("🏆 CHAMPION!", 1800), line(r, "level-complete/trophy-laao-bhai-mera-superstar-jeet-gaya", "jump", ["cheer", "victory"])]);
        assert(r); return true;
      } finally { confetti.remove(); }
    });
  }
  const api = Object.freeze({
    preload, unlock, mount, dispose, sync, pose, say, wait, animate, sound, startMusic, intro, feedback,
    idle, interruptVoice, comic, questionStart, breakInteraction, champion,
    catalog,
    get actor() { return run?.actor || null; },
    get stage() { return run?.stage || null; },
    get ui() { return run?.ui || null; },
    get state() { return { mounted: Boolean(run && !run.stopped), paused: run?.paused ?? environmentPaused(),
      time: run?.time || 0, pose: run?.actor.dataset.pose || null, intro: run?.intro || null,
      interaction: run?.interaction || null, wakeMethod: run?.wakeMethod || null, audio: context?.state || "unavailable",
      musicMode: run?.musicMode || null, musicTrack: run && currentMusic ? currentMusic.path : null,
      introBackdrop: Boolean(run?.introBackdrop), celebration: run?.celebration || null,
      questionStart: run?.questionStart || null,
      letsGoFollowup: run?.letsGoFollowup || null,
      wizzleVariant: run?.wizzleVariant || null, wizzleBeat: run?.wizzleBeat || null }; }
  });
  window.SparkyDirector = api;
})();