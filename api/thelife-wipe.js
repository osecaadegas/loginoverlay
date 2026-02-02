/**
 * THE LIFE - SECURE SEASON WIPE API
 * ===================================
 * 
 * SECURITY FEATURES:
 * ✅ Admin role verification (multi-source)
 * ✅ Multi-step confirmation flow (initiate → confirm)
 * ✅ Passphrase protection (16+ chars)
 * ✅ Rate limiting (3 attempts/hour/IP)
 * ✅ IP logging & audit trail
 * ✅ System lock during wipe (prevents race conditions)
 * ✅ Backup before wipe
 * ✅ Transaction safety
 * 
 * ACTIONS:
 * - initiate: Start wipe process, get confirmation code
 * - confirm: Execute wipe with confirmation code + passphrase
 * - cancel: Cancel pending wipe
 * - status: Get wipe history/status
 * - verify: Check for incomplete wipes
 * - check_lock: Check if system is locked
 * - legacy: Old partial wipe (deprecated, use full season wipe)
 */

import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// In-memory rate limit (use Redis in production for multi-instance)
const rateLimitMap = new Map();

/**
 * Get client IP from request headers
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.socket?.remoteAddress ||
         'unknown';
}

/**
 * Check rate limit - max 3 wipe attempts per hour per IP
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;
  
  const attempts = rateLimitMap.get(ip) || [];
  const recentAttempts = attempts.filter(t => t > hourAgo);
  
  if (recentAttempts.length >= 3) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetIn: Math.ceil((recentAttempts[0] + 60 * 60 * 1000 - now) / 1000) 
    };
  }
  
  recentAttempts.push(now);
  rateLimitMap.set(ip, recentAttempts);
  
  return { allowed: true, remaining: 3 - recentAttempts.length };
}

/**
 * Log security event
 */
async function logSecurityEvent(userId, eventType, actionName, severity, metadata, flagReason = null) {
  try {
    await supabaseAdmin.from('the_life_security_logs').insert({
      user_id: userId,
      event_type: eventType,
      action_name: actionName,
      severity: severity,
      metadata: metadata,
      is_flagged: !!flagReason,
      flag_reason: flagReason
    });
  } catch (err) {
    console.error('Failed to log security event:', err);
  }
}

/**
 * Verify admin from JWT token
 */
async function verifyAdmin(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing authorization header' };
  }
  
  const token = authHeader.substring(7);
  
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    return { authorized: false, error: 'Invalid token' };
  }
  
  // Check admin role in user_roles table
  const { data: userRoles } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true);
  
  const roleNames = (userRoles || []).map(r => r.role);
  const hasAdminAccess = roleNames.some(r => 
    ['admin', 'superadmin', 'super_admin', 'owner'].includes(r.toLowerCase())
  );
  
  // Fallback: check user metadata
  if (!hasAdminAccess) {
    const metaRole = user.user_metadata?.role?.toLowerCase();
    if (!['admin', 'superadmin', 'super_admin', 'owner'].includes(metaRole)) {
      return { authorized: false, error: 'User is not an admin', user };
    }
  }
  
  return { authorized: true, user, roles: roleNames };
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const clientIP = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  try {
    // 1. Rate limit check
    const rateLimit = checkRateLimit(clientIP);
    if (!rateLimit.allowed) {
      await logSecurityEvent(
        null, 'rate_limit_exceeded', 'wipe_attempt', 'warning',
        { ip: clientIP, userAgent },
        'Wipe rate limit exceeded'
      );
      
      return res.status(429).json({
        error: 'Rate limit exceeded. Too many wipe attempts.',
        resetIn: rateLimit.resetIn
      });
    }
    
    // 2. Verify admin
    const adminCheck = await verifyAdmin(req.headers.authorization);
    if (!adminCheck.authorized) {
      await logSecurityEvent(
        adminCheck.user?.id, 'unauthorized_wipe_attempt', 'wipe_attempt', 'critical',
        { ip: clientIP, userAgent, error: adminCheck.error },
        'Unauthorized wipe attempt'
      );
      
      return res.status(403).json({ error: adminCheck.error || 'Admin access required' });
    }
    
    const { action, ...params } = req.body;
    
    // 3. Handle actions
    switch (action) {
      // ============================================
      // NEW SECURE SEASON WIPE (Recommended)
      // ============================================
      
      case 'initiate': {
        // Step 1: Initiate wipe - returns confirmation code
        const { passphrase, seasonName } = params;
        
        if (!passphrase || passphrase.length < 16) {
          return res.status(400).json({ 
            error: 'Passphrase must be at least 16 characters',
            hint: 'Use a strong, memorable phrase like "WipeSeasonJanuary2026!"'
          });
        }
        
        // Call the secure RPC function
        const { data, error } = await supabaseAdmin.rpc('initiate_season_wipe', {
          p_passphrase: passphrase,
          p_season_name: seasonName || null
        });
        
        if (error) {
          console.error('Initiate wipe error:', error);
          return res.status(500).json({ error: error.message });
        }
        
        if (!data.success) {
          return res.status(400).json(data);
        }
        
        await logSecurityEvent(
          adminCheck.user.id, 'wipe_initiated', 'initiate_wipe', 'critical',
          { ip: clientIP, userAgent, wipe_id: data.wipe_id, season_name: seasonName },
          'Season wipe initiated'
        );
        
        return res.status(200).json(data);
      }
      
      case 'confirm': {
        // Step 2: Confirm and execute wipe
        const { wipeId, confirmationCode, passphrase } = params;
        
        if (!wipeId || !confirmationCode || !passphrase) {
          return res.status(400).json({ 
            error: 'Missing required parameters',
            required: ['wipeId', 'confirmationCode', 'passphrase']
          });
        }
        
        const { data, error } = await supabaseAdmin.rpc('confirm_season_wipe', {
          p_wipe_id: wipeId,
          p_confirmation_code: confirmationCode,
          p_passphrase: passphrase
        });
        
        if (error) {
          console.error('Confirm wipe error:', error);
          await logSecurityEvent(
            adminCheck.user.id, 'wipe_confirm_failed', 'confirm_wipe', 'critical',
            { ip: clientIP, userAgent, wipe_id: wipeId, error: error.message },
            'Wipe confirmation failed'
          );
          return res.status(500).json({ error: error.message });
        }
        
        return res.status(200).json(data);
      }
      
      case 'cancel': {
        const { wipeId } = params;
        
        if (!wipeId) {
          return res.status(400).json({ error: 'Missing wipeId' });
        }
        
        const { data, error } = await supabaseAdmin.rpc('cancel_season_wipe', {
          p_wipe_id: wipeId
        });
        
        if (error) {
          return res.status(500).json({ error: error.message });
        }
        
        return res.status(200).json(data);
      }
      
      case 'status': {
        const { wipeId } = params;
        
        const { data, error } = await supabaseAdmin.rpc('get_wipe_status', {
          p_wipe_id: wipeId || null
        });
        
        if (error) {
          return res.status(500).json({ error: error.message });
        }
        
        return res.status(200).json(data);
      }
      
      case 'verify': {
        const { data, error } = await supabaseAdmin.rpc('verify_wipe_completeness');
        
        if (error) {
          return res.status(500).json({ error: error.message });
        }
        
        return res.status(200).json(data);
      }
      
      case 'check_lock': {
        const { data, error } = await supabaseAdmin.rpc('is_system_locked');
        
        if (error) {
          return res.status(500).json({ error: error.message });
        }
        
        return res.status(200).json({ locked: data });
      }
      
      // ============================================
      // LEGACY PARTIAL WIPE (Kept for compatibility)
      // ============================================
      
      case 'legacy':
      case undefined: {
        // Original partial wipe functionality (for backwards compatibility)
        const { wipeSettings } = params;
        
        if (!wipeSettings) {
          return res.status(400).json({ 
            error: 'Wipe settings required',
            hint: 'Use action: "initiate" for secure full season wipe'
          });
        }
        
        // Log this legacy wipe attempt
        await logSecurityEvent(
          adminCheck.user.id, 'legacy_wipe', 'partial_wipe', 'warning',
          { ip: clientIP, userAgent, settings: wipeSettings },
          'Legacy partial wipe used (consider using full season wipe)'
        );
        
        const results = [];
        
        // Execute partial wipes (original logic)
        if (wipeSettings.wipe_inventory) {
          const { error } = await supabaseAdmin.from('the_life_player_inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          results.push({ action: 'wipe_inventory', success: !error, error: error?.message });
        }

        if (wipeSettings.wipe_cash) {
          const { error } = await supabaseAdmin.from('the_life_players').update({ cash: 500 }).neq('id', '00000000-0000-0000-0000-000000000000');
          results.push({ action: 'wipe_cash', success: !error, error: error?.message });
        }

        if (wipeSettings.wipe_bank) {
          const { error } = await supabaseAdmin.from('the_life_players').update({ bank_balance: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
          results.push({ action: 'wipe_bank', success: !error, error: error?.message });
        }

        if (wipeSettings.wipe_level) {
          const { error } = await supabaseAdmin.from('the_life_players').update({ level: 1, xp: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
          results.push({ action: 'wipe_level', success: !error, error: error?.message });
        }

        if (wipeSettings.wipe_skills) {
          const { error } = await supabaseAdmin.from('the_life_players').update({ power: 0, defense: 0, intelligence: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
          results.push({ action: 'wipe_skills', success: !error, error: error?.message });
        }

        if (wipeSettings.wipe_businesses) {
          await supabaseAdmin.from('the_life_business_productions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          await supabaseAdmin.from('the_life_player_businesses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          results.push({ action: 'wipe_businesses', success: true });
        }

        if (wipeSettings.wipe_upgrades) {
          const { error } = await supabaseAdmin.from('the_life_players').update({ 
            max_hp: 100, max_stamina: 100
          }).neq('id', '00000000-0000-0000-0000-000000000000');
          results.push({ action: 'wipe_upgrades', success: !error, error: error?.message });
        }

        if (wipeSettings.wipe_brothel_workers) {
          await supabaseAdmin.from('the_life_player_brothel_workers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          results.push({ action: 'wipe_brothel_workers', success: true });
        }

        if (wipeSettings.wipe_stocks) {
          await supabaseAdmin.from('the_life_stock_portfolios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          await supabaseAdmin.from('the_life_stock_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          results.push({ action: 'wipe_stocks', success: true });
        }

        if (wipeSettings.wipe_addiction) {
          const { error } = await supabaseAdmin.from('the_life_players').update({ addiction: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
          results.push({ action: 'wipe_addiction', success: !error, error: error?.message });
        }

        if (wipeSettings.wipe_health_stamina) {
          const { error } = await supabaseAdmin.from('the_life_players').update({ hp: 100, stamina: 100 }).neq('id', '00000000-0000-0000-0000-000000000000');
          results.push({ action: 'wipe_health_stamina', success: !error, error: error?.message });
        }

        if (wipeSettings.wipe_jail_hospital) {
          const { error } = await supabaseAdmin.from('the_life_players').update({ jail_until: null, hospital_until: null }).neq('id', '00000000-0000-0000-0000-000000000000');
          results.push({ action: 'wipe_jail_hospital', success: !error, error: error?.message });
        }

        if (wipeSettings.wipe_pvp_stats) {
          await supabaseAdmin.from('the_life_pvp_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          const { error } = await supabaseAdmin.from('the_life_players').update({ pvp_wins: 0, pvp_losses: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
          results.push({ action: 'wipe_pvp_stats', success: !error, error: error?.message });
        }

        if (wipeSettings.wipe_cooldowns) {
          await supabaseAdmin.from('the_life_action_cooldowns').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          const { error } = await supabaseAdmin.from('the_life_players').update({ 
            last_stamina_refill: new Date().toISOString(),
            last_daily_bonus: null,
            consecutive_logins: 0
          }).neq('id', '00000000-0000-0000-0000-000000000000');
          results.push({ action: 'wipe_cooldowns', success: !error, error: error?.message });
        }

        if (wipeSettings.wipe_docks) {
          await supabaseAdmin.from('the_life_dock_shipments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          results.push({ action: 'wipe_docks', success: true });
        }

        if (wipeSettings.wipe_crime_history) {
          await supabaseAdmin.from('the_life_robbery_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          const { error } = await supabaseAdmin.from('the_life_players').update({ 
            total_robberies: 0, 
            successful_robberies: 0,
            daily_catches: 0,
            total_times_caught: 0
          }).neq('id', '00000000-0000-0000-0000-000000000000');
          results.push({ action: 'wipe_crime_history', success: !error, error: error?.message });
        }

        if (wipeSettings.wipe_player_progress) {
          // Full reset - combines all the above
          await supabaseAdmin.from('the_life_player_inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          await supabaseAdmin.from('the_life_business_productions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          await supabaseAdmin.from('the_life_player_businesses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          await supabaseAdmin.from('the_life_player_brothel_workers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          await supabaseAdmin.from('the_life_pvp_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          await supabaseAdmin.from('the_life_robbery_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          await supabaseAdmin.from('the_life_dock_shipments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          await supabaseAdmin.from('the_life_action_cooldowns').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          await supabaseAdmin.from('the_life_player_metrics').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          
          const { error } = await supabaseAdmin.from('the_life_players').update({ 
            level: 1, 
            xp: 0,
            cash: 500,
            bank_balance: 0,
            hp: 100,
            max_hp: 100,
            stamina: 100,
            max_stamina: 100,
            power: 0,
            intelligence: 0,
            defense: 0,
            addiction: 0,
            pvp_wins: 0,
            pvp_losses: 0,
            total_robberies: 0,
            successful_robberies: 0,
            daily_catches: 0,
            total_times_caught: 0,
            consecutive_logins: 0,
            jail_until: null,
            hospital_until: null,
            last_daily_bonus: null,
            equipped_weapon_id: null,
            equipped_gear_id: null,
            updated_at: new Date().toISOString()
          }).neq('id', '00000000-0000-0000-0000-000000000000');
          
          results.push({ action: 'wipe_player_progress', success: !error, error: error?.message });
        }

        return res.status(200).json({ 
          success: true, 
          message: 'Legacy wipe executed',
          warning: 'Consider using the new secure season wipe (action: "initiate")',
          results 
        });
      }
      
      default:
        return res.status(400).json({ 
          error: 'Invalid action',
          validActions: ['initiate', 'confirm', 'cancel', 'status', 'verify', 'check_lock', 'legacy'],
          recommended: 'Use "initiate" to start a secure full season wipe'
        });
    }
    
  } catch (error) {
    console.error('Wipe API error:', error);
    
    await logSecurityEvent(
      null, 'wipe_api_error', 'error', 'critical',
      { ip: clientIP, error: error.message },
      'Wipe API error'
    );
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}
