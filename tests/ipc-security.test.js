const assert = require('assert');
const test = require('node:test');

test('IPC & Security Payload Validation', async (t) => {
  await t.test('validates settings payload object structure', () => {
    const validateSettingsPayload = (payload) => {
      if (typeof payload !== 'object' || payload === null) {
        throw new TypeError('Invalid settings payload');
      }
      return true;
    };

    assert.strictEqual(validateSettingsPayload({ wakeWord: 'Nexus' }), true);
    assert.throws(() => validateSettingsPayload(null), TypeError);
    assert.throws(() => validateSettingsPayload('string'), TypeError);
    assert.throws(() => validateSettingsPayload(123), TypeError);
  });

  await t.test('validates intent payload structure', () => {
    const validateIntent = (data) => {
      if (typeof data !== 'object' || data === null || !data.intent) {
        throw new Error('Invalid intent structure');
      }
      return true;
    };

    assert.strictEqual(validateIntent({ intent: 'OPEN_APP', app: 'chrome' }), true);
    assert.throws(() => validateIntent({}), Error);
    assert.throws(() => validateIntent(null), Error);
  });
});
