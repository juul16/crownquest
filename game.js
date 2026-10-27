```javascript
"use strict";

/* =====================================================
   CROWN QUEST — GAME.JS
   Runner game with 10 worlds and boss battles.
   Requires app.js and <canvas id="game">.
   ===================================================== */

(() => {
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

  let canvas;
  let ctx;
  let player;
  let obstacles = [];
  let coins = [];
  let powerups = [];

  let running = false;
  let finished = false;
  let gameOver = false;
  let raf = 0;
  let lastFrame = 0;
  let scroll = 0;
  let elapsed = 0;
  let runCoins = 0;
  let bossHP = 3;
  let bossMaxHP = 3;
  let bossCooldown = 0;
  let activeLevel = 1;
  let activeBoss = false;
  let deathTimer = 0;
  let messageTimer = 0;
  let temporaryMessage = "";

  const floor = 326;
  const WIDTH = 960;
  const HEIGHT = 380;
  const SHOWCASE_KEY = "crownQuestShowcase";
  const DEATH_DURATION = 55;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function roundRect(x, y, w, h, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();

    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, radius);
    } else {
      ctx.rect(x, y, w, h);
    }

    ctx.fill();
  }

  function currentState() {
    return typeof gameState !== "undefined" ? gameState : null;
  }

  function worldNumber() {
    return typeof getWorldNumber === "function"
      ? getWorldNumber(activeLevel)
      : Math.floor((activeLevel - 1) / 21) + 1;
  }

  function localLevel() {
    return typeof getLevelInWorld === "function"
      ? getLevelInWorld(activeLevel)
      : ((activeLevel - 1) % 21) + 1;
  }

  function isBossLevel() {
    return localLevel() === 21;
  }

  function worldPalette() {
    return palettes[(worldNumber() - 1) % palettes.length];
  }

  function setStatus(message) {
    const element = document.getElementById("gameStatus");
    if (element) element.textContent = message;
  }

  function showMessage(message, duration = 1800) {
    temporaryMessage = message;
    messageTimer = duration;
    setStatus(message);
  }

  function getSelectedPet() {
    const state = currentState();

    if (!state || !Array.isArray(state.pets) || !state.pets.length) {
      return {
        id: "starter-fox",
        name: "Forest Fox",
        emoji: "🦊",
        rarity: "common"
      };
    }

    let selectedId = null;

    try {
      selectedId = localStorage.getItem(SHOWCASE_KEY);
    } catch (_) {}

    // New format: store the selected pet ID.
    let pet = state.pets.find(item => item.id === selectedId);

    // Backwards compatibility with the old emoji-based selection.
    if (!pet && selectedId) {
      pet = state.pets.find(item => item.emoji === selectedId);
    }

    return pet || state.pets[0];
  }

  function resetPlayer() {
    const pet = getSelectedPet();

    player = {
      x: 100,
      y: floor - 42,
      w: 34,
      h: 42,
      vy: 0,
      ground: true,
      sliding: false,
      dash: 0,
      shield: 0,
      invulnerable: 0,
      dead: false,
      deathFrame: 0,
      pet
    };
  }

  function buildLevel() {
    obstacles = [];
    coins = [];
    powerups = [];

    scroll = 0;
    elapsed = 0;
    runCoins = 0;
    bossHP = 3;
    bossMaxHP = 3;
    bossCooldown = 0;

    activeLevel = currentState()?.currentLevel || 1;
    activeBoss = isBossLevel();

    let x = 430;

    const obstacleCount = activeBoss
      ? 4
      : 9 + Math.min(10, localLevel());

    for (let i = 0; i < obstacleCount; i++) {
      x += rand(180, 270);

      const roll = Math.random();
      let kind;

      if (roll < 0.30) {
        kind = "low";
      } else if (roll < 0.55) {
        kind = "special";
      } else if (roll < 0.77) {
        kind = "tall";
      } else {
        kind = "spike";
      }

      obstacles.push({
        x,
        w: kind === "special" ? 42 : rand(28, 42),
        h: kind === "low" ? 24 : kind === "special" ? 48 : rand(32, 65),
        kind,
        hit: false
      });

      if (Math.random() < 0.85) {
        for (let c = 0; c < 3; c++) {
          coins.push({
            x: x - 100 + c * 25,
            y: rand(190, 260),
            taken: false
          });
        }
      }

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

      // Exactly one boss obstacle.
      obstacles.push({
        x,
        w: 100,
        h: 130,
        kind: "boss",
        hit: false
      });

      for (let i = 0; i < 5; i++) {
        coins.push({
          x: x - 190 + i * 32,
          y: 235,
          taken: false
        });
      }
    }
  }

  function startLevel() {
    if (!canvas || !ctx) return;

    cancelAnimationFrame(raf);

    running = false;
    finished = false;
    gameOver = false;
    deathTimer = 0;
    lastFrame = 0;

    resetPlayer();
    buildLevel();

    running = true;

    if (activeBoss) {
      const info = typeof getBossInfo === "function"
        ? getBossInfo(activeLevel)
        : { name: "World Boss" };

      setStatus(
        "Boss Battle: " + info.name +
        "! Use Shift or Dash to attack."
      );
    } else {
      setStatus("Collect Crowns, avoid obstacles, and reach the finish!");
    }

    draw();
    raf = requestAnimationFrame(tick);
  }

  function jump() {
    if (!running) {
      if (gameOver || finished) startLevel();
      return;
    }

    if (player.ground && !player.dead) {
      player.vy = -14;
      player.ground = false;
      player.sliding = false;
    }
  }

  function slide() {
    if (!running || !player.ground || player.dead) return;

    player.sliding = true;
    player.slideTimer = 38;
  }

  function dash() {
    if (!running || player.dead) {
      if (gameOver || finished) startLevel();
      return;
    }

    player.dash = 22;
  }

  function move(direction) {
    if (!running || player.dead) {
      if (gameOver || finished) startLevel();
      return;
    }

    player.x = clamp(player.x + direction * 22, 25, 280);
  }

  function drawBackground() {
    const palette = worldPalette();
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);

    gradient.addColorStop(0, palette[0]);
    gradient.addColorStop(1, palette[1]);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    for (let i = 0; i < 7; i++) {
      const x = ((i * 190 - scroll * 0.2) % 1250 + 1250) % 1250 - 120;

      ctx.fillStyle = i % 2 ? palette[1] : palette[2];
      ctx.beginPath();
      ctx.ellipse(x, 280, 150, 95, 0, Math.PI, 0);
      ctx.fill();
    }

    for (let i = 0; i < 45; i++) {
      let x = (i * 83 - scroll * 0.35) % WIDTH;
      if (x < 0) x += WIDTH;

      ctx.fillStyle = i % 3 === 0 ? "#fff1a0" : "#d7ffe0";
      ctx.globalAlpha = i % 3 === 0 ? 0.9 : 0.35;
      ctx.fillRect(x, (i * 47) % 270 + 20, 3, 3);
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = palette[2];
    ctx.fillRect(0, floor, WIDTH, HEIGHT - floor);

    ctx.fillStyle = "#ffffff24";

    for (let i = 0; i < 25; i++) {
      let x = (i * 53 - scroll * 0.6) % WIDTH;
      if (x < 0) x += WIDTH;
      ctx.fillRect(x, floor + 18, 20, 3);
    }
  }

  function drawHero() {
    const pet = player.pet || getSelectedPet();
    const x = player.x;
    let y = player.y;

    if (player.dead) {
      // Simple animated knockback and fade.
      y -= Math.sin(player.deathFrame * 0.12) * 8;
    }

    const height = player.sliding && !player.dead ? 25 : player.h;

    ctx.save();
    ctx.globalAlpha = player.invulnerable > 0
      ? (Math.floor(player.invulnerable / 5) % 2 ? 0.4 : 1)
      : 1;

    ctx.translate(x + 17, y + height / 2);

    if (player.dead) {
      ctx.rotate(Math.min(1.3, player.deathFrame * 0.035));
    }

    // Shadow.
    ctx.fillStyle = "#183b2b";
    ctx.beginPath();
    ctx.ellipse(0, height / 2 - 1, 19, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Character body.
    roundRect(-13, -height / 2 + 10, 26, height - 12, 9, "#4eaf67");

    // Selected character emoji.
    ctx.font = player.sliding ? "25px sans-serif" : "32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(pet.emoji || "🦊", 0, player.sliding ? 0 : -3);

    // Dash effect.
    if (player.dash > 0) {
      ctx.globalAlpha = 0.6;
      roundRect(-47, -3, 25, 7, 4, "#ffe082");
      roundRect(-60, 6, 30, 5, 3, "#fff0ae");
    }

    if (player.shield > 0) {
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = "#65d9f4";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 29, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawCoins() {
    for (const coin of coins) {
      if (coin.taken) continue;

      const x = coin.x - scroll;
      if (x < -20 || x > WIDTH + 20) continue;

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
    for (const item of powerups) {
      if (item.taken) continue;

      const x = item.x - scroll;
      if (x < -30 || x > WIDTH + 30) continue;

      roundRect(
        x - 10,
        item.y - 10,
        20,
        20,
        5,
        item.kind === "shield" ? "#65d9f4" : "#ffcf5c"
      );

      ctx.fillStyle = "#183026";
      ctx.font = "bold 13px system-ui";
      ctx.fillText(item.kind === "shield" ? "S" : "+", x - 4, item.y + 5);
    }
  }

  function drawBoss(obstacle, x) {
    const y = floor - obstacle.h;

    roundRect(x, y, obstacle.w, obstacle.h, 15, "#633a80");

    ctx.fillStyle = "#c58cff";
    ctx.beginPath();
    ctx.arc(x + obstacle.w / 2, y + 30, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#25172e";
    ctx.fillRect(x + obstacle.w / 2 - 13, y + 25, 7, 8);
    ctx.fillRect(x + obstacle.w / 2 + 6, y + 25, 7, 8);

    ctx.fillStyle = "#fff";
    ctx.fillRect(x + obstacle.w / 2 - 10, y + 43, 20, 5);

    // Boss HP bar.
    roundRect(x - 5, y - 18, obstacle.w + 10, 10, 4, "#27152e");

    const ratio = Math.max(0, bossHP / bossMaxHP);

    if (ratio > 0) {
      roundRect(
        x - 3,
        y - 16,
        (obstacle.w + 6) * ratio,
        6,
        3,
        "#ff637d"
      );
    }

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
      if (obstacle.hit) continue;

      const x = obstacle.x - scroll;
      if (x < -130 || x > WIDTH + 130) continue;

      if (obstacle.kind === "boss") {
        drawBoss(obstacle, x);
        continue;
      }

      if (obstacle.kind === "low") {
        // Low overhead barrier: slide underneath.
        roundRect(x, floor - obstacle.h, obstacle.w, obstacle.h, 5, "#477f9b");
        ctx.fillStyle = "#a9efff";
        ctx.fillRect(x + 4, floor - obstacle.h + 5, obstacle.w - 8, 4);
      } else if (obstacle.kind === "special") {
        // Dash-only breakable obstacle.
        roundRect(x, floor - obstacle.h, obstacle.w, obstacle.h, 6, "#a44bba");
        ctx.fillStyle = "#f3b4ff";
        ctx.fillRect(x + 8, floor - obstacle.h + 8, 6, obstacle.h - 16);
        ctx.fillRect(x + obstacle.w - 14, floor - obstacle.h + 8, 6, obstacle.h - 16);
      } else if (obstacle.kind === "tall") {
        roundRect(x, floor - obstacle.h, obstacle.w, obstacle.h, 5, "#7c4f35");
        ctx.fillStyle = "#bd8b58";
        ctx.fillRect(x + 5, floor - obstacle.h + 7, 5, obstacle.h - 10);
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

  function finishWorldPosition() {
    const last = obstacles[obstacles.length - 1];
    return (last ? last.x : 1500) + 350;
  }

  function drawFinish() {
    if (activeBoss) return;

    const x = finishWorldPosition() - scroll;

    ctx.fillStyle = "#ffd166";
    ctx.fillRect(x, floor - 90, 7, 90);
    ctx.fillRect(x + 42, floor - 90, 7, 90);
    ctx.fillRect(x, floor - 90, 49, 7);

    ctx.fillStyle = "#fff4d1";
    ctx.fillRect(x + 7, floor - 82, 35, 20);

    ctx.fillStyle = "#203027";
    ctx.font = "bold 10px system-ui";
    ctx.fillText("FINISH", x + 9, floor - 69);
  }

  function drawHUD() {
    roundRect(12, 12, 310, 38, 8, "#0b211b");

    ctx.fillStyle = "#fff";
    ctx.font = "bold 15px system-ui";
    ctx.fillText(
      `WORLD ${worldNumber()} · LEVEL ${localLevel()}`,
      24,
      36
    );

    const totalCoins = (currentState()?.coins || 0) + runCoins;
    ctx.fillStyle = "#ffd166";
    ctx.fillText("◆ " + totalCoins, 245, 36);

    if (activeBoss) {
      roundRect(690, 15, 250, 35, 8, "#27152e");

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
    roundRect(WIDTH / 2 - 220, 112, 440, 100, 12, "#10251e");

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 25px system-ui";
    ctx.fillText(title, WIDTH / 2, 151);

    ctx.font = "15px system-ui";
    ctx.fillText(subtitle, WIDTH / 2, 181);
    ctx.textAlign = "left";
  }

  function draw() {
    if (!ctx) return;

    drawBackground();
    drawCoins();
    drawPowerups();
    drawObstacles();
    drawFinish();

    if (player) drawHero();

    drawHUD();

    if (!running && !finished && !gameOver) {
      drawOverlay("READY, ADVENTURER?", "Press Start / Retry to begin");
    }

    if (finished) {
      drawOverlay(
        activeBoss ? "BOSS DEFEATED!" : "STAGE CLEARED!",
        "Victory! Press Start / Retry for another run."
      );
    }

    if (gameOver) {
      drawOverlay("GAME OVER", "Press Start / Retry to try again.");
    }
  }

  function completeLevelRun() {
    if (finished || gameOver) return;

    finished = true;
    running = false;
    cancelAnimationFrame(raf);

    const level = activeLevel;
    const bonus = 35 + localLevel() * 7;

    // app.js gives 50 Crowns and 100 XP on first completion.
    // Only add collected coins and the level bonus here.
    if (typeof window.completeLevel === "function") {
      window.completeLevel(level, runCoins + bonus);
    } else {
      const state = currentState();

      if (state) {
        const alreadyDone = state.completed.includes(level);

        state.coins += runCoins + bonus + (alreadyDone ? 0 : 50);

        if (!alreadyDone) {
          state.completed.push(level);
          state.wins++;
          state.xp += 100;
        }

        state.unlocked = Math.max(state.unlocked, level + 1);
        state.currentLevel = Math.min(state.unlocked, level + 1);

        if (typeof window.saveState === "function") window.saveState();
      }
    }

    setStatus(
      activeBoss
        ? "Boss defeated! The next stage is unlocked!"
        : "Stage cleared! +" + (runCoins + bonus) + " bonus Crowns."
    );

    draw();
  }

  function triggerGameOver() {
    if (!running || gameOver || finished) return;

    running = false;
    gameOver = true;
    player.dead = true;
    player.deathFrame = 0;
    deathTimer = DEATH_DURATION;

    cancelAnimationFrame(raf);
    setStatus("Game Over! Press Start / Retry to try again.");

    raf = requestAnimationFrame(deathAnimation);
  }

  function deathAnimation(timestamp) {
    if (!player || !player.dead) return;

    player.deathFrame++;
    draw();

    if (player.deathFrame < deathTimer) {
      raf = requestAnimationFrame(deathAnimation);
    }
  }

  function hitObstacle(obstacle) {
    if (obstacle.kind === "boss") {
      if (player.dash > 0 && bossCooldown <= 0) {
        bossHP = Math.max(0, bossHP - 1);
        bossCooldown = 45;
        player.dash = 0;
        player.invulnerable = 20;

        if (bossHP <= 0) {
          completeLevelRun();
          return "complete";
        }

        showMessage("Boss hit! " + bossHP + " HP remaining.");
        return "continue";
      }

      if (player.shield > 0) {
        player.shield = 0;
        player.invulnerable = 25;
        showMessage("Your shield blocked the boss attack!");
        return "continue";
      }

      triggerGameOver();
      return "stop";
    }

    if (obstacle.kind === "low") {
      // Sliding safely avoids overhead obstacles.
      if (player.sliding) return "continue";
    }

    if (obstacle.kind === "special") {
      if (player.dash > 0) {
        obstacle.hit = true;
        runCoins += 5;
        showMessage("Special obstacle smashed! +5 bonus Crowns.");
        return "continue";
      }

      if (player.shield > 0) {
        player.shield = 0;
        obstacle.hit = true;
        return "continue";
      }

      triggerGameOver();
      return "stop";
    }

    if (player.dash > 0) {
      obstacle.hit = true;
      runCoins += 2;
      return "continue";
    }

    if (player.shield > 0) {
      player.shield = 0;
      obstacle.hit = true;
      showMessage("Your shield protected you!");
      return "continue";
    }

    triggerGameOver();
    return "stop";
  }

  function overlaps(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function tick(timestamp) {
    if (!running) return;

    if (!lastFrame) lastFrame = timestamp;

    const delta = Math.min((timestamp - lastFrame) / 16.67, 2);
    lastFrame = timestamp;
    elapsed += delta;

    if (bossCooldown > 0) bossCooldown -= delta;
    if (player.dash > 0) player.dash = Math.max(0, player.dash - delta);
    if (player.shield > 0) player.shield = Math.max(0, player.shield - delta);
    if (player.invulnerable > 0) player.invulnerable -= delta;

    if (player.slideTimer > 0) {
      player.slideTimer -= delta;

      if (player.slideTimer <= 0) player.sliding = false;
    }

    player.vy += 0.62 * delta;
    player.y += player.vy * delta;

    if (player.y + player.h >= floor) {
      player.y = floor - player.h;
      player.vy = 0;
      player.ground = true;
    } else {
      player.ground = false;
    }

    const speed = 3 + localLevel() * 0.12;
    scroll += (player.dash > 0 ? speed + 4 : speed) * delta;

    const playerBox = {
      x: player.x + 5,
      y: player.y + (player.sliding ? 16 : 0),
      w: player.w - 10,
      h: player.sliding ? 25 : player.h
    };

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

    for (const item of powerups) {
      if (item.taken) continue;

      const x = item.x - scroll;

      if (
        Math.abs(x - (player.x + 17)) < 23 &&
        Math.abs(item.y - (player.y + 20)) < 35
      ) {
        item.taken = true;

        if (item.kind === "crown") {
          runCoins += 30;
          showMessage("Crown collected! +30 bonus Crowns.");
        } else {
          player.shield = 300;
          showMessage("Shield activated!");
        }
      }
    }

    for (const obstacle of obstacles) {
      if (obstacle.hit) continue;

      const x = obstacle.x - scroll;

      if (x < -150 || x > WIDTH + 100) continue;

      const obstacleBox = {
        x,
        y: floor - obstacle.h,
        w: obstacle.w,
        h: obstacle.h
      };

      if (overlaps(playerBox, obstacleBox)) {
        const result = hitObstacle(obstacle);

        if (result === "stop" || result === "complete") return;
      }
    }

    if (!activeBoss && scroll >= finishWorldPosition()) {
      completeLevelRun();
      return;
    }

    if (messageTimer > 0) {
      messageTimer -= delta;

      if (messageTimer <= 0) {
        temporaryMessage = "";

        if (running) {
          setStatus(activeBoss
            ? "Use Dash to attack the boss!"
            : "Collect Crowns and reach the finish!");
        }
      }
    }

    draw();
    raf = requestAnimationFrame(tick);
  }

  function onKeyDown(event) {
    if (!canvas || !document.getElementById("game")) return;

    const key = event.key;
    const controls = [
      "ArrowLeft", "ArrowRight", "ArrowUp",
      "ArrowDown", " ", "Shift"
    ];

    if (controls.includes(key)) event.preventDefault();

    if (
      event.repeat &&
      ["ArrowUp", "ArrowDown", " ", "Shift"].includes(key)
    ) {
      return;
    }

    if (key === "ArrowLeft") move(-1);
    if (key === "ArrowRight") move(1);
    if (key === "ArrowUp" || key === " ") jump();
    if (key === "ArrowDown") slide();
    if (key === "Shift") dash();
  }

  function initGame() {
    canvas = document.getElementById("game");
    if (!canvas) return;

    ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (window.crownQuestGame?.canvas === canvas) {
      startLevel();
      return;
    }

    // Remove the previous game keyboard handler if present.
    if (window.crownQuestGame?.onKeyDown) {
      window.removeEventListener(
        "keydown",
        window.crownQuestGame.onKeyDown
      );
    }

    window.addEventListener("keydown", onKeyDown);

    window.crownQuestGame = {
      canvas,
      onKeyDown,
      startLevel
    };

    window.startLevel = startLevel;
    window.doJump = jump;
    window.doSlide = slide;
    window.doDash = dash;
    window.walk = move;

    resetPlayer();
    buildLevel();
    draw();
  }

  // app.js expects initGame to exist before DOMContentLoaded.
  window.initGame = initGame;
})();
