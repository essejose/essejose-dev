/**
 * Splits cleaned game-dev.js into ES modules.
 * Run: node scripts/split-shooter-modules.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsRoot = path.join(__dirname, "..", "public/games/shooter/js");
const srcPath = path.join(jsRoot, "game-dev.js");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function write(rel, content) {
  const full = path.join(jsRoot, rel);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, content.replace(/\r\n/g, "\n"), "utf8");
  console.log("wrote", rel, content.split("\n").length, "lines");
}

function unindent(src) {
  return src
    .split("\n")
    .map((l) => (l.startsWith("      ") ? l.slice(6) : l))
    .join("\n");
}

let src = unindent(fs.readFileSync(srcPath, "utf8")).replace(/\r\n/g, "\n");

// Drop boot — main.js owns it
src = src.replace(
  /\/\/ =+\n\/\/ \[22\] INICIALIZAÇÃO DO JOGO\n\/\/ =+\nloadImages\(ASSETS, \(\) => \{\n[\s\S]*$/,
  ""
);

const comboStart = src.indexOf("// ============================================\n// [16] SISTEMA DE COMBO");
if (comboStart < 0) throw new Error("combo section not found");

let body = src.slice(comboStart);

// --- core modules (hand-written, not from slice) ---
write(
  "core/assets.js",
  `export const ASSETS = {
  helicopter: "./images/player.png",
  inimigo1: "./images/inimigos/inimigo1.png",
  inimigo2: "./images/inimigos/inimigo2.png",
  inimigo3: "./images/inimigos/inimigo3.png",
  inimigo4: "./images/inimigos/inimigo4.png",
  inimigo5: "./images/inimigos/inimigo5.png",
  tank: "./images/inimigos/tank.png",
  footprint: "./images/parallax-2/footprint.png",
  grass: "https://placehold.co/20x20/418753/000?text=-",
  health: "https://placehold.co/20x20/ff66cc/000?text=H",
  parallax1: "./images/parallax-2/6.png",
  parallax2: "./images/parallax-2/5.png",
  parallax3: "./images/parallax-2/4.png",
  parallax4: "./images/parallax-2/3.png",
  parallax5: "./images/parallax-2/2.png",
  parallax6: "./images/parallax-2/1.png",
  pilot_portrait: "./images/characters/pilot_portrait.png",
  assistant: "./images/characters/pilot-2.png",
  commander: "./images/characters/commander.png",
  rival_commander: "./images/characters/rival_commander.png",
};

export const IMAGES = {};

export function loadImages(sources, callback) {
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
`
);

write(
  "core/canvas.js",
  `export const canvas = document.getElementById("game");
export const ctx = canvas.getContext("2d");

export function handleTouch(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const touchX = touch.clientX - rect.left;
  const touchY = touch.clientY - rect.top;
  const g = window.game;
  if (!g?.player) return;
  g.player.targetX = touchX - g.player.width / 2;
  g.player.targetY = touchY - g.player.height / 2;
}

export function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  try {
    if (window.game?.parallaxLayers) {
      window.game.parallaxLayers.forEach((layer) => layer.updateScale());
    }
  } catch (e) {
    /* before init */
  }
}

export function initCanvas() {
  canvas.addEventListener("touchstart", handleTouch);
  canvas.addEventListener("touchmove", handleTouch);
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
}
`
);

write(
  "core/input.js",
  `export const CONTROLSMODES = {
  HELICOPTER: "helicopter",
  PLANE: "plane",
};

export const keys = {};
export let controlMode = CONTROLSMODES.PLANE;

export function initInput() {
  document.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (e.code === "KeyM") {
      controlMode =
        controlMode === CONTROLSMODES.HELICOPTER
          ? CONTROLSMODES.PLANE
          : CONTROLSMODES.HELICOPTER;
      if (window.game?.parallaxLayers) {
        window.game.parallaxLayers.forEach((layer) =>
          layer.updateSpeed(controlMode)
        );
      }
    }
    if (e.code === "KeyK" && window.game) {
      window.game.debug = !window.game.debug;
    }
  });
  document.addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });
}
`
);

write(
  "core/parallax.js",
  `import { canvas } from "./canvas.js";
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
`
);

write(
  "game/state.js",
  `/** Shared mutable game state — filled by Object.assign in gameplay boot. */
export const game = {
  debug: false,
  devMode: false,
  player: null,
  projectiles: [],
  enemyProjectiles: [],
  enemies: [],
  tanks: [],
  powerUps: [],
  coinsDropped: [],
  grassXs: [],
  parallaxLayers: [],
  comboSystem: null,
  countdownSystem: null,
  score: 0,
  coins: 0,
  lives: 3,
  highScore: 0,
  highWave: 0,
  upgrades: {
    damage: 0,
    speed: 0,
    maxHealth: 0,
    fireRate: 0,
    regen: false,
  },
  fps: 60,
  lastFrameTime: 0,
  gameOver: false,
  gameOverEventSent: false,
  isPaused: false,
  damageTexts: [],
  regenTimer: 0,
  miniBoss: null,
  bossTimer: 2500,
  bossActive: false,
  particles: [],
};
`
);

// Transform game object declaration
const gameObjStart = body.indexOf("const game = window.game = {");
const saveIdx = body.indexOf(
  "// ============================================\n// [18] SISTEMA DE SAVE/LOAD"
);
if (gameObjStart < 0 || saveIdx < 0) {
  throw new Error("game object or save section missing");
}

let gameObjCode = body.slice(gameObjStart, saveIdx).replace(
  "const game = window.game = {",
  "Object.assign(game, {"
);
gameObjCode = gameObjCode.replace(/\};(\s*)$/, "});$1");

const beforeGame = body.slice(0, gameObjStart);
const afterGame = body.slice(saveIdx);

let gameplay = beforeGame + "\n" + gameObjCode + "\n" + afterGame;

// Ensure DiveEnemy is let (already in source)
if (!gameplay.includes("let DiveEnemy")) {
  gameplay = gameplay.replace(/class DiveEnemy \{/, "let DiveEnemy = class DiveEnemy {");
}

const header = `import { canvas, ctx } from '../core/canvas.js';
import { ASSETS, IMAGES } from '../core/assets.js';
import { keys, controlMode, CONTROLSMODES } from '../core/input.js';
import { ParallaxLayer } from '../core/parallax.js';
import { game } from '../game/state.js';

`;

write(
  "legacy/gameplay.js",
  header +
    gameplay +
    `
export {
  ComboSystem,
  CountdownSystem,
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
  WaveConfig,
  WaveSystem,
  SaveSystem,
  ShopSystem,
  DialogSystem,
  DevTools,
  dropOnEnemyDeath,
  spawnDroneFormation,
  spawnArrowFormationGeneric,
  createExplosion,
};
`
);

write(
  "main.js",
  `import { initCanvas } from "./core/canvas.js";
import { ASSETS, loadImages } from "./core/assets.js";
import { initInput } from "./core/input.js";
import { game } from "./game/state.js";
import { ShopSystem, DialogSystem, DevTools } from "./legacy/gameplay.js";

initCanvas();
initInput();
window.game = game;

loadImages(ASSETS, () => {
  game.init();
  ShopSystem.init();
  DialogSystem.init();
  DevTools.init();
});
`
);

console.log("Phase 1 base split complete.");
