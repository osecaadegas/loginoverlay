/**
 * Client-Side Security Hardening Module
 * Implements honeypots, request signing, anti-replay, and tampering detection
 * 
 * This module makes it harder (not impossible) for cheaters to manipulate the client.
 * Remember: Never trust the client. All critical validation MUST be server-side.
 */

import { supabase } from '../config/supabaseClient';
import CryptoJS from 'crypto-js';

// Secret key for request signing (stored in env, rotated periodically)
const REQUEST_SIGNING_KEY = import.meta.env.VITE_REQUEST_SIGNING_KEY || 'your-secret-key-change-this';

// Nonce storage for anti-replay
const usedNonces = new Set();
const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

class SecurityHardening {
  constructor() {
    this.honeypots = new Map();
    this.sealed = false;
    this.devToolsOpen = false;
    this.tamperedVariables = new Set();
    
    this.init();
  }

  /**
   * Initialize security measures
   */
  init() {
    this.setupHoneypots();
    this.sealCriticalObjects();
    this.detectDevTools();
    this.preventCommonTampering();
    this.setupIntegrityChecks();
  }

  /**
   * HONEYPOT SYSTEM
   * Fake variables that cheaters might try to manipulate
   * Accessing these triggers alerts
   */
  setupHoneypots() {
    // Honeypot 1: Fake admin flag
    Object.defineProperty(window, '__isAdmin', {
      get: () => {
        this.triggerHoneypot('__isAdmin');
        return false;
      },
      set: (value) => {
        this.triggerHoneypot('__isAdmin', { attemptedValue: value });
        return false;
      },
      configurable: false
    });

    // Honeypot 2: Fake debug mode
    Object.defineProperty(window, 'debugMode', {
      get: () => {
        this.triggerHoneypot('debugMode');
        return false;
      },
      set: (value) => {
        this.triggerHoneypot('debugMode', { attemptedValue: value });
      },
      configurable: false
    });

    // Honeypot 3: Fake god mode
    Object.defineProperty(window, '__godMode', {
      get: () => {
        this.triggerHoneypot('__godMode');
        return false;
      },
      set: (value) => {
        this.triggerHoneypot('__godMode', { attemptedValue: value });
      },
      configurable: false
    });

    // Honeypot 4: Fake unlock all features
    Object.defineProperty(window, '__unlockAll', {
      get: () => {
        this.triggerHoneypot('__unlockAll');
        return () => this.triggerHoneypot('__unlockAll_called');
      },
      configurable: false
    });

    // Honeypot 5: Fake cheat object
    window.__cheat = new Proxy({}, {
      get: (target, prop) => {
        this.triggerHoneypot('__cheat', { property: prop.toString() });
        return undefined;
      },
      set: (target, prop, value) => {
        this.triggerHoneypot('__cheat', { property: prop.toString(), value });
        return false;
      }
    });

    // Honeypot 6: Fake game state manipulation
    Object.defineProperty(window, '__gameState', {
      get: () => {
        this.triggerHoneypot('__gameState');
        return new Proxy({}, {
          get: (target, prop) => {
            this.triggerHoneypot('__gameState', { property: prop.toString() });
            return undefined;
          }
        });
      },
      configurable: false
    });

    console.log('[Security] Honeypots deployed');
  }

  /**
   * Seal critical objects to prevent tampering
   */
  sealCriticalObjects() {
    // Seal built-in objects that cheaters often override
    if (typeof Object.seal === 'function') {
      try {
        Object.seal(Object.prototype);
        Object.seal(Array.prototype);
        Object.seal(Function.prototype);
      } catch (e) {
        // Already sealed or restricted
      }
    }

    // Freeze Math.random (prevent override)
    const originalRandom = Math.random;
    Object.defineProperty(Math, 'random', {
      value: originalRandom,
      writable: false,
      configurable: false
    });

    // Freeze Date.now (prevent time manipulation)
    const originalNow = Date.now;
    Object.defineProperty(Date, 'now', {
      value: originalNow,
      writable: false,
      configurable: false
    });

    this.sealed = true;
    console.log('[Security] Critical objects sealed');
  }

  /**
   * Detect if DevTools is open
   */
  detectDevTools() {
    // Method 1: Console detection
    let devtoolsOpen = false;
    const element = new Image();
    
    Object.defineProperty(element, 'id', {
      get: () => {
        devtoolsOpen = true;
        this.devToolsOpen = true;
        this.reportDevTools();
        return 'devtools-detector';
      }
    });

    setInterval(() => {
      console.log(element);
      console.clear();
    }, 1000);

    // Method 2: Timing-based detection
    setInterval(() => {
      const start = performance.now();
      debugger; // This pauses if DevTools is open
      const end = performance.now();
      
      if (end - start > 100) {
        this.devToolsOpen = true;
        this.reportDevTools();
      }
    }, 5000);

    // Method 3: Window size detection
    const threshold = 160;
    setInterval(() => {
      if (
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold
      ) {
        this.devToolsOpen = true;
        this.reportDevTools();
      }
    }, 1000);
  }

  /**
   * Prevent common tampering techniques
   */
  preventCommonTampering() {
    // Prevent localStorage key injection
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      // Whitelist of allowed keys
      const allowedKeys = [
        'theme', 'language', 'volume', 'settings',
        'supabase.auth.token', 'selectedAvatar'
      ];

      if (!allowedKeys.some(k => key.startsWith(k))) {
        console.warn(`[Security] Blocked unauthorized localStorage key: ${key}`);
        securityHardening.reportTampering('localStorage_injection', { key, value });
        return;
      }

      return originalSetItem.call(this, key, value);
    };

    // Prevent eval() usage
    window.eval = function() {
      securityHardening.reportTampering('eval_usage', { blocked: true });
      throw new Error('eval() is disabled for security');
    };

    // Prevent Function constructor
    const OriginalFunction = Function;
    window.Function = function() {
      securityHardening.reportTampering('function_constructor', { blocked: true });
      throw new Error('Function constructor is disabled for security');
    };
  }

  /**
   * Setup integrity checks for critical game state
   */
  setupIntegrityChecks() {
    // Check for Tampermonkey or other userscript managers
    if (
      typeof GM !== 'undefined' ||
      typeof GM_info !== 'undefined' ||
      typeof unsafeWindow !== 'undefined'
    ) {
      this.reportTampering('userscript_detected', {
        gmDetected: typeof GM !== 'undefined',
        tampermonkey: typeof GM_info !== 'undefined'
      });
    }

    // Check for Selenium/WebDriver (automation)
    if (
      navigator.webdriver ||
      window.document.documentElement.getAttribute('webdriver') === 'true'
    ) {
      this.reportTampering('automation_detected', {
        webdriver: navigator.webdriver
      });
    }

    // Check for headless browser
    if (
      navigator.userAgent.includes('HeadlessChrome') ||
      navigator.userAgent.includes('PhantomJS')
    ) {
      this.reportTampering('headless_browser', {
        userAgent: navigator.userAgent
      });
    }
  }

  /**
   * Honeypot triggered - report to server
   */
  async triggerHoneypot(honeypotName, metadata = {}) {
    console.error(`[Security] HONEYPOT TRIGGERED: ${honeypotName}`);
    
    this.tamperedVariables.add(honeypotName);

    // Report to server
    try {
      await supabase.from('security_alerts').insert({
        alert_type: 'honeypot_triggered',
        severity: 'critical',
        description: `Honeypot variable accessed: ${honeypotName}`,
        evidence: {
          honeypotName,
          metadata,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        },
        requires_review: true
      });
    } catch (error) {
      console.error('Failed to report honeypot trigger:', error);
    }
  }

  /**
   * Report DevTools detection
   */
  async reportDevTools() {
    if (this.devToolsReported) return;
    this.devToolsReported = true;

    try {
      await supabase.from('security_alerts').insert({
        alert_type: 'devtools_detected',
        severity: 'medium',
        description: 'Browser DevTools detected',
        evidence: {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          windowSize: `${window.innerWidth}x${window.innerHeight}`
        },
        requires_review: false
      });
    } catch (error) {
      console.error('Failed to report DevTools:', error);
    }
  }

  /**
   * Report tampering attempt
   */
  async reportTampering(tamperingType, metadata = {}) {
    try {
      await supabase.from('security_alerts').insert({
        alert_type: 'tampering_detected',
        severity: 'high',
        description: `Client tampering detected: ${tamperingType}`,
        evidence: {
          tamperingType,
          metadata,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        },
        requires_review: true
      });
    } catch (error) {
      console.error('Failed to report tampering:', error);
    }
  }

  /**
   * Generate request nonce (one-time token for anti-replay)
   */
  generateNonce() {
    const nonce = CryptoJS.lib.WordArray.random(16).toString();
    const timestamp = Date.now();
    
    // Store nonce with expiry
    usedNonces.add(nonce);
    setTimeout(() => usedNonces.delete(nonce), NONCE_EXPIRY_MS);
    
    return { nonce, timestamp };
  }

  /**
   * Validate nonce (prevent replay attacks)
   */
  validateNonce(nonce, timestamp) {
    // Check if nonce was already used
    if (usedNonces.has(nonce)) {
      this.reportTampering('replay_attack', { nonce });
      return false;
    }

    // Check if nonce is expired
    const age = Date.now() - timestamp;
    if (age > NONCE_EXPIRY_MS) {
      this.reportTampering('expired_nonce', { age });
      return false;
    }

    // Check for clock drift (client time vs server time)
    if (Math.abs(age) > 30000) { // 30 seconds tolerance
      this.reportTampering('clock_drift', { drift: age });
      return false;
    }

    return true;
  }

  /**
   * Sign API request with HMAC
   */
  signRequest(method, endpoint, body = {}, nonce, timestamp) {
    const payload = JSON.stringify({
      method,
      endpoint,
      body,
      nonce,
      timestamp
    });

    const signature = CryptoJS.HmacSHA256(payload, REQUEST_SIGNING_KEY).toString();
    
    return {
      'X-Request-Signature': signature,
      'X-Request-Nonce': nonce,
      'X-Request-Timestamp': timestamp.toString(),
      'X-Client-Timestamp': Date.now().toString()
    };
  }

  /**
   * Create a secure API request
   */
  async secureRequest(method, endpoint, body = {}) {
    const { nonce, timestamp } = this.generateNonce();
    const headers = this.signRequest(method, endpoint, body, nonce, timestamp);

    // Add device fingerprint
    const fingerprint = await this.getDeviceFingerprint();
    headers['X-Device-Fingerprint'] = fingerprint;

    // Add any honeypot triggers
    if (this.tamperedVariables.size > 0) {
      headers['X-Tampering-Detected'] = Array.from(this.tamperedVariables).join(',');
    }

    return {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: method !== 'GET' ? JSON.stringify(body) : undefined
    };
  }

  /**
   * Get device fingerprint
   */
  async getDeviceFingerprint() {
    // Combine multiple browser characteristics
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 'unknown',
      navigator.deviceMemory || 'unknown'
    ];

    // Canvas fingerprinting
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('fingerprint', 2, 2);
      components.push(canvas.toDataURL());
    } catch (e) {
      // Canvas blocked
    }

    // WebGL fingerprinting
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
      components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
    } catch (e) {
      // WebGL blocked
    }

    const fingerprint = CryptoJS.SHA256(components.join('|')).toString();
    return fingerprint;
  }

  /**
   * Check if request has valid signature (server-side verification)
   */
  static verifyRequestSignature(req, secret) {
    const signature = req.headers['x-request-signature'];
    const nonce = req.headers['x-request-nonce'];
    const timestamp = parseInt(req.headers['x-request-timestamp']);

    if (!signature || !nonce || !timestamp) {
      return { valid: false, reason: 'Missing signature headers' };
    }

    // Verify timestamp (prevent replay)
    const age = Date.now() - timestamp;
    if (age > 5 * 60 * 1000) {
      return { valid: false, reason: 'Request expired' };
    }

    // Recompute signature
    const payload = JSON.stringify({
      method: req.method,
      endpoint: req.url,
      body: req.body || {},
      nonce,
      timestamp
    });

    const expectedSignature = CryptoJS.HmacSHA256(payload, secret).toString();

    if (signature !== expectedSignature) {
      return { valid: false, reason: 'Invalid signature' };
    }

    return { valid: true };
  }
}

// Create singleton instance
const securityHardening = new SecurityHardening();

// Wrapper for game actions
export async function secureGameAction(actionType, actionData) {
  // Create secure request
  const requestConfig = await securityHardening.secureRequest(
    'POST',
    '/api/game-action',
    { actionType, actionData }
  );

  // Send request
  const response = await fetch('/api/game-action', requestConfig);
  
  if (!response.ok) {
    throw new Error(`Action failed: ${response.statusText}`);
  }

  return response.json();
}

// Export for use in game
export { securityHardening };

// Prevent tampering with this module
Object.freeze(securityHardening);

console.log('[Security] Client hardening initialized');
