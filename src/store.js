const fs = require('fs');
const path = require('path');
let app = null;
try {
  const electron = require('electron');
  app = electron.app;
} catch (e) {
  // Standalone test environment
}

const DEFAULT_SETTINGS = {
  startWithWindows: true,
  startMinimized: true,
  systemTrayMode: true,
  theme: "dark",
  inputDevice: "default",
  gain: 64,
  wakeWord: "Nexus",
  wakeWordEnabled: true,
  recognitionLanguage: "es-ES",
  confirmDestructive: true,
  confirmSystemLevel: true,
  commandTimeoutSec: 10,
  responseVerbosity: "standard",
  askWhenUncertain: true,
  micIndicator: true,
  commandHistoryEnabled: true
};

class StorageManager {
  constructor() {
    this.userDataPath = app ? app.getPath('userData') : path.join(process.cwd(), '.nexus-data');
    this.configPath = path.join(this.userDataPath, 'config.json');
    this.historyPath = path.join(this.userDataPath, 'history.json');
    this.logsPath = path.join(this.userDataPath, 'logs');

    this.ensureDirectoryExists(this.userDataPath);
    this.ensureDirectoryExists(this.logsPath);

    this.settings = this.loadSettings();
    this.history = this.loadHistory();
  }

  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  loadSettings() {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (err) {
      console.error("[StorageManager] Error reading config.json, resetting to defaults:", err);
    }
    this.saveSettings(DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS };
  }

  saveSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      fs.writeFileSync(this.configPath, JSON.stringify(this.settings, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error("[StorageManager] Error saving config.json:", err);
      return false;
    }
  }

  getSettings() {
    return { ...this.settings };
  }

  loadHistory() {
    try {
      if (fs.existsSync(this.historyPath)) {
        const raw = fs.readFileSync(this.historyPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {
      console.error("[StorageManager] Error reading history.json:", err);
    }
    return [];
  }

  addHistoryEntry(entry) {
    if (!this.settings.commandHistoryEnabled) return;
    
    // Sanitize entry: strictly store non-sensitive metadata
    const sanitizedEntry = {
      id: entry.id || Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      timestamp: entry.timestamp || new Date().toISOString(),
      time: entry.time || new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      transcript: String(entry.transcript || entry.text || "").substring(0, 500),
      intent: entry.intent || "UNKNOWN",
      status: entry.status || "success", // success, failed, cancelled, confirm
      subText: entry.subText || entry.sub || null,
      durationMs: typeof entry.durationMs === 'number' ? entry.durationMs : 0,
      error: entry.error ? String(entry.error).substring(0, 300) : null
    };

    this.history.push(sanitizedEntry);
    
    // Keep last 500 entries
    if (this.history.length > 500) {
      this.history = this.history.slice(-500);
    }

    try {
      fs.writeFileSync(this.historyPath, JSON.stringify(this.history, null, 2), 'utf8');
    } catch (err) {
      console.error("[StorageManager] Error writing history.json:", err);
    }

    return sanitizedEntry;
  }

  getHistory(filter = 'all') {
    if (!filter || filter === 'all') return [...this.history];
    return this.history.filter(item => item.status === filter);
  }

  clearHistory() {
    this.history = [];
    try {
      fs.writeFileSync(this.historyPath, JSON.stringify([]), 'utf8');
      return true;
    } catch (err) {
      console.error("[StorageManager] Error clearing history.json:", err);
      return false;
    }
  }
}

module.exports = StorageManager;
