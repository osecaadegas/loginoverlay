// Session Tracker Utility
// Automatically tracks player sessions for anti-cheat

import { supabase } from '../config/supabaseClient';
import { generateDeviceFingerprint, getSessionId, getUserAgent } from './deviceFingerprint';

let sessionTracker = null;

export class SessionTracker {
  constructor(userId, playerId) {
    this.userId = userId;
    this.playerId = playerId;
    this.sessionId = getSessionId();
    this.deviceFingerprint = generateDeviceFingerprint();
    this.isActive = false;
    this.heartbeatInterval = null;
  }

  async start() {
    if (this.isActive) return;

    try {
      // Get IP from server (more reliable than client-side) - non-blocking
      let ipAddress = null;
      try {
        const ipResponse = await fetch('/api/get-client-ip', { 
          signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          ipAddress = ipData.ip || null;
        }
      } catch (ipError) {
        console.warn('Failed to fetch IP (non-critical):', ipError);
        ipAddress = null; // Continue without IP
      }

      // Create session record
      const { data: session, error } = await supabase
        .from('player_sessions')
        .insert({
          id: this.sessionId,
          player_id: this.playerId,
          ip_address: ipAddress,
          user_agent: getUserAgent(),
          device_fingerprint: this.deviceFingerprint,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create session:', error);
        return;
      }

      this.isActive = true;

      // Start heartbeat to update last_activity_at
      this.heartbeatInterval = setInterval(() => {
        this.heartbeat();
      }, 60000); // Every minute

      // Listen for page unload
      window.addEventListener('beforeunload', () => this.end());
      window.addEventListener('pagehide', () => this.end());

    } catch (error) {
      console.error('SessionTracker.start error:', error);
    }
  }

  async heartbeat() {
    if (!this.isActive) return;

    try {
      await supabase
        .from('player_sessions')
        .update({ 
          last_activity_at: new Date().toISOString(),
          is_active: true
        })
        .eq('id', this.sessionId);
    } catch (error) {
      console.error('SessionTracker.heartbeat error:', error);
    }
  }

  async end() {
    if (!this.isActive) return;

    try {
      // Mark session as ended
      await supabase
        .from('player_sessions')
        .update({ 
          ended_at: new Date().toISOString(),
          is_active: false
        })
        .eq('id', this.sessionId);

      this.isActive = false;

      // Clear heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    } catch (error) {
      console.error('SessionTracker.end error:', error);
    }
  }

  async flagSuspicious(reason) {
    try {
      await supabase
        .from('player_sessions')
        .update({ 
          is_suspicious: true,
          suspicious_reason: reason
        })
        .eq('id', this.sessionId);
    } catch (error) {
      console.error('SessionTracker.flagSuspicious error:', error);
    }
  }
}

// Initialize session tracker
export function initSessionTracker(userId, playerId) {
  if (sessionTracker) {
    sessionTracker.end();
  }
  
  sessionTracker = new SessionTracker(userId, playerId);
  sessionTracker.start();
  
  return sessionTracker;
}

export function getSessionTracker() {
  return sessionTracker;
}

export function endSession() {
  if (sessionTracker) {
    sessionTracker.end();
    sessionTracker = null;
  }
}
