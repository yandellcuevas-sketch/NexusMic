const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const nsisCache = path.join(process.env.LOCALAPPDATA || 'C:\\Users\\User\\AppData\\Local', 'electron-builder', 'Cache', 'nsis');
const sevenZip = path.join(__dirname, '../node_modules/7zip-bin/win/x64/7za.exe');

if (!fs.existsSync(nsisCache)) {
  fs.mkdirSync(nsisCache, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      return resolve();
    }
    console.log(`[FixNSIS] Downloading ${path.basename(dest)}...`);
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function prepareNSIS() {
  const nsisZip = path.join(nsisCache, 'nsis-3.0.4.1.7z');
  const nsisTarget = path.join(nsisCache, 'nsis-3.0.4.1');
  
  const resZip = path.join(nsisCache, 'nsis-resources-3.4.1.7z');
  const resTarget = path.join(nsisCache, 'nsis-resources-3.4.1');

  await download('https://github.com/electron-userland/electron-builder-binaries/releases/download/nsis-3.0.4.1/nsis-3.0.4.1.7z', nsisZip);
  await download('https://github.com/electron-userland/electron-builder-binaries/releases/download/nsis-resources-3.4.1/nsis-resources-3.4.1.7z', resZip);

  if (!fs.existsSync(path.join(nsisTarget, 'makensis.exe'))) {
    fs.mkdirSync(nsisTarget, { recursive: true });
    try {
      execFileSync(sevenZip, ['x', '-y', `-o${nsisTarget}`, nsisZip], { stdio: 'inherit' });
    } catch (e) {
      console.warn('[FixNSIS] Error extracting nsis-3.0.4.1:', e.message);
    }
  }

  if (!fs.existsSync(resTarget)) {
    fs.mkdirSync(resTarget, { recursive: true });
    try {
      execFileSync(sevenZip, ['x', '-y', `-o${resTarget}`, resZip], { stdio: 'inherit' });
    } catch (e) {
      console.warn('[FixNSIS] Error extracting nsis-resources:', e.message);
    }
  }

  console.log('[FixNSIS] NSIS build tools successfully ready!');
}

prepareNSIS().catch(console.error);
