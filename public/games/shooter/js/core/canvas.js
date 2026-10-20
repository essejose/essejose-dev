export const canvas = document.getElementById("game");
export const ctx = canvas.getContext("2d");

export function handleTouch(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const touchX = touch.clientX - rect.left;
  const touchY = touch.clientY - rect.top;
  const g = window.game;
  if (!g?.player) return;
  g.player.targetX = touchX - g.player.width / 2;
  g.player.targetY = touchY - g.player.height / 2;
}

export function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  try {
    if (window.game?.parallaxLayers) {
      window.game.parallaxLayers.forEach((layer) => layer.updateScale());
    }
  } catch (e) {
    /* before init */
  }
}

export function initCanvas() {
  canvas.addEventListener("touchstart", handleTouch);
  canvas.addEventListener("touchmove", handleTouch);
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
}
