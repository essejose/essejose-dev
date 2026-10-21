export const ASSETS = {
  helicopter: "./images/player.png",
  inimigo1: "./images/inimigos/inimigo1.png",
  inimigo2: "./images/inimigos/inimigo2.png",
  inimigo3: "./images/inimigos/inimigo3.png",
  inimigo4: "./images/inimigos/inimigo4.png",
  inimigo5: "./images/inimigos/inimigo5.png",
  tank: "./images/inimigos/tank.png",
  chefe: "./images/inimigos/chefe.png",
  footprint: "./images/parallax-3/footprint.png",
  grass: "https://placehold.co/20x20/418753/000?text=-",
  health: "https://placehold.co/20x20/ff66cc/000?text=H",
  parallax1: "./images/parallax-3/1.png",
  parallax2: "./images/parallax-3/2.png",
  parallax3: "./images/parallax-3/3.png",
  parallax4: "./images/parallax-3/4.png",
  parallax5: "./images/parallax-3/5.png",
  parallax6: "./images/parallax-3/6.png",
  pilot_portrait: "./images/characters/pilot_portrait.png",
  assistant: "./images/characters/pilot-2.png",
  commander: "./images/characters/commander.png",
  rival_commander: "./images/characters/rival_commander.png",
  hudScore: "./images/hud/score.png",
  hudWeapon: "./images/hud/weapon.png",
  hudWave: "./images/hud/wave.png",
  hudCoins: "./images/hud/coins.png",
  hudShop: "./images/hud/shop.png",
  hudCombo: "./images/hud/combo.png",
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
