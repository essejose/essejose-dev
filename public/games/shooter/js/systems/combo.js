import { canvas, ctx } from '../core/canvas.js';
import { game } from '../game/state.js';
import { DamageText } from '../entities/combat.js';

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


export { ComboSystem };
