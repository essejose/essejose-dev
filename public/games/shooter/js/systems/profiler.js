/**
 * Profiler leve — ativo somente com game.debug (tecla K).
 * Fase 1.5: raf vs JS, unaccountedMs, breakdown de draw.
 * Não altera lógica de jogo.
 */
const SAMPLE_CAPACITY = 120;

const PerfProfiler = {
  _frameTimes: new Float64Array(SAMPLE_CAPACITY),
  _sampleCount: 0,
  _writeIndex: 0,
  _lastTs: 0,

  _markUpdate0: 0,
  _markColl0: 0,
  _markDraw0: 0,
  _markJs0: 0,
  _markSection0: 0,
  _activeSection: null,

  updateMs: 0,
  collisionMs: 0,
  drawMs: 0,
  jsFrameMs: 0,
  unaccountedMs: 0,
  lastRafDeltaMs: 0,
  collisionChecks: 0,

  /** Tempos do último draw tick (ms) */
  drawParts: {
    parallax: 0,
    tanks: 0,
    enemies: 0,
    projectiles: 0,
    particles: 0,
    coins: 0,
    hud: 0,
    other: 0,
  },

  tanksDrawn: 0,
  tankAvgMs: 0,

  counts: {
    enemies: 0,
    tanks: 0,
    projectiles: 0,
    enemyProjectiles: 0,
    particles: 0,
    coins: 0,
    wave: 0,
  },

  fps: 0,
  frameAvgMs: 0,
  frameP95Ms: 0,
  frameP99Ms: 0,

  _scratch: new Float64Array(SAMPLE_CAPACITY),

  _debug() {
    return !!window.game?.debug;
  },

  resetFrameCounters() {
    this.collisionChecks = 0;
  },

  beginFrame(timestamp) {
    if (!this._debug()) {
      this._lastTs = timestamp;
      return;
    }
    this.resetFrameCounters();
    if (this._lastTs > 0) {
      const dt = timestamp - this._lastTs;
      if (dt > 0 && dt < 250) {
        this.lastRafDeltaMs = dt;
        this._frameTimes[this._writeIndex] = dt;
        this._writeIndex = (this._writeIndex + 1) % SAMPLE_CAPACITY;
        if (this._sampleCount < SAMPLE_CAPACITY) this._sampleCount++;
      }
    }
    this._lastTs = timestamp;
  },

  endFrame() {
    if (!this._debug()) return;
    // unaccounted = intervalo rAF − trabalho JS medido neste tick
    this.unaccountedMs = Math.max(0, this.lastRafDeltaMs - this.jsFrameMs);
    this._recomputeStats();
  },

  /** Início do trabalho JS do tick (update e/ou draw). */
  beginJsWork() {
    if (!this._debug()) return;
    this._markJs0 = performance.now();
  },

  endJsWork() {
    if (!this._debug()) return;
    this.jsFrameMs = performance.now() - this._markJs0;
  },

  beginUpdate() {
    if (!this._debug()) return;
    this._markUpdate0 = performance.now();
  },

  endUpdate() {
    if (!this._debug()) return;
    this.updateMs = performance.now() - this._markUpdate0;
  },

  beginCollisions() {
    if (!this._debug()) return;
    this._markColl0 = performance.now();
  },

  endCollisions() {
    if (!this._debug()) return;
    this.collisionMs = performance.now() - this._markColl0;
  },

  beginDraw() {
    if (!this._debug()) return;
    this._markDraw0 = performance.now();
    this.drawParts.parallax = 0;
    this.drawParts.tanks = 0;
    this.drawParts.enemies = 0;
    this.drawParts.projectiles = 0;
    this.drawParts.particles = 0;
    this.drawParts.coins = 0;
    this.drawParts.hud = 0;
    this.drawParts.other = 0;
    this.tanksDrawn = 0;
    this.tankAvgMs = 0;
  },

  endDraw() {
    if (!this._debug()) return;
    this.drawMs = performance.now() - this._markDraw0;
    const accounted =
      this.drawParts.parallax +
      this.drawParts.tanks +
      this.drawParts.enemies +
      this.drawParts.projectiles +
      this.drawParts.particles +
      this.drawParts.coins +
      this.drawParts.hud;
    this.drawParts.other = Math.max(0, this.drawMs - accounted);
  },

  /**
   * Cronometra um bloco de draw. Com debug off, só executa fn.
   * @param {'parallax'|'tanks'|'enemies'|'projectiles'|'particles'|'coins'|'hud'} name
   * @param {() => void} fn
   * @param {{ tankCount?: number }} [opts]
   */
  timeDraw(name, fn, opts) {
    if (!this._debug()) {
      fn();
      return;
    }
    const t0 = performance.now();
    fn();
    const dt = performance.now() - t0;
    this.drawParts[name] = (this.drawParts[name] || 0) + dt;
    if (name === 'tanks') {
      const n = opts?.tankCount ?? 0;
      this.tanksDrawn = n;
      this.tankAvgMs = n > 0 ? dt / n : 0;
    }
  },

  addCollisionChecks(n = 1) {
    if (!this._debug()) return;
    this.collisionChecks += n;
  },

  sampleEntityCounts(g) {
    if (!g?.debug) return;
    let particles = g.particles?.length || 0;
    const enemies = g.enemies || [];
    for (let i = 0; i < enemies.length; i++) {
      const comps = enemies[i].components;
      if (!comps) continue;
      for (let c = 0; c < comps.length; c++) {
        if (comps[c].particles) particles += comps[c].particles.length;
      }
    }
    this.counts.enemies = enemies.length;
    // Duck-type (nome da classe some no minify)
    this.counts.hasBoss = !!(
      g.miniBoss ||
      enemies.some((e) => e && e.muzzles && e.flames)
    );
    this.counts.tanks = g.tanks?.length || 0;
    this.counts.projectiles = g.projectiles?.length || 0;
    this.counts.enemyProjectiles = g.enemyProjectiles?.length || 0;
    this.counts.particles = particles;
    this.counts.coins = g.coinsDropped?.length || 0;
    this.counts.wave =
      (typeof window.WaveSystem !== 'undefined' && window.WaveSystem?.currentWave) ||
      0;
  },

  _percentile(sorted, n, p) {
    if (n <= 0) return 0;
    const idx = Math.min(n - 1, Math.ceil(p * n) - 1);
    return sorted[Math.max(0, idx)];
  },

  _recomputeStats() {
    const n = this._sampleCount;
    if (n <= 0) {
      this.fps = 0;
      this.frameAvgMs = 0;
      this.frameP95Ms = 0;
      this.frameP99Ms = 0;
      return;
    }

    const scratch = this._scratch;
    if (n < SAMPLE_CAPACITY) {
      for (let i = 0; i < n; i++) scratch[i] = this._frameTimes[i];
    } else {
      for (let i = 0; i < SAMPLE_CAPACITY; i++) {
        scratch[i] = this._frameTimes[(this._writeIndex + i) % SAMPLE_CAPACITY];
      }
    }

    for (let i = 1; i < n; i++) {
      const v = scratch[i];
      let j = i - 1;
      while (j >= 0 && scratch[j] > v) {
        scratch[j + 1] = scratch[j];
        j--;
      }
      scratch[j + 1] = v;
    }

    let sum = 0;
    for (let i = 0; i < n; i++) sum += scratch[i];
    this.frameAvgMs = sum / n;
    this.frameP95Ms = this._percentile(scratch, n, 0.95);
    this.frameP99Ms = this._percentile(scratch, n, 0.99);
    this.fps = this.frameAvgMs > 0 ? 1000 / this.frameAvgMs : 0;
  },

  draw(ctx, canvas) {
    if (!this._debug()) return;

    const pad = 8;
    const lineH = 14;
    const dp = this.drawParts;
    const lines = [
      `FPS ${this.fps.toFixed(1)}  (alvo ${window.game.fps || 60})`,
      `RAF ms  avg ${this.frameAvgMs.toFixed(2)}  p95 ${this.frameP95Ms.toFixed(2)}  p99 ${this.frameP99Ms.toFixed(2)}`,
      `JS ${this.jsFrameMs.toFixed(2)} ms   unaccounted ${this.unaccountedMs.toFixed(2)} ms`,
      `Update ${this.updateMs.toFixed(2)}  Coll ${this.collisionMs.toFixed(2)} (${this.collisionChecks})  Draw ${this.drawMs.toFixed(2)}`,
      `Draw| parallax ${dp.parallax.toFixed(2)}  tanks ${dp.tanks.toFixed(2)}  enemies ${dp.enemies.toFixed(2)}`,
      `Draw| proj ${dp.projectiles.toFixed(2)}  particles ${dp.particles.toFixed(2)}  coins ${dp.coins.toFixed(2)}`,
      `Draw| hud ${dp.hud.toFixed(2)}  other ${dp.other.toFixed(2)}`,
      `Tanks drawn ${this.tanksDrawn}  avg/tank ${this.tankAvgMs.toFixed(3)} ms`,
      `Wave ${this.counts.wave}  E ${this.counts.enemies}${this.counts.hasBoss ? '+Boss' : ''}  T ${this.counts.tanks}  Coins ${this.counts.coins || 0}`,
      `Proj ${this.counts.projectiles}/${this.counts.enemyProjectiles}  Particles ~${this.counts.particles}`,
    ];

    const boxW = 340;
    const boxH = pad * 2 + lines.length * lineH + 4;
    const x = canvas.width - boxW - 10;
    const y = 10;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(x, y, boxW, boxH);
    ctx.strokeStyle = 'rgba(80, 200, 255, 0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, boxW, boxH);

    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#a8e6ff';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x + pad, y + pad + i * lineH);
    }
    ctx.restore();
  },
};

export { PerfProfiler };
