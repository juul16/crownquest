
"use strict";

/* =====================================================
   CROWN QUEST — GAME.JS
   Runner-game met 10 werelden en eindbaasgevechten.
   Werkt samen met app.js.
   ===================================================== */

function initGame() {
  const canvas = document.getElementById("game");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Voorkom dubbele game-instanties.
  if (window.crownQuestGame?.canvas === canvas) {
    window.crownQuestGame.startLevel();
    return;
  }

  const floor = 326;
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  const palettes = [
    ["#9ddf8c", "#398b54", "#1a573d"],
    ["#d1eaff", "#6da7dc", "#355e9b"],
    ["#ffc08a", "#dd6045", "#722d35"],
    ["#e7e0ff", "#9da7ef", "#635bb0"],
    ["#b6c5ff", "#656fc1", "#31315f"],
    ["#e0fbff", "#80c8e2", "#346d91"],
    ["#e4f7bc", "#a3c46a", "#557d48"],
    ["#b7fff1", "#50b8b0", "#246d77"],
    ["#e7d3ff", "#9976cc", "#4c357b"],
    ["#ffedac", "#d7a84d", "#78572c"]
  ];

  let player;
  let obstacles = [];
  let coins = [];
  let powerups = [];

  let scroll = 0;
  let running = false;
  let finished = false;
  let raf = 0;
  let runCoins = 0;
  let bossHP = 3;
  let bossMaxHP = 3;
  let bossCooldown = 0;
  let slideTimer = 0;
  let lastFrame = 0;
  let elapsed = 0;

  let activeLevel = 1;
  let activeBoss = false;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function rounded(x, y, w, h, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();

    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, radius);
    } else {
      ctx.rect(x, y, w, h);
    }

    ctx.fill();
  }

  function getLevel() {
    return typeof gameState !== "undefined"
      ? gameState.currentLevel
      : 1;
  }

  function getWorld() {
    return typeof getWorldNumber === "function"
      ? getWorldNumber(activeLevel)
      : 1;
  }

  function getLocalLevel() {
    return typeof getLevelInWorld === "function"
      ? getLevelInWorld(activeLevel)
      : ((activeLevel - 1) % 21) + 1;
  }

  function isBoss() {
    return typeof isBossLevel === "function"
      ? isBossLevel(activeLevel)
      : getLocalLevel() === 21;
  }

  function getWorldPalette() {
    return palettes[(getWorld() - 1) % palettes.length];
  }

  function setStatus(message) {
    const element = document.getElementById("gameStatus");

    if (element) {
      element.textContent = message;
    }
  }

  function resetPlayer() {
    player = {
      x: 100,
      y: floor - 42,
      w: 34,
      h: 42,
      vy: 0,
      ground: true,
      sliding: false,
      dash: 0,
      shield: 0
    };
  }

  /* ===============================================
     LEVEL OPBOUWEN
     =============================================== */

  function build() {
    obstacles = [];
    coins = [];
    powerups = [];
    scroll = 0;
    runCoins = 0;
    bossHP = 3;
    bossMaxHP = 3;
    bossCooldown = 0;
    elapsed = 0;

    activeLevel = getLevel();
    activeBoss = isBoss();

    let x = 430;

    // Eindbaaslevels hebben minder obstakels vóór de baas.
    const count = activeBoss
      ? 4
      : 9 + Math.min(10, getLocalLevel());

    for (let i = 0; i < count; i++) {
      x += rand(180, 270);

      obstacles.push({
        x,
        w: rand(25, 40),
        h: rand(27, 65),
        kind: Math.random() < 0.25 ? "tall" : "spike",
        hit: false
      });

      // Munten rond het obstakel.
      if (Math.random() < 0.85) {
        for (let c = 0; c < 3; c++) {
          coins.push({
            x: x - 100 + c * 25,
            y: rand(190, 260),
            taken: false
          });
        }
      }

      // Power-ups.
      if (Math.random() < 0.22) {
        powerups.push({
          x: x - 65,
          y: rand(210, 270),
          taken: false,
          kind: Math.random() < 0.5 ? "shield" : "crown"
        });
      }
    }

    if (activeBoss) {
      x += 300;

      obstacles.push({
        x,
        w: 100,
        h: 130,
        kind: "boss",
        hit: false
      });

      // Extra munten vóór de eindbaas.
      for (let i = 0; i < 5; i++) {
        coins.push({
          x: x - 190 + i * 32,
          y: 235,
          taken: false
        });
      }
    }
  }

  /* ===============================================
     LEVEL STARTEN
     =============================================== */

  function startLevel() {
    cancelAnimationFrame(raf);
    clearTimeout(slideTimer);

    resetPlayer();

    finished = false;
    running = true;
    lastFrame = 0;

    build();

    if (activeBoss) {
      const bossName = typeof getBossInfo === "function"
        ? getBossInfo(activeLevel).name
        : "Eindbaas";

      setStatus("👑 Eindbaasgevecht: " + bossName + "! Gebruik Shift om aan te vallen.");
    } else {
      setStatus("Verzamel munten, ontwijk obstakels en bereik de finish!");
    }

    draw();
    raf = requestAnimationFrame(tick);
  }

  /* ===============================================
     BESTURING
     =============================================== */

  function jump() {
    if (!running) {
      startLevel();
      return;
    }

    if (player.ground) {
      player.vy = -14;
      player.ground = false;
      player.sliding = false;
      clearTimeout(slideTimer);
    }
  }

  function slide() {
    if (!running) {
      startLevel();
      return;
    }

    if (player.ground) {
      player.sliding = true;

      clearTimeout(slideTimer);

      slideTimer = setTimeout(() => {
        if (player) player.sliding = false;
      }, 650);
    }
  }

  function dash() {
    if (!running) {
      startLevel();
      return;
    }

    player.dash = 22;
  }

  function move(direction) {
    if (!running) {
      startLevel();
      return;
    }

    player.x = Math.max(
      25,
      Math.min(280, player.x + direction * 22)
    );
  }

  /* ===============================================
     SPELER TEKENEN
     =============================================== */

  function drawHero() {
    const x = player.x;
    const y = player.y + (player.sliding ? 16 : 0);
    const h = player.sliding ? 25 : player.h;

    ctx.save();
    ctx.translate(x, y);

    // Schaduw.
    ctx.fillStyle = "#183b2b";
    ctx.beginPath();
    ctx.ellipse(17, h - 2, 19, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lichaam.
    rounded(5, 12, 25, h - 15, 9, "#4eaf67");

    ctx.fillStyle = "#267849";
    ctx.beginPath();
    ctx.ellipse(17, 23, 15, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    // Gezicht.
    ctx.fillStyle = "#d4b77b";
    ctx.beginPath();
    ctx.ellipse(17, 20, 12, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bandana.
    rounded(3, 8, 28, 10, 4, "#c63d52");

    ctx.fillStyle = "#f3f0db";
    ctx.fillRect(7, 11, 7, 3);
    ctx.fillRect(20, 11, 7, 3);

    ctx.fillStyle = "#14221b";
    ctx.beginPath();
    ctx.ellipse(12, 19, 2.5, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(22, 19, 2.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Voeten.
    ctx.fillStyle = "#f0c65d";
    ctx.fillRect(6, h - 5, 10, 5);
    ctx.fillRect(20, h - 5, 10, 5);

    ctx.strokeStyle = "#bde9b5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, 30);
    ctx.lineTo(24, 30);
    ctx.stroke();

    // Dash-effect.
    if (player.dash > 0) {
      ctx.globalAlpha = 0.55;
      rounded(-24, 15, 25, 8, 4, "#ffe082");
      rounded(-38, 23, 30, 6, 3, "#fff0ae");
    }

    ctx.restore();
  }

  /* ===============================================
     ACHTERGROND
     =============================================== */

  function drawBackground() {
    const palette = getWorldPalette();

    const background = ctx.createLinearGradient(
      0, 0, 0, canvasHeight
    );

    background.addColorStop(0, palette[0]);
    background.addColorStop(1, palette[1]);

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Heuvels.
    for (let i = 0; i < 7; i++) {
      const x =
        ((i * 190 - scroll * 0.2) % 1250 + 1250) % 1250 - 120;

      ctx.fillStyle = i % 2 ? palette[1] : palette[2];

      ctx.beginPath();
      ctx.ellipse(x, 280, 150, 95, 0, Math.PI, 0);
      ctx.fill();
    }

    // Lichtjes.
    for (let i = 0; i < 45; i++) {
      let x = (i * 83 - scroll * 0.35) % canvasWidth;

      if (x < 0) x += canvasWidth;

      ctx.fillStyle = i % 3 === 0 ? "#fff1a0" : "#d7ffe0";
      ctx.globalAlpha = i % 3 === 0 ? 0.9 : 0.35;

      ctx.fillRect(x, (i * 47) % 270 + 20, 3, 3);
    }

    ctx.globalAlpha = 1;

    // Grond.
    ctx.fillStyle = palette[2];
    ctx.fillRect(0, floor, canvasWidth, canvasHeight - floor);

    ctx.fillStyle = "#ffffff24";

    for (let i = 0; i < 25; i++) {
      let x = (i * 53 - scroll * 0.6) % canvasWidth;

      if (x < 0) x += canvasWidth;

      ctx.fillRect(x, floor + 18, 20, 3);
    }
  }

  /* ===============================================
     OBSTAKELS, MUNTEN EN POWER-UPS
     =============================================== */

  function drawCoins() {
    for (const coin of coins) {
      if (coin.taken) continue;

      const x = coin.x - scroll;

      if (x < -20 || x > canvasWidth + 20) continue;

      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(x, coin.y, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#fff1a8";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawPowerups() {
    for (const powerup of powerups) {
      if (powerup.taken) continue;

      const x = powerup.x - scroll;

      if (x < -30 || x > canvasWidth + 30) continue;

      rounded(
        x - 10,
        powerup.y - 10,
        20,
        20,
        5,
        powerup.kind === "shield" ? "#65d9f4" : "#ffcf5c"
      );

      ctx.fillStyle = "#183026";
      ctx.font = "bold 13px system-ui";

      ctx.fillText(
        powerup.kind === "shield" ? "S" : "+",
        x - 4,
        powerup.y + 5
      );
    }
  }

  function drawBoss(obstacle, x) {
    const y = floor - obstacle.h;

    // Lichaam van de baas.
    rounded(x, y, obstacle.w, obstacle.h, 15, "#633a80");

    // Hoofd.
    ctx.fillStyle = "#c58cff";
    ctx.beginPath();
    ctx.arc(x + obstacle.w / 2, y + 30, 24, 0, Math.PI * 2);
    ctx.fill();

    // Ogen.
    ctx.fillStyle = "#25172e";
    ctx.fillRect(x + obstacle.w / 2 - 13, y + 25, 7, 8);
    ctx.fillRect(x + obstacle.w / 2 + 6, y + 25, 7, 8);

    // Mond.
    ctx.fillStyle = "#fff";
    ctx.fillRect(x + obstacle.w / 2 - 10, y + 43, 20, 5);

    // Gezondheidsbalk.
    rounded(x - 5, y - 18, obstacle.w + 10, 10, 4, "#27152e");

    const ratio = Math.max(0, bossHP / bossMaxHP);

    rounded(
      x - 3,
      y - 16,
      (obstacle.w + 6) * ratio,
      6,
      3,
      "#ff637d"
    );

    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(
      "BOSS " + bossHP + "/" + bossMaxHP,
      x + obstacle.w / 2,
      y - 24
    );
    ctx.textAlign = "left";
  }

  function drawObstacles() {
    for (const obstacle of obstacles) {
      const x = obstacle.x - scroll;

      if (x < -130 || x > canvasWidth + 130) continue;

      if (obstacle.kind === "boss") {
        drawBoss(obstacle, x);
      } else if (obstacle.kind === "tall") {
        rounded(
          x,
          floor - obstacle.h,
          obstacle.w,
          obstacle.h,
          5,
          "#7c4f35"
        );

        ctx.fillStyle = "#bd8b58";
        ctx.fillRect(
          x + 5,
          floor - obstacle.h + 7,
          5,
          obstacle.h - 10
        );
      } else {
        ctx.fillStyle = "#d45c6b";
        ctx.beginPath();
        ctx.moveTo(x, floor);
        ctx.lineTo(x + obstacle.w / 2, floor - obstacle.h);
        ctx.lineTo(x + obstacle.w, floor);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawFinish() {
    if (activeBoss) return;

    const lastObstacle = obstacles[obstacles.length - 1];
    const finishX = (lastObstacle ? lastObstacle.x : 1500) + 350 - scroll;

    ctx.fillStyle = "#ffd166";
    ctx.fillRect(finishX, floor - 90, 7, 90);
    ctx.fillRect(finishX + 42, floor - 90, 7, 90);
    ctx.fillRect(finishX, floor - 90, 49, 7);

    ctx.fillStyle = "#fff4d1";
    ctx.fillRect(finishX + 7, floor - 82, 35, 20);

    ctx.fillStyle = "#203027";
    ctx.font = "bold 10px system-ui";
    ctx.fillText("FINISH", finishX + 9, floor - 69);
  }

  /* ===============================================
     HUD EN SCHERMEN
     =============================================== */

  function drawHUD() {
    rounded(12, 12, 310, 38, 8, "#0b211b");

    ctx.fillStyle = "#fff";
    ctx.font = "bold 15px system-ui";

    ctx.fillText(
      `WORLD ${getWorld()} · LEVEL ${getLocalLevel()}`,
      24,
      36
    );

    ctx.fillStyle = "#ffd166";
    ctx.fillText("◆ " + (gameState.coins + runCoins), 245, 36);

    if (activeBoss) {
      rounded(690, 15, 250, 35, 8, "#27152e");

      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px system-ui";

      ctx.fillText(
        "BOSS HP: " + Math.max(0, bossHP) + "/" + bossMaxHP,
        703,
        37
      );
    }
  }

  function drawOverlay(title, subtitle) {
    rounded(
      canvasWidth / 2 - 210,
      115,
      420,
      90,
      12,
      "#10251e"
    );

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 25px system-ui";
    ctx.fillText(title, canvasWidth / 2, 151);

    ctx.font = "15px system-ui";
    ctx.fillText(subtitle, canvasWidth / 2, 179);

    ctx.textAlign = "left";
  }

  function draw() {
    drawBackground();
    drawCoins();
    drawPowerups();
    drawObstacles();
    drawFinish();
    drawHero();
    drawHUD();

    if (!running && !finished) {
      drawOverlay(
        activeBoss ? "BOSS BATTLE" : "READY, ADVENTURER?",
        "Druk op Start / Retry om te beginnen"
      );
    }

    if (finished) {
      drawOverlay("STAGE CLEARED!", "Goed gedaan, avonturier!");
    }
  }

  /* ===============================================
     LEVEL WINNEN
     =============================================== */

  function complete() {
    if (finished) return;

    running = false;
    finished = true;

    cancelAnimationFrame(raf);
    clearTimeout(slideTimer);

    const finishedLevel = activeLevel;
    const bonus = 35 + getLocalLevel() * 7;

    // completeLevel in app.js geeft zelf 50 Crowns en 100 XP.
    // Geef hier alleen de aanvullende beloning door.
    if (typeof window.completeLevel === "function") {
      window.completeLevel(finishedLevel, bonus + runCoins);
    } else {
      // Fallback als app.js niet beschikbaar is.
      gameState.coins += 50 + bonus + runCoins;
      gameState.xp += 100;
      gameState.wins++;

      if (!gameState.completed.includes(finishedLevel)) {
        gameState.completed.push(finishedLevel);
      }

      gameState.unlocked = Math.max(
        gameState.unlocked,
        finishedLevel + 1
      );

      gameState.currentLevel = finishedLevel + 1;

      if (typeof window.saveState === "function") {
        window.saveState();
      }
    }

    const status = document.getElementById("gameStatus");

    if (status) {
      status.textContent = activeBoss
        ? "Eindbaas verslagen! Nieuwe voortgang vrijgespeeld!"
        : "Level voltooid! +" + (50 + bonus + runCoins) + " Crowns en +100 XP!";
    }

    draw();
  }

  /* ===============================================
     SPELER EN OBSTAKELS BIJWERKEN
     =============================================== */

  function hitObstacle(obstacle) {
    if (obstacle.kind === "boss") {
      // Alleen een actieve dash kan schade toebrengen.
      if (player.dash > 0 && bossCooldown <= 0) {
        bossHP--;
        bossCooldown = 45;
        player.dash = 0;

        // Korte terugslag na een treffer.
        player.x = Math.max(25, player.x - 12);

        if (bossHP <= 0) {
          complete();
          return true;
        }

        setStatus(
          "Raak de eindbaas opnieuw met Shift! Nog " +
          bossHP + " levens over."
        );

        return false;
      }

      // Shield voorkomt een botsing met een eindbaas.
      if (player.shield > 0) {
        player.shield = 0;
        return false;
      }

      // Botsen zonder dash stopt de poging.
      running = false;
      setStatus("De eindbaas heeft je geraakt! Probeer opnieuw.");
      draw();

      return true;
    }

    if (player.dash > 0) {
      // Een dash breekt gewone obstakels.
      obstacle.hit = true;
      obstacle.x = -9999;
      return false;
    }

    if (player.shield > 0) {
      player.shield = 0;
      obstacle.hit = true;
      obstacle.x = -9999;

      setStatus("Je schild heeft je beschermd!");
      return false;
    }

    running = false;
    setStatus("Je bent geraakt! Spring, glijd of gebruik een dash.");
    draw();

    return true;
  }

  function tick(timestamp) {
    if (!running) return;

    if (!lastFrame) lastFrame = timestamp;

    const delta = Math.min((timestamp - lastFrame) / 16.67, 2);
    lastFrame = timestamp;

    elapsed += delta;

    if (bossCooldown > 0) {
      bossCooldown -= delta;
    }

    if (player.dash > 0) {
      player.dash -= delta;

      if (player.dash < 0) player.dash = 0;
    }

    if (player.shield > 0) {
      player.shield -= delta;
    }

    // Zwaartekracht.
    player.vy += 0.62 * delta;
    player.y += player.vy * delta;

    if (player.y + player.h >= floor) {
      player.y = floor - player.h;
      player.vy = 0;
      player.ground = true;
    }

    // Wereld beweegt naar links.
    const speed = 3 + getLocalLevel() * 0.12;
    scroll += (player.dash > 0 ? speed + 4 : speed) * delta;

    // Munten verzamelen.
    for (const coin of coins) {
      if (coin.taken) continue;

      const x = coin.x - scroll;

      if (
        Math.abs(x - (player.x + 17)) < 20 &&
        Math.abs(coin.y - (player.y + 20)) < 35
      ) {
        coin.taken = true;
        runCoins += 5;
      }
    }

    // Power-ups verzamelen.
    for (const powerup of powerups) {
      if (powerup.taken) continue;

      const x = powerup.x - scroll;

      if (
        Math.abs(x - (player.x + 17)) < 23 &&
        Math.abs(powerup.y - (player.y + 20)) < 35
      ) {
        powerup.taken = true;

        if (powerup.kind === "crown") {
          runCoins += 30;
          setStatus("Kroon verzameld! +30 bonusmunten.");
        } else {
          player.shield = 300;
          setStatus("Schild geactiveerd!");
        }
      }
    }

    // Botsingen controleren.
    for (const obstacle of obstacles) {
      if (obstacle.hit) continue;

      const x = obstacle.x - scroll;

      if (x < -150 || x > canvasWidth + 100) continue;

      const playerHeight = player.sliding ? 25 : player.h;
      const playerY = player.y + (player.sliding ? 16 : 0);

      const overlapsX =
        x + obstacle.w > player.x + 5 &&
        x < player.x + player.w - 5;

      const overlapsY =
        playerY + playerHeight > floor - obstacle.h + 5;

      if (overlapsX && overlapsY) {
        const stopped = hitObstacle(obstacle);

        if (stopped || finished) return;
      }
    }

    // Finishlijn voor gewone levels.
    if (!activeBoss) {
      const lastObstacle = obstacles[obstacles.length - 1];
      const finishX = (lastObstacle ? lastObstacle.x : 1500) + 350;

      if (scroll >= finishX) {
        complete();
        return;
      }
    }

    draw();

    raf = requestAnimationFrame(tick);
  }

  /* ===============================================
     INPUT-EVENTS
     =============================================== */

  function onKeyDown(event) {
    if (!document.getElementById("game")) return;

    const key = event.key;

    if (
      ["ArrowLeft", "ArrowRight", "ArrowUp", " ", "ArrowDown", "Shift"]
        .includes(key)
    ) {
      event.preventDefault();
    }

    // Voorkom herhaald springen door ingedrukte toetsen.
    if (event.repeat && ["ArrowUp", " ", "ArrowDown", "Shift"].includes(key)) {
      return;
    }

    if (key === "ArrowLeft") move(-1);
    if (key === "ArrowRight") move(1);
    if (key === "ArrowUp" || key === " ") jump();
    if (key === "ArrowDown") slide();
    if (key === "Shift") dash();
  }

  // Verwijder de oude listener als de game opnieuw wordt gestart.
  if (window.crownQuestGame?.onKeyDown) {
    window.removeEventListener(
      "keydown",
      window.crownQuestGame.onKeyDown
    );
  }

  window.addEventListener("keydown", onKeyDown);

  /* ===============================================
     KOPPELING MET APP.JS
     =============================================== */

  window.crownQuestGame = {
    canvas,
    startLevel,
    onKeyDown
  };

  window.startLevel = startLevel;
  window.doJump = jump;
  window.doSlide = slide;
  window.doDash = dash;
  window.walk = move;

  // Zorg dat app.js initGame kan vinden.
  window.initGame = initGame;

  resetPlayer();
  build();
  draw();
}

/* BELANGRIJK:
   Deze koppeling staat BUITEN initGame.
   Daardoor kan app.js het spel bij het laden starten. */
window.initGame = initGame;

// Als game.js wordt geladen nadat de pagina al klaar is,
// initialiseer het spel alsnog.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("game")) {
      initGame();
    }
  });
} else if (document.getElementById("game")) {
  initGame();
}
