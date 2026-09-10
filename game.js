const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");
const scoreElement = document.querySelector("#score");
const bestScoreElement = document.querySelector("#best-score");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayHint = document.querySelector("#overlay-hint");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");

const TILE_SIZE = 20;
const TILE_COUNT = canvas.width / TILE_SIZE;
const START_SPEED = 150;
const MIN_SPEED = 70;

const directions = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const keyDirections = {
  ArrowUp: "up",
  w: "up",
  W: "up",
  ArrowDown: "down",
  s: "down",
  S: "down",
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right",
};

let snake;
let food;
let direction;
let queuedDirection;
let score;
let bestScore = Number(localStorage.getItem("snake-best-score")) || 0;
let gameState = "ready";
let lastStepTime = 0;
let touchStart = null;

bestScoreElement.textContent = bestScore;

function resetGame() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  direction = directions.right;
  queuedDirection = directions.right;
  score = 0;
  scoreElement.textContent = score;
  food = createFood();
  lastStepTime = 0;
  render();
}

function createFood() {
  const freeTiles = [];

  for (let y = 0; y < TILE_COUNT; y += 1) {
    for (let x = 0; x < TILE_COUNT; x += 1) {
      const occupied = snake?.some((segment) => segment.x === x && segment.y === y);
      if (!occupied) freeTiles.push({ x, y });
    }
  }

  return freeTiles[Math.floor(Math.random() * freeTiles.length)];
}

function startGame() {
  if (gameState === "over") resetGame();
  gameState = "playing";
  overlay.classList.add("hidden");
  startButton.textContent = "重新开始";
  pauseButton.textContent = "暂停";
}

function restartGame() {
  resetGame();
  startGame();
}

function togglePause() {
  if (gameState === "ready" || gameState === "over") return;

  if (gameState === "paused") {
    gameState = "playing";
    overlay.classList.add("hidden");
    pauseButton.textContent = "暂停";
    lastStepTime = 0;
  } else {
    gameState = "paused";
    showOverlay("已暂停", "按空格或按钮继续");
    pauseButton.textContent = "继续";
  }
}

function setDirection(nextDirectionName) {
  const nextDirection = directions[nextDirectionName];
  const isOpposite =
    nextDirection.x + direction.x === 0 && nextDirection.y + direction.y === 0;

  if (!isOpposite) queuedDirection = nextDirection;
  if (gameState === "ready") startGame();
}

function update() {
  direction = queuedDirection;
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };
  const ateFood = head.x === food.x && head.y === food.y;
  const bodyToCheck = ateFood ? snake : snake.slice(0, -1);
  const hitWall = head.x < 0 || head.y < 0 || head.x >= TILE_COUNT || head.y >= TILE_COUNT;
  const hitSelf = bodyToCheck.some(
    (segment) => segment.x === head.x && segment.y === head.y,
  );

  if (hitWall || hitSelf) {
    endGame();
    return;
  }

  snake.unshift(head);

  if (ateFood) {
    score += 1;
    scoreElement.textContent = score;
    food = createFood();

    if (score > bestScore) {
      bestScore = score;
      bestScoreElement.textContent = bestScore;
      localStorage.setItem("snake-best-score", String(bestScore));
    }
  } else {
    snake.pop();
  }
}

function endGame() {
  gameState = "over";
  showOverlay("游戏结束", `本局得分 ${score} · 按 R 或按钮重开`);
  startButton.textContent = "再来一局";
}

function showOverlay(title, hint) {
  overlayTitle.textContent = title;
  overlayHint.textContent = hint;
  overlay.classList.remove("hidden");
}

function render() {
  context.fillStyle = "#07120c";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "rgba(125, 193, 148, 0.055)";
  context.lineWidth = 1;
  for (let index = TILE_SIZE; index < canvas.width; index += TILE_SIZE) {
    context.beginPath();
    context.moveTo(index, 0);
    context.lineTo(index, canvas.height);
    context.stroke();
    context.beginPath();
    context.moveTo(0, index);
    context.lineTo(canvas.width, index);
    context.stroke();
  }

  const foodX = food.x * TILE_SIZE + TILE_SIZE / 2;
  const foodY = food.y * TILE_SIZE + TILE_SIZE / 2;
  context.fillStyle = "#ffc64d";
  context.shadowColor = "rgba(255, 198, 77, 0.55)";
  context.shadowBlur = 14;
  context.beginPath();
  context.arc(foodX, foodY, TILE_SIZE * 0.34, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;

  snake.forEach((segment, index) => {
    const inset = index === 0 ? 2 : 3;
    context.fillStyle = index === 0 ? "#b8ffd0" : `hsl(${145 - index * 0.8} 72% 54%)`;
    context.beginPath();
    context.roundRect(
      segment.x * TILE_SIZE + inset,
      segment.y * TILE_SIZE + inset,
      TILE_SIZE - inset * 2,
      TILE_SIZE - inset * 2,
      index === 0 ? 6 : 5,
    );
    context.fill();
  });
}

function gameLoop(timestamp) {
  if (gameState === "playing") {
    const interval = Math.max(MIN_SPEED, START_SPEED - score * 4);
    if (!lastStepTime || timestamp - lastStepTime >= interval) {
      update();
      render();
      lastStepTime = timestamp;
    }
  }

  requestAnimationFrame(gameLoop);
}

document.addEventListener("keydown", (event) => {
  if (keyDirections[event.key]) {
    event.preventDefault();
    setDirection(keyDirections[event.key]);
  } else if (event.code === "Space") {
    event.preventDefault();
    togglePause();
  } else if (event.key === "r" || event.key === "R") {
    restartGame();
  }
});

startButton.addEventListener("click", restartGame);
pauseButton.addEventListener("click", togglePause);

document.querySelectorAll("[data-direction]").forEach((button) => {
  button.addEventListener("click", () => setDirection(button.dataset.direction));
});

canvas.addEventListener("pointerdown", (event) => {
  touchStart = { x: event.clientX, y: event.clientY };
});

canvas.addEventListener("pointerup", (event) => {
  if (!touchStart) return;
  const deltaX = event.clientX - touchStart.x;
  const deltaY = event.clientY - touchStart.y;
  touchStart = null;

  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 18) return;
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    setDirection(deltaX > 0 ? "right" : "left");
  } else {
    setDirection(deltaY > 0 ? "down" : "up");
  }
});

resetGame();
requestAnimationFrame(gameLoop);
