/* ==========================================================================
   NEXUS VOICE DESKTOP — COMMAND ROUTER
   Strict Allowlist Enforcer & Dispatcher to WindowsAdapter.
   Rejects unregistered or malicious intents instantly.
   ========================================================================== */

const WindowsAdapter = require('./windows-adapter');

const ALLOWED_SAFE_INTENTS = new Set([
  'OPEN_CHROME',
  'OPEN_SHIELDPORT',
  'OPEN_EXPLORER',
  'OPEN_DOWNLOADS',
  'SET_VOLUME',
  'MUTE_VOLUME',
  'GET_DISK_SPACE',
  'LIST_USB_DRIVES',
  'CREATE_NOTE'
]);

class CommandRouter {
  static isAllowed(intent) {
    return ALLOWED_SAFE_INTENTS.has(intent);
  }

  static async route(intentObj) {
    if (!intentObj || typeof intentObj !== 'object') {
      return {
        success: false,
        status: 'COMMAND_NOT_ALLOWED',
        message: 'Invalid intent object'
      };
    }

    const { intent, parameters = {}, reason } = intentObj;

    if (intent === 'SECURITY_REJECTED') {
      return {
        success: false,
        status: 'SECURITY_REJECTED',
        reason: reason || 'COMMAND_INJECTION_DETECTED',
        message: 'Command rejected by security filter'
      };
    }

    if (intent === 'INVALID_PARAMETERS') {
      return {
        success: false,
        status: 'INVALID_PARAMETERS',
        reason: reason || 'PARAMETER_VALIDATION_FAILED',
        message: 'Parameters out of valid range'
      };
    }

    if (!this.isAllowed(intent)) {
      return {
        success: false,
        status: 'COMMAND_NOT_ALLOWED',
        message: `Intent "${intent}" is not in the allowed command list`
      };
    }

    // Dispatch exclusively to WindowsAdapter safe methods
    try {
      switch (intent) {
        case 'OPEN_CHROME':
          return await WindowsAdapter.openChrome();
        case 'OPEN_SHIELDPORT':
          return await WindowsAdapter.openShieldPort();
        case 'OPEN_EXPLORER':
          return await WindowsAdapter.openExplorer();
        case 'OPEN_DOWNLOADS':
          return await WindowsAdapter.openDownloads();
        case 'SET_VOLUME':
          return await WindowsAdapter.setVolume(parameters.level);
        case 'MUTE_VOLUME':
          return await WindowsAdapter.muteVolume();
        case 'GET_DISK_SPACE':
          return await WindowsAdapter.getDiskSpace(parameters.drive || 'C');
        case 'LIST_USB_DRIVES':
          return await WindowsAdapter.listUsbDrives();
        case 'CREATE_NOTE':
          return await WindowsAdapter.createNote(parameters.content);
        default:
          return {
            success: false,
            status: 'COMMAND_NOT_ALLOWED',
            message: 'Unhandled intent'
          };
      }
    } catch (err) {
      return {
        success: false,
        status: 'EXECUTION_FAILED',
        error: err.message
      };
    }
  }
}

module.exports = CommandRouter;
