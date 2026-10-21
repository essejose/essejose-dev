import { canvas } from "./canvas.js";
import { CONTROLSMODES } from "./input.js";

export class ParallaxLayer {
  /**
   * @param {HTMLImageElement} image
   * @param {number} speed
   * @param {number} [y=0]
   * @param {number} [alpha=1] - profundidade: distante < 1, perto = 1
   */
  constructor(image, speed, y = 0, alpha = 1) {
    this.image = image;
    this.baseSpeed = speed;
    this.speed = speed;
    this.y = y;
    this.alpha = alpha;
    this.x = 0; // offset de scroll (normalizado em update/draw)
    this.updateScale();
  }

  updateScale() {
    if (!this.image || !this.image.width || !this.image.height) return;

    const coverH = canvas.height - Math.min(0, this.y);
    const scaleByH = coverH / this.image.height;
    // Garante que 1 tile seja pelo menos tão largo quanto o canvas (evita buraco em widescreen)
    const scaleByW = canvas.width / this.image.width;
    const scale = Math.max(scaleByH, scaleByW);

    const oldWidth = this.scaledWidth || 0;
    this.scaleX = scale;
    this.scaleY = scale;
    this.scaledWidth = this.image.width * scale;
    this.scaledHeight = this.image.height * scale;

    // Preserva posição relativa do scroll ao redimensionar
    if (oldWidth > 0 && Number.isFinite(this.x)) {
      this.x = (this.x / oldWidth) * this.scaledWidth;
    } else {
      this.x = 0;
    }
    this._normalizeX();
  }

  /** Mantém x em [-scaledWidth, 0) para o loop de tiles começar à esquerda da tela. */
  _normalizeX() {
    const w = this.scaledWidth;
    if (!w || w <= 0) return;
    this.x = ((this.x % w) + w) % w;
    if (this.x > 0) this.x -= w;
  }

  updateSpeed(mode) {
    const multiplier = mode === CONTROLSMODES.HELICOPTER ? 0.5 : 1.0;
    this.speed = this.baseSpeed * multiplier;
  }

  update() {
    if (!this.scaledWidth) return;
    this.x -= this.speed;
    this._normalizeX();
  }

  draw(drawCtx) {
    if (!this.image || !this.image.complete || !this.scaledWidth) return;

    this._normalizeX();

    drawCtx.save();
    drawCtx.globalAlpha = this.alpha;

    // Desenha tiles suficientes para cobrir toda a largura do canvas
    for (
      let drawX = this.x;
      drawX < canvas.width;
      drawX += this.scaledWidth
    ) {
      drawCtx.drawImage(
        this.image,
        drawX,
        this.y,
        this.scaledWidth,
        this.scaledHeight
      );
    }

    drawCtx.restore();
  }

  reset() {
    this.updateScale();
    this.x = 0;
    this._normalizeX();
  }
}

/** Cache offscreen do overlay de atmosfera (rebuild só no resize). */
let atmosphereCache = null;
let atmosphereCacheW = 0;
let atmosphereCacheH = 0;

function rebuildAtmosphereCache(w, h) {
  if (!atmosphereCache) atmosphereCache = document.createElement("canvas");
  atmosphereCache.width = w;
  atmosphereCache.height = h;
  atmosphereCacheW = w;
  atmosphereCacheH = h;

  const a = atmosphereCache.getContext("2d");
  a.clearRect(0, 0, w, h);

  const sunX = w * 0.78;
  const sunY = h * 0.08;
  const sunR = Math.max(w, h) * 0.62;
  const sun = a.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  sun.addColorStop(0, "rgba(255, 220, 140, 0.32)");
  sun.addColorStop(0.25, "rgba(255, 190, 100, 0.14)");
  sun.addColorStop(0.55, "rgba(255, 170, 80, 0.05)");
  sun.addColorStop(1, "rgba(255, 180, 100, 0)");
  a.fillStyle = sun;
  a.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * 0.48;
  const vignetteR = Math.sqrt(w * w + h * h) * 0.52;
  const vignette = a.createRadialGradient(cx, cy, vignetteR * 0.3, cx, cy, vignetteR);
  vignette.addColorStop(0, "rgba(15, 22, 40, 0)");
  vignette.addColorStop(0.55, "rgba(15, 22, 40, 0.08)");
  vignette.addColorStop(1, "rgba(15, 22, 40, 0.4)");
  a.fillStyle = vignette;
  a.fillRect(0, 0, w, h);
}

/**
 * Sol + vinheta — blit do cache (só regenera se o tamanho mudou).
 * @param {CanvasRenderingContext2D} drawCtx
 * @param {HTMLCanvasElement} targetCanvas
 */
export function drawAtmosphereLighting(drawCtx, targetCanvas) {
  const w = targetCanvas.width;
  const h = targetCanvas.height;
  if (!atmosphereCache || atmosphereCacheW !== w || atmosphereCacheH !== h) {
    rebuildAtmosphereCache(w, h);
  }
  drawCtx.drawImage(atmosphereCache, 0, 0);
}
