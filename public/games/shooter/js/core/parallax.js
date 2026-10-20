import { canvas } from "./canvas.js";
import { CONTROLSMODES } from "./input.js";

export class ParallaxLayer {
  constructor(image, speed, y = 0) {
    this.image = image;
    this.baseSpeed = speed;
    this.speed = speed;
    this.y = y;
    this.x1 = 0;
    this.x2 = 0;
    this.updateScale();
  }

  updateScale() {
    if (!this.image || !this.image.width) return;
    this.scaleY = canvas.height / this.image.height;
    this.scaleX = this.scaleY;
    this.scaledWidth = this.image.width * this.scaleX;
    this.scaledHeight = canvas.height;
    this.x2 = this.scaledWidth;
  }

  updateSpeed(mode) {
    const multiplier = mode === CONTROLSMODES.HELICOPTER ? 0.5 : 1.0;
    this.speed = this.baseSpeed * multiplier;
  }

  update() {
    this.x1 -= this.speed;
    this.x2 -= this.speed;
    if (this.x1 + this.scaledWidth <= 0) this.x1 = this.x2 + this.scaledWidth;
    if (this.x2 + this.scaledWidth <= 0) this.x2 = this.x1 + this.scaledWidth;
  }

  draw(drawCtx) {
    if (!this.image || !this.image.complete) return;
    drawCtx.drawImage(this.image, this.x1, this.y, this.scaledWidth, this.scaledHeight);
    drawCtx.drawImage(this.image, this.x2, this.y, this.scaledWidth, this.scaledHeight);
  }

  reset() {
    this.updateScale();
    this.x1 = 0;
    this.x2 = this.scaledWidth;
  }
}
