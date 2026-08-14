const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

class ShieldPortAdapter {
  static getInstallPaths() {
    const localAppData = process.env.LOCALAPPDATA || 'C:\\Users\\Default\\AppData\\Local';
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    const userProfile = process.env.USERPROFILE || 'C:\\Users\\Default';

    return [
      path.join(localAppData, 'ShieldPort', 'ShieldPort.exe'),
      path.join(programFiles, 'ShieldPort', 'ShieldPort.exe'),
      path.join(userProfile, 'ShieldPort', 'ShieldPort.exe'),
      'C:\\ShieldPort\\ShieldPort.exe'
    ];
  }

  static findExecutable() {
    const paths = this.getInstallPaths();
    for (const p of paths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return null;
  }

  static isAvailable() {
    return Boolean(this.findExecutable());
  }

  static openShieldPort() {
    const exePath = this.findExecutable();
    if (!exePath) {
      return {
        success: false,
        status: 'APP_NOT_FOUND',
        message: 'ShieldPort executable not found on this system.'
      };
    }

    try {
      execFile(exePath, [], { detached: true, stdio: 'ignore' }).unref();
      return {
        success: true,
        status: 'EXECUTED',
        message: 'ShieldPort launched successfully.'
      };
    } catch (err) {
      return {
        success: false,
        status: 'EXECUTION_FAILED',
        error: err.message
      };
    }
  }
}

module.exports = ShieldPortAdapter;
