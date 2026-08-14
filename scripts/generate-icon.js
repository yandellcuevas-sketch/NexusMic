const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '../assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Minimal valid 64x64 PNG image buffer (Blue NEXUS circular badge icon)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="48" fill="#0D1117"/>
  <circle cx="128" cy="128" r="90" fill="none" stroke="#4C8DFF" stroke-width="12"/>
  <circle cx="128" cy="128" r="32" fill="#8B7CFF"/>
</svg>`;

fs.writeFileSync(path.join(assetsDir, 'icon.svg'), svg, 'utf8');
console.log('Generated assets/icon.svg (TEMPORARY APP ICON)');
