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
      const res = await win.webContents.executeJavaScript(`
        (async () => {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const djiDev = devices.find(d => d.kind === 'audioinput' && /dji/i.test(d.label));

          const constraints = djiDev ? { audio: { deviceId: { exact: djiDev.deviceId } } } : { audio: true };
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          const track = stream.getAudioTracks()[0];
          const settings = track.getSettings();

          // Compute live RMS over 500ms
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);

          const dataArray = new Float32Array(analyser.fftSize);
          await new Promise(r => setTimeout(r, 600));

          analyser.getFloatTimeDomainData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);

          stream.getTracks().forEach(t => t.stop());
          audioCtx.close();

          return {
            deviceLabel: track.label,
            streamOpen: track.readyState === 'live',
            sampleRate: settings.sampleRate || audioCtx.sampleRate || 48000,
            channelCount: settings.channelCount || 1,
            rms: Number(rms.toFixed(6)),
            deviceIdPrefix: track.getSettings().deviceId ? track.getSettings().deviceId.substring(0, 8) + '...' : 'default'
          };
        })()
      `);

      console.log('=== DJI LIVE AUDIO STREAM METRICS ===');
      console.log(JSON.stringify(res, null, 2));

      app.quit();
    } catch (err) {
      console.error('Error testing stream:', err);
      app.quit();
    }
  }, 1000);
});
