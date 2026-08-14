const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron');
const path = require('path');
const StorageManager = require('./src/store');
const IntentParser = require('./src/intent-parser');
const CommandRouter = require('./src/command-router');

// Enforce Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[NEXUS Main] Another instance is already running. Exiting cleanly.');
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let tray = null;
let isQuitting = false;
const storage = new StorageManager();

function createTrayIcon() {
  // Create a 16x16 circular SVG tray icon
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="7" fill="#0D1117" stroke="#4C8DFF" stroke-width="1.5"/>
    <circle cx="8" cy="8" r="3" fill="#4C8DFF"/>
  </svg>`;
  const icon = nativeImage.createFromBuffer(Buffer.from(svg));
  return icon;
}

function updateAutoLaunch(enabled) {
  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(enabled),
      path: process.execPath,
      args: ['--process-start-args', '"--hidden"']
    });
  } catch (err) {
    console.error('[NEXUS Main] Failed to update auto-launch settings:', err);
  }
}

function createWindow() {
  const settings = storage.getSettings();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 880,
    minHeight: 600,
    title: 'NEXUS Voice Desktop',
    backgroundColor: '#07090E',
    show: !settings.startMinimized,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.setMenu(null);
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('close', (event) => {
    const currentSettings = storage.getSettings();
    if (!isQuitting && currentSettings.systemTrayMode) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle second instance activation
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function setupTray() {
  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('NEXUS Voice Desktop');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mostrar NEXUS',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Mini Mode',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('nexus:tray-action', 'toggle-mini-mode');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Salir de NEXUS',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Register secure IPC Handlers
function setupIPCHandlers() {
  ipcMain.handle('nexus:get-settings', (event) => {
    validateSender(event);
    return storage.getSettings();
  });

  ipcMain.handle('nexus:update-settings', (event, partialSettings) => {
    validateSender(event);
    if (typeof partialSettings !== 'object' || partialSettings === null) {
      throw new Error('Invalid settings object');
    }

    const success = storage.saveSettings(partialSettings);
    if (partialSettings.startWithWindows !== undefined) {
      updateAutoLaunch(partialSettings.startWithWindows);
    }
    return success;
  });

  ipcMain.handle('nexus:get-history', (event, filter) => {
    validateSender(event);
    return storage.getHistory(filter);
  });

  ipcMain.handle('nexus:clear-history', (event) => {
    validateSender(event);
    return storage.clearHistory();
  });

  ipcMain.handle('nexus:toggle-mini-mode', (event, enable) => {
    validateSender(event);
    if (mainWindow) {
      if (enable) {
        mainWindow.setSize(380, 220);
        mainWindow.setAlwaysOnTop(true);
      } else {
        mainWindow.setSize(1200, 800);
        mainWindow.setAlwaysOnTop(false);
        mainWindow.center();
      }
    }
    return true;
  });

  ipcMain.handle('nexus:minimize-to-tray', (event) => {
    validateSender(event);
    if (mainWindow) mainWindow.hide();
    return true;
  });

  // Real Command Execution Pipeline (Fase 4)
  ipcMain.handle('nexus:execute-intent', async (event, payload) => {
    validateSender(event);
    const startTime = Date.now();
    let intentObj;

    if (typeof payload === 'string') {
      intentObj = IntentParser.parse(payload);
    } else if (typeof payload === 'object' && payload !== null) {
      if (payload.transcript && !payload.intent) {
        intentObj = IntentParser.parse(payload.transcript);
      } else {
        intentObj = payload;
      }
    } else {
      intentObj = { intent: 'UNKNOWN_INTENT', raw: String(payload), parameters: {} };
    }

    const result = await CommandRouter.route(intentObj);
    const durationMs = Date.now() - startTime;

    const historyStatus = result.success ? 'success' : (result.status === 'CONFIRMATION_REQUIRED' ? 'confirm' : 'failed');
    
    storage.addHistoryEntry({
      transcript: intentObj.raw || payload.transcript || intentObj.intent,
      intent: intentObj.intent,
      status: historyStatus,
      subText: result.message || result.error || null,
      durationMs,
      error: result.error || null
    });

    return {
      intent: intentObj.intent,
      parameters: intentObj.parameters,
      result
    };
  });

  ipcMain.handle('nexus:confirm-action', async (event, payload) => {
    validateSender(event);
    return { status: 'DEFERRED_TO_FASE_4', payload };
  });
}

function validateSender(event) {
  // Validate that the request came from our local index.html window
  const senderUrl = event.sender.getURL();
  if (!senderUrl.startsWith('file://')) {
    throw new Error('Unauthorized IPC sender origin');
  }
}

app.whenReady().then(() => {
  setupIPCHandlers();
  createWindow();
  setupTray();

  const settings = storage.getSettings();
  updateAutoLaunch(settings.startWithWindows);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
