import { canvas, ctx } from '../core/canvas.js';
import { IMAGES } from '../core/assets.js';
import { game } from '../game/state.js';
import { createEnemy } from '../entities/combat.js';
import { SettingsSystem } from './settings.js';

/**
 * Tela de menu — sprite menu.png + atmosfera (sol + inimigos decorativos).
 */
const MenuSystem = {
  active: false,
  layout: null,
  hazeParticles: [],
  decorEnemies: [],
  spawnTimer: 0,
  sunPulse: 0,

  /** Hitboxes relativas ao PNG 1669×942 */
  REGIONS: {
    play: { x: 0.30, y: 0.495, w: 0.40, h: 0.085 },
    settings: { x: 0.30, y: 0.615, w: 0.40, h: 0.085 },
  },

  show() {
    this.active = true;
    this.layout = null;
    this.hazeParticles = [];
    this.decorEnemies = [];
    this.spawnTimer = 0;
    this.sunPulse = 0;
    for (let i = 0; i < 3; i++) {
      this.spawnDecorEnemy(true);
    }
  },

  hide() {
    this.active = false;
    this.layout = null;
    this.hazeParticles = [];
    this.decorEnemies = [];
  },

  computeLayout() {
    const img = IMAGES.hudMenu;
    const nw = img?.naturalWidth || 1669;
    const nh = img?.naturalHeight || 942;
    // Cover ancorado no canto superior-esquerdo (logo/botões no canto)
    const scale = Math.max(canvas.width / nw, canvas.height / nh);
    const w = nw * scale;
    const h = nh * scale;
    const x = 0;
    const y = 0;

    const box = (r) => ({
      x: x + r.x * w,
      y: y + r.y * h,
      w: r.w * w,
      h: r.h * h,
    });

    this.layout = {
      panel: { x, y, w, h },
      play: box(this.REGIONS.play),
      settings: box(this.REGIONS.settings),
      sun: {
        x: x + w * 0.88,
        y: y + h * 0.12,
      },
      scale,
    };
    return this.layout;
  },

  spawnDecorEnemy(spreadX = false) {
    if (this.decorEnemies.length >= 4) return;
    const types = ['basic', 'drone'];
    const type = types[Math.floor(Math.random() * types.length)];
    const x = spreadX
      ? canvas.width * (0.2 + Math.random() * 0.75)
      : canvas.width + 40 + Math.random() * 80;
    // Faixa baixa: acima da cidade, abaixo dos botões
    const baseY = canvas.height * (0.70 + Math.random() * 0.12);
    const enemy = createEnemy(x, baseY, type, {
      weapon: false,
      flames: { spawnRate: 12, particleCount: [1, 1], maxParticles: 3 },
      movement: {
        speed: 0.7 + Math.random() * 0.5,
        wobbleSpeed: 0.03,
        wobbleAmplitude: 6,
        trackPlayer: 0,
      },
    });
    enemy._menuDecor = true;
    enemy._menuAlpha = 0.45 + Math.random() * 0.15;
    enemy._menuBaseY = baseY;
    enemy._menuSpeed = 0.7 + Math.random() * 0.5;
    enemy._wobbleT = Math.random() * Math.PI * 2;
    // Esconde barra de vida no menu
    enemy.draw = function drawDecor() {
      const comps = this.components || [];
      for (const c of comps) {
        if (c.draw) c.draw(this);
      }
      const imgKey = this.sprite;
      const spr = IMAGES[imgKey];
      if (spr && spr.complete) {
        ctx.drawImage(spr, this.x, this.y, this.width, this.height);
      }
    };
    this.decorEnemies.push(enemy);
  },

  /** Bruma / motes suaves — estilo atmosfera do gameplay, não pixels duros. */
  updateHaze(L) {
    if (this.hazeParticles.length < 14 && Math.random() < 0.2) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 50;
      this.hazeParticles.push({
        x: L.sun.x + Math.cos(ang) * dist * 0.3,
        y: L.sun.y + Math.sin(ang) * dist * 0.3,
        vx: (Math.random() - 0.65) * 0.35,
        vy: (Math.random() - 0.35) * 0.25,
        life: 50 + Math.floor(Math.random() * 40),
        maxLife: 90,
        size: 6 + Math.random() * 14,
      });
    }

    for (let i = this.hazeParticles.length - 1; i >= 0; i--) {
      const p = this.hazeParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.size *= 1.008;
      if (p.life <= 0) this.hazeParticles.splice(i, 1);
    }
  },

  drawSunAtmosphere(ctx, L) {
    this.sunPulse = (this.sunPulse + 0.02) % (Math.PI * 2);
    const pulse = 0.9 + Math.sin(this.sunPulse) * 0.1;
    const sx = L.sun.x;
    const sy = L.sun.y;
    // Só um halo bem suave em volta do sol da arte — sem segundo núcleo
    const r = Math.max(canvas.width, canvas.height) * 0.28 * pulse;
    const sun = ctx.createRadialGradient(sx, sy, r * 0.15, sx, sy, r);
    sun.addColorStop(0, `rgba(255, 230, 160, ${0.12 * pulse})`);
    sun.addColorStop(0.45, `rgba(255, 200, 110, ${0.05 * pulse})`);
    sun.addColorStop(1, 'rgba(255, 180, 100, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Motes de luz (não formam outro sol)
    for (const p of this.hazeParticles) {
      const a = Math.max(0, p.life / (p.maxLife || 90)) * 0.16;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      g.addColorStop(0, `rgba(255, 240, 200, ${a})`);
      g.addColorStop(1, 'rgba(255, 220, 150, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  update() {
    if (!this.active) return;
    const L = this.layout || this.computeLayout();

    this.updateHaze(L);

    this.spawnTimer++;
    if (this.spawnTimer >= 100) {
      this.spawnTimer = 0;
      this.spawnDecorEnemy(false);
    }

    // Movimento próprio (evita clampEnemyY puxar para a faixa do HUD do jogo)
    for (let i = this.decorEnemies.length - 1; i >= 0; i--) {
      const e = this.decorEnemies[i];
      e.x -= e._menuSpeed || 1;
      e._wobbleT = (e._wobbleT || 0) + 0.035;
      e.y = e._menuBaseY + Math.sin(e._wobbleT) * 8;
      e.baseY = e._menuBaseY;
      // Chamas leves
      for (const c of e.components || []) {
        if (c.particles && c.update) c.update(e);
      }
      if (e.x + e.width < -20) {
        this.decorEnemies.splice(i, 1);
      }
    }
  },

  draw(ctx) {
    if (!this.active) return;
    const L = this.computeLayout();
    const img = IMAGES.hudMenu;

    ctx.fillStyle = '#5BAFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (img && img.complete && img.naturalWidth) {
      ctx.drawImage(img, L.panel.x, L.panel.y, L.panel.w, L.panel.h);
    }

    // Atmosfera do sol (sobre o céu do art)
    this.drawSunAtmosphere(ctx, L);

    // Inimigos na faixa baixa (acima da cidade, abaixo dos botões)
    for (const e of this.decorEnemies) {
      ctx.globalAlpha = e._menuAlpha ?? 0.5;
      e.draw();
      ctx.globalAlpha = 1;
    }
  },

  hit(box, x, y) {
    return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
  },

  handleClick(canvasX, canvasY) {
    if (!this.active) return false;
    const L = this.layout || this.computeLayout();

    if (this.hit(L.play, canvasX, canvasY)) {
      if (typeof game.startFromMenu === 'function') game.startFromMenu();
      return true;
    }
    if (this.hit(L.settings, canvasX, canvasY)) {
      SettingsSystem.open();
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

export { MenuSystem };
