/* ==========================================================================
   NEXUS VOICE DESKTOP — AUDIO ENGINE REAL
   Real hardware microphone capture, device enumeration, DJI Mic Mini detection,
   RMS VU meter calculations via Web Audio API AnalyserNode.
   ========================================================================== */

class AudioEngine {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.microphoneStream = null;
    this.sourceNode = null;
    this.selectedDeviceId = null;
    this.isMuted = false;
    this.vuAnimationHandle = null;
    this.onDeviceChangeCallbacks = [];
    this.onStatusChangeCallbacks = [];
    this.onLevelCallbacks = [];

    this._setupDeviceChangeListener();
  }

  _setupDeviceChangeListener() {
    if (navigator.mediaDevices && navigator.mediaDevices.ondevicechange !== undefined) {
      navigator.mediaDevices.addEventListener('devicechange', async () => {
        const devices = await this.getAudioDevices();
        this.onDeviceChangeCallbacks.forEach((cb) => cb(devices));
        
        // Re-evaluate current selected device connectivity
        if (this.selectedDeviceId) {
          const exists = devices.some((d) => d.deviceId === this.selectedDeviceId);
          if (!exists) {
            this._notifyStatus(false, 'MICROPHONE DISCONNECTED');
          } else if (!this.microphoneStream || !this.microphoneStream.active) {
            await this.selectDevice(this.selectedDeviceId);
          }
        }
      });
    }
  }

  async getAudioDevices() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        throw new Error('MediaDevices API unavailable');
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');
      return audioInputs.map((d) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone (${d.deviceId.slice(0, 5)}...)`,
        isDJI: /dji/i.test(d.label)
      }));
    } catch (err) {
      console.error('[AudioEngine] Error enumerating devices:', err);
      return [];
    }
  }

  autoSelectDJIMic(devices) {
    const djiDevice = devices.find((d) => /dji/i.test(d.label));
    if (djiDevice) return djiDevice.deviceId;
    if (devices.length > 0) return devices[0].deviceId;
    return null;
  }

  async selectDevice(deviceId) {
    this.stopStream();

    const constraints = {
      audio: deviceId ? { deviceId: { exact: deviceId } } : true
    };

    try {
      this.microphoneStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.selectedDeviceId = deviceId;
      this.isMuted = false;

      this._initAudioContext();
      this._notifyStatus(true, 'MICROPHONE CONNECTED');
      this._startRmsAnalysis();

      const track = this.microphoneStream.getAudioTracks()[0];
      const settings = track ? track.getSettings() : {};
      
      return {
        success: true,
        label: track ? track.label : 'Microphone',
        deviceId: this.selectedDeviceId,
        sampleRate: settings.sampleRate || 48000,
        channelCount: settings.channelCount || 1
      };
    } catch (err) {
      console.error('[AudioEngine] Error accessing microphone device:', err);
      this._notifyStatus(false, 'MICROPHONE DISCONNECTED');
      return {
        success: false,
        error: err.name || 'MicrophoneAccessDenied'
      };
    }
  }

  _initAudioContext() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.5;

    this.sourceNode = this.audioContext.createMediaStreamSource(this.microphoneStream);
    this.sourceNode.connect(this.analyser);
  }

  _startRmsAnalysis() {
    if (this.vuAnimationHandle) cancelAnimationFrame(this.vuAnimationHandle);

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const updateLevel = () => {
      if (!this.analyser || !this.microphoneStream || !this.microphoneStream.active || this.isMuted) {
        this.onLevelCallbacks.forEach((cb) => cb(0, 0));
        this.vuAnimationHandle = requestAnimationFrame(updateLevel);
        return;
      }

      this.analyser.getByteTimeDomainData(dataArray);

      // Compute Root Mean Square (RMS) from real time-domain audio samples
      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128; // -1.0 to 1.0
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);
      const levelPercent = Math.min(100, Math.round(rms * 100 * 4)); // scaled for UI responsiveness

      this.onLevelCallbacks.forEach((cb) => cb(levelPercent, rms));
      this.vuAnimationHandle = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  }

  setMute(muted) {
    this.isMuted = Boolean(muted);
    if (this.microphoneStream) {
      this.microphoneStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMuted;
      });
    }
    return this.isMuted;
  }

  toggleMute() {
    return this.setMute(!this.isMuted);
  }

  async testMicrophone(durationSec = 3, onProgress) {
    if (!this.microphoneStream || !this.microphoneStream.active) {
      return { success: false, reason: 'No active stream' };
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      let maxRms = 0;
      let sampleCount = 0;
      let totalRms = 0;

      const levelListener = (levelPercent, rms) => {
        const elapsed = (Date.now() - startTime) / 1000;
        if (rms > maxRms) maxRms = rms;
        totalRms += rms;
        sampleCount++;

        if (typeof onProgress === 'function') {
          onProgress(Math.min(1, elapsed / durationSec), levelPercent);
        }

        if (elapsed >= durationSec) {
          const index = this.onLevelCallbacks.indexOf(levelListener);
          if (index !== -1) this.onLevelCallbacks.splice(index, 1);
          
          const avgRms = sampleCount > 0 ? totalRms / sampleCount : 0;
          resolve({
            success: true,
            maxRms: Number(maxRms.toFixed(4)),
            avgRms: Number(avgRms.toFixed(4)),
            passed: maxRms > 0.005 // verified audio activity
          });
        }
      };

      this.onLevelCallbacks.push(levelListener);
    });
  }

  stopStream() {
    if (this.vuAnimationHandle) {
      cancelAnimationFrame(this.vuAnimationHandle);
      this.vuAnimationHandle = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach((t) => t.stop());
      this.microphoneStream = null;
    }
  }

  onDeviceChange(callback) {
    if (typeof callback === 'function') this.onDeviceChangeCallbacks.push(callback);
  }

  onStatusChange(callback) {
    if (typeof callback === 'function') this.onStatusChangeCallbacks.push(callback);
  }

  onAudioLevel(callback) {
    if (typeof callback === 'function') this.onLevelCallbacks.push(callback);
  }

  _notifyStatus(isConnected, labelText) {
    this.onStatusChangeCallbacks.forEach((cb) => cb(isConnected, labelText));
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioEngine;
}
