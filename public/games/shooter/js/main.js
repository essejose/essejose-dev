import { initCanvas } from "./core/canvas.js";
import { ASSETS, loadImages } from "./core/assets.js";
import { initInput } from "./core/input.js";
import { game } from "./game/state.js";
import { ShopSystem, DialogSystem, DevTools } from "./legacy/gameplay.js";

initCanvas();
initInput();

// HTML onclick / DevTools esperam estes no window
window.game = game;
window.ShopSystem = ShopSystem;
window.DialogSystem = DialogSystem;
window.DevTools = DevTools;

loadImages(ASSETS, () => {
  game.init();
  ShopSystem.init();
  DialogSystem.init();
  DevTools.init();
});
