export const CONTROLSMODES = {
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
