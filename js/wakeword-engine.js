/* ==========================================================================
   NEXUS VOICE DESKTOP — WAKE WORD ENGINE
   Decoupled Wake Word Detector ("Nexus")
   ========================================================================== */

class WakeWordEngine {
  constructor(wakeWord = 'Nexus', enabled = true) {
    this.wakeWord = wakeWord.trim();
    this.enabled = Boolean(enabled);
    this.onDetectedCallbacks = [];
  }

  setWakeWord(word) {
    if (typeof word === 'string' && word.trim().length > 0) {
      this.wakeWord = word.trim();
    }
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  onWakeWordDetected(callback) {
    if (typeof callback === 'function') {
      this.onDetectedCallbacks.push(callback);
    }
  }

  processTranscript(rawTranscript) {
    if (!rawTranscript || typeof rawTranscript !== 'string') {
      return { detected: false, payloadText: '' };
    }

    if (!this.enabled) {
      // If wake word is disabled, all speech is treated as active command
      return {
        detected: true,
        payloadText: rawTranscript.trim()
      };
    }

    // Build case-insensitive regex for the wake word at the start or embedded in phrase
    const escapedWord = this.wakeWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(?:^|\\b)${escapedWord}(?:\\b|,|\\.|\\!|\\?|\\s)*(.*)$`, 'i');
    
    const match = rawTranscript.match(pattern);

    if (match) {
      const payloadText = match[1] ? match[1].trim() : '';
      const result = {
        detected: true,
        wakeWordMatched: this.wakeWord,
        payloadText: payloadText,
        fullTranscript: rawTranscript
      };

      this.onDetectedCallbacks.forEach((cb) => cb(result));
      return result;
    }

    return {
      detected: false,
      payloadText: ''
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WakeWordEngine;
}
