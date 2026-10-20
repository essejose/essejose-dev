import { canvas, ctx } from '../core/canvas.js';
import { ASSETS, IMAGES } from '../core/assets.js';
import { keys, controlMode, CONTROLSMODES } from '../core/input.js';
import { ParallaxLayer } from '../core/parallax.js';
import { game } from '../game/state.js';

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


export { CountdownSystem };
