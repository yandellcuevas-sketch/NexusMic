const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const cacheDir = path.join(process.env.LOCALAPPDATA || 'C:\\Users\\User\\AppData\\Local', 'electron-builder', 'Cache', 'winCodeSign');
const targetDir = path.join(cacheDir, 'winCodeSign-2.6.0');
const zipFile = path.join(cacheDir, 'winCodeSign-2.6.0.7z');
const sevenZip = path.join(__dirname, '../node_modules/7zip-bin/win/x64/7za.exe');

if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  if (!fs.existsSync(zipFile)) {
    console.log('[FixCache] Downloading winCodeSign-2.6.0.7z...');
    const url = 'https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z';
    await download(url, zipFile);
    console.log('[FixCache] Downloaded winCodeSign-2.6.0.7z successfully.');
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log('[FixCache] Extracting winCodeSign skipping symlinks via -snld...');
  try {
    execFileSync(sevenZip, ['x', '-y', '-snld', `-o${targetDir}`, zipFile], { stdio: 'inherit' });
    console.log('[FixCache] Extracted winCodeSign cleanly to:', targetDir);
  } catch (err) {
    console.warn('[FixCache] Extraction warning (symlinks ignored as expected):', err.message);
  }
}

run().catch(console.error);
