const fs = require('fs');

const lines = fs.readFileSync('js/game.js', 'utf8').split(/\r?\n/);

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let singleQuotes = 0;
  for (let c = 0; c < line.length; c++) {
    if (line[c] === "'" && (c === 0 || line[c - 1] !== '\\')) {
      singleQuotes++;
    }
  }
  // If odd single quotes and does not look like multiline template
  if (singleQuotes % 2 !== 0 && !line.includes('`')) {
    console.log(`Odd single quotes at line ${i + 1}: ${line}`);
  }
}
