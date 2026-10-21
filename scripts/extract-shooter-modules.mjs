/**
 * Phase 2–4 extraction with coarse modules to avoid circular import hell.
 * Combat (player/weapons/projectiles/enemies/particles) stays in entities/combat.js.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsRoot = path.join(__dirname, "..", "public/games/shooter/js");

function write(rel, content) {
  const full = path.join(jsRoot, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.replace(/\r\n/g, "\n"), "utf8");
  console.log("wrote", rel, content.split("\n").length, "lines");
}

function cut(src, startMarker, endMarker) {
  const s = src.indexOf(startMarker);
  if (s < 0) throw new Error("missing start: " + startMarker.slice(0, 60));
  const e = endMarker
    ? src.indexOf(endMarker, s + startMarker.length)
    : src.length;
  if (endMarker && e < 0)
    throw new Error("missing end: " + endMarker.slice(0, 60));
  return { chunk: src.slice(s, e), rest: src.slice(0, s) + src.slice(e) };
}

const gameplayPath = path.join(jsRoot, "legacy/gameplay.js");
let raw = fs.readFileSync(gameplayPath, "utf8").replace(/\r\n/g, "\n");

const bodyStart = raw.indexOf(
  "// ============================================\n// [16] SISTEMA DE COMBO"
);
const exportStart = raw.lastIndexOf("\nexport {");
let body = raw.slice(bodyStart, exportStart);

function take(start, end) {
  const r = cut(body, start, end);
  body = r.rest;
  return r.chunk;
}

const combo = take(
  "// ============================================\n// [16] SISTEMA DE COMBO",
  "// ============================================\n// [17] COUNTDOWN SYSTEM"
);

// Countdown through end of formations/text — actually combat is countdown's following until waves
// Structure: combo | countdown | effects+weapons+...+text helpers | waves | loop | save | shop | dialog | dev

const countdownOnly = take(
  "// ============================================\n// [17] COUNTDOWN SYSTEM",
  "// Sistema de Moedas"
);

const combat = take(
  "// Sistema de Moedas",
  "// ============================================\n// [15] SISTEMA DE WAVES"
);

const waves = take(
  "// ============================================\n// [15] SISTEMA DE WAVES",
  "// ============================================\n// [21] GAME LOOP (Objeto Principal)"
);

const loop = take(
  "// ============================================\n// [21] GAME LOOP (Objeto Principal)",
  "// ============================================\n// [18] SISTEMA DE SAVE/LOAD"
);

const save = take(
  "// ============================================\n// [18] SISTEMA DE SAVE/LOAD",
  "// ============================================\n// [19] SISTEMA DE LOJA (Shop)"
);

const shopStart = body.indexOf(
  "// ============================================\n// [19] SISTEMA DE LOJA (Shop)"
);
const dialogConst = body.indexOf("const DialogSystem = {");
const dialogCommentIdx = Math.max(
  body.indexOf("// Sistema de Diálogos", shopStart),
  body.indexOf("// Sistema de Diálogo", shopStart)
);
const shopEnd =
  dialogCommentIdx > shopStart ? dialogCommentIdx : dialogConst;
const shop = body.slice(shopStart, shopEnd);
body = body.slice(0, shopStart) + body.slice(shopEnd);

const devStart = body.indexOf(
  "// ============================================\n// [20] DEV TOOLS (Debug Panel)"
);
const dialog = body.slice(0, devStart);
const devtools = body.slice(devStart);

const IMP = `import { canvas, ctx } from '../core/canvas.js';
import { ASSETS, IMAGES } from '../core/assets.js';
import { keys, controlMode, CONTROLSMODES } from '../core/input.js';
import { ParallaxLayer } from '../core/parallax.js';
import { game } from '../game/state.js';
`;

write("systems/combo.js", `${IMP}\n${combo}\nexport { ComboSystem };\n`);
write("systems/countdown.js", `${IMP}\n${countdownOnly}\nexport { CountdownSystem };\n`);

write(
  "entities/combat.js",
  `${IMP}
import { ComboSystem } from '../systems/combo.js';

${combat}

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
  Effects,
  Mine,
  PowerUp,
  WeaponPowerUp,
  CoinDrop,
  Projectile,
  EnemyProjectile,
  EnemyProjectileAngular,
  FlameParticle,
  ExplosionParticle,
  WobbleMovement,
  FlameEmitter,
  WeaponComponent,
};
`
);

write(
  "systems/waves.js",
  `${IMP}
import { createEnemy, MiniBoss, Tank, spawnDroneFormation, spawnArrowFormationGeneric, spawnWithDistance } from '../entities/combat.js';
import { DialogSystem } from './dialog.js';
import { ShopSystem } from './shop.js';

${waves}

export { WaveConfig, WaveSystem };
`
);

write(
  "systems/save.js",
  `${IMP}
import { ShopSystem } from './shop.js';
import { WeaponInstance } from '../entities/combat.js';

${save}

export { SaveSystem };
`
);

write(
  "systems/shop.js",
  `${IMP}
import { SaveSystem } from './save.js';
import { WeaponTypes, AuxiliaryWeaponTypes, WeaponInstance } from '../entities/combat.js';

${shop}

export { ShopSystem };
`
);

write("systems/dialog.js", `${IMP}\n${dialog}\nexport { DialogSystem };\n`);

write(
  "systems/devtools.js",
  `${IMP}
import { createEnemy, MiniBoss, Tank, DiveEnemy, spawnArrowFormationGeneric, spawnDroneFormation } from '../entities/combat.js';
import { DialogSystem } from './dialog.js';
import { WaveSystem } from './waves.js';

${devtools}

export { DevTools };
`
);

write(
  "game/loop.js",
  `${IMP}
import { Player } from '../entities/combat.js';
import { ComboSystem } from '../systems/combo.js';
import { CountdownSystem } from '../systems/countdown.js';
import { SaveSystem } from '../systems/save.js';
import { DialogSystem } from '../systems/dialog.js';
import { WaveSystem } from '../systems/waves.js';
import { DamageText } from '../entities/combat.js';

${loop}
`
);

// Thin re-exports for player.js etc. per plan folder names
write(
  "entities/player.js",
  `export { Player } from './combat.js';\n`
);
write(
  "entities/weapons.js",
  `export { WeaponTypes, AuxiliaryWeaponTypes, WeaponInstance, Mine, Effects } from './combat.js';\n`
);
write(
  "entities/projectiles.js",
  `export { Projectile, EnemyProjectile, EnemyProjectileAngular } from './combat.js';\n`
);
write(
  "entities/particles.js",
  `export { FlameParticle, ExplosionParticle, createExplosion } from './combat.js';\n`
);
write(
  "entities/enemies/composed.js",
  `export { EnemyComposed, createEnemy } from '../combat.js';\n`
);
write(
  "entities/enemies/miniboss.js",
  `export { MiniBoss, MiniBossProjectile } from '../combat.js';\n`
);
write(
  "entities/enemies/tank.js",
  `export { Tank } from '../combat.js';\n`
);

write(
  "legacy/gameplay.js",
  `import '../game/loop.js';
import { ComboSystem } from '../systems/combo.js';
import { CountdownSystem } from '../systems/countdown.js';
import {
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
} from '../entities/combat.js';
import { WaveConfig, WaveSystem } from '../systems/waves.js';
import { SaveSystem } from '../systems/save.js';
import { ShopSystem } from '../systems/shop.js';
import { DialogSystem } from '../systems/dialog.js';
import { DevTools } from '../systems/devtools.js';

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

console.log("Done. leftover body length:", body.length);
console.log("combat lines", combat.split("\n").length);
