(() => {
  const GRID = 20;
  const TICK_MS = 110;
  const STORAGE_KEY = "snake-high-score";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const highScoreEl = document.getElementById("high-score");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayHint = document.getElementById("overlay-hint");

  const cell = canvas.width / GRID;

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const OPPOSITE = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
  };

  let snake;
  let direction;
  let queuedDirection;
  let food;
  let score;
  let highScore = Number(localStorage.getItem(STORAGE_KEY)) || 0;
  let status = "ready"; // ready | playing | paused | over
  let lastTick = 0;
  let rafId = 0;

  highScoreEl.textContent = String(highScore);

  function reset() {
    const mid = Math.floor(GRID / 2);
    snake = [
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
      { x: mid - 3, y: mid },
    ];
    direction = "right";
    queuedDirection = "right";
    score = 0;
    scoreEl.textContent = "0";
    placeFood();
  }

  function placeFood() {
    const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));
    let spot;
    do {
      spot = {
        x: Math.floor(Math.random() * GRID),
        y: Math.floor(Math.random() * GRID),
      };
    } while (occupied.has(`${spot.x},${spot.y}`));
    food = spot;
  }

  function showOverlay(title, hint) {
    overlayTitle.textContent = title;
    overlayHint.textContent = hint;
    overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function setDirection(next) {
    if (!DIRS[next]) return;
    if (status === "ready") {
      startGame();
    }
    if (status !== "playing") return;
    if (OPPOSITE[direction] === next) return;
    queuedDirection = next;
  }

  function startGame() {
    if (status === "over" || status === "ready") {
      reset();
    }
    status = "playing";
    hideOverlay();
    lastTick = performance.now();
  }

  function pauseGame() {
    if (status !== "playing") return;
    status = "paused";
    showOverlay("已暂停", "按空格或点击继续");
  }

  function resumeGame() {
    if (status !== "paused") return;
    status = "playing";
    hideOverlay();
    lastTick = performance.now();
  }

  function gameOver() {
    status = "over";
    if (score > highScore) {
      highScore = score;
      localStorage.setItem(STORAGE_KEY, String(highScore));
      highScoreEl.textContent = String(highScore);
      showOverlay("新纪录！", `得分 ${score} · 按空格再来一局`);
    } else {
      showOverlay("游戏结束", `得分 ${score} · 按空格再来一局`);
    }
  }

  function tick() {
    direction = queuedDirection;
    const head = snake[0];
    const delta = DIRS[direction];
    const next = { x: head.x + delta.x, y: head.y + delta.y };

    if (next.x < 0 || next.x >= GRID || next.y < 0 || next.y >= GRID) {
      gameOver();
      return;
    }

    const hitSelf = snake.some((s) => s.x === next.x && s.y === next.y);
    if (hitSelf) {
      gameOver();
      return;
    }

    snake.unshift(next);

    if (next.x === food.x && next.y === food.y) {
      score += 10;
      scoreEl.textContent = String(score);
      placeFood();
    } else {
      snake.pop();
    }
  }

  function drawCell(x, y, color, inset = 1.5) {
    const px = x * cell;
    const py = y * cell;
    const size = cell - inset * 2;
    const r = Math.min(6, size * 0.28);
    ctx.fillStyle = color;
    roundRect(px + inset, py + inset, size, size, r);
    ctx.fill();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw() {
    ctx.fillStyle = "#143528";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i++) {
      const p = i * cell;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, canvas.height);
      ctx.moveTo(0, p);
      ctx.lineTo(canvas.width, p);
      ctx.stroke();
    }

    // food glow
    const fx = food.x * cell + cell / 2;
    const fy = food.y * cell + cell / 2;
    const glow = ctx.createRadialGradient(fx, fy, 2, fx, fy, cell * 0.9);
    glow.addColorStop(0, "rgba(231, 111, 81, 0.55)");
    glow.addColorStop(1, "rgba(231, 111, 81, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(food.x * cell - cell, food.y * cell - cell, cell * 3, cell * 3);
    drawCell(food.x, food.y, "#e76f51", 3);

    snake.forEach((segment, i) => {
      const t = i / Math.max(snake.length - 1, 1);
      const g = Math.round(216 - t * 70);
      const b = Math.round(220 - t * 40);
      const color = i === 0 ? "#d8f3dc" : `rgb(149, ${g}, ${b})`;
      drawCell(segment.x, segment.y, color, i === 0 ? 1 : 2);
    });

    // eyes
    const head = snake[0];
    const hx = head.x * cell;
    const hy = head.y * cell;
    const eye = cell * 0.14;
    const offset = cell * 0.28;
    ctx.fillStyle = "#0f2a1f";
    let e1x, e1y, e2x, e2y;
    if (direction === "right") {
      e1x = hx + cell - offset; e1y = hy + offset;
      e2x = hx + cell - offset; e2y = hy + cell - offset - eye;
    } else if (direction === "left") {
      e1x = hx + offset - eye; e1y = hy + offset;
      e2x = hx + offset - eye; e2y = hy + cell - offset - eye;
    } else if (direction === "up") {
      e1x = hx + offset; e1y = hy + offset - eye;
      e2x = hx + cell - offset - eye; e2y = hy + offset - eye;
    } else {
      e1x = hx + offset; e1y = hy + cell - offset;
      e2x = hx + cell - offset - eye; e2y = hy + cell - offset;
    }
    ctx.beginPath();
    ctx.arc(e1x + eye / 2, e1y + eye / 2, eye / 2, 0, Math.PI * 2);
    ctx.arc(e2x + eye / 2, e2y + eye / 2, eye / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function loop(now) {
    if (status === "playing" && now - lastTick >= TICK_MS) {
      lastTick = now;
      tick();
    }
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function togglePauseOrStart() {
    if (status === "ready" || status === "over") {
      startGame();
    } else if (status === "playing") {
      pauseGame();
    } else if (status === "paused") {
      resumeGame();
    }
  }

  const keyMap = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    W: "up",
    s: "down",
    S: "down",
    a: "left",
    A: "left",
    d: "right",
    D: "right",
  };

  window.addEventListener("keydown", (e) => {
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      togglePauseOrStart();
      return;
    }
    const dir = keyMap[e.key];
    if (dir) {
      e.preventDefault();
      setDirection(dir);
    }
  });

  overlay.addEventListener("click", togglePauseOrStart);

  document.querySelectorAll(".pad-btn").forEach((btn) => {
    btn.addEventListener("click", () => setDirection(btn.dataset.dir));
  });

  reset();
  showOverlay("准备就绪", "按空格或点击开始");
  rafId = requestAnimationFrame(loop);
})();
