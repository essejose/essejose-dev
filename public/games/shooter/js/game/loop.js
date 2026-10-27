import { canvas, ctx } from '../core/canvas.js';
import { ASSETS, IMAGES } from '../core/assets.js';
import { keys, controlMode, CONTROLSMODES } from '../core/input.js';
import { ParallaxLayer, drawAtmosphereLighting } from '../core/parallax.js';
import { game } from '../game/state.js';

import {
  Player,
  DamageText,
  HitEffectManager,
  CoinDrop,
  PowerUp,
  WeaponPowerUp,
  DropInstance,
  MiniBoss,
  createExplosion,
  ExplosionParticle,
  MAX_COINS_ON_SCREEN,
} from '../entities/combat.js';
import { ComboSystem } from '../systems/combo.js';
import { CountdownSystem } from '../systems/countdown.js';
import { SaveSystem } from '../systems/save.js';
import { DialogSystem } from '../systems/dialog.js';
import { WaveSystem } from '../systems/waves.js';
import { ShopSystem } from '../systems/shop.js';
import { HudSystem } from '../systems/hud.js';
import { GameOverSystem } from '../systems/gameover.js';
import { MenuSystem } from '../systems/menu.js';
import { JoystickSystem } from '../systems/joystick.js';
import { PerfProfiler } from '../systems/profiler.js';
// Collision helpers: ./collisions.js (aabbOverlap, distSq)

// ============================================
// [21] GAME LOOP (Objeto Principal)
// ============================================

Object.assign(game, {
  debug: false, // Modo debug (ativa/desativa informações na tela)
  devMode: false, // Modo desenvolvedor (painel de teste de inimigos)
  player: new Player(),
  projectiles: [],
  enemyProjectiles: [],
  enemies: [],
  tanks: [],
  powerUps: [],
  coinsDropped: [],
  grassXs: [],
  footprintX: 0,
  parallaxLayers: [],
  comboSystem: new ComboSystem(),
  countdownSystem: new CountdownSystem(),
  score: 0,
  coins: 0, // Moedas coletadas
  lives: 3, // Vidas restantes
  highScore: 0,
  highWave: 0,
  // Upgrades permanentes
  upgrades: {
    damage: 0,      // Nível de upgrade de dano (0-5)
    speed: 0,       // Nível de upgrade de velocidade (0-5)
    maxHealth: 0,   // Nível de upgrade de vida máxima (0-5)
    fireRate: 0,    // Nível de upgrade de taxa de tiro (0-5)
    regen: false    // Regeneração (true/false)
  },
  fps: 60,
  lastFrameTime: 0,
  gameOver: false,
  gameOverEventSent: false,
  isPaused: false,
  damageTexts: [],
  regenTimer: 0, // Timer para regeneração (600 frames = 10 segundos a 60fps)
  miniBoss: null,
  bossTimer: 2500,
  bossActive: false,
  particles: [],

  init() {
    // Carrega save antes de resetar
    const saveData = SaveSystem.load();

    this.reset();

    // Aplica save carregado
    if (saveData) {
      SaveSystem.applyLoad(saveData);
    } else {
      const highs = SaveSystem.loadHighs?.();
      if (highs) {
        this.highScore = highs.highScore || 0;
        this.highWave = highs.highWave || 0;
      }
    }

    // Menu primeiro — Jogar inicia a run
    this.isPaused = true;
    MenuSystem.show();
    this.loop(0);
  },

  /** Sai do menu e começa a partida (countdown → wave 1). */
  startFromMenu() {
    MenuSystem.hide();
    this.gameOver = false;
    GameOverSystem.hide();
    this.reset();
    this.isPaused = true;
    this.countdownSystem.start(() => {
      this.isPaused = false;
      WaveSystem.startWave(1);
    }, "");
  },

  /** Volta ao menu a partir do Game Over (botão MENU). */
  returnToMenu() {
    GameOverSystem.hide();
    this.gameOver = false;
    WaveSystem.reset();
    this.enemies = [];
    this.tanks = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.bossActive = false;
    this.isPaused = true;
    MenuSystem.show();
  },

  handleGameOver() {
    this.gameOver = true;
    this.lives--;
    
    // Atualiza high score e high wave
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }
    if (WaveSystem.currentWave > this.highWave) {
      this.highWave = WaveSystem.currentWave;
    }
    
    if (this.lives <= 0) {
      // Game over definitivo — painel com Retry/Menu (ambos reiniciam por enquanto)
      DialogSystem.show({
        id: 5,
        speaker: "Comandante do Exército Rival",
        paused: false,
        portrait: ASSETS.rival_commander,
        messages: ["HA HA HA!"],
      });

      SaveSystem.clear();
      GameOverSystem.show();
    } else {
      // Ainda tem vidas — painel "VOCÊ MORREU" (clique ou auto ~2.5s)
      SaveSystem.save();
      GameOverSystem.showDie();
    }
  },

  /** Continua após morte com vidas restantes. */
  continueAfterDeath() {
    if (!this.gameOver || this.lives <= 0) return;
    GameOverSystem.hide();
    this.reset();
    this.gameOver = false;
    WaveSystem.reset();
    WaveSystem.startWave(1);
  },

  /** Restart completo da run (Retry / Menu do painel de game over). */
  restartRun() {
    this.lives = 3;
    this.coins = 0;
    localStorage.removeItem('shooter_tutorials_executed');
    // Mantém highScore / highWave
    GameOverSystem.hide();
    this.reset();
    this.gameOver = false;
    WaveSystem.reset();
    this.isPaused = true;
    this.countdownSystem.start(() => {
      this.isPaused = false;
      WaveSystem.startWave(1);
    }, "");
  },

  reset() {
    this.player = new Player();
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.powerUps = [];
    this.coinsDropped = [];
    this.enemies = [];
    this.tanks = [];
    this.bossActive = false;
    this.particles = [];
    this.waveIntroActive = false;
    // NÃO reseta moedas e vidas (são persistentes)

    // Inicializa camadas de parallax (da mais distante para a mais próxima)
    // y negativo sobe a arte p/ cobrir faixa clara no topo da imagem
    // Alpha: profundidade visual (distante mais suave → perto opaco)
    const parallaxY = -36;
    this.parallaxLayers = [
      new ParallaxLayer(IMAGES.parallax1, 0.2, parallaxY, 0.88),
      new ParallaxLayer(IMAGES.parallax2, 0.4, parallaxY, 0.92),
      new ParallaxLayer(IMAGES.parallax3, 0.6, parallaxY, 0.95),
      new ParallaxLayer(IMAGES.parallax4, 0.8, parallaxY, 0.97),
      new ParallaxLayer(IMAGES.parallax5, 1.0, parallaxY, 1),
      new ParallaxLayer(IMAGES.parallax6, 1.5, parallaxY, 1),
    ];
    
    // Ajusta velocidade do parallax baseado no modo de controle inicial
    this.parallaxLayers.forEach(layer => layer.updateSpeed(controlMode));

    // for (let i = 0; i < 3; i++) {
    //   const result = spawnWithDistance(
    //     () => new Tank(canvas.width + i * 400),
    //     [...this.enemies, ...this.tanks]
    //   );
    //   if (result) {
    //     const tanks = Array.isArray(result) ? result : [result];
    //     this.tanks.push(...tanks);
    //   }
    // }

    this.grassXs = Array.from(
      { length: Math.ceil(canvas.width / 20) + 2 },
      (_, i) => i * 20
    );
    this.footprintX = 0;
    this.score = 0;
    this.gameOver = false;
    this.gameOverEventSent = false;
    this.damageTexts = [];
    this.comboSystem.reset();
  },

  update() {
    if (MenuSystem.active) {
      MenuSystem.update();
      return;
    }

    if (this.gameOver) return;
    
      // Não atualiza o jogo se o player está morrendo
    if (this.player.isDying) return;

    // Intro de decolagem: só heli + parallax leve
    if (this.waveIntroActive) {
      this.player.updateTakeoffIntro();
      if (this.parallaxLayers) {
        this.parallaxLayers.forEach((layer) => layer.update());
      }
      if (typeof this.footprintX === "number") {
        this.footprintX -= 0.6;
      }
      return;
    }
    
    // Verifica se a wave foi completada
  
  
    WaveSystem.checkWaveComplete();
    
    this.player.update();
    game.player.targetX = null;
    game.player.targetY = null;
    
    // Sistema de regeneração
    if (game.upgrades.regen && this.player.health < this.player.maxHealth) {
      this.regenTimer++;
      if (this.regenTimer >= 600) { // 10 segundos a 60fps
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
        this.regenTimer = 0;
        // Feedback visual
        game.damageTexts.push(new DamageText(this.player.x, this.player.y - 20, "+1 HP", "#00ff00"));
      }
    } else {
      this.regenTimer = 0;
    }
    
    this.comboSystem.update();
    this.damageTexts.forEach((dt) => dt.update());
    this.damageTexts = this.damageTexts.filter((dt) => dt.isAlive());

    game.projectiles = game.projectiles.filter((p) => !p.dead);
    game.particles = game.particles.filter((p) => !p.dead);
    game.particles.forEach((p) => p.update());

    this.projectiles.forEach((p) => p.update());
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    this.projectiles = this.projectiles.filter(
      (p) =>
        p.x < canvas.width && p.y + p.height > 0 && p.y < canvas.height
    );

    this.enemyProjectiles.forEach((p) => p.update());
    this.enemyProjectiles = this.enemyProjectiles.filter(
      (p) =>
        p.x + p.width > 0 && p.y + p.height > 0 && p.y < canvas.height
    );



    // Checa se acabou a wave
  // Sistema de Waves (com proteção)
  // if (!showingWaveText && currentWave < waves.length) {
  // // Só conta se não há inimigos vivos
  // if (game.enemies.length === 0) {
  //     waveCountdown--;

  //     if (waveCountdown <= 0) {
  //     const waveFn = waves[currentWave];
  //     if (typeof waveFn === "function") {
  //         const result = waveFn();
  //         if (Array.isArray(result)) game.enemies.push(...result);
  //     }
  //     currentWave++;
  //     showingWaveText = true;
  //     waveTextTimer = 60;
  //     waveCountdown = 180;
  //     }
  // }
  // }

     this.enemies.forEach((e) => e.update());
  //   console.log(this.enemies.length);
    // DESABILITADO: Spawn aleatório desabilitado, agora controlado por waves
    // if (
    //   this.enemies.length < 7 + this.score / 100 &&
    //   Math.random() < 0.005 &&
    //   !this.bossActive
    // ) {
    //   const result = spawnWithDistance(
    //     () => novoInimigoAleatorio(),
    //     this.enemies
    //   );
    //   if (result) {
    //     const newEnemies = Array.isArray(result) ? result : [result];
    //     this.enemies.push(...newEnemies); // ✅ garante que sempre são elementos individuais
    //   }
    // }
    this.enemies = this.enemies.filter(
      (e) =>
        !e.dead &&
        (e.isDying ||
          (e.x + e.width > 0 && e.y + e.height > 0 && e.y < canvas.height))
    );

    this.tanks.forEach((t) => t.update());

    // DESABILITADO: Spawn aleatório de tanks desabilitado, agora controlado por waves
    // if (
    //   this.tanks.length < 3 &&
    //   Math.random() < 0.005 &&
    //   !this.bossActive
    // ) {
    //   const result = spawnWithDistance(
    //     () => new Tank(canvas.width + Math.random() * 400),
    //     this.tanks
    //   );
    //   if (result) {
    //     const tanks = Array.isArray(result) ? result : [result];
    //     this.tanks.push(...tanks);
    //   }
    // }
    this.tanks = this.tanks.filter((t) => t.x + t.width > 0);

    this.powerUps.forEach((p) => p.update());
    this.powerUps = this.powerUps.filter((p) => !p.dead);

    // Atualiza e coleta moedas
    this.coinsDropped.forEach((coin) => {
      coin.update();
      
      // Verifica colisão com o player
      const dx = (coin.x + coin.width / 2) - (this.player.x + this.player.width / 2);
      const dy = (coin.y + coin.height / 2) - (this.player.y + this.player.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 30) { // Raio de coleta
        coin.collected = true;
        this.coins += coin.value;
        
        // Efeito visual de coleta (sem emoji — fillText de emoji é caro)
        this.damageTexts.push(
          new DamageText(coin.x, coin.y - 10, `+${coin.value}`, "#FFD700")
        );

        // 3 partículas (antes 5) — pico menor ao coletar várias de uma vez
        for (let i = 0; i < 3; i++) {
          this.particles.push(
            new ExplosionParticle(coin.x + coin.width / 2, coin.y + coin.height / 2, "#FFD700")
          );
        }
      }
    });
    this.coinsDropped = this.coinsDropped.filter((c) => !c.dead);

    PerfProfiler.beginCollisions();
    // Loops indexados: splice em forEach pulava o próximo item e podia
    // reutilizar o mesmo projétil em vários alvos no mesmo frame.
    for (let pi = 0; pi < this.projectiles.length; pi++) {
      const p = this.projectiles[pi];
      let consumed = false;

      for (let ei = 0; ei < this.enemies.length; ei++) {
        const e = this.enemies[ei];
        if (e.isDying || e.dead) continue;
        // MiniBoss tem colisão dedicada abaixo
        if (e instanceof MiniBoss) continue;
        PerfProfiler.addCollisionChecks(1);
        const hit =
          p.x < e.x + e.width &&
          p.x + p.width > e.x &&
          p.y < e.y + e.height &&
          p.y + p.height > e.y;
        if (!hit) continue;

        HitEffectManager.spawnEffect(p.x, p.y, e.hitEffect);

        if (e.takeDamage && e.takeDamage(p.damage, p.x + p.width / 2, p.y + p.height / 2)) {
          createExplosion(e.x + e.width / 2, e.y + e.height / 2, 0.8, 15);
          this.enemies.splice(ei, 1);

          this.comboSystem.addKill();
          const points = Math.floor(10 * this.comboSystem.multiplier);
          this.score += points;

          if (Math.random() < 0.3 && this.coinsDropped.length < MAX_COINS_ON_SCREEN) {
            this.coinsDropped.push(new CoinDrop(e.x, e.y, 1));
          }

          if (Math.random() < 0.1) {
            this.powerUps.push(new PowerUp(e.x, e.y));
          }

          if (points > 10) {
            this.damageTexts.push(
              new DamageText(e.x, e.y - 20, `+${points}`, "yellow")
            );
          }
        }
        this.projectiles.splice(pi, 1);
        pi--;
        this.damageTexts.push(
          new DamageText(e.x, e.y, "-" + p.damage.toFixed(2), "orange")
        );
        consumed = true;
        break; // 1 alvo por projétil (prioridade: inimigos antes de tanks)
      }

      if (consumed) continue;

      for (let ti = 0; ti < this.tanks.length; ti++) {
        const t = this.tanks[ti];
        PerfProfiler.addCollisionChecks(1);
        const hit =
          p.x < t.x + t.width &&
          p.x + p.width > t.x &&
          p.y < t.y + t.height &&
          p.y + p.height > t.y;
        if (!hit) continue;

        for (let i = 0; i < 6; i++) {
          HitEffectManager.spawnEffect(t.x, t.y, t.hitEffect);
        }
        if (t.takeDamage && t.takeDamage(p.damage, p.x + p.width / 2, p.y + p.height / 2)) {
          createExplosion(t.x + t.width / 2, t.y + t.height / 2, 1.5, 30);
          this.tanks.splice(ti, 1);

          this.comboSystem.addKill();
          const points = Math.floor(20 * this.comboSystem.multiplier);
          this.score += points;

          const coinCount = Math.floor(Math.random() * 4) + 2;
          for (let i = 0; i < coinCount && this.coinsDropped.length < MAX_COINS_ON_SCREEN; i++) {
            const offsetX = (Math.random() - 0.5) * 40;
            const offsetY = (Math.random() - 0.5) * 40;
            this.coinsDropped.push(new CoinDrop(t.x + offsetX, t.y + offsetY, 2));
          }

          if (Math.random() < 0.25) {
            this.powerUps.push(new PowerUp(t.x, t.y));
          }

          if (points > 20) {
            this.damageTexts.push(
              new DamageText(t.x, t.y - 20, `+${points}`, "yellow")
            );
          }
        }
        this.projectiles.splice(pi, 1);
        pi--;
        this.damageTexts.push(
          new DamageText(t.x, t.y, "-" + p.damage.toFixed(2), "orange")
        );
        break;
      }
    }

    for (let p of this.enemyProjectiles) {
      PerfProfiler.addCollisionChecks(1);
      const hit =
        p.x < this.player.x + this.player.width &&
        p.x + p.width > this.player.x &&
        p.y < this.player.y + this.player.height &&
        p.y + p.height > this.player.y;
      if (hit && !this.player.invincible) {
        // Verifica se tem shield ativo
        if (this.player.shieldActive && this.player.shieldTimer > 0) {
          this.player.shieldTimer = 0;
          this.player.shieldActive = false;
        this.damageTexts.push(
            new DamageText(this.player.x, this.player.y, "SHIELD!", "cyan")
          );
        } else {
          // Usa o novo método takeDamage com efeitos visuais
          this.player.takeDamage(p.damage, p.x, p.y);
        }
        this.enemyProjectiles = this.enemyProjectiles.filter(
          (ep) => ep !== p
        );
        // Early return legado — fecha o timer de colisões do profiler
        PerfProfiler.endCollisions();
        return;
      }
    }

    [
      ...this.enemies,
      ...this.tanks,
      ...(this.miniBoss ? [this.miniBoss] : []),
    ].forEach((e) => {
      if (e.isDying || e.dead) return;
      PerfProfiler.addCollisionChecks(1);
      const hit =
        this.player.x < e.x + e.width &&
        this.player.x + this.player.width > e.x &&
        this.player.y < e.y + e.height &&
        this.player.y + this.player.height > e.y;
      if (hit && !this.player.invincible) {
        // Verifica se tem shield ativo
        if (this.player.shieldActive && this.player.shieldTimer > 0) {
          this.player.shieldTimer = 0;
          this.player.shieldActive = false;
        this.damageTexts.push(
            new DamageText(this.player.x, this.player.y, "SHIELD!", "cyan")
          );
        } else {
          // Usa o novo método takeDamage com efeitos visuais
          this.player.takeDamage(1, e.x + e.width / 2, e.y + e.height / 2);
        }
        return;
      }
    });

    // DESABILITADO: Powerups aleatórios foram removidos
    // if (Math.random() < 0.002) {
    //   this.powerUps.push(
    //     new PowerUp(canvas.width, Math.random() * (canvas.height * 0.8))
    //   );
    // }

    // if (Math.random() < 0.002) {
    //   const allTypes = [
    //     ...Object.values(WeaponTypes),
    //     ...Object.values(AuxiliaryWeaponTypes),
    //   ];
    //   const type = allTypes[Math.floor(Math.random() * allTypes.length)];
    //   this.powerUps.push(
    //     new WeaponPowerUp(
    //       canvas.width,
    //       Math.random() * (canvas.height * 0.8),
    //       type
    //     )
    //   );
    // }

    for (let p of this.powerUps) {
      const collected =
        this.player.x < p.x + p.width &&
        this.player.x + this.player.width > p.x &&
        this.player.y < p.y + p.height &&
        this.player.y + this.player.height > p.y;
      if (collected) {
        this.powerUps = this.powerUps.filter((po) => po !== p);
        if (p instanceof WeaponPowerUp) {
          p.apply(this.player); // Troca a arma
          this.damageTexts.push(
            new DamageText(p.x, p.y, p.weaponType.name, "blue")
          );
        } else if (p instanceof DropInstance) {
          p.apply(this.player); // Executa efeito do drop
        } else if (p instanceof PowerUp) {
          if (this.player.health < this.player.maxHealth) {
            this.player.health++;
            this.damageTexts.push(
              new DamageText(p.x, p.y, "+1", "green")
            );
          }
        }
      }
    }

    // REMOVIDO: Sistema antigo de boss que limpava inimigos
    // O boss agora é controlado pelo WaveSystem.spawnWaveEnemies()
    // Os bosses são spawnados como parte do array game.enemies
    // e não devem limpar os outros inimigos
    
    // Verifica se há MiniBoss no array de enemies (do novo sistema)
    const miniBossInEnemies = this.enemies.find(
      (e) => e instanceof MiniBoss && !e.dead
    );

    if (miniBossInEnemies) {
      // Marca que há boss ativo para o sistema de waves (inclui queda)
      this.bossActive = true;

      if (!miniBossInEnemies.isDying) {
        const b = miniBossInEnemies;
        for (let pi = 0; pi < this.projectiles.length; pi++) {
          const p = this.projectiles[pi];
          PerfProfiler.addCollisionChecks(1);
          const hit =
            p.x < b.x + b.width &&
            p.x + p.width > b.x &&
            p.y < b.y + b.height &&
            p.y + p.height > b.y;
          if (!hit) continue;
          HitEffectManager.spawnEffect(p.x, p.y, b.hitEffect, 1.5);
          b.takeDamage(p.damage, p.x + p.width / 2, p.y + p.height / 2);
          this.projectiles.splice(pi, 1);
          pi--;
          this.damageTexts.push(
            new DamageText(b.x, b.y, "-" + p.damage.toFixed(2), "orange")
          );
        }
      }
    } else {
      this.bossActive = false;
    }
    PerfProfiler.endCollisions();

    // Atualiza camadas de parallax e chão APENAS quando:
    // - Modo PLANE (sempre se move)
    // - Modo HELICOPTER + airborne (no ar, espaço pressionado)
    if (this.player.airborne || controlMode === CONTROLSMODES.PLANE) {
      // Move o parallax
      this.parallaxLayers.forEach(layer => layer.update());
      
      // Move o chão (footprint / estrada)
      const fp = IMAGES.footprint;
      const groundH = canvas.height * 0.1;
      const tileW =
        fp?.naturalWidth && fp.naturalHeight
          ? (fp.naturalWidth / fp.naturalHeight) * groundH
          : 200;
      this.footprintX -= 1.5;
      if (this.footprintX <= -tileW) this.footprintX += tileW;

      this.grassXs = this.grassXs.map((x) => {
        x -= 1;
        if (x < -20) x = canvas.width;
        return x;
      });
    }
  },

  draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (MenuSystem.active) {
      MenuSystem.draw(ctx);
      return;
    }

    // Breakdown de draw (só cronometra se debug; senão fn direta)
    PerfProfiler.timeDraw('parallax', () => {
      this.drawBackground();
    });

    // Player / powerups / textos — entram em drawParts.other (resto)
    if (this.player.isDying) {
      this.player.drawDeath();
    } else {
      this.player.draw();
    }

    PerfProfiler.timeDraw('projectiles', () => {
      this.projectiles.forEach((p) => p.draw());
      this.enemyProjectiles.forEach((p) => p.draw());
    });

    // Ordem de draw preservada (inimigos antes dos tanks; MiniBoss depois, perto das particles)
    PerfProfiler.timeDraw('enemies', () => {
      this.enemies.forEach((e) => e.draw());
    });

    PerfProfiler.timeDraw(
      'tanks',
      () => {
        this.tanks.forEach((t) => t.draw());
      },
      { tankCount: this.tanks.length }
    );

    this.powerUps.forEach((p) => p.draw());
    PerfProfiler.timeDraw('coins', () => {
      this.coinsDropped.forEach((c) => c.draw(ctx));
    });
    this.damageTexts.forEach((dt) => dt.draw());

    PerfProfiler.timeDraw('hud', () => {
      HudSystem.draw(ctx);
    });

    // Joystick flutuante (por cima do jogo; some em pause/game over)
    if (!this.gameOver && !this.isPaused) {
      JoystickSystem.draw(ctx);
    } else if (JoystickSystem.active) {
      JoystickSystem.end();
    }

    // Desenha o countdown (por cima de tudo)
    this.countdownSystem.draw(ctx);

    // Indicador de pause (só mostra se não estiver no countdown)
    if (this.isPaused && !this.gameOver && !this.countdownSystem.active) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = "white";
      ctx.strokeStyle = "black";
      ctx.lineWidth = 4;
      ctx.font = "bold 48px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      const text = "⏸️ PAUSADO";
      ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }

    if (this.showingWaveText) {
      ctx.fillStyle = "white";
      ctx.font = "28px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`Wave ${WaveSystem.currentWave}`, canvas.width / 2, 80);
      this.waveTextTimer--;
      if (this.waveTextTimer <= 0) {
        this.showingWaveText = false;
      }
    }

    // MiniBoss no array enemies já foi desenhado acima; this.miniBoss é legado
    PerfProfiler.timeDraw('enemies', () => {
      if (this.miniBoss && !this.enemies.includes(this.miniBoss)) {
        this.miniBoss.draw();
      }
    });

    PerfProfiler.timeDraw('particles', () => {
      game.particles.forEach((p) => p.draw(ctx));
    });

    if (!this.player.airborne && !this.gameOver && !MenuSystem.active) {
      const L = HudSystem.layout || HudSystem.computeLayout();
      const tipY = (L.weapon?.y ?? 0) + (L.weapon?.h ?? 0) + 22;
      ctx.font = "16px Arial";
      ctx.textAlign = "left";
      ctx.fillStyle = "#ff9800";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.strokeText("Pressione espaço para voar", 20, tipY);
      ctx.fillText("Pressione espaço para voar", 20, tipY);
    }

    if (this.gameOver) {
      // Envia evento para Google Tag Manager apenas uma vez
      if (!this.gameOverEventSent) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: "game_over",
          event_category: "game",
          event_label: "helicopter_shooter",
          game_score: this.score,
        });
        this.gameOverEventSent = true;
      }

      // Painel die (vidas > 0) ou game over (vidas = 0)
      GameOverSystem.draw(ctx);
    }

    // Overlay por último (não entra no breakdown de gameplay)
    if (this.debug) {
      PerfProfiler.draw(ctx, canvas);
    }
  },

  drawBackground() {
    // Base de céu (evita faixa clara do CSS do canvas sob layers com alpha)
    ctx.fillStyle = "#7eb8e0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenha camadas de parallax (da mais distante para a mais próxima)
    this.parallaxLayers.forEach(layer => layer.draw(ctx));

    // Chão com footprint (estrada) em tile horizontal
    const groundH = canvas.height * 0.1;
    const groundY = canvas.height - groundH;
    const fp = IMAGES.footprint;

    if (fp && fp.complete && fp.naturalWidth) {
      const tileW = (fp.naturalWidth / fp.naturalHeight) * groundH;
      let x = this.footprintX;
      // Garante cobertura completa da tela
      while (x > 0) x -= tileW;
      for (; x < canvas.width + tileW; x += tileW) {
        ctx.drawImage(fp, x, groundY, tileW, groundH);
      }
    } else {
      ctx.fillStyle = "#3a3a3a";
      ctx.fillRect(0, groundY, canvas.width, groundH);
    }

    // Sol + vinheta (só no fundo; sprites/HUD vêm depois)
    drawAtmosphereLighting(ctx, canvas);
  },

  loop(timestamp) {
    PerfProfiler.beginFrame(timestamp);
    const delta = timestamp - this.lastFrameTime;
    if (delta >= 1000 / this.fps) {
      PerfProfiler.beginJsWork();

      // Atualiza countdown sempre (mesmo pausado)
      this.countdownSystem.update();
      
      // Verifica animação de morte do player
      if (this.player.isDying && !this.gameOver) {
        const deathFinished = this.player.updateDeath();
        if (deathFinished) {
          this.handleGameOver();
        }
        // Atualiza partículas de fumaça durante a morte
        this.player.smokeParticles.forEach(p => p.update());
        this.player.smokeParticles = this.player.smokeParticles.filter(p => !p.dead);
        // Atualiza partículas de explosão
        game.particles = game.particles.filter((p) => !p.dead);
        game.particles.forEach((p) => p.update());
      } else if (MenuSystem.active) {
        PerfProfiler.beginUpdate();
        this.update();
        PerfProfiler.endUpdate();
      } else if (this.waveIntroActive && !this.gameOver) {
        // Decolagem no início da wave (roda mesmo com lógica de pause lateral)
        PerfProfiler.beginUpdate();
        this.update();
        PerfProfiler.endUpdate();
      } else if (!this.isPaused && !this.gameOver) {
        // Só atualiza o resto se não estiver pausado, não estiver morrendo e não for game over
        PerfProfiler.beginUpdate();
        this.update();
        PerfProfiler.endUpdate();
      }

      PerfProfiler.sampleEntityCounts(this);
      PerfProfiler.counts.wave = WaveSystem.currentWave || 0;

      // Sempre desenha (para mostrar o estado pausado)
      PerfProfiler.beginDraw();
      this.draw();
      PerfProfiler.endDraw();

      PerfProfiler.endJsWork();
      this.lastFrameTime = timestamp;
      PerfProfiler.endFrame();
    }
    requestAnimationFrame((ts) => this.loop(ts));
  },
});



