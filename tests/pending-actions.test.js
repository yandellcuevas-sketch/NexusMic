const assert = require('assert');
const test = require('node:test');
const PendingActionStore = require('../src/pending-actions');

test('PendingActionStore — Store & Resolve Lifecycle', async (t) => {
  await t.test('stores an action and resolves it successfully (happy path)', () => {
    const store = new PendingActionStore(5000);
    const intentObj = { intent: 'CREATE_NOTE', parameters: { content: 'test note' } };

    const actionId = store.store(intentObj);

    assert.ok(typeof actionId === 'string', 'actionId must be a string');
    assert.ok(actionId.startsWith('pact_'), 'actionId must use pact_ prefix');
    assert.strictEqual(store.size, 1);

    const resolution = store.resolve(actionId);

    assert.strictEqual(resolution.error, undefined, 'Should not have error on first resolve');
    assert.deepStrictEqual(resolution.intentObj, intentObj, 'Must return exact stored intentObj');
    assert.strictEqual(store.size, 0, 'Store must be empty after resolve');
  });

  await t.test('enforces replay protection — action is removed after first resolve', () => {
    const store = new PendingActionStore(5000);
    const actionId = store.store({ intent: 'OPEN_CHROME', parameters: {} });

    const first = store.resolve(actionId);
    assert.strictEqual(first.error, undefined, 'First resolve must succeed');

    // Action is removed after resolve, so second attempt returns ACTION_NOT_FOUND
    const second = store.resolve(actionId);
    assert.ok(
      second.error === 'ACTION_NOT_FOUND' || second.error === 'ALREADY_USED',
      `Expected ACTION_NOT_FOUND or ALREADY_USED, got: ${second.error}`
    );
  });

  await t.test('cancel() removes the action from store without executing it', () => {
    const store = new PendingActionStore(5000);
    const actionId = store.store({ intent: 'OPEN_CHROME', parameters: {} });
    assert.strictEqual(store.size, 1);

    store.cancel(actionId);
    assert.strictEqual(store.size, 0, 'Store must be empty after cancel');

    const resolution = store.resolve(actionId);
    assert.strictEqual(resolution.error, 'ACTION_NOT_FOUND');
  });

  await t.test('cancel() is safe to call on unknown or already-resolved actionId', () => {
    const store = new PendingActionStore(5000);
    // Should not throw
    store.cancel('nonexistent_id');
    store.cancel(null);
    store.cancel(undefined);
    assert.strictEqual(store.size, 0);
  });
});

test('PendingActionStore — Invalid Input Rejection', async (t) => {
  await t.test('rejects unknown actionId with ACTION_NOT_FOUND', () => {
    const store = new PendingActionStore(5000);
    const res = store.resolve('pact_unknown_id');
    assert.strictEqual(res.error, 'ACTION_NOT_FOUND');
  });

  await t.test('rejects null actionId with INVALID_ACTION_ID', () => {
    const store = new PendingActionStore(5000);
    assert.strictEqual(store.resolve(null).error, 'INVALID_ACTION_ID');
  });

  await t.test('rejects undefined actionId with INVALID_ACTION_ID', () => {
    const store = new PendingActionStore(5000);
    assert.strictEqual(store.resolve(undefined).error, 'INVALID_ACTION_ID');
  });

  await t.test('rejects numeric actionId with INVALID_ACTION_ID', () => {
    const store = new PendingActionStore(5000);
    assert.strictEqual(store.resolve(12345).error, 'INVALID_ACTION_ID');
  });

  await t.test('rejects empty string actionId with INVALID_ACTION_ID', () => {
    const store = new PendingActionStore(5000);
    assert.strictEqual(store.resolve('').error, 'INVALID_ACTION_ID');
  });
});

test('PendingActionStore — Auto-Expiry (Timeout)', async (t) => {
  await t.test('action expires after timeout and returns ACTION_NOT_FOUND', async () => {
    const store = new PendingActionStore(60); // 60ms timeout for fast test
    const actionId = store.store({ intent: 'OPEN_CHROME', parameters: {} });

    assert.strictEqual(store.size, 1);

    // Wait past the timeout
    await new Promise((resolve) => setTimeout(resolve, 120));

    const res = store.resolve(actionId);
    // After timer fires, action is deleted → ACTION_NOT_FOUND
    assert.ok(
      res.error === 'ACTION_NOT_FOUND' || res.error === 'ACTION_EXPIRED',
      `Expected ACTION_NOT_FOUND or ACTION_EXPIRED, got: ${res.error}`
    );
  });

  await t.test('action resolves successfully when called before timeout', async () => {
    const store = new PendingActionStore(500); // 500ms timeout
    const intentObj = { intent: 'LIST_USB_DRIVES', parameters: {} };
    const actionId = store.store(intentObj);

    // Resolve immediately (well within timeout)
    const res = store.resolve(actionId);
    assert.strictEqual(res.error, undefined);
    assert.deepStrictEqual(res.intentObj, intentObj);
  });
});

test('PendingActionStore — Multiple Concurrent Actions', async (t) => {
  await t.test('stores multiple actions simultaneously and resolves them independently', () => {
    const store = new PendingActionStore(5000);

    const id1 = store.store({ intent: 'OPEN_CHROME', parameters: {} });
    const id2 = store.store({ intent: 'CREATE_NOTE', parameters: { content: 'hello' } });
    const id3 = store.store({ intent: 'LIST_USB_DRIVES', parameters: {} });

    assert.strictEqual(store.size, 3);

    const r1 = store.resolve(id1);
    assert.strictEqual(r1.intentObj.intent, 'OPEN_CHROME');
    assert.strictEqual(store.size, 2);

    store.cancel(id2);
    assert.strictEqual(store.size, 1);

    const r3 = store.resolve(id3);
    assert.strictEqual(r3.intentObj.intent, 'LIST_USB_DRIVES');
    assert.strictEqual(store.size, 0);
  });

  await t.test('each actionId is unique across multiple store() calls', () => {
    const store = new PendingActionStore(5000);
    const ids = new Set();

    for (let i = 0; i < 100; i++) {
      ids.add(store.store({ intent: 'OPEN_CHROME', parameters: {} }));
    }

    assert.strictEqual(ids.size, 100, 'All 100 actionIds must be unique');
    assert.strictEqual(store.size, 100);
  });
});
