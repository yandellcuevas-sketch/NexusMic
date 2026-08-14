/* ==========================================================================
   NEXUS VOICE DESKTOP — SPEECH RECOGNITION ENGINE (STT)
   Abstract Architecture: SpeechRecognitionEngine
   Implementations: WebSpeechEngine (Chromium Web Speech API) & LocalSpeechEngine (Stub)
   ========================================================================== */

class SpeechRecognitionEngine {
  constructor() {
    this.language = 'es-ES';
    this.onResultCallbacks = [];
    this.onErrorCallbacks = [];
    this.onStateChangeCallbacks = [];
  }

  async init() {
    throw new Error('SpeechRecognitionEngine.init() must be implemented by subclass');
  }

  start() {
    throw new Error('SpeechRecognitionEngine.start() must be implemented by subclass');
  }

  stop() {
    throw new Error('SpeechRecognitionEngine.stop() must be implemented by subclass');
  }

  isAvailable() {
    return false;
  }

  isOffline() {
    return false;
  }

  setLanguage(lang) {
    this.language = lang || 'es-ES';
  }

  onResult(callback) {
    if (typeof callback === 'function') this.onResultCallbacks.push(callback);
  }

  onError(callback) {
    if (typeof callback === 'function') this.onErrorCallbacks.push(callback);
  }

  onStateChange(callback) {
    if (typeof callback === 'function') this.onStateChangeCallbacks.push(callback);
  }

  _notifyResult(transcript, isFinal) {
    this.onResultCallbacks.forEach((cb) => cb(transcript, isFinal));
  }

  _notifyError(error) {
    this.onErrorCallbacks.forEach((cb) => cb(error));
  }

  _notifyState(state) {
    this.onStateChangeCallbacks.forEach((cb) => cb(state));
  }
}

class WebSpeechEngine extends SpeechRecognitionEngine {
  constructor() {
    super();
    this.recognition = null;
    this.isListening = false;
    this.hasAvailability = false;
    this._checkAvailability();
  }

  _checkAvailability() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.hasAvailability = Boolean(SpeechRecognition);
    } else {
      this.hasAvailability = false;
    }
  }

  isAvailable() {
    return this.hasAvailability;
  }

  isOffline() {
    // Chromium Web Speech API uses remote cloud recognition endpoints
    return false;
  }

  async init() {
    this._checkAvailability();
    if (!this.hasAvailability) {
      this._notifyError({ code: 'STT_UNAVAILABLE', message: 'WebSpeech API is unavailable in this environment' });
      return false;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.language;

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptText = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptText;
        } else {
          interimTranscript += transcriptText;
        }
      }

      if (finalTranscript) {
        this._notifyResult(finalTranscript.trim(), true);
      } else if (interimTranscript) {
        this._notifyResult(interimTranscript.trim(), false);
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('[WebSpeechEngine] Recognition error:', event.error);
      this._notifyError({ code: event.error || 'STT_ERROR', message: event.message || 'Speech recognition error' });
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        // Automatically restart continuous recognition if active
        try {
          this.recognition.start();
        } catch (e) {
          this.isListening = false;
          this._notifyState('IDLE');
        }
      } else {
        this._notifyState('IDLE');
      }
    };

    return true;
  }

  start() {
    if (!this.hasAvailability || !this.recognition) {
      this._notifyError({ code: 'STT_UNAVAILABLE', message: 'WebSpeech API not initialized or supported' });
      return false;
    }

    try {
      this.isListening = true;
      this.recognition.lang = this.language;
      this.recognition.start();
      this._notifyState('LISTENING');
      return true;
    } catch (err) {
      if (err.name !== 'InvalidStateError') {
        console.error('[WebSpeechEngine] Start error:', err);
      }
      return false;
    }
  }

  stop() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        // Ignore stop errors if already stopped
      }
    }
    this._notifyState('IDLE');
  }
}

class LocalSpeechEngine extends SpeechRecognitionEngine {
  constructor() {
    super();
    this.isModelLoaded = false;
  }

  isAvailable() {
    // Stub ready for local offline Whisper/Vosk integration
    return this.isModelLoaded;
  }

  isOffline() {
    return true;
  }

  async init() {
    console.log('[LocalSpeechEngine] Stub initialized. Ready for local model bindings.');
    return false;
  }

  start() {
    this._notifyError({ code: 'LOCAL_STT_NOT_IMPLEMENTED', message: 'Local Speech Engine is reserved for future Whisper/Vosk bindings' });
    return false;
  }

  stop() {
    this._notifyState('IDLE');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SpeechRecognitionEngine,
    WebSpeechEngine,
    LocalSpeechEngine
  };
}
