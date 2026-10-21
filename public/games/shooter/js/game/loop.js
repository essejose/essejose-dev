import { canvas, ctx } from '../core/canvas.js';
import { ASSETS, IMAGES } from '../core/assets.js';
import { keys, controlMode, CONTROLSMODES } from '../core/input.js';
import { ParallaxLayer } from '../core/parallax.js';
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
    }
    
    // Inicia o countdown antes de começar o jogo (sem mensagem na primeira wave)
    this.isPaused = true; // Pausa durante o countdown
    this.countdownSystem.start(() => {
      this.isPaused = false; // Despausa quando countdown terminar
      WaveSystem.startWave(1); // Inicia a wave 1
    }, ""); // Sem mensagem na primeira wave
    
    this.loop(0);
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
      // Perdeu todas as vidas - limpa save
      DialogSystem.show({ 
        id: 5,
        speaker: "Comandante do Exército Rival",
        paused: false,
        portrait: ASSETS.rival_commander,
        messages: [
          "HA HA HA!",  
        ],
      });

      SaveSystem.clear();
      
      // Reseta tudo para valores iniciais
      setTimeout(() => {
        this.lives = 3;
        this.coins = 0; 

        localStorage.removeItem('shooter_tutorials_executed');
        this.highScore = 0;
        this.highWave = 0;
        this.reset();
        this.gameOver = false;
      }, 3000);
    } else {
      // Ainda tem vidas - salva progresso e reinicia
      SaveSystem.save();
      setTimeout(() => {
       
        this.reset();
        this.gameOver = false;
        WaveSystem.currentWave = 0;
        WaveSystem.startWave(1);
      }, 2000);
    }
  },

  reset() {
    this.player = new Player();
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.powerUps = [];
    this.coinsDropped = [];
    this.enemies = [];
    this.tanks = [];
    // NÃO reseta moedas e vidas (são persistentes)

    // Inicializa camadas de parallax (da mais distante para a mais próxima)
    // Velocidades: mais longe = mais lento, mais perto = mais rápido
    this.parallaxLayers = [
      new ParallaxLayer(IMAGES.parallax1, 0.2, 0),  // Céu/fundo mais distante
      new ParallaxLayer(IMAGES.parallax2, 0.4, 0),  // Montanhas distantes
      new ParallaxLayer(IMAGES.parallax3, 0.6, 0),  // Montanhas médias
      new ParallaxLayer(IMAGES.parallax4, 0.8, 0),  // Colinas
      new ParallaxLayer(IMAGES.parallax5, 1.0, 0),  // Vegetação distante
      new ParallaxLayer(IMAGES.parallax6, 1.5, 0),  // Vegetação próxima
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
    if (this.gameOver) return;
    
      // Não atualiza o jogo se o player está morrendo
    if (this.player.isDying) return;
    
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
        
        // Efeito visual de coleta
        this.damageTexts.push(
          new DamageText(coin.x, coin.y - 10, `+${coin.value}⭐`, "#FFD700")
        );
        
        // Efeito de partículas
        for (let i = 0; i < 5; i++) {
          this.particles.push(
            new ExplosionParticle(coin.x + coin.width / 2, coin.y + coin.height / 2, "#FFD700")
          );
        }
      }
    });
    this.coinsDropped = this.coinsDropped.filter((c) => !c.dead);

    this.projectiles.forEach((p, pi) => {
      this.enemies.forEach((e, ei) => {
        if (e.isDying || e.dead) return;
        // MiniBoss tem colisão dedicada abaixo
        if (e instanceof MiniBoss) return;
        const hit =
          p.x < e.x + e.width &&
          p.x + p.width > e.x &&
          p.y < e.y + e.height &&
          p.y + p.height > e.y;
        if (hit) {
          HitEffectManager.spawnEffect(p.x, p.y, e.hitEffect);

          // Passa as coordenadas do projétil para calcular knockback
          if (e.takeDamage && e.takeDamage(p.damage, p.x + p.width / 2, p.y + p.height / 2)) {
            // Cria explosão no centro do inimigo
            createExplosion(e.x + e.width / 2, e.y + e.height / 2, 0.8, 15);
            
            this.enemies.splice(ei, 1);
            // const newEnemy = novoInimigoAleatorio();
            // if (newEnemy) {
            //     const list = Array.isArray(newEnemy) ? newEnemy : [newEnemy];
            //     this.enemies.push(...list); // ✅ garante que só elementos individuais entram
            // }
            // dropOnEnemyDeath(e); // <<<<< 🎯 dropa algo aqui!
            // 15% de chance de soltar drop
            // DESABILITADO: Powerups foram desabilitados, agora só dropam moedas
            // if (Math.random() < 0.75) {
            //   const dropKeys = Object.keys(DropTypes);
            //   const randomKey =
            //     dropKeys[Math.floor(Math.random() * dropKeys.length)];
            //   const dropType = DropTypes[randomKey];
            //
            //   this.powerUps.push(new DropInstance(e.x, e.y, dropType));
            // }

            // Adiciona kill ao combo e aplica multiplicador
            this.comboSystem.addKill();
            const points = Math.floor(10 * this.comboSystem.multiplier);
            this.score += points;
            
            // Dropa moeda (30% de chance) - respeitando limite
            if (Math.random() < 0.3 && this.coinsDropped.length < MAX_COINS_ON_SCREEN) {
              this.coinsDropped.push(new CoinDrop(e.x, e.y, 1));
            }
            
            // Dropa vida (10% de chance)
            if (Math.random() < 0.1) {
              this.powerUps.push(new PowerUp(e.x, e.y));
            }
            
            // Mostra pontos ganhos (com combo)
            if (points > 10) {
              this.damageTexts.push(
                new DamageText(e.x, e.y - 20, `+${points}`, "yellow")
              );
            }
          }
          this.projectiles.splice(pi, 1);
          this.damageTexts.push(
            new DamageText(e.x, e.y, "-" + p.damage.toFixed(2), "orange")
          );
        }
      });

      this.tanks.forEach((t, ti) => {
        const hit =
          p.x < t.x + t.width &&
          p.x + p.width > t.x &&
          p.y < t.y + t.height &&
          p.y + p.height > t.y;
        if (hit) {
          for (let i = 0; i < 6; i++) {
            HitEffectManager.spawnEffect(t.x, t.y, t.hitEffect);
          }
          // Passa as coordenadas do projétil para calcular knockback
          if (t.takeDamage && t.takeDamage(p.damage, p.x + p.width / 2, p.y + p.height / 2)) {
            // Cria explosão maior para tank
            createExplosion(t.x + t.width / 2, t.y + t.height / 2, 1.5, 30);
            
            this.tanks.splice(ti, 1);
            // this.tanks.push(new Tank(canvas.width + Math.random() * 400));
            
            // Adiciona kill ao combo e aplica multiplicador
            this.comboSystem.addKill();
            const points = Math.floor(20 * this.comboSystem.multiplier); // Tanks valem 20 pontos
            this.score += points;
            
            // Dropa moedas (tanks sempre dropam 2-5 moedas)
            const coinCount = Math.floor(Math.random() * 4) + 2;
            for (let i = 0; i < coinCount && this.coinsDropped.length < MAX_COINS_ON_SCREEN; i++) {
              const offsetX = (Math.random() - 0.5) * 40;
              const offsetY = (Math.random() - 0.5) * 40;
              this.coinsDropped.push(new CoinDrop(t.x + offsetX, t.y + offsetY, 2));
            }
            
            // Dropa vida (25% de chance para tanks)
            if (Math.random() < 0.25) {
              this.powerUps.push(new PowerUp(t.x, t.y));
            }
            
            // Mostra pontos ganhos (com combo)
            if (points > 20) {
              this.damageTexts.push(
                new DamageText(t.x, t.y - 20, `+${points}`, "yellow")
              );
            }
          }
          this.projectiles.splice(pi, 1);
          this.damageTexts.push(
            new DamageText(t.x, t.y, "-" + p.damage.toFixed(2), "orange")
          );
        }
      });
    });

    for (let p of this.enemyProjectiles) {
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
        return;
      }
    }

    [
      ...this.enemies,
      ...this.tanks,
      ...(this.miniBoss ? [this.miniBoss] : []),
    ].forEach((e) => {
      if (e.isDying || e.dead) return;
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
        this.projectiles.forEach((p, pi) => {
          const b = miniBossInEnemies;
          const hit =
            p.x < b.x + b.width &&
            p.x + p.width > b.x &&
            p.y < b.y + b.height &&
            p.y + p.height > b.y;
          if (hit) {
            HitEffectManager.spawnEffect(p.x, p.y, b.hitEffect, 1.5);
            b.takeDamage(p.damage, p.x + p.width / 2, p.y + p.height / 2);
            this.projectiles.splice(pi, 1);
            this.damageTexts.push(
              new DamageText(b.x, b.y, "-" + p.damage.toFixed(2), "orange")
            );
          }
        });
      }
    } else {
      this.bossActive = false;
    }

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
    this.drawBackground();
    
    // Desenha player normal ou animação de morte
    if (this.player.isDying) {
      this.player.drawDeath();
    } else {
    this.player.draw();
    }
    
    this.projectiles.forEach((p) => p.draw());
    this.enemyProjectiles.forEach((p) => p.draw());
    this.enemies.forEach((e) => e.draw());
    this.tanks.forEach((t) => t.draw());
    this.powerUps.forEach((p) => p.draw());
    this.coinsDropped.forEach((c) => c.draw(ctx));
    this.damageTexts.forEach((dt) => dt.draw());

    // HUD frames (canvas) — layout da referência
    HudSystem.draw(ctx);

    // Informações de debug (só exibe se debug estiver ativo)
    if (this.debug) {
      ctx.fillStyle = "black";
      ctx.font = "14px Arial";
      ctx.textAlign = "left";
      ctx.fillText(
        "Enemies: " + this.enemies.length,
        canvas.width - 150,
        30
      );
      ctx.fillText(
        "Projectiles: " + this.projectiles.length,
        canvas.width - 150,
        50
      );
      ctx.fillText("FPS: " + this.fps, canvas.width - 150, 70);
      ctx.fillText(
        "Damage: " + this.player.primaryWeapon.damage,
        canvas.width - 150,
        90
      );
      ctx.fillText(
        "Cooldown: " + this.player.primaryWeapon.cooldown,
        canvas.width - 150,
        110
      );
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

    if (this.miniBoss) this.miniBoss.draw();
    game.particles.forEach((p) => p.draw(ctx));
    if (!this.player.airborne && !this.gameOver) {
      ctx.font = "16px Arial";
      ctx.fillText("Pressione espaço para voar", 20, 80);
    }

    if (this.gameOver) {
      ctx.fillStyle = "red";
      ctx.font = "20px Arial";
      // Envia evento para Google Tag Manager apenas uma vez
      if (!this.gameOverEventSent) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          'event': 'game_over',
        'event_category': 'game',
          'event_label': 'helicopter_shooter',
          'game_score': this.score
      });
        this.gameOverEventSent = true;
      }
      // Mensagem diferente baseada nas vidas restantes
      if (this.lives > 0) {
        ctx.fillText(
          `💔 VOCÊ MORREU! 💔`,
          canvas.width / 2 - 90,
          canvas.height / 2 - 20
        );
        ctx.font = "20px monospace";
        ctx.fillText(
          `Vidas restantes: ${this.lives}`,
          canvas.width / 2 - 100,
          canvas.height / 2 + 20
        );
      } else {
      ctx.fillText(
        "💥 GAME OVER 💥",
          canvas.width / 2 - 85,
          canvas.height / 2 - 20
        );
        ctx.font = "18px monospace";
        ctx.fillStyle = "#FFD700";
        ctx.fillText(
          `High Score: ${this.highScore}`,
          canvas.width / 2 - 80,
          canvas.height / 2 + 20
        );
        ctx.fillText(
          `High Wave: ${this.highWave}`,
          canvas.width / 2 - 70,
          canvas.height / 2 + 45
        );
      }
    }
  },

  drawBackground() {
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
  },

  loop(timestamp) {
    const delta = timestamp - this.lastFrameTime;
    if (delta >= 1000 / this.fps) {
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
      } else if (!this.isPaused && !this.gameOver) {
        // Só atualiza o resto se não estiver pausado, não estiver morrendo e não for game over
      this.update();
      }
      // Sempre desenha (para mostrar o estado pausado)
      this.draw();
      this.lastFrameTime = timestamp;
    }
    requestAnimationFrame((ts) => this.loop(ts));
  },
});



