// =====================================================
// CRIME GAME ENGINE — Balanced Progression System
// Torn/Crime-style browser game
// =====================================================

// ─── CRIMES DATABASE ─────────────────────────────────

const CRIMES = [
  {
    id: 'pickpocket',
    name: 'Pickpocket',
    tier: 'petty',
    baseSuccess: 70,
    minLevel: 1,
    primarySkill: 'stealth',
    secondarySkill: 'dexterity',
    cashMin: 50,
    cashMax: 200,
    xpReward: 10,
    fineOnFail: 25,
    hpLoss: 3,
    jailMinutes: 2,
    staminaCost: 1,
  },
  {
    id: 'shoplifting',
    name: 'Shoplifting',
    tier: 'minor',
    baseSuccess: 55,
    minLevel: 8,
    primarySkill: 'stealth',
    secondarySkill: 'charisma',
    cashMin: 200,
    cashMax: 800,
    xpReward: 25,
    fineOnFail: 100,
    hpLoss: 5,
    jailMinutes: 5,
    staminaCost: 2,
  },
  {
    id: 'car_theft',
    name: 'Car Theft',
    tier: 'moderate',
    baseSuccess: 42,
    minLevel: 20,
    primarySkill: 'hacking',
    secondarySkill: 'dexterity',
    cashMin: 1000,
    cashMax: 5000,
    xpReward: 60,
    fineOnFail: 500,
    hpLoss: 8,
    jailMinutes: 10,
    staminaCost: 3,
  },
  {
    id: 'armed_robbery',
    name: 'Armed Robbery',
    tier: 'major',
    baseSuccess: 30,
    minLevel: 40,
    primarySkill: 'strength',
    secondarySkill: 'intimidation',
    cashMin: 5000,
    cashMax: 25000,
    xpReward: 120,
    fineOnFail: 2000,
    hpLoss: 15,
    jailMinutes: 20,
    staminaCost: 5,
  },
  {
    id: 'bank_heist',
    name: 'Bank Heist',
    tier: 'elite',
    baseSuccess: 20,
    minLevel: 70,
    primarySkill: 'hacking',
    secondarySkill: 'intelligence',
    cashMin: 25000,
    cashMax: 100000,
    xpReward: 250,
    fineOnFail: 10000,
    hpLoss: 25,
    jailMinutes: 35,
    staminaCost: 8,
  },
  {
    id: 'casino_vault',
    name: 'Casino Vault',
    tier: 'legendary',
    baseSuccess: 12,
    minLevel: 100,
    primarySkill: 'intelligence',
    secondarySkill: 'stealth',
    cashMin: 100000,
    cashMax: 500000,
    xpReward: 500,
    fineOnFail: 50000,
    hpLoss: 40,
    jailMinutes: 60,
    staminaCost: 12,
  },
];

// ─── LEVELING SYSTEM ─────────────────────────────────

const XP_BASE = 100;
const XP_EXPONENT = 1.65;

/**
 * XP required to go from `level` to `level + 1`.
 * Exponential curve — early levels are fast, endgame is a grind.
 */
function xpToNextLevel(level) {
  return Math.floor(XP_BASE * Math.pow(level, XP_EXPONENT));
}

/**
 * Process XP gain — returns updated level & xp, plus any level-ups.
 */
function addXP(player, amount) {
  let { level, xp } = player;
  let leveledUp = false;
  xp += amount;

  while (xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level++;
    leveledUp = true;
  }

  return { level, xp, leveledUp };
}

// ─── SKILL BONUS (DIMINISHING RETURNS) ──────────────

const SKILL_EXPONENT = 0.7;       // diminishing returns curve
const PRIMARY_WEIGHT = 0.55;      // primary skill matters more
const SECONDARY_WEIGHT = 0.25;    // secondary has smaller impact

/**
 * Calculate skill bonus with diminishing returns.
 * skill^0.7 gives strong early gains that taper off.
 *
 * At skill 10 → ~2.75 primary bonus
 * At skill 50 → ~8.4 primary bonus
 * At skill 100 → ~13.8 primary bonus
 */
function calcSkillBonus(primaryLevel, secondaryLevel) {
  const primary = Math.pow(primaryLevel, SKILL_EXPONENT) * PRIMARY_WEIGHT;
  const secondary = Math.pow(secondaryLevel, SKILL_EXPONENT) * SECONDARY_WEIGHT;
  return primary + secondary;
}

// ─── SUCCESS RATE CALCULATION ────────────────────────

const SUCCESS_FLOOR = 5;
const SUCCESS_CEILING = 95;

/**
 * Calculate the final success chance for a crime attempt.
 *
 * Components:
 *  1. Base rate (from crime definition)
 *  2. Level bonus/penalty (over/under-leveled)
 *  3. Skill bonus (diminishing returns)
 *  4. HP modifier (penalty below 50% HP)
 *  5. Heat penalty (repeated failures today)
 */
function calcSuccessChance(player, crime) {
  let chance = crime.baseSuccess;

  // 1. Level scaling
  const levelDiff = player.level - crime.minLevel;
  if (levelDiff >= 0) {
    // Over-leveled: +1.5% per level above requirement, cap +12
    chance += Math.min(levelDiff * 1.5, 12);
  } else {
    // Under-leveled: harsh penalty, -4% per level below
    chance += levelDiff * 4;
  }

  // 2. Skill bonus
  const primarySkillLevel = player.skills[crime.primarySkill] || 0;
  const secondarySkillLevel = player.skills[crime.secondarySkill] || 0;
  const skillBonus = calcSkillBonus(primarySkillLevel, secondarySkillLevel);
  chance += skillBonus;

  // 3. HP modifier — penalty when below 50% HP
  const hpPct = player.hp / player.maxHp;
  if (hpPct < 0.5) {
    chance -= (0.5 - hpPct) * 15;
  }

  // 4. Heat — repeated catches today increase risk
  const heat = player.failsToday || 0;
  chance -= Math.min(heat * 2.5, 12.5);

  // 5. Clamp
  return Math.max(SUCCESS_FLOOR, Math.min(SUCCESS_CEILING, chance));
}

// ─── RNG ─────────────────────────────────────────────

/**
 * Roll for success. Returns true if the crime succeeds.
 * Uses Math.random() scaled to 0–100.
 */
function rollSuccess(successChance) {
  const roll = Math.random() * 100;
  return roll < successChance;
}

// ─── JAIL TIME SCALING ───────────────────────────────

/**
 * Dynamic jail time based on crime difficulty, player state, and defense skill.
 */
function calcJailTime(player, crime) {
  let multiplier = 1;

  // Under-leveled → longer jail
  const levelDiff = player.level - crime.minLevel;
  if (levelDiff < 0) {
    multiplier += Math.abs(levelDiff) * 0.02;
  }

  // Low HP → longer jail
  const hpPct = player.hp / player.maxHp;
  if (hpPct < 0.5) {
    multiplier += (0.5 - hpPct) * 0.4;
  }

  // Heat increases jail
  multiplier += Math.min((player.failsToday || 0) * 0.08, 0.4);

  // Defense/strength reduces jail (up to 25% reduction)
  const defenseLevel = player.skills.strength || 0;
  multiplier *= 1 - Math.min(defenseLevel * 0.0025, 0.25);

  const jailTime = Math.max(1, Math.round(crime.jailMinutes * multiplier));
  return jailTime;
}

// ─── HP LOSS SCALING ─────────────────────────────────

/**
 * Defense-scaled HP loss on failure.
 * Up to 40% reduction at skill level 100.
 */
function calcHpLoss(player, crime) {
  const defenseLevel = player.skills.strength || 0;
  const reduction = 1 - Math.min(defenseLevel * 0.004, 0.4);
  return Math.max(1, Math.round(crime.hpLoss * reduction));
}

// ─── STAMINA SYSTEM ──────────────────────────────────

const BASE_STAMINA = 50;
const STAMINA_PER_LEVEL = 2;
const STAMINA_REGEN_INTERVAL_MS = 3 * 60 * 1000; // 1 stamina per 3 min

function getMaxStamina(level) {
  return BASE_STAMINA + level * STAMINA_PER_LEVEL;
}

// ─── CRIME EXECUTION ─────────────────────────────────

/**
 * Main entry point — execute a crime attempt.
 *
 * @param {object} player - Player state (mutated in place)
 * @param {string} crimeId - ID from CRIMES array
 * @returns {object} Result with outcome details
 */
function commitCrime(player, crimeId) {
  const crime = CRIMES.find(c => c.id === crimeId);
  if (!crime) return { success: false, error: 'Crime not found' };

  // --- Pre-checks ---
  if (player.level < crime.minLevel) {
    return { success: false, error: `Requires level ${crime.minLevel}` };
  }
  if (player.stamina < crime.staminaCost) {
    return { success: false, error: 'Not enough stamina' };
  }
  if (player.jailUntil && Date.now() < player.jailUntil) {
    return { success: false, error: 'You are in jail' };
  }
  if (player.hp <= 0) {
    return { success: false, error: 'You are in hospital' };
  }

  // --- Deduct stamina ---
  player.stamina -= crime.staminaCost;

  // --- Calculate & roll ---
  const successChance = calcSuccessChance(player, crime);
  const succeeded = rollSuccess(successChance);

  if (succeeded) {
    // --- SUCCESS ---
    const cashReward = randInt(crime.cashMin, crime.cashMax);

    // Skill-scaled XP bonus (up to +30%)
    const primaryLvl = player.skills[crime.primarySkill] || 0;
    const secondaryLvl = player.skills[crime.secondarySkill] || 0;
    const avgSkill = (primaryLvl + secondaryLvl) / 2;
    const xpGained = Math.floor(crime.xpReward * (1 + avgSkill * 0.003));

    player.cash += cashReward;
    const levelResult = addXP(player, xpGained);
    player.level = levelResult.level;
    player.xp = levelResult.xp;

    return {
      success: true,
      crimeSuccess: true,
      cashReward,
      xpGained,
      successChance: Math.round(successChance * 10) / 10,
      skillBonus: Math.round(calcSkillBonus(primaryLvl, secondaryLvl) * 10) / 10,
      leveledUp: levelResult.leveledUp,
      newLevel: levelResult.level,
    };
  } else {
    // --- FAILURE ---
    const hpLost = calcHpLoss(player, crime);
    const jailTime = calcJailTime(player, crime);
    const fine = Math.min(crime.fineOnFail, player.cash); // can't fine more than you have

    player.hp = Math.max(0, player.hp - hpLost);
    player.cash = Math.max(0, player.cash - fine);
    player.failsToday = (player.failsToday || 0) + 1;

    // Half XP on failure (you still learn something)
    const xpGained = Math.floor(crime.xpReward / 2);
    const levelResult = addXP(player, xpGained);
    player.level = levelResult.level;
    player.xp = levelResult.xp;

    const inHospital = player.hp <= 0;

    if (inHospital) {
      player.hospitalUntil = Date.now() + 30 * 60 * 1000;
    } else {
      player.jailUntil = Date.now() + jailTime * 60 * 1000;
    }

    return {
      success: true,
      crimeSuccess: false,
      inHospital,
      jailTime: inHospital ? 0 : jailTime,
      hpLost,
      fine,
      xpGained,
      successChance: Math.round(successChance * 10) / 10,
      failsToday: player.failsToday,
      leveledUp: levelResult.leveledUp,
    };
  }
}

// ─── HELPERS ─────────────────────────────────────────

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// ─── DEMO / TEST ─────────────────────────────────────

function createPlayer() {
  return {
    level: 25,
    xp: 0,
    hp: 100,
    maxHp: 100,
    cash: 5000,
    stamina: 80,
    failsToday: 0,
    jailUntil: null,
    hospitalUntil: null,
    skills: {
      stealth: 40,
      dexterity: 30,
      hacking: 15,
      intelligence: 50,
      strength: 20,
      charisma: 25,
      intimidation: 10,
    },
  };
}

function demo() {
  const player = createPlayer();
  console.log('=== CRIME GAME DEMO ===\n');
  console.log('Player:', JSON.stringify(player, null, 2), '\n');

  // Show success chances for all crimes
  console.log('--- Success Chances ---');
  for (const crime of CRIMES) {
    const chance = calcSuccessChance(player, crime);
    const primaryLvl = player.skills[crime.primarySkill] || 0;
    const secondaryLvl = player.skills[crime.secondarySkill] || 0;
    const bonus = calcSkillBonus(primaryLvl, secondaryLvl);
    const locked = player.level < crime.minLevel;
    console.log(
      `${crime.name.padEnd(16)} | ` +
      `Base: ${crime.baseSuccess}% | ` +
      `Skill bonus: +${bonus.toFixed(1)} (${crime.primarySkill}/${crime.secondarySkill}) | ` +
      `Final: ${chance.toFixed(1)}%` +
      (locked ? ' 🔒 LOCKED' : '')
    );
  }

  // Show XP curve
  console.log('\n--- XP Curve ---');
  for (const lvl of [1, 5, 10, 25, 50, 75, 100]) {
    console.log(`Level ${lvl} → ${lvl + 1}: ${xpToNextLevel(lvl).toLocaleString()} XP`);
  }

  // Simulate 10 pickpocket attempts
  console.log('\n--- Simulating 10 Pickpocket Attempts ---');
  for (let i = 0; i < 10; i++) {
    const result = commitCrime(player, 'pickpocket');
    if (result.crimeSuccess) {
      console.log(
        `  ✅ Success! +$${result.cashReward} +${result.xpGained}XP ` +
        `(${result.successChance}% chance, skill +${result.skillBonus})`
      );
    } else if (result.error) {
      console.log(`  ❌ Blocked: ${result.error}`);
      break;
    } else {
      console.log(
        `  ❌ Failed! -$${result.fine} -${result.hpLost}HP ` +
        `${result.inHospital ? '🏥 Hospital' : `🔒 Jail ${result.jailTime}min`} ` +
        `(${result.successChance}% chance, heat: ${result.failsToday})`
      );
    }
  }

  console.log('\nFinal player state:', JSON.stringify({
    level: player.level,
    xp: player.xp,
    hp: player.hp,
    cash: player.cash,
    stamina: player.stamina,
    failsToday: player.failsToday,
  }, null, 2));
}

// Run demo
demo();

// ─── EXPORTS ─────────────────────────────────────────

export {
  CRIMES,
  calcSuccessChance,
  calcSkillBonus,
  calcJailTime,
  calcHpLoss,
  rollSuccess,
  commitCrime,
  addXP,
  xpToNextLevel,
  getMaxStamina,
};
