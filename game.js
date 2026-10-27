```javascript
(() => {
    const canvas = document.getElementById("game");

    // Deze gamecode wordt alleen actief op een pagina met een game-canvas.
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const player = {
        x: 70,
        y: 250,
        width: 32,
        height: 42,
        velocityY: 0,
        grounded: true,
        sliding: false,
        dashing: 0
    };

    let running = false;
    let animationId = null;
    let score = 0;
    let level = 1;

    const gravity = 0.6;
    const floorY = 310;

    let coins = [];
    let obstacles = [];
    let powerups = [];

    function resetWorld() {
        player.x = 70;
        player.y = floorY - player.height;
        player.velocityY = 0;
        player.grounded = true;
        player.sliding = false;
        player.dashing = 0;

        score = 0;

        coins = Array.from({ length: 12 }, (_, index) => ({
            x: 150 + index * 65,
            y: 215 - (index % 3) * 35,
            collected: false
        }));

        obstacles = Array.from({ length: 6 }, (_, index) => ({
            x: 260 + index * 125,
            y: floorY - 35,
            width: 30,
            height: 35
        }));

        powerups = [{
            x: 480,
            y: 190,
            collected: false,
            type: "shield"
        }];
    }

    function draw() {
        const width = canvas.width;
        const height = canvas.height;

        const sky = ctx.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, "#6ac9ff");
        sky.addColorStop(1, "#e5f8ff");

        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, height);

        // Background hills
        ctx.fillStyle = "#a7df9b";

        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.arc(i * 190 + 40, 220, 75, Math.PI, 0);
            ctx.fill();
        }

        // Ground
        ctx.fillStyle = "#418c4e";
        ctx.fillRect(0, floorY, width, height - floorY);

        ctx.fillStyle = "#286c3c";
        ctx.fillRect(0, floorY, width, 6);

        // Obstacles
        obstacles.forEach(obstacle => {
            ctx.fillStyle = "#ba6246";
            ctx.fillRect(
                obstacle.x,
                obstacle.y,
                obstacle.width,
                obstacle.height
            );
        });

        // Coins
        coins.forEach(coin => {
            if (coin.collected) return;

            ctx.fillStyle = "#ffd447";
            ctx.beginPath();
            ctx.arc(coin.x, coin.y, 9, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = "#b77b19";
            ctx.stroke();
        });

        // Power-ups
        powerups.forEach(powerup => {
            if (powerup.collected) return;

            ctx.font = "25px Arial";
            ctx.fillText("🛡️", powerup.x - 12, powerup.y + 8);
        });

        // Player character
        ctx.font = "36px Arial";
        ctx.fillText("🐢", player.x - 3, player.y + 34);

        ctx.fillStyle = "#20344f";
        ctx.font = "bold 16px Arial";
        ctx.fillText("LEVEL " + level, 16, 25);
        ctx.fillText("COINS " + score, 16, 47);

        if (!running) {
            ctx.fillStyle = "rgba(15, 29, 52, 0.85)";
            ctx.fillRect(230, 125, 440, 70);

            ctx.fillStyle = "white";
            ctx.font = "bold 22px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Press Start to Play!", width / 2, 167);
            ctx.textAlign = "left";
        }
    }

    function overlaps(a, b) {
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    }

    function update() {
        if (!running) return;

        player.velocityY += gravity;
        player.y += player.velocityY;

        if (player.y + player.height >= floorY) {
            player.y = floorY - player.height;
            player.velocityY = 0;
            player.grounded = true;
        }

        if (player.dashing > 0) {
            player.dashing--;
            player.x += 7;
        } else {
            player.x += 1.4;
        }

        player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

        const playerBox = {
            x: player.x,
            y: player.y + (player.sliding ? 20 : 0),
            width: player.width,
            height: player.sliding ? 22 : player.height
        };

        coins.forEach(coin => {
            if (coin.collected) return;

            const coinBox = {
                x: coin.x - 9,
                y: coin.y - 9,
                width: 18,
                height: 18
            };

            if (overlaps(playerBox, coinBox)) {
                coin.collected = true;
                score += 10;
            }
        });

        powerups.forEach(powerup => {
            if (powerup.collected) return;

            const box = {
                x: powerup.x - 10,
                y: powerup.y - 10,
                width: 20,
                height: 20
            };

            if (overlaps(playerBox, box)) {
                powerup.collected = true;
                player.dashing = Math.max(player.dashing, 12);
            }
        });

        const hitObstacle = obstacles.some(obstacle => {
            if (player.dashing > 0) return false;
            if (player.sliding) return false;
            return overlaps(playerBox, obstacle);
        });

        if (hitObstacle) {
            running = false;
            draw();
            return;
        }

        if (player.x + player.width >= canvas.width - 10) {
            running = false;

            if (typeof completeLevel === "function") {
                completeLevel(level);
            }

            draw();
            return;
        }

        draw();
        animationId = requestAnimationFrame(update);
    }

    function start() {
        if (animationId) cancelAnimationFrame(animationId);

        running = true;
        resetWorld();
        update();
    }

    function jump() {
        if (!running || !player.grounded) return;

        player.velocityY = -12;
        player.grounded = false;
    }

    function slide() {
        if (!running) return;

        player.sliding = true;
        setTimeout(() => {
            player.sliding = false;
        }, 450);
    }

    function dash() {
        if (!running) return;

        player.dashing = 12;
    }

    function moveLeft() {
        if (running) {
            player.x = Math.max(0, player.x - 20);
            draw();
        }
    }

    function moveRight() {
        if (running) {
            player.x = Math.min(
                canvas.width - player.width,
                player.x + 20
            );
            draw();
        }
    }

    window.CrownQuestGame = {
        start,
        jump,
        slide,
        dash,
        moveLeft,
        moveRight,
        setLevel(value) {
            level = Math.max(1, Number(value) || 1);
            draw();
        }
    };

    document.addEventListener("keydown", event => {
        if (event.code === "Space" || event.code.startsWith("Arrow")) {
            event.preventDefault();
        }

        if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") jump();
        if (event.code === "ArrowDown" || event.code === "KeyS") slide();
        if (event.code === "ShiftLeft" || event.code === "ShiftRight") dash();
        if (event.code === "ArrowLeft" || event.code === "KeyA") moveLeft();
        if (event.code === "ArrowRight" || event.code === "KeyD") moveRight();
    });

    resetWorld();
    draw();
})();
```
