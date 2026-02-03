// Device Fingerprinting Utility
// Generates a unique fingerprint for each browser/device

export function generateDeviceFingerprint() {
  try {
    const components = [];

    // Screen properties
    components.push(window.screen.width);
    components.push(window.screen.height);
    components.push(window.screen.colorDepth);

    // Timezone
    components.push(new Date().getTimezoneOffset());

    // Browser properties
    components.push(navigator.userAgent);
    components.push(navigator.language);
    components.push(navigator.platform);
    components.push(navigator.hardwareConcurrency || 0);
    components.push(navigator.deviceMemory || 0);

    // Canvas fingerprint
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(0, 0, 140, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('TheLife🎮', 2, 2);
      components.push(canvas.toDataURL());
    }

    // WebGL fingerprint
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
        components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
      }
    }

    // Generate hash
    const fingerprint = simpleHash(components.join('|||'));
    return fingerprint;
  } catch (error) {
    console.error('Error generating fingerprint:', error);
    return 'unknown';
  }
}

// Simple hash function
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Get IP address (client-side approximation, real IP should come from server)
export async function getClientIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    return null;
  }
}

// Session management
let currentSessionId = null;

export function getSessionId() {
  if (!currentSessionId) {
    currentSessionId = sessionStorage.getItem('thelife_session_id');
    if (!currentSessionId) {
      currentSessionId = crypto.randomUUID();
      sessionStorage.setItem('thelife_session_id', currentSessionId);
    }
  }
  return currentSessionId;
}

export function getUserAgent() {
  return navigator.userAgent;
}

// Collect all context for logging
export async function getActionContext() {
  return {
    deviceFingerprint: generateDeviceFingerprint(),
    sessionId: getSessionId(),
    userAgent: getUserAgent(),
    ipAddress: await getClientIP()
  };
}
