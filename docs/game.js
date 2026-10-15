/* ==========================================================
   HORTA LIMPA — jogo de horta isométrica no modelo do Stardew Valley
   (JavaScript puro, Canvas 2D). Áreas: fazenda do José e vila.
   ========================================================== */
(() => {
  "use strict";

  const app = document.getElementById("app");
  const modalEl = document.getElementById("modal");
  const dayfxEl = document.getElementById("dayfx");
  const toastEl = document.getElementById("toast");

  /* ---------- mundo ---------- */
  const N = 8;                     // cada área tem 8 x 8 tiles
  const TW = 80, TH = 40;          // tamanho do losango
  const WW = 680, WH = 470;        // tamanho do mundo (coordenadas do desenho)
  const OX = WW / 2, OY = 100;     // origem (vértice de cima do tile 0,0)
  let CW = WW, CH = WH;            // tamanho do canvas na tela (muda com a janela)
  let DPR = 1;
  const FARM = { x0: 2, y0: 2, x1: 5, y1: 5 }; // área onde dá para plantar (cresce com "Mais canteiros")
  const SPOTS = {
    casa: [[0, 0], [1, 0], [0, 1], [1, 1]],
    lixo: [[3, 0]],
    devolucao: [[7, 0]],
    arvores: [[0, 7], [7, 7], [0, 4], [7, 4]],
    banca: [[0, 6]],
    tanque: [[7, 2]],
    cisterna: [[2, 0]],
    composteira: [[0, 2]],
    pote: [[1, 4]],
    galinheiro: [[0, 5]],
    paraVila: [[7, 6]],
  };
  /* vila: prédios ocupam 2x2 tiles */
  const VILA = {
    cooperativa: { x: 0, y: 0, w: 2, d: 2, nome: "Cooperativa", parede: "#f3e2c3", parede2: "#e3cba3", telhado: "#3d8b3d", telhado2: "#2f6f2f" },
    feira:       { x: 3, y: 0, w: 2, d: 2, nome: "Feira Comunitária", parede: "#e9d6b4", parede2: "#d6bf98", telhado: "#c4512e", telhado2: "#a63f20" },
    agromax:     { x: 6, y: 0, w: 2, d: 2, nome: "AgroMax", parede: "#dfe6ee", parede2: "#c5d0dc", telhado: "#2f5fb0", telhado2: "#24498a" },
  };
  const VILA_SPOTS = { paraFazenda: [[0, 7]], arvores: [[7, 7], [7, 5], [0, 4]], festa: [[4, 4]] };
  const isSpot = (name, x, y) => (SPOTS[name] || []).some(([a, b]) => a === x && b === y);
  const isVSpot = (name, x, y) => (VILA_SPOTS[name] || []).some(([a, b]) => a === x && b === y);
  const predioEm = (x, y) => Object.keys(VILA).find((k) => { const b = VILA[k]; return x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.d; });
  const npcEm = (x, y) => NPCS.find((n) => n.pos[0] === x && n.pos[1] === y && npcNaVila(n));
  const inFarm = (x, y) => x >= FARM.x0 && x <= FARM.x1 && y >= FARM.y0 && y <= FARM.y1;
  const naVila = () => G && G.area === "vila";

  /* ---------- estado ---------- */
  let G = null;
  const seasonIdx = (day) => Math.min(3, Math.floor((Math.max(1, day) - 1) / SEASON_DAYS));
  const SEA = () => SEASONS[seasonIdx(G ? G.day : 1)];
  const diaDaEstacao = () => ((G.day - 1) % SEASON_DAYS) + 1;
  const weekday = () => (G.day - 1) % 7;
  const isFeira = () => G && weekday() === FEIRA_DIA - 1;
  const festival = () => (isFeira() ? FESTIVALS[SEA().id] : null);
  const aguaMax = () => Math.max(2, AGUA_HORAS + (G && G.up && G.up.cisterna ? 3 : 0) + SEA().agua);
  const repStars = () => Math.max(1, Math.min(5, Math.floor(G.rep || REP_INICIAL)));
  const doEpoca = (id, S = SEA()) => CROPS[id].estacoes.includes(S.id);
  function applyUpgrades() {
    const big = G && G.up && G.up.canteiros;
    FARM.x1 = big ? 6 : 5; FARM.y1 = big ? 7 : 5;
  }
  function newGame() {
    const tiles = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      tiles.push({ x, y, soil: false, watered: false, agua: 0, crop: null, joaninhas: 0, shade: (x * 7 + y * 13) % 3 });
    }
    G = {
      day: 1, hour: DAY_START, acc: 0, paused: false, rain: false, coins: START_COINS, hearts: START_HEARTS, score: 0,
      tiles, area: "fazenda",
      inv: { seeds: { alface: 3, tomate: 2 }, prod: {}, embalagens: 0, epi: false },
      sel: { kind: "tool", id: "enxada" },
      cesta: [],
      focus: null,
      shownFacts: new Set(),
      factQueue: [],
      despensa: Array.from({ length: START_PANTRY }, () => ({ id: "biscoito", status: "ultra" })),
      fome: 0, tut: 0, comeu: [],
      encomenda: null, conquistas: new Set(), vendidos: 0, pedidosOk: 0, catou: 0, alerta: null,
      up: {}, rep: REP_INICIAL, galinhas: 0, pote: null, bonusBanca: 1,
      amizade: {}, falou: {}, presenteou: {}, premiado: {}, falaIdx: {},
      bundles: {}, bundlesFeitos: [], agromax: false, festivais: [],
      quests: { enxada: false, plantar: false, regar: false, dormir: false, praga: false, colher: false },
      stats: { saudaveis: 0, irregulares: 0, perdidas: 0, agro: 0, alternativas: 0, embalagemOk: 0, embalagemLixo: 0, semEPI: 0, cultivos: new Set(), log: [],
               perdas: {}, lavouCerto: 0, lavouTotal: 0, vendasFeira: 0, ovos: 0, conservas: 0 },
      player: { x: 2.5, y: 1.6, tx: 2.5, ty: 1.6, dir: 1 },
      hover: null,
      view: { z: 1, cx: WW / 2, cy: WH / 2 },
      sound: store.get("som", true),
      speed: 1, started: false,
      over: false,
    };
    applyUpgrades();
  }
  const T = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? null : G.tiles[y * N + x]);


  /* ---------- utilidades ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("hortaLimpa." + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("hortaLimpa." + k, JSON.stringify(v)); } catch { /* sem armazenamento */ } },
  };
  const $ = (s, el = document) => el.querySelector(s);
  /* ---------- salvar o progresso (localStorage) ---------- */
  const SAVE = "hortaLimpa.save3";   // versão Stardew (não carrega os jogos salvos antigos)
  function saveGame() {
    if (!G || !G.started || G.over) return;
    try {
      localStorage.setItem(SAVE, JSON.stringify(G, (k, v) => (v instanceof Set ? { __set: [...v] } : k === "hover" || k === "alerta" || k === "factQueue" ? undefined : v)));
    } catch { /* sem armazenamento */ }
  }
  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE); if (!raw) return null;
      const g = JSON.parse(raw, (k, v) => (v && typeof v === "object" && Array.isArray(v.__set) ? new Set(v.__set) : v));
      return g && g.started && !g.over && Array.isArray(g.tiles) ? g : null;
    } catch { return null; }
  }
  function clearSave() { try { localStorage.removeItem(SAVE); } catch { /* nada */ } }
  window.addEventListener("pagehide", saveGame);
  document.addEventListener("visibilitychange", () => { if (document.hidden) saveGame(); });
  /* ---------- celular deitado ---------- */
  const isPhone = () => window.matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 600;
  function tryLandscape() {
    if (!isPhone()) return;
    if (!store.get("emPe", false)) document.body.classList.add("want-landscape");
    try {
      const el = document.documentElement;
      const fs = el.requestFullscreen ? el.requestFullscreen({ navigationUI: "hide" }) : Promise.resolve();
      Promise.resolve(fs).then(() => screen.orientation && screen.orientation.lock ? screen.orientation.lock("landscape") : null).catch(() => {});
    } catch { /* o navegador não deixa girar sozinho */ }
  }
  let LOOP = 0;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const pct = (x) => Math.round(x * 100) + "%";
  /* "de cada 10": deixa a porcentagem da Anvisa concreta */
  const deCada10 = (p) => { const n = Math.round(p * 10); return n >= 1 ? `${n} de cada 10` : "menos de 1 de cada 10"; };
  const dez = (p) => `<span class="dez" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<i class="${i < Math.round(p * 10) ? "r" : ""}"></i>`).join("")}</span>`;
  const ANVISA_CURTO = "A Anvisa, órgão do governo que cuida da segurança dos alimentos, compra frutas e verduras nos mercados e testa no laboratório (programa PARA). <b>Irregular</b> = agrotóxico acima do limite ou que nem podia ser usado naquele alimento.";
  const paraHTML = (C, extra = "") => `<div class="anv">${dez(C.para)}<div><b>${deCada10(C.para)}</b> amostras de ${C.nome.toLowerCase()} que a Anvisa testou estavam irregulares (${C.ano.replace("Anvisa ", "")}).${extra}
    <details class="whatis"><summary>O que é isso?</summary>${ANVISA_CURTO}</details></div></div>`;
  const prod = (id) => PRODUCTS.find((p) => p.id === id);
  const rnd = Math.random;

  /* ---------- som ---------- */
  let actx = null;
  function beep(notes, type = "sine", dur = 0.09, vol = 0.07) {
    if (!G || !G.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      notes.forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type; o.frequency.value = f;
        const t = actx.currentTime + i * dur;
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.6);
        o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur * 1.7);
      });
    } catch { /* sem áudio */ }
  }
  const sfx = {
    dig: () => beep([180, 140], "triangle", 0.07),
    plant: () => beep([520, 660], "sine", 0.07),
    water: () => beep([880, 760, 640], "sine", 0.05, 0.05),
    good: () => beep([660, 880]),
    bad: () => beep([220, 160], "square", 0.12, 0.04),
    coin: () => beep([980, 1310], "triangle", 0.06),
    harvest: () => beep([523, 659, 784], "triangle", 0.08),
    night: () => beep([392, 330, 262], "sine", 0.18, 0.05),
  };

  /* ---------- avisos ---------- */
  let toastTimer = null;
  function toast(msg, pts = null, kind = "", ms = 4200) {
    toastEl.className = "toast " + kind;
    toastEl.innerHTML = `${pts === null ? "" : `<span class="tp">${pts > 0 ? "+" : ""}${pts}</span>`}<span>${msg}</span>`;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, ms);
  }
  function lose(key, n) { if (!key || n <= 0) return; G.stats.perdas[key] = (G.stats.perdas[key] || 0) + n; }
  function addPts(n, label, key) {
    G.score += n;
    if (n < 0) lose(key, -n);
    G.stats.log.push({ label, n });
    const c = $("#score-chip");
    if (c) { c.textContent = `⭐ ${G.score}`; c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump"); }
  }
  const floaters = [];
  function floatText(x, y, text, color) { floaters.push({ x, y, text, color, t: 0 }); }

  /* ---------- cartões de informação (aparecem uma vez) ---------- */
  function fact(key, icon = "💡") {
    if (G.shownFacts.has(key)) return;
    G.shownFacts.add(key);
    G.factQueue.push({ key, icon });
    if (modalEl.hidden) nextFact();
  }
  function nextFact() {
    const f = G.factQueue.shift();
    if (!f) return;
    const F = FACTS[f.key];
    if (!F) { nextFact(); return; }
    openModal(`<div class="box fact stack">
      <div class="icon">${f.icon}</div>
      <p style="font-size:18px">${F.t}</p>
      ${F.f ? `<p class="src">Fonte: ${esc(F.f)}</p>` : ""}
      <div><button class="btn green" id="ok">Entendi</button></div></div>`);
    $("#ok").onclick = () => { closeModal(); nextFact(); };
  }
  function openModal(html) { modalEl.innerHTML = html; modalEl.hidden = false; }
  function closeModal() { modalEl.hidden = true; modalEl.innerHTML = ""; }
  modalEl.addEventListener("click", (e) => { if (e.target === modalEl && !G.factQueue.length && !modalEl.querySelector(".fact")) closeModal(); });

  /* ==========================================================
     TUTORIAL GUIADO
     ========================================================== */
  function tut(ev) {
    if (!G || G.tut < 0 || G.tut >= TUTORIAL.length) return;
    if (TUTORIAL[G.tut].ev !== ev) return;
    G.tut++;
    sfx.good();
    if (G.tut === 5) toast("⏱️ <b>O relógio começou a andar!</b> 1 hora de jogo = 5 segundos. Use ⏸ para pausar ou ⏩ para acelerar.", null, "good", 5000);
    if (G.tut >= TUTORIAL.length) {
      G.tut = -1;
      addPts(20, "Completou o tutorial");
      toast("<b>Tutorial completo!</b> Agora a horta é sua. Cuide do José durante o ano inteiro: 4 estações de " + SEASON_DAYS + " dias.", 20, "good", 5000);
    }
    renderUI();
  }
  const tutHL = () => (G && G.tut >= 0 && G.tut < TUTORIAL.length ? TUTORIAL[G.tut].hl : null);

  /* ==========================================================
     JOGO


  /* ==========================================================
     CAPA
     ========================================================== */
  function rankHTML(destaque = -1) {
    const r = store.get("ranking3", []);
    if (!r.length) return "";
    return `<div class="rank5"><h3>🏆 Suas melhores partidas</h3><ol>${r.map((x, i) => `<li class="${i === destaque ? "now" : ""}"><span>${"⭐".repeat(x.stars) || "—"}</span><b>${x.pts} pts</b><span>${x.final}</span><small>${x.data}</small></li>`).join("")}</ol></div>`;
  }
  function screenCover() {
    app.classList.remove("game"); document.body.classList.remove("in-game");
    const rec = store.get("recorde3", 0);
    const saved = loadGame();
    app.innerHTML = `
      <section class="card narrow stack cover">
        <h1>Horta <span>Limpa</span></h1>
        <canvas id="coverc" width="${WW}" height="${WH - 60}" aria-hidden="true"></canvas>
        <p style="font-size:19px;max-width:34ch">Ajude o José Longuinho a viver um ano da própria horta em Mogi das Cruzes, sem levar veneno para o prato.</p>
        <div class="flow"><span><b>🌱</b>Plante</span><i>→</i><span><b>🐛</b>Cuide</span><i>→</i><span><b>🚰</b>Lave</span><i>→</i><span><b>🏘️</b>Vila</span></div>
        ${saved ? `<button class="btn big green" id="resume">▶ Continuar · ${SEASONS[seasonIdx(saved.day)].icone} dia ${((saved.day - 1) % SEASON_DAYS) + 1}, ${String(Math.floor(saved.hour)).padStart(2, "0")}h</button>
        <button class="btn ghost" id="start">Novo jogo</button><p class="small muted" style="margin-top:-8px">Começar de novo apaga o progresso salvo.</p>`
        : `<button class="btn big" id="start">Jogar ▶</button>`}
        <p class="small muted">1 ano = 4 estações de ${SEASON_DAYS} dias${rec ? ` · seu recorde: <b>${rec} pts</b>` : ""}</p>
        ${rankHTML()}
      </section>
      <footer class="credit">Projeto “Agrotóxicos: impactos ambientais e riscos à saúde” · Centro Universitário Braz Cubas · Mogi das Cruzes</footer>`;
    newGame();
    const demo = [["alface", 3], ["tomate", 3], ["couve", 2], ["flores", 3], ["cenoura", 2], ["pimentao", 3], ["pepino", 1]];
    let k = 0;
    for (let y = 2; y <= 5; y++) for (let x = 2; x <= 5; x++) {
      const t = T(x, y); t.soil = true; t.watered = (x + y) % 2 === 0;
      const [id, st] = demo[k++ % demo.length];
      t.crop = { id, age: st === 3 ? CROPS[id].horas : st * 3, stage: st, pest: null, carencia: 0, chem: false, irregular: null, sede: 0, dano: 0, dead: false };
    }
    T(4, 4).crop.pest = { id: "pulgao", h: 0 };
    G.galinhas = 2; G.up.galinheiro = true;
    const cv = $("#coverc"), view = { z: 1, cx: WW / 2, cy: (WH - 60) / 2 + 30 };
    const loop = (ts) => { if (!document.body.contains(cv)) return; draw(cv.getContext("2d"), WW, WH - 60, view, ts); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    $("#start").onclick = () => { beep([523, 784], "triangle"); clearSave(); tryLandscape(); screenStory(0); };
    if (saved) $("#resume").onclick = () => resumeGame(saved);
  }

  /* ==========================================================
     HISTÓRIA INICIAL
     ========================================================== */
  function screenStory(i) {
    newGame();
    app.classList.remove("game"); document.body.classList.remove("in-game");
    const s = STORY[i];
    const last = i === STORY.length - 1;
    app.innerHTML = `
      <section class="card narrow stack story">
        <div class="story-top"><span class="dots">${STORY.map((_, k) => `<span class="${k < i ? "done" : k === i ? "on" : ""}"></span>`).join("")}</span>
          <button class="link" id="skip">Pular história ›</button></div>
        <canvas id="storyc" width="${WW}" height="360" aria-hidden="true"></canvas>
        <div class="dialog ${s.quem}">
          ${s.quem === "jose" ? `<span class="who">👨🏽‍🌾 José Longuinho</span>` : ""}
          <p>${s.t}</p>
        </div>
        ${last ? `<button class="btn big green" id="next">🌱 Vou ajudar o José!</button>` : `<button class="btn" id="next">Continuar ▶</button>`}
      </section>`;
    G.tut = -1;
    G.player.x = G.player.tx = 3.5; G.player.y = G.player.ty = 2.6;
    const cv = $("#storyc"), cx = cv.getContext("2d");
    const view = { z: 1.5, cx: 330, cy: 175 + i * 6 };
    const loop = (ts) => { if (!document.body.contains(cv)) return; draw(cx, WW, 360, view, ts); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    $("#next").onclick = () => (last ? startGame(true) : screenStory(i + 1));
    $("#skip").onclick = () => startGame(true);
  }
  function startGame(withTutorial) {
    tryLandscape();
    newGame();
    if (!withTutorial) G.tut = -1;
    G.started = true;
    novaEncomenda();
    screenGame();
    saveGame();
    fact("receita", "🧑‍🌾");
  }
  function resumeGame(g) {
    tryLandscape();
    G = g;
    G.factQueue = []; G.hover = null; G.alerta = null; G.focus = null; G.over = false; G.endPending = false;
    G.paused = false; G.speed = G.speed || 1; G.sound = store.get("som", true);
    G.view = { z: 1, cx: WW / 2, cy: WH / 2 };
    G.player.tx = G.player.x; G.player.ty = G.player.y;
    applyUpgrades();
    screenGame();
    toast(`💾 Jogo carregado: ${SEA().icone} ${SEA().nome}, dia ${diaDaEstacao()}.`, null, "good", 2600);
  }

  /* ==========================================================
     TELA DO JOGO (disposição do Stardew Valley)
     ========================================================== */
  let canvas, ctx;
  function screenGame() {
    app.classList.add("game"); document.body.classList.add("in-game");
    app.innerHTML = `
      <div class="world" id="world">
        <canvas id="cv" aria-label="Mundo do jogo"></canvas>
        <div class="hud-tl"><div class="quest" id="quest"></div><div class="infocard" id="info" hidden></div></div>
        <div class="hud-tr">
          <div class="clockbox"><div class="cdate" id="cdate"></div><div class="ctime" id="ctime"></div><div class="cmoney" id="coins"></div></div>
          <div class="cbtns"><button class="cb" id="pause" aria-label="Pausar (P)">⏸️</button><button class="cb" id="speed" title="Velocidade do tempo"></button><span class="cb score" id="score-chip"></span></div>
        </div>
        <div class="hud-bl">
          <button class="mb" id="invbtn" title="Inventário (E)">🎒<span>Inventário</span></button>
          <button class="mb" id="diario" title="Diário (J)">📔<span>Diário</span></button>
          <button class="mb" id="map" title="Mapa (M)">🗺️<span>Mapa</span></button>
          <button class="mb" id="guide-chip" title="Guia (G)">📖<span>Guia</span></button>
          <button class="mb" id="sleep" title="Dormir">🌙<span>Dormir</span></button>
          <button class="mb" id="menu" title="Menu (Esc)">⚙️<span>Menu</span></button>
        </div>
        <div class="hud-b"><div class="hotbar" id="slots"></div>
          <div class="health" title="Saúde do José"><div class="hbar"><span id="hfill"></span></div><b>❤️</b></div></div>
        <div class="zoom"><button id="zin" aria-label="Aproximar">＋</button><button id="zout" aria-label="Afastar">－</button></div>
        <div class="pausebox" id="pausebox" hidden><div>⏸️</div><b>Jogo pausado</b><span>As plantas, a água e as pragas estão paradas.</span><button class="btn big green" id="resumebtn">▶ Continuar</button></div>
      </div>`;
    canvas = $("#cv"); ctx = canvas.getContext("2d");
    fitCanvas();
    setupView();
    let down = null;
    canvas.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, cx: G.view.cx, cy: G.view.cy, pan: false }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener("pointermove", (e) => {
      if (!down) { if (e.pointerType === "mouse") G.hover = pickTile(e); return; }
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!down.pan && Math.hypot(dx, dy) > 8) down.pan = true;
      if (down.pan) { G.view.cx = down.cx - dx / G.view.z; G.view.cy = down.cy - dy / G.view.z; clampView(); }
    });
    canvas.addEventListener("pointerup", (e) => { if (down && !down.pan) onCanvasClick(e); down = null; });
    canvas.addEventListener("pointercancel", () => { down = null; });
    canvas.addEventListener("mouseleave", () => { G.hover = null; });
    canvas.addEventListener("wheel", (e) => { e.preventDefault(); cycleSlot(e.deltaY > 0 ? 1 : -1); }, { passive: false });
    $("#zin").onclick = () => { G.view.z = Math.min(3, G.view.z + 0.25); clampView(); };
    $("#zout").onclick = () => { G.view.z = Math.max(0.6, G.view.z - 0.25); clampView(); };
    $("#sleep").onclick = askSleep;
    $("#invbtn").onclick = openInventory;
    $("#diario").onclick = () => openDiary();
    $("#map").onclick = openMap;
    $("#guide-chip").onclick = openGuide;
    $("#menu").onclick = openMenu;
    const setPause = (v) => { G.paused = v; renderClock(); saveGame(); };
    $("#pause").onclick = () => setPause(!G.paused);
    $("#resumebtn").onclick = () => setPause(false);
    $("#speed").onclick = () => { G.speed = G.speed === 1 ? 2 : 1; renderClock(); toast(G.speed === 2 ? "⏩ Tempo 2× mais rápido." : "▶ Tempo normal.", null, "", 1600); };
    renderUI();
    const id = ++LOOP;
    requestAnimationFrame((ts) => frame(ts, id));
  }

  /* teclado (como no Stardew): 1-0 escolhem o item, E inventário, J diário, M mapa, G guia, P pausa, Esc menu */
  document.addEventListener("keydown", (e) => {
    if (!G || !G.started || G.over || !canvas || !document.body.contains(canvas)) return;
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    if (!modalEl.hidden) { if (e.key === "Escape" && !modalEl.querySelector(".fact")) { closeModal(); nextFact(); } return; }
    const k = e.key.toLowerCase();
    if (/^[0-9]$/.test(k)) { const i = k === "0" ? 9 : +k - 1; const b = $("#slots").children[i]; if (b && b.click) b.click(); }
    else if (k === "-") { const b = $("#slots").children[10]; if (b) b.click(); }
    else if (k === "e") openInventory();
    else if (k === "j") openDiary();
    else if (k === "m") openMap();
    else if (k === "g") openGuide();
    else if (k === "p") { G.paused = !G.paused; renderClock(); }
    else if (k === "escape") openMenu();
  });
  function cycleSlot(d) {
    const list = hotbarItems().filter((x) => x.kind !== "cesta");
    let i = list.findIndex((x) => x.kind === G.sel.kind && x.id === G.sel.id);
    i = (i + d + list.length) % list.length;
    G.sel = { kind: list[i].kind, id: list[i].id }; renderSlots();
  }

  /* ---------- HUD ---------- */
  function renderUI() {
    if (!$("#world")) return;
    renderClock();
    $("#coins").innerHTML = `🪙 <b>${G.coins}</b>`;
    $("#score-chip").textContent = `⭐ ${G.score}`;
    $("#hfill").style.height = Math.max(0, (G.hearts / START_HEARTS) * 100) + "%";
    $("#hfill").className = G.hearts <= 2 ? "low" : "";
    if (G.coins >= META_MOEDAS) unlock("meta");
    if (repStars() >= 5) unlock("estrelas");
    const hl = tutHL();
    ["sleep", "map"].forEach((b) => $("#" + b).classList.toggle("pulse", !!(hl && hl.btn === b)));
    renderSlots(); renderInfo(); renderQuests();
  }
  function renderClock() {
    const el = $("#ctime"); if (!el) return;
    const h = Math.floor(G.hour), night = G.hour >= 18, S = SEA(), F = festival();
    const stopped = G.paused || (G.tut >= 0 && G.tut <= 4);
    $("#cdate").innerHTML = `${WEEKDAYS[weekday()]}, ${diaDaEstacao()} <span class="season">${S.icone} ${S.nome}</span>${F ? `<span class="fest">${F.icone} ${F.nome}</span>` : ""}`;
    el.innerHTML = `<span class="wx">${G.rain ? "🌧️" : night ? "🌙" : "☀️"}</span><b>${String(h).padStart(2, "0")}:00</b>${stopped ? `<small class="stopnote">${G.paused ? "pausado" : "⏳ começa ao regar"}</small>` : ""}`;
    const pb = $("#pause"); if (pb) { pb.textContent = G.paused ? "▶️" : "⏸️"; pb.classList.toggle("on", G.paused); }
    const box = $("#pausebox"); if (box) box.hidden = !G.paused;
    const sp = $("#speed"); if (sp) { sp.textContent = G.speed === 2 ? "⏩2×" : "▶1×"; sp.classList.toggle("on", G.speed === 2); }
  }
  /* barra de ferramentas: 12 espaços (o último é a cesta) */
  function hotbarItems() {
    const list = TOOLS.map((t) => ({ kind: "tool", id: t.id, icon: t.icone, label: t.nome }));
    Object.entries(G.inv.seeds).filter(([, n]) => n > 0).forEach(([id, n]) => list.push({ kind: "seed", id, icon: cropIcon(id), label: CROPS[id].nome.split("-")[0], n, off: !doEpoca(id) }));
    Object.entries(G.inv.prod).filter(([, n]) => n > 0).forEach(([id, n]) => { const p = prod(id); list.push({ kind: "prod", id, icon: p.icone, label: p.nome, n, extra: p.tipo }); });
    if (G.inv.embalagens > 0) list.push({ kind: "emb", id: "emb", icon: "🗑️", label: "Embalagem vazia", n: G.inv.embalagens, extra: "warn" });
    list.push({ kind: "cesta", id: "cesta", icon: "🧺", label: "Cesta", n: G.cesta.length });
    return list;
  }
  function renderSlots() {
    const hl = tutHL();
    const items = hotbarItems();
    $("#slots").innerHTML = items.map((it, i) => {
      const sel = G.sel.kind === it.kind && G.sel.id === it.id ? " sel" : "";
      const pulse = hl && (hl.slot === it.kind + ":" + it.id || (it.kind === "cesta" && hl.btn === "deliver")) ? " pulse" : "";
      const key = i < 9 ? i + 1 : i === 9 ? 0 : i === 10 ? "-" : "";
      return `<button class="slot${sel}${pulse} ${it.extra || ""}${it.off ? " off" : ""}${it.kind === "cesta" ? " cesta" + (it.n ? " full" : "") : ""}" ${it.kind === "cesta" ? 'id="deliver"' : ""} data-kind="${it.kind}" data-id="${it.id}" title="${esc(it.label)}${it.off ? " (fora da época)" : ""}">
        ${key !== "" ? `<span class="k">${key}</span>` : ""}${it.n !== undefined && (it.kind !== "cesta" || it.n) ? `<span class="n">${it.n}</span>` : ""}<span class="i">${it.icon}</span><span class="lb">${esc(it.label)}</span></button>`;
    }).join("");
    $("#slots").querySelectorAll(".slot").forEach((b) => {
      b.onclick = () => {
        if (b.dataset.kind === "cesta") { deliver(); return; }
        G.sel = { kind: b.dataset.kind, id: b.dataset.id };
        tut("sel:" + G.sel.kind + ":" + G.sel.id);
        if (G.sel.kind === "emb") toast("Leve a embalagem até o <b>ponto de devolução ♻️</b> (canto direito) ou… a lixeira? Escolha!", null, "");
        else if (G.sel.kind === "prod") toast(prod(G.sel.id).desc, null, "", 5000);
        else if (G.sel.kind === "seed") toast(doEpoca(G.sel.id) ? `Toque numa terra preparada para plantar ${CROPS[G.sel.id].nome.toLowerCase()}.` : `${CROPS[G.sel.id].nome} não é da época no ${SEA().nome.toLowerCase()}. Guarde para: ${CROPS[G.sel.id].estacoes.map((e) => SEASONS.find((x) => x.id === e).nome.toLowerCase()).join(", ")}.`, null, "", 3500);
        renderSlots();
      };
    });
  }
  const cropIcon = (id) => ({ alface: "🥬", couve: "🥬", tomate: "🍅", pimentao: "🌶️", cenoura: "🥕", pepino: "🥒", flores: "🌼", uva: "🍇", milho: "🌽", cebola: "🧅" }[id]);
  /* itens da despensa (plantas, ovos, conservas, biscoito) */
  const itemNome = (d) => (ITEMS[d.id] ? ITEMS[d.id].nome : CROPS[d.id] ? CROPS[d.id].nome : d.nome || d.id);
  const itemIcon = (d) => (ITEMS[d.id] ? ITEMS[d.id].icone : CROPS[d.id] ? cropIcon(d.id) : "🥫");
  const itemVendaBase = (d) => (ITEMS[d.id] ? ITEMS[d.id].venda : CROPS[d.id] ? CROPS[d.id].venda : Math.round(CROPS[d.base].venda * CONSERVA_MULT));
  const ehConserva = (d) => !!d.base;

  /* cartão "Olhando" (canto de cima, à esquerda) */
  function renderInfo() {
    const el = $("#info"); if (!el) return;
    if (!G.focus) { el.hidden = true; return; }
    const [x, y] = G.focus, t = T(x, y);
    let h = "";
    if (naVila()) {
      const b = predioEm(x, y);
      if (b === "cooperativa") h = `<span class="big">🏪 Cooperativa</span>Sementes, alternativas sem veneno, melhorias e galinhas.`;
      else if (b === "agromax") h = `<span class="big">🏢 AgroMax</span>Agrotóxicos, EPI e o contrato da empresa.`;
      else if (b === "feira") h = G.agromax ? `<span class="big">📦 Depósito da AgroMax</span>Aqui era a Feira Comunitária.` : `<span class="big">🏛️ Feira Comunitária</span>${G.bundlesFeitos.length}/${BUNDLES.length} pacotes entregues. Toque para ver os pacotes.`;
      else if (isVSpot("paraFazenda", x, y)) h = `<span class="big">➜ Fazenda do José</span>Toque para voltar (1 hora de caminhada).`;
      else return void (el.hidden = true);
    } else if (isSpot("casa", x, y)) h = `<span class="big">🏠 Casa do José</span>A comida lavada fica na despensa (🎒). Toque para dormir.`;
    else if (isSpot("tanque", x, y)) h = `<span class="big">🚰 Tanque do quintal</span>Lave aqui a colheita da 🧺 cesta antes de guardar.`;
    else if (isSpot("banca", x, y)) h = `<span class="big">🏷️ Banca do José</span>Venda o que sobra e atenda os pedidos dos vizinhos.`;
    else if (isSpot("lixo", x, y)) h = `<span class="big">🗑️ Lixeira comum</span>Para lixo de casa.`;
    else if (isSpot("devolucao", x, y)) h = `<span class="big">♻️ Ponto de devolução</span>Recebe embalagens vazias de agrotóxico, lavadas 3 vezes.`;
    else if (isSpot("paraVila", x, y)) h = `<span class="big">➜ Vila de Taiaçupeba</span>Toque para ir (1 hora de caminhada).`;
    else if (isSpot("pote", x, y) && G.up.pote) h = `<span class="big">🥫 Pote de conserva</span>${G.pote ? (poteHoras() > 0 ? `Fazendo ${esc(conservaNome(G.pote.base))}: faltam ${poteHoras()}h.` : "Pronto! Toque para pegar.") : "Toque para fazer conserva de um alimento lavado."}`;
    else if (isSpot("galinheiro", x, y) && G.up.galinheiro) h = `<span class="big">🛖 Galinheiro</span>${G.galinhas} galinha(s). Elas comem insetos da horta e botam ovos toda manhã.`;
    else if (!inFarm(x, y)) return void (el.hidden = true);
    else if (!t.soil) h = `<span class="big">🌾 Mato</span>Use a ⛏️ enxada para preparar a terra.`;
    else if (!t.crop) h = `<span class="big">🟫 Terra preparada</span>Escolha uma semente na barra e toque aqui.`;
    else {
      const c = t.crop, C = CROPS[c.id];
      const tags = [];
      if (c.dead) tags.push(`<span class="tag bad">morreu: use a ⛏️ enxada para limpar</span>`);
      else if (c.stage >= 3) tags.push(`<span class="tag good">pronta para colher</span>`);
      else tags.push(`<span class="tag">⏱️ ${Math.ceil(C.horas - Math.min(c.age, C.horas))}h para colher</span>`);
      if (!c.dead && c.stage < 3) tags.push(t.agua > 0 ? `<span class="tag good">💧 água por ${Math.ceil(t.agua)}h</span>` : `<span class="tag bad">💧 COM SEDE: morre em ${SEDE_MORTE - c.sede}h</span>`);
      if (c.pest) tags.push(`<span class="tag bad">${PESTS[c.pest.id].nome}${c.pest.morreEm !== undefined ? " (sendo controlada)" : `: a planta morre em ${Math.max(0, PRAGA_MORTE - (c.pest.h || 0))}h`}</span>`);
      if (c.carencia > 0) tags.push(`<span class="tag agro">carência: ${c.carencia}h</span>`);
      if (c.irregular) tags.push(`<span class="tag bad">${esc(c.irregular)}</span>`);
      if (c.chem) tags.push(`<span class="tag agro">recebeu agrotóxico</span>`);
      if (t.joaninhas > 0) tags.push(`<span class="tag good">🐞 joaninhas (${t.joaninhas}h)</span>`);
      if (!c.dead && !doEpoca(c.id)) tags.push(`<span class="tag bad">fora da época</span>`);
      const pinfo = c.pest ? `<div class="pestbox"><b>${PESTS[c.pest.id].icone} ${PESTS[c.pest.id].nome}:</b> ${PESTS[c.pest.id].desc}<br><b>Como tratar:</b> ${PESTS[c.pest.id].trata}</div>` : "";
      h = `<span class="big">${cropIcon(c.id)} ${C.nome}</span><div>${tags.join(" ")}</div>${pinfo}${C.para !== null ? paraHTML(C) : ""}`;
    }
    el.innerHTML = `<button class="x" id="infox" aria-label="Fechar">×</button><div class="tileinfo">${h}</div>`;
    el.hidden = false;
    $("#infox").onclick = () => { G.focus = null; renderInfo(); };
  }
  function renderQuests() {
    const q = $("#quest"); if (!q) return;
    q.hidden = false;
    if (G.tut >= 0 && G.tut < TUTORIAL.length) {
      q.className = "quest tutor";
      q.innerHTML = `<span class="face">👨🏽‍🌾</span><span><b>José</b> <small>(${G.tut + 1}/${TUTORIAL.length})</small><br>${TUTORIAL[G.tut].t}</span><button id="skiptut">Pular</button>`;
      $("#skiptut").onclick = () => { G.tut = -1; renderUI(); };
    } else {
      q.className = "quest";
      const e = G.encomenda;
      q.innerHTML = e && !e.feita
        ? `<b>📦</b>&nbsp;${e.avatar} ${esc(e.cliente)}: ${e.qtd}× ${cropIcon(e.id)}${e.semAgro ? " <b>sem agrotóxico</b>" : ""} · 🪙${e.paga} · ⏳${Math.max(0, e.expira - Math.floor(G.hour))}h`
        : `<b>🎯</b>&nbsp;${G.agromax ? "Juntar moedas e manter o José saudável" : `Feira Comunitária: ${G.bundlesFeitos.length}/${BUNDLES.length} pacotes`}`;
    }
  }
  function nextMeal() {
    const ok = G.despensa.find((d) => d.status === "ok");
    return ok || G.despensa[0] || null;
  }
  function unlock(id) {
    if (!G || G.conquistas.has(id)) return;
    const a = ACHIEVEMENTS.find((x) => x.id === id); if (!a) return;
    G.conquistas.add(id);
    addPts(15, `Conquista: ${a.nome}`);
    beep([784, 988, 1175, 1568], "triangle", 0.09);
    setTimeout(() => toast(`🏆 <b>Conquista:</b> ${a.icone} ${a.nome}`, 15, "good", 3500), 400);
  }
  function quest(k) { if (!G.quests[k]) G.quests[k] = true; }

  /* ---------- câmera: o mundo ocupa a tela inteira ---------- */
  function fitCanvas() {
    if (!canvas) return;
    const w = canvas.parentElement.clientWidth, h = canvas.parentElement.clientHeight;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    CW = Math.max(200, w); CH = Math.max(200, h);
    canvas.width = Math.round(CW * DPR); canvas.height = Math.round(CH * DPR);
    canvas.style.width = CW + "px"; canvas.style.height = CH + "px";
  }
  window.addEventListener("resize", () => {
    clearTimeout(window.__rz);
    window.__rz = setTimeout(() => { if (!canvas || !document.body.contains(canvas) || !G || G.over) return; fitCanvas(); clampView(); }, 120);
  });
  function setupView() {
    const [fx, fy] = toScreen(4, 4);
    const usableH = CH - (CW < 700 ? 120 : 150);
    G.view.z = Math.max(CH < 500 || CW < 600 ? 1.05 : 0.7, Math.min(2, Math.min(CW / 620, usableH / 380)));
    G.view.cx = fx; G.view.cy = fy - 10;
    clampView();
    if (CW < 700 && !store.get("dicaArrastar", false)) { store.set("dicaArrastar", true); setTimeout(() => toast("Dica: arraste o dedo para mover o mapa e use ＋ e － para o zoom.", null, "", 4500), 600); }
  }
  window.__hortaTile = (x, y) => {
    const r = canvas.getBoundingClientRect(), v = G.view;
    const [sx, sy] = toScreen(x + 0.5, y + 0.5);
    return [r.left + (sx - v.cx) * v.z + CW / 2, r.top + (sy - v.cy) * v.z + CH / 2];
  };
  function clampView() {
    const v = G.view, hw = CW / 2 / v.z, hh = CH / 2 / v.z;
    v.cx = hw * 2 >= WW ? WW / 2 : Math.min(WW - hw + 40, Math.max(hw - 40, v.cx));
    v.cy = hh * 2 >= WH ? WH / 2 : Math.min(WH - hh + 60, Math.max(hh - 60, v.cy));
  }
  const toScreen = (x, y) => [(x - y) * TW / 2 + OX, (x + y) * TH / 2 + OY];
  function pickTile(e) {
    const r = canvas.getBoundingClientRect(), v = G.view;
    const mx = (e.clientX - r.left - CW / 2) / v.z + v.cx;
    const my = (e.clientY - r.top - CH / 2) / v.z + v.cy;
    const a = (mx - OX) / (TW / 2), b = (my - OY) / (TH / 2);
    const x = Math.floor((a + b) / 2), y = Math.floor((b - a) / 2);
    return x >= 0 && y >= 0 && x < N && y < N ? [x, y] : null;
  }


  /* ==========================================================
     AÇÕES NA FAZENDA
     ========================================================== */
  function onCanvasClick(e) {
    if (G.over) return;
    const p = pickTile(e);
    if (!p) return;
    const [x, y] = p;
    G.focus = p;
    G.player.tx = x + 0.5; G.player.ty = y + 0.5;
    if (naVila()) { actVila(x, y); renderUI(); return; }
    const tt = T(x, y);
    if (tt.crop && !tt.crop.dead && CROPS[tt.crop.id].para !== null) fact("anvisa", "🔬");
    act(tt);
    renderUI();
  }

  function act(t) {
    const S = G.sel;
    const [sx, sy] = toScreen(t.x, t.y);
    const fx = sx, fy = sy + TH / 2 - 20;

    // lugares especiais
    if (isSpot("casa", t.x, t.y)) { askSleep(); return; }
    if (isSpot("tanque", t.x, t.y)) { deliver(); return; }
    if (isSpot("banca", t.x, t.y)) { openBanca(); return; }
    if (isSpot("paraVila", t.x, t.y)) { travel("vila"); return; }
    if (isSpot("pote", t.x, t.y) && G.up.pote) { openPote(); return; }
    if (isSpot("galinheiro", t.x, t.y) && G.up.galinheiro) { toast(`🐔 ${G.galinhas} galinha(s) no galinheiro.${G.galinhas ? " Elas comem insetos da horta e botam ovos toda manhã." : " Compre galinhas na Cooperativa (vila)."}`, null, "", 3500); fact("galinhas", "🐔"); return; }
    if (S.kind === "emb") {
      if (isSpot("devolucao", t.x, t.y)) {
        G.inv.embalagens--; G.stats.embalagemOk++; addPts(10, "Embalagem devolvida no lugar certo"); unlock("embalagem");
        floatText(fx, fy, "+10", "#2f7d32"); sfx.good(); fact("devolucao", "♻️");
        if (!G.inv.embalagens) G.sel = { kind: "tool", id: "mao" };
      } else if (isSpot("lixo", t.x, t.y)) {
        G.inv.embalagens--; G.stats.embalagemLixo++; addPts(-15, "Embalagem de agrotóxico no lixo comum", "lixo");
        floatText(fx, fy, "-15", "#c2341f"); sfx.bad(); fact("lixo", "⚠️");
        toast("Embalagem de agrotóxico <b>não</b> vai no lixo comum! <span class='jeito'>Certo: lavar 3 vezes e devolver no ponto de recebimento ♻️.</span>", -15, "bad", 6000);
        if (!G.inv.embalagens) G.sel = { kind: "tool", id: "mao" };
      } else toast("Leve a embalagem até o ♻️ ponto de devolução (canto direito do mapa).", null, "");
      return;
    }
    if (!inFarm(t.x, t.y)) { toast("Essa parte não é da horta. Plante dentro da área de mato.", null, "", 2400); return; }

    let c = t.crop;
    // planta morta: enxada ou mão limpam; semente planta por cima
    if (c && c.dead) {
      if (S.kind === "seed") { t.crop = null; c = null; t.soil = true; }
      else if (S.kind === "tool" && (S.id === "enxada" || S.id === "mao")) {
        t.crop = null; t.soil = true; sfx.dig(); floatText(fx, fy, "⛏️", "#6b4a2e");
        toast("Canteiro limpo e terra pronta! Escolha uma semente e plante de novo.", null, "good", 3000); return;
      } else { toast("Essa planta morreu. Use a ⛏️ enxada para limpar o canteiro (ou escolha uma semente para plantar por cima).", null, "", 3500); return; }
    }
    if (S.kind === "tool") {
      if (S.id === "enxada") {
        if (t.soil) { toast("Essa terra já está preparada. Agora plante uma semente.", null, "", 2400); return; }
        t.soil = true; sfx.dig(); floatText(fx, fy, "⛏️", "#6b4a2e"); quest("enxada"); tut("hoe"); return;
      }
      if (S.id === "regador") {
        if (!t.soil) { toast("Primeiro prepare a terra com a enxada.", null, "", 2400); return; }
        if (t.agua >= aguaMax() - 1 && !G.up.regadorG) { toast("A terra já está úmida.", null, "", 1800); return; }
        t.agua = aguaMax(); t.watered = true; sfx.water(); floatText(fx, fy, "💧", "#3a7bd5");
        if (G.up.regadorG) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const n = T(t.x + dx, t.y + dy); if (n && n.soil && inFarm(n.x, n.y)) { n.agua = aguaMax(); n.watered = true; } }
        if (c) { quest("regar"); tut("water"); if (G.tiles.every((x) => !x.crop || x.crop.dead || x.watered)) tut("allwatered"); }
        return;
      }
      if (S.id === "mao") {
        if (!c) { toast("Nada para colher aqui.", null, "", 1800); return; }
        if (c.pest && (c.pest.id === "lagarta" || c.pest.id === "lesma")) {
          c.pest = null; G.stats.alternativas++; G.catou++; if (G.catou >= 3) unlock("catador"); addPts(8, "Catou praga à mão"); floatText(fx, fy, "+8", "#2f7d32"); sfx.good();
          toast("Catou a praga à mão: sem veneno nenhum!", 8, "good"); quest("praga"); return;
        }
        if (c.pest) { toast(`${PESTS[c.pest.id].nome} é pequeno demais para catar. Tente joaninhas, calda de neem ou a tesoura (fungo).`, null, "", 4200); return; }
        if (CROPS[c.id].companheira) { toast("As flores ficam: elas atraem joaninhas e protegem as vizinhas. 🌼", null, "", 3000); return; }
        if (c.stage < 3) { toast(`Ainda não está pronta. Faltam ${Math.ceil(CROPS[c.id].horas - c.age)} horas com a terra úmida.`, null, "", 2400); return; }
        harvest(t, fx, fy); return;
      }
      if (S.id === "tesoura") {
        if (c && c.pest && c.pest.id === "fungo") {
          if (rnd() < 0.8) { c.pest = null; G.stats.alternativas++; addPts(8, "Podou folhas com fungo"); floatText(fx, fy, "+8", "#2f7d32"); sfx.good(); toast("Podou as folhas doentes. Fungo controlado sem química!", 8, "good"); quest("praga"); }
          else { sfx.bad(); toast("O fungo ainda está lá. Tente podar de novo.", null, ""); }
          return;
        }
        toast("A tesoura serve para podar folhas com fungo.", null, "", 2400); return;
      }
    }
    if (S.kind === "seed") {
      if (!t.soil) { toast("Prepare a terra com a ⛏️ enxada antes de plantar.", null, "", 2400); return; }
      if (!doEpoca(S.id)) { toast(`🍂 ${CROPS[S.id].nome} não é da época no ${SEA().nome.toLowerCase()}: ela sofreria com o clima e com as pragas. Época: ${CROPS[S.id].estacoes.map((e) => SEASONS.find((x) => x.id === e).nome.toLowerCase()).join(", ")}.`, null, "bad", 5000); fact("epoca", "🍂"); return; }
      if (c) { toast(`Já tem ${CROPS[c.id].nome.toLowerCase()} plantada aqui. Escolha outro canteiro preparado.`, null, "", 2400); return; }
      if (!G.inv.seeds[S.id]) { toast("Acabaram essas sementes. Compre mais na Cooperativa, na vila (🗺️).", null, ""); return; }
      G.inv.seeds[S.id]--;
      t.crop = { id: S.id, age: 0, stage: 0, pest: null, carencia: 0, chem: false, irregular: null, sede: 0, dano: 0, dead: false };
      G.stats.cultivos.add(S.id);
      sfx.plant(); floatText(fx, fy, "🌱", "#2f7d32"); quest("plantar"); tut("plant");
      if (S.id === "flores") fact("flores", "🌼");
      if (!G.inv.seeds[S.id]) G.sel = { kind: "tool", id: "regador" };
      return;
    }
    if (S.kind === "prod") { applyProduct(t, prod(S.id), fx, fy); return; }
  }

  function applyProduct(t, P, fx, fy) {
    const c = t.crop;
    if (!c || c.dead) { toast("Escolha uma planta para aplicar.", null, "", 2000); return; }
    G.inv.prod[P.id]--;
    if (!G.inv.prod[P.id]) G.sel = { kind: "tool", id: "mao" };
    const C = CROPS[c.id];

    if (P.tipo === "agro") {
      G.stats.agro++;
      if (!G.inv.epi) {
        G.hearts -= 2; G.stats.semEPI++; addPts(-20, "Aplicou agrotóxico sem EPI", "semEPI");
        sfx.bad(); fact("semEPI", "🤢");
        toast("Sem EPI você se intoxicou! <span class='jeito'>Certo: luvas, máscara, óculos, avental e botas (compre na 🏪 Loja).</span>", -20, "bad", 6000);
        if (G.hearts <= 0) { G.hearts = 0; G.over = true; setTimeout(gameOver, 1500); }
      }
      const pestAntes = c.pest ? c.pest.id : null;
      const killed = c.pest && P.mata.includes(c.pest.id);
      if (killed) { c.pest = null; quest("praga"); }
      c.chem = true;
      c.carencia = Math.max(c.carencia, P.carencia);
      if (pestAntes && !killed) {
        addPts(-10, `${P.nome} errado para ${PESTS[pestAntes].nome.toLowerCase()}`, "errado");
        sfx.bad(); fact("pragaErrada", "❌");
        toast(`<b>Produto errado para a praga!</b> ${P.nome} não combate ${PESTS[pestAntes].nome.toLowerCase()}: a praga continua e a planta ficou com resíduo. <span class='jeito'>Para ${PESTS[pestAntes].nome.toLowerCase()}: ${PESTS[pestAntes].trata}</span>`, -10, "bad", 7000);
        if (!P.registrado.includes(c.id)) c.irregular = `${P.nome} não é registrado para ${C.nome.toLowerCase()}`;
      } else if (!P.registrado.includes(c.id)) {
        c.irregular = `${P.nome} não é registrado para ${C.nome.toLowerCase()}`;
        addPts(-10, `${P.nome} usado em ${C.nome.toLowerCase()} (não registrado)`, "registro");
        sfx.bad(); fact("naoRegistrado", "📋");
        toast(`<b>Produto não registrado para a planta!</b> O rótulo diz: ${P.nome} é só para ${P.registrado.map((r) => CROPS[r].nome.toLowerCase()).join(" e ")}. Essa ${C.nome.toLowerCase()} vai dar <b>irregular</b> no laboratório.`, -10, "bad", 6500);
      } else if (!killed) {
        addPts(-5, "Aplicou agrotóxico sem praga para combater", "semPraga");
        toast("Não havia praga nenhuma. Aplicar agrotóxico sem necessidade é desperdício e deixa resíduo.", -5, "bad", 4500);
      } else {
        toast(`Praga eliminada. Agora espere a <b>carência de ${P.carencia} horas</b> antes de colher.`, null, "", 4500);
        fact("carencia", "⏳");
      }
      G.inv.embalagens++;
      setTimeout(() => fact("embalagem", "♻️"), 300);
      floatText(fx, fy, "☠️", "#7b3fa0");
      return;
    }
    // alternativas
    G.stats.alternativas++;
    if (P.id === "joaninhas") {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const n = T(t.x + dx, t.y + dy); if (n) n.joaninhas = 4; }
      sfx.good(); floatText(fx, fy, "🐞", "#c2341f"); fact("joaninha", "🐞"); unlock("joaninha");
      if (c.pest && P.mata.includes(c.pest.id)) { c.pest.morreEm = 1; toast("Joaninhas soltas! Em 1 hora elas comem a praga e protegem as vizinhas por 4 horas.", null, "good"); quest("praga"); }
      else if (c.pest) toast(`Joaninhas não comem ${PESTS[c.pest.id].nome.toLowerCase()}. <span class='jeito'>Para ${PESTS[c.pest.id].nome.toLowerCase()}: ${PESTS[c.pest.id].trata}</span>`, null, "bad", 6000);
      else toast("Joaninhas soltas: protegem esta planta e as vizinhas por 4 horas.", null, "good");
      addPts(5, "Usou controle biológico");
      return;
    }
    if (P.id === "neem") {
      c.carencia = Math.max(c.carencia, P.carencia);
      if (c.pest && P.mata.includes(c.pest.id)) {
        if (rnd() < P.chance) { c.pest = null; addPts(8, "Calda natural funcionou"); floatText(fx, fy, "+8", "#2f7d32"); sfx.good(); toast("A calda de neem funcionou! Espere 1 hora e lave antes de colher.", 8, "good"); quest("praga"); }
        else { sfx.bad(); toast("Dessa vez a calda não resolveu. Tente de novo ou use joaninhas.", null, ""); }
      } else if (c.pest) toast(`A calda de neem não combate ${PESTS[c.pest.id].nome.toLowerCase()}. <span class='jeito'>Para ${PESTS[c.pest.id].nome.toLowerCase()}: ${PESTS[c.pest.id].trata}</span>`, null, "bad", 6000);
      else toast("Não havia praga aqui.", null, "");
    }
  }

  function harvest(t, fx, fy) {
    const c = t.crop, C = CROPS[c.id];
    let status = "ok", motivo = "";
    if (c.irregular) { status = "irregular"; motivo = c.irregular; }
    else if (c.carencia > 0) { status = "irregular"; motivo = `colhida na carência (faltavam ${c.carencia} horas)`; }
    G.cesta.push({ id: c.id, status, motivo, chem: c.chem, dano: c.dano });
    setTimeout(() => tut("harvest"), 0);
    unlock("colheita");
    t.crop = null;
    sfx.harvest(); floatText(fx, fy, cropIcon(c.id), "#2f7d32");
    if (status === "irregular") toast(`Colheu ${C.nome.toLowerCase()}… mas tem problema. O laboratório vai mostrar.`, null, "bad");
    else toast(`Colheu ${C.nome.toLowerCase()}! Leve a 🧺 cesta ao 🚰 tanque para lavar.`, null, "good", 2600);
  }

  /* ---------- Raio-X da cesta ---------- */
  function deliver() {
    if (!G.cesta.length) { toast("Sua cesta está vazia. Colha algo pronto (com ✓) usando a ✋ mão.", null, ""); return; }
    G.player.tx = 7.5; G.player.ty = 2.5; G.focus = [7, 2];
    if (naVila()) { toast("O tanque fica na fazenda. Volte pelo 🗺️ Mapa para lavar a colheita.", null, "", 3500); return; }
    const kinds = [...new Set(G.cesta.filter((it) => it.status !== "irregular" && WASH_KIND[it.id]).map((it) => it.id))];
    washStep(kinds, 0);
  }
  function washStep(kinds, i) {
    if (i >= kinds.length) { raioX(); return; }
    const id = kinds[i], C = CROPS[id], W = WASH[WASH_KIND[id]];
    const wrong = [...WASH_WRONG].sort(() => rnd() - 0.5).slice(0, 3);
    const opts = [{ t: W.certo, pts: 10, ok: true }, ...wrong].sort(() => rnd() - 0.5);
    const n = G.cesta.filter((it) => it.id === id && it.status !== "irregular").length;
    openModal(`<div class="box stack">
      <p class="eyebrow">🚰 Tanque do quintal · ${i + 1} de ${kinds.length}</p>
      <div class="row"><span style="font-size:46px">${cropIcon(id)}</span><div><h2>Como lavar ${n > 1 ? `${n} ${C.nome.toLowerCase()}s` : `${["alface", "couve", "cenoura", "cebola", "uva"].includes(id) ? "a" : "o"} ${C.nome.toLowerCase()}`}?</h2>
      ${C.para !== null ? paraHTML(C) : `<p class="small muted">Mesmo sem agrotóxico, lave para tirar terra e micróbios.</p>`}</div></div>
      <div class="washopts">${opts.map((o, k) => `<button class="wopt" data-k="${k}">${esc(o.t)}</button>`).join("")}</div>
      <div id="wfb"></div></div>`);
    modalEl.querySelectorAll(".wopt").forEach((b) => {
      b.onclick = () => {
        const o = opts[+b.dataset.k];
        modalEl.querySelectorAll(".wopt").forEach((x, k) => { x.disabled = true; if (opts[k].ok) x.classList.add("right"); });
        if (!o.ok) b.classList.add("wrong");
        addPts(o.pts, `Lavou ${C.nome.toLowerCase()}: ${o.ok ? "jeito certo" : o.t.toLowerCase()}`);
        G.stats.lavouTotal++; if (o.ok) G.stats.lavouCerto++; else lose("lavar", 10 - o.pts);
        o.ok ? sfx.good() : o.pts < 0 ? sfx.bad() : beep([520]);
        $("#wfb").innerHTML = `<div class="fb ${o.ok ? "ok" : "no"}"><b>${o.ok ? "✅ Isso!" : o.pts < 0 ? "❌ Não!" : "🤏 Quase."}</b> ${o.ok ? W.porque : `${o.msg}<br><b>Jeito certo:</b> ${W.certo}.`}
          <span class="tp">${o.pts > 0 ? "+" : ""}${o.pts}</span></div>
          <div style="margin-top:10px"><button class="btn green" id="wnext">${i + 1 < kinds.length ? "Próximo alimento →" : "Ver o Raio-X →"}</button></div>`;
        $("#wnext").onclick = () => washStep(kinds, i + 1);
      };
    });
  }
  function raioX() {
    let total = 0, coins = 0;
    const rows = G.cesta.map((it) => {
      const C = CROPS[it.id];
      let pts, txt, cls = "";
      if (it.status === "irregular") {
        pts = -15; txt = `⚠️ Irregular: ${esc(it.motivo)}`; cls = "bad"; G.stats.irregulares++;
        lose(it.motivo.startsWith("colhida na carência") ? "carencia" : "registro", 35);
      } else {
        pts = 20 + (it.chem ? 0 : 10) - (it.dano ? 8 : 0);
        txt = `✅ Saudável${it.chem ? " (com agrotóxico usado do jeito certo)" : " · sem agrotóxico +10"}${it.dano ? " · folhas danificadas pela praga" : ""}`;
        G.stats.saudaveis++;
      }
      total += pts;
      const cmp = C.para !== null ? `<div class="compare">${dez(C.para)} <span>No mercado, <b>${deCada10(C.para)}</b> amostras de ${C.nome.toLowerCase()} tinham problema. A sua: <b>${it.status === "irregular" ? "também ❌" : "limpa ✅"}</b></span></div>` : "";
      return `<div class="xrow ${cls}"><div class="i">${cropIcon(it.id)}</div><div><b>${C.nome}</b><div class="small">${txt}</div>${cmp}</div><div class="p ${pts < 0 ? "neg" : "pos"}">${pts > 0 ? "+" : ""}${pts}</div></div>`;
    }).join("");
    addPts(total, `Cesta entregue (${G.cesta.length} itens)`);
    G.cesta.filter((it) => it.status !== "irregular").forEach((it) => G.despensa.push({ id: it.id, status: "ok", chem: it.chem }));
    const perdidos = G.cesta.filter((it) => it.status === "irregular").length;
    G.cesta = [];
    quest("colher");
    tut("deliver");
    sfx.coin();
    openModal(`<div class="box stack">
      <p class="eyebrow">🔬 Raio-X do laboratório</p>
      <h2>Agrotóxico não tem cor, cheiro nem sabor.</h2>
      <p class="muted small">Só a análise mostra. Veja o que foi encontrado na sua colheita:</p>
      <div class="xlist">${rows}</div>
      <p><b>${total >= 0 ? "+" : ""}${total} pontos</b></p>
      <p class="small">🥫 Os alimentos saudáveis foram para a despensa do José (🎒). Venda o que sobrar na 🏷️ banca ou guarde para a Feira Comunitária.${perdidos ? ` <b style="color:var(--bad)">${perdidos} irregular(es) foi(ram) para o lixo: o José não vai comer isso.</b>` : ""}</p>
      <div><button class="btn green" id="ok">Voltar para a horta</button></div></div>`);
    $("#ok").onclick = () => { closeModal(); fact("colheita", "🔬"); fact("despensa", "🥫"); renderUI(); if (G.endPending) finish(); };
    saveGame();
    renderUI();
  }

  /* ---------- Guia: o que tem mais agrotóxico e como lavar ---------- */
  function openGuide() {
    const max = GUIDE[0][1];
    openModal(`<div class="box stack">
      <div class="row" style="justify-content:space-between"><h2>📖 Guia do José</h2><button class="btn ghost" id="close" style="padding:8px 16px;font-size:15px">Fechar</button></div>
      <h3>🔬 Quais alimentos têm mais agrotóxico?</h3>
      <p class="small">De cada 100 amostras que a <b>Anvisa</b> comprou no mercado e testou no laboratório, quantas estavam <b>irregulares</b>: agrotóxico acima do limite ou que nem podia ser usado naquele alimento. Esse programa da Anvisa se chama <b>PARA</b> (Programa de Análise de Resíduos de Agrotóxicos em Alimentos). Irregular não quer dizer, necessariamente, risco imediato.</p>
      <div class="rank">${GUIDE.map(([n, v, f]) => `<div class="rk"><span class="n">${n}</span><span class="bar"><span style="width:${(v / max) * 100}%;background:${v >= 30 ? "var(--tomato)" : v >= 15 ? "var(--sun)" : "var(--leaf)"}"></span></span><span class="v">${String(v).replace(".", ",")}%</span><small>${f}</small></div>`).join("")}</div>
      <h3>🚿 Como lavar do jeito certo</h3>
      <div class="washlist">${GUIDE_WASH.map(([i, n, t, k]) => `<div class="wl ${k}"><span class="i">${i}</span><div><b>${n}</b><br><span class="small">${t}</span></div></div>`).join("")}</div>
      <h3>💡 Dicas</h3><ul class="small">${GUIDE_TIPS.map((t) => `<li>${t}</li>`).join("")}</ul>
      <p class="small muted">Fontes: Anvisa, programa PARA (2017–2024); Ministério da Agricultura – MAPA (2020); Marins (2025); Yang et al. (2017).</p>
      </div>`);
    $("#close").onclick = () => { closeModal(); if (G.factQueue.length) nextFact(); };
  }

  /* ---------- Encomendas ---------- */


  /* ==========================================================
     PEDIDOS, PREÇOS E REPUTAÇÃO
     ========================================================== */
  const feiraRestaurada = () => G.bundlesFeitos.length >= BUNDLES.length && !G.agromax;
  function novaEncomenda() {
    const opts = Object.keys(CROPS).filter((id) => !CROPS[id].companheira && doEpoca(id) && CROPS[id].horas <= 2 + G.day);
    if (!opts.length) return;
    const id = opts[Math.floor(rnd() * opts.length)];
    const qtd = 1 + Math.floor(rnd() * 2);
    const semAgro = rnd() < 0.5;
    const cl = CLIENTES[Math.floor(rnd() * CLIENTES.length)];
    G.encomenda = { id, qtd, semAgro, cliente: cl.nome, avatar: cl.avatar, npc: cl.npc || null,
      paga: Math.round(CROPS[id].venda * qtd * (semAgro ? 1.8 : 1.4) * REP_PRECO[repStars()] * (isFeira() ? FEIRA_BONUS : 1)) + 4, feita: false, expira: Math.min(DAY_END, G.hour + PEDIDO_HORAS) };
  }
  const precoVenda = (d) => Math.max(1, Math.round(itemVendaBase(d) * (d.chem ? 1 : SEM_AGRO_BONUS) * REP_PRECO[repStars()] * (isFeira() ? (feiraRestaurada() ? 2 : FEIRA_BONUS) : 1) * (G.bonusBanca || 1)));
  function changeRep(d) {
    const before = repStars();
    G.rep = Math.max(1, Math.min(5, (G.rep || REP_INICIAL) + d));
    const after = repStars();
    if (after > before) setTimeout(() => toast(`⭐ Sua banca subiu para <b>${after} estrelas</b>! Os vizinhos pagam mais.`, null, "good", 3500), 600);
    else if (after < before) setTimeout(() => toast(`Sua banca caiu para ${after} estrela(s): os vizinhos pagam menos.`, null, "bad", 3500), 600);
  }
  /* agrupa a despensa: [{d, idx:[...]}] */
  function despensaGrupos(filtro = () => true) {
    const g = {};
    G.despensa.forEach((d, i) => { if (!filtro(d)) return; const k = d.id + "|" + (d.base || "") + (d.chem ? "*" : ""); (g[k] = g[k] || { d, idx: [] }).idx.push(i); });
    return Object.values(g);
  }
  const itemLinha = (d, n) => `<div class="i">${itemIcon(d)}</div><div><b>${esc(itemNome(d))}</b> ×${n}<div class="small">${d.id === "biscoito" ? "ultraprocessado" : d.chem ? "☠️ com agrotóxico" : "🌿 sem agrotóxico"}</div></div>`;

  /* ---------- Banca do José (na fazenda) ---------- */
  function openBanca() {
    tut("banca"); fact("banca", "🏷️");
    const e = G.encomenda;
    const serve = (d) => e && d.id === e.id && d.status === "ok" && (!e.semAgro || !d.chem);
    const tem = e ? G.despensa.filter(serve).length : 0;
    const linhas = despensaGrupos((d) => d.id !== "biscoito").map(({ d, idx }) => `
      <div class="xrow">${itemLinha(d, idx.length)}<button class="btn green sell" data-i="${idx[0]}">Vender 🪙${precoVenda(d)}</button></div>`).join("");
    const prox = nextMeal();
    openModal(`<div class="box stack">
      <div class="row" style="justify-content:space-between"><h2>🏷️ Banca do José</h2><span class="chip">🪙 ${G.coins}</span></div>
      <div class="repline"><span class="stars big">${"★".repeat(repStars())}<i>${"★".repeat(5 - repStars())}</i></span> <span class="small">Reputação: preços ×${String(REP_PRECO[repStars()]).replace(".", ",")}. Sobe vendendo sem agrotóxico e entregando pedidos.</span></div>
      ${isFeira() ? `<div class="feirabar">🎪 <b>Sábado é dia de feira!</b> Vendas valem ${feiraRestaurada() ? "o dobro (Feira Comunitária aberta)" : "50% mais"}.</div>` : ""}
      ${e && !e.feita ? `<div class="order"><div class="av">${e.avatar}</div><div><b>${esc(e.cliente)}</b> quer <b>${e.qtd}× ${cropIcon(e.id)} ${CROPS[e.id].nome.toLowerCase()}</b>${e.semAgro ? " <b>sem agrotóxico</b>" : ""}.<div class="small">Paga 🪙${e.paga} + 25 pontos${e.npc ? " + amizade ❤️" : ""} · ⏳ faltam ${Math.max(0, e.expira - Math.floor(G.hour))}h · você tem ${tem}/${e.qtd}</div></div>
        <button class="btn" id="entregar" ${tem >= e.qtd ? "" : "disabled"}>Entregar</button></div>`
        : `<div class="order done" style="background:#f3eee5;border-color:var(--line)">⏳ Nenhum pedido agora. Novos pedidos chegam ao longo do dia.</div>`}
      <h3>🥫 Para vender</h3>
      ${linhas || `<p class="small muted">Nada para vender. Colha e lave no 🚰 tanque primeiro.</p>`}
      <p class="small" style="color:${G.despensa.length <= 1 ? "var(--bad)" : "var(--muted)"}">🍽️ Guarde comida para o José (almoço 12h, jantar 19h)! ${prox ? `Na próxima refeição ele come: ${itemIcon(prox)} ${esc(itemNome(prox)).toLowerCase()}.` : "<b>A despensa está vazia.</b>"}</p>
      <div><button class="btn ghost" id="close">Voltar</button></div></div>`);
    modalEl.querySelectorAll(".sell").forEach((b) => {
      b.onclick = () => {
        const i = +b.dataset.i, d = G.despensa[i], v = precoVenda(d);
        G.despensa.splice(i, 1); G.coins += v; G.vendidos++;
        if (!d.chem) changeRep(0.2);
        if (isFeira()) { G.stats.vendasFeira++; unlock("feira"); }
        addPts(d.chem ? 3 : 6, `Vendeu ${itemNome(d).toLowerCase()}${d.chem ? "" : " sem agrotóxico"}`);
        sfx.coin(); unlock("venda"); renderUI(); openBanca();
      };
    });
    const ent = $("#entregar");
    if (ent) ent.onclick = () => {
      let n = e.qtd;
      for (let i = G.despensa.length - 1; i >= 0 && n > 0; i--) if (serve(G.despensa[i])) { G.despensa.splice(i, 1); n--; }
      e.feita = true; G.coins += e.paga; G.pedidosOk++; changeRep(0.5);
      if (e.npc) addAmizade(e.npc, 40);
      addPts(25, `Encomenda entregue para ${e.cliente}`);
      sfx.harvest(); toast(`📦 ${e.avatar} ${esc(e.cliente)} adorou! +🪙${e.paga}`, 25, "good");
      if (G.pedidosOk >= 3) unlock("pedidos");
      renderUI(); openBanca();
    };
    $("#close").onclick = () => { closeModal(); if (G.factQueue.length) nextFact(); };
    if (!G.shownFacts.has("reputacao") && G.vendidos + G.pedidosOk > 0) fact("reputacao", "⭐");
  }

  /* ==========================================================
     LOJAS DA VILA: Cooperativa (sem veneno) e AgroMax (agrotóxicos)
     ========================================================== */
  const prodBtn = (p) => {
    const have = p.tipo === "epi" ? (G.inv.epi ? "você já tem" : "") : (G.inv.prod[p.id] ? `você tem ${G.inv.prod[p.id]}` : "");
    const dis = G.coins < p.preco || (p.tipo === "epi" && G.inv.epi);
    const info = p.mata ? `<small><b>Combate:</b> ${p.mata.map((m) => PESTS[m].nome.toLowerCase()).join(", ")}${p.registrado ? `<br><b>Pode usar em:</b> ${p.registrado.map((r) => CROPS[r].nome.toLowerCase()).join(", ")}` : ""}</small>` : "";
    return `<button class="prod" data-p="${p.id}" ${dis ? "disabled" : ""}><span class="i">${p.icone}</span>
      <b>${p.nome} ${have ? `<span class="have">· ${have}</span>` : ""}</b><span class="price">🪙 ${p.preco}</span><small>${p.desc}</small>${info}</button>`;
  };
  function bindProdButtons(reopen) {
    modalEl.querySelectorAll("[data-p]").forEach((b) => {
      b.onclick = () => {
        const p = prod(b.dataset.p);
        if (G.coins < p.preco) return;
        G.coins -= p.preco; sfx.coin();
        if (p.tipo === "epi") G.inv.epi = true;
        else { G.inv.prod[p.id] = (G.inv.prod[p.id] || 0) + 1; G.sel = { kind: "prod", id: p.id }; }
        if (p.tipo === "agro") setTimeout(() => fact("receita", "🧑‍🌾"), 50);
        reopen(); renderUI();
      };
    });
  }
  function openShop() {
    tut("shop");
    const seedBtn = (id) => {
      const C = CROPS[id];
      return `<button class="prod" data-s="${id}" ${G.coins < C.preco ? "disabled" : ""}><span class="i">${cropIcon(id)}</span>
        <b>${C.nome}${G.inv.seeds[id] ? ` <span class="have">· ${G.inv.seeds[id]}</span>` : ""}</b><span class="price">🪙 ${C.preco}</span>
        <small>${C.companheira ? "Flor companheira: atrai joaninhas" : `${C.horas} horas para colher`}</small></button>`;
    };
    const S = SEA(), prox = SEASONS[(seasonIdx(G.day) + 1) % 4];
    openModal(`<div class="box stack">
      <div class="row" style="justify-content:space-between"><h2>🏪 Cooperativa</h2><span class="chip">🪙 ${G.coins}</span></div>
      <div class="shopgrid">
        <section class="shopcol seeds"><h3>🌱 Sementes da época · ${S.icone} ${S.nome}</h3><div class="seedrow">${Object.keys(CROPS).filter((id) => doEpoca(id)).map(seedBtn).join("")}</div>
          <p class="small muted">Só vendemos sementes da época. Próxima estação (${prox.icone} ${prox.nome}): ${Object.keys(CROPS).filter((id) => doEpoca(id, prox) && !CROPS[id].companheira).map((id) => cropIcon(id)).join(" ")}</p></section>
        <section class="shopcol alt"><h3>🌿 Alternativas sem veneno</h3><p class="small muted">Sem resíduo no alimento. Às vezes mais lentas.</p>
          ${PRODUCTS.filter((p) => p.tipo === "alt").map(prodBtn).join("")}
          <p class="small muted">Grátis na barra: ✋ catar lagarta e lesma · ✂️ podar fungo · 🌼 plantar flores</p></section>
        <section class="shopcol ups"><h3>🔧 Melhorias da fazenda</h3><div class="uprow">${UPGRADES.map((u) => `<button class="prod up" data-u="${u.id}" ${G.up[u.id] || G.coins < u.preco ? "disabled" : ""}><span class="i">${u.icone}</span><b>${u.nome}</b><span class="price">${G.up[u.id] ? "✅ seu" : `🪙 ${u.preco}`}</span><small>${u.desc}</small></button>`).join("")}
          ${G.up.galinheiro ? `<button class="prod up" id="galinha" ${G.galinhas >= GALINHAS_MAX || G.coins < GALINHA_PRECO ? "disabled" : ""}><span class="i">🐔</span><b>Galinha caipira <span class="have">· ${G.galinhas}/${GALINHAS_MAX}</span></b><span class="price">🪙 ${GALINHA_PRECO}</span><small>Come insetos da horta (menos pragas) e bota 1 ovo por dia.</small></button>` : ""}</div></section>
      </div>
      <p class="small muted">Agrotóxicos e EPI ficam na AgroMax, do outro lado da praça.</p>
      <div><button class="btn green" id="close">Voltar para a vila</button></div></div>`);
    bindProdButtons(openShop);
    modalEl.querySelectorAll("[data-u]").forEach((b) => {
      b.onclick = () => {
        const u = UPGRADES.find((x) => x.id === b.dataset.u);
        if (G.up[u.id] || G.coins < u.preco) return;
        G.coins -= u.preco; G.up[u.id] = true; applyUpgrades(); sfx.harvest(); unlock("melhoria");
        toast(`🔧 ${u.icone} <b>${u.nome}</b>: ${u.desc}`, null, "good", 4500);
        if (FACTS[u.id]) setTimeout(() => fact(u.id, u.icone), 50);
        if (u.id === "galinheiro") setTimeout(() => fact("galinhas", "🐔"), 60);
        openShop(); renderUI(); saveGame();
      };
    });
    const gb = $("#galinha");
    if (gb) gb.onclick = () => { if (G.coins < GALINHA_PRECO || G.galinhas >= GALINHAS_MAX) return; G.coins -= GALINHA_PRECO; G.galinhas++; sfx.coin(); toast("🐔 Uma galinha nova no galinheiro!", null, "good", 2500); openShop(); renderUI(); };
    modalEl.querySelectorAll("[data-s]").forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.s, C = CROPS[id];
        if (G.coins < C.preco) return;
        G.coins -= C.preco; sfx.coin();
        G.inv.seeds[id] = (G.inv.seeds[id] || 0) + 1;
        G.sel = { kind: "seed", id };
        openShop(); renderUI();
      };
    });
    $("#close").onclick = () => { closeModal(); if (G.factQueue.length) nextFact(); };
  }
  function openAgroMax() {
    fact("agromax", "🏢");
    const podeContrato = !G.agromax && !feiraRestaurada();
    const vendaveis = G.agromax ? despensaGrupos((d) => d.id !== "biscoito") : [];
    openModal(`<div class="box stack">
      <div class="row" style="justify-content:space-between"><h2>🏢 AgroMax</h2><span class="chip">🪙 ${G.coins}</span></div>
      <p class="small">🧑🏻‍💼 <b>Marcos:</b> “Praga nunca mais! Tudo rápido, prático, garantido!”</p>
      <section class="shopcol agro"><h3>☠️ Agrotóxicos</h3>
        <div class="rules"><b>📋 Regras do agrotóxico (o Marcos não conta)</b><ol>
          <li>Produto certo para a <b>praga</b> (veja "Combate")</li>
          <li>Registrado para a <b>planta</b> (veja "Pode usar em")</li>
          <li>Sempre com <b>EPI</b></li>
          <li>Esperar a <b>carência</b> antes de colher</li>
          <li><b>Devolver</b> a embalagem vazia</li></ol>
          <small>Errou uma regra? Perde pontos, saúde ou a colheita.</small></div>
        ${PRODUCTS.filter((p) => p.tipo !== "alt").map(prodBtn).join("")}</section>
      ${podeContrato ? `<section class="contrato"><h3>📄 Contrato AgroMax</h3>
        <p>A AgroMax paga <b>🪙${CONTRATO_AGROMAX}</b> agora e compra toda a sua produção, até com agrotóxico, pelo preço de alimento limpo.</p>
        <p class="small"><b>Em troca:</b> o galpão da Feira Comunitária vira depósito da AgroMax (a feira acaba) e, toda segunda-feira, a equipe da AgroMax pulveriza agrotóxico na sua horta.</p>
        <button class="btn" id="assinar">Assinar contrato</button></section>` : ""}
      ${G.agromax ? `<section class="contrato"><h3>🏷️ Vender para a AgroMax</h3>${vendaveis.map(({ d, idx }) => `<div class="xrow">${itemLinha(d, idx.length)}<button class="btn sellag" data-i="${idx[0]}">Vender 🪙${precoVenda({ ...d, chem: false })}</button></div>`).join("") || `<p class="small muted">Nada na despensa para vender.</p>`}</section>` : ""}
      <div><button class="btn green" id="close">Voltar para a vila</button></div></div>`);
    bindProdButtons(openAgroMax);
    const as = $("#assinar");
    if (as) as.onclick = () => {
      if (!as.dataset.ok) { as.dataset.ok = "1"; as.textContent = "Tem certeza? A feira será demolida"; as.classList.add("danger"); return; }
      G.agromax = true; G.coins += CONTRATO_AGROMAX; addAmizade("jorge", -100); addAmizade("marcos", 100);
      sfx.coin(); toast(`📄 Contrato assinado: +🪙${CONTRATO_AGROMAX}. O galpão da feira virou depósito da AgroMax.`, null, "bad", 6000);
      saveGame(); openAgroMax(); renderUI();
    };
    modalEl.querySelectorAll(".sellag").forEach((b) => {
      b.onclick = () => { const i = +b.dataset.i, d = G.despensa[i]; G.despensa.splice(i, 1); G.coins += precoVenda({ ...d, chem: false }); G.vendidos++; sfx.coin(); addPts(2, `Vendeu ${itemNome(d).toLowerCase()} para a AgroMax`); openAgroMax(); renderUI(); };
    });
    $("#close").onclick = () => { closeModal(); if (G.factQueue.length) nextFact(); };
  }

  /* ==========================================================
     VIAGEM E MAPA
     ========================================================== */
  function travel(area) {
    if (G.area === area) { closeModal(); return; }
    closeModal();
    G.area = area; G.focus = null;
    if (area === "vila") { G.player.x = G.player.tx = 0.6; G.player.y = G.player.ty = 6.4; }
    else { G.player.x = G.player.tx = 6.5; G.player.y = G.player.ty = 6.4; }
    setupView();
    if (area === "vila") {
      const F = festival();
      toast(F ? `${F.icone} <b>${F.nome}</b> na praça da vila! ${F.desc} Toque na barraca da festa.` : "🏘️ Vila de Taiaçupeba. Toque nas lojas e converse com os vizinhos!", null, "good", 4500);
    } else toast("🏡 De volta à fazenda.", null, "", 2000);
    sfx.dig();
    if (!G.over && (G.tut < 0 || G.tut > 4)) hourTick();   // a caminhada leva 1 hora
    renderUI();
  }
  function openMap() {
    const aqui = G.area;
    openModal(`<div class="box stack">
      <div class="row" style="justify-content:space-between"><h2>🗺️ Mapa de Taiaçupeba</h2><button class="btn ghost" id="close" style="padding:8px 16px;font-size:15px">Fechar</button></div>
      <div class="wmap">
        <div class="wm serra">⛰️ Serra do Itapeti<small>paisagem</small></div>
        <button class="wm fazenda ${aqui === "fazenda" ? "aqui" : ""}" data-go="fazenda">🏡 Fazenda do José${aqui === "fazenda" ? "<small>você está aqui</small>" : "<small>1 hora de caminhada</small>"}</button>
        <button class="wm vila ${aqui === "vila" ? "aqui" : ""}" data-go="vila">🏘️ Vila${aqui === "vila" ? "<small>você está aqui</small>" : "<small>Cooperativa · AgroMax · Feira · vizinhos</small>"}</button>
        <div class="wm represa">🌊 Represa de Taiaçupeba<small>paisagem</small></div>
      </div>
      ${festival() ? `<p class="feirabar">${festival().icone} Hoje tem <b>${festival().nome}</b> na praça da vila!</p>` : ""}</div>`);
    modalEl.querySelectorAll("[data-go]").forEach((b) => { b.onclick = () => travel(b.dataset.go); });
    $("#close").onclick = () => { closeModal(); if (G.factQueue.length) nextFact(); };
  }

  /* ==========================================================
     VILA: prédios, vizinhos, festival
     ========================================================== */
  const npcNaVila = () => true;
  function actVila(x, y) {
    const b = predioEm(x, y);
    if (b === "cooperativa") { openShop(); return; }
    if (b === "agromax") { openAgroMax(); return; }
    if (b === "feira") { openFeira(); return; }
    const n = npcEm(x, y); if (n) { talk(n); return; }
    if (isVSpot("paraFazenda", x, y)) { travel("fazenda"); return; }
    if (isVSpot("festa", x, y) && festival()) { openFestival(); return; }
  }
  const pontosAmizade = (id) => G.amizade[id] || 0;
  const coracoes = (id) => Math.min(CORACOES_MAX, Math.floor(pontosAmizade(id) / AMIZADE_POR_CORACAO));
  const coracoesHTML = (id) => `<span class="hearts">${"♥".repeat(coracoes(id))}<i>${"♥".repeat(CORACOES_MAX - coracoes(id))}</i></span>`;
  function addAmizade(id, n) {
    const antes = coracoes(id);
    G.amizade[id] = Math.max(0, Math.min(CORACOES_MAX * AMIZADE_POR_CORACAO, pontosAmizade(id) + n));
    const depois = coracoes(id), npc = NPCS.find((x) => x.id === id);
    if (depois > antes) setTimeout(() => toast(`❤️ Amizade com ${npc.nome}: ${depois} coração(ões)!`, null, "good", 3000), 300);
    if (depois >= 3 && !G.premiado[id]) darPremio(npc);
  }
  function darPremio(npc) {
    G.premiado[npc.id] = true; unlock("amigo");
    const P = npc.premio;
    if (P.tipo === "upgrade") { if (G.up[P.id]) G.coins += 20; else { G.up[P.id] = true; applyUpgrades(); } }
    if (P.tipo === "itens") { Object.entries(P.prod || {}).forEach(([k, v]) => { G.inv.prod[k] = (G.inv.prod[k] || 0) + v; }); Object.entries(P.seeds || {}).forEach(([k, v]) => { G.inv.seeds[k] = (G.inv.seeds[k] || 0) + v; }); }
    if (P.tipo === "bonus") G.bonusBanca = 1.1;
    setTimeout(() => toast(`🎁 ${npc.avatar} <b>${npc.nome}:</b> “${P.txt}”`, null, "good", 6500), 900);
    renderUI();
  }
  function talk(npc) {
    const hoje = G.day;
    if (G.falou[npc.id] !== hoje) { G.falou[npc.id] = hoje; addAmizade(npc.id, 10); }
    const linhas = npc.falas.slice(0, coracoes(npc.id) + 1).flat();
    const i = (G.falaIdx[npc.id] || 0) % linhas.length;
    G.falaIdx[npc.id] = i + 1;
    const L = typeof linhas[i] === "string" ? { t: linhas[i] } : linhas[i];
    const jaDeu = G.presenteou[npc.id] === hoje;
    openModal(`<div class="box stack talk">
      <div class="talkhead"><img class="portrait" src="${retrato(npc.id)}" alt="${npc.nome}"><div><h2>${npc.nome}</h2><span class="small muted">${npc.papel}</span><br>${coracoesHTML(npc.id)}</div></div>
      <div class="dialog jose"><p>“${L.t}”</p></div>
      ${L.nota ? `<div class="nota">💡 <b>Na verdade:</b> ${L.nota}</div>` : ""}
      <div class="row"><button class="btn green" id="gift" ${jaDeu ? "disabled" : ""}>🎁 ${jaDeu ? "Já ganhou presente hoje" : "Dar presente"}</button><button class="btn ghost" id="close">Tchau!</button></div>
      <div id="giftlist"></div></div>`);
    $("#gift").onclick = () => {
      const grupos = despensaGrupos();
      $("#giftlist").innerHTML = grupos.length ? `<p class="small muted">Escolha um item da despensa. Cada vizinho tem os seus favoritos!</p><div class="giftgrid">${grupos.map(({ d, idx }) => `<button class="prod" data-g="${idx[0]}"><span class="i">${itemIcon(d)}</span><b>${esc(itemNome(d))} ×${idx.length}</b><small>${d.chem ? "com agrotóxico" : d.id === "biscoito" ? "ultraprocessado" : "sem agrotóxico"}</small></button>`).join("")}</div>`
        : `<p class="small muted">A despensa está vazia. Colha e lave alimentos para presentear.</p>`;
      modalEl.querySelectorAll("[data-g]").forEach((b) => {
        b.onclick = () => {
          const d = G.despensa[+b.dataset.g]; G.despensa.splice(+b.dataset.g, 1); G.presenteou[npc.id] = hoje;
          let n = 10, msg = "Obrigado!";
          if (npc.ama.includes(d.id)) { n = 50; msg = "Eu adoro isso! Muito obrigado! 😍"; }
          else if (npc.gosta.includes(d.id)) { n = 25; msg = "Que gentileza, eu gosto muito! 😊"; }
          else if (d.id === "biscoito") { n = -10; msg = "Biscoito de pacote? Prefiro comida de verdade... 😕"; }
          if (d.chem && npc.id !== "marcos" && n > 0) { n = Math.round(n / 2); msg += " (Mas esse tem agrotóxico, né?)"; }
          addAmizade(npc.id, n); sfx[n > 0 ? "good" : "bad"]();
          toast(`${npc.avatar} <b>${npc.nome}:</b> “${msg}” ${n > 0 ? "+" : ""}${n} amizade`, null, n > 0 ? "good" : "bad", 4000);
          renderUI(); talk(npc);
        };
      });
    };
    $("#close").onclick = () => { closeModal(); if (G.factQueue.length) nextFact(); };
    renderUI();
  }

  /* ---------- Feira Comunitária: pacotes ---------- */
  const bundleTem = (bid, item) => ((G.bundles[bid] || {})[item] || 0);
  const serveBundle = (item) => (d) => d.status === "ok" && !d.chem && d.id === item;
  function openFeira() {
    if (G.agromax) {
      openModal(`<div class="box stack"><h2>📦 Depósito da AgroMax</h2><p>Aqui era a Feira Comunitária. Com o contrato, o galpão virou depósito de agrotóxico da AgroMax.</p><p class="small muted">👨🏾‍🦳 Seu Jorge: “A vila perdeu o lugar onde a gente conhecia quem produz a comida...”</p><div><button class="btn ghost" id="close">Voltar</button></div></div>`);
      $("#close").onclick = closeModal; return;
    }
    fact("feiraComunitaria", "🏛️");
    const feitos = G.bundlesFeitos.length;
    openModal(`<div class="box stack">
      <div class="row" style="justify-content:space-between"><h2>🏛️ Feira Comunitária</h2><span class="chip">${feitos}/${BUNDLES.length} pacotes</span></div>
      <p class="small">Entregue alimentos <b>lavados e sem agrotóxico</b> para reconstruir a feira. Cada pacote completo traz um prêmio. Com todos, a feira reabre e, aos sábados, as vendas valem o dobro.</p>
      <div class="bundles">${BUNDLES.map((B) => {
        const done = G.bundlesFeitos.includes(B.id);
        return `<div class="bundle ${done ? "done" : ""}"><div class="bh"><span class="bi">${B.icone}</span><b>${B.nome}</b><span class="small">${done ? "✅ completo" : `prêmio 🪙${B.premio.moedas}`}</span></div>
          <div class="bitens">${B.itens.map(([item, q]) => { const t = bundleTem(B.id, item), d = { id: item }, disp = G.despensa.filter(serveBundle(item)).length; return `<span class="bit ${t >= q ? "ok" : ""}">${itemIcon(d)} ${esc(itemNome(d))} ${Math.min(t, q)}/${q}${!done && t < q ? ` <small>(tem ${disp})</small>` : ""}</span>`; }).join("")}</div>
          ${!done ? `<button class="btn green small-btn" data-b="${B.id}">Entregar o que tenho</button>` : ""}</div>`;
      }).join("")}</div>
      <div><button class="btn ghost" id="close">Voltar para a vila</button></div></div>`);
    modalEl.querySelectorAll("[data-b]").forEach((b) => {
      b.onclick = () => {
        const B = BUNDLES.find((x) => x.id === b.dataset.b);
        G.bundles[B.id] = G.bundles[B.id] || {};
        let pos = 0, comAgro = 0;
        B.itens.forEach(([item, q]) => {
          while (bundleTem(B.id, item) < q) {
            const i = G.despensa.findIndex(serveBundle(item));
            if (i < 0) break;
            G.despensa.splice(i, 1); G.bundles[B.id][item] = bundleTem(B.id, item) + 1; pos++;
          }
          comAgro += G.despensa.filter((d) => d.id === item && d.chem).length;
        });
        if (!pos) { toast(comAgro ? "A feira só aceita alimento <b>sem agrotóxico</b>. Os seus têm resíduo." : "Você ainda não tem esses alimentos lavados na despensa.", null, "bad", 4000); return; }
        sfx.good();
        if (B.itens.every(([item, q]) => bundleTem(B.id, item) >= q)) {
          G.bundlesFeitos.push(B.id); G.coins += B.premio.moedas; addPts(40, `Pacote completo: ${B.nome}`); unlock("pacote"); addAmizade("jorge", 30);
          toast(`🏛️ <b>${B.nome}</b> completo! +🪙${B.premio.moedas}. A feira está ficando bonita!`, 40, "good", 5000);
          if (G.bundlesFeitos.length >= BUNDLES.length) { unlock("feiraviva"); setTimeout(() => toast("🎉 <b>A Feira Comunitária reabriu!</b> Aos sábados, as vendas valem o dobro.", null, "good", 7000), 1200); }
        } else toast(`Entregou ${pos} item(ns) para o ${B.nome}.`, null, "good", 2500);
        renderUI(); openFeira(); saveGame();
      };
    });
    $("#close").onclick = () => { closeModal(); if (G.factQueue.length) nextFact(); };
  }

  /* ---------- festival do sábado ---------- */
  const serveFestival = (F) => (d) => d.status === "ok" && !d.chem && (F.concurso.includes(d.id) || (F.concurso.includes("conserva") && ehConserva(d)));
  function openFestival() {
    const F = festival(), S = SEA(); if (!F) return;
    const ja = G.festivais.includes(S.id);
    const cand = despensaGrupos(serveFestival(F));
    openModal(`<div class="box stack">
      <h2>${F.icone} ${F.nome}</h2><p>${F.desc}</p>
      <div class="order"><div class="av">🏆</div><div><b>Concurso:</b> o júri quer ${F.pede}, <b>sem agrotóxico</b>.<div class="small">Prêmio: 🪙${FESTIVAL_PREMIO}, 30 pontos e amizade com toda a vila.</div></div></div>
      ${ja ? `<p class="feirabar">✅ Você já ganhou o concurso deste festival!</p>` : cand.length ? `<div class="giftgrid">${cand.map(({ d, idx }) => `<button class="prod" data-f="${idx[0]}"><span class="i">${itemIcon(d)}</span><b>${esc(itemNome(d))}</b><small>inscrever no concurso</small></button>`).join("")}</div>` : `<p class="small muted">Você não tem ${F.pede} sem agrotóxico na despensa. Fica para o próximo ano!</p>`}
      <div><button class="btn ghost" id="close">Voltar para a festa</button></div></div>`);
    modalEl.querySelectorAll("[data-f]").forEach((b) => {
      b.onclick = () => {
        G.despensa.splice(+b.dataset.f, 1); G.festivais.push(S.id); G.coins += FESTIVAL_PREMIO; addPts(30, `Venceu o concurso: ${F.nome}`); unlock("festival");
        NPCS.forEach((n) => { if (n.id !== "marcos") addAmizade(n.id, 20); });
        sfx.harvest(); toast(`🏆 1º lugar no concurso do ${F.nome}! +🪙${FESTIVAL_PREMIO}`, 30, "good", 5000);
        renderUI(); openFestival();
      };
    });
    $("#close").onclick = () => { closeModal(); if (G.factQueue.length) nextFact(); };
  }

  /* ---------- pote de conserva ---------- */
  const absH = () => (G.day - 1) * 24 + G.hour;
  const poteHoras = () => (G.pote ? Math.max(0, G.pote.fim - absH()) : 0);
  const conservaNome = (base) => (CONSERVAS[base] ? CONSERVAS[base].nome : `Conserva de ${CROPS[base].nome.toLowerCase()}`);
  function openPote() {
    if (G.pote && poteHoras() <= 0) {
      const b = G.pote.base, C = CONSERVAS[b];
      G.despensa.push({ id: C ? C.id : "conserva", base: b, nome: conservaNome(b), status: "ok", chem: G.pote.chem });
      G.pote = null; G.stats.conservas++; unlock("conserva"); sfx.harvest();
      toast(`🥫 ${conservaNome(b)} pronta! Foi para a despensa.`, null, "good", 3500); fact("conserva", "🥫"); renderUI(); return;
    }
    if (G.pote) { toast(`🥫 ${conservaNome(G.pote.base)}: faltam ${poteHoras()}h.`, null, "", 2500); return; }
    const cand = despensaGrupos((d) => d.status === "ok" && CROPS[d.id] && !CROPS[d.id].companheira);
    openModal(`<div class="box stack"><h2>🥫 Pote de conserva</h2>
      <p class="small">Escolha um alimento lavado. Em ${CONSERVA_HORAS} horas ele vira conserva caseira, que vale ${String(CONSERVA_MULT).replace(".", ",")}× mais. Tomate vira molho, pepino vira picles e uva vira geleia.</p>
      ${cand.length ? `<div class="giftgrid">${cand.map(({ d, idx }) => `<button class="prod" data-c="${idx[0]}"><span class="i">${itemIcon(d)}</span><b>${esc(itemNome(d))} ×${idx.length}</b><small>➜ ${esc(conservaNome(d.id))}${d.chem ? " (com agrotóxico)" : ""}</small></button>`).join("")}</div>` : `<p class="small muted">Nenhum alimento lavado na despensa.</p>`}
      <div><button class="btn ghost" id="close">Voltar</button></div></div>`);
    modalEl.querySelectorAll("[data-c]").forEach((b) => {
      b.onclick = () => { const d = G.despensa.splice(+b.dataset.c, 1)[0]; G.pote = { base: d.id, chem: d.chem, fim: absH() + CONSERVA_HORAS }; sfx.plant(); closeModal(); toast(`🥫 Fazendo ${conservaNome(d.id).toLowerCase()}: fica pronta em ${CONSERVA_HORAS}h.`, null, "good", 3000); fact("conserva", "🥫"); renderUI(); };
    });
    $("#close").onclick = () => { closeModal(); if (G.factQueue.length) nextFact(); };
  }

  /* ==========================================================
     MENUS: inventário, diário, menu e dormir
     ========================================================== */
  function openInventory(tab = "despensa") {
    const prox = nextMeal();
    const cestaG = {}; G.cesta.forEach((it) => { cestaG[it.id] = (cestaG[it.id] || 0) + 1; });
    const tabs = { cesta: "🧺 Cesta", despensa: "🥫 Despensa", itens: "🎒 Itens" };
    let body = "";
    if (tab === "cesta") body = Object.keys(cestaG).length ? `${Object.entries(cestaG).map(([id, n]) => `<div class="xrow"><div class="i">${cropIcon(id)}</div><div><b>${CROPS[id].nome}</b> ×${n}<div class="small">colhido, ainda não lavado</div></div></div>`).join("")}<div><button class="btn green" id="golavar">🚰 Lavar no tanque</button></div>` : `<p class="small muted">A cesta está vazia. Colha com a ✋ mão o que tiver ✓.</p>`;
    if (tab === "despensa") body = (G.despensa.length ? despensaGrupos().map(({ d, idx }) => `<div class="xrow">${itemLinha(d, idx.length)}</div>`).join("") : `<p class="small" style="color:var(--bad)"><b>Despensa vazia!</b> Sem comida, o José passa fome.</p>`) +
      `<p class="small">🍽️ Próxima refeição (${G.hour < MEALS[0].h ? "almoço 12h" : G.hour < MEALS[1].h ? "jantar 19h" : "almoço de amanhã"}): <b>${prox ? `${itemIcon(prox)} ${esc(itemNome(prox)).toLowerCase()}` : "nada!"}</b>${prox && prox.id === "biscoito" ? " (não recupera ❤️)" : prox ? " (+1 ❤️)" : ""}</p>`;
    if (tab === "itens") {
      const linhas = [
        ...Object.entries(G.inv.seeds).filter(([, n]) => n > 0).map(([id, n]) => `${cropIcon(id)} Semente de ${CROPS[id].nome.toLowerCase()} ×${n}${doEpoca(id) ? "" : " <small>(fora da época)</small>"}`),
        ...Object.entries(G.inv.prod).filter(([, n]) => n > 0).map(([id, n]) => `${prod(id).icone} ${prod(id).nome} ×${n}`),
        G.inv.epi ? "🥽 EPI completo" : "", G.inv.embalagens ? `🗑️ Embalagem vazia ×${G.inv.embalagens} <small>(devolva ♻️)</small>` : "",
        G.galinhas ? `🐔 Galinhas ×${G.galinhas}` : "",
        ...UPGRADES.filter((u) => G.up[u.id]).map((u) => `${u.icone} ${u.nome}`),
      ].filter(Boolean);
      body = linhas.length ? `<ul class="invlist">${linhas.map((l) => `<li>${l}</li>`).join("")}</ul>` : `<p class="small muted">Nada por aqui.</p>`;
    }
    openModal(`<div class="box stack">
      <div class="row" style="justify-content:space-between"><h2>🎒 Inventário</h2><button class="btn ghost" id="close" style="padding:8px 16px;font-size:15px">Fechar</button></div>
      <div class="mtabs">${Object.entries(tabs).map(([k, v]) => `<button data-t="${k}" class="${k === tab ? "on" : ""}">${v}${k === "cesta" && G.cesta.length ? ` (${G.cesta.length})` : k === "despensa" ? ` (${G.despensa.length})` : ""}</button>`).join("")}</div>
      <div class="mbody">${body}</div></div>`);
    modalEl.querySelectorAll("[data-t]").forEach((b) => { b.onclick = () => openInventory(b.dataset.t); });
    const gl = $("#golavar"); if (gl) gl.onclick = () => { closeModal(); deliver(); };
    $("#close").onclick = () => { closeModal(); if (G.factQueue.length) nextFact(); };
  }
  function planHTML() {
    const growing = (id) => G.tiles.filter((t) => t.crop && !t.crop.dead && t.crop.id === id).length;
    const e = G.encomenda && !G.encomenda.feita ? G.encomenda : null;
    let h = "";
    if (e) {
      const C = CROPS[e.id], nome = C.nome.toLowerCase();
      const tem = G.despensa.filter((d) => d.id === e.id && d.status === "ok" && (!e.semAgro || !d.chem)).length;
      const pl = growing(e.id), falta = Math.max(0, e.qtd - tem), seeds = G.inv.seeds[e.id] || 0;
      const dica = !falta ? "✅ Já tem! Entregue na 🏷️ banca." : pl >= falta ? `Cuide ${pl > 1 ? "dos pés" : "do pé"} de ${nome} e colha quando aparecer ✓.` : `Plante mais ${falta - pl} de ${nome} (leva ${C.horas}h). ${seeds ? `Você tem ${seeds} semente(s).` : `Compre sementes na Cooperativa (🪙${C.preco}).`}`;
      h += `<div class="planorder"><b>📦 Pedido de ${e.avatar} ${esc(e.cliente)}</b><br>${e.qtd}× ${cropIcon(e.id)} ${nome}${e.semAgro ? " <b>sem agrotóxico</b>" : ""} · paga 🪙${e.paga}
        <div class="small muted">⏳ faltam ${Math.max(0, e.expira - Math.floor(G.hour))}h · na despensa ${tem}/${e.qtd} · plantado: ${pl}</div><div class="small"><b>👉 ${dica}</b></div></div>`;
    } else h += `<div class="planorder calm small">⏳ Nenhum pedido agora. Plante o que vende bem e guarde comida para o José.</div>`;
    const ids = Object.keys(CROPS).filter((id) => !CROPS[id].companheira && doEpoca(id)).sort((a, b) => CROPS[b].venda / CROPS[b].horas - CROPS[a].venda / CROPS[a].horas);
    h += `<table class="plantab"><thead><tr><th>${SEA().icone} da época</th><th>⏱️</th><th>🪙 venda</th><th>🌱</th></tr></thead><tbody>${ids.map((id) => `<tr class="${e && e.id === id ? "hot" : ""}"><td>${cropIcon(id)} ${CROPS[id].nome}</td><td>${CROPS[id].horas}h</td><td>${precoVenda({ id, chem: true })} · <span class="g">🌿${precoVenda({ id, chem: false })}</span></td><td>${growing(id)}</td></tr>`).join("")}</tbody></table>
      <p class="small muted">🌿 = preço sem agrotóxico. 🌱 = pés plantados. Os que dão mais dinheiro por hora estão no topo.</p>`;
    return h;
  }
  function openDiary(tab = "plantio") {
    const tabs = { plantio: "📦 Plantio", estacao: "📅 Estação", feira: "🏛️ Feira", vizinhos: "❤️ Vizinhos", conquistas: "🏆" };
    const S = SEA(), si = seasonIdx(G.day), prox = SEASONS[si + 1];
    let body = "";
    if (tab === "plantio") body = planHTML();
    if (tab === "estacao") {
      const vaiMorrer = prox ? G.tiles.filter((t) => t.crop && !t.crop.dead && !doEpoca(t.crop.id, prox)) : [];
      body = `<p><b>${S.icone} ${S.nome}</b>, dia ${diaDaEstacao()} de ${SEASON_DAYS}. ${S.desc}</p>
        <p>🌱 Da época: ${Object.keys(CROPS).filter((id) => doEpoca(id)).map((id) => `${cropIcon(id)} ${CROPS[id].nome.toLowerCase()}`).join(", ")}.</p>
        <p>🎉 Sábado: <b>${FESTIVALS[S.id].icone} ${FESTIVALS[S.id].nome}</b> na vila. Concurso: ${FESTIVALS[S.id].pede}.</p>
        ${prox ? `<p>➡️ Próxima: <b>${prox.icone} ${prox.nome}</b> em ${SEASON_DAYS - diaDaEstacao() + 1} dia(s). Da época: ${Object.keys(CROPS).filter((id) => doEpoca(id, prox)).map((id) => cropIcon(id)).join(" ")}.</p>
        ${vaiMorrer.length ? `<p class="feirabar" style="background:#c2341f">⚠️ Na troca de estação, ${vaiMorrer.length} planta(s) da sua horta vão murchar porque não são da época do ${prox.nome.toLowerCase()}: ${[...new Set(vaiMorrer.map((t) => cropIcon(t.crop.id)))].join(" ")}. Colha antes!</p>` : ""}` : `<p>❄️ É a última estação do ano. No fim do inverno vem o balanço do ano.</p>`}`;
    }
    if (tab === "feira") body = G.agromax ? `<p>📄 Você assinou o contrato da AgroMax. A Feira Comunitária virou depósito.</p>` :
      `<p>${G.bundlesFeitos.length}/${BUNDLES.length} pacotes entregues. Toque no galpão da Feira, na vila, para entregar.</p>${BUNDLES.map((B) => `<div class="xrow"><div class="i">${B.icone}</div><div><b>${B.nome}</b><div class="small">${B.itens.map(([it, q]) => `${itemIcon({ id: it })} ${Math.min(bundleTem(B.id, it), q)}/${q}`).join(" · ")}</div></div><div>${G.bundlesFeitos.includes(B.id) ? "✅" : ""}</div></div>`).join("")}`;
    if (tab === "vizinhos") body = NPCS.map((n) => `<div class="xrow"><div class="i"><img class="mini" src="${retrato(n.id)}" alt=""></div><div><b>${n.nome}</b> ${coracoesHTML(n.id)}<div class="small">${n.papel}${G.falou[n.id] === G.day ? " · conversou hoje ✓" : " · ainda não conversou hoje"}</div></div><div class="small muted">${G.premiado[n.id] ? "🎁" : "3♥ = 🎁"}</div></div>`).join("") + `<p class="small muted">Converse todo dia e dê presentes da despensa (cada um tem favoritos).</p>`;
    if (tab === "conquistas") body = `<div class="ach">${ACHIEVEMENTS.map((a) => `<div class="${G.conquistas.has(a.id) ? "on" : ""}"><span>${a.icone}</span><b>${a.nome}</b><small>${a.desc}</small></div>`).join("")}</div>`;
    openModal(`<div class="box stack">
      <div class="row" style="justify-content:space-between"><h2>📔 Diário</h2><button class="btn ghost" id="close" style="padding:8px 16px;font-size:15px">Fechar</button></div>
      <div class="mtabs">${Object.entries(tabs).map(([k, v]) => `<button data-t="${k}" class="${k === tab ? "on" : ""}">${v}</button>`).join("")}</div>
      <div class="mbody">${body}</div></div>`);
    modalEl.querySelectorAll("[data-t]").forEach((b) => { b.onclick = () => openDiary(b.dataset.t); });
    $("#close").onclick = () => { closeModal(); if (G.factQueue.length) nextFact(); };
  }
  function openMenu() {
    openModal(`<div class="box stack" style="max-width:420px">
      <h2>⚙️ Menu</h2>
      <button class="btn" id="m-som">${G.sound ? "🔊 Som ligado" : "🔇 Som desligado"}</button>
      <button class="btn" id="m-vel">${G.speed === 2 ? "⏩ Tempo 2×" : "▶ Tempo normal"}</button>
      <p class="small muted">Atalhos: 1–0 itens da barra · E inventário · J diário · M mapa · G guia · P pausa · Esc menu</p>
      <button class="btn ghost" id="m-sair">💾 Salvar e voltar à capa</button>
      <button class="btn green" id="close">Continuar jogando</button></div>`);
    $("#m-som").onclick = () => { G.sound = !G.sound; store.set("som", G.sound); openMenu(); };
    $("#m-vel").onclick = () => { G.speed = G.speed === 1 ? 2 : 1; renderClock(); openMenu(); };
    $("#m-sair").onclick = () => { saveGame(); closeModal(); LOOP++; screenCover(); };
    $("#close").onclick = () => { closeModal(); if (G.factQueue.length) nextFact(); };
  }
  function askSleep() {
    if (G.tut >= 0 && G.tut === 5) { sleep(); return; }
    openModal(`<div class="box stack" style="max-width:420px;text-align:center">
      <div style="font-size:48px">🛏️</div><h2>Dormir até amanhã?</h2>
      <p class="small muted">Agora são ${String(Math.floor(G.hour)).padStart(2, "0")}:00.${G.hour < 18 ? " Ainda é cedo: as plantas crescem enquanto o dia passa." : ""}</p>
      <div class="row" style="justify-content:center"><button class="btn green" id="sim">🌙 Dormir</button><button class="btn ghost" id="close">Ainda não</button></div></div>`);
    $("#sim").onclick = () => { closeModal(); sleep(); };
    $("#close").onclick = () => { closeModal(); if (G.factQueue.length) nextFact(); };
  }


  /* ---------- relógio: cada hora de jogo ---------- */
  /* ---------- relógio: cada hora de jogo ---------- */
  function hourTick() {
    G.hour++;
    let novas = 0; const novasLista = []; const comSede = [], quaseMorrendo = [], pragaAviso = [];
    G.tiles.forEach((t) => {
      if (t.joaninhas > 0) t.joaninhas--;
      const c = t.crop;
      if (!c || c.dead) { if (t.agua > 0) t.agua--; t.watered = t.agua > 0; return; }
      const C = CROPS[c.id];
      if (c.pest) {
        if (c.pest.morreEm !== undefined) { c.pest.morreEm--; if (c.pest.morreEm <= 0) c.pest = null; }
        else {
          c.pest.h++;
          if (c.pest.h >= PRAGA_DANO) c.dano = 1;
          if (c.pest.h === PRAGA_MORTE - 3) pragaAviso.push(C.nome.toLowerCase());
          if (c.pest.h >= PRAGA_MORTE) { c.dead = true; c.pest = null; G.stats.perdidas++; addPts(-5, `${C.nome} perdida para a praga`, "praga"); lose("praga", 20); toast(`🥀 A praga destruiu ${C.nome.toLowerCase()}. Pegue a ⛏️ enxada para limpar o canteiro e plante de novo.`, -5, "bad", 5000); return; }
        }
      }
      if (t.agua > 0) { t.agua--; c.sede = 0; if (c.stage < 3 && !c.pest) c.age += SEA().cresce * (G.up.composteira ? 1.25 : 1); if (t.agua === 0 && c.stage < 3) comSede.push(C.nome.toLowerCase()); }
      else if (c.stage < 3) { c.sede++; if (c.sede === SEDE_MORTE - 1) quaseMorrendo.push(C.nome.toLowerCase()); if (c.sede >= SEDE_MORTE) { c.dead = true; G.stats.perdidas++; addPts(-5, `${C.nome} morreu de sede`, "sede"); lose("sede", 20); toast(`🥀 ${C.nome} morreu de sede. Pegue a ⛏️ enxada para limpar o canteiro e plante de novo.`, -5, "bad", 5000); return; } }
      t.watered = t.agua > 0;
      const was = c.stage;
      c.stage = c.age >= C.horas ? 3 : Math.min(2, Math.floor((c.age / C.horas) * 3));
      if (c.stage === 3 && was < 3 && !C.companheira) toast(`✓ ${C.nome} pronta para colher!`, null, "good", 2200);
      if (c.carencia > 0) c.carencia--;
    });
    // novas pragas
    G.tiles.filter((t) => t.crop && !t.crop.dead && !t.crop.pest && t.crop.age >= 1 && t.crop.stage < 3 && CROPS[t.crop.id].pragas.length).forEach((t) => {
      const C = CROPS[t.crop.id];
      let chance = 0.035 * SEA().praga * Math.max(0.4, 1 - 0.12 * (G.galinhas || 0));   // galinhas comem insetos
      const viz = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => T(t.x + dx, t.y + dy)).filter((n) => n && n.crop && !n.crop.dead);
      if (viz.length >= 2 && viz.every((n) => n.crop.id === t.crop.id)) chance += 0.025;   // monocultura
      let flores = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const n = T(t.x + dx, t.y + dy); if (n && n.crop && n.crop.id === "flores" && n.crop.stage >= 1) flores = true; }
      if (flores) chance -= 0.025;
      let opts = C.pragas;
      if (t.joaninhas > 0) opts = opts.filter((p) => p !== "pulgao" && p !== "moscaBranca");
      if (opts.length && rnd() < chance) { t.crop.pest = { id: opts[Math.floor(rnd() * opts.length)], h: 0 }; novas++; novasLista.push(t); }
    });
    // garante a primeira praga no dia 1 para ensinar
    if (!G.primeiraPraga && G.hour >= 8 && !G.tiles.some((t) => t.crop && t.crop.pest)) {
      const cand = G.tiles.filter((t) => t.crop && !t.crop.dead && t.crop.stage < 3 && CROPS[t.crop.id].pragas.length);
      if (cand.length) { const t = cand[Math.floor(rnd() * cand.length)]; t.crop.pest = { id: CROPS[t.crop.id].pragas[0], h: 0 }; novas++; novasLista.push(t); }
    }
    if (novas) G.primeiraPraga = true;
    {
    }
    if (pragaAviso.length && !quaseMorrendo.length) { sfx.bad(); toast(`⚠️ A praga vai destruir <b>${[...new Set(pragaAviso)].join(", ")}</b> em 3 horas! Trate agora (toque na planta para ver como).`, null, "bad", 4500); }
    if (quaseMorrendo.length) { sfx.bad(); toast(`⚠️ <b>${[...new Set(quaseMorrendo)].join(", ")}</b> vai morrer de sede em 1 hora! Regue já com 💧.`, null, "bad", 4000); }
    else if (comSede.length) { beep([880, 660], "sine", 0.08, 0.05); toast(`💧 <b>${[...new Set(comSede)].join(", ")}</b> ficou com sede. Regue em até ${SEDE_MORTE}h.`, null, "", 3500); fact("sede", "💧"); }
    if (novas) {
      const t0 = novasLista[0], pp = PESTS[t0.crop.pest.id];
      sfx.bad();
      G.alerta = { x: t0.x, y: t0.y, ate: performance.now() + 6000 };
      if (!naVila()) G.focus = [t0.x, t0.y];
      toast(`${pp.icone} <b>${pp.nome}</b> atacou ${CROPS[t0.crop.id].nome.toLowerCase()}! Está marcada no mapa. <span class='jeito'>Como tratar: ${pp.trata}</span>`, null, "bad", 6000);
      const key = "p_" + t0.crop.pest.id;
      if (!FACTS[key]) FACTS[key] = { t: `<b>${pp.nome}</b>: ${pp.desc}<br><br><b>Como tratar:</b> ${pp.trata}<br><br>Se não tratar, em ${PRAGA_DANO}h a planta fica danificada e em ${PRAGA_MORTE}h ela morre.`, f: "" };
      setTimeout(() => fact(key, pp.icone), 400);
    }
    const meal = MEALS.find((m) => m.h === G.hour);
    if (meal) eat(meal.nome);
    if (G.hour === MEALS[0].h - 1 || G.hour === MEALS[1].h - 1) { const nm = nextMeal(); if (!nm) toast("🍽️ Daqui a 1 hora é hora de comer e a despensa está vazia! Colha e lave no 🚰 tanque.", null, "bad", 3500); }
    // pedidos da banca
    const e = G.encomenda;
    if (e && e.feita) { G.encomenda = null; G.proxPedido = G.hour + 1; }
    else if (e && G.hour >= e.expira) { toast(`📦 ${e.avatar} ${esc(e.cliente)} desistiu do pedido.`, null, "", 2500); G.encomenda = null; G.proxPedido = G.hour + 1; changeRep(-0.3); }
    if (isFeira() && !G.encomenda) G.proxPedido = Math.min(G.proxPedido || 0, G.hour);
    if (G.pote && !G.pote.avisou && poteHoras() <= 0) { G.pote.avisou = true; toast(`🥫 ${conservaNome(G.pote.base)} pronta! Pegue no pote, ao lado da casa.`, null, "good", 3500); }

    if (!G.encomenda && G.hour >= (G.proxPedido || 0) && G.hour <= DAY_END - 3) { novaEncomenda(); if (G.encomenda) toast(`📦 Novo pedido: ${G.encomenda.avatar} ${esc(G.encomenda.cliente)} quer ${G.encomenda.qtd}× ${cropIcon(G.encomenda.id)}. Veja na 🏷️ banca!`, null, "good", 3500); }
    if (G.hour === 20) toast("🌇 Está escurecendo. Às 22h o José vai dormir.", null, "", 2500);
    if (G.hour >= DAY_END) { sleep(); return; }
    renderClock(); renderInfo(); renderQuests();
    saveGame();
  }


  function diamond(c, sx, sy, fill, stroke) {
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + TW / 2, sy + TH / 2); c.lineTo(sx, sy + TH); c.lineTo(sx - TW / 2, sy + TH / 2); c.closePath();
    c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); }
  }

  function drawFence(c) {
    c.strokeStyle = "#a0723f"; c.lineWidth = 2;
    const edge = (x0, y0, x1, y1) => {
      const [a, b] = toScreen(x0, y0), [e, f] = toScreen(x1, y1);
      c.beginPath(); c.moveTo(a, b - 6); c.lineTo(e, f - 6); c.stroke();
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let k = 0; k <= steps; k++) {
        const px = a + (e - a) * k / steps, py = b + (f - b) * k / steps;
        c.fillStyle = "#b9874f"; c.fillRect(px - 2, py - 12, 4, 12);
      }
    };
    const { x0, y0, x1, y1 } = FARM;
    edge(x0, y0, x1 + 1, y0); edge(x0, y0, x0, y1 + 1);
  }

  function drawHouse(c) {
    const [ax, ay] = toScreen(0, 0), [bx, by] = toScreen(2, 0), [dx, dy] = toScreen(0, 2), [ex, ey] = toScreen(2, 2);
    const H = 46;
    // paredes
    c.fillStyle = "#f3e2c3"; c.beginPath(); c.moveTo(dx, dy); c.lineTo(ex, ey); c.lineTo(ex, ey - H); c.lineTo(dx, dy - H); c.closePath(); c.fill();
    c.fillStyle = "#e3cba3"; c.beginPath(); c.moveTo(ex, ey); c.lineTo(bx, by); c.lineTo(bx, by - H); c.lineTo(ex, ey - H); c.closePath(); c.fill();
    // porta e janela
    c.fillStyle = "#8a5528"; const mx = (dx + ex) / 2, my = (dy + ey) / 2; c.fillRect(mx - 7, my - 24, 14, 22);
    c.fillStyle = "#9fd3f0"; const wx = (ex + bx) / 2, wy = (ey + by) / 2; c.fillRect(wx - 8, wy - 32, 16, 12);
    // telhado
    c.fillStyle = "#c4512e";
    c.beginPath(); c.moveTo(dx - 4, dy - H); c.lineTo(ex, ey - H + 4); c.lineTo((ax + ex) / 2, (ay + ey) / 2 - H - 34); c.lineTo((ax + dx) / 2 - 4, (ay + dy) / 2 - H - 34); c.closePath(); c.fill();
    c.fillStyle = "#a63f20";
    c.beginPath(); c.moveTo(ex, ey - H + 4); c.lineTo(bx + 4, by - H); c.lineTo((ax + bx) / 2 + 4, (ay + by) / 2 - H - 34); c.lineTo((ax + ex) / 2, (ay + ey) / 2 - H - 34); c.closePath(); c.fill();
    c.font = "bold 11px Fredoka, sans-serif"; c.textAlign = "center"; c.fillStyle = "#fff";
    c.fillText("CASA", (dx + ex) / 2, (dy + ey) / 2 - H + 14);
  }
  function drawBin(c, cx, cy, col, icon, label) {
    c.fillStyle = "rgba(0,0,0,.15)"; c.beginPath(); c.ellipse(cx, cy + 2, 16, 7, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = col; c.fillRect(cx - 12, cy - 26, 24, 26);
    c.fillStyle = "rgba(255,255,255,.25)"; c.fillRect(cx - 12, cy - 26, 24, 5);
    c.font = "14px sans-serif"; c.textAlign = "center"; c.fillText(icon, cx, cy - 8);
    c.font = "bold 10px Fredoka, sans-serif"; c.fillStyle = "#2b2620"; c.fillText(label, cx, cy - 32);
  }
  function drawStall(c, cx, cy, time, festa = false) {
    c.fillStyle = "rgba(0,0,0,.15)"; c.beginPath(); c.ellipse(cx, cy + 2, 26, 10, 0, 0, 7); c.fill();
    c.fillStyle = "#8a5528"; c.fillRect(cx - 22, cy - 34, 3, 34); c.fillRect(cx + 19, cy - 34, 3, 34);
    c.fillStyle = "#c98b4f"; c.fillRect(cx - 24, cy - 14, 48, 12);
    ["#7cc35f", "#e2432a", "#f08a24", "#3d8b3d"].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(cx - 15 + i * 10, cy - 16, 4, 0, 7); c.fill(); });
    for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? "#fff" : "#e2432a"; c.beginPath(); c.moveTo(cx - 27 + i * 9, cy - 34); c.lineTo(cx - 18 + i * 9, cy - 34); c.lineTo(cx - 18 + i * 9, cy - 28); c.arc(cx - 22.5 + i * 9, cy - 28, 4.5, 0, Math.PI); c.closePath(); c.fill(); }
    if (festa) return;
    c.font = "bold 11px Fredoka, sans-serif"; c.textAlign = "center"; c.fillStyle = "#2b2620"; c.fillText("Banca", cx, cy - 40);
    if (G && G.encomenda && !G.encomenda.feita) { c.font = "16px sans-serif"; c.fillText("📦", cx + 20, cy - 44 + Math.sin(time * 3) * 2); }
  }
  function drawTank(c, cx, cy, time) {
    c.fillStyle = "rgba(0,0,0,.15)"; c.beginPath(); c.ellipse(cx, cy + 2, 24, 9, 0, 0, 7); c.fill();
    c.fillStyle = "#9aa6af"; c.fillRect(cx - 14, cy - 10, 4, 10); c.fillRect(cx + 10, cy - 10, 4, 10);
    c.fillStyle = "#c3ccd3"; c.fillRect(cx - 20, cy - 26, 40, 16);
    c.fillStyle = "#aab5bd"; c.fillRect(cx - 20, cy - 12, 40, 3);
    c.fillStyle = "#7cc0ea"; c.fillRect(cx - 16, cy - 26, 32, 5);
    c.strokeStyle = "#6b7780"; c.lineWidth = 3; c.beginPath(); c.moveTo(cx + 12, cy - 26); c.lineTo(cx + 12, cy - 38); c.lineTo(cx + 3, cy - 38); c.lineTo(cx + 3, cy - 34); c.stroke();
    const k = (time * 1.6) % 1; c.fillStyle = "#3a8de0"; c.beginPath(); c.arc(cx + 3, cy - 32 + k * 7, 1.8, 0, 7); c.fill();
    c.font = "bold 11px Fredoka, sans-serif"; c.textAlign = "center"; c.fillStyle = "#2b2620"; c.fillText("Tanque", cx - 6, cy - 44);
    if (G && G.cesta && G.cesta.length) {
      const by = cy - 62 + Math.sin(time * 4) * 2;
      c.fillStyle = "#2f7d32"; c.beginPath(); c.roundRect ? c.roundRect(cx - 26, by - 12, 52, 17, 8) : c.rect(cx - 26, by - 12, 52, 17); c.fill();
      c.fillStyle = "#fff"; c.font = "bold 10px Fredoka, sans-serif"; c.fillText(`Lavar 🧺${G.cesta.length}`, cx, by);
    }
  }
  function drawTree(c, cx, cy) {
    c.fillStyle = "rgba(0,0,0,.15)"; c.beginPath(); c.ellipse(cx, cy + 2, 18, 8, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#7a5230"; c.fillRect(cx - 3, cy - 18, 6, 18);
    c.fillStyle = "#3f8f3a"; c.beginPath(); c.arc(cx, cy - 30, 16, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#57a84f"; c.beginPath(); c.arc(cx - 6, cy - 34, 9, 0, Math.PI * 2); c.fill();
  }

  function leaf(c, x, y, rx, ry, rot, col) { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); c.fill(); }
  function drawCrop(c, t, cx, cy, time) {
    const cr = t.crop, C = CROPS[cr.id];
    const st = cr.stage;
    const sway = Math.sin(time * 2 + t.x + t.y) * 1.2;
    if (cr.dead) {
      c.strokeStyle = "#7a5a35"; c.lineWidth = 2;
      for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(cx + k * 5, cy); c.quadraticCurveTo(cx + k * 9, cy - 10, cx + k * 12, cy - 4); c.stroke(); }
      if (G && G.started) {
        const by = cy - 22 + Math.sin(time * 3) * 1.5;
        c.fillStyle = "rgba(90,70,50,.9)"; c.beginPath(); c.roundRect ? c.roundRect(cx - 24, by - 11, 48, 15, 7) : c.rect(cx - 24, by - 11, 48, 15); c.fill();
        c.fillStyle = "#fff"; c.font = "bold 10px Fredoka, sans-serif"; c.textAlign = "center"; c.fillText("⛏️ limpar", cx, by);
      }
      return;
    }
    c.fillStyle = "rgba(0,0,0,.12)"; c.beginPath(); c.ellipse(cx, cy + 2, 6 + st * 4, 3 + st * 1.5, 0, 0, Math.PI * 2); c.fill();
    if (st === 0) { c.fillStyle = "#4a2f1a"; [[-5, 0], [4, -2], [0, 3]].forEach(([a, b]) => { c.beginPath(); c.arc(cx + a, cy + b, 2, 0, 7); c.fill(); }); }
    else if (st === 1) { leaf(c, cx - 4 + sway, cy - 6, 5, 2.5, -0.6, C.cor); leaf(c, cx + 4 + sway, cy - 6, 5, 2.5, 0.6, C.cor); c.fillStyle = C.cor; c.fillRect(cx - 1, cy - 6, 2, 6); }
    else {
    const big = st === 3 ? 1 : 0.7;
    const sick = cr.dano ? "#a9a14a" : null;
    switch (cr.id) {
      case "alface":
        for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; leaf(c, cx + Math.cos(a) * 7 * big + sway, cy - 8 * big + Math.sin(a) * 3.5 * big, 8 * big, 5 * big, a, sick || (k % 2 ? "#a3dc7c" : "#8fd16a")); }
        leaf(c, cx + sway, cy - 10 * big, 6 * big, 4 * big, 0, "#c3ec9f"); break;
      case "couve":
        for (let k = -2; k <= 2; k++) leaf(c, cx + k * 5 * big + sway, cy - 14 * big + Math.abs(k) * 3, 6 * big, 11 * big, k * 0.35, sick || (k % 2 ? "#2f7d32" : "#3a8f3c"));
        break;
      case "tomate":
        c.strokeStyle = "#9a6a3a"; c.lineWidth = 2; c.beginPath(); c.moveTo(cx + 6, cy); c.lineTo(cx + 6, cy - 34 * big); c.stroke();
        for (let k = 0; k < 4; k++) leaf(c, cx + (k % 2 ? 6 : -4) + sway, cy - 8 - k * 7 * big, 7 * big, 4 * big, k % 2 ? 0.5 : -0.5, sick || C.cor);
        if (st === 3) [[-3, -12], [5, -20], [-5, -24], [3, -10]].forEach(([a, b]) => { c.fillStyle = C.fruto; c.beginPath(); c.arc(cx + a + sway, cy + b, 4, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,.4)"; c.beginPath(); c.arc(cx + a - 1 + sway, cy + b - 1, 1.3, 0, 7); c.fill(); });
        break;
      case "pimentao":
        for (let k = 0; k < 5; k++) leaf(c, cx + (k - 2) * 5 + sway, cy - 10 - (k % 2) * 6 * big, 6 * big, 4 * big, (k - 2) * 0.4, sick || "#3d8b3d");
        if (st === 3) [[-6, -10], [5, -12], [0, -18]].forEach(([a, b]) => { c.fillStyle = k2(a); c.beginPath(); c.ellipse(cx + a + sway, cy + b, 3.5, 5.5, 0, 0, 7); c.fill(); });
        break;
      case "cenoura":
        for (let k = -2; k <= 2; k++) { c.strokeStyle = sick || "#5fb84a"; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy - 3); c.quadraticCurveTo(cx + k * 4 + sway, cy - 12 * big, cx + k * 7 + sway, cy - 20 * big); c.stroke(); }
        if (st === 3) { c.fillStyle = C.fruto; c.beginPath(); c.ellipse(cx, cy - 2, 5, 3, 0, 0, 7); c.fill(); }
        break;
      case "pepino":
        for (let k = 0; k < 5; k++) leaf(c, cx + (k - 2) * 6 + sway, cy - 5 - (k % 2) * 4, 7 * big, 5 * big, 0, sick || (k % 2 ? "#4a9a3c" : "#5aad4a"));
        if (st === 3) [[-6, -2], [6, 0]].forEach(([a, b]) => { c.fillStyle = C.fruto; c.beginPath(); c.ellipse(cx + a, cy + b, 7, 3, 0.3, 0, 7); c.fill(); });
        break;
      case "uva":
        c.strokeStyle = "#8a5a2b"; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 9, cy); c.lineTo(cx - 9, cy - 30 * big); c.moveTo(cx + 9, cy); c.lineTo(cx + 9, cy - 30 * big); c.moveTo(cx - 11, cy - 28 * big); c.lineTo(cx + 11, cy - 28 * big); c.stroke();
        for (let k = 0; k < 6; k++) leaf(c, cx - 10 + k * 4 + sway, cy - 28 * big + (k % 2) * 4, 6 * big, 4 * big, k * 0.5, sick || (k % 2 ? "#4a9a3c" : "#5aad4a"));
        if (st === 3) [[-5, -16], [5, -18]].forEach(([a, b]) => { for (let k = 0; k < 6; k++) { c.fillStyle = C.fruto; c.beginPath(); c.arc(cx + a + (k % 3 - 1) * 3 + sway, cy + b + Math.floor(k / 3) * 3.5 + (k === 5 ? 3 : 0), 2.3, 0, 7); c.fill(); } });
        break;
      case "milho":
        c.strokeStyle = sick || C.cor; c.lineWidth = 3; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + sway, cy - 40 * big); c.stroke();
        for (let k = 0; k < 4; k++) leaf(c, cx + (k % 2 ? 7 : -7) + sway, cy - 10 - k * 8 * big, 9 * big, 2.5 * big, k % 2 ? 0.5 : -0.5, sick || C.cor);
        if (st === 3) { c.fillStyle = C.fruto; c.beginPath(); c.ellipse(cx + 5 + sway, cy - 22, 3, 7, 0.2, 0, 7); c.fill(); leaf(c, cx + 6 + sway, cy - 18, 3, 6, 0.4, "#8fc96b"); }
        break;
      case "cebola":
        for (let k = -2; k <= 2; k++) { c.strokeStyle = sick || C.cor; c.lineWidth = 2.5; c.beginPath(); c.moveTo(cx + k * 2, cy - 2); c.quadraticCurveTo(cx + k * 3 + sway, cy - 10 * big, cx + k * 4 + sway, cy - 20 * big); c.stroke(); }
        if (st === 3) { c.fillStyle = C.fruto; c.beginPath(); c.ellipse(cx, cy - 2, 7, 5, 0, 0, 7); c.fill(); }
        break;
      case "flores":
        for (let k = -1; k <= 1; k++) { c.strokeStyle = "#4a9a3c"; c.lineWidth = 2; c.beginPath(); c.moveTo(cx + k * 6, cy); c.lineTo(cx + k * 6 + sway, cy - 14 * big); c.stroke(); }
        [[-6, -14], [0, -18], [6, -14]].forEach(([a, b], i) => { c.fillStyle = i === 1 ? "#f08a24" : C.fruto; c.beginPath(); c.arc(cx + a + sway, cy + b * big, 5 * big, 0, 7); c.fill(); c.fillStyle = "#c45a12"; c.beginPath(); c.arc(cx + a + sway, cy + b * big, 1.6, 0, 7); c.fill(); });
        break;
    }
    }
    // praga (bem visível)
    if (cr.pest) {
      const p = PESTS[cr.pest.id];
      if (cr.pest.id === "fungo") {
        c.fillStyle = "rgba(160,110,30,.9)"; [[-6, -10], [5, -15], [0, -6], [7, -8], [-3, -16]].forEach(([a, b]) => { c.beginPath(); c.arc(cx + a, cy + b, 3.4, 0, 7); c.fill(); });
      } else if (cr.pest.id === "lagarta" || cr.pest.id === "lesma") {
        const ox = Math.sin(time * 1.5 + t.x) * 7;
        for (let k = 0; k < 5; k++) { c.fillStyle = k === 4 ? "#3c5a1c" : p.cor; c.beginPath(); c.arc(cx + ox + k * 4 - 8, cy - 8 + Math.sin(time * 5 + k) * 1.5, k === 4 ? 3.6 : 3.2, 0, 7); c.fill(); }
        if (cr.pest.id === "lesma") { c.fillStyle = "#8d6e63"; c.beginPath(); c.arc(cx + ox - 2, cy - 12, 5, 0, 7); c.fill(); }
      } else {
        c.fillStyle = p.cor; c.strokeStyle = "rgba(0,0,0,.55)"; c.lineWidth = 0.8;
        for (let k = 0; k < 8; k++) { const a = time * 3 + k; c.beginPath(); c.arc(cx + Math.cos(a) * 11, cy - 14 + Math.sin(a * 1.3) * 7, 2.6, 0, 7); c.fill(); c.stroke(); }
      }
      // etiqueta com o nome da praga
      const label = cr.pest.morreEm !== undefined ? `${p.nome} 🐞` : `${p.nome}! ${Math.max(0, PRAGA_MORTE - (cr.pest.h || 0))}h`;
      c.font = "bold 10px Fredoka, sans-serif"; const w = c.measureText(label).width + 12;
      const by = cy - 46 + Math.sin(time * 4) * 1.5;
      c.fillStyle = "#e2432a"; c.beginPath(); c.roundRect ? c.roundRect(cx - w / 2, by - 11, w, 15, 7) : c.rect(cx - w / 2, by - 11, w, 15); c.fill();
      c.beginPath(); c.moveTo(cx - 4, by + 4); c.lineTo(cx + 4, by + 4); c.lineTo(cx, by + 9); c.fill();
      c.fillStyle = "#fff"; c.textAlign = "center"; c.fillText(label, cx, by);
    }
    // carência e agrotóxico
    if (cr.carencia > 0) {
      c.fillStyle = "#7b3fa0"; c.beginPath(); c.arc(cx + 14, cy - 30, 8, 0, 7); c.fill();
      c.fillStyle = "#fff"; c.font = "bold 10px Fredoka, sans-serif"; c.textAlign = "center"; c.fillText(cr.carencia + "h", cx + 14, cy - 26.5);
    }
    if (st === 3 && !cr.pest && !C.companheira) {
      c.fillStyle = "rgba(255,255,255,.9)"; c.beginPath(); c.arc(cx, cy - 40 + Math.sin(time * 3) * 2, 6, 0, 7); c.fill();
      c.fillStyle = "#2f7d32"; c.font = "bold 10px sans-serif"; c.textAlign = "center"; c.fillText("✓", cx, cy - 36.5 + Math.sin(time * 3) * 2);
    }
    // água: barrinha e balão de sede
    if (!cr.dead && cr.stage < 3 && G) {
      const segs = aguaMax(), w = 26, x0 = cx - w / 2, y0 = cy + 8;
      c.fillStyle = "rgba(255,255,255,.75)"; c.fillRect(x0 - 1, y0 - 1, w + 2, 6);
      for (let k = 0; k < segs; k++) { c.fillStyle = k < t.agua ? "#3a8de0" : "#d9cbb5"; c.fillRect(x0 + k * (w / segs), y0, w / segs - 1, 4); }
      if (t.agua <= 0) {
        const left = SEDE_MORTE - cr.sede, pk = 0.5 + 0.5 * Math.sin(time * 6);
        const by = cy - 50 - (cr.pest ? 16 : 0);
        c.fillStyle = left <= 1 ? "#c2341f" : "#2f74c0";
        c.beginPath(); c.roundRect ? c.roundRect(cx - 30, by - 12 - pk * 2, 60, 17, 8) : c.rect(cx - 30, by - 12, 60, 17); c.fill();
        c.fillStyle = "#fff"; c.font = "bold 10px Fredoka, sans-serif"; c.textAlign = "center";
        c.fillText(`💧 Sede! ${left}h`, cx, by - 0.5 - pk * 2);
      }
    }
  }
  const k2 = (a) => (a > 0 ? "#2e9e2e" : "#e2432a");

  /* ==========================================================
     PERSONAGENS (José e vizinhos): desenho com rosto, roupa e acessórios
     ========================================================== */
  const LOOKS = {
    jose:   { pele: "#c98b5e", cabelo: "#3a2a1a", estilo: "curto", camisa: "#e2432a", macacao: "#4f7cc4", calca: "#3b5aa0", sapato: "#5a3a22", chapeu: "palha" },
    cida:   { pele: "#b07a52", cabelo: "#dcdcdc", estilo: "coque", camisa: "#c45a8a", saia: "#7a3f5f", sapato: "#5a3a22", avental: "#fff3dc", oculos: true },
    kenji:  { pele: "#e0b98f", cabelo: "#8a8a8a", estilo: "curto", camisa: "#efe8d2", colete: "#3d7a4a", calca: "#5a5a46", sapato: "#3b2a1a", chapeu: "palhaVerde", oculos: true },
    lucia:  { pele: "#8d5a3b", cabelo: "#2b1a10", estilo: "cacheado", camisa: "#7cc0ea", jaleco: "#fbfbfb", calca: "#3b3b4a", sapato: "#2b2b2b", prancheta: true },
    jorge:  { pele: "#6b4428", cabelo: "#dddddd", estilo: "careca", camisa: "#f4b53f", avental: "#e2432a", calca: "#3b3b4a", sapato: "#3b2a1a", chapeu: "bone", bigode: "#e8e8e8" },
    marcos: { pele: "#e8c4a0", cabelo: "#3a2a1a", estilo: "penteado", camisa: "#ffffff", terno: "#2f5fb0", calca: "#24498a", sapato: "#151515", gravata: "#e2432a", cracha: true },
  };
  const rr = (c, x, y, w, h, r, fill) => { c.fillStyle = fill; c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); c.fill(); };
  const circ = (c, x, y, r, fill) => { c.fillStyle = fill; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
  /* desenha uma pessoa com os pés em (0,0); o = { walk, dir, blink, bob } */
  function drawPerson(c, L, o = {}) {
    const walk = o.walk || 0, sw = Math.sin(walk), bob = o.bob || 0, dir = o.dir || 1;
    c.save(); c.scale(dir, 1);
    c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.ellipse(0, 1.5, 11, 4, 0, 0, 7); c.fill();
    // pernas e sapatos
    const legL = sw * 2.2, legR = -sw * 2.2;
    rr(c, -5 + legL * 0.3, -14, 4.5, 13, 2, L.calca || L.saia || "#444");
    rr(c, 0.5 + legR * 0.3, -14, 4.5, 13, 2, shade(L.calca || L.saia || "#444", 0.85));
    c.fillStyle = L.sapato; c.beginPath(); c.ellipse(-2.8 + legL * 0.3, -0.8, 3.4, 1.8, 0, 0, 7); c.ellipse(2.8 + legR * 0.3, -0.8, 3.4, 1.8, 0, 0, 7); c.fill();
    c.translate(0, -bob);
    if (L.saia) { c.fillStyle = L.saia; c.beginPath(); c.moveTo(-7, -19); c.lineTo(7, -19); c.lineTo(9, -8); c.lineTo(-9, -8); c.closePath(); c.fill(); }
    // braço de trás
    const sleeve = L.jaleco || L.terno || L.camisa, armSw = sw * 3;
    c.save(); c.translate(-7.5, -28); c.rotate(0.12 - armSw * 0.08); rr(c, -2.4, 0, 4.6, 12, 2.2, shade(sleeve, 0.88)); circ(c, -0.1, 12.5, 2.3, shade(L.pele, 0.92)); c.restore();
    // tronco
    rr(c, -8, -31, 16, 18, 5, L.camisa);
    if (L.macacao) { rr(c, -7, -24, 14, 12, 3, L.macacao); c.fillStyle = L.macacao; c.fillRect(-6, -31, 2.5, 8); c.fillRect(3.5, -31, 2.5, 8); circ(c, -4.7, -24.5, 1, "#f4d35e"); circ(c, 4.7, -24.5, 1, "#f4d35e"); }
    if (L.colete) { c.fillStyle = L.colete; c.beginPath(); c.moveTo(-8, -30); c.lineTo(-1.5, -30); c.lineTo(-1.5, -13); c.lineTo(-8, -13); c.closePath(); c.moveTo(8, -30); c.lineTo(1.5, -30); c.lineTo(1.5, -13); c.lineTo(8, -13); c.closePath(); c.fill(); }
    if (L.jaleco || L.terno) {
      const col = L.jaleco || L.terno, len = L.jaleco ? -7 : -12;
      c.fillStyle = col; c.beginPath(); c.moveTo(-9, -31); c.lineTo(-1, -31); c.lineTo(0, -24); c.lineTo(1, -31); c.lineTo(9, -31); c.lineTo(9.5, len); c.lineTo(-9.5, len); c.closePath(); c.fill();
      c.strokeStyle = shade(col, 0.8); c.lineWidth = 0.8; c.beginPath(); c.moveTo(0, -24); c.lineTo(0, len); c.stroke();
      if (L.gravata) { c.fillStyle = L.gravata; c.beginPath(); c.moveTo(-1.2, -30); c.lineTo(1.2, -30); c.lineTo(1.6, -22); c.lineTo(0, -20); c.lineTo(-1.6, -22); c.closePath(); c.fill(); }
      if (L.jaleco) { rr(c, 3.5, -27, 3.5, 3, 0.8, "#7cc0ea"); }
    }
    if (L.avental) { rr(c, -6, -26, 12, 15, 2, L.avental); c.strokeStyle = shade(L.avental, 0.8); c.lineWidth = 0.8; c.beginPath(); c.moveTo(-4, -26); c.lineTo(-2, -31); c.moveTo(4, -26); c.lineTo(2, -31); c.stroke(); rr(c, -3.5, -21, 7, 4, 1, shade(L.avental, 0.92)); }
    if (L.cracha) { rr(c, 2.5, -27, 4.5, 5.5, 0.8, "#fff"); c.fillStyle = "#2f5fb0"; c.fillRect(2.5, -27, 4.5, 1.6); }
    // braço da frente (com prancheta)
    c.save(); c.translate(7.5, -28); c.rotate(-0.12 + armSw * 0.08); rr(c, -2.2, 0, 4.6, 12, 2.2, sleeve); circ(c, 0.1, 12.5, 2.3, L.pele);
    if (L.prancheta) { rr(c, -1, 7, 7, 9, 1, "#a0723f"); rr(c, 0, 8.5, 5, 6.5, 0.5, "#fff"); c.fillStyle = "#9aa6af"; c.fillRect(1, 10, 3, 0.7); c.fillRect(1, 12, 3, 0.7); }
    c.restore();
    // pescoço e cabeça
    rr(c, -2, -33.5, 4, 3.5, 1, shade(L.pele, 0.9));
    if (L.estilo === "cacheado") { [[-7, -40], [7, -40], [-6, -46], [6, -46], [0, -48.5], [-8, -35.5], [8, -35.5]].forEach(([x, y]) => circ(c, x, y, 4.2, L.cabelo)); }
    if (L.estilo === "coque") circ(c, 0, -48, 3.6, L.cabelo);
    circ(c, 0, -39.5, 7.2, L.pele);
    circ(c, -7, -39, 1.6, shade(L.pele, 0.9)); circ(c, 7, -39, 1.6, shade(L.pele, 0.9));
    // cabelo
    c.fillStyle = L.cabelo;
    if (L.estilo === "curto" || L.estilo === "coque") { c.beginPath(); c.arc(0, -40.5, 7.4, Math.PI * 1.02, Math.PI * 1.98); c.lineTo(5, -42.5); c.quadraticCurveTo(0, -44.5, -5, -42.5); c.closePath(); c.fill(); c.fillRect(-7.2, -42, 2.2, 4); c.fillRect(5, -42, 2.2, 4); }
    if (L.estilo === "cacheado") { c.beginPath(); c.arc(0, -41, 7.6, Math.PI, 0); c.fill(); }
    if (L.estilo === "penteado") { c.beginPath(); c.arc(0, -40.5, 7.5, Math.PI * 1.02, Math.PI * 1.98); c.quadraticCurveTo(2, -42, -6.5, -40.5); c.closePath(); c.fill(); c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 0.8; c.beginPath(); c.arc(-1, -44.5, 3, Math.PI * 1.1, Math.PI * 1.6); c.stroke(); }
    if (L.estilo === "careca") { c.beginPath(); c.ellipse(-6.6, -38.5, 1.6, 2.8, 0, 0, 7); c.ellipse(6.6, -38.5, 1.6, 2.8, 0, 0, 7); c.fill(); }
    // rosto
    const ey = -39;
    if (o.blink) { c.strokeStyle = "#2b2620"; c.lineWidth = 0.9; c.beginPath(); c.moveTo(-3.6, ey); c.lineTo(-1.6, ey); c.moveTo(1.6, ey); c.lineTo(3.6, ey); c.stroke(); }
    else { circ(c, -2.6, ey, 1.05, "#2b2620"); circ(c, 2.6, ey, 1.05, "#2b2620"); circ(c, -2.3, ey - 0.4, 0.35, "#fff"); circ(c, 2.9, ey - 0.4, 0.35, "#fff"); }
    c.fillStyle = "rgba(226,90,90,.28)"; c.beginPath(); c.ellipse(-4.4, -36.3, 1.6, 1, 0, 0, 7); c.ellipse(4.4, -36.3, 1.6, 1, 0, 0, 7); c.fill();
    if (L.bigode) { c.fillStyle = L.bigode; c.beginPath(); c.ellipse(-1.6, -35.4, 2, 1, 0.2, 0, 7); c.ellipse(1.6, -35.4, 2, 1, -0.2, 0, 7); c.fill(); }
    c.strokeStyle = "#7a3b2a"; c.lineWidth = 0.9; c.beginPath(); c.arc(0, -35.8, 1.8, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    if (L.oculos || o.epi) { c.strokeStyle = o.epi ? "#3a8de0" : "#3b3b3b"; c.lineWidth = o.epi ? 1.4 : 0.8; c.beginPath(); c.arc(-2.6, ey, 2.1, 0, 7); c.moveTo(4.7, ey); c.arc(2.6, ey, 2.1, 0, 7); c.moveTo(-0.5, ey); c.lineTo(0.5, ey); c.stroke(); if (o.epi) { c.fillStyle = "rgba(159,211,240,.45)"; c.fillRect(-4.8, ey - 2, 9.6, 4); } }
    // chapéus
    if (L.chapeu === "palha" || L.chapeu === "palhaVerde") {
      c.fillStyle = "#e9c46a"; c.beginPath(); c.ellipse(0, -44.5, 13, 3.8, 0, 0, 7); c.fill();
      c.beginPath(); c.ellipse(0, -47, 7, 5, 0, Math.PI, 0); c.fill(); c.fillRect(-7, -47, 14, 2.5);
      c.fillStyle = L.chapeu === "palhaVerde" ? "#3d7a4a" : "#c4512e"; c.fillRect(-7, -46, 14, 1.8);
      c.strokeStyle = "rgba(160,110,40,.45)"; c.lineWidth = 0.6; c.beginPath(); c.ellipse(0, -44.5, 10, 2.6, 0, 0, 7); c.stroke();
    }
    if (L.chapeu === "bone") { c.fillStyle = "#2f74c0"; c.beginPath(); c.arc(0, -43, 7.3, Math.PI, 0); c.fill(); c.beginPath(); c.ellipse(5.5, -43, 6, 1.6, 0, 0, 7); c.fill(); circ(c, 0, -50, 1, "#fff"); }
    c.restore();
  }
  function drawPlayer(c, P, time) {
    const andando = Math.hypot(P.tx - P.x, P.ty - P.y) > 0.02;
    const epi = G && G.inv.epi && G.sel.kind === "prod" && prod(G.sel.id).tipo === "agro";
    drawPerson(c, LOOKS.jose, { walk: andando ? P.walk || 0 : 0, dir: P.dir || 1, bob: andando ? Math.abs(Math.sin(P.walk || 0)) * 1.2 : Math.sin(time * 2) * 0.4, blink: (time % 4) < 0.13, epi });
  }
  /* retrato do vizinho para as janelas de conversa (desenhado uma vez) */
  const RETRATOS = {};
  function retrato(id) {
    if (RETRATOS[id]) return RETRATOS[id];
    const cv = document.createElement("canvas"); cv.width = 220; cv.height = 220;
    const c = cv.getContext("2d");
    const g = c.createLinearGradient(0, 0, 0, 220); g.addColorStop(0, "#fff6df"); g.addColorStop(1, "#f1dfbd");
    c.fillStyle = g; c.fillRect(0, 0, 220, 220);
    c.translate(110, 372); c.scale(7, 7);
    drawPerson(c, LOOKS[id], {});
    return (RETRATOS[id] = cv.toDataURL());
  }

  /* ==========================================================
     FINAL
     ========================================================== */

  function gameOver() {
    clearSave(); if (G) G.started = false;
    app.classList.remove("game"); document.body.classList.remove("landscape-phone");
    app.innerHTML = `
      <section class="card narrow stack" style="text-align:center;align-items:center">
        <div style="font-size:72px">🏥</div>
        <h2 style="font-size:32px">O José foi parar no posto de saúde!</h2>
        <p>A saúde dele chegou a zero${G.stats.semEPI ? ", depois de aplicar agrotóxico sem EPI" : ""}${G.stats.irregulares ? " e de perder colheitas irregulares" : ""}.</p>
        <p class="muted">Em caso de intoxicação por agrotóxico, procure atendimento e ligue para o Disque-Intoxicação: <b>0800 722 6001</b>.</p>
        <div class="stack" style="text-align:left;width:100%">
          <p><b>Para o José não passar por isso de novo:</b></p>
          <p>🥽 Agrotóxico só com EPI completo, e de preferência nem usar na horta de casa.</p>
          <p>🐞 Prefira alternativas: joaninhas, calda de neem, catar à mão, podar e plantar flores.</p>
          <p>🌱 Plante o suficiente e regue todo dia para a despensa nunca ficar vazia.</p>
        </div>
        <button class="btn big green" id="again">Tentar de novo</button>
      </section>`;
    $("#again").onclick = () => startGame(false);
  }



  /* ---------- refeições do José (12h e 19h) ---------- */
  function eat(refeicao) {
    let msg;
    const iOk = G.despensa.findIndex((d) => d.status === "ok");
    const idx = iOk >= 0 ? iOk : G.despensa.length ? 0 : -1;
    if (idx >= 0) {
      const d = G.despensa.splice(idx, 1)[0];
      G.fome = 0;
      if (d.status === "ok") {
        const nome = itemNome(d).toLowerCase();
        if (G.hearts < START_HEARTS) { G.hearts++; msg = `😋 Hora do ${refeicao}! José comeu ${nome} e recuperou ❤️`; }
        else msg = `😋 Hora do ${refeicao}! José comeu ${nome}.`;
        addPts(5, `José comeu ${nome}`);
        G.comeu.push(d.id); if (G.comeu.length >= 5) unlock("nutrido");
        toast(msg, 5, "good", 3500);
      } else { toast(`🍪 Hora do ${refeicao}… José comeu biscoito de pacote. Não recupera ❤️.`, null, "", 3500); setTimeout(() => fact("ultra", "🍪"), 800); }
    } else {
      G.fome++;
      let m = `🥣 Hora do ${refeicao} e a despensa está vazia! José ficou com fome.`;
      if (G.fome >= 2) { G.hearts--; G.fome = 0; m += " Perdeu ❤️."; addPts(-10, "José passou fome", "fome"); }
      sfx.bad(); toast(m, null, "bad", 4500);
      setTimeout(() => fact("fome", "🥣"), 800);
      if (G.hearts <= 0) { G.over = true; setTimeout(gameOver, 1500); }
    }
    renderUI();
  }

  /* ---------- noite: o José dorme (e às vezes muda a estação) ---------- */
  function sleep() {
    if (G.over) return;
    quest("dormir"); tut("sleep"); sfx.night();
    G.acc = 0;
    const antes = SEA(), estavaNaVila = naVila();
    G.day++;
    G.hour = DAY_START;
    G.area = "fazenda"; G.focus = null;
    G.player.x = G.player.tx = 2.5; G.player.y = G.player.ty = 1.6;
    G.encomenda = null; G.proxPedido = DAY_START + 1;
    const linhas = ["🌙 José foi dormir. Hoje: almoço às 12h e jantar às 19h."];
    if (G.day > YEAR_DAYS) {
      G.day = YEAR_DAYS; G.over = true; clearSave();
      dayfxEl.innerHTML = `<div><b>Fim do ano!</b><p>O José completou um ano na horta. Vamos ver o balanço…</p></div>`;
      dayfxEl.hidden = false; setTimeout(() => { dayfxEl.hidden = true; }, 1900);
      setTimeout(endYear, 1950); return;
    }
    const S = SEA();
    if (S.id !== antes.id) {   // troca de estação: o que não é da época murcha
      const mortas = [];
      G.tiles.forEach((t) => { if (t.crop && !t.crop.dead && !doEpoca(t.crop.id)) { t.crop.dead = true; t.crop.pest = null; mortas.push(t.crop.id); G.stats.perdidas++; } });
      if (mortas.length) { addPts(-5 * mortas.length, `${mortas.length} planta(s) fora da época murcharam`, "epoca"); lose("epoca", 15 * mortas.length); }
      linhas.push(`${S.icone} <b>Começou o ${S.nome.toLowerCase()}!</b> ${S.desc}`);
      if (mortas.length) linhas.push(`🥀 ${mortas.length} planta(s) murcharam: não eram da época (${[...new Set(mortas)].map(cropIcon).join(" ")}).`);
      setTimeout(() => fact("epoca", "🍂"), 2100);
    }
    G.rain = rnd() < S.chuva;
    G.tiles.forEach((t) => { if (G.rain && t.soil) t.agua = aguaMax(); t.watered = t.agua > 0; });
    if (G.rain) setTimeout(() => tut("allwatered"), 50);
    linhas.push(G.rain ? "🌧️ Choveu de manhã: tudo regado!" : "☀️ Amanheceu: confira a água das plantas.");
    if (G.galinhas > 0 && G.up.galinheiro) {
      for (let i = 0; i < G.galinhas; i++) G.despensa.push({ id: "ovo", status: "ok", chem: false });
      G.stats.ovos += G.galinhas; unlock("galinha");
      linhas.push(`🥚 As galinhas botaram ${G.galinhas} ovo(s): foram para a despensa.`);
    }
    if (G.agromax && weekday() === 0) {   // contrato: pulverização toda segunda
      let n = 0;
      G.tiles.forEach((t) => { if (t.crop && !t.crop.dead && !CROPS[t.crop.id].companheira) { t.crop.chem = true; t.crop.carencia = Math.max(t.crop.carencia, 4); t.crop.pest = null; n++; } });
      if (n) { G.stats.agro++; linhas.push(`🚜 Segunda-feira: a AgroMax pulverizou ${n} planta(s), como diz o contrato. Respeite a carência!`); }
    }
    const F = FESTIVALS[S.id];
    if (isFeira()) linhas.push(`${F.icone} Hoje é sábado: <b>${F.nome}</b> na vila! Vendas na banca valem mais.`);
    else if (weekday() === FEIRA_DIA - 2) linhas.push(`${F.icone} Amanhã é sábado: ${F.nome} na vila. Concurso: ${F.pede}.`);
    dayfxEl.innerHTML = `<div><b>${WEEKDAYS[weekday()]}, ${diaDaEstacao()} · ${S.icone} ${S.nome}</b><p>${linhas.join("<br>")}</p></div>`;
    dayfxEl.hidden = false;
    setTimeout(() => { dayfxEl.hidden = true; }, 2300);
    if (G.hearts <= 0) { G.over = true; setTimeout(gameOver, 1950); return; }
    if (estavaNaVila) setupView();
    renderUI();
    saveGame();
  }
  function endYear() {
    if (G.cesta.length) { G.endPending = true; G.over = false; deliver(); G.over = true; return; }
    finish();
  }

  /* ==========================================================
     LAÇO PRINCIPAL E DESENHO
     ========================================================== */
  let lastT = 0;
  function frame(ts, id) {
    if (id !== LOOP || !canvas || !document.body.contains(canvas)) return;
    try { step(ts); } catch (err) { console.error(err); }  // um erro não pode travar o jogo
    requestAnimationFrame((t) => frame(t, id));
  }
  let lastSave = 0;
  function step(ts) {
    const dt = Math.min(0.05, (ts - lastT) / 1000 || 0); lastT = ts;
    const P = G.player, dx = P.tx - P.x, dy = P.ty - P.y, d = Math.hypot(dx, dy);
    if (d > 0.02) { const s = Math.min(d, dt * 5); P.x += (dx / d) * s; P.y += (dy / d) * s; P.dir = dx - dy >= 0 ? 1 : -1; P.walk = (P.walk || 0) + dt * 10; }
    const running = !G.over && !G.paused && modalEl.hidden && dayfxEl.hidden && !(G.tut >= 0 && G.tut <= 4);
    if (running) {
      G.acc += dt * 1000 * (G.speed || 1);
      if (G.acc >= HOUR_MS) { G.acc -= HOUR_MS; hourTick(); }
    }
    if (ts - lastSave > 3000) { lastSave = ts; saveGame(); }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    draw(ctx, CW, CH, G.view, ts);
    drawDayLight(ctx);
  }
  function drawDayLight(c) {
    if (!G || G.hour < 17) return;
    const k = Math.min(1, (G.hour + G.acc / HOUR_MS - 17) / 5);
    c.save(); c.fillStyle = `rgba(40, 30, 90, ${k * 0.35})`; c.fillRect(0, 0, CW, CH); c.restore();
  }
  function draw(c, w, h, view, ts = performance.now()) {
    c.save();
    const S = G ? SEA() : SEASONS[0];
    c.fillStyle = naVila() ? "#9fcf86" : { primavera: "#9fcf86", verao: "#a9d27c", outono: "#c9c27a", inverno: "#b7cdb0" }[S.id];
    c.fillRect(0, 0, w, h);
    c.translate(w / 2, h / 2); c.scale(view.z, view.z); c.translate(-view.cx, -view.cy);
    const time = ts / 1000;
    if (naVila()) drawVila(c, time); else drawFarm(c, time);
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i]; f.t += 0.016;
      c.globalAlpha = Math.max(0, 1 - f.t);
      c.font = "bold 18px Fredoka, sans-serif"; c.textAlign = "center"; c.fillStyle = f.color;
      c.fillText(f.text, f.x, f.y - f.t * 40);
      c.globalAlpha = 1;
      if (f.t >= 1) floaters.splice(i, 1);
    }
    c.restore(); c.save();
    if (G && G.rain) {
      c.strokeStyle = "rgba(120,160,220,.45)"; c.lineWidth = 1.5;
      const n = Math.round(60 * w / 680);
      for (let i = 0; i < n; i++) { const rx = (i * 97 + time * 220) % w, ry = (i * 53 + time * 420) % h; c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx - 4, ry + 10); c.stroke(); }
    }
    c.restore();
  }
  const SEASON_TINT = { primavera: null, verao: null, outono: ["#b9b45f", "#b3ad59", "#bfba66"], inverno: ["#a9c3a2", "#a3bd9c", "#afc9a8"] };
  function drawFarm(c, time) {
    // chão
    for (let s = 0; s < N * 2 - 1; s++) for (let x = 0; x <= s; x++) {
      const y = s - x; if (x >= N || y >= N) continue;
      const t = T(x, y); const [sx, sy] = toScreen(x, y);
      let fill = ["#8fc96b", "#89c466", "#94cd70"][t.shade];
      if (!inFarm(x, y)) fill = (SEASON_TINT[SEA().id] || ["#7fbd5c", "#79b757", "#84c161"])[t.shade];
      if (isSpot("casa", x, y) || isSpot("lixo", x, y) || isSpot("devolucao", x, y) || isSpot("tanque", x, y) || isSpot("paraVila", x, y)) fill = "#d8c39a";
      if (t.soil) fill = t.watered ? "#5e3f27" : "#8b5e3a";
      diamond(c, sx, sy, fill, "rgba(0,0,0,.06)");
      if (t.soil) { // sulcos
        c.strokeStyle = t.watered ? "rgba(0,0,0,.18)" : "rgba(60,35,15,.25)"; c.lineWidth = 1.5;
        for (let k = 1; k <= 2; k++) { c.beginPath(); c.moveTo(sx - TW / 2 + k * 10, sy + TH / 2 - k * 5 + 6); c.lineTo(sx + k * 10 - 6, sy + TH - k * 5 + 2); c.stroke(); }
      }
      if (G && G.focus && G.focus[0] === x && G.focus[1] === y) { c.lineWidth = 3; c.strokeStyle = "#f4b53f"; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + TW / 2, sy + TH / 2); c.lineTo(sx, sy + TH); c.lineTo(sx - TW / 2, sy + TH / 2); c.closePath(); c.stroke(); }
      else if (G && G.hover && G.hover[0] === x && G.hover[1] === y) { c.lineWidth = 2; c.strokeStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + TW / 2, sy + TH / 2); c.lineTo(sx, sy + TH); c.lineTo(sx - TW / 2, sy + TH / 2); c.closePath(); c.stroke(); }
    }
    // alerta de praga nova (anel piscando)
    if (G && G.alerta && performance.now() < G.alerta.ate) {
      const [ax, ay] = toScreen(G.alerta.x, G.alerta.y); const pk = 0.5 + 0.5 * Math.sin(time * 8);
      c.lineWidth = 5; c.strokeStyle = `rgba(226,67,42,${0.4 + pk * 0.6})`;
      c.beginPath(); c.moveTo(ax, ay - 4); c.lineTo(ax + TW / 2 + 6, ay + TH / 2); c.lineTo(ax, ay + TH + 4); c.lineTo(ax - TW / 2 - 6, ay + TH / 2); c.closePath(); c.stroke();
    }
    // destaque do tutorial
    const hl = tutHL();
    if (hl && hl.tile) {
      const [hx, hy] = toScreen(hl.tile[0], hl.tile[1]); const pulse = 0.5 + 0.5 * Math.sin(time * 5);
      c.lineWidth = 4; c.strokeStyle = `rgba(244,181,63,${0.5 + pulse * 0.5})`;
      c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + TW / 2, hy + TH / 2); c.lineTo(hx, hy + TH); c.lineTo(hx - TW / 2, hy + TH / 2); c.closePath(); c.stroke();
      c.font = "26px sans-serif"; c.textAlign = "center"; c.fillText("👇", hx, hy - 6 - pulse * 8);
    }
    // borda da horta (cerquinha)
    drawFence(c);
    // objetos em ordem de profundidade
    const P = G ? G.player : null;
    const pDepth = P ? Math.floor(P.x) + Math.floor(P.y) : -1;
    const galinhas = [];
    for (let i = 0; G && G.up && G.up.galinheiro && i < (G.galinhas || 0); i++) {
      const gx = 1.1 + 0.55 * Math.sin(time * 0.35 + i * 2.3), gy = 3.6 + 1.6 * Math.sin(time * 0.22 + i * 1.7);
      galinhas.push({ x: gx, y: gy, x0: Math.floor(gx), s: Math.floor(gx) + Math.floor(gy), i });
    }
    for (let s = 0; s < N * 2 - 1; s++) {
      for (let x = 0; x <= s; x++) {
        const y = s - x; if (x >= N || y >= N) continue;
        const t = T(x, y); const [sx, sy] = toScreen(x, y);
        const cx = sx, cy = sy + TH / 2;
        if (x === 1 && y === 1) drawHouse(c);
        if (isSpot("lixo", x, y)) drawBin(c, cx, cy, "#7d8a8c", "🗑️", "Lixo comum");
        if (isSpot("devolucao", x, y)) drawBin(c, cx, cy, "#2f74c0", "♻️", "Devolução");
        if (isSpot("banca", x, y)) drawStall(c, cx, cy, time);
        if (isSpot("tanque", x, y)) drawTank(c, cx, cy, time);
        if (G && G.up && G.up.cisterna && isSpot("cisterna", x, y)) drawBin(c, cx, cy, "#3a7bd5", "💧", "Cisterna");
        if (G && G.up && G.up.composteira && isSpot("composteira", x, y)) drawBin(c, cx, cy, "#7a5230", "🪱", "Composteira");
        if (isSpot("arvores", x, y)) drawTree(c, cx, cy);
        if (G && G.up && G.up.pote && isSpot("pote", x, y)) drawPote(c, cx, cy, time);
        if (G && G.up && G.up.galinheiro && isSpot("galinheiro", x, y)) drawCoop(c, cx, cy);
        if (isSpot("paraVila", x, y)) drawSign(c, cx, cy, "Vila ➜");
        galinhas.forEach((g) => { if (g.s === s && g.x0 === x) drawChicken(c, g, time); });
        if (t.crop) { c.save(); c.translate(cx, cy); c.scale(1.25, 1.25); drawCrop(c, t, 0, 0, time); c.restore(); }
        if (t.joaninhas > 0 && t.crop) { c.font = "12px sans-serif"; c.textAlign = "center"; c.fillText("🐞", cx + 14 + Math.sin(time * 3 + x) * 3, cy - 18); }
      }
      if (P && s === pDepth) { const [px, py] = toScreen(P.x - 0.5, P.y - 0.5); c.save(); c.translate(px, py + TH / 2); c.scale(1.25, 1.25); drawPlayer(c, P, time); c.restore(); }
    }
    // textos flutuantes
  }
  /* ---------- a vila ---------- */
  const PRACA = (x, y) => x >= 2 && x <= 5 && y >= 3 && y <= 6;
  const ESTRADA = [[0, 7], [1, 7], [1, 6], [2, 6], [0, 6]];
  function drawVila(c, time) {
    for (let s = 0; s < N * 2 - 1; s++) for (let x = 0; x <= s; x++) {
      const y = s - x; if (x >= N || y >= N) continue;
      const [sx, sy] = toScreen(x, y), sh = (x * 7 + y * 13) % 3;
      let fill = ["#86c464", "#80be5e", "#8bc96a"][sh];
      if (PRACA(x, y)) fill = ["#ddd2bf", "#d6cab6", "#e2d8c6"][sh];
      if (ESTRADA.some(([a, b]) => a === x && b === y) || y === 2) fill = "#cdb98f";
      if (predioEm(x, y)) fill = "#d8c39a";
      diamond(c, sx, sy, fill, "rgba(0,0,0,.06)");
      if (G.focus && G.focus[0] === x && G.focus[1] === y) { c.lineWidth = 3; c.strokeStyle = "#f4b53f"; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + TW / 2, sy + TH / 2); c.lineTo(sx, sy + TH); c.lineTo(sx - TW / 2, sy + TH / 2); c.closePath(); c.stroke(); }
      else if (G.hover && G.hover[0] === x && G.hover[1] === y) { c.lineWidth = 2; c.strokeStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + TW / 2, sy + TH / 2); c.lineTo(sx, sy + TH); c.lineTo(sx - TW / 2, sy + TH / 2); c.closePath(); c.stroke(); }
    }
    const F = festival();
    if (F) drawBandeirinhas(c, time);
    const P = G.player, pDepth = Math.floor(P.x) + Math.floor(P.y);
    for (let s = 0; s < N * 2 - 1; s++) {
      for (let x = 0; x <= s; x++) {
        const y = s - x; if (x >= N || y >= N) continue;
        const [sx, sy] = toScreen(x, y), cx = sx, cy = sy + TH / 2;
        Object.entries(VILA).forEach(([k, b]) => { if (x === b.x + b.w - 1 && y === b.y + b.d - 1) drawPredio(c, k, b, time); });
        if (isVSpot("arvores", x, y)) drawTree(c, cx, cy);
        if (isVSpot("paraFazenda", x, y)) drawSign(c, cx, cy, "➜ Fazenda");
        if (isVSpot("festa", x, y)) { if (F) drawFestaStall(c, cx, cy, time, F); else drawFonte(c, cx, cy, time); }
        const n = npcEm(x, y); if (n) drawNPC(c, n, cx, cy, time);
      }
      if (s === pDepth) { const [px, py] = toScreen(P.x - 0.5, P.y - 0.5); c.save(); c.translate(px, py + TH / 2); c.scale(1.25, 1.25); drawPlayer(c, P, time); c.restore(); }
    }
  }
  function drawPredio(c, k, b, time) {
    const [ax, ay] = toScreen(b.x, b.y), [bx, by] = toScreen(b.x + b.w, b.y), [dx, dy] = toScreen(b.x, b.y + b.d), [ex, ey] = toScreen(b.x + b.w, b.y + b.d);
    const H = 50;
    const ruina = k === "feira" && !G.agromax ? G.bundlesFeitos.length / BUNDLES.length : 1;
    let parede = b.parede, parede2 = b.parede2, telhado = b.telhado, telhado2 = b.telhado2, nome = b.nome;
    if (k === "feira" && G.agromax) { parede = "#c9ced6"; parede2 = "#b3b9c3"; telhado = "#6b7480"; telhado2 = "#58606b"; nome = "Depósito AgroMax"; }
    else if (k === "feira" && ruina < 1) { parede = "#cdbfa8"; parede2 = "#b8a98f"; }
    c.fillStyle = "rgba(0,0,0,.15)"; c.beginPath(); c.ellipse((dx + bx) / 2, (dy + by) / 2 + 22, 70, 22, 0, 0, 7); c.fill();
    c.fillStyle = parede; c.beginPath(); c.moveTo(dx, dy); c.lineTo(ex, ey); c.lineTo(ex, ey - H); c.lineTo(dx, dy - H); c.closePath(); c.fill();
    c.fillStyle = parede2; c.beginPath(); c.moveTo(ex, ey); c.lineTo(bx, by); c.lineTo(bx, by - H); c.lineTo(ex, ey - H); c.closePath(); c.fill();
    const mx = (dx + ex) / 2, my = (dy + ey) / 2;
    c.fillStyle = "#8a5528"; c.fillRect(mx - 9, my - 28, 18, 26);
    c.fillStyle = "#9fd3f0"; const wx = (ex + bx) / 2, wy = (ey + by) / 2; c.fillRect(wx - 12, wy - 36, 24, 14);
    if (k === "feira" && !G.agromax && ruina < 1) { // tábuas na porta
      c.strokeStyle = "#6b4a2e"; c.lineWidth = 3; c.beginPath(); c.moveTo(mx - 11, my - 26); c.lineTo(mx + 11, my - 6); c.moveTo(mx + 11, my - 26); c.lineTo(mx - 11, my - 6); c.stroke();
    }
    c.globalAlpha = k === "feira" && !G.agromax ? 0.25 + 0.75 * ruina : 1;
    c.fillStyle = telhado;
    c.beginPath(); c.moveTo(dx - 4, dy - H); c.lineTo(ex, ey - H + 4); c.lineTo((ax + ex) / 2, (ay + ey) / 2 - H - 36); c.lineTo((ax + dx) / 2 - 4, (ay + dy) / 2 - H - 36); c.closePath(); c.fill();
    c.fillStyle = telhado2;
    c.beginPath(); c.moveTo(ex, ey - H + 4); c.lineTo(bx + 4, by - H); c.lineTo((ax + bx) / 2 + 4, (ay + by) / 2 - H - 36); c.lineTo((ax + ex) / 2, (ay + ey) / 2 - H - 36); c.closePath(); c.fill();
    c.globalAlpha = 1;
    if (k === "feira" && ruina >= 1 && !G.agromax) { // bandeirinhas da feira reaberta
      for (let i = 0; i < 8; i++) { c.fillStyle = ["#e2432a", "#f4b53f", "#3d8b3d", "#2f74c0"][i % 4]; const px = dx + (ex - dx) * (i / 8), py = dy - H + (ey - dy) * (i / 8); c.beginPath(); c.moveTo(px, py + 2); c.lineTo(px + 8, py + 6); c.lineTo(px + 3, py + 13); c.closePath(); c.fill(); }
    }
    // placa
    c.font = "bold 12px Fredoka, sans-serif"; c.textAlign = "center";
    const label = k === "feira" && !G.agromax && ruina < 1 ? `${nome} (${G.bundlesFeitos.length}/${BUNDLES.length})` : nome;
    const w = c.measureText(label).width + 14, lx = (dx + bx) / 2, ly = (ay + ey) / 2 - H - 44;
    c.fillStyle = "rgba(255,248,234,.95)"; c.beginPath(); c.roundRect ? c.roundRect(lx - w / 2, ly - 12, w, 17, 6) : c.rect(lx - w / 2, ly - 12, w, 17); c.fill();
    c.fillStyle = "#2b2620"; c.fillText(label, lx, ly + 1);
  }
  function drawNPC(c, n, cx, cy, time) {
    const seed = n.pos[0] * 1.7 + n.pos[1] * 2.3;
    const u = time * 0.35 + seed, ox = Math.sin(u) * 8, vel = Math.cos(u);   // passeia um pouco pela praça
    const andando = Math.abs(vel) > 0.35;
    c.save(); c.translate(cx + ox, cy); c.scale(1.3, 1.3);
    drawPerson(c, LOOKS[n.id], { walk: andando ? time * 7 + seed : 0, dir: vel >= 0 ? 1 : -1, bob: andando ? Math.abs(Math.sin(time * 7 + seed)) * 1 : Math.sin(time * 2 + seed) * 0.4, blink: ((time + seed) % 4.3) < 0.13 });
    c.restore();
    c.font = "bold 10px Fredoka, sans-serif"; c.textAlign = "center";
    const w = c.measureText(n.nome).width + 10;
    c.fillStyle = "rgba(43,38,32,.8)"; c.beginPath(); c.roundRect ? c.roundRect(cx + ox - w / 2, cy + 6, w, 14, 6) : c.rect(cx + ox - w / 2, cy + 6, w, 14); c.fill();
    c.fillStyle = "#fff"; c.fillText(n.nome, cx + ox, cy + 16);
    if (G.falou[n.id] !== G.day) { const by = cy - 74 + Math.sin(time * 4 + n.pos[1]) * 2; c.fillStyle = "#fff"; c.beginPath(); c.arc(cx + ox + 10, by, 9, 0, 7); c.fill(); c.font = "11px sans-serif"; c.fillText("💬", cx + ox + 10, by + 4); }
  }
  function drawSign(c, cx, cy, txt) {
    c.fillStyle = "#7a5230"; c.fillRect(cx - 2, cy - 26, 4, 26);
    c.font = "bold 11px Fredoka, sans-serif"; c.textAlign = "center";
    const w = c.measureText(txt).width + 12;
    c.fillStyle = "#c98b4f"; c.fillRect(cx - w / 2, cy - 40, w, 16);
    c.fillStyle = "#fff"; c.fillText(txt, cx, cy - 28);
  }
  function drawFonte(c, cx, cy, time) {
    c.fillStyle = "#b9c2c9"; c.beginPath(); c.ellipse(cx, cy, 26, 12, 0, 0, 7); c.fill();
    c.fillStyle = "#7cc0ea"; c.beginPath(); c.ellipse(cx, cy - 2, 20, 8, 0, 0, 7); c.fill();
    c.fillStyle = "#9aa6af"; c.fillRect(cx - 3, cy - 22, 6, 20);
    const k = (time * 2) % 1; c.fillStyle = "rgba(58,141,224,.8)"; c.beginPath(); c.arc(cx - 6 + k * 3, cy - 20 + k * 14, 2, 0, 7); c.arc(cx + 6 - k * 3, cy - 20 + k * 14, 2, 0, 7); c.fill();
  }
  function drawFestaStall(c, cx, cy, time, F) {
    drawStall(c, cx, cy, time, true);
    c.font = "22px sans-serif"; c.textAlign = "center"; c.fillText(F.icone, cx, cy - 52 + Math.sin(time * 3) * 2);
    c.font = "bold 11px Fredoka, sans-serif"; c.fillStyle = "#2b2620";
    const w = c.measureText(F.nome).width + 12;
    c.fillStyle = "#e2432a"; c.beginPath(); c.roundRect ? c.roundRect(cx - w / 2, cy + 6, w, 16, 7) : c.rect(cx - w / 2, cy + 6, w, 16); c.fill();
    c.fillStyle = "#fff"; c.fillText(F.nome, cx, cy + 18);
  }
  function drawBandeirinhas(c, time) {
    const linhas = [[[2, 3], [6, 3]], [[2, 3], [2, 7]], [[2, 5], [6, 5]]];
    linhas.forEach(([[x0, y0], [x1, y1]], li) => {
      const [a, b] = toScreen(x0, y0), [e, f] = toScreen(x1, y1);
      c.strokeStyle = "rgba(90,60,30,.6)"; c.lineWidth = 1; c.beginPath(); c.moveTo(a, b - 40); c.lineTo(e, f - 40); c.stroke();
      for (let i = 0; i < 12; i++) {
        const t = (i + 0.5) / 12, px = a + (e - a) * t, py = b - 40 + (f - b) * t + Math.sin(time * 3 + i) * 1;
        c.fillStyle = ["#e2432a", "#f4b53f", "#3d8b3d", "#2f74c0", "#c45a8a"][(i + li) % 5];
        c.beginPath(); c.moveTo(px - 4, py); c.lineTo(px + 4, py); c.lineTo(px, py + 8); c.closePath(); c.fill();
      }
    });
  }
  function drawChicken(c, g, time) {
    const [px, py] = toScreen(g.x, g.y);
    const peck = Math.max(0, Math.sin(time * 3 + g.i * 2)) * 2;
    c.fillStyle = "rgba(0,0,0,.15)"; c.beginPath(); c.ellipse(px, py + 2, 6, 2.5, 0, 0, 7); c.fill();
    c.fillStyle = "#fffaf0"; c.beginPath(); c.ellipse(px, py - 5, 6, 5, 0, 0, 7); c.fill();
    c.beginPath(); c.arc(px + 5, py - 9 + peck, 3.5, 0, 7); c.fill();
    c.fillStyle = "#e2432a"; c.beginPath(); c.arc(px + 5, py - 13 + peck, 1.8, 0, 7); c.fill();
    c.fillStyle = "#f4b53f"; c.beginPath(); c.moveTo(px + 8, py - 9 + peck); c.lineTo(px + 11, py - 8 + peck); c.lineTo(px + 8, py - 7 + peck); c.fill();
  }
  function drawCoop(c, cx, cy) {
    c.fillStyle = "rgba(0,0,0,.15)"; c.beginPath(); c.ellipse(cx, cy + 2, 24, 9, 0, 0, 7); c.fill();
    c.fillStyle = "#a0723f"; c.fillRect(cx - 18, cy - 24, 36, 24);
    c.fillStyle = "#c4512e"; c.beginPath(); c.moveTo(cx - 22, cy - 22); c.lineTo(cx, cy - 38); c.lineTo(cx + 22, cy - 22); c.closePath(); c.fill();
    c.fillStyle = "#3b2a1a"; c.beginPath(); c.arc(cx, cy - 8, 6, Math.PI, 0); c.fill(); c.fillRect(cx - 6, cy - 8, 12, 8);
    c.font = "bold 10px Fredoka, sans-serif"; c.textAlign = "center"; c.fillStyle = "#2b2620"; c.fillText("Galinheiro", cx, cy - 42);
  }
  function drawPote(c, cx, cy, time) {
    c.fillStyle = "#a0723f"; c.fillRect(cx - 14, cy - 10, 28, 10);
    c.fillStyle = "rgba(220,240,255,.85)"; c.fillRect(cx - 8, cy - 30, 16, 20);
    c.fillStyle = G.pote ? (CONSERVAS[G.pote.base] && G.pote.base === "uva" ? "#7b3fa0" : G.pote.base === "pepino" ? "#5aad4a" : "#e2432a") : "#ccc";
    c.fillRect(cx - 7, cy - 22, 14, 11);
    c.fillStyle = "#c98b4f"; c.fillRect(cx - 9, cy - 33, 18, 4);
    c.font = "bold 10px Fredoka, sans-serif"; c.textAlign = "center"; c.fillStyle = "#2b2620"; c.fillText("Conserva", cx, cy - 38);
    if (G.pote && poteHoras() <= 0) { const by = cy - 52 + Math.sin(time * 4) * 2; c.fillStyle = "#2f7d32"; c.beginPath(); c.arc(cx, by, 8, 0, 7); c.fill(); c.fillStyle = "#fff"; c.font = "bold 11px sans-serif"; c.fillText("✓", cx, by + 4); }
    else if (G.pote) { c.fillStyle = "#2b2620"; c.font = "bold 10px Fredoka, sans-serif"; c.fillText(`${poteHoras()}h`, cx, cy - 48); }
  }

  /* ==========================================================
     FIM DO ANO: notas, onde perdeu pontos, final da história
     ========================================================== */
  function grades() {
    const S = G.stats, clamp = (x) => Math.max(0, Math.min(100, Math.round(x)));
    const tot = S.saudaveis + S.irregulares + S.perdidas;
    const mediaCor = NPCS.filter((n) => n.id !== "marcos").reduce((a, n) => a + coracoes(n.id), 0) / (NPCS.length - 1);
    const v = {
      saude: clamp((G.hearts / START_HEARTS) * 60 + (Math.min(G.comeu.length, 30) / 30) * 40),
      horta: tot ? clamp((S.saudaveis / tot) * 100 - S.agro * 4) : 0,
      conhec: S.lavouTotal ? clamp((S.lavouCerto / S.lavouTotal) * 100) : 0,
      vila: clamp(Math.min(G.coins / META_MOEDAS, 1) * 35 + (repStars() / 5) * 25 + (mediaCor / CORACOES_MAX) * 40),
    };
    const st = (x) => (x >= 85 ? 3 : x >= 60 ? 2 : x >= 35 ? 1 : 0);
    return [
      { icone: "❤️", nome: "Saúde do José", v: v.saude, dica: "Guarde comida da horta para o almoço e o jantar, e nunca use agrotóxico sem EPI." },
      { icone: "🌿", nome: "Horta limpa", v: v.horta, dica: "Trate as pragas cedo com alternativas, respeite a carência e a época de cada planta." },
      { icone: "🧠", nome: "Conhecimento", v: v.conhec, dica: "Lave cada alimento do jeito certo no tanque (o 📖 Guia e a Dona Cida ensinam)." },
      { icone: "🏘️", nome: "Vila e banca", v: v.vila, dica: "Converse com os vizinhos todo dia, dê presentes, venda sem agrotóxico e entregue pedidos." },
    ].map((g) => ({ ...g, s: st(g.v) }));
  }
  function finish() {
    clearSave();
    app.classList.remove("game"); document.body.classList.remove("in-game");
    G.endPending = false;
    if (G.inv.embalagens > 0) addPts(-10 * G.inv.embalagens, `${G.inv.embalagens} embalagem(ns) esquecida(s) em casa`, "esquecida");
    const S = G.stats;
    if (S.cultivos.size >= 4) addPts(S.cultivos.size * 5, `Diversidade: ${S.cultivos.size} culturas diferentes`);
    if (S.agro === 0 && S.saudaveis > 0) unlock("semveneno");
    const LIM = [500, 1100, 1800];
    const stars = G.score >= LIM[2] ? 3 : G.score >= LIM[1] ? 2 : G.score >= LIM[0] ? 1 : 0;
    const rec = store.get("recorde3", 0), newRec = G.score > rec; if (newRec) store.set("recorde3", G.score);
    const finalId = feiraRestaurada() ? "feira" : G.agromax ? "agromax" : "aberto";
    const finalTxt = { feira: "🏛️ Feira restaurada", agromax: "🏢 Contrato AgroMax", aberto: `🏗️ Feira ${G.bundlesFeitos.length}/${BUNDLES.length}` }[finalId];
    const entry = { pts: G.score, stars, final: finalTxt, data: new Date().toLocaleDateString("pt-BR"), id: Date.now() };
    const rank = [...store.get("ranking3", []), entry].sort((a, b) => b.pts - a.pts).slice(0, 5);
    store.set("ranking3", rank);
    const pos = rank.findIndex((x) => x.id === entry.id);
    const gr = grades(), pior = [...gr].sort((a, b) => a.v - b.v)[0];
    const losses = Object.entries(S.perdas).filter(([k, n]) => n > 0 && LOSS_TIPS[k]).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const TITLES = ["Aprendiz de horta", "Hortelão cuidadoso", "Guardião da horta", "Mestre da Horta Limpa"];
    const FINAIS = {
      feira: `<div class="ending good"><h3>🏛️ Final: a Feira Comunitária renasceu</h3><p>Com os seus pacotes de alimentos limpos, a vila voltou a ter feira de produtores locais. Agora os moradores sabem quem planta a comida que comem, e o Seu Jorge abriu a primeira barraca com o nome do José.</p></div>`,
      agromax: `<div class="ending bad"><h3>🏢 Final: a vila da AgroMax</h3><p>O José ganhou dinheiro com o contrato, mas o galpão da feira virou depósito de agrotóxico e a horta foi pulverizada toda segunda-feira. Na vida real, agrotóxico mal usado contamina solo, água e quem trabalha na lavoura, e o resíduo vai parar no prato.</p></div>`,
      aberto: `<div class="ending"><h3>🏗️ Final: a feira quase voltou</h3><p>A Feira Comunitária ficou com ${G.bundlesFeitos.length} de ${BUNDLES.length} pacotes. Mais um ano de horta limpa e ela reabre!</p></div>`,
    };
    app.innerHTML = `
      <section class="card narrow stack">
        <p class="eyebrow" style="text-align:center">Fim do ano na horta</p>
        <p style="text-align:center;font-size:18px">👨🏽‍🌾 <b>José:</b> “${G.comeu.length ? `Comi ${G.comeu.length} refeições da minha horta este ano. Obrigado pela ajuda!` : "Ainda não consegui comer da minha horta… vamos tentar de novo?"}”</p>
        ${FINAIS[finalId]}
        <div class="stars">${[0, 1, 2].map((i) => `<span class="${i < stars ? "" : "off"}">⭐</span>`).join("")}</div>
        <div class="final-score">${G.score} pts</div>
        ${newRec ? `<p style="text-align:center;font-family:var(--font-display);font-size:22px;color:var(--leaf-dark)">🏆 Novo recorde!</p>` : rec ? `<p class="small muted" style="text-align:center">Seu recorde: ${rec} pts</p>` : ""}
        <h2 style="text-align:center">${TITLES[stars]}</h2>
        ${stars < 3 ? `<p class="goal">🎯 Faltam <b>${LIM[stars] - G.score} pontos</b> para ${"⭐".repeat(stars + 1)}. Corrija os erros abaixo e tente de novo!</p>` : `<p class="goal">🏅 Nota máxima! Tente bater o seu recorde ou buscar o outro final.</p>`}
        <h3>📊 Suas notas</h3>
        <div class="grades">${gr.map((g) => `<div class="grade"><span class="gi">${g.icone}</span><b>${g.nome}</b><span class="stars">${"★".repeat(g.s)}<i>${"★".repeat(3 - g.s)}</i></span><div class="gbar"><span style="width:${g.v}%"></span></div></div>`).join("")}</div>
        <p class="tipbox">👉 <b>Para melhorar em ${pior.icone} ${pior.nome}:</b> ${pior.dica}</p>
        <h3>🔍 Onde você perdeu (ou deixou de ganhar) pontos</h3>
        ${losses.length ? `<div class="losses">${losses.map(([k, n]) => `<div class="loss"><div><b>${LOSS_TIPS[k][0]}</b><small>${LOSS_TIPS[k][1]}</small></div><span>−${n}</span></div>`).join("")}</div>` : `<p>Nenhum ponto perdido. Parabéns! 🎉</p>`}
        <div class="row" style="justify-content:center"><button class="btn green big" id="again">🔁 Jogar outro ano</button></div>
        ${rankHTML(pos)}
        <details><summary>Números do ano</summary><div class="statgrid" style="margin-top:8px">
          <div><b>${S.saudaveis}</b>alimentos saudáveis</div><div><b>${S.irregulares}</b>irregulares</div>
          <div><b>${S.alternativas}</b>usos de alternativas</div><div><b>${S.agro}</b>usos de agrotóxico</div>
          <div><b>${S.lavouCerto}/${S.lavouTotal}</b>lavagens certas</div><div><b>${G.comeu.length}</b>refeições da horta</div>
          <div><b>${S.ovos}</b>ovos</div><div><b>${S.conservas}</b>conservas</div>
          <div><b>🪙${G.coins}</b>moedas</div><div><b>${G.pedidosOk}</b>pedidos entregues</div>
          <div><b>${G.festivais.length}/4</b>concursos vencidos</div><div><b>${G.bundlesFeitos.length}/${BUNDLES.length}</b>pacotes da feira</div>
        </div></details>
        <h3>❤️ Vizinhos</h3>
        <div class="stack" style="gap:6px">${NPCS.map((n) => `<div class="xrow"><div class="i"><img class="mini" src="${retrato(n.id)}" alt=""></div><div><b>${n.nome}</b> ${coracoesHTML(n.id)}<div class="small">${n.papel}</div></div><div></div></div>`).join("")}</div>
        <h3>🏆 Conquistas (${G.conquistas.size}/${ACHIEVEMENTS.length})</h3>
        <div class="ach">${ACHIEVEMENTS.map((a) => `<div class="${G.conquistas.has(a.id) ? "on" : ""}"><span>${a.icone}</span><b>${a.nome}</b><small>${a.desc}</small></div>`).join("")}</div>
        <p>${S.irregulares ? `Seus alimentos irregulares vieram de <b>carência não respeitada</b> ou <b>produto não registrado para a planta</b>, os mesmos problemas que a Anvisa encontra: em 2024, 12,2% das amostras tinham agrotóxico que nem podia ser usado naquele alimento.` : `Nenhum alimento irregular! No mercado, porém, cerca de <b>2 de cada 10</b> amostras que a Anvisa testou em 2024 estavam irregulares.`}</p>
        <p class="small muted">Agrotóxico não tem cor, cheiro nem sabor. Quem compra só confia em quem produz e em quem fiscaliza. Por isso vale conhecer o produtor, comprar alimento da época e cobrar informação no mercado.</p>
        <h3>E agora, o que você vai fazer?</h3>
        <div class="stack" style="gap:8px" id="commits">${COMMITMENTS.map((c, i) => `<label class="commit"><input type="checkbox" id="c${i}" value="${i}"><span>${c}</span></label>`).join("")}</div>
        <div class="share" id="share" hidden></div>
        <div class="row"><button class="btn green" id="card">Gerar meu cartão</button><button class="btn ghost" id="menu">Menu inicial</button></div>
        <details><summary>Todos os pontos do ano</summary><div class="small" style="margin-top:8px">${S.log.map((l) => `<div style="display:flex;justify-content:space-between;border-bottom:1px dashed var(--line);padding:3px 0"><span>${esc(l.label)}</span><b style="color:${l.n < 0 ? "var(--bad)" : "var(--good)"}">${l.n > 0 ? "+" : ""}${l.n}</b></div>`).join("")}</div></details>
        <details><summary>Fontes dos dados</summary><ol class="sources">${FONTES.map((f) => `<li>${esc(f)}</li>`).join("")}</ol></details>
      </section>
      <footer class="credit">Horta Limpa · Centro Universitário Braz Cubas · Mogi das Cruzes</footer>`;
    const boxes = [...app.querySelectorAll("#commits input")];
    $("#card").onclick = () => {
      const ch = boxes.filter((b) => b.checked).map((b) => COMMITMENTS[+b.value]);
      if (!ch.length) { toast("Escolha pelo menos um compromisso.", null, ""); return; }
      const sh = $("#share");
      const text = `Joguei Horta Limpa e fiz ${G.score} pontos (${TITLES[stars]}, ${finalTxt}). Meus compromissos:\n- ${ch.join("\n- ")}\nAgrotóxico não tem cor, cheiro nem sabor. Jogue também!`;
      sh.innerHTML = `<p class="eyebrow" style="color:#fff">Meu compromisso · Horta Limpa</p><h3>${TITLES[stars]} · ${G.score} pts</h3><ul>${ch.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <div><button class="btn" id="copy" style="background:#fff;color:var(--leaf-dark);box-shadow:0 5px 0 #cfe5c8">Copiar texto</button></div>`;
      sh.hidden = false; sh.scrollIntoView({ behavior: "smooth", block: "center" });
      $("#copy").onclick = async () => {
        const link = location.href.startsWith("http") ? "\n" + location.href.split("#")[0] : "";
        try { await navigator.clipboard.writeText(text + link); toast("Texto copiado!", null, "good"); } catch { toast("Não deu para copiar. Tire um print do cartão!", null, ""); }
      };
    };
    $("#again").onclick = () => startGame(false);
    $("#menu").onclick = screenCover;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (/debug/.test(location.search)) window.__G = () => G;   // só para testes automáticos
  screenCover();
})();
