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
    this.x1 = 0;
    this.x2 = 0;
    this.updateScale();
  }

  updateScale() {
    if (!this.image || !this.image.width) return;
    // Se y < 0 (sobe a arte), estica a altura para continuar cobrindo o canvas
    const coverH = canvas.height - Math.min(0, this.y);
    this.scaleY = coverH / this.image.height;
    this.scaleX = this.scaleY;
    this.scaledWidth = this.image.width * this.scaleX;
    this.scaledHeight = coverH;
    this.x2 = this.scaledWidth;
  }

  updateSpeed(mode) {
    const multiplier = mode === CONTROLSMODES.HELICOPTER ? 0.5 : 1.0;
    this.speed = this.baseSpeed * multiplier;
  }

  update() {
    this.x1 -= this.speed;
    this.x2 -= this.speed;
    if (this.x1 + this.scaledWidth <= 0) this.x1 = this.x2 + this.scaledWidth;
    if (this.x2 + this.scaledWidth <= 0) this.x2 = this.x1 + this.scaledWidth;
  }

  draw(drawCtx) {
    if (!this.image || !this.image.complete) return;
    drawCtx.save();
    drawCtx.globalAlpha = this.alpha;
    drawCtx.drawImage(this.image, this.x1, this.y, this.scaledWidth, this.scaledHeight);
    drawCtx.drawImage(this.image, this.x2, this.y, this.scaledWidth, this.scaledHeight);
    drawCtx.restore();
  }

  reset() {
    this.updateScale();
    this.x1 = 0;
    this.x2 = this.scaledWidth;
  }
}

/**
 * Sol suave (canto superior-direito) + vinheta — só no fundo, antes das entidades.
 * @param {CanvasRenderingContext2D} drawCtx
 * @param {HTMLCanvasElement} targetCanvas
 */
export function drawAtmosphereLighting(drawCtx, targetCanvas) {
  const w = targetCanvas.width;
  const h = targetCanvas.height;

  drawCtx.save();

  // Sol / god-ray no céu (canto superior-direito)
  const sunX = w * 0.78;
  const sunY = h * 0.08;
  const sunR = Math.max(w, h) * 0.62;
  const sun = drawCtx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  sun.addColorStop(0, "rgba(255, 220, 140, 0.32)");
  sun.addColorStop(0.25, "rgba(255, 190, 100, 0.14)");
  sun.addColorStop(0.55, "rgba(255, 170, 80, 0.05)");
  sun.addColorStop(1, "rgba(255, 180, 100, 0)");
  drawCtx.fillStyle = sun;
  drawCtx.fillRect(0, 0, w, h);

  // Vinheta nas bordas
  const cx = w * 0.5;
  const cy = h * 0.48;
  const vignetteR = Math.sqrt(w * w + h * h) * 0.52;
  const vignette = drawCtx.createRadialGradient(cx, cy, vignetteR * 0.3, cx, cy, vignetteR);
  vignette.addColorStop(0, "rgba(15, 22, 40, 0)");
  vignette.addColorStop(0.55, "rgba(15, 22, 40, 0.08)");
  vignette.addColorStop(1, "rgba(15, 22, 40, 0.4)");
  drawCtx.fillStyle = vignette;
  drawCtx.fillRect(0, 0, w, h);

  drawCtx.restore();
}
