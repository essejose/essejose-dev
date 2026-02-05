 // =========================
    // CONFIGURAÇÃO BÁSICA
    // =========================
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    const COLS = 60;   // número de colunas
    const ROWS = 40;   // número de linhas
    const cellSize = canvas.width / COLS; // tamanho de cada célula (em px)

    let grid = createEmptyGrid();
    let running = false;
    let lastTime = 0;
    const STEP_INTERVAL = 100; // milissegundos entre gerações quando "Play"

    // =========================
    // CRIAÇÃO / LIMPEZA DA GRADE
    // =========================
    function createEmptyGrid() {
      const arr = [];
      for (let y = 0; y < ROWS; y++) {
        arr[y] = [];
        for (let x = 0; x < COLS; x++) {
          arr[y][x] = 0; // 0 = morto
        }
      }
      return arr;
    }

    function randomizeGrid() {
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          grid[y][x] = Math.random() < 0.2 ? 1 : 0; // 20% de chance de estar vivo
        }
      }
      draw();
    }

    // =========================
    // DESENHO
    // =========================
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (grid[y][x] === 1) {
            ctx.fillStyle = "#00ff7f"; // célula viva
          } else {
            ctx.fillStyle = "#000000"; // célula morta
          }
       
          ctx.fillRect(
            x * cellSize,
            y * cellSize,
            cellSize,
            cellSize
          );
        }
      }

      // desenhar grade opcional
      ctx.strokeStyle = "rgba(80,80,80,0.4)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * cellSize, 0);
        ctx.lineTo(x * cellSize, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellSize);
        ctx.lineTo(canvas.width, y * cellSize);
        ctx.stroke();
      }
    }

    // =========================
    // REGRAS DO GAME OF LIFE
    // =========================
    function countNeighbors(grid, x, y) {
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue; // ignora a própria célula


          const nx = (x + dx + COLS) % COLS;
          const ny = (y + dy + ROWS) % ROWS;

          count += grid[ny][nx];

          // const nx = x + dx;
          // const ny = y + dy;

          // sem wrap-around: bordas contam como 0
          // if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
          //   count += grid[ny][nx];
          // }
        }
      }
      return count;
    }

    function nextGeneration() {
      const newGrid = createEmptyGrid();

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const neighbors = countNeighbors(grid, x, y);
          const alive = grid[y][x] === 1;

          if (alive && (neighbors === 2 || neighbors === 3)) {
            newGrid[y][x] = 1; // sobrevive
          } else if (!alive && neighbors === 3) {
            newGrid[y][x] = 1; // nasce
          } else {
            newGrid[y][x] = 0; // morre ou continua morta
          }
        }
      }

      grid = newGrid;
      draw();
    }

    // =========================
    // LOOP DE ANIMAÇÃO
    // =========================
    function loop(timestamp) {
      if (running) {
        if (timestamp - lastTime > STEP_INTERVAL) {
          nextGeneration();
          lastTime = timestamp;
        }
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    // =========================
    // INTERAÇÃO: BOTÕES
    // =========================
    const playPauseBtn = document.getElementById("playPause");
    const stepBtn = document.getElementById("step");
    const randomBtn = document.getElementById("random");
    const clearBtn = document.getElementById("clear");

    playPauseBtn.addEventListener("click", () => {
      running = !running;
      playPauseBtn.textContent = running ? "⏸ Pause" : "▶️ Play";
    });

    stepBtn.addEventListener("click", () => {
      if (!running) {
        nextGeneration();
      }
    });

    randomBtn.addEventListener("click", () => {
      randomizeGrid();
    });

    clearBtn.addEventListener("click", () => {
      grid = createEmptyGrid();
      draw();
    });

    // =========================
    // INTERAÇÃO: CLIQUE NAS CÉLULAS
    // =========================
    canvas.addEventListener("click", (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const x = Math.floor(mx / cellSize);
      const y = Math.floor(my / cellSize);

      if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
        grid[y][x] = grid[y][x] ? 0 : 1; // toggle
        draw();
      }
    });

    // desenha a grade vazia no início
    draw();