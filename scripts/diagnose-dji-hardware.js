const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload.js')
    }
  });

  win.loadFile(path.join(__dirname, '../index.html'));

  setTimeout(async () => {
    try {
      const result = await win.webContents.executeJavaScript(`
        (async () => {
          try {
            // Request permission to unlock device labels
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const track = stream.getAudioTracks()[0];
            const settings = track ? track.getSettings() : {};

            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices
              .filter(d => d.kind === 'audioinput')
              .map(d => ({
                label: d.label || 'Microphone (unlabeled)',
                deviceIdPrefix: d.deviceId ? d.deviceId.substring(0, 8) + '...' : 'default',
                isDJIMic: /dji/i.test(d.label)
              }));

            // Stop temporary stream
            stream.getTracks().forEach(t => t.stop());

            return {
              devices: audioInputs,
              streamActive: !!track && track.readyState === 'live',
              sampleRate: settings.sampleRate || 'Auto',
              channelCount: settings.channelCount || 1,
              activeTrackLabel: track ? track.label : 'None'
            };
          } catch (err) {
            return { error: err.message };
          }
        })()
      `);

      console.log('=== HARDWARE DIAGNOSTIC RESULT ===');
      console.log(JSON.stringify(result, null, 2));

      app.quit();
    } catch (err) {
      console.error('Diagnostic error:', err);
      app.quit();
    }
  }, 1500);
});
