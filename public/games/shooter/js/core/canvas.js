import { JoystickSystem } from "../systems/joystick.js";

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

/** UI que consome o toque (não move o player). */
function isUiBlockingTouch() {
  if (window.MenuSystem?.active) return true;
  if (window.GameOverSystem?.active) return true;
  if (window.SettingsSystem?.isOpen) return true;
  if (window.ShopSystem?.isOpen) return true;
  return false;
}

function findTouch(e, id) {
  if (id == null) return e.changedTouches?.[0] || e.touches?.[0];
  const list = e.changedTouches?.length ? e.changedTouches : e.touches;
  for (let i = 0; i < (list?.length || 0); i++) {
    if (list[i].identifier === id) return list[i];
  }
  return null;
}

export function handleTouch(e) {
  // Menu / overlays: não preventDefault — senão o simulador/mobile
  // cancela pointerup/click e o botão Jogar “não clica”.
  if (isUiBlockingTouch()) {
    JoystickSystem.end();
    return;
  }

  // Joystick flutuante (mobile) substitui follow-finger
  if (JoystickSystem.isEnabled()) {
    if (e.type === "touchstart") {
      const touch = e.changedTouches[0] || e.touches[0];
      if (!touch) return;
      const { x, y } = screenToCanvas(touch.clientX, touch.clientY);
      if (window.HudSystem?.hitShop?.(x, y)) return;
      e.preventDefault();
      JoystickSystem.begin(x, y, touch.identifier);
      return;
    }

    if (e.type === "touchmove") {
      const touch = findTouch(e, JoystickSystem.touchId) || e.touches[0];
      if (!touch || !JoystickSystem.active) return;
      e.preventDefault();
      const { x, y } = screenToCanvas(touch.clientX, touch.clientY);
      JoystickSystem.move(x, y);
      return;
    }

    if (e.type === "touchend" || e.type === "touchcancel") {
      const touch = findTouch(e, JoystickSystem.touchId);
      if (touch) {
        e.preventDefault();
        JoystickSystem.end(touch.identifier);
      } else if (!e.touches?.length) {
        JoystickSystem.end();
      }
      return;
    }
  }

  // Fallback (sem joystick): follow-finger legado
  if (e.type !== "touchstart" && e.type !== "touchmove") return;
  const touch = e.touches[0];
  if (!touch) return;
  const { x, y } = screenToCanvas(touch.clientX, touch.clientY);
  if (window.HudSystem?.hitShop?.(x, y)) return;

  e.preventDefault();
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
  canvas.addEventListener("touchend", handleTouch, { passive: false });
  canvas.addEventListener("touchcancel", handleTouch, { passive: false });
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", () => {
    setTimeout(resizeCanvas, 100);
  });
}
