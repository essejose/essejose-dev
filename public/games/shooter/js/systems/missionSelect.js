import { canvas, screenToCanvas } from '../core/canvas.js';
import { IMAGES } from '../core/assets.js';
import { game } from '../game/state.js';
import { LevelRunner } from './levelRunner.js';
import { CampaignProgress } from './campaignProgress.js';

const CATALOG_URL = 'levels/catalog.json';
const LEVELS_BASE = 'levels/';

/**
 * Seleção de missões + briefing + erro (Canvas).
 * view: 'list' | 'briefing' | 'error'
 */
const MissionSelectSystem = {
  active: false,
  /** @type {'list'|'briefing'|'error'} */
  view: 'list',
  layout: null,
  catalog: null,
  /** @type {Array<{entry:object, level:object|null, status:string, error?:string}>} */
  cards: [],
  selectedLevel: null,
  selectedEntry: null,
  errorMessage: '',
  loading: false,
  _lastPointerAt: 0,

  show(view = 'list') {
    this.active = true;
    this.view = view || 'list';
    this.layout = null;
    this.selectedLevel = null;
    this.selectedEntry = null;
    this.errorMessage = '';
    if (this.view === 'list') {
      this.loadCatalog();
    }
  },

  hide() {
    this.active = false;
    this.view = 'list';
    this.layout = null;
    this.catalog = null;
    this.cards = [];
    this.selectedLevel = null;
    this.selectedEntry = null;
    this.errorMessage = '';
    this.loading = false;
  },

  async loadCatalog() {
    this.loading = true;
    this.cards = [];
    this.errorMessage = '';
    try {
      const res = await fetch(CATALOG_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} ao carregar catálogo`);
      const data = await res.json();
      if (!data || !Array.isArray(data.missions)) {
        throw new Error('Catálogo inválido');
      }
      this.catalog = data;
      const completed = CampaignProgress.load();
      const cards = [];
      for (const entry of data.missions) {
        const status = !entry.available
          ? 'bloqueada'
          : completed.includes(String(entry.id))
            ? 'concluida'
            : 'disponivel';
        let level = null;
        let error;
        try {
          const file = entry.file || `${entry.id}.json`;
          const lr = await fetch(`${LEVELS_BASE}${file}`, { cache: 'no-store' });
          if (!lr.ok) throw new Error(`HTTP ${lr.status}`);
          level = await lr.json();
          const verr = LevelRunner.validate(level);
          if (verr) throw new Error(verr);
        } catch (e) {
          error = e?.message || String(e);
          level = null;
        }
        cards.push({ entry, level, status, error });
      }
      cards.sort((a, b) => (a.entry.order || 0) - (b.entry.order || 0));
      this.cards = cards;
      this.view = 'list';
    } catch (e) {
      this.view = 'error';
      this.errorMessage = e?.message || String(e);
      this.cards = [];
    } finally {
      this.loading = false;
      this.layout = null;
    }
  },

  openBriefing(card) {
    if (!card || card.status === 'bloqueada') return;
    if (!card.level) {
      this.view = 'error';
      this.errorMessage = card.error || 'Não foi possível carregar a missão.';
      this.selectedLevel = null;
      this.selectedEntry = card.entry;
      this.layout = null;
      return;
    }
    this.selectedLevel = card.level;
    this.selectedEntry = card.entry;
    this.view = 'briefing';
    this.layout = null;
  },

  backFromBriefing() {
    this.selectedLevel = null;
    this.selectedEntry = null;
    this.view = 'list';
    this.layout = null;
  },

  backToMenu() {
    if (typeof game.returnToMenu === 'function') {
      game.returnToMenu();
    } else {
      this.hide();
    }
  },

  startSelectedMission() {
    if (!this.selectedLevel) return;
    const level = this.selectedLevel;
    this.hide();
    if (typeof game.beginMission === 'function') {
      game.beginMission(level);
    }
  },

  hit(box, x, y) {
    return box && x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
  },

  wrapText(ctx, text, maxWidth) {
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  },

  computeLayout() {
    const cw = canvas.width;
    const ch = canvas.height;
    const bg = IMAGES.hudMenu;
    const nw = bg?.naturalWidth || 1669;
    const nh = bg?.naturalHeight || 942;
    const bgScale = Math.max(cw / nw, ch / nh);
    const panelW = nw * bgScale;
    const panelH = nh * bgScale;
    const panelX = (cw - panelW) / 2;
    const panelY = (ch - panelH) / 2;

    const btnW = Math.min(cw * 0.36, 280);
    const btnH = Math.max(36, Math.min(ch * 0.07, 52));

    if (this.view === 'list') {
      const cardW = Math.min(cw * 0.55, 420);
      const cardH = Math.min(ch * 0.38, 220);
      const cardX = (cw - cardW) / 2;
      const cardY = ch * 0.28;
      const cards = this.cards.map((c, i) => ({
        ...c,
        box: {
          x: cardX,
          y: cardY + i * (cardH + ch * 0.02),
          w: cardW,
          h: cardH,
        },
      }));
      this.layout = {
        panel: { x: panelX, y: panelY, w: panelW, h: panelH },
        title: { x: cw / 2, y: ch * 0.16 },
        cards,
        back: {
          x: (cw - btnW) / 2,
          y: ch * 0.88 - btnH,
          w: btnW,
          h: btnH,
          label: 'VOLTAR',
        },
      };
      return this.layout;
    }

    if (this.view === 'briefing') {
      const panelBw = Math.min(cw * 0.72, 520);
      const panelBh = Math.min(ch * 0.72, 420);
      const px = (cw - panelBw) / 2;
      const py = (ch - panelBh) / 2;
      const gap = 12;
      const startBtn = {
        x: px + panelBw * 0.08,
        y: py + panelBh - btnH - 20,
        w: (panelBw - panelBw * 0.16 - gap) / 2,
        h: btnH,
        label: 'INICIAR MISSÃO',
      };
      const backBtn = {
        x: startBtn.x + startBtn.w + gap,
        y: startBtn.y,
        w: startBtn.w,
        h: btnH,
        label: 'VOLTAR',
      };
      this.layout = {
        panel: { x: panelX, y: panelY, w: panelW, h: panelH },
        brief: { x: px, y: py, w: panelBw, h: panelBh },
        start: startBtn,
        back: backBtn,
      };
      return this.layout;
    }

    // error
    const panelBw = Math.min(cw * 0.7, 480);
    const panelBh = Math.min(ch * 0.4, 240);
    this.layout = {
      panel: { x: panelX, y: panelY, w: panelW, h: panelH },
      brief: {
        x: (cw - panelBw) / 2,
        y: (ch - panelBh) / 2,
        w: panelBw,
        h: panelBh,
      },
      back: {
        x: (cw - btnW) / 2,
        y: (ch - panelBh) / 2 + panelBh - btnH - 20,
        w: btnW,
        h: btnH,
        label: 'VOLTAR',
      },
    };
    return this.layout;
  },

  drawButton(ctx, box) {
    if (!box) return;
    ctx.save();
    ctx.fillStyle = 'rgba(8, 16, 32, 0.75)';
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.strokeStyle = 'rgba(255, 220, 120, 0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x + 1, box.y + 1, box.w - 2, box.h - 2);
    ctx.fillStyle = '#FFE9A8';
    ctx.font = `bold ${Math.max(12, Math.floor(box.h * 0.36))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(box.label || '', box.x + box.w / 2, box.y + box.h / 2);
    ctx.restore();
  },

  drawBg(ctx, L) {
    ctx.fillStyle = '#5BAFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const img = IMAGES.hudMenu;
    if (img && img.complete && img.naturalWidth) {
      ctx.drawImage(img, L.panel.x, L.panel.y, L.panel.w, L.panel.h);
    }
    ctx.fillStyle = 'rgba(0, 10, 30, 0.35)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  },

  drawCard(ctx, card) {
    const b = card.box;
    const locked = card.status === 'bloqueada';
    const level = card.level;
    ctx.save();
    if (locked) ctx.globalAlpha = 0.45;

    ctx.fillStyle = 'rgba(8, 20, 40, 0.82)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle =
      card.status === 'concluida'
        ? 'rgba(120, 220, 140, 0.95)'
        : 'rgba(255, 220, 120, 0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);

    // Thumbnail / placeholder
    const thumbH = b.h * 0.38;
    const thumbY = b.y + 12;
    const thumbX = b.x + 12;
    const thumbW = b.w - 24;
    ctx.fillStyle = 'rgba(40, 80, 140, 0.55)';
    ctx.fillRect(thumbX, thumbY, thumbW, thumbH);
    ctx.fillStyle = 'rgba(200, 230, 255, 0.35)';
    ctx.font = `bold ${Math.floor(thumbH * 0.35)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const num = level?.number ?? card.entry.order ?? 1;
    ctx.fillText(`#${String(num).padStart(2, '0')}`, thumbX + thumbW / 2, thumbY + thumbH / 2);

    const textX = b.x + 16;
    let textY = thumbY + thumbH + 18;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFE9A8';
    ctx.font = `bold ${Math.max(14, Math.floor(b.h * 0.1))}px sans-serif`;
    ctx.fillText(level?.name || card.entry.id || 'Missão', textX, textY);

    textY += Math.max(18, b.h * 0.1);
    ctx.fillStyle = '#c5d4de';
    ctx.font = `${Math.max(11, Math.floor(b.h * 0.07))}px sans-serif`;
    const desc = level?.description || (card.error ? `Erro: ${card.error}` : '—');
    const lines = this.wrapText(ctx, desc, b.w - 32).slice(0, 2);
    for (const line of lines) {
      ctx.fillText(line, textX, textY);
      textY += Math.max(14, b.h * 0.075);
    }

    // Badge
    const badge =
      card.status === 'bloqueada'
        ? 'BLOQUEADA'
        : card.status === 'concluida'
          ? 'CONCLUÍDA'
          : 'DISPONÍVEL';
    const badgeColor =
      card.status === 'bloqueada'
        ? '#888'
        : card.status === 'concluida'
          ? '#7CFF9A'
          : '#FFD600';
    ctx.fillStyle = badgeColor;
    ctx.font = `bold ${Math.max(10, Math.floor(b.h * 0.065))}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(badge, b.x + b.w - 14, b.y + b.h - 14);

    ctx.restore();
  },

  drawList(ctx) {
    const L = this.computeLayout();
    this.drawBg(ctx, L);

    ctx.fillStyle = '#FFE9A8';
    ctx.font = `bold ${Math.max(22, Math.floor(canvas.height * 0.055))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeText('MISSÕES', L.title.x, L.title.y);
    ctx.fillText('MISSÕES', L.title.x, L.title.y);

    if (this.loading) {
      ctx.fillStyle = '#fff';
      ctx.font = '16px sans-serif';
      ctx.fillText('Carregando…', canvas.width / 2, canvas.height / 2);
    } else if (!this.cards.length) {
      ctx.fillStyle = '#ccc';
      ctx.font = '16px sans-serif';
      ctx.fillText('Nenhuma missão no catálogo.', canvas.width / 2, canvas.height / 2);
    } else {
      for (const card of L.cards) {
        this.drawCard(ctx, card);
      }
    }

    this.drawButton(ctx, L.back);
  },

  drawBriefing(ctx) {
    const L = this.computeLayout();
    this.drawBg(ctx, L);
    const level = this.selectedLevel;
    const b = L.brief;

    ctx.fillStyle = 'rgba(6, 14, 28, 0.92)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(255, 220, 120, 0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);

    const pad = 20;
    let y = b.y + pad + 8;
    const num = level?.number ?? this.selectedEntry?.order ?? 1;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#FFE9A8';
    ctx.font = `bold ${Math.max(18, Math.floor(b.h * 0.07))}px sans-serif`;
    ctx.fillText(`Missão ${String(num).padStart(2, '0')}`, b.x + pad, y);
    y += 28;
    ctx.font = `bold ${Math.max(16, Math.floor(b.h * 0.06))}px sans-serif`;
    ctx.fillText(level?.name || 'Missão', b.x + pad, y);
    y += 30;

    ctx.fillStyle = '#c5d4de';
    ctx.font = `${Math.max(13, Math.floor(b.h * 0.045))}px sans-serif`;
    const descLines = this.wrapText(ctx, level?.description || '', b.w - pad * 2);
    for (const line of descLines.slice(0, 4)) {
      ctx.fillText(line, b.x + pad, y);
      y += 18;
    }
    y += 12;

    ctx.fillStyle = '#FFD600';
    ctx.font = `bold ${Math.max(13, Math.floor(b.h * 0.045))}px sans-serif`;
    ctx.fillText('Objetivos', b.x + pad, y);
    y += 22;
    ctx.fillStyle = '#e8f0f8';
    ctx.font = `${Math.max(12, Math.floor(b.h * 0.04))}px sans-serif`;
    const objs = level?.objectives?.primary || [];
    if (!objs.length) {
      ctx.fillText('—', b.x + pad, y);
      y += 18;
    } else {
      for (const o of objs) {
        const label = o.label || o.id || 'Objetivo';
        ctx.fillText(`• ${label}`, b.x + pad, y);
        y += 18;
      }
    }
    y += 10;

    const coins = Number(level?.rewards?.coins) || 0;
    ctx.fillStyle = '#FFD600';
    ctx.font = `bold ${Math.max(13, Math.floor(b.h * 0.045))}px sans-serif`;
    ctx.fillText(
      coins > 0 ? `Recompensa: +${coins} moedas` : 'Recompensa: —',
      b.x + pad,
      y
    );

    this.drawButton(ctx, L.start);
    this.drawButton(ctx, L.back);
  },

  drawError(ctx) {
    const L = this.computeLayout();
    this.drawBg(ctx, L);
    const b = L.brief;
    ctx.fillStyle = 'rgba(6, 14, 28, 0.92)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);

    ctx.fillStyle = '#ff8a8a';
    ctx.font = `bold ${Math.max(16, Math.floor(b.h * 0.1))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Erro ao carregar', b.x + b.w / 2, b.y + b.h * 0.28);

    ctx.fillStyle = '#c5d4de';
    ctx.font = `${Math.max(12, Math.floor(b.h * 0.07))}px sans-serif`;
    const lines = this.wrapText(ctx, this.errorMessage || 'Erro desconhecido', b.w - 40);
    let y = b.y + b.h * 0.45;
    for (const line of lines.slice(0, 3)) {
      ctx.fillText(line, b.x + b.w / 2, y);
      y += 18;
    }

    this.drawButton(ctx, L.back);
  },

  update() {
    // Sem animação obrigatória na v1
  },

  draw(ctx) {
    if (!this.active) return;
    if (this.view === 'briefing') this.drawBriefing(ctx);
    else if (this.view === 'error') this.drawError(ctx);
    else this.drawList(ctx);
  },

  handleClick(canvasX, canvasY) {
    if (!this.active) return false;
    const now = performance.now();
    if (now - this._lastPointerAt < 120) return true;
    this._lastPointerAt = now;

    const L = this.layout || this.computeLayout();

    if (this.view === 'list') {
      if (this.hit(L.back, canvasX, canvasY)) {
        this.backToMenu();
        return true;
      }
      for (const card of L.cards || []) {
        if (this.hit(card.box, canvasX, canvasY)) {
          this.openBriefing(card);
          return true;
        }
      }
      return false;
    }

    if (this.view === 'briefing') {
      if (this.hit(L.start, canvasX, canvasY)) {
        this.startSelectedMission();
        return true;
      }
      if (this.hit(L.back, canvasX, canvasY)) {
        this.backFromBriefing();
        return true;
      }
      return false;
    }

    // error
    if (this.hit(L.back, canvasX, canvasY)) {
      if (this.catalog) {
        this.view = 'list';
        this.errorMessage = '';
        this.layout = null;
      } else {
        this.backToMenu();
      }
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

export { MissionSelectSystem };
