import fs from "fs";

const p = "c:/laragon/www/essejose.dev/public/games/shooter/js/game-dev.js";
let s = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");

// Remove [13] deprecated section through start of DiveEnemy
s = s.replace(
  /      \/\/ =+\n      \/\/ \[13\] INIMIGOS DEPRECADOS[\s\S]*?(?=      \/\/ =+\n      \/\/ CLASSE DIVEENEMY)/,
  ""
);

// Remove DroneEnemy deprecated block after DiveEnemy
s = s.replace(
  /      \/\/ =+\n      \/\/ CLASSE DRONEENEMY ANTIGA[\s\S]*?\*\/\n\n/,
  ""
);

// DiveEnemy as let for reassignment (modules are strict)
s = s.replace(
  /      class DiveEnemy \{/,
  "      let DiveEnemy = class DiveEnemy {"
);

fs.writeFileSync(p, s);
console.log("BomberEnemy left:", s.includes("BomberEnemy"));
console.log("let DiveEnemy:", s.includes("let DiveEnemy = class"));
console.log("Drone comment left:", s.includes("CLASSE DRONEENEMY ANTIGA"));
