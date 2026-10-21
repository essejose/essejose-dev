/**
 * Joystick flutuante mobile — aparece no toque, vetor nx/ny para o player.
 */
const JoystickSystem = {
  active: false,
  baseX: 0,
  baseY: 0,
  knobX: 0,
  knobY: 0,
  nx: 0,
  ny: 0,
  radius: 56,
  deadzone: 0.12,
  touchId: null,
  _enabled: null,

  isEnabled() {
    if (this._enabled == null) {
      this._enabled =
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches;
    }
    return this._enabled;
  },

  getAxis() {
    if (!this.active) return { x: 0, y: 0 };
    const mag = Math.hypot(this.nx, this.ny);
    if (mag < this.deadzone) return { x: 0, y: 0 };
    return { x: this.nx, y: this.ny };
  },

  _setKnob(canvasX, canvasY) {
    let dx = canvasX - this.baseX;
    let dy = canvasY - this.baseY;
    const dist = Math.hypot(dx, dy);
    if (dist > this.radius && dist > 0) {
      dx = (dx / dist) * this.radius;
      dy = (dy / dist) * this.radius;
    }
    this.knobX = this.baseX + dx;
    this.knobY = this.baseY + dy;
    this.nx = dx / this.radius;
    this.ny = dy / this.radius;
  },

  begin(canvasX, canvasY, touchId = null) {
    this.active = true;
    this.touchId = touchId;
    this.baseX = canvasX;
    this.baseY = canvasY;
    this.knobX = canvasX;
    this.knobY = canvasY;
    this.nx = 0;
    this.ny = 0;

    const g = window.game;
    if (g?.player) {
      g.player.targetX = null;
      g.player.targetY = null;
    }
  },

  move(canvasX, canvasY) {
    if (!this.active) return;
    this._setKnob(canvasX, canvasY);
  },

  end(touchId = null) {
    if (touchId != null && this.touchId != null && touchId !== this.touchId) {
      return;
    }
    this.active = false;
    this.touchId = null;
    this.nx = 0;
    this.ny = 0;
    this.knobX = this.baseX;
    this.knobY = this.baseY;
  },

  draw(ctx) {
    if (!this.active) return;

    const r = this.radius;
    ctx.save();
    ctx.globalAlpha = 0.4;

    // Base
    ctx.beginPath();
    ctx.arc(this.baseX, this.baseY, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 20, 40, 0.55)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(120, 200, 255, 0.7)';
    ctx.stroke();

    // Anel interno
    ctx.beginPath();
    ctx.arc(this.baseX, this.baseY, r * 0.35, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(120, 200, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Knob
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(this.knobX, this.knobY, r * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(180, 230, 255, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  },

  init() {
    // Detecção lazy em isEnabled(); nada a registrar aqui.
  },
};

export { JoystickSystem };
