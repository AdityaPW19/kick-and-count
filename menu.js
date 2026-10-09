(() => {
  "use strict";

  const menu = document.querySelector(".menu");
  const stage = document.getElementById("stage");
  const stadium = document.querySelector(".stadium");
  const sparkyEnter = document.getElementById("sparky-enter");
  const sparky = document.getElementById("sparky");
  const footballEnter = document.getElementById("football-enter");
  const football = document.getElementById("football");
  const powerEnter = document.getElementById("power-enter");
  const titleEnter = document.getElementById("title-enter");
  const playEnter = document.getElementById("play-enter");
  const playButton = document.getElementById("play-button");
  const status = document.getElementById("menu-status");
  const loading = document.getElementById("loading");
  const gameLoader = document.getElementById("game-loader");
  const landscape = matchMedia("(orientation: landscape)");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const activeAnimations = new Set();
  let assetsReady = false;
  let started = false;
  let ready = false;
  let launching = false;

  const shouldPause = () => !landscape.matches || document.hidden;

  function startCrowdFlashes() {
    if (reducedMotion.matches || menu.classList.contains("is-celebrating")) return;
    const layer = document.createElement("div");
    layer.className = "crowd-flashes";
    layer.setAttribute("aria-hidden", "true");
    // Coordinates follow the background's cover sizing, not the contain-scaled stage.
    const seats = [];
    for (let row = 0; row < 6; row++) {
      for (let column = 0; column < 20; column++) {
        const x = 2.5 + column * 5 + Math.sin(column * 7 + row * 3) * 1.3;
        const tierY = row < 3 ? 35 + row * 4 : 55 + (row - 3) * 4;
        const curve = -5 * Math.pow((x - 50) / 50, 2);
        seats.push([x, tierY + curve + Math.cos(column * 3 + row) * 1.1]);
      }
    }
    seats.forEach(([x, y], index) => {
      const flash = document.createElement("span");
      flash.className = "crowd-flash";
      flash.style.left = `${x}%`;
      flash.style.top = `${y}%`;
      flash.style.setProperty("--flash-size", `${26 + (index * 7 % 19)}px`);
      // One shared tempo prevents phase drift and quiet patches over time.
      const cycle = 1.4;
      flash.style.setProperty("--flash-duration", `${cycle}s`);
      const phase = (index * 37 % seats.length) / seats.length;
      flash.style.setProperty("--flash-delay", `${-phase * cycle}s`);
      layer.append(flash);
    });
    menu.insertBefore(layer, stage);
    menu.classList.add("is-celebrating");
  }

  function animate(element, keyframes, options) {
    const animation = element.animate(keyframes, { fill: "forwards", ...options });
    activeAnimations.add(animation);
    if (shouldPause()) animation.pause();
    // Commit final values and remove finished effects to keep the idle menu lightweight.
    return animation.finished.then(() => {
      const lastFrame = keyframes[keyframes.length - 1];
      for (const [property, value] of Object.entries(lastFrame)) {
        if (!["offset", "easing", "composite"].includes(property)) element.style[property] = value;
      }
      activeAnimations.delete(animation);
      animation.cancel();
    });
  }

  function finishMenu() {
    ready = true;
    menu.classList.add("is-ready");
    menu.setAttribute("aria-busy", "false");
    playButton.disabled = false;
    status.textContent = "Ready to play!";
  }

  function burstKickParticles(impact = document.getElementById("impact")) {
    impact.replaceChildren();
    impact.style.opacity = "1";
    const effects = [];

    for (const [className, duration, endScale] of [
      ["impact-glow", 480, 1.45], ["impact-ring", 720, 2.5]
    ]) {
      const effect = document.createElement("span");
      effect.className = className;
      impact.append(effect);
      effects.push(animate(effect, [
        { opacity: 0, transform: "scale(.25)" },
        { opacity: 1, transform: "scale(.7)", offset: .12 },
        { opacity: 0, transform: `scale(${endScale})` }
      ], { duration, easing: "ease-out" }));
    }

    for (let index = 0; index < 32; index++) {
      const particle = document.createElement("i");
      const ember = index % 3 === 0;
      particle.className = `impact-particle${ember ? " is-ember" : index % 4 === 0 ? " is-cyan" : ""}`;
      const size = ember ? 7 + (index % 4) * 2 : 18 + (index % 5) * 5;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      // Evenly spread rays, with varied distances and a slight upward bias.
      const angle = index * Math.PI * 2 / 32;
      const distance = 100 + (index % 7) * 20;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance - 25;
      const transform = (progress, scale) =>
        `translate(${x * progress - size / 2}px, ${y * progress - size / 2}px) rotate(${index * 19 * progress}deg) scale(${scale})`;
      impact.append(particle);
      effects.push(animate(particle, [
        { opacity: 0, transform: transform(0, .2) },
        { opacity: 1, transform: transform(.2, 1.15), offset: .15 },
        { opacity: .9, transform: transform(.7, .9), offset: .6 },
        { opacity: 0, transform: transform(1, .25) }
      ], { duration: 850 + (index % 5) * 85, easing: "cubic-bezier(.16, .7, .3, 1)" }));
    }

    // Remove transient particles after the burst; keep idle rendering lightweight.
    Promise.all(effects).then(() => {
      impact.replaceChildren();
      impact.style.opacity = "0";
    });
  }

  function showFinalPose() {
    stadium.style.transform = "scale(1)";
    for (const element of [sparkyEnter, titleEnter, playEnter]) element.style.transform = "none";
    sparky.classList.add("is-kicking");
    footballEnter.style.display = "none";
    powerEnter.style.opacity = "1";
    menu.classList.add("is-contact");
    finishMenu();
  }

  async function runIntro() {
    started = true;
    loading.remove();
    if (reducedMotion.matches) {
      showFinalPose();
      return;
    }

    await animate(stadium, [{ transform: "scale(1.3)" }, { transform: "scale(1)" }], {
      duration: 500, easing: "cubic-bezier(.25, .65, .3, 1)"
    });

    await Promise.all([
      animate(sparkyEnter, [{ transform: getComputedStyle(sparkyEnter).transform }, { transform: "translateX(0)" }], {
        duration: 720, easing: "cubic-bezier(.22, .65, .3, 1)"
      }),
      animate(footballEnter, [{ transform: getComputedStyle(footballEnter).transform }, { transform: "translateX(-65px)" }], {
        duration: 900, easing: "cubic-bezier(.2, .65, .6, .85)"
      }),
      animate(football, [{ transform: "rotate(300deg)" }, { transform: "rotate(0)" }], {
        duration: 900, easing: "cubic-bezier(.2, .65, .6, .85)"
      })
    ]);

    // Sparky settles first; the ball keeps rolling into his foot without a hold.
    // Swap on contact while leaving the powered ball's final placement unchanged.
    sparky.classList.add("is-kicking");
    footballEnter.style.display = "none";
    powerEnter.style.opacity = "1";
    menu.classList.add("is-contact");
    burstKickParticles();

    await Promise.all([
      animate(titleEnter, [
        { transform: "translateY(-650px)" },
        { transform: "translateY(10px)", offset: .8 },
        { transform: "translateY(0)" }
      ], { duration: 1050, easing: "cubic-bezier(.2, .8, .25, 1)" }),
      animate(playEnter, [
        { transform: "translateY(550px)" },
        { transform: "translateY(-12px)", offset: .8 },
        { transform: "translateY(0)" }
      ], { duration: 1050, easing: "cubic-bezier(.2, .8, .25, 1)" })
    ]);
    finishMenu();
  }

  function syncViewport() {
    // Fit the reference composition without cropping on wide mobile screens.
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    const scale = Math.min(width / 1365, height / 768);
    const extraWidth = Math.max(0, (width / scale - 1365) / 2);
    stage.style.setProperty("--stage-scale", scale);
    stage.style.setProperty("--sparky-offset", `${-720 - extraWidth}px`);
    stage.style.setProperty("--football-offset", `${1050 + extraWidth}px`);
    const paused = shouldPause();
    menu.classList.toggle("is-paused", paused);
    menu.inert = !landscape.matches;
    for (const animation of activeAnimations) {
      if (paused) animation.pause();
      else if (animation.playState === "paused") animation.play();
    }
    if (assetsReady && !started && !paused) runIntro();
  }

  async function preloadAssets() {
    const sources = [
      "assets/bg/main-menu-bg.png", "assets/animations/sparky-kicking.png",
      "assets/objects/football.png", "assets/graphics/power-football.png",
      "assets/graphics/title-art.png", "assets/ui/play-button.png",
      "assets/graphics/sparky-suui.png"
    ];
    try {
      await Promise.all(sources.map(async (source) => {
        const image = new Image();
        image.src = source;
        await image.decode();
      }));
      assetsReady = true;
      syncViewport();
    } catch (error) {
      loading.textContent = "Oops! Reload to bring Sparky back.";
      console.error("Unable to load menu artwork:", error);
    }
  }

  async function performSuui() {
    sparky.classList.remove("is-kicking");
    sparky.classList.add("is-suui");
    await animate(sparky, [
      { transform: "translateY(0) scale(1)" },
      { transform: "translateY(12px) scale(1.05, .92)", offset: .25 },
      { transform: "translateY(-75px) rotate(-8deg) scale(.97, 1.04)" }
    ], { duration: 370, easing: "ease-out" });
    sparky.classList.add("is-suui-open");
    await animate(sparky, [
      { transform: "translateY(-75px) rotate(-8deg) scale(.97, 1.04)" },
      { transform: "translateY(0) rotate(0) scale(1.07, .9)", offset: .7 },
      { transform: "translateY(0) rotate(0) scale(1)" }
    ], { duration: 480, easing: "cubic-bezier(.45, 0, .65, 1)" });
    sparky.style.transform = "";
    startCrowdFlashes();
  }

  async function shrinkPlayButton() {
    await animate(playEnter, [
      { transform: "translateY(0) scale(1)", opacity: 1 },
      { transform: "translateY(0) scale(1.08)", opacity: 1, offset: .15 },
      { transform: "translateY(0) scale(0)", opacity: 0 }
    ], { duration: 340, easing: "cubic-bezier(.4, 0, .6, 1)" });
    playEnter.hidden = true;
  }

  async function revealGameLoader() {
    gameLoader.style.opacity = "0";
    gameLoader.hidden = false;
    await animate(gameLoader, [
      { opacity: 0 },
      { opacity: 1 }
    ], { duration: 320, easing: "ease-in-out" });
  }

  async function revealWhenTitleClears() {
    // Follow visible clearance, not the remaining offscreen travel of either sprite.
    while (shouldPause() || (!titleEnter.hidden &&
      titleEnter.getBoundingClientRect().left < document.documentElement.clientWidth)) {
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    await revealGameLoader();
  }

  async function launchBallAndTitle() {
    await animate(powerEnter, [
      { transform: "translate(0, 0) rotate(0)" },
      { transform: "translate(230px, -180px) rotate(-18deg)" }
    ], { duration: 430, easing: "cubic-bezier(.45, 0, .75, .6)" });
    menu.classList.add("is-title-hit");
    const titleImpact = document.createElement("div");
    titleImpact.className = "impact title-impact";
    titleImpact.setAttribute("aria-hidden", "true");
    stage.append(titleImpact);
    burstKickParticles(titleImpact);

    // Calculate exits in stage coordinates so neither sprite remains on ultrawide screens.
    const scale = Number(stage.style.getPropertyValue("--stage-scale"));
    const extraWidth = Math.max(0, (document.documentElement.clientWidth / scale - 1365) / 2);
    await Promise.all([
      animate(titleEnter, [
        { transform: "translate(0, 0) rotate(0)" },
        { transform: "translate(95px, -20px) rotate(25deg)", offset: .18 },
        { transform: `translate(${1750 + extraWidth}px, 50px) rotate(470deg)` }
      ], { duration: 1000, easing: "cubic-bezier(.35, .05, .7, .5)" }),
      animate(powerEnter, [
        { transform: "translate(230px, -180px) rotate(-18deg)", easing: "ease-out" },
        { transform: "translate(80px, -290px) rotate(-140deg)", offset: .28, easing: "cubic-bezier(.2, .6, .5, 1)" },
        { transform: `translate(${-700 - extraWidth}px, -900px) rotate(-140deg)` }
      ], { duration: 1100, easing: "linear" })
    ]);
    titleEnter.hidden = true;
    powerEnter.hidden = true;
    titleImpact.remove();
  }

  async function startPlayTransition() {
    launching = true;
    ready = false;
    playButton.disabled = true;
    menu.classList.add("is-launching");
    menu.setAttribute("aria-busy", "true");
    menu.dispatchEvent(new CustomEvent("sparky:play", { bubbles: true }));
    status.textContent = "Loading";

    if (reducedMotion.matches) {
      titleEnter.hidden = true;
      powerEnter.hidden = true;
      playEnter.hidden = true;
      sparky.classList.remove("is-kicking");
      sparky.classList.add("is-suui", "is-suui-open");
      gameLoader.hidden = false;
    } else {
      await Promise.all([
        launchBallAndTitle(), performSuui(), shrinkPlayButton(), revealWhenTitleClears()
      ]);
    }
    menu.classList.add("is-loading");
    // Hold the loader for the next game phase rather than simulating loading progress.
    menu.dispatchEvent(new CustomEvent("sparky:transition-complete", { bubbles: true }));
  }

  playButton.addEventListener("click", () => {
    if (!ready || launching || shouldPause()) return;
    startPlayTransition();
  });

  window.addEventListener("resize", syncViewport);
  landscape.addEventListener("change", syncViewport);
  document.addEventListener("visibilitychange", syncViewport);
  syncViewport();
  preloadAssets();
})();