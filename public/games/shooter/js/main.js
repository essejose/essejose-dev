import { initCanvas } from "./core/canvas.js";
import { ASSETS, loadImages } from "./core/assets.js";
import { initInput } from "./core/input.js";
import { game } from "./game/state.js";
import { ShopSystem, DialogSystem, DevTools } from "./legacy/gameplay.js";
import { HudSystem } from "./systems/hud.js";
import { GameOverSystem } from "./systems/gameover.js";
import { MenuSystem } from "./systems/menu.js";
import { SettingsSystem } from "./systems/settings.js";
import { FullscreenPrompt } from "./systems/fullscreen.js";

initCanvas();
initInput();

// HTML onclick / DevTools / touch gate esperam estes no window
window.game = game;
window.ShopSystem = ShopSystem;
window.DialogSystem = DialogSystem;
window.DevTools = DevTools;
window.SettingsSystem = SettingsSystem;
window.MenuSystem = MenuSystem;
window.GameOverSystem = GameOverSystem;
window.HudSystem = HudSystem;

loadImages(ASSETS, () => {
  SettingsSystem.init();
  FullscreenPrompt.init();
  MenuSystem.init();
  game.init();
  ShopSystem.init();
  DialogSystem.init();
  DevTools.init();
  HudSystem.init();
  GameOverSystem.init();
});
