import { canvas } from "./canvas.js";
import { CONTROLSMODES } from "./input.js";

/**
 * Camada de parallax com tile horizontal.
 * Otimização: cache offscreen pré-escalado (rebuild só no resize / troca de escala).
 * Draw faz blit 1:1 — evita reescalar a PNG fonte a cada frame.
 */
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
    /** @type {HTMLCanvasElement|null} */
    this._cache = null;
    this._cacheW = 0;
    this._cacheH = 0;
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
    // Inteiros: alinhamento de tile + tamanho do cache offscreen
    this.scaledWidth = Math.max(1, Math.round(this.image.width * scale));
    this.scaledHeight = Math.max(1, Math.round(this.image.height * scale));

    // Preserva posição relativa do scroll ao redimensionar
    if (oldWidth > 0 && Number.isFinite(this.x)) {
      this.x = (this.x / oldWidth) * this.scaledWidth;
    } else {
      this.x = 0;
    }
    this._normalizeX();
    this._rebuildCache();
  }

  /**
   * Rasteriza a imagem fonte uma vez na escala atual.
   * Custo de memória: ~scaledW×scaledH×4 bytes por camada (reutilizado entre frames).
   */
  _rebuildCache() {
    if (!this.image?.complete || !this.image.width || !this.scaledWidth) return;

    const w = this.scaledWidth;
    const h = this.scaledHeight;

    if (!this._cache) {
      this._cache = document.createElement("canvas");
    }

    // Só realoca buffer se o tamanho mudou
    if (this._cacheW !== w || this._cacheH !== h) {
      this._cache.width = w;
      this._cache.height = h;
      this._cacheW = w;
      this._cacheH = h;
    }

    const c = this._cache.getContext("2d");
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.clearRect(0, 0, w, h);
    c.drawImage(this.image, 0, 0, w, h);
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
    if (!this.image || !this.image.complete) return;

    // Imagem carregou depois do construct / resize sem pixels ainda
    if (!this._cache || this._cacheW !== this.scaledWidth) {
      if (!this.scaledWidth) this.updateScale();
      else this._rebuildCache();
    }
    if (!this._cache || !this.scaledWidth) return;

    this._normalizeX();

    const w = this.scaledWidth;
    const viewW = canvas.width;
    const y = this.y;
    const cache = this._cache;

    // Evita save/restore — só troca alpha
    const prevAlpha = drawCtx.globalAlpha;
    drawCtx.globalAlpha = this.alpha;

    // Tiles que intersectam [0, viewW); x ∈ [-w, 0)
    for (let drawX = this.x; drawX < viewW; drawX += w) {
      if (drawX + w <= 0) continue;
      // Blit 1:1 (sem reescalar a PNG fonte)
      drawCtx.drawImage(cache, drawX, y);
    }

    drawCtx.globalAlpha = prevAlpha;
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
