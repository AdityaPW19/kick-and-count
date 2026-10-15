(() => {
  "use strict";

  const root = document.getElementById("game-scene");
  const frame = document.getElementById("scene-frame");
  const camera = document.getElementById("scene-camera");
  const panel = document.getElementById("quantity-display");
  const hud = document.getElementById("scene-hud");
  const pauseOverlay = document.getElementById("scene-pause-overlay");
  const pauseButton = document.getElementById("scene-pause");
  const resumeButton = document.getElementById("scene-resume");
  const status = document.getElementById("scene-status");
  const menu = document.querySelector(".menu");
  const ballZone = document.getElementById("ball-choice-zone");
  const replayBalls = document.getElementById("replay-ball-entry");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const landscape = matchMedia("(orientation: landscape)");
  const animations = new Set();
  const shots = Object.freeze({
    wide: { x: 682.5, y: 384, zoom: 1, label: "Wide shot" },
    close: { x: 390, y: 520, zoom: 1.8, label: "Sparky close-up" },
    dramatic: { x: 280, y: 478, zoom: 2.75, label: "Dramatic close-up" }
  });
  const assets = [
    "assets/bg/game-bg.png", "assets/goalpost/goalpost.png", "assets/ui/pause-cta.png",
    "assets/objects/cartoon-football.svg", "assets/objects/football.png",
    "assets/animations/sparky-sprites/emotes/sparky_proud_cocky_hand_gesture.png"
  ];
  let assetPromise;
  let entering = false;
  let active = false;
  let userPaused = false;
  let shot = "wide";
  let cameraAnimation;
  let previousFocus;
  let ballEntrancePromise;
  let ballCount = 3;
  let introPlaying = false;
  let tutorialPending = false;
  const display = { count: 4, width: 420, variant: "count" };

  const paused = () => userPaused || document.hidden || !landscape.matches;
  const transformFor = ({ x, y, zoom }) =>
    `translate(${682.5 - x * zoom}px, ${384 - y * zoom}px) scale(${zoom})`;

  function syncEnvironment() {
    const scale = Math.min(
      document.documentElement.clientWidth / 1365, document.documentElement.clientHeight / 768
    );
    frame.style.setProperty("--scene-scale", scale);
    frame.style.setProperty("--scene-gutter", `${Math.max(0, (document.documentElement.clientWidth / scale - 1365) / 2)}px`);
    const stopped = paused();
    root.classList.toggle("is-scene-paused", stopped);
    hud.inert = userPaused || !landscape.matches;
    for (const animation of animations) {
      if (stopped) animation.pause();
      else if (animation.playState === "paused") animation.play();
    }
    window.SparkyIntro?.sync();
  }

  async function tween(element, frames, duration = 650, extra = {}) {
    const animation = element.animate(frames, {
      duration: motion.matches ? 0 : duration, fill: "forwards",
      easing: "cubic-bezier(.22, .75, .2, 1)", ...extra
    });
    animations.add(animation);
    if (paused()) animation.pause();
    try {
      await animation.finished;
      const final = frames[frames.length - 1];
      for (const key of ["opacity", "transform"]) if (key in final) element.style[key] = final[key];
      return true;
    } catch {
      // Replacing a shot mid-flight is an expected cancellation.
      return false;
    } finally {
      animations.delete(animation);
      animation.cancel();
    }
  }

  function preload() {
    if (!assetPromise) {
      assetPromise = Promise.all(assets.map(async source => {
        const image = new Image();
        image.src = source;
        await image.decode();
      })).catch(error => { assetPromise = undefined; throw error; });
    }
    return assetPromise;
  }

  // All geometry is rebuilt at its real dimensions. Corners, trim and ball sizes
  // stay constant; no PNG stretching or nonuniform SVG scaling is involved.
  function setDisplay(options = {}) {
    if (options.count !== undefined) display.count = Math.max(1, Math.min(20, Math.round(Number(options.count) || 1)));
    if (options.width !== undefined) display.width = Math.max(300, Math.min(620, Number(options.width) || 420));
    if (["count", "message", "celebrate"].includes(options.variant)) display.variant = options.variant;
    const { count, width, variant } = display;
    const columns = Math.max(1, Math.floor((width - 70) / 55));
    const rows = Math.ceil(count / columns);
    const rowPitch = rows > 2 ? Math.floor(150 / rows) : 54;
    const ballSize = rowPitch - 11;
    const height = variant === "count" ? 82 + rows * rowPitch : variant === "message" ? 150 : 174;
    const accent = variant === "celebrate" ? "#ffd363" : variant === "message" ? "#b0a4ff" : "#71edee";
    let content = "";
    if (variant === "count") {
      for (let index = 0; index < count; index++) {
        const row = Math.floor(index / columns);
        const items = Math.min(columns, count - row * columns);
        const x = width / 2 - items * 55 / 2 + (index % columns) * 55 + (55 - ballSize) / 2;
        content += `<image class="panel-ball" style="--ball-index:${index}" href="assets/objects/cartoon-football.svg" x="${x}" y="${61 + row * rowPitch}" width="${ballSize}" height="${ballSize}"/>`;
      }
    } else {
      content = variant === "message"
        ? `<text x="${width / 2}" y="89" font-size="24" fill="#fff" font-weight="900">READY TO KICK?</text><text x="${width / 2}" y="115" font-size="13" fill="#c5d9ef">Space for prompts &amp; story beats</text>`
        : `<text x="${width / 2}" y="100" font-size="38" fill="#ffdf79" font-weight="900">GOOOAL!</text><text x="${width / 2}" y="132" font-size="14" fill="#f7edbd">A little room for a big celebration</text>`;
    }
    panel.style.width = `${width}px`;
    panel.style.height = `${height}px`;
    panel.style.left = `${682.5 - width / 2}px`;
    panel.setAttribute("aria-label", variant === "count" ? `${count} football${count === 1 ? "" : "s"} on the quantity display` : variant === "message" ? "Ready to kick?" : "Goal celebration display");
    panel.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true">
      <defs>
        <linearGradient id="board-rim" x2="0" y2="1"><stop stop-color="#eefcff"/><stop offset=".5" stop-color="#74a5c2"/><stop offset="1" stop-color="#d7eeef"/></linearGradient>
        <linearGradient id="board-face" x2="0" y2="1"><stop stop-color="#173d66"/><stop offset="1" stop-color="#081c37"/></linearGradient>
        <pattern id="board-dots" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r=".8" fill="#a8d8f4" opacity=".12"/></pattern>
      </defs>
      <rect x="${width * .25}" y="${height - 10}" width="12" height="26" rx="3" fill="#244e69"/>
      <rect x="${width * .75 - 12}" y="${height - 10}" width="12" height="26" rx="3" fill="#244e69"/>
      <rect x="2" y="2" width="${width - 4}" height="${height - 6}" rx="25" fill="#092947" stroke="#063057" stroke-width="4"/>
      <rect x="5" y="4" width="${width - 10}" height="${height - 12}" rx="22" fill="url(#board-rim)"/>
      <rect x="12" y="11" width="${width - 24}" height="${height - 26}" rx="16" fill="url(#board-face)" stroke="${accent}" stroke-width="2"/>
      <rect x="15" y="14" width="${width - 30}" height="${height - 32}" rx="14" fill="url(#board-dots)"/>
      <g text-anchor="middle" font-family="Fredoka, system-ui, sans-serif">
        <text x="${width / 2}" y="40" font-size="11" font-weight="900" letter-spacing="3" fill="${accent}">${variant === "count" ? "COUNT THE FOOTBALLS" : variant === "message" ? "COACH’S CORNER" : "SUPER KICK"}</text>
        ${content}
      </g>
    </svg>`;
    document.getElementById("display-count").value = count;
    document.getElementById("count-output").value = count;
    document.getElementById("display-width").value = width;
    document.getElementById("width-output").value = width;
    document.querySelectorAll("[data-display]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.display === variant)));
    root.dispatchEvent(new CustomEvent("sparky:display-change", { detail: { ...display, height }, bubbles: true }));
    return { ...display, height };
  }

  async function setShot(name = "wide", { instant = false } = {}) {
    if (!shots[name]) throw new RangeError(`Unknown shot: ${name}`);
    const current = getComputedStyle(camera).transform;
    if (cameraAnimation) cameraAnimation.cancel();
    shot = name;
    document.getElementById("shot-label").textContent = shots[name].label.toUpperCase();
    document.querySelectorAll("[data-shot]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.shot === name)));
    // Capture the visible matrix before replacing an in-flight shot to avoid snapping.
    const frames = [{ transform: current === "none" ? transformFor(shots.wide) : current }, { transform: transformFor(shots[name]) }];
    const finished = tween(camera, frames, instant ? 0 : name === "dramatic" ? 950 : 1050);
    cameraAnimation = camera.getAnimations()[0];
    const completed = await finished;
    if (completed) root.dispatchEvent(new CustomEvent("sparky:shot-change", { detail: { shot: name }, bubbles: true }));
    return completed;
  }

  function setPaused(value) {
    if (!active) return;
    userPaused = Boolean(value);
    if (userPaused) previousFocus = document.activeElement;
    pauseOverlay.hidden = !userPaused;
    syncEnvironment();
    if (userPaused) resumeButton.focus();
    else if (previousFocus?.isConnected) previousFocus.focus();
    status.textContent = userPaused ? "Paused" : "Back on the pitch";
  }

  function spawnBalls(count = 3) {
    if (introPlaying) return Promise.resolve(false);
    if (ballEntrancePromise) return ballEntrancePromise;
    ballCount = Math.max(3, Math.min(6, Math.round(Number(count) || 3)));
    document.getElementById("test-ball-count").value = ballCount;
    document.getElementById("ball-count-output").value = ballCount;
    replayBalls.disabled = true;
    ballEntrancePromise = (async () => {
      // The first four slots stay centered on the goal. Extra slots extend right.
      if (shot !== "wide") await setShot("wide");
      ballZone.replaceChildren();
      const scale = Number(frame.style.getPropertyValue("--scene-scale"));
      const gutter = Math.max(0, (document.documentElement.clientWidth / scale - 1365) / 2);
      const pitch = 140;
      const startX = 682.5 - ((Math.min(ballCount, 4) - 1) * pitch) / 2 - 54;
      const arrivals = [];
      for (let index = 0; index < ballCount; index++) {
        const x = startX + index * pitch;
        const ball = document.createElement("div");
        ball.className = "choice-ball";
        ball.style.left = `${x - 410}px`;
        ball.setAttribute("role", "img");
        ball.setAttribute("aria-label", `Test football ${index + 1}`);
        const shadow = document.createElement("div");
        shadow.className = "choice-ball-shadow";
        const body = document.createElement("div");
        body.className = "choice-ball-body";
        const image = document.createElement("img");
        image.src = "assets/objects/football.png";
        image.alt = "";
        image.draggable = false;
        body.append(image);
        ball.append(shadow, body);
        ballZone.append(ball);
        const from = 1450 + gutter - x;
        const delay = motion.matches ? 0 : index * 170;
        const duration = 1450 + (index % 3) * 70;
        // Travel, bounces, spin and contact shadow are separate so squash never
        // rotates the ground plane. Per-segment easing approximates gravity.
        arrivals.push(
          tween(ball, [
            { transform: `translateX(${from}px)` },
            { transform: "translateX(-14px)", offset: .74 },
            { transform: "translateX(5px)", offset: .9 },
            { transform: "translateX(0)" }
          ], duration, { delay, fill: "both", easing: "cubic-bezier(.15, .55, .3, 1)" }),
          tween(body, [
            { transform: "translateY(-100px) scale(.94, 1.06)", easing: "ease-in" },
            { transform: "translateY(0) scale(1.2, .8)", offset: .25, easing: "ease-out" },
            { transform: `translateY(${-64 - index % 3 * 9}px) scale(.94, 1.06)`, offset: .43, easing: "ease-in" },
            { transform: "translateY(0) scale(1.13, .87)", offset: .61, easing: "ease-out" },
            { transform: "translateY(-24px) scale(.98, 1.02)", offset: .74, easing: "ease-in" },
            { transform: "translateY(0) scale(1.07, .93)", offset: .85, easing: "ease-out" },
            { transform: "translateY(-6px) scale(.99, 1.01)", offset: .92 },
            { transform: "translateY(0) scale(1)" }
          ], duration, { delay, fill: "both", easing: "linear" }),
          tween(image, [
            { transform: `rotate(${550 + index * 55}deg)` },
            { transform: "rotate(-12deg)", offset: .8 },
            { transform: "rotate(4deg)", offset: .93 },
            { transform: "rotate(0)" }
          ], duration, { delay, fill: "both", easing: "cubic-bezier(.15, .55, .3, 1)" }),
          tween(shadow, [
            { opacity: .2, transform: "scale(.5)" },
            { opacity: .8, transform: "scale(1.12)", offset: .25 },
            { opacity: .3, transform: "scale(.65)", offset: .43 },
            { opacity: .8, transform: "scale(1.06)", offset: .61 },
            { opacity: .5, transform: "scale(.8)", offset: .74 },
            { opacity: .8, transform: "scale(1)" }
          ], duration, { delay, fill: "both", easing: "linear" })
        );
      }
      await Promise.all(arrivals);
      status.textContent = `${ballCount} test footballs ready.`;
      root.dispatchEvent(new CustomEvent("sparky:balls-ready", { detail: { count: ballCount }, bubbles: true }));
    })().finally(() => { ballEntrancePromise = undefined; replayBalls.disabled = false; });
    return ballEntrancePromise;
  }

  async function enter() {
    if (entering || active) return;
    entering = true;
    try {
      await preload();
      active = true;
      const mode = new URLSearchParams(location.search).get("scene");
      const preview = mode === "game";
      const showIntro = !preview && (mode === "intro" || !window.SparkyIntro?.seen);
      introPlaying = showIntro;
      if (!preview) root.classList.add(showIntro ? "intro-running" : "tutorial-pending");
      setDisplay();
      camera.style.transform = transformFor(shots.wide);
      root.style.opacity = "0";
      root.hidden = false;
      syncEnvironment();
      await Promise.all([
        tween(root, [{ opacity: 0 }, { opacity: 1 }], 650, { easing: "ease-in-out" }),
        tween(document.querySelector(".goal-zone"), [{ opacity: 0, transform: "translateY(18px)" }, { opacity: 1, transform: "translateY(0)" }], 750),
        tween(panel, [{ opacity: 0, transform: "translateY(-15px)" }, { opacity: 1, transform: "translateY(0)" }], 800),
        tween(document.getElementById("scene-sparky"), [{ opacity: 0, transform: "translateX(-25px)" }, { opacity: 1, transform: "translateX(0)" }], 850)
      ]);
      menu.hidden = true;
      menu.inert = true;
      status.textContent = "Scene preview ready. Open Scene lab to test camera shots and the display.";
      root.dispatchEvent(new CustomEvent("sparky:scene-ready", { bubbles: true }));
      if (preview) await spawnBalls(3);
      else {
        if (showIntro) await window.SparkyIntro.play();
        introPlaying = false;
        tutorialPending = true;
        root.classList.remove("intro-running");
        root.classList.add("tutorial-pending");
        status.textContent = "Ready for the tutorial. Tutorial sequence will be added next.";
        root.dispatchEvent(new CustomEvent("sparky:tutorial-ready", { bubbles: true }));
      }
    } catch (error) {
      const message = document.createElement("button");
      message.className = "scene-error";
      message.textContent = "The pitch could not load. Tap to retry.";
      message.addEventListener("click", () => { message.remove(); enter(); }, { once: true });
      document.body.append(message);
      console.error("Scene initialization failed:", error);
    } finally {
      entering = false;
    }
  }

  document.addEventListener("sparky:play", () => { preload().catch(() => {}); });
  document.addEventListener("sparky:transition-complete", enter);
  pauseButton.addEventListener("click", () => setPaused(true));
  resumeButton.addEventListener("click", () => setPaused(false));
  document.getElementById("scene-wide").addEventListener("click", () => { setPaused(false); setShot("wide"); });
  document.getElementById("lab-toggle").addEventListener("click", event => {
    const controls = document.getElementById("lab-controls");
    controls.hidden = !controls.hidden;
    event.currentTarget.setAttribute("aria-expanded", String(!controls.hidden));
  });
  document.querySelectorAll("[data-shot]").forEach(button => button.addEventListener("click", () => setShot(button.dataset.shot)));
  document.querySelectorAll("[data-display]").forEach(button => button.addEventListener("click", () => setDisplay({ variant: button.dataset.display })));
  document.getElementById("display-count").addEventListener("input", event => setDisplay({ count: event.target.value, variant: "count" }));
  document.getElementById("display-width").addEventListener("input", event => setDisplay({ width: event.target.value }));
  document.getElementById("show-zones").addEventListener("change", event => root.classList.toggle("show-zones", event.target.checked));
  document.getElementById("test-ball-count").addEventListener("input", event => {
    document.getElementById("ball-count-output").value = event.target.value;
  });
  replayBalls.addEventListener("click", () => spawnBalls(document.getElementById("test-ball-count").value));
  document.addEventListener("keydown", event => {
    if (!active || !landscape.matches) return;
    if (event.key === "Escape") { event.preventDefault(); setPaused(!userPaused); }
    if (event.key === "Tab" && userPaused) {
      const buttons = [...pauseOverlay.querySelectorAll("button")];
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener("resize", syncEnvironment);
  document.addEventListener("visibilitychange", syncEnvironment);
  landscape.addEventListener("change", syncEnvironment);
  syncEnvironment();

  // Public scene primitives for later cutscenes; no tutorial or game rules yet.
  window.SparkyScene = Object.freeze({
    enter, preload, setShot, setDisplay, setPaused, spawnBalls,
    get state() { return { active, shot, paused: paused(), display: { ...display }, ballCount, ballsEntering: Boolean(ballEntrancePromise), introPlaying, tutorialPending }; }
  });
  if (["game", "intro"].includes(new URLSearchParams(location.search).get("scene"))) enter();
})();