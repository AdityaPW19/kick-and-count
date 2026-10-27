(() => {
  "use strict";

  // Descriptor-only lesson. Host owns preload, routing after nextphase2break,
  // active-time clocks, shared input/goal/finale, and completion. No gameplay.
  const base = "assets/animations/sparky-sprites/";
  const poses = Object.freeze({
    beforeNo: base + "emotes/sparky-saying-no.png",
    beforeLaugh: base + "emotes/sparky-laughing.png",
    beforeCocky: base + "emotes/sparky_cocky.png",
    beforeTalk: base + "emotes/sparky-talking.png",
    beforeCheck: base + "emotes/sparky-confused2.png",
    beforeYawn: base + "emotes/sparky_yawning.png"
  });
  const names = [
    "ab-balls-laao",
    "ab-dekho-upar-vo-nine-dikh-raha-hai",
    "ab-niche-dekho-vo-10-dikh-raha-hai",
    "ab-usse-hame-kick-nahi-karna",
    "are-vo-nahi-aa-raha-aaj-phir-bhi-done-kr-do",
    "badhiya-ab-aese-hi-previous-numbers-wale-balls-tumhe-kick-krne-hain",
    "bore-ho-gaye-kya-aage-badhte-badhte",
    "ek-step-piche-chala-jaae",
    "hehe-dikh-raha-hai-na",
    "iss-exercise-me-kick-krna-hai-previous-number-wali-balls",
    "its-done-bro",
    "jaise-ham-sunday-ko-homework-ko-karte-hain",
    "nice",
    "number-laao",
    "pehla-goal-sparky-bhai-ke-naam",
    "ronaldo",
    "to-batao-nine-ke-pehle-kya-aata-hai",
    "to-chalo-ek-step-piche-chala-jae",
    "usse-hame-krna-hai-IGNORE",
    "yaad-hai-start-me-kya-kaha-tha-maine"
  ];
  // Relative to the game document, also supporting subdirectory deployments.
  const clips = Object.freeze({
    ...Object.fromEntries(names.map(name => [`before-${name}`, `assets/audio/previous-number-tutorial/${name}.mp3`])),
    error: "assets/audio/sfx/error.mp3",
    crickets: "assets/audio/sfx/crickets.mp3",
    introMusic: "assets/audio/music/intro.mp3",
    lava: "assets/audio/music/lava-chicken.mp3"
  });
  const cross = `<svg class="before-cross" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><path class="before-cross-rim" d="M25 25 95 95M95 25 25 95"/><path d="M25 25 95 95M95 25 25 95"/></svg>`;
  // Original vector notebook, not an invented external illustration or emoji.
  const notebook = `<div class="before-notebook" role="img" aria-label="No homework on Sunday! A crossed-out homework notebook.">
    <svg viewBox="0 0 600 530" aria-hidden="true" focusable="false">
      <path d="m105 79 375-24 33 390-375 25Z" fill="#14314e" opacity=".22"/>
      <g transform="rotate(-6 300 250)">
        <rect x="89" y="50" width="402" height="408" rx="23" fill="#ffbe52" stroke="#152e50" stroke-width="9"/>
        <rect x="112" y="39" width="355" height="396" rx="16" fill="#fffdf1" stroke="#152e50" stroke-width="7"/>
        <path d="M170 49v373" stroke="#ff859c" stroke-width="3"/>
        <path d="M125 150h327M125 191h327M125 232h327M125 273h327M125 314h327M125 355h327M125 396h327" stroke="#acd6ee" stroke-width="3"/>
        <path d="M101 83h35M101 130h35M101 177h35M101 224h35M101 271h35M101 318h35M101 365h35" stroke="#152e50" stroke-width="12" stroke-linecap="round"/>
        <text x="305" y="112" text-anchor="middle" fill="#214b6d" font-family="Fredoka, sans-serif" font-size="24" font-weight="600">SUNDAY</text>
        <text x="305" y="225" text-anchor="middle" fill="#152e50" font-family="Bangers, Impact, sans-serif" font-size="53">HOMEWORK</text>
        <path d="m190 168 233 106m-6-110L192 276" fill="none" stroke="#fffdf1" stroke-width="27" stroke-linecap="round"/>
        <path d="m190 168 233 106m-6-110L192 276" fill="none" stroke="#ef4165" stroke-width="15" stroke-linecap="round"/>
        <path d="m246 352 25 25 57-65" fill="none" stroke="#12a48f" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <g transform="rotate(13 489 329)"><path d="M477 186h24v208l-12 32-12-32Z" fill="#ffd55d" stroke="#152e50" stroke-width="5"/><path d="M477 207h24M489 211v174" stroke="#eaa13e" stroke-width="5"/><path d="m484 414 5 12 5-12" fill="#152e50"/></g>
      <path d="m62 128-23-12m36-23-6-26m461 49 23-17m-17 53 30-2" stroke="#fff9c5" stroke-width="9" stroke-linecap="round"/>
    </svg><strong>No homework<br>on Sunday!</strong></div>`;

  async function story(api) {
    const state = api.state;
    api.assertActive(state);
    const { actor, stage, ui } = state;
    const { root, board, zone, scene } = api;
    const owned = new Set(), effects = new Set();
    let cutaway = null;
    const live = () => api.state === state && !state.stopped;
    const check = () => api.assertActive(state);
    const key = name => `before-${name}`;
    const length = name => Math.max(0, Number(api.duration(key(name))) || 0);
    const make = (className, html, parent = stage) => {
      check(); const node = document.createElement("div"); owned.add(node);
      node.className = className; node.innerHTML = html; parent.append(node); return node;
    };
    // Parallel, active-clock edits at fractions of the actual decoded voice.
    const timed = (name, edits) => Promise.all(edits.map(async ([fraction, action]) => {
      await api.wait(length(name) * fraction); check(); await action(); check();
    }));
    async function line(name, text, pose, edits = []) {
      check(); if (pose) api.pose(pose);
      await api.say(key(name), text, () => timed(name, edits)); check();
    }
    async function shot(name) { check(); await scene.setShot(name); check(); }
    function effect(name, options) {
      check(); const handle = api.sound(name, options); if (handle) effects.add(handle); return handle;
    }
    async function flash(node, className, action) {
      check(); node.classList.add(className);
      try { await action(); check(); } finally { if (live()) node.classList.remove(className); }
    }
    const pop = node => api.animate(node, [
      { opacity: 0, transform: "translateY(65px) scale(.65) rotate(-9deg)" },
      { opacity: 1, transform: "translateY(-8px) scale(1.05) rotate(3deg)", offset: .78 },
      { opacity: 1, transform: "translateY(0) scale(1) rotate(-2deg)" }
    ], 420);
    const bounce = node => api.animate(node, [
      { transform: "translateY(0) scale(1)" },
      { transform: "translateY(-30px) scale(1.12)", offset: .42 },
      { transform: "translateY(0) scale(1)" }
    ], 580);
    function frame(kind = "hero") {
      check(); actor.classList.remove("before-coach-hero", "before-coach-close", "before-coach-medium");
      actor.classList.add(`before-coach-${kind}`); actor.style.transform = "none"; actor.style.opacity = "1";
    }
    const push = (name, scale = 1.045) => api.animate(actor, [
      { transform: actor.style.transform || "none" },
      { transform: `translate(9px,-7px) scale(${scale})` }
    ], length(name) * .9, { easing: "linear" });
    async function enterCutaway(movie, kind = "hero") {
      check();
      const mount = () => {
        if (!cutaway) {
          cutaway = {
            parent: actor.parentNode, next: actor.nextSibling, style: actor.getAttribute("style"),
            movie: state.montageMovie, cinematic: root.classList.contains("tutorial-cinematic"),
            cinemaStyle: state.cinema.getAttribute("style")
          };
          stage.append(actor); actor.classList.add("before-coach");
        }
        frame(kind); ui.classList.add("before-cutaway");
        root.classList.add("tutorial-cinematic");
      };
      if (api.transitionCoach) {
        await api.transitionCoach(mount, { movie }); check();
        return;
      }
      mount();
      await api.cinema(movie); check();
      state.montageMovie = state.nextVideos?.has(movie) ? movie : null;
      api.sync();
    }
    function restoreCoach() {
      if (!cutaway || !live()) return;
      const saved = cutaway; cutaway = null;
      actor.classList.remove("before-coach", "before-coach-hero", "before-coach-close", "before-coach-medium");
      if (saved.next?.parentNode === saved.parent) saved.parent.insertBefore(actor, saved.next);
      else saved.parent.append(actor);
      if (saved.style === null) actor.removeAttribute("style"); else actor.setAttribute("style", saved.style);
      if (saved.cinemaStyle === null) state.cinema.removeAttribute("style"); else state.cinema.setAttribute("style", saved.cinemaStyle);
      state.montageMovie = saved.movie;
      root.classList.toggle("tutorial-cinematic", saved.cinematic);
      ui.classList.remove("before-cutaway"); api.sync();
    }
    async function leaveCutaway(destination = "wide") {
      if (api.transitionCoach) {
        await api.transitionCoach(restoreCoach, { field: true, shot: destination }); check();
        return;
      }
      check(); await api.animate(state.cinema, [{ opacity: 1 }, { opacity: 0 }], 300); check();
      restoreCoach(); api.sync();
    }
    async function splash(html) { check(); await api.comic(html); check(); }
    async function hideSplash() { check(); await api.hideComic(); check(); }
    const balls = () => [...zone.querySelectorAll(".choice-ball")];
    const ball = number => zone.querySelector(`.choice-ball[data-number="${number}"]`);
    const oldZoneLabel = zone.getAttribute("aria-label");
    ui.classList.add("before-lesson");
    const cta = ui.querySelector(".tutorial-lets-go");
    if (cta) cta.hidden = true;
    try {
      zone.setAttribute("aria-label", "What comes before 9? Choose 8.");
      root.classList.remove("tutorial-board-visible", "tutorial-balls-visible");
      api.startMusic("introMusic");
      scene.setDisplay({ variant: "number", number: null, width: 420 });
      api.pose("beforeYawn");
      await shot("close");
      await line("bore-ho-gaye-kya-aage-badhte-badhte", "Bore ho gaye kya, aage badhte badhte?", "beforeYawn", [
        [0, () => push("bore-ho-gaye-kya-aage-badhte-badhte")],
        [.35, () => api.pose("thinking")], [.72, () => api.pose("beforeTalk")]
      ]);
      await line("to-chalo-ek-step-piche-chala-jae", "Toh chalo, ek step peeche chala jaaye!", "idea", [
        [.14, () => shot("wide")], [.62, () => api.pose("summon")]
      ]);
      await api.animate(actor, [{ transform: actor.style.transform || "none" }, { transform: "none" }], 280); check();
      await line("number-laao", "Number laao!", "up", [[.32, async () => {
        scene.setDisplay({ variant: "number", number: 9, width: 420 });
        root.classList.add("tutorial-board-visible"); effect("displayPop", { volume: .5 });
        await api.animate(board, [
          { opacity: 0, transform: "translateY(-175px) scale(.85)" },
          { opacity: 1, transform: "translateY(12px) scale(1.04)", offset: .78 },
          { opacity: 1, transform: "translateY(0) scale(1)" }
        ], 750);
      }]]);
      await line("ab-balls-laao", "Ab balls laao!", "summon", [[.28, async () => {
        root.classList.add("tutorial-balls-visible");
        const arrival = scene.spawnBalls(3, { onBounce: ({ bounce: index }) => {
          if (live()) effect("bounce", { volume: [.3, .2, .12, .06][index] ?? .06 });
        } });
        // The completed wide shot makes shared spawn synchronous until entrance
        // animations await. Preserve its body and decoded football image.
        for (const [i, node] of balls().entries()) {
          node.dataset.number = String([8, 10, 11][i]);
          node.setAttribute("aria-label", `Football number ${node.dataset.number}`);
          const label = document.createElement("span"); owned.add(label);
          label.className = "tutorial-ball-number"; label.textContent = node.dataset.number;
          label.style.setProperty("--number-color", ["#1554ed", "#ef2446", "#079c36"][i]);
          node.querySelector(".choice-ball-body").append(label);
        }
        await arrival; check();
      }]]);
      api.pose("proud"); await api.say("normal", "Normal… haan!"); check();
      await flash(board, "before-board-flash", () => line("ab-dekho-upar-vo-nine-dikh-raha-hai", "Ab dekho upar, woh nine dikh raha hai?", "up", [
        [.15, () => bounce(board)], [.7, () => api.pose("thumbs")]
      ]));
      await line("nice", "Nice!", "thumbs");
      await flash(ball(10), "before-ball-flash", () => line("ab-niche-dekho-vo-10-dikh-raha-hai", "Ab neeche dekho, woh ten dikh raha hai?", "down", [[.22, () => bounce(ball(10))]]));
      await line("hehe-dikh-raha-hai-na", "Hehe, dikh raha hai na?", "down", [
        [0, () => api.startMusic("lava")], [.45, () => api.pose("beforeLaugh")]
      ]);
      let crossNode;
      await line("ab-usse-hame-kick-nahi-karna", "Ab usse hamein kick NAHI karna!", "beforeNo", [
        [.25, async () => {
          crossNode = make("before-ball-cross", cross, ball(10));
          const error = effect("error", { volume: .3 });
          await Promise.all([pop(crossNode), (async () => { await api.wait(280); check(); error?.stop(); })()]);
        }], [.75, () => api.pose("beforeNo")]
      ]);
      // IGNORE is the emphatic spoken word in this supplied audio, not a cue to
      // skip it. Its splash lands late in the actual decoded voice duration.
      await enterCutaway("comic-multi-shapes-bg");
      await line("usse-hame-krna-hai-IGNORE", "Usse hamein karna hai… IGNORE!", "beforeCocky", [
        [0, () => push("usse-hame-krna-hai-IGNORE")],
        [.3, () => api.pose("beforeNo")],
        [.7, () => { api.pose("beforeLaugh"); return splash("<span class=\"before-ignore\">IGNORE!</span>"); }]
      ]);
      await hideSplash(); crossNode?.remove();
      const homework = make("before-homework-panel", notebook);
      await line("jaise-ham-sunday-ko-homework-ko-karte-hain", "Jaise hum Sunday ko homework ko karte hain!", "beforeLaugh", [
        [0, () => Promise.all([pop(homework), push("jaise-ham-sunday-ko-homework-ko-karte-hain")])],
        [.3, () => api.pose("beforeCocky")],
        [.57, () => { api.pose("beforeNo"); return bounce(homework); }],
        [.8, () => api.pose("down")]
      ]);
      await api.animate(homework, [{ opacity: 1, transform: "translateX(0) rotate(-2deg)" }, { opacity: 0, transform: "translateX(700px) rotate(14deg)" }], 350); check(); homework.remove();
      await leaveCutaway("close");
      // Never rebuild the board/balls for the cutaway: these are the original
      // nine and the same retained 8 / 10 / 11 choices, not a new question.
      await line("yaad-hai-start-me-kya-kaha-tha-maine", "Yaad hai, start mein kya kaha tha maine?", "thinking", [
        [.4, () => api.pose("self")], [.76, () => api.pose("idea")]
      ]);
      await line("ek-step-piche-chala-jaae", "Ek step peeche chala jaaye!", "beforeTalk", [[.55, () => api.pose("down")]]);
      await enterCutaway("comic-book-speed-line-blue", "close");
      const instruction = make("before-previous-panel", `<span class="before-panel-kicker">ONE STEP BEFORE</span><div class="before-number-pair"><b class="before-answer">8</b><svg viewBox="0 0 150 90" aria-hidden="true" focusable="false"><path d="M135 45H18m40-31L18 45l40 31"/></svg><b>9</b></div><strong>Previous number!</strong>`);
      await line("iss-exercise-me-kick-krna-hai-previous-number-wali-balls", "Iss exercise mein previous number wali balls kick karni hain!", "down", [
        [0, () => Promise.all([pop(instruction), push("iss-exercise-me-kick-krna-hai-previous-number-wali-balls", 1.06)])],
        [.32, () => api.pose("up")],
        [.61, () => { api.pose("down"); return bounce(instruction.querySelector(".before-answer")); }],
        [.85, () => api.pose("fist")]
      ]);
      instruction.remove(); await leaveCutaway("wide");
      await line("to-batao-nine-ke-pehle-kya-aata-hai", "Toh batao, nine ke pehle kya aata hai?", "down", [
        [.23, () => bounce(board)], [.64, () => api.pose("thinking")]
      ]);
      const hint = make("before-field-hint", "Look · Before · Kick");
      api.pose("down"); await api.choose(); check(); hint.remove();
      await api.goal({ myKick: key("pehla-goal-sparky-bhai-ke-naam"), answer: 8, boardAnswer: 8, goalLabel: "9 → 8" }); check();

      await enterCutaway("reveal");
      api.confetti();
      await line("badhiya-ab-aese-hi-previous-numbers-wale-balls-tumhe-kick-krne-hain", "Badhiya! Ab aise hi previous number wali balls tumhe kick karni hain!", "victory", [
        [0, () => Promise.all([splash("LOOK.<br>BEFORE.<br><em>KICK!</em>"), push("badhiya-ab-aese-hi-previous-numbers-wale-balls-tumhe-kick-krne-hain")])],
        [.33, () => api.pose("down")], [.62, () => api.pose("thumbs")], [.84, () => api.pose("yay")]
      ]);
      await hideSplash();
      await enterCutaway("comic-intro-bg", "close");
      await line("ronaldo", "RONALDO!", "victory", [
        [0, () => Promise.all([splash("<span class=\"before-ronaldo\">RONALDO!</span>"), push("ronaldo", 1.08)])]
      ]);
      await hideSplash();
      let doneCrickets;
      await line("its-done-bro", "It’s done, bro!", "beforeCocky", [[0, () => {
        doneCrickets = effect("crickets", { volume: .16, loop: false });
        return splash("IT’S<br><em>DONE BRO!</em>");
      }]]);
      doneCrickets?.stop();
      await hideSplash();
      // Stop the owner, not merely its gain: this is intentionally real silence.
      api.stopMusic();
      frame("medium"); api.pose("beforeCheck"); actor.classList.add("before-offscreen-look");
      ui.querySelector(".tutorial-confetti")?.replaceChildren();
      api.beat("before-silence");
      await Promise.all([
        api.animate(actor, [{ transform: "translate(45px,35px) scale(1.3)" }, { transform: "translate(0,0) scale(1)" }], 450),
        api.wait(1400)
      ]); check();
      // No comic text/speech or cricket loop over the first ~1.4 seconds.
      actor.classList.remove("before-offscreen-look"); api.pose("annoyed"); api.beat("before-deadpan");
      const cricket = effect("crickets", { volume: .12, loop: false });
      await api.wait(380); check(); cricket?.stop();
      api.startMusic("lava");
      await line("are-vo-nahi-aa-raha-aaj-phir-bhi-done-kr-do", "Arey, woh nahi aa raha aaj… phir bhi Done kar do!", "shy", [
        [0, () => push("are-vo-nahi-aa-raha-aaj-phir-bhi-done-kr-do", 1.025)],
        [.38, () => api.pose("self")], [.72, () => api.pose("down")]
      ]);
      // Host's established pass -> Sparky kick -> screen wipe. No persistence,
      // completion dispatch or next-mode/gameplay routing belongs to this module.
      // Keep all field props hidden BEFORE reparenting out of the comic. The
      // restored saved scene must never peek through between this line and Done.
      root.classList.add("tutorial-finale");
      if (api.transitionCoach) {
        await api.transitionCoach(() => {
          restoreCoach(); root.classList.add("tutorial-cinematic");
        }, { movie: "reveal" });
      } else restoreCoach();
      await api.animate(actor, [{ transform: actor.style.transform || "none" }, { transform: "translate(70px,-25px) scale(1.18)" }], 350); check();
      return await api.finale({ label: "Done!" });
    } finally {
      for (const handle of effects) handle.stop?.();
      for (const node of owned) node.remove();
      actor.classList.remove("before-offscreen-look");
      // Never reattach a disposed actor or touch a replacement run's shared root.
      if (live()) {
        restoreCoach(); ui.classList.remove("before-lesson", "before-cutaway");
        board.classList.remove("before-board-flash");
        for (const node of balls()) node.classList.remove("before-ball-flash");
        if (oldZoneLabel === null) zone.removeAttribute("aria-label"); else zone.setAttribute("aria-label", oldZoneLabel);
        api.stopMusic();
      }
    }
  }

  window.SparkyBeforeLesson = Object.freeze({ poses, clips, story });
})();