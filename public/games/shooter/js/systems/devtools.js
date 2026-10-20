import { canvas, ctx } from '../core/canvas.js';
import { ASSETS, IMAGES } from '../core/assets.js';
import { keys, controlMode, CONTROLSMODES } from '../core/input.js';
import { ParallaxLayer } from '../core/parallax.js';
import { game } from '../game/state.js';

import { createEnemy, MiniBoss, Tank, DiveEnemy, spawnArrowFormationGeneric, spawnDroneFormation } from '../entities/combat.js';
import { DialogSystem } from './dialog.js';
import { WaveSystem } from './waves.js';

// ============================================
// [20] DEV TOOLS (Debug Panel)
// ============================================

const DevTools = {
  init() {
    const closeBtn = document.getElementById('closeDevPanel');
    closeBtn.addEventListener('click', () => this.toggleDevPanel());
    
    // Atualiza info a cada frame
    setInterval(() => {
      if (game.devMode) {
        document.getElementById('devEnemyCount').textContent = game.enemies.length;
        document.getElementById('devProjectileCount').textContent = game.projectiles.length;
        document.getElementById('devWaveCount').textContent = WaveSystem.currentWave;
      }
    }, 100);
  },
  
  toggleDevPanel() {
    game.devMode = !game.devMode;
    const panel = document.getElementById('devPanel');
    panel.style.display = game.devMode ? 'block' : 'none';
    console.log('Dev Mode:', game.devMode ? 'ON' : 'OFF');
  },
  
  togglePause() {
    game.isPaused = !game.isPaused;
    console.log('Game paused:', game.isPaused);
  },
  
  clearEnemies() {
    game.enemies = [];
    game.tanks = [];
    game.miniBoss = null;
    game.bossActive = false;
    // Limpa também projéteis inimigos
    game.enemyProjectiles = [];
    console.log('All enemies cleared');
  },
  
  addCoins(amount) {
    game.coins += amount;
    console.log('Added', amount, 'coins. Total:', game.coins);
  },
  
  forceDeath() {
    game.player.die();
    console.log('💀 Forçando animação de morte do player...');
  },
  
  testDialog() {
    DialogSystem.show({
      speaker: "Comandante",
      portrait: "./images/player.png",
      messages: [
        "Bem-vindo, piloto!",
        "Você está pronto para a missão?",
        "Boa sorte lá fora!"
      ],
      onClose: () => {
        console.log("✅ Diálogo de teste fechado!");
      }
    });
  },
  
  testDialogWithChoices() {
    DialogSystem.show({
      speaker: "Comandante",
      portrait: "./images/player.png",
      messages: [
        "Você aceita esta missão perigosa?"
      ],
      choices: [
        {
          text: "Sim, vou aceitar!",
          action: () => {
            console.log("✅ Aceitou a missão!");
            game.coins += 50;
          }
        },
        {
          text: "Preciso pensar...",
          action: () => {
            console.log("❌ Recusou por enquanto.");
            
          }
        },
        {
          text: "Quanto vou ganhar?",
          action: () => {
            console.log("💰 Perguntou sobre o pagamento!");
            DialogSystem.show({
              speaker: "Comandante",
              portrait: "./images/player.png",
              messages: [
                "Você receberá 100 moedas se completar a missão!"
              ]
            });
          }
        }
      ]
    });
  },
  
  testDialogConversation() {
    // Inicia a conversa com o Comandante
    // Usando IMAGES diretamente (já carregado) - mais performático!
    DialogSystem.show({
      speaker: "Comandante",
      portrait: IMAGES.commander || ASSETS.commander, // Usa imagem carregada ou fallback
      buttonNext: "Continuar",
      buttonClose: "Entendi",
      messages: [
        "Assistente, qual é o status da missão?"
      ],
      onClose: () => {
        // Continua com o Assistente
        DialogSystem.show({
          speaker: "Assistente",
          portrait: IMAGES.assistant || ASSETS.assistant, // Usa imagem carregada ou fallback
          buttonNext: "Prosseguir",
          buttonClose: "Fechar",
          messages: [
            "Comandante, a situação está crítica!",
            "Nossos sensores detectaram múltiplas formações inimigas se aproximando.",
            "A área de operação está completamente cercada."
          ],
          onClose: () => {
            // Volta para o Comandante
            DialogSystem.show({
              speaker: "Comandante",
              portrait: IMAGES.commander || ASSETS.commander,
              buttonNext: "Avançar",
              buttonClose: "Ok",
              messages: [
                "E quanto às nossas defesas?",
                "Temos algum sistema de apoio disponível?"
              ],
              onClose: () => {
                // Assistente responde
                DialogSystem.show({
                  speaker: "Assistente",
                  portrait: IMAGES.assistant || ASSETS.assistant,
                  buttonNext: "Próximo",
                  buttonClose: "Fechar",
                  messages: [
                    "Infelizmente, nosso sistema de defesa está operando em 30% da capacidade.",
                    "Mas temos uma boa notícia: o piloto pode coletar power-ups no campo de batalha.",
                    "Além disso, a loja de equipamentos está disponível para upgrades."
                  ],
                  onClose: () => {
                    // Comandante finaliza
                    DialogSystem.show({
                      speaker: "Comandante",
                      portrait: IMAGES.commander || ASSETS.commander,
                      buttonNext: "Continuar",
                      buttonClose: "Começar Missão",
                      messages: [
                        "Entendido. Piloto, você ouviu tudo.",
                        "Esta será uma missão difícil, mas temos fé em você.",
                        "Boa sorte lá fora!"
                      ],
                      onClose: () => {
                        console.log("✅ Conversa de teste concluída!");
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  },
  
  spawnEnemy(type) {
    const spawnX = canvas.width - 50;
    const spawnY = canvas.height / 2;
    
    let enemy;
    switch(type) {
      case 'Enemy':
        enemy = createEnemy(spawnX, spawnY, 'basic');
        game.enemies.push(enemy);
        break;
      case 'DroneEnemy':
        enemy = createEnemy(spawnX, spawnY, 'drone');
        game.enemies.push(enemy);
        break;
      case 'BomberEnemy':
        enemy = createEnemy(spawnX, spawnY, 'bomber');
        game.enemies.push(enemy);
        break;
      case 'SniperEnemy':
        enemy = createEnemy(spawnX, spawnY, 'sniper');
        game.enemies.push(enemy);
        break;
      case 'DiveEnemy':
        enemy = new DiveEnemy(spawnX, spawnY); // Dive precisa de lógica especial
        game.enemies.push(enemy);
        break;
      case 'ShieldedEnemy':
        enemy = createEnemy(spawnX, spawnY, 'shielded');
        game.enemies.push(enemy);
        break;
      case 'MiniBoss':
        enemy = new MiniBoss(spawnX, spawnY);
        game.enemies.push(enemy);
        break;
      case 'Tank':
        enemy = new Tank(spawnX, spawnY);
        game.tanks.push(enemy);
        break;
    }
    
    console.log('Spawned:', type);
  },
  
  spawnFormation(type) {
    if (type === 'arrow') {
      const formation = spawnArrowFormationGeneric('drone', 5);
      if (formation) game.enemies.push(...(Array.isArray(formation) ? formation : [formation]));
    } else if (type === 'drone') {
      const formation = spawnDroneFormation(5);
      if (formation) game.enemies.push(...(Array.isArray(formation) ? formation : [formation]));
    }
  }
};

// Atalho de teclado para abrir dev panel (tecla P)
document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyP' && !e.repeat) {
    DevTools.toggleDevPanel();
  }
});



export { DevTools };
