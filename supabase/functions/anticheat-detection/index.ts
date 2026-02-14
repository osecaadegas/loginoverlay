/**
 * Anti-Cheat Detection Engine - Supabase Edge Function
 * Real-time analysis of game logs and automatic threat detection
 * 
 * Trigger: Called by database trigger on new game_logs entries
 * Or: Called manually for batch analysis
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface DetectionContext {
  playerId: string
  actionType: string
  logEntry: any
  recentLogs: any[]
  playerData: any
  riskScore: number
  config: Map<string, any>
}

// Main handler
serve(async (req) => {
  try {
    const { logId, playerId, actionType, batchMode = false } = await req.json()

    // Load configuration
    const config = await loadConfiguration()

    // Get log entry
    const { data: logEntry } = await supabase
      .from('game_logs')
      .select('*')
      .eq('id', logId)
      .single()

    if (!logEntry) {
      return new Response(JSON.stringify({ error: 'Log entry not found' }), { status: 404 })
    }

    // Build detection context
    const context: DetectionContext = {
      playerId,
      actionType,
      logEntry,
      recentLogs: await getRecentLogs(playerId, 100),
      playerData: await getPlayerData(playerId),
      riskScore: await getRiskScore(playerId),
      config
    }

    // Run all detection rules
    const detections = await runDetectionRules(context)

    // Create alerts for detected threats
    for (const detection of detections) {
      await createSecurityAlert(detection)
    }

    // Update risk score if violations detected
    if (detections.length > 0) {
      await updateRiskScore(context, detections)
    }

    // Execute automated responses
    await executeAutomatedResponses(context, detections)

    return new Response(
      JSON.stringify({
        success: true,
        detectionsTriggered: detections.length,
        newRiskScore: context.riskScore,
        detections: detections.map(d => ({
          rule: d.ruleName,
          severity: d.severity,
          confidence: d.confidence
        }))
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Detection engine error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// Load configuration from database
async function loadConfiguration(): Promise<Map<string, any>> {
  const { data: configs } = await supabase
    .from('anticheat_config')
    .select('key, value')
    .eq('is_enabled', true)

  const configMap = new Map()
  configs?.forEach(c => configMap.set(c.key, c.value))
  return configMap
}

// Get recent player logs
async function getRecentLogs(playerId: string, limit: number) {
  const { data } = await supabase
    .from('game_logs')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return data || []
}

// Get player data
async function getPlayerData(playerId: string) {
  const { data } = await supabase
    .from('the_life_players')
    .select('*')
    .eq('id', playerId)
    .single()

  return data
}

// Get current risk score
async function getRiskScore(playerId: string): Promise<number> {
  const { data } = await supabase
    .from('player_risk_scores')
    .select('total_risk_score')
    .eq('player_id', playerId)
    .single()

  return data?.total_risk_score || 0
}

// Run all detection rules
async function runDetectionRules(context: DetectionContext) {
  const detections = []

  // Rule 1: Velocity Check (too many actions too quickly)
  if (context.config.get('velocity_check_enabled')) {
    const velocityDetection = await checkVelocityViolation(context)
    if (velocityDetection) detections.push(velocityDetection)
  }

  // Rule 2: Impossible Values (server-side validation)
  const impossibleValueDetection = checkImpossibleValues(context)
  if (impossibleValueDetection) detections.push(impossibleValueDetection)

  // Rule 3: Clock Drift Detection (time manipulation)
  if (context.config.get('clock_drift_tolerance_seconds')) {
    const clockDriftDetection = checkClockDrift(context)
    if (clockDriftDetection) detections.push(clockDriftDetection)
  }

  // Rule 4: Suspicious Money Gains
  const moneyDetection = checkSuspiciousMoneyGain(context)
  if (moneyDetection) detections.push(moneyDetection)

  // Rule 5: Bot-like Behavior (consistent timing)
  if (context.config.get('bot_detection_enabled')) {
    const botDetection = await checkBotBehavior(context)
    if (botDetection) detections.push(botDetection)
  }

  // Rule 6: Pattern Matching (known exploit patterns)
  if (context.config.get('pattern_matching_enabled')) {
    const patternDetection = checkKnownPatterns(context)
    if (patternDetection) detections.push(patternDetection)
  }

  // Rule 7: Multi-Account Detection (device fingerprint clustering)
  if (context.config.get('multi_account_detection_enabled')) {
    const multiAccountDetection = await checkMultiAccount(context)
    if (multiAccountDetection) detections.push(multiAccountDetection)
  }

  // Rule 8: Inventory State Consistency
  const inventoryDetection = await checkInventoryConsistency(context)
  if (inventoryDetection) detections.push(inventoryDetection)

  // Rule 9: Failed Validation Accumulation
  const validationDetection = await checkFailedValidations(context)
  if (validationDetection) detections.push(validationDetection)

  // Rule 10: Honeypot Trigger Detection
  if (context.config.get('honeypot_enabled')) {
    const honeypotDetection = checkHoneypotTrigger(context)
    if (honeypotDetection) detections.push(honeypotDetection)
  }

  return detections
}

// Detection Rule 1: Velocity Violation
async function checkVelocityViolation(context: DetectionContext) {
  const maxActionsPerMinute = context.config.get('velocity_max_actions_per_minute') || 30
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()

  const recentActions = context.recentLogs.filter(
    log => new Date(log.created_at) > new Date(oneMinuteAgo)
  )

  if (recentActions.length > maxActionsPerMinute) {
    return {
      ruleName: 'velocity_violation',
      severity: 'high',
      confidence: 0.95,
      description: `${recentActions.length} actions in 1 minute (limit: ${maxActionsPerMinute})`,
      evidence: {
        actionCount: recentActions.length,
        timeWindow: '1 minute',
        threshold: maxActionsPerMinute,
        actionTypes: recentActions.slice(0, 10).map(l => l.action_type)
      }
    }
  }

  return null
}

// Detection Rule 2: Impossible Values
function checkImpossibleValues(context: DetectionContext) {
  const { actionType, logEntry } = context

  // Check for impossible money gains
  if (actionType === 'economy_transaction') {
    const amount = logEntry.metadata?.amount || 0
    const maxCashPerCrime = 50000 // Should come from config

    if (amount > maxCashPerCrime && logEntry.metadata?.source === 'crime') {
      return {
        ruleName: 'impossible_value',
        severity: 'critical',
        confidence: 1.0,
        description: `Impossible money gain: $${amount} from crime (max: $${maxCashPerCrime})`,
        evidence: {
          value: amount,
          threshold: maxCashPerCrime,
          source: logEntry.metadata?.source
        }
      }
    }
  }

  // Check for impossible level gains
  if (actionType === 'level_up') {
    const levelGain = logEntry.value_diff
    if (levelGain > 5) {
      return {
        ruleName: 'impossible_value',
        severity: 'critical',
        confidence: 1.0,
        description: `Impossible level gain: +${levelGain} levels at once`,
        evidence: { levelGain }
      }
    }
  }

  return null
}

// Detection Rule 3: Clock Drift
function checkClockDrift(context: DetectionContext) {
  const clientTimestamp = context.logEntry.metadata?.clientTimestamp
  if (!clientTimestamp) return null

  const serverTime = new Date(context.logEntry.created_at).getTime()
  const clientTime = new Date(clientTimestamp).getTime()
  const driftSeconds = Math.abs(serverTime - clientTime) / 1000

  const tolerance = context.config.get('clock_drift_tolerance_seconds') || 30

  if (driftSeconds > tolerance) {
    return {
      ruleName: 'clock_drift',
      severity: 'high',
      confidence: 0.90,
      description: `Clock drift of ${driftSeconds.toFixed(1)}s detected (tolerance: ${tolerance}s)`,
      evidence: {
        driftSeconds,
        tolerance,
        clientTime: new Date(clientTime).toISOString(),
        serverTime: new Date(serverTime).toISOString()
      }
    }
  }

  return null
}

// Detection Rule 4: Suspicious Money Gain
function checkSuspiciousMoneyGain(context: DetectionContext) {
  // Check for repeated high-value transactions in short time
  const oneHourAgo = new Date(Date.now() - 3600000)
  const recentMoneyLogs = context.recentLogs.filter(log =>
    log.action_category === 'economy' &&
    new Date(log.created_at) > oneHourAgo &&
    log.value_diff > 0
  )

  const totalGain = recentMoneyLogs.reduce((sum, log) => sum + (log.value_diff || 0), 0)

  // Suspicious if gained >500k in 1 hour from crimes
  if (totalGain > 500000) {
    return {
      ruleName: 'suspicious_money_gain',
      severity: 'high',
      confidence: 0.85,
      description: `Suspicious money gain: $${totalGain} in 1 hour`,
      evidence: {
        totalGain,
        transactionCount: recentMoneyLogs.length,
        timeWindow: '1 hour',
        avgPerTransaction: Math.round(totalGain / recentMoneyLogs.length)
      }
    }
  }

  return null
}

// Detection Rule 5: Bot Behavior
async function checkBotBehavior(context: DetectionContext) {
  // Analyze timing consistency (bots have low variance)
  const recentActions = context.recentLogs.slice(0, 20)
  if (recentActions.length < 10) return null

  const intervals = []
  for (let i = 0; i < recentActions.length - 1; i++) {
    const t1 = new Date(recentActions[i].created_at).getTime()
    const t2 = new Date(recentActions[i + 1].created_at).getTime()
    intervals.push(t2 - t1)
  }

  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length
  const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length
  const stdDev = Math.sqrt(variance)
  const coefficientOfVariation = stdDev / mean

  // Humans have CV > 0.3, bots often < 0.1
  if (coefficientOfVariation < 0.15 && mean > 500 && mean < 120000) {
    return {
      ruleName: 'bot_behavior',
      severity: 'high',
      confidence: 0.80,
      description: `Bot-like timing detected (CV: ${coefficientOfVariation.toFixed(3)})`,
      evidence: {
        coefficientOfVariation,
        meanInterval: mean,
        stdDev,
        sampleSize: intervals.length
      }
    }
  }

  return null
}

// Detection Rule 6: Known Patterns
function checkKnownPatterns(context: DetectionContext) {
  // Check for exploit signatures
  const metadata = context.logEntry.metadata || {}

  // Pattern: Repeated failed validations (probing)
  if (metadata.validationFailed && context.recentLogs.filter(l =>
    l.metadata?.validationFailed
  ).length > 5) {
    return {
      ruleName: 'pattern_match_probing',
      severity: 'medium',
      confidence: 0.75,
      description: 'Repeated validation failures detected (exploit probing)',
      evidence: {
        failedValidations: context.recentLogs.filter(l => l.metadata?.validationFailed).length
      }
    }
  }

  // Pattern: Honeypot variable accessed
  if (metadata.__honeypot || metadata.debugMode || metadata.__internal) {
    return {
      ruleName: 'pattern_match_honeypot',
      severity: 'critical',
      confidence: 0.99,
      description: 'Honeypot variable accessed (client tampering confirmed)',
      evidence: {
        honeypotVariables: Object.keys(metadata).filter(k => k.startsWith('__'))
      }
    }
  }

  return null
}

// Detection Rule 7: Multi-Account Detection
async function checkMultiAccount(context: DetectionContext) {
  const fingerprint = context.logEntry.device_fingerprint
  if (!fingerprint) return null

  // Check how many players share this fingerprint
  const { data: sessions } = await supabase
    .from('player_sessions')
    .select('player_id')
    .eq('device_fingerprint', fingerprint)
    .neq('player_id', context.playerId)

  const uniquePlayers = new Set(sessions?.map(s => s.player_id) || [])

  if (uniquePlayers.size >= 3) {
    return {
      ruleName: 'multi_account_detection',
      severity: 'medium',
      confidence: 0.70,
      description: `${uniquePlayers.size} accounts detected on same device`,
      evidence: {
        accountCount: uniquePlayers.size,
        fingerprint: fingerprint.substring(0, 16) + '...'
      }
    }
  }

  return null
}

// Detection Rule 8: Inventory Consistency
async function checkInventoryConsistency(context: DetectionContext) {
  if (context.actionType !== 'inventory_change') return null

  // Check for impossible inventory operations
  const { data: inventoryChanges } = await supabase
    .from('inventory_changes_log')
    .select('*')
    .eq('player_id', context.playerId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Look for duplicate item_id in "add" operations (duplication glitch)
  const recentAdds = inventoryChanges?.filter(c => c.change_type === 'add') || []
  const itemIds = recentAdds.map(c => c.item_id)
  const duplicates = itemIds.filter((item, index) => itemIds.indexOf(item) !== index)

  if (duplicates.length > 0) {
    return {
      ruleName: 'inventory_duplication',
      severity: 'critical',
      confidence: 0.95,
      description: 'Possible inventory duplication detected',
      evidence: {
        duplicatedItems: duplicates.length,
        itemIds: duplicates
      }
    }
  }

  return null
}

// Detection Rule 9: Failed Validations Accumulation
async function checkFailedValidations(context: DetectionContext) {
  const oneHourAgo = new Date(Date.now() - 3600000)
  const failedValidations = context.recentLogs.filter(log =>
    new Date(log.created_at) > oneHourAgo &&
    log.metadata?.validationFailed === true
  )

  const threshold = 10

  if (failedValidations.length > threshold) {
    return {
      ruleName: 'excessive_failed_validations',
      severity: 'high',
      confidence: 0.85,
      description: `${failedValidations.length} failed validations in 1 hour`,
      evidence: {
        failureCount: failedValidations.length,
        threshold,
        failureTypes: failedValidations.map(l => l.action_type)
      }
    }
  }

  return null
}

// Detection Rule 10: Honeypot Trigger
function checkHoneypotTrigger(context: DetectionContext) {
  const metadata = context.logEntry.metadata || {}

  // Check for known honeypot keys
  const honeypotKeys = ['__devMode', '__adminPanel', '__unlockAll', '__godMode', 'debugEnabled']
  const triggeredKeys = honeypotKeys.filter(key => metadata[key] !== undefined)

  if (triggeredKeys.length > 0) {
    return {
      ruleName: 'honeypot_triggered',
      severity: 'critical',
      confidence: 1.0,
      description: 'Honeypot variable accessed (confirmed tampering)',
      evidence: {
        honeypotKeys: triggeredKeys
      }
    }
  }

  return null
}

// Create security alert
async function createSecurityAlert(detection: any) {
  const { data: alert } = await supabase
    .from('security_alerts')
    .insert({
      player_id: detection.playerId || null,
      alert_type: detection.ruleName,
      severity: detection.severity,
      description: detection.description,
      evidence: detection.evidence,
      detection_rule_id: null, // TODO: Link to rule if exists
      status: 'pending',
      requires_review: detection.severity === 'critical'
    })
    .select()
    .single()

  return alert
}

// Update risk score
async function updateRiskScore(context: DetectionContext, detections: any[]) {
  let additionalRisk = 0

  for (const detection of detections) {
    switch (detection.severity) {
      case 'critical':
        additionalRisk += 25
        break
      case 'high':
        additionalRisk += 15
        break
      case 'medium':
        additionalRisk += 10
        break
      case 'low':
        additionalRisk += 5
        break
    }
  }

  const newScore = context.riskScore + additionalRisk

  await supabase
    .from('player_risk_scores')
    .upsert({
      player_id: context.playerId,
      total_risk_score: newScore,
      last_violation_at: new Date().toISOString()
    })
}

// Execute automated responses
async function executeAutomatedResponses(context: DetectionContext, detections: any[]) {
  const autoFlagEnabled = context.config.get('auto_flag_enabled')
  const autoFlagThreshold = context.config.get('auto_flag_threshold') || 150

  // Auto-flag high-risk players
  if (autoFlagEnabled && context.riskScore >= autoFlagThreshold) {
    await supabase
      .from('the_life_players')
      .update({ is_flagged: true })
      .eq('id', context.playerId)

    console.log(`Auto-flagged player ${context.playerId} (risk: ${context.riskScore})`)
  }

  // Check for critical detections requiring immediate action
  const criticalDetections = detections.filter(d => d.severity === 'critical')
  
  if (criticalDetections.length > 0) {
    // Log to admin actions
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: null, // System action
        action_type: 'auto_flag',
        target_player_id: context.playerId,
        reason: `Critical detection: ${criticalDetections.map(d => d.ruleName).join(', ')}`,
        metadata: { detections: criticalDetections }
      })
  }
}
