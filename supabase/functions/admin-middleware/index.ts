/**
 * ADMIN RBAC MIDDLEWARE
 * Role-Based Access Control for Player Management System
 * 
 * This Edge Function provides reusable middleware for:
 * - Authenticating admin users
 * - Checking role levels
 * - Validating permissions
 * - Enforcing quotas
 * - Logging actions
 * - Dual-confirmation for destructive actions
 * 
 * USAGE:
 * Import this in any admin Edge Function and use the middleware stack
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role
export function getSupabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// =====================================================
// ROLE & PERMISSION CHECKS
// =====================================================

/**
 * Get admin's role level
 * Returns: 0 (not admin), 25 (support), 50 (moderator), 75 (admin), 100 (owner)
 */
export async function getAdminRoleLevel(supabase, userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_admin_role_level', {
    user_id: userId
  });

  if (error) {
    console.error('Error getting role level:', error);
    return 0;
  }

  return data || 0;
}

/**
 * Check if admin has specific permission
 */
export async function hasPermission(
  supabase,
  userId: string,
  permissionName: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_admin_permission', {
    user_id: userId,
    permission_name: permissionName
  });

  if (error) {
    console.error('Error checking permission:', error);
    return false;
  }

  return data === true;
}

/**
 * Check if action requires dual-confirmation
 */
export async function requiresConfirmation(
  supabase,
  permissionName: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('action_requires_confirmation', {
    permission_name: permissionName
  });

  return data === true;
}

// =====================================================
// AUTHENTICATION MIDDLEWARE
// =====================================================

export interface AdminContext {
  userId: string;
  username: string;
  role: string;
  roleLevel: number;
  ipAddress: string;
  userAgent: string;
}

/**
 * Main middleware: Authenticate admin and extract context
 * Throws error if not authenticated or not admin
 */
export async function authenticateAdmin(req: Request): Promise<AdminContext> {
  const supabase = getSupabaseAdmin();

  // Get auth token from header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing authorization header');
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    throw new Error('Invalid authentication token');
  }

  // Get admin role
  const roleLevel = await getAdminRoleLevel(supabase, user.id);
  if (roleLevel === 0) {
    throw new Error('Access denied: Not an admin');
  }

  // Get role name
  const { data: roleData } = await supabase
    .from('admin_user_roles')
    .select('role_name')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('role_name', { ascending: false })
    .limit(1)
    .single();

  // Extract IP and user agent
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  return {
    userId: user.id,
    username: user.email?.split('@')[0] || 'admin',
    role: roleData?.role_name || 'unknown',
    roleLevel,
    ipAddress,
    userAgent
  };
}

// =====================================================
// PERMISSION ENFORCEMENT
// =====================================================

/**
 * Require specific permission or throw error
 */
export async function requirePermission(
  supabase,
  adminContext: AdminContext,
  permissionName: string
): Promise<void> {
  const allowed = await hasPermission(supabase, adminContext.userId, permissionName);
  
  if (!allowed) {
    throw new Error(`Access denied: Missing permission '${permissionName}'`);
  }
}

/**
 * Require minimum role level or throw error
 */
export function requireRoleLevel(adminContext: AdminContext, minLevel: number): void {
  if (adminContext.roleLevel < minLevel) {
    throw new Error(`Access denied: Requires role level ${minLevel} or higher`);
  }
}

// =====================================================
// QUOTA & RATE LIMITING
// =====================================================

/**
 * Check and increment action quota
 * Throws error if quota exceeded
 */
export async function checkQuota(
  supabase,
  adminContext: AdminContext,
  actionType: string
): Promise<void> {
  // Get quota config for this role + action
  const { data: quotaConfig } = await supabase
    .from('admin_quota_configs')
    .select('quota_limit, quota_period')
    .eq('role_name', adminContext.role)
    .eq('action_type', actionType)
    .single();

  if (!quotaConfig) {
    // No quota configured = unlimited
    return;
  }

  // Check if quota exceeded
  const { data: allowed, error } = await supabase.rpc('increment_action_quota', {
    p_admin_id: adminContext.userId,
    p_action_type: actionType,
    p_quota_limit: quotaConfig.quota_limit,
    p_quota_period: quotaConfig.quota_period
  });

  if (error) {
    console.error('Quota check error:', error);
    throw new Error('Failed to check action quota');
  }

  if (!allowed) {
    throw new Error(`Quota exceeded: ${actionType} limit is ${quotaConfig.quota_limit} per ${quotaConfig.quota_period}`);
  }
}

// =====================================================
// ACTION LOGGING
// =====================================================

export interface ActionLogParams {
  actionType: string;
  actionCategory: string;
  targetPlayerId?: string;
  targetPlayerUsername?: string;
  fieldChanged?: string;
  beforeValue?: any;
  afterValue?: any;
  reason: string;
  isDestructive?: boolean;
}

/**
 * Log admin action to audit trail
 * Returns action ID for rollback system
 */
export async function logAction(
  supabase,
  adminContext: AdminContext,
  params: ActionLogParams
): Promise<string> {
  const { data: actionId, error } = await supabase.rpc('log_admin_action', {
    p_admin_id: adminContext.userId,
    p_admin_username: adminContext.username,
    p_admin_role: adminContext.role,
    p_action_type: params.actionType,
    p_action_category: params.actionCategory,
    p_target_player_id: params.targetPlayerId || null,
    p_target_player_username: params.targetPlayerUsername || null,
    p_field_changed: params.fieldChanged || null,
    p_before_value: params.beforeValue ? JSON.stringify(params.beforeValue) : null,
    p_after_value: params.afterValue ? JSON.stringify(params.afterValue) : null,
    p_reason: params.reason,
    p_ip_address: adminContext.ipAddress,
    p_is_destructive: params.isDestructive || false
  });

  if (error) {
    console.error('Error logging action:', error);
    throw new Error('Failed to log admin action');
  }

  return actionId;
}

// =====================================================
// ROLLBACK SYSTEM
// =====================================================

export interface RollbackSnapshot {
  player_id: string;
  tables: string[];
  data: {
    [tableName: string]: any;
  };
}

/**
 * Create rollback snapshot before making changes
 * This allows undoing the action later
 */
export async function createSnapshot(
  supabase,
  actionId: string,
  snapshot: RollbackSnapshot
): Promise<string> {
  const { data: snapshotId, error } = await supabase.rpc('create_rollback_snapshot', {
    p_action_id: actionId,
    p_player_id: snapshot.player_id,
    p_snapshot_data: JSON.stringify(snapshot.data),
    p_snapshot_tables: snapshot.tables
  });

  if (error) {
    console.error('Error creating snapshot:', error);
    throw new Error('Failed to create rollback snapshot');
  }

  return snapshotId;
}

/**
 * Execute rollback: restore previous state
 */
export async function executeRollback(
  supabase,
  adminContext: AdminContext,
  actionId: string,
  reason: string
): Promise<void> {
  // Get snapshot
  const { data: rollback, error: fetchError } = await supabase
    .from('action_rollbacks')
    .select('*')
    .eq('original_action_id', actionId)
    .single();

  if (fetchError || !rollback) {
    throw new Error('Rollback snapshot not found');
  }

  const snapshotData = rollback.snapshot_data;
  const tables = rollback.snapshot_tables;

  // Restore each table
  for (const table of tables) {
    const tableData = snapshotData[table];
    if (!tableData) continue;

    // Update table with snapshot data
    const { error: restoreError } = await supabase
      .from(table)
      .upsert(tableData);

    if (restoreError) {
      console.error(`Error restoring ${table}:`, restoreError);
      throw new Error(`Failed to restore ${table}`);
    }
  }

  // Mark original action as rolled back
  await supabase
    .from('admin_actions')
    .update({
      is_rolled_back: true,
      rolled_back_at: new Date().toISOString(),
      rolled_back_by: adminContext.userId,
      rollback_reason: reason,
      status: 'rolled_back'
    })
    .eq('id', actionId);

  // Update rollback status
  await supabase
    .from('action_rollbacks')
    .update({
      rolled_back_by: adminContext.userId,
      rollback_reason: reason,
      rollback_status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('original_action_id', actionId);
}

// =====================================================
// DUAL-CONFIRMATION SYSTEM
// =====================================================

/**
 * Request confirmation for destructive action
 * Returns confirmation token
 */
export async function requestConfirmation(
  supabase,
  adminContext: AdminContext,
  actionType: string,
  details: any
): Promise<string> {
  const confirmationToken = crypto.randomUUID();

  // Store confirmation request (expires in 5 minutes)
  await supabase
    .from('admin_actions')
    .insert({
      admin_id: adminContext.userId,
      admin_username: adminContext.username,
      admin_role: adminContext.role,
      action_type: actionType,
      action_category: actionType.split(':')[0],
      before_value: details,
      status: 'pending',
      requires_confirmation: true,
      ip_address: adminContext.ipAddress
    });

  return confirmationToken;
}

/**
 * Confirm destructive action with token
 */
export async function confirmAction(
  supabase,
  adminContext: AdminContext,
  confirmationToken: string
): Promise<void> {
  // Find pending action
  const { data: action, error } = await supabase
    .from('admin_actions')
    .select('*')
    .eq('id', confirmationToken)
    .eq('status', 'pending')
    .eq('requires_confirmation', true)
    .single();

  if (error || !action) {
    throw new Error('Invalid confirmation token');
  }

  // Check if expired (5 minutes)
  const createdAt = new Date(action.created_at);
  const now = new Date();
  const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;

  if (diffMinutes > 5) {
    throw new Error('Confirmation expired');
  }

  // Update action as confirmed
  await supabase
    .from('admin_actions')
    .update({
      confirmed_at: new Date().toISOString(),
      confirmed_by: adminContext.userId,
      status: 'completed'
    })
    .eq('id', confirmationToken);
}

// =====================================================
// CONVENIENCE WRAPPERS
// =====================================================

/**
 * Complete middleware stack for safe admin operations
 * Handles: auth, permission, quota, logging, snapshot
 */
export async function withAdminSafety(
  req: Request,
  permissionName: string,
  actionType: string,
  handler: (supabase: any, adminContext: AdminContext) => Promise<any>
): Promise<Response> {
  try {
    const supabase = getSupabaseAdmin();

    // 1. Authenticate
    const adminContext = await authenticateAdmin(req);

    // 2. Check permission
    await requirePermission(supabase, adminContext, permissionName);

    // 3. Check quota
    await checkQuota(supabase, adminContext, actionType);

    // 4. Execute handler
    const result = await handler(supabase, adminContext);

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Admin operation error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: error.message.includes('Access denied') ? 403 : 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  getSupabaseAdmin,
  authenticateAdmin,
  getAdminRoleLevel,
  hasPermission,
  requirePermission,
  requireRoleLevel,
  requiresConfirmation,
  checkQuota,
  logAction,
  createSnapshot,
  executeRollback,
  requestConfirmation,
  confirmAction,
  withAdminSafety
};
