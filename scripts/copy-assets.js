const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../node_modules/reveal.js/dist');
const dest = path.join(__dirname, '../vendor/revealjs/dist');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

try {
  if (fs.existsSync(src)) {
    copyRecursiveSync(src, dest);
    console.log('Successfully copied reveal.js assets to vendor/revealjs/dist');
  } else {
    console.error('Error: node_modules/reveal.js/dist not found. Run npm install first.');
    process.exit(1);
  }
} catch (err) {
  console.error('Failed to copy assets:', err);
  process.exit(1);
}
