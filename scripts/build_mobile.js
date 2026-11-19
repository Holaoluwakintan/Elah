// ============================================================
// ELAH WARRIOR — Mobile App Asset Bundler for Capacitor
// ============================================================
// Copies pure client runtime files into www/ for Android/iOS builds
// without copying node_modules, .git, scripts, or backend server code.
// ============================================================

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WWW  = path.join(ROOT, 'www');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('--- BUNDLING ELAH WARRIOR FOR MOBILE (www/) ---');

if (fs.existsSync(WWW)) {
  fs.rmSync(WWW, { recursive: true, force: true });
}
fs.mkdirSync(WWW, { recursive: true });

// Copy root client files
const ROOT_FILES = [
  'index.html',
  'style.css',
  'credits.html',
  'sw.js',
  'manifest.webmanifest',
  'manifest.json',
  'icon.svg',
  'og.jpg'
];

for (const f of ROOT_FILES) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p)) {
    fs.copyFileSync(p, path.join(WWW, f));
    console.log(`✓ Copied ${f}`);
  }
}

// Copy runtime client directories
const DIRS = ['js', 'audio', 'assets', 'vendor'];
for (const d of DIRS) {
  const srcDir = path.join(ROOT, d);
  const destDir = path.join(WWW, d);
  if (fs.existsSync(srcDir)) {
    copyDirRecursive(srcDir, destDir);
    console.log(`✓ Copied directory: ${d}/`);
  }
}

console.log('🎉 Mobile bundle ready at www/');
