import { canvas, screenToCanvas } from '../core/canvas.js';
import { IMAGES } from '../core/assets.js';
import { ShopSystem } from './shop.js';
import { WaveSystem } from './waves.js';
import { game } from '../game/state.js';

/** Cor de fundo dos painéis (para cobrir números estáticos dos PNGs) */
const PANEL_FILL = '#0a1424';

const WEAPON_LABELS = {
  BASIC: 'BASIC CANNON',
  SPREAD: 'SPREAD GUN',
  BURST: 'BURST RIFLE',
  LASER: 'LASER BEAM',
  MISSILE: 'MISSILE POD',
  ORBITAL: 'ORBITAL',
  MINE: 'MINE',
  TURRET: 'TURRET',
  SHIELD: 'SHIELD',
};

const AUX_COLORS = {
  ORBITAL: '#00E5FF',
  MINE: '#FF5252',
  TURRET: '#FF9800',
  SHIELD: '#69F0AE',
  MISSILE: '#448AFF',
};

/**
 * HUD no canvas — frames + valores dinâmicos.
 */
const HudSystem = {
  layout: null,
  totalWaves: 20,
  /** Contadores animados — sempre inteiros (param nos números fixos) */
  displayScore: 0,
  displayCoins: 0,

  getScale() {
    return Math.min(0.72, Math.max(0.38, canvas.width / 1600));
  },

  /** Sobe em passos inteiros até o valor real (efeito velocímetro limpo). */
  tickCounters() {
    const stepToward = (current, target) => {
      const cur = Math.round(current);
      const tgt = Math.round(target);
      if (tgt < cur) return tgt; // reset / gasto → snap
      if (cur >= tgt) return tgt;
      const gap = tgt - cur;
      // Quanto maior o gap, mais rápido — sempre inteiro
      const step = Math.max(1, Math.ceil(gap * 0.22));
      return Math.min(tgt, cur + step);
    };
    this.displayScore = stepToward(this.displayScore, game.score ?? 0);
    this.displayCoins = stepToward(this.displayCoins, game.coins ?? 0);
  },

  /** Desenha número inteiro fixo (sem reel pela metade). */
  drawOdometer(ctx, value, x, y, fontPx, fill, stroke = '#000', lineWidth = 3, padded = true) {
    const whole = Math.round(value);
    const str = padded ? this.formatScore(whole) : String(Math.max(0, whole));
    ctx.font = `bold ${fontPx}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    this.strokeFillText(ctx, str, x, y, fill, stroke, lineWidth);
  },

  computeLayout() {
    const s = this.getScale();
    const pad = Math.max(10, 16 * s);
    const gap = Math.max(4, 8 * s);

    const size = (key, nw, nh) => {
      const img = IMAGES[key];
      const w = (img?.naturalWidth || nw) * s;
      const h = (img?.naturalHeight || nh) * s;
      return { w, h };
    };

    const score = size('hudScore', 329, 125);
    const weapon = size('hudWeapon', 340, 66);
    const wave = size('hudWave', 375, 100);
    const coins = size('hudCoins', 250, 90);
    const shop = size('hudShop', 186, 92);
    const combo = size('hudCombo', 212, 105);

    // Wave um pouco mais compacto
    const waveScale = 0.88;
    wave.w *= waveScale;
    wave.h *= waveScale;

    // Combo levemente menor, ainda legível
    const comboScale = 0.92;
    combo.w *= comboScale;
    combo.h *= comboScale;

    const scoreX = pad;
    const scoreY = pad;
    const weaponX = pad;
    const weaponY = scoreY + score.h + gap;

    const waveX = (canvas.width - wave.w) / 2;
    const waveY = pad;

    const shopX = canvas.width - pad - shop.w;
    const shopY = pad;
    // Coins: painel mais largo (ícone + número + margem); colado no shop
    coins.w *= 0.98;
    const coinsOverlap = Math.max(14, 20 * s);
    const coinsX = shopX - coins.w + coinsOverlap;
    const coinsY = shopY + Math.max(0, (shop.h - coins.h) / 2);

    const comboX = canvas.width - pad - combo.w;
    const comboY = Math.max(shopY + shop.h, coinsY + coins.h) + gap;

    this.layout = {
      scale: s,
      score: { x: scoreX, y: scoreY, ...score },
      weapon: { x: weaponX, y: weaponY, ...weapon },
      wave: { x: waveX, y: waveY, ...wave },
      coins: { x: coinsX, y: coinsY, ...coins },
      shop: { x: shopX, y: shopY, ...shop },
      combo: { x: comboX, y: comboY, ...combo },
    };
    return this.layout;
  },

  drawImage(ctx, key, box) {
    const img = IMAGES[key];
    if (!img || !img.complete || !img.naturalWidth) return;
    ctx.drawImage(img, box.x, box.y, box.w, box.h);
  },

  formatScore(n) {
    const v = Math.max(0, Math.floor(n || 0));
    const padded = String(v).padStart(6, '0');
    return padded.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  strokeFillText(ctx, text, x, y, fill, stroke = '#000', lineWidth = 3) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.fillStyle = fill;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  },

  cover(ctx, x, y, w, h) {
    ctx.fillStyle = PANEL_FILL;
    ctx.fillRect(x, y, w, h);
  },

  drawScorePanel(ctx, box) {
    const { x, y, w, h, } = box;
    // Cobre valor do score e vidas
    this.cover(ctx, x + w * 0.06, y + h * 0.28, w * 0.88, h * 0.42);
    this.cover(ctx, x + w * 0.06, y + h * 0.72, w * 0.55, h * 0.22);

    const fontPx = Math.floor(h * 0.36);
    this.drawOdometer(
      ctx,
      this.displayScore,
      x + w * 0.08,
      y + h * 0.48,
      fontPx,
      '#ffffff',
      '#000',
      4,
      true
    );

    // Vidas
    const lives = game.lives ?? 0;
    const heartY = y + h * 0.84;
    const heartSize = h * 0.14;
    ctx.font = `${Math.floor(heartSize)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const hearts = Math.min(Math.max(lives, 0), 5);
    let hx = x + w * 0.08;
    for (let i = 0; i < Math.max(hearts, 1); i++) {
      ctx.fillText('❤️', hx, heartY);
      hx += heartSize * 1.15;
    }
    ctx.font = `bold ${Math.floor(h * 0.16)}px monospace`;
    this.strokeFillText(ctx, `x ${lives}`, hx + 4, heartY, '#ffffff', '#000', 3);
  },

  drawWeaponPanel(ctx, box) {
    const { x, y, w, h } = box;
    const player = game.player;
    if (!player?.primaryWeapon) return;

    const weapon = player.primaryWeapon;
    const label = WEAPON_LABELS[weapon.name] || weapon.name;
    const level = weapon.level || 1;

    // Cobre nome, LV e barra
    this.cover(ctx, x + w * 0.22, y + h * 0.12, w * 0.74, h * 0.78);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.floor(h * 0.28)}px monospace`;
    this.strokeFillText(ctx, label, x + w * 0.24, y + h * 0.32, '#ffffff', '#000', 3);

    // Badge LV
    const lvW = w * 0.16;
    const lvH = h * 0.36;
    const lvX = x + w * 0.80;
    const lvY = y + h * 0.12;
    ctx.fillStyle = '#0a1424';
    ctx.strokeStyle = '#8ab4c8';
    ctx.lineWidth = 2;
    ctx.fillRect(lvX, lvY, lvW, lvH);
    ctx.strokeRect(lvX, lvY, lvW, lvH);
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.floor(h * 0.22)}px monospace`;
    this.strokeFillText(ctx, `LV ${level}`, lvX + lvW / 2, lvY + lvH / 2, '#ffffff', '#000', 2);

    // Barra de cooldown / “energia”
    const barX = x + w * 0.24;
    const barY = y + h * 0.62;
    const barW = w * 0.54;
    const barH = h * 0.22;
    const segments = 14;
    const segGap = 2;
    const segW = (barW - segGap * (segments - 1)) / segments;

    const cd = weapon.cooldown || 1;
    const counter = weapon.cooldownCounter || 0;
    const ready = Math.max(0, Math.min(1, 1 - counter / cd));
    const filled = Math.round(ready * segments);

    for (let i = 0; i < segments; i++) {
      const sx = barX + i * (segW + segGap);
      ctx.fillStyle = i < filled ? '#3DFF6A' : '#1a2333';
      ctx.fillRect(sx, barY, segW, barH);
    }
  },

  drawAuxWeapons(ctx, weaponBox) {
    const aux = game.player?.auxiliaryWeapons;
    if (!aux || aux.length === 0) return;

    const s = this.getScale();
    const gap = Math.max(6, 10 * s);
    const pad = Math.max(10, 16 * s);
    const innerPad = Math.max(10, 14 * s);
    const chipGap = Math.max(8, 12 * s);
    const rowGap = Math.max(6, 8 * s);
    const chipH = Math.max(26, 32 * s);
    const labelColW = Math.max(42, 52 * s);
    const startY = weaponBox.y + weaponBox.h + gap;
    // Alinha com a largura do painel de arma (+ folga)
    const maxW = Math.min(weaponBox.w * 1.2, canvas.width * 0.44);
    const x = pad;
    const chipsLeft = x + innerPad + labelColW;
    const chipsRight = x + maxW - innerPad;

    // Mede chips e calcula linhas antes de desenhar o fundo
    ctx.font = `bold ${Math.floor(11 * s + 7)}px monospace`;
    const chipSizes = aux.map((weapon) => {
      const name = WEAPON_LABELS[weapon.name] || weapon.name;
      const label = `${name} Lv${weapon.level || 1}`;
      const textW = ctx.measureText(label).width;
      const chipW = Math.min(
        Math.max(textW + 20 * s, 78 * s),
        chipsRight - chipsLeft
      );
      return { weapon, label, chipW };
    });

    const rows = [];
    let row = [];
    let rowW = 0;
    chipSizes.forEach((item) => {
      const need = item.chipW + (row.length ? chipGap : 0);
      if (row.length && rowW + need > chipsRight - chipsLeft) {
        rows.push(row);
        row = [item];
        rowW = item.chipW;
      } else {
        row.push(item);
        rowW += need;
      }
    });
    if (row.length) rows.push(row);

    const panelH =
      innerPad * 2 + rows.length * chipH + Math.max(0, rows.length - 1) * rowGap;

    ctx.fillStyle = 'rgba(10, 20, 36, 0.92)';
    ctx.strokeStyle = '#8ab4c8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, startY, maxW, panelH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = `bold ${Math.floor(12 * s + 8)}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    this.strokeFillText(
      ctx,
      'AUX',
      x + innerPad,
      startY + panelH / 2,
      '#c5d4de',
      '#000',
      2
    );

    let chipY = startY + innerPad;
    rows.forEach((rowItems) => {
      let chipX = chipsLeft;
      rowItems.forEach(({ weapon, label, chipW }) => {
        const color = AUX_COLORS[weapon.name] || '#FFD600';

        ctx.fillStyle = '#121c2e';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(chipX, chipY, chipW, chipH, 6);
        ctx.fill();
        ctx.stroke();

        const cd = weapon.cooldown || 1;
        const counter = weapon.cooldownCounter || 0;
        const ready = Math.max(0, Math.min(1, 1 - counter / cd));
        const barPad = Math.max(4, 5 * s);
        ctx.fillStyle = '#1a2333';
        ctx.fillRect(chipX + barPad, chipY + chipH - 7, chipW - barPad * 2, 3);
        ctx.fillStyle = color;
        ctx.fillRect(
          chipX + barPad,
          chipY + chipH - 7,
          (chipW - barPad * 2) * ready,
          3
        );

        ctx.font = `bold ${Math.floor(11 * s + 7)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        this.strokeFillText(
          ctx,
          label,
          chipX + chipW / 2,
          chipY + chipH / 2 - 1,
          '#ffffff',
          '#000',
          2
        );

        chipX += chipW + chipGap;
      });
      chipY += chipH + rowGap;
    });
  },

  drawWavePanel(ctx, box) {
    const { x, y, w, h } = box;
    const current = WaveSystem.currentWave || 1;
    const total = this.totalWaves;

    // Só limpa a área da barra (não cobrir o texto WAVE do PNG)
    this.cover(ctx, x + w * 0.10, y + h * 0.64, w * 0.80, h * 0.24);

    const curStr = String(current).padStart(2, '0');
    const totStr = String(total).padStart(2, '0');

    // Números no espaço vazio à direita de WAVE (sem sobrepor o label)
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = `bold ${Math.floor(h * 0.36)}px monospace`;
    this.strokeFillText(ctx, curStr, x + w * 0.52, y + h * 0.36, '#FFD600', '#000', 4);

    ctx.font = `bold ${Math.floor(h * 0.26)}px monospace`;
    this.strokeFillText(ctx, `/ ${totStr}`, x + w * 0.68, y + h * 0.38, '#c5d4de', '#000', 3);

    const progress = Math.max(0, Math.min(1, current / total));
    const barX = x + w * 0.12;
    const barY = y + h * 0.68;
    const barW = w * 0.76;
    const barH = h * 0.16;
    ctx.fillStyle = '#1a2333';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#FFD600';
    ctx.fillRect(barX, barY, barW * progress, barH);
    ctx.strokeStyle = '#8ab4c8';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, barH);
  },

  drawCoinsPanel(ctx, box) {
    const { x, y, w, h } = box;
    // Número após o ícone, com margem à direita do painel
    const fontPx = Math.floor(h * 0.38);
    const numX = x + w * 0.34;
    this.drawOdometer(
      ctx,
      this.displayCoins,
      numX,
      y + h * 0.52,
      fontPx,
      '#FFD600',
      '#000',
      3,
      false
    );
  },

  /** Coins: usa quase o PNG inteiro (só corta padding mínimo à direita). */
  drawCoinsImage(ctx, box) {
    const img = IMAGES.hudCoins;
    if (!img || !img.complete || !img.naturalWidth) return;
    const srcW = img.naturalWidth * 0.98;
    ctx.drawImage(img, 0, 0, srcW, img.naturalHeight, box.x, box.y, box.w, box.h);
  },

  drawComboPanel(ctx, box) {
    const { x, y, w, h } = box;
    const combo = game.comboSystem;
    const value = combo?.combo || 0;
    const timer = combo?.comboTimer || 0;
    const timeout = combo?.comboTimeout || 180;
    const pulse = combo?.pulseScale || 1;

    // Sem cover no texto — só limpa a faixa da barra, dentro do sprite
    this.cover(ctx, x + w * 0.14, y + h * 0.64, w * 0.68, h * 0.22);

    ctx.save();
    const cx = x + w * 0.70;
    const cy = y + h * 0.34;
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.floor(h * 0.40)}px monospace`;
    this.strokeFillText(ctx, `x${value}`, 0, 0, '#FFB020', '#000', 4);
    ctx.restore();

    const progress = value > 0 ? Math.max(0, Math.min(1, timer / timeout)) : 0;
    // Barra mais curta para caber dentro da borda do sprite
    const barX = x + w * 0.16;
    const barY = y + h * 0.70;
    const barW = w * 0.64;
    const barH = h * 0.12;
    ctx.fillStyle = '#1a2333';
    ctx.fillRect(barX, barY, barW, barH);
    let barColor = '#4CAF50';
    if (progress < 0.3) barColor = '#ff4444';
    else if (progress < 0.6) barColor = '#ff8800';
    else barColor = '#FF6A00';
    ctx.fillStyle = barColor;
    ctx.fillRect(barX, barY, barW * progress, barH);
    ctx.strokeStyle = '#8ab4c8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, barY, barW, barH);
  },

  draw(ctx) {
    this.tickCounters();
    const L = this.computeLayout();
    this.drawImage(ctx, 'hudScore', L.score);
    this.drawImage(ctx, 'hudWeapon', L.weapon);
    this.drawImage(ctx, 'hudWave', L.wave);
    this.drawCoinsImage(ctx, L.coins);
    this.drawImage(ctx, 'hudShop', L.shop);

    // Valores vivos por cima dos frames
    this.drawScorePanel(ctx, L.score);
    this.drawWeaponPanel(ctx, L.weapon);
    this.drawAuxWeapons(ctx, L.weapon);
    this.drawWavePanel(ctx, L.wave);
    this.drawCoinsPanel(ctx, L.coins);

    // Combo só aparece com combo ativo
    if ((game.comboSystem?.combo || 0) > 0) {
      this.drawImage(ctx, 'hudCombo', L.combo);
      this.drawComboPanel(ctx, L.combo);
    }
  },

  hitShop(x, y) {
    const L = this.layout || this.computeLayout();
    const b = L.shop;
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  },

  /** Evita double-fire pointerup + click + touchend */
  _lastShopTapAt: 0,

  tryOpenShop(canvasX, canvasY) {
    if (game.gameOver || window.MenuSystem?.active) return false;
    if (ShopSystem.isOpen) return false;
    if (!this.hitShop(canvasX, canvasY)) return false;
    const now = performance.now();
    if (now - this._lastShopTapAt < 250) return true;
    this._lastShopTapAt = now;
    if (typeof ShopSystem.open === 'function') ShopSystem.open();
    return true;
  },

  _onPointerEvent(e) {
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
    if (this.tryOpenShop(x, y)) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }
  },

  init() {
    const handler = (e) => this._onPointerEvent(e);
    // Um caminho principal (pointer) + touchend p/ simulador; sem click extra
    // (o click sintético caía no overlay e fechava a loja na hora).
    canvas.addEventListener('pointerup', handler);
    canvas.addEventListener('touchend', handler, { passive: false });
  },
};

export { HudSystem };
