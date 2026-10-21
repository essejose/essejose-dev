export const canvas = document.getElementById("game");
export const ctx = canvas.getContext("2d");

/** Resolução interna máxima — CSS estica para a janela (menos fillrate). */
export const MAX_INTERNAL_WIDTH = 1280;
export const MAX_INTERNAL_HEIGHT = 720;

/** Converte coordenada de tela (CSS) → espaço interno do canvas. */
export function screenToCanvas(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / Math.max(1, rect.width);
  const scaleY = canvas.height / Math.max(1, rect.height);
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

export function handleTouch(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const { x, y } = screenToCanvas(touch.clientX, touch.clientY);
  const g = window.game;
  if (!g?.player) return;
  g.player.targetX = x - g.player.width / 2;
  g.player.targetY = y - g.player.height / 2;
}

export function resizeCanvas() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const aspect = vw / Math.max(1, vh);

  let w;
  let h;
  if (vw <= MAX_INTERNAL_WIDTH && vh <= MAX_INTERNAL_HEIGHT) {
    w = vw;
    h = vh;
  } else if (aspect >= MAX_INTERNAL_WIDTH / MAX_INTERNAL_HEIGHT) {
    w = MAX_INTERNAL_WIDTH;
    h = Math.max(1, Math.round(MAX_INTERNAL_WIDTH / aspect));
  } else {
    h = MAX_INTERNAL_HEIGHT;
    w = Math.max(1, Math.round(MAX_INTERNAL_HEIGHT * aspect));
  }

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  // Exibe em tela cheia; lógica usa resolução interna
  canvas.style.width = `${vw}px`;
  canvas.style.height = `${vh}px`;

  try {
    if (window.game?.parallaxLayers) {
      window.game.parallaxLayers.forEach((layer) => layer.updateScale());
    }
  } catch (e) {
    /* before init */
  }
}

export function initCanvas() {
  canvas.addEventListener("touchstart", handleTouch, { passive: false });
  canvas.addEventListener("touchmove", handleTouch, { passive: false });
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
}
