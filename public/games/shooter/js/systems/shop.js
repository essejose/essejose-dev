import { canvas, ctx } from '../core/canvas.js';
import { ASSETS, IMAGES } from '../core/assets.js';
import { keys, controlMode, CONTROLSMODES } from '../core/input.js';
import { ParallaxLayer } from '../core/parallax.js';
import { game } from '../game/state.js';

import { SaveSystem } from './save.js';
import { WeaponTypes, AuxiliaryWeaponTypes, WeaponInstance } from '../entities/combat.js';

// ============================================
// [19] SISTEMA DE LOJA (Shop)
// ============================================

const ShopSystem = {
  isOpen: false,
  /** Bloqueia fechar no mesmo toque que abriu (click-through no overlay) */
  _openedAt: 0,
  
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
    closeShop.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close(true);
    });
    // No mobile o mesmo toque que abre cai no overlay e fechava na hora
    const onBackdrop = (e) => {
      if (e.target !== shopModal) return;
      this.close(false);
    };
    shopModal.addEventListener('pointerup', onBackdrop);
    shopModal.addEventListener('click', onBackdrop);
    
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
    if (this.isOpen) return;
    this.isOpen = true;
    this._openedAt = performance.now();
    game.isPaused = true; // Pausa o jogo
    document.getElementById('shopModal').classList.add('active');
    this.render();
  },
  
  /** @param {boolean} [force] — true ignora o guard do click-through */
  close(force = false) {
    if (!this.isOpen) return;
    // Mesmo toque que abriu ainda não pode fechar pelo backdrop
    if (!force && performance.now() - this._openedAt < 400) return;
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
// [19.5] SISTEMA DE DIÁLOGO
// ============================================



export { ShopSystem };
