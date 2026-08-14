const assert = require('assert');
const test = require('node:test');
const fs = require('fs');
const path = require('path');
const StorageManager = require('../src/store');

test('StorageManager — Settings & History persistence', async (t) => {
  const tmpDir = path.join(__dirname, '../scratch_test_data_' + Date.now());
  
  // Override userDataPath
  class TestStorageManager extends StorageManager {
    constructor() {
      super();
    }
  }

  t.beforeEach(() => {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  t.afterEach(() => {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  await t.test('loads default settings when no config file exists', () => {
    const storage = new TestStorageManager();
    storage.userDataPath = tmpDir;
    storage.configPath = path.join(tmpDir, 'config.json');
    storage.historyPath = path.join(tmpDir, 'history.json');
    storage.ensureDirectoryExists(tmpDir);

    const settings = storage.loadSettings();
    assert.strictEqual(settings.wakeWord, 'Nexus');
    assert.strictEqual(settings.recognitionLanguage, 'es-ES');
    assert.strictEqual(settings.startWithWindows, true);
  });

  await t.test('saves and retrieves updated settings', () => {
    const storage = new TestStorageManager();
    storage.userDataPath = tmpDir;
    storage.configPath = path.join(tmpDir, 'config.json');
    storage.historyPath = path.join(tmpDir, 'history.json');
    storage.ensureDirectoryExists(tmpDir);

    storage.saveSettings({ wakeWord: 'CustomNexus', recognitionLanguage: 'en-US' });
    const updated = storage.getSettings();
    assert.strictEqual(updated.wakeWord, 'CustomNexus');
    assert.strictEqual(updated.recognitionLanguage, 'en-US');
  });

  await t.test('sanitizes history entries and clears history', () => {
    const storage = new TestStorageManager();
    storage.userDataPath = tmpDir;
    storage.configPath = path.join(tmpDir, 'config.json');
    storage.historyPath = path.join(tmpDir, 'history.json');
    storage.ensureDirectoryExists(tmpDir);

    const entry = storage.addHistoryEntry({
      transcript: 'Nexus, abre Chrome',
      intent: 'OPEN_APP',
      status: 'success',
      extraPrivateDataToIgnore: 'SECRET'
    });

    assert.strictEqual(entry.transcript, 'Nexus, abre Chrome');
    assert.strictEqual(entry.intent, 'OPEN_APP');
    assert.strictEqual(entry.status, 'success');
    assert.strictEqual(entry.extraPrivateDataToIgnore, undefined);

    const history = storage.getHistory();
    assert.strictEqual(history.length, 1);

    storage.clearHistory();
    assert.strictEqual(storage.getHistory().length, 0);
  });
});
