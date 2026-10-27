function initGame() {
  const canvas = document.getElementById("game");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  let player = {
    x: 100, y: 284, w: 34, h: 42,
    vy: 0, ground: true, sliding: false, dash: 0
  };

  let obstacles = [];
  let coins = [];
  let powerups = [];
  let scroll = 0;
  let running = false;
  let finished = false;
  let raf = 0;
  let runCoins = 0;
  let bossHP = 3;
  let slideTimer;

  const floor = 326;

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

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function rounded(x, y, w, h, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
  }

  function build() {
    obstacles = [];
    coins = [];
    powerups = [];
    scroll = 0;
    runCoins = 0;
    bossHP = 3;

    let x = 430;
    const bossLevel = isBossLevel(gameState.currentLevel);
    const count = bossLevel
      ? 5
      : 9 + Math.min(10, getLevelInWorld(gameState.currentLevel));

    for (let i = 0; i < count; i++) {
      x += rand(180, 270);

      obstacles.push({
        x,
        w: bossLevel ? rand(34, 52) : rand(25, 40),
        h: rand(27, 65),
        kind: bossLevel && i === count - 1
          ? "boss"
          : Math.random() < 0.25 ? "tall" : "spike"
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

      if (Math.random() < 0.18) {
        powerups.push({
          x: x - 65,
          y: rand(210, 270),
          taken: false,
          kind: Math.random() < 0.5 ? "shield" : "crown"
        });
      }
    }

    if (bossLevel) {
      obstacles.push({
        x: x + 180,
        w: 110,
        h: 125,
        kind: "boss"
      });
    }
  }

  function startLevel() {
    cancelAnimationFrame(raf);

    player = {
      x: 100, y: floor - 42, w: 34, h: 42,
      vy: 0, ground: true, sliding: false, dash: 0
    };

    clearTimeout(slideTimer);
    finished = false;
    running = true;
    build();

    const status = document.getElementById("gameStatus");
    if (status) {
      status.textContent = isBossLevel(gameState.currentLevel)
        ? "Boss battle! Dodge and strike!"
        : "Collect coins and reach the finish!";
    }

    draw();
    raf = requestAnimationFrame(tick);
  }

  function jump() {
    if (!running) {
      startLevel();
      return;
    }

    if (player.ground) {
      player.vy = -14;
      player.ground = false;
      player.sliding = false;
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
        player.sliding = false;
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

    player.x = Math.max(25, Math.min(280, player.x + direction * 22));
  }

  window.startLevel = startLevel;
  window.doJump = jump;
  window.doSlide = slide;
  window.doDash = dash;
  window.walk = move;
  window.initGame = initGame;

  window.addEventListener("keydown", event => {
    if (!document.getElementById("game")) return;

    if (["ArrowLeft", "ArrowRight", "ArrowUp", " ", "ArrowDown", "Shift"].includes(event.key)) {
      event.preventDefault();
    }

    if (event.key === "ArrowLeft") move(-1);
    if (event.key === "ArrowRight") move(1);
    if (event.key === "ArrowUp" || event.key === " ") jump();
    if (event.key === "ArrowDown") slide();
    if (event.key === "Shift") dash();
  });

  function drawHero() {
    const x = player.x;
    const y = player.y + (player.sliding ? 16 : 0);
    const h = player.sliding ? 25 : player.h;

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = "#183b2b";
    ctx.beginPath();
    ctx.ellipse(17, h - 2, 19, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    rounded(5, 12, 25, h - 15, 9, "#4eaf67");

    ctx.fillStyle = "#267849";
    ctx.beginPath();
    ctx.ellipse(17, 23, 15, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#d4b77b";
    ctx.beginPath();
    ctx.ellipse(17, 20, 12, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    rounded(3, 8, 28, 10, 4, "#c63d52");

    ctx.fillStyle = "#f3f0db";
    ctx.fillRect(7, 11, 7, 3);
    ctx.fillRect(20, 11, 7, 3);

    ctx.fillStyle = "#14221b";
    ctx.beginPath();
    ctx.ellipse(12, 19, 2.5, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(22, 19, 2.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f0c65d";
    ctx.fillRect(6, h - 5, 10, 5);
    ctx.fillRect(20, h - 5, 10, 5);

    ctx.strokeStyle = "#bde9b5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, 30);
    ctx.lineTo(24, 30);
    ctx.stroke();

    ctx.restore();
  }

  function draw() {
    const w = canvas.width;
    const h = canvas.height;
    const worldNumber = getWorldNumber(gameState.currentLevel);
    const palette = palettes[(worldNumber - 1) % palettes.length];

    const background = ctx.createLinearGradient(0, 0, 0, h);
    background.addColorStop(0, palette[0]);
    background.addColorStop(1, palette[1]);

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 7; i++) {
      const x = ((i * 190 - scroll * 0.2) % 1250 + 1250) % 1250 - 120;
      ctx.fillStyle = i % 2 ? palette[1] : palette[2];
      ctx.beginPath();
      ctx.ellipse(x, 280, 150, 95, 0, Math.PI, 0);
      ctx.fill();
    }

    for (let i = 0; i < 45; i++) {
      let x = (i * 83 - scroll * 0.35) % w;
      if (x < 0) x += w;

      ctx.fillStyle = i % 3 === 0 ? "#fff1a0" : "#d7ffe0";
      ctx.globalAlpha = i % 3 === 0 ? 0.9 : 0.35;
      ctx.fillRect(x, (i * 47) % 270 + 20, 3, 3);
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = palette[2];
    ctx.fillRect(0, floor, w, h - floor);

    ctx.fillStyle = "#ffffff24";
    for (let i = 0; i < 25; i++) {
      let x = (i * 53 - scroll * 0.6) % w;
      if (x < 0) x += w;
      ctx.fillRect(x, floor + 18, 20, 3);
    }

    for (const coin of coins) {
      if (coin.taken) continue;
      const x = coin.x - scroll;
      if (x < -20 || x > w + 20) continue;

      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(x, coin.y, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#fff1a8";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    for (const powerup of powerups) {
      if (powerup.taken) continue;
      const x = powerup.x - scroll;
      if (x < -30 || x > w + 30) continue;

      rounded(
        x - 10, powerup.y - 10, 20, 20, 5,
        powerup.kind === "shield" ? "#65d9f4" : "#ffcf5c"
      );

      ctx.fillStyle = "#183026";
      ctx.font = "bold 13px system-ui";
      ctx.fillText(powerup.kind === "shield" ? "S" : "+", x - 4, powerup.y + 5);
    }

    for (const obstacle of obstacles) {
      const x = obstacle.x - scroll;
      if (x < -130 || x > w + 130) continue;

      if (obstacle.kind === "boss") {
        rounded(x, floor - obstacle.h, obstacle.w, obstacle.h, 15, "#633a80");

        ctx.fillStyle = "#c58cff";
        ctx.beginPath();
        ctx.arc(x + obstacle.w / 2, floor - obstacle.h + 30, 24, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#25172e";
        ctx.fillRect(x + obstacle.w / 2 - 13, floor - obstacle.h + 25, 7, 8);
        ctx.fillRect(x + obstacle.w / 2 + 6, floor - obstacle.h + 25, 7, 8);

        ctx.fillStyle = "#fff";
        ctx.fillRect(x + obstacle.w / 2 - 10, floor - obstacle.h + 43, 20, 5);

        ctx.fillStyle = "#ff7c90";
        ctx.fillRect(x, floor - obstacle.h - 12, obstacle.w, 6);

        ctx.fillStyle = "#7df0a1";
        ctx.fillRect(x, floor - obstacle.h - 12, obstacle.w * (bossHP / 3), 6);
      } else if (obstacle.kind === "tall") {
        rounded(x, floor - obstacle.h, obstacle.w, obstacle.h, 5, "#7c4f35");
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

    const finish = (obstacles.at(-1)?.x || 1500) + 350 - scroll;
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(finish, floor - 90, 7, 90);
    ctx.fillRect(finish + 42, floor - 90, 7, 90);
    ctx.fillRect(finish, floor - 90, 49, 7);

    ctx.fillStyle = "#fff4d1";
    ctx.fillRect(finish + 7, floor - 82, 35, 20);

    ctx.fillStyle = "#203027";
    ctx.font = "bold 10px system-ui";
    ctx.fillText("FINISH", finish + 9, floor - 69);

    drawHero();

    rounded(12, 12, 300, 38, 8, "#0b211b");
    ctx.fillStyle = "#fff";
    ctx.font = "bold 15px system-ui";
    ctx.fillText(
      `WORLD ${getWorldNumber(gameState.currentLevel)} · LEVEL ${getLevelInWorld(gameState.currentLevel)}`,
      24, 36
    );

    ctx.fillStyle = "#ffd166";
    ctx.fillText("◆ " + (gameState.coins + runCoins), 245, 36);

    if (isBossLevel(gameState.currentLevel)) {
      rounded(720, 15, 220, 33, 8, "#27152e");
      ctx.fillStyle = "#fff";
      ctx.fillText("BOSS HP: " + "♥ ".repeat(Math.max(0, bossHP)), 733, 37);
    }

    if (!running && !finished) {
      rounded(270, 115, 420, 90, 12, "#10251e");
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "bold 25px system-ui";
      ctx.fillText(
        isBossLevel(gameState.currentLevel) ? "BOSS BATTLE" : "READY, ADVENTURER?",
        480, 151
      );
      ctx.font = "15px system-ui";
      ctx.fillText("Press Start / Retry to begin", 480, 179);
      ctx.textAlign = "left";
    }

    if (finished) {
      rounded(330, 125, 300, 70, 12, "#10251e");
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "bold 23px system-ui";
      ctx.fillText("STAGE CLEARED!", 480, 166);
      ctx.textAlign = "left";
    }
  }

  function complete() {
    running = false;
    finished = true;

    const boss = isBossLevel(gameState.currentLevel);
    const reward = 35 + getLevelInWorld(gameState.currentLevel) * 7
      + (boss ? 250 : 0);

    const finishedLevel = gameState.currentLevel;

    if (!gameState.completed.includes(finishedLevel)) {
      gameState.completed.push(finishedLevel);
      gameState.wins++;
      gameState.xp += 40;
      gameState.coins += reward + runCoins;
    }

    gameState.unlocked = Math.max(gameState.unlocked, finishedLevel + 1);
    gameState.currentLevel = finishedLevel + 1;

    const status = document.getElementById("gameStatus");

    if (status) {
      status.textContent = `Stage cleared! +${reward + runCoins} Crowns · +40 XP`;
    }

    saveState();

    if (typeof updateLeaderboard === "function") updateLeaderboard();
    if (typeof renderPage === "function") renderPage();

    notify(boss ? "Boss defeated! New world unlocked!" : "Stage cleared!");
    draw();
  }

  function tick() {
    if (!running) return;

    player.vy += 0.62;
    player.y += player.vy;

    if (player.y + player.h >= floor) {
      player.y = floor - player.h;
      player.vy = 0;
      player.ground = true;
    }

    if (player.dash > 0) {
      player.dash--;
      scroll += 7;
    } else {
      scroll += 3 + getLevelInWorld(gameState.currentLevel) * 0.12;
    }

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
        } else {
          player.dash = 25;
        }
      }
    }

    for (const obstacle of obstacles) {
      const x = obstacle.x - scroll;
      const playerHeight = player.sliding ? 25 : player.h;
      const playerY = player.y + (player.sliding ? 16 : 0);

      if (
        x + obstacle.w > player.x + 5 &&
        x < player.x + player.w - 5 &&
        playerY + playerHeight > floor - obstacle.h + 5
      ) {
        if (obstacle.kind === "boss" && isBossLevel(gameState.currentLevel) && player.dash > 0) {
          bossHP--;
          obstacle.x = -999;

          if (bossHP <= 0) {
            complete();
            return;
          }
        } else if (player.dash === 0) {
          running = false;

          const status = document.getElementById("gameStatus");
          if (status) status.textContent = "Hit! Retry and jump, slide or dash.";

          draw();
          return;
        }
      }
    }

    if (scroll > (obstacles.at(-1)?.x || 1300) + 420) {
      complete();
      return;
    }

    draw();
    raf = requestAnimationFrame(tick);
  }

  build();
  draw();
}
