import { canvas, ctx } from '../core/canvas.js';
import { ASSETS, IMAGES } from '../core/assets.js';
import { keys, controlMode, CONTROLSMODES } from '../core/input.js';
import { ParallaxLayer } from '../core/parallax.js';
import { game } from '../game/state.js';

import { ShopSystem } from './shop.js';
import { WeaponInstance } from '../entities/combat.js';

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



export { SaveSystem };
