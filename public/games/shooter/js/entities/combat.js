import { canvas, ctx } from '../core/canvas.js';
import { ASSETS, IMAGES } from '../core/assets.js';
import { keys, controlMode, CONTROLSMODES } from '../core/input.js';
import { ParallaxLayer } from '../core/parallax.js';
import { game } from '../game/state.js';

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
    homingRadius: 20,
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
    homingRadius: 10,
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
        // Passa coordenadas da explosão para calcular knockback
        if (en.takeDamage) en.takeDamage(this.damage, this.x, this.y);
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
    this.homingRadius = weapon.homingRadius || Infinity; // Raio de detecção inicial
    this.lockRadius = this.homingRadius * 1.5; // Raio de "lock" - maior que detecção para manter alvo travado
    this.lifetime = 300;
    this.wobbleY = weapon.wobbleY || 0;
    this.baseY = this.y;
    this.frameCount = 0;
    this.targetLocked = false; // Flag para indicar se já travou em um alvo
    this.lastKnownDirection = null; // Armazena a última direção quando o alvo é destruído

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

      // Se não tem alvo ou o alvo foi destruído
      if (
        !this.target ||
        this.target.health <= 0 ||
        this.target.x + this.target.width < 0
      ) {
        // Se tinha um alvo travado e foi destruído, mantém a direção atual
        if (this.targetLocked) {
          // Continua na direção que estava indo (mantém vx e vy atuais)
          this.x += this.vx;
          this.y += this.vy;
          
          // Procura um novo alvo próximo, mas só muda se estiver MUITO próximo
          const newTarget = this.findHomingTarget();
          
          if (newTarget) {
            const dx = newTarget.x + newTarget.width / 2 - this.x;
            const dy = newTarget.y + newTarget.height / 2 - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Só muda de direção se o novo alvo estiver bem próximo (30% do raio)
            // Isso evita mudanças bruscas de direção
            if (distance <= this.homingRadius * 0.3) {
              this.target = newTarget;
              this.targetLocked = true;
              this.lastKnownDirection = null;
            } else {
              // Alvo muito longe, continua na direção atual sem mudar
              this.target = null;
              this.targetLocked = false;
              this.checkOutOfBounds();
              return;
            }
          } else {
            // Sem novo alvo, continua na direção atual
            this.target = null;
            this.targetLocked = false;
            this.checkOutOfBounds();
            return;
          }
        } else {
          // Nunca teve alvo travado - procura um novo normalmente
          this.targetLocked = false;
          this.lastKnownDirection = null;
          const newTarget = this.findHomingTarget();
          
          if (newTarget) {
            this.target = newTarget;
            this.targetLocked = true;
          } else {
            // Sem alvo, continua em linha reta
            this.x += this.vx;
            this.y += this.vy;
            this.checkOutOfBounds();
            return;
          }
        }
      } else {
        // Tem alvo válido - verifica se ainda está dentro do raio de lock
        const dx = this.target.x + this.target.width / 2 - this.x;
        const dy = this.target.y + this.target.height / 2 - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Se já travou no alvo, só muda se ele sair completamente do raio de lock
        if (this.targetLocked) {
          // Mantém o alvo travado mesmo se sair um pouco do raio inicial
          if (distance > this.lockRadius) {
            // Alvo saiu completamente do raio de lock, procura novo
            this.targetLocked = false;
            const newTarget = this.findHomingTarget();
            if (newTarget && newTarget !== this.target) {
              this.target = newTarget;
              this.targetLocked = true;
            } else {
              // Sem novo alvo, continua em linha reta
              this.x += this.vx;
              this.y += this.vy;
              this.checkOutOfBounds();
              return;
            }
          }
          // Se ainda está dentro do raio de lock, mantém o alvo
        } else {
          // Ainda não travou - verifica se deve travar no alvo atual
          if (distance <= this.homingRadius) {
            this.targetLocked = true; // Trava no alvo
          } else {
            // Alvo muito longe, procura um mais próximo
            const newTarget = this.findHomingTarget();
            if (newTarget && newTarget !== this.target) {
              this.target = newTarget;
              this.targetLocked = true;
            } else {
              // Sem novo alvo, continua em linha reta
              this.x += this.vx;
              this.y += this.vy;
              this.checkOutOfBounds();
              return;
            }
          }
        }
      }

      // Ajusta trajetória em direção ao alvo travado (só se tiver alvo válido)
      if (this.target && this.target.health > 0) {
        const dx = this.target.x + this.target.width / 2 - this.x;
        const dy = this.target.y + this.target.height / 2 - this.y;
        const mag = Math.sqrt(dx * dx + dy * dy) || 1;
        this.vx = (dx / mag) * this.speed;
        this.vy = (dy / mag) * this.speed;
      }
      
      // Move o projétil
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

  /**
   * Encontra o alvo mais próximo dentro do raio de detecção
   * @returns {Object|null} - Inimigo mais próximo ou null se nenhum encontrado
   */
  findHomingTarget() {
    let closestEnemy = null;
    let closestDistance = this.homingRadius;
    
    for (let e of game.enemies) {
      // Filtra apenas inimigos válidos à frente do player
      if (e.health <= 0 || e.x + e.width < 0) continue;
      
      // Calcula distância do projétil até o centro do inimigo
      const dx = e.x + e.width / 2 - this.x;
      const dy = e.y + e.height / 2 - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Se está dentro do raio e é o mais próximo até agora
      if (distance <= this.homingRadius && distance < closestDistance) {
        closestEnemy = e;
        closestDistance = distance;
      }
    }
    
    return closestEnemy;
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
// [12] INIMIGOS (MiniBoss, Tank, DiveEnemy) + factory
// Enemy legado removido — usar createEnemy / EnemyComposed
// ============================================

// ============================================
// FACTORY PARA CRIAR ENEMIES (Facilita migração)
// ============================================
/**
 * Cria um inimigo com configuração customizável
 * @param {number} x - Posição X
 * @param {number} y - Posição Y
 * @param {string} type - Tipo do inimigo ('basic', 'drone', 'bomber', 'sniper', 'shielded')
 * @param {Object} overrides - Configurações opcionais para sobrescrever valores padrão (ex: { health: 5, shield: 15 })
 * @returns {EnemyComposed} - Instância do inimigo criado
 */
function createEnemy(x, y, type = 'basic', overrides = {}) {
  const configs = {
    basic: {
      sprite: 'inimigo1',
      width: 50,
      height: 50,
      health: 2,
      shield: 0, // Sem shield por padrão
      movement: { speed: 2, wobbleSpeed: 0.06, wobbleAmplitude: 15 },
      flames: { spawnRate: 3, particleCount: [2, 3] },
      weapon: { damage: 1, cooldownMin: 60, cooldownMax: 180 }
    },
    drone: {
      sprite: 'inimigo2',
      width: 45,
      height: 45,
      health: 4,
      shield: 0, // Sem shield por padrão
      movement: { speed: 2.5, wobbleSpeed: 0.08, wobbleAmplitude: 10 },
      flames: { spawnRate: 4, particleCount: [1, 2] },
      weapon: { damage: 1, cooldownMin: 60, cooldownMax: 180 }
    },
    bomber: {
      sprite: 'inimigo3', // Pode criar sprite próprio depois
      width: 60,
      height: 60,
      health: 5,
      shield: 0, // Sem shield por padrão
      movement: { speed: 1.5, wobbleSpeed: 0.05, wobbleAmplitude: 22 },
      flames: { spawnRate: 1, particleCount: [2, 3] },
      weaponType: 'triple', // Usa arma tripla
      weapon: { damage: 1, cooldownMin: 90, cooldownMax: 150 }
    },
    sniper: {
      sprite: 'inimigo4', // Pode criar sprite próprio depois
      width: 60,
      height: 30,
      health: 4,
      shield: 0, // Sem shield por padrão
      movement: { speed: 1, wobbleSpeed: 0.03, wobbleAmplitude: 8 }, // Mais lento
      flames: { spawnRate: 5, particleCount: [1, 2] },
      weaponType: 'sniper', // Usa arma de mira
      weapon: { damage: 2, cooldownMin: 180, cooldownMax: 240 }
    },
    shielded: {
      sprite: 'inimigo5', // Pode criar sprite próprio depois
      width: 60,
      height: 30,
      health: 6,
      shield: 5, // Shield padrão para tipo shielded
      movement: { speed: 1.5, wobbleSpeed: 0.04, wobbleAmplitude: 10 },
      flames: { spawnRate: 4, particleCount: [2, 3] },
      weapon: { damage: 2, cooldownMin: 70, cooldownMax: 130 }
    }
  };
  
  // Pega a configuração base do tipo
  const baseConfig = configs[type] || configs.basic;
  
  // Mescla com overrides (permitindo customizar health, shield, etc)
  const config = { ...baseConfig, ...overrides };
  
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
    
    // Sistema de escudo (shield) - parâmetro configurável
    this.maxShield = config.shield !== undefined ? config.shield : 0;
    this.shield = this.maxShield;
    
    // Sistema de knockback (movimento ao tomar dano)
    this.knockbackX = 0;
    this.knockbackY = 0;
    
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
  
  takeDamage(amount = 1, fromX = null, fromY = null) {
    // Aplica knockback se as coordenadas de origem do dano foram fornecidas
    if (fromX !== null && fromY !== null) {
      // Calcula direção do knockback (oposto ao impacto)
      const dx = this.x + this.width / 2 - fromX;
      const dy = this.y + this.height / 2 - fromY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        // Força do knockback menor que o player (8 vs 15) para não ser muito disruptivo
        const knockbackForce = 8;
        this.knockbackX = (dx / distance) * knockbackForce;
        this.knockbackY = (dy / distance) * knockbackForce;
      }
    }
    
    // Se tem shield, o dano primeiro reduz o shield
    if (this.shield > 0) {
      const remainingDamage = amount - this.shield;
      this.shield = Math.max(0, this.shield - amount);
      
      // Se o shield foi quebrado, mostra mensagem
      if (this.shield === 0 && this.maxShield > 0) {
        if (window.game && window.game.damageTexts) {
          window.game.damageTexts.push(
            new DamageText(this.x, this.y, "Shield Down", "cyan")
          );
        }
      }
      
      // Se ainda há dano restante após quebrar o shield, aplica à vida
      if (remainingDamage > 0) {
        this.health -= remainingDamage;
      }
    } else {
      // Sem shield, aplica dano diretamente à vida
      this.health -= amount;
    }
    
    return this.health <= 0;
  }
  
  addComponent(component) {
    this.components.push(component);
    return this;
  }
  
  update() {
    // Aplica knockback (movimento ao tomar dano)
    if (this.knockbackX !== 0 || this.knockbackY !== 0) {
      this.x += this.knockbackX;
      this.y += this.knockbackY;
      
      // Reduz knockback gradualmente (mais rápido que o player para não ser muito disruptivo)
      this.knockbackX *= 0.75; // 0.75 vs 0.8 do player = decai mais rápido
      this.knockbackY *= 0.75;
      
      // Para quando muito pequeno
      if (Math.abs(this.knockbackX) < 0.1) this.knockbackX = 0;
      if (Math.abs(this.knockbackY) < 0.1) this.knockbackY = 0;
    }
    
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
    
    // Desenha barra de escudo (se tiver shield)
    if (this.maxShield > 0) {
      const shieldBarY = this.y - 12;
      ctx.fillStyle = "rgba(100, 100, 100, 0.5)";
      ctx.fillRect(this.x, shieldBarY, this.width, 4);
      ctx.fillStyle = "cyan";
      ctx.fillRect(
        this.x,
        shieldBarY,
        this.width * (this.shield / this.maxShield),
        4
      );
      ctx.strokeStyle = "black";
      ctx.strokeRect(this.x, shieldBarY, this.width, 4);
    }
    
    // Desenha barra de vida
    const healthBarY = this.y - (this.maxShield > 0 ? 6 : 6);
    ctx.fillStyle = "gray";
    ctx.fillRect(this.x, healthBarY, this.width, 5);
    ctx.fillStyle = "lime";
    ctx.fillRect(
      this.x,
      healthBarY,
      this.width * (this.health / this.maxHealth),
      5
    );
    ctx.strokeStyle = "black";
    ctx.strokeRect(this.x, healthBarY, this.width, 5);
  }
}

// ============================================
// CLASSE MINIBOSS — standalone (não herda mais de Enemy)
// ============================================
class MiniBoss {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 120;
    this.height = 80;
    this.maxHealth = 50;
    this.health = 50;
    this.speed = 1;
    this.cooldown = 90;
    this.damage = 1;
    this.dead = false;
    this.dodgeCooldown = 0;
    this.evadeDirection = 0;
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

let Tank = class Tank {
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
// CLASSE DIVEENEMY - Mantida como está (lógica complexa de fases)
// ============================================
let DiveEnemy = class DiveEnemy {
  constructor(x) {
    const player = game.player;
    this.x = x;
    this.y = player.y; // Inicia na mesma altura que o player
    this.width = 60;
    this.height = 30;
    this.speed = 5;
    this.phase = "approaching";
    this.attackSpeed = 6;
    this.exitSpeed = 4;
    this.triggerDistance = 250;
    this.shot = false;
    this.sprite = 'inimigo4';
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
    if (IMAGES.inimigo4 && IMAGES.inimigo4.complete) {
      ctx.drawImage(IMAGES.inimigo4, this.x, this.y, this.width, this.height);
    } else {
      ctx.fillStyle = "#ffaa00";
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }
}

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
    if (enemyClass === 'Enemy' || enemyClass === 'basic') {
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
DiveEnemy = addHealthToEnemy(DiveEnemy, 2);
Tank = addHealthToEnemy(Tank, 5);
// DroneEnemy = addHealthToEnemy(DroneEnemy, 1); // Comentado - agora usa createEnemy('drone')




export {
  WeaponTypes,
  AuxiliaryWeaponTypes,
  WeaponInstance,
  Player,
  createEnemy,
  EnemyComposed,
  MiniBoss,
  MiniBossProjectile,
  Tank,
  DiveEnemy,
  DamageText,
  dropOnEnemyDeath,
  spawnDroneFormation,
  spawnArrowFormationGeneric,
  createExplosion,
  HitEffectManager,
  PowerUp,
  WeaponPowerUp,
  DropInstance,
  DropTypes,
  CoinDrop,
  Projectile,
  EnemyProjectile,
  EnemyProjectileAngular,
  FlameParticle,
  ExplosionParticle,
  WobbleMovement,
  FlameEmitter,
  WeaponComponent,
  MAX_COINS_ON_SCREEN,
};
