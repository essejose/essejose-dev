import { canvas, ctx } from '../core/canvas.js';
import { ASSETS, IMAGES } from '../core/assets.js';
import { keys, controlMode, CONTROLSMODES } from '../core/input.js';
import { ParallaxLayer } from '../core/parallax.js';
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
import { DialogSystem } from './dialog.js';
import { ShopSystem } from './shop.js';

// ============================================
// [15] SISTEMA DE WAVES
// ============================================

const WaveConfig = {
  // Configuração de waves específicas (1-20)
  // Especifique a quantidade de cada tipo: basic, drone, bomber, sniper, shielded
  waves: {
    // Curva suave: ensina tipos um a um antes de misturar e no boss
    1: {
      basic: 4,
      boss: false,
      dialog: [{
        id: 0,
        speaker: "Piloto",
        portrait: ASSETS.pilot_portrait,
        paused: true,
        type: "tutorial",
        messages: [
          "Missão simples: limpar o espaço aéreo.",
          "WASD / setas para mover. Atire automático!",
        ],
      }],
    },
    2: {
      basic: 3,
      drone: 2,
      boss: false,
      dialog: [
        {
          id: 1,
          speaker: "Comandante",
          portrait: ASSETS.commander,
          type: "tutorial",
          paused: true,
          messages: [
            "Bem-vindo à equipe, oficial.",
            "Drones são mais rápidos — não deixe eles te cercarem.",
          ],
        },
        {
          id: 2,
          speaker: "Assistente",
          portrait: ASSETS.assistant,
          type: "tutorial",
          paused: true,
          messages: [
            "Entre as waves, abra a loja (ícone de moedas).",
            "Compre armas e upgrades com as estrelas que coletar!",
          ],
        },
      ],
    },
    3: {
      basic: 2,
      drone: 2,
      bomber: 2,
      boss: false,
      dialog: [
        {
          id: 3,
          speaker: "Comandante do Exército Rival",
          type: "tutorial",
          portrait: ASSETS.rival_commander,
          paused: true,
          messages: [
            "Olha só… o novato da escola de voo.",
            "Acha mesmo que aguenta o calor?",
            "Vou mandar meus bombers. Reze para não virar fumaça!",
            "HA HA HA!",
          ],
        },
        {
          id: 7,
          speaker: "Assistente",
          type: "tutorial",
          portrait: ASSETS.assistant,
          paused: true,
          messages: [
            "Ignore a provocação, piloto.",
            "Bombers atiram em rajada — desvie e foque um de cada vez!",
          ],
        },
      ],
    },
    4: {
      basic: 2,
      drone: 2,
      bomber: 2,
      sniper: 1,
      tanks: 1,
      boss: false,
      dialog: [{
        id: 4,
        speaker: "Assistente",
        portrait: ASSETS.assistant,
        type: "tutorial",
        paused: true,
        messages: [
          "Snipers miram em você. Tanks vêm pelo chão.",
          "Priorize o sniper — o tank é lento.",
        ],
      }],
    },
    5: {
      basic: 2,
      drone: 2,
      bomber: 1,
      sniper: 1,
      shielded: 1,
      tanks: 1,
      boss: true,
      dialog: [{
        id: 6,
        speaker: "Comandante",
        portrait: ASSETS.commander,
        type: "tutorial",
        paused: true,
        messages: [
          "Mini-boss entrando na área!",
          "Quebre o escudo dos inimigos blindados e foque o chefe.",
        ],
      }],
    },
    6: { basic: 3, drone: 2, bomber: 2, sniper: 1, shielded: 1, dive: 1, tanks: 2, boss: false },
    7: { drone: 4, bomber: 3, sniper: 2, shielded: 1, dive: 1, tanks: 2, boss: false },
    8: { basic: 3, drone: 3, bomber: 3, sniper: 2, shielded: 1, dive: 1, tanks: 3, boss: false },
    9: { basic: 2, drone: 4, bomber: 3, sniper: 3, shielded: 1, dive: 1, tanks: 3, boss: false },
    10: { drone: 4, bomber: 4, sniper: 4, shielded: 3, dive: 2, tanks: 3, boss: true },
    11: { basic: 3, drone: 4, bomber: 3, sniper: 2, shielded: 2, dive: 1, tanks: 4, boss: false },
    12: { drone: 4, bomber: 4, sniper: 4, shielded: 3, dive: 2, tanks: 4, boss: false },
    13: { basic: 2, drone: 5, bomber: 4, sniper: 3, shielded: 2, dive: 2, tanks: 4, boss: false },
    14: { drone: 5, bomber: 4, sniper: 5, shielded: 3, dive: 2, tanks: 5, boss: false },
    15: { basic: 3, drone: 5, bomber: 5, sniper: 4, shielded: 3, dive: 2, tanks: 5, boss: true },
    16: { drone: 5, bomber: 5, sniper: 5, shielded: 3, dive: 2, tanks: 5, boss: false },
    17: { basic: 2, drone: 6, bomber: 5, sniper: 4, shielded: 2, dive: 2, tanks: 6, boss: false },
    18: { drone: 6, bomber: 6, sniper: 5, shielded: 3, dive: 3, tanks: 6, boss: false },
    19: { basic: 3, drone: 6, bomber: 6, sniper: 6, shielded: 1, dive: 3, tanks: 7, boss: false },
    20: { drone: 6, bomber: 6, sniper: 6, shielded: 7, dive: 3, tanks: 8, boss: true },
  },
  
  // Configuração padrão para waves 21+ (escala infinitamente)
  getWaveConfig(wave) {
    if (this.waves[wave]) {
      return this.waves[wave];
    }
    
    // Para waves 21+, escala automaticamente com tipos variados
    const totalEnemies = Math.min(20 + Math.floor((wave - 20) * 1.5), 40);
    const tanks = Math.min(5 + Math.floor((wave - 20) / 2), 15);
    const boss = wave % 5 === 0; // Boss a cada 5 waves
    
    // Distribuição automática para waves 21+
    const basic = Math.floor(totalEnemies * 0.1);
    const drone = Math.floor(totalEnemies * 0.25);
    const bomber = Math.floor(totalEnemies * 0.25);
    const sniper = Math.floor(totalEnemies * 0.2);
    const dive = Math.min(3, 1 + Math.floor((wave - 20) / 5));
    const shielded = Math.max(
      0,
      totalEnemies - basic - drone - bomber - sniper - dive
    );

    return { basic, drone, bomber, sniper, shielded, dive, tanks, boss };
  },
  
  // Recompensa de moedas por wave
  getCoinReward(wave) {
    const baseReward = 10;
    const waveBonus = wave * 5;
    const config = this.getWaveConfig(wave);
    const bossBonus = config.boss ? 50 : 0;
    
    // Calcula total de inimigos
    const totalEnemies = (config.basic || 0) + (config.drone || 0) + 
                        (config.bomber || 0) + (config.sniper || 0) + 
                        (config.shielded || 0);
    const enemyBonus = totalEnemies * 2;
    
    return baseReward + waveBonus + bossBonus + enemyBonus;
  }
};

const WaveSystem = {
  currentWave: 1,
  waveActive: false,
  hasSpawned: false,

  /** Para spawns pendentes e volta ao estado inicial (antes de startWave). */
  reset() {
    this.waveActive = false;
    this.hasSpawned = false;
    this.currentWave = 0;
    if (game) game.waveIntroActive = false;
  },

  /**
   * Mostra diálogos em sequência; chama onDone quando terminar (ou se não houver).
   */
  showWaveDialogs(dialogs, onDone) {
    if (!dialogs) {
      onDone();
      return;
    }

    const list = Array.isArray(dialogs) ? dialogs : [dialogs];
    if (list.length === 0) {
      onDone();
      return;
    }

    let dialogIndex = 0;
    const showNext = () => {
      if (dialogIndex >= list.length) {
        onDone();
        return;
      }

      const dialog = list[dialogIndex];
      DialogSystem.show({
        speaker: dialog.speaker || "Comandante",
        portrait: dialog.portrait || IMAGES.commander || ASSETS.commander,
        messages: dialog.messages || [],
        type: dialog.type,
        id: dialog.id,
        // No briefing do início da wave, pausa para o jogador ler (exceto auto-advance explícito)
        paused: dialog.paused !== undefined ? dialog.paused : true,
        buttonNext: dialog.buttonNext,
        buttonClose: dialog.buttonClose,
        onClose: () => {
          dialogIndex++;
          setTimeout(showNext, 100);
        },
      });
    };

    showNext();
  },

  startWave(waveNumber) {
    this.currentWave = waveNumber;
    this.waveActive = true;
    this.hasSpawned = false;

    const config = WaveConfig.getWaveConfig(waveNumber);

    const beginDialogAndSpawn = () => {
      if (!this.waveActive || this.currentWave !== waveNumber) return;
      this.showWaveDialogs(config.dialog, () => {
        if (!this.waveActive || this.currentWave !== waveNumber) return;
        this.spawnWaveEnemies(waveNumber);
      });
    };

    // Decolagem só na wave 1 (e após game over / restart)
    const player = game.player;
    if (
      waveNumber === 1 &&
      player &&
      typeof player.startTakeoffIntro === "function"
    ) {
      game.waveIntroActive = true;
      player.startTakeoffIntro(() => {
        game.waveIntroActive = false;
        beginDialogAndSpawn();
      });
      return;
    }

    game.waveIntroActive = false;
    beginDialogAndSpawn();
  },
  
  spawnWaveEnemies(wave) {
    const config = WaveConfig.getWaveConfig(wave);
    
    // Cria lista de tipos de inimigos baseado na configuração
    const enemyTypes = [];
    
    // Adiciona cada tipo conforme especificado
    for (let i = 0; i < (config.basic || 0); i++) {
      enemyTypes.push('basic');
    }
    for (let i = 0; i < (config.drone || 0); i++) {
      enemyTypes.push('drone');
    }
    for (let i = 0; i < (config.bomber || 0); i++) {
      enemyTypes.push('bomber');
    }
    for (let i = 0; i < (config.sniper || 0); i++) {
      enemyTypes.push('sniper');
    }
    for (let i = 0; i < (config.shielded || 0); i++) {
      enemyTypes.push('shielded');
    }
    for (let i = 0; i < (config.dive || 0); i++) {
      enemyTypes.push('dive');
    }

    // Embaralha a lista para variar a ordem de spawn
    for (let i = enemyTypes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [enemyTypes[i], enemyTypes[j]] = [enemyTypes[j], enemyTypes[i]];
    }

    // Spawna inimigos baseado nos tipos
    let spawnedEnemies = 0;
    let formationDelay = 0;

    while (spawnedEnemies < enemyTypes.length) {
      const remaining = enemyTypes.length - spawnedEnemies;
      const enemyType = enemyTypes[spawnedEnemies];
      const formationType = Math.random();

      // Closure para capturar delay atual e tipo
      ((delay, type) => {
        setTimeout(() => {
          // Wave pode ter mudado enquanto o timeout esperava
          if (!WaveSystem.waveActive || WaveSystem.currentWave !== wave) return;

          if (type === 'dive') {
            const x = canvas.width + 50 + Math.random() * 80;
            game.enemies.push(new DiveEnemy(x));
            WaveSystem.hasSpawned = true;
          } else if (formationType < 0.3 && remaining >= 5 && type === 'drone') {
            const formation = spawnDroneFormation(Math.min(5, remaining), wave);
            if (formation) {
              const enemies = Array.isArray(formation) ? formation : [formation];
              game.enemies.push(...enemies);
              WaveSystem.hasSpawned = true;
            }
          } else {
            const x = canvas.width + 50 + Math.random() * 100;
            const y = randomEnemyY();
            game.enemies.push(createEnemy(x, y, type, { waveNumber: wave }));
            WaveSystem.hasSpawned = true;
          }
        }, delay);
      })(formationDelay, enemyType);

      if (formationType < 0.3 && remaining >= 5 && enemyType === 'drone') {
        spawnedEnemies += Math.min(5, remaining);
      } else {
        spawnedEnemies++;
      }

      formationDelay += 1500; // 1.5 segundos entre spawns
    }
    
    // Spawna todos os tanks juntos após todas as formações de inimigos
    if (config.tanks > 0) {
      setTimeout(() => {
        // Verifica se a wave ainda está ativa antes de spawnar
        if (this.waveActive && WaveSystem.currentWave === wave) {
          for (let i = 0; i < config.tanks; i++) {
            const x = canvas.width + 100 + (i * 150) + Math.random() * 100;
            game.tanks.push(new Tank(x));
            WaveSystem.hasSpawned = true; // 👈
          }
        }
      }, formationDelay + 1000); // 1 segundo após todas as formações
    }
    
    // Spawna boss depois de todos os inimigos (mas não limpa os outros inimigos)
    if (config.boss) {
      setTimeout(() => {
        // Verifica se a wave ainda está ativa antes de spawnar
        if (this.waveActive && WaveSystem.currentWave === wave) {
          game.enemies.push(new MiniBoss(canvas.width + 100, canvas.height / 2));
          WaveSystem.hasSpawned = true; // 👈
          game.bossActive = true; // Marca que há boss ativo
        }
      }, 3000 + formationDelay); // Após tudo
    }
  },
  
  checkWaveComplete() {
    if (!this.waveActive || this.currentWave <= 0) return;
    if (!this.hasSpawned) return;
    if (game.enemies.length === 0 && game.tanks.length === 0 && !game.bossActive) {
      this.waveActive = false;
      this.onWaveComplete();
    }
  },
  
  onWaveComplete() {
    // Recompensa de moedas
    const coinReward = WaveConfig.getCoinReward(this.currentWave);
    game.coins += coinReward;
    
    // Aguarda um frame antes de iniciar próxima wave (evita loop infinito)
    setTimeout(() => {
      const nextWave = this.currentWave + 1;
      this.currentWave = nextWave;
      this.waveActive = true;
      this.startWave(nextWave);
    }, 100);
  }
};

// const waves = [
//       () => spawnArrowFormationGeneric(Enemy, 5),
//       () => spawnDroneFormation(6),
//       () => game.enemies.push(new MiniBoss(canvas.width + 100, 200)),
//       () => spawnArrowFormationGeneric(SniperEnemy, 7),
//       () => {
//           spawnArrowFormationGeneric(Enemy, 3);
//           spawnArrowFormationGeneric(DroneEnemy, 6);
//       },
//       () => game.enemies.push(new MiniBoss(canvas.width + 100, 250)),
//       ];

//       let currentWave = 0;
//       let waveCountdown = 180; // 3 segundos
//       let showingWaveText = false;
//       let waveTextTimer = 60;


function novoInimigoAleatorio() {
  const tipo = Math.random();
  const x = canvas.width + Math.random() * 400;
  const y = randomEnemyY();

  if (tipo < 0.2) return [createEnemy(x, y, 'bomber')];
  if (tipo < 0.4)
    return spawnArrowFormationGeneric(
      'sniper',
      Math.floor(Math.random() * 1) + 3,
      ">"
    );
  if (tipo < 0.6)
    return spawnArrowFormationGeneric(
      'shielded',
      Math.floor(Math.random() * 3) + 3,
      "<"
    );
  if (tipo < 0.8)
    return spawnArrowFormationGeneric(
      DiveEnemy,
      Math.floor(Math.random() * 3) + 3,
      "^"
    );

  // 15% de chance de Stealth (ainda será implementado se quiser)
  // if (tipo < 0.95) return nessw StealthEnemy(x, y);

  if (tipo < 0.95) {
    return spawnArrowFormationGeneric(
      "drone",
      Math.floor(Math.random() * 12) + 12,
      "^"
    );
  }

  return null;
}

function isOverlapping(a, b, padding = 75) {
  return (
    a.x < b.x + b.width + padding &&
    a.x + a.width + padding > b.x &&
    a.y < b.y + b.height + padding &&
    a.y + a.height + padding > b.y
  );
}
function spawnWithDistance(factory, existingList, maxAttempts = 15) {
  let attempts = 0;
  while (attempts < maxAttempts) {
    const result = factory();
    if (!result) return null;

    const newEnemies = Array.isArray(result) ? result : [result];

    const hasOverlap = newEnemies.some((newEnemy) =>
      existingList.some((existing) => isOverlapping(newEnemy, existing))
    );

    if (!hasOverlap) return newEnemies;
    attempts++;
  }

  return factory();
}



export { WaveConfig, WaveSystem };
