/* ==========================================================================
   NEXUS VOICE DESKTOP — INTENT PARSER
   Converts spoken voice transcripts into structured, validated intents.
   Strict parameter validation & sanitization against command injection.
   ========================================================================== */

class IntentParser {
  static parse(transcript) {
    if (!transcript || typeof transcript !== 'string') {
      return { intent: 'UNKNOWN_INTENT', raw: transcript, parameters: {} };
    }

    const text = transcript.trim();

    // 1. Detect command injection attempts in raw input string
    if (/[;&|><`$()]/.test(text)) {
      // Check if it's a malicious chaining attempt
      if (/(?:&|&&|\||\|\||;|\$\(|\`|<|>)/.test(text)) {
        return {
          intent: 'SECURITY_REJECTED',
          raw: text,
          reason: 'COMMAND_INJECTION_DETECTED',
          parameters: {}
        };
      }
    }

    // Sanitize string for pattern matching
    const cleanText = text.replace(/^(?:nexus|hey nexus|ok nexus|por favor)\s*[,:]?\s*/i, '').trim();

    // Intent 1: OPEN_CHROME
    if (/(?:abre|abrir|lanzar|quiero abrir)\s+(?:google\s+)?chrome/i.test(cleanText)) {
      return { intent: 'OPEN_CHROME', parameters: {} };
    }

    // Intent 2: OPEN_SHIELDPORT
    if (/(?:abre|abrir|lanzar|ejecutar)\s+shieldport/i.test(cleanText)) {
      return { intent: 'OPEN_SHIELDPORT', parameters: {} };
    }

    // Intent 3: OPEN_DOWNLOADS
    if (/(?:abre|abrir)\s+(?:la\s+carpeta\s+de\s+|mi\s+carpeta\s+de\s+)?descargas/i.test(cleanText)) {
      return { intent: 'OPEN_DOWNLOADS', parameters: {} };
    }

    // Intent 4: OPEN_EXPLORER
    if (/(?:abre|abrir)\s+(?:el\s+)?explorador/i.test(cleanText)) {
      return { intent: 'OPEN_EXPLORER', parameters: {} };
    }

    // Intent 5: SET_VOLUME
    const volumeMatch = cleanText.match(/(?:coloca|pon|sube|baja|ajusta|setea)?\s*(?:el\s+)?volumen\s*(?:en|a|al)?\s*(-?\d+)\s*(?:por\s*ciento|%)?/i) ||
                        cleanText.match(/volumen\s*(-?\d+)/i);
    if (volumeMatch) {
      const level = parseInt(volumeMatch[1], 10);
      if (isNaN(level) || level < 0 || level > 100) {
        return {
          intent: 'INVALID_PARAMETERS',
          raw: text,
          reason: 'VOLUME_OUT_OF_RANGE',
          parameters: { level }
        };
      }
      return { intent: 'SET_VOLUME', parameters: { level } };
    }

    // Intent 6: MUTE_VOLUME
    if (/(?:silencia|silenciar|mutear|mute)\s+(?:el\s+)?volumen/i.test(cleanText) || /^mute$/i.test(cleanText)) {
      return { intent: 'MUTE_VOLUME', parameters: {} };
    }

    // Intent 7: GET_DISK_SPACE
    const diskMatch = cleanText.match(/(?:cu[áa]nto\s+espacio\s+(?:queda|libre|hay)\s+en|espacio\s+(?:libre|en\s+disco))\s+([a-z])/i);
    if (diskMatch) {
      const drive = diskMatch[1].toUpperCase();
      return { intent: 'GET_DISK_SPACE', parameters: { drive } };
    }

    // Intent 8: LIST_USB_DRIVES
    if (/(?:qu[ée]\s+memorias\s+usb|dispositivos\s+usb|listar\s+usb|usb[s]?\s+conectad[oa]s)/i.test(cleanText)) {
      return { intent: 'LIST_USB_DRIVES', parameters: {} };
    }

    // Intent 9: CREATE_NOTE
    const noteMatch = cleanText.match(/(?:crea|crear|haz|hacer)\s+(?:una\s+)?nota\s+(?:que\s+diga|de|con)?\s+(.+)/i);
    if (noteMatch) {
      const noteContent = noteMatch[1].trim().replace(/[;&|><`$()]/g, ''); // Strip dangerous shell characters
      return { intent: 'CREATE_NOTE', parameters: { content: noteContent } };
    }

    return { intent: 'UNKNOWN_INTENT', raw: text, parameters: {} };
  }
}

module.exports = IntentParser;
