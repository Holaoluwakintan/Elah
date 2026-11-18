const fs = require('fs');

const GAME_JS = 'js/game.js';
let content = fs.readFileSync(GAME_JS, 'utf8');

// Fix 1: line 3466 - unescaped apostrophe in THE LORD'S
const target1 = "toast('\"David prevailed over the Philistine with a sling and with a stone… and THE BATTLE IS THE LORD'S\"<br><i>1 SAMUEL 17:50, 47</i>', 6000)";
const fix1    = "toast('\"David prevailed over the Philistine with a sling and with a stone… and THE BATTLE IS THE LORD\\'S\"<br><i>1 SAMUEL 17:50, 47</i>', 6000)";

// Fix 2: line 6181 - unescaped apostrophe in no man's heart
const target2 = "verse: '\"And David said to Saul, Let no man's heart fail because of him; thy servant will go and fight with this Philistine.\"'";
const fix2    = "verse: '\"And David said to Saul, Let no man\\'s heart fail because of him; thy servant will go and fight with this Philistine.\"'";

if (content.includes(target1)) {
  content = content.replace(target1, fix1);
  console.log('✓ Fixed target 1: THE LORD\\\'S');
} else {
  console.log('Target 1 not found or already fixed');
}

if (content.includes(target2)) {
  content = content.replace(target2, fix2);
  console.log('✓ Fixed target 2: no man\\\'s heart');
} else {
  console.log('Target 2 not found or already fixed');
}

fs.writeFileSync(GAME_JS, content, 'utf8');
console.log('Done!');
