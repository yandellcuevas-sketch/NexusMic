/* ==========================================================================
   NEXUS VOICE DESKTOP — WINDOWS ADAPTER
   Native Windows OS actions execution layer using structured execFile/spawn.
   No raw shell string execution. Strict argument validation.
   ========================================================================== */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile, spawn } = require('child_process');
let app = null;
try {
  const electron = require('electron');
  app = electron.app;
} catch (e) {
  // Standalone test environment
}
const ShieldPortAdapter = require('./shieldport-adapter');

class WindowsAdapter {
  static getNotesDirectory() {
    const userDataPath = app ? app.getPath('userData') : path.join(process.cwd(), '.nexus-data');
    const notesDir = path.join(userDataPath, 'notes');
    if (!fs.existsSync(notesDir)) {
      fs.mkdirSync(notesDir, { recursive: true });
    }
    return notesDir;
  }

  static async openChrome() {
    return new Promise((resolve) => {
      // Use cmd.exe /c start chrome via structured array
      execFile('cmd.exe', ['/c', 'start', '', 'chrome'], (err) => {
        if (err) {
          // Fallback: try explorer.exe chrome
          execFile('explorer.exe', ['chrome.exe'], (err2) => {
            if (err2) {
              return resolve({ success: false, status: 'FAILED', message: 'Could not launch Chrome' });
            }
            resolve({ success: true, status: 'EXECUTED', message: 'Opened Chrome' });
          });
        } else {
          resolve({ success: true, status: 'EXECUTED', message: 'Opened Chrome' });
        }
      });
    });
  }

  static async openShieldPort() {
    return ShieldPortAdapter.openShieldPort();
  }

  static async openExplorer() {
    return new Promise((resolve) => {
      execFile('explorer.exe', [], (err) => {
        if (err && err.code !== 1) { // explorer.exe often returns code 1 on success
          return resolve({ success: false, status: 'FAILED', error: err.message });
        }
        resolve({ success: true, status: 'EXECUTED', message: 'Opened File Explorer' });
      });
    });
  }

  static async openDownloads() {
    const downloadsPath = path.join(os.homedir(), 'Downloads');
    return new Promise((resolve) => {
      execFile('explorer.exe', [downloadsPath], (err) => {
        if (err && err.code !== 1) {
          return resolve({ success: false, status: 'FAILED', error: err.message });
        }
        resolve({ success: true, status: 'EXECUTED', message: `Opened Downloads folder (${downloadsPath})` });
      });
    });
  }

  static async setVolume(level) {
    const numericLevel = Math.max(0, Math.min(100, parseInt(level, 10)));
    if (isNaN(numericLevel)) {
      return { success: false, status: 'INVALID_PARAMETERS', message: 'Invalid volume level' };
    }

    return new Promise((resolve) => {
      // Use parameterized PowerShell command via WScript.Shell SendKeys:
      // First mute all volume (50x VolumeDown), then raise to target level (numericLevel/2 steps up).
      const script = `$w=New-Object -ComObject WScript.Shell; 1..50 | % { $w.SendKeys([char]174) }; $count=[math]::Round(${numericLevel}/2); 1..$count | % { $w.SendKeys([char]175) }`;
      
      execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], (err) => {
        if (err) {
          return resolve({ success: false, status: 'FAILED', error: err.message });
        }
        resolve({ success: true, status: 'EXECUTED', message: `Volume set to ${numericLevel}%`, level: numericLevel });
      });
    });
  }

  static async muteVolume() {
    return new Promise((resolve) => {
      const script = `$w=New-Object -ComObject WScript.Shell; $w.SendKeys([char]173)`;
      execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], (err) => {
        if (err) {
          return resolve({ success: false, status: 'FAILED', error: err.message });
        }
        resolve({ success: true, status: 'EXECUTED', message: 'Volume muted/unmuted' });
      });
    });
  }

  static async getDiskSpace(drive = 'C') {
    const driveLetter = String(drive).toUpperCase().replace(/[^A-Z]/g, '') || 'C';
    const drivePath = `${driveLetter}:\\`;

    try {
      if (fs.statfsSync) {
        const stats = fs.statfsSync(drivePath);
        const freeBytes = stats.bfree * stats.bsize;
        const totalBytes = stats.blocks * stats.bsize;
        const freeGB = (freeBytes / (1024 * 1024 * 1024)).toFixed(1);
        const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(1);

        return {
          success: true,
          status: 'EXECUTED',
          drive: driveLetter,
          freeGB: Number(freeGB),
          totalGB: Number(totalGB),
          message: `${driveLetter}: ${freeGB}GB free of ${totalGB}GB`
        };
      }
    } catch (err) {
      console.warn('[WindowsAdapter] fs.statfsSync fallback:', err.message);
    }

    // Fallback via parameterized PowerShell
    return new Promise((resolve) => {
      const psCommand = `Get-PSDrive ${driveLetter} | Select-Object Used,Free`;
      execFile('powershell.exe', ['-NoProfile', '-Command', psCommand], (err, stdout) => {
        if (err) {
          return resolve({ success: false, status: 'FAILED', error: err.message });
        }
        resolve({
          success: true,
          status: 'EXECUTED',
          drive: driveLetter,
          message: stdout.trim() || `Disk space checked for ${driveLetter}:`
        });
      });
    });
  }

  static async listUsbDrives() {
    return new Promise((resolve) => {
      // Use WMIC with array arguments
      execFile('wmic.exe', ['logicaldisk', 'where', 'DriveType=2', 'get', 'DeviceID,VolumeName'], (err, stdout) => {
        if (err) {
          // Fallback to PowerShell Get-CimInstance
          const psScript = `Get-CimInstance Win32_LogicalDisk -Filter "DriveType=2" | Select-Object DeviceID, VolumeName`;
          execFile('powershell.exe', ['-NoProfile', '-Command', psScript], (err2, stdout2) => {
            if (err2) {
              return resolve({ success: false, status: 'FAILED', error: err2.message });
            }
            const lines = stdout2.trim().split('\n').filter(Boolean);
            const count = Math.max(0, lines.length - 1);
            return resolve({
              success: true,
              status: 'EXECUTED',
              count,
              raw: stdout2.trim(),
              message: `${count} USB drive(s) found`
            });
          });
          return;
        }

        const lines = stdout.trim().split('\r\n').filter((l) => l.trim().length > 0);
        const count = Math.max(0, lines.length - 1);
        resolve({
          success: true,
          status: 'EXECUTED',
          count,
          raw: stdout.trim(),
          message: `${count} USB drive(s) connected`
        });
      });
    });
  }

  static async createNote(content) {
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return { success: false, status: 'INVALID_PARAMETERS', message: 'Note content cannot be empty' };
    }

    try {
      const notesDir = this.getNotesDirectory();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `note_${timestamp}.txt`;
      const filePath = path.join(notesDir, filename);

      // Treat note strictly as data string, never executable shell code
      const noteBody = `NEXUS Voice Note\nDate: ${new Date().toLocaleString('es-ES')}\n\n${content.trim()}\n`;
      fs.writeFileSync(filePath, noteBody, 'utf8');

      return {
        success: true,
        status: 'EXECUTED',
        filePath,
        message: `Created note: "${content.trim()}"`
      };
    } catch (err) {
      return {
        success: false,
        status: 'FAILED',
        error: err.message
      };
    }
  }
}

module.exports = WindowsAdapter;
