// Anti-Cheat Logger Service
// Centralized logging for all game actions with automatic rule checking

import { supabase } from '../config/supabaseClient';

class AntiCheatLogger {
  constructor() {
    this.sessionCache = new Map();
  }

  /**
   * Log any player action to the game_logs table
   * @param {number} playerId - Player ID
   * @param {string} actionType - Type of action (e.g., 'commit_crime', 'purchase_item')
   * @param {object} actionData - Action-specific data
   * @returns {Promise<object>} Log entry created
   */
  async logAction(playerId, actionType, actionData) {
    try {
      const {
        oldValue = null,
        newValue = null,
        valueDiff = null,
        metadata = {},
        ipAddress = null,
        userAgent = null,
        deviceFingerprint = null,
        sessionId = null
      } = actionData;

      // Determine action category
      const actionCategory = this.categorizeAction(actionType);

      // Insert log entry
      const { data: logEntry, error } = await supabase
        .from('game_logs')
        .insert({
          player_id: playerId,
          action_type: actionType,
          action_category: actionCategory,
          description: this.generateDescription(actionType, metadata),
          old_value: oldValue,
          new_value: newValue,
          value_diff: valueDiff,
          ip_address: ipAddress,
          user_agent: userAgent,
          device_fingerprint: deviceFingerprint,
          session_id: sessionId,
          metadata: metadata
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to log action:', error);
        return null;
      }

      // Run detection rules asynchronously (don't await)
      this.checkRules(playerId, actionType, logEntry).catch(err => {
        console.error('Error checking rules:', err);
      });

      // Update risk score asynchronously
      this.updateRiskScore(playerId).catch(err => {
        console.error('Error updating risk score:', err);
      });

      return logEntry;
    } catch (error) {
      console.error('AntiCheatLogger.logAction error:', error);
      return null;
    }
  }

  /**
   * Log economy transaction (money changes)
   */
  async logEconomyTransaction(playerId, transactionType, amount, source, sourceId = null, counterpartyId = null, metadata = {}) {
    try {
      // Get current balance
      const { data: player } = await supabase
        .from('the_life_players')
        .select('cash, bank')
        .eq('id', playerId)
        .single();

      if (!player) return null;

      const balanceBefore = transactionType.includes('bank') ? player.bank : player.cash;
      const balanceAfter = ['earned', 'transfer_received', 'daily_reward', 'admin_adjustment', 'refund'].includes(transactionType)
        ? balanceBefore + amount
        : balanceBefore - amount;

      // Insert transaction record
      const { data: transaction, error } = await supabase
        .from('economy_transactions')
        .insert({
          player_id: playerId,
          transaction_type: transactionType,
          amount: Math.abs(amount),
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          source: source,
          source_id: sourceId,
          counterparty_id: counterpartyId,
          metadata: metadata,
          ip_address: metadata.ipAddress || null,
          device_fingerprint: metadata.deviceFingerprint || null
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to log economy transaction:', error);
        return null;
      }

      // Also log to game_logs
      await this.logAction(playerId, `economy_${transactionType}`, {
        oldValue: { balance: balanceBefore },
        newValue: { balance: balanceAfter },
        valueDiff: balanceAfter - balanceBefore,
        metadata: { ...metadata, source, sourceId, amount }
      });

      return transaction;
    } catch (error) {
      console.error('AntiCheatLogger.logEconomyTransaction error:', error);
      return null;
    }
  }

  /**
   * Log inventory change
   */
  async logInventoryChange(playerId, itemId, changeType, quantityChange, source, sourceId = null, transactionId = null, metadata = {}) {
    try {
      // Get current quantity
      const { data: inventory } = await supabase
        .from('player_inventory')
        .select('quantity')
        .eq('player_id', playerId)
        .eq('item_id', itemId)
        .single();

      const quantityBefore = inventory?.quantity || 0;
      const quantityAfter = quantityBefore + quantityChange;

      // Insert inventory change log
      const { data: change, error } = await supabase
        .from('inventory_changes_log')
        .insert({
          player_id: playerId,
          item_id: itemId,
          change_type: changeType,
          quantity_change: quantityChange,
          quantity_before: quantityBefore,
          quantity_after: quantityAfter,
          source: source,
          source_id: sourceId,
          transaction_id: transactionId,
          ip_address: metadata.ipAddress || null,
          device_fingerprint: metadata.deviceFingerprint || null
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to log inventory change:', error);
        return null;
      }

      // Also log to game_logs
      await this.logAction(playerId, `inventory_${changeType}`, {
        oldValue: { item_id: itemId, quantity: quantityBefore },
        newValue: { item_id: itemId, quantity: quantityAfter },
        valueDiff: quantityChange,
        metadata: { ...metadata, source, sourceId, itemId }
      });

      return change;
    } catch (error) {
      console.error('AntiCheatLogger.logInventoryChange error:', error);
      return null;
    }
  }

  /**
   * Check all active anti-cheat rules against this action
   */
  async checkRules(playerId, actionType, logEntry) {
    try {
      // Get all active rules
      const { data: rules, error } = await supabase
        .from('anticheat_rules')
        .select('*')
        .eq('is_active', true);

      if (error || !rules) return;

      for (const rule of rules) {
        // Check if rule applies to this action type
        const config = rule.detection_config;
        if (config.action && config.action !== actionType && !config.actions_monitored?.includes(actionType)) {
          continue;
        }

        // Evaluate rule
        const violation = await this.evaluateRule(rule, playerId, logEntry);

        if (violation) {
          await this.handleViolation(rule, playerId, violation, logEntry);
        }
      }
    } catch (error) {
      console.error('checkRules error:', error);
    }
  }

  /**
   * Evaluate a specific rule against player data
   */
  async evaluateRule(rule, playerId, logEntry) {
    switch (rule.rule_type) {
      case 'rate_limit':
        return await this.checkRateLimit(rule, playerId, logEntry);
      case 'threshold':
        return await this.checkThreshold(rule, playerId, logEntry);
      case 'pattern':
        return await this.checkPattern(rule, playerId, logEntry);
      case 'comparison':
        return await this.checkComparison(rule, playerId, logEntry);
      default:
        return null;
    }
  }

  /**
   * Check rate limit rule
   */
  async checkRateLimit(rule, playerId, logEntry) {
    const config = rule.detection_config;
    const timeWindow = new Date(Date.now() - config.window_seconds * 1000);

    // Count actions in time window
    const { count, error } = await supabase
      .from('game_logs')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', playerId)
      .eq('action_type', config.action || logEntry.action_type)
      .gte('timestamp', timeWindow.toISOString());

    if (error) return null;

    if (count > config.max_count) {
      return {
        violated: true,
        evidence: {
          count: count,
          max_allowed: config.max_count,
          window_seconds: config.window_seconds
        }
      };
    }

    // Check minimum interval if specified
    if (config.min_interval_ms) {
      const { data: recentActions } = await supabase
        .from('game_logs')
        .select('timestamp')
        .eq('player_id', playerId)
        .eq('action_type', config.action || logEntry.action_type)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (recentActions && recentActions.length > 1) {
        const intervals = [];
        for (let i = 0; i < recentActions.length - 1; i++) {
          const interval = new Date(recentActions[i].timestamp) - new Date(recentActions[i + 1].timestamp);
          intervals.push(interval);
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

        if (avgInterval < config.min_interval_ms) {
          return {
            violated: true,
            evidence: {
              avg_interval_ms: avgInterval,
              min_required: config.min_interval_ms,
              bot_probability: 0.95
            }
          };
        }
      }
    }

    return null;
  }

  /**
   * Check threshold rule (e.g., abnormal money gain)
   */
  async checkThreshold(rule, playerId, logEntry) {
    const config = rule.detection_config;

    for (const window of config.time_windows || []) {
      const timeStart = new Date(Date.now() - window.duration_seconds * 1000);

      // Sum all gains in window
      const { data: transactions } = await supabase
        .from('economy_transactions')
        .select('amount')
        .eq('player_id', playerId)
        .eq('transaction_type', 'earned')
        .gte('timestamp', timeStart.toISOString());

      if (transactions) {
        const totalGain = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

        if (totalGain > window.max_gain) {
          return {
            violated: true,
            evidence: {
              actual_gain: totalGain,
              max_allowed: window.max_gain,
              window_seconds: window.duration_seconds,
              deviation_multiplier: (totalGain / window.max_gain).toFixed(2)
            }
          };
        }
      }
    }

    return null;
  }

  /**
   * Check pattern rule (e.g., impossible success rates)
   */
  async checkPattern(rule, playerId, logEntry) {
    // Implement pattern detection logic
    // This would involve statistical analysis of success rates, etc.
    return null; // Placeholder
  }

  /**
   * Check comparison rule (e.g., inventory duplication)
   */
  async checkComparison(rule, playerId, logEntry) {
    const config = rule.detection_config;

    if (config.check_for === 'identical_additions') {
      const timeWindow = new Date(Date.now() - config.time_window_seconds * 1000);

      // Check for duplicate inventory additions
      const { data: changes } = await supabase
        .from('inventory_changes_log')
        .select('*')
        .eq('player_id', playerId)
        .eq('change_type', 'added')
        .gte('timestamp', timeWindow.toISOString());

      if (changes && changes.length >= config.min_occurrences) {
        // Group by item_id
        const itemGroups = {};
        changes.forEach(change => {
          if (!itemGroups[change.item_id]) {
            itemGroups[change.item_id] = [];
          }
          itemGroups[change.item_id].push(change);
        });

        // Check for suspicious patterns
        for (const [itemId, itemChanges] of Object.entries(itemGroups)) {
          if (itemChanges.length >= config.min_occurrences) {
            const hasNoTransactionId = itemChanges.some(c => !c.transaction_id);
            if (hasNoTransactionId) {
              return {
                violated: true,
                evidence: {
                  item_id: itemId,
                  occurrences: itemChanges.length,
                  time_window_seconds: config.time_window_seconds,
                  missing_transaction_ids: true
                }
              };
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Handle a rule violation
   */
  async handleViolation(rule, playerId, violation, logEntry) {
    try {
      // Create alert
      const { data: alert, error } = await supabase
        .from('security_alerts')
        .insert({
          player_id: playerId,
          alert_type: rule.rule_name,
          severity: rule.severity,
          title: this.generateAlertTitle(rule, violation),
          description: this.generateAlertDescription(rule, violation),
          evidence: violation.evidence,
          related_log_ids: [logEntry.id],
          detection_rule_id: rule.id,
          confidence_score: violation.evidence.bot_probability || 0.85,
          status: 'new',
          auto_action_taken: rule.auto_action
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create alert:', error);
        return;
      }

      // Take automatic action
      if (rule.auto_action !== 'none') {
        await this.executeAutoAction(rule.auto_action, playerId, alert.id);
      }

      // Update rule trigger count
      await supabase
        .from('anticheat_rules')
        .update({ trigger_count: rule.trigger_count + 1 })
        .eq('id', rule.id);

      // Flag the log entry
      await supabase
        .from('game_logs')
        .update({
          is_flagged: true,
          flag_reason: rule.rule_name,
          flag_severity: rule.severity
        })
        .eq('id', logEntry.id);

    } catch (error) {
      console.error('handleViolation error:', error);
    }
  }

  /**
   * Execute automatic action (flag, suspend, ban)
   */
  async executeAutoAction(action, playerId, alertId) {
    try {
      const updates = {};

      switch (action) {
        case 'flag':
          updates.is_flagged = true;
          await supabase
            .from('player_risk_scores')
            .update({ flagged_action_count: supabase.raw('flagged_action_count + 1') })
            .eq('player_id', playerId);
          break;

        case 'suspend':
          updates.is_banned = true;
          updates.ban_reason = `Automatic suspension: Alert #${alertId}`;
          updates.banned_until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
          break;

        case 'ban':
          updates.is_banned = true;
          updates.ban_reason = `Automatic permanent ban: Alert #${alertId}`;
          updates.banned_until = null; // Permanent
          break;
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('the_life_players')
          .update(updates)
          .eq('id', playerId);

        // Log admin action (automated)
        await supabase
          .from('admin_actions')
          .insert({
            admin_user_id: null, // System action
            action_type: `auto_${action}`,
            target_type: 'player',
            target_id: playerId,
            changes: { alert_id: alertId, action: action },
            reason: `Automatic action triggered by anti-cheat rule`
          });
      }
    } catch (error) {
      console.error('executeAutoAction error:', error);
    }
  }

  /**
   * Update player risk score
   */
  async updateRiskScore(playerId) {
    try {
      // Get risk data
      const { data: riskData } = await supabase
        .from('player_risk_scores')
        .select('*')
        .eq('player_id', playerId)
        .single();

      if (!riskData) return;

      // Calculate new risk score (0-100)
      let score = 0;
      score += (riskData.alert_count || 0) * 10;
      score += (riskData.flagged_action_count || 0) * 5;
      score += (riskData.ban_count || 0) * 30;
      score += (riskData.suspicious_money_gains || 0) * 8;
      score += (riskData.suspicious_inventory_changes || 0) * 6;
      score += (riskData.rapid_action_violations || 0) * 7;
      score += (riskData.impossible_success_rates || 0) * 15;

      // Cap at 100
      score = Math.min(score, 100);

      // Determine risk level
      let riskLevel;
      if (score < 10) riskLevel = 'safe';
      else if (score < 30) riskLevel = 'low';
      else if (score < 60) riskLevel = 'medium';
      else if (score < 85) riskLevel = 'high';
      else riskLevel = 'critical';

      // Update risk score
      await supabase
        .from('player_risk_scores')
        .update({
          risk_score: score,
          risk_level: riskLevel,
          last_updated: new Date().toISOString()
        })
        .eq('player_id', playerId);

      // Update the_life_players table
      await supabase
        .from('the_life_players')
        .update({ risk_score: score })
        .eq('id', playerId);

    } catch (error) {
      console.error('updateRiskScore error:', error);
    }
  }

  /**
   * Helper: Categorize action type
   */
  categorizeAction(actionType) {
    if (actionType.includes('crime')) return 'crime';
    if (actionType.includes('money') || actionType.includes('economy') || actionType.includes('purchase')) return 'economy';
    if (actionType.includes('inventory') || actionType.includes('item')) return 'inventory';
    if (actionType.includes('admin')) return 'admin';
    if (actionType.includes('login') || actionType.includes('auth')) return 'auth';
    return 'other';
  }

  /**
   * Helper: Generate log description
   */
  generateDescription(actionType, metadata) {
    // Generate human-readable descriptions
    const descriptions = {
      'commit_crime': `Committed crime: ${metadata.crime_name || 'Unknown'}`,
      'purchase_item': `Purchased ${metadata.quantity || 1}x ${metadata.item_name || 'item'}`,
      'use_item': `Used item: ${metadata.item_name || 'Unknown'}`,
      'transfer_money': `Transferred $${metadata.amount || 0} to player #${metadata.recipient_id}`,
      'login': `Player logged in`,
      'logout': `Player logged out`
    };

    return descriptions[actionType] || `Action: ${actionType}`;
  }

  /**
   * Helper: Generate alert title
   */
  generateAlertTitle(rule, violation) {
    const titles = {
      'abnormal_money_gain': 'Abnormal Money Gain Detected',
      'rapid_action_execution': 'Bot/Macro Activity Detected',
      'impossible_success_rate': 'Impossible Success Rate',
      'inventory_duplication': 'Item Duplication Exploit',
      'api_abuse_detection': 'API Abuse Detected',
      'multi_account_detection': 'Multi-Account Detected'
    };

    return titles[rule.rule_name] || 'Security Alert';
  }

  /**
   * Helper: Generate alert description
   */
  generateAlertDescription(rule, violation) {
    const { evidence } = violation;

    switch (rule.rule_name) {
      case 'abnormal_money_gain':
        return `Player gained $${evidence.actual_gain} in ${evidence.window_seconds} seconds (max expected: $${evidence.max_allowed})`;
      case 'rapid_action_execution':
        return `Player executed ${evidence.count} actions in ${evidence.window_seconds} seconds with ${evidence.avg_interval_ms}ms average interval`;
      case 'inventory_duplication':
        return `Player gained identical items ${evidence.occurrences} times in ${evidence.time_window_seconds} seconds without valid source`;
      default:
        return JSON.stringify(evidence);
    }
  }
}

// Export singleton instance
export const antiCheatLogger = new AntiCheatLogger();
