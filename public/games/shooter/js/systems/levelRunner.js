import { game } from '../game/state.js';
import { SpawnBridge } from './spawnBridge.js';
import { DialogSystem } from './dialog.js';
import { SaveSystem } from './save.js';
import { ASSETS } from '../core/assets.js';
import { CampaignProgress } from './campaignProgress.js';

const KNOWN_SPAWNS = new Set(['enemy', 'dive', 'tank', 'miniboss', 'formation']);
const LEVELS_BASE = 'levels/';

/**
 * Orquestra missões JSON no modo campanha.
 * Tempo de simulação só avança em game.update (respeita pause/loja/GO).
 */
const LevelRunner = {
  active: false,
  level: null,
  missionId: null,
  simTime: 0,
  fired: null,
  /** @type {Map<string, number>} tag → simTime em que foi derrotada */
  defeatedAt: null,
  /** @type {Map<string, object>} tag → entidade viva */
  tracked: null,
  /** @type {Array<{time:number, action:object, index:number}>} */
  pendingSpawns: null,
  rewardGranted: false,
  completed: false,
  _dt: 1 / 60,

  stop() {
    this.active = false;
    this.level = null;
    this.missionId = null;
    this.simTime = 0;
    this.fired = new Set();
    this.defeatedAt = new Map();
    this.tracked = new Map();
    this.pendingSpawns = [];
    this.rewardGranted = false;
    this.completed = false;
    SpawnBridge.reset();
  },

  /** Limpa entidades de combate relevantes (sem resetar player/moedas). */
  clearFieldEntities() {
    game.enemies = [];
    game.tanks = [];
    game.projectiles = [];
    game.enemyProjectiles = [];
    game.particles = [];
    game.powerUps = [];
    game.coinsDropped = [];
    game.damageTexts = [];
    game.bossActive = false;
    game.miniBoss = null;
    game.waveIntroActive = false;
  },

  validate(level) {
    if (!level || typeof level !== 'object') {
      return 'JSON inválido';
    }
    if (!level.id || typeof level.id !== 'string') {
      return 'Campo id ausente';
    }
    if (!Array.isArray(level.events)) {
      return 'Campo events deve ser um array';
    }
    for (const ev of level.events) {
      if (!ev || !ev.id) return 'Evento sem id';
      if (!ev.at || typeof ev.at !== 'object') return `Evento ${ev.id}: at inválido`;
      if (!Array.isArray(ev.actions)) return `Evento ${ev.id}: actions inválido`;
      for (const a of ev.actions) {
        if (!a || !KNOWN_SPAWNS.has(a.spawn)) {
          return `Evento ${ev.id}: spawn desconhecido (${a?.spawn})`;
        }
      }
    }
    return null;
  },

  async load(missionId) {
    const id = missionId || 'mission_01';
    try {
      const res = await fetch(`${LEVELS_BASE}${id}.json`, { cache: 'no-store' });
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status} ao carregar ${id}` };
      }
      const level = await res.json();
      const err = this.validate(level);
      if (err) return { ok: false, error: err };
      if (level.id !== id) {
        console.warn(`[LevelRunner] id do JSON (${level.id}) ≠ pedido (${id}); usando JSON`);
      }
      return { ok: true, level };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  },

  start(level) {
    this.stop();
    this.level = level;
    this.missionId = level.id;
    this.active = true;
    this.fired = new Set();
    this.defeatedAt = new Map();
    this.tracked = new Map();
    this.pendingSpawns = [];
    this.rewardGranted = false;
    this.completed = false;
    this.simTime = 0;
    SpawnBridge.reset();
  },

  isFieldClear() {
    const livingEnemies = (game.enemies || []).filter((e) => e && !e.dead);
    const livingTanks = (game.tanks || []).filter((t) => t && !t.dead);
    return livingEnemies.length === 0 && livingTanks.length === 0 && !game.bossActive;
  },

  /** Atualiza tags derrotadas a partir das entidades vivas. */
  syncDefeated() {
    const alive = new Set();
    const lists = [game.enemies || [], game.tanks || []];
    for (const list of lists) {
      for (const e of list) {
        if (!e || !e.missionTag) continue;
        if (e.dead) continue;
        alive.add(e.missionTag);
        this.tracked.set(e.missionTag, e);
      }
    }

    for (const [tag, ent] of [...this.tracked.entries()]) {
      const gone = !ent || ent.dead || !alive.has(tag);
      // Só marca derrota se a entidade já foi spawna/trackeada e sumiu/morreu
      if (gone && this.tracked.has(tag) && !this.defeatedAt.has(tag)) {
        // Confirma: não está mais viva na lista
        const stillThere = lists.some((list) =>
          list.some((e) => e && e.missionTag === tag && !e.dead)
        );
        if (!stillThere) {
          this.defeatedAt.set(tag, this.simTime);
          this.tracked.delete(tag);
        }
      }
    }
  },

  eventReady(ev) {
    if (this.fired.has(ev.id)) return false;
    const at = ev.at || {};

    if (typeof at.time === 'number') {
      if (this.simTime < at.time) return false;
    }

    if (at.afterEntityDefeated) {
      const tag = at.afterEntityDefeated;
      if (!this.defeatedAt.has(tag)) return false;
      const delay = Number(at.delay) || 0;
      if (this.simTime < this.defeatedAt.get(tag) + delay) return false;
    } else if (at.afterEvent) {
      // Fallback legado: após evento fired (não usar para chefes)
      if (!this.fired.has(at.afterEvent)) return false;
      const delay = Number(at.delay) || 0;
      // sem timestamp do fired — usa simTime gate simples via delay após fired
      // (v1: afterEntityDefeated é o caminho certo para chefes)
      if (delay > 0 && this.simTime < delay) return false;
    }

    if (ev.requireClear && !this.isFieldClear()) return false;
    return true;
  },

  fireEvent(ev) {
    this.fired.add(ev.id);
    const actions = ev.actions || [];
    for (const action of actions) {
      const jobs = SpawnBridge.expandAction(action, this.simTime);
      for (const job of jobs) {
        if (job.time <= this.simTime) {
          const ent = SpawnBridge.spawnOne(job.action, job.index);
          if (ent && ent.missionTag) {
            this.tracked.set(ent.missionTag, ent);
          }
        } else {
          this.pendingSpawns.push(job);
        }
      }
    }
  },

  processPending() {
    if (!this.pendingSpawns.length) return;
    const remain = [];
    for (const job of this.pendingSpawns) {
      if (job.time <= this.simTime) {
        const ent = SpawnBridge.spawnOne(job.action, job.index);
        if (ent && ent.missionTag) {
          this.tracked.set(ent.missionTag, ent);
        }
      } else {
        remain.push(job);
      }
    }
    this.pendingSpawns = remain;
  },

  primaryComplete() {
    const primary = this.level?.objectives?.primary;
    if (!Array.isArray(primary) || primary.length === 0) return false;
    for (const obj of primary) {
      if (obj.type === 'eliminate' && obj.tag) {
        if (!this.defeatedAt.has(obj.tag)) return false;
      } else {
        return false;
      }
    }
    return true;
  },

  checkVictory() {
    if (this.completed || !this.level) return;
    const victory = this.level.victory || { requirePrimary: true };
    if (victory.requirePrimary && !this.primaryComplete()) return;
    if (victory.clearField && !this.isFieldClear()) return;

    this.completed = true;
    this.grantRewards();
    this.onMissionComplete();
  },

  grantRewards() {
    if (this.rewardGranted) return;
    this.rewardGranted = true;
    const coins = Number(this.level?.rewards?.coins) || 0;
    if (coins > 0) {
      game.coins = (game.coins || 0) + coins;
      try {
        SaveSystem.save();
      } catch (_) {
        /* ignore */
      }
    }
  },

  onMissionComplete() {
    const name = this.level?.name || 'Missão';
    const coins = Number(this.level?.rewards?.coins) || 0;
    if (this.missionId) {
      CampaignProgress.markCompleted(this.missionId);
    }
    DialogSystem.show({
      id: `mission_complete_${this.missionId}`,
      speaker: 'Comandante',
      portrait: ASSETS.pilot_portrait,
      paused: true,
      buttonClose: 'Seleção de Missões',
      messages: [
        `${name} concluída!`,
        coins > 0 ? `Recompensa: +${coins} moedas.` : 'Bom trabalho, piloto.',
      ],
      onClose: () => {
        if (typeof game.returnToMissionSelect === 'function') {
          game.returnToMissionSelect();
        } else if (typeof game.returnToMenu === 'function') {
          game.returnToMenu();
        }
      },
    });
  },

  update() {
    if (!this.active || this.completed || !this.level) return;

    this.processPending();
    this.syncDefeated();

    for (const ev of this.level.events) {
      if (this.eventReady(ev)) {
        this.fireEvent(ev);
      }
    }

    this.checkVictory();
    this.simTime += this._dt;
  },
};

export { LevelRunner };
