const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const cacheDir = path.join(process.env.LOCALAPPDATA || 'C:\\Users\\User\\AppData\\Local', 'electron-builder', 'Cache', 'winCodeSign');
const extractTarget = path.join(cacheDir, 'winCodeSign-2.6.0');
const zipFile = path.join(cacheDir, 'winCodeSign-2.6.0.7z');
const sevenZipExe = path.join(__dirname, '../node_modules/7zip-bin/win/x64/7za.exe');

if (!fs.existsSync(extractTarget)) {
  fs.mkdirSync(extractTarget, { recursive: true });
}

if (fs.existsSync(zipFile) && fs.existsSync(sevenZipExe)) {
  console.log('[SetupCache] Extracting winCodeSign skipping symlinks...');
  try {
    execFileSync(sevenZipExe, ['x', '-y', '-snld', `-o${extractTarget}`, zipFile], { stdio: 'inherit' });
    console.log('[SetupCache] winCodeSign extracted successfully to:', extractTarget);
  } catch (err) {
    console.warn('[SetupCache] Extraction finished with warnings (symlinks skipped as intended).');
  }
} else {
  console.log('[SetupCache] zipFile or 7za.exe not found yet.');
}
