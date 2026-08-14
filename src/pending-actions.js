/* ==========================================================================
   NEXUS VOICE DESKTOP — PENDING ACTION STORE
   Secure ephemeral storage for actions awaiting user confirmation.

   Security Properties:
   - Replay Protection: each actionId can only be resolved once.
   - Auto-expiry: actions expire after `timeoutMs` (default: 30s).
   - Opaque IDs: actionIds are random and non-guessable.
   ========================================================================== */

class PendingActionStore {
  /**
   * @param {number} timeoutMs - Maximum time (ms) a pending action remains valid.
   *                             Defaults to 30000 (30 seconds).
   */
  constructor(timeoutMs = 30000) {
    this._actions = new Map();
    this._timeoutMs = timeoutMs;
  }

  /**
   * Store an intent object awaiting confirmation.
   * @param {object} intentObj - The validated intent object to execute on approval.
   * @returns {string} Opaque actionId (format: `pact_<timestamp36>_<random6>`).
   */
  store(intentObj) {
    const actionId = `pact_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const expiresAt = Date.now() + this._timeoutMs;

    // Auto-expire: if the user never confirms, clean up automatically.
    const timer = setTimeout(() => {
      this._actions.delete(actionId);
    }, this._timeoutMs);

    this._actions.set(actionId, {
      intentObj,
      expiresAt,
      timer,
      used: false
    });

    return actionId;
  }

  /**
   * Resolve a pending action by its opaque ID.
   * On success, the action is immediately removed from the store (replay protection).
   *
   * @param {string} actionId
   * @returns {{ intentObj: object }} on success
   * @returns {{ error: string }}     on failure
   *   Possible error codes:
   *     'INVALID_ACTION_ID' — actionId is not a string or is empty
   *     'ACTION_NOT_FOUND'  — actionId not in store (expired or already resolved)
   *     'ALREADY_USED'      — resolved concurrently; internal guard (should not happen normally)
   *     'ACTION_EXPIRED'    — detected after timer fired but before cleanup
   */
  resolve(actionId) {
    if (!actionId || typeof actionId !== 'string') {
      return { error: 'INVALID_ACTION_ID' };
    }

    const pending = this._actions.get(actionId);

    if (!pending) {
      return { error: 'ACTION_NOT_FOUND' };
    }

    // Concurrent-call guard (extra safety; should not normally trigger)
    if (pending.used) {
      return { error: 'ALREADY_USED' };
    }

    if (Date.now() > pending.expiresAt) {
      this._expire(actionId);
      return { error: 'ACTION_EXPIRED' };
    }

    // Mark used first (before any await), then clean up.
    pending.used = true;
    const { intentObj } = pending;
    this._expire(actionId);

    return { intentObj };
  }

  /**
   * Cancel a pending action without executing it.
   * Safe to call even if the actionId is unknown or already expired.
   * @param {string} actionId
   */
  cancel(actionId) {
    this._expire(actionId);
  }

  /**
   * Number of currently active (non-expired) pending actions.
   * @returns {number}
   */
  get size() {
    return this._actions.size;
  }

  /** @private */
  _expire(actionId) {
    const pending = this._actions.get(actionId);
    if (pending && pending.timer) {
      clearTimeout(pending.timer);
    }
    this._actions.delete(actionId);
  }
}

module.exports = PendingActionStore;
