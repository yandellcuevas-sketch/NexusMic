const assert = require('assert');
const test = require('node:test');
const AudioEngine = require('../js/audio-engine');

test('AudioEngine — Device Auto-Selection & DJI Mic Detection', async (t) => {
  await t.test('detects DJI Mic Mini from enumerated devices list', () => {
    const engine = new AudioEngine();
    const mockDevices = [
      { deviceId: 'dev1', label: 'Realtek High Definition Audio' },
      { deviceId: 'dev2', label: 'DJI Mic Mini Wireless Receiver' },
      { deviceId: 'dev3', label: 'Bluetooth Headset' }
    ];

    const selected = engine.autoSelectDJIMic(mockDevices);
    assert.strictEqual(selected, 'dev2');
  });

  await t.test('falls back to first device when DJI Mic is not connected', () => {
    const engine = new AudioEngine();
    const mockDevices = [
      { deviceId: 'dev1', label: 'Realtek High Definition Audio' },
      { deviceId: 'dev3', label: 'Bluetooth Headset' }
    ];

    const selected = engine.autoSelectDJIMic(mockDevices);
    assert.strictEqual(selected, 'dev1');
  });

  await t.test('returns null when no audio devices exist', () => {
    const engine = new AudioEngine();
    const mockDevices = [];

    const selected = engine.autoSelectDJIMic(mockDevices);
    assert.strictEqual(selected, null);
  });
});
