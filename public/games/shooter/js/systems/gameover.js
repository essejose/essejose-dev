import { canvas } from '../core/canvas.js';
import { IMAGES } from '../core/assets.js';
import { game } from '../game/state.js';
import { WaveSystem } from './waves.js';

/**
 * Painéis de morte / game over (sprites) + valores + clique.
 * - die: "VOCÊ MORREU" → continueAfterDeath
 * - over: GAME OVER → restartRun (Retry/Menu)
 */
const GameOverSystem = {
  active: false,
  /** @type {'over'|'die'|null} */
  mode: null,
  layout: null,
  autoTimer: null,
  snap: {
    score: 0,
    wave: 1,
    highScore: 0,
    highWave: 0,
    lives: 0,
  },

  /** Regiões relativas — game_over_panel 644×444 */
  OVER_REGIONS: {
    scoreValue: { x: 0.08, y: 0.38, w: 0.40, h: 0.12 },
    waveValue: { x: 0.52, y: 0.38, w: 0.40, h: 0.12 },
    highScoreValue: { x: 0.08, y: 0.58, w: 0.40, h: 0.10 },
    highWaveValue: { x: 0.52, y: 0.58, w: 0.40, h: 0.10 },
    retry: { x: 0.05, y: 0.755, w: 0.43, h: 0.175 },
    menu: { x: 0.52, y: 0.755, w: 0.43, h: 0.175 },
  },

  /** Regiões relativas — game_die_panel 801×347 */
  DIE_REGIONS: {
    scoreValue: { x: 0.06, y: 0.52, w: 0.40, h: 0.32 },
    livesValue: { x: 0.54, y: 0.52, w: 0.40, h: 0.32 },
  },

  clearAutoTimer() {
    if (this.autoTimer != null) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
  },

  show() {
    this.clearAutoTimer();
    this.active = true;
    this.mode = 'over';
    this.snap = {
      score: game.score ?? 0,
      wave: WaveSystem.currentWave || 1,
      highScore: game.highScore ?? 0,
      highWave: game.highWave ?? 0,
      lives: game.lives ?? 0,
    };
    this.layout = null;
  },

  showDie() {
    this.clearAutoTimer();
    this.active = true;
    this.mode = 'die';
    this.snap = {
      score: game.score ?? 0,
      wave: WaveSystem.currentWave || 1,
      highScore: game.highScore ?? 0,
      highWave: game.highWave ?? 0,
      lives: game.lives ?? 0,
    };
    this.layout = null;

    // Continua sozinho se não clicar (~2.5s)
    this.autoTimer = setTimeout(() => {
      this.autoTimer = null;
      if (this.active && this.mode === 'die' && typeof game.continueAfterDeath === 'function') {
        game.continueAfterDeath();
      }
    }, 2500);
  },

  hide() {
    this.clearAutoTimer();
    this.active = false;
    this.mode = null;
    this.layout = null;
  },

  computeLayout() {
    const isDie = this.mode === 'die';
    const img = isDie ? IMAGES.hudGameDie : IMAGES.hudGameOver;
    const nw = img?.naturalWidth || (isDie ? 801 : 644);
    const nh = img?.naturalHeight || (isDie ? 347 : 444);

    const maxW = canvas.width * (isDie ? 0.42 : 0.36);
    const maxH = canvas.height * (isDie ? 0.38 : 0.42);
    const cap = isDie ? 0.55 : 0.58;
    const scale = Math.min(maxW / nw, maxH / nh, cap);
    const w = nw * scale;
    const h = nh * scale;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;

    const box = (r) => ({
      x: x + r.x * w,
      y: y + r.y * h,
      w: r.w * w,
      h: r.h * h,
    });

    if (isDie) {
      const scoreValue = box(this.DIE_REGIONS.scoreValue);
      const livesValue = box(this.DIE_REGIONS.livesValue);
      this.layout = {
        panel: { x, y, w, h },
        scoreValue,
        livesValue,
        scale,
      };
      return this.layout;
    }

    const scoreValue = box(this.OVER_REGIONS.scoreValue);
    const waveValue = box(this.OVER_REGIONS.waveValue);
    const highScoreValue = box(this.OVER_REGIONS.highScoreValue);
    const highWaveValue = box(this.OVER_REGIONS.highWaveValue);

    scoreValue.y -= 15;
    waveValue.y -= 15;
    highScoreValue.y += 10;
    highWaveValue.y += 10;

    this.layout = {
      panel: { x, y, w, h },
      scoreValue,
      waveValue,
      highScoreValue,
      highWaveValue,
      retry: box(this.OVER_REGIONS.retry),
      menu: box(this.OVER_REGIONS.menu),
      scale,
    };
    return this.layout;
  },

  strokeFill(ctx, text, cx, cy, fontPx, fill, stroke = '#000', lw = 3) {
    ctx.font = `bold ${fontPx}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.fillStyle = fill;
    ctx.strokeText(text, cx, cy);
    ctx.fillText(text, cx, cy);
  },

  drawValue(ctx, box, value, fill = '#ffffff') {
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const fontPx = Math.max(14, Math.round(28 * (this.layout?.scale || 1)));
    this.strokeFill(ctx, String(value), cx, cy, fontPx, fill, '#001018', 3);
  },

  draw(ctx) {
    if (!this.active) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const L = this.computeLayout();
    const isDie = this.mode === 'die';
    const img = isDie ? IMAGES.hudGameDie : IMAGES.hudGameOver;

    if (img && img.complete && img.naturalWidth) {
      ctx.drawImage(img, L.panel.x, L.panel.y, L.panel.w, L.panel.h);
    } else {
      ctx.fillStyle = '#0a1a2e';
      ctx.fillRect(L.panel.x, L.panel.y, L.panel.w, L.panel.h);
      this.strokeFill(
        ctx,
        isDie ? 'VOCÊ MORREU!' : 'GAME OVER',
        L.panel.x + L.panel.w / 2,
        L.panel.y + 40,
        28,
        '#ff2a6a'
      );
    }

    if (isDie) {
      this.drawValue(ctx, L.scoreValue, this.snap.score, '#7ec8ff');
      this.drawValue(ctx, L.livesValue, this.snap.lives, '#ff7eb0');
    } else {
      this.drawValue(ctx, L.scoreValue, this.snap.score, '#7ec8ff');
      this.drawValue(ctx, L.waveValue, this.snap.wave, '#7ec8ff');
      this.drawValue(ctx, L.highScoreValue, this.snap.highScore, '#a8d4ff');
      this.drawValue(ctx, L.highWaveValue, this.snap.highWave, '#a8d4ff');
    }
  },

  hit(box, x, y) {
    return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
  },

  handleClick(canvasX, canvasY) {
    if (!this.active) return false;
    const L = this.layout || this.computeLayout();

    if (this.mode === 'die') {
      // Qualquer clique no painel (ou overlay) continua
      if (typeof game.continueAfterDeath === 'function') {
        game.continueAfterDeath();
      }
      return true;
    }

    if (this.hit(L.retry, canvasX, canvasY) || this.hit(L.menu, canvasX, canvasY)) {
      if (typeof game.restartRun === 'function') {
        game.restartRun();
      }
      return true;
    }
    return false;
  },

  init() {
    canvas.addEventListener('click', (e) => {
      if (!this.active) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / Math.max(1, rect.width);
      const scaleY = canvas.height / Math.max(1, rect.height);
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      this.handleClick(x, y);
    });
  },
};

export { GameOverSystem };
