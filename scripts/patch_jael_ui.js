const fs = require('fs');
const path = require('path');

const GAME_JS = path.join(__dirname, '..', 'js', 'game.js');
let raw = fs.readFileSync(GAME_JS, 'utf8');

const target = "document.body.dataset.level = LEVEL; lastHud = '';";
const replacement = `if (P && P.look === 'jael') {
    $('who-name').textContent = 'JAEL';
    $('b-attack').innerHTML = ICONS.tentpeg;
    $('b-sling').innerHTML = ICONS.milk;
    $('b-attack').setAttribute('aria-label', 'Tent peg strike');
    $('b-sling').setAttribute('aria-label', 'Milk of sleep');
  }
  document.body.dataset.level = LEVEL; lastHud = '';`;

if (!raw.includes("$('b-attack').innerHTML = ICONS.tentpeg;")) {
  raw = raw.replace(target, replacement);
  fs.writeFileSync(GAME_JS, raw, 'utf8');
  console.log('✓ setLevelUI updated with Jael HUD weapon icons!');
} else {
  console.log('Already updated!');
}
