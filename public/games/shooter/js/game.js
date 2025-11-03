  /*
      ╔═══════════════════════════════════════════════════════════════════╗
      ║                    HELICOPTER SHOOTER GAME                         ║
      ║                     Estrutura do Código                            ║
      ╚═══════════════════════════════════════════════════════════════════╝
      
      📑 ÍNDICE DE SEÇÕES (use Ctrl+F para navegar):
      
      [01] INICIALIZAÇÃO E CANVAS
      [02] ASSETS E RECURSOS (sprites, sons, parallax)
      [03] UTILITÁRIOS (colisão, física, efeitos)
      [04] PARTÍCULAS (FlameParticle, ExplosionParticle)
      [05] SISTEMA DE TEXTO (DamageText)
      [06] PROJÉTEIS (Projectile, EnemyProjectile, etc)
      [07] POWER-UPS E MOEDAS
      [08] ARMAS (WeaponTypes, AuxiliaryWeaponTypes)
      [09] JOGADOR (Player class)
      [10] COMPONENTES REUTILIZÁVEIS (WobbleMovement, FlameEmitter, WeaponComponent)
      [11] INIMIGOS COMPOSTOS (EnemyComposed, createEnemy factory)
      [12] INIMIGOS LEGADOS (Enemy, MiniBoss, DiveEnemy, Tank)
      [13] INIMIGOS DEPRECADOS (Comentados: Bomber, Sniper, Shielded, Drone)
      [14] FORMAÇÕES (spawnArrowFormation, spawnDroneFormation)
      [15] SISTEMA DE WAVES
      [16] SISTEMA DE COMBO
      [17] COUNTDOWN SYSTEM
      [18] SISTEMA DE SAVE/LOAD
      [19] SISTEMA DE LOJA (Shop)
      [20] DEV TOOLS (Debug Panel)
      [21] GAME LOOP (update, draw, input)
      [22] EVENT LISTENERS E INICIALIZAÇÃO
      
      ══════════════════════════════════════════════════════════════════
      */

      // ============================================
      // [01] INICIALIZAÇÃO E CANVAS
      // ============================================
      const canvas = document.getElementById("game");
      canvas.addEventListener("touchstart", handleTouch);
      canvas.addEventListener("touchmove", handleTouch);

      const ctx = canvas.getContext("2d");
      function handleTouch(e) {
        e.preventDefault(); // evita o scroll em dispositivos móveis

        const touch = e.touches[0]; // usa o primeiro toque
        const rect = canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;

        // Define o alvo para movimento suave
        game.player.targetX = touchX - game.player.width / 2;
        game.player.targetY = touchY - game.player.height / 2;
      }
      function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Atualiza escala das camadas de parallax quando redimensionar
        // Usa window.game para evitar erro de inicialização
        try {
          if (window.game && window.game.parallaxLayers) {
            window.game.parallaxLayers.forEach(layer => layer.updateScale());
          }
        } catch (e) {
          // Ignora erro na primeira chamada antes do game ser criado
        }
      }
      
      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);

      // ============================================
      // [02] ASSETS E RECURSOS
      // ============================================
      const ASSETS = {
        helicopter: "./images/player.png",
        inimigo1: "./images/inimigos/inimigo1.png",
        inimigo2: "./images/inimigos/inimigo2.png",
        tank: "./images/inimigos/tank.png",
        grass: "https://placehold.co/20x20/418753/000?text=-",
        health: "https://placehold.co/20x20/ff66cc/000?text=H",
        parallax1: "./images/parallax-2/6.png",
        parallax2: "./images/parallax-2/5.png",
        parallax3: "./images/parallax-2/4.png",
        parallax4: "./images/parallax-2/3.png",
        parallax5: "./images/parallax-2/2.png",
        parallax6: "./images/parallax-2/1.png",
      };

      const IMAGES = {};
      const CONTROLSMODES = {
        HELICOPTER: "helicopter",
        PLANE: "plane",
      };

      // ============================================
      // [03] UTILITÁRIOS (Controles e Input)
      // ============================================
      let keys = {};
      let controlMode = CONTROLSMODES.PLANE;
      document.addEventListener("keydown", (e) => {
        keys[e.code] = true;
        if (e.code === "KeyM") {
          controlMode =
            controlMode === CONTROLSMODES.HELICOPTER
              ? CONTROLSMODES.PLANE
              : CONTROLSMODES.HELICOPTER;
          
          // Atualiza a velocidade do parallax quando muda o modo de controle
          if (window.game && window.game.parallaxLayers) {
            window.game.parallaxLayers.forEach(layer => layer.updateSpeed(controlMode));
          }
        }
        // Ativa/desativa modo debug com tecla K
        if (e.code === "KeyK") {
          game.debug = !game.debug;
          console.log("Debug mode:", game.debug ? "ON" : "OFF");
        }
      });

      document.addEventListener("keydown", (e) => (keys[e.code] = true));
      document.addEventListener("keyup", (e) => (keys[e.code] = false));

      function loadImages(sources, callback) {
        let loaded = 0;
        const total = Object.keys(sources).length;
        for (const key in sources) {
          IMAGES[key] = new Image();
          IMAGES[key].src = sources[key];
          IMAGES[key].onload = () => {
            loaded++;
            if (loaded === total) callback();
          };
        }
      }

      // Classe para gerenciar camadas de parallax
      class ParallaxLayer {
        constructor(image, speed, y = 0) {
          this.image = image;
          this.baseSpeed = speed; // Velocidade base
          this.speed = speed;
          this.y = y;
          this.x1 = 0;
          this.x2 = 0;
          
          // Calcula escala para preencher a altura da tela
          this.updateScale();
        }

        updateScale() {
          if (!this.image || !this.image.width) return;
          
          // Escala baseada na altura da tela
          this.scaleY = canvas.height / this.image.height;
          this.scaleX = this.scaleY; // Mantém proporção
          
          // Largura escalada da imagem
          this.scaledWidth = this.image.width * this.scaleX;
          this.scaledHeight = canvas.height;
          
          // Posiciona a segunda imagem logo após a primeira
          this.x2 = this.scaledWidth;
        }

        // Atualiza velocidade baseado no modo de controle
        updateSpeed(controlMode) {
          // No modo helicóptero, parallax é mais lento (player "mais lento")
          // No modo avião, parallax é mais rápido (player "mais rápido")
          const multiplier = controlMode === CONTROLSMODES.HELICOPTER ? 0.5 : 1.0;
          this.speed = this.baseSpeed * multiplier;
        }

        update() {
          // Move as duas imagens
          this.x1 -= this.speed;
          this.x2 -= this.speed;

          // Quando a primeira sai completamente da tela, reposiciona após a segunda
          if (this.x1 + this.scaledWidth <= 0) {
            this.x1 = this.x2 + this.scaledWidth;
          }

          // Quando a segunda sai completamente da tela, reposiciona após a primeira
          if (this.x2 + this.scaledWidth <= 0) {
            this.x2 = this.x1 + this.scaledWidth;
          }
        }

        draw(ctx) {
          if (!this.image || !this.image.complete) return;
          
          // Desenha as duas imagens lado a lado para criar loop infinito
          ctx.drawImage(
            this.image,
            this.x1,
            this.y,
            this.scaledWidth,
            this.scaledHeight
          );
          
          ctx.drawImage(
            this.image,
            this.x2,
            this.y,
            this.scaledWidth,
            this.scaledHeight
          );
        }

        reset() {
          this.updateScale();
          this.x1 = 0;
          this.x2 = this.scaledWidth;
        }
      }

      // ============================================
      // [16] SISTEMA DE COMBO
      // ============================================
      class ComboSystem {
        constructor() {
          this.combo = 0;
          this.comboTimer = 0;
          this.comboTimeout = 180; // 3 segundos (60 FPS)
          this.multiplier = 1;
          this.maxCombo = 0; // Recorde de combo
          this.pulseScale = 1; // Para animação de pulso
        }

        addKill() {
          this.combo++;
          this.comboTimer = this.comboTimeout;
          
          // Atualiza multiplicador (aumenta 10% a cada kill)
          this.multiplier = 1 + (this.combo * 0.1);
          
          // Atualiza recorde
          if (this.combo > this.maxCombo) {
            this.maxCombo = this.combo;
          }
          
          // Efeito de pulso
          this.pulseScale = 1.5;
          
          // Mensagens especiais em marcos
          if (this.combo === 5) {
            game.damageTexts.push(new DamageText(canvas.width/2, 100, "🔥 COMBO x5!", "orange"));
          } else if (this.combo === 10) {
            game.damageTexts.push(new DamageText(canvas.width/2, 100, "⚡ COMBO x10!", "yellow"));
          } else if (this.combo === 20) {
            game.damageTexts.push(new DamageText(canvas.width/2, 100, "💥 COMBO x20!", "red"));
          } else if (this.combo === 50) {
            game.damageTexts.push(new DamageText(canvas.width/2, 100, "🌟 LEGENDARY!", "gold"));
          } else if (this.combo % 10 === 0 && this.combo > 20) {
            game.damageTexts.push(new DamageText(canvas.width/2, 100, `💫 COMBO x${this.combo}!`, "gold"));
          }
        }

        reset() {
          this.combo = 0;
          this.multiplier = 1;
          this.comboTimer = 0;
        }

        update() {
          // Reduz o timer do combo
          if (this.comboTimer > 0) {
            this.comboTimer--;
          } else if (this.combo > 0) {
            // Combo perdido
            if (this.combo >= 5) {
              game.damageTexts.push(new DamageText(canvas.width/2, 150, "COMBO PERDIDO!", "gray"));
            }
            this.reset();
          }
          
          // Anima o pulso
          if (this.pulseScale > 1) {
            this.pulseScale -= 0.05;
            if (this.pulseScale < 1) this.pulseScale = 1;
          }
        }

        getScoreMultiplier() {
          return Math.floor(this.multiplier * 10) / 10; // Arredonda para 1 casa decimal
        }

        draw(ctx) {
          if (this.combo === 0) return;
          
          // Posição do combo
          const x = canvas.width - 180;
          const y = 150;
          
          // Cor baseada no combo
          let color = 'white';
          if (this.combo >= 50) color = 'gold';
          else if (this.combo >= 20) color = '#ff6b6b';
          else if (this.combo >= 10) color = '#ffd93d';
          else if (this.combo >= 5) color = 'orange';
          
          // Desenha "COMBO"
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(this.pulseScale, this.pulseScale);
          
          ctx.fillStyle = color;
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 3;
          ctx.font = 'bold 20px Arial';
          ctx.strokeText('COMBO', -30, 0);
          ctx.fillText('COMBO', -30, 0);
          
          // Desenha o número do combo
          ctx.font = 'bold 48px Arial';
          ctx.strokeText(`x${this.combo}`, -30, 45);
          ctx.fillText(`x${this.combo}`, -30, 45);
          
          ctx.restore();
          
          // Desenha multiplicador
          ctx.fillStyle = 'white';
          ctx.font = '16px Arial';
          ctx.fillText(`Multiplicador: x${this.getScoreMultiplier()}`, x - 30, y + 70);
          
          // Barra de tempo do combo
          const barWidth = 150;
          const barHeight = 8;
          const barX = x - 30;
          const barY = y + 80;
          
          // Fundo da barra
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(barX, barY, barWidth, barHeight);
          
          // Progresso da barra
          const progress = this.comboTimer / this.comboTimeout;
          let barColor = '#4CAF50';
          if (progress < 0.3) barColor = '#ff4444';
          else if (progress < 0.6) barColor = '#ffaa00';
          
          ctx.fillStyle = barColor;
          ctx.fillRect(barX, barY, barWidth * progress, barHeight);
          
          // Borda da barra
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.strokeRect(barX, barY, barWidth, barHeight);
        }
      }

      // ============================================
      // [17] COUNTDOWN SYSTEM
      // ============================================
      class CountdownSystem {
        constructor() {
          this.active = false;
          this.count = 2;
          this.timer = 0;
          this.callback = null;
          this.message = "";
        }

        start(callback, startMessage = "GET READY!") {
          this.active = true;
          this.count = 2;
          this.timer = 60; // 1 segundo por número
          this.callback = callback;
          this.message = startMessage;
        }

        update() {
          if (!this.active) return;

          this.timer--;

          if (this.timer <= 0) {
            this.count--;
            
            if (this.count < 0) {
              // Countdown terminou
              this.active = false;
              if (this.callback) {
                this.callback();
              }
            } else {
              this.timer = 60; // Reseta timer para próximo número
            }
          }
        }

        draw(ctx) {
          if (!this.active) return;

          // Overlay escuro
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Mensagem superior
          if (this.message) {
            ctx.fillStyle = "#FFD700";
            ctx.strokeStyle = "black";
            ctx.lineWidth = 4;
            ctx.font = "bold 36px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.strokeText(this.message, canvas.width / 2, canvas.height / 2 - 80);
            ctx.fillText(this.message, canvas.width / 2, canvas.height / 2 - 80);
          }

          // Número do countdown ou READY
          const scale = 1 + (this.timer / 60) * 0.3; // Efeito de pulso
          
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.scale(scale, scale);

          if (this.count > 0) {
            // Números 3, 2, 1
            ctx.fillStyle = "#FF4444";
            ctx.strokeStyle = "black";
            ctx.lineWidth = 6;
            ctx.font = "bold 120px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.strokeText(this.count.toString(), 0, 0);
            ctx.fillText(this.count.toString(), 0, 0);
          } else {
            // READY!
            ctx.fillStyle = "#00FF00";
            ctx.strokeStyle = "black";
            ctx.lineWidth = 6;
            ctx.font = "bold 80px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.strokeText("READY!", 0, 0);
            ctx.fillText("READY!", 0, 0);
          }

          ctx.restore();
        }
      }

      // Sistema de Moedas
      const MAX_COINS_ON_SCREEN = 50; // Limite máximo de moedas na tela
      
      class CoinDrop {
        constructor(x, y, value = 1) {
          this.x = x;
          this.y = y;
          this.value = value; // Valor da moeda (1, 2, 5, 10...)
          this.width = 20;
          this.height = 20;
          this.vx = (Math.random() - 0.5) * 2; // Movimento horizontal aleatório
          this.vy = -2 - Math.random() * 2; // Pula para cima
          this.gravity = 0.2;
          this.bounce = 0.5;
          this.lifetime = 300; // 5 segundos (reduzido de 10)
          this.maxLifetime = 300;
          this.collected = false;
          
          // Animação de brilho
          this.pulseTime = 0;
          this.pulseSpeed = 0.1;
        }

        update() {
          // Física da moeda
          this.vy += this.gravity;
          this.x += this.vx;
          this.y += this.vy;
          
          // Fricção
          this.vx *= 0.98;
          
          // Bounce no chão
          const groundY = canvas.height - canvas.height * 0.1 - this.height;
          if (this.y >= groundY) {
            this.y = groundY;
            this.vy *= -this.bounce;
            this.vx *= 0.8;
            
            // Para de quicar se muito lento
            if (Math.abs(this.vy) < 0.5) {
              this.vy = 0;
            }
          }
          
          // Move para esquerda com o cenário
          this.x -= 1;
          
          // Animação
          this.pulseTime += this.pulseSpeed;
          
          // Lifetime
          this.lifetime--;
          
          // Magnetismo - atrai para o player quando próximo
          const dx = game.player.x - this.x;
          const dy = game.player.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 100) {
            const pullForce = 0.3;
            this.x += (dx / dist) * pullForce * 10;
            this.y += (dy / dist) * pullForce * 10;
          }
        }

        draw(ctx) {
          // Efeito de pulso
          const scale = 1 + Math.sin(this.pulseTime) * 0.2;
          
          // Calcula opacidade baseado no tempo de vida restante
          let opacity = 1;
          if (this.lifetime < 60) { // Últimos 1 segundo
            // Pisca rapidamente
            opacity = Math.floor(this.lifetime / 5) % 2 === 0 ? 1 : 0.3;
          } else if (this.lifetime < 120) { // Últimos 2 segundos
            // Fade gradual
            opacity = 0.5 + (this.lifetime - 60) / 120 * 0.5;
          }
          
          ctx.save();
          ctx.globalAlpha = opacity;
          ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
          ctx.scale(scale, scale);
          
          // Cor baseada no valor
          let color = '#FFD700'; // Dourado
          if (this.value >= 10) color = '#FF69B4'; // Rosa para valores altos
          else if (this.value >= 5) color = '#00CED1'; // Ciano para valores médios
          
          // Desenha a moeda
          ctx.fillStyle = color;
          ctx.strokeStyle = '#FFA500';
          ctx.lineWidth = 2;
          
          ctx.beginPath();
          ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // Símbolo da moeda
          ctx.fillStyle = '#000';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⭐', 0, 0);
          
          // Valor (se maior que 1)
          if (this.value > 1) {
            ctx.fillStyle = '#FFF';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.font = 'bold 10px Arial';
            ctx.strokeText(this.value, 0, -8);
            ctx.fillText(this.value, 0, -8);
          }
          
          ctx.restore();
        }

        get dead() {
          return this.lifetime <= 0 || this.x < -50 || this.collected;
        }
      }

      const HitEffectManager = {
        spawnEffect(x, y, type = "spark", intensity = 1) {
          switch (type) {
            case "spark": // Faísca leve
              for (let i = 0; i < 4 * intensity; i++) {
                game.particles.push(new ExplosionParticle(x, y, "yellow"));
              }
              break;

            case "explosion": // Explosão forte
              for (let i = 0; i < 10 * intensity; i++) {
                const color = Math.random() < 0.5 ? "orange" : "red";
                game.particles.push(new ExplosionParticle(x, y, color));
              }
              game.shakeX = 4 * intensity;
              game.shakeY = 3 * intensity;
              break;

            case "laser":
              for (let i = 0; i < 6 * intensity; i++) {
                game.particles.push(new ExplosionParticle(x, y, "cyan"));
              }
              break;

            case "hitPlayer":
              for (let i = 0; i < 4; i++) {
                game.particles.push(new ExplosionParticle(x, y, "white"));
              }
              game.shakeX = 2;
              break;

            default:
              console.warn("Efeito desconhecido:", type);
          }
        },
      };

      // ============================================
      // [08] ARMAS (Tipos e Configurações)
      // ============================================
      const WeaponTypes = {
        BASIC: {
          speed: 8,
          damage: 2,
          color: "red",
          name: "BASIC",
          cooldown: 15,
          isAuxiliary: false,
          hitEffect: "spark",
          wobbleY: 0.8, // 👈 pequena variação vertical por frame
        },
        SPREAD: {
          speed: 7,
          damage: 2,
          spread: true,
          color: "orange",
          name: "SPREAD",
          cooldown: 20,
          isAuxiliary: false,
          hitEffect: "spark",
        },
        BURST: {
          speed: 10,
          damage: 2,
          color: "yellow",
          name: "BURST",
          cooldown: 8,
          burst: true,
          burstCount: 3,
          burstDelay: 5,
          isAuxiliary: false,
          hitEffect: "spark",
        },
        LASER: {
          speed: 12,
          damage: 3,
          color: "lime",
          name: "LASER",
          cooldown: 5,
          isAuxiliary: false,
          hitEffect: "laser",
        },
        MISSILE: {
          speed: 6,
          damage: 4,
          color: "blue",
          name: "MISSILE",
          cooldown: 40,
          homing: true,
          isAuxiliary: false,
          hitEffect: "explosion",
        },
      };

      const AuxiliaryWeaponTypes = {
        MISSILE: {
          speed: 7,
          damage: 3,
          color: "blue",
          name: "MISSILE",
          cooldown: 50,
          homing: true,
          isAuxiliary: true,
          hitEffect: "explosion",
        },
        ORBITAL: {
          name: "ORBITAL",
          color: "cyan",
          cooldown: 60,
          speed: 6,
          damage: 2,
          isAuxiliary: true,
          orbit: true,
          hitEffect: "spark",
        },
        MINE: {
          speed: 6,
          damage: 4,
          color: "black",
          name: "MINE",
          cooldown: 80,
          isAuxiliary: true,
          hitEffect: "explosion",
        },
        TURRET: {
          name: "TURRET",
          color: "orange",
          cooldown: 40,
          speed: 8,
          damage: 2,
          isAuxiliary: true,
          turret: true,
          hitEffect: "spark",
        },
        SHIELD: {
          name: "SHIELD",
          color: "purple",
          cooldown: 180,
          damage: 0,
          isAuxiliary: true,
          shield: true,
          hitEffect: "spark",
        },
        BEAM: {
          name: "BEAM",
          color: "#FFD700",
          cooldown: 30,
          speed: 12,
          damage: 1,
          isAuxiliary: true,
          beam: true,
          hitEffect: "spark",
        },
      };

      class ProximityMineProjectile {
        constructor(x, y, damage = 4, radius = 50) {
          this.x = x;
          this.y = y;
          this.damage = damage;
          this.radius = radius;
          this.width = 12;
          this.height = 12;
          this.timer = 300; // 5 segundos
          this.armed = false;
          this.armDelay = 30;
          this.blinkCounter = 0;
        }

        draw() {
          if (this.armed) {
            // Pisca em vermelho e amarelo
            const blink = Math.floor(this.blinkCounter / 10) % 2 === 0;
            ctx.fillStyle = blink ? "red" : "yellow";
          } else {
            ctx.fillStyle = "gray";
          }

          ctx.beginPath();
          ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
          ctx.fill();

          // Mostra raio de detecção
          if (this.armed) {
            ctx.strokeStyle = "rgba(255,0,0,0.3)";
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
            ctx.stroke();
          }
        }

        update() {
          if (this.armDelay > 0) {
            this.armDelay--;
          } else {
            this.armed = true;
          }

          this.timer--;
          this.blinkCounter++;

          if (!this.armed) return;

          for (let e of game.enemies) {
            const closestX = Math.max(e.x, Math.min(this.x, e.x + e.width));
            const closestY = Math.max(e.y, Math.min(this.y, e.y + e.height));
            const dx = this.x - closestX;
            const dy = this.y - closestY;
            const distSq = dx * dx + dy * dy;

            if (distSq < this.radius * this.radius) {
              this.explode();
              return;
            }
          }

          if (this.timer <= 0) {
            this.explode();
          }
        }

        explode() {
          game.damageTexts.push(new DamageText(this.x, this.y, "💥", "red"));

          for (let en of game.enemies) {
            const closestX = Math.max(en.x, Math.min(this.x, en.x + en.width));
            const closestY = Math.max(en.y, Math.min(this.y, en.y + en.height));
            const dx = this.x - closestX;
            const dy = this.y - closestY;
            const distSq = dx * dx + dy * dy;

            if (distSq < this.radius * this.radius) {
              if (en.takeDamage) en.takeDamage(this.damage);
            }
          }

          this.dead = true;
          for (let i = 0; i < 15; i++) {
            game.particles.push(
              new ExplosionParticle(
                this.x,
                this.y,
                Math.random() < 0.5 ? "orange" : "gray"
              )
            );
          }
        }
      }

      class ExplosionParticle {
        constructor(x, y, color = "orange", size = 1) {
          this.x = x;
          this.y = y;
          // Explosão radial
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 4 + 2;
          this.vx = Math.cos(angle) * speed;
          this.vy = Math.sin(angle) * speed;
          this.alpha = 1;
          this.radius = (2 + Math.random() * 3) * size;
          this.maxLife = 20 + Math.random() * 20;
          this.life = this.maxLife;
          this.gravity = 0.1;
          this.friction = 0.98;
          // Se não passou cor, escolhe aleatoriamente
          if (color === "orange") {
            const colors = ['#FF4500', '#FF6347', '#FF8C00', '#FFD700', '#FFA500', '#FF0000', '#FFFFFF', '#FFFF00'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
          } else {
          this.color = color;
          }
        }

        update() {
          this.vx *= this.friction;
          this.vy *= this.friction;
          this.vy += this.gravity;
          this.x += this.vx;
          this.y += this.vy;
          this.life--;
          this.alpha = Math.max(0, this.life / this.maxLife);
          this.radius *= 0.96;
        }

        draw(context = ctx) {
          context.save();
          context.globalAlpha = this.alpha;
          context.shadowBlur = 10;
          context.shadowColor = this.color;
          context.fillStyle = this.color;
          context.beginPath();
          context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
          context.fill();
          context.restore();
        }

        get dead() {
          return this.life <= 0;
        }
      }

      // Função para criar explosão completa
      function createExplosion(x, y, size = 1, particleCount = 20) {
        for (let i = 0; i < particleCount; i++) {
          game.particles.push(new ExplosionParticle(x, y, "orange", size));
        }
        
        // Flash branco no centro
        game.particles.push({
          x: x,
          y: y,
          radius: 5 * size,
          life: 5,
          maxLife: 5,
          color: '#FFFFFF',
          update() { this.life--; this.radius *= 1.5; },
          draw() {
            const alpha = this.life / this.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha * 0.7;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          },
          get dead() { return this.life <= 0; }
        });
      }

      class OrbitalDrone {
        constructor(player, angle, weaponInstance) {
          this.player = player;
          this.angle = angle; // em radianos
          this.radius = 50;
          this.weapon = weaponInstance;
          this.cooldown = 0;
        }

        update(index, total) {
          // Orbita baseado em tempo + índice (para múltiplos drones)
          const rotationSpeed = 0.02;
          this.angle += rotationSpeed;

          // Calcula a posição em volta do player
          const px = this.player.x + this.player.width / 2;
          const py = this.player.y + this.player.height / 2;
          this.x = px + Math.cos(this.angle) * this.radius;
          this.y = py + Math.sin(this.angle) * this.radius;

          // Tiro automático
          if (this.cooldown <= 0) {
            const vx = this.weapon.speed;
            const vy = 0;
            game.projectiles.push(new Projectile(this.x, this.y, this.weapon));
            // Aplica redutor de cooldown baseado em upgrades
            const fireRateMultiplier = 1 - (game.upgrades.fireRate * 0.10);
            this.cooldown = this.weapon.cooldown * fireRateMultiplier;
          } else {
            this.cooldown--;
          }
        }

        draw() {
          ctx.fillStyle = this.weapon.color || "cyan";
          ctx.beginPath();
          ctx.arc(this.x, this.y, 6, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      class WeaponInstance {
        constructor(type, level = 1) {
          this.type = type; // referencia ao tipo base (WeaponTypes ou AuxiliaryWeaponTypes)
          this.level = level;
          this.damage = type.damage + (level - 1);
          this.cooldown = Math.max(5, type.cooldown - (level - 1));
          this.cooldownCounter = 0;
          this.spread = type.spread || false;
          this.homing = type.homing || false;
          this.color = type.color;
          this.name = type.name;
          this.speed = type.speed;
        }

        levelUp() {
          this.level++;
          this.damage++;
          this.cooldown = Math.max(5, this.type.cooldown - (this.level - 1));
        }

        readyToShoot() {
          return this.cooldownCounter <= 0;
        }

        updateCooldown(player) {
          let factor = 1;
          if (player?.rapidFireTimer > 0) {
            factor = 2; // 2x mais rápido (cooldown reduzido pela metade)
          }

          if (this.cooldownCounter > 0) {
            this.cooldownCounter -= factor;
          }
        }

        resetCooldown() {
          this.cooldownCounter = this.cooldown;
        }
      }

      const DropTypes = {
        LIFE: {
          name: "LIFE",
          color: "green",
          apply(player) {
            if (player.health < player.maxHealth) {
              player.health++;
              game.damageTexts.push(
                new DamageText(player.x, player.y, "+1 HP", "green")
              );
            }
          },
        },
        SHIELD: {
          name: "SHIELD",
          color: "cyan",
          apply(player) {
            player.invincibilityTimer = 240;
            game.damageTexts.push(
              new DamageText(player.x, player.y, "Shield!", "cyan")
            );
          },
        },
        BOMB: {
          name: "BOMB",
          color: "red",
          apply(player) {
            const count = game.enemies.length;
            game.enemies = [];
            game.projectiles = game.projectiles.filter((p) => !p.homing);

            game.damageTexts.push(
              new DamageText(player.x, player.y, `💣 ${count} enemies`, "red")
            );
          },
        },
        SPEED: {
          name: "SPEED",
          color: "orange",
          apply(player) {
            player.speedBoost = 1.5;
            player.speedBoostTimer = 300;
            game.damageTexts.push(
              new DamageText(player.x, player.y, "Speed!", "orange")
            );
          },
        },
        RAPID: {
          name: "RAPID",
          color: "magenta",
          apply(player) {
            player.rapidFireTimer = 300; // dura 5 segundos (60 FPS)
            game.damageTexts.push(
              new DamageText(player.x, player.y, "Rapid Fire!", "magenta")
            );
          },
        },
      };

      class DropInstance {
        constructor(x, y, dropType) {
          this.x = x;
          this.y = y;
          this.width = 20;
          this.height = 20;
          this.dropType = dropType;
        }

        draw() {
          ctx.fillStyle = this.dropType.color;
          ctx.fillRect(this.x, this.y, this.width, this.height);
          ctx.fillStyle = "black";
          ctx.font = "12px Arial";
          ctx.fillText(this.dropType.name[0], this.x + 6, this.y + 14); // Letra do tipo
        }

        update() {
          this.x -= 2;
        }

        apply(player) {
          this.dropType.apply(player);
        }
      }

      function createWeapon(type, level = 1) {
        const base = WeaponTypes[type];
        return new WeaponInstance(base, level);
      }

      // Adicionar classe PowerUp de arma
      class WeaponPowerUp {
        constructor(x, y, weaponType) {
          this.x = x;
          this.y = y;
          this.width = 20;
          this.height = 20;
          this.weaponType = weaponType;
        }

        draw() {
          ctx.fillStyle = this.weaponType.color;
          ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        update() {
          this.x -= 2;
        }

        apply(player) {
          const same = player.primaryWeapon.name === this.weaponType.name;

          if (same) {
            player.primaryWeapon.levelUp();
          } else {
            console.log(this.weaponType);
            const isAuxiliary = this.weaponType.isAuxiliary === true;

            if (isAuxiliary) {
              const existing = player.auxiliaryWeapons.find(
                (w) => w.name === this.weaponType.name
              );
              if (existing) {
                existing.levelUp();
              } else if (player.auxiliaryWeapons.length < 5) {
                player.auxiliaryWeapons.push(
                  new WeaponInstance(this.weaponType)
                );
                game.damageTexts.push(
                  new DamageText(this.x, this.y, "New Auxiliary Weapon", "gray")
                );
              }
            } else {
              // Ex: game.damageTexts.push(new DamageText(this.x, this.y, "Incompatível", "gray"));
            }
          }
        }
      }

      // ============================================
      // [07] POWER-UPS E MOEDAS
      // ============================================
      class PowerUp {
        constructor(x, y) {
          this.x = x;
          this.y = y;
          this.width = 20;
          this.height = 20;
          this.vx = (Math.random() - 0.5) * 2; // Movimento horizontal aleatório
          this.vy = -3 - Math.random() * 2; // Pula para cima
          this.gravity = 0.2;
          this.bounce = 0.4;
          this.lifetime = 600; // 10 segundos
        }

        draw() {
          ctx.drawImage(IMAGES.health, this.x, this.y, this.width, this.height);
        }

        update() {
          // Física do power-up
          this.vy += this.gravity;
          this.x += this.vx;
          this.y += this.vy;
          
          // Fricção
          this.vx *= 0.98;
          
          // Bounce no chão
          const groundY = canvas.height - canvas.height * 0.1 - this.height;
          if (this.y >= groundY) {
            this.y = groundY;
            this.vy *= -this.bounce;
            this.vx *= 0.8;
            
            // Para de quicar se muito lento
            if (Math.abs(this.vy) < 0.5) {
              this.vy = 0;
            }
          }
          
          // Move para esquerda com o cenário
          this.x -= 1;
          
          // Lifetime
          this.lifetime--;
          
          // Magnetismo - atrai para o player quando próximo
          const dx = game.player.x - this.x;
          const dy = game.player.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 100) {
            const pullForce = 0.2;
            this.x += (dx / dist) * pullForce * 10;
            this.y += (dy / dist) * pullForce * 10;
          }
        }
        
        get dead() {
          return this.lifetime <= 0 || this.x < -50;
        }
      }

      // ============================================
      // [09] JOGADOR (Player Class)
      // ============================================
      class Player {
        constructor() {
          this.x = 100;
          this.y = canvas.height * 0.5;
          this.width = 80;
          this.height = 80;
          this.velocity = 0;
          this.gravity = 0.3;
          this.lift = -0.6;
          this.cooldown = 0;
          this.airborne = true;
          this.maxHealth = 5;
          this.health = this.maxHealth;
          this.invincible = false;
          this.invincibilityTimer = 0;
          this.speed = 8;
          this.rapidFireTimer = 0;
          this.orbitalDrones = [];
          this.shieldActive = false;
          this.shieldTimer = 0;

          // Propriedades para movimento suave no mobile
          this.targetX = null;
          this.targetY = null;
          this.moveSpeed = 0.15; // Velocidade de interpolação (0.1 = mais lento, 0.3 = mais rápido)

          // Propriedades para inclinação (tilt) ao se mover
          this.tiltAngle = 0; // Ângulo atual de inclinação
          this.maxTilt = 0.15; // Inclinação máxima em radianos (~8 graus)
          this.tiltSpeed = 0.1; // Velocidade de transição da inclinação
          this.prevX = this.x; // Posição anterior para calcular movimento
          
          // Partículas de fumaça quando vida baixa
          this.smokeParticles = [];
          this.smokeTimer = 0;
          this.prevY = this.y;
          
          // Animação de morte
          this.isDying = false;
          this.deathTimer = 0;
          this.deathVelocity = 0;
          this.deathRotation = 0;
          this.deathRotationSpeed = 0;
          this.exploded = false;
          
          // Knockback ao tomar dano
          this.knockbackX = 0;
          this.knockbackY = 0;

          // Propriedades para animação da hélice traseira
          this.propellerAngle = 0;
          this.propellerSpeed = 0.3; // Velocidade de rotação da hélice
          this.propellerRadius = 8; // Raio da hélice

          // Propriedades para animação do rotor principal
          this.mainRotorAngle = 0;
          this.mainRotorSpeed = 0.2; // Velocidade de rotação do rotor principal
          this.mainRotorRadius = 30; // Raio do rotor principal

          // Armas - Começa com BASIC e sem auxiliares
          this.primaryWeapon = new WeaponInstance(WeaponTypes.BASIC);
          this.auxiliaryWeapons = []; // Começa vazio, pode ter até 3
        }

        draw() {
          // Desenha partículas de fumaça ANTES do helicóptero (atrás)
          this.smokeParticles.forEach(p => p.draw(ctx));
          
          // Salva o estado do canvas antes de aplicar rotação
          ctx.save();
          
          // Define o ponto de rotação no centro do helicóptero
          const centerX = this.x + this.width / 2;
          const centerY = this.y + this.height / 2;
          
          // Move para o centro do helicóptero
          ctx.translate(centerX, centerY);
          
          // Aplica a rotação (inclinação)
          ctx.rotate(this.tiltAngle);
          
          // Move de volta para desenhar o helicóptero
          ctx.translate(-centerX, -centerY);
          
          // Desenha o helicóptero com transparência se invencível
          if (
            this.invincible &&
            Math.floor(this.invincibilityTimer / 5) % 2 === 0
          ) {
            ctx.globalAlpha = 0.5;
          }
          ctx.drawImage(
            IMAGES.helicopter,
            this.x,
            this.y,
            this.width,
            this.height
          );
          ctx.globalAlpha = 1.0;

          // Desenha a hélice traseira animada
          this.drawPropeller();
          
          // Desenha o rotor principal animado
          this.drawMainRotor();

          // Restaura o estado do canvas (remove a rotação)
          ctx.restore();

          // Desenha escudo se ativo
          if (this.shieldActive && this.shieldTimer > 0) {
            const shieldRadius = Math.max(this.width, this.height) / 2 + 15;
            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;
            
            // Efeito de pulso
            const pulse = Math.sin(Date.now() / 100) * 3;
            
            ctx.save();
            ctx.strokeStyle = "rgba(138, 43, 226, 0.6)"; // Purple
            ctx.lineWidth = 4;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.arc(centerX, centerY, shieldRadius + pulse, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
            
            // Barra de tempo do shield
            const shieldBarWidth = 60;
            const shieldBarHeight = 4;
            const shieldBarX = this.x;
            const shieldBarY = this.y - 20;
            const shieldPercent = this.shieldTimer / 180;
            
            ctx.fillStyle = "rgba(138, 43, 226, 0.3)";
            ctx.fillRect(shieldBarX, shieldBarY, shieldBarWidth, shieldBarHeight);
            ctx.fillStyle = "rgba(138, 43, 226, 0.8)";
            ctx.fillRect(shieldBarX, shieldBarY, shieldBarWidth * shieldPercent, shieldBarHeight);
          }

          // Desenha a barra de vida (sem rotação)
          const barWidth = 60;
          const barHeight = 8;
          const barX = this.x;
          const barY = this.y - 12;
          const healthPercent = this.health / this.maxHealth;
          
          // Fundo da barra
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
          ctx.fillRect(barX, barY, barWidth, barHeight);
          
          // Cor da barra baseada na porcentagem de vida
          let barColor;
          if (healthPercent <= 0.15) {
            // 15% ou menos: vermelho piscando
            barColor = Math.floor(Date.now() / 200) % 2 === 0 ? "#ff0000" : "#cc0000";
          } else if (healthPercent <= 0.3) {
            // 30% ou menos: laranja/vermelho
            barColor = "#ff4400";
          } else if (healthPercent <= 0.5) {
            // 50% ou menos: amarelo
            barColor = "#ffcc00";
          } else {
            // Acima de 50%: verde
            barColor = "#00ff00";
          }
          
          ctx.fillStyle = barColor;
          ctx.fillRect(
            barX,
            barY,
            barWidth * healthPercent,
            barHeight
          );
          
          // Borda da barra
          ctx.strokeStyle = "black";
          ctx.lineWidth = 2;
          ctx.strokeRect(barX, barY, barWidth, barHeight);

          if (this.orbitalDrones) {
            this.orbitalDrones.forEach((drone) => drone.draw());
          }
        }

        drawPropeller() {
          const centerX = this.x + this.width / 27;
          const centerY = this.y + this.height / 2.7;
          
          // Salva o estado atual do canvas
          ctx.save();
          
          // Move o ponto de rotação para o centro do player
          ctx.translate(centerX, centerY);
          
          // Rotaciona baseado no ângulo da hélice
          ctx.rotate(this.propellerAngle);
          
          // Desenha as pás da hélice
          ctx.strokeStyle = "#333";
          ctx.lineWidth = 2;
          
          // Pá 1 (horizontal)
          ctx.beginPath();
          ctx.moveTo(-this.propellerRadius, 0);
          ctx.lineTo(this.propellerRadius, 0);
          ctx.stroke();
          
          // Pá 2 (vertical)
          ctx.beginPath();
          ctx.moveTo(0, -this.propellerRadius);
          ctx.lineTo(0, this.propellerRadius);
          ctx.stroke();
          
          // Desenha o centro da hélice
          ctx.fillStyle = "#666";
          ctx.beginPath();
          ctx.arc(0, 0, .5, 0, Math.PI * 2);
          ctx.fill();
          
          // Restaura o estado do canvas
          ctx.restore();
        }

        drawMainRotor() {
          const centerX = this.x + 47;
          const centerY = this.y + 25; // Posiciona acima do helicóptero
          
          // Salva o estado atual do canvas
          ctx.save();
          
          // Move o ponto de rotação para o centro do rotor
          ctx.translate(centerX, centerY);
          
          // Calcula a opacidade baseada no ângulo para simular o efeito de "aparecer e sumir" (flicker/blur)
          // A opacidade irá oscilar entre 0.3 e 0.8, dando a impressão de movimento rápido.
          const minOpacity = 0.3;
          const maxOpacity = 0.8;
          const opacity = minOpacity + (maxOpacity - minOpacity) * Math.abs(Math.sin(this.mainRotorAngle * 2)); 
          
          ctx.globalAlpha = opacity; // Aplica a transparência

          // Desenha as pás do rotor principal como uma linha horizontal fixa
          ctx.strokeStyle = "#444";
          ctx.lineWidth = 4;
          
          // Pá 1 (horizontal) - parte esquerda
          ctx.beginPath();
          ctx.moveTo(-this.mainRotorRadius, 0);
          ctx.lineTo(-2, 0); // Desenha até a esquerda do centro
          ctx.stroke();

          // Pá 2 (horizontal) - parte direita
          ctx.beginPath();
          ctx.moveTo(2, 0); // Desenha a partir da direita do centro
          ctx.lineTo(this.mainRotorRadius, 0);
          ctx.stroke();
          
          // Desenha o centro do rotor
          ctx.beginPath();
          ctx.arc(0, 0, 2, 0, Math.PI * 2);
          ctx.fillStyle = "#555";
          ctx.fill();

          ctx.globalAlpha = 1; // Restaura a opacidade global para não afetar outros desenhos
          // Restaura o estado do canvas
          ctx.restore();
        }

        die() {
          // Inicia a animação de morte
          this.isDying = true;
          this.deathTimer = 0;
          this.deathVelocity = -3; // Impulso inicial para cima
          this.deathRotationSpeed = 0.1; // Rotação ao cair
          this.exploded = false;
        }

        updateDeath() {
          if (!this.isDying) return false;
          
          this.deathTimer++;
          
          // Física da queda
          this.deathVelocity += 0.4; // Gravidade
          this.y += this.deathVelocity;
          this.x -= 2; // Move ligeiramente para trás
          
          // Rotação descontrolada
          this.deathRotation += this.deathRotationSpeed;
          this.deathRotationSpeed += 0.005; // Acelera a rotação
          
          // Fumaça intensa durante a queda
          if (this.deathTimer % 2 === 0) {
            const smokeX = this.x + this.width / 2 + (Math.random() - 0.5) * 30;
            const smokeY = this.y + this.height / 2 + (Math.random() - 0.5) * 30;
            this.smokeParticles.push(new SmokeParticle(smokeX, smokeY));
          }
          
          // Verifica se bateu no chão
          const groundY = canvas.height - canvas.height * 0.1;
          if (this.y + this.height >= groundY && !this.exploded) {
            this.exploded = true;
            // Cria explosão no impacto
            createExplosion(this.x + this.width , groundY, 20, 15);
            this.deathTimer = 0; // Reseta para contar tempo da explosão
          }
          
          // Após explosão, aguarda um pouco antes do game over
          if (this.exploded && this.deathTimer > 60) {
            return true; // Sinaliza que a animação terminou
          }
          
          return false; // Ainda está morrendo
        }

        drawDeath() {
          if (!this.isDying) return;
          
          // Desenha fumaça
          this.smokeParticles.forEach(p => p.draw(ctx));
          
          // Se ainda não explodiu, desenha o helicóptero caindo
          if (!this.exploded) {
            ctx.save();
            
            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;
            
            ctx.translate(centerX, centerY);
            ctx.rotate(this.deathRotation);
            ctx.translate(-centerX, -centerY);
            
            // Desenha com transparência piscante
            if (Math.floor(this.deathTimer / 3) % 2 === 0) {
              ctx.globalAlpha = 0.8;
            }
            
            ctx.drawImage(
              IMAGES.helicopter,
              this.x,
              this.y,
              this.width,
              this.height
            );
            
            ctx.globalAlpha = 1.0;
            ctx.restore();
          }
        }

        takeDamage(amount, fromX, fromY) {
          // Aplica dano
          this.health -= amount;
          this.invincibilityTimer = 180;
          
          // Calcula direção do knockback (oposto ao impacto)
          const dx = this.x + this.width / 2 - fromX;
          const dy = this.y + this.height / 2 - fromY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            // Normaliza e aplica força
            this.knockbackX = (dx / distance) * 15; // Força do knockback
            this.knockbackY = (dy / distance) * 15;
          }
          
          // Cria partículas de impacto
          const impactX = this.x + this.width / 2;
          const impactY = this.y + this.height / 2;
          for (let i = 0; i < 8; i++) {
            game.particles.push(new ImpactParticle(impactX, impactY));
          }
          
          // Efeito de screen shake
          game.shakeX = 3;
          game.shakeY = 3;
          
          // Texto de dano
          game.damageTexts.push(
            new DamageText(this.x, this.y, "-" + amount.toFixed(1), "red")
          );
          
          // Verifica morte
          if (this.health <= 0) {
            this.die();
          }
        }

        update() {
          // Aplica knockback
          if (this.knockbackX !== 0 || this.knockbackY !== 0) {
            this.x += this.knockbackX;
            this.y += this.knockbackY;
            
            // Reduz knockback gradualmente
            this.knockbackX *= 0.8;
            this.knockbackY *= 0.8;
            
            // Para quando muito pequeno
            if (Math.abs(this.knockbackX) < 0.1) this.knockbackX = 0;
            if (Math.abs(this.knockbackY) < 0.1) this.knockbackY = 0;
          }
          
          // Movimento suave para mobile
          if (this.targetX !== null && this.targetY !== null) {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            
            // Interpolação suave
            this.x += dx * this.moveSpeed;
            this.y += dy * this.moveSpeed;
            
            // Para quando estiver próximo o suficiente do alvo
            if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
              this.x = this.targetX;
              this.y = this.targetY;
              this.targetX = null;
              this.targetY = null;
            }
          }

          // Atualiza animação da hélice traseira
          this.propellerAngle += this.propellerSpeed;
          
          // Atualiza animação do rotor principal
          this.mainRotorAngle += this.mainRotorSpeed;

          // Calcula inclinação baseada no movimento horizontal
          const velocityX = this.x - this.prevX;
          const velocityY = this.y - this.prevY;
          
          // Inclinação para frente quando movendo para direita
          let targetTilt = 0;
          if (velocityX > 0.5) {
            targetTilt = this.maxTilt; // Inclina para frente
          } else if (velocityX < -0.5) {
            targetTilt = -this.maxTilt * 0.5; // Inclina levemente para trás
          }
          
          // Inclinação adicional baseada no movimento vertical
          if (velocityY < -0.5) {
            targetTilt += this.maxTilt * 0.3; // Inclina mais para frente ao subir
          } else if (velocityY > 0.5) {
            targetTilt -= this.maxTilt * 0.3; // Inclina para trás ao descer
          }
          
          // Suaviza a transição do ângulo de inclinação
          this.tiltAngle += (targetTilt - this.tiltAngle) * this.tiltSpeed;
          
          // Atualiza posição anterior
          this.prevX = this.x;
          this.prevY = this.y;

          if (controlMode === CONTROLSMODES.HELICOPTER) {
            // Controle vertical - Space ou Up/W para subir
            if (keys["Space"] || keys["ArrowUp"] || keys["KeyW"]) {
              this.velocity += this.lift;
            }

            this.velocity += this.gravity;
            this.y += this.velocity;

            const groundY = canvas.height - this.height - canvas.height * 0.1;
            if (this.y >= groundY) {
              this.y = groundY;
              this.velocity = 0;
              this.airborne = false;
            } else {
              this.airborne = true;
            }

            if (this.y < 0) {
              this.y = 0;
              this.velocity = 0;
            }

            // Controle horizontal (apenas quando airborne)
            if (this.airborne) {
              const speed = this.speed * 0.3; // 30% da velocidade do modo avião
              if (keys["ArrowLeft"] || keys["KeyA"]) {
                this.x -= speed;
              }
              if (keys["ArrowRight"] || keys["KeyD"]) {
                this.x += speed;
              }

              // Limites da tela
              if (this.x < 0) this.x = 0;
              if (this.x + this.width > canvas.width) {
                this.x = canvas.width - this.width;
              }
            }
          } else if (controlMode === CONTROLSMODES.PLANE) {
            const speed = this.speed * (this.speedBoost || 1);
            if (keys["ArrowUp"] || keys["KeyW"]) this.y -= speed;
            if (keys["ArrowDown"] || keys["KeyS"]) this.y += speed;
            if (keys["ArrowLeft"] || keys["KeyA"]) this.x -= speed;
            if (keys["ArrowRight"] || keys["KeyD"]) this.x += speed;

            const groundY = canvas.height - this.height - canvas.height * 0.1;
            if (this.y >= groundY) this.y = groundY;
            if (this.y < 0) this.y = 0;
            if (this.x < 0) this.x = 0;
            if (this.x + this.width > canvas.width)
              this.x = canvas.width - this.width;
          }

          this.primaryWeapon.updateCooldown(this);
          if (this.primaryWeapon.readyToShoot()) {
            this.shoot();
            this.primaryWeapon.resetCooldown();
          }

          this.auxiliaryWeapons.forEach((weapon) => {
            weapon.updateCooldown(this);
            if (weapon.readyToShoot()) {
              this.fireWeapon(weapon);
              weapon.resetCooldown();
            }
          });

          if (this.speedBoostTimer > 0) {
            this.speedBoostTimer--;
            if (this.speedBoostTimer <= 0) {
              this.speedBoost = 1;
            }
          }

          if (this.rapidFireTimer > 0) {
            this.rapidFireTimer--;
          }

          if (this.cooldown > 0) this.cooldown--;
          if (this.invincibilityTimer > 0) {
            this.invincibilityTimer--;
            this.invincible = true;
          } else {
            this.invincible = false;
          }
          
          // Atualiza shield timer
          if (this.shieldTimer > 0) {
            this.shieldTimer--;
            if (this.shieldTimer <= 0) {
              this.shieldActive = false;
            }
          }

          if (!this.orbitalDrones) this.orbitalDrones = [];

          const orbitalWeapons = this.auxiliaryWeapons.filter(
            (w) => w.name === "ORBITAL"
          );

          if (orbitalWeapons.length > 0) {
            const weapon = orbitalWeapons[0];
            const count = Math.min(weapon.level, 4); // até 3 drones
            while (this.orbitalDrones.length < count) {
              this.orbitalDrones.push(
                new OrbitalDrone(this, Math.random() * Math.PI * 2, weapon)
              );
            }
            while (this.orbitalDrones.length > count) {
              this.orbitalDrones.pop();
            }

            this.orbitalDrones.forEach((drone, i) => drone.update(i, count));
          }
          
          // Gera partículas de fumaça quando vida está baixa (30% ou menos)
          const healthPercent = this.health / this.maxHealth;
          if (healthPercent <= 0.3 && healthPercent > 0) {
            this.smokeTimer++;
            // Frequência baseada na vida: quanto menor, mais fumaça
            const smokeFrequency = healthPercent < 0.15 ? 3 : 6;
            
            if (this.smokeTimer >= smokeFrequency) {
              // Posição atrás do helicóptero
              const smokeX = this.x + 22;
              const smokeY = this.y + this.height / 2 + (Math.random() - 0.5) * 20;
              this.smokeParticles.push(new SmokeParticle(smokeX, smokeY));
              this.smokeTimer = 0;
            }
          }
          
          // Atualiza e limpa partículas de fumaça
          this.smokeParticles.forEach(p => p.update());
          this.smokeParticles = this.smokeParticles.filter(p => !p.dead);
        }

        shoot() {
          // Atira com arma principal
          if (this.cooldown <= 0) {
            // Se a arma tem burst, dispara múltiplos tiros
            if (this.primaryWeapon.type.burst) {
              const burstCount = this.primaryWeapon.type.burstCount || 3;
              const burstDelay = this.primaryWeapon.type.burstDelay || 5;
              
              for (let i = 0; i < burstCount; i++) {
                setTimeout(() => {
            this.fireWeapon(this.primaryWeapon);
                }, i * burstDelay * 16); // ~16ms por frame
              }
            } else {
              this.fireWeapon(this.primaryWeapon);
            }
            this.cooldown = this.primaryWeapon.cooldown;
          }
        }

        fireWeapon(weapon) {
          const centerY = this.y + this.height / 2;

          if (weapon.name === "MINE") {
            const mineX = this.x + this.width + 20;
            const mineY = this.y + this.height / 2;
            game.projectiles.push(
              new ProximityMineProjectile(mineX, mineY, weapon.damage)
            );
            return;
          }

          if (weapon.name === "TURRET") {
            // Torreta atira para frente e diagonais
            game.projectiles.push(
              new Projectile(this.x + this.width, centerY, weapon, 0)
            );
            game.projectiles.push(
              new Projectile(this.x + this.width, centerY, weapon, -3)
            );
            game.projectiles.push(
              new Projectile(this.x + this.width, centerY, weapon, 3)
            );
            return;
          }

          if (weapon.name === "BEAM") {
            // Raios laterais (cima e baixo)
            const topY = this.y;
            const bottomY = this.y + this.height;
            game.projectiles.push(
              new Projectile(this.x + this.width, topY, weapon, 0)
            );
            game.projectiles.push(
              new Projectile(this.x + this.width, bottomY, weapon, 0)
            );
            return;
          }

          if (weapon.name === "SHIELD") {
            // Shield é passivo, só ativa quando tomar dano
            if (!this.shieldActive) {
              this.shieldActive = true;
              this.shieldTimer = 180; // 3 segundos
            }
            return;
          }

          if (weapon.spread) {
            const angles = [-2, 0, 2];
            for (let angle of angles) {
              game.projectiles.push(
                new Projectile(this.x + this.width, centerY, weapon, angle)
              );
            }
          } else {
            game.projectiles.push(
              new Projectile(this.x + this.width, centerY, weapon)
            );
          }
        }
      }

      // ============================================
      // [06] PROJÉTEIS (Player e Inimigos)
      // ============================================
      class Projectile {
        constructor(x, y, weapon, verticalOffset = 0) {
          this.x = x;
          this.y = y;
          this.speed = weapon.speed;
          // Aplica multiplicador de dano baseado em upgrades
          const damageMultiplier = 1 + (game.upgrades.damage * 0.20);
          this.damage = weapon.damage * damageMultiplier;
          this.color = weapon.color;
          this.weaponName = weapon.name;
          this.width = 10;
          this.height = 3;
          this.verticalOffset = verticalOffset;
          this.homing = weapon.homing || false;
          this.lifetime = 300;
          this.wobbleY = weapon.wobbleY || 0;
          this.baseY = this.y;
          this.frameCount = 0;

          this.vx = this.speed;
          this.vy = verticalOffset;

          if (this.homing) {
            this.target = null;
          }
        }

        draw() {
          ctx.fillStyle = this.color;
          ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        update() {
          if (this.homing) {
            this.lifetime--;
            if (this.lifetime <= 0) this.dead = true;

            if (
              !this.target ||
              this.target.health <= 0 ||
              this.target.x + this.target.width < 0
            ) {
              const newTarget = game.enemies
                .filter((e) => e.x > game.player.x && e.health > 0)
                .sort((a, b) => a.x - b.x)[0];

              if (newTarget) {
                this.target = newTarget;
              } else {
                this.x += this.vx;
                this.y += this.vy;
                this.checkOutOfBounds();
                return;
              }
            }

            // Ajusta trajetória em direção ao alvo travado
            const dx = this.target.x + this.target.width / 2 - this.x;
            const dy = this.target.y + this.target.height / 2 - this.y;
            const mag = Math.sqrt(dx * dx + dy * dy) || 1;
            this.vx = (dx / mag) * this.speed;
            this.vy = (dy / mag) * this.speed;

            this.x += this.vx;
            this.y += this.vy;
          } else {
            // Projétil comum
            this.x += this.speed;
            this.frameCount++;

            if (this.wobbleY) {
                const noise = (Math.random() - 0.5) * this.wobbleY * 2; // ruído aleatório leve
                this.y += noise;
            } else {
              this.y += this.verticalOffset;
            }
          }

          this.checkOutOfBounds();
        }

        checkOutOfBounds() {
          if (
            this.x > canvas.width ||
            this.x + this.width < 0 ||
            this.y < 0 ||
            this.y > canvas.height
          ) {
            this.dead = true;
          }
        }
      }

      class EnemyProjectile {
        constructor(x, y, damage = 1) {
          this.x = x;
          this.y = y;
          this.speed = 4;
          this.width = 8;
          this.height = 3;
          this.damage = damage;
        }

        draw() {
          ctx.fillStyle = "purple";
          ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        update() {
          this.x -= this.speed;
        }
      }

      class EnemyProjectileAngular {
        constructor(x, y, targetX, targetY, damage = 2) {
          this.x = x;
          this.y = y;
          const dx = targetX - x;
          const dy = targetY - y;
          const magnitude = Math.sqrt(dx * dx + dy * dy);
          this.vx = (dx / magnitude) * 4;
          this.vy = (dy / magnitude) * 4;
          this.width = 8;
          this.height = 3;
          this.damage = damage;
        }

        draw() {
          ctx.fillStyle = "orange";
          ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        update() {
          this.x += this.vx;
          this.y += this.vy;
        }
      }
      // ============================================
      // [10] COMPONENTES REUTILIZÁVEIS (Composition Pattern)
      // ============================================
      
      // Componente de Movimento com Wobble
      class WobbleMovement {
        constructor(config = {}) {
          this.speed = config.speed || 2;
          this.wobbleSpeed = config.wobbleSpeed || 0.06;
          this.wobbleAmplitude = config.wobbleAmplitude || 15;
          this.wobbleOffset = Math.random() * Math.PI * 2;
          this.wobbleCounter = 0;
        }
        
        update(entity) {
          entity.x -= this.speed;
          this.wobbleCounter += this.wobbleSpeed;
          entity.y = entity.baseY + Math.sin(this.wobbleCounter + this.wobbleOffset) * this.wobbleAmplitude;
        }
      }
      
      // Componente de Sistema de Partículas (Flares/Flames)
      class FlameEmitter {
        constructor(config = {}) {
          this.particles = [];
          this.spawnCounter = 0;
          this.spawnRate = config.spawnRate || 3;
          this.particleCount = config.particleCount || [2, 3];
          this.offsetX = config.offsetX || 0;
          this.offsetY = config.offsetY || 0;
        }
        
        update(entity) {
          this.spawnCounter++;
          if (this.spawnCounter >= this.spawnRate) {
            this.spawnCounter = 0;
            const turbineX = entity.x + entity.width + this.offsetX;
            const turbineY = entity.y + entity.height / 2 + this.offsetY;
            
            const min = this.particleCount[0];
            const max = this.particleCount[1];
            const count = Math.floor(Math.random() * (max - min + 1)) + min;
            
            for (let i = 0; i < count; i++) {
              this.particles.push(new FlameParticle(turbineX, turbineY + (Math.random() - 0.5) * 10));
            }
          }
          
          this.particles.forEach(p => p.update());
          this.particles = this.particles.filter(p => !p.dead);
        }
        
        draw() {
          this.particles.forEach(p => p.draw());
        }
      }
      
      // Componente de Arma/Disparo
      class WeaponComponent {
        constructor(config = {}) {
          this.damage = config.damage || 1;
          this.cooldown = Math.random() * 120 + 60; // Inicializa com valor aleatório
          this.cooldownMin = config.cooldownMin || 60;
          this.cooldownMax = config.cooldownMax || 180;
        }
        
        update(entity) {
          this.cooldown--;
          if (this.cooldown <= 0) {
            this.fire(entity);
            this.cooldown = Math.random() * (this.cooldownMax - this.cooldownMin) + this.cooldownMin;
          }
        }
        
        fire(entity) {
          game.enemyProjectiles.push(
            new EnemyProjectile(entity.x, entity.y + entity.height / 2, this.damage)
          );
        }
      }
      
      // Componente de Arma Tripla (Bomber)
      class TripleWeaponComponent extends WeaponComponent {
        fire(entity) {
          // Atira 3 projéteis em linha vertical
          for (let i = -1; i <= 1; i++) {
            game.enemyProjectiles.push(
              new EnemyProjectile(entity.x, entity.y + entity.height / 2 + i * 10, this.damage)
            );
          }
        }
      }
      
      // Componente de Arma Sniper (Angular/Mira)
      class SniperWeaponComponent extends WeaponComponent {
        fire(entity) {
          const target = game.player;
          game.enemyProjectiles.push(
            new EnemyProjectileAngular(
              entity.x,
              entity.y + entity.height / 2,
              target.x + target.width / 2,
              target.y + target.height / 2,
              this.damage
            )
          );
        }
      }
      
      // Componente de Arma Dive (Disparo em mergulho)
      class DiveWeaponComponent extends WeaponComponent {
        constructor(config = {}) {
          super(config);
          this.hasFired = false;
        }
        
        fire(entity) {
          // Só atira uma vez durante o mergulho
          if (!this.hasFired && entity.phase === 'diving') {
            const target = game.player;
            game.enemyProjectiles.push(
              new EnemyProjectileAngular(
                entity.x,
                entity.y + entity.height / 2,
                target.x + target.width / 2,
                target.y + target.height / 2,
                this.damage
              )
            );
            this.hasFired = true;
          }
        }
      }
      
      // ============================================
      // [04] PARTÍCULAS (Efeitos Visuais)
      // ============================================
      
      // Classe para partículas de fumaça (quando vida baixa)
      class SmokeParticle {
        constructor(x, y) {
          this.x = x;
          this.y = y;
          this.vx = (Math.random() - 0.5) * 0.5; // Movimento horizontal leve
          this.vy = -Math.random() * 2 - 1; // Sobe
          this.size = Math.random() * 2 + 4; // Tamanho entre 4-12
          this.life = 30; // Vida da partícula em frames
          this.maxLife = this.life;
          this.opacity = 0.6;
        }

        update() {
          this.x += this.vx;
          this.y += this.vy;
          this.life--;
          this.size += 0.3; // Expande com o tempo
          this.opacity = (this.life / this.maxLife) * 0.8; // Fade out
          this.vy *= 0.98; // Desacelera ao subir
        }

        draw(context) {
          if (!context) return; // Proteção contra contexto undefined
          const alpha = this.opacity;
          // Fumaça cinza escura
          context.fillStyle = `rgba(40, 40, 40, ${alpha})`;
          context.beginPath();
          context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          context.fill();
          
          // Borda mais clara para dar profundidade
          context.fillStyle = `rgba(80, 80, 80, ${alpha * 0.5})`;
          context.beginPath();
          context.arc(this.x - this.size * 0.2, this.y - this.size * 0.2, this.size * 0.6, 0, Math.PI * 2);
          context.fill();
        }

        get dead() {
          return this.life <= 0;
        }
      }
      
      // Classe para partículas de impacto (quando toma dano)
      class ImpactParticle {
        constructor(x, y) {
          this.x = x;
          this.y = y;
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 3 + 2;
          this.vx = Math.cos(angle) * speed;
          this.vy = Math.sin(angle) * speed;
          this.size = Math.random() * 3 + 2;
          this.life = 20;
          this.maxLife = this.life;
          // Cores de impacto (vermelho, laranja, amarelo)
          const colors = ['#ff0000', '#ff4400', '#ff8800', '#ffaa00', '#ffff00'];
          this.color = colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
          this.x += this.vx;
          this.y += this.vy;
          this.vx *= 0.95; // Desacelera
          this.vy *= 0.95;
          this.life--;
          this.size *= 0.95; // Diminui
        }

        draw(context) {
          if (!context) return; // Proteção contra contexto undefined
          const alpha = this.life / this.maxLife;
          context.fillStyle = this.color;
          context.globalAlpha = alpha;
          context.beginPath();
          context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          context.fill();
          context.globalAlpha = 1;
        }

        get dead() {
          return this.life <= 0;
        }
      }
      
      // Classe para partículas de chama da turbina
      class FlameParticle {
        constructor(x, y) {
          this.x = x;
          this.y = y;
          this.vx = Math.random() * 2 + 1; // Move para a direita (trás da nave que vai para esquerda)
          this.vy = (Math.random() - 0.5) * 1; // Movimento vertical aleatório
          this.size = Math.random() * 1 + 2; // Tamanho entre 3-9
          this.life = 15; // Vida da partícula em frames
          this.maxLife = this.life;
          // Cores variadas para o fogo
          const colors = ['#FF4500', '#FF6347', '#FF8C00', '#FFD700', '#FFA500', '#FF0000'];
          this.color = colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
          this.x += this.vx;
          this.y += this.vy;
          this.life--;
          this.size *= 0.95; // Diminui gradualmente
        }

        draw() {
          const alpha = this.life / this.maxLife;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        get dead() {
          return this.life <= 0;
        }
      }

      // ============================================
      // [11] INIMIGOS COMPOSTOS (Nova Arquitetura)
      // ============================================

      // EnemyComposed já foi definido acima nos componentes

      // ============================================
      // [12] INIMIGOS LEGADOS (Herança)
      // ============================================
      
      // ============================================
      // CLASSE ENEMY - Base Legada (Uso Limitado)
      // 
      // USO ATUAL: Apenas para MiniBoss (herança)
      // NOVO PADRÃO: createEnemy() com EnemyComposed (composição)
      //
      // Esta classe está mantida APENAS porque MiniBoss herda dela.
      // Todos os outros inimigos agora usam o padrão de composição.
      // ============================================
      class Enemy {
        constructor(x, y) {
          this.x = x;
          this.y = y;
          this.width = 50;
          this.height = 50;
          this.speed = 2;
          this.cooldown = Math.random() * 180 + 60;
          this.damage = 1;
          this.flameParticles = []; // Array de partículas de chama
          this.flameSpawnCounter = 0; // Contador para spawn de partículas
          // Balanço vertical
          this.wobbleOffset = Math.random() * Math.PI * 2; // Offset aleatório para variação
          this.wobbleSpeed = 0.06; // Velocidade do balanço
          this.wobbleAmplitude = 15; // Amplitude do balanço (pixels)
          this.baseY = y; // Posição Y base
          this.wobbleCounter = 0; // Contador para animação
        }

        draw() {
          // Desenha partículas de chama primeiro (atrás do inimigo)
          this.flameParticles.forEach(p => p.draw());
          
          // Desenha o inimigo
          if (IMAGES.inimigo1 && IMAGES.inimigo1.complete) {
            ctx.drawImage(IMAGES.inimigo1, this.x, this.y, this.width, this.height);
          } else {
            // Fallback caso a imagem não carregue
          ctx.fillStyle = "#594700";
          ctx.fillRect(this.x, this.y, this.width, this.height);
          }
        }

        update() {
          this.x -= this.speed;
          
          // Balanço vertical suave
          this.wobbleCounter += this.wobbleSpeed;
          this.y = this.baseY + Math.sin(this.wobbleCounter + this.wobbleOffset) * this.wobbleAmplitude;
          
          this.cooldown--;
          if (this.cooldown <= 0) {
            game.enemyProjectiles.push(
              new EnemyProjectile(this.x, this.y + this.height / 2, this.damage)
            );
            this.cooldown = Math.random() * 180 + 60;
          }
          
          // Sistema de partículas de chama da turbina
          this.flameSpawnCounter++;
          if (this.flameSpawnCounter >= 3) { // Cria partículas a cada 3 frames
            this.flameSpawnCounter = 0;
            // Posição da turbina (traseira do inimigo, centro vertical)
            const turbineX = this.x + this.width;  // Traseira da nave
            const turbineY = this.y + this.height / 2; // Centro vertical
            
            // Cria 2-3 partículas por vez para um efeito mais denso
            const particleCount = Math.floor(Math.random() * 2) + 2;
            for (let i = 0; i < particleCount; i++) {
              this.flameParticles.push(new FlameParticle(turbineX, turbineY + (Math.random() - 0.5) * 10));
            }
          }
          
          // Atualiza e remove partículas mortas
          this.flameParticles.forEach(p => p.update());
          this.flameParticles = this.flameParticles.filter(p => !p.dead);
        }
      }
      
      // ============================================
      // FACTORY PARA CRIAR ENEMIES (Facilita migração)
      // ============================================
      function createEnemy(x, y, type = 'basic') {
        const configs = {
          basic: {
            sprite: 'inimigo1',
            width: 50,
            height: 50,
            health: 2,
            movement: { speed: 2, wobbleSpeed: 0.06, wobbleAmplitude: 15 },
            flames: { spawnRate: 3, particleCount: [2, 3] },
            weapon: { damage: 1, cooldownMin: 60, cooldownMax: 180 }
          },
          drone: {
            sprite: 'inimigo2',
            width: 45,
            height: 45,
            health: 4,
            movement: { speed: 2.5, wobbleSpeed: 0.08, wobbleAmplitude: 10 },
            flames: { spawnRate: 4, particleCount: [1, 2] },
            weapon: { damage: 1, cooldownMin: 60, cooldownMax: 180 }
          },
          bomber: {
            sprite: 'inimigo3', // Pode criar sprite próprio depois
            width: 40,
            height: 40,
            health: 3,
            movement: { speed: 2, wobbleSpeed: 0.05, wobbleAmplitude: 12 },
            flames: { spawnRate: 3, particleCount: [2, 3] },
            weaponType: 'triple', // Usa arma tripla
            weapon: { damage: 1, cooldownMin: 90, cooldownMax: 150 }
          },
          sniper: {
            sprite: 'inimigo4', // Pode criar sprite próprio depois
            width: 20,
            height: 60,
            health: 4,
            movement: { speed: 1, wobbleSpeed: 0.03, wobbleAmplitude: 8 }, // Mais lento
            flames: { spawnRate: 5, particleCount: [1, 2] },
            weaponType: 'sniper', // Usa arma de mira
            weapon: { damage: 2, cooldownMin: 180, cooldownMax: 240 }
          },
          shielded: {
            sprite: 'inimigo4', // Pode criar sprite próprio depois
            width: 50,
            height: 50,
            health: 10,
            movement: { speed: 1.5, wobbleSpeed: 0.04, wobbleAmplitude: 10 },
            flames: { spawnRate: 4, particleCount: [2, 3] },
            weapon: { damage: 2, cooldownMin: 70, cooldownMax: 130 }
          }
        };
        
        const config = configs[type] || configs.basic;
        const enemy = new EnemyComposed(x, y, config);
        
        // Adiciona arma customizada se necessário
        if (config.weaponType === 'triple') {
          // Remove arma padrão e adiciona tripla
          enemy.components = enemy.components.filter(c => !(c instanceof WeaponComponent));
          enemy.components.push(new TripleWeaponComponent(config.weapon));
        } else if (config.weaponType === 'sniper') {
          enemy.components = enemy.components.filter(c => !(c instanceof WeaponComponent));
          enemy.components.push(new SniperWeaponComponent(config.weapon));
        }
        
        return enemy;
      }
      
      // Nova classe Enemy com composição
      class EnemyComposed {
        constructor(x, y, config = {}) {
          // Propriedades básicas
          this.x = x;
          this.y = y;
          this.baseY = y;
          this.width = config.width || 50;
          this.height = config.height || 50;
          this.sprite = config.sprite || 'inimigo1';
          this.damage = config.damage || 1;
          
          // Sistema de saúde
          this.maxHealth = config.health || 1;
          this.health = this.maxHealth;
          
          // Componentes (Composition over Inheritance)
          this.components = [];
          
          // Adiciona movimento com wobble
          if (config.movement !== false) {
            this.components.push(new WobbleMovement(config.movement || {
              speed: 2,
              wobbleSpeed: 0.06,
              wobbleAmplitude: 15
            }));
          }
          
          // Adiciona sistema de partículas de chama
          if (config.flames !== false) {
            this.components.push(new FlameEmitter(config.flames || {
              spawnRate: 3,
              particleCount: [2, 3],
              offsetX: 0,
              offsetY: 0
            }));
          }
          
          // Adiciona sistema de disparo
          if (config.weapon !== false) {
            this.components.push(new WeaponComponent(config.weapon || {
              damage: this.damage,
              cooldownMin: 60,
              cooldownMax: 180
            }));
          }
        }
        
        takeDamage(amount = 1) {
          this.health -= amount;
          return this.health <= 0;
        }
        
        addComponent(component) {
          this.components.push(component);
          return this;
        }
        
        update() {
          // Delega para os componentes
          this.components.forEach(component => {
            if (component.update) component.update(this);
          });
        }
        
        draw() {
          // Desenha efeitos primeiro (flames, etc)
          this.components.forEach(component => {
            if (component.draw) component.draw(this);
          });
          
          // Desenha sprite do inimigo
          if (IMAGES[this.sprite] && IMAGES[this.sprite].complete) {
            ctx.drawImage(IMAGES[this.sprite], this.x, this.y, this.width, this.height);
          } else {
            // Fallback caso a imagem não carregue
            ctx.fillStyle = "#594700";
            ctx.fillRect(this.x, this.y, this.width, this.height);
          }
          
          // Desenha barra de vida
          ctx.fillStyle = "gray";
          ctx.fillRect(this.x, this.y - 6, this.width, 5);
          ctx.fillStyle = "lime";
          ctx.fillRect(
            this.x,
            this.y - 6,
            this.width * (this.health / this.maxHealth),
            5
          );
          ctx.strokeStyle = "black";
          ctx.strokeRect(this.x, this.y - 6, this.width, 5);
        }
      }

      // ============================================
      // CLASSE MINIBOSS - Mantida como classe dedicada
      // Lógica complexa de movimento, evasão e ataque justifica classe própria
      // Herda de Enemy pois ainda usa funcionalidades base
      // ============================================
      class MiniBoss extends Enemy {
        constructor(x, y) {
          super(x, y);
          this.width = 120;
          this.height = 80;
          this.maxHealth = 50;
          this.health = 50;
          this.speed = 1;
          this.cooldown = 90;
        }

        update() {
          const player = game.player;
          const targetX = 400; // posição que o miniboss tenta manter
          const dodgeRange = 100;
          const dodgeIntensity = 3;

          // Inicializa variáveis de controle (se ainda não tiverem)
          if (this.dodgeCooldown === undefined) this.dodgeCooldown = 0;
          if (this.evadeDirection === undefined) this.evadeDirection = 0;

          // 🟦 Movimento horizontal inteligente
          const buffer = 30; // margem de segurança entre o player e o miniboss
          // const targetX = 400;

          if (player.x > this.x + buffer) {
            // Player passou do miniboss → miniboss recua
            this.x += 1.5;
          } else if (this.x > targetX + 5) {
            // Retorna suavemente para a posição padrão
            this.x -= 1;
          } else if (this.x < targetX - 5) {
            this.x += 1;
          }

          // 🟥 Evasão de projéteis
          if (this.dodgeCooldown <= 0) {
            for (let p of game.projectiles) {
              const closeX =
                p.x > this.x - dodgeRange && p.x < this.x + this.width;
              const closeY =
                p.y > this.y - 30 && p.y < this.y + this.height + 30;
              if (closeX && closeY) {
                this.evadeDirection = p.y < this.y ? 1 : -1;
                this.dodgeCooldown = 30;
                break;
              }
            }
          } else {
            this.dodgeCooldown--;
          }

          // Aplica evasiva suavizada
          this.y += this.evadeDirection * dodgeIntensity;
          this.evadeDirection *= 0.9;

          // 🟨 Segue levemente o player se não estiver esquivando
          if (Math.abs(this.evadeDirection) < 0.1) {
            const dy = (player.y - this.y) * 0.02;
            this.y += dy;
          }

          // 🔺 Ataque padrão
          this.cooldown--;
          if (this.cooldown <= 0) {
            for (let i = -1; i <= 1; i++) {
              const angle = i * 0.2;
              const speed = 5;
              const vx = Math.cos(angle) * -speed;
              const vy = Math.sin(angle) * speed;
              game.enemyProjectiles.push(
                new MiniBossProjectile(this.x, this.y + this.height / 2, vx, vy)
              );
            }
            this.cooldown = 90;
          }
        }

        draw() {
          ctx.fillStyle = "#880000";
          ctx.fillRect(this.x, this.y, this.width, this.height);

          ctx.fillStyle = "black";
          ctx.fillRect(this.x, this.y - 10, this.width, 6);
          ctx.fillStyle = "red";
          ctx.fillRect(
            this.x,
            this.y - 10,
            this.width * (this.health / this.maxHealth),
            6
          );
        }

        takeDamage(dmg) {
          this.health -= dmg;
          if (this.health <= 0) {
            this.dead = true;
            game.damageTexts.push(
              new DamageText(this.x, this.y, "Boss Defeated!", "red")
            );
            // DESABILITADO: Boss agora dropa moedas ao invés de powerup
            // game.powerUps.push(
            //   new DropInstance(this.x, this.y, DropTypes.RAPID)
            // );
            
            // Boss dropa muitas moedas
            for (let i = 0; i < 10 && game.coinsDropped.length < MAX_COINS_ON_SCREEN; i++) {
              const offsetX = (Math.random() - 0.5) * 80;
              const offsetY = (Math.random() - 0.5) * 80;
              game.coinsDropped.push(new CoinDrop(this.x + offsetX, this.y + offsetY, 5));
            }
            
            // Boss sempre dropa 2 vidas
            game.powerUps.push(new PowerUp(this.x - 30, this.y));
            game.powerUps.push(new PowerUp(this.x + 30, this.y));
            
            return true;
          }
          return false;
        }
      }

      class MiniBossProjectile {
        constructor(x, y, vx, vy) {
          this.x = x;
          this.y = y;
          this.vx = vx;
          this.vy = vy;
          this.width = 10;
          this.height = 4;
          this.damage = 2;
        }

        update() {
          this.x += this.vx;
          this.y += this.vy;
        }

        draw() {
          ctx.fillStyle = "darkred";
          ctx.fillRect(this.x, this.y, this.width, this.height);
        }
      }

      // Classe de partícula de fumaça do tank
      class TankSmokeParticle {
        constructor(x, y) {
          this.x = x;
          this.y = y;
          this.vx = Math.random() * 0.5 - 0.5; // Movimento horizontal leve
          this.vy = -Math.random() * 0.5 - 0.3; // Sobe levemente
          this.size = Math.random() * 3 + 2; // Tamanho entre 2-5
          this.life = 40; // Vida da partícula em frames
          this.maxLife = this.life;
          this.opacity = 0.5;
        }

        update() {
          this.x += this.vx;
          this.y += this.vy;
          this.life--;
          this.size += 0.15; // Expande levemente
          this.opacity = (this.life / this.maxLife) * 0.5; // Fade out
          this.vy *= 0.98; // Desacelera ao subir
        }

        draw() {
          const alpha = this.opacity;
          // Fumaça cinza do motor
          ctx.fillStyle = `rgba(60, 60, 60, ${alpha})`;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
          
          // Borda mais clara
          ctx.fillStyle = `rgba(100, 100, 100, ${alpha * 0.3})`;
          ctx.beginPath();
          ctx.arc(this.x - this.size * 0.3, this.y - this.size * 0.3, this.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }

        get dead() {
          return this.life <= 0;
        }
      }

      // Classe de partícula de disparo (muzzle flash)
      class MuzzleFlashParticle {
        constructor(x, y, angle) {
          this.x = x;
          this.y = y;
          // Direção baseada no ângulo do canhão
          const spread = (Math.random() - 0.5) * 0.3; // Pequeno spread
          this.vx = Math.cos(angle + spread) * (Math.random() * 2 + 1);
          this.vy = Math.sin(angle + spread) * (Math.random() * 2 + 1);
          this.size = Math.random() * 2 + 2; // Tamanho entre 2-4
          this.life = 15; // Vida curta (explosão rápida)
          this.maxLife = this.life;
          this.opacity = 1;
          // Cores de flash: amarelo/laranja/branco
          const colors = ['#ffff00', '#ffaa00', '#ff8800', '#ffffff', '#ffcc00'];
          this.color = colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
          this.x += this.vx;
          this.y += this.vy;
          this.life--;
          this.size += 0.2; // Expande rapidamente
          this.opacity = this.life / this.maxLife; // Fade rápido
          this.vx *= 0.92; // Desacelera
          this.vy *= 0.92;
        }

        draw() {
          ctx.save();
          ctx.globalAlpha = this.opacity;
          
          // Flash brilhante
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
          
          // Brilho externo
          ctx.shadowBlur = 8;
          ctx.shadowColor = this.color;
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
        }

        get dead() {
          return this.life <= 0;
        }
      }

      class Tank {
        constructor(x) {
          this.x = x;
          this.y = canvas.height - canvas.height * 0.1 - 40;
          this.width = 80;
          this.height = 60;
          this.speed = 1.2;
          this.cooldown = Math.random() * 180 + 60;
          this.cannonAngle = 0; // Ângulo do canhão
          this.cannonLength = 45; // Comprimento do canhão
          
          // Propriedades das rodas
          this.wheelRotation = 0; // Ângulo de rotação das rodas
          this.wheelRadius = 9; // Raio das rodas
          this.wheelPositions = [ // Posições relativas das 3 rodas
            { x: 15, y: this.height - 11},  // Roda esquerda
            { x: 35, y: this.height - 11 },  // Roda central
            { x: 55, y: this.height - 11}   // Roda direita
          ];
          
          // Sistema de partículas de fumaça
          this.smokeParticles = [];
          this.smokeSpawnCounter = 0;
        }

        drawWheel(x, y) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(this.wheelRotation);
          
          // Roda externa (pneu)
          ctx.fillStyle = "#2a2a2a";
          ctx.beginPath();
          ctx.arc(0, 0, this.wheelRadius, 0, Math.PI * 2);
          ctx.fill();
          
          // Aro interno
          ctx.fillStyle = "#555";
          ctx.beginPath();
          ctx.arc(0, 0, this.wheelRadius - 2, 0, Math.PI * 2);
          ctx.fill();
          
          // Raios da roda (4 raios)
          ctx.strokeStyle = "#777";
          ctx.lineWidth = 1.5;
          for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * (this.wheelRadius - 2), Math.sin(angle) * (this.wheelRadius - 2));
            ctx.stroke();
          }
          
          ctx.restore();
        }

        draw() {
          // Desenha partículas de fumaça PRIMEIRO (atrás de tudo)
          this.smokeParticles.forEach(p => p.draw());
          
          // Desenha o corpo do tank (sprite)
          if (IMAGES.tank && IMAGES.tank.complete) {
            ctx.drawImage(IMAGES.tank, this.x, this.y, this.width, this.height);
          } else {
            // Fallback caso o sprite não carregue
          ctx.fillStyle = "#333";
          ctx.fillRect(this.x, this.y, this.width, this.height);
          }
          
          // Desenha as rodas POR CIMA do sprite
          this.wheelPositions.forEach(wheel => {
            this.drawWheel(this.x + wheel.x, this.y + wheel.y);
          });
          
          // Desenha o canhão rotacionado apontando para o player (por último)
          const cannonBaseX = this.x + this.width / 2 ;
          const cannonBaseY = this.y + 15; // Ajusta para ficar no topo do tank
          
          ctx.save();
          ctx.translate(cannonBaseX, cannonBaseY);
          ctx.rotate(this.cannonAngle);
          
          // Desenha o canhão
          ctx.fillStyle = "#3e541f";

          ctx.fillRect(0, -3, this.cannonLength, 6); // Canhão horizontal que será rotacionado
          
          // Ponta do canhão mais escura
          ctx.fillStyle = "#222";
          ctx.fillRect(this.cannonLength - 5, -4, 5, 8);
          
          ctx.restore();
        }

        update() {
          this.x -= this.speed;
          
          // Anima as rodas baseado no movimento
          // Rotação proporcional à velocidade (quanto mais rápido, mais gira)
          this.wheelRotation += this.speed * 0.15;
          
          // Sistema de partículas de fumaça do motor
          this.smokeSpawnCounter++;
          if (this.smokeSpawnCounter >= 8) { // Spawna fumaça a cada 8 frames
            // Posição do escapamento (parte traseira do tank)
            const exhaustX = this.x +this.width - 5; // Traseira do tank
            const exhaustY = this.y + this.height / 2;
            this.smokeParticles.push(new TankSmokeParticle(exhaustX, exhaustY));
            this.smokeSpawnCounter = 0;
          }
          
          // Atualiza e remove partículas mortas
          this.smokeParticles.forEach(p => p.update());
          this.smokeParticles = this.smokeParticles.filter(p => !p.dead);
          
          // Calcula o ângulo para apontar para o player
          const target = game.player;
          const dx = target.x + target.width / 2 - (this.x + this.width / 2);
          const dy = target.y + target.height / 2 - (this.y + this.height / 2 - 5);
          this.cannonAngle = Math.atan2(dy, dx);
          
          this.cooldown--;
          if (this.cooldown <= 0) {
            // Calcula a posição da ponta do canhão
            const cannonBaseX = this.x + this.width / 2;
            const cannonBaseY = this.y + this.height / 2 - 5;
            const cannonTipX = cannonBaseX + Math.cos(this.cannonAngle) * this.cannonLength;
            const cannonTipY = cannonBaseY + Math.sin(this.cannonAngle) * this.cannonLength;
            
            // Dispara da ponta do canhão
            game.enemyProjectiles.push(
              new EnemyProjectileAngular(
                cannonTipX,
                cannonTipY,
                target.x + target.width / 2,
                target.y + target.height / 2
              )
            );
            
            // Cria partículas de flash do disparo (6-8 partículas)
            const particleCount = Math.floor(Math.random() * 3) + 6;
            for (let i = 0; i < particleCount; i++) {
              this.smokeParticles.push(
                new MuzzleFlashParticle(cannonTipX - 5, cannonTipY - 5, this.cannonAngle)
              );
            }
            
            this.cooldown = Math.random() * 180 + 60;
          }
        }
      }

      // ============================================
      // [13] INIMIGOS DEPRECADOS (Comentados - Não usar)
      // ============================================
      
      // ============================================
      // CLASSE BOMBERENEMY ANTIGA (Deprecated - NÃO É MAIS USADA)
      // MIGRADO: usar createEnemy(x, y, 'bomber')
      // ============================================
      /*
      class BomberEnemy extends Enemy {
        constructor(x, y) {
          super(x, y);
          this.width = 40;
          this.height = 40;
          this.damage = 1;
        }

        update() {
          this.x -= this.speed;
          this.cooldown--;
          if (this.cooldown <= 0) {
            for (let i = -1; i <= 1; i++) {
              game.enemyProjectiles.push(
                new EnemyProjectile(this.x, this.y + i * 10, this.damage)
              );
            }
            this.cooldown = Math.random() * 150 + 80;
          }
        }

        draw() {
          ctx.fillStyle = "#ff5555";
          ctx.fillRect(this.x, this.y, this.width, this.height);
        }
      }
      */

      // ============================================
      // CLASSE SNIPERENEMY ANTIGA (Deprecated - NÃO É MAIS USADA)
      // MIGRADO: usar createEnemy(x, y, 'sniper')
      // ============================================
      /*
      class SniperEnemy extends Enemy {
        constructor(x, y) {
          super(x, y);
          this.cooldown = 240;
          this.width = 20;
          this.height = 60;
          this.damage = 2;
        }

        update() {
          this.x -= this.speed * 0.5;
          this.cooldown--;
          if (this.cooldown <= 0) {
            const target = game.player;
            game.enemyProjectiles.push(
              new EnemyProjectileAngular(
                this.x,
                this.y + this.height / 2,
                target.x + target.width / 2,
                target.y + target.height / 2,
                this.damage
              )
            );
            this.cooldown = 240;
          }
        }

        draw() {
          ctx.fillStyle = "#3333cc";
          ctx.fillRect(this.x, this.y, this.width, this.height);
        }
      }
      */

      // ============================================
      // CLASSE SHIELDEDENEMY ANTIGA (Deprecated - NÃO É MAIS USADA)
      // MIGRADO: usar createEnemy(x, y, 'shielded')
      // ============================================
      /*
      class ShieldedEnemy extends Enemy {
        constructor(x, y) {
          super(x, y);
          this.shielded = true;
          this.width = 30;
          this.height = 50;
        }

        draw() {
          ctx.fillStyle = this.shielded ? "#88f" : "#f88";
          ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        hit() {
          if (this.shielded) {
            this.shielded = false;
            return false;
          } else {
            return true;
          }
        }
      }
      */

      // ============================================
      // CLASSE DIVEENEMY - Mantida como está (lógica complexa de fases)
      // ============================================
      class DiveEnemy {
        constructor(x) {
          const player = game.player;
          this.x = x;
          this.y = player.y; // Inicia na mesma altura que o player
          this.width = 30;
          this.height = 30;
          this.speed = 5;
          this.phase = "approaching";
          this.attackSpeed = 6;
          this.exitSpeed = 4;
          this.triggerDistance = 250;
          this.shot = false;
        }

        update() {
          const player = game.player;

          if (this.phase === "approaching") {
            this.x -= this.speed;

            const dx = this.x - (player.x + player.width);
            if (dx < this.triggerDistance) {
              this.phase = "diving";
            }
          } else if (this.phase === "diving") {
            this.y += this.attackSpeed;
            this.x -= this.speed * 0.5;

            if (!this.shot && Math.abs(this.y - player.y) < 30) {
              game.enemyProjectiles.push(
                new EnemyProjectile(this.x, this.y + this.height / 2)
              );
              this.shot = true;
            }

            if (this.y > player.y + 50) {
              this.phase = "exiting";
            }
          } else if (this.phase === "exiting") {
            this.y -= this.exitSpeed;
            this.x -= this.speed * 0.5;
          }
        }

        draw() {
          ctx.fillStyle = "#ffaa00";
          ctx.fillRect(this.x, this.y, this.width, this.height);
        }
      }

      // ============================================
      // CLASSE DRONEENEMY ANTIGA (Deprecated - NÃO É MAIS USADA)
      // MIGRADO: usar createEnemy(x, y, 'drone')
      // Mantida apenas como referência - PODE SER REMOVIDA
      // ============================================
      /*
      class DroneEnemy extends Enemy {
        constructor(x, y) {
          super(x, y);
          this.width = 45;
          this.height = 45;
          this.speed = 2.5;
          this.cooldown = 60 + Math.random() * 60;
          this.damage = 1;
          this.flameParticles = []; // Array de partículas de chama
          this.flameSpawnCounter = 0; // Contador para spawn de partículas
          // Balanço vertical (menor que o inimigo básico)
          this.wobbleOffset = Math.random() * Math.PI * 2;
          this.wobbleSpeed = 0.08; // Um pouco mais rápido
          this.wobbleAmplitude = 10; // Menor amplitude
          this.baseY = y;
          this.wobbleCounter = 0;
        }

        draw() {
          // Desenha partículas de chama primeiro (atrás do inimigo)
          this.flameParticles.forEach(p => p.draw());
          
          // Desenha o inimigo
          if (IMAGES.inimigo2 && IMAGES.inimigo2.complete) {
            ctx.drawImage(IMAGES.inimigo2, this.x, this.y, this.width, this.height);
          } else {
            // Fallback caso a imagem não carregue
          ctx.fillStyle = "#00ccff";
          ctx.fillRect(this.x, this.y, this.width, this.height);
          }
        }

        update() {
          this.x -= this.speed;
          
          // Balanço vertical suave
          this.wobbleCounter += this.wobbleSpeed;
          this.y = this.baseY + Math.sin(this.wobbleCounter + this.wobbleOffset) * this.wobbleAmplitude;
          
          this.cooldown--;
          if (this.cooldown <= 0) {
            game.enemyProjectiles.push(
              new EnemyProjectile(this.x, this.y + this.height / 2)
            );
            this.cooldown = 90 + Math.random() * 90;
          }
          
          // Sistema de partículas de chama da turbina
          this.flameSpawnCounter++;
          if (this.flameSpawnCounter >= 4) { // Cria partículas um pouco mais espaçadas
            this.flameSpawnCounter = 0;
            const turbineX = this.x + this.width; // Traseira da nave
            const turbineY = this.y + this.height / 2; // Centro vertical
            
            // Cria 1-2 partículas por vez (menos que o inimigo básico)
            const particleCount = Math.floor(Math.random() * 2) + 1;
            for (let i = 0; i < particleCount; i++) {
              this.flameParticles.push(new FlameParticle(turbineX, turbineY + (Math.random() - 0.5) * 8));
            }
          }
          
          // Atualiza e remove partículas mortas
          this.flameParticles.forEach(p => p.update());
          this.flameParticles = this.flameParticles.filter(p => !p.dead);
        }
      }
      */

      function dropOnEnemyDeath(enemy) {
        const dropChance = Math.random();

        if (dropChance < 0.1) {
          // 10% de chance de soltar vida
          game.powerUps.push(new PowerUp(enemy.x, enemy.y));
        } else if (dropChance < 0.2) {
          // 10% de chance de soltar arma
          const allTypes = [
            ...Object.values(WeaponTypes),
            ...Object.values(AuxiliaryWeaponTypes),
          ];
          const type = allTypes[Math.floor(Math.random() * allTypes.length)];
          game.powerUps.push(new WeaponPowerUp(enemy.x, enemy.y, type));
        }
      }

      function spawnDroneFormation(size = 3) {
        const baseX = canvas.width + 50;
        const baseY = 50 + Math.random() * (canvas.height - 200);
        const drones = [];

        for (let i = 0; i < size; i++) {
          const offsetY = i * 30;
          drones.push(createEnemy(baseX + i * 30, baseY + offsetY, 'drone'));
        }

        return drones; // ✅ retorna array de DroneEnemy
      }

      // ============================================
      // [14] FORMAÇÕES (Spawns Organizados)
      // ============================================
      function spawnArrowFormationGeneric(
        enemyClass,
        size = 6,
        direction = "<",
        spacingX = 30,
        spacingY = 20
      ) {
        const enemies = [];
        const baseX = canvas.width + 50;

        const groundHeight = canvas.height * 0.1;
        const safetyMargin = 60;

        // Altura total da formação vertical
        const formationHeight = (size - 1) * spacingY;

        // Limites seguros
        const minY = safetyMargin + formationHeight / 2;
        const maxY = canvas.height - groundHeight - formationHeight / 2;
        const centerY = minY + Math.random() * (maxY - minY);

        const half = Math.floor(size / 2);

        for (let i = 0; i < size; i++) {
          const offset = Math.abs(i - half);
          let x, y;

          switch (direction) {
            case "<": // seta para esquerda
              x = baseX + i * spacingX;
              y = centerY + offset * spacingY;
              break;
            case ">": // seta para direita
              x = baseX - i * spacingX;
              y = centerY + offset * spacingY;
              break;
            case "V": // seta para baixo
              x = baseX + offset * spacingX;
              y = centerY + i * spacingY;
              break;
            case "^": // seta para cima
              x = baseX + offset * spacingX;
              y = centerY - i * spacingY;
              break;
          }

          // Suporta tanto classes antigas quanto nova arquitetura
          if (enemyClass === Enemy || enemyClass === 'Enemy' || enemyClass === 'basic') {
            enemies.push(createEnemy(x, y, 'basic'));
          } else if (enemyClass === 'DroneEnemy' || enemyClass === 'drone') {
            enemies.push(createEnemy(x, y, 'drone'));
          } else if (enemyClass === 'BomberEnemy' || enemyClass === 'bomber') {
            enemies.push(createEnemy(x, y, 'bomber'));
          } else if (enemyClass === 'SniperEnemy' || enemyClass === 'sniper') {
            enemies.push(createEnemy(x, y, 'sniper'));
          } else if (enemyClass === 'ShieldedEnemy' || enemyClass === 'shielded') {
            enemies.push(createEnemy(x, y, 'shielded'));
          } else {
            // Fallback para classes antigas que ainda não foram migradas (DiveEnemy, Tank, etc)
          enemies.push(new enemyClass(x, y));
          }
        }

        return enemies;
      }

      // ============================================
      // [05] SISTEMA DE TEXTO (Feedback Visual)
      // ============================================
      class DamageText {
        constructor(x, y, text, color = "yellow") {
          this.x = x;
          this.y = y;
          this.text = text;
          this.color = color;
          this.alpha = 1;
          this.lifetime = 60;
        }

        draw() {
          ctx.globalAlpha = this.alpha;
          ctx.fillStyle = this.color;
          ctx.font = "16px Arial";
          ctx.fillText(this.text, this.x, this.y);
          ctx.globalAlpha = 1.0;
        }

        update() {
          this.y -= 0.5;
          this.alpha -= 1 / this.lifetime;
        }

        isAlive() {
          return this.alpha > 0;
        }
      }

      // Ajustar inimigos para ter vida e barra de vida
      function addHealthToEnemy(cls, baseHealth = 1) {
        return class extends cls {
          constructor(...args) {
            super(...args);
            this.maxHealth = baseHealth;
            this.health = baseHealth;
          }

          draw() {
            super.draw();
            ctx.fillStyle = "gray";
            ctx.fillRect(this.x, this.y - 6, this.width, 5);
            ctx.fillStyle = "lime";
            ctx.fillRect(
              this.x,
              this.y - 6,
              this.width * (this.health / this.maxHealth),
              5
            );
            ctx.strokeStyle = "black";
            ctx.strokeRect(this.x, this.y - 6, this.width, 5);
          }

          takeDamage(amount = 1) {
            this.health -= amount;
            return this.health <= 0;
          }
        };
      }

      // ============================================
      // Adiciona saúde aos inimigos legados (NÃO usar para novos inimigos)
      // Inimigos criados via createEnemy() já possuem saúde integrada
      // ============================================
      Enemy = addHealthToEnemy(Enemy, 1);
      // BomberEnemy = addHealthToEnemy(BomberEnemy, 3); // Comentado - agora usa createEnemy('bomber')
      // SniperEnemy = addHealthToEnemy(SniperEnemy, 4); // Comentado - agora usa createEnemy('sniper')
      DiveEnemy = addHealthToEnemy(DiveEnemy, 2);
      // ShieldedEnemy - Comentado, agora usa createEnemy('shielded')
      /*
      ShieldedEnemy = class extends addHealthToEnemy(ShieldedEnemy, 10) {
        takeDamage(amount = 1) {
          if (this.shielded) {
            this.shielded = false;
            game.damageTexts.push(
              new DamageText(this.x, this.y, "Shield Down", "cyan")
            );
            return false;
          } else {
            return super.takeDamage(amount);
          }
        }
      };
      */
      Tank = addHealthToEnemy(Tank, 5);
      // DroneEnemy = addHealthToEnemy(DroneEnemy, 1); // Comentado - agora usa createEnemy('drone')


      // ============================================
      // [15] SISTEMA DE WAVES
      // ============================================
      
      const WaveConfig = {
        // Configuração de waves específicas (1-20)
        waves: {
          1: { enemies: 5, tanks: 0, boss: false },
          2: { enemies: 6, tanks: 0, boss: false },
          3: { enemies: 7, tanks: 1, boss: false },
          4: { enemies: 8, tanks: 1, boss: false },
          5: { enemies: 10, tanks: 2, boss: true }, // Boss
          6: { enemies: 9, tanks: 2, boss: false },
          7: { enemies: 10, tanks: 2, boss: false },
          8: { enemies: 12, tanks: 3, boss: false },
          9: { enemies: 13, tanks: 3, boss: false },
          10: { enemies: 15, tanks: 3, boss: true }, // Boss
          11: { enemies: 14, tanks: 4, boss: false },
          12: { enemies: 15, tanks: 4, boss: false },
          13: { enemies: 16, tanks: 4, boss: false },
          14: { enemies: 17, tanks: 5, boss: false },
          15: { enemies: 20, tanks: 5, boss: true }, // Boss
          16: { enemies: 18, tanks: 5, boss: false },
          17: { enemies: 19, tanks: 6, boss: false },
          18: { enemies: 20, tanks: 6, boss: false },
          19: { enemies: 22, tanks: 7, boss: false },
          20: { enemies: 25, tanks: 8, boss: true }, // Boss
        },
        
        // Configuração padrão para waves 21+ (escala infinitamente)
        getWaveConfig(wave) {
          if (this.waves[wave]) {
            return this.waves[wave];
          }
          
          // Para waves 21+, escala automaticamente
          const enemies = Math.min(20 + Math.floor((wave - 20) * 1.5), 40);
          const tanks = Math.min(5 + Math.floor((wave - 20) / 2), 15);
          const boss = wave % 5 === 0; // Boss a cada 5 waves
          
          return { enemies, tanks, boss };
        },
        
        // Recompensa de moedas por wave
        getCoinReward(wave) {
          const baseReward = 10;
          const waveBonus = wave * 5;
          const config = this.getWaveConfig(wave);
          const bossBonus = config.boss ? 50 : 0;
          
          return baseReward + waveBonus + bossBonus;
        }
      };
      
      const WaveSystem = {
        currentWave: 0,
        waveActive: false,
        
        startWave(waveNumber) {
          this.currentWave = waveNumber;
          this.waveActive = true;
          
          // Spawna os inimigos da wave
          this.spawnWaveEnemies(waveNumber);
        },
        
        spawnWaveEnemies(wave) {
          const config = WaveConfig.getWaveConfig(wave);
          
          // Spawna inimigos em formações variadas
          let spawnedEnemies = 0;
          let formationDelay = 0;
          
          while (spawnedEnemies < config.enemies) {
            const remaining = config.enemies - spawnedEnemies;
            const formationType = Math.random();
            
            // Closure para capturar delay atual
            ((delay) => {
              setTimeout(() => {
                if (formationType < 0.3 && remaining >= 5) {
                  // Formação em seta
                  const formation = spawnArrowFormationGeneric(Enemy, Math.min(5, remaining), "<");
                  if (formation) {
                    const enemies = Array.isArray(formation) ? formation : [formation];
                    game.enemies.push(...enemies);
                  }
                } else if (formationType < 0.5 && remaining >= 4 && wave >= 3) {
                  // Formação de drones (wave 3+)
                  const formation = spawnDroneFormation(Math.min(4, remaining));
                  if (formation) {
                    const enemies = Array.isArray(formation) ? formation : [formation];
                    game.enemies.push(...enemies);
                  }
                } else {
                  // Spawn individual
                  const x = canvas.width + 50 + Math.random() * 100;
                  const y = 50 + Math.random() * (canvas.height * 0.6);
                  game.enemies.push(createEnemy(x, y, 'basic'));
                }
              }, delay);
            })(formationDelay);
            
            // Incrementa contadores
            if (formationType < 0.3 && remaining >= 5) {
              spawnedEnemies += 5;
            } else if (formationType < 0.5 && remaining >= 4 && wave >= 3) {
              spawnedEnemies += 4;
            } else {
              spawnedEnemies++;
            }
            
            formationDelay += 1500; // 1.5 segundos entre formações
          }
          
          // Spawna tanks com delay
          for (let i = 0; i < config.tanks; i++) {
            setTimeout(() => {
              const x = canvas.width + 100 + Math.random() * 200;
              game.tanks.push(new Tank(x));
            }, (i + 1) * 2000 + formationDelay); // Após as formações
          }
          
          // Spawna boss depois de todos os inimigos
          if (config.boss) {
            setTimeout(() => {
              game.enemies.push(new MiniBoss(canvas.width + 100, canvas.height / 2));
            }, 3000 + formationDelay); // Após tudo
          }
        },
        
        checkWaveComplete() {
          // Verifica se todos os inimigos e tanks foram mortos
          if (this.waveActive && game.enemies.length === 0 && game.tanks.length === 0) {
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
            this.startWave(nextWave);
          }, 100);
        }
      };

      const waves = [
            () => spawnArrowFormationGeneric(Enemy, 5),
            () => spawnDroneFormation(6),
            () => game.enemies.push(new MiniBoss(canvas.width + 100, 200)),
            () => spawnArrowFormationGeneric(SniperEnemy, 7),
            () => {
                spawnArrowFormationGeneric(Enemy, 3);
                spawnArrowFormationGeneric(DroneEnemy, 6);
            },
            () => game.enemies.push(new MiniBoss(canvas.width + 100, 250)),
            ];

            let currentWave = 0;
            let waveCountdown = 180; // 3 segundos
            let showingWaveText = false;
            let waveTextTimer = 60;


      function novoInimigoAleatorio() {
        const tipo = Math.random();
        const x = canvas.width + Math.random() * 400;

        const groundHeight = canvas.height * 0.1;
        const yMax = canvas.height - groundHeight - 50;
        const y = Math.random() * yMax;

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
            DroneEnemy,
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

      // ============================================
      // [21] GAME LOOP (Objeto Principal)
      // ============================================
      const game = window.game = {
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
            SaveSystem.clear();
            
            // Reseta tudo para valores iniciais
            setTimeout(() => {
              this.lives = 3;
              this.coins = 0;
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

          for (let i = 0; i < 3; i++) {
            const result = spawnWithDistance(
              () => new Tank(canvas.width + i * 400),
              [...this.enemies, ...this.tanks]
            );
            if (result) {
              const tanks = Array.isArray(result) ? result : [result];
              this.tanks.push(...tanks);
            }
          }

          this.grassXs = Array.from(
            { length: Math.ceil(canvas.width / 20) + 2 },
            (_, i) => i * 20
          );
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
              e.x + e.width > 0 && e.y + e.height > 0 && e.y < canvas.height
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
              const hit =
                p.x < e.x + e.width &&
                p.x + p.width > e.x &&
                p.y < e.y + e.height &&
                p.y + p.height > e.y;
              if (hit) {
                HitEffectManager.spawnEffect(p.x, p.y, e.hitEffect);

                if (e.takeDamage && e.takeDamage(p.damage)) {
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
                  const points = Math.floor(1 * this.comboSystem.multiplier);
                  this.score += points;
                  
                  // Dropa moeda (30% de chance) - respeitando limite
                  if (Math.random() < 0.3 && this.coinsDropped.length < MAX_COINS_ON_SCREEN) {
                    this.coinsDropped.push(new CoinDrop(e.x, e.y, 1));
                  }
                  
                  // Dropa vida (10% de chance)
                  if (Math.random() < 0.1) {
                    this.powerUps.push(new PowerUp(e.x, e.y));
                  }
                  
                  // Mostra pontos ganhos
                  if (points > 1) {
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
                if (t.takeDamage && t.takeDamage(p.damage)) {
                  // Cria explosão maior para tank
                  createExplosion(t.x + t.width / 2, t.y + t.height / 2, 1.5, 30);
                  
                  this.tanks.splice(ti, 1);
                  // this.tanks.push(new Tank(canvas.width + Math.random() * 400));
                  
                  // Adiciona kill ao combo e aplica multiplicador
                  this.comboSystem.addKill();
                  const points = Math.floor(2 * this.comboSystem.multiplier); // Tanks valem 2 pontos
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
                  
                  // Mostra pontos ganhos
                  if (points > 2) {
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

          // mini-chefe
          if (!this.miniBoss && this.score >= 25 && this.bossTimer <= 0) {
            this.miniBoss = new MiniBoss(
              canvas.width + 50,
              canvas.height / 2 - 40
            );
            this.enemies = []; // limpa inimigos normais para dar espaço
            this.bossActive = true;
          } else if (!this.miniBoss) {
            this.bossTimer--;
          }

          if (this.miniBoss) {
            this.miniBoss.update();
            if (this.miniBoss?.dead) {
              this.miniBoss = null;
              this.bossTimer = 2500;
              this.bossActive = false;
            }
          }

          if (this.miniBoss) {
            this.projectiles.forEach((p, pi) => {
              const b = this.miniBoss;
              const hit =
                p.x < b.x + b.width &&
                p.x + p.width > b.x &&
                p.y < b.y + b.height &&
                p.y + p.height > b.y;
              if (hit) {
                HitEffectManager.spawnEffect(p.x, p.y, b.hitEffect, 1.5);
                b.takeDamage(p.damage);
                this.projectiles.splice(pi, 1);
                this.damageTexts.push(
                  new DamageText(b.x, b.y, "-" + p.damage.toFixed(2), "orange")
                );
              }
            });
          }

          // Atualiza camadas de parallax e chão APENAS quando:
          // - Modo PLANE (sempre se move)
          // - Modo HELICOPTER + airborne (no ar, espaço pressionado)
          if (this.player.airborne || controlMode === CONTROLSMODES.PLANE) {
            // Move o parallax
            this.parallaxLayers.forEach(layer => layer.update());
            
            // Move o chão
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

          ctx.fillStyle = "black";
          ctx.font = "12px Arial";
          ctx.fillText("Score: " + this.score, 20, 30);
          
          // Indicador de Wave
          ctx.fillStyle = "#FF4444";
          ctx.font = "bold 16px Arial";
          ctx.fillText("WAVE: " + WaveSystem.currentWave, 20, 50);
          
          // Indicador de Vidas
          ctx.fillStyle = "#FF1744";
          ctx.font = "bold 14px Arial";
          ctx.fillText("❤️ x " + this.lives, 20, 70);
          
          ctx.fillStyle = "black";
          ctx.font = "12px Arial";
          ctx.fillText(
            "Weapon: " +
              this.player.primaryWeapon.name +
              " (Lv" +
              this.player.primaryWeapon.level +
              ")",
            20,
            90
          );

          // Se quiser exibir também as auxiliares:
          const auxNames = 
            this.player.auxiliaryWeapons
            ?.map((w) => `${w.name} (Lv${w.level || 1})`)
            .join(", ");
          if (auxNames) {
            ctx.font = "12px Arial";
            ctx.fillText("Aux: " + auxNames, 20, 110);
          }

          // Contador de moedas (canto superior direito)
          const coinX = canvas.width / 2;
          const coinY = 20;
          
          // Background do contador
          ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
          ctx.strokeStyle = "#FFD700";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(coinX - 10, coinY - 5, 110, 30, 15);
          ctx.fill();
          ctx.stroke();
          
          // Ícone da moeda
          ctx.fillStyle = "#FFD700";
          ctx.beginPath();
          ctx.arc(coinX + 10, coinY + 10, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#000";
          ctx.font = "bold 16px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("⭐", coinX + 10, coinY + 10);
          
          // Quantidade de moedas
          ctx.fillStyle = "#FFD700";
          ctx.font = "bold 20px Arial";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(this.coins, coinX + 30, coinY + 10);

          // Informações de debug (só exibe se debug estiver ativo)
          if (this.debug) {
          ctx.fillStyle = "black";
          ctx.font = "14px Arial";
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

          // Desenha o combo
          this.comboSystem.draw(ctx);

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

          if (showingWaveText) {
        ctx.fillStyle = "white";
        ctx.font = "28px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`Wave ${currentWave}`, canvas.width / 2, 80);
        waveTextTimer--;
        if (waveTextTimer <= 0) {
            showingWaveText = false;
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

          // Desenha o chão
          const groundY = canvas.height - canvas.height * 0.1;
          const grassY = groundY - 20;
          ctx.fillStyle = "#8b5237";
          ctx.fillRect(0, groundY, canvas.width, canvas.height * 0.1);
          
          // Desenha a grama
          for (let x of this.grassXs) {
            ctx.drawImage(IMAGES.grass, x, grassY, 18, 18);
          }
        },

        loop(timestamp) {
          const delta = timestamp - this.lastFrameTime;
          if (delta >= 500 / this.fps) {
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
      };

      // ============================================
      // [18] SISTEMA DE SAVE/LOAD
      // ============================================
      
      const SaveSystem = {
        SAVE_KEY: 'helicopterShooterSave',
        
        save() {
          const saveData = {
            coins: game.coins,
            lives: game.lives,
            primaryWeapon: game.player.primaryWeapon.name,
            auxiliaryWeapons: game.player.auxiliaryWeapons.map(w => w.name),
            highScore: game.highScore || 0,
            highWave: game.highWave || 0,
            upgrades: game.upgrades
          };
          
          localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
        },
        
        load() {
          const savedData = localStorage.getItem(this.SAVE_KEY);
          if (!savedData) return null;
          
          try {
            return JSON.parse(savedData);
          } catch (e) {
            console.error('Erro ao carregar save:', e);
            return null;
          }
        },
        
        clear() {
          localStorage.removeItem(this.SAVE_KEY);
        },
        
        applyLoad(saveData) {
          if (!saveData) return;
          
          // Restaura moedas e vidas
          game.coins = saveData.coins || 0;
          game.lives = saveData.lives || 3;
          game.highScore = saveData.highScore || 0;
          game.highWave = saveData.highWave || 0;
          
          // Restaura upgrades
          if (saveData.upgrades) {
            game.upgrades = saveData.upgrades;
          }
          
          // Aplica upgrades ao player
          this.applyUpgradesToPlayer();
          
          // Restaura arma primária
          if (saveData.primaryWeapon && saveData.primaryWeapon !== 'BASIC') {
            const weapon = ShopSystem.primaryWeapons.find(w => w.name === saveData.primaryWeapon);
            if (weapon) {
              game.player.primaryWeapon = new WeaponInstance(weapon.type);
            }
          }
          
          // Restaura armas auxiliares
          if (saveData.auxiliaryWeapons && saveData.auxiliaryWeapons.length > 0) {
            game.player.auxiliaryWeapons = [];
            saveData.auxiliaryWeapons.forEach(weaponName => {
              const weapon = ShopSystem.auxiliaryWeapons.find(w => w.name === weaponName);
              if (weapon) {
                game.player.auxiliaryWeapons.push(new WeaponInstance(weapon.type));
              }
            });
          }
        },
        
        applyUpgradesToPlayer() {
          const player = game.player;
          
          // Aplica upgrade de vida máxima
          player.maxHealth = 5 + game.upgrades.maxHealth;
          if (player.health > player.maxHealth) {
            player.health = player.maxHealth;
          }
          
          // Aplica upgrade de velocidade (multiplicador)
          const baseSpeed = 8;
          player.speed = baseSpeed * (1 + (game.upgrades.speed * 0.15));
          
          // Upgrades de dano e fireRate são aplicados diretamente nos projéteis/cooldown
        }
      };
      
      // ============================================
      // [19] SISTEMA DE LOJA (Shop)
      // ============================================
      
      const ShopSystem = {
        isOpen: false,
        
        // Catálogo de armas primárias
        primaryWeapons: [
          {
            id: 'basic',
            name: 'BASIC',
            desc: 'Arma inicial - Tiro simples',
            price: 0,
            type: WeaponTypes.BASIC
          },
          {
            id: 'spread',
            name: 'SPREAD',
            desc: 'Dispara 3 projéteis em leque',
            price: 50,
            type: WeaponTypes.SPREAD
          },
          {
            id: 'burst',
            name: 'BURST',
            desc: 'Rajada rápida de 3 tiros',
            price: 80,
            type: WeaponTypes.BURST
          },
          {
            id: 'laser',
            name: 'LASER',
            desc: 'Raio laser contínuo',
            price: 120,
            type: WeaponTypes.LASER
          },
          {
            id: 'missile',
            name: 'MISSILE',
            desc: 'Mísseis teleguiados poderosos',
            price: 150,
            type: WeaponTypes.MISSILE
          }
        ],
        
        // Catálogo de armas auxiliares
        auxiliaryWeapons: [
          {
            id: 'orbital',
            name: 'ORBITAL',
            desc: '🛸 Satélites que orbitam e atiram',
            price: 50,
            type: AuxiliaryWeaponTypes.ORBITAL
          },
          {
            id: 'missile',
            name: 'MISSILE',
            desc: '🚀 Mísseis teleguiados automáticos',
            price: 70,
            type: AuxiliaryWeaponTypes.MISSILE
          },
          {
            id: 'turret',
            name: 'TURRET',
            desc: '🔫 Torreta lateral de fogo rápido',
            price: 60,
            type: AuxiliaryWeaponTypes.TURRET
          },
          {
            id: 'beam',
            name: 'BEAM',
            desc: '⚡ Raios laterais contínuos',
            price: 65,
            type: AuxiliaryWeaponTypes.BEAM
          },
          {
            id: 'shield',
            name: 'SHIELD',
            desc: '🛡️ Escudo absorve 1 hit (3 min)',
            price: 100,
            type: AuxiliaryWeaponTypes.SHIELD
          }
        ],
        
        init() {
          const shopButton = document.getElementById('shopButton');
          const shopModal = document.getElementById('shopModal');
          const closeShop = document.getElementById('closeShop');
          
          // Abrir loja
          shopButton.addEventListener('click', () => this.open());
          
          // Fechar loja
          closeShop.addEventListener('click', () => this.close());
          shopModal.addEventListener('click', (e) => {
            if (e.target === shopModal) this.close();
          });
          
          // Sistema de abas
          const tabs = document.querySelectorAll('.shopTab');
          const tabContents = document.querySelectorAll('.shopTabContent');
          
          tabs.forEach(tab => {
            tab.addEventListener('click', () => {
              const targetTab = tab.getAttribute('data-tab');
              
              // Remove active de todas as abas
              tabs.forEach(t => t.classList.remove('active'));
              tabContents.forEach(tc => tc.classList.remove('active'));
              
              // Adiciona active na aba clicada
              tab.classList.add('active');
              document.getElementById(targetTab + 'Tab').classList.add('active');
            });
          });
          
          this.render();
        },
        
        open() {
          this.isOpen = true;
          game.isPaused = true; // Pausa o jogo
          document.getElementById('shopModal').classList.add('active');
          this.render();
        },
        
        close() {
          this.isOpen = false;
          game.isPaused = false; // Despausa o jogo
          document.getElementById('shopModal').classList.remove('active');
        },
        
        render() {
          // Atualiza moedas
          document.getElementById('shopCoins').textContent = game.coins;
          
          // Atualiza slots de auxiliares
          const auxSlots = game.player.auxiliaryWeapons.length;
          document.getElementById('auxSlots').textContent = `${auxSlots}/3`;
          
          // Renderiza upgrades
          this.renderUpgrades();
          
          // Renderiza armas primárias
          const primaryContainer = document.getElementById('primaryWeapons');
          primaryContainer.innerHTML = '';
          
          this.primaryWeapons.forEach(weapon => {
            const isOwned = game.player.primaryWeapon.name === weapon.name;
            const canBuy = game.coins >= weapon.price;
            
            const itemDiv = document.createElement('div');
            itemDiv.className = 'shopItem' + (isOwned ? ' owned' : '');
            itemDiv.innerHTML = `
              <div class="itemInfo">
                <div class="itemName">${weapon.name}</div>
                <div class="itemDesc">${weapon.desc}</div>
              </div>
              <div class="itemPrice">
                <span style="color: #FFD700; font-size: 18px; font-weight: bold;">
                  ${weapon.price} ⭐
                </span>
                <button class="buyButton" 
                  ${!canBuy || isOwned ? 'disabled' : ''}
                  onclick="ShopSystem.buyPrimary('${weapon.id}')">
                  ${isOwned ? 'EQUIPADA' : 'COMPRAR'}
                </button>
              </div>
            `;
            primaryContainer.appendChild(itemDiv);
          });
          
          // Renderiza armas auxiliares
          const auxContainer = document.getElementById('auxiliaryWeapons');
          auxContainer.innerHTML = '';
          
          this.auxiliaryWeapons.forEach(weapon => {
            const isOwned = game.player.auxiliaryWeapons.some(w => w.name === weapon.name);
            const canBuy = game.coins >= weapon.price && auxSlots < 3;
            
            const itemDiv = document.createElement('div');
            itemDiv.className = 'shopItem' + (isOwned ? ' owned' : '');
            itemDiv.innerHTML = `
              <div class="itemInfo">
                <div class="itemName">${weapon.name}</div>
                <div class="itemDesc">${weapon.desc}</div>
              </div>
              <div class="itemPrice">
                <span style="color: #FFD700; font-size: 18px; font-weight: bold;">
                  ${weapon.price} ⭐
                </span>
                <button class="buyButton" 
                  ${!canBuy || isOwned ? 'disabled' : ''}
                  onclick="ShopSystem.buyAuxiliary('${weapon.id}')">
                  ${isOwned ? 'EQUIPADA' : auxSlots >= 3 ? 'SEM SLOT' : 'COMPRAR'}
                </button>
              </div>
            `;
            auxContainer.appendChild(itemDiv);
          });
        },
        
        buyPrimary(weaponId) {
          const weapon = this.primaryWeapons.find(w => w.id === weaponId);
          if (!weapon) return;
          
          if (game.coins >= weapon.price) {
            game.coins -= weapon.price;
            game.player.primaryWeapon = new WeaponInstance(weapon.type);
            
            // Salva progresso
            SaveSystem.save();
            
            // Feedback visual
            this.showPurchaseEffect('Arma Primária Adquirida!');
            this.render();
          }
        },
        
        buyAuxiliary(weaponId) {
          const weapon = this.auxiliaryWeapons.find(w => w.id === weaponId);
          if (!weapon) return;
          
          if (game.coins >= weapon.price && game.player.auxiliaryWeapons.length < 3) {
            game.coins -= weapon.price;
            game.player.auxiliaryWeapons.push(new WeaponInstance(weapon.type));
            
            // Salva progresso
            SaveSystem.save();
            
            // Feedback visual
            this.showPurchaseEffect('Arma Auxiliar Adquirida!');
            this.render();
          }
        },
        
        // Catálogo de upgrades
        upgrades: [
          {
            id: 'damage',
            name: '💥 DANO',
            desc: 'Aumenta o dano de todas as armas',
            maxLevel: 5,
            basePrice: 40,
            priceIncrease: 30,
            effect: (level) => `+${level * 20}% Dano`
          },
          {
            id: 'speed',
            name: '⚡ VELOCIDADE',
            desc: 'Aumenta a velocidade de movimento',
            maxLevel: 5,
            basePrice: 35,
            priceIncrease: 25,
            effect: (level) => `+${level * 15}% Velocidade`
          },
          {
            id: 'maxHealth',
            name: '❤️ VIDA MÁXIMA',
            desc: 'Aumenta sua vida máxima',
            maxLevel: 5,
            basePrice: 50,
            priceIncrease: 40,
            effect: (level) => `+${level} HP (Max: ${5 + level})`
          },
          {
            id: 'fireRate',
            name: '🔥 TAXA DE TIRO',
            desc: 'Reduz o tempo entre disparos',
            maxLevel: 5,
            basePrice: 45,
            priceIncrease: 35,
            effect: (level) => `-${level * 10}% Cooldown`
          },
          {
            id: 'regen',
            name: '💚 REGENERAÇÃO',
            desc: 'Regenera 1 HP a cada 10 segundos',
            maxLevel: 1,
            basePrice: 150,
            priceIncrease: 0,
            effect: (level) => level ? 'ATIVO' : 'INATIVO'
          }
        ],
        
        buyUpgrade(upgradeId) {
          const upgrade = this.upgrades.find(u => u.id === upgradeId);
          if (!upgrade) return;
          
          const currentLevel = game.upgrades[upgradeId] === true ? 1 : (game.upgrades[upgradeId] || 0);
          
          // Verifica se já está no nível máximo
          if (currentLevel >= upgrade.maxLevel) return;
          
          // Calcula preço
          const price = upgrade.basePrice + (currentLevel * upgrade.priceIncrease);
          
          if (game.coins >= price) {
            game.coins -= price;
            
            // Aplica upgrade
            if (upgradeId === 'regen') {
              game.upgrades[upgradeId] = true;
            } else {
              game.upgrades[upgradeId]++;
            }
            
            // Aplica efeitos ao player
            SaveSystem.applyUpgradesToPlayer();
            
            // Salva progresso
            SaveSystem.save();
            
            // Feedback visual
            this.showPurchaseEffect(`${upgrade.name} Melhorado!`);
            this.render();
          }
        },
        
        renderUpgrades() {
          const upgradesList = document.getElementById('upgradesList');
          upgradesList.innerHTML = '';
          
          this.upgrades.forEach(upgrade => {
            const currentLevel = upgrade.id === 'regen' 
              ? (game.upgrades[upgrade.id] ? 1 : 0)
              : (game.upgrades[upgrade.id] || 0);
            const isMaxed = currentLevel >= upgrade.maxLevel;
            const price = upgrade.basePrice + (currentLevel * upgrade.priceIncrease);
            const canBuy = game.coins >= price && !isMaxed;
            
            const upgradeDiv = document.createElement('div');
            upgradeDiv.className = 'upgradeItem' + (isMaxed ? ' maxed' : '');
            upgradeDiv.innerHTML = `
              <div class="upgradeHeader">
                <div class="upgradeTitle">${upgrade.name}</div>
                <div class="upgradeLevel">Nível ${currentLevel}/${upgrade.maxLevel}</div>
              </div>
              <div class="upgradeDesc">${upgrade.desc}</div>
              <div class="upgradeEffect">→ ${upgrade.effect(currentLevel)}</div>
              <div class="upgradeFooter">
                <span style="color: #FFD700; font-size: 18px; font-weight: bold;">
                  ${price} ⭐
                </span>
                <button class="buyButton" 
                  ${!canBuy ? 'disabled' : ''}
                  onclick="ShopSystem.buyUpgrade('${upgrade.id}')">
                  ${isMaxed ? 'MÁXIMO' : 'MELHORAR'}
                </button>
              </div>
            `;
            upgradesList.appendChild(upgradeDiv);
          });
        },
        
        showPurchaseEffect(message) {
          // Cria um texto flutuante de compra
          const effect = document.createElement('div');
          effect.textContent = '✅ ' + message;
          effect.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 20px 40px;
            border-radius: 15px;
            font-size: 24px;
            font-weight: bold;
            z-index: 3000;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            animation: purchasePopup 1.5s ease-out forwards;
          `;
          
          document.body.appendChild(effect);
          
          setTimeout(() => effect.remove(), 1500);
        }
      };
      
      // CSS para animação de compra
      const style = document.createElement('style');
      style.textContent = `
        @keyframes purchasePopup {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1) translateY(-30px);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
      
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
            WaveSystem.spawnArrowFormationGeneric(DroneEnemy, 5);
            console.log('Spawned arrow formation');
          } else if (type === 'drone') {
            WaveSystem.spawnDroneFormation(5);
            console.log('Spawned drone formation');
          }
        }
      };
      
      // Atalho de teclado para abrir dev panel (tecla P)
      document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyP' && !e.repeat) {
          DevTools.toggleDevPanel();
        }
      });
      
      // ============================================
      // [22] INICIALIZAÇÃO DO JOGO
      // ============================================
      loadImages(ASSETS, () => {
        game.init();
        ShopSystem.init();
        DevTools.init();
      });