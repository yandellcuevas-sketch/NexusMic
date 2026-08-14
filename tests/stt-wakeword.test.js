const assert = require('assert');
const test = require('node:test');
const { WebSpeechEngine, LocalSpeechEngine } = require('../js/stt-engine');
const WakeWordEngine = require('../js/wakeword-engine');

test('SpeechRecognitionEngine — Architecture & Safety Checks', async (t) => {
  await t.test('WebSpeechEngine checks availability without crashing in Node env', () => {
    const engine = new WebSpeechEngine();
    assert.strictEqual(engine.isAvailable(), false); // Window/SpeechRecognition is undefined in plain Node
    assert.strictEqual(engine.isOffline(), false); // WebSpeech is documented as online/cloud-assisted
  });

  await t.test('WebSpeechEngine handles unavailable API gracefully', async () => {
    const engine = new WebSpeechEngine();
    let errorReceived = null;
    engine.onError((err) => { errorReceived = err; });

    const initialized = await engine.init();
    assert.strictEqual(initialized, false);
    assert.strictEqual(errorReceived.code, 'STT_UNAVAILABLE');

    const started = engine.start();
    assert.strictEqual(started, false);
  });

  await t.test('LocalSpeechEngine stub is marked as offline and unavailable until models bound', async () => {
    const localEngine = new LocalSpeechEngine();
    assert.strictEqual(localEngine.isOffline(), true);
    assert.strictEqual(localEngine.isAvailable(), false);
    
    const initialized = await localEngine.init();
    assert.strictEqual(initialized, false);
  });
});

test('WakeWordEngine — Decoupled Trigger Matching', async (t) => {
  await t.test('detects "Nexus" wake word at phrase start', () => {
    const wakeEngine = new WakeWordEngine('Nexus', true);
    const res = wakeEngine.processTranscript('Nexus, abre Chrome');

    assert.strictEqual(res.detected, true);
    assert.strictEqual(res.payloadText, 'abre Chrome');
  });

  await t.test('detects case-insensitive wake word "nexus"', () => {
    const wakeEngine = new WakeWordEngine('Nexus', true);
    const res = wakeEngine.processTranscript('nexus coloca el volumen en 40%');

    assert.strictEqual(res.detected, true);
    assert.strictEqual(res.payloadText, 'coloca el volumen en 40%');
  });

  await t.test('rejects phrase without wake word', () => {
    const wakeEngine = new WakeWordEngine('Nexus', true);
    const res = wakeEngine.processTranscript('hola como estas');

    assert.strictEqual(res.detected, false);
    assert.strictEqual(res.payloadText, '');
  });

  await t.test('bypasses wake word requirement when wake word is disabled', () => {
    const wakeEngine = new WakeWordEngine('Nexus', false);
    const res = wakeEngine.processTranscript('abre el explorador');

    assert.strictEqual(res.detected, true);
    assert.strictEqual(res.payloadText, 'abre el explorador');
  });

  await t.test('supports custom wake word configuration', () => {
    const wakeEngine = new WakeWordEngine('Computadora', true);
    const res = wakeEngine.processTranscript('Computadora, abre ShieldPort');

    assert.strictEqual(res.detected, true);
    assert.strictEqual(res.payloadText, 'abre ShieldPort');
  });
});
