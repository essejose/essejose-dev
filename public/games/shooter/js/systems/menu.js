import { canvas, ctx, screenToCanvas } from '../core/canvas.js';
import { IMAGES } from '../core/assets.js';
import { game } from '../game/state.js';
import { createEnemy } from '../entities/combat.js';
import { SettingsSystem } from './settings.js';
import { FullscreenPrompt } from './fullscreen.js';

/**
 * Tela de menu — fundo menu.png + logo/start/config empilhados.
 */
const MenuSystem = {
  active: false,
  layout: null,
  hazeParticles: [],
  decorEnemies: [],
  spawnTimer: 0,
  sunPulse: 0,
  /** Evita double-fire pointerup + touchstart no mesmo toque */
  _lastPointerAt: 0,

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
    FullscreenPrompt.show();
  },

  hide() {
    this.active = false;
    this.layout = null;
    this.hazeParticles = [];
    this.decorEnemies = [];
    FullscreenPrompt.hide();
  },

  computeLayout() {
    const cw = canvas.width;
    const ch = canvas.height;

    // Fundo cover centralizado
    const bg = IMAGES.hudMenu;
    const nw = bg?.naturalWidth || 1669;
    const nh = bg?.naturalHeight || 942;
    const bgScale = Math.max(cw / nw, ch / nh);
    const panelW = nw * bgScale;
    const panelH = nh * bgScale;
    const panelX = (cw - panelW) / 2;
    const panelY = (ch - panelH) / 2;

    // Sprites da UI
    const logoImg = IMAGES.hudMenuLogo;
    const startImg = IMAGES.hudMenuStart;
    const logoNw = logoImg?.naturalWidth || 625;
    const logoNh = logoImg?.naturalHeight || 275;
    const btnNw = startImg?.naturalWidth || 440;
    const btnNh = startImg?.naturalHeight || 97;

    const logoW = Math.min(cw * 0.55, 420);
    const logoH = logoW * (logoNh / logoNw);
    const btnW = Math.min(cw * 0.42, 320);
    const btnH = btnW * (btnNh / btnNw);

    const gapLogoStart = ch * 0.045;
    const gapStartConfig = ch * 0.018;
    const stackH = logoH + gapLogoStart + btnH + gapStartConfig + btnH;
    let y = (ch - stackH) / 2;

    const logo = {
      x: (cw - logoW) / 2,
      y,
      w: logoW,
      h: logoH,
    };
    y += logoH + gapLogoStart;

    const play = {
      x: (cw - btnW) / 2,
      y,
      w: btnW,
      h: btnH,
    };
    y += btnH + gapStartConfig;

    const settings = {
      x: (cw - btnW) / 2,
      y,
      w: btnW,
      h: btnH,
    };

    this.layout = {
      panel: { x: panelX, y: panelY, w: panelW, h: panelH },
      logo,
      play,
      settings,
      sun: {
        x: panelX + panelW * 0.88,
        y: panelY + panelH * 0.12,
      },
      scale: bgScale,
      narrow: cw / Math.max(1, ch) < 1.35,
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
    // Faixa baixa — abaixo da stack de UI
    const L = this.layout || this.computeLayout();
    const uiBottom = L.settings.y + L.settings.h;
    const floor = Math.min(canvas.height - 40, uiBottom + 16);
    const ceil = canvas.height - 24;
    const baseY = floor + Math.random() * Math.max(10, ceil - floor);

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
    const r = Math.max(canvas.width, canvas.height) * 0.28 * pulse;
    const sun = ctx.createRadialGradient(sx, sy, r * 0.15, sx, sy, r);
    sun.addColorStop(0, `rgba(255, 230, 160, ${0.12 * pulse})`);
    sun.addColorStop(0.45, `rgba(255, 200, 110, ${0.05 * pulse})`);
    sun.addColorStop(1, 'rgba(255, 180, 100, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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

  drawSprite(ctx, img, box) {
    if (!box) return;
    if (img && img.complete && img.naturalWidth) {
      ctx.drawImage(img, box.x, box.y, box.w, box.h);
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

    for (let i = this.decorEnemies.length - 1; i >= 0; i--) {
      const e = this.decorEnemies[i];
      e.x -= e._menuSpeed || 1;
      e._wobbleT = (e._wobbleT || 0) + 0.035;
      e.y = e._menuBaseY + Math.sin(e._wobbleT) * 8;
      e.baseY = e._menuBaseY;
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

    ctx.fillStyle = '#5BAFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.drawSprite(ctx, IMAGES.hudMenu, L.panel);
    this.drawSunAtmosphere(ctx, L);

    for (const e of this.decorEnemies) {
      ctx.globalAlpha = e._menuAlpha ?? 0.5;
      e.draw();
      ctx.globalAlpha = 1;
    }

    // UI por cima: logo → start → config
    this.drawSprite(ctx, IMAGES.hudMenuLogo, L.logo);
    this.drawSprite(ctx, IMAGES.hudMenuStart, L.play);
    this.drawSprite(ctx, IMAGES.hudMenuConfig, L.settings);
  },

  hit(box, x, y) {
    return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
  },

  handleClick(canvasX, canvasY) {
    if (!this.active) return false;
    const now = performance.now();
    if (now - this._lastPointerAt < 120) return true;
    this._lastPointerAt = now;

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

  _onPointerEvent(e) {
    if (!this.active) return;
    if (e.type !== 'touchend' && e.button != null && e.button !== 0) return;

    let clientX;
    let clientY;
    if (e.type === 'touchend') {
      const t = e.changedTouches?.[0];
      if (!t) return;
      clientX = t.clientX;
      clientY = t.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const { x, y } = screenToCanvas(clientX, clientY);
    this.handleClick(x, y);
  },

  init() {
    const handler = (e) => this._onPointerEvent(e);
    canvas.addEventListener('pointerup', handler);
    canvas.addEventListener('click', handler);
    canvas.addEventListener('touchend', handler, { passive: true });
  },
};

export { MenuSystem };
