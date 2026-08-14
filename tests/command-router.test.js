const assert = require('assert');
const test = require('node:test');
const IntentParser = require('../src/intent-parser');
const CommandRouter = require('../src/command-router');
const WindowsAdapter = require('../src/windows-adapter');

test('IntentParser — Natural Language Parsing & Parameter Validation', async (t) => {
  await t.test('parses OPEN_CHROME variations', () => {
    assert.strictEqual(IntentParser.parse('Nexus abre Chrome').intent, 'OPEN_CHROME');
    assert.strictEqual(IntentParser.parse('abre Google Chrome').intent, 'OPEN_CHROME');
    assert.strictEqual(IntentParser.parse('quiero abrir Chrome').intent, 'OPEN_CHROME');
  });

  await t.test('parses OPEN_DOWNLOADS variations', () => {
    assert.strictEqual(IntentParser.parse('Nexus abre descargas').intent, 'OPEN_DOWNLOADS');
    assert.strictEqual(IntentParser.parse('abre mi carpeta de descargas').intent, 'OPEN_DOWNLOADS');
  });

  await t.test('parses SET_VOLUME and validates range (0-100)', () => {
    const valid = IntentParser.parse('Nexus pon el volumen en 40');
    assert.strictEqual(valid.intent, 'SET_VOLUME');
    assert.strictEqual(valid.parameters.level, 40);

    const outOfRangeHigh = IntentParser.parse('Nexus volumen 500');
    assert.strictEqual(outOfRangeHigh.intent, 'INVALID_PARAMETERS');
    assert.strictEqual(outOfRangeHigh.reason, 'VOLUME_OUT_OF_RANGE');

    const outOfRangeLow = IntentParser.parse('Nexus volumen -30');
    assert.strictEqual(outOfRangeLow.intent, 'INVALID_PARAMETERS');
    assert.strictEqual(outOfRangeLow.reason, 'VOLUME_OUT_OF_RANGE');
  });

  await t.test('parses MUTE_VOLUME', () => {
    assert.strictEqual(IntentParser.parse('Nexus silencia el volumen').intent, 'MUTE_VOLUME');
    assert.strictEqual(IntentParser.parse('silenciar volumen').intent, 'MUTE_VOLUME');
  });

  await t.test('parses GET_DISK_SPACE', () => {
    const res = IntentParser.parse('Nexus cuánto espacio queda en C');
    assert.strictEqual(res.intent, 'GET_DISK_SPACE');
    assert.strictEqual(res.parameters.drive, 'C');
  });

  await t.test('parses LIST_USB_DRIVES', () => {
    assert.strictEqual(IntentParser.parse('Nexus qué memorias USB están conectadas').intent, 'LIST_USB_DRIVES');
  });

  await t.test('parses CREATE_NOTE and treats text as data', () => {
    const res = IntentParser.parse('Nexus crea una nota que diga comprar cable USB');
    assert.strictEqual(res.intent, 'CREATE_NOTE');
    assert.strictEqual(res.parameters.content, 'comprar cable USB');
  });
});

test('Security & Command Injection Prevention Tests', async (t) => {
  await t.test('rejects payload with & del C:\\*', () => {
    const res = IntentParser.parse('Nexus abre Chrome & del C:\\*');
    assert.strictEqual(res.intent, 'SECURITY_REJECTED');
    assert.strictEqual(res.reason, 'COMMAND_INJECTION_DETECTED');
  });

  await t.test('rejects payload with semicolon chaining ; calc.exe', () => {
    const res = IntentParser.parse('Nexus abre Chrome; calc.exe');
    assert.strictEqual(res.intent, 'SECURITY_REJECTED');
    assert.strictEqual(res.reason, 'COMMAND_INJECTION_DETECTED');
  });

  await t.test('rejects payload with pipe | whoami', () => {
    const res = IntentParser.parse('Nexus abre Chrome | whoami');
    assert.strictEqual(res.intent, 'SECURITY_REJECTED');
    assert.strictEqual(res.reason, 'COMMAND_INJECTION_DETECTED');
  });

  await t.test('rejects payload with logical AND && shutdown /s', () => {
    const res = IntentParser.parse('Nexus abre Chrome && shutdown /s');
    assert.strictEqual(res.intent, 'SECURITY_REJECTED');
    assert.strictEqual(res.reason, 'COMMAND_INJECTION_DETECTED');
  });

  await t.test('rejects payload with subshell invocation $(whoami)', () => {
    const res = IntentParser.parse('Nexus abre $(whoami)');
    assert.strictEqual(res.intent, 'SECURITY_REJECTED');
    assert.strictEqual(res.reason, 'COMMAND_INJECTION_DETECTED');
  });
});

test('CommandRouter — Allowlist & Execution Guard', async (t) => {
  await t.test('allows registered SAFE intents', () => {
    assert.strictEqual(CommandRouter.isAllowed('OPEN_CHROME'), true);
    assert.strictEqual(CommandRouter.isAllowed('OPEN_DOWNLOADS'), true);
    assert.strictEqual(CommandRouter.isAllowed('SET_VOLUME'), true);
    assert.strictEqual(CommandRouter.isAllowed('GET_DISK_SPACE'), true);
    assert.strictEqual(CommandRouter.isAllowed('CREATE_NOTE'), true);
  });

  await t.test('rejects unregistered or unlisted intents', async () => {
    assert.strictEqual(CommandRouter.isAllowed('DELETE_FILE'), false);
    assert.strictEqual(CommandRouter.isAllowed('FORMAT_USB'), false);
    assert.strictEqual(CommandRouter.isAllowed('SHUTDOWN'), false);
    assert.strictEqual(CommandRouter.isAllowed('RUN_POWERSHELL'), false);

    const res = await CommandRouter.route({ intent: 'DELETE_FILE', parameters: {} });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 'COMMAND_NOT_ALLOWED');
  });

  await t.test('rejects SECURITY_REJECTED intent cleanly', async () => {
    const intentObj = IntentParser.parse('Nexus abre Chrome; calc.exe');
    const res = await CommandRouter.route(intentObj);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 'SECURITY_REJECTED');
  });
});

test('WindowsAdapter — Safe Execution Methods', async (t) => {
  await t.test('GET_DISK_SPACE returns drive info', async () => {
    const res = await WindowsAdapter.getDiskSpace('C');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.drive, 'C');
  });

  await t.test('CREATE_NOTE writes note safely to notes directory', async () => {
    const res = await WindowsAdapter.createNote('Test note for unit testing');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'EXECUTED');
    assert.ok(res.filePath.includes('notes'));
  });

  await t.test('OPEN_SHIELDPORT returns APP_NOT_FOUND if executable absent', async () => {
    const res = await WindowsAdapter.openShieldPort();
    assert.ok(res.status === 'APP_NOT_FOUND' || res.status === 'EXECUTED');
  });
});
