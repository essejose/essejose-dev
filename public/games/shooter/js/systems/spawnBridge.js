import { canvas } from '../core/canvas.js';
import { game } from '../game/state.js';
import {
  createEnemy,
  MiniBoss,
  Tank,
  DiveEnemy,
  spawnDroneFormation,
  spawnArrowFormationGeneric,
  randomEnemyY,
} from '../entities/combat.js';

/**
 * Fachada de spawn para o Level Runner.
 * Reutiliza factories de combat.js sem alterá-las.
 * Atribui missionTag nas entidades para objetivos.
 */
const SpawnBridge = {
  _tagSeq: 0,

  reset() {
    this._tagSeq = 0;
  },

  tagEntity(entity, tag) {
    if (!entity || !tag) return entity;
    entity.missionTag = tag;
    entity.missionId = `${tag}_${++this._tagSeq}`;
    return entity;
  },

  defaultX(index = 0, spacing = 0) {
    return canvas.width + 100 + index * (spacing || 0);
  },

  /** Cria uma unidade imediatamente. Retorna a entidade (ou null). */
  spawnOne(action, index = 0) {
    if (!action || !action.spawn) return null;
    const spacing = Number(action.spacing) || 0;
    const x = action.x != null ? action.x : this.defaultX(index, spacing);
    const tag = action.tag || action.id || null;

    switch (action.spawn) {
      case 'enemy': {
        const type = action.type || 'basic';
        const y = action.y != null ? action.y : randomEnemyY();
        const enemy = createEnemy(x, y, type, {
          waveNumber: action.waveNumber || 1,
        });
        this.tagEntity(enemy, tag);
        game.enemies.push(enemy);
        return enemy;
      }
      case 'dive': {
        const enemy = new DiveEnemy(x);
        this.tagEntity(enemy, tag);
        game.enemies.push(enemy);
        return enemy;
      }
      case 'tank': {
        const tank = new Tank(x);
        this.tagEntity(tank, tag);
        game.tanks.push(tank);
        return tank;
      }
      case 'miniboss': {
        const y = action.y != null ? action.y : canvas.height / 2;
        const boss = new MiniBoss(x, y);
        this.tagEntity(boss, tag);
        game.enemies.push(boss);
        game.bossActive = true;
        return boss;
      }
      case 'formation': {
        const formation = action.formation || 'drone';
        const size = action.size || 3;
        if (formation === 'arrow') {
          spawnArrowFormationGeneric(action.type || 'drone', size);
        } else {
          spawnDroneFormation(size, action.waveNumber || 1);
        }
        // Formações são atômicas; tag opcional no primeiro da leva recente
        if (tag && game.enemies.length) {
          const last = game.enemies[game.enemies.length - 1];
          this.tagEntity(last, tag);
        }
        return null;
      }
      default:
        console.warn('[SpawnBridge] spawn desconhecido:', action.spawn);
        return null;
    }
  },

  /**
   * Expande uma action em jobs sequenciais para o Runner.
   * interval > 0 → um spawn por tick agendado; interval === 0 → todos no mesmo instante (com spacing).
   */
  expandAction(action, baseTime) {
    const jobs = [];
    if (!action || !action.spawn) return jobs;

    if (action.spawn === 'formation') {
      jobs.push({ time: baseTime, action, index: 0 });
      return jobs;
    }

    const count = Math.max(1, Number(action.count) || 1);
    const interval = Math.max(0, Number(action.interval) || 0);

    for (let i = 0; i < count; i++) {
      jobs.push({
        time: baseTime + i * interval,
        action,
        index: i,
      });
    }
    return jobs;
  },
};

export { SpawnBridge };
