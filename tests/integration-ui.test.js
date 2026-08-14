const assert = require('assert');
const test = require('node:test');
const StorageManager = require('../src/store');
const CommandRouter = require('../src/command-router');
const IntentParser = require('../src/intent-parser');

test('FASE 5 Integration — History Filtering & Search', async (t) => {
  await t.test('filters history by status correctly', () => {
    const storage = new StorageManager();
    storage.clearHistory();

    storage.addHistoryEntry({ transcript: 'Nexus abre Chrome', intent: 'OPEN_CHROME', status: 'success' });
    storage.addHistoryEntry({ transcript: 'Nexus volumen 500', intent: 'INVALID_PARAMETERS', status: 'failed' });
    storage.addHistoryEntry({ transcript: 'Nexus apagar PC', intent: 'SHUTDOWN', status: 'confirm' });

    const all = storage.getHistory('all');
    assert.strictEqual(all.length, 3);

    const success = storage.getHistory('success');
    assert.strictEqual(success.length, 1);
    assert.strictEqual(success[0].intent, 'OPEN_CHROME');

    const failed = storage.getHistory('failed');
    assert.strictEqual(failed.length, 1);

    const confirm = storage.getHistory('confirm');
    assert.strictEqual(confirm.length, 1);
  });

  await t.test('searches history entries by keyword match', () => {
    const storage = new StorageManager();
    storage.clearHistory();

    storage.addHistoryEntry({ transcript: 'Nexus abre descargas', intent: 'OPEN_DOWNLOADS', status: 'success' });
    storage.addHistoryEntry({ transcript: 'Nexus crea una nota que diga comprar cable', intent: 'CREATE_NOTE', status: 'success' });

    const list = storage.getHistory('all');
    const searchMatch = list.filter((item) => item.transcript.toLowerCase().includes('comprar'));
    
    assert.strictEqual(searchMatch.length, 1);
    assert.strictEqual(searchMatch[0].intent, 'CREATE_NOTE');
  });
});

test('FASE 5 Integration — Settings Sync & Auto-Launch Persistence', async (t) => {
  await t.test('persists updated settings across reloads', () => {
    const storage = new StorageManager();
    storage.saveSettings({
      startWithWindows: true,
      startMinimized: false,
      wakeWord: 'NexusCustom',
      wakeWordEnabled: true
    });

    const loaded = storage.getSettings();
    assert.strictEqual(loaded.startWithWindows, true);
    assert.strictEqual(loaded.startMinimized, false);
    assert.strictEqual(loaded.wakeWord, 'NexusCustom');
  });
});

test('FASE 5 Security — Renderer Cannot Invoke Arbitrary Commands', async (t) => {
  await t.test('blocks unlisted or malicious intents sent from renderer payload', async () => {
    const payload = { intent: 'EXECUTE_POWERSHELL_SCRIPT', command: 'Remove-Item C:\\*' };
    const res = await CommandRouter.route(payload);

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 'COMMAND_NOT_ALLOWED');
  });

  await t.test('blocks command injection attempts embedded in voice transcript strings', async () => {
    const intentObj = IntentParser.parse('Nexus abre Chrome & rmdir /s /q C:\\');
    const res = await CommandRouter.route(intentObj);

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 'SECURITY_REJECTED');
  });
});
