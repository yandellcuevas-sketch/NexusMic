const { contextBridge, ipcRenderer } = require('electron');

// Explicit, strictly-typed security bridge. NO raw ipcRenderer exposure.
contextBridge.exposeInMainWorld('nexusAPI', {
  // Settings IPC
  getSettings: async () => {
    return await ipcRenderer.invoke('nexus:get-settings');
  },
  updateSettings: async (settings) => {
    if (typeof settings !== 'object' || settings === null) {
      throw new Error('Invalid settings payload');
    }
    return await ipcRenderer.invoke('nexus:update-settings', settings);
  },

  // History IPC
  getHistory: async (filter = 'all') => {
    if (typeof filter !== 'string') filter = 'all';
    return await ipcRenderer.invoke('nexus:get-history', filter);
  },
  clearHistory: async () => {
    return await ipcRenderer.invoke('nexus:clear-history');
  },

  // Command Router IPC
  // Accepts: { transcript: string } — routed through IntentParser
  //      OR: { intent: string, parameters: object } — direct intent dispatch (Quick Actions, etc.)
  executeVoiceIntent: async (intentData) => {
    if (typeof intentData !== 'object' || intentData === null) {
      throw new Error('Invalid intent data structure');
    }
    return await ipcRenderer.invoke('nexus:execute-intent', intentData);
  },
  confirmSensitiveAction: async (actionId, confirmed) => {
    if (typeof actionId !== 'string' || typeof confirmed !== 'boolean') {
      throw new Error('Invalid confirmation payload');
    }
    return await ipcRenderer.invoke('nexus:confirm-action', { actionId, confirmed });
  },

  // Dedicated action shortcuts (kept for external/programmatic use)
  setVolume: async (level) => {
    const numericLevel = Number(level);
    if (isNaN(numericLevel)) throw new Error('Invalid volume level');
    return await ipcRenderer.invoke('nexus:execute-intent', { intent: 'SET_VOLUME', parameters: { level: numericLevel } });
  },
  getUsbDrives: async () => {
    return await ipcRenderer.invoke('nexus:execute-intent', { intent: 'LIST_USB_DRIVES', parameters: {} });
  },

  // Window & System Tray IPC
  toggleMiniMode: async (enable) => {
    return await ipcRenderer.invoke('nexus:toggle-mini-mode', Boolean(enable));
  },
  minimizeToTray: async () => {
    return await ipcRenderer.invoke('nexus:minimize-to-tray');
  },

  // Event Listeners (Main -> Renderer)
  onSystemTrayAction: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const subscription = (_event, action) => callback(action);
    ipcRenderer.on('nexus:tray-action', subscription);
    return () => ipcRenderer.removeListener('nexus:tray-action', subscription);
  }
});
